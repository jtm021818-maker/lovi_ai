'use client';

/**
 * 🎭 v81: Mode Store (Zustand) — BRIDGE 몰입 모드 상태 관리
 *
 * - 전역 싱글 스토어: 활성 모드 + 모드별 상태 유지
 * - 세션 재진입 시 자동 복구 (localStorage persist)
 * - DB 동기화는 별도 훅에서 debounced sync
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ModeId, AnyModeState, ModeCompletion } from './types';

interface ModeStoreState {
  activeMode: ModeId | null;
  modeState: AnyModeState | null;
  modeStartedAt: string | null;
  history: ModeCompletion[];
}

interface ModeStoreActions {
  /** 모드 진입 */
  enter: (mode: ModeId, initialState: AnyModeState) => void;
  /** 상태 부분 갱신 (타입 안전성은 caller 책임) */
  patch: (patch: Partial<AnyModeState>) => void;
  /** 완전 교체 */
  setState: (state: AnyModeState) => void;
  /** 모드 종료 (작전 완료 / 유저 강제 종료) */
  exit: (summary?: string, nextStep?: string) => void;
  /** 모든 기록 초기화 (세션 교체 시) */
  reset: () => void;
}

export const useModeStore = create<ModeStoreState & ModeStoreActions>()(
  persist(
    (set) => ({
      activeMode: null,
      modeState: null,
      modeStartedAt: null,
      history: [],

      enter: (mode, initialState) =>
        set({
          activeMode: mode,
          modeState: initialState,
          modeStartedAt: new Date().toISOString(),
        }),

      patch: (patch) =>
        set((s) => {
          if (!s.modeState) return s;
          return { modeState: { ...s.modeState, ...patch } as AnyModeState };
        }),

      setState: (state) => set({ modeState: state }),

      exit: (summary, nextStep) =>
        set((s) => {
          if (!s.activeMode) return s;
          const completion: ModeCompletion = {
            mode: s.activeMode,
            summary: summary ?? '(종료)',
            nextStep,
            completedAt: new Date().toISOString(),
          };
          return {
            activeMode: null,
            modeState: null,
            modeStartedAt: null,
            history: [...s.history, completion].slice(-20),
          };
        }),

      reset: () => set({ activeMode: null, modeState: null, modeStartedAt: null, history: [] }),
    }),
    {
      name: 'luna-bridge-mode-v81',
      partialize: (s) => ({
        activeMode: s.activeMode,
        modeState: s.modeState,
        modeStartedAt: s.modeStartedAt,
        history: s.history,
      }),
    },
  ),
);

/** 편의 훅 — 현재 활성 모드만 뽑을 때 */
export function useActiveMode() {
  return useModeStore((s) => s.activeMode);
}

/** 편의 훅 — 모드 상태 + actions */
export function useModeControls() {
  const enter = useModeStore((s) => s.enter);
  const patch = useModeStore((s) => s.patch);
  const setState = useModeStore((s) => s.setState);
  const exit = useModeStore((s) => s.exit);
  return { enter, patch, setState, exit };
}
