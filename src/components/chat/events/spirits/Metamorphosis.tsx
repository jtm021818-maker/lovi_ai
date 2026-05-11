'use client';

/**
 * 🦋 v104.2: Metamorphosis — butterfly_meta 90일 변태 시퀀스 + 비교 거울
 *
 * 두 단계:
 *   1) cocoon (4초): 알 → 애벌레 → 번데기 → 나비 시퀀스 (각 1초)
 *   2) compare: 좌(90일 전) ↔ 우(오늘) 통계 + 나비가 가로지름 + 시적 메시지
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { MetamorphosisData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

type Stage = 0 | 1 | 2 | 3 | 4;   // 0:egg 1:larva 2:cocoon 3:butterfly 4:done

const STAGE_EMOJI = ['🥚', '🐛', '🛏', '🦋'];
const STAGE_LABEL = ['알', '애벌레', '번데기', '나비'];

export default function Metamorphosis({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as MetamorphosisData;
  const [stage, setStage] = useState<Stage>(0);
  const [showCompare, setShowCompare] = useState(false);

  // 4초 시퀀스
  useEffect(() => {
    if (stage >= 4) return;
    const t = setTimeout(() => {
      const next = (stage + 1) as Stage;
      if (next === 4) {
        setStage(4);
        setTimeout(() => setShowCompare(true), 500);
      } else {
        setStage(next);
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [stage]);

  const delta = data.delta?.emotionScore ?? 0;
  const direction = delta >= 0 ? '+' : '';

  const handle = (value: 'seen' | 'more' | 'skip') => {
    if (disabled) return;
    onChoose(
      value === 'seen'
        ? `🦋 보였어 (${direction}${delta.toFixed(1)} 변화)`
        : value === 'more'
        ? '🦋 더 보고 싶어'
        : '🦋 다음에',
      {
        source: 'spirit_event',
        context: {
          spiritId: 'butterfly_meta',
          eventType: 'SPIRIT_METAMORPHOSIS',
          choice: value,
          delta: data.delta,
        },
      },
    );
  };

  // ─── COCOON SEQUENCE (풀스크린 4초) ───
  if (!showCompare) {
    return (
      <AnimatePresence>
        <motion.div
          key="cocoon"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[115] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: 'radial-gradient(circle at 50% 50%, #4C1D95 0%, #1E1B4B 60%, #0F0E2A 100%)',
          }}
        >
          {/* 떠다니는 별 */}
          {Array.from({ length: 28 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute text-purple-200/60 select-none"
              style={{
                left: `${(i * 37) % 100}%`,
                top: `${(i * 23) % 100}%`,
                fontSize: 4 + (i % 4) * 4,
              }}
              animate={{ opacity: [0.2, 1, 0.2], scale: [1, 1.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: (i % 10) * 0.15 }}
            >
              ✦
            </motion.span>
          ))}

          {/* 진행 스테이지 도트 */}
          <div className="absolute top-12 flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full"
                animate={{
                  backgroundColor: i <= stage ? '#C4B5FD' : '#4C1D95',
                  scale: i === stage ? 1.6 : 1,
                }}
              />
            ))}
          </div>

          {/* 중앙 변태 이모지 */}
          <AnimatePresence mode="wait">
            <motion.div
              key={stage}
              initial={{ scale: 0, rotate: -90 }}
              animate={
                stage === 3
                  ? { scale: 1, rotate: 0, y: [0, -20, 0, -20, 0] }
                  : { scale: 1, rotate: 0 }
              }
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 14 }}
              className="text-[140px] mb-4 relative select-none"
              style={{
                filter: stage === 3
                  ? 'drop-shadow(0 0 40px rgba(196,181,253,0.9))'
                  : 'drop-shadow(0 0 20px rgba(167,139,250,0.5))',
              }}
            >
              {STAGE_EMOJI[stage]}
              {/* 나비 단계에서 빛 폭발 */}
              {stage === 3 && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 3.5, opacity: [0, 0.8, 0] }}
                  transition={{ duration: 1.2 }}
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle, rgba(196,181,253,0.7), transparent 60%)',
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* 스테이지 라벨 */}
          <AnimatePresence mode="wait">
            <motion.p
              key={`label-${stage}`}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              className="text-purple-200 font-bold text-2xl tracking-widest"
              style={{ textShadow: '0 0 16px rgba(196,181,253,0.7)' }}
            >
              {STAGE_LABEL[stage]}
            </motion.p>
          </AnimatePresence>

          <p className="absolute bottom-12 text-purple-300/60 text-xs italic">
            90일 전 ─ 오늘
          </p>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── COMPARE — 비교 거울 ───
  return (
    <SpiritEventCard spiritId="butterfly_meta" onSkip={() => handle('skip')} disabled={disabled}>
      <p className="text-sm font-bold text-purple-700 mb-1">{data.openerMsg}</p>
      <p className="text-xs text-purple-500 italic mb-3">변하지 않은 것 같아? 한 번 봐.</p>

      {/* 좌(전) ↔ 우(오늘) — 나비가 가로지름 */}
      <div className="relative grid grid-cols-2 gap-2 mb-3">
        {/* 90일 전 */}
        <motion.div
          initial={{ x: -16, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-gray-50 to-purple-50 border-2 border-purple-200 rounded-xl p-3"
        >
          <p className="text-xs font-bold text-purple-700 mb-1.5 flex items-center gap-1">
            <span className="text-base">🐛</span>{data.beforeLabel}
          </p>
          <p className="text-[10px] text-purple-500/80">평균 감정</p>
          <p className="text-xl font-mono font-bold text-purple-900 mb-1.5">
            {data.before.avgEmotionScore.toFixed(1)}
          </p>
          <p className="text-[10px] text-purple-500/80">자주 쓴 단어</p>
          <p className="text-xs text-purple-800 mb-1.5 leading-snug min-h-[2.5em]">
            {data.before.topWords.length > 0 ? data.before.topWords.join(', ') : '—'}
          </p>
          <p className="text-[10px] italic text-gray-500">{data.before.signature}</p>
        </motion.div>

        {/* 오늘 */}
        <motion.div
          initial={{ x: 16, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-400 rounded-xl p-3 shadow-md"
          style={{ boxShadow: '0 4px 20px rgba(167,139,250,0.3)' }}
        >
          <p className="text-xs font-bold text-pink-700 mb-1.5 flex items-center gap-1">
            <span className="text-base">🦋</span>{data.afterLabel}
          </p>
          <p className="text-[10px] text-pink-500/80">평균 감정</p>
          <p className="text-xl font-mono font-bold text-pink-900 mb-1.5">
            {data.after.avgEmotionScore.toFixed(1)}
          </p>
          <p className="text-[10px] text-pink-500/80">자주 쓴 단어</p>
          <p className="text-xs text-pink-800 mb-1.5 leading-snug min-h-[2.5em]">
            {data.after.topWords.length > 0 ? data.after.topWords.join(', ') : '—'}
          </p>
          <p className="text-[10px] italic text-pink-500">{data.after.signature}</p>
        </motion.div>

        {/* 나비가 좌 → 우 가로지름 */}
        <motion.span
          className="absolute top-1/2 -translate-y-1/2 text-3xl pointer-events-none select-none"
          style={{ filter: 'drop-shadow(0 0 12px rgba(196,181,253,0.7))' }}
          initial={{ left: '0%', opacity: 0, scale: 0.5 }}
          animate={{
            left: ['0%', '40%', '100%'],
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1.4, 1, 0.6],
            y: [0, -8, 0, -4, 0],
          }}
          transition={{ duration: 2.2, delay: 0.5, ease: 'easeInOut' }}
        >
          🦋
        </motion.span>
      </div>

      {/* delta */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.5, type: 'spring' }}
        className="flex items-center justify-center gap-2 mb-3"
      >
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            delta >= 0
              ? 'bg-pink-100 text-pink-700 border border-pink-300'
              : 'bg-purple-100 text-purple-700 border border-purple-300'
          }`}
        >
          감정 {direction}{delta.toFixed(1)}
        </span>
      </motion.div>

      {/* 시적 메시지 */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="bg-gradient-to-br from-purple-100 to-pink-100 border border-purple-200 rounded-xl p-3 mb-3"
      >
        <p className="text-sm font-serif italic text-purple-900 whitespace-pre-line leading-relaxed">
          {data.metaPoetic}
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('seen')}
          className="py-2.5 px-3 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow active:scale-[0.98] transition"
          style={{ boxShadow: '0 4px 16px rgba(167,139,250,0.4)' }}
        >
          🦋 보였어
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('more')}
          className="py-2.5 px-3 rounded-xl text-sm font-medium border border-purple-200 text-purple-700 hover:bg-purple-50 transition"
        >
          📜 더 보고 싶어
        </button>
      </div>
    </SpiritEventCard>
  );
}
