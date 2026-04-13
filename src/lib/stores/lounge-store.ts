/**
 * 🆕 v45: Zustand 전역 라운지 상태 — Global Lounge Engine
 *
 * v42→v45 핵심 변경:
 * - 🔥 글로벌 메시지 큐: 라운지 밖에서도 메시지 축적
 * - 📣 모든 메시지에 토스트/뱃지 (aboutUser 제한 해제)
 * - ⏰ 토스트 쿨다운 3분 (30분 → 3분)
 * - 🎯 클러스터/앰비언트 메시지를 전역에서 생성
 */

import { create } from 'zustand';
import type { ScheduledMessage } from '@/engines/lounge/batch-message-types';
import { formatChatTime } from '@/engines/lounge/batch-message-types';

// ─── Types ──────────────────────────────────────────────

export interface LoungeToastData {
  speaker: 'luna' | 'tarot';
  text: string;
  timestamp: string;
}

/** 글로벌 큐에 저장되는 메시지 (라운지 밖에서 생성됨) */
export interface QueuedLoungeMessage {
  id: string;
  type: 'character' | 'ambient';
  speaker: 'luna' | 'tarot';
  text: string;
  timestamp: string;
  emoji?: string;
  createdAt: number; // Date.now()
}

// ─── Store ──────────────────────────────────────────────

interface LoungeState {
  // 읽지 않은 메시지 수
  unreadCount: number;
  incrementUnread: (n?: number) => void;
  clearUnread: () => void;

  // 인앱 토스트
  pendingToast: LoungeToastData | null;
  showToast: (toast: LoungeToastData) => void;
  dismissToast: () => void;

  // 배치 메시지 상태 (전역 타이머에서 참조)
  batchMessages: ScheduledMessage[];
  lastDeliveredMinute: number; // 마지막으로 전달한 분 (중복 방지)
  setBatchMessages: (msgs: ScheduledMessage[]) => void;
  markDelivered: (minute: number) => void;

  // 토스트 쿨다운 (3분)
  lastToastTime: number;
  canShowToast: () => boolean;

  // 라운지 페이지 활성 여부
  isOnLounge: boolean;
  setOnLounge: (v: boolean) => void;

  // 🆕 v45: 글로벌 메시지 큐 (라운지 밖에서 축적)
  messageQueue: QueuedLoungeMessage[];
  pushToQueue: (msg: QueuedLoungeMessage) => void;
  consumeQueue: () => QueuedLoungeMessage[];

  // 🆕 v45: 글로벌 클러스터/앰비언트 트래킹
  usedClusterIds: Set<string>;
  usedAmbientTexts: Set<string>;
  lastClusterTime: number;
  lastAmbientTime: number;
  markClusterUsed: (id: string) => void;
  markAmbientUsed: (text: string) => void;
  setLastClusterTime: (t: number) => void;
  setLastAmbientTime: (t: number) => void;
}

const TOAST_COOLDOWN_MS = 3 * 60 * 1000; // 3분 — 카톡처럼 자주!

export const useLoungeStore = create<LoungeState>((set, get) => ({
  // 읽지 않은 메시지
  unreadCount: 0,
  incrementUnread: (n = 1) => set(s => ({ unreadCount: s.unreadCount + n })),
  clearUnread: () => set({ unreadCount: 0 }),

  // 인앱 토스트
  pendingToast: null,
  showToast: (toast) => {
    const state = get();
    if (!state.canShowToast()) return;
    if (state.isOnLounge) return; // 라운지에 있으면 토스트 불필요
    set({ pendingToast: toast, lastToastTime: Date.now() });
    // 4초 후 자동 사라짐
    setTimeout(() => {
      set(s => s.pendingToast === toast ? { pendingToast: null } : s);
    }, 4000);
  },
  dismissToast: () => set({ pendingToast: null }),

  // 배치 메시지
  batchMessages: [],
  lastDeliveredMinute: -1,
  setBatchMessages: (msgs) => set({ batchMessages: msgs }),
  markDelivered: (minute) => set({ lastDeliveredMinute: minute }),

  // 토스트 쿨다운
  lastToastTime: 0,
  canShowToast: () => {
    const state = get();
    return Date.now() - state.lastToastTime >= TOAST_COOLDOWN_MS;
  },

  // 라운지 페이지 활성
  isOnLounge: false,
  setOnLounge: (v) => set({ isOnLounge: v }),

  // 🆕 v45: 글로벌 메시지 큐
  messageQueue: [],
  pushToQueue: (msg) => set(s => ({ messageQueue: [...s.messageQueue, msg] })),
  consumeQueue: () => {
    const queue = get().messageQueue;
    set({ messageQueue: [] });
    return queue;
  },

  // 🆕 v45: 글로벌 클러스터/앰비언트 트래킹
  usedClusterIds: new Set(),
  usedAmbientTexts: new Set(),
  lastClusterTime: 0,
  lastAmbientTime: 0,
  markClusterUsed: (id) => set(s => {
    const next = new Set(s.usedClusterIds);
    next.add(id);
    return { usedClusterIds: next };
  }),
  markAmbientUsed: (text) => set(s => {
    const next = new Set(s.usedAmbientTexts);
    next.add(text);
    return { usedAmbientTexts: next };
  }),
  setLastClusterTime: (t) => set({ lastClusterTime: t }),
  setLastAmbientTime: (t) => set({ lastAmbientTime: t }),
}));
