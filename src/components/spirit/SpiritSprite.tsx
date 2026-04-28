'use client';

import { useState, useEffect } from 'react';
import type { SpiritMaster } from '@/types/spirit.types';
import type { SpiritAnimState, SpiritSpriteSheet } from '@/types/spirit-sprite.types';
import { getSpiritSprite, getSpiritCharImg } from '@/data/spirit-sprites';
import { useSpriteAnimation } from '@/hooks/useSpriteAnimation';

// 모듈 레벨 로드 캐시 (LunaSprite 동일 패턴)
const LOADED: Record<string, boolean> = {};
const LOAD_PROMISES: Partial<Record<string, Promise<void>>> = {};

/** 브라우저 캐시 동기 체크 — preload hint 활용 시 초기 플래시 제거 */
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

function ensureLoaded(url: string): Promise<void> {
  if (LOADED[url]) return Promise.resolve();
  if (LOAD_PROMISES[url]) return LOAD_PROMISES[url];
  const p = new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => { LOADED[url] = true; resolve(); };
    img.onerror = () => { LOADED[url] = true; resolve(); };
    img.src = url;
  });
  LOAD_PROMISES[url] = p;
  return p;
}

interface Props {
  spirit: SpiritMaster;
  state?: SpiritAnimState;
  /** 왼쪽 바라보기 (걸을 때 사용) */
  facingLeft?: boolean;
  /** once 상태 종료 콜백 */
  onStateComplete?: () => void;
  /** 직접 size 강제 (도감 카드/슬롯에서 사용). 없으면 sheet.displayScale * frame 크기 */
  size?: number;
  /** 이모지 fallback 폰트 크기 */
  emojiSize?: number;
  /** 재생 on/off */
  playing?: boolean;
  className?: string;
}

export default function SpiritSprite({
  spirit,
  state = 'idle',
  facingLeft = false,
  onStateComplete,
  size,
  emojiSize,
  playing = true,
  className,
}: Props) {
  const sheet = getSpiritSprite(spirit.id);
  // lazy initializer: 브라우저 캐시 동기 체크로 초기 플래시 제거
  const [loaded, setLoaded] = useState(() => sheet ? isBrowserCached(sheet.src) : false);

  useEffect(() => {
    if (!sheet) return;
    if (LOADED[sheet.src]) { setLoaded(true); return; }
    let cancelled = false;
    ensureLoaded(sheet.src).then(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [sheet]);

  // 스프라이트 시트 없음 → charImg → 이모지 순서로 fallback
  if (!sheet) {
    const charImg = getSpiritCharImg(spirit.id);
    if (charImg) {
      return (
        <CharImgDisplay
          src={charImg}
          themeColor={spirit.themeColor}
          size={size ?? 48}
          className={className}
        />
      );
    }
    return (
      <EmojiFallback
        emoji={spirit.emoji}
        themeColor={spirit.themeColor}
        size={size}
        emojiSize={emojiSize}
        className={className}
      />
    );
  }

  // 시트 있지만 로딩 중 → 동일 크기 투명 placeholder
  // (이모지 → 스프라이트 교체 플래시/박스 방지)
  if (!loaded) {
    const scale = size ? size / sheet.frameWidth : (sheet.displayScale ?? 1);
    const displayW = sheet.frameWidth * scale;
    const displayH = sheet.frameHeight * scale;
    return (
      <div
        className={className}
        style={{ width: displayW, height: displayH, visibility: 'hidden' }}
      />
    );
  }

  return (
    <SpriteRenderer
      sheet={sheet}
      state={state}
      facingLeft={facingLeft}
      onStateComplete={onStateComplete}
      size={size}
      playing={playing}
      themeColor={spirit.themeColor}
      className={className}
    />
  );
}

// ─────────────────────────────────────────────────

function SpriteRenderer({
  sheet,
  state,
  facingLeft,
  onStateComplete,
  size,
  playing,
  themeColor,
  className,
}: {
  sheet: SpiritSpriteSheet;
  state: SpiritAnimState;
  facingLeft: boolean;
  onStateComplete?: () => void;
  size?: number;
  playing: boolean;
  themeColor: string;
  className?: string;
}) {
  const frame = useSpriteAnimation({ sheet, state, onComplete: onStateComplete, playing });

  const cfg = sheet.states[state];
  const scale = size ? size / sheet.frameWidth : sheet.displayScale ?? 1;
  const displayW = sheet.frameWidth * scale;
  const displayH = sheet.frameHeight * scale;

  const absFrame = cfg.startFrame + frame;
  const col = absFrame % sheet.totalCols;
  const row = Math.floor(absFrame / sheet.totalCols);

  const maxAbsFrame = Object.values(sheet.states).reduce(
    (max, s) => Math.max(max, s.startFrame + s.frames - 1),
    0,
  );
  const totalRows = Math.ceil((maxAbsFrame + 1) / sheet.totalCols);
  const sheetW = displayW * sheet.totalCols;
  const sheetH = displayH * totalRows;

  return (
    <div
      className={className}
      style={{
        width: displayW,
        height: displayH,
        transform: `translateZ(0)${facingLeft ? ' scaleX(-1)' : ''}`,
        filter: `drop-shadow(0 2px 6px ${themeColor}88)`,
        imageRendering: sheet.pixelated ? 'pixelated' : 'auto',
      }}
    >
      <div
        style={{
          width: displayW,
          height: displayH,
          overflow: 'hidden',
          position: 'relative',
          backfaceVisibility: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: sheetW,
            height: sheetH,
            backgroundImage: `url(${sheet.src})`,
            backgroundSize: `${sheetW}px ${sheetH}px`,
            backgroundRepeat: 'no-repeat',
            transform: `translate(-${col * displayW}px, -${row * displayH}px)`,
            pointerEvents: 'none',
            willChange: 'transform',
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────

function CharImgDisplay({
  src,
  themeColor,
  size,
  className,
}: {
  src: string;
  themeColor: string;
  size: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: `drop-shadow(0 2px 6px ${themeColor}88)`,
        flexShrink: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        draggable={false}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────

function EmojiFallback({
  emoji,
  themeColor,
  size,
  emojiSize,
  className,
}: {
  emoji: string;
  themeColor: string;
  size?: number;
  emojiSize?: number;
  className?: string;
}) {
  const px = size ?? 48;
  const fontSize = emojiSize ?? Math.floor(px * 0.75);
  return (
    <div
      className={className}
      style={{
        width: px,
        height: px,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        lineHeight: 1,
        filter: `drop-shadow(0 2px 6px ${themeColor}88)`,
      }}
    >
      {emoji}
    </div>
  );
}
