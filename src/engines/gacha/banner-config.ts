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
    id: 'standard',
    name: '상시 배너',
    description: '정령 전체 풀 — 언제든 뽑을 수 있어',
    rates: BASE_RATES,
    costSingle: COST_SINGLE,
    costTen: COST_TEN,
    softPityStart: SOFT_PITY_START,
    hardPity: HARD_PITY,
    validUntil: null,
  },
  {
    id: 'pickup_weekly',
    name: '이주의 픽업',
    description: '특정 UR 1마리 + SR 2마리 확률 3배',
    pickupSpiritId: 'queen_elena',
    pickupSrIds: ['butterfly_meta', 'peace_dove'],
    pickupMultiplier: 3,
    rates: BASE_RATES,
    costSingle: COST_SINGLE,
    costTen: COST_TEN,
    softPityStart: SOFT_PITY_START,
    hardPity: HARD_PITY,
    // TODO: validUntil 은 실제 배포 시 주마다 갱신
    validUntil: null,
  },
  {
    id: 'newbie',
    name: '초보자 배너',
    description: '신규 30일 한정 — 10연차 30% 할인 + R 확정',
    rates: BASE_RATES,
    costSingle: COST_SINGLE,
    costTen: { heartStone: Math.floor(COST_TEN.heartStone * 0.7), starlight: Math.floor((COST_TEN.starlight ?? 0) * 0.7) },
    softPityStart: SOFT_PITY_START,
    hardPity: HARD_PITY,
    validUntil: null,
  },
];

export function getBanner(id: string): BannerConfig | undefined {
  return BANNERS.find((b) => b.id === id);
}
