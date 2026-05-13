/**
 * 모델 라우터 (v63 — Gemini 3.1 통일, 2026-05-13)
 *
 * [라우팅 원칙]
 * - 1순위: 3.1 Flash-Lite GA (정식 출시)
 * - 추론 폴백: 3 Flash Preview
 */

import { StrategyType, RiskLevel } from '@/types/engine.types';
import type { ModelTier } from '@/lib/ai/provider-registry';
import type { CascadeItem } from '@/lib/ai/smart-router';
import { getProviderCascade, getMaxTokensForTask } from '@/lib/ai/smart-router';

/** 모델 선택 결과 */
export interface ModelRouteResult {
  /** 선택된 모델 티어 (레거시 호환) */
  tier: ModelTier;
  /** 선택 이유 */
  reason: string;
  /** 최대 토큰 수 */
  maxTokens: number;
  /** 캐스케이드 체인 */
  cascade: CascadeItem[];
}

/**
 * 전략 기반 모델 라우팅 (v25)
 */
export function routeModel(
  strategy: StrategyType,
  riskLevel: RiskLevel = RiskLevel.LOW
): ModelRouteResult {
  const riskStr = riskLevel as string;
  const cascade = getProviderCascade('main_response', strategy, riskStr as RiskLevel);
  const maxTokens = getMaxTokensForTask('main_response', strategy);

  // 위기 대응: 3 Flash Preview 우선 (강한 추론)
  if (riskLevel === RiskLevel.CRITICAL || riskLevel === RiskLevel.HIGH) {
    return {
      tier: 'opus',
      reason: '🔴 위기 대응: 3 Flash Preview → 3.1 Lite GA',
      maxTokens: 512,
      cascade,
    };
  }

  // 위기 지원 전략
  if (strategy === StrategyType.CRISIS_SUPPORT) {
    return {
      tier: 'opus',
      reason: '🆘 위기 지원: 3 Flash Preview → 3.1 Lite GA',
      maxTokens: 512,
      cascade,
    };
  }

  // 일반 전략 → 3.1 Lite GA 우선 (가성비 + 빠름)
  const reasonMap: Record<StrategyType, string> = {
    [StrategyType.CALMING]: '🧊 안정화: 3.1 Lite GA → 3 Flash Preview',
    [StrategyType.CBT]: '🧠 CBT: 3 Flash Preview → 3.1 Lite GA',
    [StrategyType.ACT]: '💎 ACT: 3 Flash Preview → 3.1 Lite GA',
    [StrategyType.MI]: '⚖️ MI: 3.1 Lite GA → 3 Flash Preview',
    [StrategyType.SUPPORT]: '🤗 공감: 3.1 Lite GA → 3 Flash Preview',
    [StrategyType.CRISIS_SUPPORT]: '🆘 위기: 3 Flash Preview → 3.1 Lite GA',
  };

  return {
    tier: 'sonnet',
    reason: reasonMap[strategy] || '🤗 공감: 3.1 Lite GA → 3 Flash Preview',
    maxTokens,
    cascade,
  };
}

/** 모델 티어별 표시 이름 (v63 — Gemini 3.1 통일) */
export const MODEL_TIER_DISPLAY: Record<ModelTier, string> = {
  haiku: '3.1 Flash-Lite GA (경량)',
  sonnet: '3.1 Flash-Lite GA (메인)',
  opus: '3 Flash Preview (추론 폴백)',
};
