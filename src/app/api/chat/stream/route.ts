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

  // 🆕 v22: 세션 데이터 로드 — 에러 체크 + 디버깅
  const { data: sessionData, error: sessionError } = await supabase
    .from('counseling_sessions')
    .select('diagnostic_axes, current_phase_v2, completed_events, emotion_baseline, locked_scenario, last_event_turn, confirmed_emotion_score, emotion_history, last_prompt_style, emotion_accumulator, turn_count, phase_start_turn, session_metadata')
    .eq('id', sessionId)
    .single();

  if (sessionError) {
    console.error(`[Chat] ❌ 세션 로드 실패:`, sessionError.message, sessionError.code);
  }
  // 🆕 v22: DB 컬럼 존재 여부 디버깅
  console.log(`[Chat] 📊 세션 로드: sessionData=${sessionData ? 'OK' : 'NULL'}, keys=${sessionData ? Object.keys(sessionData).join(',') : 'none'}, turn_count=${sessionData?.turn_count}, last_event_turn=${sessionData?.last_event_turn}, completed_events=${JSON.stringify(sessionData?.completed_events)}, phase=${sessionData?.current_phase_v2}`);

  const diagnosticAxes = sessionData?.diagnostic_axes ?? {};
  let currentPhaseV2 = sessionData?.current_phase_v2 ?? undefined;
  const completedEvents = sessionData?.completed_events ?? [];
  const emotionBaseline = sessionData?.emotion_baseline ?? undefined;
  const lockedScenario = sessionData?.locked_scenario ?? undefined;
  let lastEventTurn: number = sessionData?.last_event_turn ?? 0;
  let confirmedEmotionScore: number | undefined = sessionData?.confirmed_emotion_score ?? undefined;
  const emotionHistory: number[] = sessionData?.emotion_history ?? [];
  const lastPromptStyle: string | undefined = sessionData?.last_prompt_style ?? undefined;
  const emotionAccumulatorState = sessionData?.emotion_accumulator ?? undefined;
  let phaseStartTurn: number = sessionData?.phase_start_turn ?? 0;

  // 🆕 v22: 온도계 핸들러는 turnCount 계산 후로 이동 (아래 참조)

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
  const persona: PersonaMode = (profile?.persona_mode as PersonaMode) || 'luna';
  const turnCount = Math.max(1, chatHistory.filter(m => m.role === 'user').length);
  console.log(`[Chat] 📌 persona: "${persona}" | turnCount: ${turnCount} | chatHistory총: ${chatHistory.length} | user메시지: ${chatHistory.filter(m => m.role === 'user').length}`);

  // 🆕 v22: 온도계 응답 처리 — turnCount 계산 후 실행 (stale DB 의존 제거)
  if (suggestionMeta?.source === 'emotion_thermometer' && suggestionMeta.context?.score !== undefined) {
    const userScore = suggestionMeta.context.score as number;
    confirmedEmotionScore = userScore - 5; // 0~10 → -5~+5
    console.log(`[Chat] 🌡️ 감정 확정: 유저 ${userScore}(0-10) → 확정 ${confirmedEmotionScore}(-5~+5) | 조정: ${suggestionMeta.context.wasAdjusted}`);

    const updatedEvents = Array.isArray(completedEvents) ? [...completedEvents] : [];
    if (!updatedEvents.includes('EMOTION_THERMOMETER')) {
      updatedEvents.push('EMOTION_THERMOMETER');
    }
    // 🆕 v22: turnCount를 직접 사용 — chatHistory 기반이라 항상 정확
    const currentTurnForEvent = turnCount;
    await supabase
      .from('counseling_sessions')
      .update({
        confirmed_emotion_score: confirmedEmotionScore,
        completed_events: updatedEvents,
        current_phase_v2: 'MIRROR',
        last_event_turn: currentTurnForEvent,
        phase_start_turn: currentTurnForEvent,
        turn_count: currentTurnForEvent,
      })
      .eq('id', sessionId);
    completedEvents.push('EMOTION_THERMOMETER');
    lastEventTurn = currentTurnForEvent;
    currentPhaseV2 = 'MIRROR';
    phaseStartTurn = currentTurnForEvent;
    console.log(`[Chat] 🔒 온도계 완료 → MIRROR 전환 + lastEventTurn=${currentTurnForEvent} (turnCount=${turnCount}, DB was: turn_count=${sessionData?.turn_count}, last_event_turn=${sessionData?.last_event_turn})`);
  }

  // 🆕 v25: 세션 간 연결 강화 — 메모리 프로필 + 최근 5세션
  let previousSessionContext = '';
  if (turnCount === 1) {
    try {
      // 🆕 v25: 유저 메모리 프로필 로드
      const { formatMemoryForPrompt } = await import('@/engines/memory/extract-memory');
      const { data: memProfile } = await supabase
        .from('user_profiles')
        .select('memory_profile')
        .eq('id', user.id)
        .single();

      const memoryText = formatMemoryForPrompt((memProfile?.memory_profile as any) ?? {});
      if (memoryText) {
        previousSessionContext += `\n${memoryText}`;
        console.log(`[Chat] 🧠 메모리 프로필 로드 완료`);
      }

      // 🆕 v25: 최근 5세션 로드 (1개→5개)
      const { data: prevSessions } = await supabase
        .from('counseling_sessions')
        .select('session_summary, locked_scenario, emotion_end, emotion_baseline, homework_data, created_at')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .neq('id', sessionId)
        .order('ended_at', { ascending: false })
        .limit(5);

      if (prevSessions && prevSessions.length > 0) {
        const sessionParts: string[] = [];
        for (const prev of prevSessions.slice(0, 3)) {
          const date = prev.created_at ? new Date(prev.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) : '';
          const summary = prev.session_summary ? prev.session_summary.slice(0, 60) : '';
          const scenario = prev.locked_scenario ?? '';
          sessionParts.push(`  ${date}: ${scenario ? scenario + ' — ' : ''}${summary}`);
        }

        // 직전 세션 숙제 (있으면)
        const latest = prevSessions[0];
        if (latest.homework_data) {
          const hw = latest.homework_data as any;
          if (hw.homeworks && Array.isArray(hw.homeworks) && hw.homeworks.length > 0) {
            sessionParts.push(`  → 지난 숙제: ${hw.homeworks.map((h: any) => h.task).join(', ')}`);
          }
        }

        if (sessionParts.length > 0) {
          previousSessionContext += `\n\n[최근 상담 히스토리]\n${sessionParts.join('\n')}`;
          previousSessionContext += `\n\n→ 첫 인사에서 이전 기억을 자연스럽게 언급해. "저번에 그거 어떻게 됐어?" 식으로.`;
          console.log(`[Chat] 📎 이전 세션 ${prevSessions.length}개 로드 완료`);
        }
      }
      // 🆕 v25: 라운지 대화 + 감정 체크인 → 상담에 주입
      const memProfile2 = memProfile?.memory_profile as any;
      const today = new Date().toISOString().slice(0, 10);
      const loungeHist = memProfile2?.loungeHistory;
      if (loungeHist?.date === today && loungeHist?.messages?.length > 0) {
        const recentLounge = (loungeHist.messages as any[]).slice(-5)
          .filter((m: any) => m.type === 'user' || m.type === 'character')
          .map((m: any) => `${m.speaker === 'luna' ? '루나' : m.speaker === 'tarot' ? '타로냥' : '유저'}: ${m.text}`)
          .join('\n');
        if (recentLounge) {
          previousSessionContext += `\n\n[오늘 라운지에서 나눈 대화]\n${recentLounge}\n→ "아까 라운지에서..." 식으로 자연스럽게 참고.`;
          console.log(`[Chat] 🏠 라운지 대화 ${loungeHist.messages.length}개 로드`);
        }
      }
      const todayCheckin = (memProfile2?.dailyCheckins as any[])?.slice(-1)[0];
      if (todayCheckin?.date === today) {
        previousSessionContext += `\n오늘 감정 체크인: ${todayCheckin.mood} (${todayCheckin.score}/4)`;
      }
    } catch (err) {
      console.warn('[Chat] 이전 세션/메모리 로드 실패 (무시):', err);
    }

    // 🆕 v23: 타로 세션 — 반복 카드 감지
    if (persona === 'tarot') {
      try {
        const { getRecentReadings, detectRecurringCards, getRecurringCardsPrompt } = await import('@/engines/tarot/history-engine');
        const readings = await getRecentReadings(supabase, user.id, 5);
        if (readings.length > 0) {
          const recurring = detectRecurringCards(readings);
          if (recurring.length > 0) {
            previousSessionContext += getRecurringCardsPrompt(recurring);
            console.log(`[Chat] 🔮 반복 카드 ${recurring.length}개 감지: ${recurring.map(r => r.cardName).join(', ')}`);
          }
        }
      } catch (err) {
        console.warn('[Chat] 반복 카드 감지 실패 (무시):', err);
      }
    }
  }

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

  // 🆕 v23: running session_metadata (stale 덮어쓰기 방지)
  let runningSessionMeta = { ...(sessionData?.session_metadata ?? {}) };

  // ===== v26: 타로냥 전처리 — 시나리오 기반 자동 스프레드 (AXIS_COLLECT 제거) =====
  // 전문 타로 리더 방식: 대화 충분히 → 바로 스프레드 (에너지 카드 1장 단계 제거)
  let tarotSessionMeta: { chosenSpreadType?: string; cards?: any[]; scenario?: string } | undefined;
  if (persona === 'tarot') {
    const tarotMeta = (runningSessionMeta as any).tarot ?? {};

    // 스프레드 타입이 아직 없으면 시나리오 기반 자동 결정
    if (!tarotMeta.chosenSpreadType && lockedScenario) {
      const scenarioSpreadMap: Record<string, string> = {
        UNREQUITED_LOVE: 'unrequited', RECONNECTION: 'reconnection',
        FIRST_MEETING: 'pace', RELATIONSHIP_PACE: 'pace', COMMITMENT_FEAR: 'avoidant',
      };
      const autoSpread = scenarioSpreadMap[lockedScenario] ?? 'three';
      tarotMeta.chosenSpreadType = autoSpread;
      runningSessionMeta = { ...runningSessionMeta, tarot: { ...tarotMeta, chosenSpreadType: autoSpread, scenario: lockedScenario } };
      await supabase.from('counseling_sessions').update({ session_metadata: runningSessionMeta }).eq('id', sessionId);
      console.log(`[Chat] 🔮 스프레드 자동 결정: ${autoSpread} (시나리오: ${lockedScenario})`);
    }

    tarotSessionMeta = {
      chosenSpreadType: tarotMeta.chosenSpreadType ?? 'three',
      cards: tarotMeta.cards,
      scenario: lockedScenario,
    };
    console.log(`[Chat] 🔮 타로 메타: spread=${tarotSessionMeta.chosenSpreadType}, cards=${tarotMeta.cards?.length ?? 0}`);
  }
  // ===== 타로냥 전처리 끝 =====

  // SSE 스트리밍
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullText = '';
      try {
        const pipeline = new CounselingPipeline();
        let stateResult: any = null;
        let strategyResult: any = null;
        let responseMode: string | undefined = undefined;
        let updatedAxes: any = undefined;
        let finalPhaseV2: string | undefined = undefined;
        let finalCompletedEvents: string[] | undefined = undefined;
        let finalLastEventTurn: number = lastEventTurn;  // 🆕 v10
        let finalConfirmedEmotion: number | undefined = confirmedEmotionScore;  // 🆕 v10.1
        let finalEmotionHistory: number[] = emotionHistory;  // 🆕 v10.2
        let finalPhaseStartTurn: number = phaseStartTurn;  // 🆕 v22: 미리 초기화 (var hoisting 제거)
        let finalPromptStyle: string | undefined = undefined;  // 🆕 v23: var→let
        let finalEmotionAccumulator: any = undefined;  // 🆕 v23: var→let

        for await (const event of pipeline.execute(
          message,
          chatHistory,
          (profile?.onboarding_situation
            ? `사용자 상황: ${profile.onboarding_situation}`
            : '') + previousSessionContext,
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
          // 🆕 v10.2: 감정 히스토리
          emotionHistory,
          // 🆕 v19: 감정 누적기 상태
          emotionAccumulatorState,
          // 🆕 v20: Phase 시작 턴
          phaseStartTurn,
          // 🆕 v23: 타로 세션 메타
          tarotSessionMeta,
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
              // 🆕 v26: SUGGESTIONS/STICKER 태그가 텍스트에 남으면 제거
              let chunk = event.data as string;
              chunk = chunk.replace(/\[?SUGGESTIONS:?\]?\s*\[[^\]]*\]/gi, '');
              chunk = chunk.replace(/SUGGESTIONS:\s*"[^"]*"(,\s*"[^"]*")*/gi, '');
              chunk = chunk.replace(/\bSUGGESTIONS\b[^\n]*/gi, '');
              if (!chunk.trim()) break; // 제거 후 빈 문자열이면 스킵
              fullText += chunk;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'text', data: chunk })}\n\n`)
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
              // 🆕 v23: TAROT_DRAW 카드 데이터를 running metadata에 저장 + 히스토리 기록
              if ((event.data as any)?.type === 'TAROT_DRAW' && persona === 'tarot') {
                const drawnCards = (event.data as any)?.data?.cards ?? [];
                const updatedTarot = {
                  ...(runningSessionMeta as any).tarot ?? {},
                  ...(tarotSessionMeta ?? {}),
                  cards: drawnCards,
                  readingCompleted: true,
                  scenario: lockedScenario,
                };
                runningSessionMeta = { ...runningSessionMeta, tarot: updatedTarot };
                supabase.from('counseling_sessions').update({
                  session_metadata: runningSessionMeta,
                }).eq('id', sessionId).then(() => {});
                // 🆕 v23: 히스토리 저장 (반복 카드 감지용)
                import('@/engines/tarot/history-engine').then(({ saveReadingHistory }) => {
                  saveReadingHistory(
                    supabase, user.id, sessionId,
                    tarotSessionMeta?.chosenSpreadType ?? 'three',
                    lockedScenario ?? 'GENERAL',
                    drawnCards,
                  ).catch(() => {});
                });
              }
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
              finalEmotionHistory = (event.data as any).emotionHistory ?? finalEmotionHistory;  // 🆕 v10.2
              finalPromptStyle = (event.data as any).promptStyle;  // 🆕 v17
              finalEmotionAccumulator = (event.data as any).emotionAccumulatorState;  // 🆕 v19
              finalPhaseStartTurn = (event.data as any).phaseStartTurn ?? phaseStartTurn;  // 🆕 v22: let으로 상위 선언
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'done', data: { phaseV2: finalPhaseV2 } })}\n\n`)
              );
              break;
          }
        }

        // 🆕 v24: 핵심 상태 항상 동기 저장 (레이스 컨디션 완전 방지)
        // turn_count + last_message_preview + last_message_at 모두 여기서 저장
        // → savePostProcessing fire-and-forget 실패해도 세션 기록 유지됨
        {
          const criticalUpdate: Record<string, any> = {
            turn_count: turnCount,
            last_message_preview: fullText.slice(0, 100) || message.slice(0, 100),
            last_message_at: new Date().toISOString(),
          };
          if (finalCompletedEvents && finalCompletedEvents.length > 0) {
            criticalUpdate.completed_events = finalCompletedEvents;
            criticalUpdate.last_event_turn = finalLastEventTurn;
            criticalUpdate.phase_start_turn = finalPhaseStartTurn;
          }
          if (finalPhaseV2) criticalUpdate.current_phase_v2 = finalPhaseV2;
          const { error: criticalError } = await supabase
            .from('counseling_sessions')
            .update(criticalUpdate)
            .eq('id', sessionId);
          if (criticalError) {
            console.error(`[Chat] ❌ CRITICAL UPDATE 실패:`, criticalError.message, criticalError.code, criticalError.details);
          }
          console.log(`[Chat] 🔒 핵심 상태 즉시 저장: phase=${finalPhaseV2}, turn=${turnCount}, events=[${finalCompletedEvents?.join(',') ?? ''}], lastEventTurn=${finalLastEventTurn}, phaseStartTurn=${finalPhaseStartTurn}, error=${criticalError ? criticalError.message : 'none'}`);
        }

        // 후처리: fire-and-forget (나머지 메타데이터)
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
          emotionHistory: finalEmotionHistory,  // 🆕 v10.2
          promptStyle: finalPromptStyle,  // 🆕 v17
          emotionAccumulator: finalEmotionAccumulator,  // 🆕 v19
        }).catch(console.error);

      } catch (err: any) {
        console.error('[Chat] ❌ 스트리밍 에러:', err?.message || err);
        // 이미 텍스트가 부분 전송된 경우 → done만 보내서 정상 종료 처리
        if (fullText.length > 0) {
          console.warn(`[Chat] ⚠️ 부분 텍스트 있음 (${fullText.length}자) — 그대로 완료 처리`);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'done', data: {} })}\n\n`)
          );
        } else {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', data: '응답 생성 중 오류가 발생했어요. 다시 시도해 주세요 💜' })}\n\n`)
          );
        }
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
    emotionHistory?: number[];  // 🆕 v10.2
    promptStyle?: string;  // 🆕 v17
    emotionAccumulator?: any;  // 🆕 v19
  }
) {
  const { sessionId, userId, aiContent, userMessage, stateResult, strategyResult, responseMode, updatedAxes, phaseV2, completedEvents: evts, emotionScore, turnCount, lastEventTurn: savedLastEventTurn, confirmedEmotionScore: savedConfirmedEmotion, emotionHistory: savedEmotionHistory, emotionAccumulator: savedEmotionAccumulator } = params;

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

  // 🆕 v22: Phase 핵심 필드(completed_events, last_event_turn, phase_start_turn, current_phase_v2)는
  // critical update에서 동기 저장됨 → 여기서는 중복 저장하지 않음 (double-write race 방지)
  // 보조 필드만 저장: emotion_baseline, locked_scenario
  if (phaseV2) {
    const phaseUpdate: Record<string, any> = {};
    // 감정 기준선 저장 (HOOK 구간에서만, 최초 1회)
    if (phaseV2 === 'HOOK' && emotionScore !== undefined) {
      phaseUpdate.emotion_baseline = emotionScore;
    }
    // 🆕 v9: 시나리오 고정 — GENERAL 아닌 시나리오가 처음 감지되면 세션에 잠금
    const detectedScenario = stateResult?.scenario;
    if (detectedScenario && detectedScenario !== 'GENERAL') {
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
    // 🆕 v17: promptStyle 저장
    if ((params as any).promptStyle) {
      phaseUpdate.last_prompt_style = (params as any).promptStyle;
    }
    if (Object.keys(phaseUpdate).length > 0) {
      await supabase
        .from('counseling_sessions')
        .update(phaseUpdate)
        .eq('id', sessionId);
      console.log(`[PostProcess] 📍 보조 필드 DB 저장: ${Object.keys(phaseUpdate).join(', ')}`);
    }
  }

  // 🆕 v10.2: 감정 히스토리 DB 저장
  if (savedEmotionHistory && savedEmotionHistory.length > 0) {
    await supabase
      .from('counseling_sessions')
      .update({ emotion_history: savedEmotionHistory })
      .eq('id', sessionId);
    console.log(`[PostProcess] 📊 감정 히스토리 DB 저장: [${savedEmotionHistory.join(', ')}]`);
  }

  // 🆕 v19: 감정 누적기 상태 저장
  if (savedEmotionAccumulator) {
    await supabase
      .from('counseling_sessions')
      .update({ emotion_accumulator: savedEmotionAccumulator })
      .eq('id', sessionId);
    console.log(`[PostProcess] 🧠 감정 누적기 DB 저장: signals=${savedEmotionAccumulator.signals?.length ?? 0}, deep="${savedEmotionAccumulator.deepEmotionHypothesis?.primaryEmotion ?? '(없음)'}"`);
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
  // 🆕 v20: 자동 제목 생성 (턴 1 — 시나리오 + 유저 메시지 기반)
  if (turnCount === 1 && userMessage) {
    const SCENARIO_TITLE: Record<string, string> = {
      READ_AND_IGNORED: '읽씹', GHOSTING: '잠수', JEALOUSY: '질투',
      LONG_DISTANCE: '장거리', INFIDELITY: '외도', BREAKUP_CONTEMPLATION: '이별 고민',
      BOREDOM: '권태기', GENERAL: '연애 고민',
    };
    const scenarioLabel = SCENARIO_TITLE[stateResult?.scenario ?? 'GENERAL'] ?? '연애 고민';
    const preview = userMessage.slice(0, 20).replace(/\n/g, ' ');
    sessionMeta.title = `${scenarioLabel} · ${preview}${userMessage.length > 20 ? '...' : ''}`;
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
