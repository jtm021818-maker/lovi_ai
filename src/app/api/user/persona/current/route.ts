import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/user/persona/current
 * 현재 사용자의 페르소나 모드를 반환합니다.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('persona_mode')
    .eq('id', user.id)
    .single();

  return NextResponse.json({
    persona_mode: profile?.persona_mode || 'luna',
  });
}
