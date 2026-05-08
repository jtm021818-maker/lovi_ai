'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ShopHeader from '@/components/shop/ShopHeader';
import GachaBannerFullscreen from '@/components/shop/GachaBannerFullscreen';
import GachaPullAnimation from '@/components/shop/GachaPullAnimation';
import { BANNERS } from '@/engines/gacha/banner-config';
import { useCurrencyStore } from '@/lib/stores/currency-store';
import type { BannerId, GachaState, PullResult } from '@/types/gacha.types';

type Tab = 'gacha' | 'subscription' | 'cosmetics';

const DEFAULT_STATE = (bannerId: BannerId): GachaState => ({
  bannerId,
  pityCounter: 0,
  isPickupGuaranteed: false,
  totalPulls: 0,
  lastPullAt: null,
});

export default function ShopPage() {
  const [tab, setTab] = useState<Tab>('gacha');
  const [activeBannerId, setActiveBannerId] = useState<BannerId>(BANNERS[0].id);
  const [gachaStates, setGachaStates] = useState<Record<BannerId, GachaState>>({} as Record<BannerId, GachaState>);
  const [pullResults, setPullResults] = useState<PullResult[] | null>(null);
  const [animating, setAnimating] = useState(false);
  const [loading, setLoading] = useState(false);
  const setBalance = useCurrencyStore((s) => s.setBalance);

  useEffect(() => {
    fetch('/api/gacha/state')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.states) setGachaStates(d.states); })
      .catch(() => {});
  }, []);

  async function handlePull(bannerId: BannerId, count: 1 | 10) {
    if (loading) return;
    setLoading(true);
    setAnimating(true);
    setPullResults(null);
    try {
      const res = await fetch('/api/gacha/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bannerId, count }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setAnimating(false);
        alert(err.error ?? '뽑기 실패');
        return;
      }
      const data = await res.json();
      setPullResults(data.results);
      setBalance(data.newBalance);
      setGachaStates((prev) => ({ ...prev, [bannerId]: data.newGachaState }));
    } catch {
      setAnimating(false);
    } finally {
      setLoading(false);
    }
  }

  const activeBanner = BANNERS.find((b) => b.id === activeBannerId) ?? BANNERS[0];
  const activeState = gachaStates[activeBannerId] ?? DEFAULT_STATE(activeBannerId);

  // ── 가챠 탭: 풀스크린 ──
  if (tab === 'gacha') {
    return (
      <div className="fixed inset-0 z-30 flex flex-col bg-black">

        {/* 상단 배너 탭 스위처 */}
        <div
          className="flex-shrink-0 flex items-center px-4 pt-safe"
          style={{
            height: 52,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)',
            position: 'relative',
            zIndex: 40,
          }}
        >
          {/* 배너 탭들 */}
          <div className="flex gap-1.5 flex-1">
            {BANNERS.map((b) => {
              const isActive = b.id === activeBannerId;
              return (
                <motion.button
                  key={b.id}
                  onClick={() => setActiveBannerId(b.id)}
                  className="px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all relative"
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.15)',
                    color: isActive ? '#1a1a2e' : 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(8px)',
                    border: isActive ? 'none' : '1px solid rgba(255,255,255,0.2)',
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  {b.id === 'pickup_weekly' && (
                    <span className="mr-1 text-[10px]">⭐</span>
                  )}
                  {b.name}
                  {b.bannerBadge === 'PICKUP' && !isActive && (
                    <span
                      className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                      style={{ background: '#f59e0b' }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* 닫기 버튼 */}
          <button
            onClick={() => setTab('subscription')}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 font-bold text-lg"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            ✕
          </button>
        </div>

        {/* 풀스크린 배너 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeBannerId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <GachaBannerFullscreen
              banner={activeBanner}
              pityCounter={activeState.pityCounter}
              totalPulls={activeState.totalPulls}
              onPull={(count) => handlePull(activeBannerId, count)}
              disabled={loading}
            />
          </motion.div>
        </AnimatePresence>

        {/* 뽑기 애니메이션 */}
        {animating && (
          <GachaPullAnimation
            results={pullResults}
            onFinish={() => { setAnimating(false); setPullResults(null); }}
          />
        )}
      </div>
    );
  }

  // ── 구독 / 꾸미기 탭 ──
  return (
    <div className="min-h-full bg-gradient-to-b from-pink-50/50 to-white">
      <ShopHeader />

      {/* 탭 바 */}
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
              <motion.div
                layoutId="shop-tab-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500"
              />
            )}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
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
    </div>
  );
}

function SubCard({
  title,
  price,
  bonus,
  highlight,
}: {
  title: string;
  price: string;
  bonus: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-2xl border ${
        highlight
          ? 'bg-gradient-to-br from-purple-100 to-pink-100 border-pink-300'
          : 'bg-white border-pink-100'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-[14px] text-[#4E342E]">{title}</span>
        <span className="font-black text-pink-600">{price}</span>
      </div>
      <div className="text-[11px] text-[#6D4C41] leading-relaxed">{bonus}</div>
    </div>
  );
}
