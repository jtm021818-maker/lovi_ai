/**
 * 🎰 v83: Gacha Engine
 *
 * 순수 함수 — 서버에서 쓰는 핵심 확률 계산.
 * - 기본 확률 (N 65% / R 25% / SR 8% / UR 1.9%)
 * - 소프트 피티 (50~): UR 확률 +2% / pull
 * - 하드 피티 (70): UR 확정
 * - 10연차: R 이상 1마리 최소 보장
 * - 픽업 배너: UR 뽑기 시 50/50, 지면 다음은 픽업 확정
 * - 중복 처리: 재화 환전
 */

import type { SpiritId, SpiritRarity, SpiritMaster } from '@/types/spirit.types';
import type { BannerConfig, GachaState, PullResult } from '@/types/gacha.types';
import { SPIRITS, getSpiritsByRarity } from '@/data/spirits';
import { SOFT_PITY_START, SOFT_PITY_RATE_GAIN, HARD_PITY } from './banner-config';

/** 중복 환전 표 */
const DUPLICATE_REFUND: Record<SpiritRarity, { heartStone?: number; bondShards?: number }> = {
  N: { heartStone: 10 },
  R: { heartStone: 50 },
  SR: { heartStone: 200, bondShards: 1 },
  UR: { heartStone: 800, bondShards: 5 },
  L: { heartStone: 2000, bondShards: 10 },
};

/** 현재 피티 기준 UR 확률 계산 (소프트/하드 피티 반영) */
export function calcUrRate(pityCounter: number): number {
  if (pityCounter >= HARD_PITY - 1) return 1;
  if (pityCounter < SOFT_PITY_START) return 0.019;
  const boost = (pityCounter - SOFT_PITY_START + 1) * SOFT_PITY_RATE_GAIN;
  return Math.min(1, 0.019 + boost);
}

/** 희귀도 → 확률 map (피티 반영) */
function calcRates(pity: number): Record<SpiritRarity, number> {
  const urRate = calcUrRate(pity);
  const remaining = 1 - urRate;
  // N/R/SR 비율은 원래 비율 유지 (65 : 25 : 8 = 0.6566 : 0.2525 : 0.0808)
  const totalNonUr = 0.65 + 0.25 + 0.08; // 0.98
  return {
    N: remaining * (0.65 / totalNonUr),
    R: remaining * (0.25 / totalNonUr),
    SR: remaining * (0.08 / totalNonUr),
    UR: urRate,
    L: 0,
  };
}

/** 랜덤 희귀도 선택 */
function pickRarity(pity: number): SpiritRarity {
  if (pity >= HARD_PITY - 1) return 'UR';
  const rates = calcRates(pity);
  const r = Math.random();
  let acc = 0;
  for (const rarity of ['UR', 'SR', 'R', 'N'] as SpiritRarity[]) {
    acc += rates[rarity];
    if (r < acc) return rarity;
  }
  return 'N';
}

/** 희귀도 내에서 랜덤 정령 선택 (픽업 반영) */
function pickSpirit(
  rarity: SpiritRarity,
  banner: BannerConfig,
  state: GachaState,
): { spiritId: SpiritId; consumedPickupGuarantee: boolean } {
  const pool = getSpiritsByRarity(rarity);
  if (pool.length === 0) {
    throw new Error(`[gacha] no spirits in pool for rarity ${rarity}`);
  }

  // UR + 픽업 배너: 50/50 판정
  if (rarity === 'UR' && banner.pickupSpiritId) {
    if (state.isPickupGuaranteed || Math.random() < 0.5) {
      return { spiritId: banner.pickupSpiritId, consumedPickupGuarantee: state.isPickupGuaranteed };
    } else {
      // 50/50 패배 → 픽업 외 UR 랜덤. 다음 UR 은 확정.
      const others = pool.filter((s) => s.id !== banner.pickupSpiritId);
      const candidate = others[Math.floor(Math.random() * others.length)] ?? pool[0];
      return { spiritId: candidate.id, consumedPickupGuarantee: false };
    }
  }

  // SR + 픽업 배너: 픽업 SR 확률 상승
  if (rarity === 'SR' && banner.pickupSrIds?.length && banner.pickupMultiplier) {
    const pickupPool = pool.filter((s) => banner.pickupSrIds!.includes(s.id));
    const normalPool = pool.filter((s) => !banner.pickupSrIds!.includes(s.id));
    // 픽업 확률을 (기본 × multiplier), 나머지 균등
    const totalWeight = pickupPool.length * banner.pickupMultiplier + normalPool.length;
    const r = Math.random() * totalWeight;
    let acc = 0;
    for (const s of pickupPool) {
      acc += banner.pickupMultiplier;
      if (r < acc) return { spiritId: s.id, consumedPickupGuarantee: false };
    }
    for (const s of normalPool) {
      acc += 1;
      if (r < acc) return { spiritId: s.id, consumedPickupGuarantee: false };
    }
  }

  // 기본: 균등 랜덤
  const candidate = pool[Math.floor(Math.random() * pool.length)];
  return { spiritId: candidate.id, consumedPickupGuarantee: false };
}

/** 단뽑 순수 함수 (저장 X, 계산만) */
export function pullSinglePure(
  banner: BannerConfig,
  state: GachaState,
  isOwned: (id: SpiritId) => boolean,
): { result: PullResult; newState: GachaState } {
  const rarity = pickRarity(state.pityCounter);
  const { spiritId, consumedPickupGuarantee } = pickSpirit(rarity, banner, state);

  const pityAtDraw = state.pityCounter;
  const owned = isOwned(spiritId);

  const refund = owned ? DUPLICATE_REFUND[rarity] : undefined;

  const newState: GachaState = {
    ...state,
    pityCounter: rarity === 'UR' ? 0 : state.pityCounter + 1,
    isPickupGuaranteed: rarity === 'UR' && banner.pickupSpiritId
      ? !consumedPickupGuarantee && spiritId !== banner.pickupSpiritId
      : state.isPickupGuaranteed,
    totalPulls: state.totalPulls + 1,
    lastPullAt: new Date().toISOString(),
  };

  return {
    result: {
      spiritId,
      rarity,
      isNew: !owned,
      pityAtDraw,
      duplicateRefund: refund,
    },
    newState,
  };
}

/** 10연차: R 이상 보장 */
export function pullTenPure(
  banner: BannerConfig,
  initialState: GachaState,
  isOwnedFactory: () => (id: SpiritId) => boolean,
): { results: PullResult[]; finalState: GachaState } {
  const results: PullResult[] = [];
  let state = initialState;
  const ownedCheck = isOwnedFactory();
  const newlyObtained = new Set<SpiritId>();

  let hasROrAbove = false;
  for (let i = 0; i < 10; i++) {
    const { result, newState } = pullSinglePure(banner, state, (id) => ownedCheck(id) || newlyObtained.has(id));
    state = newState;
    if (result.isNew) newlyObtained.add(result.spiritId);
    if (result.rarity === 'R' || result.rarity === 'SR' || result.rarity === 'UR') hasROrAbove = true;
    results.push(result);
  }

  // R 이상 보장: 10연차에 하나도 안 나왔으면 마지막을 R 로 강제 업그레이드
  if (!hasROrAbove) {
    const rPool = getSpiritsByRarity('R');
    const candidate = rPool[Math.floor(Math.random() * rPool.length)];
    const last = results[9];
    const wasOwned = ownedCheck(candidate.id) || newlyObtained.has(candidate.id);
    results[9] = {
      spiritId: candidate.id,
      rarity: 'R',
      isNew: !wasOwned,
      pityAtDraw: last.pityAtDraw,
      duplicateRefund: wasOwned ? DUPLICATE_REFUND.R : undefined,
    };
  }

  return { results, finalState: state };
}

/** Spirit ID → Master */
export function getSpiritMaster(id: SpiritId): SpiritMaster | undefined {
  return SPIRITS.find((s) => s.id === id);
}
