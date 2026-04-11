'use client';

/**
 * 🆕 v42: 라운지 배경 타이머
 *
 * 모든 페이지에서 동작. 60초마다 배치 메시지 시간 체크.
 * 라운지가 아닌 페이지에서 유저 관련 메시지가 도착하면 토스트 발송.
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useLoungeStore } from '@/lib/stores/lounge-store';
import { currentMinute, messageMinute, formatChatTime } from '@/engines/lounge/batch-message-types';

export default function LoungeBackgroundTimer() {
  const pathname = usePathname();
  const isOnLoungePage = pathname === '/lounge';
  const setOnLounge = useLoungeStore(s => s.setOnLounge);
  const initRef = useRef(false);

  // 라운지 페이지 활성 상태 동기화
  useEffect(() => {
    setOnLounge(isOnLoungePage);
  }, [isOnLoungePage, setOnLounge]);

  // 배치 메시지 로드 (최초 1회)
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    async function loadBatch() {
      try {
        const res = await fetch('/api/lounge/state');
        if (!res.ok) return;
        const data = await res.json();
        const batchMsgs = data.state?.batchMessages?.messages;
        if (batchMsgs?.length > 0) {
          useLoungeStore.getState().setBatchMessages(batchMsgs);
        }
      } catch {
        // 무시 — 라운지 페이지에서 재시도됨
      }
    }
    loadBatch();
  }, []);

  // 60초 tick — 배치 메시지 시간 체크
  useEffect(() => {
    const interval = setInterval(() => {
      const state = useLoungeStore.getState();
      if (state.batchMessages.length === 0) return;

      const cm = currentMinute();
      const lastDelivered = state.lastDeliveredMinute;

      // 아직 전달 안 된 메시지 중 현재 시간 이전인 것들
      const newMessages = state.batchMessages.filter(msg => {
        const mm = messageMinute(msg);
        return mm <= cm && mm > lastDelivered && !msg.delivered;
      });

      if (newMessages.length > 0) {
        // 마지막 전달 시간 업데이트
        const maxMin = Math.max(...newMessages.map(m => messageMinute(m)));
        state.markDelivered(maxMin);

        // 라운지가 아닌 페이지에서만 알림
        if (!state.isOnLounge) {
          // 읽지 않은 수 증가
          state.incrementUnread(newMessages.length);

          // isAboutUser인 메시지 → 토스트 발송 (가장 마지막 1개만)
          const aboutUser = newMessages.filter(m => m.isAboutUser && m.type === 'character');
          if (aboutUser.length > 0) {
            const latest = aboutUser[aboutUser.length - 1];
            state.showToast({
              speaker: latest.speaker!,
              text: latest.text,
              timestamp: formatChatTime(latest.hour, latest.minute),
            });
          }
        }
      }
    }, 60000); // 60초

    return () => clearInterval(interval);
  }, []);

  return null; // 렌더 없음 — 순수 로직 컴포넌트
}
