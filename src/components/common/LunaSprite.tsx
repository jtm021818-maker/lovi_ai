'use client';

/**
 * 🦊 v82.22: Luna Sprite — 범용 스프라이트 컴포넌트
 *
 * 여러 스프라이트 시트 지원:
 *   - luna_sprite_1.webp (5×5, 25프레임) — BRIDGE 아바타, 루나극장 choice
 *   - luna_sprite_setting_1.webp (7×7, 49프레임) — 설정 페이지 상담 모드
 *
 * React state + 픽셀 기반 transform 으로 안정적 애니메이션.
 */

import { useEffect, useRef, useState } from 'react';

// ─── Preset 정의 ──────────────────────────────────────
export const SPRITE_PRESETS = {
  avatar: {
    url: '/splite/luna_sprite_1.webp',
    cols: 5,
    rows: 5,
  },
  setting: {
    url: '/splite/luna_sprite_setting_1.webp',
    cols: 7,
    rows: 7,
  },
} as const;

export type SpritePresetKey = keyof typeof SPRITE_PRESETS;

// ─── 모듈 레벨 캐시 ───────────────────────────────────
const LOADED: Record<string, boolean> = {};
const LOAD_PROMISES: Record<string, Promise<void>> = {};

/** 브라우저가 이미 캐시한 이미지인지 동기 체크 (preload hint 활용) */
function isBrowserCached(url: string): boolean {
  if (typeof window === 'undefined') return false;
  if (LOADED[url]) return true;
  const probe = new Image();
  probe.src = url;
  if (probe.complete && probe.naturalWidth > 0) {
    LOADED[url] = true;
    return true;
  }
  return false;
}

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

// avatar 프리셋만 모듈 레벨 즉시 프리로드 (모든 페이지 공통)
// setting(16MB)은 설정 페이지에서만 필요하므로 컴포넌트 마운트 시 로드
if (typeof window !== 'undefined') {
  const avatarUrl = SPRITE_PRESETS.avatar.url;
  if (!isBrowserCached(avatarUrl)) {
    ensureSpriteLoaded(avatarUrl);
  }
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
  /** 프레임 종횡비 (height / width) — 1 = 정사각형(기본), >1 = 세로 긴 프레임 */
  frameAspect?: number;
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
  frameAspect = 1,
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
  // lazy initializer: 브라우저 캐시 동기 체크로 초기 로드 플래시 제거
  const [loaded, setLoaded] = useState(() => isBrowserCached(finalUrl));
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // 프레임 ms: 프리셋마다 총 loop 시간 약 2.5초 근처
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

  // 탭 숨김 감지 (다른 브라우저 탭 / 앱 백그라운드 시 정지)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibility = () => setTabVisible(document.visibilityState === 'visible');
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // IntersectionObserver — 스크롤로 화면 밖이면 정지
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setInView(entry.isIntersecting);
      },
      { threshold: 0.01 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // requestAnimationFrame 기반 timing — 탭 숨김/오프스크린 시 자동 정지
  useEffect(() => {
    if (paused || !loaded || !inView || !tabVisible) return;
    let rafId = 0;
    let last = performance.now();
    const tick = (now: number) => {
      if (now - last >= ms) {
        setFrame((f) => (f + 1) % totalFrames);
        last = now;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [ms, paused, loaded, totalFrames, inView, tabVisible]);

  const col = frame % finalCols;
  const row = Math.floor(frame / finalCols);
  const frameW = size;
  const frameH = size * frameAspect;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: frameW,
        height: frameH,
        borderRadius: circle ? '50%' : 0,
        overflow: 'hidden',
        position: 'relative',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        // 로드 전: visibility hidden (박스 안 보임, 레이아웃 공간 유지)
        // 로드 후: visible + 내부 opacity 트랜지션으로 부드럽게 등장
        visibility: loaded ? 'visible' : 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: frameW * finalCols,
          height: frameH * finalRows,
          backgroundImage: `url(${finalUrl})`,
          backgroundSize: `${frameW * finalCols}px ${frameH * finalRows}px`,
          backgroundRepeat: 'no-repeat',
          imageRendering: 'auto',
          WebkitFontSmoothing: 'antialiased',
          transform: `translate(-${col * frameW}px, -${row * frameH}px)`,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
