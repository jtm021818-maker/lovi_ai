'use client';

/**
 * 💧 v104.2: CryTogether — tear_drop 풀스크린 60초 함께 울기 의식
 *
 * 깊은 슬픔의 순간, 풀스크린 청록 배경에서 60초간 같이 있어주는 의식.
 *   - 빗방울이 화면 가득 떨어짐
 *   - 중앙에서 ripple 파장이 호흡처럼 expanding/contracting
 *   - 60초 끝나면 햇살이 위에서 차오름
 *   - 강제 X — "그만하기" 언제든 가능
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

type Mode = 'invite' | 'silence' | 'sunrise';

export default function CryTogether({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as CryTogetherData;
  const total = data.durationSec ?? 60;
  const [mode, setMode] = useState<Mode>('invite');
  const [remaining, setRemaining] = useState(total);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (mode !== 'silence') return;
    intervalRef.current = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setMode('sunrise');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [mode]);

  const handleStart = () => setMode('silence');

  const handleFinish = (value: 'stay' | 'skip') => {
    if (disabled) return;
    onChoose(
      value === 'stay' ? '💧 옆에 있어줘서 고마워' : '💧 다음에',
      {
        source: 'spirit_event',
        context: {
          spiritId: 'tear_drop',
          eventType: 'SPIRIT_CRY_TOGETHER',
          choice: value,
          secElapsed: total - remaining,
        },
      },
    );
  };

  const mm = Math.floor(remaining / 60);
  const ss = (remaining % 60).toString().padStart(2, '0');

  // ─── INVITE — 카드 ───
  if (mode === 'invite') {
    return (
      <SpiritEventCard
        spiritId="tear_drop"
        showSkip={false}
        className="!bg-gradient-to-br !from-blue-50 !to-cyan-50 !border-blue-300"
      >
        <div className="relative">
          {/* 작은 빗방울 */}
          {[...Array(5)].map((_, i) => (
            <motion.span
              key={i}
              className="absolute text-blue-400/40 select-none pointer-events-none"
              style={{ left: `${10 + i * 18}%`, top: '-10%', fontSize: 14 }}
              animate={{ y: '150px', opacity: [0, 0.6, 0] }}
              transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: i * 0.5 }}
            >
              💧
            </motion.span>
          ))}

          <p className="text-sm font-serif italic text-blue-800 mb-2 relative">
            {data.silenceText}
          </p>
          <p className="text-[11px] text-blue-500 italic mb-4 relative">
            60초 동안 같이 있어줄게. 아무 말 안 해도 돼.
          </p>

          <div className="grid grid-cols-2 gap-2 relative">
            <button
              type="button"
              disabled={disabled}
              onClick={handleStart}
              className="py-2.5 px-3 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow active:scale-[0.98] transition"
            >
              💧 같이 있을게
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleFinish('skip')}
              className="py-2.5 px-3 rounded-xl text-sm font-medium border border-blue-200 text-blue-700 hover:bg-blue-50 transition"
            >
              ⏭️ 괜찮아
            </button>
          </div>
        </div>
      </SpiritEventCard>
    );
  }

  // ─── SILENCE — 풀스크린 60초 ───
  if (mode === 'silence') {
    return (
      <AnimatePresence>
        <motion.div
          key="silence"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[115] overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #0C1E3F 0%, #1E3A8A 40%, #1E40AF 70%, #0C4A6E 100%)',
          }}
        >
          {/* 풀스크린 빗방울 */}
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute text-blue-200/60 select-none pointer-events-none"
              style={{
                left: `${(i * 37) % 100}%`,
                top: '-5%',
                fontSize: 10 + (i % 4) * 4,
              }}
              animate={{ y: '110vh', opacity: [0, 0.8, 0] }}
              transition={{
                duration: 2.5 + (i % 4) * 0.7,
                delay: (i % 10) * 0.2,
                repeat: Infinity,
                ease: 'easeIn',
              }}
            >
              💧
            </motion.span>
          ))}

          {/* 중앙 ripple 파장 (호흡처럼) */}
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={`ripple-${i}`}
              className="absolute top-1/2 left-1/2 rounded-full border-2 border-blue-200/40 pointer-events-none"
              style={{ width: 80, height: 80, x: '-50%', y: '-50%' }}
              animate={{
                scale: [0, 5],
                opacity: [0.7, 0],
              }}
              transition={{
                duration: 4,
                delay: i * 1,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            />
          ))}

          {/* 중앙 텍스트 */}
          <div className="relative z-10 h-full flex flex-col items-center justify-center px-8">
            {/* 큰 물방울 */}
            <motion.div
              animate={{
                y: [0, -8, 0],
                scale: [1, 1.1, 1],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="text-[100px] mb-6 select-none"
              style={{ filter: 'drop-shadow(0 0 40px rgba(165,243,252,0.6))' }}
            >
              💧
            </motion.div>

            <motion.p
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="text-blue-100 font-serif italic text-xl text-center tracking-wider mb-8"
              style={{ textShadow: '0 0 20px rgba(165,243,252,0.5)' }}
            >
              {data.silenceText}
            </motion.p>

            {/* 카운트 */}
            <p className="text-blue-200/70 font-mono text-3xl tabular-nums mb-1">
              {mm}:{ss}
            </p>
            <p className="text-blue-300/50 text-[11px] tracking-widest">
              SILENCE TOGETHER
            </p>

            <p className="absolute bottom-12 text-blue-300/40 text-xs italic">
              아무 말 안 해도 돼. 그냥 같이.
            </p>
          </div>

          {/* "그만하기" — 항상 활성 */}
          <button
            type="button"
            onClick={() => handleFinish('skip')}
            className="absolute top-6 right-6 text-blue-300/60 text-xs underline hover:text-blue-200 transition"
          >
            그만하기 ↩
          </button>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── SUNRISE — 햇살 차오름 ───
  return (
    <AnimatePresence>
      <motion.div
        key="sunrise"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[115] overflow-hidden flex flex-col items-center justify-center"
        style={{ background: 'linear-gradient(180deg, #FFF7ED 0%, #FED7AA 50%, #FBA74D 100%)' }}
      >
        {/* 햇살 광선 */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.6 }}
          className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            width: '80vw',
            height: '80vh',
            background: 'radial-gradient(ellipse at top, rgba(255,233,138,0.6), transparent 60%)',
          }}
        />

        {/* 작은 빛 입자 */}
        {Array.from({ length: 16 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute text-amber-300/80 select-none pointer-events-none"
            style={{
              left: `${(i * 37) % 100}%`,
              top: '-5%',
              fontSize: 8 + (i % 3) * 4,
            }}
            animate={{
              y: '110vh',
              opacity: [0, 1, 0],
              rotate: 360,
            }}
            transition={{ duration: 6 + (i % 4), delay: (i % 8) * 0.3, repeat: Infinity }}
          >
            ✦
          </motion.span>
        ))}

        {/* 햇살 */}
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 140, delay: 0.4 }}
          className="text-[100px] mb-4 select-none"
          style={{ filter: 'drop-shadow(0 0 30px rgba(255,200,80,0.7))' }}
        >
          ☀️
        </motion.div>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-amber-900 font-bold text-2xl mb-2 text-center px-6"
        >
          {data.afterText}
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-amber-700 text-sm italic mb-8"
        >
          60초 같이 있었어
        </motion.p>

        <motion.button
          type="button"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.6 }}
          onClick={() => handleFinish('stay')}
          className="px-8 py-3 rounded-full bg-gradient-to-r from-orange-400 to-amber-400 text-white font-bold text-base shadow-2xl active:scale-95"
          style={{ boxShadow: '0 8px 30px rgba(251,167,77,0.5)' }}
        >
          💧 옆에 있어줘서 고마워
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}
