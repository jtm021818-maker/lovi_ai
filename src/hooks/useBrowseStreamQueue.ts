/**
 * 🔍 v88: useBrowseStreamQueue — 루나 대화형 "같이 찾기" 블록 큐
 *
 * 서버가 한꺼번에 쏟아낸 BrowseBlock들을 클라이언트에서 **자연스러운 타이밍** 으로
 * 하나씩 채팅 메시지로 삽입한다. 실제로 루나가 하나씩 말하는 듯한 체감.
 *
 * 정책:
 *  - luna_text: 타이핑 dot 120~350ms → 본 메시지 추가
 *  - link_card: delay 200~400ms → 즉시 추가
 *  - review_quote: delay 500~900ms → 즉시 추가 (읽고 있는 느낌)
 *  - decision_prompt: delay 250~400ms → 추가 후 큐 일시정지 (유저 응답 대기)
 *
 * 서버가 block.delay 를 지정하면 그걸 존중. 없으면 위 기본값 범위 랜덤.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@/types/chat.types';
import type { BrowseBlock } from '@/types/engine.types';

const DELAY_RANGES: Record<BrowseBlock['type'], [number, number]> = {
  luna_text: [250, 600],
  link_card: [200, 400],
  review_quote: [500, 900],
  decision_prompt: [250, 400],
};

const TYPING_DOT_RANGE: [number, number] = [120, 350];

function randomBetween([min, max]: [number, number]): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export interface QueuedBlock {
  sessionId: string;
  candidateId?: string;
  block: BrowseBlock;
  order: number;
}

export interface UseBrowseStreamQueueOptions {
  sessionId: string;
  /** 메시지 삽입 콜백 — ChatMessage 로 wrap 해서 넘김 */
  addMessage: (msg: ChatMessage) => void;
  /** 타이핑 dot 표시 ON/OFF (기본 UI 타이핑 인디케이터 연동) */
  setTypingDot?: (on: boolean) => void;
}

export function useBrowseStreamQueue(options: UseBrowseStreamQueueOptions) {
  const { sessionId, addMessage, setTypingDot } = options;
  const queueRef = useRef<QueuedBlock[]>([]);
  const processingRef = useRef(false);
  const pausedRef = useRef(false);
  const seenOrdersRef = useRef<Set<number>>(new Set());
  const [awaitingPromptId, setAwaitingPromptId] = useState<string | null>(null);

  const tick = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      while (queueRef.current.length > 0 && !pausedRef.current) {
        const item = queueRef.current.shift();
        if (!item) break;
        const { block } = item;

        // 1) 블록별 preparatory delay
        const explicitDelay = typeof block.delay === 'number' ? block.delay : null;
        const delay = explicitDelay ?? randomBetween(DELAY_RANGES[block.type]);
        await sleep(delay);

        // 2) luna_text 는 타이핑 dot 연출
        if (block.type === 'luna_text' && setTypingDot) {
          setTypingDot(true);
          await sleep(randomBetween(TYPING_DOT_RANGE));
          setTypingDot(false);
        }

        // 3) ChatMessage 로 wrap 해서 삽입
        const msg: ChatMessage = {
          id: (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
            ? crypto.randomUUID()
            : `bb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          sessionId,
          senderType: 'ai',
          content: block.type === 'luna_text' ? block.text : '',
          createdAt: new Date().toISOString(),
          renderAs: 'browse_block',
          browseBlock: block,
          browseContext: {
            sessionId: item.sessionId,
            candidateId: item.candidateId,
          },
        };
        addMessage(msg);

        // 4) decision_prompt 만나면 큐 일시정지 (유저 클릭까지)
        if (block.type === 'decision_prompt') {
          pausedRef.current = true;
          setAwaitingPromptId(block.promptId);
          break;
        }
      }
    } finally {
      processingRef.current = false;
    }
  }, [sessionId, addMessage, setTypingDot]);

  /** 새 블록 하나 큐 끝에 추가 */
  const push = useCallback((queued: QueuedBlock) => {
    // 중복 order 방지 (네트워크 재전송 대비)
    if (seenOrdersRef.current.has(queued.order)) return;
    seenOrdersRef.current.add(queued.order);

    queueRef.current.push(queued);
    // 순서 보장: order 가 섞여 들어와도 정렬
    queueRef.current.sort((a, b) => a.order - b.order);
    // tick 은 paused 가 풀렸을 때만 자동 진행
    if (!pausedRef.current) void tick();
  }, [tick]);

  /** 유저 decision 반영 — 큐를 이어서 재개 */
  const resume = useCallback(() => {
    pausedRef.current = false;
    setAwaitingPromptId(null);
    void tick();
  }, [tick]);

  /** 세션 교체/언마운트 시 모두 비우기 */
  const reset = useCallback(() => {
    queueRef.current = [];
    seenOrdersRef.current.clear();
    pausedRef.current = false;
    setAwaitingPromptId(null);
    if (setTypingDot) setTypingDot(false);
  }, [setTypingDot]);

  // 언마운트 시 정리
  useEffect(() => reset, [reset]);

  return {
    push,
    resume,
    reset,
    awaitingPromptId,
  };
}
