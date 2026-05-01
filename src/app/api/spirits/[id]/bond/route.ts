/**
 * v83 + v102: POST /api/spirits/[id]/bond
 *
 * 교감 XP 증가 + Lv up 체크 + v102 이중 게이트(Bond Lv5 + Day ≥ revealDay)
 * + 어머니 일기(L3) 페이지 자동 진척.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { calcBondLv } from '@/engines/spirits/bond-engine';
import { getRevealEntry } from '@/data/spirit-reveal-schedule';
import { getAgeDays } from '@/lib/luna-life';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  let body: { amount?: number };
  try { body = await req.json(); }
  catch { body = {}; }

  const delta = Math.max(0, Math.min(500, body.amount ?? 5));

  const [{ data: row }, { data: life }] = await Promise.all([
    supabase.from('user_spirits').select('*').eq('user_id', user.id).eq('spirit_id', id).maybeSingle(),
    supabase.from('luna_life').select('birth_date').eq('user_id', user.id).single(),
  ]);

  if (!row) return NextResponse.json({ error: '보유하지 않은 정령' }, { status: 404 });

  const ageDays = life?.birth_date ? getAgeDays(new Date(life.birth_date)) : 0;
  const entry = getRevealEntry(id);

  const newXp = row.bond_xp + delta;
  const newLv = calcBondLv(newXp);
  const didLevelUp = newLv > row.bond_lv;

  // 이중 게이트
  const dayGateOpen = entry ? ageDays >= entry.revealDay : true;
  const lvGateOpen = newLv >= 5;
  const willUnlockBackstory = dayGateOpen && lvGateOpen;
  const newlyUnlocked = willUnlockBackstory && !row.backstory_unlocked;

  // L3 (rev2: 유저 자기-반영 fragment) — 누적 L2 unlocked 수로 게이트
  // 가공 mother-lore page 삽입 폐기. lore_unlocked 만 토글.
  let loreUnlocked = !!row.lore_unlocked;
  if (willUnlockBackstory && entry && !loreUnlocked) {
    const { count } = await supabase
      .from('user_spirits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('backstory_unlocked', true);

    const totalUnlocked = (count ?? 0) + (newlyUnlocked ? 1 : 0);
    if (totalUnlocked - 1 >= entry.loreUnlockAfter) {
      loreUnlocked = true;
    }
  }

  await supabase
    .from('user_spirits')
    .update({
      bond_xp: newXp,
      bond_lv: newLv,
      backstory_unlocked: willUnlockBackstory ? true : row.backstory_unlocked,
      lore_unlocked: loreUnlocked,
      lore_unlocked_at: loreUnlocked && !row.lore_unlocked ? new Date().toISOString() : row.lore_unlocked_at,
      day_revealed_at: newlyUnlocked ? ageDays : row.day_revealed_at,
      last_interaction_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('spirit_id', id);

  return NextResponse.json({
    newXp,
    newLv,
    didLevelUp,
    backstoryUnlocked: willUnlockBackstory,
    backstoryNewlyUnlocked: newlyUnlocked,
    loreUnlocked,
    dayGateOpen,
    lvGateOpen,
    revealDay: entry?.revealDay ?? null,
    ageDays,
  });
}
