'use client';

/**
 * 🧚 v83: Spirit Dex (도감)
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { SPIRITS } from '@/data/spirits';
import type { UserSpirit, SpiritRarity } from '@/types/spirit.types';

const RARITY_ORDER: SpiritRarity[] = ['L', 'UR', 'SR', 'R', 'N'];
const RARITY_COLOR: Record<SpiritRarity, string> = {
  N: '#9ca3af',
  R: '#60a5fa',
  SR: '#c084fc',
  UR: '#fbbf24',
  L: '#06b6d4',
};

export default function SpiritsPage() {
  const [owned, setOwned] = useState<UserSpirit[]>([]);

  useEffect(() => {
    fetch('/api/spirits/list')
      .then((r) => r.json())
      .then((d) => setOwned(d.owned ?? []))
      .catch(() => {});
  }, []);

  const ownedMap = new Map(owned.map((s) => [s.spiritId, s]));
  const totalCount = SPIRITS.length;
  const ownedCount = owned.length;

  return (
    <div className="min-h-full bg-gradient-to-b from-pink-50/40 to-white px-4 py-4">
      <div className="mb-4">
        <h1 className="text-xl font-extrabold text-[#4E342E]">🧚 정령 도감</h1>
        <div className="text-[11px] text-[#A1887F] mt-1">
          {ownedCount} / {totalCount} 수집 · {Math.round((ownedCount / totalCount) * 100)}%
        </div>
        <div className="h-1 bg-pink-100 rounded-full mt-2 overflow-hidden">
          <motion.div
            animate={{ width: `${(ownedCount / totalCount) * 100}%` }}
            className="h-full bg-gradient-to-r from-pink-400 to-purple-500"
          />
        </div>
      </div>

      {RARITY_ORDER.map((rarity) => {
        const spirits = SPIRITS.filter((s) => s.rarity === rarity);
        if (spirits.length === 0) return null;

        return (
          <div key={rarity} className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: RARITY_COLOR[rarity] }}>
                {rarity}
              </span>
              <span className="text-[10px] text-[#6D4C41]">
                {spirits.filter((s) => ownedMap.has(s.id)).length} / {spirits.length}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {spirits.map((s) => {
                const us = ownedMap.get(s.id);
                const unknown = !us;
                return (
                  <Link
                    key={s.id}
                    href={unknown ? '#' : `/spirits/${s.id}`}
                    className={`relative aspect-[3/4] rounded-xl flex flex-col items-center justify-center p-1 shadow-sm border ${unknown ? 'bg-gray-100 border-gray-200 cursor-default' : 'bg-white border-pink-100'}`}
                    onClick={(e) => unknown && e.preventDefault()}
                  >
                    {unknown ? (
                      <>
                        <div className="text-3xl opacity-30">❓</div>
                        <div className="text-[8px] text-gray-400 mt-1">???</div>
                      </>
                    ) : (
                      <>
                        {us.bondLv === 5 && (
                          <div className="absolute -top-1 -right-1 px-1 py-0.5 rounded-full text-white text-[7px] font-black" style={{ background: RARITY_COLOR[rarity] }}>
                            MAX
                          </div>
                        )}
                        <div className="text-3xl">{s.emoji}</div>
                        <div className="text-[9px] font-bold text-[#4E342E] mt-0.5 truncate max-w-full">{s.name}</div>
                        <div className="text-[7px] text-[#A1887F]">Lv.{us.bondLv}</div>
                        {us.count > 1 && (
                          <div className="absolute top-0.5 left-1 text-[7px] font-black text-pink-500">×{us.count}</div>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
