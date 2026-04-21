'use client';

/**
 * 🎚️ v85.3: DexFilters — 필터 탭 + 정렬
 *
 * 필터 탭: 전체 / 만난 / 아직 / Lv.5
 * 레어도 칩 토글 (N R SR UR L)
 * 정렬: 만난순 / 레어도 / 이름
 */

import type { SpiritRarity } from '@/types/spirit.types';
import { RARITY_META } from './RarityBadge';

export type DexStatus = 'all' | 'owned' | 'locked' | 'maxed';
export type DexSort = 'recent' | 'rarity' | 'name';

export interface DexFilterState {
  status: DexStatus;
  rarities: Set<SpiritRarity>;
  sort: DexSort;
}

interface Props {
  filter: DexFilterState;
  onChange: (next: DexFilterState) => void;
}

const STATUS_TABS: { key: DexStatus; label: string; icon: string }[] = [
  { key: 'all', label: '전체', icon: '✨' },
  { key: 'owned', label: '만난', icon: '💝' },
  { key: 'locked', label: '아직', icon: '❓' },
  { key: 'maxed', label: 'MAX', icon: '👑' },
];

const SORT_LABELS: Record<DexSort, string> = {
  recent: '만난 순',
  rarity: '레어도',
  name: '이름',
};

const RARITY_ORDER: SpiritRarity[] = ['N', 'R', 'SR', 'UR', 'L'];

export default function DexFilters({ filter, onChange }: Props) {
  const toggleRarity = (r: SpiritRarity) => {
    const next = new Set(filter.rarities);
    if (next.has(r)) next.delete(r);
    else next.add(r);
    onChange({ ...filter, rarities: next });
  };

  return (
    <div className="px-5 pb-3">
      {/* 상태 탭 */}
      <div
        className="grid grid-cols-4 gap-1.5 p-1 rounded-xl mb-2.5"
        style={{
          background: 'rgba(0,0,0,0.35)',
          boxShadow: 'inset 0 2px 3px rgba(0,0,0,0.4)',
        }}
      >
        {STATUS_TABS.map((tab) => {
          const active = filter.status === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange({ ...filter, status: tab.key })}
              className="py-1.5 rounded-lg text-[10.5px] font-bold transition-all flex items-center justify-center gap-1"
              style={
                active
                  ? {
                      background: 'linear-gradient(180deg, #d4af37 0%, #8f6f1c 100%)',
                      color: '#2a1800',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,235,180,0.5)',
                    }
                  : {
                      background: 'transparent',
                      color: 'rgba(255,235,200,0.65)',
                    }
              }
            >
              <span className="text-[10px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 레어도 칩 */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <span className="text-[9px] tracking-widest text-amber-100/60 mr-1">RARITY</span>
        {RARITY_ORDER.map((r) => {
          const active = filter.rarities.has(r);
          const meta = RARITY_META[r];
          return (
            <button
              key={r}
              onClick={() => toggleRarity(r)}
              className="text-[9.5px] font-black tracking-wider px-2 py-0.5 rounded-full transition-all"
              style={
                active
                  ? {
                      background: `linear-gradient(135deg, ${meta.colorFrom} 0%, ${meta.colorTo} 100%)`,
                      color: meta.textColor,
                      boxShadow: `0 2px 6px ${meta.glow}, inset 0 1px 0 rgba(255,255,255,0.4)`,
                    }
                  : {
                      background: 'rgba(0,0,0,0.3)',
                      color: 'rgba(255,235,200,0.5)',
                      boxShadow: `inset 0 0 0 1px ${meta.border}`,
                    }
              }
            >
              {r}
            </button>
          );
        })}
      </div>

      {/* 정렬 */}
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] tracking-widest text-amber-100/60">SORT</span>
        <div
          className="flex p-0.5 rounded-lg"
          style={{ background: 'rgba(0,0,0,0.35)' }}
        >
          {(Object.keys(SORT_LABELS) as DexSort[]).map((s) => {
            const active = filter.sort === s;
            return (
              <button
                key={s}
                onClick={() => onChange({ ...filter, sort: s })}
                className="px-2 py-0.5 rounded-md text-[9.5px] font-bold transition-all"
                style={
                  active
                    ? {
                        background: 'rgba(212,175,55,0.8)',
                        color: '#2a1800',
                      }
                    : { color: 'rgba(255,235,200,0.65)' }
                }
              >
                {SORT_LABELS[s]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
