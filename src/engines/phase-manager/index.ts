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
// 🆕 v116: 일상 5-Phase System (DCPS)
// HOOK 후 CASUAL 분기 → GREET → CATCHUP → BANTER → LINGER → FAREWELL
// ============================================
const CASUAL_PHASE_ORDER: ConversationPhaseV2[] = ['GREET', 'CATCHUP', 'BANTER', 'LINGER', 'FAREWELL'];

/** 일상 phase 게이트 태그 — LLM 이 부착하면 즉시 다음 phase */
const CASUAL_GATE_EVENTS: Partial<Record<ConversationPhaseV2, PhaseEventType[]>> = {
  GREET:   ['CATCHUP_OPEN'],
  CATCHUP: ['BANTER_FLOW'],
  BANTER:  ['LINGER_START'],
  LINGER:  ['CASUAL_BYE'],
};

/** 일상 phase safety_max — LLM 태그 누락 안전망 */
const CASUAL_SAFETY_TURNS: Partial<Record<ConversationPhaseV2, number>> = {
  GREET:    1,   // 1턴 후 자동 CATCHUP
  CATCHUP:  4,
  BANTER:   15,
  LINGER:   3,
  FAREWELL: 1,
};

/** 짧은 응답 streak 임계치 — LLM 태그 없이도 자연 종료 유도 */
const SHORT_REPLY_BANTER_TO_LINGER = 3;   // BANTER 에서 짧은 응답 3회 → LINGER
const SHORT_REPLY_LINGER_TO_FAREWELL = 2; // LINGER 에서 짧은 응답 2회 → FAREWELL

/** 다음 일상 phase 헬퍼 */
function nextCasualPhase(current: ConversationPhaseV2): ConversationPhaseV2 {
  const idx = CASUAL_PHASE_ORDER.indexOf(current);
  if (idx < 0 || idx >= CASUAL_PHASE_ORDER.length - 1) return current;
  return CASUAL_PHASE_ORDER[idx + 1];
}

/** 일상 phase 여부 (DAILY_CHAT 호환 alias 포함) */
function isCasualPhaseInternal(phase: ConversationPhaseV2): boolean {
  return phase === 'DAILY_CHAT' || CASUAL_PHASE_ORDER.includes(phase);
}

// ============================================
// 🆕 v122: 추천/검색(ASSIST) 3단계 레인 — "같이 찾기" 전용
// HOOK 후 ASSIST 분기 → ASSIST_INTENT(취향 파악) → ASSIST_BROWSE(같이 둘러보기) → ASSIST_PICK(고르기)
// browse 라이프사이클과 1:1로 진행. 자동 상담 이벤트(온도계/극장/작전회의)는 안 탐.
// ============================================
const ASSIST_PHASE_ORDER: ConversationPhaseV2[] = ['ASSIST_INTENT', 'ASSIST_BROWSE', 'ASSIST_PICK'];

/** ASSIST phase 게이트 — browse 실제 이벤트로 단계 전진 */
const ASSIST_GATE_EVENTS: Partial<Record<ConversationPhaseV2, PhaseEventType[]>> = {
  ASSIST_INTENT: ['BROWSE_SEARCHING'],   // browse 검색 발동 → 같이 둘러보기
  ASSIST_BROWSE: ['BROWSE_STREAM_END'],  // 후보 결정 → 고르기
};

/** ASSIST phase safety_max — 이벤트 누락 안전망 */
const ASSIST_SAFETY_TURNS: Partial<Record<ConversationPhaseV2, number>> = {
  ASSIST_INTENT: 3,   // 3턴 안에 둘러보기로
  ASSIST_BROWSE: 12,
  ASSIST_PICK:   99,  // 종착
};

/** ASSIST phase 여부 */
function isAssistPhase(phase: ConversationPhaseV2): boolean {
  return ASSIST_PHASE_ORDER.includes(phase);
}

/** 다음 ASSIST phase: 게이트 이벤트 충족 또는 safety 턴 초과 시 전진 */
function getAssistNextPhase(ctx: PhaseContext, current: ConversationPhaseV2): ConversationPhaseV2 {
  const idx = ASSIST_PHASE_ORDER.indexOf(current);
  if (idx < 0 || idx >= ASSIST_PHASE_ORDER.length - 1) return current;
  const next = ASSIST_PHASE_ORDER[idx + 1];

  // 게이트 이벤트 충족 → 즉시 전진
  const gates = ASSIST_GATE_EVENTS[current] ?? [];
  if (gates.some((e) => ctx.completedEvents.includes(e))) {
    console.log(`[PhaseManager:v122] 🔍 ${current} → ${next} (게이트: ${gates.join(',')})`);
    return next;
  }
  // safety 턴 초과 → 전진
  const turnsInPhase = ctx.turnCount - (ctx.phaseStartTurn ?? ctx.turnCount);
  const safetyMax = ASSIST_SAFETY_TURNS[current] ?? 99;
  if (turnsInPhase >= safetyMax) {
    console.log(`[PhaseManager:v122] ⏱️ ${current} → ${next} (safety ${turnsInPhase}/${safetyMax})`);
    return next;
  }
  return current;
}

// ============================================
// 🔧 LLM-분기: conversation_mode(COUNSELING/CASUAL/ASSIST) 는 좌뇌 Gemini 가 100% 판단한다.
//   기존의 정규식 안전망(detectAssistIntent/ASSIST_INTENT_RE)과 휴리스틱(inferConversationMode)은
//   맥락 구분 실패(예: "선물 뭐할지 고백하려구")가 잦아 제거됨. ([[feedback_llm_judgment]])
//   파이프라인이 프리페치된 좌뇌 conversation_mode 를 phaseCtx.conversationMode 로 주입한다.
//   실패 시 폴백: 이전 턴 캐시 → 없으면 COUNSELING (파이프라인에서 처리).
// ============================================

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
  DAILY_CHAT: [],   // 🆕 v105: 일상 대화 — 게이트 이벤트 없음 (호환 alias)
  // 🆕 v116: 일상 5-Phase 게이트 태그 (UI 카드 없음 — 순수 phase 전환 시그널)
  GREET:    ['CATCHUP_OPEN'],
  CATCHUP:  ['BANTER_FLOW'],
  BANTER:   ['LINGER_START', 'HEAVY_TURN'],
  LINGER:   ['CASUAL_BYE'],
  FAREWELL: [],
  // 🆕 v122: ASSIST 3단계 — 자동 상담 이벤트 없음 (browse 는 phase 무관하게 직접 발동)
  ASSIST_INTENT: [],
  ASSIST_BROWSE: [],
  ASSIST_PICK:   [],
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
  DAILY_CHAT: 2,    // 🆕 v105: HOOK 직후 분기 (호환)
  // 🆕 v116: 일상 5-Phase 기본 진입 턴 (참조용 — 실제 진입 턴은 phaseStartTurn 으로 동적 갱신)
  GREET:    2,
  CATCHUP:  3,
  BANTER:   5,
  LINGER:   13,
  FAREWELL: 15,
  // 🆕 v122: ASSIST 3단계 진입 턴 (참조용 — 실제는 phaseStartTurn 동적 갱신)
  ASSIST_INTENT: 2,
  ASSIST_BROWSE: 3,
  ASSIST_PICK:   6,
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

  // 🆕 v105: 좌뇌가 판단한 대화 모드 (HOOK 후 분기에 사용)
  // 🆕 v121: ASSIST 추가 — 추천/검색 작업 레인 (CASUAL 처럼 경량 라우팅)
  conversationMode?: 'COUNSELING' | 'CASUAL' | 'ASSIST';

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

  // 🆕 v116.1: 이번 턴 user 메시지 길이 (일상 phase 페이싱 디버깅용)
  lastUserMessageLength?: number;
}

// ============================================
// 🆕 v116: 일상 5-Phase 전환 로직
// 🔒 v116.5: 분기 고정 — HOOK 에서 일상으로 갈라진 뒤에는 상담 트랙(MIRROR)으로
//   되돌아가지 않는다. 중간에 UI 가 다른 분기로 바뀌는 사용자 혼란을 방지.
//   (예전: 강한 감정/VENTING intent/HEAVY_TURN/COUNSELING override 시 MIRROR escape)
//   무거운 발언이 나와도 일상 phase 안에서 LLM 이 톤으로 받아낸다.
//
// 우선순위:
//   1. 게이트 태그 (CATCHUP_OPEN, BANTER_FLOW, LINGER_START, CASUAL_BYE) → 즉시 다음
//   2. 짧은 응답 streak → LINGER 또는 FAREWELL 진입
//   3. safety_max turn 초과 → 자동 전환 (LLM 태그 누락 안전망)
// ============================================
function getCasualNextPhase(
  ctx: PhaseContext,
  currentCasualPhase: ConversationPhaseV2,
): ConversationPhaseV2 {
  const {
    turnCount,
    phaseStartTurn,
    completedEvents,
    consecutiveShortReplies = 0,
  } = ctx;

  // 🔒 v116.5: 분기 고정 — CASUAL→MIRROR escape 제거.
  //   일상 분기로 들어온 이상 트랙은 그대로 유지한다. 깊은 상담 의도/강한 감정은
  //   ACE/우뇌가 같은 일상 트랙 안에서 톤으로 흡수한다.

  // FAREWELL 은 종료 단계 — 유지 (silent terminate 는 클라이언트가 처리)
  if (currentCasualPhase === 'FAREWELL') return 'FAREWELL';

  // CASUAL_BYE 태그는 모든 phase 에서 즉시 FAREWELL (작별 인사 우선)
  if (completedEvents.includes('CASUAL_BYE')) {
    console.log(`[PhaseManager:v116] 👋 ${currentCasualPhase} → FAREWELL ([CASUAL_BYE] 태그)`);
    return 'FAREWELL';
  }

  // 2. 게이트 태그 충족 → 즉시 다음 phase
  const gates = CASUAL_GATE_EVENTS[currentCasualPhase] ?? [];
  if (gates.some(g => completedEvents.includes(g))) {
    const next = nextCasualPhase(currentCasualPhase);
    console.log(`[PhaseManager:v116] ✅ 게이트 충족 → ${currentCasualPhase} → ${next}`);
    return next;
  }

  // 3. 짧은 응답 streak — 자연 fade-out 안전망
  if (currentCasualPhase === 'BANTER' && consecutiveShortReplies >= SHORT_REPLY_BANTER_TO_LINGER) {
    console.log(`[PhaseManager:v116] 🌙 짧은 응답 ${consecutiveShortReplies}회 → BANTER → LINGER`);
    return 'LINGER';
  }
  if (currentCasualPhase === 'LINGER' && consecutiveShortReplies >= SHORT_REPLY_LINGER_TO_FAREWELL) {
    console.log(`[PhaseManager:v116] 👋 짧은 응답 ${consecutiveShortReplies}회 → LINGER → FAREWELL`);
    return 'FAREWELL';
  }

  // 4. safety_max 안전망
  const turnsInPhase = turnCount - phaseStartTurn;
  const safetyMax = CASUAL_SAFETY_TURNS[currentCasualPhase] ?? 99;
  if (turnsInPhase >= safetyMax) {
    const next = nextCasualPhase(currentCasualPhase);
    console.log(`[PhaseManager:v116] ⏰ safety_max ${turnsInPhase}/${safetyMax} → ${currentCasualPhase} → ${next}`);
    return next;
  }

  return currentCasualPhase;
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
    const { turnCount, currentPhase, phaseStartTurn, completedEvents, persona, phaseSignal, pacingMeta, consecutiveFrustratedTurns, filledCards, consecutiveReadyTurns, activeMode, conversationMode } = ctx;

    // 🆕 v81: BRIDGE 몰입 모드 활성 중이면 Phase 전환 완전 bypass
    //   유저가 roleplay/draft/panel 등 진행 중 → Luna 가 [OPERATION_COMPLETE] 까지 모드 유지
    //   Pipeline 이 activeMode 감지하면 전환 판단 자체를 skip 하게 해야 함.
    if (activeMode && currentPhase === 'BRIDGE') {
      console.log(`[PhaseManager] 🔒 BRIDGE 몰입 모드 '${activeMode}' 활성 → Phase 전환 bypass`);
      return currentPhase;
    }

    // 🔧 LLM-분기: conversationMode 는 좌뇌 Gemini 가 정한 현재 턴 레인.
    //   정책(사용자 확정): ASSIST/COUNSELING 으로만 "승격" 허용 — 비-CASUAL 레인에서 CASUAL 로
    //   자동 다운그레이드하지 않는다(대화를 가볍게 깎아내리지 않음). 폴백 없으면 COUNSELING.
    const llmMode: 'COUNSELING' | 'CASUAL' | 'ASSIST' = conversationMode ?? 'COUNSELING';

    // ① HOOK: 턴2부터 분기 (턴1은 '듣기(HOOK)' 유지 — 사용자 정책)
    if (currentPhase === 'HOOK' && turnCount >= 2) {
      if (llmMode === 'ASSIST') {
        console.log(`[PhaseManager:LLM분기] 🔍 HOOK → ASSIST_INTENT`);
        return 'ASSIST_INTENT';
      }
      if (llmMode === 'CASUAL') {
        console.log(`[PhaseManager:LLM분기] 💌 HOOK → GREET`);
        return 'GREET';
      }
      // COUNSELING → 상담 레인 진행 (아래 fall-through)
    }

    // ② ASSIST 레인 중: COUNSELING 으로만 승격(→MIRROR). CASUAL 다운그레이드는 무시(ASSIST 유지).
    if (isAssistPhase(currentPhase)) {
      if (llmMode === 'COUNSELING') {
        console.log(`[PhaseManager:LLM분기] 💕 ASSIST → MIRROR (상담 승격)`);
        return 'MIRROR';
      }
      return getAssistNextPhase(ctx, currentPhase);
    }

    // ③ CASUAL 레인 중: ASSIST/COUNSELING 으로 승격 허용. 그 외엔 일상 5-phase 진행.
    //   (이게 없으면 getCasualNextPhase 가 conversationMode 를 무시해 "선물 뭐 사지"가 일상에 갇힘.)
    if (isCasualPhaseInternal(currentPhase)) {
      if (llmMode === 'ASSIST') {
        console.log(`[PhaseManager:LLM분기] 🔍 일상 → ASSIST_INTENT (추천 승격, from ${currentPhase})`);
        return 'ASSIST_INTENT';
      }
      if (llmMode === 'COUNSELING') {
        console.log(`[PhaseManager:LLM분기] 💕 일상 → MIRROR (상담 승격, from ${currentPhase})`);
        return 'MIRROR';
      }
      const normalized = currentPhase === 'DAILY_CHAT' ? 'BANTER' : currentPhase;
      return getCasualNextPhase(ctx, normalized);
    }

    // ④ 상담 레인: MIRROR(초기 상담)에서 LLM 이 작업 의도로 판단하면 ASSIST 로 승격 허용.
    //   BRIDGE/SOLVE/EMPOWER 는 게이트 기반 깊은 단계라 LLM 모드로 흔들지 않음(아래 게이트 로직 유지).
    if (currentPhase === 'MIRROR' && llmMode === 'ASSIST') {
      console.log(`[PhaseManager:LLM분기] 🔍 MIRROR → ASSIST_INTENT (추천 승격)`);
      return 'ASSIST_INTENT';
    }

    const currentIdx = PHASE_ORDER.indexOf(currentPhase);
    if (currentIdx < 0 || currentIdx >= PHASE_ORDER.length - 1) {
      return currentPhase; // EMPOWER 또는 알 수 없는 Phase → 유지
    }
    const nextPhase = PHASE_ORDER[currentIdx + 1];
    const turnsInPhase = turnCount - phaseStartTurn;

    // 🔒 BRIDGE/SOLVE: 게이트 이벤트로만 전환 (카드 만족/READY streak/pacingMeta 등 모두 무시)
    // - BRIDGE → SOLVE: 루나의 전략에서 선택된 모드 완료 이벤트 필수
    // - SOLVE → EMPOWER: ACTION_PLAN 이벤트 필수
    const GATE_ONLY_PHASES: ConversationPhaseV2[] = ['BRIDGE', 'SOLVE'];
    if (GATE_ONLY_PHASES.includes(currentPhase)) {
      const gateEvents = persona === 'tarot'
        ? TAROT_GATE_EVENTS[currentPhase]
        : LUNA_GATE_EVENTS[currentPhase];
      if (gateEvents?.some(e => completedEvents.includes(e))) {
        console.log(`[PhaseManager] ✅ 게이트 이벤트 충족 → ${currentPhase} → ${nextPhase} (턴 ${turnCount}, phase내 ${turnsInPhase}턴)`);
        return nextPhase;
      }
      return currentPhase;
    }

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

    // 🔒 EMPOWER 이벤트는 Phase 진입 즉시 발동 — turnsInPhase/minTurnInPhase 제한 완전 무시
    // WARM_WRAP(편지)이 첫 EMPOWER 턴에 반드시 떠야 하므로 turnsInPhase=0도 허용
    if (phase === 'EMPOWER') {
      console.log(`[PhaseManager] ⏰ ${eventType} 즉시발동 (EMPOWER, turnsInPhase=${turnsInPhase})`);
      return true;
    }

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
    // 🆕 v122: 상담(PHASE_ORDER) 외 phase(일상/ASSIST)는 인덱스 -1 → 음수 방지로 0 클램프.
    //   표시 진행률은 클라이언트 트랙(CasualPhaseTrack/AssistStepperTrack)이 자체 계산.
    return Math.max(0, (this.getPhaseIndex(phase) / 4) * 100);
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
