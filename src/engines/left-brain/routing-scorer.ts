/**
 * 🎯 라우팅 점수 계산기
 *
 * 좌뇌(Gemini)가 스스로 판단:
 *   "이 응답은 내가 처리해도 돼" → gemini
 *   "이건 Claude가 필요해"        → claude
 *
 * 점수 0~20:
 *   < 5     : Gemini 단독 (단순 공감)
 *   5 ~ 7   : Gemini 단독, 단 confidence 낮으면 승격
 *   ≥ 7     : Claude 호출 (섬세함 필요)
 *   ≥ 12    : Claude + 위기 모드
 */

import type {
  StateVector,
  SomaticMarker,
  SecondOrderToM,
  DerivedSignals,
  RoutingDecision,
} from './types';
import { countActiveSignals } from './derived-signals';
import { ssrAlertWeight } from './somatic-marker';

export interface ScoringInput {
  state: StateVector;
  somatic: SomaticMarker;
  tom: SecondOrderToM;
  signals: DerivedSignals;
  complexity: number;     // 1~5
  confidence: number;     // 0~1
  ambiguity_signals_count: number;
  high_stakes_detected: boolean;
  high_stakes_type?: string | null;

  // 세션 맥락
  session_turn_count: number;
  recent_claude_calls: number;  // 최근 3턴 중 Claude 사용 횟수
  intimacy_level: number;       // 1~5 외부 친밀도 시스템
}

export function calculateRoutingScore(input: ScoringInput): RoutingDecision {
  const breakdown = {
    high_stakes: 0,
    complexity: 0,
    low_confidence: 0,
    ambiguity: 0,
    urgency: 0,
    low_meta: 0,
    tom_mismatch: 0,
    somatic_alert: 0,
  };

  // 1. 고위험 신호 (regex 매칭) — +10 (압도적)
  if (input.high_stakes_detected) {
    breakdown.high_stakes = 10;
  }

  // 2. 복잡도 — 1.5x 가중
  breakdown.complexity = input.complexity * 1.5;

  // 3. 확신도 낮음 — 5x 페널티
  breakdown.low_confidence = (1 - input.confidence) * 5;

  // 4. 애매함 신호 — 신호당 2점
  breakdown.ambiguity = input.ambiguity_signals_count * 2;

  // 5. 긴급도 — 5x 가중
  breakdown.urgency = input.state.U * 5;

  // 6. 메타인지 낮음 (유저가 자기 상태 모름) — 2x
  breakdown.low_meta = (1 - input.state.M) * 2;

  // 7. 2차 ToM mismatch (표면 ≠ 실제) — +3
  if (input.tom.expected_from_luna.mismatch) {
    breakdown.tom_mismatch = 3;
  }

  // 8. 소마틱 alert (heavy/sharp/cold/tight) — 강도 비례
  breakdown.somatic_alert = ssrAlertWeight(input.somatic);

  // 합계
  let totalScore = Object.values(breakdown).reduce((s, v) => s + v, 0);

  // ──────────────────────────────────────
  // 동적 임계값 조정 (맥락 민감성)
  // 🆕 v56: 90% Gemini ACE v5 / 10% Claude 정책
  //        Gemini 도 ACE v5 로 4트랙 사고하므로 품질 충분
  //        Claude 는 진짜 복잡한 10% 만
  // ──────────────────────────────────────
  let dynamicThreshold = 13;   // 기존 7 → 13 (Claude 희귀)

  // 세션 초반 (3턴 이내) — 첫인상 중요해도 Gemini ACE v5 로 충분
  // (기존에는 -2 했지만 이젠 유지)

  // 친밀도 높음 → 더 편한 Gemini 톤
  if (input.intimacy_level >= 4) {
    dynamicThreshold += 1;
  }

  // 위기 신호는 무조건 Claude (high_stakes 가 이미 +10)
  // 복잡도 5 (최상) + 애매함 → Claude 영역
  // 그 외 일반 상황 → Gemini ACE v5

  // 최근 Claude 많이 썼으면 한 번 쉬어가기 (대화 리듬)
  if (input.recent_claude_calls >= 2) {
    dynamicThreshold += 1;
  }

  // ──────────────────────────────────────
  // 활성 신호 보너스 (복합 상황)
  // ──────────────────────────────────────
  const activeSignalCount = countActiveSignals(input.signals);
  if (activeSignalCount >= 3) {
    totalScore += 2;
  }

  // ──────────────────────────────────────
  // 결정
  // ──────────────────────────────────────
  const recommended = totalScore >= dynamicThreshold ? 'claude' : 'gemini';

  // 결정 이유 결정 (가장 큰 기여 요소)
  const sortedReasons = Object.entries(breakdown)
    .filter(([_, v]) => v > 0)
    .sort(([_, a], [__, b]) => b - a);

  let primary_reason: string;
  if (recommended === 'claude') {
    if (input.high_stakes_detected) {
      primary_reason = `고위험 신호 감지 (${input.high_stakes_type ?? 'unknown'})`;
    } else if (sortedReasons.length > 0) {
      const [topKey, topValue] = sortedReasons[0];
      primary_reason = `${KEY_TO_KOREAN[topKey] ?? topKey} (+${topValue.toFixed(1)})`;
    } else {
      primary_reason = '점수 임계값 초과';
    }
  } else {
    primary_reason = `단순 응답 가능 (점수 ${totalScore.toFixed(1)} < 임계값 ${dynamicThreshold})`;
  }

  return {
    recommended,
    score: Number(totalScore.toFixed(2)),
    primary_reason,
    score_breakdown: breakdown,
  };
}

const KEY_TO_KOREAN: Record<string, string> = {
  high_stakes: '고위험',
  complexity: '복잡도',
  low_confidence: '낮은 확신도',
  ambiguity: '애매함',
  urgency: '긴급도',
  low_meta: '낮은 자기인식',
  tom_mismatch: '표면-실제 차이',
  somatic_alert: '소마틱 경보',
};

/**
 * 응답 후 학습용: 라우팅이 적절했는지 평가
 * (유저 피드백 기반 임계값 조정에 사용)
 */
export interface RoutingFeedback {
  decision: RoutingDecision;
  user_feedback?: number;   // -1, 0, +1
  response_quality?: number; // 0~1
}

export function shouldAdjustThreshold(
  recentFeedback: RoutingFeedback[]
): { adjustment: number; reason: string } {
  if (recentFeedback.length < 10) {
    return { adjustment: 0, reason: '데이터 부족 (10개 미만)' };
  }

  // Gemini 결정인데 유저가 부정 피드백 → 임계값 하향 (Claude 더 자주)
  const geminiBads = recentFeedback.filter(
    f => f.decision.recommended === 'gemini' && (f.user_feedback ?? 0) < 0
  ).length;

  // Claude 결정인데 유저가 무관심 → 임계값 상향 (낭비)
  const claudeWastes = recentFeedback.filter(
    f => f.decision.recommended === 'claude' && (f.response_quality ?? 1) < 0.5
  ).length;

  if (geminiBads >= 3) return { adjustment: -1, reason: 'Gemini 결정 부정적 피드백 누적' };
  if (claudeWastes >= 3) return { adjustment: +1, reason: 'Claude 호출 효과 미미' };

  return { adjustment: 0, reason: '안정적' };
}
