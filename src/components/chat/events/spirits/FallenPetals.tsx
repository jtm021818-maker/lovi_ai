'use client';

/**
 * 🌸 v104.2: FallenPetals — cherry_leaf 풀스크린 벚꽃 놓아주기 의식
 *
 * 흐름:
 *   1) invite — 카드 인사 + "흩날리자" 시작
 *   2) ritual — 풀스크린: "놓아주고 싶은 것" 한 줄씩 입력 (최대 5)
 *      각 입력 → 큰 벚꽃이 화면에 떠올랐다 천천히 흩날려 사라짐
 *   3) closure — 모든 꽃잎 흩날린 후 빈 화면 + 시적 클로징
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { FallenPetalsData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

type Mode = 'invite' | 'ritual' | 'closure';

const MAX_PETALS = 5;

interface ReleasedPetal {
  id: number;
  text: string;
  releasedAt: number;
}

export default function FallenPetals({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as FallenPetalsData;
  const [mode, setMode] = useState<Mode>('invite');
  const [input, setInput] = useState('');
  const [petals, setPetals] = useState<ReleasedPetal[]>([]);

  const releasePetal = () => {
    if (input.trim().length < 1 || petals.length >= MAX_PETALS) return;
    setPetals((prev) => [
      ...prev,
      { id: Date.now(), text: input.trim(), releasedAt: Date.now() },
    ]);
    setInput('');
  };

  const proceedToClosure = () => {
    setMode('closure');
  };

  const handleFinish = () => {
    if (disabled) return;
    onChoose(
      petals.length > 0
        ? `🌸 흩날려 보냈어 — ${petals.length}장`
        : '🌸 흩날렸어',
      {
        source: 'spirit_event',
        context: {
          spiritId: 'cherry_leaf',
          eventType: 'SPIRIT_FALLEN_PETALS',
          choice: 'release',
          released: petals.map((p) => p.text),
        },
      },
    );
  };

  const handleSkip = () => {
    if (disabled) return;
    onChoose('🌸 다음에', {
      source: 'spirit_event',
      context: { spiritId: 'cherry_leaf', eventType: 'SPIRIT_FALLEN_PETALS', choice: 'skip' },
    });
  };

  // ─── INVITE ───
  if (mode === 'invite') {
    return (
      <SpiritEventCard
        spiritId="cherry_leaf"
        onSkip={handleSkip}
        disabled={disabled}
        className="!bg-gradient-to-br !from-pink-50 !to-rose-100 !border-pink-300"
      >
        {/* 배경 꽃잎 4개 */}
        {[...Array(5)].map((_, i) => (
          <motion.span
            key={i}
            className="absolute text-pink-300/40 select-none pointer-events-none"
            style={{
              left: `${10 + i * 18}%`,
              top: '-10%',
              fontSize: 14 + (i % 3) * 6,
            }}
            animate={{
              y: '180px',
              rotate: 360,
              opacity: [0, 0.7, 0],
            }}
            transition={{ duration: 6 + i, repeat: Infinity, delay: i * 1.2 }}
          >
            🌸
          </motion.span>
        ))}

        <p className="text-sm font-serif italic text-pink-800 mb-2 whitespace-pre-line relative">
          {data.openerMsg}
        </p>
        <p className="text-[11px] text-pink-500 italic mb-4 relative">
          {data.promptHint}
        </p>

        <button
          type="button"
          disabled={disabled}
          onClick={() => setMode('ritual')}
          className="w-full py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-pink-400 to-rose-400 text-white shadow-lg active:scale-[0.98] transition relative"
          style={{ boxShadow: '0 4px 20px rgba(244,114,182,0.4)' }}
        >
          🌸 놓아줄 시간이야
        </button>
      </SpiritEventCard>
    );
  }

  // ─── RITUAL — 풀스크린 ───
  if (mode === 'ritual') {
    return (
      <AnimatePresence>
        <motion.div
          key="ritual"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[115] overflow-hidden flex flex-col"
          style={{
            background: 'linear-gradient(180deg, #FDF2F8 0%, #FBCFE8 60%, #F9A8D4 100%)',
          }}
        >
          {/* 배경 흩날리는 작은 꽃잎 */}
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute text-pink-300/70 select-none pointer-events-none"
              style={{
                left: `${(i * 41) % 100}%`,
                top: '-5%',
                fontSize: 10 + (i % 4) * 6,
              }}
              animate={{
                y: '120vh',
                x: [0, 40, -40, 0],
                rotate: 720,
                opacity: [0, 0.8, 0.8, 0],
              }}
              transition={{
                duration: 9 + (i % 5) * 2,
                delay: (i % 8) * 0.4,
                ease: 'linear',
                repeat: Infinity,
              }}
            >
              🌸
            </motion.span>
          ))}

          {/* 풀려난 꽃잎들 (큰 사이즈, 천천히 흩날림) */}
          {petals.map((p) => (
            <BigPetal key={p.id} text={p.text} />
          ))}

          {/* 헤더 */}
          <div className="relative z-10 px-6 pt-12 pb-4">
            <p className="text-pink-800 font-bold text-lg mb-1">
              🌸 놓아주는 의식
            </p>
            <p className="text-pink-600 text-sm italic">
              한 줄 적으면, 큰 꽃잎 한 장이 떨어져
            </p>
          </div>

          {/* 입력 영역 (하단 고정) */}
          <div className="relative z-10 mt-auto px-6 pb-8">
            <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-pink-200/80 shadow-lg p-4">
              {/* 카운터 도트 */}
              <div className="flex justify-center gap-1.5 mb-3">
                {Array.from({ length: MAX_PETALS }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    animate={{
                      backgroundColor: i < petals.length ? '#EC4899' : '#FBCFE8',
                      scale: i === petals.length ? 1.4 : 1,
                    }}
                  />
                ))}
              </div>

              {petals.length < MAX_PETALS ? (
                <>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') releasePetal();
                    }}
                    disabled={disabled}
                    maxLength={40}
                    placeholder="놓아주고 싶은 것 한 줄…"
                    className="w-full px-3 py-2.5 text-base bg-pink-50 border-2 border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 text-pink-900 placeholder-pink-300 italic"
                    style={{ fontFamily: 'var(--font-gaegu, serif)' }}
                  />
                  <p className="text-[11px] text-pink-400 text-center mt-2">
                    {petals.length} / {MAX_PETALS} 흩날렸어
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button
                      type="button"
                      disabled={input.trim().length < 1}
                      onClick={releasePetal}
                      className="py-2.5 px-3 rounded-xl text-sm font-bold bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow active:scale-[0.98] disabled:opacity-40 transition"
                    >
                      🌸 한 잎 흩날리기
                    </button>
                    <button
                      type="button"
                      disabled={petals.length === 0}
                      onClick={proceedToClosure}
                      className="py-2.5 px-3 rounded-xl text-sm font-medium border border-pink-300 text-pink-700 hover:bg-pink-50 disabled:opacity-40 transition"
                    >
                      ✨ 마무리하기
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-center text-pink-700 font-bold mb-3">
                    🌸 5장 다 흩날렸어
                  </p>
                  <button
                    type="button"
                    onClick={proceedToClosure}
                    className="w-full py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow active:scale-[0.98] transition"
                  >
                    ✨ 마무리하기
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── CLOSURE — 시적 클로징 ───
  return (
    <AnimatePresence>
      <motion.div
        key="closure"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[115] overflow-hidden flex flex-col items-center justify-center px-8"
        style={{
          background: 'linear-gradient(180deg, #FCE7F3 0%, #FBCFE8 50%, #FCE7F3 100%)',
        }}
      >
        {/* 마지막 큰 꽃잎 */}
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', delay: 0.3 }}
          className="text-[100px] mb-6 select-none"
          style={{ filter: 'drop-shadow(0 0 30px rgba(244,114,182,0.5))' }}
        >
          🌸
        </motion.div>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="text-pink-800 font-serif italic text-base text-center leading-loose whitespace-pre-line max-w-sm mb-8"
          style={{ fontFamily: 'var(--font-gaegu, serif)' }}
        >
          {data.closingPoetry}
        </motion.p>

        <motion.button
          type="button"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.8 }}
          onClick={handleFinish}
          className="px-8 py-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-base shadow-2xl active:scale-95"
          style={{ boxShadow: '0 8px 30px rgba(244,114,182,0.5)' }}
        >
          🌸 다 보냈어
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── 큰 꽃잎 (입력 1건당 1개) ─────────────────
function BigPetal({ text }: { text: string }) {
  // 시작 위치 (랜덤 결정론적 — text length 기반)
  const startX = 20 + ((text.length * 7) % 60);     // 20~80%
  return (
    <motion.div
      className="absolute pointer-events-none select-none"
      style={{ left: `${startX}%`, top: '20%' }}
      initial={{ y: 0, opacity: 0, scale: 0.6, rotate: 0 }}
      animate={{
        y: ['0vh', '20vh', '50vh', '80vh'],
        x: [0, 30, -30, 50],
        opacity: [0, 1, 0.8, 0],
        scale: [0.6, 1.4, 1.2, 0.8],
        rotate: 540,
      }}
      transition={{ duration: 5, ease: 'easeIn' }}
    >
      <div className="relative">
        <span
          className="text-7xl"
          style={{ filter: 'drop-shadow(0 4px 16px rgba(244,114,182,0.5))' }}
        >
          🌸
        </span>
        <p
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-pink-900 font-bold text-[11px] whitespace-nowrap max-w-[100px] text-center"
          style={{ fontFamily: 'var(--font-gaegu, serif)' }}
        >
          {text.length > 8 ? text.slice(0, 7) + '…' : text}
        </p>
      </div>
    </motion.div>
  );
}
