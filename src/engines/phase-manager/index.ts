/**
 * 🆕 v10: PhaseManager — 5구간 턴별 세분화 + 이벤트 쿨다운
 * 
 * HOOK(1~2) → MIRROR(3~4) → BRIDGE(5~6) → SOLVE(7~8) → EMPOWER(9+)
 * 
 * v10 변경사항:
 * - lastEventTurn 기반 이벤트 쿨다운 (MIN_EVENT_GAP=2)
 * - getTurnInPhase() 메서드 추가 (phase 내 몇 번째 턴인지)
 * - TRANSITION_RULES maxTurn 조정 (좀 더 여유 있게)
 */

import {
  ConversationPhaseV2,
  ConversationPhase,
  PHASE_V2_TO_V1,
  PhaseEventType,
  PhaseTransitionRule,
  ClientIntent,
} from '@/types/engine.types';

// ============================================
// 이벤트 쿨다운 상수
// ============================================

/** 이벤트 간 최소 턴 간격 */
const MIN_EVENT_GAP = 2;

// ============================================
// 전환 규칙 정의 (순차 강제)
// ============================================

const TRANSITION_RULES: PhaseTransitionRule[] = [
  {
    from: 'HOOK',
    to: 'MIRROR',
    minTurn: 2,
    maxTurn: 3,   // 턴 3이면 무조건 MIRROR로
    hardTriggers: {
      eventCompleted: 'EMOTION_THERMOMETER',
    },
  },
  {
    from: 'MIRROR',
    to: 'BRIDGE',
    minTurn: 4,
    maxTurn: 5,   // 턴 5이면 무조건 BRIDGE로
    hardTriggers: {
      axisCount: 3,
    },
  },
  {
    from: 'BRIDGE',
    to: 'SOLVE',
    minTurn: 6,
    maxTurn: 8,   // v10: 7→8 (여유 확보)
    hardTriggers: {
      diagnosisComplete: true,
    },
  },
  {
    from: 'SOLVE',
    to: 'EMPOWER',
    minTurn: 8,
    maxTurn: 11,  // v10: 10→11 (해결책 충분히 전달)
    hardTriggers: {
      eventCompleted: 'SOLUTION_CARD',
    },
  },
];

// ============================================
// 구간별 트리거 이벤트
// ============================================

const PHASE_EVENTS: Record<ConversationPhaseV2, PhaseEventType[]> = {
  HOOK: ['EMOTION_THERMOMETER'],
  MIRROR: ['INSIGHT_CARD'],
  BRIDGE: ['SCALING_QUESTION', 'SOLUTION_PREVIEW'],
  SOLVE: ['SOLUTION_CARD', 'MESSAGE_DRAFT'],
  EMPOWER: ['GROWTH_REPORT'],
};

// ============================================
// 구간 시작 턴 맵 (turnInPhase 계산용)
// ============================================

const PHASE_START_TURNS: Record<ConversationPhaseV2, number> = {
  HOOK: 1,
  MIRROR: 3,
  BRIDGE: 5,
  SOLVE: 7,
  EMPOWER: 9,
};

// ============================================
// PhaseManager 컨텍스트
// ============================================

export interface PhaseContext {
  turnCount: number;
  currentPhase: ConversationPhaseV2;
  completedEvents: PhaseEventType[];
  
  // 🆕 v10: 이벤트 쿨다운
  lastEventTurn: number;
  
  // 진단 상태
  axisFilledCount: number;
  diagnosisComplete: boolean;
  
  // 사용자 의도
  primaryIntent?: ClientIntent;
  hasAskedForAdvice: boolean;
  hasGivenPermission: boolean;
  
  // 감정 기준선
  emotionBaseline?: number;
  currentEmotionScore: number;
  
  // readiness
  readinessScore: number;
  solutionMatchCount: number;
}

// ============================================
// PhaseManager 클래스
// ============================================

export class PhaseManager {
  
  /**
   * v10: 순차 강제 — 모든 구간을 반드시 순서대로 통과
   */
  static getCurrentPhase(ctx: PhaseContext): ConversationPhaseV2 {
    const { turnCount, currentPhase } = ctx;
    
    const rule = TRANSITION_RULES.find(r => r.from === currentPhase);
    if (!rule) {
      return currentPhase;
    }
    
    if (turnCount >= rule.maxTurn) {
      console.log(`[PhaseManager] ⏰ maxTurn(${rule.maxTurn}) 도달 → ${rule.to} (현재: ${currentPhase}, 턴: ${turnCount})`);
      return rule.to;
    }
    
    if (turnCount >= rule.minTurn) {
      if (this.checkHardTriggers(ctx, rule)) {
        console.log(`[PhaseManager] ✅ 하드트리거 충족 → ${rule.to} (턴 ${turnCount})`);
        return rule.to;
      }
    }
    
    return currentPhase;
  }
  
  /**
   * 하드 트리거 조건 확인 (OR 조건)
   */
  private static checkHardTriggers(ctx: PhaseContext, rule: PhaseTransitionRule): boolean {
    const { hardTriggers } = rule;
    
    if (hardTriggers.diagnosisComplete && ctx.diagnosisComplete) return true;
    if (hardTriggers.adviceRequested && ctx.hasAskedForAdvice) return true;
    if (hardTriggers.eventCompleted && ctx.completedEvents.includes(hardTriggers.eventCompleted)) return true;
    if (hardTriggers.axisCount && ctx.axisFilledCount >= hardTriggers.axisCount) return true;
    if (hardTriggers.readinessScore && ctx.readinessScore >= hardTriggers.readinessScore) return true;
    
    return false;
  }
  
  /**
   * 현재 구간에서 트리거해야 할 이벤트 결정
   */
  static getPhaseEvents(phase: ConversationPhaseV2, ctx: PhaseContext): PhaseEventType[] {
    const available = PHASE_EVENTS[phase] || [];
    return available.filter(e => !ctx.completedEvents.includes(e));
  }
  
  /**
   * 🆕 v10: 이벤트 쿨다운 + 턴 조건 결합
   * 
   * 1. 이미 완료된 이벤트는 건너뜀
   * 2. lastEventTurn > 0 && gap < MIN_EVENT_GAP → 쿨다운 차단
   * 3. 이벤트별 Phase/턴 조건 체크
   */
  static shouldTriggerEvent(
    phase: ConversationPhaseV2,
    eventType: PhaseEventType,
    ctx: PhaseContext
  ): boolean {
    // 이미 완료된 이벤트 건너뜀
    if (ctx.completedEvents.includes(eventType)) return false;
    
    // 🆕 v10: 이벤트 쿨다운 체크
    if (ctx.lastEventTurn > 0) {
      const gap = ctx.turnCount - ctx.lastEventTurn;
      if (gap < MIN_EVENT_GAP) {
        console.log(`[PhaseManager] ⏳ 쿨다운: ${eventType} 건너뜀 (gap=${gap} < ${MIN_EVENT_GAP}, 턴 ${ctx.turnCount})`);
        return false;
      }
    }
    
    switch (eventType) {
      case 'EMOTION_THERMOMETER':
        // HOOK 구간, 턴 2에서 표시
        return phase === 'HOOK' && ctx.turnCount >= 2;
        
      case 'INSIGHT_CARD':
        // MIRROR 구간 (턴 3~4)
        return phase === 'MIRROR' && ctx.turnCount >= 3;
        
      case 'SCALING_QUESTION':
        // BRIDGE 구간 첫 턴 (턴 5~6)
        return phase === 'BRIDGE' && ctx.turnCount >= 5;
        
      case 'SOLUTION_PREVIEW':
        // BRIDGE 구간, 솔루션 매칭 + 턴 6+
        return phase === 'BRIDGE' && ctx.solutionMatchCount > 0 && ctx.turnCount >= 6;
        
      case 'SOLUTION_CARD':
        // SOLVE 구간 진입 시
        return phase === 'SOLVE';
        
      case 'MESSAGE_DRAFT':
        // SOLVE 구간, 솔루션 카드 완료 후
        return phase === 'SOLVE' && ctx.completedEvents.includes('SOLUTION_CARD');
        
      case 'GROWTH_REPORT':
        // EMPOWER 구간 (감정 기준선 있을 때)
        return phase === 'EMPOWER' && ctx.emotionBaseline !== undefined;
        
      default:
        return false;
    }
  }
  
  /**
   * 🆕 v10: Phase 내 턴 번호 계산
   * 
   * 예: MIRROR 구간에서 턴 3이면 turnInPhase = 1
   *     MIRROR 구간에서 턴 4이면 turnInPhase = 2
   */
  static getTurnInPhase(phase: ConversationPhaseV2, turnCount: number): number {
    const startTurn = PHASE_START_TURNS[phase];
    return Math.max(1, turnCount - startTurn + 1);
  }
  
  /**
   * v2 → v1 레거시 Phase 매핑
   */
  static toLegacyPhase(phase: ConversationPhaseV2): ConversationPhase {
    return PHASE_V2_TO_V1[phase];
  }
  
  /**
   * 초기 Phase 결정
   */
  static getInitialPhase(): ConversationPhaseV2 {
    return 'HOOK';
  }
  
  /**
   * Phase 순서 인덱스 (진행률 계산용)
   */
  static getPhaseIndex(phase: ConversationPhaseV2): number {
    const order: ConversationPhaseV2[] = ['HOOK', 'MIRROR', 'BRIDGE', 'SOLVE', 'EMPOWER'];
    return order.indexOf(phase);
  }
  
  /**
   * Phase 진행률 (0~100%)
   */
  static getProgress(phase: ConversationPhaseV2): number {
    return (this.getPhaseIndex(phase) / 4) * 100;
  }
}
