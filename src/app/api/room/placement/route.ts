/**
 * 🏡 v83: GET/PUT /api/room/placement
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { RoomState } from '@/types/room.types';

const DEFAULT_ROOM: RoomState = {
  placedSpirits: [],
  furniture: { bed: 'basic', bookshelf: 'oak' },
  theme: 'default',
};

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { data } = await supabase
    .from('room_state')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!data) {
    await supabase.from('room_state').insert({ user_id: user.id, ...DEFAULT_ROOM, placed_spirits: [], furniture: DEFAULT_ROOM.furniture });
    return NextResponse.json(DEFAULT_ROOM);
  }

  return NextResponse.json({
    placedSpirits: data.placed_spirits ?? [],
    furniture: data.furniture ?? {},
    theme: data.theme ?? 'default',
  });
}

export async function PUT(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  let body: RoomState;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }); }

  await supabase.from('room_state').upsert({
    user_id: user.id,
    placed_spirits: body.placedSpirits ?? [],
    furniture: body.furniture ?? {},
    theme: body.theme ?? 'default',
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
