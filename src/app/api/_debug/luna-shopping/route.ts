/**
 * v104 DEV ONLY: POST /api/_debug/luna-shopping
 *
 * 보안:
 *  - process.env.NODE_ENV === 'production' 이고 ALLOW_DEBUG !== 'true' 면 404 차단.
 *
 * Body: { action: 'force-out' | 'force-return' | 'reset-today' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getBondTier, pickGiftItem, type ItemCandidate } from '@/lib/luna-shopping/shopping-engine';
import { extractEmotionTag, pickLunaNote } from '@/lib/luna-shopping/luna-notes';
import { getAgeDays } from '@/lib/luna-life';

function isAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEBUG === 'true';
}

export async function POST(req: NextRequest) {
  if (!isAllowed()) return NextResponse.json({ error: 'disabled' }, { status: 404 });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  let body: { action?: string };
  try { body = await req.json(); } catch { body = {}; }
  const action = body.action;

  const { data: life } = await supabase
    .from('luna_life').select('birth_date').eq('user_id', user.id).maybeSingle();
  if (!life?.birth_date) return NextResponse.json({ error: '루나 미초기화' }, { status: 400 });
  const bondDay = getAgeDays(new Date(life.birth_date));
  const bondTier = getBondTier(bondDay);

  if (action === 'force-out') {
    // 활성 트립 있으면 무시
    const { data: existing } = await supabase
      .from('luna_shopping_trips')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'in_progress')
      .maybeSingle();
    if (existing) return NextResponse.json({ ok: true, alreadyOut: true });

    const nowMs = Date.now();
    await supabase.from('luna_shopping_trips').insert({
      user_id: user.id,
      departed_at: new Date(nowMs).toISOString(),
      returns_at: new Date(nowMs + 60 * 60_000).toISOString(),
      trip_day: bondDay,
      emotion_context: 'neutral',
      bond_tier: bondTier,
      status: 'in_progress',
    });
    return NextResponse.json({ ok: true, action: 'force-out' });
  }

  if (action === 'force-return') {
    const { data: active } = await supabase
      .from('luna_shopping_trips')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'in_progress')
      .order('departed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!active) {
      // 트립 없음 → 즉시 새 트립 만들고 종료
      const nowMs = Date.now();
      const { data: inserted } = await supabase.from('luna_shopping_trips').insert({
        user_id: user.id,
        departed_at: new Date(nowMs - 60_000).toISOString(),
        returns_at: new Date(nowMs).toISOString(),
        trip_day: bondDay,
        emotion_context: 'neutral',
        bond_tier: bondTier,
        status: 'in_progress',
      }).select().maybeSingle();
      if (!inserted) return NextResponse.json({ ok: false });
      await finishTripDebug(supabase, user.id, inserted, bondDay);
    } else {
      await finishTripDebug(supabase, user.id, active, bondDay);
    }
    return NextResponse.json({ ok: true, action: 'force-return' });
  }

  if (action === 'reset-today') {
    // 오늘 트립 모두 삭제
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    await supabase
      .from('luna_shopping_trips')
      .delete()
      .eq('user_id', user.id)
      .gte('departed_at', todayStart.toISOString());
    return NextResponse.json({ ok: true, action: 'reset-today' });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}

async function finishTripDebug(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  trip: any,
  bondDay: number,
) {
  const bondTier = (trip.bond_tier ?? getBondTier(bondDay)) as 1 | 2 | 3;
  const emotion = (trip.emotion_context ?? 'neutral') as ReturnType<typeof extractEmotionTag>;

  const { data: candidates } = await supabase
    .from('item_master')
    .select('id, bond_tier, emotion_tag, base_weight')
    .lte('bond_tier', bondTier)
    .in('category', ['gift', 'consumable']);

  const chosen = pickGiftItem(
    (candidates ?? []) as ItemCandidate[],
    bondTier,
    emotion as ReturnType<typeof extractEmotionTag>,
  );
  if (!chosen) return;

  await supabase.from('user_inventory_items').insert({
    user_id: userId,
    item_id: chosen.id,
    quantity: 1,
    source: 'luna_shopping',
    acquired_day: bondDay,
    luna_note: pickLunaNote(emotion as ReturnType<typeof extractEmotionTag>),
    is_new: true,
  });

  await supabase
    .from('luna_shopping_trips')
    .update({ returned_at: new Date().toISOString(), status: 'returned' })
    .eq('id', trip.id);
}
