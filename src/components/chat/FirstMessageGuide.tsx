'use client';

/**
 * 🆕 v112: 첫 메시지 가이드 카드
 *
 * 컨셉: "한 줄만 적어봐. 거기서부터 시작하자" + chip 4개 (mini card)
 * - mood × Day stage 별 chip 풀 (whispers.ts)
 * - 친밀도별 카피 톤 변화
 * - 클릭 → ChatInput 으로 빨려들어가는 anim + 햅틱 + pop sound
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import type { LunaMood } from '@/lib/luna-life/mood';
import { pickChipPool, type ChipItem } from '@/lib/luna-life/whispers';
import { triggerHaptic } from '@/lib/haptic';
import { playSound } from '@/lib/audio';

interface Props {
  mood: LunaMood;
  ageDays: number;
  intimacyLevel?: number;     // 0~5
  onChipSelect: (text: string, chipMeta: ChipItem) => void;
  visible: boolean;           // 영상 끝난 후만 true
}

// ─── 친밀도 + ageDays 기반 헤드 카피 ─────────────────────────────────
function pickHeadCopy(intimacy: number, ageDays: number): { line1: string; line2: string } {
  // 100일 마지막 톤
  if (ageDays >= 100) {
    return { line1: '오늘 마지막으로', line2: '한 마디만 들려줄래' };
  }

  if (intimacy >= 4) {
    return { line1: '뭐 얘기할까', line2: '한 마디면 충분해 ㅎ' };
  }
  if (intimacy >= 2) {
    return { line1: '왔어, 오늘은', line2: '뭐부터 얘기할까' };
  }
  // 처음/가벼움
  return { line1: '한 줄만 적어봐.', line2: '거기서부터 시작하자' };
}

// ─── chip 의 mini card ──────────────────────────────────────────────
function ChipMiniCard({
  chip,
  index,
  onClick,
  disabled,
}: {
  chip: ChipItem;
  index: number;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.08 * index, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.018, y: -2 }}
      whileTap={{ scale: 0.96 }}
      className="relative w-full text-left px-3.5 py-2.5 rounded-[16px] disabled:opacity-50"
      style={{
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(255,240,250,0.78) 100%)',
        border: '1px solid rgba(255,182,210,0.55)',
        boxShadow:
          '0 3px 12px rgba(192,132,252,0.14), 0 1px 3px rgba(255,180,210,0.16)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-[20px] leading-none flex-shrink-0">{chip.emoji}</span>
        <div className="flex-1 min-w-0">
          <p
            className="text-[13.5px] font-bold text-[#5D4037] leading-snug"
            style={{ letterSpacing: '-0.2px' }}
          >
            {chip.text}
          </p>
          <p className="text-[10px] text-[#a0784b] mt-0.5">{chip.category}</p>
        </div>
        <motion.span
          animate={{ x: [0, 3, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.4 }}
          className="text-[#c084fc] text-[11px] flex-shrink-0"
        >
          →
        </motion.span>
      </div>
    </motion.button>
  );
}

export default function FirstMessageGuide({
  mood,
  ageDays,
  intimacyLevel = 0,
  onChipSelect,
  visible,
}: Props) {
  const [usedChip, setUsedChip] = useState<ChipItem | null>(null);

  const chips = pickChipPool({ mood, ageDays });
  const head = pickHeadCopy(intimacyLevel, ageDays);

  function handleChip(chip: ChipItem) {
    setUsedChip(chip);
    triggerHaptic('light');
    playSound('pop');
    onChipSelect(chip.text, chip);
  }

  return (
    <AnimatePresence>
      {visible && !usedChip && (
        <motion.div
          key="guide"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mx-3 mb-3"
        >
          <div
            className="relative rounded-[22px] overflow-hidden"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,252,250,0.96) 0%, rgba(254,247,252,0.94) 100%)',
              border: '1px solid rgba(255,200,225,0.45)',
              boxShadow: '0 8px 28px rgba(192,132,252,0.16)',
            }}
          >
            {/* 마스킹 테이프 — 좌상 */}
            <div
              className="absolute -top-2 left-5 w-12 h-4 z-10 rotate-[-6deg] shadow-sm"
              style={{
                background:
                  'repeating-linear-gradient(45deg, rgba(244,114,182,0.45) 0 4px, rgba(192,132,252,0.35) 4px 8px)',
                borderRadius: 2,
              }}
            />

            {/* 헤드 카피 */}
            <div className="px-5 pt-5 pb-2 flex items-start gap-2">
              <motion.span
                animate={{
                  opacity: [0.5, 1, 0.5],
                  scale: [1, 1.18, 1],
                  rotate: [0, 10, 0],
                }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                className="text-[18px] text-[#e8a43e] flex-shrink-0 mt-1"
              >
                ✦
              </motion.span>
              <div className="flex-1">
                <p
                  className="text-[19px] leading-[1.4] text-[#5D4037]"
                  style={{
                    fontFamily:
                      'var(--font-gaegu), Gaegu, "Nanum Pen Script", cursive',
                    fontWeight: 700,
                    letterSpacing: '-0.3px',
                  }}
                >
                  {head.line1}
                </p>
                <p
                  className="text-[19px] leading-[1.4] text-[#5D4037] mt-0.5"
                  style={{
                    fontFamily:
                      'var(--font-gaegu), Gaegu, "Nanum Pen Script", cursive',
                    fontWeight: 700,
                    letterSpacing: '-0.3px',
                  }}
                >
                  {head.line2}
                </p>
              </div>
            </div>

            {/* 안내 부제 */}
            <div className="px-5 pt-1 pb-2 flex justify-end">
              <span
                className="text-[11px] text-[#a0784b]/85 italic"
                style={{
                  fontFamily:
                    'var(--font-gaegu), Gaegu, "Nanum Pen Script", cursive',
                }}
              >
                — 루나 🦊
              </span>
            </div>

            {/* chip 4개 */}
            <div className="px-3.5 pb-4 pt-1 flex flex-col gap-2">
              {chips.map((chip, i) => (
                <ChipMiniCard
                  key={`${chip.text}-${i}`}
                  chip={chip}
                  index={i}
                  onClick={() => handleChip(chip)}
                />
              ))}
            </div>

            {/* 하단 hint */}
            <div className="px-5 pb-3 -mt-1 text-center">
              <span className="text-[10.5px] text-[#a0784b]/70">
                또는 직접 적어도 돼 ✏️
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
