import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 🆕 v9: 확장된 세션 목록 — 시나리오, 감정, 턴, Phase 정보 포함
  const { data, error } = await supabase
    .from('counseling_sessions')
    .select(`
      id, user_id, title, status, session_summary, 
      locked_scenario, current_phase_v2, turn_count,
      emotion_start, emotion_end, emotion_baseline,
      last_message_preview, last_message_at,
      is_archived, created_at, ended_at
    `)
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const { data, error } = await supabase
    .from('counseling_sessions')
    .insert({
      user_id: user.id,
      title: body.title || '새로운 상담',
      status: 'active',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
