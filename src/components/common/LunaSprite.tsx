'use client';

/**
 * 🦊 v82.20: Luna Sprite — 범용 스프라이트 컴포넌트
 *
 * 여러 스프라이트 시트 지원:
 *   - luna_sprite_1.png (5×5, 25프레임) — BRIDGE 아바타, 루나극장 choice
 *   - luna_sprite_setting_1.png (7×7, 49프레임) — 설정 페이지 상담 모드
 *
 * React state + 픽셀 기반 transform 으로 안정적 애니메이션.
 */

import { useEffect, useState } from 'react';

// ─── Preset 정의 ──────────────────────────────────────
export const SPRITE_PRESETS = {
  avatar: {
    url: '/splite/luna_sprite_1.png',
    cols: 5,
    rows: 5,
  },
  setting: {
    url: '/splite/luna_sprite_setting_1.png',
    cols: 7,
    rows: 7,
  },
} as const;

export type SpritePresetKey = keyof typeof SPRITE_PRESETS;

// ─── 모듈 레벨 캐시 ───────────────────────────────────
const LOADED: Record<string, boolean> = {};
const LOAD_PROMISES: Record<string, Promise<void>> = {};

function ensureSpriteLoaded(url: string): Promise<void> {
  if (LOADED[url]) return Promise.resolve();
  const existing = LOAD_PROMISES[url];
  if (existing) return existing;
  const p = new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => { LOADED[url] = true; resolve(); };
    img.onerror = () => { LOADED[url] = true; resolve(); };
    img.src = url;
  });
  LOAD_PROMISES[url] = p;
  return p;
}

// ─── Props ────────────────────────────────────────────
interface LunaSpriteProps {
  size?: number;
  /** 프리셋 (url/cols/rows 보다 우선 낮음) */
  preset?: SpritePresetKey;
  /** 커스텀 url (preset 보다 우선) */
  src?: string;
  cols?: number;
  rows?: number;
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
  preset = 'avatar',
  src,
  cols,
  rows,
  speed = 'normal',
  frameMs,
  paused = false,
  circle = true,
  className,
  style,
}: LunaSpriteProps) {
  // preset → 기본값, custom 있으면 덮어쓰기
  const presetCfg = SPRITE_PRESETS[preset];
  const finalUrl = src ?? presetCfg.url;
  const finalCols = cols ?? presetCfg.cols;
  const finalRows = rows ?? presetCfg.rows;
  const totalFrames = finalCols * finalRows;

  const [frame, setFrame] = useState(0);
  const [loaded, setLoaded] = useState(LOADED[finalUrl] ?? false);

  // 프레임 ms: 프리셋마다 총 loop 시간 약 2.5초 근처로 맞춤
  // 25프레임 × 100ms = 2.5s
  // 49프레임 × 50ms = 2.45s
  const defaultMs = totalFrames >= 40 ? 55 : 100;
  const ms = frameMs ?? (
    speed === 'slow' ? defaultMs * 1.6 :
    speed === 'fast' ? defaultMs * 0.6 :
    defaultMs
  );

  // 이미지 로드 감지
  useEffect(() => {
    if (LOADED[finalUrl]) { setLoaded(true); return; }
    let cancelled = false;
    ensureSpriteLoaded(finalUrl).then(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [finalUrl]);

  // 프레임 순환
  useEffect(() => {
    if (paused || !loaded) return;
    const id = window.setInterval(() => {
      setFrame((f) => (f + 1) % totalFrames);
    }, ms);
    return () => window.clearInterval(id);
  }, [ms, paused, loaded, totalFrames]);

  const col = frame % finalCols;
  const row = Math.floor(frame / finalCols);
  const frameSize = size; // 정사각형 viewport 가정

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
      {/* 로드 전 플레이스홀더 */}
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
          width: frameSize * finalCols,
          height: frameSize * finalRows,
          backgroundImage: `url(${finalUrl})`,
          backgroundSize: `${frameSize * finalCols}px ${frameSize * finalRows}px`,
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
