'use client';

/**
 * 🌙 v104: NightConfession — moon_rabbit 새벽 고백실
 *
 * 0~5시 KST 첫 턴, 1줄 익명 고백. 달에 띄우기 (보관) / 묻기 (즉시 삭제).
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { NightConfessionData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function NightConfession({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as NightConfessionData;
  const [body, setBody] = useState('');
  const [pickedPrompt, setPickedPrompt] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handle = (value: 'send_to_moon' | 'bury' | 'skip') => {
    if (disabled) return;
    if (value === 'send_to_moon') {
      setSent(true);
      setTimeout(() => {
        onChoose('🌙 달에 띄워 보냈어', {
          source: 'spirit_event',
          context: {
            spiritId: 'moon_rabbit',
            eventType: 'SPIRIT_NIGHT_CONFESSION',
            choice: 'send_to_moon',
            body, // 보관 (spirit_keepsakes kind=confession)
          },
        });
      }, 800);
      return;
    }
    onChoose(
      value === 'bury' ? '🌙 그냥 묻었어' : '🌙 다음에',
      {
        source: 'spirit_event',
        context: {
          spiritId: 'moon_rabbit',
          eventType: 'SPIRIT_NIGHT_CONFESSION',
          choice: value,
          // bury 는 DB 저장 X — body 는 메타로만 (지움)
        },
      },
    );
  };

  return (
    <SpiritEventCard
      spiritId="moon_rabbit"
      onSkip={() => handle('skip')}
      disabled={disabled}
      className="!bg-gradient-to-br !from-indigo-950 !to-purple-950 !border-indigo-700"
    >
      {/* 별 파티클 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        {[...Array(8)].map((_, i) => (
          <motion.span
            key={i}
            className="absolute text-yellow-100/60 text-[10px]"
            style={{ left: `${5 + i * 12}%`, top: `${(i * 17) % 80}%` }}
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 3 + i * 0.4, repeat: Infinity }}
          >
            ✦
          </motion.span>
        ))}
      </div>

      <div className="relative z-10">
        <p className="text-sm text-indigo-100 mb-3 font-serif italic">{data.openerMsg}</p>

        {sent ? (
          <div className="text-center py-6">
            <motion.div
              initial={{ y: 0, opacity: 1 }}
              animate={{ y: -40, opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="text-3xl"
            >
              🌙
            </motion.div>
            <p className="text-xs text-indigo-200 mt-3">달이 받았어</p>
          </div>
        ) : (
          <>
            <div className="space-y-1 mb-3">
              {data.prompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setPickedPrompt(p);
                    if (!body) setBody(p);
                  }}
                  className={[
                    'w-full text-left px-3 py-1.5 text-xs rounded',
                    pickedPrompt === p
                      ? 'bg-indigo-700/50 text-indigo-50 border border-indigo-300'
                      : 'text-indigo-200 hover:text-indigo-50 hover:bg-indigo-900/40',
                  ].join(' ')}
                >
                  {p}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={disabled}
              placeholder="진짜 마음 한 줄…"
              maxLength={120}
              className="w-full px-3 py-2 text-sm bg-indigo-900/40 border border-indigo-700 text-indigo-50 placeholder-indigo-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 font-serif italic"
              style={{ fontFamily: 'var(--font-gaegu, serif)' }}
            />
            <p className="text-[10px] text-indigo-300/70 mt-1.5">아무도 못 봐. 너만.</p>

            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                type="button"
                disabled={disabled || body.length < 1}
                onClick={() => handle('send_to_moon')}
                className="py-2 px-3 rounded-xl text-sm font-medium bg-indigo-300 text-indigo-950 shadow active:scale-[0.98] disabled:opacity-50 transition"
              >
                🌙 달에 띄울래
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => handle('bury')}
                className="py-2 px-3 rounded-xl text-sm font-medium border border-indigo-500 text-indigo-200 hover:bg-indigo-900/40 transition"
              >
                🔒 그냥 묻을래
              </button>
            </div>
          </>
        )}
      </div>
    </SpiritEventCard>
  );
}
