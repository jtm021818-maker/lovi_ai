'use client';

/**
 * useSessionAutoComplete — 세션 자동 종료 트리거 (v90 메모리 시스템 연결)
 *
 * 문제: PATCH /api/sessions/[id]/complete 를 호출하는 클라이언트 코드가 없어서
 *       유저가 앱을 그냥 닫으면 session_summary, memory_profile, user_memories 가
 *       전부 비어있는 채로 남음 → 다음 세션에서 루나가 "처음 보는 사람" 모드.
 *
 * 해결: 3중 방어
 *   1) visibilitychange (탭 숨김 5분 후) — 가장 부드러움
 *   2) beforeunload (페이지 떠남) — sendBeacon 으로 보장 전송
 *   3) inactivity timer (30분 무활동) — 세션 길게 두는 케이스
 *
 * 추가: manualComplete() 노출 → "상담 마치기" 버튼에 연결.
 *
 * 안전장치:
 *   - 같은 세션 중복 호출 방지 (in-flight ref + completed flag)
 *   - 빈 세션(0턴) skip — 추출할 메모리 없음
 *   - 명시적 호출 우선 (자동 트리거 비활성화 가능)
 */

import { useEffect, useRef, useCallback } from 'react';

const HIDDEN_AUTO_COMPLETE_DELAY = 5 * 60 * 1000; // 탭 숨김 5분 후 자동 종료
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;        // 30분 무활동 자동 종료
const MIN_TURNS_TO_COMPLETE = 2;                  // 2턴 미만이면 메모리 추출 가치 X

interface Options {
  sessionId: string;
  /** 현재 세션 턴 수 — 0~1턴이면 자동 종료 skip */
  turnCount: number;
  /** true 면 자동 트리거 모두 비활성 (수동만) */
  disabled?: boolean;
  /** 종료 성공 후 콜백 (UI 갱신 등) */
  onCompleted?: () => void;
}

export function useSessionAutoComplete({ sessionId, turnCount, disabled = false, onCompleted }: Options) {
  const inFlightRef = useRef(false);
  const completedRef = useRef(false);
  const hiddenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerComplete = useCallback(async (reason: 'manual' | 'hidden' | 'unload' | 'idle') => {
    if (completedRef.current || inFlightRef.current) return;
    if (turnCount < MIN_TURNS_TO_COMPLETE) {
      console.log(`[AutoComplete] skip — ${turnCount}턴 (최소 ${MIN_TURNS_TO_COMPLETE}턴 필요)`);
      return;
    }
    inFlightRef.current = true;
    try {
      // fetch + keepalive: unload 시점에도 보장. (sendBeacon 은 POST 강제라 PATCH 라우트와 부적합)
      const res = await fetch(`/api/sessions/${sessionId}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
        keepalive: true,
      });

      if (res.ok) {
        completedRef.current = true;
        console.log(`[AutoComplete] ✅ ${reason}`);
        if (reason !== 'unload') onCompleted?.();
      } else {
        console.warn(`[AutoComplete] 실패 (${reason}):`, res.status);
      }
    } catch (err) {
      console.warn(`[AutoComplete] 에러 (${reason}):`, err);
    } finally {
      inFlightRef.current = false;
    }
  }, [sessionId, turnCount, onCompleted]);

  // 새 세션으로 바뀌면 completed 리셋
  useEffect(() => {
    completedRef.current = false;
    inFlightRef.current = false;
  }, [sessionId]);

  // 자동 트리거 비활성 모드면 위 manual 만 노출
  useEffect(() => {
    if (disabled) return;

    const clearHiddenTimer = () => {
      if (hiddenTimerRef.current) {
        clearTimeout(hiddenTimerRef.current);
        hiddenTimerRef.current = null;
      }
    };
    const clearIdleTimer = () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
    const resetIdleTimer = () => {
      clearIdleTimer();
      idleTimerRef.current = setTimeout(() => triggerComplete('idle'), INACTIVITY_TIMEOUT);
    };

    const onVisibility = () => {
      if (document.hidden) {
        // 5분 후에도 여전히 hidden 이면 종료
        clearHiddenTimer();
        hiddenTimerRef.current = setTimeout(() => {
          if (document.hidden) triggerComplete('hidden');
        }, HIDDEN_AUTO_COMPLETE_DELAY);
      } else {
        clearHiddenTimer();
        resetIdleTimer();
      }
    };

    const onUnload = () => {
      // 탭/창 닫기 또는 다른 사이트로 이동 시
      triggerComplete('unload');
    };

    const onActivity = () => resetIdleTimer();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', onUnload);
    window.addEventListener('pagehide', onUnload);
    window.addEventListener('mousemove', onActivity, { passive: true });
    window.addEventListener('keydown', onActivity, { passive: true });
    window.addEventListener('touchstart', onActivity, { passive: true });

    resetIdleTimer();

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onUnload);
      window.removeEventListener('pagehide', onUnload);
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('touchstart', onActivity);
      clearHiddenTimer();
      clearIdleTimer();
    };
  }, [disabled, triggerComplete]);

  const manualComplete = useCallback(() => triggerComplete('manual'), [triggerComplete]);

  return { manualComplete, isCompleted: () => completedRef.current };
}
