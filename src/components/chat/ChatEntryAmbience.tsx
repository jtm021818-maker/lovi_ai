'use client';

/**
 * 🆕 v112: 채팅 진입 ambience 레이어
 *
 * 컨셉: (Not Boring) Weather + Grainient — mood/stage 별 organic gradient 배경 +
 * 작은 파티클 (✦/🌸/🍂/❄/✧). 절제된 분위기. pointer-events: none.
 *
 * - prefers-reduced-motion 존중
 * - 모바일 GPU 부하 최소화 (파티클 5~10개)
 * - 채팅 메시지 구역만 덮음 (z-0)
 */

import { motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';
import type { LunaMood } from '@/lib/luna-life/mood';
import type { LifeStage } from '@/lib/luna-life';

interface Props {
  mood: LunaMood;
  stage: LifeStage;
  enabled?: boolean;
}

// ─── mood 별 배경 그라데이션 (radial 다중) ────────────────────────────
const MOOD_BG: Record<LunaMood, string> = {
  bright:
    'radial-gradient(ellipse at 20% 10%, rgba(255,235,180,0.55) 0%, transparent 50%), radial-gradient(ellipse at 80% 90%, rgba(255,210,160,0.4) 0%, transparent 55%)',
  warm:
    'radial-gradient(ellipse at 15% 15%, rgba(255,225,200,0.45) 0%, transparent 55%), radial-gradient(ellipse at 85% 85%, rgba(255,200,180,0.32) 0%, transparent 60%)',
  playful:
    'radial-gradient(ellipse at 25% 15%, rgba(255,200,220,0.55) 0%, transparent 55%), radial-gradient(ellipse at 75% 80%, rgba(255,180,210,0.42) 0%, transparent 55%)',
  wistful:
    'radial-gradient(ellipse at 20% 20%, rgba(255,210,180,0.4) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(220,180,160,0.35) 0%, transparent 65%)',
  sleepy:
    'radial-gradient(ellipse at 25% 25%, rgba(200,185,225,0.45) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(180,170,210,0.4) 0%, transparent 60%)',
  thoughtful:
    'radial-gradient(ellipse at 30% 20%, rgba(200,210,225,0.4) 0%, transparent 55%), radial-gradient(ellipse at 70% 80%, rgba(190,205,215,0.35) 0%, transparent 60%)',
  peaceful:
    'radial-gradient(ellipse at 20% 25%, rgba(220,200,240,0.45) 0%, transparent 55%), radial-gradient(ellipse at 80% 75%, rgba(200,185,235,0.4) 0%, transparent 60%)',
};

// ─── 파티클 정의 ─────────────────────────────────────────────────────
type ParticleConfig = {
  symbols: string[];
  count: number;
  color: string;
  driftRange: number;     // x 흔들림 px
  durationBase: number;   // 한 번 위→아래 시간 (s)
  size: number;           // text-[Npx]
  fontWeight?: number;
};

function pickParticleConfig(mood: LunaMood, stage: LifeStage): ParticleConfig {
  if (stage === 'star' || stage === 'twilight') {
    return { symbols: ['✦', '✧'], count: 9, color: 'rgba(232,180,255,0.85)', driftRange: 12, durationBase: 14, size: 11 };
  }
  if (stage === 'winter') {
    return { symbols: ['❄', '✦'], count: 8, color: 'rgba(220,235,255,0.95)', driftRange: 16, durationBase: 12, size: 10 };
  }
  if (stage === 'autumn') {
    return { symbols: ['🍂', '🍁'], count: 6, color: 'rgba(220,160,90,0.85)', driftRange: 22, durationBase: 16, size: 13 };
  }
  if (stage === 'spring' || stage === 'dawn') {
    return { symbols: ['✦', '🌸', '✧'], count: 8, color: 'rgba(255,200,225,0.92)', driftRange: 14, durationBase: 13, size: 11 };
  }

  // mood 기반
  if (mood === 'playful') {
    return { symbols: ['✧', '💗', '✦'], count: 9, color: 'rgba(255,160,200,0.85)', driftRange: 14, durationBase: 11, size: 11 };
  }
  if (mood === 'sleepy') {
    return { symbols: ['✦'], count: 6, color: 'rgba(200,185,225,0.78)', driftRange: 8, durationBase: 16, size: 10 };
  }
  if (mood === 'wistful') {
    return { symbols: ['✦', '🍂'], count: 5, color: 'rgba(220,180,160,0.78)', driftRange: 18, durationBase: 15, size: 11 };
  }
  if (mood === 'thoughtful') {
    return { symbols: ['✦'], count: 6, color: 'rgba(200,215,225,0.7)', driftRange: 10, durationBase: 14, size: 10 };
  }
  if (mood === 'peaceful') {
    return { symbols: ['✦', '✧'], count: 7, color: 'rgba(220,200,240,0.85)', driftRange: 12, durationBase: 14, size: 11 };
  }

  // bright / warm 기본
  return { symbols: ['✦'], count: 7, color: 'rgba(255,220,140,0.85)', driftRange: 12, durationBase: 13, size: 11 };
}

interface ParticleSeed {
  symbol: string;
  startLeft: number;
  startTop: number;
  duration: number;
  delay: number;
  drift: number;
}

function generateSeeds(config: ParticleConfig): ParticleSeed[] {
  // 결정형은 굳이 X — mount 시 한 번 random
  return Array.from({ length: config.count }).map((_, i) => ({
    symbol:
      config.symbols[i % config.symbols.length],
    startLeft: 5 + Math.random() * 90,
    startTop: 100 + Math.random() * 30,
    duration: config.durationBase + (Math.random() - 0.5) * 4,
    delay: Math.random() * config.durationBase,
    drift: (Math.random() - 0.5) * config.driftRange,
  }));
}

export default function ChatEntryAmbience({
  mood,
  stage,
  enabled = true,
}: Props) {
  const reduce = useReducedMotion();
  const config = useMemo(() => pickParticleConfig(mood, stage), [mood, stage]);
  const seeds = useMemo(
    () => generateSeeds(config),
    // mount 시 한 번만 — config 바뀌면 재생성
    [config]
  );

  if (!enabled) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      {/* 배경 그라데이션 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        className="absolute inset-0"
        style={{ background: MOOD_BG[mood] }}
      />

      {/* 파티클 — reduced motion 아닐 때만 */}
      {!reduce &&
        seeds.map((s, i) => (
          <motion.span
            key={i}
            className="absolute select-none"
            style={{
              left: `${s.startLeft}%`,
              top: `${s.startTop}%`,
              fontSize: config.size,
              color: config.color,
              fontWeight: config.fontWeight ?? 400,
              filter: 'drop-shadow(0 1px 2px rgba(180,140,200,0.18))',
            }}
            animate={{
              y: ['0%', '-180%'],
              x: [0, s.drift, -s.drift, 0],
              opacity: [0, 0.85, 0.85, 0],
              rotate: [0, 20, -10, 0],
            }}
            transition={{
              duration: s.duration,
              delay: s.delay,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            {s.symbol}
          </motion.span>
        ))}

      {/* reduced motion 시 정적 별 1개 */}
      {reduce && (
        <span
          className="absolute top-4 right-6 select-none opacity-60"
          style={{ fontSize: config.size, color: config.color }}
        >
          ✦
        </span>
      )}
    </div>
  );
}
