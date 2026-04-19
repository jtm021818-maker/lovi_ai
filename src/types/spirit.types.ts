/**
 * 🧚 v83: Luna Spirit Collection — Core Types
 */

export type SpiritRarity = 'N' | 'R' | 'SR' | 'UR' | 'L';

export type SpiritId = string; // e.g. 'cherry_leaf', 'fire_goblin'

export type BondLv = 1 | 2 | 3 | 4 | 5;

export interface SpiritMaster {
  id: SpiritId;
  emoji: string;
  name: string;
  rarity: SpiritRarity;
  /** 한 줄 성격 요약 */
  personality: string;
  /** 말투 스타일 */
  speechStyle: string;
  /** 능력 카테고리 */
  abilityCategory: string;
  /** 능력 설명 (짧은) */
  abilityShort: string;
  /** Lv 5 강화 능력 */
  abilityEnhanced: string;
  /** 2문장 미리보기 (획득 시) */
  backstoryPreview: string;
  /** 스프라이트/일러스트 URL (없으면 이모지만) */
  spriteUrl?: string;
  /** 배경 색감 (카드 UI) */
  themeColor: string;
}

export interface UserSpirit {
  spiritId: SpiritId;
  count: number;
  bondXp: number;
  bondLv: BondLv;
  backstoryUnlocked: boolean;
  firstObtainedAt: string;
  lastInteractionAt: string | null;
}

export interface BondDialogue {
  spiritId: SpiritId;
  lv: BondLv;
  lines: string[];
}

export interface SpiritInteraction {
  /** 두 정령 ID (정렬된 ID 조합 키) */
  pairKey: string;
  /** 최소 교감 Lv 두 정령 모두 */
  minBondLv: BondLv;
  dialogues: Array<{ a: string; b: string }>;
}

export interface SpiritBackstory {
  spiritId: SpiritId;
  /** Lv 5 해금 시 전체 백스토리 (5문단) */
  paragraphs: string[];
  /** 세계관 조각 — 엔딩 퍼즐 */
  loreFragment: string;
}
