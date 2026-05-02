'use client';

/**
 * 👑 v104: CrownReclaim — queen_elena 가치 3가지 봉인 해제
 *
 * 자기비하 + EMPOWER 시. 3슬롯 입력 → 황금 의식 애니 + 영구 보관.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { CrownReclaimData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function CrownReclaim({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as CrownReclaimData;
  const [vals, setVals] = useState<[string, string, string]>(['', '', '']);
  const [unsealed, setUnsealed] = useState(false);

  const handle = (value: 'unseal' | 'cant_recall' | 'skip') => {
    if (disabled) return;
    if (value === 'unseal') {
      setUnsealed(true);
      setTimeout(() => {
        const filled = vals.filter((v) => v.trim().length > 0);
        onChoose(
          filled.length > 0
            ? `👑 봉인 해제: ${filled.join(', ')}`
            : '👑 왕관 다시 받았어',
          {
            source: 'spirit_event',
            context: {
              spiritId: 'queen_elena',
              eventType: 'SPIRIT_CROWN_RECLAIM',
              choice: 'unseal',
              values: filled,
            },
          },
        );
      }, 3500);
      return;
    }
    onChoose(
      value === 'cant_recall' ? '👑 못 떠올랐어. 천천히' : '👑 다음에',
      {
        source: 'spirit_event',
        context: { spiritId: 'queen_elena', eventType: 'SPIRIT_CROWN_RECLAIM', choice: value },
      },
    );
  };

  return (
    <SpiritEventCard
      spiritId="queen_elena"
      onSkip={() => handle('skip')}
      disabled={disabled}
      headerBadge="UR ✨"
    >
      <p className="text-sm text-pink-700 italic mb-3 font-serif">{data.openerMsg}</p>

      <AnimatePresence mode="wait">
        {!unsealed ? (
          <motion.div key="form" exit={{ opacity: 0 }}>
            <p className="text-[11px] font-semibold text-pink-700 mb-2">💎 호명할 너의 가치 3가지</p>

            <div className="space-y-2.5 mb-4">
              {data.slots.map((s, i) => (
                <div key={i} className="bg-gradient-to-r from-pink-50 to-amber-50 border-2 border-amber-300/60 rounded-lg p-2.5">
                  <p className="text-xs font-semibold text-amber-800 mb-1">
                    {i + 1}. {s.label}
                  </p>
                  <p className="text-[11px] italic text-gray-500 mb-1.5">{s.hint}</p>
                  <input
                    type="text"
                    value={vals[i]}
                    onChange={(e) => {
                      const next = [...vals] as [string, string, string];
                      next[i] = e.target.value;
                      setVals(next);
                    }}
                    disabled={disabled}
                    maxLength={40}
                    placeholder="..."
                    className="w-full px-3 py-1.5 text-sm border border-amber-200 rounded bg-white/70 focus:outline-none focus:ring-2 focus:ring-amber-400 font-serif"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => handle('unseal')}
                className="py-2.5 px-3 rounded-xl text-sm font-bold bg-gradient-to-r from-pink-500 to-amber-400 text-white shadow-lg active:scale-[0.98] transition"
              >
                👑 봉인 해제
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => handle('cant_recall')}
                className="py-2.5 px-3 rounded-xl text-sm font-medium border border-pink-200 text-pink-700 hover:bg-pink-50 transition"
              >
                ✏️ 못 떠올라
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="unseal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative min-h-[220px] flex flex-col items-center justify-center gap-3 py-6"
          >
            {/* 황금 빛 폭발 */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 1] }}
              transition={{ duration: 1.2 }}
              className="absolute inset-0 bg-gradient-radial from-amber-300/40 via-transparent to-transparent"
            />
            <motion.span
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, type: 'spring' }}
              className="text-6xl relative z-10"
            >
              👑
            </motion.span>
            <div className="relative z-10 flex gap-2 flex-wrap justify-center">
              {vals.filter((v) => v.trim()).map((v, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 + i * 0.4 }}
                  className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-300 to-pink-300 text-white text-xs font-bold shadow"
                >
                  {v}
                </motion.span>
              ))}
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5 }}
              className="relative z-10 text-sm font-serif italic text-pink-800 text-center px-3"
            >
              {data.closingDecree}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </SpiritEventCard>
  );
}
