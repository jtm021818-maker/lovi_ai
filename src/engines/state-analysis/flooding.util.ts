/**
 * 플러딩 감지 — 3요소 종합 판단
 *
 * [근거]
 * - Gottman DPA (Diffuse Physiological Arousal): 이성적 대화 불가 상태
 * - 텍스트 기반 흥분 지표: 메시지 길이 폭증, 동일 단어 반복
 * - 연속 메시지 빈도: "반복적 방어 리허설" 패턴
 *
 * 3요소 중 2개 이상 → 플러딩 상태
 */

import { calcEmotionScore } from '@/lib/utils/korean-nlp';

export class FloodingUtil {
  /**
   * 플러딩 감지 (3요소 종합)
   * @param currentMessage 현재 메시지
   * @param recentUserMessages 최근 사용자 메시지들
   * @param timestamps 최근 메시지 타임스탬프 (optional, ISO string[])
   */
  static detect(
    currentMessage: string,
    recentUserMessages: string[],
    timestamps?: string[]
  ): boolean {
    if (recentUserMessages.length < 2) return false;

    let floodingScore = 0;

    // ── 요소 1: 감정 압도 (감정 점수 연속 하락) ──
    const scores = recentUserMessages.slice(-3).map(calcEmotionScore);
    scores.push(calcEmotionScore(currentMessage));
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg <= -3.0) floodingScore++;

    // ── 요소 2: 텍스트 흥분 (길이 폭증 or 단어 반복) ──
    const avgLength =
      recentUserMessages.reduce((sum, m) => sum + m.length, 0) /
      recentUserMessages.length;

    // 현재 메시지가 평균의 2배 이상
    if (currentMessage.length > avgLength * 2 && currentMessage.length > 50) {
      floodingScore++;
    }

    // 같은 2글자+ 단어가 3회 이상 반복 (격앙된 반복)
    if (!floodingScore) {
      const wordCounts = new Map<string, number>();
      const words = currentMessage.match(/[\uAC00-\uD7AF]{2,}/g) || [];
      for (const w of words) {
        wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
      }
      for (const count of wordCounts.values()) {
        if (count >= 3) {
          floodingScore++;
          break;
        }
      }
    }

    // ── 요소 3: 빈도 폭증 (3턴 연속 30초 이내) ──
    if (timestamps && timestamps.length >= 3) {
      const recent = timestamps.slice(-3).map((t) => new Date(t).getTime());
      const allWithin30s =
        recent.length >= 2 &&
        recent.every((t, i) => i === 0 || t - recent[i - 1] < 30_000);
      if (allWithin30s) floodingScore++;
    }

    // 3요소 중 2개 이상 → 플러딩
    return floodingScore >= 2;
  }
}
