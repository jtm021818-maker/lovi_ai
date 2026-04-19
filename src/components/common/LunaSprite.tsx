'use client';

/**
 * 🦊 v82.16: Luna Sprite — React state 기반 (EmotionMirror 검증 방식)
 *
 * 이전 CSS Module @keyframes + steps() 방식은 브라우저 호환 이슈로 동작 불안정.
 * EmotionMirror 의 스프라이트 렌더 패턴과 동일하게 **픽셀 기반 background-position**
 * + **React state 로 프레임 순환** 방식으로 교체.
 *
 * 원본 스프라이트: public/splite/luna_sprite_1.png (3600×3600, 4×2 grid)
 * 프레임 크기: 900 × 1800 (세로 긴 인물)
 *
 * Usage:
 *   <LunaSprite size={40} />                  // 150ms/frame
 *   <LunaSprite size={60} speed="slow" />     // 300ms
 *   <LunaSprite size={32} speed="fast" />     // 80ms
 *   <LunaSprite size={40} paused />           // 0프레임 고정
 */

import { useEffect, useState } from 'react';

const COLS = 4;
const ROWS = 2;
const TOTAL_FRAMES = COLS * ROWS; // 8

interface LunaSpriteProps {
  size?: number;
  speed?: 'slow' | 'normal' | 'fast';
  /** 프레임 ms (speed 보다 우선) */
  frameMs?: number;
  paused?: boolean;
  /** 원형 mask (기본 true) */
  circle?: boolean;
  /** head 만 보이게 crop (aspect 1:2 이므로 기본 true — 원형 + 위쪽 offset) */
  headCrop?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function LunaSprite({
  size = 40,
  speed = 'normal',
  frameMs,
  paused = false,
  circle = true,
  headCrop = true,
  className,
  style,
}: LunaSpriteProps) {
  const [frame, setFrame] = useState(0);
  const ms = frameMs ?? (speed === 'slow' ? 260 : speed === 'fast' ? 80 : 150);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setFrame((f) => (f + 1) % TOTAL_FRAMES);
    }, ms);
    return () => window.clearInterval(id);
  }, [ms, paused]);

  // 1:2 aspect 프레임을 1:1 viewport 에 맞추려면 width 는 size, height 는 size*2
  // 원형 + headCrop 이면 위쪽 (머리) 만 보이도록 element 는 size×size 로 자르고
  // 내부 스프라이트 layer 는 size 너비 / (size×2) 높이
  const spriteW = size;
  const spriteH = headCrop ? size * 2 : size;
  const col = frame % COLS;
  const row = Math.floor(frame / COLS);

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: circle ? '50%' : 0,
        overflow: 'hidden',
        position: 'relative',
        // GPU 힌트
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
          width: spriteW * COLS,
          height: spriteH * ROWS,
          backgroundImage: 'url(/splite/luna_sprite_1.png)',
          backgroundSize: `${spriteW * COLS}px ${spriteH * ROWS}px`,
          backgroundRepeat: 'no-repeat',
          // 프레임 위치로 sprite 이동 (translateX/Y)
          transform: `translate(-${col * spriteW}px, -${row * spriteH}px)`,
          // paused 상태에서도 첫 프레임 보이게
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
