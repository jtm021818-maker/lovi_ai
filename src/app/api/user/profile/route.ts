import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/** PATCH: 프로필 업데이트 (닉네임, 상담 상황) */
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
    const valid = ['breakup', 'crush', 'relationship', 'confused', 'free'];
    if (valid.includes(body.onboarding_situation)) {
      updates.onboarding_situation = body.onboarding_situation;
    }
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
    .select('nickname, onboarding_situation, persona_mode, is_premium, created_at')
    .eq('id', user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
