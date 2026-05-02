'use client';

/**
 * 📖 v104: ThinkFrame — book_worm 3프레임 재해석
 */

import { motion } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { ThinkFrameData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

const FRAME_BG: Record<string, string> = {
  self: 'from-amber-50 to-amber-100/60',
  other: 'from-blue-50 to-indigo-50/60',
  third: 'from-violet-50 to-purple-50/60',
};

export default function ThinkFrame({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as ThinkFrameData;

  const handle = (value: 'helpful' | 'reroll' | 'skip') => {
    if (disabled) return;
    onChoose(
      value === 'helpful'
        ? '📖 이 프레임 도움됐어'
        : value === 'reroll'
        ? '📖 다른 프레임도 보고 싶어'
        : '📖 다음에',
      {
        source: 'spirit_event',
        context: { spiritId: 'book_worm', eventType: 'SPIRIT_THINK_FRAME', choice: value },
      },
    );
  };

  return (
    <SpiritEventCard spiritId="book_worm" onSkip={() => handle('skip')} disabled={disabled}>
      <p className="text-sm font-serif text-amber-900 mb-3">{data.openerMsg}</p>

      <div className="space-y-2">
        {data.frames.map((f, i) => (
          <motion.div
            key={f.angle}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.18 }}
            className={`p-3 rounded-lg bg-gradient-to-br ${FRAME_BG[f.angle] ?? 'from-gray-50 to-gray-100'} border border-amber-200/40`}
          >
            <div className="text-xs font-bold text-amber-800 mb-1 font-serif">
              {f.icon} {f.label}
            </div>
            <div className="text-sm text-gray-800 leading-relaxed">{f.interpretation}</div>
          </motion.div>
        ))}
      </div>

      <p className="mt-3 text-xs italic text-amber-700">{data.noriQuiet}</p>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('helpful')}
          className="py-2 rounded-xl text-xs font-medium bg-amber-700 text-white shadow active:scale-[0.98] transition col-span-2"
        >
          🎯 이거 도움됐어
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('reroll')}
          className="py-2 rounded-xl text-xs font-medium border border-amber-300 text-amber-800 hover:bg-amber-50 transition"
        >
          🔄 다른 프레임
        </button>
      </div>
    </SpiritEventCard>
  );
}
