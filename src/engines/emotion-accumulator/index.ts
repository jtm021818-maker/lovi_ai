/**
 * 🆕 v19: 감정 누적기 (Emotion Accumulator)
 *
 * 매 턴 State Analysis에서 추출된 EmotionSignal을 세션 전체에 걸쳐 누적하고,
 * 속마음 가설(deepEmotionHypothesis)을 점진적으로 정밀화.
 *
 * 학술 근거:
 * - EFT Primary/Secondary 감정 모델 (Sue Johnson)
 * - Greenberg 4층 감정 모델
 * - Lieberman Affect Labeling (감정 명명의 치유 효과)
 */

import type { EmotionSignal, EmotionAccumulatorState } from '@/types/engine.types';

const MAX_SIGNALS = 8;

/**
 * 새 감정 신호를 누적하고 속마음 가설을 갱신
 */
export function accumulateSignal(
  currentState: EmotionAccumulatorState | null,
  newSignal: EmotionSignal,
  turnCount: number,
): EmotionAccumulatorState {
  const state: EmotionAccumulatorState = currentState ?? {
    signals: [],
    deepEmotionHypothesis: null,
    surfaceEmotion: null,
  };

  // 턴 번호 설정
  const signal = { ...newSignal, turn: turnCount };

  // 신호 추가 (최대 MAX_SIGNALS개 유지)
  const signals = [...state.signals, signal].slice(-MAX_SIGNALS);

  // 속마음 가설 갱신: primaryEmotion 빈도 + 최근 가중치
  const deepEmotionHypothesis = computeHypothesis(signals);

  return {
    ...state,
    signals,
    deepEmotionHypothesis,
  };
}

/**
 * 온도계 점수를 겉감정으로 변환하여 설정
 */
export function setSurfaceFromThermometer(
  state: EmotionAccumulatorState,
  confirmedScore: number,
): EmotionAccumulatorState {
  let label: string;
  let emoji: string;

  if (confirmedScore <= -3) {
    label = '많이 힘들고 지친 상태';
    emoji = '😢';
  } else if (confirmedScore <= -1) {
    label = '좀 힘들고 복잡한 상태';
    emoji = '😔';
  } else if (confirmedScore <= 1) {
    label = '그냥저냥인 상태';
    emoji = '😐';
  } else if (confirmedScore <= 3) {
    label = '괜찮은 상태';
    emoji = '🙂';
  } else {
    label = '좋은 상태';
    emoji = '😊';
  }

  return {
    ...state,
    surfaceEmotion: { label, score: confirmedScore, emoji },
  };
}

/**
 * 감정 거울 표시 준비 완료 여부 (최소 sanity check)
 *
 * 🆕 v59: 루나극장 트리거는 LLM 자체 판단으로 위임 (앱 방향성 = LLM-as-judge).
 * 여기선 "기술적 최소 조건"만 본다:
 *   - 겉감정 확인됨 (온도계 응답 받음)
 *   - 시그널 1개 이상
 *   - 가설 존재
 *
 * 실제 "연극 만들 재료가 충분한가?" 판단은 mirror-generator 의 LLM 호출이 한다.
 * LLM 이 "재료 부족" 이라고 판단하면 generator 가 null 반환 → 이벤트 자연 스킵.
 */
export function isReadyForMirror(state: EmotionAccumulatorState | null): boolean {
  if (!state) return false;
  return (
    state.surfaceEmotion !== null &&
    state.signals.length >= 1 &&
    state.deepEmotionHypothesis !== null
  );
}

// ============================================
// Internal
// ============================================

/**
 * 누적 신호에서 속마음 가설 계산
 * - primaryEmotion 빈도 집계 (최근 턴 가중치 높게)
 * - 최빈 감정으로 가설 형성
 */
function computeHypothesis(
  signals: EmotionSignal[],
): EmotionAccumulatorState['deepEmotionHypothesis'] {
  // primaryEmotion이 있는 신호만 필터
  const withEmotion = signals.filter((s) => s.primaryEmotion);
  if (withEmotion.length === 0) return null;

  // 가중 빈도 집계 (최근 턴 가중치 높게)
  const weightedCounts = new Map<string, { weight: number; evidence: string[]; eftLayer: string }>();
  const totalSignals = withEmotion.length;

  withEmotion.forEach((signal, idx) => {
    const emotion = signal.primaryEmotion!;
    // 최근 신호일수록 높은 가중치 (0.5 ~ 1.0)
    const weight = 0.5 + (idx / totalSignals) * 0.5;

    const existing = weightedCounts.get(emotion) ?? { weight: 0, evidence: [], eftLayer: signal.eftLayer };
    existing.weight += weight;
    existing.evidence.push(...signal.evidence);
    weightedCounts.set(emotion, existing);
  });

  // 최고 가중치 감정 선택
  let bestEmotion = '';
  let bestData = { weight: 0, evidence: [] as string[], eftLayer: 'secondary_reactive' };

  for (const [emotion, data] of weightedCounts.entries()) {
    if (data.weight > bestData.weight) {
      bestEmotion = emotion;
      bestData = data;
    }
  }

  if (!bestEmotion) return null;

  // 중복 제거 & 최대 5개
  const uniqueEvidence = [...new Set(bestData.evidence)].slice(0, 5);

  // 확신도: 신호 수 + 빈도 기반 (0.3 ~ 0.95)
  const signalCountBonus = Math.min(withEmotion.length * 0.1, 0.3);
  const frequencyBonus = Math.min(bestData.weight / totalSignals, 0.35);
  const confidence = Math.min(0.3 + signalCountBonus + frequencyBonus, 0.95);

  return {
    primaryEmotion: bestEmotion,
    confidence: Math.round(confidence * 100) / 100,
    supportingEvidence: uniqueEvidence,
    eftLayer: bestData.eftLayer,
  };
}
