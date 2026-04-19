/**
 * 🧚 v83: Bond Level Engine
 */

import type { BondLv } from '@/types/spirit.types';

/** 누적 XP 기준 Lv 테이블 */
export const BOND_LV_XP_TABLE: Record<BondLv, number> = {
  1: 0,
  2: 100,
  3: 300,
  4: 700,
  5: 1500,
};

export function calcBondLv(xp: number): BondLv {
  if (xp >= BOND_LV_XP_TABLE[5]) return 5;
  if (xp >= BOND_LV_XP_TABLE[4]) return 4;
  if (xp >= BOND_LV_XP_TABLE[3]) return 3;
  if (xp >= BOND_LV_XP_TABLE[2]) return 2;
  return 1;
}

export function calcNextLvXp(lv: BondLv): number | null {
  if (lv === 5) return null;
  return BOND_LV_XP_TABLE[(lv + 1) as BondLv];
}

export function calcLvProgress(xp: number, lv: BondLv): number {
  const curr = BOND_LV_XP_TABLE[lv];
  const next = calcNextLvXp(lv);
  if (next === null) return 1;
  return Math.min(1, (xp - curr) / (next - curr));
}
