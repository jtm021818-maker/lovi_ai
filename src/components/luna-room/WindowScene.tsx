'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';
import type { LunaTimeBand, LunaWeather } from '@/lib/luna-life/mood';
import type { LifeStage } from '@/lib/luna-life';

interface Props {
  weather: LunaWeather;
  timeBand: LunaTimeBand;
  stage: LifeStage;
}

const SKY_BY_TIME: Record<LunaTimeBand, [string, string]> = {
  dawn: ['#FFD7BA', '#FAD4DD'],
  morning: ['#FFF8E7', '#FCE7F3'],
  afternoon: ['#FEF3C7', '#DBEAFE'],
  evening: ['#FCD4B8', '#C7B6E0'],
  night: ['#1E1B4B', '#312E81'],
};

const HORIZON_BY_STAGE: Record<LifeStage, string> = {
  dawn: '#C4B5FD',
  spring: '#A7F3D0',
  summer: '#FDE68A',
  autumn: '#FDBA74',
  winter: '#BAE6FD',
  twilight: '#5B21B6',
  star: '#1E1B4B',
};

function Raindrops() {
  const drops = useMemo(() => Array.from({ length: 14 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 1.4,
    duration: 0.7 + Math.random() * 0.5,
  })), []);
  return (
    <>
      {drops.map((d) => (
        <motion.div
          key={d.id}
          className="absolute"
          style={{
            left: `${d.x}%`,
            top: 0,
            width: 1.2,
            height: 12,
            background: 'linear-gradient(180deg, transparent, rgba(186, 230, 253, 0.85))',
            borderRadius: 1,
            transform: 'rotate(-12deg)',
          }}
          animate={{ y: ['-12px', '260px'], opacity: [0, 0.85, 0] }}
          transition={{ duration: d.duration, delay: d.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </>
  );
}

function Snowflakes() {
  const flakes = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    size: 3 + Math.random() * 4,
    delay: Math.random() * 4,
    duration: 6 + Math.random() * 5,
  })), []);
  return (
    <>
      {flakes.map((f) => (
        <motion.div
          key={f.id}
          className="absolute rounded-full bg-white"
          style={{ left: `${f.x}%`, top: -8, width: f.size, height: f.size, opacity: 0.85 }}
          animate={{ y: [0, 240], x: [0, 12, -8, 6], rotate: [0, 360] }}
          transition={{ duration: f.duration, delay: f.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </>
  );
}

function StarField() {
  const stars = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 80,
    size: 1 + Math.random() * 2,
    delay: Math.random() * 4,
  })), []);
  return (
    <>
      {stars.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            boxShadow: '0 0 4px rgba(255,255,255,0.8)',
          }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2 + Math.random() * 2, delay: s.delay, repeat: Infinity }}
        />
      ))}
    </>
  );
}

export default function WindowScene({ weather, timeBand, stage }: Props) {
  const [skyTop, skyBottom] = SKY_BY_TIME[timeBand];
  const horizonColor = HORIZON_BY_STAGE[stage];
  const isNight = timeBand === 'night' || timeBand === 'evening';
  const showSun = !isNight && weather !== 'starry';
  const showMoon = isNight && weather !== 'rainy' && weather !== 'snowy';

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* 1. 하늘 그라데이션 */}
      <motion.div
        key={`sky-${timeBand}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="absolute inset-0"
        style={{ background: `linear-gradient(180deg, ${skyTop} 0%, ${skyBottom} 100%)` }}
      />

      {/* 2. 해 / 달 */}
      {showSun && (
        <motion.div
          className="absolute rounded-full"
          style={{
            top: '22%',
            width: 56,
            height: 56,
            background: 'radial-gradient(circle, #FFF8DC 0%, #FFE38A 60%, transparent 100%)',
            boxShadow: '0 0 40px rgba(255, 235, 160, 0.7)',
          }}
          animate={{ left: ['18%', '74%'] }}
          transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
        />
      )}
      {showMoon && (
        <motion.div
          className="absolute rounded-full"
          style={{
            top: '20%',
            width: 44,
            height: 44,
            background: 'radial-gradient(circle, #FFF8DC 0%, #C7B6E0 70%, transparent 100%)',
            boxShadow: '0 0 30px rgba(255, 248, 220, 0.4)',
          }}
          animate={{ left: ['22%', '78%'] }}
          transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* 3. 지평선 실루엣 (도시/산) */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: '38%',
          background: `linear-gradient(180deg, transparent, ${horizonColor}88)`,
          clipPath:
            'polygon(0 100%, 0 60%, 8% 50%, 14% 65%, 22% 40%, 30% 55%, 38% 35%, 46% 50%, 54% 30%, 64% 55%, 72% 45%, 82% 60%, 92% 40%, 100% 55%, 100% 100%)',
        }}
      />

      {/* 4. 날씨 파티클 */}
      {weather === 'rainy' && <Raindrops />}
      {weather === 'snowy' && <Snowflakes />}
      {weather === 'starry' && <StarField />}

      {/* 5. 창틀 (window frame) — 입체감용 */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-b from-[#8B7355] to-transparent opacity-30" />
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-r from-[#8B7355] to-transparent opacity-30" />
      <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-l from-[#8B7355] to-transparent opacity-30" />
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#8B7355] opacity-20" />
      <div className="absolute inset-x-0 top-1/2 h-px bg-[#8B7355] opacity-20" />
    </div>
  );
}
