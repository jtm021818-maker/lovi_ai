'use client';

/**
 * 🧚 v104.2: useSpiritFx
 *
 * 정령 이벤트 발동시 사운드 + 햅틱을 한 번에 트리거.
 * 외부 의존성 없이 native HTMLAudioElement + navigator.vibrate 사용.
 * 등급(N/R/SR/UR)에 따라 사운드/햅틱 패턴 차등.
 *
 * 사용:
 *   const { playCutin, playClose } = useSpiritFx({ spiritId, rarity });
 *   useEffect(() => { if (open) playCutin(); }, [open]);
 */

import { useCallback, useRef } from 'react';
import type { SpiritId, SpiritRarity } from '@/types/spirit.types';
import { isFxEnabled } from '@/lib/fx/effect-bus';

export interface SpiritFxOptions {
  spiritId: SpiritId;
  rarity: SpiritRarity;
  volume?: number;
}

/** 등급별 햅틱 패턴 (ms). N=가벼움, UR=풀패턴 */
const HAPTIC_PATTERN: Record<SpiritRarity, number[]> = {
  N: [40],
  R: [50, 50, 100],
  SR: [50, 30, 80, 30, 120],
  UR: [50, 30, 80, 30, 120, 30, 200],
  L: [50, 30, 80, 30, 120, 30, 200, 30, 250],
};

/** 등급별 컷인 지속시간 (ms) — 컴포넌트 onDone 타이밍 용 */
export const CUTIN_DURATION_MS: Record<SpiritRarity, number> = {
  N: 600,
  R: 1000,
  SR: 1600,
  UR: 2400,
  L: 2800,
};

/**
 * 자산 우선순위로 사운드 시도:
 *   1. /spirits/sounds/{rarity}_{spiritId}.mp3 (정령 시그니처)
 *   2. /spirits/sounds/chime_{rarity}.mp3 (등급 폴백)
 *   3. 무음 (graceful)
 */
function buildSoundCandidates(spiritId: SpiritId, rarity: SpiritRarity): string[] {
  const r = rarity.toLowerCase();
  return [
    `/spirits/sounds/${r}_${spiritId}.mp3`,
    `/spirits/sounds/chime_${r}.mp3`,
  ];
}

export function useSpiritFx({ spiritId, rarity, volume = 0.5 }: SpiritFxOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = useCallback((candidates: string[]) => {
    if (!isFxEnabled()) return;
    if (typeof window === 'undefined') return;

    // 순차 시도 — 첫 success에서 멈춤
    let idx = 0;
    const tryNext = () => {
      if (idx >= candidates.length) return;
      const src = candidates[idx++];
      const audio = new Audio(src);
      audio.volume = volume;
      audio.onerror = () => tryNext();
      audio.play().then(() => {
        audioRef.current = audio;
      }).catch(() => tryNext());
    };
    tryNext();
  }, [volume]);

  const playHaptic = useCallback(() => {
    if (!isFxEnabled()) return;
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;
    try {
      navigator.vibrate(HAPTIC_PATTERN[rarity]);
    } catch {
      // 무시
    }
  }, [rarity]);

  const playCutin = useCallback(() => {
    playSound(buildSoundCandidates(spiritId, rarity));
    playHaptic();
  }, [spiritId, rarity, playSound, playHaptic]);

  const playClose = useCallback(() => {
    if (!isFxEnabled()) return;
    if (typeof window === 'undefined') return;
    const a = new Audio('/spirits/sounds/skip_soft.mp3');
    a.volume = volume * 0.6;
    a.play().catch(() => undefined);
  }, [volume]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  return { playCutin, playClose, stop };
}
