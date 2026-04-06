/**
 * 🆕 v19: PhaseManager — 상대적 이벤트 타이밍 시스템
 *
 * 절대 턴 기반이 아닌, 직전 이벤트 기준 상대 턴으로 이벤트 발동.
 * 예: 온도계 1~5턴 후 → 온도계 끝나면 2~3턴 후 거울 → ...
 *
 * Phase 전환은 여전히 순차 강제 (HOOK → MIRROR → BRIDGE → SOLVE → EMPOWER)
 */

import {
  ConversationPhaseV2,
  ConversationPhase,
  PHASE_V2_TO_V1,
  PhaseEventType,
  PhaseTransitionRule,
  ClientIntent,
} from '@/types/engine.types';
import type { PersonaMode } from '@/types/persona.types';

// ============================================
// 🆕 v21: Phase별 이벤트 + 발동 타이밍 (Phase 내 상대 턴 기준)
// gap 시스템 제거 → Phase의 minTurn/maxTurn이 이벤트 타이밍
// ============================================

/** Phase별 이벤트 목록 + 발동 조건 */
interface PhaseEventConfig {
  /** 소속 Phase */
  phase: ConversationPhaseV2;
  /** Phase 내 최소 N턴 후 발동 (이전에 충분히 대화) */
  minTurnInPhase: number;
  /** Phase 내 최대 N턴이면 강제 발동 */
  maxTurnInPhase: number;
  /** 선행 이벤트 (이 이벤트가 완료되어야 발동) */
  requiresEvent?: PhaseEventType;
}

/** 🆕 v22: 이벤트 간 글로벌 최소 간격 (연속 표시 방지) */
const MIN_EVENT_GAP = 3;

const EVENT_CONFIG: Record<string, PhaseEventConfig> = {
  // Luna 전용 이벤트
  EMOTION_THERMOMETER: { phase: 'HOOK',    minTurnInPhase: 2, maxTurnInPhase: 5 },
  EMOTION_MIRROR:      { phase: 'MIRROR',  minTurnInPhase: 3, maxTurnInPhase: 6 },
  PATTERN_MIRROR:      { phase: 'BRIDGE',  minTurnInPhase: 3, maxTurnInPhase: 5 },
  SOLUTION_PREVIEW:    { phase: 'BRIDGE',  minTurnInPhase: 2, maxTurnInPhase: 4, requiresEvent: 'PATTERN_MIRROR' },
  SOLUTION_CARD:       { phase: 'SOLVE',   minTurnInPhase: 1, maxTurnInPhase: 3 },
  MESSAGE_DRAFT:       { phase: 'SOLVE',   minTurnInPhase: 1, maxTurnInPhase: 3, requiresEvent: 'SOLUTION_CARD' },
  // 공통 EMPOWER 이벤트
  SESSION_SUMMARY:     { phase: 'EMPOWER', minTurnInPhase: 1, maxTurnInPhase: 2 },
  HOMEWORK_CARD:       { phase: 'EMPOWER', minTurnInPhase: 1, maxTurnInPhase: 2, requiresEvent: 'SESSION_SUMMARY' },
  GROWTH_REPORT:       { phase: 'EMPOWER', minTurnInPhase: 1, maxTurnInPhase: 2, requiresEvent: 'HOMEWORK_CARD' },
  // 🆕 v26: 타로냥 — AXIS_COLLECT 제거, 대화 3턴 후 바로 TAROT_DRAW
  // 전문 타로 리더 방식: 충분히 듣고 → 질문 구체화 → 바로 스프레드
  TAROT_AXIS_COLLECT:  { phase: 'HOOK',    minTurnInPhase: 99, maxTurnInPhase: 99 }, // 비활성화 (발동 안 됨)
  TAROT_DRAW:          { phase: 'HOOK',    minTurnInPhase: 3, maxTurnInPhase: 3 },   // HOOK 3턴에 바로 발동
  TAROT_INSIGHT:       { phase: 'SOLVE',   minTurnInPhase: 1, maxTurnInPhase: 2, requiresEvent: 'TAROT_DRAW' },
};

// ============================================
// 전환 규칙 정의 (순차 강제)
// ============================================

// 🆕 v20: minTurn/maxTurn은 이제 **Phase 시작 기준 상대 턴**
// 예: MIRROR minTurn=2 → MIRROR에서 2턴 이상 대화한 후에만 전환
const TRANSITION_RULES: PhaseTransitionRule[] = [
  {
    from: 'HOOK',
    to: 'MIRROR',
    minTurn: 2,   // HOOK에서 최소 2턴
    maxTurn: 3,   // 🆕 v24: 5→3 (타로냥은 빠르게 카드로 넘어가야)
    hardTriggers: {
      eventCompleted: 'EMOTION_THERMOMETER',
    },
  },
  {
    from: 'MIRROR',
    to: 'BRIDGE',
    minTurn: 1,   // 🆕 v24: 타로냥은 MIRROR 즉시 통과 (AXIS_COLLECT가 MIRROR도 대체)
    maxTurn: 3,   // 🆕 v24: 3→최대 (루나도 빠르게)
    hardTriggers: {
      eventCompleted: 'EMOTION_MIRROR',
    },
  },
  {
    from: 'BRIDGE',
    to: 'SOLVE',
    minTurn: 1,   // 🆕 v24: 3→1 (TAROT_DRAW 완료 즉시 전환)
    maxTurn: 3,   // 🆕 v24: 5→3
    hardTriggers: {
      eventCompleted: 'PATTERN_MIRROR',
    },
  },
  {
    from: 'SOLVE',
    to: 'EMPOWER',
    minTurn: 1,   // 🆕 v24: 2→1 (TAROT_INSIGHT 완료 즉시 전환)
    maxTurn: 3,   // 🆕 v24: 4→3
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
  MIRROR: ['EMOTION_MIRROR'],
  BRIDGE: ['PATTERN_MIRROR', 'SOLUTION_PREVIEW', 'TAROT_DRAW'],
  SOLVE: ['SOLUTION_CARD', 'MESSAGE_DRAFT', 'TAROT_INSIGHT'],
  EMPOWER: ['SESSION_SUMMARY', 'HOMEWORK_CARD', 'GROWTH_REPORT'],
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

  // 페르소나 모드 (이벤트 필터링용)
  persona?: PersonaMode;

  // 🆕 v20: Phase 시작 턴 (상대 턴 계산용)
  phaseStartTurn: number;

  // 🆕 v16: 감정 체크 준비도 (적응형 타이밍)
  emotionCheckReadiness?: {
    delaySignals: string[];
    readySignals: string[];
    isReady: boolean;
  };
}

// ============================================
// PhaseManager 클래스
// ============================================

export class PhaseManager {
  
  /**
   * v10: 순차 강제 — 모든 구간을 반드시 순서대로 통과
   */
  static getCurrentPhase(ctx: PhaseContext): ConversationPhaseV2 {
    const { turnCount, currentPhase, phaseStartTurn } = ctx;

    const rule = TRANSITION_RULES.find(r => r.from === currentPhase);
    if (!rule) {
      return currentPhase;
    }

    // 🆕 v20: Phase 내 상대 턴 계산 (절대 턴 - Phase 시작 턴)
    const turnsInPhase = turnCount - phaseStartTurn;

    // 🆕 v24: 절대 maxTurn — 이벤트 미완료여도 강제 전환 (고착 방지)
    const ABSOLUTE_MAX: Record<string, number> = { HOOK: 3, MIRROR: 2, BRIDGE: 3, SOLVE: 3, EMPOWER: 3 };
    if (turnsInPhase >= (ABSOLUTE_MAX[currentPhase] ?? 6)) {
      console.log(`[PhaseManager] 🚨 절대 maxTurn(${ABSOLUTE_MAX[currentPhase]}) 도달 → 강제 ${rule.to} (hardTrigger 무시)`);
      return rule.to;
    }

    if (turnsInPhase >= rule.maxTurn) {
      // 🆕 v21+v23: 필수 이벤트가 미완료면 전환하지 않음 (타로 대체 이벤트도 체크)
      if (rule.hardTriggers.eventCompleted && !this.checkHardTriggers(ctx, rule)) {
        console.log(`[PhaseManager] ⏳ maxTurn 도달했지만 hardTrigger 미충족 → 전환 보류 (이벤트 먼저)`);
        return currentPhase;
      }
      console.log(`[PhaseManager] ⏰ maxTurn(${rule.maxTurn}) 도달 → ${rule.to} (phase내 ${turnsInPhase}턴, 전체 턴${turnCount})`);
      return rule.to;
    }

    if (turnsInPhase >= rule.minTurn) {
      if (this.checkHardTriggers(ctx, rule)) {
        console.log(`[PhaseManager] ✅ 하드트리거 충족 → ${rule.to} (phase내 ${turnsInPhase}턴, 전체 턴${turnCount})`);
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
    if (hardTriggers.eventCompleted) {
      const mainDone = ctx.completedEvents.includes(hardTriggers.eventCompleted);
      // 타로냥 페르소나: Luna 이벤트 대신 대응하는 타로 이벤트로 충족
      const tarotAltDone = ctx.persona === 'tarot' && (
        // 🆕 v26: HOOK→MIRROR: 타로냥은 TAROT_DRAW 완료 시 전환 (AXIS_COLLECT 제거됨)
        (hardTriggers.eventCompleted === 'EMOTION_THERMOMETER' && ctx.completedEvents.includes('TAROT_DRAW')) ||
        (hardTriggers.eventCompleted === 'EMOTION_MIRROR'   && ctx.completedEvents.includes('TAROT_DRAW')) ||
        (hardTriggers.eventCompleted === 'PATTERN_MIRROR'   && ctx.completedEvents.includes('TAROT_DRAW')) ||
        (hardTriggers.eventCompleted === 'SOLUTION_CARD'    && ctx.completedEvents.includes('TAROT_INSIGHT'))
      );
      if (mainDone || tarotAltDone) return true;
    }
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
   * 🆕 v21: 단순화된 이벤트 발동 시스템
   *
   * Phase의 minTurn/maxTurn이 이벤트 타이밍을 결정:
   * - Phase 내 턴 < minTurnInPhase → 차단
   * - Phase 내 턴 >= maxTurnInPhase → 강제 발동
   * - 사이 → readiness 등 추가 조건 체크
   */
  static shouldTriggerEvent(
    phase: ConversationPhaseV2,
    eventType: PhaseEventType,
    ctx: PhaseContext
  ): boolean {
    // 이미 완료된 이벤트 건너뜀
    if (ctx.completedEvents.includes(eventType)) return false;

    // 레거시 이벤트 무시
    if (eventType === 'INSIGHT_CARD') return false;

    // 타로냥 전용 이벤트 — tarot 페르소나에서만
    if ((eventType === 'TAROT_DRAW' || eventType === 'TAROT_AXIS_COLLECT' || eventType === 'TAROT_INSIGHT') && ctx.persona !== 'tarot') return false;

    // tarot 페르소나에서는 Luna 전용 이벤트 스킵
    if (ctx.persona === 'tarot' && (
      eventType === 'EMOTION_THERMOMETER' ||
      eventType === 'EMOTION_MIRROR' ||
      eventType === 'PATTERN_MIRROR' ||
      eventType === 'SOLUTION_PREVIEW' ||
      eventType === 'SOLUTION_CARD' ||
      eventType === 'MESSAGE_DRAFT'
    )) return false;

    // 🆕 v22: 이벤트 간 글로벌 쿨다운 (연속 표시 방지)
    // 🆕 v23: 타로 연속 이벤트는 쿨다운 스킵 (스프레드 선택→카드 뽑기가 즉시 연결되어야 자연스러움)
    const isTarotEvent = eventType === 'TAROT_DRAW' || eventType === 'TAROT_AXIS_COLLECT' || eventType === 'TAROT_INSIGHT';
    if (!isTarotEvent && ctx.lastEventTurn > 0 && (ctx.turnCount - ctx.lastEventTurn) < MIN_EVENT_GAP) {
      console.log(`[PhaseManager] ⏳ 글로벌 쿨다운: 마지막이벤트 턴${ctx.lastEventTurn}, 현재 턴${ctx.turnCount}, 최소간격${MIN_EVENT_GAP}`);
      return false;
    }

    // 이벤트 설정 조회
    const config = EVENT_CONFIG[eventType];
    if (!config) return false;

    // Phase 체크
    if (phase !== config.phase) return false;

    // 선행 이벤트 체크
    if (config.requiresEvent && !ctx.completedEvents.includes(config.requiresEvent)) return false;

    // Phase 내 상대 턴 계산
    const turnsInPhase = ctx.turnCount - ctx.phaseStartTurn;

    // 🆕 v24: phase 전환 직후(turnsInPhase=0) 이벤트 차단 — 단, 타로 체인은 예외
    if (turnsInPhase <= 0) {
      const isTarotChain =
        (eventType === 'TAROT_DRAW' && ctx.completedEvents.includes('TAROT_AXIS_COLLECT')) ||
        (eventType === 'TAROT_INSIGHT' && ctx.completedEvents.includes('TAROT_DRAW'));
      if (!isTarotChain) {
        console.log(`[PhaseManager] 🚫 ${eventType}: phase 전환 직후 (turnsInPhase=${turnsInPhase}) → 차단`);
        return false;
      }
      console.log(`[PhaseManager] 🔮 ${eventType}: 타로 체인 → phase 전환 직후에도 허용`);
    }

    // minTurn 미달 → 차단
    if (turnsInPhase < config.minTurnInPhase) {
      console.log(`[PhaseManager] ⏳ ${eventType}: phase내 ${turnsInPhase}턴 < min ${config.minTurnInPhase}`);
      return false;
    }

    // maxTurn 도달 → 강제 발동 (단, 글로벌 쿨다운은 이미 통과한 상태)
    if (turnsInPhase >= config.maxTurnInPhase) {
      console.log(`[PhaseManager] ⏰ ${eventType} 강제발동 (phase내 ${turnsInPhase}턴 >= max ${config.maxTurnInPhase})`);
      return true;
    }

    // 사이 → 이벤트별 추가 조건
    switch (eventType) {
      case 'EMOTION_THERMOMETER':
        return PhaseManager.isReadyForEmotionCheck(ctx);
      case 'PATTERN_MIRROR':
        return ctx.axisFilledCount >= 2;
      case 'SOLUTION_PREVIEW':
        return ctx.solutionMatchCount > 0;
      case 'GROWTH_REPORT':
        return ctx.emotionBaseline !== undefined;
      default:
        return true;
    }
  }

  /**
   * 감정 체크 준비도 판단 (온도계 발동 조건)
   */
  static isReadyForEmotionCheck(ctx: PhaseContext): boolean {
    const { emotionCheckReadiness } = ctx;
    if (!emotionCheckReadiness) return true;

    const { delaySignals, readySignals, isReady } = emotionCheckReadiness;

    if (isReady) {
      console.log(`[PhaseManager] ✅ 감정체크 진행 (준비: ${readySignals.join(',')})`);
      return true;
    }

    if (delaySignals.length > 0) {
      console.log(`[PhaseManager] ⏳ 감정체크 지연 (지연: ${delaySignals.join(',')})`);
      return false;
    }

    return true;
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
