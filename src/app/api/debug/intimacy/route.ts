/**
 * 친밀도 데이터 진단 — Next.js API 라우트 방식
 * /api/debug/intimacy 로 접근하면 현재 유저의 intimacy 전체 데이터를 JSON으로 반환
 * 
 * 🚨 디버그 전용 — 배포 후 삭제!
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, nickname, user_model')
    .eq('id', user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const um = data?.user_model as any;
  const intimacy = um?.intimacy;

  // 구조 판단
  let format = 'unknown';
  if (!intimacy) format = 'MISSING';
  else if (intimacy.luna && intimacy.tarot) format = 'SPLIT (v41.1+)';
  else if (intimacy.dimensions) format = 'SINGLE (v41 old)';

  // 동일 여부
  let areSame = false;
  if (format === 'SPLIT (v41.1+)') {
    areSame = JSON.stringify(intimacy.luna?.dimensions) === JSON.stringify(intimacy.tarot?.dimensions);
  }

  return NextResponse.json({
    userId: user.id,
    nickname: data?.nickname,
    format,
    areSame,
    raw: intimacy,
    legacyScore: um?.lunaRelationship?.intimacyScore,
  }, { status: 200 });
}
