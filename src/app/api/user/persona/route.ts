import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * POST /api/user/persona
 * 사용자의 페르소나 모드를 업데이트합니다.
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { persona_mode } = await request.json();

  if (!['luna', 'counselor', 'friend', 'panel', 'tarot'].includes(persona_mode)) {
    return NextResponse.json({ error: 'Invalid persona_mode' }, { status: 400 });
  }

  const { error, count } = await supabase
    .from('user_profiles')
    .update({ persona_mode })
    .eq('id', user.id);

  if (error) {
    console.error(`[Persona] ❌ DB update 실패:`, error.message, error.code, error.details);
    return NextResponse.json({ error: 'DB update failed', details: error.message }, { status: 500 });
  }

  console.log(`[Persona] ✅ persona_mode → "${persona_mode}" (user: ${user.id}, count: ${count})`);
  return NextResponse.json({ success: true, persona_mode });
}
