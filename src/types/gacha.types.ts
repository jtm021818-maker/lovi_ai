/**
 * 🎰 v83: Gacha System Types
 */

import type { SpiritId, SpiritRarity } from './spirit.types';

export type BannerId = 'standard' | 'pickup_weekly' | 'newbie';

export interface BannerConfig {
  id: BannerId;
  name: string;
  description: string;
  /** 픽업 대상 UR 정령 (있는 경우) */
  pickupSpiritId?: SpiritId;
  /** 픽업 대상 SR 정령들 (확률 업) */
  pickupSrIds?: SpiritId[];
  /** 확률 배수 (픽업 배너는 3.0) */
  pickupMultiplier?: number;
  /** 기본 확률 */
  rates: Record<SpiritRarity, number>;
  /** 단뽑 가격 */
  costSingle: { heartStone?: number; starlight?: number };
  /** 10연차 가격 */
  costTen: { heartStone?: number; starlight?: number };
  /** 소프트 피티 시작 */
  softPityStart: number;
  /** 하드 피티 */
  hardPity: number;
  /** 유효 기간 (null = 상시) */
  validUntil?: string | null;
}

export interface PullResult {
  spiritId: SpiritId;
  rarity: SpiritRarity;
  isNew: boolean;
  pityAtDraw: number;
  /** 중복 시 환전 내역 */
  duplicateRefund?: {
    heartStone?: number;
    bondShards?: number;
  };
}

export interface GachaState {
  bannerId: BannerId;
  pityCounter: number;
  isPickupGuaranteed: boolean;
  totalPulls: number;
  lastPullAt: string | null;
}

export interface PullRequest {
  bannerId: BannerId;
  count: 1 | 10;
}
