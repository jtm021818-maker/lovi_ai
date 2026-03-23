import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { CounselingPipeline } from '@/engines/pipeline';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { ingestMessage } from '@/lib/rag/ingestor';
import { generateMessage } from '@/lib/ai/claude';
import type { PersonaMode } from '@/types/persona.types';
import type { SuggestionMeta } from '@/types/engine.types';

export const maxDuration = 60; // Vercel Pro 타임아웃 (Architect 피드백)

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Premium 여부 조회 후 Rate Limiting
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_premium, onboarding_situation, persona_mode')
    .eq('id', user.id)
    .single();
  const tier = profile?.is_premium ? 'premium' as const : 'free' as const;
  const rateLimit = checkRateLimit(user.id, tier);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ error: '오늘 이용 가능한 횟수를 초과했어요. 내일 다시 이야기해요 💜' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { sessionId, message, suggestionMeta } = await req.json() as {
    sessionId: string;
    message: string;
    suggestionMeta?: SuggestionMeta;
  };

  if (!sessionId || !message) {
    return new Response('Missing sessionId or message', { status: 400 });
  }

  // 🆕 v7+v8+v9: 세션에서 diagnostic_axes + phase 데이터 + locked_scenario 로드
  const { data: sessionData } = await supabase
    .from('counseling_sessions')
    .select('diagnostic_axes, current_phase_v2, completed_events, emotion_baseline, locked_scenario, last_event_turn, confirmed_emotion_score')
    .eq('id', sessionId)
    .single();
  const diagnosticAxes = sessionData?.diagnostic_axes ?? {};
  const currentPhaseV2 = sessionData?.current_phase_v2 ?? undefined;
  const completedEvents = sessionData?.completed_events ?? [];
  const emotionBaseline = sessionData?.emotion_baseline ?? undefined;
  const lockedScenario = sessionData?.locked_scenario ?? undefined;
  const lastEventTurn: number = sessionData?.last_event_turn ?? 0;
  let confirmedEmotionScore: number | undefined = sessionData?.confirmed_emotion_score ?? undefined;

  // 🆕 v10.1: 온도계 응답 시 유저 확정 감정 점수 저장
  if (suggestionMeta?.source === 'emotion_thermometer' && suggestionMeta.context?.score !== undefined) {
    // 유저가 조정한 점수 (0~10) → -5~+5 로 변환
    const userScore = suggestionMeta.context.score as number;
    confirmedEmotionScore = userScore - 5; // 0~10 → -5~+5
    console.log(`[Chat] 🌡️ 감정 확정: 유저 ${userScore}(0-10) → 확정 ${confirmedEmotionScore}(-5~+5) | 조정: ${suggestionMeta.context.wasAdjusted}`);
    // 즉시 DB 저장
    await supabase
      .from('counseling_sessions')
      .update({ confirmed_emotion_score: confirmedEmotionScore })
      .eq('id', sessionId);
  }

  // 사용자 메시지 DB 저장 (선택지 메타 포함)
  const { error: insertError } = await supabase.from('messages').insert({
    session_id: sessionId,
    user_id: user.id,
    sender_type: 'user',
    content: message,
    is_from_suggestion: suggestionMeta?.source === 'suggestion',
    suggestion_category: suggestionMeta?.category || null,
    suggestion_strategy_hint: suggestionMeta?.strategyHint || null,
  });
  if (insertError) {
    console.error('[Chat] ❌ 메시지 insert 실패:', insertError);
  }

  // 최근 대화 조회
  const { data: recentMsgs, error: selectError } = await supabase
    .from('messages')
    .select('sender_type, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (selectError) {
    console.error('[Chat] ❌ messages SELECT 실패:', selectError);
  }
  console.log(`[Chat] 📋 recentMsgs: ${recentMsgs?.length ?? 'null'}개 | sessionId: ${sessionId}`);

  let chatHistory = (recentMsgs ?? [])
    .reverse()
    .map((m) => ({
      role: m.sender_type as 'user' | 'ai',
      content: m.content as string,
    }));

  // 🆕 v9.1: 방금 보낸 메시지가 chatHistory에 없으면 수동 추가 (insert 지연 대응)
  const hasCurrentMsg = chatHistory.some(m => m.role === 'user' && m.content === message);
  if (!hasCurrentMsg) {
    console.log('[Chat] ⚠️ 현재 메시지가 chatHistory에 없음 — 수동 추가');
    chatHistory.push({ role: 'user', content: message });
  }

  // 페르소나 + 턴 카운터
  const persona: PersonaMode = (profile?.persona_mode as PersonaMode) || 'counselor';
  const turnCount = Math.max(1, chatHistory.filter(m => m.role === 'user').length);
  console.log(`[Chat] 📌 persona: "${persona}" | turnCount: ${turnCount} | chatHistory총: ${chatHistory.length} | user메시지: ${chatHistory.filter(m => m.role === 'user').length}`);

  // 🆕 선택지 게이트용 — 최근 선택지 표시 턴 + 전략 연속 횟수 계산
  const { data: recentStrategyLogs } = await supabase
    .from('strategy_logs')
    .select('strategy_type, response_type')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(5);

  // consecutiveStrategyCount: 최근 전략 로그에서 동일 전략 연속 횟수
  let consecutiveStrategyCount = 1;
  if (recentStrategyLogs && recentStrategyLogs.length >= 2) {
    const lastStrategy = recentStrategyLogs[0]?.strategy_type;
    for (let i = 1; i < recentStrategyLogs.length; i++) {
      if (recentStrategyLogs[i]?.strategy_type === lastStrategy) {
        consecutiveStrategyCount++;
      } else break;
    }
  }

  // lastSuggestionTurn: AI 메시지 중 선택지가 포함된 가장 최근 턴 번호
  // (간단하게: 전체 AI 메시지 중 SUGGESTIONS 문자열이 포함된 마지막 것의 인덱스)
  const aiMessages = chatHistory.filter(m => m.role === 'ai');
  let lastSuggestionTurn = -1;
  for (let i = aiMessages.length - 1; i >= 0; i--) {
    if (aiMessages[i].content.includes('[SUGGESTIONS:') || aiMessages[i].content.includes('SUGGESTIONS')) {
      // AI 메시지의 인덱스를 턴 번호로 변환 (대략적)
      lastSuggestionTurn = i + 1;
      break;
    }
  }
  // 선택지가 제거된 후라 content에 안 남을 수 있음 → 직전 도네 이벤트 기반은 불가
  // 대신 DB의 messages 테이블에서 is_from_suggestion이 true인 최근 사용자 메시지 확인
  if (lastSuggestionTurn === -1) {
    const { data: suggestionMsgs } = await supabase
      .from('messages')
      .select('id')
      .eq('session_id', sessionId)
      .eq('is_from_suggestion', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (suggestionMsgs && suggestionMsgs.length > 0) {
      // 선택지에서 온 메시지가 있으면, 대략 현재 턴의 절반 전으로 추정
      lastSuggestionTurn = Math.max(0, turnCount - 2);
    }
  }

  // SSE 스트리밍
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const pipeline = new CounselingPipeline();
        let fullText = '';
        let stateResult: any = null;
        let strategyResult: any = null;
        let responseMode: string | undefined = undefined;
        let updatedAxes: any = undefined;
        let finalPhaseV2: string | undefined = undefined;
        let finalCompletedEvents: string[] | undefined = undefined;
        let finalLastEventTurn: number = lastEventTurn;  // 🆕 v10
        let finalConfirmedEmotion: number | undefined = confirmedEmotionScore;  // 🆕 v10.1

        for await (const event of pipeline.execute(
          message,
          chatHistory,
          profile?.onboarding_situation
            ? `사용자 상황: ${profile.onboarding_situation}`
            : '',
          { supabase, userId: user.id },
          persona,
          turnCount,
          suggestionMeta,
          lastSuggestionTurn,
          consecutiveStrategyCount,
          // 🆕 v3: 직전 응답 모드 (연속 방지)
          (recentStrategyLogs?.[0] as any)?.response_type ?? undefined,
          // 🆕 v2: 감정 메모리 요약
          '',
          // 🆕 v7: 읽씹 5축 진단 상태
          diagnosticAxes,
          // 🆕 v8: Phase 상태
          currentPhaseV2,
          completedEvents,
          emotionBaseline,
          // 🆕 v9: 고정된 시나리오
          lockedScenario,
          // 🆕 v10: 마지막 이벤트 턴
          lastEventTurn,
          // 🆕 v10.1: 유저 확정 감정 점수
          confirmedEmotionScore,
        )) {
          switch (event.type) {
            case 'state':
              stateResult = event.data;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'state', data: event.data })}\n\n`)
              );
              break;

            case 'strategy':
              strategyResult = event.data;
              break;

            case 'text':
              // __REMOVE__ 태그 처리 (선택지 부분 제거)
              if (typeof event.data === 'string' && event.data.includes('__REMOVE__')) {
                break;
              }
              fullText += event.data;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'text', data: event.data })}\n\n`)
              );
              break;

            case 'panel':
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'panel', data: event.data })}\n\n`)
              );
              break;

            case 'suggestions':
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'suggestions', data: event.data })}\n\n`)
              );
              break;

            case 'nudge':
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'nudge', data: event.data })}\n\n`)
              );
              break;

            case 'axes_progress':
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'axes_progress', data: event.data })}\n\n`)
              );
              break;

            case 'axis_choices':
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'axis_choices', data: event.data })}\n\n`)
              );
              break;

            case 'phase_event':
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'phase_event', data: event.data })}\n\n`)
              );
              break;

            case 'phase_change':
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'phase_change', data: event.data })}\n\n`)
              );
              break;

            case 'done':
              responseMode = (event.data as any).responseMode;
              updatedAxes = (event.data as any).updatedAxes;
              finalPhaseV2 = (event.data as any).phaseV2;
              finalCompletedEvents = (event.data as any).completedEvents;
              finalLastEventTurn = (event.data as any).lastEventTurn ?? lastEventTurn;  // 🆕 v10
              finalConfirmedEmotion = (event.data as any).confirmedEmotionScore ?? finalConfirmedEmotion;  // 🆕 v10.1
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'done', data: { phaseV2: finalPhaseV2 } })}\n\n`)
              );
              break;
          }
        }

        // 후처리: fire-and-forget (Architect 피드백: 비동기 분리)
        savePostProcessing(supabase, {
          sessionId,
          userId: user.id,
          aiContent: fullText,
          userMessage: message,
          stateResult,
          strategyResult,
          responseMode,
          updatedAxes,
          phaseV2: finalPhaseV2,
          completedEvents: finalCompletedEvents,
          emotionScore: stateResult?.emotionScore,
          turnCount,
          lastEventTurn: finalLastEventTurn,  // 🆕 v10
          confirmedEmotionScore: finalConfirmedEmotion,  // 🆕 v10.1
        }).catch(console.error);

      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', data: '응답 생성 중 오류가 발생했어요.' })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

/** 비동기 후처리 (fire-and-forget) */
async function savePostProcessing(
  supabase: any,
  params: {
    sessionId: string;
    userId: string;
    aiContent: string;
    userMessage: string;
    stateResult: any;
    strategyResult: any;
    responseMode?: string;
    updatedAxes?: any;
    phaseV2?: string;
    completedEvents?: string[];
    emotionScore?: number;
    turnCount?: number;
    lastEventTurn?: number;  // 🆕 v10
    confirmedEmotionScore?: number;  // 🆕 v10.1
  }
) {
  const { sessionId, userId, aiContent, userMessage, stateResult, strategyResult, responseMode, updatedAxes, phaseV2, completedEvents: evts, emotionScore, turnCount, lastEventTurn: savedLastEventTurn, confirmedEmotionScore: savedConfirmedEmotion } = params;

  // AI 메시지 저장
  await supabase.from('messages').insert({
    session_id: sessionId,
    user_id: userId,
    sender_type: 'ai',
    content: aiContent,
    sentiment_score: stateResult?.emotionScore,
    cognitive_distortions: stateResult?.cognitiveDistortions ?? [],
    horsemen_detected: stateResult?.horsemenDetected ?? [],
    risk_level: stateResult?.riskLevel ?? 'LOW',
    is_flooding: stateResult?.isFlooding ?? false,
    strategy_used: strategyResult?.strategyType,
    model_used: strategyResult?.modelTier,
  });

  // 전략 로그 저장
  if (strategyResult) {
    await supabase.from('strategy_logs').insert({
      session_id: sessionId,
      user_id: userId,
      strategy_type: strategyResult.strategyType,
      selection_reason: strategyResult.reason,
      thinking_budget: strategyResult.thinkingBudget,
      model_tier: strategyResult.modelTier,
      state_snapshot: stateResult,
      response_type: responseMode ?? null,
    });
  }

  // 감정 로그 저장
  if (stateResult) {
    await supabase.from('emotion_logs').insert({
      user_id: userId,
      session_id: sessionId,
      emotion_score: stateResult.emotionScore,
    });
  }

  // 사용자 메시지 RAG 인제스팅 (fire-and-forget)
  ingestMessage({
    supabase,
    userId,
    sessionId,
    content: userMessage,
    emotionScore: stateResult?.emotionScore,
    strategyUsed: strategyResult?.strategyType,
  }).catch((err) => console.error('[PostProcess] RAG 인제스팅 실패:', err));

  // 🆕 v7: 읽씹 진단 축 DB 저장
  if (updatedAxes && Object.keys(updatedAxes).length > 0) {
    await supabase
      .from('counseling_sessions')
      .update({ diagnostic_axes: updatedAxes })
      .eq('id', sessionId);
    console.log(`[PostProcess] 📱 읽씹 축 DB 저장 완료:`, updatedAxes);
  }

  // 🆕 v8: Phase 상태 DB 저장
  if (phaseV2) {
    const phaseUpdate: Record<string, any> = {
      current_phase_v2: phaseV2,
    };
    if (evts && evts.length > 0) {
      phaseUpdate.completed_events = evts;
    }
    // 감정 기준선 저장 (HOOK 구간에서만, 최초 1회)
    if (phaseV2 === 'HOOK' && emotionScore !== undefined) {
      phaseUpdate.emotion_baseline = emotionScore;
    }
    // 🆕 v9: 시나리오 고정 — GENERAL 아닌 시나리오가 처음 감지되면 세션에 잠금
    const detectedScenario = stateResult?.scenario;
    if (detectedScenario && detectedScenario !== 'GENERAL') {
      // locked_scenario가 아직 없을 때만 저장 (최초 1회)
      const { data: currentSession } = await supabase
        .from('counseling_sessions')
        .select('locked_scenario')
        .eq('id', sessionId)
        .single();
      if (!currentSession?.locked_scenario) {
        phaseUpdate.locked_scenario = detectedScenario;
        console.log(`[PostProcess] 🔒 시나리오 잠금 저장: ${detectedScenario}`);
      }
    }
    // 🆕 v10: lastEventTurn 같이 저장
    if (savedLastEventTurn !== undefined) {
      phaseUpdate.last_event_turn = savedLastEventTurn;
    }
    await supabase
      .from('counseling_sessions')
      .update(phaseUpdate)
      .eq('id', sessionId);
    console.log(`[PostProcess] 📍 Phase DB 저장: ${phaseV2} | 이벤트: ${evts?.length ?? 0}개 | lastEventTurn: ${savedLastEventTurn ?? 'n/a'}`);
  }

  // 🆕 v9.1: 매 턴 세션 메타데이터 업데이트 (turn_count, last_message, emotion)
  const sessionMeta: Record<string, any> = {
    turn_count: turnCount ?? 0,
    last_message_preview: userMessage?.slice(0, 80) || null,
    last_message_at: new Date().toISOString(),
  };
  // emotion_start: HOOK 구간(1턴)에서만 최초 1회 저장
  if (turnCount === 1 && emotionScore !== undefined) {
    sessionMeta.emotion_start = emotionScore;
  }
  await supabase
    .from('counseling_sessions')
    .update(sessionMeta)
    .eq('id', sessionId);
  console.log(`[PostProcess] 📋 세션 메타 업데이트: 턴${turnCount}`);

  // 🆕 v9.2: EMPOWER 완료 시 자동 세션 종료 + 요약
  if (phaseV2 === 'EMPOWER' && evts?.includes('GROWTH_REPORT')) {
    const emotionEnd = emotionScore ?? 5;
    const { data: sessionInfo } = await supabase
      .from('counseling_sessions')
      .select('locked_scenario, emotion_start, turn_count')
      .eq('id', sessionId)
      .single();

    const scenarioLabels: Record<string, string> = {
      READ_AND_IGNORED: '읽씹 상황', GHOSTING: '잠수 상황',
      JEALOUSY_CONFLICT: '질투/갈등', BREAKUP_CONTEMPLATION: '이별 고민',
      COMMUNICATION_BREAKDOWN: '소통 단절', TRUST_ISSUES: '신뢰 문제',
    };
    const label = scenarioLabels[sessionInfo?.locked_scenario ?? ''] ?? '연애 상담';
    const tc = sessionInfo?.turn_count ?? turnCount ?? 0;
    const eStart = sessionInfo?.emotion_start;
    const emotionChange = eStart != null
      ? `감정 ${eStart > emotionEnd ? '↓' : eStart < emotionEnd ? '↑' : '→'}${Math.abs(emotionEnd - eStart)}점`
      : '';
    const summary = `${label}에 대해 ${tc}턴 동안 상담하고 구체적인 해결책을 찾았어요. ${emotionChange}`.trim();

    await supabase
      .from('counseling_sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        emotion_end: emotionEnd,
        session_summary: summary,
      })
      .eq('id', sessionId);
    console.log(`[PostProcess] ✅ EMPOWER 완료 → 세션 자동 종료: ${summary}`);
  }

  // 세션 요약 생성 (10번째 메시지마다, fire-and-forget)
  generateSessionSummary(supabase, sessionId, userId)
    .catch((err) => console.error('[PostProcess] 세션 요약 실패:', err));
}

/** 세션 요약 생성 (10번째 메시지마다 갱신) */
async function generateSessionSummary(
  supabase: any,
  sessionId: string,
  userId: string
): Promise<void> {
  // 메시지 수 확인 (10개 미만이면 스킵)
  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId);

  if (!count || count < 10 || count % 10 !== 0) return;

  // 최근 20개 메시지 조회
  const { data: msgs } = await supabase
    .from('messages')
    .select('sender_type, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (!msgs || msgs.length === 0) return;

  const context = msgs
    .reverse()
    .map((m: any) => `${m.sender_type === 'user' ? '사용자' : 'AI'}: ${m.content}`)
    .join('\n');

  const summary = await generateMessage(
    '다음 상담 대화를 2-3줄로 요약해주세요. 핵심 감정, 주제, 전략을 포함하세요.',
    [{ role: 'user', content: context }],
    'haiku',
    256
  );

  await supabase
    .from('counseling_sessions')
    .update({ session_summary: summary })
    .eq('id', sessionId);
}
