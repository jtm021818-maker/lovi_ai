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
const SPRITE_URL = '/splite/luna_sprite_1.png';

// 🆕 v82.19: 모듈 레벨 캐시 — 이미지 한 번 로드되면 이후 LunaSprite 인스턴스들은 즉시 보여줌
let SPRITE_LOADED = false;
let LOAD_PROMISE: Promise<void> | null = null;

function ensureSpriteLoaded(): Promise<void> {
  if (SPRITE_LOADED) return Promise.resolve();
  if (LOAD_PROMISE) return LOAD_PROMISE;
  LOAD_PROMISE = new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      SPRITE_LOADED = true;
      resolve();
    };
    img.onerror = () => {
      SPRITE_LOADED = true; // 실패해도 플레이스홀더 해제
      resolve();
    };
    img.src = SPRITE_URL;
  });
  return LOAD_PROMISE;
}

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
  const [loaded, setLoaded] = useState(SPRITE_LOADED);
  const ms = frameMs ?? (speed === 'slow' ? 180 : speed === 'fast' ? 60 : 100);

  // 🆕 v82.19: 이미지 로드 감지 — 로드 완료 후 페이드인
  useEffect(() => {
    if (SPRITE_LOADED) { setLoaded(true); return; }
    let cancelled = false;
    ensureSpriteLoaded().then(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (paused || !loaded) return;
    const id = window.setInterval(() => {
      setFrame((f) => (f + 1) % TOTAL_FRAMES);
    }, ms);
    return () => window.clearInterval(id);
  }, [ms, paused, loaded]);

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
      {/* 🆕 v82.19: 로드 전 플레이스홀더 (부드러운 pulse) */}
      {!loaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, #fde1c4 0%, #f9a8d4 50%, #c4b5fd 100%)',
            animation: 'lunaSpritePulse 1.2s ease-in-out infinite',
          }}
        />
      )}
      <style>{`
        @keyframes lunaSpritePulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: frameSize * COLS,
          height: frameSize * ROWS,
          backgroundImage: `url(${SPRITE_URL})`,
          backgroundSize: `${frameSize * COLS}px ${frameSize * ROWS}px`,
          backgroundRepeat: 'no-repeat',
          transform: `translate(-${col * frameSize}px, -${row * frameSize}px)`,
          pointerEvents: 'none',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s ease-out',
        }}
      />
    </div>
  );
}
