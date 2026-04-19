/**
 * ⚡ v83: Spirit Abilities — Gameplay Integration
 *
 * 방에 배치된 정령 중 Lv 3+ 것들만 능력 발동.
 * pipeline / chat 로직에서 이 함수들을 호출해서 buff 적용.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { SpiritId } from '@/types/spirit.types';

export interface ActiveSpirit {
  spiritId: SpiritId;
  bondLv: number;
}

export async function getActiveSpirits(userId: string): Promise<ActiveSpirit[]> {
  const supabase = await createServerSupabaseClient();

  // 배치된 정령 ID 조회
  const { data: roomRow } = await supabase
    .from('room_state')
    .select('placed_spirits')
    .eq('user_id', userId)
    .maybeSingle();

  const placed: Array<{ spiritId: SpiritId }> = (roomRow?.placed_spirits as any) ?? [];
  if (placed.length === 0) return [];

  const placedIds = placed.map((p) => p.spiritId);

  const { data: spiritRows } = await supabase
    .from('user_spirits')
    .select('spirit_id, bond_lv')
    .eq('user_id', userId)
    .in('spirit_id', placedIds);

  return (spiritRows ?? [])
    .filter((r) => r.bond_lv >= 3)
    .map((r) => ({ spiritId: r.spirit_id as SpiritId, bondLv: r.bond_lv }));
}

export interface SpiritBuffs {
  /** 분노 대화 강화 */
  angerResonance: boolean;
  /** 분석 세션 품질 UP */
  analysisBoost: boolean;
  /** 초안 4안 제공 */
  draftFourth: boolean;
  /** 위로 대화 강화 */
  comfortBoost: boolean;
  /** 가벼운 대화 보너스 */
  casualBoost: boolean;
  /** 분위기 전환 가속 */
  moodShift: boolean;
  /** 첫 대화 버프 */
  firstTurnBoost: boolean;
  /** pacing 안정화 */
  pacingStable: boolean;
  /** 이별 상담 카드 */
  breakupCard: boolean;
  /** 새벽 특별 모드 */
  lateNightMode: boolean;
  /** 롤플 보너스 */
  roleplayBonus: boolean;
  /** 설렘 파티클 */
  heartParticles: boolean;
  /** 위기 모드 회피 */
  calmMode: boolean;
  /** 세션 완결 💎 2배 */
  rewardMultiplier: number;
  /** 랜덤 이벤트 트리거 */
  randomEventTrigger: boolean;
  /** EMPOWER 가속 */
  empowerFast: boolean;
  /** 재회 조언 */
  reunionAdvice: boolean;
  /** 긴 기억 컨텍스트 */
  longMemory: boolean;
  /** 자신감 모드 (ACTION_PLAN 3회) */
  confidenceMode: boolean;
  /** 소원권 */
  wishCoupon: boolean;
  /** 획득 💎 보너스 % (0.1 = 10%) */
  heartStoneGainBonus: number;
}

export function emptyBuffs(): SpiritBuffs {
  return {
    angerResonance: false,
    analysisBoost: false,
    draftFourth: false,
    comfortBoost: false,
    casualBoost: false,
    moodShift: false,
    firstTurnBoost: false,
    pacingStable: false,
    breakupCard: false,
    lateNightMode: false,
    roleplayBonus: false,
    heartParticles: false,
    calmMode: false,
    rewardMultiplier: 1,
    randomEventTrigger: false,
    empowerFast: false,
    reunionAdvice: false,
    longMemory: false,
    confidenceMode: false,
    wishCoupon: false,
    heartStoneGainBonus: 0,
  };
}

export function computeBuffs(active: ActiveSpirit[]): SpiritBuffs {
  const b = emptyBuffs();
  for (const s of active) {
    const enhanced = s.bondLv === 5;
    switch (s.spiritId) {
      case 'fire_goblin':
        b.angerResonance = true;
        if (enhanced) b.heartStoneGainBonus += 0.1;
        break;
      case 'book_worm':
        b.analysisBoost = true;
        break;
      case 'letter_fairy':
        b.draftFourth = true;
        break;
      case 'tear_drop':
        b.comfortBoost = true;
        break;
      case 'cloud_bunny':
      case 'seed_spirit':
        b.casualBoost = true;
        break;
      case 'wind_sprite':
        b.moodShift = true;
        break;
      case 'drum_imp':
        b.pacingStable = true;
        break;
      case 'cherry_leaf':
        b.breakupCard = true;
        break;
      case 'moon_rabbit':
        b.lateNightMode = true;
        break;
      case 'clown_harley':
        b.roleplayBonus = true;
        break;
      case 'rose_fairy':
        b.heartParticles = true;
        break;
      case 'ice_prince':
        b.calmMode = true;
        break;
      case 'forest_mom':
        if (enhanced) b.rewardMultiplier = 2;
        break;
      case 'lightning_bird':
        b.randomEventTrigger = true;
        break;
      case 'butterfly_meta':
        b.empowerFast = true;
        break;
      case 'peace_dove':
        b.reunionAdvice = true;
        break;
      case 'book_keeper':
        b.longMemory = true;
        break;
      case 'queen_elena':
        b.confidenceMode = true;
        break;
      case 'star_dust':
        b.wishCoupon = true;
        break;
      case 'guardian_eddy':
        b.heartStoneGainBonus += 0.2;
        b.rewardMultiplier = Math.max(b.rewardMultiplier, 1.5);
        break;
    }
  }
  return b;
}

/** 유저 현재 활성 버프 가져오기 (pipeline 에서 사용) */
export async function getUserBuffs(userId: string): Promise<SpiritBuffs> {
  const active = await getActiveSpirits(userId);
  return computeBuffs(active);
}
