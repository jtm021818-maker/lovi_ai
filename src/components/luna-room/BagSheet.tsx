'use client';

/**
 * v118: BagSheet 풀 리디자인
 *
 * 모바일 게임 표준 패턴 (블루아카이브 / 원신 / 니케 / FGO 합성) 으로 재설계.
 *
 * 변경 사항:
 *  - 88vh 바텀시트 → 100vh 풀시트
 *  - 카테고리 4종 재편: 🎁선물 / 🍃소모품 / 🎫부적·티켓 / 📜봉인
 *  - 그리드 ↔ 디테일 좌우 슬라이드 (별도 모달 시트 적층 제거)
 *  - BagCell 정보 밀도 강화: rarity 코너칩 + ×qty 뱃지 + ⚓ 장착 + ⭐ 즐겨찾기
 *  - 정렬/필터 라인: 5가지 정렬 + NEW만/즐겨찾기만 토글
 *  - 디테일 페이지 9단 구조: hero / 이름 / 메타 / 루나노트 / 효과 progress / 예측 / 획득 / 액션
 */

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LunaShowReaction from './LunaShowReaction';
import { TimeCapsuleSealModal, WishMakeModal } from './CapsuleAndWishModals';
import WishCapsuleHistory from './WishCapsuleHistory';
import GiveToLunaCeremony from './GiveToLunaCeremony';

// ============================================================
// 타입
// ============================================================
interface Item {
  id: string;
  itemId: string;
  name: string;
  emoji: string;
  category: 'gift' | 'consumable' | 'charm' | 'sealed' | 'gacha' | 'decor';
  rarity: string;
  description: string;
  emotionTag: string | null;
  quantity: number;
  source: string;
  acquiredAt: string;
  acquiredDay: number | null;
  lunaNote: string | null;
  isNew: boolean;
  isConsumable: boolean;
  useEffect: string | null;
  used: boolean;
  equipped: boolean;
  favorite: boolean;
}

interface Counts {
  all: number;
  gift: number;
  consumable: number;
  charm: number;
  sealed: number;
  gacha: number;
  decor: number;
}

type CategoryTab = 'gift' | 'consumable' | 'charm' | 'sealed';
type SortKey = 'recent' | 'oldest' | 'rarity_desc' | 'rarity_asc' | 'name';

interface Props {
  open: boolean;
  onClose: () => void;
}

// ============================================================
// 카테고리 / 희귀도 메타
// ============================================================
const CATEGORIES: Array<{ key: CategoryTab; label: string; icon: string; accent: string }> = [
  { key: 'gift',       label: '선물',     icon: '🎁', accent: '#ec4899' },
  { key: 'consumable', label: '소모품',   icon: '🍃', accent: '#10b981' },
  { key: 'charm',      label: '부적·티켓', icon: '🎫', accent: '#f59e0b' },
  { key: 'sealed',     label: '봉인',     icon: '📜', accent: '#a78bfa' },
];

const RARITY_BORDER: Record<string, string> = {
  N:  'rgba(156,163,175,0.5)',
  R:  'rgba(96,165,250,0.6)',
  SR: 'rgba(192,132,252,0.7)',
  UR: 'rgba(251,191,36,0.85)',
  L:  'rgba(6,182,212,0.85)',
};

const RARITY_BG: Record<string, string> = {
  N:  '#9ca3af',
  R:  '#3b82f6',
  SR: '#a855f7',
  UR: '#f59e0b',
  L:  '#06b6d4',
};

const RARITY_GLOW: Record<string, string> = {
  N:  '',
  R:  '',
  SR: '0 0 12px rgba(168,85,247,0.30)',
  UR: '0 0 14px rgba(251,191,36,0.45)',
  L:  '0 0 14px rgba(6,182,212,0.45)',
};

const RARITY_ORDER: Record<string, number> = { L: 5, UR: 4, SR: 3, R: 2, N: 1 };

const SORT_LABELS: Record<SortKey, string> = {
  recent: '최신순',
  oldest: '오래된순',
  rarity_desc: '등급 높은순',
  rarity_asc: '등급 낮은순',
  name: '이름순',
};

// ============================================================
// Main Component
// ============================================================
export default function BagSheet({ open, onClose }: Props) {
  const [tab, setTab] = useState<CategoryTab>('gift');
  const [items, setItems] = useState<Item[]>([]);
  const [counts, setCounts] = useState<Counts>({ all: 0, gift: 0, consumable: 0, charm: 0, sealed: 0, gacha: 0, decor: 0 });
  const [selected, setSelected] = useState<Item | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [filterNewOnly, setFilterNewOnly] = useState(false);
  const [filterFavoriteOnly, setFilterFavoriteOnly] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [dailyGiftCount, setDailyGiftCount] = useState(0);
  const [dailyGiftCap, setDailyGiftCap] = useState(3);
  const [giftStreakDays, setGiftStreakDays] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/luna-room/inventory');
      const d = await r.json();
      setItems(d.items ?? []);
      setCounts(d.counts ?? { all: 0, gift: 0, consumable: 0, charm: 0, sealed: 0, gacha: 0, decor: 0 });
      setDailyGiftCount(d.dailyGiftCount ?? 0);
      setDailyGiftCap(d.dailyGiftCap ?? 3);
      setGiftStreakDays(d.giftStreakDays ?? 0);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) load();
  }, [open]);

  // 필터링 + 정렬
  const filtered = useMemo(() => {
    let out = items.filter((i) => i.category === tab);
    // gacha legacy 카테고리는 charm 으로 흡수 (사용자 보유분이 남아있을 경우 대비)
    if (tab === 'charm') out = items.filter((i) => i.category === 'charm' || i.category === 'gacha');
    if (filterNewOnly) out = out.filter((i) => i.isNew);
    if (filterFavoriteOnly) out = out.filter((i) => i.favorite);
    out = [...out].sort((a, b) => {
      switch (sortKey) {
        case 'recent':       return new Date(b.acquiredAt).getTime() - new Date(a.acquiredAt).getTime();
        case 'oldest':       return new Date(a.acquiredAt).getTime() - new Date(b.acquiredAt).getTime();
        case 'rarity_desc':  return (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0);
        case 'rarity_asc':   return (RARITY_ORDER[a.rarity] ?? 0) - (RARITY_ORDER[b.rarity] ?? 0);
        case 'name':         return a.name.localeCompare(b.name, 'ko');
      }
    });
    return out;
  }, [items, tab, sortKey, filterNewOnly, filterFavoriteOnly]);

  const categoryCount = (key: CategoryTab) => {
    if (key === 'charm') return counts.charm + counts.gacha; // 잔존 gacha 흡수
    return counts[key];
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 백드롭 */}
          <motion.div
            key="bag-bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* 100vh 풀시트 */}
          <motion.div
            key="bag-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed inset-0 z-[201] flex flex-col"
            style={{ background: 'linear-gradient(180deg, #fef9f3 0%, #ffe8d8 100%)' }}
          >
            {/* 그리드 / 디테일 좌우 슬라이드 */}
            <AnimatePresence mode="wait" initial={false}>
              {!selected ? (
                <motion.div
                  key="grid-view"
                  initial={{ x: '-8%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '-8%', opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <GridView
                    tab={tab}
                    setTab={setTab}
                    categoryCount={categoryCount}
                    sortKey={sortKey}
                    setSortKey={setSortKey}
                    sortMenuOpen={sortMenuOpen}
                    setSortMenuOpen={setSortMenuOpen}
                    filterNewOnly={filterNewOnly}
                    setFilterNewOnly={setFilterNewOnly}
                    filterFavoriteOnly={filterFavoriteOnly}
                    setFilterFavoriteOnly={setFilterFavoriteOnly}
                    loading={loading}
                    filtered={filtered}
                    onSelect={setSelected}
                    onClose={onClose}
                    historyOpen={historyOpen}
                    setHistoryOpen={setHistoryOpen}
                    dailyGiftCount={dailyGiftCount}
                    dailyGiftCap={dailyGiftCap}
                    giftStreakDays={giftStreakDays}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key={`detail-${selected.id}`}
                  initial={{ x: '8%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '8%', opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <DetailView
                    item={selected}
                    onBack={() => setSelected(null)}
                    onUsed={async () => { await load(); setSelected(null); }}
                    onClose={onClose}
                    onFavoriteToggle={async () => {
                      // optimistic toggle
                      setItems((prev) => prev.map((it) => it.id === selected.id ? { ...it, favorite: !it.favorite } : it));
                      setSelected({ ...selected, favorite: !selected.favorite });
                      try {
                        await fetch(`/api/luna-room/inventory/${selected.id}/favorite`, { method: 'POST' });
                      } catch { /* silent */ }
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* 기록 시트 */}
          <WishCapsuleHistory open={historyOpen} onClose={() => setHistoryOpen(false)} />
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// Grid View
// ============================================================
function GridView(props: {
  tab: CategoryTab;
  setTab: (t: CategoryTab) => void;
  categoryCount: (k: CategoryTab) => number;
  sortKey: SortKey;
  setSortKey: (k: SortKey) => void;
  sortMenuOpen: boolean;
  setSortMenuOpen: (b: boolean) => void;
  filterNewOnly: boolean;
  setFilterNewOnly: (b: boolean) => void;
  filterFavoriteOnly: boolean;
  setFilterFavoriteOnly: (b: boolean) => void;
  loading: boolean;
  filtered: Item[];
  onSelect: (i: Item) => void;
  onClose: () => void;
  historyOpen: boolean;
  setHistoryOpen: (b: boolean) => void;
  dailyGiftCount: number;
  dailyGiftCap: number;
  giftStreakDays: number;
}) {
  const {
    tab, setTab, categoryCount, sortKey, setSortKey, sortMenuOpen, setSortMenuOpen,
    filterNewOnly, setFilterNewOnly, filterFavoriteOnly, setFilterFavoriteOnly,
    loading, filtered, onSelect, onClose, setHistoryOpen,
    dailyGiftCount, dailyGiftCap, giftStreakDays,
  } = props;

  return (
    <>
      {/* Top bar */}
      <div className="flex-shrink-0 px-4 pt-safe pb-2 flex items-center justify-between" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 14px)' }}>
        <div className="text-[15px] font-black tracking-wide text-[#7c5738]">🎒 가방</div>
        <div className="flex items-center gap-1.5">
          {giftStreakDays >= 3 && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black"
              style={{ background: 'linear-gradient(135deg, #fb923c, #f97316)', color: 'white' }}
            >
              <span>🔥</span>
              <span className="tabular-nums">{giftStreakDays}일</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: 'rgba(0,0,0,0.06)', color: '#7c5738' }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* 카테고리 칩 (가로 스크롤) */}
      <div className="flex-shrink-0 px-3 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((c) => {
          const active = tab === c.key;
          const cnt = categoryCount(c.key);
          return (
            <button
              key={c.key}
              onClick={() => setTab(c.key)}
              className="flex-shrink-0 px-3.5 py-2 rounded-2xl flex items-center gap-1.5 active:scale-[0.97] transition-all"
              style={{
                background: active
                  ? `linear-gradient(135deg, ${c.accent}26, ${c.accent}14)`
                  : 'rgba(255,255,255,0.85)',
                border: `1.5px solid ${active ? c.accent : 'rgba(212,175,55,0.20)'}`,
                boxShadow: active ? `0 0 10px ${c.accent}40` : 'none',
                minWidth: 78,
              }}
            >
              <span className="text-[15px]">{c.icon}</span>
              <span className={`text-[12px] font-black ${active ? '' : 'text-[#7c5738]'}`}
                style={active ? { color: c.accent } : undefined}
              >
                {c.label}
              </span>
              <span
                className="text-[9.5px] font-bold tabular-nums px-1 rounded"
                style={{
                  color: active ? 'white' : '#a1887f',
                  background: active ? c.accent : 'transparent',
                }}
              >
                {cnt}
              </span>
            </button>
          );
        })}
      </div>

      {/* 정렬/필터 라인 */}
      <div className="flex-shrink-0 px-4 pb-2.5 flex items-center justify-between text-[11px]">
        <div className="font-bold text-[#7c5738]">
          전체 <span className="text-[#92400e] tabular-nums">{filtered.length}</span>개
        </div>
        <div className="flex items-center gap-1.5">
          {/* 정렬 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => setSortMenuOpen(!sortMenuOpen)}
              className="px-2.5 py-1 rounded-full font-bold text-[10.5px] active:scale-[0.96] transition-transform flex items-center gap-1"
              style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(212,175,55,0.3)', color: '#7c5738' }}
            >
              {SORT_LABELS[sortKey]}
              <span className="text-[8px]">▾</span>
            </button>
            <AnimatePresence>
              {sortMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-full mt-1 rounded-xl py-1 z-30"
                  style={{
                    background: 'white',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    minWidth: 110,
                  }}
                >
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => { setSortKey(k); setSortMenuOpen(false); }}
                      className="w-full text-left px-3 py-1.5 text-[11px] font-bold hover:bg-amber-50"
                      style={{ color: sortKey === k ? '#92400e' : '#7c5738' }}
                    >
                      {sortKey === k ? '· ' : '  '}{SORT_LABELS[k]}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* NEW 토글 */}
          <button
            onClick={() => setFilterNewOnly(!filterNewOnly)}
            className="px-2.5 py-1 rounded-full font-bold text-[10.5px] active:scale-[0.96] transition-transform"
            style={{
              background: filterNewOnly ? 'linear-gradient(135deg, #ec4899, #db2777)' : 'rgba(255,255,255,0.85)',
              border: filterNewOnly ? 'none' : '1px solid rgba(236,72,153,0.3)',
              color: filterNewOnly ? 'white' : '#be185d',
            }}
          >
            ✨ NEW
          </button>
          {/* 즐겨찾기 토글 */}
          <button
            onClick={() => setFilterFavoriteOnly(!filterFavoriteOnly)}
            className="px-2.5 py-1 rounded-full font-bold text-[10.5px] active:scale-[0.96] transition-transform"
            style={{
              background: filterFavoriteOnly ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.85)',
              border: filterFavoriteOnly ? 'none' : '1px solid rgba(245,158,11,0.3)',
              color: filterFavoriteOnly ? 'white' : '#92400e',
            }}
          >
            ⭐
          </button>
        </div>
      </div>

      {/* 그리드 (스크롤 영역) */}
      <div className="flex-1 overflow-y-auto px-4">
        {loading && (
          <div className="text-center text-[11px] text-[#a1887f] py-16">불러오는 중…</div>
        )}
        {!loading && filtered.length === 0 && (
          <EmptyState tab={tab} hasFilter={filterNewOnly || filterFavoriteOnly} />
        )}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-3 gap-2 pb-2">
            {filtered.map((item) => (
              <BagCell key={item.id} item={item} onSelect={() => onSelect(item)} />
            ))}
          </div>
        )}

        {/* 일일 선물 캡 인디케이터 (gift 탭 한정) */}
        {tab === 'gift' && (
          <div className="mt-3 p-2.5 rounded-xl flex items-center justify-between"
            style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(236,72,153,0.18)' }}
          >
            <span className="text-[10.5px] font-bold text-[#7c5738]">오늘 선물 가능</span>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {Array.from({ length: dailyGiftCap }).map((_, i) => (
                  <div key={i}
                    className="w-2 h-2 rounded-full"
                    style={{ background: i < dailyGiftCount ? '#ec4899' : 'rgba(236,72,153,0.20)' }}
                  />
                ))}
              </div>
              <span className="text-[10px] font-bold tabular-nums text-[#7c5738]">
                {dailyGiftCount}/{dailyGiftCap}
              </span>
            </div>
          </div>
        )}

        {/* 기록 진입점 */}
        <div className="mt-3 mb-4">
          <button
            onClick={() => setHistoryOpen(true)}
            className="w-full py-2.5 rounded-2xl font-bold text-[11px] active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5"
            style={{
              background: 'linear-gradient(135deg, rgba(167,139,250,0.14), rgba(236,72,153,0.10))',
              border: '1px solid rgba(167,139,250,0.3)',
              color: '#7c3aed',
            }}
          >
            <span>📜</span>
            <span>기록 — 소원 / 캡슐 / 외출</span>
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================================
// Empty State
// ============================================================
function EmptyState({ tab, hasFilter }: { tab: CategoryTab; hasFilter: boolean }) {
  if (hasFilter) {
    return (
      <div className="text-center py-14">
        <div className="text-3xl mb-2">🔍</div>
        <div className="text-[11.5px] text-[#7c5738] font-semibold mb-1">필터 결과가 없어</div>
        <div className="text-[10px] text-[#a1887f]">필터를 풀고 다시 봐줘</div>
      </div>
    );
  }
  const cfg = {
    gift:       { emoji: '🌫️', main: '아직 선물이 없어',  sub: '루나가 다음 외출에서 뭔가 사올 거야' },
    consumable: { emoji: '🍃', main: '비어있어',          sub: '사용하면 즉시 효과가 발동돼' },
    charm:      { emoji: '🎫', main: '부적도 티켓도 없어', sub: '가챠 결과나 업적에서 얻어' },
    sealed:     { emoji: '📜', main: '봉인할 게 없어',     sub: 'UR 등급에서 가끔 나타나' },
  }[tab];
  return (
    <div className="text-center py-14">
      <div className="text-3xl mb-2">{cfg.emoji}</div>
      <div className="text-[11.5px] text-[#7c5738] font-semibold mb-1">{cfg.main}</div>
      <div className="text-[10px] text-[#a1887f] leading-relaxed">{cfg.sub}</div>
    </div>
  );
}

// ============================================================
// Bag Cell
// ============================================================
function BagCell({ item, onSelect }: { item: Item; onSelect: () => void }) {
  const border = RARITY_BORDER[item.rarity] ?? RARITY_BORDER.N;
  const rBg = RARITY_BG[item.rarity] ?? RARITY_BG.N;
  const rGlow = RARITY_GLOW[item.rarity] ?? '';

  return (
    <button
      onClick={onSelect}
      className="aspect-square rounded-2xl p-1.5 flex flex-col items-center justify-end relative active:scale-95 transition-transform overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.92)',
        border: `1.5px solid ${border}`,
        boxShadow: item.used ? 'none' : `0 2px 8px rgba(0,0,0,0.06)${rGlow ? `, ${rGlow}` : ''}`,
        opacity: item.used ? 0.55 : 1,
      }}
    >
      {/* 사용가능 펄스 (rarity glow + 깜빡임) */}
      {item.isConsumable && !item.used && (
        <motion.div
          aria-hidden
          animate={{ opacity: [0.0, 0.18, 0.0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{ background: rBg, mixBlendMode: 'screen' }}
        />
      )}

      {/* USED 빗금 오버레이 */}
      {item.used && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{
            background: 'rgba(120,120,120,0.18)',
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(0,0,0,0.10) 6px, rgba(0,0,0,0.10) 8px)',
          }}
        />
      )}

      {/* 좌상단: rarity 칩 + ⭐ favorite */}
      <div className="absolute top-1 left-1 flex items-center gap-0.5 z-10">
        <span
          className="px-1 py-px rounded text-[7.5px] font-black leading-none"
          style={{ background: rBg, color: 'white', textShadow: '0 1px 1px rgba(0,0,0,0.2)' }}
        >
          {item.rarity}
        </span>
        {item.favorite && <span className="text-[10px] leading-none">⭐</span>}
      </div>

      {/* 우상단: ×qty 또는 ⚓ 장착 */}
      <div className="absolute top-1 right-1 flex items-center gap-0.5 z-10">
        {item.equipped && (
          <span className="text-[10px] leading-none" title="장착중">⚓</span>
        )}
        {item.quantity >= 2 && (
          <span
            className="px-1 py-px rounded-full text-[8px] font-black leading-none tabular-nums"
            style={{ background: 'rgba(60,40,30,0.85)', color: 'white' }}
          >
            ×{item.quantity}
          </span>
        )}
      </div>

      {/* 좌하단: NEW 점 */}
      {item.isNew && (
        <div
          aria-hidden
          className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full z-10"
          style={{ background: '#ec4899', boxShadow: '0 0 6px rgba(236,72,153,0.7)' }}
        />
      )}

      {/* 이모지 */}
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="text-[32px] leading-none">{item.emoji}</div>
      </div>

      {/* 이름 + Day */}
      <div className="w-full px-0.5 relative z-10">
        <div className="text-[9.5px] font-bold text-[#3a2418] truncate text-center">{item.name}</div>
        {item.acquiredDay !== null && (
          <div className="text-[8px] text-[#a1887f] tabular-nums text-center">D{item.acquiredDay}</div>
        )}
      </div>
    </button>
  );
}

// ============================================================
// Detail View — 9단 구조
// ============================================================
function DetailView({
  item,
  onBack,
  onUsed,
  onClose,
  onFavoriteToggle,
}: {
  item: Item;
  onBack: () => void;
  onUsed: () => void;
  onClose: () => void;
  onFavoriteToggle: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showLunaOpen, setShowLunaOpen] = useState(false);
  const [capsuleOpen, setCapsuleOpen] = useState(false);
  const [wishOpen, setWishOpen] = useState(false);
  const [giveOpen, setGiveOpen] = useState(false);
  const [acquisitionOpen, setAcquisitionOpen] = useState(false);
  const [batchQty, setBatchQty] = useState(1);
  const border = RARITY_BORDER[item.rarity] ?? RARITY_BORDER.N;
  const rBg = RARITY_BG[item.rarity] ?? RARITY_BG.N;
  const rGlow = RARITY_GLOW[item.rarity] ?? '';

  // 자동 NEW 클리어
  useEffect(() => {
    if (item.isNew) {
      fetch(`/api/luna-room/inventory/${item.id}/seen`, { method: 'POST' }).catch(() => {});
    }
  }, [item.id, item.isNew]);

  async function handleUse(qty = 1) {
    if (busy || item.used) return;
    if (item.useEffect === 'time_capsule') { setCapsuleOpen(true); return; }
    if (item.useEffect === 'wish') { setWishOpen(true); return; }
    setBusy(true);
    try {
      const qs = qty > 1 ? `?qty=${qty}` : '';
      const r = await fetch(`/api/luna-room/inventory/${item.id}/use${qs}`, { method: 'POST' });
      const d = await r.json();
      if (r.ok) {
        setToast(d.message ?? '사용 완료');
        setTimeout(() => { onUsed(); }, 1400);
      } else {
        setToast(d.error ?? '사용 실패');
        setTimeout(() => setToast(null), 1800);
      }
    } catch {
      setToast('연결이 잠깐 끊겼어');
      setTimeout(() => setToast(null), 1800);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Top bar */}
      <div className="flex-shrink-0 px-4 pt-safe pb-2 flex items-center justify-between" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 14px)' }}>
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full font-bold text-[11px] active:scale-[0.96] transition-transform"
          style={{ background: 'rgba(0,0,0,0.06)', color: '#7c5738' }}
        >
          <span>‹</span><span>가방</span>
        </button>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onFavoriteToggle}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[16px] active:scale-95 transition-transform"
            style={{
              background: item.favorite ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.85)',
              border: `1px solid ${item.favorite ? '#f59e0b' : 'rgba(245,158,11,0.3)'}`,
            }}
          >
            {item.favorite ? '⭐' : '☆'}
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: 'rgba(0,0,0,0.06)', color: '#7c5738' }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Scroll body */}
      <div className="flex-1 overflow-y-auto px-5 pb-32">
        {/* Hero 일러스트 */}
        <div className="flex justify-center pt-4">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="rounded-3xl flex items-center justify-center relative"
            style={{
              width: 180,
              height: 180,
              background: `radial-gradient(ellipse at top, ${rBg}28 0%, rgba(255,255,255,0.95) 60%)`,
              border: `2px solid ${border}`,
              boxShadow: `0 8px 30px rgba(0,0,0,0.10)${rGlow ? `, ${rGlow}` : ''}`,
              fontSize: 100,
            }}
          >
            {item.emoji}
            {/* UR/L 등급 후광 */}
            {(item.rarity === 'UR' || item.rarity === 'L') && (
              <motion.div
                aria-hidden
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{ boxShadow: `0 0 40px ${rBg}AA` }}
              />
            )}
          </motion.div>
        </div>

        {/* 이름 + rarity 칩 */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <span
            className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider"
            style={{ background: rBg, color: 'white' }}
          >
            {item.rarity}
          </span>
          <span className="text-[20px] font-black text-[#3a2418]">{item.name}</span>
        </div>
        {item.description && (
          <div className="text-[12px] text-[#7c5738]/75 italic text-center mt-1 leading-relaxed">
            {item.description}
          </div>
        )}

        {/* 메타 라인 */}
        <div className="flex justify-center mt-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 text-[10px] font-bold text-[#7c5738]">
            <span>{sourceLabel(item.source)}</span>
            {item.acquiredDay !== null && <><span className="opacity-40">·</span><span>Day {item.acquiredDay}</span></>}
            {item.quantity >= 2 && <><span className="opacity-40">·</span><span className="tabular-nums">×{item.quantity}</span></>}
          </div>
        </div>

        {/* 루나의 한 마디 */}
        {item.lunaNote && (
          <div className="mt-4 p-3.5 rounded-2xl"
            style={{
              background: '#fff8e7',
              border: '1px solid rgba(212,175,55,0.4)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
            }}
          >
            <div className="text-[9px] font-black text-[#7c5738]/60 mb-1.5 tracking-widest flex items-center gap-1">
              <span>💭</span><span>루나의 한 마디</span>
            </div>
            <div
              className="text-[#3a2418] text-[12.5px] leading-relaxed"
              style={{ fontFamily: 'var(--font-handwrite-soft)' }}
            >
              &ldquo;{item.lunaNote}&rdquo;
            </div>
          </div>
        )}

        {/* 사용 시 효과 (정량 progress bar 미리보기) */}
        {item.isConsumable && item.useEffect && !item.used && (
          <div className="mt-3 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
            <div className="text-[9.5px] font-black text-emerald-700 mb-1.5 tracking-widest flex items-center gap-1">
              <span>🍃</span><span>사용 시 효과</span>
            </div>
            <div className="text-[12px] text-emerald-900 leading-relaxed mb-2">
              {effectLabel(item.useEffect)}
            </div>
            <EffectPreview effect={item.useEffect} qty={batchQty} />
          </div>
        )}

        {/* 다음 행동 예측 */}
        {item.isConsumable && !item.used && predictionLabel(item.useEffect) && (
          <div className="mt-3 p-3.5 rounded-2xl bg-purple-50 border border-purple-200">
            <div className="text-[9.5px] font-black text-purple-700 mb-1.5 tracking-widest flex items-center gap-1">
              <span>🔮</span><span>다음 행동 예측</span>
            </div>
            <div className="text-[11.5px] text-purple-900 leading-relaxed">
              {predictionLabel(item.useEffect)}
            </div>
          </div>
        )}

        {/* 획득 정보 fold-out */}
        <button
          onClick={() => setAcquisitionOpen(!acquisitionOpen)}
          className="w-full mt-3 p-3 rounded-2xl text-left flex items-center justify-between active:scale-[0.99]"
          style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(212,175,55,0.25)' }}
        >
          <span className="text-[11px] font-bold text-[#7c5738] flex items-center gap-1">
            <span>📥</span><span>어디서 얻었어?</span>
          </span>
          <span className="text-[10px] text-[#a1887f]">{acquisitionOpen ? '▴' : '▾'}</span>
        </button>
        <AnimatePresence>
          {acquisitionOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="mt-2 p-3 rounded-2xl bg-white/60 border border-amber-100">
                <div className="text-[11px] text-[#7c5738] space-y-1">
                  <div>· {sourceLabel(item.source)} 으로 획득</div>
                  {item.acquiredDay !== null && <div>· Day {item.acquiredDay} — {new Date(item.acquiredAt).toLocaleDateString('ko-KR')}</div>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 일괄 사용 슬라이더 (qty >= 2) */}
        {item.isConsumable && !item.used && item.quantity >= 2 && (
          <div className="mt-3 p-3 rounded-2xl bg-amber-50 border border-amber-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10.5px] font-bold text-amber-800">한꺼번에 사용</span>
              <span className="text-[12px] font-black text-amber-700 tabular-nums">{batchQty}개</span>
            </div>
            <input
              type="range"
              min={1}
              max={Math.min(10, item.quantity)}
              value={batchQty}
              onChange={(e) => setBatchQty(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>
        )}

        {toast && (
          <div className="mt-3 text-center text-[11.5px] font-bold text-amber-700">{toast}</div>
        )}
      </div>

      {/* Sticky bottom 액션 */}
      <div className="flex-shrink-0 px-5 pb-safe pt-3 border-t border-amber-100"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
          background: 'linear-gradient(180deg, rgba(254,249,243,0) 0%, rgba(254,249,243,0.95) 30%, #ffe8d8 100%)',
        }}
      >
        <div className="space-y-2">
          {/* 카테고리 별 primary 액션 */}
          {item.category === 'gift' && !item.used && (
            <button
              onClick={() => setGiveOpen(true)}
              className="w-full py-3 rounded-2xl font-bold text-[13px] text-white active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(236,72,153,0.95), rgba(167,139,250,0.85))',
                boxShadow: '0 4px 14px rgba(236,72,153,0.30)',
              }}
            >
              🎁 루나에게 주기
            </button>
          )}

          {item.category === 'consumable' && item.isConsumable && !item.used && (
            <button
              onClick={() => handleUse(batchQty)}
              disabled={busy}
              className="w-full py-3 rounded-2xl text-white font-bold text-[13px] active:scale-[0.98] disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                boxShadow: '0 4px 14px rgba(16,185,129,0.30)',
              }}
            >
              {busy ? '사용 중…' : batchQty > 1 ? `🍃 ${batchQty}개 한꺼번에 쓰기` : useButtonLabel(item.useEffect)}
            </button>
          )}

          {item.category === 'charm' && item.isConsumable && !item.used && (
            <button
              onClick={() => handleUse(1)}
              disabled={busy}
              className="w-full py-3 rounded-2xl text-white font-bold text-[13px] active:scale-[0.98] disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                boxShadow: '0 4px 14px rgba(245,158,11,0.30)',
              }}
            >
              {busy ? '장착 중…' : useButtonLabel(item.useEffect)}
            </button>
          )}

          {item.category === 'sealed' && item.isConsumable && !item.used && (
            <button
              onClick={() => handleUse(1)}
              disabled={busy}
              className="w-full py-3 rounded-2xl text-white font-bold text-[13px] active:scale-[0.98] disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                boxShadow: '0 4px 14px rgba(167,139,250,0.30)',
              }}
            >
              {useButtonLabel(item.useEffect)}
            </button>
          )}

          {/* 보여주기 — 항상 가능 */}
          <button
            onClick={() => setShowLunaOpen(true)}
            className="w-full py-2.5 rounded-2xl font-bold text-[12px] text-white active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, rgba(251,191,36,0.85), rgba(236,72,153,0.75))',
              boxShadow: '0 2px 10px rgba(251,191,36,0.20)',
            }}
          >
            💬 루나에게 보여주기
          </button>
        </div>
      </div>

      {/* 모달 */}
      <LunaShowReaction
        open={showLunaOpen}
        inventoryItemId={item.id}
        onClose={() => setShowLunaOpen(false)}
      />
      <TimeCapsuleSealModal
        open={capsuleOpen}
        inventoryItemId={item.id}
        onClose={() => setCapsuleOpen(false)}
        onSealed={() => { setCapsuleOpen(false); onUsed(); }}
      />
      <WishMakeModal
        open={wishOpen}
        inventoryItemId={item.id}
        onClose={() => setWishOpen(false)}
        onMade={() => { setWishOpen(false); onUsed(); }}
      />
      <GiveToLunaCeremony
        open={giveOpen}
        inventoryItemId={item.id}
        itemEmoji={item.emoji}
        itemName={item.name}
        onClose={() => setGiveOpen(false)}
        onGiven={() => { setGiveOpen(false); onUsed(); }}
      />
    </>
  );
}

// ============================================================
// Effect Preview — 정량 progress bar
// ============================================================
function EffectPreview({ effect, qty }: { effect: string | null; qty: number }) {
  if (!effect) return null;

  const previews: Record<string, { label: string; before: number; after: number; max: number; color: string }> = {
    mood_calm:                { label: '정령 mood',       before: 60, after: Math.min(100, 60 + 6 * qty), max: 100, color: '#22c55e' },
    room_mood_calm_strong:    { label: '정령 mood (강)',   before: 50, after: Math.min(100, 50 + 15 * qty), max: 100, color: '#10b981' },
    spirit_mood_boost:        { label: '정령 mood + bond', before: 55, after: Math.min(100, 55 + 12 * qty), max: 100, color: '#84cc16' },
    intimacy_axis_plus:       { label: '4축 1개 (선택)',   before: 40, after: Math.min(100, 40 + 5 * qty), max: 100, color: '#ec4899' },
    gacha_luck:               { label: '다음 가챠 SR+',    before: 3,  after: 4.5, max: 10, color: '#f59e0b' },
    dex_fragment_add:         { label: '도감 조각',         before: 0,  after: qty, max: 10, color: '#a855f7' },
  };

  const p = previews[effect];
  if (!p) return null;

  const pct = (v: number) => Math.min(100, (v / p.max) * 100);

  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="text-[#1f2937] font-bold flex-shrink-0">{p.label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0" style={{ width: `${pct(p.before)}%`, background: 'rgba(0,0,0,0.15)' }} />
        <motion.div
          initial={{ width: `${pct(p.before)}%` }}
          animate={{ width: `${pct(p.after)}%` }}
          transition={{ duration: 0.6, type: 'spring' }}
          className="absolute left-0 top-0 bottom-0"
          style={{ background: p.color }}
        />
      </div>
      <span className="font-bold tabular-nums text-[#1f2937] flex-shrink-0">
        {p.before} → {p.after}
      </span>
    </div>
  );
}

// ============================================================
// 헬퍼
// ============================================================
function useButtonLabel(effect: string | null): string {
  switch (effect) {
    case 'time_capsule':            return '⌛ 봉인하기';
    case 'wish':                    return '🕊️ 소원 빌기';
    case 'mood_calm':               return '🕯️ 켜기';
    case 'room_mood_calm_strong':   return '🕯️ 향초 켜기';
    case 'gacha_luck':              return '🍀 부적 장착';
    case 'gacha_pity_force':        return '🎰 보장권 장착';
    case 'memory_pin':              return '⭐ 별 켜기';
    case 'model_upgrade_smart':     return '🧠 다음 응답에 적용';
    case 'tone_blunt_oneturn':      return '🗯️ 다음 응답에 적용';
    case 'tone_soothing_session':   return '🫂 이번 세션 위로 모드';
    case 'right_brain_boost':       return '💞 3턴 공감 모드';
    case 'pipeline_full_diagnostic':return '🔍 풀-진단 모드';
    case 'diagnosis_full_report':   return '📋 진단 리포트 예약';
    case 'rate_limit_bypass_24h':   return '♾️ 24h 패스 활성';
    case 'tarot_card_bonus':        return '🃏 다음 타로 +1장';
    case 'signature_preview_unlock':return '🎬 시그니처 보기';
    case 'dex_fragment_add':        return '🧩 도감 조각 적립';
    case 'scenario_reroll':         return '🎲 시나리오 재배정';
    case 'spirit_mood_boost':       return '🍪 정령에게 주기';
    case 'intimacy_axis_plus':      return '💗 친밀도 부스트';
    case 'room_slot_reroll':        return '🛋️ 가구 리뉴얼';
    case 'mission_reset':           return '🔄 미션 리셋';
    default:                        return '사용하기';
  }
}

function sourceLabel(s: string): string {
  switch (s) {
    case 'luna_shopping': return '🛍️ 루나의 선물';
    case 'gacha':         return '🎰 가챠';
    case 'achievement':   return '🏆 업적';
    case 'system':        return '🎀 시스템';
    default:              return s;
  }
}

function effectLabel(e: string): string {
  switch (e) {
    case 'mood_calm':               return '방 안 친구들 mood 살짝 회복 (+6)';
    case 'room_mood_calm_strong':   return '방 안 전체 mood +15, 1시간 decay 정지';
    case 'gacha_luck':              return '다음 가챠 1회 SR+ 확률 ×1.5';
    case 'gacha_pity_force':        return '다음 10연차에서 SR+ 1매 보장';
    case 'memory_pin':              return '직전 7일 내 최고 감정 카드 자동 핀';
    case 'time_capsule':            return '7일 / 14일 / 30일 봉인 (곧 풀어볼 수 있어)';
    case 'wish':                    return '한 번의 소원 — 어딘가로 흘러감';
    case 'model_upgrade_smart':     return '다음 1턴 더 깊이 사고하는 모드 (Gemini 3)';
    case 'tone_blunt_oneturn':      return '다음 1턴 베테랑처럼 직설적으로';
    case 'tone_soothing_session':   return '이번 세션은 위로 톤만 (직면/팩폭 회피)';
    case 'right_brain_boost':       return '다음 3턴 길고 풍부한 감정 표현';
    case 'pipeline_full_diagnostic':return '이번 세션 매턴 풀-진단 모드';
    case 'diagnosis_full_report':   return '다음 세션 종료 시 진단 리포트 카드';
    case 'rate_limit_bypass_24h':   return '24시간 메시지 캡 해제';
    case 'tarot_card_bonus':        return '다음 타로 스프레드에 카드 1장 추가';
    case 'signature_preview_unlock':return '미해금 정령의 시그니처 무브 1회 재생';
    case 'dex_fragment_add':        return '도감 조각 +1 (10개 = 페이지 영구 unlock)';
    case 'scenario_reroll':         return '현재 세션 시나리오 다시 선택';
    case 'spirit_mood_boost':       return '선택한 정령 mood +12, bond +0.3';
    case 'intimacy_axis_plus':      return '4축 중 1축 +5 (캡 무시)';
    case 'room_slot_reroll':        return '가구 슬롯 1개 즉시 재추첨';
    case 'mission_reset':           return '완료한 일일 미션 3건 즉시 리셋';
    default:                        return '특별한 효과가 있을 거야';
  }
}

function predictionLabel(e: string | null): string | null {
  switch (e) {
    case 'model_upgrade_smart':     return '사용 후 다음 응답은 Gemini 3 Flash Preview 모델로 더 깊이 분석돼';
    case 'pipeline_full_diagnostic':return '응답이 평소보다 조금 느릴 수 있지만 분석 깊이가 깊어져';
    case 'right_brain_boost':       return '응답이 평소보다 길고 감정 표현이 풍부해져';
    case 'gacha_luck':              return '다음 가챠 1회에만 효과 (사용 후 자동 해제)';
    case 'gacha_pity_force':        return '다음 10연차 결과에 SR 이상 1매가 무조건 포함돼';
    case 'rate_limit_bypass_24h':   return '활성 후 24시간 동안 메시지 무제한 (서버 안전망 200msg/24h)';
    case 'diagnosis_full_report':   return '다음 세션 끝나면 별도 카드로 결과가 도착해';
    default:                        return null;
  }
}
