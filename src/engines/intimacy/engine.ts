/**
 * 🆕 v41: 친밀도 엔진 — 트리거 처리, 감쇠, 레벨 계산
 *
 * 순수 함수 기반 — DB 접근 없음. 입력 받아서 새 상태 반환.
 * 외부 호출자:
 *   - pipeline/index.ts: 매 턴 트리거 감지 후 processTriggers() 호출
 *   - complete/route.ts: 세션 완료 시 applyDecay() 호출
 *   - UI API: computeDerived()로 레벨/진행률 계산
 */

import type {
  IntimacyState,
  IntimacyDimensions,
  IntimacyTrigger,
  IntimacyUpdateResult,
  IntimacyTriggerType,
} from './types';
import { createDefaultIntimacyState } from './types';
import {
  TRIGGER_WEIGHTS,
  PER_SESSION_AXIS_CAP,
  PER_SESSION_TOTAL_CAP,
  DECAY_START_DAYS,
  DECAY_PER_WEEK,
  DECAY_MONTH_EXTRA,
  DECAY_FLOOR,
  MILESTONES,
  calculateLevel,
  applyPersonaWeights,
} from './config';

// ============================================================
// 유틸
// ============================================================

function clamp(min: number, max: number, v: number): number {
  return Math.max(min, Math.min(max, v));
}

function roundDim(v: number): number {
  // 0.1 단위 반올림 (시각적으로 안정적)
  return Math.round(v * 10) / 10;
}

/** 4축 평균 (레벨 계산용) */
export function calcAverage(dims: IntimacyDimensions): number {
  return (dims.trust + dims.openness + dims.bond + dims.respect) / 4;
}

/** 마지막 방문 이후 일수 계산 */
export function daysSince(iso: string | null, now: Date = new Date()): number {
  if (!iso) return 0;
  const then = new Date(iso).getTime();
  const nowMs = now.getTime();
  return Math.max(0, Math.floor((nowMs - then) / (1000 * 60 * 60 * 24)));
}

// ============================================================
// 트리거 → 델타 적용
// ============================================================

/**
 * 트리거 목록을 받아 상태를 업데이트.
 *
 * @param current 현재 친밀도 상태
 * @param triggers 발생한 트리거 목록
 * @param persona 페르소나 (가중치 적용)
 * @returns 업데이트 결과 (before/after/levelChanged 등)
 */
export function processTriggers(
  current: IntimacyState,
  triggerTypes: IntimacyTriggerType[],
  persona: 'luna' | 'tarot' = 'luna',
  extraContext?: { now?: Date },
): IntimacyUpdateResult {
  const before: IntimacyState = JSON.parse(JSON.stringify(current));
  const dims = { ...current.dimensions };

  // 중복 제거 (세션당 1회 원칙)
  const uniqueTypes = Array.from(new Set(triggerTypes));

  const appliedTriggers: IntimacyTrigger[] = [];
  let cumulativeDelta = { trust: 0, openness: 0, bond: 0, respect: 0 };

  for (const type of uniqueTypes) {
    const rawWeight = TRIGGER_WEIGHTS[type];
    if (!rawWeight) continue;

    // 페르소나 가중치 적용
    const weighted = applyPersonaWeights(rawWeight, persona);

    // 세션당 축별 캡 체크 (이미 +5 넘었으면 스킵)
    const effective = {
      trust: (weighted.trust ?? 0),
      openness: (weighted.openness ?? 0),
      bond: (weighted.bond ?? 0),
      respect: (weighted.respect ?? 0),
    };

    // 음수(감소)는 캡 적용 안 함
    if (effective.trust > 0 && cumulativeDelta.trust + effective.trust > PER_SESSION_AXIS_CAP) {
      effective.trust = Math.max(0, PER_SESSION_AXIS_CAP - cumulativeDelta.trust);
    }
    if (effective.openness > 0 && cumulativeDelta.openness + effective.openness > PER_SESSION_AXIS_CAP) {
      effective.openness = Math.max(0, PER_SESSION_AXIS_CAP - cumulativeDelta.openness);
    }
    if (effective.bond > 0 && cumulativeDelta.bond + effective.bond > PER_SESSION_AXIS_CAP) {
      effective.bond = Math.max(0, PER_SESSION_AXIS_CAP - cumulativeDelta.bond);
    }
    if (effective.respect > 0 && cumulativeDelta.respect + effective.respect > PER_SESSION_AXIS_CAP) {
      effective.respect = Math.max(0, PER_SESSION_AXIS_CAP - cumulativeDelta.respect);
    }

    // 총합 캡
    const axisSum = effective.trust + effective.openness + effective.bond + effective.respect;
    const currentTotal = cumulativeDelta.trust + cumulativeDelta.openness + cumulativeDelta.bond + cumulativeDelta.respect;
    if (axisSum > 0 && currentTotal + axisSum > PER_SESSION_TOTAL_CAP) {
      const ratio = Math.max(0, PER_SESSION_TOTAL_CAP - currentTotal) / axisSum;
      effective.trust *= ratio;
      effective.openness *= ratio;
      effective.bond *= ratio;
      effective.respect *= ratio;
    }

    // 적용
    dims.trust = clamp(0, 100, dims.trust + effective.trust);
    dims.openness = clamp(0, 100, dims.openness + effective.openness);
    dims.bond = clamp(0, 100, dims.bond + effective.bond);
    dims.respect = clamp(0, 100, dims.respect + effective.respect);

    cumulativeDelta.trust += effective.trust;
    cumulativeDelta.openness += effective.openness;
    cumulativeDelta.bond += effective.bond;
    cumulativeDelta.respect += effective.respect;

    appliedTriggers.push({
      type,
      trust: effective.trust,
      openness: effective.openness,
      bond: effective.bond,
      respect: effective.respect,
    });
  }

  // 반올림
  dims.trust = roundDim(dims.trust);
  dims.openness = roundDim(dims.openness);
  dims.bond = roundDim(dims.bond);
  dims.respect = roundDim(dims.respect);

  // peak 업데이트
  const peakOpenness = Math.max(current.peakOpenness, dims.openness);
  const peakTrust = Math.max(current.peakTrust, dims.trust);

  // 레벨 계산
  const avgBefore = calcAverage(current.dimensions);
  const avgAfter = calcAverage(dims);
  const levelBefore = calculateLevel(avgBefore);
  const levelAfter = calculateLevel(avgAfter);
  const levelChanged = levelBefore.level !== levelAfter.level;

  // 마일스톤 체크
  const now = extraContext?.now ?? new Date();
  const daysSinceFirst = current.firstSessionAt ? daysSince(current.firstSessionAt, now) : 0;
  const milestoneInput = {
    totalSessions: current.totalSessions,
    level: levelAfter.level,
    daysSinceFirst,
    consecutiveDays: current.consecutiveDays,
  };

  const existingMilestones = new Set(current.milestones);
  const newMilestones: string[] = [];
  for (const m of MILESTONES) {
    if (existingMilestones.has(m.id)) continue;
    if (m.condition(milestoneInput)) {
      newMilestones.push(m.id);
    }
  }

  const after: IntimacyState = {
    ...current,
    dimensions: dims,
    level: levelAfter.level,
    levelName: levelAfter.name,
    peakOpenness,
    peakTrust,
    milestones: [...current.milestones, ...newMilestones],
    lastLevelUpAt: levelChanged ? now.toISOString() : current.lastLevelUpAt,
  };

  return {
    before,
    after,
    triggers: appliedTriggers,
    totalDelta: cumulativeDelta,
    levelChanged,
    newMilestones,
  };
}

// ============================================================
// 시간 감쇠 (미방문 패널티)
// ============================================================

/**
 * 마지막 방문으로부터 경과 시간에 따라 감쇠 적용.
 * 세션 시작 시 호출 (가장 최근 방문 기준으로 현재 상태 조정).
 */
export function applyDecay(
  state: IntimacyState,
  now: Date = new Date(),
): { state: IntimacyState; decayed: boolean; daysSkipped: number } {
  const days = daysSince(state.lastSessionAt, now);

  if (days < DECAY_START_DAYS) {
    return { state, decayed: false, daysSkipped: days };
  }

  const dims = { ...state.dimensions };
  const weeksOverdue = Math.floor((days - DECAY_START_DAYS) / 7) + 1;

  // 주당 감쇠
  dims.trust = Math.max(DECAY_FLOOR.trust, dims.trust + DECAY_PER_WEEK.trust * weeksOverdue);
  dims.openness = Math.max(DECAY_FLOOR.openness, dims.openness + DECAY_PER_WEEK.openness * weeksOverdue);
  dims.bond = Math.max(DECAY_FLOOR.bond, dims.bond + DECAY_PER_WEEK.bond * weeksOverdue);
  dims.respect = Math.max(DECAY_FLOOR.respect, dims.respect + DECAY_PER_WEEK.respect * weeksOverdue);

  // 30일 이상 — 추가 감쇠
  if (days >= 30) {
    dims.trust = Math.max(DECAY_FLOOR.trust, dims.trust + DECAY_MONTH_EXTRA.trust);
    dims.openness = Math.max(DECAY_FLOOR.openness, dims.openness + DECAY_MONTH_EXTRA.openness);
    dims.bond = Math.max(DECAY_FLOOR.bond, dims.bond + DECAY_MONTH_EXTRA.bond);
    dims.respect = Math.max(DECAY_FLOOR.respect, dims.respect + DECAY_MONTH_EXTRA.respect);
  }

  dims.trust = roundDim(dims.trust);
  dims.openness = roundDim(dims.openness);
  dims.bond = roundDim(dims.bond);
  dims.respect = roundDim(dims.respect);

  // 레벨 재계산
  const newAvg = calcAverage(dims);
  const newLevel = calculateLevel(newAvg);

  // 연속 방문 리셋
  const consecutiveDays = days > 1 ? 0 : state.consecutiveDays;

  return {
    state: {
      ...state,
      dimensions: dims,
      level: newLevel.level,
      levelName: newLevel.name,
      consecutiveDays,
    },
    decayed: true,
    daysSkipped: days,
  };
}

// ============================================================
// 세션 시작 훅 — 연속 방문 카운트 + 감쇠 처리
// ============================================================

/**
 * 새 세션 시작 시 호출.
 *  - 감쇠 적용
 *  - 연속 방문 일수 업데이트
 *  - 재방문 트리거 감지 (3일 이내면 revisit_quick 트리거 포함)
 */
export function onSessionStart(
  state: IntimacyState | null,
  now: Date = new Date(),
): {
  state: IntimacyState;
  autoTriggers: IntimacyTriggerType[];
} {
  const current = state ?? createDefaultIntimacyState();
  const autoTriggers: IntimacyTriggerType[] = [];

  // 첫 세션
  if (!current.firstSessionAt) {
    return {
      state: {
        ...current,
        firstSessionAt: now.toISOString(),
        lastSessionAt: now.toISOString(),
        consecutiveDays: 1,
        totalSessions: current.totalSessions + 1,
      },
      autoTriggers,
    };
  }

  // 감쇠 적용
  const { state: decayed, daysSkipped } = applyDecay(current, now);

  // 연속 방문 체크 (같은 날 또는 다음 날)
  let consecutiveDays = decayed.consecutiveDays;
  if (daysSkipped === 0) {
    // 같은 날 — 연속 카운트 증가 X
    consecutiveDays = Math.max(1, consecutiveDays);
  } else if (daysSkipped === 1) {
    // 다음 날 — 연속 +1
    consecutiveDays += 1;
    autoTriggers.push('consecutive_visit');
  } else if (daysSkipped <= 3) {
    // 3일 이내 재방문
    consecutiveDays = 1;
    autoTriggers.push('revisit_quick');
  } else if (daysSkipped >= 7) {
    // 7일+ 미방문 — 경고성 트리거 (점수는 이미 감쇠됨)
    consecutiveDays = 1;
    autoTriggers.push('long_absence');
  } else {
    consecutiveDays = 1;
  }

  // 7일 연속 보너스
  if (consecutiveDays === 7) {
    autoTriggers.push('consecutive_week');
  }

  return {
    state: {
      ...decayed,
      lastSessionAt: now.toISOString(),
      consecutiveDays,
      totalSessions: decayed.totalSessions + 1,
    },
    autoTriggers,
  };
}

// ============================================================
// UI/API용 파생 데이터 계산
// ============================================================

export interface IntimacyDerivedInfo {
  level: number;
  levelName: string;
  levelEmoji: string;
  levelLabel: string;
  depthHint: string;
  unlocks: string[];
  avgScore: number;
  progressPercent: number;   // 다음 레벨까지 진행률 (0~100)
  daysSinceFirst: number;
  daysSinceLast: number;
  dimensions: IntimacyDimensions;
  totalSessions: number;
  consecutiveDays: number;
  milestones: string[];
}

export function computeDerived(
  state: IntimacyState,
  now: Date = new Date(),
): IntimacyDerivedInfo {
  const avg = calcAverage(state.dimensions);
  const levelInfo = calculateLevel(avg);
  const progress =
    levelInfo.nextAvg > levelInfo.minAvg
      ? ((avg - levelInfo.minAvg) / (levelInfo.nextAvg - levelInfo.minAvg)) * 100
      : 100;

  return {
    level: levelInfo.level,
    levelName: levelInfo.name,
    levelEmoji: levelInfo.emoji,
    levelLabel: levelInfo.label,
    depthHint: levelInfo.depthHint,
    unlocks: levelInfo.unlocks,
    avgScore: Math.round(avg * 10) / 10,
    progressPercent: clamp(0, 100, Math.round(progress)),
    daysSinceFirst: daysSince(state.firstSessionAt, now),
    daysSinceLast: daysSince(state.lastSessionAt, now),
    dimensions: state.dimensions,
    totalSessions: state.totalSessions,
    consecutiveDays: state.consecutiveDays,
    milestones: state.milestones,
  };
}
