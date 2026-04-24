/**
 * POST /api/luna-room/init
 *
 * 루나의 생명을 시작. 유저가 처음으로 루나를 "깨울" 때 호출.
 * 이미 초기화된 경우 기존 데이터 반환.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(_req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const admin = createServiceRoleClient();

  // Check if already initialized
  const { data: existing } = await admin
    .from('luna_life')
    .select('birth_date')
    .eq('user_id', user.id)
    .single();

  if (existing) {
    return NextResponse.json({ initialized: true, birthDate: existing.birth_date, alreadyExisted: true });
  }

  const now = new Date().toISOString();
  const { error } = await admin.from('luna_life').insert({
    user_id: user.id,
    birth_date: now,
    last_gift_day: 0,
    is_deceased: false,
  });

  if (error) {
    console.error('[LunaInit] 초기화 실패:', error);
    return NextResponse.json({ error: '초기화 실패' }, { status: 500 });
  }

  return NextResponse.json({ initialized: true, birthDate: now, alreadyExisted: false });
}
