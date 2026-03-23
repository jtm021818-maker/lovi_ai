import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/** 위기 감지 로그 저장 + 긴급 대응 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { sessionId, triggerMessage, riskLevel } = await req.json();

  // 위기 로그 저장
  await supabase.from('safety_crisis_logs').insert({
    user_id: user.id,
    session_id: sessionId,
    trigger_message: triggerMessage,
    risk_level: riskLevel,
    action_taken: 'crisis_modal_shown',
  });

  // 세션 상태를 crisis로 업데이트
  if (sessionId) {
    await supabase
      .from('counseling_sessions')
      .update({ status: 'crisis' })
      .eq('id', sessionId);
  }

  return NextResponse.json({
    success: true,
    hotlines: [
      { name: '자살예방상담전화', number: '1393', available: '24시간' },
      { name: '정신건강위기상담전화', number: '1577-0199', available: '24시간' },
      { name: '생명의전화', number: '1588-9191', available: '24시간' },
    ],
  });
}
