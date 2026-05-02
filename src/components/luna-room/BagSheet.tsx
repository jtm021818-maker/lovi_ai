'use client';

/**
 * v104: BagSheet
 *
 * 루나 룸 가방 — 인벤토리 메인 시트.
 * 카테고리 탭 + 그리드 + 디테일 시트 + 소모품 사용.
 *
 * Bento Box 미감 + Genshin 카테고리 탭 + Persona 5 액션 모델.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LunaShowReaction from './LunaShowReaction';
import { TimeCapsuleSealModal, WishMakeModal } from './CapsuleAndWishModals';
import WishCapsuleHistory from './WishCapsuleHistory';
import GiveToLunaCeremony from './GiveToLunaCeremony';

interface Item {
  id: string;
  itemId: string;
  name: string;
  emoji: string;
  category: 'gift' | 'gacha' | 'consumable';
  rarity: string;
  description: string;
  source: string;
  acquiredAt: string;
  acquiredDay: number | null;
  lunaNote: string | null;
  isNew: boolean;
  isConsumable: boolean;
  useEffect: string | null;
  used: boolean;
}

interface Counts { all: number; gift: number; gacha: number; consumable: number }

type CategoryTab = 'gift' | 'consumable' | 'gacha';

interface Props {
  open: boolean;
  onClose: () => void;
}

const RARITY_BORDER: Record<string, string> = {
  N:  'rgba(156,163,175,0.4)',
  R:  'rgba(96,165,250,0.55)',
  SR: 'rgba(192,132,252,0.6)',
  UR: 'rgba(251,191,36,0.7)',
  L:  'rgba(6,182,212,0.7)',
};

export default function BagSheet({ open, onClose }: Props) {
  const [tab, setTab] = useState<CategoryTab>('gift');
  const [items, setItems] = useState<Item[]>([]);
  const [counts, setCounts] = useState<Counts>({ all: 0, gift: 0, gacha: 0, consumable: 0 });
  const [selected, setSelected] = useState<Item | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/luna-room/inventory');
      const d = await r.json();
      setItems(d.items ?? []);
      setCounts(d.counts ?? { all: 0, gift: 0, gacha: 0, consumable: 0 });
    } catch { /* silent */ } finally { setLoading(false); }
  }

  useEffect(() => {
    if (open) load();
  }, [open]);

  const filtered = items.filter((i) => i.category === tab);

  const tabConfig: Array<{ key: CategoryTab; label: string; icon: string; count: number }> = [
    { key: 'gift',       label: '선물',   icon: '🎁', count: counts.gift },
    { key: 'consumable', label: '소모품', icon: '🍃', count: counts.consumable },
    { key: 'gacha',      label: '뽑기',   icon: '🎰', count: counts.gacha },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bag-bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-black/55 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="bag-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-[201] max-h-[88vh] overflow-y-auto rounded-t-[28px]"
            style={{ background: 'linear-gradient(180deg, #fef9f3 0%, #ffe8d8 100%)' }}
          >
            {/* drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-[3px] rounded-full bg-amber-900/25" />
            </div>

            {/* 헤더 */}
            <div className="px-5 pt-2 pb-3 text-center">
              <div className="text-[13px] font-black tracking-widest text-[#7c5738] mb-0.5">
                🎒 가방
              </div>
              <div className="text-[10px] text-[#a1887f]">
                루나가 사다 준 것 + 뽑기로 얻은 것 — 전부 여기에
              </div>
            </div>

            {/* 카테고리 탭 */}
            <div className="px-4 mb-3 flex gap-1.5">
              {tabConfig.map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className="flex-1 py-2 rounded-xl active:scale-[0.97] transition-all flex flex-col items-center gap-0.5"
                    style={{
                      background: active
                        ? 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(236,72,153,0.10))'
                        : 'rgba(255,255,255,0.7)',
                      border: `1.5px solid ${active ? 'rgba(251,191,36,0.45)' : 'rgba(212,175,55,0.20)'}`,
                      boxShadow: active ? '0 0 12px rgba(251,191,36,0.18)' : 'none',
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-[14px]">{t.icon}</span>
                      <span className={`text-[11px] font-bold ${active ? 'text-[#92400e]' : 'text-[#7c5738]'}`}>
                        {t.label}
                      </span>
                    </div>
                    <div className={`text-[9px] tabular-nums ${active ? 'text-[#b45309]' : 'text-[#a1887f]'}`}>
                      {t.count}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 그리드 */}
            <div className="px-4 pb-8">
              {loading && (
                <div className="text-center text-[11px] text-[#a1887f] py-12">불러오는 중…</div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="text-center py-14">
                  <div className="text-3xl mb-2">🌫️</div>
                  <div className="text-[11.5px] text-[#7c5738] font-semibold mb-1">
                    아직 비어있어
                  </div>
                  <div className="text-[10px] text-[#a1887f] leading-relaxed">
                    {tab === 'gift'
                      ? '루나가 곧 뭔가 사올 거야'
                      : tab === 'consumable'
                      ? '쓸 만한 게 모이면 여기 들어와'
                      : '가챠 부산물은 여기에 모여'}
                  </div>
                </div>
              )}
              {!loading && filtered.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {filtered.map((item) => (
                    <BagCell key={item.id} item={item} onSelect={() => setSelected(item)} />
                  ))}
                </div>
              )}
            </div>

            {/* 기록 진입점 */}
            <div className="px-4 mb-2">
              <button
                onClick={() => setHistoryOpen(true)}
                className="w-full py-2.5 rounded-2xl font-bold text-[11px] active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5"
                style={{
                  background: 'linear-gradient(135deg, rgba(167,139,250,0.12), rgba(236,72,153,0.08))',
                  border: '1px solid rgba(167,139,250,0.3)',
                  color: '#7c3aed',
                }}
              >
                <span>📜</span>
                <span>기록 — 소원 / 캡슐 / 외출</span>
              </button>
            </div>

            {/* 닫기 */}
            <div className="px-4 pb-8">
              <button
                onClick={onClose}
                className="w-full py-3.5 rounded-2xl font-bold text-[12px] active:scale-[0.98] transition-transform"
                style={{
                  background: 'rgba(0,0,0,0.06)',
                  color: '#7c5738',
                }}
              >
                닫기
              </button>
            </div>
          </motion.div>

          {/* 기록 시트 */}
          <WishCapsuleHistory open={historyOpen} onClose={() => setHistoryOpen(false)} />

          {/* 디테일 시트 */}
          {selected && (
            <ItemDetailSheet
              item={selected}
              onClose={() => setSelected(null)}
              onUsed={async () => { await load(); setSelected(null); }}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────

function BagCell({ item, onSelect }: { item: Item; onSelect: () => void }) {
  const border = RARITY_BORDER[item.rarity] ?? RARITY_BORDER.N;
  return (
    <button
      onClick={onSelect}
      className="aspect-square rounded-2xl p-2 flex flex-col items-center justify-center relative active:scale-95 transition-transform"
      style={{
        background: 'rgba(255,255,255,0.92)',
        border: `1.5px solid ${border}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        opacity: item.used ? 0.5 : 1,
      }}
    >
      {item.isNew && (
        <div
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[8px] font-black flex items-center justify-center"
          style={{ background: '#ec4899', color: 'white', boxShadow: '0 0 8px rgba(236,72,153,0.5)' }}
        >
          N
        </div>
      )}
      {item.used && (
        <div className="absolute top-1 left-1 px-1 py-0.5 rounded text-[7px] font-black bg-black/30 text-white">
          USED
        </div>
      )}
      <div className="text-[36px] leading-none mb-1">{item.emoji}</div>
      <div className="text-[9.5px] font-bold text-[#3a2418] truncate max-w-full px-0.5">
        {item.name}
      </div>
      {item.acquiredDay !== null && (
        <div className="text-[8px] text-[#a1887f] tabular-nums">D{item.acquiredDay}</div>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────

function ItemDetailSheet({ item, onClose, onUsed }: {
  item: Item;
  onClose: () => void;
  onUsed: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showLunaOpen, setShowLunaOpen] = useState(false);
  const [capsuleOpen, setCapsuleOpen] = useState(false);
  const [wishOpen, setWishOpen] = useState(false);
  const [giveOpen, setGiveOpen] = useState(false);
  const border = RARITY_BORDER[item.rarity] ?? RARITY_BORDER.N;

  // 자동 NEW 클리어
  useEffect(() => {
    if (item.isNew) {
      fetch(`/api/luna-room/inventory/${item.id}/seen`, { method: 'POST' }).catch(() => {});
    }
  }, [item.id, item.isNew]);

  async function handleUse() {
    if (busy || item.used) return;
    // 특수 분기: time_capsule / wish 는 모달 열기
    if (item.useEffect === 'time_capsule') { setCapsuleOpen(true); return; }
    if (item.useEffect === 'wish') { setWishOpen(true); return; }
    setBusy(true);
    try {
      const r = await fetch(`/api/luna-room/inventory/${item.id}/use`, { method: 'POST' });
      const d = await r.json();
      if (r.ok) {
        setToast(d.message ?? '사용 완료');
        setTimeout(() => { onUsed(); }, 1500);
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[210] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="fixed bottom-0 left-0 right-0 z-[211] max-h-[80vh] overflow-y-auto rounded-t-[28px]"
        style={{ background: 'linear-gradient(180deg, #fef9f3 0%, #ffe8d8 100%)' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-[3px] rounded-full bg-amber-900/25" />
        </div>

        {/* 일러스트 */}
        <div className="px-6 pt-3 flex justify-center">
          <div
            className="rounded-3xl flex items-center justify-center"
            style={{
              width: 140,
              height: 140,
              background: `linear-gradient(145deg, rgba(255,255,255,0.95), rgba(254,243,229,0.9))`,
              border: `1.5px solid ${border}`,
              boxShadow: `0 4px 20px rgba(0,0,0,0.10)`,
              fontSize: 88,
            }}
          >
            {item.emoji}
          </div>
        </div>

        {/* 정보 */}
        <div className="px-6 pt-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span
              className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider"
              style={{ background: border, color: 'white' }}
            >
              {item.rarity}
            </span>
            <span className="text-[18px] font-black text-[#3a2418]">{item.name}</span>
          </div>
          {item.description && (
            <div className="text-[11px] text-[#7c5738]/75 italic mb-2 leading-relaxed">
              {item.description}
            </div>
          )}
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/70 text-[9.5px] font-bold text-[#7c5738]">
            <span>{sourceLabel(item.source)}</span>
            {item.acquiredDay !== null && <><span className="opacity-50">·</span><span>Day {item.acquiredDay}</span></>}
          </div>
        </div>

        {/* 루나 노트 */}
        {item.lunaNote && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl"
            style={{
              background: '#fff8e7',
              border: '1px solid rgba(212,175,55,0.4)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
            }}
          >
            <div className="text-[9px] font-black text-[#7c5738]/60 mb-1.5 tracking-widest">
              루나의 한 마디
            </div>
            <div
              className="text-[#3a2418] text-[12px] leading-relaxed"
              style={{ fontFamily: 'serif' }}
            >
              “{item.lunaNote}”
            </div>
          </div>
        )}

        {/* 효과 */}
        {item.isConsumable && item.useEffect && !item.used && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-purple-50 border border-purple-200">
            <div className="text-[9.5px] font-bold text-purple-700 mb-0.5">사용 시 효과</div>
            <div className="text-[11px] text-purple-900 leading-relaxed">
              {effectLabel(item.useEffect)}
            </div>
          </div>
        )}

        {toast && (
          <div className="mt-3 text-center text-[11px] font-bold text-amber-700">{toast}</div>
        )}

        {/* 액션 */}
        <div className="px-6 pb-2 pt-3 space-y-2">
          {/* 루나에게 보여주기 — 모든 아이템 */}
          <button
            onClick={() => setShowLunaOpen(true)}
            className="w-full py-3 rounded-2xl font-bold text-[12px] text-white active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, rgba(251,191,36,0.95), rgba(236,72,153,0.85))',
              boxShadow: '0 2px 10px rgba(251,191,36,0.25)',
            }}
          >
            💬 루나에게 보여주기
          </button>

          {/* 루나에게 주기 — 안 쓴 아이템만 */}
          {!item.used && (
            <button
              onClick={() => setGiveOpen(true)}
              className="w-full py-3 rounded-2xl font-bold text-[12px] text-white active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(236,72,153,0.95), rgba(167,139,250,0.85))',
                boxShadow: '0 2px 10px rgba(236,72,153,0.25)',
              }}
            >
              🎁 루나에게 주기
            </button>
          )}

          {/* 소모품 사용 */}
          {item.isConsumable && !item.used && (
            <button
              onClick={handleUse}
              disabled={busy}
              className="w-full py-3 rounded-2xl text-white font-bold text-[12px] active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              {busy ? '사용 중…' : useButtonLabel(item.useEffect)}
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl font-bold text-[12px] active:scale-[0.98]"
            style={{ background: 'rgba(0,0,0,0.06)', color: '#7c5738' }}
          >
            {item.isConsumable && item.used ? '닫기' : '간직하기'}
          </button>
        </div>
        <div className="pb-6" />
      </motion.div>

      {/* 3개 액션 모달 */}
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

function useButtonLabel(effect: string | null): string {
  switch (effect) {
    case 'time_capsule': return '⌛ 봉인하기';
    case 'wish':         return '🕊️ 소원 빌기';
    case 'mood_calm':    return '🕯️ 켜기';
    case 'gacha_luck':   return '🍀 행운 부르기';
    case 'memory_pin':   return '⭐ 별 켜기';
    default:             return '사용하기';
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
    case 'mood_calm':    return '방 안 친구들의 무드를 살짝 회복시켜';
    case 'gacha_luck':   return '다음 뽑기에 작은 행운이 따라옴';
    case 'memory_pin':   return '기억의 별자리에 별 하나가 더 켜짐';
    case 'time_capsule': return '7일 / 14일 / 30일 봉인 (곧 풀어볼 수 있어)';
    case 'wish':         return '한 번의 소원 — 어딘가로 흘러감';
    default:             return '특별한 효과가 있을 거야';
  }
}
