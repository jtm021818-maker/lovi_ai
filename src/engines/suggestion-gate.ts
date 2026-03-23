import type { StrategyType } from '@/types/engine.types';
import { RiskLevel } from '@/types/engine.types';
import type { PersonaMode } from '@/types/persona.types';

/**
 * 선택지 표시 게이트 — 5-Gate 시스템
 *
 * 2026 리서치 기반:
 * - Woebot RCT (2025): 전략적 분기점에서만 선택지
 * - Wysa Diary Study (2025): 자유 텍스트 우선, 최소 가이드
 * - NeuronUX (2025): 선택지 남발 → decision fatigue → 이탈
 *
 * 목표: 매 턴 100% → 25~35% (3~4턴에 1번)
 */

interface SuggestionGateInput {
  /** 현재 대화 턴 수 (사용자 메시지 기준) */
  turnCount: number;
  /** 선택된 상담 전략 */
  strategyType: StrategyType;
  /** 현재 감정 점수 (-5 ~ +5) */
  emotionScore: number;
  /** 현재 위험 수준 */
  riskLevel: RiskLevel;
  /** 페르소나 모드 */
  persona: PersonaMode;
  /** 마지막으로 선택지를 표시한 턴 번호 (없으면 -1) */
  lastSuggestionTurn: number;
  /** 현재 전략이 연속으로 선택된 횟수 */
  consecutiveStrategyCount: number;
  /** 사용자의 이전 메시지가 선택지에서 온 것인지 */
  isFromSuggestion: boolean;
}

interface GateResult {
  show: boolean;
  reason: string;
}

/**
 * 선택지를 표시할지 결정하는 5-Gate 시스템
 *
 * 모든 게이트를 통과해야 선택지 표시.
 * 단, 명시적 트리거(위기 안전확인 등)는 게이트를 우회.
 */
export function shouldShowSuggestions(input: SuggestionGateInput): GateResult {
  // ━━━ 명시적 트리거: 게이트 우회 (반드시 선택지 표시) ━━━

  // 위기 상황에서는 안전 확인용 선택지 필수
  if (input.riskLevel === RiskLevel.HIGH || input.riskLevel === RiskLevel.CRITICAL) {
    return { show: true, reason: 'CRISIS_OVERRIDE: 위기 상황 안전 확인 선택지 필수' };
  }

  // 사용자가 직전에 선택지를 클릭했으면 → 이번에는 선택지 안 줌 (연타 방지)
  if (input.isFromSuggestion) {
    return { show: false, reason: 'ANTI_CHAIN: 선택지 연쇄 방지 — 직전이 선택지 응답' };
  }

  // ━━━ Gate 1: turnGate — 최소 턴 간격 ━━━
  const minInterval = input.persona === 'friend' ? 4 : 3;
  const turnsSinceLastSuggestion = input.lastSuggestionTurn >= 0
    ? input.turnCount - input.lastSuggestionTurn
    : input.turnCount; // 한번도 안 보여줬으면 turnCount 자체가 간격

  if (turnsSinceLastSuggestion < minInterval) {
    return {
      show: false,
      reason: `TURN_GATE: ${turnsSinceLastSuggestion}턴 경과 (최소 ${minInterval}턴 필요)`,
    };
  }

  // ━━━ Gate 2: strategyGate — 안정화 전략에서 억제 ━━━
  if (input.strategyType === 'CALMING') {
    return { show: false, reason: 'STRATEGY_GATE: CALMING 전략 — 안정화 우선, 선택지 억제' };
  }

  // ━━━ Gate 3: emotionGate — 감정 극단 시 억제 ━━━
  if (input.emotionScore <= -4) {
    return { show: false, reason: 'EMOTION_GATE: 감정 극단(-4 이하) — 공감만 집중' };
  }

  // ━━━ Gate 4: repetitionGuard — 동일 전략 반복 시 억제 ━━━
  if (input.consecutiveStrategyCount >= 3) {
    return {
      show: false,
      reason: `REPETITION_GUARD: 동일 전략 ${input.consecutiveStrategyCount}회 연속 — 선택지 다양성 부족 예상`,
    };
  }

  // ━━━ Gate 5: personaGate — 대화 초반 억제 ━━━
  const minTurnBeforeFirstSuggestion = input.persona === 'friend' ? 3 : 2;
  if (input.turnCount < minTurnBeforeFirstSuggestion) {
    return {
      show: false,
      reason: `PERSONA_GATE: 대화 초반(${input.turnCount}턴) — 라포 형성 우선`,
    };
  }

  // ━━━ 모든 게이트 통과 ━━━
  return { show: true, reason: 'ALL_GATES_PASSED' };
}
