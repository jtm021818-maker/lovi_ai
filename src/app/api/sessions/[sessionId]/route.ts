import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: session, error } = await supabase
    .from('counseling_sessions')
    .select('id, status, session_summary, current_phase_v2, locked_scenario, emotion_baseline, turn_count')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: error?.message || 'Not found' }, { status: 404 });
  }

  return NextResponse.json(session);
}
