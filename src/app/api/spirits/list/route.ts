/**
 * 🧚 v83: GET /api/spirits/list
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SPIRITS } from '@/data/spirits';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { data: ownedRows } = await supabase
    .from('user_spirits')
    .select('*')
    .eq('user_id', user.id);

  const owned = (ownedRows ?? []).map((r) => ({
    spiritId: r.spirit_id,
    count: r.count,
    bondXp: r.bond_xp,
    bondLv: r.bond_lv,
    backstoryUnlocked: r.backstory_unlocked,
    firstObtainedAt: r.first_obtained_at,
    lastInteractionAt: r.last_interaction_at,
  }));

  return NextResponse.json({
    owned,
    masterData: SPIRITS,
  });
}
