/**
 * 모델 라우터 (v50 — Gemini 전용)
 *
 * [라우팅 원칙]
 * 모든 태스크를 Gemini로 통일
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

  // 위기 대응: Gemini 2.5 Flash 우선
  if (riskLevel === RiskLevel.CRITICAL || riskLevel === RiskLevel.HIGH) {
    return {
      tier: 'sonnet',
      reason: '🔴 위기 대응: 3.1 Flash-Lite → 2.5 Flash',
      maxTokens: 512,
      cascade,
    };
  }

  // 위기 지원 전략
  if (strategy === StrategyType.CRISIS_SUPPORT) {
    return {
      tier: 'sonnet',
      reason: '🆘 위기 지원: 3.1 Flash-Lite → 2.5 Flash',
      maxTokens: 512,
      cascade,
    };
  }

  // 🆕 v25: 모든 일반 전략 → Gemini Flash 우선 (한국어 품질 최우선)
  const reasonMap: Record<StrategyType, string> = {
    [StrategyType.CALMING]: '🧊 안정화: 3.1 Flash-Lite → 2.5 Flash',
    [StrategyType.CBT]: '🧠 CBT: 3.1 Flash-Lite → 2.5 Flash',
    [StrategyType.ACT]: '💎 ACT: 3.1 Flash-Lite → 2.5 Flash',
    [StrategyType.MI]: '⚖️ MI: 3.1 Flash-Lite → 2.5 Flash',
    [StrategyType.SUPPORT]: '🤗 공감: 3.1 Flash-Lite → 2.5 Flash',
    [StrategyType.CRISIS_SUPPORT]: '🆘 위기: 3.1 Flash-Lite → 2.5 Flash',
  };

  return {
    tier: 'sonnet',
    reason: reasonMap[strategy] || '🤗 공감: 3.1 Flash-Lite → 2.5 Flash',
    maxTokens,
    cascade,
  };
}

/** 모델 티어별 표시 이름 (v51 — 멀티모델) */
export const MODEL_TIER_DISPLAY: Record<ModelTier, string> = {
  haiku: '2 Flash-Lite (분석/라운지)',
  sonnet: '3.1 Flash-Lite (상담 메인)',
  opus: '2.5 Flash (폴백)',
};
