/**
 * 🆕 v42: Zustand 전역 라운지 상태
 *
 * 모든 페이지에서 접근 가능:
 * - 읽지 않은 메시지 수 (네비 바 뱃지)
 * - 인앱 토스트 (카톡 배너)
 * - 배치 메시지 타이머 관리
 */

import { create } from 'zustand';
import type { ScheduledMessage } from '@/engines/lounge/batch-message-types';

// ─── Types ──────────────────────────────────────────────

export interface LoungeToastData {
  speaker: 'luna' | 'tarot';
  text: string;
  timestamp: string;
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

  // 토스트 쿨다운 (30분 = 1800000ms)
  lastToastTime: number;
  canShowToast: () => boolean;

  // 라운지 페이지 활성 여부
  isOnLounge: boolean;
  setOnLounge: (v: boolean) => void;
}

const TOAST_COOLDOWN_MS = 30 * 60 * 1000; // 30분

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
}));
