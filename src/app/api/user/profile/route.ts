import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
// 🆕 v115.1: 거주 지역 화이트리스트 검증
import { KOREAN_REGIONS } from '@/engines/temporal/region-mapping';

const VALID_REGION_CODES = new Set(KOREAN_REGIONS.map((r) => r.code));

/** PATCH: 프로필 업데이트 (닉네임, 상담 상황, 지역) */
export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.nickname === 'string' && body.nickname.trim()) {
    updates.nickname = body.nickname.trim().slice(0, 20);
  }
  if (typeof body.onboarding_situation === 'string') {
    const valid = ['male', 'female', 'other']; // 성별로 용도 변경
    if (valid.includes(body.onboarding_situation)) {
      updates.onboarding_situation = body.onboarding_situation;
    }
  }
  // 🆕 v115.1: 거주 지역 (17개 광역시도 화이트리스트 검증)
  if (typeof body.region_code === 'string' && VALID_REGION_CODES.has(body.region_code)) {
    updates.region_code = body.region_code;
  }

  const { error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** GET: 프로필 조회 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('user_profiles')
    .select('nickname, onboarding_situation, persona_mode, is_premium, created_at, region_code')
    .eq('id', user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
