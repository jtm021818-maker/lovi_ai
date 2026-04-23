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
// 🆕 v73: Phase 별 필수 정보 카드 — context-assembler.ts 와 동기 유지
// 카드가 모두 채워지면 자동 전환 (긍정 전환 로직)
// ============================================
const PHASE_REQUIRED_CARDS: Record<string, string[]> = {
  HOOK:    ['W1_who', 'W2_what', 'W3_when', 'W4_surface_emotion'],
  MIRROR:  ['M1_emotion_intensity', 'M2_deep_hypothesis', 'M3_pattern_history', 'M4_acknowledgment'],
  BRIDGE:  ['B1_core_need', 'B2_trigger_pattern', 'B3_ready_for_action'],
  SOLVE:   ['S1_action_chosen', 'S2_barrier_checked', 'S3_commitment'],
  EMPOWER: ['E1_summary_accepted', 'E2_homework_set'],
};

// 🆕 v73: 연속 READY 턴 임계치 — 2턴 연속 READY 면 자동 전환
const CONSECUTIVE_READY_THRESHOLD = 2;

// ============================================
// 🆕 v42: 게이트 이벤트 — AI가 이 이벤트를 완료하면 다음 Phase로
// ============================================

/** 루나: 각 Phase → 다음 Phase로 넘어가는 게이트 이벤트 */
const LUNA_GATE_EVENTS: Record<string, PhaseEventType[]> = {
  HOOK:   ['EMOTION_THERMOMETER'],
  MIRROR: ['LUNA_STRATEGY'],
  // BRIDGE에서 모드 완료 이벤트 중 하나라도 fire되면 SOLVE로
  // 🆕 v87: 실전 준비 완료형 이벤트(데이트 장소/선물/체험/기념일 추천 확정)도 BRIDGE→SOLVE 게이트에 포함
  //   → 유저가 장소/선물 고르면 곧바로 SOLVE 로 진입해서 ACTION_PLAN 작전 카드 확정 유도
  BRIDGE: [
    'DRAFT_WORKSHOP',
    'ROLEPLAY_FEEDBACK',
    'PANEL_REPORT',
    'IDEA_REFINE',
    'DATE_SPOT_RECOMMENDATION',
    'GIFT_RECOMMENDATION',
    'ACTIVITY_RECOMMENDATION',
    'ANNIVERSARY_RECOMMENDATION',
    'BROWSE_SESSION',
    'BROWSE_STREAM_END', // 🆕 v88: 스트리밍 브라우징 종료 → BRIDGE→SOLVE 게이트
  ],
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
// 🛡️ Safety Net (v60: 단순 턴 카운트 안전망 제거)
//
// 기존: SAFETY_MAX_TURNS = {12,12,10,10,8} 하드코딩 → 인간 페이싱과 무관
// 변경: 좌뇌 LLM 의 pacing_meta 기반 5단계 판단으로 모든 임계치 결정
//
// 단 하나의 안전망: 5턴 연속 FRUSTRATED 상태 → 강제 다음 phase
// (이건 단순 카운트가 아니라 LLM 이 5턴 연속 답답함을 인지한 누적 신호)
// ============================================
const FRUSTRATION_BAILOUT_THRESHOLD = 5;

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

/**
 * 🆕 v60: 이벤트 간 최소 간격 — 하드코딩 제거.
 * 좌뇌의 event_recommendation.confidence + pacing_meta.pacing_state 가 자연스럽게 조절.
 * (1턴 차이로 두 이벤트 발동되면 좌뇌가 두 번째는 STAY 권고)
 *
 * 단, 같은 턴에 동일 이벤트 중복 방지를 위한 sanity check 만 0 으로 유지.
 */
const MIN_EVENT_GAP = 0;

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

  // 🆕 v60: Phase 페이싱 메타인지 (좌뇌 pacing_meta 직접 전달)
  pacingMeta?: {
    pacing_state: 'EARLY' | 'MID' | 'READY' | 'STRETCHED' | 'FRUSTRATED';
    phase_transition_recommendation: 'STAY' | 'PUSH' | 'JUMP' | 'WRAP';
    direct_question_suggested: string | null;
    luna_meta_thought: string;
  } | null;

  // 🆕 v60: 채워진 정보 카드 (Phase 별 누적)
  filledCards?: Record<string, { value: string; confidence: number; filled_at_turn: number }>;

  // 🆕 v60: 연속 FRUSTRATED 턴 카운트 (5턴 도달 시 강제 전환)
  consecutiveFrustratedTurns?: number;

  // 🆕 v81: BRIDGE 몰입 모드 활성 여부 — 있으면 Phase 전환 bypass
  //   (유저가 roleplay/draft/panel 등 진행 중이면 Luna 가 완료 판단할 때까지 유지)
  activeMode?: string | null;

  // 🆕 v60: 짧은 답 연속 카운트
  consecutiveShortReplies?: number;

  // 🆕 v60: 직전 턴 페이싱 상태
  lastPacingState?: 'EARLY' | 'MID' | 'READY' | 'STRETCHED' | 'FRUSTRATED' | null;

  // 🆕 v73: 연속 READY 턴 카운트 (2턴 연속이면 긍정 전환)
  consecutiveReadyTurns?: number;
}

// ============================================
// 🆕 v42: PhaseManager 클래스 — 루나 자율 판단
// ============================================

export class PhaseManager {

  /**
   * 🆕 v60: 좌뇌 pacing_meta + 게이트 이벤트 + 5턴 연속 FRUSTRATED 안전망 기반 전환
   *
   * 로직:
   * 1. 게이트 이벤트 완료? → 즉시 다음 Phase (기존 유지)
   * 2. 좌뇌 pacing_meta.phase_transition_recommendation:
   *    - JUMP → 즉시 다음 Phase
   *    - WRAP → EMPOWER 강제
   *    - PUSH/STAY → 유지 (PUSH는 우뇌가 직접질문 모드)
   * 3. 5턴 연속 FRUSTRATED → 강제 다음 Phase (단순 턴 카운트가 아닌 LLM 누적 신호)
   * 4. 레거시 phaseSignal (호환성) → READY 면 전환 (turnsInPhase 하드 임계치 제거)
   *
   * ❌ 제거: SAFETY_MAX_TURNS 단순 턴 카운트
   * ❌ 제거: turnsInPhase >= 2 하드 게이트
   * ✅ 좌뇌 pacing_meta 가 모든 페이싱 판단 책임
   */
  static getCurrentPhase(ctx: PhaseContext): ConversationPhaseV2 {
    const { turnCount, currentPhase, phaseStartTurn, completedEvents, persona, phaseSignal, pacingMeta, consecutiveFrustratedTurns, filledCards, consecutiveReadyTurns, activeMode } = ctx;

    // 🆕 v81: BRIDGE 몰입 모드 활성 중이면 Phase 전환 완전 bypass
    //   유저가 roleplay/draft/panel 등 진행 중 → Luna 가 [OPERATION_COMPLETE] 까지 모드 유지
    //   Pipeline 이 activeMode 감지하면 전환 판단 자체를 skip 하게 해야 함.
    if (activeMode && currentPhase === 'BRIDGE') {
      console.log(`[PhaseManager] 🔒 BRIDGE 몰입 모드 '${activeMode}' 활성 → Phase 전환 bypass`);
      return currentPhase;
    }

    const currentIdx = PHASE_ORDER.indexOf(currentPhase);
    if (currentIdx < 0 || currentIdx >= PHASE_ORDER.length - 1) {
      return currentPhase; // EMPOWER 또는 알 수 없는 Phase → 유지
    }
    const nextPhase = PHASE_ORDER[currentIdx + 1];
    const turnsInPhase = turnCount - phaseStartTurn;

    // 🆕 v73: 0. 카드 만족 긍정 전환 — 필수 카드가 모두 채워지면 즉시 전환
    const requiredCards = PHASE_REQUIRED_CARDS[currentPhase] ?? [];
    const filledKeys = Object.keys(filledCards ?? {});
    const cardsSatisfied = requiredCards.length > 0 && requiredCards.every(k => filledKeys.includes(k));
    if (cardsSatisfied) {
      console.log(`[PhaseManager:v73] 🎴 카드 만족 (${requiredCards.join(',')}) → ${currentPhase} → ${nextPhase} (턴 ${turnCount}, phase내 ${turnsInPhase}턴)`);
      return nextPhase;
    }

    // 🆕 v73: 0-b. 2턴 연속 READY → 긍정 전환
    const readyStreak = consecutiveReadyTurns ?? 0;
    if (readyStreak >= CONSECUTIVE_READY_THRESHOLD) {
      console.log(`[PhaseManager:v73] ✅ ${readyStreak}턴 연속 READY → ${currentPhase} → ${nextPhase}`);
      return nextPhase;
    }

    // 1. 게이트 이벤트 충족 → 즉시 전환 (기존 동작 유지)
    const gateEvents = persona === 'tarot'
      ? TAROT_GATE_EVENTS[currentPhase]
      : LUNA_GATE_EVENTS[currentPhase];

    if (gateEvents && gateEvents.some(e => completedEvents.includes(e))) {
      console.log(`[PhaseManager] ✅ 게이트 이벤트 충족 → ${currentPhase} → ${nextPhase} (턴 ${turnCount}, phase내 ${turnsInPhase}턴)`);
      return nextPhase;
    }

    // 2. 🆕 v60: 좌뇌 pacing_meta 기반 전환 (가장 우선)
    if (pacingMeta) {
      if (pacingMeta.phase_transition_recommendation === 'JUMP') {
        console.log(`[PhaseManager] 🎚️ pacing JUMP → ${currentPhase} → ${nextPhase} (state=${pacingMeta.pacing_state}, "${pacingMeta.luna_meta_thought}")`);
        return nextPhase;
      }
      if (pacingMeta.phase_transition_recommendation === 'WRAP') {
        console.log(`[PhaseManager] 🎚️ pacing WRAP → ${currentPhase} → EMPOWER (state=${pacingMeta.pacing_state}, "${pacingMeta.luna_meta_thought}")`);
        return 'EMPOWER';
      }
      // PUSH/STAY → phase 유지 (PUSH는 우뇌에서 직접질문 모드 처리)
    }

    // 3. 🆕 v60: 5턴 연속 FRUSTRATED 안전망 (단순 턴 카운트 아님)
    const frustratedStreak = consecutiveFrustratedTurns ?? 0;
    if (frustratedStreak >= FRUSTRATION_BAILOUT_THRESHOLD) {
      console.warn(`[PhaseManager] 🚨 ${frustratedStreak}턴 연속 FRUSTRATED → 강제 ${nextPhase}`);
      return nextPhase;
    }

    // 4. 레거시 phaseSignal (호환성) — turnsInPhase 하드 게이트 제거
    if (phaseSignal === 'URGENT') {
      console.log(`[PhaseManager] 🚨 (레거시) URGENT 시그널 → ${currentPhase} → ${nextPhase} (턴 ${turnCount})`);
      return nextPhase;
    }
    if (phaseSignal === 'READY') {
      console.log(`[PhaseManager] ✅ (레거시) READY 시그널 → ${currentPhase} → ${nextPhase} (턴 ${turnCount})`);
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
