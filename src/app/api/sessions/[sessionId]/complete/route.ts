import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * PATCH /api/sessions/[sessionId]/complete
 * 
 * 세션 종료 + AI 요약 생성
 */
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId } = await params;

  // 1. 세션 정보 로드
  const { data: session } = await supabase
    .from('counseling_sessions')
    .select('locked_scenario, emotion_baseline, current_phase_v2, turn_count')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // 2. 마지막 5개 메시지 로드 (요약용)
  const { data: recentMessages } = await supabase
    .from('messages')
    .select('sender_type, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(5);

  // 3. 감정 점수 (마지막 AI 메시지의 sentiment_score 또는 기본값)
  const { data: lastEmotionMsg } = await supabase
    .from('messages')
    .select('sentiment_score')
    .eq('session_id', sessionId)
    .eq('sender_type', 'ai')
    .not('sentiment_score', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const emotionEnd = lastEmotionMsg?.sentiment_score ?? session.emotion_baseline ?? 5;

  // 4. AI 요약 생성 (간단한 규칙 기반 — LLM 호출 없이 비용 절약)
  const scenarioLabel = getScenarioLabel(session.locked_scenario);
  const phaseLabel = getPhaseLabel(session.current_phase_v2);
  const msgSummary = recentMessages?.reverse().map(m => 
    `${m.sender_type === 'user' ? '나' : 'AI'}: ${(m.content as string).slice(0, 40)}`
  ).join(' → ') || '';

  const summary = generateSummary({
    scenario: scenarioLabel,
    phase: phaseLabel,
    turnCount: session.turn_count ?? 0,
    emotionStart: session.emotion_baseline,
    emotionEnd,
    lastMessages: msgSummary,
  });

  // 5. DB 업데이트
  const { error } = await supabase
    .from('counseling_sessions')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString(),
      session_summary: summary,
      emotion_end: emotionEnd,
    })
    .eq('id', sessionId)
    .eq('user_id', user.id);

  if (error) {
    console.error('[Complete] 실패:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[Complete] ✅ 세션 종료: ${sessionId} | 요약: ${summary}`);
  return NextResponse.json({ ok: true, summary });
}

// ============================================
// 헬퍼 함수
// ============================================

function getScenarioLabel(scenario?: string | null): string {
  const map: Record<string, string> = {
    READ_AND_IGNORED: '읽씹 상황',
    GHOSTING: '잠수 상황',
    JEALOUSY_CONFLICT: '질투/갈등',
    BREAKUP_CONTEMPLATION: '이별 고민',
    COMMUNICATION_BREAKDOWN: '소통 단절',
    TRUST_ISSUES: '신뢰 문제',
    GENERAL: '연애 고민',
  };
  return map[scenario ?? ''] ?? '연애 상담';
}

function getPhaseLabel(phase?: string | null): string {
  const map: Record<string, string> = {
    HOOK: '상황 파악 중',
    MIRROR: '패턴 분석 중',
    BRIDGE: '원인 찾기 중',
    SOLVE: '해결책 제공',
    EMPOWER: '변화 리포트',
  };
  return map[phase ?? ''] ?? '';
}

function generateSummary(params: {
  scenario: string;
  phase: string;
  turnCount: number;
  emotionStart?: number | null;
  emotionEnd: number;
  lastMessages: string;
}): string {
  const { scenario, phase, turnCount, emotionStart, emotionEnd } = params;
  
  const emotionChange = emotionStart != null 
    ? `감정 ${emotionStart > emotionEnd ? '↓' : emotionStart < emotionEnd ? '↑' : '→'}${Math.abs(emotionEnd - (emotionStart ?? 5))}점`
    : '';

  if (phase === '변화 리포트' || phase === '해결책 제공') {
    return `${scenario}에 대해 ${turnCount}턴 동안 상담을 진행하고 구체적인 해결책을 찾았어요. ${emotionChange}`;
  }
  
  return `${scenario}에 대해 ${turnCount}턴 동안 이야기를 나눴어요. ${phase} 단계까지 진행했어요. ${emotionChange}`;
}
