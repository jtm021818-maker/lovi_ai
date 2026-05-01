'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { BannerConfig } from '@/types/gacha.types';
import DuplicateInfoSheet from './DuplicateInfoSheet';

interface Props {
  banner: BannerConfig;
  pityCounter: number;
  totalPulls: number;
  onPull: (count: 1 | 10) => void;
  disabled?: boolean;
}

export default function GachaBannerCard({ banner, pityCounter, totalPulls, onPull, disabled }: Props) {
  const [infoOpen, setInfoOpen] = useState(false);
  const pityProgress = Math.min(pityCounter / banner.hardPity, 1);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl overflow-hidden shadow-xl border border-pink-200 bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50"
      >
        {/* 배너 헤더 */}
        <div className="relative h-28 bg-gradient-to-br from-pink-300 to-purple-300 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-black text-white drop-shadow">{banner.name}</div>
            <div className="text-[11px] text-white/90 mt-0.5">{banner.description}</div>
          </div>
          {banner.pickupSpiritId && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/30 backdrop-blur text-[10px] font-bold text-white">
              PICKUP
            </div>
          )}
        </div>

        {/* 피티 바 */}
        <div className="px-4 pt-3">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#6D4C41] mb-1">
            <span>✨ UR 피티</span>
            <span className="tabular-nums">{pityCounter} / {banner.hardPity}</span>
          </div>
          <div className="h-1.5 rounded-full bg-pink-100 overflow-hidden">
            <motion.div
              animate={{ width: `${pityProgress * 100}%` }}
              className="h-full rounded-full bg-gradient-to-r from-pink-400 to-purple-500"
            />
          </div>
          <div className="mt-1 text-[9px] text-[#A1887F]">
            총 {totalPulls}회 뽑음 · 소프트피티 {banner.softPityStart} / 하드피티 {banner.hardPity}
          </div>
        </div>

        {/* 중복 보상 안내 칩 */}
        <div className="px-4 pt-2">
          <button
            onClick={() => setInfoOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl active:scale-[0.98] transition-transform"
            style={{
              background: 'linear-gradient(135deg, rgba(251,191,36,0.10) 0%, rgba(236,72,153,0.08) 100%)',
              border: '1px solid rgba(251,191,36,0.25)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-[11px]">💛</span>
              <span className="text-[10px] font-bold text-[#92400e]">중복 교감 XP</span>
              <div className="flex items-center gap-1">
                {[
                  { rarity: 'N', xp: 10, color: '#9ca3af' },
                  { rarity: 'SR', xp: 60, color: '#c084fc' },
                  { rarity: 'L', xp: 250, color: '#06b6d4' },
                ].map((r) => (
                  <span
                    key={r.rarity}
                    className="text-[9px] font-black tabular-nums"
                    style={{ color: r.color }}
                  >
                    +{r.xp}
                  </span>
                ))}
                <span className="text-[9px] text-[#92400e]/50">…</span>
              </div>
            </div>
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0"
              style={{ background: 'rgba(251,191,36,0.2)', color: '#b45309' }}
            >
              ?
            </div>
          </button>
        </div>

        {/* 뽑기 버튼 */}
        <div className="px-4 py-3 flex gap-2">
          <button
            onClick={() => onPull(1)}
            disabled={disabled}
            className="flex-1 py-3 rounded-2xl bg-white border-2 border-pink-400 text-pink-600 font-bold text-[13px] active:scale-95 disabled:opacity-50"
          >
            1회 뽑기
            <div className="text-[10px] font-bold text-pink-400 mt-0.5">💎 {banner.costSingle.heartStone}</div>
          </button>
          <button
            onClick={() => onPull(10)}
            disabled={disabled}
            className="flex-[1.2] py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold text-[13px] shadow-lg active:scale-95 disabled:opacity-50"
          >
            10회 뽑기
            <div className="text-[10px] font-bold text-white/90 mt-0.5">💎 {banner.costTen.heartStone} · R+ 보장</div>
          </button>
        </div>
      </motion.div>

      <DuplicateInfoSheet open={infoOpen} onClose={() => setInfoOpen(false)} />
    </>
  );
}
