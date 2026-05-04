'use client';

/**
 * 🆕 v112-rev2: 진입 의식 — 사운드/햅틱 시퀀스만 (카드 ambience X)
 *
 * 역할: 카톡 톡방 진입 후 미세한 사운드 트리거 + 햅틱.
 * (rev1 의 ambience 그라데이션/파티클 layer 는 카톡 톡방엔 어색해서 제거)
 *
 * 시퀀스:
 *   0.0s 진입 페이드인       chime + .light haptic
 *   1200ms (영상 중 내부 신호) — 따로 없음
 *
 * → 메시지 도착 사운드는 LunaGreetingMessage 가 자체 트리거 (typing → ping).
 *   여기는 진입 시 단 한 번 chime + .light 만.
 */

import { useEffect } from 'react';
import { triggerHaptic } from '@/lib/haptic';
import { playSound, preloadSounds } from '@/lib/audio';

interface Props {
  enableSound?: boolean;
  enableHaptic?: boolean;
  children: React.ReactNode;
}

export default function EntryRitualOrchestrator({
  enableSound = true,
  enableHaptic = true,
  children,
}: Props) {
  useEffect(() => {
    if (enableSound) preloadSounds();
    // 진입 시 1회 — chime + .light
    if (enableSound) playSound('chime');
    if (enableHaptic) triggerHaptic('light');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
