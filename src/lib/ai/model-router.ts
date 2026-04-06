/**
 * 모델 라우터 (v24 — 무료 100명/일 설계)
 *
 * [라우팅 원칙]
 * - 매 턴 대화: Qwen3-32B → Cerebras 70B (한도 큰 모델)
 * - 위기 대화: Gemini 2.5 Flash-Lite (공감 ★★★★)
 * - 이벤트: Gemini 2.5 Flash-Lite (Stable, 임팩트 순간 집중)
 * - 상태분석/검증: 8B 모델 (15,000+/일)
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
 * 전략 기반 모델 라우팅 (v22)
 */
export function routeModel(
  strategy: StrategyType,
  riskLevel: RiskLevel = RiskLevel.LOW
): ModelRouteResult {
  const riskStr = riskLevel as string;
  const cascade = getProviderCascade('main_response', strategy, riskStr as RiskLevel);
  const maxTokens = getMaxTokensForTask('main_response', strategy);

  // 위기 대응: Gemini 2.5 Flash-Lite 우선
  if (riskLevel === RiskLevel.CRITICAL || riskLevel === RiskLevel.HIGH) {
    return {
      tier: 'sonnet',
      reason: '🔴 위기 대응: Gemini 2.5 Flash-Lite → Qwen3 → Cerebras 70B',
      maxTokens: 512,
      cascade,
    };
  }

  // 위기 지원 전략
  if (strategy === StrategyType.CRISIS_SUPPORT) {
    return {
      tier: 'sonnet',
      reason: '🆘 위기 지원: Gemini 2.5 Flash-Lite → Qwen3 → Cerebras 70B',
      maxTokens: 512,
      cascade,
    };
  }

  // 모든 일반 전략 → Qwen3 우선 (한도 절약)
  const reasonMap: Record<StrategyType, string> = {
    [StrategyType.CALMING]: '🧊 안정화: Qwen3 → Cerebras 70B',
    [StrategyType.CBT]: '🧠 CBT: Qwen3 → Cerebras 70B',
    [StrategyType.ACT]: '💎 ACT: Qwen3 → Cerebras 70B',
    [StrategyType.MI]: '⚖️ MI: Qwen3 → Cerebras 70B',
    [StrategyType.SUPPORT]: '🤗 공감: Qwen3 → Cerebras 70B',
    [StrategyType.CRISIS_SUPPORT]: '🆘 위기: Gemini 2.5 Flash-Lite',
  };

  return {
    tier: 'haiku',
    reason: reasonMap[strategy] || '🤗 공감: Qwen3 → Cerebras 70B',
    maxTokens,
    cascade,
  };
}

/** 모델 티어별 표시 이름 (v22) */
export const MODEL_TIER_DISPLAY: Record<ModelTier, string> = {
  haiku: 'Qwen3-32B / Cerebras 8B',
  sonnet: 'Gemini 2.5 Flash-Lite / Cerebras 70B',
  opus: 'Gemini 2.5 Flash-Lite (이벤트)',
};
