'use client';

/**
 * v85.4: SpiritSprite — 스프라이트 시트 기반 정령 렌더러
 *
 * 주어진 상태(idle/walk/etc)를 애니메이션으로 재생.
 * 이미지 로드 실패 시 이모지로 자동 fallback.
 */

import { useState } from 'react';
import type { SpiritMaster } from '@/types/spirit.types';
import type { SpiritAnimState, SpiritSpriteSheet } from '@/types/spirit-sprite.types';
import { getSpiritSprite } from '@/data/spirit-sprites';
import { useSpriteAnimation } from '@/hooks/useSpriteAnimation';

interface Props {
  spirit: SpiritMaster;
  state?: SpiritAnimState;
  /** 왼쪽 바라보기 (걸을 때 사용) */
  facingLeft?: boolean;
  /** once 상태 종료 콜백 */
  onStateComplete?: () => void;
  /** 직접 size 강제 (도감 카드/슬롯에서 사용). 없으면 sheet.displayScale * frame 크기 */
  size?: number;
  /** 이모지 fallback 폰트 크기 (size 생략 시 적용 안됨) */
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
  const [loadFailed, setLoadFailed] = useState(false);

  if (!sheet || loadFailed) {
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

  return (
    <SpriteRenderer
      sheet={sheet}
      state={state}
      facingLeft={facingLeft}
      onStateComplete={onStateComplete}
      size={size}
      playing={playing}
      onLoadError={() => setLoadFailed(true)}
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
  onLoadError,
  themeColor,
  className,
}: {
  sheet: SpiritSpriteSheet;
  state: SpiritAnimState;
  facingLeft: boolean;
  onStateComplete?: () => void;
  size?: number;
  playing: boolean;
  onLoadError: () => void;
  themeColor: string;
  className?: string;
}) {
  const frame = useSpriteAnimation({ sheet, state, onComplete: onStateComplete, playing });

  const cfg = sheet.states[state];
  const scale = size ? size / sheet.frameWidth : sheet.displayScale ?? 1;
  const displayW = sheet.frameWidth * scale;
  const displayH = sheet.frameHeight * scale;

  // startFrame + currentFrame → 절대 프레임 → (col, row) 계산
  const absFrame = cfg.startFrame + frame;
  const col = absFrame % sheet.totalCols;
  const row = Math.floor(absFrame / sheet.totalCols);
  const bgX = -col * displayW;
  const bgY = -row * displayH;
  // 시트 전체 픽셀 크기 — 모든 state의 마지막 프레임 기준으로 총 행 수 계산
  const maxAbsFrame = Object.values(sheet.states).reduce(
    (max, s) => Math.max(max, s.startFrame + s.frames - 1),
    0,
  );
  const sheetTotalRows = Math.ceil((maxAbsFrame + 1) / sheet.totalCols);
  const sheetW = sheet.frameWidth * sheet.totalCols * scale;
  const sheetH = sheet.frameHeight * sheetTotalRows * scale;

  return (
    <>
      {/* 이미지 프리로드 (로드 실패 감지용, 투명) */}
      <img
        src={sheet.src}
        alt=""
        aria-hidden
        onError={onLoadError}
        style={{ display: 'none' }}
      />
      <div
        className={className}
        style={{
          width: displayW,
          height: displayH,
          backgroundImage: `url(${sheet.src})`,
          backgroundPosition: `${bgX}px ${bgY}px`,
          backgroundSize: `${sheetW}px ${sheetH}px`,
          backgroundRepeat: 'no-repeat',
          transform: facingLeft ? 'scaleX(-1)' : undefined,
          imageRendering: sheet.pixelated ? 'pixelated' : 'auto',
          willChange: 'background-position',
          filter: `drop-shadow(0 2px 6px ${themeColor}88)`,
        }}
      />
    </>
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
