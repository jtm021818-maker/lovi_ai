/**
 * 🏡 v83: Mind Room Types
 */

import type { SpiritId } from './spirit.types';

export interface PlacedSpirit {
  spiritId: SpiritId;
  /** 0~1 정규화 좌표 (room 크기 무관) */
  x: number;
  y: number;
}

export type FurnitureSlot = 'bed' | 'bookshelf' | 'plant' | 'window' | 'rug';

export interface RoomState {
  placedSpirits: PlacedSpirit[];
  furniture: Partial<Record<FurnitureSlot, string>>; // slot → itemId
  theme: string; // e.g. 'default', 'cherry_blossom', 'christmas'
}

export interface CosmeticItem {
  id: string;
  type: 'furniture' | 'theme' | 'outfit';
  name: string;
  emoji?: string;
  price: { heartStone?: number; starlight?: number };
  /** 해금 조건 (있는 경우) */
  unlockCondition?: {
    type: 'spirit_bond' | 'intimacy_lv' | 'event';
    value: string | number;
  };
}
