/**
 * v118: POST /api/luna-room/inventory/[id]/give-to-luna
 *
 * 선물 주기 — v118에서 친밀도 4축 델타 + 일일 캡 + Streak 시스템 추가.
 *
 * 흐름:
 *  1. inventory row 검증
 *  2. 일일 캡 체크 (3개/일, 4개째부터 capped=true, 4축 델타 0)
 *  3. emotion_tag × rarity → 4축 델타 계산
 *  4. Streak 카운트 갱신 (연속일 산정)
 *  5. luna_memories 에 special memory 추가 (기존 유지)
 *  6. gift_log INSERT (분석/abuse 감지)
 *  7. inventory row 차감 (기존 유지)
 *  8. response 에 intimacyDelta, streak, capped 정보 포함
 *
 * 4축 매핑 (emotion_tag × rarity 배율):
 *   happy   → bond 강함, 가벼운 친밀
 *   excited → openness 강함
 *   lonely  → trust 강함, "챙겨준다" 감각
 *   sad     → trust 강함, "위로받음"
 *   anxious → trust + 안정
 *   proud   → respect 강함, "나를 알아준다"
 *   neutral → 약함
 *
 * 희귀도 배율: N×1.0, R×1.3, SR×1.7, UR×2.2, L×3.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { pickLunaReceiveReaction } from '@/lib/luna-shopping/luna-receive-reactions';
import { getAgeDays } from '@/lib/luna-life';

interface Params {
  params: Promise<{ id: string }>;
}

type EmotionTag = 'happy' | 'excited' | 'lonely' | 'sad' | 'anxious' | 'proud' | 'neutral';
type Rarity = 'N' | 'R' | 'SR' | 'UR' | 'L';

interface AxisDelta {
  trust: number;
  openness: number;
  bond: number;
  respect: number;
}

const DAILY_GIFT_CAP = 3;

// 4축 베이스 델타 (emotion_tag 기준)
const AXIS_BASE: Record<EmotionTag, AxisDelta> = {
  happy:   { trust: 0.5, openness: 1.0, bond: 1.5, respect: 0.3 },
  excited: { trust: 0.3, openness: 1.2, bond: 1.3, respect: 0.3 },
  lonely:  { trust: 1.5, openness: 0.5, bond: 0.8, respect: 0.5 },
  sad:     { trust: 1.8, openness: 0.7, bond: 0.5, respect: 0.5 },
  anxious: { trust: 1.2, openness: 0.8, bond: 0.7, respect: 0.3 },
  proud:   { trust: 0.5, openness: 0.5, bond: 1.0, respect: 1.8 },
  neutral: { trust: 0.3, openness: 0.3, bond: 0.5, respect: 0.3 },
};

const RARITY_MULTIPLIER: Record<Rarity, number> = {
  N: 1.0, R: 1.3, SR: 1.7, UR: 2.2, L: 3.0,
};

function calcAxisDelta(emotion: EmotionTag | null, rarity: Rarity | null): AxisDelta {
  const base = AXIS_BASE[(emotion ?? 'neutral') as EmotionTag] ?? AXIS_BASE.neutral;
  const mul = RARITY_MULTIPLIER[(rarity ?? 'N') as Rarity] ?? 1.0;
  return {
    trust:    +(base.trust * mul).toFixed(2),
    openness: +(base.openness * mul).toFixed(2),
    bond:     +(base.bond * mul).toFixed(2),
    respect:  +(base.respect * mul).toFixed(2),
  };
}

const ZERO_DELTA: AxisDelta = { trust: 0, openness: 0, bond: 0, respect: 0 };

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string | null | undefined, b: string): number {
  if (!a) return Infinity;
  const aTime = new Date(a).getTime();
  const bTime = new Date(b).getTime();
  return Math.floor((bTime - aTime) / (24 * 3600 * 1000));
}

export async function POST(_req: NextRequest, ctx: Params) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { id } = await ctx.params;

  // ── 1) inventory row + luna_life + room_state 병렬 조회 ─────────
  const [
    { data: row },
    { data: life },
    { data: rs },
  ] = await Promise.all([
    supabase
      .from('user_inventory_items')
      .select('id, item_id, source, quantity, used_at, item:item_master(name_ko, emoji, category, emotion_tag, rarity)')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('luna_life')
      .select('birth_date, is_deceased')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('room_state')
      .select('gift_streak_count, gift_streak_last_at, daily_gift_count, daily_gift_reset_at')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  if (!row) return NextResponse.json({ error: '미보유 아이템' }, { status: 404 });
  if (row.used_at) return NextResponse.json({ error: '이미 사용함' }, { status: 400 });
  const currentQty = (row as any).quantity ?? 1;
  if (life?.is_deceased) {
    return NextResponse.json({ error: '루나는 더 이상 받을 수 없어', muted: true }, { status: 410 });
  }

  const itemMaster = (row as any).item as {
    name_ko: string;
    emoji: string;
    category: string;
    emotion_tag: string | null;
    rarity: string;
  } | null;
  if (!itemMaster) return NextResponse.json({ error: '마스터 데이터 없음' }, { status: 500 });

  const bondDay = life?.birth_date ? getAgeDays(new Date(life.birth_date)) : 0;
  const isLunasOwn = row.source === 'luna_shopping';
  const today = todayDateString();

  // ── 2) 일일 캡 체크 ──────────────────────────────────────────────
  const todayCount = (rs?.daily_gift_reset_at === today) ? (rs?.daily_gift_count ?? 0) : 0;
  const isDailyCapped = todayCount >= DAILY_GIFT_CAP;

  // ── 3) 4축 델타 계산 ─────────────────────────────────────────────
  const baseDelta: AxisDelta = isDailyCapped
    ? { ...ZERO_DELTA }
    : calcAxisDelta(itemMaster.emotion_tag as EmotionTag | null, itemMaster.rarity as Rarity);

  // ── 4) Streak 계산 ───────────────────────────────────────────────
  //  - 어제 선물 있었으면 streak +1
  //  - 오늘 처음 선물이면 (가능): 어제 갭 확인
  //  - 갭 ≥ 2일이면 streak 리셋
  const daysSinceLast = daysBetween(rs?.gift_streak_last_at, today);
  let nextStreakCount: number;
  if (rs?.gift_streak_last_at && new Date(rs.gift_streak_last_at).toISOString().slice(0, 10) === today) {
    // 같은 날 — streak 변동 없음
    nextStreakCount = rs.gift_streak_count ?? 1;
  } else if (daysSinceLast === 1) {
    nextStreakCount = (rs?.gift_streak_count ?? 0) + 1;
  } else {
    nextStreakCount = 1;
  }

  // Streak 보너스 (4일째부터 발화: 3일 연속 직후의 4일째에 보너스)
  let streakBonus: Partial<AxisDelta> | null = null;
  if (!isDailyCapped) {
    if (nextStreakCount === 3) {
      streakBonus = { bond: 1.5 };
    } else if (nextStreakCount === 7) {
      streakBonus = { bond: 3.0, trust: 1.5 };
    } else if (nextStreakCount > 0 && nextStreakCount % 30 === 0) {
      // 30일 연속 — UR 가구 리뉴얼 쿠폰 자동 지급
      await supabase.from('user_inventory_items').insert({
        user_id: user.id,
        item_id: 'room_renewal_coupon',
        source: 'achievement',
        quantity: 1,
        acquired_day: bondDay,
        luna_note: `${nextStreakCount}일 연속 선물 보상`,
        is_new: true,
      });
    }
  }

  // 최종 델타 (베이스 + 스트릭 보너스)
  const finalDelta: AxisDelta = {
    trust:    baseDelta.trust    + (streakBonus?.trust    ?? 0),
    openness: baseDelta.openness + (streakBonus?.openness ?? 0),
    bond:     baseDelta.bond     + (streakBonus?.bond     ?? 0),
    respect:  baseDelta.respect  + (streakBonus?.respect  ?? 0),
  };

  // ── 5) 루나 반응 ─────────────────────────────────────────────────
  const reaction = pickLunaReceiveReaction({
    category: (itemMaster.category as 'gift' | 'consumable' | 'gacha'),
    bondDay,
    isLunasOwn,
  });

  // ── 6) inventory 차감 ─────────────────────────────────────────────
  if (currentQty > 1) {
    await supabase
      .from('user_inventory_items')
      .update({ quantity: currentQty - 1, is_new: false })
      .eq('id', row.id)
      .eq('user_id', user.id);
  } else {
    await supabase
      .from('user_inventory_items')
      .delete()
      .eq('id', row.id)
      .eq('user_id', user.id);
  }

  // ── 7) luna_memories 에 special memory 추가 (기존 유지) ──────────
  const memoryTitle = `${itemMaster.emoji} ${itemMaster.name_ko}`;
  const memoryContent = `너가 ${memoryTitle} 을(를) 나에게 줬어. ${
    isLunasOwn ? '내가 사다 준 걸 다시 받았네 — 의미 있어.' : '받기만 하다가 받은 날.'
  }`;
  await supabase.from('luna_memories').insert({
    user_id: user.id,
    day_number: bondDay,
    title: `너에게 받은 ${itemMaster.name_ko}`,
    content: memoryContent,
    luna_thought: reaction,
    frame_style: 'gold',
    source: 'user_gift',
    is_pinned: false,
  });

  // ── 8) gift_log INSERT (분석/abuse) ──────────────────────────────
  await supabase.from('gift_log').insert({
    user_id: user.id,
    item_id: (row as any).item_id,
    category: itemMaster.category,
    emotion_tag: itemMaster.emotion_tag,
    rarity: itemMaster.rarity,
    axis_delta: finalDelta,
    streak_count: nextStreakCount,
    streak_bonus: streakBonus,
    daily_capped: isDailyCapped,
  });

  // ── 9) room_state 갱신 (streak / daily count) ────────────────────
  await supabase.from('room_state').upsert({
    user_id: user.id,
    daily_gift_count: todayCount + 1,
    daily_gift_reset_at: today,
    gift_streak_count: nextStreakCount,
    gift_streak_last_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  // ── 10) 친밀도 엔진 트리거 (TODO: M3 후속 — intimacy engine 트리거 발화) ─
  //   현재는 axis_delta 만 응답에 노출. 실제 user_profiles.user_model.intimacy 갱신은
  //   intimacy engine 의 처리 흐름을 통해 별도 PR 에서 통합 예정.

  return NextResponse.json({
    ok: true,
    reaction,
    bondDay,
    isLunasOwn,
    itemEmoji: itemMaster.emoji,
    itemName: itemMaster.name_ko,
    // v118 신규 필드
    intimacyDelta: finalDelta,
    streak: {
      count: nextStreakCount,
      bonus: streakBonus,
      isMilestone: nextStreakCount === 3 || nextStreakCount === 7 || (nextStreakCount > 0 && nextStreakCount % 30 === 0),
    },
    dailyCap: {
      capped: isDailyCapped,
      todayCount: todayCount + 1,
      max: DAILY_GIFT_CAP,
    },
  });
}
