/**
 * 🎯 트리거 매퍼 — ⚠️ v56: 백업 전용
 *
 * 좌뇌의 신호(derived_signals + high_stakes)를 받아
 * 변연계에 발생할 LimbicTrigger 들을 결정.
 *
 * 그 다음 트리거를 실제 ActiveEmotion + 호르몬 변화로 변환.
 *
 * ⚠️ 주의 (v56):
 *   - 기본 동작: 좌뇌의 `hormonal_impact` (LLM 판단)를
 *     `onTurnWithLlmJudgment()` 가 직접 사용.
 *   - 이 파일의 TRIGGER_EFFECTS 고정값은 **LLM 실패 폴백 전용**.
 *   - 신규 개발은 LLM 판단 경로 우선. 이 파일은 안전망.
 */

import type {
  LimbicTrigger,
  TriggerEffect,
  ActiveEmotion,
  LimbicState,
  SignalToTriggerInput,
} from './types';
import { addEmotion, applyHormoneChanges } from './emotion-decay';

// ============================================================
// 트리거 → 효과 매핑 정의
// ============================================================

export const TRIGGER_EFFECTS: Record<LimbicTrigger, TriggerEffect> = {
  // 위기 (가장 강함, 24시간 지속)
  user_crisis: {
    emotion: 'worried',
    intensity: 0.95,
    half_life_hours: 24,
    hormone_changes: { cortisol: 0.6, threat_arousal: 0.8 },
  },
  user_severe_distress: {
    emotion: 'worried',
    intensity: 0.7,
    half_life_hours: 12,
    hormone_changes: { cortisol: 0.4, threat_arousal: 0.4 },
  },

  // 부정 감정 (보통 지속)
  user_crying: {
    emotion: 'sad',
    intensity: 0.6,
    half_life_hours: 4,
    hormone_changes: { oxytocin: 0.2 },  // 슬픔이 친밀감 자극
  },
  user_anger: {
    emotion: 'protective',
    intensity: 0.55,
    half_life_hours: 3,
    hormone_changes: { cortisol: 0.2 },
  },
  partner_betrayal: {
    emotion: 'protective',
    intensity: 0.7,
    half_life_hours: 8,
    hormone_changes: { cortisol: 0.3, threat_arousal: 0.3 },
  },
  user_self_blame: {
    emotion: 'tender',
    intensity: 0.6,
    half_life_hours: 6,
    hormone_changes: { oxytocin: 0.3 },
  },

  // 긍정 감정 (보상 시스템)
  user_breakthrough: {
    emotion: 'joyful',
    intensity: 0.8,
    half_life_hours: 6,
    hormone_changes: { dopamine: 0.7, oxytocin: 0.3 },
  },
  user_recovery: {
    emotion: 'joyful',
    intensity: 0.5,
    half_life_hours: 4,
    hormone_changes: { dopamine: 0.4, oxytocin: 0.2 },
  },
  shared_joy: {
    emotion: 'joyful',
    intensity: 0.6,
    half_life_hours: 5,
    hormone_changes: { dopamine: 0.3, oxytocin: 0.4 },
  },
  deep_disclosure: {
    emotion: 'tender',
    intensity: 0.7,
    half_life_hours: 8,
    hormone_changes: { oxytocin: 0.6 },
  },
  pattern_break: {
    emotion: 'joyful',
    intensity: 0.6,
    half_life_hours: 8,
    hormone_changes: { dopamine: 0.5 },
  },

  // 관계 신호
  first_meeting: {
    emotion: 'curious',
    intensity: 0.5,
    half_life_hours: 6,
    hormone_changes: { oxytocin: 0.1 },
  },
  long_absence_return: {
    emotion: 'tender',
    intensity: 0.4,
    half_life_hours: 4,
    hormone_changes: { oxytocin: 0.3 },
  },
  consistent_visits: {
    emotion: 'calm',
    intensity: 0.3,
    half_life_hours: 12,
    hormone_changes: { oxytocin: 0.2 },
  },
  goodbye_warm: {
    emotion: 'tender',
    intensity: 0.4,
    half_life_hours: 2,
    hormone_changes: { oxytocin: 0.2, dopamine: 0.2 },
  },
};

// ============================================================
// 신호 → 트리거 자동 변환
// ============================================================

/**
 * 좌뇌 출력 + high_stakes 결과를 보고 발동할 트리거들 결정
 */
export function inferTriggersFromSignals(
  input: SignalToTriggerInput,
): LimbicTrigger[] {
  const triggers: LimbicTrigger[] = [];

  // 1. high_stakes 우선
  if (input.high_stakes_type === 'crisis') {
    triggers.push('user_crisis');
  } else if (input.high_stakes_type === 'betrayal') {
    triggers.push('partner_betrayal');
  } else if (input.high_stakes_type === 'rage') {
    triggers.push('user_anger');
  } else if (input.high_stakes_type === 'selfblame') {
    triggers.push('user_self_blame');
  }

  // 2. 유도 신호 매칭
  if (input.derived_signals.crisis_risk && !triggers.includes('user_crisis')) {
    triggers.push('user_crisis');
  }

  if (input.derived_signals.escalating && !triggers.includes('user_anger')) {
    // 격앙은 사용자가 쏟아내는 중 — 보호 모드 활성
    triggers.push('user_severe_distress');
  }

  if (input.derived_signals.helplessness && !triggers.some(t => t === 'user_self_blame')) {
    triggers.push('user_self_blame');
  }

  if (input.derived_signals.insight_moment) {
    triggers.push('user_breakthrough');
  }

  if (input.derived_signals.trust_gain) {
    triggers.push('deep_disclosure');
  }

  // 3. 발화 텍스트에서 직접 감지 (regex 보강)
  const text = input.user_input_excerpt;
  if (/울/.test(text) && !triggers.includes('user_crying')) {
    triggers.push('user_crying');
  }
  if (/와\s*그러고보니|드디어|진짜\s*나/.test(text)) {
    triggers.push('pattern_break');
  }

  return triggers;
}

// ============================================================
// 트리거 → ActiveEmotion 생성
// ============================================================

export function triggerToActiveEmotion(
  trigger: LimbicTrigger,
  triggeredBy: string,
): ActiveEmotion {
  const effect = TRIGGER_EFFECTS[trigger];
  return {
    type: effect.emotion,
    intensity: effect.intensity,
    half_life_hours: effect.half_life_hours,
    triggered_at: new Date().toISOString(),
    triggered_by: triggeredBy,
  };
}

// ============================================================
// 메인: 트리거들을 변연계 상태에 적용
// ============================================================

export function applyTriggersToState(
  state: LimbicState,
  triggers: LimbicTrigger[],
  triggerContext: string,
): LimbicState {
  let newState = state;

  for (const trigger of triggers) {
    const effect = TRIGGER_EFFECTS[trigger];

    // 1. 감정 추가
    const emotion = triggerToActiveEmotion(trigger, triggerContext);
    newState = addEmotion(newState, emotion);

    // 2. 호르몬 변화 적용
    if (effect.hormone_changes) {
      newState = applyHormoneChanges(newState, effect.hormone_changes);
    }
  }

  return newState;
}

// ============================================================
// 세션 시작/종료 자동 트리거
// ============================================================

/**
 * 세션 시작 시 관계 신호 기반 자동 트리거
 */
export function inferSessionStartTriggers(params: {
  isFirstMeeting: boolean;
  daysSinceLastSession: number;
  totalSessions: number;
}): LimbicTrigger[] {
  const triggers: LimbicTrigger[] = [];

  if (params.isFirstMeeting) {
    triggers.push('first_meeting');
  } else if (params.daysSinceLastSession >= 7) {
    triggers.push('long_absence_return');
  }

  if (params.totalSessions >= 5 && params.daysSinceLastSession <= 3) {
    triggers.push('consistent_visits');
  }

  return triggers;
}

/**
 * 세션 종료 시 (따뜻한 마무리 감지)
 */
export function inferSessionEndTriggers(params: {
  lastUserMessage: string;
  sessionWasPositive: boolean;
}): LimbicTrigger[] {
  const triggers: LimbicTrigger[] = [];

  if (params.sessionWasPositive) {
    if (/고마워|좋았어|덕분|편해졌|나아|괜찮아졌/.test(params.lastUserMessage)) {
      triggers.push('goodbye_warm');
    }
  }

  return triggers;
}
