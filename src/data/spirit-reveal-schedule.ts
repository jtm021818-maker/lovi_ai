/**
 * v102: 정령 비밀 점진적 해금 스케줄
 *
 * 두 게이트(Bond Lv5 + Day ≥ revealDay) 모두 만족해야 backstory 공개.
 * loreUnlockAfter 는 L3(어머니 일기) 잠금 추가 조건 — 다른 정령 L2 누적 해금 수.
 * motherLoreOrder 는 어머니 일기 책의 페이지 순서(1~21).
 */

export interface SpiritRevealEntry {
  spiritId: string;
  revealDay: number;
  loreUnlockAfter: number;
  motherLoreOrder: number;
}

export const SPIRIT_REVEAL_SCHEDULE: SpiritRevealEntry[] = [
  // N (6) — Day 5~44, 어머니가 처음 흩어보낸 조각들
  { spiritId: 'seed_spirit',     revealDay: 5,  loreUnlockAfter: 0,  motherLoreOrder: 1  },
  { spiritId: 'tear_drop',       revealDay: 12, loreUnlockAfter: 1,  motherLoreOrder: 2  },
  { spiritId: 'fire_goblin',     revealDay: 20, loreUnlockAfter: 2,  motherLoreOrder: 3  },
  { spiritId: 'drum_imp',        revealDay: 28, loreUnlockAfter: 3,  motherLoreOrder: 4  },
  { spiritId: 'book_worm',       revealDay: 36, loreUnlockAfter: 4,  motherLoreOrder: 5  },
  { spiritId: 'peace_dove',      revealDay: 44, loreUnlockAfter: 5,  motherLoreOrder: 6  },
  // R (7) — Day 50~84, 어머니의 일상이 무너지던 시기
  { spiritId: 'cloud_bunny',     revealDay: 50, loreUnlockAfter: 6,  motherLoreOrder: 7  },
  { spiritId: 'wind_sprite',     revealDay: 56, loreUnlockAfter: 7,  motherLoreOrder: 8  },
  { spiritId: 'letter_fairy',    revealDay: 62, loreUnlockAfter: 8,  motherLoreOrder: 9  },
  { spiritId: 'rose_fairy',      revealDay: 68, loreUnlockAfter: 9,  motherLoreOrder: 10 },
  { spiritId: 'clown_harley',    revealDay: 74, loreUnlockAfter: 10, motherLoreOrder: 11 },
  { spiritId: 'forest_mom',      revealDay: 80, loreUnlockAfter: 11, motherLoreOrder: 12 },
  { spiritId: 'moon_rabbit',     revealDay: 84, loreUnlockAfter: 12, motherLoreOrder: 13 },
  // SR (5) — Day 87~96, 어머니가 떠나는 결심에 다가가던 7일
  { spiritId: 'cherry_leaf',     revealDay: 87, loreUnlockAfter: 13, motherLoreOrder: 14 },
  { spiritId: 'ice_prince',      revealDay: 90, loreUnlockAfter: 14, motherLoreOrder: 15 },
  { spiritId: 'lightning_bird',  revealDay: 92, loreUnlockAfter: 15, motherLoreOrder: 16 },
  { spiritId: 'butterfly_meta',  revealDay: 94, loreUnlockAfter: 16, motherLoreOrder: 17 },
  { spiritId: 'book_keeper',     revealDay: 96, loreUnlockAfter: 17, motherLoreOrder: 18 },
  // UR (2) — Day 97~98, 어머니의 마지막 결단
  { spiritId: 'queen_elena',     revealDay: 97, loreUnlockAfter: 18, motherLoreOrder: 19 },
  { spiritId: 'star_dust',       revealDay: 98, loreUnlockAfter: 19, motherLoreOrder: 20 },
  // L (1) — Day 99, 모든 조각이 모인 다음 날
  { spiritId: 'guardian_eddy',   revealDay: 99, loreUnlockAfter: 20, motherLoreOrder: 21 },
];

export function getRevealEntry(spiritId: string): SpiritRevealEntry | undefined {
  return SPIRIT_REVEAL_SCHEDULE.find((e) => e.spiritId === spiritId);
}

export function getRevealDay(spiritId: string): number {
  return getRevealEntry(spiritId)?.revealDay ?? 0;
}

/** Day 가 도달했고 Lv 5 이면 backstory(L2) 공개 */
export function isBackstoryUnlockable(spiritId: string, ageDays: number, bondLv: number): boolean {
  const entry = getRevealEntry(spiritId);
  if (!entry) return bondLv >= 5; // 스케줄 미정의 정령은 Lv 게이트만
  return bondLv >= 5 && ageDays >= entry.revealDay;
}

/** L3(어머니 일기) 추가 게이트 */
export function isLoreUnlockable(
  spiritId: string,
  ageDays: number,
  bondLv: number,
  totalUnlockedL2: number,
): boolean {
  const entry = getRevealEntry(spiritId);
  if (!entry) return false;
  return (
    bondLv >= 5 &&
    ageDays >= entry.revealDay &&
    totalUnlockedL2 >= entry.loreUnlockAfter
  );
}

/** 정령 ID → 어머니 일기 페이지 (1~21) */
export function getMotherLorePage(spiritId: string): number | null {
  return getRevealEntry(spiritId)?.motherLoreOrder ?? null;
}
