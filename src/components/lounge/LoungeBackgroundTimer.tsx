'use client';

/**
 * 🆕 v45: 라운지 글로벌 엔진 (Background Timer)
 *
 * v42→v45 핵심 변경:
 * - ⏰ tick 주기: 60초 → 15초 (실시간 반응)
 * - 🔥 글로벌 클러스터 스케줄러: 라운지 밖에서도 메시지 생성!
 * - 📣 모든 메시지에 토스트 + 뱃지 (aboutUser 제한 해제)
 * - 🌿 글로벌 앰비언트 액션 생성
 * - 🎯 라운지 페이지는 큐에서 소비만
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useLoungeStore, type QueuedLoungeMessage } from '@/lib/stores/lounge-store';
import { currentMinute, messageMinute, formatChatTime } from '@/engines/lounge/batch-message-types';
import { pickCluster, clusterToPlayback, nextClusterInterval } from '@/engines/lounge/auto-chat-cluster';
import { getRandomAmbientAction, nextAmbientInterval } from '@/engines/lounge/ambient-actions';

// 유니크 ID 생성
let _queueIdCounter = 0;
function nextQueueId(): string {
  return `gq_${Date.now()}_${_queueIdCounter++}`;
}

/** 현재 시간을 카톡 포맷으로 */
function nowChatTime(): string {
  const now = new Date();
  return formatChatTime(now.getHours(), now.getMinutes());
}

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
        // 닉네임 저장 (클러스터 {name} 치환용)
        if (data.nickname) {
          _globalUserName = data.nickname;
        }
      } catch {
        // 무시 — 라운지 페이지에서 재시도됨
      }
    }
    loadBatch();
  }, []);

  // 🆕 v45: 글로벌 엔진 — 15초 tick
  useEffect(() => {
    let _globalUserNameLocal = _globalUserName;

    const interval = setInterval(() => {
      const state = useLoungeStore.getState();
      const now = Date.now();

      // ─── 1. 배치 메시지 시간 체크 (기존 로직) ───
      if (state.batchMessages.length > 0) {
        const cm = currentMinute();
        const lastDelivered = state.lastDeliveredMinute;

        const newMessages = state.batchMessages.filter(msg => {
          const mm = messageMinute(msg);
          return mm <= cm && mm > lastDelivered && !msg.delivered;
        });

        if (newMessages.length > 0) {
          const maxMin = Math.max(...newMessages.map(m => messageMinute(m)));
          state.markDelivered(maxMin);

          if (!state.isOnLounge) {
            // 🆕 v45: 모든 메시지에 뱃지 증가 (aboutUser 제한 해제)
            state.incrementUnread(newMessages.length);

            // 🆕 v45: 캐릭터 메시지면 무조건 토스트 (마지막 1개)
            const charMsgs = newMessages.filter(m => m.type === 'character');
            if (charMsgs.length > 0) {
              const latest = charMsgs[charMsgs.length - 1];
              state.showToast({
                speaker: latest.speaker!,
                text: latest.text,
                timestamp: formatChatTime(latest.hour, latest.minute),
              });
            }
          }
        }
      }

      // ─── 2. 🆕 v45: 글로벌 클러스터 생성 (라운지 밖에서도!) ───
      if (!state.isOnLounge) {
        const timeSinceLastCluster = now - state.lastClusterTime;
        const clusterInterval = 60_000 + Math.random() * 120_000; // 1~3분

        if (timeSinceLastCluster > clusterInterval && state.lastClusterTime > 0) {
          const cluster = pickCluster(state.usedClusterIds, _globalUserNameLocal);
          if (cluster) {
            state.markClusterUsed(cluster.id);
            state.setLastClusterTime(now);

            // 클러스터의 각 라인을 큐에 적재
            for (const line of cluster.lines) {
              const qMsg: QueuedLoungeMessage = {
                id: nextQueueId(),
                type: 'character',
                speaker: line.speaker,
                text: line.text,
                timestamp: nowChatTime(),
                createdAt: now,
              };
              state.pushToQueue(qMsg);
            }

            // 뱃지 + 토스트
            state.incrementUnread(cluster.lines.length);
            const lastLine = cluster.lines[cluster.lines.length - 1];
            state.showToast({
              speaker: lastLine.speaker,
              text: lastLine.text,
              timestamp: nowChatTime(),
            });
          }
        }

        // lastClusterTime이 0이면 초기화 (첫 실행)
        if (state.lastClusterTime === 0) {
          state.setLastClusterTime(now);
        }

        // ─── 3. 🆕 v45: 글로벌 앰비언트 생성 ───
        const timeSinceLastAmbient = now - state.lastAmbientTime;
        const ambientInterval = 30_000 + Math.random() * 30_000; // 30~60초

        if (timeSinceLastAmbient > ambientInterval && state.lastAmbientTime > 0) {
          const action = getRandomAmbientAction(state.usedAmbientTexts);
          if (action) {
            state.markAmbientUsed(action.text);
            state.setLastAmbientTime(now);

            const qMsg: QueuedLoungeMessage = {
              id: nextQueueId(),
              type: 'ambient',
              speaker: action.speaker,
              text: action.text,
              timestamp: nowChatTime(),
              emoji: action.emoji,
              createdAt: now,
            };
            state.pushToQueue(qMsg);
            // 앰비언트는 뱃지만 +1, 토스트는 안 띄움 (너무 자주 뜨는 걸 방지)
            state.incrementUnread(1);
          }
        }

        if (state.lastAmbientTime === 0) {
          state.setLastAmbientTime(now);
        }
      }
    }, 15000); // 🆕 v45: 15초 tick — 실시간 반응!

    return () => clearInterval(interval);
  }, []);

  return null; // 렌더 없음 — 순수 로직 컴포넌트
}

// 모듈 레벨 유저 이름 (배치 로드 시 설정)
let _globalUserName = '너';
