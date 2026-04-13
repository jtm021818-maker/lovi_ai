/**
 * 🆕 v42: PhaseManager — 루나 자율 판단 Phase 전환 시스템
 *
 * ❌ 제거: minTurn / maxTurn / ABSOLUTE_MAX_BY_DEPTH
 * ✅ 핵심: AI가 게이트 이벤트를 완료하면 즉시 다음 Phase로 전환
 * 🛡️ 안전망: 넉넉한 SAFETY_MAX (Phase당 10턴) — AI 태그 누락 시에만 작동
 *
 * Phase 순서: HOOK → MIRROR → BRIDGE → SOLVE → EMPOWER (고정)
 * 전환 트리거: 게이트 이벤트 completedEvents에 포함 → 즉시 전환
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

// 🆕 v28: 고민 깊이 — 하위 호환용. Phase 전환에는 더 이상 사용 안 함.
export type ConcernDepth = 'light' | 'medium' | 'deep';

// ============================================
// 🆕 v42: Phase 순서 (고정)
// ============================================
const PHASE_ORDER: ConversationPhaseV2[] = ['HOOK', 'MIRROR', 'BRIDGE', 'SOLVE', 'EMPOWER'];

// ============================================
// 🆕 v42: 게이트 이벤트 — AI가 이 이벤트를 완료하면 다음 Phase로
// ============================================

/** 루나: 각 Phase → 다음 Phase로 넘어가는 게이트 이벤트 */
const LUNA_GATE_EVENTS: Record<string, PhaseEventType[]> = {
  HOOK:   ['EMOTION_THERMOMETER'],
  MIRROR: ['LUNA_STRATEGY'],
  // BRIDGE에서 모드 완료 이벤트 중 하나라도 fire되면 SOLVE로
  BRIDGE: ['DRAFT_WORKSHOP', 'ROLEPLAY_FEEDBACK', 'PANEL_REPORT', 'IDEA_REFINE'],
  SOLVE:  ['ACTION_PLAN'],
};

/** 타로냥: 각 Phase → 다음 Phase로 넘어가는 게이트 이벤트 */
const TAROT_GATE_EVENTS: Record<string, PhaseEventType[]> = {
  HOOK:   ['EMOTION_THERMOMETER', 'TAROT_DRAW'],
  MIRROR: ['EMOTION_MIRROR', 'TAROT_DRAW'],
  BRIDGE: ['PATTERN_MIRROR', 'TAROT_DRAW'],
  SOLVE:  ['SOLUTION_CARD', 'TAROT_INSIGHT'],
};

// ============================================
// 🛡️ Safety Net — AI 태그 누락 시에만 작동 (진짜 비상구)
//
// 철학: 정상 흐름은 프롬프트의 직관 판단으로 1~3턴에 게이트 이벤트 발동.
//       SAFETY_MAX는 "여기 도달하면 뭔가 크게 잘못된 것" 수준의 진짜 안전망.
//
// v43.1: 빠듯하지 않게 넉넉하게 (이전 v43 빠듯한 값 되돌림)
//   - 중간 이벤트(TONE_SELECT, EMOTION_MIRROR, TAROT_DRAW 등)가 들어가는 phase는 여유 필요
//   - 유저가 진짜 더 쏟아내고 싶을 때 강제 전환되면 어색함
//   - 프롬프트가 제대로 작동하면 이 숫자에 도달할 일 거의 없음
//   - 그래서 빠듯하게 할 이유가 없음 — 비상구는 비상구다워야 함
// ============================================
const SAFETY_MAX_TURNS: Record<string, number> = {
  HOOK: 12,    // 비상구만. 자체판단(태그)이 핵심.
  MIRROR: 12,
  BRIDGE: 10,
  SOLVE: 10,
  EMPOWER: 8,
};

// ============================================
// Phase별 이벤트 + 발동 조건 (코드 트리거 안전망)
// ============================================

/** Phase별 이벤트 목록 + 발동 조건 */
interface PhaseEventConfig {
  phase: ConversationPhaseV2;
  /** 코드 자동 발동까지 최소 대기 턴 (AI 태그는 즉시 발동 가능) */
  minTurnInPhase: number;
  /** 선행 이벤트 */
  requiresEvent?: PhaseEventType;
}

/** 이벤트 간 글로벌 최소 간격 (연속 표시 방지) */
const MIN_EVENT_GAP = 2;

const EVENT_CONFIG: Record<string, PhaseEventConfig> = {
  // HOOK: 상황 파악 — AI [SITUATION_CLEAR] 태그로 발동. 턴 제한 없음 (루나가 판단)
  EMOTION_THERMOMETER: { phase: 'HOOK',    minTurnInPhase: 1 },

  // MIRROR 이벤트들 — AI 태그로 발동
  EMOTION_MIRROR:      { phase: 'MIRROR',  minTurnInPhase: 1 },
  LUNA_STORY:          { phase: 'MIRROR',  minTurnInPhase: 1 },
  LUNA_STRATEGY:       { phase: 'MIRROR',  minTurnInPhase: 1 },

  // BRIDGE 모드 이벤트들 — AI 태그로 발동
  TONE_SELECT:         { phase: 'BRIDGE',  minTurnInPhase: 1 },
  DRAFT_WORKSHOP:      { phase: 'BRIDGE',  minTurnInPhase: 1 },
  ROLEPLAY_FEEDBACK:   { phase: 'BRIDGE',  minTurnInPhase: 1 },
  PANEL_REPORT:        { phase: 'BRIDGE',  minTurnInPhase: 1 },
  IDEA_REFINE:         { phase: 'BRIDGE',  minTurnInPhase: 1 },

  // BRIDGE 레거시 이벤트 — 타로/패널용
  PATTERN_MIRROR:      { phase: 'BRIDGE',  minTurnInPhase: 1 },
  SOLUTION_PREVIEW:    { phase: 'BRIDGE',  minTurnInPhase: 1, requiresEvent: 'PATTERN_MIRROR' },

  // SOLVE 이벤트들
  SOLUTION_CARD:       { phase: 'SOLVE',   minTurnInPhase: 1 },
  MESSAGE_DRAFT:       { phase: 'SOLVE',   minTurnInPhase: 1, requiresEvent: 'SOLUTION_CARD' },
  ACTION_PLAN:         { phase: 'SOLVE',   minTurnInPhase: 1 },

  // EMPOWER 이벤트들 — 진입 즉시 연쇄 발동
  SESSION_SUMMARY:     { phase: 'EMPOWER', minTurnInPhase: 1 },
  HOMEWORK_CARD:       { phase: 'EMPOWER', minTurnInPhase: 1, requiresEvent: 'SESSION_SUMMARY' },
  GROWTH_REPORT:       { phase: 'EMPOWER', minTurnInPhase: 1, requiresEvent: 'HOMEWORK_CARD' },
  WARM_WRAP:           { phase: 'EMPOWER', minTurnInPhase: 1 },

  // 타로냥 전용
  TAROT_AXIS_COLLECT:  { phase: 'HOOK',    minTurnInPhase: 99 }, // 비활성화
  TAROT_DRAW:          { phase: 'HOOK',    minTurnInPhase: 2 },
  TAROT_INSIGHT:       { phase: 'SOLVE',   minTurnInPhase: 1, requiresEvent: 'TAROT_DRAW' },
};

// ============================================
// Phase별 소속 이벤트 목록
// ============================================
const PHASE_EVENTS: Record<ConversationPhaseV2, PhaseEventType[]> = {
  HOOK: ['EMOTION_THERMOMETER'],
  MIRROR: ['EMOTION_MIRROR', 'LUNA_STORY', 'LUNA_STRATEGY'],
  BRIDGE: ['PATTERN_MIRROR', 'SOLUTION_PREVIEW', 'TAROT_DRAW',
           'TONE_SELECT', 'DRAFT_WORKSHOP', 'ROLEPLAY_FEEDBACK', 'PANEL_REPORT', 'IDEA_REFINE'],
  SOLVE: ['ACTION_PLAN', 'SOLUTION_CARD', 'MESSAGE_DRAFT', 'TAROT_INSIGHT'],
  EMPOWER: ['WARM_WRAP', 'SESSION_SUMMARY', 'HOMEWORK_CARD', 'GROWTH_REPORT'],
};

// ============================================
// 레거시 Phase 시작 턴 맵 (turnInPhase 계산용)
// ============================================
const PHASE_START_TURNS: Record<ConversationPhaseV2, number> = {
  HOOK: 1,
  MIRROR: 3,
  BRIDGE: 5,
  SOLVE: 7,
  EMPOWER: 9,
};

// ============================================
// 🆕 v42: 하위 호환 — 기존 코드가 PhaseTransitionRule을 참조할 수 있음
// getTransitionRules() → 빈 배열 반환 (더 이상 사용 안 함)
// ============================================
function getTransitionRules(_persona?: string, _depth?: ConcernDepth): PhaseTransitionRule[] {
  return [];
}

// ============================================
// PhaseManager 컨텍스트
// ============================================

export interface PhaseContext {
  turnCount: number;
  currentPhase: ConversationPhaseV2;
  completedEvents: PhaseEventType[];

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

  // 페르소나 모드
  persona?: PersonaMode;

  // 🆕 v28: 고민 깊이 — 하위 호환용 (Phase 전환에 미사용)
  concernDepth?: ConcernDepth;

  // Phase 시작 턴
  phaseStartTurn: number;

  // 감정 체크 준비도
  emotionCheckReadiness?: {
    delaySignals: string[];
    readySignals: string[];
    isReady: boolean;
  };

  // ACE v4: 루나 자율 판단용 맥락
  userMessages?: string[];
  lunaRecentActions?: string[];
  purposeAchievement?: {
    achieved: boolean;
    confidence: number;
    signal: string;
  };
  mindReadReady?: boolean;

  // 🆕 v45.5: AI Phase 시그널 (파이프라인에서 전달)
  phaseSignal?: 'STAY' | 'READY' | 'URGENT' | null;
}

// ============================================
// 🆕 v42: PhaseManager 클래스 — 루나 자율 판단
// ============================================

export class PhaseManager {

  /**
   * 🆕 v42: 루나 자율 Phase 전환
   *
   * 로직:
   * 1. 게이트 이벤트 완료? → 즉시 다음 Phase
   * 2. 안전망 턴 초과? → 강제 다음 Phase
   * 3. 아무것도 아님 → 현재 Phase 유지
   *
   * ❌ 제거: minTurn / maxTurn 하드코딩
   * ✅ AI가 이벤트 태그를 출력하는 순간이 곧 전환 시점
   */
  static getCurrentPhase(ctx: PhaseContext): ConversationPhaseV2 {
    const { turnCount, currentPhase, phaseStartTurn, completedEvents, persona, phaseSignal } = ctx;

    // 현재 Phase의 다음 Phase 결정
    const currentIdx = PHASE_ORDER.indexOf(currentPhase);
    if (currentIdx < 0 || currentIdx >= PHASE_ORDER.length - 1) {
      return currentPhase; // EMPOWER 또는 알 수 없는 Phase → 유지
    }
    const nextPhase = PHASE_ORDER[currentIdx + 1];

    // Phase 내 턴 수
    const turnsInPhase = turnCount - phaseStartTurn;

    // 🛡️ Safety net: 넉넉한 최대 턴 → 강제 전환
    const safetyMax = SAFETY_MAX_TURNS[currentPhase] ?? 10;
    if (turnsInPhase >= safetyMax) {
      console.log(`[PhaseManager] 🚨 Safety net: ${currentPhase}에서 ${turnsInPhase}턴 → 강제 ${nextPhase} (게이트 이벤트 무시)`);
      return nextPhase;
    }

    // ✅ 게이트 이벤트 충족 → 즉시 전환
    const gateEvents = persona === 'tarot'
      ? TAROT_GATE_EVENTS[currentPhase]
      : LUNA_GATE_EVENTS[currentPhase];

    if (gateEvents && gateEvents.some(e => completedEvents.includes(e))) {
      console.log(`[PhaseManager] ✅ 게이트 이벤트 충족 → ${currentPhase} → ${nextPhase} (턴 ${turnCount}, phase내 ${turnsInPhase}턴)`);
      return nextPhase;
    }

    // 🆕 v45.5: AI PHASE_SIGNAL 기반 전환 — 게이트 이벤트 없이도 READY/URGENT면 전환
    // HOOK에서 특히 중요: AI가 [SITUATION_CLEAR] 태그를 안 내도
    // [PHASE_SIGNAL:READY]만 있으면 전환 가능
    if (phaseSignal === 'URGENT') {
      console.log(`[PhaseManager] 🚨 AI URGENT 시그널 → ${currentPhase} → ${nextPhase} (턴 ${turnCount})`);
      return nextPhase;
    }

    if (phaseSignal === 'READY' && turnsInPhase >= 2) {
      console.log(`[PhaseManager] ✅ AI READY 시그널 → ${currentPhase} → ${nextPhase} (턴 ${turnCount}, phase내 ${turnsInPhase}턴)`);
      return nextPhase;
    }

    return currentPhase;
  }

  /**
   * 현재 구간에서 트리거해야 할 이벤트 결정
   */
  static getPhaseEvents(phase: ConversationPhaseV2, ctx: PhaseContext): PhaseEventType[] {
    const available = PHASE_EVENTS[phase] || [];
    return available.filter(e => !ctx.completedEvents.includes(e));
  }

  /**
   * 🆕 v42: 이벤트 발동 판단 (코드 트리거 안전망)
   *
   * AI 태그로 직접 발동하는 이벤트는 이 함수를 거치지 않음.
   * 이 함수는 코드가 자동으로 발동하는 이벤트(온도계, 거울 등)의 안전망.
   *
   * ❌ 제거: ABSOLUTE_MAX 기반 강제 발동
   * ✅ 유지: Phase 체크, 선행 이벤트, 글로벌 쿨다운, 최소 1턴 대기
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

    // 글로벌 쿨다운 (연속 표시 방지) — 타로 체인은 예외
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

    // Phase 전환 직후(turnsInPhase=0) 이벤트 차단 — 타로 체인은 예외
    if (turnsInPhase <= 0) {
      const isTarotChain =
        (eventType === 'TAROT_DRAW' && ctx.completedEvents.includes('TAROT_AXIS_COLLECT')) ||
        (eventType === 'TAROT_INSIGHT' && ctx.completedEvents.includes('TAROT_DRAW'));
      if (!isTarotChain) {
        console.log(`[PhaseManager] 🚫 ${eventType}: phase 전환 직후 (turnsInPhase=${turnsInPhase}) → 차단`);
        return false;
      }
    }

    // 코드 안전망: minTurnInPhase 미달 → 차단
    // (AI 태그로 직접 발동하는 이벤트는 이 함수를 거치지 않으므로 무관)
    if (turnsInPhase < config.minTurnInPhase) {
      console.log(`[PhaseManager] ⏳ ${eventType}: phase내 ${turnsInPhase}턴 < min ${config.minTurnInPhase}`);
      return false;
    }

    // EMPOWER 이벤트는 조건 충족 시 즉시 발동
    if (phase === 'EMPOWER') {
      console.log(`[PhaseManager] ⏰ ${eventType} 즉시발동 (EMPOWER)`);
      return true;
    }

    // 마음읽기 — AI 자율 판단
    if (eventType === 'EMOTION_THERMOMETER') {
      return PhaseManager.isReadyForMindReading(ctx);
    }

    // 나머지 코드 트리거 이벤트 — Phase 체크 + 안전망 통과하면 발동 가능
    switch (eventType) {
      case 'PATTERN_MIRROR':
        return ctx.axisFilledCount >= 2;
      case 'SOLUTION_PREVIEW':
        return ctx.solutionMatchCount > 0;
      case 'GROWTH_REPORT':
        return ctx.emotionBaseline !== undefined;
      default:
        return false;
    }
  }

  /**
   * ACE v4: 루나의 마음읽기 준비도 — AI 자율 판단
   */
  static isReadyForMindReading(ctx: PhaseContext): boolean {
    if (ctx.mindReadReady) {
      console.log(`[PhaseManager] 🧠 마음읽기: ✅ AI 자율 판단 — [MIND_READ_READY] 태그 감지`);
      return true;
    }
    console.log(`[PhaseManager] 🧠 마음읽기: ⏳ AI가 아직 준비 안 됨 (태그 없음)`);
    return false;
  }

  /** @deprecated ACE v4에서 isReadyForMindReading으로 대체 */
  static isReadyForEmotionCheck(ctx: PhaseContext): boolean {
    return PhaseManager.isReadyForMindReading(ctx);
  }

  /**
   * Phase 내 턴 번호 계산
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
    return PHASE_ORDER.indexOf(phase);
  }

  /**
   * Phase 진행률 (0~100%)
   */
  static getProgress(phase: ConversationPhaseV2): number {
    return (this.getPhaseIndex(phase) / 4) * 100;
  }

  /**
   * 고민 깊이 추정 (하위 호환 — Phase 전환에 미사용)
   */
  static estimateConcernDepth(
    scenario?: string,
    userMessages?: string[],
    emotionScore?: number,
    thermometerScore?: number,
  ): ConcernDepth {
    const DEEP_SCENARIOS = ['breakup_contemplation', 'infidelity', 'commitment_fear'];
    const LIGHT_SCENARIOS = ['first_meeting', 'online_love', 'general'];

    let baseDepth: ConcernDepth = 'medium';
    if (scenario && DEEP_SCENARIOS.includes(scenario)) baseDepth = 'deep';
    if (scenario && LIGHT_SCENARIOS.includes(scenario)) baseDepth = 'light';

    if (!userMessages || userMessages.length < 2) return baseDepth;

    let score = baseDepth === 'deep' ? 2 : baseDepth === 'light' ? 0 : 1;

    const avgLen = userMessages.reduce((s, m) => s + m.length, 0) / userMessages.length;
    if (avgLen > 80) score++;
    if (avgLen < 20) score--;

    const allText = userMessages.join(' ');
    const deepKeywords = ['헤어질까', '이별', '힘들어', '모르겠어', '죽겠', '미치겠', '눈물', '울었', '배신', '불안', '두려워', '무서워'];
    const lightKeywords = ['궁금해', '어떻게 생각해', '그냥', '별거 아닌데', '사소한'];
    const deepHits = deepKeywords.filter(k => allText.includes(k)).length;
    const lightHits = lightKeywords.filter(k => allText.includes(k)).length;
    score += deepHits;
    score -= lightHits;

    if (emotionScore !== undefined) {
      if (emotionScore <= -3) score++;
      if (emotionScore >= 2) score--;
    }
    if (thermometerScore !== undefined) {
      if (thermometerScore >= 7) score++;
      if (thermometerScore <= 3) score--;
    }

    if (score >= 2) return 'deep';
    if (score <= 0) return 'light';
    return 'medium';
  }
}
