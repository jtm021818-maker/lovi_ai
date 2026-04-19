/**
 * 🧚 v83: POST /api/spirits/[id]/bond
 * 교감 XP 증가 + Lv up 체크
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { calcBondLv } from '@/engines/spirits/bond-engine';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  let body: { amount?: number };
  try { body = await req.json(); }
  catch { body = {}; }

  const delta = Math.max(0, Math.min(500, body.amount ?? 5));

  const { data: row } = await supabase
    .from('user_spirits')
    .select('*')
    .eq('user_id', user.id)
    .eq('spirit_id', id)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: '보유하지 않은 정령' }, { status: 404 });

  const newXp = row.bond_xp + delta;
  const newLv = calcBondLv(newXp);
  const didLevelUp = newLv > row.bond_lv;

  await supabase
    .from('user_spirits')
    .update({
      bond_xp: newXp,
      bond_lv: newLv,
      backstory_unlocked: newLv === 5 ? true : row.backstory_unlocked,
      last_interaction_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('spirit_id', id);

  return NextResponse.json({
    newXp,
    newLv,
    didLevelUp,
    backstoryUnlocked: newLv === 5,
  });
}
