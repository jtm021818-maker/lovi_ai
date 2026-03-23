/**
 * 모델 라우터 (3사 확장)
 * 전략 + 위기수준 → smart-router 캐스케이드 체인 반환
 *
 * [개편]
 * - AS-IS: 전략 → ModelTier(haiku/sonnet) 반환
 * - TO-BE: 전략 + 위기수준 → 프로바이더별 캐스케이드 체인 반환
 *
 * [라우팅 원칙]
 * - CRISIS: Gemini Pro (최고 품질, 100 RPD)
 * - CBT/ACT/MI: Gemini Flash (심층 추론, 250 RPD)
 * - SUPPORT: Groq Qwen3 (빠른 공감, 60 RPM)
 * - 상태 분석: Groq 8B (초고속, 14,400 RPD)
 */

import { StrategyType, RiskLevel } from '@/types/engine.types';
import type { ModelTier } from '@/lib/ai/provider-registry';
import type { CascadeItem } from '@/lib/ai/smart-router';
import { getProviderCascade, getMaxTokensForTask } from '@/lib/ai/smart-router';

/** 모델 선택 결과 (3사 확장) */
export interface ModelRouteResult {
  /** 선택된 모델 티어 (레거시 호환) */
  tier: ModelTier;
  /** 선택 이유 */
  reason: string;
  /** 최대 토큰 수 */
  maxTokens: number;
  /** 🆕 캐스케이드 체인 */
  cascade: CascadeItem[];
}

/**
 * 전략 기반 모델 라우팅 (3사 확장)
 */
export function routeModel(
  strategy: StrategyType,
  riskLevel: RiskLevel = RiskLevel.LOW
): ModelRouteResult {
  const riskStr = riskLevel as string;
  const cascade = getProviderCascade('main_response', strategy, riskStr as RiskLevel);
  const maxTokens = getMaxTokensForTask('main_response', strategy);

  // 위기 대응: CRITICAL/HIGH → Gemini Pro
  if (riskLevel === RiskLevel.CRITICAL || riskLevel === RiskLevel.HIGH) {
    return {
      tier: 'opus',
      reason: '🔴 위기 대응: Gemini Pro (최고 품질)',
      maxTokens: 512,
      cascade,
    };
  }

  // 전략별 라우팅
  const routeMap: Record<StrategyType, { tier: ModelTier; reason: string }> = {
    [StrategyType.CRISIS_SUPPORT]: {
      tier: 'opus',
      reason: '🆘 위기 지원: Gemini Pro → Flash → Groq 70B',
    },
    [StrategyType.CALMING]: {
      tier: 'haiku',
      reason: '🧊 안정화: Groq Qwen3 (60RPM 최고속)',
    },
    [StrategyType.CBT]: {
      tier: 'sonnet',
      reason: '🧠 CBT: Gemini Flash (심층 추론)',
    },
    [StrategyType.ACT]: {
      tier: 'sonnet',
      reason: '💎 ACT: Gemini Flash (가치 탐색)',
    },
    [StrategyType.MI]: {
      tier: 'sonnet',
      reason: '⚖️ MI: Gemini Flash (OARS 기술)',
    },
    [StrategyType.SUPPORT]: {
      tier: 'haiku',
      reason: '🤗 SUPPORT: Groq Qwen3 (비용 절약, 빠른 응답)',
    },
  };

  const route = routeMap[strategy];

  return {
    tier: route.tier,
    reason: route.reason,
    maxTokens,
    cascade,
  };
}

/** 모델 티어별 표시 이름 (3사 확장) */
export const MODEL_TIER_DISPLAY: Record<ModelTier, string> = {
  haiku: 'Groq Qwen3 / Cerebras 8B',
  sonnet: 'Gemini Flash',
  opus: 'Gemini Pro',
};
