'use client';

/**
 * 🗂️ v85.3: DexGrid — 그리드 + 필터/정렬 로직
 *
 * 입력: 전체 마스터 + owned 배열 + DexFilterState
 * 출력: 조건 맞는 정령만 4열 그리드로 렌더 + 빈 결과 엠프티.
 */

import type { SpiritMaster, UserSpirit, SpiritRarity } from '@/types/spirit.types';
import type { DexFilterState } from './DexFilters';
import DexCard from './DexCard';

const RARITY_WEIGHT: Record<SpiritRarity, number> = { L: 5, UR: 4, SR: 3, R: 2, N: 1 };

interface Props {
  spirits: SpiritMaster[];
  owned: UserSpirit[];
  filter: DexFilterState;
  onSelect: (spirit: SpiritMaster, owned: UserSpirit | null) => void;
}

export default function DexGrid({ spirits, owned, filter, onSelect }: Props) {
  const ownedMap = new Map(owned.map((o) => [o.spiritId, o]));

  // 필터링
  const filtered = spirits.filter((s) => {
    // 레어도 필터 (집합 비어있으면 전체 허용)
    if (filter.rarities.size > 0 && !filter.rarities.has(s.rarity as SpiritRarity)) {
      return false;
    }
    const us = ownedMap.get(s.id);
    switch (filter.status) {
      case 'owned': return !!us;
      case 'locked': return !us;
      case 'maxed': return us?.bondLv === 5;
      case 'all':
      default:
        return true;
    }
  });

  // 정렬
  const sorted = [...filtered].sort((a, b) => {
    switch (filter.sort) {
      case 'rarity': {
        const wd = RARITY_WEIGHT[b.rarity as SpiritRarity] - RARITY_WEIGHT[a.rarity as SpiritRarity];
        if (wd !== 0) return wd;
        return a.name.localeCompare(b.name, 'ko');
      }
      case 'name':
        return a.name.localeCompare(b.name, 'ko');
      case 'recent':
      default: {
        const ua = ownedMap.get(a.id);
        const ub = ownedMap.get(b.id);
        // 소지한 건 앞으로, 그중 최근 만난 순
        if (ua && ub) {
          return (ub.firstObtainedAt || '').localeCompare(ua.firstObtainedAt || '');
        }
        if (ua && !ub) return -1;
        if (!ua && ub) return 1;
        // 둘 다 미소지 — 레어도 낮은 순 (보통 퀘스트 순서)
        return RARITY_WEIGHT[a.rarity as SpiritRarity] - RARITY_WEIGHT[b.rarity as SpiritRarity];
      }
    }
  });

  if (sorted.length === 0) {
    return (
      <div className="px-5 py-12 text-center">
        <div className="text-[32px] mb-2 opacity-50">🪺</div>
        <p className="text-[12px] text-amber-100/70 font-medium">
          조건에 맞는 정령이 없어
        </p>
        <p className="mt-1 text-[10px] text-amber-100/50">
          필터를 바꿔보자
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-5">
      <div className="grid grid-cols-4 gap-2.5">
        {sorted.map((s, idx) => (
          <DexCard
            key={s.id}
            spirit={s}
            owned={ownedMap.get(s.id) ?? null}
            onClick={() => onSelect(s, ownedMap.get(s.id) ?? null)}
            index={idx}
          />
        ))}
      </div>
    </div>
  );
}
