/**
 * 🆕 v6: ReadinessScore 계산
 * 
 * "해결책을 줄 준비가 됐는가?"를 0~100으로 점수화.
 * 70 이상이면 즉시 ACTION 단계로 전이.
 */

import type { ReadinessContext } from './types';

/**
 * 분석 완료도 점수 계산 (0~100)
 * 
 * ── 필수 조건 (0~40점) ──
 * 시나리오 식별: +15
 * 해결책 매칭: +15
 * 높은 매칭 확신: +10
 * 
 * ── 대화 품질 (0~30점) ──
 * 상황 공유: +10
 * 감정 표현: +10
 * 최소 2턴: +10
 * 
 * ── 사용자 신호 (0~20점) ──
 * 조언 요청: +15
 * 턴 5이상 (충분 대화): +5
 * 
 * ── 🆕 v7: 진단 축 완성도 (0~10점) ──
 * 2축 이상: +5
 * 3축 이상: +10
 */
export function calculateReadiness(ctx: ReadinessContext): number {
  let score = 0;

  // ── 필수 조건 (0~40점) ──
  if (ctx.hasScenario) score += 15;
  if (ctx.hasSolutionMatch) score += 15;
  if (ctx.matchScore >= 0.7) score += 10;

  // ── 대화 품질 (0~30점) ──
  if (ctx.hasSharedSituation) score += 10;
  if (ctx.hasExpressedEmotion) score += 10;
  if (ctx.turnCount >= 2) score += 10;

  // ── 사용자 신호 (0~20점) ──
  if (ctx.hasAskedForAdvice) score += 15;
  if (ctx.turnCount >= 5) score += 5;

  // ── 🆕 v7.2: 진단 완료 → 즉시 ACTION 보장 (+25점) ──
  if (ctx.diagnosisComplete) {
    score += 25; // 진단 완료 = 솔루션 준비 완료
  } else if (ctx.axisFilledCount && ctx.axisFilledCount >= 3) {
    score += 10;
  } else if (ctx.axisFilledCount && ctx.axisFilledCount >= 2) {
    score += 5;
  }

  return Math.min(score, 100);
}
