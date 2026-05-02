'use client';

/**
 * 🌸 v104: FallenPetals — cherry_leaf 떨어진 꽃잎 의식
 *
 * 이별 closure 의식. 단어 입력 → 글자가 꽃잎으로 분해되어 떨어짐.
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { FallenPetalsData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function FallenPetals({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as FallenPetalsData;
  const [body, setBody] = useState('');
  const [released, setReleased] = useState(false);

  // 글자별로 꽃잎 좌표 (의식 애니용)
  const chars = useMemo(() => body.split(''), [body]);

  const handle = (value: 'release' | 'more' | 'skip') => {
    if (disabled) return;
    if (value === 'release') {
      setReleased(true);
      setTimeout(() => {
        onChoose('🌸 흩어 보냈어', {
          source: 'spirit_event',
          context: {
            spiritId: 'cherry_leaf',
            eventType: 'SPIRIT_FALLEN_PETALS',
            choice: 'release',
            body, // 보관함 keepsake kind=release
          },
        });
      }, 3200);
      return;
    }
    onChoose(
      value === 'more' ? '🌸 더 쓰고 올게' : '🌸 다음에',
      {
        source: 'spirit_event',
        context: { spiritId: 'cherry_leaf', eventType: 'SPIRIT_FALLEN_PETALS', choice: value },
      },
    );
  };

  return (
    <SpiritEventCard spiritId="cherry_leaf" onSkip={() => handle('skip')} disabled={disabled}>
      <p className="text-sm font-serif italic text-pink-700 mb-3 whitespace-pre-line">{data.openerMsg}</p>

      <AnimatePresence mode="wait">
        {!released ? (
          <motion.div key="form" exit={{ opacity: 0 }} className="space-y-2">
            <p className="text-[11px] text-gray-500">예: {data.promptHint}</p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={120}
              disabled={disabled}
              placeholder="떠나보낼 단어 / 한 줄…"
              className="w-full px-3 py-2 text-sm border border-pink-200 rounded-lg bg-white/70 font-serif italic focus:outline-none focus:ring-2 focus:ring-pink-300 resize-y"
              style={{ fontFamily: 'var(--font-gaegu, serif)' }}
            />

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                disabled={disabled || body.length < 1}
                onClick={() => handle('release')}
                className="py-2 px-3 rounded-xl text-sm font-medium bg-pink-400 text-white shadow active:scale-[0.98] disabled:opacity-50 transition"
              >
                🌸 흩날리자
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => handle('more')}
                className="py-2 px-3 rounded-xl text-sm font-medium border border-pink-200 text-pink-700 hover:bg-pink-50 transition"
              >
                ✏️ 더 쓸래
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="release"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            className="relative min-h-[200px]"
          >
            {/* 글자 → 꽃잎 흩날리기 */}
            <div className="absolute inset-0 pointer-events-none">
              {chars.slice(0, 60).map((c, i) => (
                <motion.span
                  key={i}
                  className="absolute text-pink-400 text-base"
                  style={{ left: `${(i * 17) % 100}%`, top: `${20 + ((i * 13) % 30)}%` }}
                  initial={{ opacity: 1, y: 0, rotate: 0 }}
                  animate={{ opacity: [1, 0.7, 0], y: 200, rotate: 360 + i * 12 }}
                  transition={{ duration: 2.6 + (i % 5) * 0.2, ease: 'easeIn', delay: i * 0.02 }}
                >
                  {c.trim() ? '🌸' : ''}
                </motion.span>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.4, duration: 0.8 }}
              className="text-center pt-16 relative z-10"
            >
              <p className="text-sm font-serif italic text-pink-700 whitespace-pre-line">
                {data.closingPoetry}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SpiritEventCard>
  );
}
