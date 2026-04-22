'use client';

/**
 * v85.4: useWandering — 정령 배회 state machine
 *
 * 상태 흐름:
 *   idle ──(3-8초 후)──▶ walk ──(도착)──▶ arrive ──▶ idle
 *   idle ──(30초+ 경과)──▶ sleep ──(15초)──▶ idle
 *   [any] ──(react 트리거)──▶ react ──▶ idle
 *
 * 방은 normalized 좌표계 (0~1) 사용.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { SpiritAnimState } from '@/types/spirit-sprite.types';

interface Options {
  /** 초기 위치 (normalized 0~1) */
  initialX: number;
  initialY: number;
  /** 배회 영역 제한 (normalized) — 기본: 화면 중앙 60% */
  boundsX?: [number, number];
  boundsY?: [number, number];
  /** 1 normalized 단위를 이동하는 데 걸리는 시간 (ms) — 느릴수록 우아 */
  walkSpeed?: number;
  /** 배회 기능 on/off (편집 모드 시 false) */
  enabled?: boolean;
}

interface WanderingState {
  state: SpiritAnimState;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  walkDuration: number;
  facingLeft: boolean;
}

const IDLE_MIN = 3000;
const IDLE_MAX = 8000;
const SLEEP_THRESHOLD = 30000;   // idle 누적 30초 경과 시 sleep 후보
const SLEEP_CHANCE = 0.3;
const SLEEP_DURATION = 15000;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function useWandering({
  initialX,
  initialY,
  boundsX = [0.15, 0.85],
  boundsY = [0.55, 0.92],
  walkSpeed = 6000,
  enabled = true,
}: Options) {
  const [state, setState] = useState<WanderingState>({
    state: 'idle',
    x: initialX,
    y: initialY,
    targetX: initialX,
    targetY: initialY,
    walkDuration: 0,
    facingLeft: false,
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleAccumRef = useRef(0);
  const reactQueuedRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const pickTarget = useCallback(() => {
    const curr = stateRef.current;
    // 현재 위치에서 최소 0.15 이상 떨어진 목표 (너무 짧은 이동 방지)
    let tx = 0, ty = 0, tries = 0;
    do {
      tx = rand(boundsX[0], boundsX[1]);
      ty = rand(boundsY[0], boundsY[1]);
      tries++;
    } while (Math.hypot(tx - curr.x, ty - curr.y) < 0.15 && tries < 8);

    const distance = Math.hypot(tx - curr.x, ty - curr.y);
    const duration = Math.max(2500, distance * walkSpeed);
    const facingLeft = tx < curr.x;

    setState((s) => ({
      ...s,
      state: 'walk',
      targetX: tx,
      targetY: ty,
      walkDuration: duration,
      facingLeft,
    }));
    idleAccumRef.current = 0;

    // 도착 후 arrive 전환
    timerRef.current = setTimeout(() => {
      setState((s) => ({
        ...s,
        state: 'arrive',
        x: s.targetX,
        y: s.targetY,
      }));
    }, duration);
  }, [boundsX, boundsY, walkSpeed]);

  const scheduleNextIdle = useCallback(() => {
    clearTimer();
    const waitMs = rand(IDLE_MIN, IDLE_MAX);
    idleAccumRef.current += waitMs;

    timerRef.current = setTimeout(() => {
      // 오래 idle 했으면 sleep 확률
      if (idleAccumRef.current >= SLEEP_THRESHOLD && Math.random() < SLEEP_CHANCE) {
        setState((s) => ({ ...s, state: 'sleep' }));
        idleAccumRef.current = 0;
        timerRef.current = setTimeout(() => {
          setState((s) => ({ ...s, state: 'idle' }));
          scheduleNextIdle();
        }, SLEEP_DURATION);
        return;
      }
      pickTarget();
    }, waitMs);
  }, [pickTarget]);

  // 메인 state machine
  useEffect(() => {
    if (!enabled) {
      clearTimer();
      return;
    }
    if (state.state === 'idle') {
      scheduleNextIdle();
    }
    return clearTimer;
  }, [state.state, enabled, scheduleNextIdle]);

  // arrive 끝나면 idle 로
  const handleArriveComplete = useCallback(() => {
    setState((s) => ({ ...s, state: 'idle' }));
  }, []);

  // react 끝나면 idle 로
  const handleReactComplete = useCallback(() => {
    setState((s) => ({ ...s, state: 'idle' }));
    if (reactQueuedRef.current) {
      reactQueuedRef.current = false;
    }
  }, []);

  // 외부에서 react 트리거
  const triggerReact = useCallback(() => {
    clearTimer();
    setState((s) => ({ ...s, state: 'react', x: s.x, y: s.y, targetX: s.x, targetY: s.y }));
    idleAccumRef.current = 0;
  }, []);

  // 탭 시 깨우기
  const wakeUp = useCallback(() => {
    if (stateRef.current.state === 'sleep') {
      clearTimer();
      setState((s) => ({ ...s, state: 'idle' }));
      idleAccumRef.current = 0;
    }
  }, []);

  return {
    state: state.state,
    x: state.x,
    y: state.y,
    targetX: state.targetX,
    targetY: state.targetY,
    walkDuration: state.walkDuration,
    facingLeft: state.facingLeft,
    triggerReact,
    wakeUp,
    handleArriveComplete,
    handleReactComplete,
  };
}
