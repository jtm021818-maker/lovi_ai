import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { KOREAN_REGIONS } from '@/engines/temporal/region-mapping';

const VALID_REGION_CODES = new Set(KOREAN_REGIONS.map((r) => r.code));

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { nickname, situation, region_code } = body as {
    nickname?: string;
    situation?: string;
    region_code?: string;
  };

  const updates: Record<string, unknown> = {
    nickname: nickname || '익명',
    onboarding_situation: situation,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  };

  // region_code 는 화이트리스트 검증 후 저장 (없으면 컬럼 유지)
  if (typeof region_code === 'string' && VALID_REGION_CODES.has(region_code)) {
    updates.region_code = region_code;
  }

  const { error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
