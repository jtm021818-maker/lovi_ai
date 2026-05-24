/**
 * v118: GET / POST /api/luna-room/notices/dust-purge
 *
 * v118 마이그레이션에서 gacha_dust / rainbow_ticket / luck_charm 보유분을 일괄 삭제했음.
 * 사용자에게 룸 진입 시 1회 안내 모달 표시.
 *
 * GET  → { shouldShow: boolean }       — room_state.dust_purge_announced_at IS NULL 이면 true
 * POST → acknowledge — dust_purge_announced_at 을 now() 로 갱신
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ shouldShow: false });

  const { data: rs } = await supabase
    .from('room_state')
    .select('dust_purge_announced_at')
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json({ shouldShow: !rs?.dust_purge_announced_at });
}

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  await supabase.from('room_state').upsert({
    user_id: user.id,
    dust_purge_announced_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  return NextResponse.json({ ok: true });
}
