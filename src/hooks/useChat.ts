'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatMessage, StreamEvent } from '@/types/chat.types';
import type { NudgeAction, StateResult, SuggestionMeta, SuggestionItem, PhaseEvent, ConversationPhaseV2 } from '@/types/engine.types';
import type { PanelResponse } from '@/types/persona.types';
import { MIN_DELAY_MS } from '@/lib/utils/typing-delay';
import { calcTypingDelay, calcBubbleGapDelay } from '@/engines/human-like/adaptive-typing';
import type { LunaEmotion } from '@/engines/human-like/luna-emotion-core';

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  nudges: NudgeAction[];
  stateResult: StateResult | null;
  suggestions: SuggestionItem[];
  panelData: PanelResponse | null;
  sendMessage: (content: string, meta?: SuggestionMeta) => Promise<void>;
  axesProgress: { filledCount: number; totalCount: number; isComplete: boolean } | null;
  phaseEvents: PhaseEvent[];
  currentPhase: ConversationPhaseV2 | null;
  phaseProgress: number;
  concernDepth: 'light' | 'medium' | 'deep' | null;
  depthOverride: 'light' | 'medium' | 'deep' | null;
  setDepthOverride: (d: 'light' | 'medium' | 'deep' | null) => void;
  sessionStatus: 'active' | 'completed' | 'crisis' | null;
  sessionSummary: string | null;
  pendingEventLock: boolean;
  lunaThinking: string;
  understandingLevel: number;
  // 🆕 v40: 루나 딥리서치 (Gemini Grounding) "진짜 고민 중" 상태
  thinkingDeep: {
    active: boolean;
    phrases: string[];
    keyword?: string;
  } | null;
  // 🆕 v48: 캐스케이드 재시도 상태 — 예쁜 재시도 UI용
  retryStatus: {
    retries: { attempt: number; maxAttempts: number; message: string; reason: string }[];
    active: boolean;
  } | null;
  // 🆕 v41: 친밀도 레벨업 (축하 팝업용)
  intimacyLevelUp: {
    oldLevel: number;
    newLevel: number;
    newLevelName: string;
  } | null;
  /** 친밀도 레벨업 팝업을 닫음 */
  dismissIntimacyLevelUp: () => void;
}

export function useChat(sessionId: string): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [nudges, setNudges] = useState<NudgeAction[]>([]);
  const [stateResult, setStateResult] = useState<StateResult | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [panelData, setPanelData] = useState<PanelResponse | null>(null);
  const [axesProgress, setAxesProgress] = useState<{ filledCount: number; totalCount: number; isComplete: boolean } | null>(null);
  const [phaseEvents, setPhaseEvents] = useState<PhaseEvent[]>([]);
  const [currentPhase, setCurrentPhase] = useState<ConversationPhaseV2 | null>('HOOK');
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [concernDepth, setConcernDepth] = useState<'light' | 'medium' | 'deep' | null>(null);
  const [depthOverride, setDepthOverride] = useState<'light' | 'medium' | 'deep' | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'active' | 'completed' | 'crisis' | null>(null);
  const [sessionSummary, setSessionSummary] = useState<string | null>(null);
  // 🆕 ACE v4: 이벤트 대기 잠금 — 이벤트 선택 전까지 채팅 입력 비활성화
  const [pendingEventLock, setPendingEventLock] = useState(false);
  // 🆕 ACE v4: 루나의 현재 생각 + 이해도 (PhaseProgress 동적 표시용)
  const [lunaThinking, setLunaThinking] = useState('이야기 더 들어볼게...');
  // 🆕 v40: 루나 딥리서치(Gemini Grounding) "진짜 고민 중" 상태
  const [thinkingDeep, setThinkingDeep] = useState<{
    active: boolean;
    phrases: string[];
    keyword?: string;
  } | null>(null);
  // 🆕 v48: 캐스케이드 재시도 상태
  const [retryStatus, setRetryStatus] = useState<{
    retries: { attempt: number; maxAttempts: number; message: string; reason: string }[];
    active: boolean;
  } | null>(null);
  // 🆕 v41: 친밀도 레벨업 팝업 상태
  const [intimacyLevelUp, setIntimacyLevelUp] = useState<{
    oldLevel: number;
    newLevel: number;
    newLevelName: string;
  } | null>(null);
  const [understandingLevel, setUnderstandingLevel] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  // 🆕 v20: 턴 내 이벤트 중복 방지 (state 대신 ref로 — React 배칭 이슈 방지)
  const firedEventTypesRef = useRef<Set<string>>(new Set());

  // 세션 진입 시 기존 메시지 로드
  useEffect(() => {
    let cancelled = false;
    setMessages([]);

    fetch(`/api/sessions/${sessionId}/messages`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load messages');
        return r.json();
      })
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          // 🆕 v28: AI 메시지의 ||| 구분자를 여러 말풍선으로 분리 (재진입 시에도 카톡 스타일)
          const loaded: ChatMessage[] = [];
          for (const m of data) {
            if (m.sender_type === 'ai' && m.content?.includes('|||')) {
              const chunks = m.content.split('|||').map((c: string) => c.trim()).filter((c: string) => c.length > 0);
              chunks.forEach((chunk: string, i: number) => {
                loaded.push({
                  id: i === 0 ? m.id : `${m.id}-${i}`,
                  sessionId: m.session_id || sessionId,
                  senderType: 'ai' as const,
                  content: chunk,
                  createdAt: m.created_at,
                });
              });
            } else {
              loaded.push({
                id: m.id,
                sessionId: m.session_id || sessionId,
                senderType: m.sender_type,
                content: m.content,
                createdAt: m.created_at,
              });
            }
          }
          setMessages(loaded);

          // 🆕 v43: 세션 레벨 이벤트 중복 방지 — DB에서 로드된 event 메시지 타입을 firedEventTypesRef에 seed
          // 이미 발동된 이벤트가 SSE로 또 들어와도 클라이언트에서 차단
          for (const msg of loaded) {
            if (msg.senderType === ('event' as any)) {
              try {
                const evt = JSON.parse(msg.content);
                if (evt?.type) {
                  firedEventTypesRef.current.add(evt.type);
                }
              } catch { /* ignore */ }
            }
          }
          console.log(`[useChat] 📦 세션 이벤트 복원: [${[...firedEventTypesRef.current].join(', ')}]`);
        }
      })
      .catch((err) => {
        console.error('[useChat] 기존 메시지 로드 실패:', err);
      });

    // 세션 메타데이터 로드 (phase, 시나리오, 감정 등 복원)
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!cancelled && data) {
          setSessionStatus(data.status);
          setSessionSummary(data.session_summary);

          // 🆕 Phase 상태 복원 (재진입 시 Phase Progress 바 표시용)
          if (data.current_phase_v2) {
            setCurrentPhase(data.current_phase_v2 as ConversationPhaseV2);
            // PhaseManager 기반 progress 계산 (턴 수 기반 보정)
            const PHASE_ORDER = ['HOOK', 'MIRROR', 'BRIDGE', 'SOLVE', 'EMPOWER'];
            const phaseIdx = PHASE_ORDER.indexOf(data.current_phase_v2);
            const baseProgress = phaseIdx >= 0 ? phaseIdx * 20 : 0;
            const turnBonus = Math.min((data.turn_count ?? 0) * 3, 15);
            setPhaseProgress(Math.min(baseProgress + turnBonus, 100));
          }

          // 🆕 시나리오 + 감정 상태 + 인사이트 복원
          if (data.locked_scenario || data.emotion_baseline !== null || data.situation_read) {
            setStateResult((prev) => ({
              ...(prev || {
                emotionScore: 0,
                riskLevel: 'LOW' as any,
                intent: null,
              }),
              scenario: data.locked_scenario || undefined,
              emotionScore: data.emotion_baseline ?? prev?.emotionScore ?? 0,
              // 🆕 v36: 루나 인사이트 복원
              situationRead: data.situation_read || prev?.situationRead || undefined,
              // 🆕 v37: 상황 인식 히스토리 복원
              situationReadHistory: data.situation_read_history || prev?.situationReadHistory || [],
              lunaThought: data.luna_thought_history?.length > 0
                ? data.luna_thought_history[data.luna_thought_history.length - 1]
                : prev?.lunaThought || undefined,
              lunaThoughtHistory: data.luna_thought_history || prev?.lunaThoughtHistory || [],
            } as StateResult));
          }

          // 🆕 v29: 고민 깊이(concernDepth) 복원 — 재진입 시 UI 표시용
          // DB에 저장되지 않으므로 턴 카운트 기반 추정
          const turnCount = data.turn_count ?? 0;
          if (turnCount > 0) {
            const estimatedDepth: 'light' | 'medium' | 'deep' =
              turnCount <= 4 ? 'medium'    // 초반: 아직 판단 어려움 → 기본값
              : (data.emotion_baseline !== null && data.emotion_baseline <= -3) ? 'deep'  // 감정 심각 → 깊은 상담
              : turnCount >= 10 ? 'deep'   // 대화 길면 → 깊은 상담
              : 'medium';                  // 그 외 → 보통
            setConcernDepth(estimatedDepth);
          }
        }
      })
      .catch((err) => console.error('[useChat] 세션 메타데이터 로드 실패:', err));

    return () => { cancelled = true; };
  }, [sessionId]);

  const sendMessage = useCallback(async (content: string, meta?: SuggestionMeta) => {
    // 🆕 ACE v4: 이벤트 선택으로 호출된 경우 잠금 해제
    if (pendingEventLock && meta?.source) {
      setPendingEventLock(false);
      console.log(`[useChat] 🔓 이벤트 응답 → 잠금 해제 (source: ${meta.source})`);
    }
    if (!content.trim() || isLoading) return;

    // 사용자 메시지 추가
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sessionId,
      senderType: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setNudges([]);
    setSuggestions([]);
    setPanelData(null);
    setRetryStatus(null);  // 🆕 v48: 재시도 상태 초기화
    // 🆕 v43: 세션 레벨 이벤트 보존 — 완전 초기화 대신 기존 발동된 이벤트 타입을 유지하면서 새 턴의 이벤트만 허용
    // (DB race condition으로 같은 이벤트가 다음 턴에서 또 yield되어도 클라이언트에서 차단)
    // firedEventTypesRef.current를 초기화하지 않음 — 세션 동안 누적 유지
    // 🆕 ACE v4: 이벤트 버퍼링 — ||| 분리 후에 이벤트를 마지막에 삽입
    const pendingEventsBuffer: PhaseEvent[] = [];

    // AI 응답 플레이스홀더
    const aiMsgId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      {
        id: aiMsgId,
        sessionId,
        senderType: 'ai',
        content: '',
        createdAt: new Date().toISOString(),
      },
    ]);

    // 🆕 v31: 타이핑 딜레이와 fetch를 동시 시작 (딜레이 동안 네트워크 요청 진행)
    const minDelayPromise = new Promise((r) => setTimeout(r, MIN_DELAY_MS));

    try {
      abortRef.current = new AbortController();

      // 🆕 v81: BRIDGE 몰입 모드 활성 여부 — Phase Manager bypass 용
      const { useModeStore } = await import('@/engines/bridge-modes/mode-store');
      const activeMode = useModeStore.getState().activeMode;

      const fetchPromise = fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: content,
          suggestionMeta: meta || { source: 'typed' },
          ...(depthOverride && { depthOverride }),
          ...(activeMode && { activeMode }),
        }),
        signal: abortRef.current.signal,
      });

      // 딜레이와 fetch 둘 다 완료될 때까지 대기 (fetch가 먼저 끝나도 MIN_DELAY까지 대기)
      const [response] = await Promise.all([fetchPromise, minDelayPromise]) as [Response, unknown];

      if (!response.ok) throw new Error('Stream failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      // 🆕 v29: 전체 응답을 별도 버퍼에 누적 (||| 구분자 포함)
      // 화면에는 첫 번째 ||| 앞부분만 보여줘서 "한 풍선 → 쪼개짐" 방지
      let fullResponseBuffer = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event: StreamEvent = JSON.parse(line.slice(6));

            switch (event.type) {
              // 🆕 v29: HLRE 응답 교체 (서버에서 별도 이벤트로 전송)
              case 'hlre_replace': {
                fullResponseBuffer = event.data as string;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMsgId
                      ? { ...m, content: fullResponseBuffer.split('|||')[0], _fullContent: fullResponseBuffer }
                      : m
                  )
                );
                break;
              }

              case 'text': {
                // 🆕 v48: 첫 텍스트 도착 시 재시도 UI 종료 (fade out)
                if (!fullResponseBuffer) {
                  setRetryStatus((prev) => {
                    if (prev?.active) {
                      setTimeout(() => setRetryStatus(null), 400);
                      return { ...prev, active: false };
                    }
                    return prev;
                  });
                }
                // 전체 텍스트는 버퍼에 누적
                fullResponseBuffer += event.data;
                // 화면에는 첫 번째 ||| 이전 부분만 표시
                const visibleContent = fullResponseBuffer.split('|||')[0];
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMsgId
                      ? { ...m, content: visibleContent, _fullContent: fullResponseBuffer }
                      : m
                  )
                );
                break;
              }

              case 'state':
                setStateResult(event.data as unknown as StateResult);
                break;

              case 'nudge':
                setNudges(event.data as unknown as NudgeAction[]);
                break;

              case 'context_log': {
                const ctx = event.data as any;
                console.groupCollapsed(
                  `%c🧠 [AI Context] 턴${ctx.turnCount} | ${ctx.pipelineMeta?.phase} | ${ctx.responseTimeMs}ms | prompt=${ctx.systemPrompt?.length}자`,
                  'color: #00bcd4; font-weight: bold; font-size: 12px;'
                );
                console.log('%c📋 System Prompt', 'color: #ff9800; font-weight: bold;');
                console.log(ctx.systemPrompt);
                console.log('%c💬 Chat Messages', 'color: #4caf50; font-weight: bold;', ctx.chatMessages);
                console.log('%c⚙️ Pipeline Meta', 'color: #9c27b0; font-weight: bold;', ctx.pipelineMeta);
                console.log('%c🤖 AI Response', 'color: #2196f3; font-weight: bold;');
                console.log(ctx.aiResponse);

                // 🆕 v46: 캐스케이드 로그 — 모델별 시도/성공/실패 시각화
                if (ctx.cascadeLog?.length) {
                  console.groupCollapsed(
                    `%c🔗 [Cascade] ${ctx.cascadeLog.length}건 시도`,
                    'color: #e91e63; font-weight: bold; font-size: 12px;'
                  );
                  ctx.cascadeLog.forEach((log: any, i: number) => {
                    const icon = log.status === 'success' ? '✅' : log.status === 'timeout' ? '⏰' : log.status === 'rate_limit' ? '🚫' : log.status === 'retry' ? '🔄' : '❌';
                    const color = log.status === 'success' ? 'color: #4caf50' : 'color: #f44336';
                    console.log(
                      `%c${icon} [${i + 1}] ${log.provider}/${log.tier} (${log.model}) → ${log.status}${log.ttfbMs !== undefined ? ` | TTFB: ${log.ttfbMs}ms` : ''}${log.totalMs !== undefined ? ` | Total: ${log.totalMs}ms` : ''}${log.error ? ` | Error: ${log.error}` : ''}`,
                      `${color}; font-weight: bold;`
                    );
                  });
                  // 테이블로도 출력
                  console.table(ctx.cascadeLog.map((l: any) => ({
                    Provider: l.provider,
                    Model: l.model,
                    Status: l.status,
                    'TTFB(ms)': l.ttfbMs ?? '-',
                    'Total(ms)': l.totalMs ?? '-',
                    Error: l.error ?? '-',
                  })));
                  console.groupEnd();
                }

                // 🧠 [v47] Cognitive Engine 상세 로그 — 서버 사이드 사고 과정 시각화
                if (ctx.engineLogs?.length) {
                  console.groupCollapsed(
                    `%c💭 [Engine Logs] ${ctx.engineLogs.length}건의 인지 연산`,
                    'color: #ffeb3b; font-weight: bold; font-size: 12px;'
                  );
                  ctx.engineLogs.forEach((log: any) => {
                    // v61: 방어적 처리 — log 가 문자열이거나 category 가 없어도 안전
                    if (typeof log === 'string') {
                      console.log('%c• ' + log, 'color: #e0e0e0;');
                      return;
                    }
                    if (!log || typeof log !== 'object') return;

                    let icon = '⚪';
                    let color = '#9e9e9e';
                    const cat = (log.category ?? 'GENERAL').toString().toUpperCase();

                    if (cat.includes('LEFT')) { icon = '📘'; color = '#2196f3'; }
                    else if (cat.includes('RIGHT') || cat.includes('ACE')) { icon = '🎨'; color = '#e91e63'; }
                    else if (cat.includes('ACC')) { icon = '🛡️'; color = '#4caf50'; }
                    else if (cat.includes('LIMBIC')) { icon = '🧬'; color = '#f44336'; }
                    else if (cat.includes('DUAL')) { icon = '☯️'; color = '#9c27b0'; }
                    else if (cat.includes('PIPELINE')) { icon = '⚙️'; color = '#607d8b'; }
                    else if (cat.includes('HLRE')) { icon = '🔥'; color = '#ff5722'; }

                    console.log(
                      `%c${icon} [${cat}] %c${log.message ?? ''}`,
                      `color: ${color}; font-weight: bold;`,
                      'color: #e0e0e0; font-weight: normal;'
                    );
                    if (log.data && typeof log.data === 'object' && Object.keys(log.data).length > 0) {
                      console.log('%c└ Data:', 'color: #757575; font-style: italic;', log.data);
                    }
                  });
                  console.groupEnd();
                }

                console.groupEnd();
                break;
              }

              case 'done':
                break;

              case 'suggestions':
                setSuggestions(event.data as unknown as SuggestionItem[]);
                break;

              case 'axes_progress':
                setAxesProgress(event.data as unknown as { filledCount: number; totalCount: number; isComplete: boolean });
                break;

              case 'panel':
                setPanelData(event.data as unknown as PanelResponse);
                break;

              case 'phase_event': {
                const newEvent = event.data as unknown as PhaseEvent;

                // 🆕 v84+v85: SEARCHING → RECOMMENDATION 덮어쓰기 (같은 자리 대체)
                const SEARCHING_PAIR: Record<string, string> = {
                  'SONG_RECOMMENDATION': 'SONG_SEARCHING',
                  'DATE_SPOT_RECOMMENDATION': 'DATE_SPOT_SEARCHING',
                  // 🆕 v85: 2026 연애 검색 트렌드 확장 4종
                  'GIFT_RECOMMENDATION': 'GIFT_SEARCHING',
                  'ACTIVITY_RECOMMENDATION': 'ACTIVITY_SEARCHING',
                  'ANNIVERSARY_RECOMMENDATION': 'ANNIVERSARY_SEARCHING',
                  'MOVIE_RECOMMENDATION': 'MOVIE_SEARCHING',
                };
                const searchingType = SEARCHING_PAIR[newEvent.type];
                if (searchingType) {
                  firedEventTypesRef.current.add(newEvent.type);
                  console.log(`[useChat] 🔄 ${searchingType} → ${newEvent.type} 덮어쓰기`);
                  setPhaseEvents((prev) => {
                    const sIdx = prev.findIndex((e) => e.type === searchingType);
                    if (sIdx >= 0) {
                      const next = [...prev];
                      next[sIdx] = newEvent;
                      return next;
                    }
                    return [...prev, newEvent];
                  });
                  const pIdx = pendingEventsBuffer.findIndex((e) => e.type === searchingType);
                  if (pIdx >= 0) pendingEventsBuffer[pIdx] = newEvent;
                  else pendingEventsBuffer.push(newEvent);
                  break;
                }

                // 🆕 v20: ref 기반 중복 방지 (React 배칭 이슈 완전 차단)
                if (firedEventTypesRef.current.has(newEvent.type)) {
                  console.log(`[useChat] ⚠️ 중복 이벤트 무시 (ref): ${newEvent.type}`);
                  break;
                }
                firedEventTypesRef.current.add(newEvent.type);
                console.log('[useChat] 🎯 턴 이벤트 수신 (버퍼링):', newEvent.type);
                setPhaseEvents((prev) => [...prev, newEvent]);
                // 🆕 ACE v4: 즉시 메시지에 추가하지 않고 버퍼에 저장
                // ||| 분리 처리 후 마지막에 삽입하여 이벤트가 항상 대화 끝에 오도록
                pendingEventsBuffer.push(newEvent);
                break;
              }

              case 'phase_change': {
                const phaseData = event.data as any;
                console.log('[useChat] 🔄 단계 변경 수신:', phaseData.phase, phaseData.progress, phaseData.concernDepth);
                setCurrentPhase(phaseData.phase as ConversationPhaseV2);
                setPhaseProgress(phaseData.progress ?? 0);
                if (phaseData.concernDepth) setConcernDepth(phaseData.concernDepth);
                if (phaseData.lunaThinking) setLunaThinking(phaseData.lunaThinking);
                if (phaseData.understandingLevel !== undefined) setUnderstandingLevel(phaseData.understandingLevel);
                break;
              }

              // 🆕 v41: 친밀도 레벨업 — 축하 팝업 트리거
              case 'intimacy_level_up': {
                const levelUp = event.data as any;
                console.log('[useChat] 🎉 친밀도 레벨업:', levelUp);
                setIntimacyLevelUp({
                  oldLevel: levelUp.oldLevel,
                  newLevel: levelUp.newLevel,
                  newLevelName: levelUp.newLevelName,
                });
                break;
              }

              // 🆕 v40: 루나 딥리서치 — "진짜 생각하는 중" UI 이벤트
              case 'luna_thinking_deep': {
                const deepData = event.data as any;
                if (deepData.status === 'started') {
                  console.log('[useChat] 🧠 루나 딥리서치 시작:', deepData.keyword, deepData.phrases);
                  setThinkingDeep({
                    active: true,
                    phrases: deepData.phrases ?? ['잠깐만, 좀 생각해볼게'],
                    keyword: deepData.keyword,
                  });
                } else if (deepData.status === 'done') {
                  console.log('[useChat] 🧠 루나 딥리서치 완료:', deepData.durationMs, 'ms');
                  // fade out 애니메이션 시간 (400ms) 여유 후 제거
                  setTimeout(() => setThinkingDeep(null), 500);
                }
                break;
              }

              // 🆕 v79: 루나 감정 기반 미세 연출 (shake/flash/particle/bubble 효과)
              case 'fx': {
                const fxData = event.data as any;
                // effectBus 에 dispatch → 구독 중인 컴포넌트(ScreenShake/ParticleLayer/MessageBubble) 가 반응
                import('@/lib/fx/effect-bus').then(({ effectBus }) => {
                  effectBus.fire({
                    id: fxData.id,
                    target: fxData.target,
                    duration: fxData.duration,
                    params: fxData.params,
                    messageId: fxData.messageId,
                  });
                });
                break;
              }

              // 🆕 v81: BRIDGE 몰입 모드 완료 — Luna 가 [OPERATION_COMPLETE] 태그 출력
              case 'mode_complete': {
                const completeData = event.data as { mode: string; summary: string; nextStep?: string };
                console.log(`[useChat] 🎬 모드 완료 수신:`, completeData);
                import('@/engines/bridge-modes/mode-store').then(({ useModeStore }) => {
                  const store = useModeStore.getState();
                  if (store.activeMode) {
                    store.exit(completeData.summary, completeData.nextStep);
                  }
                });
                break;
              }

              // 🆕 v48: 캐스케이드 재시도 상태 — 예쁜 재시도 UI
              case 'retry_status': {
                const retryData = event.data as any;
                console.log(`[useChat] 🔄 재시도 ${retryData.attempt}/${retryData.maxAttempts}: ${retryData.message}`);
                setRetryStatus((prev) => ({
                  active: true,
                  retries: [
                    ...(prev?.retries ?? []),
                    {
                      attempt: retryData.attempt,
                      maxAttempts: retryData.maxAttempts,
                      message: retryData.message,
                      reason: retryData.reason,
                    },
                  ],
                }));
                break;
              }

              case 'error':
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMsgId
                      ? { ...m, content: event.data as string }
                      : m
                  )
                );
                break;
            }
          } catch {
            // JSON 파싱 실패 무시
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('[useChat] 스트림 에러:', err?.message);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId && !m.content.trim()
              ? { ...m, content: '죄송해요, 응답을 생성하는 중 문제가 발생했어요. 다시 시도해 주세요.' }
              : m
          )
        );
      }
    } finally {
      // 빈 AI 메시지 방어
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId && !m.content.trim()
            ? { ...m, content: '응답을 받지 못했어요. 다시 시도해 주세요 💜' }
            : m
        )
      );

      // 🆕 v26 + v29: 카톡 스타일 — ||| 구분자로 여러 말풍선 분리
      // v29: _fullContent에서 전체 원본을 가져와 분리 (스트리밍 중 content에는 첫 청크만 보임)
      const currentMessages = await new Promise<typeof messages>((resolve) => {
        setMessages((prev) => { resolve(prev); return prev; });
      });
      const aiMsg = currentMessages.find((m) => m.id === aiMsgId);
      // _fullContent가 있으면 우선 사용 (v29), 없으면 기존 content fallback
      const rawContent = aiMsg?._fullContent || aiMsg?.content || '';

      if (rawContent.includes('|||')) {
        const chunks = rawContent
          .split('|||')
          .map((c: string) => c.trim())
          .filter((c: string) => c.length > 0);

        if (chunks.length > 1) {
          // 첫 번째 말풍선으로 교체 (이미 content에 있지만, _fullContent 정리)
          setMessages((prev) =>
            prev.map((m) => m.id === aiMsgId ? { ...m, content: chunks[0], _fullContent: undefined } : m)
          );

          // 🆕 v28.2: Adaptive Typing — 루나 감정 기반 타이핑 속도
          const lunaEmo: LunaEmotion = 'calm'; // TODO: SSE에서 루나 감정 수신 시 교체
          for (let i = 1; i < chunks.length; i++) {
            const typingId = `${aiMsgId}-typing-${i}`;

            // 1. 말풍선 간 갭 딜레이 (감정에 따라 변동)
            const gapDelay = calcBubbleGapDelay(i, lunaEmo);
            await new Promise((r) => setTimeout(r, gapDelay));

            // 2. 타이핑 인디케이터 표시
            setMessages((prev) => [
              ...prev,
              {
                id: typingId,
                sessionId,
                senderType: 'ai' as const,
                content: '',  // 빈 content = isTyping 표시
                createdAt: new Date().toISOString(),
              },
            ]);

            // 3. 타이핑 딜레이 (감정+글자수 기반)
            const typeDelay = calcTypingDelay(chunks[i], lunaEmo, chunks[0].length);
            await new Promise((r) => setTimeout(r, typeDelay));

            // 4. 타이핑 인디케이터를 실제 메시지로 교체
            setMessages((prev) =>
              prev.map((m) =>
                m.id === typingId
                  ? { ...m, id: `${aiMsgId}-split-${i}`, content: chunks[i] }
                  : m
              )
            );
          }
        }
      }

      // 🆕 ACE v4: ||| 분리 완료 후 버퍼된 이벤트를 마지막에 삽입
      // 이렇게 하면 이벤트가 항상 루나 말풍선들 뒤에 나옴
      if (pendingEventsBuffer.length > 0) {
        // 🆕 v82.9: 마지막 말풍선 다 뜬 뒤 3초 "읽을 시간" 확보.
        //   이전: 타이핑 끝난 직후 즉시 이벤트/루나극장 발동 → 유저가 마지막 대사 읽기 전에 지나감.
        //   지금: 3초 뒤 삽입 → "내가 상상한 거 맞는지 한번 봐볼래?" 같은 공약성 대사 읽은 후 전환.
        console.log(`[useChat] ⏱️ 이벤트 발동 3초 대기 중 — 마지막 말풍선 읽을 시간 확보 (${pendingEventsBuffer.map(e => e.type).join(', ')})`);
        await new Promise((r) => setTimeout(r, 3000));

        setMessages((prev) => [
          ...prev,
          ...pendingEventsBuffer.map((evt) => ({
            id: `event-${evt.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            sessionId,
            senderType: 'event' as any,
            content: JSON.stringify(evt),
            createdAt: new Date().toISOString(),
          })),
        ]);
        // 🆕 ACE v4: 이벤트 잠금 — 유저가 이벤트에 응답할 때까지 채팅 입력 잠금
        // isLoading은 false로 풀어서 이벤트 버튼은 클릭 가능하게 유지
        setPendingEventLock(true);
        console.log(`[useChat] 🔒 이벤트 대기 중 — 채팅 입력 잠금 (${pendingEventsBuffer.map(e => e.type).join(', ')})`);
      }
      setIsLoading(false);
    }
  }, [sessionId, isLoading, depthOverride]);

  return {
    messages, isLoading, nudges, stateResult, suggestions, panelData,
    axesProgress, phaseEvents, currentPhase, phaseProgress, concernDepth,
    depthOverride, setDepthOverride,
    sessionStatus, sessionSummary, sendMessage, pendingEventLock,
    lunaThinking, understandingLevel,
    // 🆕 v40: 루나 딥리서치 상태
    thinkingDeep,
    // 🆕 v48: 캐스케이드 재시도 상태
    retryStatus,
    // 🆕 v41: 친밀도 레벨업 팝업 상태
    intimacyLevelUp,
    dismissIntimacyLevelUp: () => setIntimacyLevelUp(null),
  };
}
