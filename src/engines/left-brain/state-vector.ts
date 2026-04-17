/**
 * 🧠 7차원 상태 벡터 업데이트 로직
 *
 * 인간 뇌는 한 문장으로 기분이 완전히 바뀌지 않음.
 * 이전 상태의 관성을 유지하며 새 신호를 베이지안 업데이트로 반영.
 */

import type { StateVector, StateVelocity } from './types';

/** 중립 초기 상태 */
export const NEUTRAL_STATE: StateVector = {
  V: 0, A: 0.3, D: 0.5, I: 0.2, T: 0.3, U: 0.1, M: 0.5,
};

/**
 * 이전 상태 + 새 신호 → 새 상태
 * alpha: 새 신호의 가중치 (기본 0.6)
 * 세션 초반엔 alpha 높게 (빠르게 파악), 후반엔 낮게 (관성 유지)
 */
export function updateStateVector(
  prev: StateVector,
  fresh: StateVector,
  turnCount: number
): StateVector {
  // 세션 초반 5턴: alpha 0.7 (빠른 수렴)
  // 그 이후: alpha 0.5 (관성)
  const alpha = turnCount < 5 ? 0.7 : 0.5;

  return {
    V: clamp(alpha * fresh.V + (1 - alpha) * prev.V, -1, 1),
    A: clamp(alpha * fresh.A + (1 - alpha) * prev.A, 0, 1),
    D: clamp(alpha * fresh.D + (1 - alpha) * prev.D, 0, 1),
    I: clamp(alpha * fresh.I + (1 - alpha) * prev.I, 0, 1),
    T: clamp(alpha * fresh.T + (1 - alpha) * prev.T, 0, 1),
    U: clamp(alpha * fresh.U + (1 - alpha) * prev.U, 0, 1),
    M: clamp(alpha * fresh.M + (1 - alpha) * prev.M, 0, 1),
  };
}

/**
 * 변화량 계산
 * 급격한 변화는 특별 주목 (격앙/붕괴/자각의 순간)
 */
export function calculateVelocity(
  prev: StateVector | null,
  current: StateVector
): StateVelocity {
  if (!prev) {
    return {
      V_delta: 0, A_delta: 0, D_delta: 0,
      I_delta: 0, T_delta: 0, U_delta: 0, M_delta: 0,
      magnitude: 0,
    };
  }

  const deltas = {
    V_delta: current.V - prev.V,
    A_delta: current.A - prev.A,
    D_delta: current.D - prev.D,
    I_delta: current.I - prev.I,
    T_delta: current.T - prev.T,
    U_delta: current.U - prev.U,
    M_delta: current.M - prev.M,
  };

  // 7차원 유클리디안 거리 (종합 변화량)
  const magnitude = Math.sqrt(
    deltas.V_delta ** 2 +
    deltas.A_delta ** 2 +
    deltas.D_delta ** 2 +
    deltas.I_delta ** 2 +
    deltas.T_delta ** 2 +
    deltas.U_delta ** 2 +
    deltas.M_delta ** 2
  );

  return { ...deltas, magnitude };
}

/**
 * 궤적 추세 분석 (최근 3턴)
 * 감정 곡선의 방향성 판정
 */
export type TrajectoryPattern =
  | 'escalating'       // 점점 격해짐
  | 'de-escalating'    // 진정되는 중
  | 'oscillating'      // 요동침
  | 'stable'           // 일정함
  | 'collapsing';      // 무너짐

export function analyzeTrajectory(vectors: StateVector[]): TrajectoryPattern {
  if (vectors.length < 2) return 'stable';

  const recent = vectors.slice(-3);
  const A_trend = linearTrend(recent.map(v => v.A));
  const V_trend = linearTrend(recent.map(v => v.V));
  const D_trend = linearTrend(recent.map(v => v.D));

  // 격앙: A 상승 + V 하강
  if (A_trend > 0.15 && V_trend < -0.1) return 'escalating';

  // 진정: A 하강 + V 상승
  if (A_trend < -0.1 && V_trend > 0.1) return 'de-escalating';

  // 붕괴: D 급락
  if (D_trend < -0.2) return 'collapsing';

  // 요동: V가 부호 바꿈
  if (recent.length >= 3) {
    const signs = recent.map(v => Math.sign(v.V));
    if (new Set(signs).size >= 2) return 'oscillating';
  }

  return 'stable';
}

// ============================================================
// 헬퍼
// ============================================================

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function linearTrend(values: number[]): number {
  if (values.length < 2) return 0;
  // 단순 diff 평균 (선형 회귀 기울기와 유사)
  let sum = 0;
  for (let i = 1; i < values.length; i++) {
    sum += values[i] - values[i - 1];
  }
  return sum / (values.length - 1);
}

/**
 * 친밀도 레벨과 Intimacy 벡터 축 동기화
 * (외부 친밀도 시스템이 있으면 그 값을 기준점으로 사용)
 */
export function syncIntimacyWithExternal(
  vectorI: number,
  externalIntimacyLevel: number // 1~5
): number {
  // 외부 친밀도 레벨 1~5를 0~1로 매핑, 70% 가중치
  const externalNormalized = (externalIntimacyLevel - 1) / 4;
  return 0.7 * externalNormalized + 0.3 * vectorI;
}
