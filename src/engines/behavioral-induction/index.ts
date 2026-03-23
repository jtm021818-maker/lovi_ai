import { StrategyResult, StrategyType, NudgeAction } from '@/types/engine.types';

/**
 * 행동 유도 엔진
 * 전략에 따라 적절한 Nudge 액션을 선택
 */
export class BehavioralInductionEngine {
  private static instance: BehavioralInductionEngine;

  static getInstance(): BehavioralInductionEngine {
    if (!BehavioralInductionEngine.instance) {
      BehavioralInductionEngine.instance = new BehavioralInductionEngine();
    }
    return BehavioralInductionEngine.instance;
  }

  selectNudges(strategy: StrategyResult): NudgeAction[] {
    const nudges: NudgeAction[] = [];

    switch (strategy.strategyType) {
      case StrategyType.CRISIS_SUPPORT:
        nudges.push({
          type: 'quick_reply',
          title: '전문 상담 안내',
          description: '전문 상담사와 이야기해보시는 건 어떨까요?',
          data: { options: ['전문 상담 연결하고 싶어요', '지금은 여기서 이야기할래요', '괜찮아요'] },
        });
        break;

      case StrategyType.CALMING:
        nudges.push({
          type: 'calming_timer',
          title: '마음 진정 타이머',
          description: '20분간 마음을 가라앉히는 시간을 가져보세요.',
          data: { durationMinutes: 20 },
        });
        nudges.push({
          type: 'breathing_guide',
          title: '호흡 가이드',
          description: '4-7-8 호흡법으로 마음을 안정시켜 보세요.',
        });
        break;

      case StrategyType.CBT:
        nudges.push({
          type: 'thought_record',
          title: '생각 기록하기',
          description: '지금 떠오르는 생각과 그 증거를 적어보세요.',
        });
        break;

      case StrategyType.ACT:
        nudges.push({
          type: 'value_explore',
          title: '나의 핵심 가치',
          description: '관계에서 가장 중요하게 여기는 가치는 무엇인가요?',
        });
        break;

      case StrategyType.MI:
        nudges.push({
          type: 'importance_ruler',
          title: '중요도 척도',
          description: '변화하고 싶은 마음을 1~10점으로 표현해 주세요.',
          data: { min: 1, max: 10 },
        });
        break;

      case StrategyType.SUPPORT:
        nudges.push({
          type: 'emotion_feedback',
          title: '감정 체크인',
          description: '지금 느끼는 감정을 골라보세요.',
          data: {
            emotions: ['불안', '서운', '외로움', '분노', '슬픔', '혼란', '기대', '설렘', '안도'],
          },
        });
        break;
    }

    return nudges;
  }
}
