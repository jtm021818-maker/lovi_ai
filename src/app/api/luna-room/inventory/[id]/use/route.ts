/**
 * v118: POST /api/luna-room/inventory/[id]/use
 *
 * 소모품 사용 — v118에서 16개 신규 use_effect 분기 추가 + ?qty 일괄 사용 지원.
 *
 * 흐름:
 *   1. supabase.rpc('consume_consumables', ...) — quantity 차감 + active_buff row 생성 (atomic)
 *   2. instant-effect 류 (mood_calm 강화판, dex_fragment_add 등) 는 즉시 추가 작업 수행
 *   3. session/turns/time 류는 active_buff row 가 chat/stream 등 다른 라우트에서 활용
 *
 * Query params:
 *   ?qty=N        — 같은 row 를 N개 한번에 사용 (default 1)
 *   ?sessionId=…  — duration_kind='session' 인 buff 가 어느 세션에 묶이는지
 *
 * 사용자 직접 사용을 막아야 하는 effect (pre-message-modifier 류):
 *   model_upgrade_smart, tone_blunt_oneturn, right_brain_boost
 *   → 클라이언트 ⚡버튼이 chat/stream 으로 직접 보내는 게 권장 흐름.
 *     인벤토리에서 직접 사용하면 active row 가 다음 chat 메시지에 자동 적용.
 *     (서버에서 막지는 않음 — UX 가이드 차원)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface Params {
  params: Promise<{ id: string }>;
}

const MAX_BATCH_QTY = 10;

export async function POST(req: NextRequest, ctx: Params) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { id } = await ctx.params;

  // Query params
  const url = new URL(req.url);
  const qtyRaw = parseInt(url.searchParams.get('qty') ?? '1', 10);
  const qty = Number.isFinite(qtyRaw) ? Math.max(1, Math.min(MAX_BATCH_QTY, qtyRaw)) : 1;
  const sessionId = url.searchParams.get('sessionId');

  // Optional body — axis 선택, 타깃 정령 등
  let payload: Record<string, any> = {};
  try {
    const text = await req.text();
    if (text) payload = JSON.parse(text);
  } catch { /* body 없으면 무시 */ }

  // ── 1) inventory row 조회 (검증용) ─────────────────────────────
  const { data: row } = await supabase
    .from('user_inventory_items')
    .select('id, item_id, quantity, used_at, item:item_master(is_consumable, use_effect, name_ko)')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: '미보유 아이템' }, { status: 404 });
  const itemMaster = (row as any).item as { is_consumable: boolean; use_effect: string | null; name_ko: string } | null;
  if (!itemMaster?.is_consumable) {
    return NextResponse.json({ error: '소모품 아님' }, { status: 400 });
  }
  if (row.used_at) {
    return NextResponse.json({ error: '이미 사용함' }, { status: 400 });
  }
  const currentQty = (row as any).quantity ?? 1;
  const useEffect = itemMaster.use_effect ?? '';

  // ── 2) smart_luna 일일 캡 사전 검증 (RPC 진입 전) ───────────────
  if (useEffect === 'model_upgrade_smart') {
    const today = new Date().toISOString().slice(0, 10);
    const { data: rs } = await supabase
      .from('room_state')
      .select('smart_luna_daily_used, smart_luna_daily_reset_at')
      .eq('user_id', user.id)
      .maybeSingle();
    const used = (rs?.smart_luna_daily_reset_at === today) ? (rs?.smart_luna_daily_used ?? 0) : 0;
    if (used + qty > 5) {
      return NextResponse.json({
        error: '오늘 똑똑한 루나는 충분히 사용했어. 내일 다시 와',
        code: 'DAILY_CAP_EXCEEDED',
        remaining: Math.max(0, 5 - used),
      }, { status: 429 });
    }
  }

  // ── 3) RPC consume_consumables — quantity 차감 + active row 생성 ─
  const consumeIds: string[] = [];
  // 같은 row 를 qty 번 소비하려면 RPC 호출도 qty 번 (각 콜이 quantity-=1)
  // 단, qty=1 인 경우는 단순.
  for (let i = 0; i < qty; i++) consumeIds.push(id);

  const { data: rpcRes, error: rpcErr } = await supabase.rpc('consume_consumables', {
    p_user_id: user.id,
    p_inv_ids: consumeIds,
    p_session_id: sessionId,
  });

  if (rpcErr) {
    console.error('[inventory/use] RPC consume_consumables 실패', rpcErr);
    return NextResponse.json({ error: '소모품 사용 실패', detail: rpcErr.message }, { status: 500 });
  }

  const applied = ((rpcRes as any)?.applied ?? []) as Array<{
    inventory_id: string;
    item_id: string;
    effect: string;
    duration_kind: string;
    remaining_turns: number | null;
    expires_at: string | null;
  }>;

  if (applied.length === 0) {
    return NextResponse.json({ error: '소비할 수 있는 수량이 없어' }, { status: 400 });
  }

  const appliedCount = applied.length;

  // ── 4) smart_luna 일일 카운터 증가 ──────────────────────────────
  if (useEffect === 'model_upgrade_smart') {
    const today = new Date().toISOString().slice(0, 10);
    const { data: rs } = await supabase
      .from('room_state')
      .select('smart_luna_daily_used, smart_luna_daily_reset_at')
      .eq('user_id', user.id)
      .maybeSingle();
    const base = (rs?.smart_luna_daily_reset_at === today) ? (rs?.smart_luna_daily_used ?? 0) : 0;
    await supabase.from('room_state').upsert({
      user_id: user.id,
      smart_luna_daily_used: base + appliedCount,
      smart_luna_daily_reset_at: today,
    }, { onConflict: 'user_id' });
  }

  // ── 5) instant-effect 별 즉시 추가 작업 ─────────────────────────
  let resultMessage = '';
  let extra: Record<string, any> = {};

  switch (useEffect) {
    // ─── 기존 mood_calm (N-tier 약화판) ─────────────────────────
    case 'mood_calm': {
      const { data: placed } = await supabase
        .from('user_spirits')
        .select('spirit_id, mood_value')
        .eq('user_id', user.id)
        .eq('is_placed_in_room', true);
      const boost = 6 * appliedCount;
      for (const p of placed ?? []) {
        const newMood = Math.min(100, (p.mood_value ?? 60) + boost);
        await supabase
          .from('user_spirits')
          .update({ mood_value: newMood, mood_updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('spirit_id', p.spirit_id);
      }
      extra.affectedSpirits = (placed ?? []).length;
      extra.moodDelta = boost;
      resultMessage = `방 안 친구들이 살짝 환해졌어 (+${boost}, ${(placed ?? []).length}마리)`;
      break;
    }

    // ─── 정령 안식의 향초 (강화판: +15 × N, 1h decay 정지) ───────
    case 'room_mood_calm_strong': {
      const { data: placed } = await supabase
        .from('user_spirits')
        .select('spirit_id, mood_value')
        .eq('user_id', user.id)
        .eq('is_placed_in_room', true);
      const boost = 15 * appliedCount;
      for (const p of placed ?? []) {
        const newMood = Math.min(100, (p.mood_value ?? 60) + boost);
        await supabase
          .from('user_spirits')
          .update({ mood_value: newMood, mood_updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('spirit_id', p.spirit_id);
      }
      extra.affectedSpirits = (placed ?? []).length;
      extra.moodDelta = boost;
      extra.decayPausedHours = appliedCount; // 향초 1개당 1시간
      resultMessage = `방 안 전체가 따뜻해졌어. 한동안 잠잠할 거야 (+${boost}, ${appliedCount}시간 유지)`;
      break;
    }

    // ─── 정령 호감도 간식 (단일 정령 mood +12, bond +0.3) ───────
    case 'spirit_mood_boost': {
      const targetSpiritId = payload.spiritId as string | undefined;
      if (!targetSpiritId) {
        resultMessage = '간식이 가방에서 활성화됐어. 정령을 골라 사용해줘';
        extra.requiresSpiritSelection = true;
        break;
      }
      const { data: sp } = await supabase
        .from('user_spirits')
        .select('mood_value, bond_value')
        .eq('user_id', user.id)
        .eq('spirit_id', targetSpiritId)
        .maybeSingle();
      if (sp) {
        const moodPlus = 12 * appliedCount;
        const bondPlus = 0.3 * appliedCount;
        await supabase
          .from('user_spirits')
          .update({
            mood_value: Math.min(100, (sp.mood_value ?? 60) + moodPlus),
            bond_value: (sp.bond_value ?? 0) + bondPlus,
            mood_updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .eq('spirit_id', targetSpiritId);
        extra.spiritId = targetSpiritId;
        extra.moodDelta = moodPlus;
        extra.bondDelta = bondPlus;
        resultMessage = `정령이 좋아해 (mood +${moodPlus}, bond +${bondPlus.toFixed(1)})`;
      } else {
        resultMessage = '정령을 찾을 수 없어';
      }
      break;
    }

    // ─── 도감 조각 적립 (10개 = 페이지 1개 unlock) ───────────────
    case 'dex_fragment_add': {
      const { data: frag } = await supabase
        .from('user_dex_fragments')
        .select('fragment_count, total_collected')
        .eq('user_id', user.id)
        .maybeSingle();
      const before = frag?.fragment_count ?? 0;
      const total = frag?.total_collected ?? 0;
      const after = before + appliedCount;
      await supabase.from('user_dex_fragments').upsert({
        user_id: user.id,
        fragment_count: after % 10,
        total_collected: total + appliedCount,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      const newPages = Math.floor(after / 10);
      extra.fragmentCount = after % 10;
      extra.totalCollected = total + appliedCount;
      extra.newDexPages = newPages;
      resultMessage = newPages > 0
        ? `도감 조각 +${appliedCount} — 새 페이지 ${newPages}장 열렸어!`
        : `도감 조각 +${appliedCount} (${after % 10}/10)`;
      break;
    }

    // ─── 가챠 행운 부적 (charm, 다음 가챠 1회) ───────────────────
    case 'gacha_luck':
      resultMessage = '행운이 깃들었어. 다음 뽑기에 작은 행운이 따라올 거야';
      extra.nextGachaBuff = { rateBoost: 1.5, count: appliedCount };
      break;

    // ─── 10연 SR 보장권 (charm) ─────────────────────────────────
    case 'gacha_pity_force':
      resultMessage = '다음 10연차에서 SR 이상 1매가 확정돼';
      extra.next10PullGuarantee = 'SR+';
      break;

    // ─── 추억 별 핀 (자동 / 카드 선택) ─────────────────────────
    case 'memory_pin': {
      // 직전 7일 내 최고 감정 점수 카드 자동 pin (없으면 가장 최근)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const { data: mem } = await supabase
        .from('luna_memories')
        .select('id, content_text, frame_style')
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(20);
      if ((mem ?? []).length > 0) {
        // payload.memoryId 가 있으면 그것, 없으면 첫 번째
        const targetId = payload.memoryId ?? mem![0].id;
        await supabase.from('luna_memories').update({ is_pinned: true }).eq('id', targetId).eq('user_id', user.id);
        extra.memoryId = targetId;
        resultMessage = '별 하나가 천장에 더 켜졌어';
      } else {
        resultMessage = '아직 핀할 추억이 없어';
      }
      break;
    }

    // ─── 시그니처 미리보기권 ───────────────────────────────────
    case 'signature_preview_unlock': {
      const targetSpiritId = payload.spiritId as string | undefined;
      if (!targetSpiritId) {
        resultMessage = '시그니처를 보고 싶은 정령을 골라줘';
        extra.requiresSpiritSelection = true;
      } else {
        extra.previewSpiritId = targetSpiritId;
        resultMessage = `${targetSpiritId} 의 시그니처 무브 미리보기가 시작돼`;
      }
      break;
    }

    // ─── 친밀도 부스터 (4축 중 1축 +5, 캡 무시) ────────────────
    // 실제 4축 갱신은 intimacy engine 의 'MANUAL_BOOST_<AXIS>' 트리거로
    // 다음 세션 시작 시 processTriggers() 가 적용. 여기선 payload 검증만.
    case 'intimacy_axis_plus': {
      const axis = payload.axis as 'trust' | 'openness' | 'bond' | 'respect' | undefined;
      if (!axis || !['trust','openness','bond','respect'].includes(axis)) {
        resultMessage = '어떤 축을 올릴지 골라줘';
        extra.requiresAxisSelection = true;
        break;
      }
      extra.axis = axis;
      extra.axisDelta = 5 * appliedCount;
      extra.appliedNextSession = 'intimacy';
      resultMessage = `다음 세션에서 ${axis} 축이 +${5 * appliedCount} 올라`;
      break;
    }

    // ─── 일일 미션 리셋 ─────────────────────────────────────────
    case 'mission_reset': {
      // user_daily_missions 가 있다고 가정 — 없으면 stub
      try {
        await supabase
          .from('user_daily_missions')
          .update({ completed_at: null, reward_claimed_at: null })
          .eq('user_id', user.id)
          .not('completed_at', 'is', null);
        resultMessage = '오늘 끝낸 미션이 다시 리셋됐어';
      } catch {
        resultMessage = '오늘 끝낸 미션이 다시 리셋됐어 (stub)';
      }
      break;
    }

    // ─── pre-message-modifier 류 — active row 만 생성, 다음 chat 적용 ─
    case 'model_upgrade_smart':
      resultMessage = '다음 메시지에 똑똑한 모드가 적용돼';
      extra.appliedNextTurn = true;
      break;
    case 'tone_blunt_oneturn':
      resultMessage = '다음 메시지는 솔직 모드로 응답해';
      extra.appliedNextTurn = true;
      break;
    case 'right_brain_boost':
      resultMessage = '다음 3턴 동안 깊은 공감 모드로 응답해';
      extra.appliedTurns = 3 * appliedCount;
      break;

    // ─── session 류 ──────────────────────────────────────────────
    case 'tone_soothing_session':
      resultMessage = '이번 세션은 위로 톤으로만 응답해';
      extra.appliedThisSession = true;
      break;
    case 'pipeline_full_diagnostic':
      resultMessage = '이번 세션 매턴 풀-진단 모드로 더 깊이 봐줘';
      extra.appliedThisSession = true;
      break;
    case 'diagnosis_full_report':
      resultMessage = '이번 세션 종료 시 진단 리포트 카드가 만들어져';
      extra.appliedThisSession = true;
      break;
    case 'tarot_card_bonus':
      resultMessage = '다음 타로 스프레드에 카드 한 장이 더 추가돼';
      extra.appliedNextSession = 'tarot';
      break;
    case 'scenario_reroll':
      resultMessage = '시나리오를 다시 선택할 수 있어 (첫 턴 전까지)';
      extra.appliedThisSession = true;
      break;

    // ─── time 류 ────────────────────────────────────────────────
    case 'rate_limit_bypass_24h':
      resultMessage = '24시간 동안 메시지 캡이 해제됐어';
      extra.expiresAt = applied[0]?.expires_at;
      break;

    // ─── 가구 리뉴얼 쿠폰 (UR) ───────────────────────────────────
    case 'room_slot_reroll': {
      const slotKey = payload.slot as string | undefined;
      if (!slotKey) {
        resultMessage = '리뉴얼할 가구 슬롯을 골라줘';
        extra.requiresSlotSelection = true;
      } else {
        // 실제 가구 추첨은 별도 라우트 (/api/luna-room/furniture/[slot]/reroll)
        extra.requestedSlot = slotKey;
        resultMessage = `${slotKey} 슬롯이 새로 단장될 준비가 됐어`;
      }
      break;
    }

    // ─── 기존 time_capsule / wish ───────────────────────────────
    case 'time_capsule':
      resultMessage = '봉인 준비 완료 — 메시지를 작성해줘';
      extra.requiresMessage = true;
      break;
    case 'wish':
      resultMessage = '소원 종이학이 펼쳐졌어 — 빌고 싶은 걸 적어줘';
      extra.requiresWish = true;
      break;

    default:
      resultMessage = `${itemMaster.name_ko} 사용함`;
  }

  return NextResponse.json({
    ok: true,
    effect: useEffect,
    appliedCount,
    message: resultMessage,
    remainingQuantity: Math.max(0, currentQty - appliedCount),
    extra,
  });
}
