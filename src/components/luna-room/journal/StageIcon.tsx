'use client';

/**
 * v119.5 — 단계별 Phosphor SVG 아이콘 어댑터.
 *
 * 이모지(🌙🌌💫⭐✨) 대신 @phosphor-icons/react 의 thin weight SVG 사용.
 *  Lv.1 Sparkle   — 첫 빛
 *  Lv.2 StarFour  — 별 두 개가 이어진 사이
 *  Lv.3 MoonStars — 달밤
 *  Lv.4 ShootingStar — 별똥별이 흐르는 밤
 *  Lv.5 Planet    — 우리만의 우주
 *
 * 사용:
 *   <StageIcon level={3} size={32} />
 *   <StageIcon level={3} size={48} weight="duotone" colorOverride="#5B3F87" />
 */

import {
  Sparkle, StarFour, MoonStars, ShootingStar, Planet,
  type IconProps, type IconWeight,
} from '@phosphor-icons/react';
import { getStageColor } from '@/lib/luna-life/relationship-tokens';

interface Props {
  level: number;               // 1~5
  size?: number;               // px (default 24)
  weight?: IconWeight;         // thin / light / regular / bold / duotone (default thin)
  /** 컬러 직접 지정 — 미지정 시 단계 컬러(accent) */
  colorOverride?: string;
  /** 추가 클래스 */
  className?: string;
  /** 추가 스타일 */
  style?: IconProps['style'];
}

const ICONS = {
  1: Sparkle,
  2: StarFour,
  3: MoonStars,
  4: ShootingStar,
  5: Planet,
} as const;

export default function StageIcon({
  level, size = 24, weight = 'thin', colorOverride, className, style,
}: Props) {
  const lv = Math.min(Math.max(level, 1), 5) as 1 | 2 | 3 | 4 | 5;
  const Comp = ICONS[lv];
  const color = colorOverride ?? getStageColor(lv).accent;
  return (
    <Comp
      size={size}
      weight={weight}
      color={color}
      className={className}
      style={style}
    />
  );
}
