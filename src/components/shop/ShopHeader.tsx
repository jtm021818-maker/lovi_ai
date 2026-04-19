'use client';

/**
 * 💎 v83: Shop Header — 재화 표시
 */

import { useEffect } from 'react';
import { useCurrencyStore } from '@/lib/stores/currency-store';

export default function ShopHeader() {
  const { balance, loaded, fetchBalance } = useCurrencyStore();

  useEffect(() => {
    if (!loaded) fetchBalance();
  }, [loaded, fetchBalance]);

  return (
    <div className="sticky top-0 z-20 bg-gradient-to-b from-white/95 to-white/90 backdrop-blur border-b border-pink-100 px-4 py-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-extrabold text-[#4E342E]">🏪 상점</h1>
        <div className="flex items-center gap-3 text-[13px] font-bold">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-pink-50 border border-pink-200">
            <span>💎</span>
            <span className="text-pink-600 tabular-nums">{balance.heartStone.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200">
            <span>⭐</span>
            <span className="text-amber-600 tabular-nums">{balance.starlight.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
