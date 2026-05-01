'use client';

/**
 * v102: 정령 비밀 진척 칩 — 디오라마 상단 DayBadge 옆.
 * 0~7=하얀, 8~14=금색, 15~21=보랏빛.
 */

import { motion } from 'framer-motion';

interface Props {
  unlocked: number;
  total?: number;
}

export default function RevealProgressChip({ unlocked, total = 21 }: Props) {
  const pct = Math.min(1, unlocked / total);
  const tone =
    unlocked >= 15 ? { bg: '#A78BFA22', border: '#A78BFA', dot: '#7C3AED', label: 'text-violet-700' }
    : unlocked >= 8 ? { bg: '#FBBF2422', border: '#F59E0B', dot: '#B45309', label: 'text-amber-700' }
    : { bg: '#ffffffd9', border: '#e5e7eb', dot: '#9CA3AF', label: 'text-stone-500' };

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur"
      style={{ background: tone.bg, border: `1px solid ${tone.border}`, color: tone.dot }}
      aria-label={`정령 비밀 ${unlocked}/${total} 풀림`}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: tone.dot }} />
      <span className={tone.label}>비밀 {unlocked}/{total}</span>
      <span className="w-10 h-1 rounded-full bg-black/10 overflow-hidden">
        <motion.span
          animate={{ width: `${pct * 100}%` }}
          className="block h-full rounded-full"
          style={{ background: tone.dot }}
        />
      </span>
    </motion.div>
  );
}
