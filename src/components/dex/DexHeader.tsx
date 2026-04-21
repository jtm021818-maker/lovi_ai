'use client';

/**
 * 📊 v85.3: DexHeader — 도감 진행률 대시보드
 *
 * - 전체 수집 진행률 (큰 프로그레스 바, 무지개 그라데이션)
 * - 레어도별 미니 바 (N R SR UR L)
 * - 백스토리 해금 카운터 (📜 N/N)
 */

import { motion } from 'framer-motion';
import type { SpiritMaster, UserSpirit, SpiritRarity } from '@/types/spirit.types';
import { RARITY_META } from './RarityBadge';

interface Props {
  spirits: SpiritMaster[];
  owned: UserSpirit[];
  onClose: () => void;
}

const RARITY_ORDER: SpiritRarity[] = ['N', 'R', 'SR', 'UR', 'L'];

export default function DexHeader({ spirits, owned, onClose }: Props) {
  const ownedIds = new Set(owned.map((o) => o.spiritId));
  const total = spirits.length;
  const ownedCount = owned.length;
  const pct = total > 0 ? Math.round((ownedCount / total) * 100) : 0;
  const unlockedBackstories = owned.filter((o) => o.backstoryUnlocked).length;

  const rarityStats = RARITY_ORDER.map((r) => {
    const all = spirits.filter((s) => s.rarity === r);
    const got = all.filter((s) => ownedIds.has(s.id)).length;
    return { rarity: r, got, total: all.length };
  }).filter((s) => s.total > 0);

  return (
    <div className="relative px-5 pt-5 pb-4">
      {/* 닫기 버튼 */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold text-amber-100 z-20"
        style={{
          background: 'linear-gradient(135deg, #3a2418 0%, #1c110a 100%)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.35), inset 0 1px 0 rgba(212,175,55,0.5)',
        }}
        aria-label="닫기"
      >
        ✕
      </button>

      {/* 제목 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[22px]">📖</span>
        <div>
          <h2 className="text-[16px] font-extrabold text-amber-50 leading-tight tracking-wide">
            정령 도감
          </h2>
          <p className="text-[10px] text-amber-100/60 italic">
            네가 만난 정령들의 기록
          </p>
        </div>
      </div>

      {/* 메인 진행률 */}
      <div className="mb-3">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[11px] text-amber-100/80 tracking-wider">수집 진행</span>
          <div>
            <span className="text-[18px] font-black text-amber-100 tabular-nums">{ownedCount}</span>
            <span className="text-[11px] text-amber-100/60 ml-0.5">/ {total}</span>
            <span className="ml-2 text-[11px] font-bold text-amber-200/90">{pct}%</span>
          </div>
        </div>
        <div
          className="relative h-2.5 rounded-full overflow-hidden"
          style={{
            background: 'rgba(0,0,0,0.45)',
            boxShadow: 'inset 0 2px 3px rgba(0,0,0,0.5)',
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="h-full"
            style={{
              background:
                'linear-gradient(90deg, #f472b6 0%, #c084fc 25%, #818cf8 50%, #22d3ee 75%, #facc15 100%)',
              boxShadow: '0 0 8px rgba(255,180,220,0.55)',
            }}
          />
          {/* shimmer on fill */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)',
              backgroundSize: '200% 100%',
            }}
            animate={{ backgroundPosition: ['200% 0%', '-100% 0%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </div>

      {/* 레어도별 미니 바 */}
      <div className="grid grid-cols-5 gap-1.5 mb-2">
        {rarityStats.map(({ rarity, got, total: t }) => {
          const rm = RARITY_META[rarity];
          const rpct = t > 0 ? (got / t) * 100 : 0;
          return (
            <div key={rarity}>
              <div className="flex items-center justify-between mb-0.5">
                <span
                  className="text-[8px] font-black tracking-widest"
                  style={{ color: rm.colorFrom }}
                >
                  {rarity}
                </span>
                <span className="text-[8px] text-amber-100/70 tabular-nums">
                  {got}/{t}
                </span>
              </div>
              <div
                className="h-1 rounded-full overflow-hidden"
                style={{ background: 'rgba(0,0,0,0.5)' }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${rpct}%` }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${rm.colorFrom} 0%, ${rm.colorTo} 100%)`,
                    boxShadow: `0 0 4px ${rm.glow}`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 백스토리 해금 */}
      <div className="flex items-center gap-1.5 text-[10px] text-amber-100/80">
        <span>📜</span>
        <span className="tracking-wide">
          비밀 해금 <span className="font-bold text-amber-200">{unlockedBackstories}</span>
          <span className="opacity-60"> / {total}</span>
        </span>
      </div>
    </div>
  );
}
