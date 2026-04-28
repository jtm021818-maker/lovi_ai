'use client';

/**
 * 🎰 v83: Gacha Pull Animation
 *
 * - 카드 뒷면 등장
 * - 3초 서스펜스 회전
 * - 희귀도별 이펙트 (UR: 무지개, SR: 금빛, R: 은빛)
 * - 이미지 확대 + 이름 등장
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PullResult } from '@/types/gacha.types';
import { getSpirit } from '@/data/spirits';
import SpiritSprite from '@/components/spirit/SpiritSprite';

interface Props {
  results: PullResult[];
  onFinish: () => void;
}

const RARITY_EFFECT: Record<string, { bg: string; glow: string; label: string }> = {
  N: { bg: 'linear-gradient(135deg, #9ca3af, #6b7280)', glow: 'rgba(156,163,175,0.5)', label: '일반' },
  R: { bg: 'linear-gradient(135deg, #60a5fa, #2563eb)', glow: 'rgba(96,165,250,0.6)', label: '레어' },
  SR: { bg: 'linear-gradient(135deg, #c084fc, #7c3aed)', glow: 'rgba(192,132,252,0.7)', label: '슈퍼레어' },
  UR: { bg: 'linear-gradient(135deg, #fbbf24, #ec4899, #8b5cf6)', glow: 'rgba(251,191,36,0.9)', label: '울트라레어' },
  L: { bg: 'linear-gradient(135deg, #06b6d4, #3b82f6, #ec4899)', glow: 'rgba(6,182,212,1)', label: '전설' },
};

export default function GachaPullAnimation({ results, onFinish }: Props) {
  const [phase, setPhase] = useState<'suspense' | 'reveal' | 'grid'>('suspense');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), 1800);
    const t2 = setTimeout(() => setPhase('grid'), 1800 + results.length * 600 + 1000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [results.length]);

  const best = results.reduce((best, r) => {
    const order = ['N', 'R', 'SR', 'UR', 'L'];
    return order.indexOf(r.rarity) > order.indexOf(best.rarity) ? r : best;
  }, results[0]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: `radial-gradient(circle at center, ${RARITY_EFFECT[best.rarity].glow} 0%, rgba(0,0,0,0.95) 70%)`,
      }}
    >
      {/* 서스펜스: 카드 뒷면 회전 */}
      {phase === 'suspense' && (
        <motion.div
          initial={{ scale: 0.4, rotateY: 0 }}
          animate={{ scale: 1, rotateY: 1440 }}
          transition={{ duration: 1.8, ease: [0.3, 0, 0.2, 1] }}
          className="w-48 h-64 rounded-3xl shadow-2xl"
          style={{
            background: RARITY_EFFECT[best.rarity].bg,
            boxShadow: `0 0 80px ${RARITY_EFFECT[best.rarity].glow}`,
          }}
        >
          <div className="w-full h-full flex items-center justify-center text-6xl">
            🎴
          </div>
        </motion.div>
      )}

      {/* Reveal: 순차 공개 */}
      {phase === 'reveal' && (
        <div className="flex flex-wrap justify-center gap-3 p-6 max-w-xl">
          {results.map((r, i) => {
            const sp = getSpirit(r.spiritId);
            const eff = RARITY_EFFECT[r.rarity];
            return (
              <motion.div
                key={`${r.spiritId}-${i}`}
                initial={{ opacity: 0, scale: 0.5, rotateY: 180 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                transition={{ delay: i * 0.25, type: 'spring', stiffness: 200 }}
                className="relative w-20 h-28 rounded-xl shadow-xl flex flex-col items-center justify-center text-white"
                style={{
                  background: eff.bg,
                  boxShadow: `0 0 20px ${eff.glow}`,
                }}
              >
                {r.isNew && (
                  <div className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-pink-500 text-[8px] font-black">NEW</div>
                )}
                <div className="mb-1 flex items-center justify-center">
                  {sp ? <SpiritSprite spirit={sp} size={44} playing={false} /> : null}
                </div>
                <div className="text-[9px] font-bold">{sp?.name}</div>
                <div className="text-[8px] opacity-80">{r.rarity}</div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Grid: 결과 그리드 + 계속 버튼 */}
      {phase === 'grid' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xl p-6"
        >
          <div className="text-center text-white/80 text-sm mb-4 font-bold">🎉 뽑기 결과</div>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {results.map((r, i) => {
              const sp = getSpirit(r.spiritId);
              const eff = RARITY_EFFECT[r.rarity];
              return (
                <div
                  key={i}
                  className="relative aspect-[3/4] rounded-xl flex flex-col items-center justify-center text-white shadow-lg"
                  style={{ background: eff.bg, boxShadow: `0 0 8px ${eff.glow}` }}
                >
                  {r.isNew && (
                    <div className="absolute -top-1 -right-1 px-1 py-0.5 rounded-full bg-pink-500 text-[7px] font-black">N</div>
                  )}
                  <div className="flex items-center justify-center">
                    {sp ? <SpiritSprite spirit={sp} size={32} playing={false} /> : null}
                  </div>
                  <div className="text-[8px] font-bold truncate max-w-full px-1">{sp?.name}</div>
                  <div className="text-[7px] opacity-80">{r.rarity}</div>
                  {r.duplicateRefund?.heartStone && (
                    <div className="text-[7px] text-yellow-200">+💎{r.duplicateRefund.heartStone}</div>
                  )}
                </div>
              );
            })}
          </div>
          <button
            onClick={onFinish}
            className="w-full py-3 rounded-2xl bg-white text-purple-700 font-bold text-[14px] active:scale-95"
          >
            확인
          </button>
        </motion.div>
      )}

      <AnimatePresence />
    </motion.div>
  );
}
