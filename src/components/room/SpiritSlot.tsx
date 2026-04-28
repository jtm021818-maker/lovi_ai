'use client';

/**
 * 🌟 v85.2: SpiritSlot — 서랍 내 개별 정령 칸 (벨벳 바닥 + 호버 리프트)
 *
 * 서랍 안에 진열된 피규어 느낌.
 * 호버 시 위로 살짝 떠오르면서 테마 컬러 glow.
 */

import { motion } from 'framer-motion';
import type { SpiritMaster } from '@/types/spirit.types';
import SpiritSprite from '@/components/spirit/SpiritSprite';

interface Props {
  /** v85.4: 전체 정령 객체 전달 (스프라이트 지원용). 없으면 emoji만 사용 */
  spirit?: SpiritMaster;
  emoji: string;
  themeColor: string;
  bondLv: number;
  name?: string;
  onSelect: () => void;
  delayIndex?: number;
}

export default function SpiritSlot({ spirit, emoji, themeColor, bondLv, name, onSelect, delayIndex = 0 }: Props) {
  return (
    <motion.button
      onClick={onSelect}
      initial={{ opacity: 0, y: -14, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: 0.15 + delayIndex * 0.04,
        type: 'spring',
        stiffness: 280,
        damping: 22,
      }}
      whileHover={{
        y: -6,
        scale: 1.08,
        transition: { type: 'spring', stiffness: 350, damping: 18 },
      }}
      whileTap={{ scale: 0.92 }}
      className="relative aspect-square rounded-xl flex flex-col items-center justify-center select-none"
      style={{
        // 벨벳 내부 느낌 — 어두운 자주/버건디 + 섬세한 라이닝
        background: 'radial-gradient(ellipse at center, #5a2838 0%, #3a1a28 80%)',
        boxShadow: [
          'inset 0 2px 4px rgba(0,0,0,0.4)',                   // 내부 오목 느낌
          'inset 0 -1px 0 rgba(255,200,180,0.1)',              // 바닥 살짝 반사
          `0 0 0 1px rgba(218,165,32,0.35)`,                    // 황동 라이너
          `0 3px 0 rgba(0,0,0,0.3)`,                            // 칸 구분선
        ].join(', '),
      }}
      aria-label={name ?? '정령'}
      title={name}
    >
      {/* 테마 컬러 오라 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-200 hover:opacity-100"
        style={{
          background: `radial-gradient(circle at 50% 40%, ${themeColor}55 0%, transparent 70%)`,
        }}
      />
      {/* 정령 — 스프라이트/이미지/이모지 자동 선택 */}
      {spirit ? (
        <span
          className="relative"
          style={{ filter: `drop-shadow(0 2px 6px ${themeColor}cc)` }}
        >
          <SpiritSprite spirit={spirit} state="idle" size={26} />
        </span>
      ) : (
        <span
          className="relative text-[22px] leading-none transition-transform"
          style={{ filter: `drop-shadow(0 2px 6px ${themeColor}cc)` }}
        >
          {emoji}
        </span>
      )}
      {/* Lv 배지 */}
      <span
        className="relative mt-0.5 px-1 rounded-sm text-[7px] font-bold"
        style={{
          color: '#fff5d6',
          background: 'linear-gradient(180deg, #a08824 0%, #6b5a18 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,235,180,0.4)',
          letterSpacing: '0.05em',
        }}
      >
        Lv.{bondLv}
      </span>
    </motion.button>
  );
}
