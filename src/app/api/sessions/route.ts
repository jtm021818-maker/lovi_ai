import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 🆕 v24: 72시간 지난 빈 세션만 삭제 (24h→72h로 완화, 메시지 없는 것만)
  // turn_count 쓰기 레이스 방지: last_message_at도 null인 것만 삭제
  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  await supabase
    .from('counseling_sessions')
    .delete()
    .eq('user_id', user.id)
    .eq('status', 'active')
    .or('turn_count.is.null,turn_count.eq.0')
    .is('last_message_at', null)
    .lt('created_at', cutoff);

  // 세션 목록 — 빈 세션 제외 (turn_count >= 1만)
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
    .gt('turn_count', 0)
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

  // 🆕 v24: 빈 세션 재활용 — turn_count=0 AND last_message_at=null인 것만 (안전)
  // last_message_at가 있으면 실제 대화가 있었다는 뜻 → 재활용 대상에서 제외
  const { data: emptySession } = await supabase
    .from('counseling_sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .or('turn_count.is.null,turn_count.eq.0')
    .is('last_message_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (emptySession) {
    // 🆕 v22: 재활용 시 잔여 메시지 삭제 + 모든 phase 상태 초기화
    await Promise.all([
      supabase.from('messages').delete().eq('session_id', emptySession.id),
      supabase.from('counseling_sessions').update({
        current_phase_v2: null,
        completed_events: [],
        last_event_turn: 0,
        phase_start_turn: 0,
        turn_count: 0,
        emotion_baseline: null,
        confirmed_emotion_score: null,
        emotion_history: [],
        emotion_accumulator: null,
        diagnostic_axes: {},
        locked_scenario: null,
        last_prompt_style: null,
        title: body.title || '새로운 상담',
        session_summary: null,
        last_message_preview: null,
        last_message_at: null,
      }).eq('id', emptySession.id),
    ]);
    console.log(`[Sessions] ♻️ 빈 세션 재활용 + 메시지삭제 + 상태 초기화: ${emptySession.id}`);
    return NextResponse.json(emptySession);
  }

  // 새 세션 생성
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
