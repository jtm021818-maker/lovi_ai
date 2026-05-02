/**
 * v104: POST /api/luna-room/shopping/check
 *
 * 쇼핑 결정 트리 평가 + 외출 시작/종료 모두 처리.
 * status 라우트가 내부적으로도 호출. 직접 호출도 가능 (디버그용).
 *
 * 응답:
 *  {
 *    state: 'present' | 'out' | 'returned-pending',
 *    trip?: { id, departedAt, returnsAt, minutesRemaining },
 *    pendingCeremony?: { tripId, item: InventoryItem }
 *  }
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  decideShopping,
  getBondTier,
  pickGiftItem,
  type ItemCandidate,
} from '@/lib/luna-shopping/shopping-engine';
import { extractEmotionTag, pickLunaNote } from '@/lib/luna-shopping/luna-notes';
import { getAgeDays } from '@/lib/luna-life';

const DAY_MS = 86_400_000;

export async function POST() {
  return handle();
}
export async function GET() {
  return handle();
}

async function handle() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const nowMs = Date.now();
  const todayStartMs = nowMs - (nowMs % DAY_MS);

  // 1) 활성 트립 조회 (in_progress)
  const [
    { data: activeTripRow },
    { data: todaysCompleted },
    { data: lastTripRow },
    { data: life },
    { data: recentSession },
  ] = await Promise.all([
    supabase
      .from('luna_shopping_trips')
      .select('id, departed_at, returns_at, trip_day, emotion_context, bond_tier')
      .eq('user_id', user.id)
      .eq('status', 'in_progress')
      .order('departed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('luna_shopping_trips')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['returned', 'seen'])
      .gte('departed_at', new Date(todayStartMs).toISOString())
      .limit(1),
    supabase
      .from('luna_shopping_trips')
      .select('departed_at')
      .eq('user_id', user.id)
      .order('departed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('luna_life').select('birth_date, is_deceased').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('counseling_sessions')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', new Date(nowMs - 48 * 3600 * 1000).toISOString())
      .limit(1),
  ]);

  if (life?.is_deceased || !life?.birth_date) {
    return NextResponse.json({ state: 'present', reason: 'no-luna' });
  }

  const bondDay = getAgeDays(new Date(life.birth_date));

  const decision = decideShopping({
    nowMs,
    activeTrip: activeTripRow
      ? { returnsAtMs: new Date(activeTripRow.returns_at).getTime() }
      : null,
    hasTodaysCompletedTrip: !!(todaysCompleted && todaysCompleted.length > 0),
    lastTripMs: lastTripRow?.departed_at ? new Date(lastTripRow.departed_at).getTime() : 0,
    userActiveRecent48h: !!(recentSession && recentSession.length > 0),
    bondDay,
  });

  // ── 외출 종료 처리 ────────────────────────────────────────
  if (decision.kind === 'finish-active' && activeTripRow) {
    const result = await finishTrip(supabase, user.id, activeTripRow, bondDay);
    return NextResponse.json({
      state: 'returned-pending',
      pendingCeremony: result,
    });
  }

  // ── 여전히 외출 중 ────────────────────────────────────────
  if (decision.kind === 'still-out' && activeTripRow) {
    return NextResponse.json({
      state: 'out',
      trip: {
        id: activeTripRow.id,
        departedAt: activeTripRow.departed_at,
        returnsAt: activeTripRow.returns_at,
        minutesRemaining: decision.minutesLeft,
      },
    });
  }

  // ── 외출 시작 ─────────────────────────────────────────────
  if (decision.kind === 'depart') {
    const departedAt = new Date(nowMs).toISOString();
    const returnsAt = new Date(nowMs + decision.durationMinutes * 60_000).toISOString();
    const bondTier = getBondTier(bondDay);

    // 감정 컨텍스트 추출 (최근 세션 요약)
    const { data: recentSummaries } = await supabase
      .from('counseling_sessions')
      .select('session_summary, emotion_baseline')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('session_summary', 'is', null)
      .order('created_at', { ascending: false })
      .limit(7);
    const emotion = extractEmotionTag(
      (recentSummaries ?? []).map((r: any) => ({ summary: r.session_summary, emotion: r.emotion_baseline })),
    );

    const { data: inserted } = await supabase
      .from('luna_shopping_trips')
      .insert({
        user_id: user.id,
        departed_at: departedAt,
        returns_at: returnsAt,
        trip_day: bondDay,
        emotion_context: emotion,
        bond_tier: bondTier,
        status: 'in_progress',
      })
      .select()
      .maybeSingle();

    return NextResponse.json({
      state: 'out',
      trip: inserted ? {
        id: inserted.id,
        departedAt,
        returnsAt,
        minutesRemaining: decision.durationMinutes,
      } : null,
      justDeparted: true,
    });
  }

  return NextResponse.json({ state: 'present' });
}

// ── 외출 종료 시 선물 결정 + 인벤토리 추가 ─────────────────────
async function finishTrip(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  trip: { id: string; trip_day: number | null; emotion_context: string | null; bond_tier: number | null },
  bondDay: number,
) {
  const bondTier = (trip.bond_tier ?? getBondTier(bondDay)) as 1 | 2 | 3;
  const emotion = (trip.emotion_context ?? 'neutral') as ReturnType<typeof extractEmotionTag>;

  // 후보 선택
  const { data: candidates } = await supabase
    .from('item_master')
    .select('id, bond_tier, emotion_tag, base_weight, name_ko, emoji, category, rarity, description, is_consumable, use_effect')
    .lte('bond_tier', bondTier)
    .in('category', ['gift', 'consumable']);

  const candidatesTyped: ItemCandidate[] = (candidates ?? []).map((c: any) => ({
    id: c.id,
    bond_tier: c.bond_tier,
    emotion_tag: c.emotion_tag,
    base_weight: c.base_weight,
  }));

  const chosen = pickGiftItem(candidatesTyped, bondTier, emotion);
  if (!chosen) {
    // 후보 없음 → fallback: 그냥 returned 만 표시
    await supabase
      .from('luna_shopping_trips')
      .update({ returned_at: new Date().toISOString(), status: 'returned' })
      .eq('id', trip.id);
    return null;
  }

  const masterRow = (candidates ?? []).find((c: any) => c.id === chosen.id);
  const lunaNote = pickLunaNote(emotion as ReturnType<typeof extractEmotionTag>);

  const { data: inserted } = await supabase
    .from('user_inventory_items')
    .insert({
      user_id: userId,
      item_id: chosen.id,
      quantity: 1,
      source: 'luna_shopping',
      acquired_day: bondDay,
      luna_note: lunaNote,
      is_new: true,
    })
    .select()
    .maybeSingle();

  await supabase
    .from('luna_shopping_trips')
    .update({ returned_at: new Date().toISOString(), status: 'returned' })
    .eq('id', trip.id);

  return inserted && masterRow ? {
    tripId: trip.id,
    item: {
      id: inserted.id,
      itemId: masterRow.id,
      name: masterRow.name_ko,
      emoji: masterRow.emoji,
      category: masterRow.category,
      rarity: masterRow.rarity,
      description: masterRow.description,
      source: 'luna_shopping' as const,
      acquiredAt: inserted.acquired_at,
      acquiredDay: bondDay,
      lunaNote,
      isNew: true,
      isConsumable: !!masterRow.is_consumable,
      useEffect: masterRow.use_effect ?? null,
      used: false,
    },
  } : null;
}
