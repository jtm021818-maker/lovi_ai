/**
 * POST /api/luna-room/gift/open
 * Body: { giftId: string }
 *
 * 선물 열람 처리 (opened_at 설정).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  let body: { giftId?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }); }

  if (!body.giftId) return NextResponse.json({ error: 'giftId 필요' }, { status: 400 });

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from('luna_gifts')
    .update({ opened_at: new Date().toISOString() })
    .eq('id', body.giftId)
    .eq('user_id', user.id)
    .is('opened_at', null);

  if (error) return NextResponse.json({ error: '업데이트 실패' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
