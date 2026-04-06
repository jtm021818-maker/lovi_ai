/**
 * 🎭 감정 상태 머신 (Emotional FSM)
 * 시간 + 이벤트에 따라 캐릭터 감정이 변화
 * API 호출 0회 — 순수 클라이언트 계산
 */

export interface EmotionalState {
  valence: number;   // -1 (부정) ~ +1 (긍정)
  arousal: number;   // -1 (졸림) ~ +1 (활발)
}

export type EmotionLabel =
  | 'joyful' | 'excited' | 'peaceful' | 'sleepy'
  | 'bored' | 'worried' | 'annoyed' | 'sad';

/** 시간대별 기본 감정 변화 */
export function getTimeBasedMood(hour: number, baseMood: number): EmotionalState {
  if (hour < 7) return { valence: baseMood - 0.3, arousal: -0.8 };
  if (hour < 9) return { valence: baseMood, arousal: -0.2 };
  if (hour < 12) return { valence: baseMood + 0.2, arousal: 0.3 };
  if (hour < 14) return { valence: baseMood, arousal: -0.1 };
  if (hour < 17) return { valence: baseMood - 0.1, arousal: 0.1 };
  if (hour < 20) return { valence: baseMood + 0.1, arousal: 0.2 };
  if (hour < 23) return { valence: baseMood, arousal: -0.3 };
  return { valence: baseMood - 0.2, arousal: -0.7 };
}

/** 감정 → 라벨 */
export function getEmotionLabel(state: EmotionalState): EmotionLabel {
  const { valence, arousal } = state;
  if (arousal < -0.5) return 'sleepy';
  if (valence > 0.3 && arousal > 0.2) return 'excited';
  if (valence > 0.2) return 'joyful';
  if (valence > -0.1 && arousal < 0) return 'peaceful';
  if (valence < -0.3 && arousal > 0.2) return 'annoyed';
  if (valence < -0.3) return 'sad';
  if (arousal < -0.2) return 'bored';
  return 'peaceful';
}

/** 감정 → 이모지 */
export function emotionToEmoji(state: EmotionalState): string {
  const label = getEmotionLabel(state);
  const map: Record<EmotionLabel, string> = {
    joyful: '😊', excited: '😆', peaceful: '😌', sleepy: '😴',
    bored: '😐', worried: '😟', annoyed: '😤', sad: '😢',
  };
  return map[label];
}

/** 감정 → 한글 */
export function emotionToKorean(state: EmotionalState): string {
  const label = getEmotionLabel(state);
  const map: Record<EmotionLabel, string> = {
    joyful: '기분 좋음', excited: '신남', peaceful: '평온', sleepy: '졸림',
    bored: '심심', worried: '걱정', annoyed: '짜증', sad: '우울',
  };
  return map[label];
}

/** 감정에 이벤트 효과 적용 */
export function applyEmotionEffect(
  current: EmotionalState,
  effect: Partial<EmotionalState>,
): EmotionalState {
  return {
    valence: clamp(current.valence + (effect.valence ?? 0), -1, 1),
    arousal: clamp(current.arousal + (effect.arousal ?? 0), -1, 1),
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
