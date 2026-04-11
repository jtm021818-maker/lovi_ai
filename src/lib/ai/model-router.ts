/**
 * 모델 라우터 (v25 — 무료 100명/일 설계)
 *
 * [라우팅 원칙]
 * - 상담 메인: Gemini 2.5 Flash (한국어 최강) → Qwen3-32B → Cerebras 70B
 * - 위기 대화: Gemini 2.5 Flash (공감 ★★★★★)
 * - 이벤트: Gemini 2.5 Flash (임팩트 순간 집중)
 * - 라운지: Qwen3-32B → Cerebras 70B → Gemini Flash-Lite
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
      reason: '🔴 위기 대응: Gemini 2.5 Flash → Qwen3 → Cerebras 70B',
      maxTokens: 512,
      cascade,
    };
  }

  // 위기 지원 전략
  if (strategy === StrategyType.CRISIS_SUPPORT) {
    return {
      tier: 'sonnet',
      reason: '🆘 위기 지원: Gemini 2.5 Flash → Qwen3 → Cerebras 70B',
      maxTokens: 512,
      cascade,
    };
  }

  // 🆕 v25: 모든 일반 전략 → Gemini Flash 우선 (한국어 품질 최우선)
  const reasonMap: Record<StrategyType, string> = {
    [StrategyType.CALMING]: '🧊 안정화: Gemini Flash → Qwen3 → Cerebras 70B',
    [StrategyType.CBT]: '🧠 CBT: Gemini Flash → Qwen3 → Cerebras 70B',
    [StrategyType.ACT]: '💎 ACT: Gemini Flash → Qwen3 → Cerebras 70B',
    [StrategyType.MI]: '⚖️ MI: Gemini Flash → Qwen3 → Cerebras 70B',
    [StrategyType.SUPPORT]: '🤗 공감: Gemini Flash → Qwen3 → Cerebras 70B',
    [StrategyType.CRISIS_SUPPORT]: '🆘 위기: Gemini 2.5 Flash',
  };

  return {
    tier: 'sonnet',  // 🆕 v25: sonnet = Gemini Flash 매핑
    reason: reasonMap[strategy] || '🤗 공감: Gemini Flash → Qwen3 → Cerebras 70B',
    maxTokens,
    cascade,
  };
}

/** 모델 티어별 표시 이름 (v25) */
export const MODEL_TIER_DISPLAY: Record<ModelTier, string> = {
  haiku: 'Cerebras 8B / Groq 8B (분석용)',
  sonnet: 'Gemini 2.5 Flash (상담 메인)',
  opus: 'Gemini 2.5 Flash (위기/이벤트)',
};
