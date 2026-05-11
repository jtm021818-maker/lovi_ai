'use client';

/**
 * 🌹 v104.2: ButterflyDiary — rose_fairy 장미 정원 설렘 일기
 *
 * 흐름:
 *   1) garden — 장미 정원 배경 카드 + 3가지 설렘 입력 + 하트 입자 따라오기
 *   2) sealed — 일기장이 펄럭이며 닫히고 ❤️ 봉인 도장
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { ButterflyDiaryData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

type Mode = 'garden' | 'sealed';

export default function ButterflyDiary({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as ButterflyDiaryData;
  const [items, setItems] = useState<[string, string, string]>(['', '', '']);
  const [mode, setMode] = useState<Mode>('garden');
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number; emoji: string }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // 입력시 하트 입자 발생
  const spawnHeart = (x: number, y: number) => {
    const id = Date.now() + Math.random();
    const emoji = ['❤️', '💕', '✨', '🌸'][Math.floor(Math.random() * 4)];
    setHearts((prev) => [...prev.slice(-12), { id, x, y, emoji }]);
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== id));
    }, 1400);
  };

  const handleInputChange = (i: number, value: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const next = [...items] as [string, string, string];
    next[i] = value;
    setItems(next);
    // 입자
    const rect = (e.target as HTMLInputElement).getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (containerRect) {
      spawnHeart(
        rect.right - containerRect.left - 10,
        rect.top - containerRect.top + rect.height / 2,
      );
    }
  };

  const handleLogged = () => {
    setMode('sealed');
    setTimeout(() => {
      const filled = items.filter((s) => s.trim().length > 0);
      onChoose(
        filled.length > 0
          ? `🌹 일기 적었어 — "${filled[0]?.slice(0, 16) ?? ''}"`
          : '🌹 적었어',
        {
          source: 'spirit_event',
          context: {
            spiritId: 'rose_fairy',
            eventType: 'SPIRIT_BUTTERFLY_DIARY',
            choice: 'logged',
            items: filled,
            target: data.exampleHint,
          },
        },
      );
    }, 2600);
  };

  const handleMore = () => {
    if (disabled) return;
    onChoose('🌹 더 떠올려볼래', {
      source: 'spirit_event',
      context: {
        spiritId: 'rose_fairy',
        eventType: 'SPIRIT_BUTTERFLY_DIARY',
        choice: 'more',
        items: items.filter((s) => s.trim()),
      },
    });
  };

  const handleSkip = () => {
    if (disabled) return;
    onChoose('🌹 다음에', {
      source: 'spirit_event',
      context: { spiritId: 'rose_fairy', eventType: 'SPIRIT_BUTTERFLY_DIARY', choice: 'skip' },
    });
  };

  // ─── SEALED — 일기장 봉인 ───
  if (mode === 'sealed') {
    return (
      <SpiritEventCard
        spiritId="rose_fairy"
        showSkip={false}
        className="!bg-gradient-to-br !from-pink-50 !to-rose-100 !border-pink-300"
      >
        <div className="relative min-h-[180px] flex flex-col items-center justify-center">
          {/* 일기장 */}
          <motion.div
            initial={{ scale: 0.6, rotateY: -90, opacity: 0 }}
            animate={{
              scale: [0.6, 1.1, 1],
              rotateY: [-90, 0, 0],
              opacity: 1,
            }}
            transition={{ duration: 1.2 }}
            className="relative w-40 h-32 rounded-r-lg shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #FFC2D1 0%, #FFAFBD 50%, #FF8DA1 100%)',
              borderLeft: '8px solid #C84B6D',
              boxShadow: '0 8px 30px rgba(244,114,182,0.4)',
            }}
          >
            <div className="absolute inset-2 border border-rose-200/60 rounded flex flex-col items-center justify-center">
              <p className="text-rose-900 text-xs font-bold mb-1">🌹</p>
              <p className="text-rose-800 text-[11px] italic" style={{ fontFamily: 'var(--font-gaegu, serif)' }}>
                설렘 일기
              </p>
            </div>

            {/* 봉인 도장 */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.5, 1], opacity: 1 }}
              transition={{ delay: 0.9, type: 'spring' }}
              className="absolute -right-3 -bottom-3 w-12 h-12 rounded-full flex items-center justify-center text-xl"
              style={{
                background: 'radial-gradient(circle, #DC2626 30%, #991B1B 70%)',
                boxShadow: '0 4px 16px rgba(220,38,38,0.5)',
              }}
            >
              ❤️
            </motion.div>
          </motion.div>

          {/* 떠다니는 꽃잎/하트 */}
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute select-none"
              style={{
                left: `${30 + (i * 8) % 60}%`,
                top: '50%',
                fontSize: 14 + (i % 3) * 4,
              }}
              initial={{ y: 0, opacity: 0 }}
              animate={{
                y: -80 - (i * 8),
                opacity: [0, 1, 0],
                rotate: 360,
              }}
              transition={{ duration: 1.8, delay: 0.4 + i * 0.08 }}
            >
              {i % 2 === 0 ? '🌸' : '❤️'}
            </motion.span>
          ))}

          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="mt-6 text-pink-800 font-bold text-base"
          >
            🌹 봉인했어
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8 }}
            className="text-pink-600 text-xs italic"
          >
            작은 떨림이 큰 사랑의 시작이래
          </motion.p>
        </div>
      </SpiritEventCard>
    );
  }

  // ─── GARDEN — 장미 정원 입력 ───
  return (
    <SpiritEventCard
      spiritId="rose_fairy"
      onSkip={handleSkip}
      disabled={disabled}
      className="!bg-gradient-to-br !from-rose-50 !via-pink-50 !to-pink-100 !border-pink-300/60"
    >
      <div ref={containerRef} className="relative">
        {/* 장미 배경 데코 */}
        {[...Array(6)].map((_, i) => (
          <motion.span
            key={`bg-${i}`}
            className="absolute select-none pointer-events-none text-pink-300/30"
            style={{
              left: `${10 + i * 15}%`,
              top: `${(i * 20) % 100}%`,
              fontSize: 14 + (i % 3) * 8,
            }}
            animate={{
              y: ['0%', '50%', '100%'],
              opacity: [0, 0.5, 0],
              rotate: 720,
            }}
            transition={{ duration: 9 + (i % 4) * 2, repeat: Infinity, delay: i * 1.2 }}
          >
            🌹
          </motion.span>
        ))}

        {/* 떠오르는 하트 입자 */}
        <AnimatePresence>
          {hearts.map((h) => (
            <motion.span
              key={h.id}
              className="absolute pointer-events-none select-none text-base z-20"
              style={{ left: h.x, top: h.y }}
              initial={{ opacity: 0, y: 0, scale: 0.6 }}
              animate={{
                opacity: [0, 1, 0],
                y: [-2, -32, -60],
                scale: [0.6, 1.3, 0.6],
                x: [0, (h.id % 2 === 0 ? 12 : -12)],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4 }}
            >
              {h.emoji}
            </motion.span>
          ))}
        </AnimatePresence>

        <p className="relative z-10 text-sm text-pink-700 mb-3 font-medium">
          {data.openerMsg}
        </p>
        <p className="relative z-10 text-[11px] italic text-pink-500 mb-1">
          예시: {data.exampleHint}
        </p>
        <p className="relative z-10 text-[11px] text-pink-600 mb-3">💡 {data.guide}</p>

        {/* 3개 입력 — 작은 장미 일기 라인 */}
        <div className="relative z-10 space-y-2 mb-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-pink-400/70 text-sm select-none pointer-events-none">
                🌸
              </span>
              <input
                type="text"
                value={items[i]}
                onChange={(e) => handleInputChange(i, e.target.value, e)}
                disabled={disabled}
                placeholder={`${i + 1}. 작은 설렘…`}
                maxLength={60}
                className="w-full pl-8 pr-3 py-2 text-sm bg-white/80 border-2 border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 text-pink-900 placeholder-pink-300 italic"
                style={{ fontFamily: 'var(--font-gaegu, serif)' }}
              />
            </div>
          ))}
        </div>

        <p className="relative z-10 text-xs italic text-pink-700 mb-3">
          🌹 {data.closingLine}
        </p>

        <div className="relative z-10 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={disabled || items.every((s) => !s.trim())}
            onClick={handleLogged}
            className="py-2.5 px-3 rounded-xl text-sm font-bold bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow active:scale-[0.98] disabled:opacity-40 transition"
            style={{ boxShadow: '0 4px 16px rgba(244,114,182,0.4)' }}
          >
            🌹 일기에 봉인
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={handleMore}
            className="py-2.5 px-3 rounded-xl text-sm font-medium border border-pink-300 text-pink-700 hover:bg-pink-50 transition"
          >
            ✏️ 더 떠올릴래
          </button>
        </div>
      </div>
    </SpiritEventCard>
  );
}
