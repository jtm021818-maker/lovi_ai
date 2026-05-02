'use client';

/**
 * 🌹 v104: ButterflyDiary — rose_fairy 설렘 일지 3가지
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { ButterflyDiaryData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function ButterflyDiary({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as ButterflyDiaryData;
  const [items, setItems] = useState<[string, string, string]>(['', '', '']);

  const handle = (value: 'logged' | 'more' | 'skip') => {
    if (disabled) return;
    const filled = items.filter((s) => s.trim().length > 0);
    onChoose(
      value === 'logged'
        ? '🌹 적었어 — ' + filled.slice(0, 1).join('')
        : value === 'more'
        ? '🌹 더 떠올려볼래'
        : '🌹 다음에',
      {
        source: 'spirit_event',
        context: {
          spiritId: 'rose_fairy',
          eventType: 'SPIRIT_BUTTERFLY_DIARY',
          choice: value,
          items: filled,
          target: data.exampleHint,
        },
      },
    );
  };

  return (
    <SpiritEventCard spiritId="rose_fairy" onSkip={() => handle('skip')} disabled={disabled}>
      {/* 장미 꽃잎 파티클 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        {[...Array(4)].map((_, i) => (
          <motion.span
            key={i}
            className="absolute text-pink-300/40 text-sm"
            style={{ left: `${20 + i * 18}%`, top: '-10%' }}
            animate={{ y: '120%', rotate: 720, opacity: [0, 0.7, 0] }}
            transition={{ duration: 8 + i, repeat: Infinity, delay: i * 1.5 }}
          >
            🌸
          </motion.span>
        ))}
      </div>

      <p className="relative z-10 text-sm text-pink-700 mb-3">{data.openerMsg}</p>

      <p className="relative z-10 text-[11px] italic text-gray-500 mb-2">예시: {data.exampleHint}</p>
      <p className="relative z-10 text-[11px] text-pink-600 mb-3">💡 {data.guide}</p>

      <div className="relative z-10 space-y-2 mb-3">
        {[0, 1, 2].map((i) => (
          <input
            key={i}
            type="text"
            value={items[i]}
            onChange={(e) => {
              const next = [...items] as [string, string, string];
              next[i] = e.target.value;
              setItems(next);
            }}
            disabled={disabled}
            placeholder={`${i + 1}. 작은 설렘…`}
            maxLength={60}
            className="w-full px-3 py-1.5 text-sm border border-pink-200 rounded-lg bg-white/70 focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
        ))}
      </div>

      <p className="relative z-10 text-xs italic text-pink-700 mb-3">🌹 {data.closingLine}</p>

      <div className="relative z-10 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled || items.every((s) => !s.trim())}
          onClick={() => handle('logged')}
          className="py-2 px-3 rounded-xl text-sm font-medium bg-pink-500 text-white shadow active:scale-[0.98] disabled:opacity-50 transition"
        >
          🌹 적었어
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('more')}
          className="py-2 px-3 rounded-xl text-sm font-medium border border-pink-200 text-pink-700 hover:bg-pink-50 transition"
        >
          ✏️ 더 떠올릴래
        </button>
      </div>
    </SpiritEventCard>
  );
}
