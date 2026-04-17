import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { CounselingPipeline } from '@/engines/pipeline';
import { checkRateLimitFromDb } from '@/lib/utils/rate-limit';
import { ingestMessage } from '@/lib/rag/ingestor';
import { generateMessage } from '@/lib/ai/claude';
import { getCascadeLog } from '@/lib/ai/provider-registry'; // 🆕 v46: 에러 시 캐스케이드 로그 전송
import type { PersonaMode } from '@/types/persona.types';
import type { SuggestionMeta } from '@/types/engine.types';
// 🆕 v31: 동적 import → static import (콜드 스타트 -100~300ms)
import { formatMemoryForPrompt } from '@/engines/memory/extract-memory';
import { getRecentReadings, detectRecurringCards, getRecurringCardsPrompt, saveReadingHistory } from '@/engines/tarot/history-engine';

export const maxDuration = 60; // Vercel Pro 타임아웃 (Architect 피드백)

// 🆕 ACE v4: 감정 메모리 요약 동적 생성 (기존 하드코딩 '' 대체)
function buildEmotionalMemorySummary(
  emotionHistory: number[],
  chatHistory: { role: string; content: string }[],
): string {
  if (emotionHistory.length < 2) return '';
  const first = emotionHistory[0];
  const last = emotionHistory[emotionHistory.length - 1];
  const trend = last > first ? '개선' : last < first ? '악화' : '안정';
  const peak = Math.min(...emotionHistory);
  const userMsgs = chatHistory.filter(m => m.role === 'user');
  const parts = [`감정: ${first}→${last} (${trend}), 최저${peak}`];
  const recent = userMsgs.slice(-3).map((m, i) =>
    `${userMsgs.length - 2 + i}턴: "${m.content.slice(0, 20)}"`
  );
  parts.push(...recent);
  return parts.join(' | ');
}

/** 🆕 v61: Supabase fetch failed 대응 재시도 헬퍼
 *  PostgrestBuilder는 PromiseLike(thenable)지만 Promise가 아니므로 PromiseLike로 받음
 *  🆕 v67: 진단 로깅 강화 — 각 시도마다 에러 타입 분류 + 마지막 시도 result 보존
 */
async function safeSupabaseRetry(fn: () => PromiseLike<any>, maxRetries = 2, delay = 500): Promise<any> {
  let lastResult: any = null;
  let lastThrown: any = null;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const result = await fn();
      if (!result.error) return result;
      // PostgREST 에러: status code 4xx/5xx 분류
      lastResult = result;
      const isTransient = result.status >= 500 || result.error?.message?.includes('fetch failed');
      console.warn(`[Supabase Retry] 시도 ${i + 1}/${maxRetries + 1} PostgREST 에러: code=${result.error?.code}, status=${result.status}, msg=${result.error?.message?.slice(0, 100)}`);
      if (!isTransient) {
        // 4xx (컬럼 누락, RLS, validation) → 재시도 무의미
        return result;
      }
    } catch (e: any) {
      lastThrown = e;
      if (e.message?.includes('fetch failed') || e.message?.includes('ECONNRESET') || e.message?.includes('ETIMEDOUT')) {
        console.warn(`[Supabase Retry] 시도 ${i + 1}/${maxRetries + 1} 네트워크 실패: ${e.message?.slice(0, 100)}`);
      } else {
        // 예상치 못한 에러는 즉시 throw
        console.error(`[Supabase Retry] 시도 ${i + 1}/${maxRetries + 1} 비-네트워크 예외 — 즉시 중단:`, e.message);
        throw e;
      }
    }
    if (i < maxRetries) await new Promise(res => setTimeout(res, delay * (i + 1))); // 지수 백오프
  }
  // 모든 시도 소진
  if (lastThrown) {
    return { error: { message: lastThrown.message, code: 'NETWORK_EXHAUSTED', cause: lastThrown.cause?.message } };
  }
  return lastResult ?? { error: { message: 'unknown_retry_failure', code: 'UNKNOWN' } };
}

export async function POST(req: NextRequest) {
  const t0 = Date.now(); // 🆕 v31: 성능 측정
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const tAuth = Date.now(); // 🆕 v31: 인증 시간 측정

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 🆕 v30: Profile + Body parse 병렬 (DB 쿼리 최적화)
  const [profileResult, body] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('is_premium, onboarding_situation, persona_mode, memory_profile, nickname')
      .eq('id', user.id)
      .single(),
    req.json() as Promise<{ sessionId: string; message: string; suggestionMeta?: SuggestionMeta }>,
  ]);
  const profile = profileResult.data;
  const { sessionId, message, suggestionMeta } = body;

  const tier = (process.env.NODE_ENV === 'development' || profile?.is_premium) ? 'premium' as const : 'free' as const;
  // 🆕 v33: DB 기반 Rate Limit (Serverless 환경 호환)
  const rateLimit = await checkRateLimitFromDb(supabase, user.id, tier);
  console.log(`[RateLimit] tier=${tier}, is_premium=${profile?.is_premium}, allowed=${rateLimit.allowed}, remaining=${rateLimit.remaining}`);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ error: '오늘 이용 가능한 횟수를 초과했어요. 내일 다시 이야기해요 💜' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!sessionId || !message) {
    return new Response('Missing sessionId or message', { status: 400 });
  }

  // 🆕 v30: 세션 + 메시지 INSERT + 메시지 SELECT + 전략 로그를 병렬 조회 (DB 최적화)
  // 4개 독립 쿼리를 Promise.all로 병렬 실행 → 가장 느린 1개 시간만 소요
  const [sessionResult, insertResult, msgsResult, strategyResult] = await Promise.all([
    supabase
      .from('counseling_sessions')
      .select('diagnostic_axes, current_phase_v2, completed_events, emotion_baseline, locked_scenario, last_event_turn, confirmed_emotion_score, emotion_history, last_prompt_style, emotion_accumulator, turn_count, phase_start_turn, session_metadata, luna_emotion_state, session_story, situation_read_history, luna_thought_history')
      .eq('id', sessionId)
      .single(),
    supabase.from('messages').insert({
      session_id: sessionId,
      user_id: user.id,
      sender_type: 'user',
      content: message,
      is_from_suggestion: suggestionMeta?.source === 'suggestion',
      suggestion_category: suggestionMeta?.category || null,
      suggestion_strategy_hint: suggestionMeta?.strategyHint || null,
    }),
    supabase
      .from('messages')
      .select('sender_type, content')
      .eq('session_id', sessionId)
      .in('sender_type', ['user', 'ai'])
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('strategy_logs')
      .select('strategy_type, response_type')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const { data: sessionData, error: sessionError } = sessionResult;
  if (sessionError) {
    console.error(`[Chat] ❌ 세션 로드 실패:`, sessionError.message, sessionError.code);
  }
  console.log(`[Chat] 📊 세션 로드: sessionData=${sessionData ? 'OK' : 'NULL'}, keys=${sessionData ? Object.keys(sessionData).join(',') : 'none'}, turn_count=${sessionData?.turn_count}, last_event_turn=${sessionData?.last_event_turn}, completed_events=${JSON.stringify(sessionData?.completed_events)}, phase=${sessionData?.current_phase_v2}`);

  const { error: insertError } = insertResult;
  if (insertError) {
    console.error('[Chat] ❌ 메시지 insert 실패:', insertError);
  }

  const { data: recentMsgs, error: selectError } = msgsResult;
  if (selectError) {
    console.error('[Chat] ❌ messages SELECT 실패:', selectError);
  }
  console.log(`[Chat] 📋 recentMsgs: ${recentMsgs?.length ?? 'null'}개 | sessionId: ${sessionId}`);

  const { data: recentStrategyLogs } = strategyResult;

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
    // 🆕 v33: fire-and-forget으로 전환 (TTFB -200~400ms)
    supabase
      .from('counseling_sessions')
      .update({
        confirmed_emotion_score: confirmedEmotionScore,
        completed_events: updatedEvents,
        current_phase_v2: 'MIRROR',
        last_event_turn: currentTurnForEvent,
        phase_start_turn: currentTurnForEvent,
        turn_count: currentTurnForEvent,
      })
      .eq('id', sessionId)
      .then(({ error: thermoErr }: any) => {
        if (thermoErr) console.error('[Chat] ❌ 온도계 UPDATE 실패:', thermoErr.message);
      });
    completedEvents.push('EMOTION_THERMOMETER');
    lastEventTurn = currentTurnForEvent;
    currentPhaseV2 = 'MIRROR';
    phaseStartTurn = currentTurnForEvent;
    console.log(`[Chat] 🔒 온도계 완료 → MIRROR 전환 + lastEventTurn=${currentTurnForEvent} (turnCount=${turnCount}, DB was: turn_count=${sessionData?.turn_count}, last_event_turn=${sessionData?.last_event_turn})`);
  }

  // 🆕 ACE v4: 메모리 프로필은 모든 턴에서 사용 (턴1 제한 해제)
  let previousSessionContext = '';
  // 메모리 프로필: 이미 profileResult에서 로드됨 — 모든 턴에서 프롬프트에 전달
  const memoryText = formatMemoryForPrompt((profile?.memory_profile as any) ?? {});
  if (memoryText) {
    previousSessionContext += `\n${memoryText}`;
  }
  // 🆕 ACE v4: userName 추출 (DB nickname 우선 → memory_profile 폴백)
  const memProfile = (profile?.memory_profile as any) ?? {};
  const userName: string | undefined = (profile as any)?.nickname
    || memProfile?.basicInfo?.nickname
    || memProfile?.basicInfo?.name
    || undefined;

  if (turnCount === 1) {
    try {
      const [prevSessionsResult, tarotReadingsResult] = await Promise.all([
        // ② 최근 5세션
        supabase.from('counseling_sessions')
          .select('session_summary, locked_scenario, emotion_end, emotion_baseline, homework_data, created_at')
          .eq('user_id', user.id).eq('status', 'completed').neq('id', sessionId)
          .order('ended_at', { ascending: false }).limit(5),
        // ③ 타로 반복 카드 (타로 모드만)
        persona === 'tarot'
          ? getRecentReadings(supabase, user.id, 5).catch(() => [] as any[])
          : Promise.resolve([] as any[]),
      ]);

      // ① 메모리 프로필은 이제 turnCount 조건 밖에서 처리됨 (ACE v4)

      // ② 이전 세션 처리
      const prevSessions = prevSessionsResult.data;
      if (prevSessions && prevSessions.length > 0) {
        const sessionParts: string[] = [];
        for (const prev of prevSessions.slice(0, 3)) {
          const date = prev.created_at ? new Date(prev.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) : '';
          const summary = prev.session_summary ? prev.session_summary.slice(0, 60) : '';
          const scenario = prev.locked_scenario ?? '';
          sessionParts.push(`  ${date}: ${scenario ? scenario + ' — ' : ''}${summary}`);
        }
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

      // 라운지 + 감정 체크인
      const memProfile2 = profile?.memory_profile as any;
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

      // ③ 타로 반복 카드 처리
      if (persona === 'tarot' && tarotReadingsResult && tarotReadingsResult.length > 0) {
        const recurring = detectRecurringCards(tarotReadingsResult);
        if (recurring.length > 0) {
          previousSessionContext += getRecurringCardsPrompt(recurring);
          console.log(`[Chat] 🔮 반복 카드 ${recurring.length}개 감지: ${recurring.map(r => r.cardName).join(', ')}`);
        }
      }
    } catch (err) {
      console.warn('[Chat] 이전 세션/메모리 로드 실패 (무시):', err);
    }
  }

  // 🆕 선택지 게이트용 — 최근 선택지 표시 턴 + 전략 연속 횟수 계산
  // (recentStrategyLogs는 위의 v30 병렬 쿼리에서 이미 로드됨)

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

  // 🆕 v31: suggestion 폴백 DB 쿼리 제거 — chatHistory 기반으로만 판단 (-100~300ms)
  const aiMessages = chatHistory.filter(m => m.role === 'ai');
  let lastSuggestionTurn = -1;
  for (let i = aiMessages.length - 1; i >= 0; i--) {
    if (aiMessages[i].content.includes('[SUGGESTIONS:') || aiMessages[i].content.includes('SUGGESTIONS')) {
      lastSuggestionTurn = i + 1;
      break;
    }
  }
  // 🆕 v31: suggestion이 chatHistory에서 안 보이면 suggestionMeta 기반으로 추정 (DB 쿼리 제거)
  if (lastSuggestionTurn === -1 && suggestionMeta?.source === 'suggestion') {
    lastSuggestionTurn = Math.max(0, turnCount - 1);
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
      const tDbDone = Date.now(); // 🆕 v31: DB 완료 시간
      console.log(`[Perf] ⏱️ auth=${tAuth - t0}ms, db=${tDbDone - tAuth}ms, total_pre_pipeline=${tDbDone - t0}ms`);
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
        let criticalLunaEmotion: string | undefined = undefined;  // 🆕 v29
        let criticalSessionStory: string | undefined = undefined;  // 🆕 v30

        for await (const event of pipeline.execute(
          message,
          chatHistory,
          (profile?.onboarding_situation
            ? `\n[사용자 성별: ${profile.onboarding_situation === 'male' ? '남성' : profile.onboarding_situation === 'female' ? '여성' : '선택하지 않음'}] (참고만 하되 호칭이나 말투에 반영하지 마. 루나는 성별 관계없이 동일한 말투를 사용해.)`
            : '\n[사용자 성별: 선택하지 않음]') + previousSessionContext,
          { supabase, userId: user.id, sessionId }, // 🆕 v70: sessionId 전달 (working memory 로드용)
          persona,
          turnCount,
          suggestionMeta,
          lastSuggestionTurn,
          consecutiveStrategyCount,
          // 🆕 v3: 직전 응답 모드 (연속 방지)
          (recentStrategyLogs?.[0] as any)?.response_type ?? undefined,
          // 🆕 ACE v4: 감정 메모리 요약 — 동적 생성
          buildEmotionalMemorySummary(emotionHistory, chatHistory),
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
          // 🆕 v29: 루나 감정 상태 (세션간 유지)
          sessionData?.luna_emotion_state ? JSON.stringify(sessionData.luna_emotion_state) : null,
          // 🆕 v30: 세션 스토리 (대화 흐름 누적)
          sessionData?.session_story ? JSON.stringify(sessionData.session_story) : null,
          // 🆕 ACE v4: 메모리 프로필 + 유저 이름 → HLRE에 전달
          profile?.memory_profile ?? undefined,
          userName,
          // 🆕 v35: 이전 턴에 저장된 작전 모드 — session_metadata.strategyMode에서 복원
          (runningSessionMeta as any)?.strategyMode ?? null,
          // 🆕 v37: 이전 턴들의 인사이트 히스토리 — 매 턴 누적 유지
          sessionData?.situation_read_history ?? [],
          sessionData?.luna_thought_history ?? [],
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
              // 🆕 v29: __HLRE_REPLACE__ 서버에서 처리 — 클라이언트에 태그 노출 방지
              if (typeof event.data === 'string' && event.data.includes('__HLRE_REPLACE__')) {
                const cleanedReplace = event.data.replace(/\n?__HLRE_REPLACE__/g, '');
                if (cleanedReplace.trim()) {
                  fullText = cleanedReplace; // 기존 fullText를 교체
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'hlre_replace', data: cleanedReplace })}\n\n`)
                  );
                }
                break;
              }
              // 🆕 v26: SUGGESTIONS/STICKER 태그가 텍스트에 남으면 제거
              let chunk = event.data as string;
              chunk = chunk.replace(/\[?SUGGESTIONS:?\]?\s*\[[^\]]*\]/gi, '');
              chunk = chunk.replace(/SUGGESTIONS:\s*"[^"]*"(,\s*"[^"]*")*/gi, '');
              chunk = chunk.replace(/\bSUGGESTIONS\b[^\n]*/gi, '');
              // 🆕 v35: 한글 선택지 배열 제거 (AI가 직접 ["옵션1", "옵션2"] 형태로 출력하는 경우)
              chunk = chunk.replace(/\[\s*"[^"]{1,20}"\s*(,\s*"[^"]{1,20}"\s*){1,5}\]/g, '');
              // 🆕 v36: 루나 인사이트 태그 제거 (텍스트 버블에 노출 방지)
              chunk = chunk.replace(/\[SITUATION_READ:[^\]]*\]/g, '');
              chunk = chunk.replace(/\[LUNA_THOUGHT:[^\]]*\]/g, '');
              chunk = chunk.replace(/\[PHASE_SIGNAL:[^\]]*\]/g, '');
              chunk = chunk.replace(/\[SITUATION_CLEAR:[^\]]*\]/g, '');
              // 🆕 v42: 빈 대괄호 [] 제거 (선택지 제거 후 남은 잔해)
              chunk = chunk.replace(/\[\s*\]/g, '');
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
              // 🆕 v28: 이벤트를 messages 테이블에 저장 (재진입 시 복원용)
              safeSupabaseRetry(() => 
                supabase.from('messages').insert({
                  session_id: sessionId,
                  user_id: user.id,
                  sender_type: 'event',
                  content: JSON.stringify(event.data),
                })
              ).then(({ error: evtErr }: any) => { 
                if (evtErr) console.error('[Chat] ❌ 이벤트 저장 최종 실패:', evtErr.message || evtErr); 
              });
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
                saveReadingHistory(
                  supabase, user.id, sessionId,
                  tarotSessionMeta?.chosenSpreadType ?? 'three',
                  lockedScenario ?? 'GENERAL',
                  drawnCards,
                ).catch(() => {});
              }
              break;

            case 'phase_change':
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'phase_change', data: event.data })}\n\n`)
              );
              break;

            // 🆕 v40: 루나 딥리서치 (Gemini Grounding) 로딩 UI 이벤트
            case 'luna_thinking_deep':
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'luna_thinking_deep', data: event.data })}\n\n`)
              );
              break;

            // 🆕 v48: 캐스케이드 재시도 상태 — 클라이언트 UI에 재시도 진행 표시
            case 'retry_status':
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'retry_status', data: event.data })}\n\n`)
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
              // 🆕 v29: 루나 감정 상태
              const lunaEmoState = (event.data as any).lunaEmotionState;
              if (lunaEmoState) {
                criticalLunaEmotion = lunaEmoState;
              }
              // 🆕 v30: 세션 스토리 상태
              const storyState = (event.data as any).sessionStoryState;
              if (storyState) {
                criticalSessionStory = storyState;
              }

              // 🆕 v35: 작전 모드 상태 (session_metadata에 누적)
              const strategyMode = (event.data as any).strategyMode;
              if (strategyMode !== undefined) {
                runningSessionMeta = { ...runningSessionMeta, strategyMode };
                console.log(`[Chat] 🔥 작전 모드 저장: ${strategyMode ?? 'null'}`);
              }

              // 🆕 v41.1: 친밀도 상태 저장 — 페르소나별 분리 구조
              //   - intimacyAll: 전체 { luna, tarot } 구조 (HLRE가 active persona만 업데이트)
              //   - intimacyPersonaKey: 이번 세션에서 실제 업데이트된 페르소나
              //   - intimacyState: 해당 페르소나 단일 상태 (로그용)
              const intimacyState = (event.data as any).intimacyState;
              const intimacyAll = (event.data as any).intimacyAll;
              const intimacyPersonaKey = (event.data as any).intimacyPersonaKey as 'luna' | 'tarot' | undefined;
              const intimacyLevelUp = (event.data as any).intimacyLevelUp;
              if (intimacyAll && intimacyPersonaKey) {
                // fire-and-forget DB 저장 — 기존 데이터 보호 + 활성 페르소나만 업데이트
                (async () => {
                  try {
                    const { data: prof } = await supabase
                      .from('user_profiles')
                      .select('user_model')
                      .eq('id', user.id)
                      .single();
                    const curr = (prof?.user_model as any) ?? {};
                    const existingIntimacy = curr.intimacy ?? {};

                    // 🛡️ 핵심 방어: HLRE가 기본값을 반환한 경우 기존 DB를 덮어쓰지 않음
                    // 활성 페르소나만 새 데이터로 교체, 비활성은 기존 DB 데이터 유지
                    const safeIntimacy = {
                      luna: intimacyPersonaKey === 'luna' && intimacyAll.luna
                        ? intimacyAll.luna   // 이번 세션에서 실제 업데이트된 루나 데이터
                        : (existingIntimacy.luna ?? intimacyAll.luna),  // DB 기존 데이터 유지
                      tarot: intimacyPersonaKey === 'tarot' && intimacyAll.tarot
                        ? intimacyAll.tarot  // 이번 세션에서 실제 업데이트된 타로냥 데이터
                        : (existingIntimacy.tarot ?? intimacyAll.tarot),  // DB 기존 데이터 유지
                    };

                    // 레거시 lunaRelationship 미러 — 루나 기준으로만 업데이트
                    const lunaDims = safeIntimacy.luna?.dimensions;
                    const legacyMirror = lunaDims
                      ? {
                          intimacyScore: Math.round(
                            (lunaDims.trust + lunaDims.openness + lunaDims.bond + lunaDims.respect) / 4,
                          ),
                          trustLevel: Math.min(1, lunaDims.trust / 100),
                        }
                      : {};

                    const nextUserModel = {
                      ...curr,
                      intimacy: safeIntimacy, // { luna, tarot } 안전하게 머지된 데이터
                      lunaRelationship: {
                        ...(curr.lunaRelationship ?? {}),
                        ...legacyMirror,
                      },
                    };
                    await supabase
                      .from('user_profiles')
                      .update({ user_model: nextUserModel })
                      .eq('id', user.id);

                    if (intimacyState) {
                      console.log(
                        `[Intimacy:${intimacyPersonaKey}] 💾 저장: Lv.${intimacyState.level} ${intimacyState.levelName} | 🛡️${intimacyState.dimensions.trust.toFixed(0)} 💜${intimacyState.dimensions.openness.toFixed(0)} 🦊${intimacyState.dimensions.bond.toFixed(0)} ⭐${intimacyState.dimensions.respect.toFixed(0)} | 비활성 페르소나: DB 기존값 유지`,
                      );
                    }
                  } catch (e) {
                    console.warn('[Intimacy] 저장 실패:', (e as Error).message);
                  }
                })();
              }

              // 🆕 v41: 레벨업 이벤트 → 클라이언트에 즉시 전송 (축하 팝업용)
              if (intimacyLevelUp) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: 'intimacy_level_up', data: intimacyLevelUp })}\n\n`,
                  ),
                );
                console.log(
                  `[Intimacy] 🎉 레벨업 이벤트 전송: Lv.${intimacyLevelUp.oldLevel} → Lv.${intimacyLevelUp.newLevel} (${intimacyLevelUp.newLevelName})`,
                );
              }

              // 🆕 v34: AI 동적 컨텍스트 로그 — SSE로 클라이언트 전송 + 서버 콘솔
              const ctxLog = (event.data as any)._contextLog;
              if (ctxLog) {
                const responseTimeMs = Date.now() - t0;
                // 서버 콘솔 (간략)
                // 🆕 v66: prompt 길이는 디버그용 contextLog 길이일 뿐, 실제 LLM 입력은 좌뇌/ACE/KBE 가 자기 시스템 프롬프트 사용 (engine-prompt-logger 참조)
                console.log(`[AI Context] 🧠 턴${turnCount} | ${persona} | ${finalPhaseV2} | ctxLog=${ctxLog.systemPrompt.length}자 (디버그용, 실제 LLM 입력은 LEFT_BRAIN/ACE_V5_RIGHT_BRAIN/KBE 로그 참조) | msgs=${ctxLog.recentMessages.length}개 | ${responseTimeMs}ms`);
                // 🆕 v46: 캐스케이드 로그도 서버 콘솔에 요약
                if (ctxLog.cascadeLog?.length) {
                  console.log(`[AI Cascade] 📊 시도 ${ctxLog.cascadeLog.length}건:`, ctxLog.cascadeLog.map((l: any) => `${l.provider}/${l.model}→${l.status}${l.totalMs ? `(${l.totalMs}ms)` : ''}`).join(' | '));
                }
                // 클라이언트 SSE 전송 (브라우저 F12에서 확인)
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: 'context_log',
                    data: {
                      turnCount,
                      responseTimeMs,
                      systemPrompt: ctxLog.systemPrompt,
                      chatMessages: ctxLog.recentMessages,
                      pipelineMeta: ctxLog.pipelineMeta,
                      aiResponse: fullText,
                      cascadeLog: ctxLog.cascadeLog || [], // 🆕 v46: 모델별 시도 로그
                      engineLogs: ctxLog.engineLogs || [], // 🆕 Cognitive Engine Logs
                    },
                  })}\n\n`)
                );
              }

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'done', data: { phaseV2: finalPhaseV2 } })}\n\n`)
              );
              break;
          }
        }

        // 🆕 v33: 세션 UPDATE 통합 (C2 Race Condition 수정)
        // criticalUpdate + batchUpdate(savePostProcessing)의 세션 필드를 단일 UPDATE로 통합
        // → 동일 row에 대한 2개 독립 UPDATE 경쟁 제거
        {
          const unifiedSessionUpdate: Record<string, any> = {
            // critical 필드
            turn_count: turnCount,
            last_message_preview: fullText.slice(0, 100) || message.slice(0, 100),
            last_message_at: new Date().toISOString(),
          };
          if (finalCompletedEvents && finalCompletedEvents.length > 0) {
            unifiedSessionUpdate.completed_events = finalCompletedEvents;
            unifiedSessionUpdate.last_event_turn = finalLastEventTurn;
            unifiedSessionUpdate.phase_start_turn = finalPhaseStartTurn;
          }
          if (finalPhaseV2) unifiedSessionUpdate.current_phase_v2 = finalPhaseV2;
          if (criticalLunaEmotion) unifiedSessionUpdate.luna_emotion_state = JSON.parse(criticalLunaEmotion);
          if (criticalSessionStory) unifiedSessionUpdate.session_story = JSON.parse(criticalSessionStory);

          // 🆕 v33: 기존 savePostProcessing에서 처리하던 세션 필드를 여기로 통합
          if (updatedAxes && Object.keys(updatedAxes).length > 0) unifiedSessionUpdate.diagnostic_axes = updatedAxes;
          if (finalPhaseV2 === 'HOOK' && stateResult?.emotionScore !== undefined) {
            unifiedSessionUpdate.emotion_baseline = stateResult.emotionScore;
          }
          if (finalPromptStyle) unifiedSessionUpdate.last_prompt_style = finalPromptStyle;
          if (finalEmotionHistory && finalEmotionHistory.length > 0) unifiedSessionUpdate.emotion_history = finalEmotionHistory;
          if (finalEmotionAccumulator) unifiedSessionUpdate.emotion_accumulator = finalEmotionAccumulator;
          if (turnCount === 1 && stateResult?.emotionScore !== undefined) {
            unifiedSessionUpdate.emotion_start = stateResult.emotionScore;
          }
          if (turnCount === 1 && message) {
            const ST: Record<string, string> = { READ_AND_IGNORED: '읽씹', GHOSTING: '잠수', JEALOUSY: '질투', LONG_DISTANCE: '장거리', INFIDELITY: '외도', BREAKUP_CONTEMPLATION: '이별 고민', BOREDOM: '권태기', GENERAL: '연애 고민' };
            const sl = ST[stateResult?.scenario ?? 'GENERAL'] ?? '연애 고민';
            const pv = message.slice(0, 20).replace(/\n/g, ' ');
            unifiedSessionUpdate.title = `${sl} · ${pv}${message.length > 20 ? '...' : ''}`;
          }

          // 🆕 v38: 인사이트 필드는 별도 UPDATE로 분리 (컬럼 미존재 시 메인 UPDATE 실패 방지)
          // situation_read_history 컬럼이 없으면 전체 통합 UPDATE가 실패하여
          // completed_events 등 핵심 상태가 저장 안 되는 치명적 버그가 발생했음
          const insightUpdate: Record<string, any> = {};
          if (stateResult?.situationRead) {
            insightUpdate.situation_read = stateResult.situationRead;
          }
          if (stateResult?.lunaThoughtHistory && stateResult.lunaThoughtHistory.length > 0) {
            insightUpdate.luna_thought_history = stateResult.lunaThoughtHistory;
          }
          if (stateResult?.situationReadHistory && stateResult.situationReadHistory.length > 0) {
            insightUpdate.situation_read_history = stateResult.situationReadHistory;
          }
          // 인사이트 필드는 별도 fire-and-forget (실패해도 무시)
          if (Object.keys(insightUpdate).length > 0) {
            supabase
              .from('counseling_sessions')
              .update(insightUpdate)
              .eq('id', sessionId)
              .then(({ error: insightErr }: any) => {
                if (insightErr) console.warn(`[Chat] ⚠️ 인사이트 저장 실패 (무시):`, insightErr.message);
              });
          }

          // 🆕 v35: session_metadata (작전 모드 포함) 영구 저장
          // 🆕 v73: working_memory 키는 pipeline 에서 atomic RPC 로 따로 저장함 → 여기서 덮어쓰지 않도록 DB 의 최신본 보존
          try {
            const { data: freshSess } = await supabase
              .from('counseling_sessions')
              .select('session_metadata')
              .eq('id', sessionId)
              .maybeSingle();
            const freshMeta = (freshSess?.session_metadata as any) ?? {};
            const mergedMeta = {
              ...runningSessionMeta,
              // WM 은 freshMeta 의 것을 우선 (pipeline 이 방금 atomic 저장한 최신본)
              ...(freshMeta?.working_memory ? { working_memory: freshMeta.working_memory } : {}),
            };
            unifiedSessionUpdate.session_metadata = mergedMeta;
            const wmTurn = freshMeta?.working_memory?.turn_idx ?? '?';
            console.log(`[Chat:v73] 🛡️ session_metadata 병합 (WM 보존): turn=${wmTurn}`);
          } catch (e: any) {
            console.warn('[Chat:v73] WM 보존 실패, 기존 방식으로 덮어쓰기:', e?.message);
            unifiedSessionUpdate.session_metadata = runningSessionMeta;
          }

          // 🎯 v66: safeSupabaseRetry 로 fetch failed 시 자동 재시도
          //   기존: 단일 fire-and-forget → fetch failed 1회로 영구 손실
          //   변경: 2회 재시도 (총 3회) → 일시적 네트워크 끊김에 강건
          // 🆕 v67: 에러 상세 진단 로깅 (DB 구성 문제 빠른 파악)
          const updateStartedAt = Date.now();
          const updateFieldKeys = Object.keys(unifiedSessionUpdate);
          safeSupabaseRetry(() =>
            supabase
              .from('counseling_sessions')
              .update(unifiedSessionUpdate)
              .eq('id', sessionId),
          ).then(({ error: updateError, status }: any) => {
            const updateLatencyMs = Date.now() - updateStartedAt;
            if (updateError) {
              console.error('[Chat] ❌ 통합 세션 UPDATE 최종 실패 (3회 재시도 후)', {
                message: updateError.message,
                code: updateError.code,
                details: updateError.details,
                hint: updateError.hint,
                statusCode: status,
                sessionId,
                turnCount,
                phase: finalPhaseV2,
                latencyMs: updateLatencyMs,
                fieldCount: updateFieldKeys.length,
                fieldKeys: updateFieldKeys,
                supabaseUrlSet: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
                serviceKeySet: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
              });
              // PostgREST 흔한 에러 진단 힌트
              if (updateError.message?.includes('column') && updateError.message?.includes('does not exist')) {
                console.error('[Chat] 💡 DB 컬럼 누락 — Supabase 마이그레이션 확인 필요:', updateError.message);
              } else if (updateError.code === 'PGRST116' || updateError.code === 'PGRST301') {
                console.error('[Chat] 💡 RLS 정책 차단 — counseling_sessions UPDATE policy 확인:', updateError.code);
              } else if (updateError.message?.includes('fetch failed')) {
                console.error('[Chat] 💡 네트워크/타임아웃 — Supabase 인스턴스 상태 또는 cold start 의심');
              }
            } else {
              console.log(`[Chat] 🔒 통합 세션 저장: ${updateFieldKeys.length}개 필드, phase=${finalPhaseV2}, turn=${turnCount}, ${updateLatencyMs}ms`);
            }
          }).catch((e: any) => {
            console.error('[Chat] ❌ 통합 세션 UPDATE 예외 (catch):', {
              message: e?.message,
              cause: e?.cause?.message,
              code: e?.code,
              stack: e?.stack?.split('\n').slice(0, 3).join('\n'),
            });
          });
          console.log(`[Perf] ⏱️ 총 응답 시간: ${Date.now() - t0}ms`);
        }

        // 🆕 v33: 후처리 — INSERT만 담당 (세션 UPDATE는 위에서 통합 처리)
        savePostProcessing(supabase, {
          sessionId,
          userId: user.id,
          aiContent: fullText,
          userMessage: message,
          stateResult,
          strategyResult,
          responseMode,
          phaseV2: finalPhaseV2,
          completedEvents: finalCompletedEvents,
          emotionScore: stateResult?.emotionScore,
          turnCount,
        }).catch(console.error);

      } catch (err: any) {
        console.error('[Chat] ❌ 스트리밍 에러:', err?.message || err);

        // 🆕 v46: 에러 시에도 캐스케이드 로그 전송 → F12에서 어디서 터졌는지 확인 가능
        const errorCascadeLog = getCascadeLog();
        if (errorCascadeLog.length > 0) {
          console.error('[Chat] 📊 에러 시점 캐스케이드 로그:', errorCascadeLog.map(l => `${l.provider}/${l.model}→${l.status}`).join(' | '));
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'context_log',
                data: {
                  turnCount,
                  responseTimeMs: Date.now() - t0,
                  systemPrompt: '[에러로 인해 미생성]',
                  chatMessages: [],
                  pipelineMeta: { error: err?.message?.slice(0, 200), phase: 'ERROR' },
                  aiResponse: fullText || '[응답 없음]',
                  cascadeLog: errorCascadeLog,
                },
              })}\n\n`)
            );
          } catch (_) { /* enqueue 실패 무시 */ }
        }

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

/** 비동기 후처리 (fire-and-forget) — v33: INSERT 전용 (세션 UPDATE는 done 핸들러에서 통합 처리) */
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
    phaseV2?: string;
    completedEvents?: string[];
    emotionScore?: number;
    turnCount?: number;
  }
) {
  const { sessionId, userId, aiContent, userMessage, stateResult, strategyResult, responseMode, phaseV2, completedEvents: evts, emotionScore, turnCount } = params;

  // 🆕 v73: 빈/에러 AI 응답 DB insert 가드 — "응답을 받지 못했어요 💜" 같은 오염 차단
  const safeAiContent = (aiContent ?? '').trim();
  const isErrorMsg = /응답을 받지 못했|생성하는 중 문제|다시 시도해 주세요/.test(safeAiContent);
  const shouldInsertAi = safeAiContent.length >= 5 && !isErrorMsg;
  if (!shouldInsertAi) {
    console.warn(`[Chat:v73] 🚫 빈/에러 AI 응답 → messages insert SKIP (len=${safeAiContent.length}, errorMsg=${isErrorMsg})`);
  }

  // 🆕 v31: INSERT 3개 병렬화 (직렬 → Promise.all, ~400ms 절약)
  await Promise.all([
    shouldInsertAi ? supabase.from('messages').insert({
      session_id: sessionId, user_id: userId, sender_type: 'ai', content: safeAiContent,
      sentiment_score: stateResult?.emotionScore, cognitive_distortions: stateResult?.cognitiveDistortions ?? [],
      horsemen_detected: stateResult?.horsemenDetected ?? [], risk_level: stateResult?.riskLevel ?? 'LOW',
      is_flooding: stateResult?.isFlooding ?? false, strategy_used: strategyResult?.strategyType,
      model_used: strategyResult?.modelTier,
    }) : Promise.resolve(),
    strategyResult ? supabase.from('strategy_logs').insert({
      session_id: sessionId, user_id: userId, strategy_type: strategyResult.strategyType,
      selection_reason: strategyResult.reason, thinking_budget: strategyResult.thinkingBudget,
      model_tier: strategyResult.modelTier, state_snapshot: stateResult, response_type: responseMode ?? null,
    }) : Promise.resolve(),
    stateResult ? supabase.from('emotion_logs').insert({
      user_id: userId, session_id: sessionId, emotion_score: stateResult.emotionScore,
    }) : Promise.resolve(),
  ]);

  // RAG 인제스팅 (fire-and-forget) — 유저 메시지
  ingestMessage({ supabase, userId, sessionId, content: userMessage,
    emotionScore: stateResult?.emotionScore, strategyUsed: strategyResult?.strategyType,
  }).catch((err) => console.error('[PostProcess] RAG 인제스팅 실패:', err));

  // 🆕 v70/v73: AI 응답도 임베딩 — 루나 자기 말 기억용 (fire-and-forget) + 에러 메시지 가드
  if (shouldInsertAi) {
    import('@/lib/rag/ingestor').then(({ ingestAiResponse }) => {
      ingestAiResponse({ supabase, userId, sessionId, content: safeAiContent,
        strategyUsed: strategyResult?.strategyType,
      }).catch((err) => console.warn('[PostProcess:v70] AI 임베딩 실패:', err?.message));
    }).catch(() => { /* ignore */ });
  }

  // 🆕 v33: 시나리오 잠금 (1회 SELECT 필요 — 세션 UPDATE와 독립)
  // 🆕 v73: 재평가 로직 추가 — 2턴 연속 다른 시나리오 감지 시 덮어쓰기 (UNREQUITED_LOVE 오잠금 자동 해제)
  const detectedScenario = stateResult?.scenario;
  if (detectedScenario && detectedScenario !== 'GENERAL') {
    const { data: curSess } = await supabase.from('counseling_sessions')
      .select('locked_scenario, session_metadata').eq('id', sessionId).single();

    if (!curSess?.locked_scenario) {
      // 첫 잠금
      await supabase.from('counseling_sessions').update({ locked_scenario: detectedScenario }).eq('id', sessionId);
      console.log(`[PostProcess:v73] 🔒 시나리오 잠금: ${detectedScenario}`);
    } else if (curSess.locked_scenario !== detectedScenario) {
      // 🆕 v73: 재평가 — 2턴 연속 다른 시나리오 감지 시 덮어쓰기
      const meta = (curSess.session_metadata as any) ?? {};
      const shiftKey = `scenario_shift_${detectedScenario}`;
      const shiftCount = (meta[shiftKey] ?? 0) + 1;

      if (shiftCount >= 2) {
        await supabase.from('counseling_sessions').update({
          locked_scenario: detectedScenario,
          session_metadata: { ...meta, [shiftKey]: 0 },  // 카운트 리셋
        }).eq('id', sessionId);
        console.log(`[PostProcess:v73] 🔄 시나리오 재평가: ${curSess.locked_scenario} → ${detectedScenario} (2턴 연속 감지)`);
      } else {
        // 누적만 기록
        await supabase.from('counseling_sessions').update({
          session_metadata: { ...meta, [shiftKey]: shiftCount },
        }).eq('id', sessionId);
        console.log(`[PostProcess:v73] 📊 시나리오 변화 누적: ${curSess.locked_scenario} vs ${detectedScenario} (${shiftCount}/2)`);
      }
    }
  }

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

  // 🆕 v33 (H5): turnCount 기반 트리거 (COUNT 쿼리 제거 — -50ms/턴)
  if (turnCount && turnCount >= 10 && turnCount % 10 === 0) {
    generateSessionSummary(supabase, sessionId)
      .catch((err) => console.error('[PostProcess] 세션 요약 실패:', err));
  }
}

/** 세션 요약 생성 — v33 (H5): COUNT 쿼리 제거, 호출자에서 turnCount 기반 트리거 */
async function generateSessionSummary(
  supabase: any,
  sessionId: string,
): Promise<void> {
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
