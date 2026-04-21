'use client';

/**
 * ✨ v85.2: AmbientFireflies — 방 안 반딧불/먼지 파티클 (CSS-only, 무의존성)
 *
 * 6개의 작은 빛 입자가 랜덤하게 떠다니며 방 분위기를 살린다.
 * framer-motion 조차 안 쓰고 CSS @keyframes 로 경량화.
 */

import { useMemo } from 'react';

interface Props {
  count?: number;
  width: number;
  height: number;
}

interface FireflyConfig {
  id: number;
  x: number;           // 0 ~ 1
  y: number;           // 0 ~ 1
  delay: number;       // seconds
  duration: number;    // seconds (float loop)
  size: number;        // px
  color: string;
  driftX: number;      // px
  driftY: number;      // px
}

function pseudoRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export default function AmbientFireflies({ count = 6, width, height }: Props) {
  const fireflies = useMemo<FireflyConfig[]>(() => {
    const rand = pseudoRandom(1337);
    return Array.from({ length: count }, (_, i) => {
      const warm = rand() < 0.5;
      return {
        id: i,
        x: rand(),
        y: 0.2 + rand() * 0.6,
        delay: rand() * 6,
        duration: 6 + rand() * 8,
        size: 3 + rand() * 3,
        color: warm ? 'rgba(255, 220, 130, 0.85)' : 'rgba(255, 240, 200, 0.7)',
        driftX: 12 + rand() * 30,
        driftY: 8 + rand() * 20,
      };
    });
  }, [count]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      style={{ width, height }}
    >
      {fireflies.map((f) => (
        <span
          key={f.id}
          className="firefly"
          style={{
            left: `${f.x * 100}%`,
            top: `${f.y * 100}%`,
            width: f.size,
            height: f.size,
            background: f.color,
            boxShadow: `0 0 ${f.size * 3}px ${f.color}, 0 0 ${f.size * 6}px ${f.color}`,
            animation: `firefly-float-${f.id} ${f.duration}s ease-in-out ${f.delay}s infinite, firefly-twinkle 2.${f.id}s ease-in-out ${f.delay}s infinite`,
            // 커스텀 프로퍼티로 drift 거리 전달
            ['--dx' as any]: `${f.driftX}px`,
            ['--dy' as any]: `${-f.driftY}px`,
          }}
        />
      ))}

      <style jsx>{`
        .firefly {
          position: absolute;
          border-radius: 50%;
          filter: blur(0.3px);
        }
        @keyframes firefly-twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        ${fireflies
          .map(
            (f) => `
          @keyframes firefly-float-${f.id} {
            0% { transform: translate(0, 0); }
            25% { transform: translate(${f.driftX * 0.6}px, ${-f.driftY * 0.8}px); }
            50% { transform: translate(${-f.driftX * 0.4}px, ${-f.driftY * 0.3}px); }
            75% { transform: translate(${f.driftX * 0.3}px, ${f.driftY * 0.4}px); }
            100% { transform: translate(0, 0); }
          }
        `,
          )
          .join('\n')}
      `}</style>
    </div>
  );
}
