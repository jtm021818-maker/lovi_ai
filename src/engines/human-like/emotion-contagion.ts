/**
 * 🆕 v28: Emotion Contagion — 유저 감정 → 루나 감정 전염
 *
 * Mirror Neuron Theory 기반.
 * 유저의 감정이 루나에게 40% 비율로 전이됨.
 * + 상황별 루나 고유 반응 (보호본능, 공감 등)
 *
 * API 호출: 0
 */

import type { LunaEmotionState, LunaEmotion } from './luna-emotion-core';
import { stimulate } from './luna-emotion-core';
import type { UserEmotion } from './turn-context';

const CONTAGION_RATE = 0.4; // 40% 전이

// 유저 감정 → 루나 감정 매핑
const CONTAGION_MAP: Record<UserEmotion, [LunaEmotion, number][]> = {
  anger:      [['angry', CONTAGION_RATE], ['worried', 0.15]],
  sadness:    [['sad', CONTAGION_RATE], ['affection', 0.25]],
  anxiety:    [['anxious', CONTAGION_RATE * 0.6], ['worried', 0.2]],
  loneliness: [['sad', 0.2], ['affection', CONTAGION_RATE]],
  confusion:  [['worried', 0.2], ['calm', 0.1]],
  light:      [['happy', 0.25], ['calm', 0.1]],
  neutral:    [['calm', 0.1]],
};

/**
 * 유저 감정을 루나에게 전염시킴
 *
 * @param state - 현재 루나 감정 상태
 * @param userEmotion - 유저의 감정 카테고리
 * @param userIntensity - 유저 감정 강도 (0~1, emotionScore 기반)
 */
export function applyContagion(
  state: LunaEmotionState,
  userEmotion: UserEmotion,
  userIntensity: number,
): LunaEmotionState {
  const effects = CONTAGION_MAP[userEmotion] ?? [];
  let s = state;

  for (const [emotion, rate] of effects) {
    const stimulusIntensity = userIntensity * rate;
    if (stimulusIntensity > 0.05) { // 임계값 이하 무시
      s = stimulate(s, emotion, stimulusIntensity);
    }
  }

  return s;
}

/**
 * emotionScore(-5~+5) → userIntensity(0~1)
 */
export function scoreToIntensity(emotionScore: number): number {
  // -5 = 매우 부정 → 강도 1.0
  // 0 = 중립 → 강도 0.2
  // +5 = 매우 긍정 → 강도 0.8 (긍정도 강한 감정)
  return Math.min(1.0, Math.max(0.1, Math.abs(emotionScore) / 5));
}
