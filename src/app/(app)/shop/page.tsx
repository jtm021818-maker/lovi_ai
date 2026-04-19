'use client';

/**
 * 🏪 v83: Shop Main Page
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ShopHeader from '@/components/shop/ShopHeader';
import GachaBannerCard from '@/components/shop/GachaBannerCard';
import GachaPullAnimation from '@/components/shop/GachaPullAnimation';
import { BANNERS } from '@/engines/gacha/banner-config';
import { useCurrencyStore } from '@/lib/stores/currency-store';
import type { BannerId, GachaState, PullResult } from '@/types/gacha.types';

type Tab = 'gacha' | 'subscription' | 'cosmetics';

export default function ShopPage() {
  const [tab, setTab] = useState<Tab>('gacha');
  const [gachaStates, setGachaStates] = useState<Record<BannerId, GachaState>>({} as any);
  const [pullResults, setPullResults] = useState<PullResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const setBalance = useCurrencyStore((s) => s.setBalance);

  // 초기 상태 로드 (각 배너 피티 카운터 읽기)
  useEffect(() => {
    fetch('/api/gacha/state').then((r) => r.ok ? r.json() : null).then((d) => {
      if (d?.states) setGachaStates(d.states);
    }).catch(() => {});
  }, []);

  async function handlePull(bannerId: BannerId, count: 1 | 10) {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/gacha/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bannerId, count }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? '뽑기 실패');
        return;
      }
      const data = await res.json();
      setPullResults(data.results);
      setBalance(data.newBalance);
      setGachaStates((prev) => ({ ...prev, [bannerId]: data.newGachaState }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-pink-50/50 to-white">
      <ShopHeader />

      {/* 탭 */}
      <div className="sticky top-[56px] z-10 bg-white/95 backdrop-blur border-b border-pink-100 flex px-4">
        {([
          { id: 'gacha', label: '정령 뽑기' },
          { id: 'subscription', label: '구독' },
          { id: 'cosmetics', label: '꾸미기' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-[13px] font-bold transition-colors relative ${
              tab === t.id ? 'text-pink-600' : 'text-gray-400'
            }`}
          >
            {t.label}
            {tab === t.id && (
              <motion.div layoutId="shop-tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500" />
            )}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {tab === 'gacha' && (
          <>
            {BANNERS.map((banner) => {
              const state = gachaStates[banner.id] ?? { bannerId: banner.id, pityCounter: 0, isPickupGuaranteed: false, totalPulls: 0, lastPullAt: null };
              return (
                <GachaBannerCard
                  key={banner.id}
                  banner={banner}
                  pityCounter={state.pityCounter}
                  totalPulls={state.totalPulls}
                  onPull={(count) => handlePull(banner.id, count)}
                  disabled={loading}
                />
              );
            })}

            <div className="mt-6 text-center text-[10px] text-gray-400">
              확률: N 65% · R 25% · SR 8% · UR 1.9% (소프트피티 50, 하드피티 70)
            </div>
          </>
        )}

        {tab === 'subscription' && (
          <div className="space-y-3">
            <SubCard title="프리미엄 월 구독" price="₩9,900" bonus="무제한 대화 · 월 300 ⭐ · 한정 R 정령 1마리 · 광고 제거" highlight />
            <SubCard title="별빛 소 패키지" price="₩3,300" bonus="100 ⭐" />
            <SubCard title="별빛 중 패키지" price="₩9,900" bonus="350 ⭐ (보너스 50)" />
            <SubCard title="별빛 대 패키지" price="₩33,000" bonus="1,300 ⭐ (보너스 300)" />
            <div className="text-center text-[10px] text-gray-400 mt-4">
              결제는 아직 준비 중입니다. 오픈 예정
            </div>
          </div>
        )}

        {tab === 'cosmetics' && (
          <div className="text-center text-gray-400 py-20 text-sm">
            꾸미기 아이템 준비 중 🎨
          </div>
        )}
      </div>

      {pullResults && (
        <GachaPullAnimation results={pullResults} onFinish={() => setPullResults(null)} />
      )}
    </div>
  );
}

function SubCard({ title, price, bonus, highlight }: { title: string; price: string; bonus: string; highlight?: boolean }) {
  return (
    <div
      className={`p-4 rounded-2xl border ${highlight ? 'bg-gradient-to-br from-purple-100 to-pink-100 border-pink-300' : 'bg-white border-pink-100'}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-[14px] text-[#4E342E]">{title}</span>
        <span className="font-black text-pink-600">{price}</span>
      </div>
      <div className="text-[11px] text-[#6D4C41] leading-relaxed">{bonus}</div>
    </div>
  );
}
