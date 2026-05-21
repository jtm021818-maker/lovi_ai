'use client';

/**
 * v117 — 입력창 바로 위 작은 핀 뱃지.
 * MindPolaroidPicker 에서 카드 픽 후 등장 — "지금 마음: ☁️ 구름 한 덩이".
 *
 * - X 클릭 시 무드 시드 해제 (onClear)
 * - 사용자가 입력 시작하면 위치 변경 X (자유도)
 */

import { motion, AnimatePresence } from 'framer-motion';
import type { MindPolaroidCard } from '@/lib/luna-life/mindPolaroidPool';

interface Props {
  card: MindPolaroidCard | null;
  onClear: () => void;
}

export default function MoodPinBadge({ card, onClear }: Props) {
  return (
    <AnimatePresence>
      {card && (
        <motion.div
          key={`mood-pin-${card.id}`}
          initial={{ opacity: 0, y: 12, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.85 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mx-4 mb-2 flex justify-start"
        >
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{
              background: `linear-gradient(135deg, ${card.gradient[0]} 0%, ${card.gradient[1]} 100%)`,
              border: '1px solid rgba(160, 120, 75, 0.28)',
              boxShadow: '0 2px 6px rgba(160, 120, 75, 0.16)',
            }}
          >
            <span className="text-[12px] leading-none">{card.emoji}</span>
            <span
              className="text-[11px] text-[#5D4037] font-bold whitespace-nowrap"
              style={{
                fontFamily:
                  'var(--font-handwrite), Gaegu, "Nanum Pen Script", cursive',
                letterSpacing: '-0.2px',
              }}
            >
              지금 마음 · {card.oneLine}
            </span>
            <button
              type="button"
              onClick={onClear}
              aria-label="마음 시드 해제"
              className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center bg-white/55 hover:bg-white/85 active:scale-90 transition-all"
            >
              <span className="text-[9px] text-[#5D4037]/75 leading-none">✕</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
