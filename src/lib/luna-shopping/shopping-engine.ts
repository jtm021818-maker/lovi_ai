/**
 * v104: Luna Shopping Engine
 *
 * 순수 결정 함수 — 외출 시작/종료 결정 + 선물 매칭.
 * cron 없이 status 라우트가 호출 시 평가.
 */

export type EmotionTag = 'anxious' | 'sad' | 'happy' | 'proud' | 'lonely' | 'excited' | 'neutral';

export interface ShoppingDecisionInput {
  /** 현재 시각 ms */
  nowMs: number;
  /** 활성 트립 (있으면). returned/seen 은 활성 아님 */
  activeTrip: { returnsAtMs: number } | null;
  /** 오늘 이미 다녀온 트립 있는가 (returned/seen) */
  hasTodaysCompletedTrip: boolean;
  /** 마지막 trip departed 시각 ms (없으면 0) */
  lastTripMs: number;
  /** 사용자 최근 48시간 내 세션 활동 있는가 */
  userActiveRecent48h: boolean;
  /** 본드 day (1..100) */
  bondDay: number;
}

export type ShoppingDecision =
  | { kind: 'finish-active' }              // active trip 종료해야 함
  | { kind: 'still-out'; minutesLeft: number }
  | { kind: 'present' }                    // 그냥 있음
  | { kind: 'depart'; durationMinutes: number };

const SHOP_WINDOW_START_HOUR_KST = 9;
const SHOP_WINDOW_END_HOUR_KST = 21;
const KST_OFFSET_MS = 9 * 3600 * 1000;
const COOLDOWN_AFTER_TRIP_MS = 12 * 3600 * 1000;
const DAY_MS = 86_400_000;

/** 한국 시간 hour 추출 (0~23) */
function getKstHour(nowMs: number): number {
  return Math.floor(((nowMs + KST_OFFSET_MS) % DAY_MS) / 3_600_000);
}

/** 시간대별 외출 확률 */
function probByHour(kstHour: number): number {
  if (kstHour < SHOP_WINDOW_START_HOUR_KST) return 0;
  if (kstHour >= SHOP_WINDOW_END_HOUR_KST) return 0;
  if (kstHour < 12) return 0.15;
  if (kstHour < 15) return 0.25;
  if (kstHour < 18) return 0.35;
  return 0.20; // 18~21
}

/** 외출 길이 (30~180분) */
function rollDurationMinutes(): number {
  return 30 + Math.floor(Math.random() * 151);
}

export function decideShopping(input: ShoppingDecisionInput): ShoppingDecision {
  // [1] active trip 있는가?
  if (input.activeTrip) {
    if (input.nowMs >= input.activeTrip.returnsAtMs) {
      return { kind: 'finish-active' };
    }
    return {
      kind: 'still-out',
      minutesLeft: Math.max(1, Math.ceil((input.activeTrip.returnsAtMs - input.nowMs) / 60_000)),
    };
  }

  // [2] 오늘 이미 다녀옴
  if (input.hasTodaysCompletedTrip) return { kind: 'present' };

  // [3] 마지막 트립 후 12시간 미만
  if (input.lastTripMs > 0 && input.nowMs - input.lastTripMs < COOLDOWN_AFTER_TRIP_MS) {
    return { kind: 'present' };
  }

  // [4] 시간 창 밖
  const kstHour = getKstHour(input.nowMs);
  if (kstHour < SHOP_WINDOW_START_HOUR_KST || kstHour >= SHOP_WINDOW_END_HOUR_KST) {
    return { kind: 'present' };
  }

  // [5] 사용자 방치형이면 안 떠남
  if (!input.userActiveRecent48h) return { kind: 'present' };

  // [6] Bond day 게이트 — 사망 후엔 안 나감
  if (input.bondDay <= 0 || input.bondDay > 100) return { kind: 'present' };

  // [7] 시간대별 확률
  const p = probByHour(kstHour);
  if (Math.random() < p) {
    return { kind: 'depart', durationMinutes: rollDurationMinutes() };
  }
  return { kind: 'present' };
}

/** 본드 day → 본드 티어 */
export function getBondTier(bondDay: number): 1 | 2 | 3 {
  if (bondDay <= 30) return 1;
  if (bondDay <= 70) return 2;
  return 3;
}

/** "약 N분/N시간 N분" 표기 (정확하지 않게 — Skinner 패턴) */
export function fuzzyDurationLabel(minutes: number): string {
  if (minutes < 5) return '곧';
  if (minutes < 60) return `약 ${Math.floor(minutes / 5) * 5}분`;
  const h = Math.floor(minutes / 60);
  const m = Math.floor((minutes % 60) / 10) * 10;
  if (m === 0) return `약 ${h}시간`;
  return `약 ${h}시간 ${m}분`;
}

/** 선물 후보 가중 선택 — DB에서 가져온 후보들 중 weighted random */
export interface ItemCandidate {
  id: string;
  bond_tier: number;
  emotion_tag: string | null;
  base_weight: number;
}

export function pickGiftItem(
  candidates: ItemCandidate[],
  bondTier: 1 | 2 | 3,
  emotion: EmotionTag,
): ItemCandidate | null {
  if (candidates.length === 0) return null;

  const weighted = candidates.map((c) => {
    let w = c.base_weight;
    // 감정 일치 보너스
    if (c.emotion_tag === emotion) w *= 2.0;
    else if (c.emotion_tag === null) w *= 1.0;
    else w *= 0.4;
    // 본드 티어 근접 보너스 (현재 티어와 같으면 1.0, 한 단계 낮으면 0.6)
    const tierGap = Math.abs(c.bond_tier - bondTier);
    if (tierGap === 0) w *= 1.0;
    else if (tierGap === 1) w *= 0.5;
    else w *= 0.15;
    // 약간의 잡음
    w *= 0.7 + Math.random() * 0.6;
    return { c, w };
  }).filter((x) => x.w > 0);

  if (weighted.length === 0) return null;

  const total = weighted.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const x of weighted) {
    r -= x.w;
    if (r <= 0) return x.c;
  }
  return weighted[0].c;
}
