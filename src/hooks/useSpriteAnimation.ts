'use client';

/**
 * v85.4: useSpriteAnimation — rAF 기반 프레임 사이클링 훅
 *
 * setInterval 대신 requestAnimationFrame 사용 이유:
 *   1. 브라우저 탭 비활성 시 자동 일시정지 (배터리 절약)
 *   2. 디스플레이 리프레시율에 동기화 (부드러움)
 *   3. FPS 정확도 (delta-time 기반)
 */

import { useEffect, useRef, useState } from 'react';
import type { SpiritSpriteSheet, SpiritAnimState } from '@/types/spirit-sprite.types';

interface Options {
  sheet: SpiritSpriteSheet;
  state: SpiritAnimState;
  /** once: true 상태의 재생 종료 시 호출 */
  onComplete?: () => void;
  /** false 로 넘기면 애니메이션 정지 (현재 프레임 유지) */
  playing?: boolean;
}

export function useSpriteAnimation({ sheet, state, onComplete, playing = true }: Options) {
  const [frame, setFrame] = useState(0);
  const stateRef = useRef(state);
  const onCompleteRef = useRef(onComplete);
  const lastTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  // 최신 onComplete 콜백 참조 유지
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // 상태 변경 시 프레임 리셋
  useEffect(() => {
    if (stateRef.current !== state) {
      stateRef.current = state;
      setFrame(0);
      lastTimeRef.current = 0;
    }
  }, [state]);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const cfg = sheet.states[state];
    if (!cfg) return;

    const frameInterval = 1000 / cfg.fps;

    const tick = (now: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = now;
      const elapsed = now - lastTimeRef.current;

      if (elapsed >= frameInterval) {
        const advance = Math.floor(elapsed / frameInterval);
        lastTimeRef.current += advance * frameInterval;

        setFrame((prev) => {
          const next = prev + advance;
          if (cfg.once) {
            if (next >= cfg.frames - 1) {
              onCompleteRef.current?.();
              return cfg.frames - 1;
            }
            return next;
          }
          return next % cfg.frames;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimeRef.current = 0;
    };
  }, [sheet, state, playing]);

  return frame;
}
