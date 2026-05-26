'use client';

/**
 * v119.5 — 경량 별똥별 배경.
 *
 * Aceternity `ShootingStars` 의 컨셉(주기적 별똥별) 을 SVG + framer-motion 으로 재구현.
 * 추가 의존성 0.
 *
 * 사용:
 *   <ShootingStars count={3} color="#F5D38A" interval={4} />
 */

import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface Props {
  /** 동시 등장 별똥별 트랙 개수 (default 2) */
  count?: number;
  /** 색상 */
  color?: string;
  /** 트랙당 평균 간격 (s) — 짧을수록 자주 (default 5) */
  interval?: number;
  /** 별똥별 꼬리 길이 % (default 22) */
  tailLength?: number;
  /** seed */
  seed?: number;
  /** className */
  className?: string;
}

export default function ShootingStars({
  count = 2,
  color = '#C9B3E8',
  interval = 5,
  tailLength = 22,
  seed = 11,
  className,
}: Props) {
  const tracks = useMemo(() => {
    let s = seed * 9301 + 49297;
    const rand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    return Array.from({ length: count }, (_, i) => {
      // 좌상→우하 대각선 변형
      const startX = -5 + rand() * 20;   // %
      const startY = -5 + rand() * 30;
      const endX = startX + 60 + rand() * 30;
      const endY = startY + 60 + rand() * 30;
      return {
        startX, startY, endX, endY,
        duration: 1.0 + rand() * 0.8,
        delay: i * (interval / count) + rand() * 0.8,
        cycleDelay: interval + rand() * 2.5,
      };
    });
  }, [count, interval, seed]);

  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <defs>
        <linearGradient id="shooting-star-tail" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0} />
          <stop offset="80%" stopColor={color} stopOpacity={0.85} />
          <stop offset="100%" stopColor={color} stopOpacity={1} />
        </linearGradient>
      </defs>
      {tracks.map((t, i) => {
        const dx = t.endX - t.startX;
        const dy = t.endY - t.startY;
        const len = Math.hypot(dx, dy);
        const tailX = (-dx / len) * tailLength;
        const tailY = (-dy / len) * tailLength;
        return (
          <motion.g key={i}>
            <motion.line
              x1={0} y1={0}
              x2={tailX} y2={tailY}
              stroke="url(#shooting-star-tail)"
              strokeWidth={0.35}
              strokeLinecap="round"
              initial={{ opacity: 0 }}
              animate={{
                x: [t.startX, t.endX],
                y: [t.startY, t.endY],
                opacity: [0, 0.95, 0.95, 0],
              }}
              transition={{
                duration: t.duration,
                delay: t.delay,
                repeat: Infinity,
                repeatDelay: t.cycleDelay,
                ease: 'easeIn',
                times: [0, 0.15, 0.85, 1],
              }}
            />
          </motion.g>
        );
      })}
    </svg>
  );
}
