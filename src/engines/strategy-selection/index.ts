import {
  StateResult,
  StrategyResult,
  StrategyType,
  RiskLevel,
} from '@/types/engine.types';

/**
 * 전략 선택 엔진 (5단계 위기 분류 연동)
 *
 * 우선순위:
 * 1. CRISIS_SUPPORT — riskLevel = HIGH (간접 자살 암시)
 * 2. CALMING — 플러딩 or riskLevel = MEDIUM_HIGH
 * 3. CBT — 인지 왜곡 감지
 * 4. ACT — 감정 억압 + 부정적
 * 5. MI — 양가감정
 * 6. SUPPORT — 기본
 */
export class StrategySelectionEngine {
  private static instance: StrategySelectionEngine;

  static getInstance(): StrategySelectionEngine {
    if (!StrategySelectionEngine.instance) {
      StrategySelectionEngine.instance = new StrategySelectionEngine();
    }
    return StrategySelectionEngine.instance;
  }

  selectStrategy(state: StateResult): StrategyResult {
    // 🆕 CRISIS_SUPPORT — 간접적 자살 암시 (HIGH)
    if (state.riskLevel === RiskLevel.HIGH) {
      return {
        strategyType: StrategyType.CRISIS_SUPPORT,
        reason: '간접적 자살 암시 감지 — 순수 공감 + 전문기관 안내',
        priority: 0,
        thinkingBudget: 'medium',
        modelTier: 'sonnet',
      };
    }

    // CALMING — 플러딩 or 극단적 절망 (MEDIUM_HIGH)
    if (state.isFlooding || state.riskLevel === RiskLevel.MEDIUM_HIGH) {
      return {
        strategyType: StrategyType.CALMING,
        reason: state.isFlooding
          ? '감정 플러딩 감지 — 안정화 우선'
          : '극단적 절망/무기력 — 안정화 우선',
        priority: 1,
        thinkingBudget: 'low',
        modelTier: 'sonnet',
      };
    }

    // CBT — 인지 왜곡 감지
    if (state.cognitiveDistortions.length > 0) {
      return {
        strategyType: StrategyType.CBT,
        reason: `인지 왜곡 감지: ${state.cognitiveDistortions.join(', ')}`,
        priority: 2,
        thinkingBudget: 'medium',
        modelTier: 'sonnet',
      };
    }

    // ACT — 감정 억압 + 부정적
    if (state.linguisticProfile.isSuppressive && state.emotionScore < 0) {
      return {
        strategyType: StrategyType.ACT,
        reason: '감정 억압 + 부정적 감정 → 수용 전념',
        priority: 3,
        thinkingBudget: 'medium',
        modelTier: 'sonnet',
      };
    }

    // MI — 양가감정
    if (state.linguisticProfile.isAmbivalent) {
      return {
        strategyType: StrategyType.MI,
        reason: '양가감정 감지 → 동기강화',
        priority: 4,
        thinkingBudget: 'medium',
        modelTier: 'sonnet',
      };
    }

    // SUPPORT — 기본
    return {
      strategyType: StrategyType.SUPPORT,
      reason: '기본 공감 지지',
      priority: 5,
      thinkingBudget: 'low',
      modelTier: 'haiku',
    };
  }
}
