/**
 * v103: POST /api/spirits/[id]/visit
 *
 * 정령에게 인사하는 가벼운 액션 (DEX 시트 / 룸에서 탭).
 * - mood += 12
 * - last_visited_at, last_interaction_at 갱신
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { applyVisit, computeSpiritMood, moodToTone } from '@/lib/spirits/mood-engine';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, ctx: Params) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { id: spiritId } = await ctx.params;

  const { data: row } = await supabase
    .from('user_spirits')
    .select('mood_value, mood_updated_at, last_visited_at, bond_lv')
    .eq('user_id', user.id)
    .eq('spirit_id', spiritId)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: '미보유 정령' }, { status: 404 });

  // 현재 무드 (시간 흐름 반영) 계산 후 +12
  const nowMs = Date.now();
  const currentMood = computeSpiritMood({
    storedMood: row.mood_value ?? 60,
    moodUpdatedAtMs: row.mood_updated_at ? new Date(row.mood_updated_at).getTime() : nowMs,
    lastVisitedAtMs: row.last_visited_at ? new Date(row.last_visited_at).getTime() : 0,
    bondLv: row.bond_lv ?? 1,
    nowMs,
  });
  const newMood = applyVisit(currentMood);
  const nowISO = new Date(nowMs).toISOString();

  await supabase
    .from('user_spirits')
    .update({
      mood_value: newMood,
      mood_updated_at: nowISO,
      last_visited_at: nowISO,
      last_interaction_at: nowISO,
    })
    .eq('user_id', user.id)
    .eq('spirit_id', spiritId);

  return NextResponse.json({
    ok: true,
    mood: newMood,
    moodTone: moodToTone(newMood),
  });
}
