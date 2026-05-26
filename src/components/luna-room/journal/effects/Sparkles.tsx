'use client';

/**
 * v119.5 — 경량 Sparkles 컴포넌트.
 *
 * Aceternity UI `SparklesCore` 의 컨셉(별 파티클 흩어짐) 을
 * framer-motion 만으로 재구현 — tsparticles 등 추가 의존성 없음.
 *
 * 사용:
 *   <Sparkles count={20} color="#F5D38A" sizeRange={[0.5, 2]} />
 */

import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface Props {
  /** 별 개수 (default 16) */
  count?: number;
  /** 파티클 컬러 */
  color?: string;
  /** 별 크기 범위 px [min, max] */
  sizeRange?: readonly [number, number];
  /** 컨테이너 너비/높이 — 절대 위치 + 인셋 0 으로 부모 전체 채움 (default true) */
  fill?: boolean;
  /** seed — 같은 시드로 같은 패턴 (SSR-safe) */
  seed?: number;
  /** 평균 깜빡임 주기 (s) */
  twinkleDuration?: number;
  /** 추가 클래스 */
  className?: string;
  /** opacity 범위 [min, max] */
  opacityRange?: readonly [number, number];
}

export default function Sparkles({
  count = 16,
  color = '#FFE9B8',
  sizeRange = [0.5, 1.8],
  fill = true,
  seed = 7,
  twinkleDuration = 2.8,
  className,
  opacityRange = [0.3, 1.0],
}: Props) {
  // 결정론적 좌표 — SSR hydration mismatch 방지
  const dots = useMemo(() => {
    let s = seed * 9301 + 49297;
    const rand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    return Array.from({ length: count }, () => {
      const r = sizeRange[0] + rand() * (sizeRange[1] - sizeRange[0]);
      return {
        x: rand() * 100,         // %
        y: rand() * 100,         // %
        r,                       // px
        delay: rand() * twinkleDuration,
        duration: twinkleDuration * (0.7 + rand() * 0.6),
        opacityMin: opacityRange[0],
        opacityMax: opacityRange[1],
      };
    });
  }, [count, sizeRange, seed, twinkleDuration, opacityRange]);

  return (
    <div
      aria-hidden
      className={className}
      style={{
        position: fill ? 'absolute' : 'relative',
        inset: fill ? 0 : undefined,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {dots.map((d, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [d.opacityMin, d.opacityMax, d.opacityMin],
            scale: [0.7, 1.1, 0.7],
          }}
          transition={{
            delay: d.delay,
            duration: d.duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.r * 2,
            height: d.r * 2,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 ${d.r * 3}px ${color}`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  );
}
