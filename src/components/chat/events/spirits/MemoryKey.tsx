'use client';

/**
 * 🗝️ v104: MemoryKey — book_keeper 반복 패턴 키워드 카드
 */

import { motion } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { MemoryKeyData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function MemoryKey({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as MemoryKeyData;

  const handle = (value: 'noticed' | 'more' | 'skip') => {
    if (disabled) return;
    const top = data.topNgrams[0]?.text;
    onChoose(
      value === 'noticed'
        ? `🗝️ 알아챘어 — '${top ?? '내 패턴'}' 자주 쓰네`
        : value === 'more'
        ? '🗝️ 다른 패턴도 보여줘'
        : '🗝️ 다음에',
      {
        source: 'spirit_event',
        context: {
          spiritId: 'book_keeper',
          eventType: 'SPIRIT_MEMORY_KEY',
          choice: value,
          topNgram: top,
          sequencePattern: data.sequencePattern,
        },
      },
    );
  };

  return (
    <SpiritEventCard spiritId="book_keeper" onSkip={() => handle('skip')} disabled={disabled}>
      <p className="text-sm text-amber-900 mb-3">🗝️ <span className="italic">{data.openerMsg}</span></p>

      <p className="text-[11px] text-gray-500 mb-2">
        📜 너의 {data.sessionsAnalyzed}번의 세션에서 반복된 것:
      </p>

      <div className="space-y-1.5 mb-3">
        {data.topNgrams.length === 0 && (
          <div className="text-xs text-gray-500 italic">— 다양한 표현을 쓰고 있어. 그것도 패턴이야.</div>
        )}
        {data.topNgrams.map((n, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center justify-between bg-amber-50/60 border border-amber-200/60 rounded px-3 py-1.5"
          >
            <span className="text-sm text-amber-900 font-serif">🔁 "{n.text}"</span>
            {n.count > 0 && <span className="text-xs text-gray-500 tabular-nums">×{n.count}</span>}
          </motion.div>
        ))}
      </div>

      {data.sequencePattern && (
        <div className="bg-amber-100 border border-amber-300 rounded-lg p-2.5 mb-3">
          <p className="text-[10px] text-amber-700 mb-1">🎯 가장 강한 패턴</p>
          <p className="text-sm font-semibold text-amber-900">{data.sequencePattern.pattern}</p>
          <p className="text-[11px] text-gray-600">{data.sequencePattern.occurrence}</p>
        </div>
      )}

      <p className="text-sm text-amber-900 italic mb-3">💭 {data.cliQuiet}</p>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('noticed')}
          className="py-2 px-3 rounded-xl text-sm font-medium bg-amber-700 text-white shadow active:scale-[0.98] transition"
        >
          🗝️ 알아챘어
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('more')}
          className="py-2 px-3 rounded-xl text-sm font-medium border border-amber-300 text-amber-800 hover:bg-amber-50 transition"
        >
          📚 다른 패턴도
        </button>
      </div>
    </SpiritEventCard>
  );
}
