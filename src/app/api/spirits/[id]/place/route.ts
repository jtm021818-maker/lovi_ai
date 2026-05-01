/**
 * v103: POST /api/spirits/[id]/place
 *
 * Body: { placed: boolean }
 * 정령을 방에 배치하거나 빼낸다.
 * 배치 시 last_visited_at + mood += 12 동시 갱신.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { applyVisit } from '@/lib/spirits/mood-engine';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: Params) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { id: spiritId } = await ctx.params;

  let body: { placed?: boolean };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }); }

  const placed = !!body.placed;

  const { data: row } = await supabase
    .from('user_spirits')
    .select('mood_value, is_placed_in_room')
    .eq('user_id', user.id)
    .eq('spirit_id', spiritId)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: '미보유 정령' }, { status: 404 });
  }

  const nowISO = new Date().toISOString();
  const update: Record<string, unknown> = {
    is_placed_in_room: placed,
    placed_at: placed ? nowISO : null,
  };

  // 배치 시: 무드 +12, last_visited_at 갱신
  if (placed) {
    const newMood = applyVisit(row.mood_value ?? 60);
    update.mood_value = newMood;
    update.mood_updated_at = nowISO;
    update.last_visited_at = nowISO;
    update.last_interaction_at = nowISO;
  }

  await supabase
    .from('user_spirits')
    .update(update)
    .eq('user_id', user.id)
    .eq('spirit_id', spiritId);

  return NextResponse.json({ ok: true, placed });
}
