'use client';

/**
 * 🆕 v112: 진입 의식 오케스트레이터
 *
 * 컨셉: 7개 컴포넌트의 8초 시퀀스 + 사운드 + 햅틱 통합 관리.
 *
 * 시퀀스 (idle 후엔 children 자체가 자유롭게 움직임):
 *   0.0s 진입 (페이드인)            chime + .light haptic
 *   0.3s Room slide down
 *   0.6s IdleCharacter 등장
 *   1.0s Ambience 파티클 흐름
 *   1.2s RelationshipBadge          tiny ping
 *   1.6s GreetingCard 슬라이드 인   paper rustle
 *   3.5s opening.mp4 자동 재생 (children 이 알아서 처리)
 *   ~6.5s 영상 종료
 *   6.8s FirstMessageGuide chip     sparkle
 *
 * 단순 transition 동기화는 각 컴포넌트의 `delay` prop 으로 처리되고,
 * 이 컴포넌트는 사운드/햅틱 트리거 + 사용자 옵션 토글 관리만 담당.
 */

import { useEffect } from 'react';
import { triggerHaptic } from '@/lib/haptic';
import { playSound, preloadSounds } from '@/lib/audio';
import ChatEntryAmbience from './ChatEntryAmbience';
import type { LunaMood } from '@/lib/luna-life/mood';
import type { LifeStage } from '@/lib/luna-life';

interface Props {
  enableSound?: boolean;
  enableHaptic?: boolean;
  /** ambience layer 용 — 없으면 ambience 비활성 */
  ambienceMood?: LunaMood;
  ambienceStage?: LifeStage;
  children: React.ReactNode;
}

const SEQUENCE: { at: number; sound?: 'chime' | 'paper' | 'ping' | 'sparkle'; haptic?: boolean }[] = [
  { at: 0, sound: 'chime', haptic: true },
  { at: 1200, sound: 'ping' },
  { at: 1600, sound: 'paper' },
  { at: 6800, sound: 'sparkle' },
];

export default function EntryRitualOrchestrator({
  enableSound = true,
  enableHaptic = true,
  ambienceMood,
  ambienceStage,
  children,
}: Props) {
  useEffect(() => {
    // 사운드 미리 로드
    if (enableSound) preloadSounds();

    const timers: NodeJS.Timeout[] = [];
    SEQUENCE.forEach((step) => {
      const t = setTimeout(() => {
        if (enableSound && step.sound) playSound(step.sound);
        if (enableHaptic && step.haptic) triggerHaptic('light');
      }, step.at);
      timers.push(t);
    });

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
    // 마운트 시 1회만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative">
      {ambienceMood && ambienceStage && (
        <ChatEntryAmbience mood={ambienceMood} stage={ambienceStage} />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
