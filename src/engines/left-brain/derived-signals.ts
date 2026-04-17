/**
 * 🔬 9가지 유도 신호 (Derived Signals)
 *
 * 7차원 벡터로부터 자동 추출되는 고차 정보.
 * 이 신호들이 Claude에게 전달될 핵심 힌트가 됨.
 *
 * 인간 친구는 무의식적으로 이걸 감지함:
 *   "어 이 친구 점점 격해지는데..."
 *   "지금 자기를 너무 탓하네"
 *   "갑자기 깨달은 표정인데?"
 */

import type { DerivedSignals, StateVector, StateVelocity } from './types';
import type { TrajectoryPattern } from './state-vector';

export function deriveSignals(params: {
  current: StateVector;
  velocity: StateVelocity;
  trajectory: TrajectoryPattern;
  history: StateVector[];
}): DerivedSignals {
  const { current, velocity, trajectory, history } = params;
  const prev = history.length > 0 ? history[history.length - 1] : null;
  const turn1 = history.length > 0 ? history[0] : null;

  return {
    // 1. 격앙: V 하락 + A 상승 (분노/공포 향함)
    escalating: trajectory === 'escalating' ||
                (velocity.V_delta < -0.2 && velocity.A_delta > 0.2),

    // 2. 무력감: D 낮음 + M 낮음 (통제력 + 자각력 모두 부족)
    helplessness: current.D < 0.3 && current.M < 0.4,

    // 3. 억압: V 부정 + A 낮음 (감정 누르고 있음)
    suppression: current.V < -0.4 && current.A < 0.35,

    // 4. 양가감정: V 애매 + A 높음 (감정은 있는데 방향 모름)
    ambivalence: Math.abs(current.V) < 0.25 && current.A > 0.5,

    // 5. 메타 붕괴: M 하락 추세 (점점 자기 모름)
    meta_collapse: prev !== null && velocity.M_delta < -0.15,

    // 6. 신뢰 상승: T 증가 (마음 열어가는 중)
    trust_gain: turn1 !== null && (current.T - turn1.T) > 0.15,

    // 7. 위기 위험: U 높음
    crisis_risk: current.U > 0.7,

    // 8. 자각의 순간: M 급증 (갑자기 깨달음)
    insight_moment: prev !== null && velocity.M_delta > 0.25,

    // 9. 후퇴: I 감소 (마음 닫음)
    withdrawal: prev !== null && velocity.I_delta < -0.1,
  };
}

// ============================================================
// 신호 → 자연어 힌트 (Claude에게 전달)
// ============================================================

/**
 * Derived signals를 Claude가 이해할 수 있는 자연어로 변환
 * "이 사람 지금 격해지고 있어, 감정 조심"
 */
export function signalsToHints(signals: DerivedSignals): string[] {
  const hints: string[] = [];

  if (signals.escalating) {
    hints.push('⚡ 감정이 점점 격해지는 중. 진정시키지 말고 같이 공명만.');
  }
  if (signals.helplessness) {
    hints.push('💧 무력감 감지. "할 수 있어" 같은 격려보다 "그래 지금 그렇지" 인정.');
  }
  if (signals.suppression) {
    hints.push('🔒 감정 억누르는 중. 직접 묻지 말고 옆에 있어주기.');
  }
  if (signals.ambivalence) {
    hints.push('🌗 양가감정. 한쪽 편들지 말고 양쪽 다 인정.');
  }
  if (signals.meta_collapse) {
    hints.push('🌫️ 자기 인식이 흐려지는 중. 정리해주는 한마디 필요할 수 있음.');
  }
  if (signals.trust_gain) {
    hints.push('💜 마음 열어가는 중. 자기 얘기 살짝 꺼내도 됨.');
  }
  if (signals.crisis_risk) {
    hints.push('🚨 위기 신호. 안전 우선, 1393 번호 자연스럽게 안내 가능.');
  }
  if (signals.insight_moment) {
    hints.push('✨ 자각의 순간. 끊지 말고 더 말하게 두기.');
  }
  if (signals.withdrawal) {
    hints.push('🚪 후퇴 중. 너무 깊게 파고들지 말고 한발 물러서기.');
  }

  return hints;
}

/**
 * 신호별 응답 회피 가이드
 * "이런 신호면 이런 말은 하지 마"
 */
export function signalsToAvoidances(signals: DerivedSignals): string[] {
  const avoid: string[] = [];

  if (signals.escalating) avoid.push('진정해, 차분히, 가라앉혀');
  if (signals.helplessness) avoid.push('힘내, 할 수 있어, 긍정적으로');
  if (signals.suppression) avoid.push('말해봐, 솔직히 어때, 다 털어놔');
  if (signals.ambivalence) avoid.push('어떤 쪽이야, 결정해, 골라');
  if (signals.withdrawal) avoid.push('왜 그래, 무슨 일이야, 더 말해봐');
  if (signals.crisis_risk) avoid.push('그 정도는 괜찮아, 별일 아냐');

  return avoid;
}

/**
 * 신호 카운트 (라우팅 점수에 사용)
 * 활성 신호가 많을수록 복잡한 상황 → Claude 가능성 ↑
 */
export function countActiveSignals(signals: DerivedSignals): number {
  return Object.values(signals).filter(v => v === true).length;
}
