/**
 * v83 + v102 + v103: GET /api/spirits/list
 *
 * v102: 정령별 revealDay/dayGateOpen/loreUnlocked 노출.
 * v103: mood (시간 흐름 반영) / placed / fragments_unlocked 노출.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SPIRITS } from '@/data/spirits';
import { SPIRIT_REVEAL_SCHEDULE, getRevealEntry } from '@/data/spirit-reveal-schedule';
import { getAgeDays } from '@/lib/luna-life';
import { computeSpiritMood, moodToTone } from '@/lib/spirits/mood-engine';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const [{ data: ownedRows }, { data: life }] = await Promise.all([
    supabase.from('user_spirits').select('*').eq('user_id', user.id),
    supabase.from('luna_life').select('birth_date').eq('user_id', user.id).single(),
  ]);

  const ageDays = life?.birth_date ? getAgeDays(new Date(life.birth_date)) : 0;
  const nowMs = Date.now();

  const owned = (ownedRows ?? []).map((r: any) => {
    const entry = getRevealEntry(r.spirit_id);
    const revealDay = entry?.revealDay ?? 0;
    const dayGateOpen = ageDays >= revealDay;

    // v103: 무드 시간 흐름 반영
    const mood = computeSpiritMood({
      storedMood: r.mood_value ?? 60,
      moodUpdatedAtMs: r.mood_updated_at ? new Date(r.mood_updated_at).getTime() : nowMs,
      lastVisitedAtMs: r.last_visited_at ? new Date(r.last_visited_at).getTime() : 0,
      bondLv: r.bond_lv ?? 1,
      nowMs,
    });

    return {
      spiritId: r.spirit_id,
      count: r.count,
      bondXp: r.bond_xp,
      bondLv: r.bond_lv,
      backstoryUnlocked: !!r.backstory_unlocked,
      firstObtainedAt: r.first_obtained_at,
      lastInteractionAt: r.last_interaction_at,
      // v102
      loreUnlocked: !!r.lore_unlocked,
      dayRevealedAt: r.day_revealed_at ?? null,
      revealDay,
      dayGateOpen,
      // v103
      mood,
      moodTone: moodToTone(mood),
      lastVisitedAt: r.last_visited_at ?? null,
      isPlacedInRoom: !!r.is_placed_in_room,
      fragmentsUnlocked: (r.fragments_unlocked as number[] | null) ?? [],
    };
  });

  return NextResponse.json({
    owned,
    masterData: SPIRITS,
    revealSchedule: SPIRIT_REVEAL_SCHEDULE,
    ageDays,
  });
}
