'use client';

/**
 * 🦊 v82.18: Luna Sprite — 5×5 grid, 25 frames
 *
 * 원본: public/splite/luna_sprite_1.png (3600×3600)
 * 그리드: 5 cols × 5 rows = 25 frames
 * 프레임 크기: 720×720 (정사각형)
 *
 * React state + 픽셀 기반 transform 으로 안정적 애니메이션.
 *
 * Usage:
 *   <LunaSprite size={40} />                  // 기본 100ms/frame (총 2.5s loop)
 *   <LunaSprite size={60} speed="slow" />     // 180ms
 *   <LunaSprite size={32} speed="fast" />     // 60ms
 *   <LunaSprite size={40} paused />           // 0프레임 고정
 *   <LunaSprite size={520} circle={false} />  // 큰 사각 프레임 (VN 극장용)
 */

import { useEffect, useState } from 'react';

const COLS = 5;
const ROWS = 5;
const TOTAL_FRAMES = COLS * ROWS; // 25

interface LunaSpriteProps {
  size?: number;
  speed?: 'slow' | 'normal' | 'fast';
  /** 프레임 ms (speed 보다 우선) */
  frameMs?: number;
  paused?: boolean;
  /** 원형 mask (기본 true) */
  circle?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function LunaSprite({
  size = 40,
  speed = 'normal',
  frameMs,
  paused = false,
  circle = true,
  className,
  style,
}: LunaSpriteProps) {
  const [frame, setFrame] = useState(0);
  // 25프레임 × ms = loop 총 시간
  // 기본 100ms × 25 = 2.5s
  // slow 180ms × 25 = 4.5s
  // fast 60ms × 25 = 1.5s
  const ms = frameMs ?? (speed === 'slow' ? 180 : speed === 'fast' ? 60 : 100);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setFrame((f) => (f + 1) % TOTAL_FRAMES);
    }, ms);
    return () => window.clearInterval(id);
  }, [ms, paused]);

  const col = frame % COLS;
  const row = Math.floor(frame / COLS);

  // 각 프레임이 정사각형이므로 viewport 와 프레임 크기 동일
  const frameSize = size;

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: circle ? '50%' : 0,
        overflow: 'hidden',
        position: 'relative',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: frameSize * COLS,   // size × 5
          height: frameSize * ROWS,  // size × 5
          backgroundImage: 'url(/splite/luna_sprite_1.png)',
          backgroundSize: `${frameSize * COLS}px ${frameSize * ROWS}px`,
          backgroundRepeat: 'no-repeat',
          transform: `translate(-${col * frameSize}px, -${row * frameSize}px)`,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
