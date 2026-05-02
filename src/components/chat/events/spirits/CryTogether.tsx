'use client';

/**
 * 💧 v104: CryTogether — tear_drop 침묵 1분 모드
 *
 * 깊은 슬픔 순간에 1분간 침묵으로 같이 있어주는 카드.
 * 입력창 잠금 X (강제 아님). 1분 카운트다운 + 빗방울 애니.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { CryTogetherData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function CryTogether({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as CryTogetherData;
  const [remaining, setRemaining] = useState(data.durationSec ?? 60);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setDone(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const choose = (value: 'stay' | 'skip') => {
    if (disabled) return;
    onChoose(
      value === 'stay' ? '💧 옆에 있어줘서 고마워' : '💧 잠깐 다음에',
      {
        source: 'spirit_event',
        context: { spiritId: 'tear_drop', eventType: 'SPIRIT_CRY_TOGETHER', choice: value },
      },
    );
  };

  return (
    <SpiritEventCard
      spiritId="tear_drop"
      showSkip={false}
      className="overflow-hidden"
    >
      <div className="relative min-h-[180px] py-6 flex flex-col items-center justify-center gap-4">
        {/* 빗방울 파티클 */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {[...Array(7)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-blue-400/50 text-base"
              initial={{ y: -20, x: `${10 + i * 12}%`, opacity: 0 }}
              animate={{ y: '110%', opacity: [0, 0.7, 0] }}
              transition={{
                duration: 2 + (i % 3),
                repeat: Infinity,
                delay: i * 0.4,
                ease: 'easeIn',
              }}
            >
              💧
            </motion.div>
          ))}
        </div>

        {/* 텍스트 */}
        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div
              key="silence"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="relative z-10 text-center"
            >
              <p className="text-lg text-blue-900/80 font-serif tracking-wider">
                {data.silenceText}
              </p>
              <p className="mt-3 text-xs text-gray-500 tabular-nums">
                {Math.floor(remaining / 60)}:{(remaining % 60).toString().padStart(2, '0')} / 1:00
              </p>
            </motion.div>
          ) : (
            <motion.p
              key="after"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="relative z-10 text-base text-blue-900 font-medium text-center"
            >
              {data.afterText}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* 옵션 — 1분 후 활성. 단 skip 은 항상 활성 */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <button
          type="button"
          disabled={disabled || !done}
          onClick={() => choose('stay')}
          className="py-2 px-3 rounded-xl text-sm font-medium bg-blue-500 text-white shadow disabled:opacity-50 active:scale-[0.98] transition"
        >
          🥺 같이 있을게
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => choose('skip')}
          className="py-2 px-3 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition"
        >
          ⏭️ 괜찮아 다음에
        </button>
      </div>
    </SpiritEventCard>
  );
}
