/**
 * 🎰 v83: Banner Configuration
 */

import type { BannerConfig } from '@/types/gacha.types';

/** 기본 확률 (모든 배너 공통) */
export const BASE_RATES: BannerConfig['rates'] = {
  N: 0.65,
  R: 0.25,
  SR: 0.08,
  UR: 0.019,
  L: 0, // 뽑기 불가, 해금 전용
};

/** 소프트 피티 시작/하드 피티 */
export const SOFT_PITY_START = 50;
export const HARD_PITY = 70;
/** 소프트 피티 구간에서 매 뽑기당 UR 확률 +2% */
export const SOFT_PITY_RATE_GAIN = 0.02;

/** 단뽑 가격 */
export const COST_SINGLE = { heartStone: 160, starlight: 16 };
/** 10연차 가격 */
export const COST_TEN = { heartStone: 1600, starlight: 160 };

export const BANNERS: BannerConfig[] = [
  {
    id: 'pickup_weekly',
    name: '이달의 픽업',
    description: '여왕 엘레나 UR 픽업 — SR 2종 확률 3배 동시 적용',
    bannerVideoUrl: '/quen_elena.mp4',
    accentColor: '#7C3AED',
    bannerBadge: 'PICKUP',
    pickupSpiritId: 'queen_elena',
    pickupSrIds: ['butterfly_meta', 'peace_dove'],
    pickupMultiplier: 3,
    rates: BASE_RATES,
    costSingle: COST_SINGLE,
    costTen: COST_TEN,
    softPityStart: SOFT_PITY_START,
    hardPity: HARD_PITY,
    validUntil: null,
  },
  {
    id: 'standard',
    name: '상시 소환',
    description: '전체 정령 풀 — 언제든 소환할 수 있어',
    bannerImageUrl: '/ui/상시정령소환.png',
    accentColor: '#DB2777',
    rates: BASE_RATES,
    costSingle: COST_SINGLE,
    costTen: COST_TEN,
    softPityStart: SOFT_PITY_START,
    hardPity: HARD_PITY,
    validUntil: null,
  },
];

export function getBanner(id: string): BannerConfig | undefined {
  return BANNERS.find((b) => b.id === id);
}
