'use client';

/**
 * v119.5 — 관계 단계 진입 감지 훅.
 *
 * localStorage 의 마지막으로 본 단계와 현재 단계를 비교해서
 * 첫 진입 시 한 번만 모먼트 재생.
 *
 * 사용:
 *   const { showFor, dismiss, force } = useStageTransition(data.level);
 *   <StageTransitionMoment level={showFor} onClose={dismiss} ...>
 */

import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'luna_relationship_lastSeenStage';

export function readLastSeenStage(): number {
  if (typeof window === 'undefined') return 1;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const n = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(n) ? n : 1;
}

export function writeLastSeenStage(level: number) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, String(level));
}

interface UseStageTransitionReturn {
  /** 현재 재생해야 할 단계 (Lv.2~5). null = 재생 없음 */
  showFor: number | null;
  /** 모먼트 종료 — lastSeenStage 갱신 + 상태 닫기 */
  dismiss: () => void;
  /** 디버그/강제 트리거 — debug-journal 페이지에서 사용 */
  force: (level: number) => void;
}

export function useStageTransition(currentLevel: number | undefined): UseStageTransitionReturn {
  const [showFor, setShowFor] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!currentLevel || currentLevel < 2) return; // Lv.1 은 시작값, 모먼트 없음

    const last = readLastSeenStage();
    if (currentLevel > last) {
      // 살짝 딜레이 — 진입 후 자연스럽게 등장
      const t = setTimeout(() => setShowFor(currentLevel), 600);
      return () => clearTimeout(t);
    }
  }, [currentLevel]);

  const dismiss = useCallback(() => {
    if (showFor != null) writeLastSeenStage(showFor);
    setShowFor(null);
  }, [showFor]);

  const force = useCallback((level: number) => {
    setShowFor(Math.min(Math.max(level, 2), 5));
  }, []);

  return { showFor, dismiss, force };
}
