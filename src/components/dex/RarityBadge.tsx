'use client';

/**
 * 🏅 v85.3: RarityBadge — 레어도 리본/배지
 *
 * 포켓덱스 스타일 레어도 표기. N~L 별 색상/광택 프리셋.
 * size='sm' 칩 / size='md' 리본 / size='lg' 대형 배너.
 */

import type { SpiritRarity } from '@/types/spirit.types';

export const RARITY_META: Record<SpiritRarity, {
  label: string;
  name: string;
  colorFrom: string;
  colorTo: string;
  textColor: string;
  glow: string;
  border: string;
}> = {
  N: {
    label: 'N',
    name: 'Normal',
    colorFrom: '#d1d5db',
    colorTo: '#6b7280',
    textColor: '#1f2937',
    glow: 'rgba(107,114,128,0.35)',
    border: 'rgba(107,114,128,0.5)',
  },
  R: {
    label: 'R',
    name: 'Rare',
    colorFrom: '#93c5fd',
    colorTo: '#2563eb',
    textColor: '#eff6ff',
    glow: 'rgba(37,99,235,0.55)',
    border: 'rgba(37,99,235,0.7)',
  },
  SR: {
    label: 'SR',
    name: 'Super Rare',
    colorFrom: '#d8b4fe',
    colorTo: '#7c3aed',
    textColor: '#f5f3ff',
    glow: 'rgba(124,58,237,0.6)',
    border: 'rgba(124,58,237,0.8)',
  },
  UR: {
    label: 'UR',
    name: 'Ultra Rare',
    colorFrom: '#fde68a',
    colorTo: '#d97706',
    textColor: '#78350f',
    glow: 'rgba(217,119,6,0.65)',
    border: 'rgba(217,119,6,0.85)',
  },
  L: {
    label: 'L',
    name: 'Legendary',
    colorFrom: '#67e8f9',
    colorTo: '#db2777',
    textColor: '#ffffff',
    glow: 'rgba(219,39,119,0.7)',
    border: 'rgba(219,39,119,0.9)',
  },
};

interface Props {
  rarity: SpiritRarity;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showName?: boolean;
}

export default function RarityBadge({ rarity, size = 'sm', showName = false }: Props) {
  const meta = RARITY_META[rarity];
  const sizeClass = {
    xs: 'text-[8px] px-1 py-[1px]',
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-[12px] px-2 py-1',
    lg: 'text-[14px] px-3 py-1.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-black tracking-wider ${sizeClass}`}
      style={{
        background: `linear-gradient(135deg, ${meta.colorFrom} 0%, ${meta.colorTo} 100%)`,
        color: meta.textColor,
        boxShadow: `0 0 0 1px ${meta.border}, 0 2px 6px ${meta.glow}, inset 0 1px 0 rgba(255,255,255,0.5)`,
        // L 레어 홀로그래픽 이동 (L 일 때만)
        backgroundSize: rarity === 'L' ? '200% 200%' : undefined,
        animation: rarity === 'L' ? 'rarity-hologram 3.5s linear infinite' : undefined,
      }}
    >
      <span>{meta.label}</span>
      {showName && <span className="font-bold opacity-85">{meta.name}</span>}

      {rarity === 'L' && (
        <style jsx>{`
          @keyframes rarity-hologram {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>
      )}
    </span>
  );
}
