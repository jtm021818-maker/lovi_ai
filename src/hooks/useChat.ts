'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatMessage, StreamEvent } from '@/types/chat.types';
import type { NudgeAction, StateResult, SuggestionMeta, SuggestionItem, PhaseEvent, ConversationPhaseV2 } from '@/types/engine.types';
import type { PanelResponse } from '@/types/persona.types';
import { MIN_DELAY_MS } from '@/lib/utils/typing-delay';

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
  sessionStatus: 'active' | 'completed' | 'crisis' | null;
  sessionSummary: string | null;
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
  const [sessionStatus, setSessionStatus] = useState<'active' | 'completed' | 'crisis' | null>(null);
  const [sessionSummary, setSessionSummary] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
          const loaded: ChatMessage[] = data.map((m: any) => ({
            id: m.id,
            sessionId: m.session_id || sessionId,
            senderType: m.sender_type,
            content: m.content,
            createdAt: m.created_at,
          }));
          setMessages(loaded);
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

          // 🆕 시나리오 + 감정 상태 복원 (시나리오 태그 + 감정 뱃지 표시용)
          if (data.locked_scenario || data.emotion_baseline !== null) {
            setStateResult((prev) => ({
              ...(prev || {
                emotionScore: 0,
                riskLevel: 'LOW' as any,
                intent: null,
              }),
              scenario: data.locked_scenario || undefined,
              emotionScore: data.emotion_baseline ?? prev?.emotionScore ?? 0,
            } as StateResult));
          }
        }
      })
      .catch((err) => console.error('[useChat] 세션 메타데이터 로드 실패:', err));

    return () => { cancelled = true; };
  }, [sessionId]);

  const sendMessage = useCallback(async (content: string, meta?: SuggestionMeta) => {
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
    setPhaseEvents([]);

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

    // 타이핑 딜레이 — AI가 생각하는 자연스러운 느낌 (500ms)
    await new Promise((r) => setTimeout(r, MIN_DELAY_MS));

    try {
      abortRef.current = new AbortController();

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: content,
          suggestionMeta: meta || { source: 'typed' },
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error('Stream failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

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
              case 'text':
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMsgId
                      ? { ...m, content: m.content + event.data }
                      : m
                  )
                );
                break;

              case 'state':
                setStateResult(event.data as unknown as StateResult);
                break;

              case 'nudge':
                setNudges(event.data as unknown as NudgeAction[]);
                break;

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

              case 'phase_event':
                console.log('[useChat] 🎯 턴 이벤트 수신:', event.data);
                setPhaseEvents((prev) => [...prev, event.data as unknown as PhaseEvent]);
                break;

              case 'phase_change': {
                const phaseData = event.data as any;
                console.log('[useChat] 🔄 단계 변경 수신:', phaseData.phase, phaseData.progress);
                setCurrentPhase(phaseData.phase as ConversationPhaseV2);
                setPhaseProgress(phaseData.progress ?? 0);
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
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? { ...m, content: '죄송해요, 응답을 생성하는 중 문제가 발생했어요. 다시 시도해 주세요.' }
              : m
          )
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, isLoading]);

  return { 
    messages, isLoading, nudges, stateResult, suggestions, panelData, 
    axesProgress, phaseEvents, currentPhase, phaseProgress, 
    sessionStatus, sessionSummary, sendMessage 
  };
}
