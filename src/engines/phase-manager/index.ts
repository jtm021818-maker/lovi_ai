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

// 🆕 v28: 고민 깊이 — 적응형 세션 길이
export type ConcernDepth = 'light' | 'medium' | 'deep';

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

/** 🆕 v22+v28.3: 이벤트 간 글로벌 최소 간격 (연속 표시 방지)
 *  v28.3: 3→2로 축소 — 짧은 세션(light depth)에서 이벤트 발동 보장 */
const MIN_EVENT_GAP = 2;

const EVENT_CONFIG: Record<string, PhaseEventConfig> = {
  // 🆕 v28.5: 이벤트 = Phase의 마지막 턴에 발동
  // minTurnInPhase = 최소 이만큼 대화 후 (너무 빨리 뜨지 않게)
  // maxTurnInPhase = 99 (사실상 사용 안 함 — 동적 계산으로 대체)
  // → shouldTriggerEvent에서 ABSOLUTE_MAX 기반으로 "마지막 턴인가?" 체크

  // 🆕 GTC: minTurnInPhase 3 — 최소 3턴 경청 후 마음읽기
  // 2턴은 너무 빠름. 언니/누나 스타일은 최소 3~4번 주고받은 후 감 잡음.
  EMOTION_THERMOMETER: { phase: 'HOOK',    minTurnInPhase: 3, maxTurnInPhase: 99 },
  EMOTION_MIRROR:      { phase: 'MIRROR',  minTurnInPhase: 1, maxTurnInPhase: 99 },
  // 🆕 ACE v4: LUNA_STORY — MIRROR Phase 자기개방 이벤트 (EMOTION_MIRROR 대체)
  // AI가 [STORY_READY:opener|situation|innerThought|cliffhanger] 태그 출력 시 발동
  LUNA_STORY:          { phase: 'MIRROR',  minTurnInPhase: 1, maxTurnInPhase: 99 },
  // 🆕 v35: LUNA_STRATEGY — MIRROR Phase 끝에 작전회의 발동 (BRIDGE 진입 게이트)
  // MIRROR에서 관점 전환까지 끝난 후 작전회의 카드로 모드 선택 → BRIDGE(모드 실행) 진입
  LUNA_STRATEGY:       { phase: 'MIRROR',  minTurnInPhase: 2, maxTurnInPhase: 99 },
  // 🆕 v35: 모드별 SOLVE 이벤트 — BRIDGE Phase 내에서 발동 (모드 실행 완료 신호)
  TONE_SELECT:         { phase: 'BRIDGE',  minTurnInPhase: 1, maxTurnInPhase: 99 },
  DRAFT_WORKSHOP:      { phase: 'BRIDGE',  minTurnInPhase: 1, maxTurnInPhase: 99 },
  ROLEPLAY_FEEDBACK:   { phase: 'BRIDGE',  minTurnInPhase: 2, maxTurnInPhase: 99 },
  PANEL_REPORT:        { phase: 'BRIDGE',  minTurnInPhase: 1, maxTurnInPhase: 99 },
  IDEA_REFINE:         { phase: 'BRIDGE',  minTurnInPhase: 1, maxTurnInPhase: 99 },
  PATTERN_MIRROR:      { phase: 'BRIDGE',  minTurnInPhase: 1, maxTurnInPhase: 99 },
  SOLUTION_PREVIEW:    { phase: 'BRIDGE',  minTurnInPhase: 1, maxTurnInPhase: 99, requiresEvent: 'PATTERN_MIRROR' },
  SOLUTION_CARD:       { phase: 'SOLVE',   minTurnInPhase: 1, maxTurnInPhase: 99 },
  MESSAGE_DRAFT:       { phase: 'SOLVE',   minTurnInPhase: 1, maxTurnInPhase: 99, requiresEvent: 'SOLUTION_CARD' },
  // 🆕 v39: 🎯 ACTION_PLAN — SOLVE 마지막, "오늘의 작전" 확정 카드 (AI 태그 기반)
  //  AI가 [ACTION_PLAN:...] 태그 출력 시 발동 → BRIDGE→SOLVE→EMPOWER 재설계 핵심
  ACTION_PLAN:         { phase: 'SOLVE',   minTurnInPhase: 1, maxTurnInPhase: 99 },
  // EMPOWER 이벤트들은 Phase 진입 즉시 연쇄 발동 (레거시)
  SESSION_SUMMARY:     { phase: 'EMPOWER', minTurnInPhase: 1, maxTurnInPhase: 1 },
  HOMEWORK_CARD:       { phase: 'EMPOWER', minTurnInPhase: 1, maxTurnInPhase: 1, requiresEvent: 'SESSION_SUMMARY' },
  GROWTH_REPORT:       { phase: 'EMPOWER', minTurnInPhase: 1, maxTurnInPhase: 1, requiresEvent: 'HOMEWORK_CARD' },
  // 🆕 v39: 💜 WARM_WRAP — EMPOWER, "오늘의 마무리" 다독임 카드 (AI 태그 기반)
  //  레거시 3종(SESSION_SUMMARY/HOMEWORK_CARD/GROWTH_REPORT)을 하나로 통합
  WARM_WRAP:           { phase: 'EMPOWER', minTurnInPhase: 1, maxTurnInPhase: 99 },
  // 🆕 v26: 타로냥 — AXIS_COLLECT 제거, 대화 3턴 후 바로 TAROT_DRAW
  // 전문 타로 리더 방식: 충분히 듣고 → 질문 구체화 → 바로 스프레드
  TAROT_AXIS_COLLECT:  { phase: 'HOOK',    minTurnInPhase: 99, maxTurnInPhase: 99 }, // 비활성화 (발동 안 됨)
  TAROT_DRAW:          { phase: 'HOOK',    minTurnInPhase: 3, maxTurnInPhase: 3 },   // HOOK 3턴에 바로 발동
  TAROT_INSIGHT:       { phase: 'SOLVE',   minTurnInPhase: 1, maxTurnInPhase: 2, requiresEvent: 'TAROT_DRAW' },
};

// ============================================
// 전환 규칙 정의 (순차 강제)
// ============================================

// 🆕 v35: Luna 전환 — 5단계 구조 재설계
// HOOK → MIRROR(확장, 관점전환 흡수) → BRIDGE(모드별 실행) → SOLVE(최종 커밋) → EMPOWER
//
// 구조 설명:
// - HOOK: 경청 + 마음읽기 (EMOTION_THERMOMETER)
// - MIRROR: emotion_mirror/luna_story + 관점 전환(이전 BRIDGE의 역할) + 작전회의 카드 발동(LUNA_STRATEGY)
//           → 확장된 MIRROR가 예전 BRIDGE의 "근데 있잖아..." 관점 전환 흡수
// - BRIDGE: 유저가 고른 모드별 실행 (message_draft/roleplay/panel/custom)
//           → 모드 완료 이벤트(DRAFT_WORKSHOP/ROLEPLAY_FEEDBACK/PANEL_REPORT/IDEA_REFINE) 발동
// - SOLVE: 모드 결과를 바탕으로 최종 커밋 + 실행 계획 확정 (짧게 1~3턴)
// - EMPOWER: 마무리 + 성장 인정
const LUNA_TRANSITION_RULES: PhaseTransitionRule[] = [
  { from: 'HOOK', to: 'MIRROR', minTurn: 3, maxTurn: 5,
    hardTriggers: { eventCompleted: 'EMOTION_THERMOMETER' } },
  // MIRROR 확장: luna_story + 관점 전환 + 작전회의 소집(LUNA_STRATEGY)까지
  // minTurn 3 (BRIDGE 기능 흡수 위해 대화 여유 확보)
  { from: 'MIRROR', to: 'BRIDGE', minTurn: 3, maxTurn: 6,
    hardTriggers: { eventCompleted: 'LUNA_STRATEGY' } },
  // BRIDGE: 모드별 실행 단계 — LUNA_STRATEGY가 MIRROR에서 발동됐으므로 BRIDGE는 mode 실행만
  // 모드 완료 이벤트 중 하나라도 fire되면 SOLVE로 전환 가능
  { from: 'BRIDGE', to: 'SOLVE', minTurn: 2, maxTurn: 5,
    hardTriggers: {} },  // 모드 완료 기반 — checkHardTriggers에서 특수 처리
  // 🆕 v39: SOLVE → EMPOWER — "오늘의 작전" 확정 후 전환
  //   SOLVE는 "실행 계획 같이 만들기 + 시뮬레이션"으로, 끝에 ACTION_PLAN 카드 발동.
  //   ACTION_PLAN 완료가 EMPOWER 진입 게이트.
  { from: 'SOLVE', to: 'EMPOWER', minTurn: 2, maxTurn: 4,
    hardTriggers: { eventCompleted: 'ACTION_PLAN' } },
];

const TAROT_TRANSITION_RULES: PhaseTransitionRule[] = [
  { from: 'HOOK', to: 'MIRROR', minTurn: 3, maxTurn: 4,
    hardTriggers: { eventCompleted: 'EMOTION_THERMOMETER' } },
  { from: 'MIRROR', to: 'BRIDGE', minTurn: 1, maxTurn: 2,
    hardTriggers: { eventCompleted: 'EMOTION_MIRROR' } },
  { from: 'BRIDGE', to: 'SOLVE', minTurn: 1, maxTurn: 2,
    hardTriggers: { eventCompleted: 'PATTERN_MIRROR' } },
  { from: 'SOLVE', to: 'EMPOWER', minTurn: 1, maxTurn: 2,
    hardTriggers: { eventCompleted: 'SOLUTION_CARD' } },
];

// 페르소나별 절대 maxTurn
const ABSOLUTE_MAX_BY_PERSONA: Record<string, Record<string, number>> = {
  luna:  { HOOK: 6, MIRROR: 5, BRIDGE: 5, SOLVE: 5, EMPOWER: 4 },
  tarot: { HOOK: 4, MIRROR: 2, BRIDGE: 3, SOLVE: 3, EMPOWER: 3 },
};

// 🆕 v35: 고민 깊이별 절대 maxTurn — MIRROR 확장 / BRIDGE 모드실행 / SOLVE 커밋
const ABSOLUTE_MAX_BY_DEPTH: Record<ConcernDepth, Record<string, number>> = {
  // 🆕 v39: SOLVE = "같이 해보기" (실전제안→같이만들기→시뮬레이션), EMPOWER = "다독이기"
  // SOLVE는 S1/S2/S3 세 단계 진행 → 기존 짧은 커밋보다 약간 여유 확보
  light:  { HOOK: 4, MIRROR: 4, BRIDGE: 3, SOLVE: 3, EMPOWER: 2 },  // 총 9-13턴
  medium: { HOOK: 5, MIRROR: 6, BRIDGE: 5, SOLVE: 4, EMPOWER: 3 },  // 총 13-18턴
  deep:   { HOOK: 6, MIRROR: 7, BRIDGE: 6, SOLVE: 4, EMPOWER: 4 },  // 총 16-21턴
};

// 🆕 v35: depth별 전환 규칙 재설계 (BRIDGE 모드 실행 구조)
const LUNA_RULES_BY_DEPTH: Record<ConcernDepth, PhaseTransitionRule[]> = {
  light: [
    { from: 'HOOK', to: 'MIRROR', minTurn: 3, maxTurn: 3,
      hardTriggers: { eventCompleted: 'EMOTION_THERMOMETER' } },
    { from: 'MIRROR', to: 'BRIDGE', minTurn: 2, maxTurn: 4,
      hardTriggers: { eventCompleted: 'LUNA_STRATEGY' } },
    { from: 'BRIDGE', to: 'SOLVE', minTurn: 1, maxTurn: 3,
      hardTriggers: {} },
    // 🆕 v39: light — SOLVE 짧게, ACTION_PLAN 발동 후 EMPOWER
    { from: 'SOLVE', to: 'EMPOWER', minTurn: 1, maxTurn: 3,
      hardTriggers: { eventCompleted: 'ACTION_PLAN' } },
  ],
  medium: LUNA_TRANSITION_RULES,
  deep: [
    { from: 'HOOK', to: 'MIRROR', minTurn: 3, maxTurn: 5,
      hardTriggers: { eventCompleted: 'EMOTION_THERMOMETER' } },
    { from: 'MIRROR', to: 'BRIDGE', minTurn: 3, maxTurn: 7,
      hardTriggers: { eventCompleted: 'LUNA_STRATEGY' } },
    { from: 'BRIDGE', to: 'SOLVE', minTurn: 2, maxTurn: 6,
      hardTriggers: {} },
    // 🆕 v39: deep — SOLVE 여유, ACTION_PLAN 발동 후 EMPOWER
    { from: 'SOLVE', to: 'EMPOWER', minTurn: 2, maxTurn: 4,
      hardTriggers: { eventCompleted: 'ACTION_PLAN' } },
  ],
};

function getTransitionRules(persona?: string, depth?: ConcernDepth): PhaseTransitionRule[] {
  if (persona === 'tarot') return TAROT_TRANSITION_RULES;
  return LUNA_RULES_BY_DEPTH[depth ?? 'medium'];
}

// TRANSITION_RULES는 getTransitionRules()로 대체됨

// ============================================
// 구간별 트리거 이벤트
// ============================================

const PHASE_EVENTS: Record<ConversationPhaseV2, PhaseEventType[]> = {
  HOOK: ['EMOTION_THERMOMETER'],
  MIRROR: ['EMOTION_MIRROR', 'LUNA_STORY', 'LUNA_STRATEGY'],
  BRIDGE: ['PATTERN_MIRROR', 'SOLUTION_PREVIEW', 'TAROT_DRAW'],
  // 🆕 v39: SOLVE — "오늘의 작전" ACTION_PLAN이 주인공. 레거시 SOLUTION_CARD/MESSAGE_DRAFT는 호환 유지
  SOLVE: ['ACTION_PLAN', 'SOLUTION_CARD', 'MESSAGE_DRAFT', 'TAROT_INSIGHT'],
  // 🆕 v39: EMPOWER — 통합 WARM_WRAP이 주인공. 레거시 3종은 호환 유지
  EMPOWER: ['WARM_WRAP', 'SESSION_SUMMARY', 'HOMEWORK_CARD', 'GROWTH_REPORT'],
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

  // 🆕 v28: 고민 깊이 (적응형 세션 길이)
  concernDepth?: ConcernDepth;

  // 🆕 v20: Phase 시작 턴 (상대 턴 계산용)
  phaseStartTurn: number;

  // 🆕 v16: 감정 체크 준비도 (적응형 타이밍)
  emotionCheckReadiness?: {
    delaySignals: string[];
    readySignals: string[];
    isReady: boolean;
  };

  // 🆕 ACE v4: 루나 자율 판단용 맥락
  userMessages?: string[];          // 세션 내 유저 메시지 누적
  lunaRecentActions?: string[];     // 루나가 최근 한 것 요약
  purposeAchievement?: {            // Phase 목적 달성 감지 결과
    achieved: boolean;
    confidence: number;
    signal: string;
  };
  // 🆕 ACE v4: AI가 직접 판단한 마음읽기 준비 신호
  mindReadReady?: boolean;
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

    // 🆕 v28: 페르소나별 + 깊이별 전환 규칙 사용
    const rules = getTransitionRules(ctx.persona, ctx.concernDepth);
    const rule = rules.find(r => r.from === currentPhase);
    if (!rule) {
      return currentPhase;
    }

    // 🆕 v20: Phase 내 상대 턴 계산 (절대 턴 - Phase 시작 턴)
    const turnsInPhase = turnCount - phaseStartTurn;

    // 🆕 v24: 절대 maxTurn — 이벤트 미완료여도 강제 전환 (고착 방지)
    // 🆕 v28: 페르소나별 + 깊이별 절대 maxTurn
    const ABSOLUTE_MAX = ctx.persona === 'tarot'
      ? (ABSOLUTE_MAX_BY_PERSONA.tarot)
      : (ABSOLUTE_MAX_BY_DEPTH[ctx.concernDepth ?? 'medium']);
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
      // 🆕 ACE v4: EMOTION_MIRROR 자리에 LUNA_STORY도 인정 (자기개방 방식으로 대체)
      const lunaStoryAlt = hardTriggers.eventCompleted === 'EMOTION_MIRROR'
        && ctx.completedEvents.includes('LUNA_STORY');
      // 타로냥 페르소나: Luna 이벤트 대신 대응하는 타로 이벤트로 충족
      const tarotAltDone = ctx.persona === 'tarot' && (
        (hardTriggers.eventCompleted === 'EMOTION_THERMOMETER' && ctx.completedEvents.includes('TAROT_DRAW')) ||
        (hardTriggers.eventCompleted === 'EMOTION_MIRROR'   && ctx.completedEvents.includes('TAROT_DRAW')) ||
        (hardTriggers.eventCompleted === 'PATTERN_MIRROR'   && ctx.completedEvents.includes('TAROT_DRAW')) ||
        (hardTriggers.eventCompleted === 'SOLUTION_CARD'    && ctx.completedEvents.includes('TAROT_INSIGHT'))
      );
      if (mainDone || lunaStoryAlt || tarotAltDone) return true;
    }

    // 🆕 v35: BRIDGE → SOLVE 특수 처리
    // BRIDGE에서 모드 완료 이벤트 중 하나라도 fire되면 SOLVE로 전환 가능
    // (hardTriggers.eventCompleted가 빈 객체여도 모드 이벤트로 충족)
    if (rule.from === 'BRIDGE' && rule.to === 'SOLVE' && ctx.persona !== 'tarot') {
      const modeCompleteEvents: PhaseEventType[] = [
        'DRAFT_WORKSHOP',
        'ROLEPLAY_FEEDBACK',
        'PANEL_REPORT',
        'IDEA_REFINE',
      ];
      if (modeCompleteEvents.some(e => ctx.completedEvents.includes(e))) {
        return true;
      }
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

    // 🆕 v28.5: Phase 마지막 턴(=ABSOLUTE_MAX)에 강제 발동
    // HOOK 4턴이면 4턴째에 이벤트 발동
    const absMax = ctx.persona === 'tarot'
      ? (ABSOLUTE_MAX_BY_PERSONA.tarot[phase] ?? 4)
      : (ABSOLUTE_MAX_BY_DEPTH[ctx.concernDepth ?? 'medium'][phase] ?? 5);

    if (turnsInPhase >= absMax) {
      console.log(`[PhaseManager] 🎯 ${eventType} Phase마지막턴 발동 (phase내 ${turnsInPhase}턴 = absMax ${absMax})`);
      return true;
    }

    // EMPOWER 이벤트는 즉시 발동 (maxTurnInPhase=1)
    if (config.maxTurnInPhase <= 1 && turnsInPhase >= 1) {
      console.log(`[PhaseManager] ⏰ ${eventType} 즉시발동 (EMPOWER)`);
      return true;
    }

    // 아직 마지막 턴 아님 → 루나가 자율 판단으로 조기 발동
    switch (eventType) {
      case 'EMOTION_THERMOMETER':
        return PhaseManager.isReadyForMindReading(ctx);
      case 'PATTERN_MIRROR':
        return ctx.axisFilledCount >= 2;
      case 'SOLUTION_PREVIEW':
        return ctx.solutionMatchCount > 0;
      case 'GROWTH_REPORT':
        return ctx.emotionBaseline !== undefined;
      default:
        return false; // 마지막 턴 아니면 기본적으로 대기
    }
  }

  /**
   * 🆕 ACE v4: 루나의 마음읽기 준비도 — AI 자율 판단
   *
   * 점수 시스템 완전 제거. 루나(AI)가 직접 [MIND_READ_READY] 태그를 출력하면 발동.
   * 코드는 absMax 안전망만 유지. 나머지는 AI가 "이 사람 감정 파악됐다"고
   * 스스로 판단하는 것에 의존.
   *
   * 흐름: cognition-prompt가 루나에게 판단 기준 제시 → 루나가 확신 들면 태그 출력 → 코드 감지 → 이벤트 발동
   */
  static isReadyForMindReading(ctx: PhaseContext): boolean {
    // AI가 [MIND_READ_READY] 태그를 출력했으면 → 발동
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

  /**
   * 🆕 v28: 고민 깊이 추정 (하이브리드 방식)
   *
   * 1단계: 시나리오에서 기본값 추정
   * 2단계: 대화 내용으로 상향/하향 조정
   *
   * @param scenario - 현재 시나리오
   * @param userMessages - 사용자 메시지들
   * @param emotionScore - 감정 점수 (낮을수록 힘듦)
   * @param thermometerScore - 감정 온도계 결과 (있으면)
   */
  static estimateConcernDepth(
    scenario?: string,
    userMessages?: string[],
    emotionScore?: number,
    thermometerScore?: number,
  ): ConcernDepth {
    // 1단계: 시나리오 기반 기본값
    const DEEP_SCENARIOS = ['breakup_contemplation', 'infidelity', 'commitment_fear'];
    const LIGHT_SCENARIOS = ['first_meeting', 'online_love', 'general'];

    let baseDepth: ConcernDepth = 'medium';
    if (scenario && DEEP_SCENARIOS.includes(scenario)) baseDepth = 'deep';
    if (scenario && LIGHT_SCENARIOS.includes(scenario)) baseDepth = 'light';

    // 2단계: 대화 내용으로 조정
    if (!userMessages || userMessages.length < 2) return baseDepth;

    let score = baseDepth === 'deep' ? 2 : baseDepth === 'light' ? 0 : 1;

    // 사용자 메시지 평균 길이 (길면 깊은 고민)
    const avgLen = userMessages.reduce((s, m) => s + m.length, 0) / userMessages.length;
    if (avgLen > 80) score++;
    if (avgLen < 20) score--;

    // 감정 강도 키워드
    const allText = userMessages.join(' ');
    const deepKeywords = ['헤어질까', '이별', '힘들어', '모르겠어', '죽겠', '미치겠', '눈물', '울었', '배신', '불안', '두려워', '무서워'];
    const lightKeywords = ['궁금해', '어떻게 생각해', '그냥', '별거 아닌데', '사소한'];
    const deepHits = deepKeywords.filter(k => allText.includes(k)).length;
    const lightHits = lightKeywords.filter(k => allText.includes(k)).length;
    score += deepHits;
    score -= lightHits;

    // 감정 점수 반영 (-5~+5 범위)
    if (emotionScore !== undefined) {
      if (emotionScore <= -3) score++;
      if (emotionScore >= 2) score--;
    }

    // 온도계 결과 반영
    if (thermometerScore !== undefined) {
      if (thermometerScore >= 7) score++;
      if (thermometerScore <= 3) score--;
    }

    // 최종 판정
    if (score >= 2) return 'deep';
    if (score <= 0) return 'light';
    return 'medium';
  }
}
