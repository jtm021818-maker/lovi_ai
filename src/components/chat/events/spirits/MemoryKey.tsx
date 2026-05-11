'use client';

/**
 * 🗝️ v104.2: MemoryKey — book_keeper 자물쇠 의식 + 양피지 단어 새김
 *
 * 흐름:
 *   1) locked — 큰 자물쇠가 화면 중앙. "열어볼까" 버튼.
 *   2) unlocking — 황금 열쇠가 자물쇠로 다가가 풀어줌 (1.6s)
 *   3) revealed — 양피지가 펼쳐지며 패턴 단어들이 순차로 잉크 새김
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { MemoryKeyData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

type Mode = 'locked' | 'unlocking' | 'revealed';

export default function MemoryKey({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as MemoryKeyData;
  const [mode, setMode] = useState<Mode>('locked');

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

  const unlock = () => {
    setMode('unlocking');
    setTimeout(() => setMode('revealed'), 1800);
  };

  // ─── LOCKED ───
  if (mode === 'locked') {
    return (
      <SpiritEventCard
        spiritId="book_keeper"
        onSkip={() => handle('skip')}
        disabled={disabled}
        className="!bg-gradient-to-br !from-amber-50 !to-yellow-100 !border-amber-400"
      >
        <p className="text-sm text-amber-900 mb-3 italic font-serif">{data.openerMsg}</p>

        <div className="relative flex flex-col items-center justify-center min-h-[180px] py-4">
          {/* 자물쇠 */}
          <motion.div
            animate={{
              y: [0, -6, 0],
              rotate: [0, -2, 2, 0],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="text-[100px] select-none"
            style={{ filter: 'drop-shadow(0 8px 20px rgba(146,64,14,0.4))' }}
          >
            🔒
          </motion.div>

          {/* 떠다니는 반짝 */}
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute text-amber-400/70 text-sm select-none"
              style={{
                left: `${30 + i * 10}%`,
                top: `${20 + (i % 3) * 25}%`,
              }}
              animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.4, 1] }}
              transition={{ duration: 2 + i * 0.3, repeat: Infinity }}
            >
              ✦
            </motion.span>
          ))}

          <p className="mt-4 text-xs text-amber-700 italic text-center px-6">
            너의 {data.sessionsAnalyzed}번의 세션이<br/>이 안에 잠겨 있어
          </p>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={unlock}
          className="w-full py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg active:scale-[0.98] transition"
          style={{ boxShadow: '0 4px 16px rgba(202,138,4,0.4)' }}
        >
          🗝️ 자물쇠 열어볼게
        </button>
      </SpiritEventCard>
    );
  }

  // ─── UNLOCKING ───
  if (mode === 'unlocking') {
    return (
      <SpiritEventCard
        spiritId="book_keeper"
        showSkip={false}
        className="!bg-gradient-to-br !from-amber-50 !to-yellow-100 !border-amber-400"
      >
        <div className="relative flex flex-col items-center justify-center min-h-[220px] py-6 overflow-hidden">
          {/* 자물쇠 (흔들리다가 풀림) */}
          <motion.div
            animate={{
              rotate: [0, -10, 10, -10, 10, 0],
              scale: [1, 1.05, 1.1, 1.05, 1, 1],
            }}
            transition={{ duration: 1.0 }}
            className="text-[100px] select-none relative z-10"
          >
            🔒
          </motion.div>

          {/* 황금 열쇠 — 우측에서 자물쇠로 슉 */}
          <motion.div
            initial={{ x: 200, y: 30, rotate: 45, opacity: 0 }}
            animate={{
              x: [200, 0, 0],
              y: [30, 0, 0],
              rotate: [45, 0, 360],
              opacity: [0, 1, 1],
            }}
            transition={{ duration: 1.2, times: [0, 0.6, 1] }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl select-none z-20"
            style={{ filter: 'drop-shadow(0 0 16px #FBBF24)' }}
          >
            🗝️
          </motion.div>

          {/* 자물쇠 풀림 폭발 */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 2.5, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(251,191,36,0.7), transparent 70%)',
            }}
          />

          {/* "찰칵" */}
          <motion.p
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 0] }}
            transition={{ duration: 1.0, delay: 1.0 }}
            className="absolute top-1/3 text-amber-700 font-bold text-2xl tracking-wider"
          >
            찰칵 ✦
          </motion.p>
        </div>
      </SpiritEventCard>
    );
  }

  // ─── REVEALED — 양피지 펼침 + 단어 새김 ───
  return (
    <SpiritEventCard
      spiritId="book_keeper"
      onSkip={() => handle('skip')}
      disabled={disabled}
      className="!bg-gradient-to-br !from-amber-50 !to-yellow-100 !border-amber-400"
    >
      {/* 열린 자물쇠 표시 */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-2 mb-3"
      >
        <span className="text-2xl">🔓</span>
        <p className="text-sm text-amber-900 italic font-serif">
          {data.openerMsg}
        </p>
      </motion.div>

      {/* 양피지 카드 */}
      <motion.div
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{
          originY: 0,
          background: 'linear-gradient(135deg, #FEF8E7 0%, #FDF1D7 50%, #F4E4B8 100%)',
          boxShadow: 'inset 0 0 30px rgba(212,165,116,0.2), 0 4px 12px rgba(146,64,14,0.15)',
        }}
        className="relative rounded-lg p-4 border-2 border-amber-400/60 mb-3"
      >
        <div className="absolute top-1 right-2 text-amber-400/50 text-xs">✦</div>
        <div className="absolute bottom-1 left-2 text-amber-400/50 text-xs">✦</div>

        <p className="text-[10px] tracking-widest font-bold text-amber-800 mb-2">
          📜 너의 {data.sessionsAnalyzed}번의 세션 — 반복된 단어
        </p>

        {data.topNgrams.length === 0 && (
          <p className="text-xs text-amber-700 italic" style={{ fontFamily: 'var(--font-gaegu, serif)' }}>
            — 다양한 표현을 쓰고 있어. 그것도 패턴이야.
          </p>
        )}

        <div className="space-y-1.5">
          {data.topNgrams.map((n, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -16, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.18, type: 'spring' }}
              className="flex items-center justify-between bg-white/60 border border-amber-300/60 rounded px-3 py-1.5"
            >
              <span
                className="text-base text-amber-900 font-bold"
                style={{ fontFamily: 'var(--font-gaegu, serif)' }}
              >
                🔁 &ldquo;{n.text}&rdquo;
              </span>
              {n.count > 0 && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 + i * 0.18 }}
                  className="text-xs text-amber-700 tabular-nums font-mono"
                >
                  ×{n.count}
                </motion.span>
              )}
            </motion.div>
          ))}
        </div>

        {data.sequencePattern && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + data.topNgrams.length * 0.18 + 0.3 }}
            className="mt-3 bg-gradient-to-br from-amber-200/60 to-yellow-200/60 border-2 border-amber-400 rounded-lg p-2.5"
          >
            <p className="text-[10px] tracking-widest text-amber-800 font-bold mb-1">
              🎯 가장 강한 패턴
            </p>
            <p
              className="text-sm font-bold text-amber-900"
              style={{ fontFamily: 'var(--font-gaegu, serif)' }}
            >
              {data.sequencePattern.pattern}
            </p>
            <p className="text-[11px] text-amber-700 italic mt-0.5">
              {data.sequencePattern.occurrence}
            </p>
          </motion.div>
        )}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 + data.topNgrams.length * 0.18 + 0.6 }}
        className="text-sm text-amber-800 italic mb-3 px-1"
      >
        💭 {data.cliQuiet}
      </motion.p>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('noticed')}
          className="py-2.5 px-3 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-700 to-yellow-700 text-amber-50 shadow active:scale-[0.98] transition"
        >
          🗝️ 알아챘어
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('more')}
          className="py-2.5 px-3 rounded-xl text-sm font-medium border border-amber-300 text-amber-800 hover:bg-amber-50 transition"
        >
          📚 다른 패턴도
        </button>
      </div>
    </SpiritEventCard>
  );
}
