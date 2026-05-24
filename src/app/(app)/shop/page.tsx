'use client';

/**
 * 💎 Shop — 모바일 게임 상점 풀 리디자인 (v126)
 *
 * 구조:
 *   ┌──────────────────────────────────────┐
 *   │  💎 1,250   ⭐ 230        +충전     │  Currency Bar (sticky, glass)
 *   ├──────────────────────────────────────┤
 *   │  [✨소환] [💎상점] [👑구독]            │  Tab Pills
 *   ├──────────────────────────────────────┤
 *   │  ⭐이달의 픽업   상시 소환              │  Banner Switcher (소환 탭만)
 *   │                                       │
 *   │       Hero / Banner / Cards           │  Content
 *   │                                       │
 *   └──────────────────────────────────────┘
 *
 * - X 버튼 제거 — 상점이 메인 페이지
 * - 꾸미기 탭 제거
 * - 구독: 프리미엄 패스 + 다이아 패키지 (모바일 게임 스타일)
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GachaBannerFullscreen from '@/components/shop/GachaBannerFullscreen';
import GachaPullAnimation from '@/components/shop/GachaPullAnimation';
import { BANNERS } from '@/engines/gacha/banner-config';
import { useCurrencyStore } from '@/lib/stores/currency-store';
import type { BannerId, GachaState, PullResult } from '@/types/gacha.types';

type Tab = 'gacha' | 'packages' | 'subscription';

const DEFAULT_STATE = (bannerId: BannerId): GachaState => ({
  bannerId,
  pityCounter: 0,
  isPickupGuaranteed: false,
  totalPulls: 0,
  lastPullAt: null,
});

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'gacha',        label: '소환', icon: '✨' },
  { id: 'packages',     label: '상점', icon: '💎' },
  { id: 'subscription', label: '구독', icon: '👑' },
];

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
      .then((r) => (r.ok ? r.json() : null))
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

  return (
    <div className="fixed inset-0 z-30 flex flex-col overflow-hidden" style={{ background: '#050310' }}>

      {/* ─── 백드롭 (구독/상점 탭 전용 그라디언트) ─── */}
      <AnimatePresence>
        {tab !== 'gacha' && (
          <motion.div
            key="non-gacha-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-0"
            style={{
              background:
                'radial-gradient(ellipse at top, #7c3aed44 0%, #1a0a2e 35%, #0d0820 65%, #050310 100%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* ─── 상단 헤더 (재화 바 + 탭) ─── */}
      <Header tab={tab} setTab={setTab} />

      {/* ─── 콘텐츠 ─── */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {tab === 'gacha' && (
            <motion.div
              key="gacha"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 flex flex-col"
            >
              {/* 배너 스위처 */}
              <BannerSwitcher
                activeBannerId={activeBannerId}
                setActiveBannerId={setActiveBannerId}
              />
              <div className="flex-1 relative overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeBannerId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 flex flex-col"
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
              </div>
            </motion.div>
          )}

          {tab === 'packages' && (
            <motion.div
              key="packages"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.22 }}
              className="absolute inset-0 overflow-y-auto"
            >
              <PackagesTab />
            </motion.div>
          )}

          {tab === 'subscription' && (
            <motion.div
              key="subscription"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.22 }}
              className="absolute inset-0 overflow-y-auto"
            >
              <SubscriptionTab />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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

/* ─────────────────────────────────────────────────────────
 *  Header — 재화 바 + 탭 칩
 * ───────────────────────────────────────────────────────── */
function Header({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const { balance, loaded, fetchBalance } = useCurrencyStore();

  useEffect(() => {
    if (!loaded) fetchBalance();
  }, [loaded, fetchBalance]);

  return (
    <div
      className="flex-shrink-0 relative z-40 pt-safe"
      style={{
        background:
          'linear-gradient(to bottom, rgba(8,4,18,0.75) 0%, rgba(8,4,18,0.45) 70%, transparent 100%)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      {/* ── 재화 행 ── */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-2">
        <div className="flex items-center gap-2">
          <CurrencyChip icon="💎" value={balance.heartStone} color="#ec4899" glow="rgba(236,72,153,0.45)" />
          <CurrencyChip icon="⭐" value={balance.starlight} color="#fbbf24" glow="rgba(251,191,36,0.5)" />
        </div>
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => setTab('packages')}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full font-black text-[12px]"
          style={{
            background: 'linear-gradient(135deg, #fef3c7, #fbbf24 35%, #f59e0b 80%)',
            color: '#7c2d12',
            boxShadow: '0 4px 12px rgba(245,158,11,0.45), inset 0 1px 0 rgba(255,255,255,0.5)',
            border: '1px solid rgba(255,255,255,0.35)',
          }}
        >
          <span className="text-[13px] leading-none">＋</span>
          <span className="leading-none">충전</span>
        </motion.button>
      </div>

      {/* ── 탭 칩 ── */}
      <div className="flex items-center gap-1.5 px-3 pb-2.5">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <motion.button
              key={t.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => setTab(t.id)}
              className="flex-1 relative py-2 rounded-full text-[12px] font-black flex items-center justify-center gap-1.5"
              style={
                active
                  ? {
                      background:
                        'linear-gradient(180deg, #fef9c3 0%, #fde047 35%, #f59e0b 100%)',
                      color: '#7c2d12',
                      boxShadow:
                        '0 4px 14px rgba(245,158,11,0.5), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -2px 0 rgba(180,83,9,0.4)',
                      border: '1px solid rgba(255,255,255,0.35)',
                    }
                  : {
                      background: 'rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.65)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      backdropFilter: 'blur(6px)',
                    }
              }
            >
              <span className="text-[13px] leading-none">{t.icon}</span>
              <span className="leading-none">{t.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function CurrencyChip({
  icon,
  value,
  color,
  glow,
}: {
  icon: string;
  value: number;
  color: string;
  glow: string;
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      className="flex items-center gap-1 pl-2 pr-2.5 py-1 rounded-full"
      style={{
        background: 'rgba(255,255,255,0.08)',
        border: `1px solid ${color}55`,
        boxShadow: `0 0 8px ${glow}, inset 0 1px 0 rgba(255,255,255,0.1)`,
        backdropFilter: 'blur(6px)',
      }}
    >
      <span className="text-[13px] leading-none" style={{ filter: `drop-shadow(0 0 4px ${glow})` }}>
        {icon}
      </span>
      <span
        className="text-[12px] font-black tabular-nums leading-none"
        style={{ color: '#fff', textShadow: `0 0 6px ${glow}` }}
      >
        {value.toLocaleString()}
      </span>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────
 *  Banner Switcher (소환 탭 내부)
 * ───────────────────────────────────────────────────────── */
function BannerSwitcher({
  activeBannerId,
  setActiveBannerId,
}: {
  activeBannerId: BannerId;
  setActiveBannerId: (id: BannerId) => void;
}) {
  return (
    <div
      className="flex-shrink-0 flex items-center gap-1.5 px-3 pt-1 pb-2 relative z-30"
      style={{
        background:
          'linear-gradient(to bottom, rgba(8,4,18,0.55), transparent)',
      }}
    >
      {BANNERS.map((b) => {
        const active = b.id === activeBannerId;
        return (
          <motion.button
            key={b.id}
            whileTap={{ scale: 0.96 }}
            onClick={() => setActiveBannerId(b.id)}
            className="relative px-3.5 py-1.5 rounded-full text-[11.5px] font-black"
            style={
              active
                ? {
                    background: 'rgba(255,255,255,0.95)',
                    color: '#1a1a2e',
                    boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
                  }
                : {
                    background: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(6px)',
                  }
            }
          >
            {b.id === 'pickup_weekly' && <span className="mr-1 text-[10px]">⭐</span>}
            {b.name}
            {b.bannerBadge === 'PICKUP' && !active && (
              <span
                className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                style={{ background: '#f59e0b', boxShadow: '0 0 6px rgba(245,158,11,0.8)' }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 *  Packages Tab — 다이아 패키지 상점
 * ───────────────────────────────────────────────────────── */
const PACKAGES: PackageDef[] = [
  {
    id: 'starter',
    name: '입문 패키지',
    diamonds: 100,
    bonus: 0,
    price: '₩3,300',
    badge: null,
    accent: '#60a5fa',
    visual: '💎',
  },
  {
    id: 'small',
    name: '별빛 소 패키지',
    diamonds: 350,
    bonus: 50,
    price: '₩9,900',
    badge: { label: '+17%', tone: 'blue' },
    accent: '#a855f7',
    visual: '💎💎',
  },
  {
    id: 'medium',
    name: '별빛 중 패키지',
    diamonds: 1300,
    bonus: 300,
    price: '₩33,000',
    badge: { label: 'BEST', tone: 'gold' },
    accent: '#f59e0b',
    visual: '💎💎💎',
    featured: true,
  },
  {
    id: 'large',
    name: '별빛 대 패키지',
    diamonds: 3000,
    bonus: 900,
    price: '₩66,000',
    badge: { label: '+43%', tone: 'pink' },
    accent: '#ec4899',
    visual: '💎💎💎💎',
  },
];

interface PackageDef {
  id: string;
  name: string;
  diamonds: number;
  bonus: number;
  price: string;
  badge: { label: string; tone: 'blue' | 'gold' | 'pink' } | null;
  accent: string;
  visual: string;
  featured?: boolean;
}

function PackagesTab() {
  return (
    <div className="px-3 pt-3 pb-32 space-y-2.5">
      <SectionTitle icon="💎" label="다이아 패키지" sub="첫 구매 시 추가 보너스 2배!" />

      {PACKAGES.map((p, i) => (
        <PackageCard key={p.id} pkg={p} index={i} />
      ))}

      <div className="text-center text-[10px] text-white/35 mt-4 pb-2">
        결제는 아직 준비 중입니다. 곧 오픈 예정 🛒
      </div>
    </div>
  );
}

function PackageCard({ pkg, index }: { pkg: PackageDef; index: number }) {
  const badgeBg =
    pkg.badge?.tone === 'gold'
      ? 'linear-gradient(135deg, #fef3c7, #fbbf24, #f59e0b)'
      : pkg.badge?.tone === 'pink'
      ? 'linear-gradient(135deg, #fbcfe8, #ec4899, #be185d)'
      : 'linear-gradient(135deg, #bfdbfe, #3b82f6, #1d4ed8)';

  const badgeColor =
    pkg.badge?.tone === 'gold' ? '#7c2d12' : pkg.badge?.tone === 'pink' ? '#fff' : '#fff';

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 220, damping: 24 }}
      whileTap={{ scale: 0.98 }}
      className="relative w-full overflow-hidden rounded-2xl text-left flex items-center"
      style={{
        background: pkg.featured
          ? `linear-gradient(135deg, ${pkg.accent}38 0%, ${pkg.accent}18 40%, rgba(20,10,40,0.85) 100%)`
          : 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
        border: `1px solid ${pkg.accent}${pkg.featured ? '70' : '40'}`,
        boxShadow: pkg.featured
          ? `0 6px 24px ${pkg.accent}55, inset 0 1px 0 rgba(255,255,255,0.12)`
          : `0 3px 12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)`,
        backdropFilter: 'blur(8px)',
        padding: '14px 12px',
        minHeight: 88,
      }}
    >
      {/* 광택 */}
      <div
        className="absolute top-0 inset-x-0 h-1/2 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.08), transparent)',
        }}
      />

      {/* 시각 영역 */}
      <div
        className="relative w-[68px] h-[68px] flex-shrink-0 mr-3 rounded-xl flex items-center justify-center"
        style={{
          background: `radial-gradient(circle, ${pkg.accent}55 0%, ${pkg.accent}18 60%, transparent 100%)`,
        }}
      >
        <span
          className="text-[34px] leading-none"
          style={{ filter: `drop-shadow(0 2px 6px ${pkg.accent}99)` }}
        >
          💎
        </span>
        {/* 다이아 갯수 표시 (소형 다이아 dot) */}
        <div className="absolute -bottom-1 right-0 flex gap-px">
          {Array.from({ length: Math.min(4, Math.ceil(pkg.diamonds / 500)) }).map((_, i) => (
            <span
              key={i}
              className="block w-1 h-1 rounded-full"
              style={{ background: pkg.accent, boxShadow: `0 0 4px ${pkg.accent}` }}
            />
          ))}
        </div>
      </div>

      {/* 정보 영역 */}
      <div className="flex-1 min-w-0 relative">
        <div className="flex items-baseline gap-1.5 mb-0.5 flex-wrap">
          <span className="font-black text-[14px] text-white leading-tight">{pkg.name}</span>
          {pkg.badge && (
            <span
              className="px-1.5 py-px rounded text-[9px] font-black leading-none tracking-wide"
              style={{
                background: badgeBg,
                color: badgeColor,
                boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
              }}
            >
              {pkg.badge.label}
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-[18px] font-black tabular-nums" style={{ color: pkg.accent }}>
            {pkg.diamonds.toLocaleString()}
          </span>
          {pkg.bonus > 0 && (
            <span className="text-[11px] font-bold text-amber-300">
              +{pkg.bonus} 보너스
            </span>
          )}
        </div>

        <div className="text-[10px] text-white/45 leading-tight">
          총 <span className="text-white/80 font-bold tabular-nums">{(pkg.diamonds + pkg.bonus).toLocaleString()} 💎</span>
        </div>
      </div>

      {/* 가격 버튼 */}
      <div
        className="ml-2 flex-shrink-0 px-3 py-2 rounded-full font-black text-[12px] tabular-nums"
        style={{
          background: pkg.featured
            ? 'linear-gradient(180deg, #fef9c3, #fde047 30%, #f59e0b 100%)'
            : 'linear-gradient(180deg, #ffffff, #e5e7eb)',
          color: pkg.featured ? '#7c2d12' : '#1f2937',
          boxShadow: pkg.featured
            ? '0 4px 12px rgba(245,158,11,0.55), inset 0 1px 0 rgba(255,255,255,0.6)'
            : '0 3px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.6)',
        }}
      >
        {pkg.price}
      </div>
    </motion.button>
  );
}

/* ─────────────────────────────────────────────────────────
 *  Subscription Tab — 프리미엄 패스
 * ───────────────────────────────────────────────────────── */
const PREMIUM_PERKS = [
  { icon: '💬', label: '무제한 대화', desc: '루나와 매일 끝없이' },
  { icon: '⭐', label: '월 300 별빛', desc: '매달 자동 지급' },
  { icon: '🌸', label: '한정 R 정령 1마리', desc: '구독 보상 픽업' },
  { icon: '🎯', label: '광고 완전 제거', desc: '몰입감 100%' },
  { icon: '👑', label: '구독자 전용 칭호', desc: '프로필에 표시' },
  { icon: '⚡', label: '우선 응답', desc: '서버 혼잡 시 우선' },
];

function SubscriptionTab() {
  return (
    <div className="px-3 pt-3 pb-32">
      <SectionTitle icon="👑" label="프리미엄 패스" sub="모든 콘텐츠를 무제한으로" />

      {/* ─── 메인 프리미엄 카드 ─── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        className="relative overflow-hidden rounded-3xl p-5 mb-4"
        style={{
          background:
            'linear-gradient(135deg, #4c1d95 0%, #7c3aed 30%, #c026d3 70%, #ec4899 100%)',
          border: '1.5px solid rgba(251,191,36,0.55)',
          boxShadow:
            '0 12px 36px rgba(192,38,211,0.55), 0 0 80px rgba(251,191,36,0.25), inset 0 1px 0 rgba(255,255,255,0.25)',
        }}
      >
        {/* 백그라운드 광택 */}
        <div
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(251,191,36,0.55) 0%, transparent 65%)',
            filter: 'blur(20px)',
          }}
        />
        <div
          className="absolute top-0 inset-x-0 h-1/3 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.18), transparent)',
          }}
        />

        {/* 헤더 */}
        <div className="relative flex items-start justify-between mb-3">
          <div>
            <div
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full mb-1.5"
              style={{
                background:
                  'linear-gradient(135deg, #fef3c7, #fbbf24, #f59e0b)',
                color: '#7c2d12',
              }}
            >
              <span className="text-[10px]">👑</span>
              <span className="text-[9px] font-black tracking-widest">PREMIUM</span>
            </div>
            <h3 className="text-[20px] font-black text-white leading-tight"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
            >
              루나와 매일,<br />무제한으로 ✨
            </h3>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-bold text-white/70 line-through">₩14,900</div>
            <div className="text-[22px] font-black text-yellow-200 leading-none"
              style={{ textShadow: '0 2px 6px rgba(180,83,9,0.6)' }}
            >
              ₩9,900
            </div>
            <div className="text-[9px] font-bold text-white/80 mt-0.5">/ 월</div>
          </div>
        </div>

        {/* 혜택 그리드 */}
        <div className="relative grid grid-cols-2 gap-1.5 mb-4">
          {PREMIUM_PERKS.map((perk) => (
            <div
              key={perk.label}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
              style={{
                background: 'rgba(0,0,0,0.22)',
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(4px)',
              }}
            >
              <span className="text-[14px] leading-none flex-shrink-0">{perk.icon}</span>
              <div className="min-w-0">
                <div className="text-[10.5px] font-black text-white leading-tight truncate">
                  {perk.label}
                </div>
                <div className="text-[8.5px] text-white/65 leading-tight truncate">
                  {perk.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 구매 버튼 */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="relative w-full py-3 rounded-full font-black text-[14px]"
          style={{
            background:
              'linear-gradient(180deg, #fef9c3 0%, #fde047 30%, #f59e0b 70%, #b45309 100%)',
            color: '#7c2d12',
            boxShadow:
              '0 6px 20px rgba(245,158,11,0.7), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -2px 0 rgba(180,83,9,0.5)',
            border: '1px solid rgba(255,255,255,0.35)',
          }}
        >
          <div
            className="absolute top-0 inset-x-0 h-1/2 pointer-events-none rounded-full overflow-hidden"
            style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)' }}
          />
          <span className="relative">👑 프리미엄 시작하기</span>
        </motion.button>

        <div className="text-center text-[9px] text-white/55 mt-2 relative">
          7일 무료 체험 후 자동 결제 · 언제든 해지 가능
        </div>
      </motion.div>

      {/* ─── 별빛 패키지 (구독 + 추가 재화) ─── */}
      <SectionTitle icon="⭐" label="별빛 패키지" sub="구독자 전용 추가 혜택" small />

      <div className="grid grid-cols-2 gap-2 mt-2">
        <StarPackCard label="별빛 +100" sub="구독자 한정" price="₩1,100" accent="#a855f7" />
        <StarPackCard label="별빛 +500" sub="20% 추가" price="₩4,400" accent="#ec4899" featured />
      </div>

      <div className="text-center text-[10px] text-white/35 mt-4 pb-2">
        결제는 아직 준비 중입니다. 곧 오픈 예정 🛒
      </div>
    </div>
  );
}

function StarPackCard({
  label,
  sub,
  price,
  accent,
  featured,
}: {
  label: string;
  sub: string;
  price: string;
  accent: string;
  featured?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className="relative overflow-hidden rounded-2xl p-3 text-left"
      style={{
        background: featured
          ? `linear-gradient(135deg, ${accent}38, ${accent}10 60%, rgba(20,10,40,0.85))`
          : 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
        border: `1px solid ${accent}${featured ? '70' : '38'}`,
        boxShadow: featured ? `0 4px 14px ${accent}40` : '0 2px 8px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div
        className="w-9 h-9 mb-2 rounded-lg flex items-center justify-center"
        style={{
          background: `radial-gradient(circle, ${accent}55, ${accent}15 60%, transparent)`,
        }}
      >
        <span className="text-[20px] leading-none"
          style={{ filter: `drop-shadow(0 1px 3px ${accent}99)` }}
        >
          ⭐
        </span>
      </div>
      <div className="text-[13px] font-black text-white leading-tight">{label}</div>
      <div className="text-[9px] text-white/55 mt-0.5">{sub}</div>
      <div
        className="mt-2 inline-block px-2 py-1 rounded-full text-[11px] font-black tabular-nums"
        style={{
          background: 'linear-gradient(180deg, #ffffff, #e5e7eb)',
          color: '#1f2937',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
        }}
      >
        {price}
      </div>
    </motion.button>
  );
}

/* ─────────────────────────────────────────────────────────
 *  Shared — Section Title
 * ───────────────────────────────────────────────────────── */
function SectionTitle({
  icon,
  label,
  sub,
  small,
}: {
  icon: string;
  label: string;
  sub?: string;
  small?: boolean;
}) {
  return (
    <div className={`flex items-baseline gap-2 ${small ? 'mt-4 mb-1.5' : 'mb-3 mt-1'}`}>
      <span className={small ? 'text-[15px]' : 'text-[18px]'} style={{ filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.5))' }}>
        {icon}
      </span>
      <span
        className={`${small ? 'text-[13px]' : 'text-[16px]'} font-black`}
        style={{
          background: 'linear-gradient(135deg, #fef3c7, #fbbf24, #f59e0b)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.3))',
        }}
      >
        {label}
      </span>
      {sub && (
        <span className="text-[10.5px] text-white/55 ml-1 truncate">— {sub}</span>
      )}
    </div>
  );
}
