/**
 * 🆕 v28.3: Turn Context Builder — 전체 15턴 커버
 *
 * 매 턴마다 AI가 어떤 "역할"로 응답해야 하는지 결정.
 * HOOK뿐 아니라 MIRROR/BRIDGE/SOLVE/EMPOWER 전부 정의.
 *
 * 카톡 언니 대화 전체 흐름:
 *  HOOK(1-5):    듣기 — 리액션, 공감, 편들기
 *  MIRROR(6-8):  정리 — 반영, 인사이트, 패턴 체크
 *  BRIDGE(9-10): 전환 — 리프레임, 방향 제시
 *  SOLVE(11-13): 조언 — 구체적 한마디, 메시지 초안, 행동 1개
 *  EMPOWER(14-15): 마무리 — 응원, 클로징
 */

// ============================================
// 턴 타입 정의 (전체 Phase 커버)
// ============================================

export type TurnType =
  // --- HOOK (듣기) ---
  | 'REACTION'          // "헐" "진짜?" — 짧은 리액션만
  | 'EMPATHY'           // 감정 반영 — 질문 없이 공감만
  | 'LISTEN_MORE'       // "더 얘기해줘" — 부드러운 유도
  | 'REFLECT'           // 감정 정리 — "~인 거구나"
  | 'GENTLE_QUESTION'   // 질문 1개 — 이 턴에만 허용
  | 'SIDE_TAKE'         // 편 들어주기 — "그건 걔가 잘못한 거지"
  | 'BRIDGE'            // 다음 Phase로 전환 유도
  // --- MIRROR (의미 발견) ---
  | 'EMOTION_DIG'       // 겉감정 아래 파기 — "화 아래에 뭔가 더 아프지 않아?"
  | 'CORE_NAMING'       // 핵심 감정 이름 붙이기 — "아 그래서 진짜 ~인 거구나"
  | 'MEANING_LINK'      // 감정→가치 연결 — "이렇게 힘든 게 걔가 중요하다는 뜻이야"
  | 'PATTERN_CHECK'     // 패턴 질문 — "이거 전에도 비슷한 적 있었어?" (BRIDGE에서 사용)
  // --- BRIDGE (전환) ---
  | 'REFRAME'           // 관점 전환 — "근데 진짜 문제는 그게 아닌 것 같아"
  | 'DIRECTION'         // 방향 제시 — "이제 어떻게 하면 좋을지 같이 생각해보자"
  // --- SOLVE (조언) ---
  | 'DIRECT_ADVICE'     // 구체적 한마디 — "내 생각엔 이렇게 해봐"
  | 'MESSAGE_HELP'      // 메시지 초안 — "걔한테 이렇게 말해봐: '...'"
  | 'ONE_ACTION'        // 행동 1개 — "오늘 이것만 해봐"
  // --- EMPOWER (마무리) ---
  | 'ENCOURAGE'         // 응원 — "잘 될 거야 진짜"
  | 'CLOSURE'           // 클로징 — "오늘 얘기 많이 해서 좋았다"
  ;

// ============================================
// 턴별 제약조건
// ============================================

export interface TurnConstraint {
  maxCharsPerBubble: number;
  maxBubbles: number;
  allowQuestion: boolean;
  maxQuestions: number;
  allowAdvice: boolean;
  allowAnalysis: boolean;
}

const BASE_CONSTRAINTS: Record<TurnType, TurnConstraint> = {
  // --- HOOK --- (v29: 제한 완화 — 30자는 한국어 1문장도 안 됨)
  REACTION:        { maxCharsPerBubble: 60, maxBubbles: 3, allowQuestion: false, maxQuestions: 0, allowAdvice: false, allowAnalysis: false },
  EMPATHY:         { maxCharsPerBubble: 80, maxBubbles: 3, allowQuestion: false, maxQuestions: 0, allowAdvice: false, allowAnalysis: false },
  LISTEN_MORE:     { maxCharsPerBubble: 70, maxBubbles: 3, allowQuestion: true,  maxQuestions: 1, allowAdvice: false, allowAnalysis: false },
  REFLECT:         { maxCharsPerBubble: 80, maxBubbles: 3, allowQuestion: false, maxQuestions: 0, allowAdvice: false, allowAnalysis: false },
  GENTLE_QUESTION: { maxCharsPerBubble: 70, maxBubbles: 3, allowQuestion: true,  maxQuestions: 1, allowAdvice: false, allowAnalysis: false },
  SIDE_TAKE:       { maxCharsPerBubble: 80, maxBubbles: 3, allowQuestion: false, maxQuestions: 0, allowAdvice: false, allowAnalysis: false },
  BRIDGE:          { maxCharsPerBubble: 80, maxBubbles: 3, allowQuestion: true,  maxQuestions: 1, allowAdvice: false, allowAnalysis: false },
  // --- MIRROR (의미 발견) ---
  EMOTION_DIG:     { maxCharsPerBubble: 55, maxBubbles: 2, allowQuestion: true,  maxQuestions: 1, allowAdvice: false, allowAnalysis: false },
  CORE_NAMING:     { maxCharsPerBubble: 55, maxBubbles: 3, allowQuestion: false, maxQuestions: 0, allowAdvice: false, allowAnalysis: false },
  MEANING_LINK:    { maxCharsPerBubble: 60, maxBubbles: 3, allowQuestion: false, maxQuestions: 0, allowAdvice: false, allowAnalysis: false },
  PATTERN_CHECK:   { maxCharsPerBubble: 60, maxBubbles: 2, allowQuestion: true,  maxQuestions: 1, allowAdvice: false, allowAnalysis: true },
  // --- BRIDGE ---
  REFRAME:         { maxCharsPerBubble: 75, maxBubbles: 3, allowQuestion: false, maxQuestions: 0, allowAdvice: false, allowAnalysis: true },
  DIRECTION:       { maxCharsPerBubble: 70, maxBubbles: 3, allowQuestion: true,  maxQuestions: 1, allowAdvice: true,  allowAnalysis: true },
  // --- SOLVE ---
  DIRECT_ADVICE:   { maxCharsPerBubble: 75, maxBubbles: 3, allowQuestion: false, maxQuestions: 0, allowAdvice: true,  allowAnalysis: false },
  MESSAGE_HELP:    { maxCharsPerBubble: 80, maxBubbles: 4, allowQuestion: false, maxQuestions: 0, allowAdvice: true,  allowAnalysis: false },
  ONE_ACTION:      { maxCharsPerBubble: 60, maxBubbles: 2, allowQuestion: false, maxQuestions: 0, allowAdvice: true,  allowAnalysis: false },
  // --- EMPOWER ---
  ENCOURAGE:       { maxCharsPerBubble: 65, maxBubbles: 3, allowQuestion: false, maxQuestions: 0, allowAdvice: false, allowAnalysis: false },
  CLOSURE:         { maxCharsPerBubble: 65, maxBubbles: 3, allowQuestion: false, maxQuestions: 0, allowAdvice: false, allowAnalysis: false },
};

// ============================================
// Phase별 턴 패턴 풀
// ============================================

// v29: EMPATHY 시작 비중 높임 (첫 턴부터 공감 — "헐..." 반복 방지)
const HOOK_PATTERNS: TurnType[][] = [
  ['EMPATHY', 'SIDE_TAKE', 'LISTEN_MORE', 'REFLECT', 'BRIDGE'],
  ['EMPATHY', 'LISTEN_MORE', 'SIDE_TAKE', 'GENTLE_QUESTION', 'BRIDGE'],
  ['EMPATHY', 'REFLECT', 'SIDE_TAKE', 'LISTEN_MORE', 'BRIDGE'],
  ['SIDE_TAKE', 'EMPATHY', 'LISTEN_MORE', 'REFLECT', 'BRIDGE'],
  ['EMPATHY', 'SIDE_TAKE', 'GENTLE_QUESTION', 'REFLECT', 'BRIDGE'],
  ['EMPATHY', 'EMPATHY', 'SIDE_TAKE', 'GENTLE_QUESTION', 'BRIDGE'],
];

// MIRROR: 의미 발견 — 감정 파기 → 이름 붙이기 → 가치 연결
const MIRROR_PATTERNS: TurnType[][] = [
  ['EMOTION_DIG', 'CORE_NAMING', 'MEANING_LINK'],
  ['EMOTION_DIG', 'MEANING_LINK', 'CORE_NAMING'],
  ['EMPATHY', 'EMOTION_DIG', 'CORE_NAMING'],        // 공감 한번 더 후 파기
  ['EMOTION_DIG', 'CORE_NAMING', 'EMPATHY'],         // light용 (의미연결 생략)
];

// BRIDGE: 전환 단계 — 패턴 체크 + 관점 전환 + 방향 제시
const BRIDGE_PATTERNS: TurnType[][] = [
  ['REFRAME', 'DIRECTION'],
  ['PATTERN_CHECK', 'REFRAME'],          // 패턴 확인 후 리프레임
  ['REFRAME', 'GENTLE_QUESTION'],        // 리프레임 후 "어떻게 하고 싶어?"
  ['PATTERN_CHECK', 'DIRECTION'],         // 패턴 확인 후 방향
];

// SOLVE: 조언 단계 — 구체적 조언 + 메시지 초안 + 행동 1개
const SOLVE_PATTERNS: TurnType[][] = [
  ['DIRECT_ADVICE', 'MESSAGE_HELP', 'ONE_ACTION'],
  ['EMPATHY', 'DIRECT_ADVICE', 'MESSAGE_HELP'],    // 공감 후 조언
  ['DIRECT_ADVICE', 'ONE_ACTION', 'ENCOURAGE'],     // 조언 → 행동 → 응원
  ['MESSAGE_HELP', 'DIRECT_ADVICE', 'ONE_ACTION'],  // 메시지 먼저
];

// EMPOWER: 마무리 — 응원 + 클로징
const EMPOWER_PATTERNS: TurnType[][] = [
  ['ENCOURAGE', 'CLOSURE'],
  ['REFLECT', 'ENCOURAGE'],        // 짧은 정리 후 응원
  ['ENCOURAGE', 'ENCOURAGE'],      // 응원 연타 (짧은 세션)
  ['CLOSURE'],                      // 바로 마무리 (초짧은 세션)
];

// Phase → 패턴 풀 매핑
type PhaseKey = 'HOOK' | 'MIRROR' | 'BRIDGE' | 'SOLVE' | 'EMPOWER';
const PHASE_PATTERNS: Record<PhaseKey, TurnType[][]> = {
  HOOK: HOOK_PATTERNS,
  MIRROR: MIRROR_PATTERNS,
  BRIDGE: BRIDGE_PATTERNS,
  SOLVE: SOLVE_PATTERNS,
  EMPOWER: EMPOWER_PATTERNS,
};

// ============================================
// 유저 감정 분류
// ============================================

export type UserEmotion = 'sadness' | 'anger' | 'anxiety' | 'loneliness' | 'confusion' | 'neutral' | 'light';

export function detectUserEmotion(message: string): UserEmotion {
  const m = message.toLowerCase();
  if (/화[가나]|짜증|열받|미치겠|개빡|빡치|폭발|참다|뭐래/.test(m)) return 'anger';
  if (/슬[퍼프]|울[었고]|눈물|마음.*아[파프]|서운|속상|힘[들드]|ㅠ{2,}/.test(m)) return 'sadness';
  if (/불안|걱정|두[려렵]|무서|겁[나이]|모르겠|어떡|어떻게/.test(m)) return 'anxiety';
  if (/외[롭로]|혼자|아무[도한].*없|곁에|연락.*없/.test(m)) return 'loneliness';
  if (/모르겠|헷갈|복잡|갈[등팡]|어[떤쩌]|뭐가.*맞|뭘.*해야/.test(m)) return 'confusion';
  if (/ㅋ{2,}|ㅎ{2,}|궁금|그냥|별거.*아닌/.test(m)) return 'light';
  return 'neutral';
}

// ============================================
// Turn Context
// ============================================

export interface TurnContext {
  turnNumber: number;            // Phase 내 턴 번호 (1-based)
  turnType: TurnType;
  constraints: TurnConstraint;
  userEmotion: UserEmotion;
  userMsgLength: number;
  emotionIntensity: number;      // 0-10
  prevTurnType?: TurnType;
  prevResponseStructure?: string;
  recentExpressions: string[];
  patternIndex: number;
  phase: PhaseKey;               // 🆕 현재 Phase
}

// ============================================
// Turn Context Builder
// ============================================

export class TurnContextBuilder {
  // Phase별 선택된 패턴 인덱스
  private phasePatternIndex: Record<PhaseKey, number>;
  private prevTurnType?: TurnType;
  private prevStructure?: string;

  constructor(sessionSeed?: number) {
    const seed = sessionSeed ?? Math.floor(Math.random() * 10000);
    // 각 Phase마다 다른 패턴 랜덤 선택 (seed 기반)
    this.phasePatternIndex = {
      HOOK:    seed % HOOK_PATTERNS.length,
      MIRROR:  (seed + 1) % MIRROR_PATTERNS.length,
      BRIDGE:  (seed + 2) % BRIDGE_PATTERNS.length,
      SOLVE:   (seed + 3) % SOLVE_PATTERNS.length,
      EMPOWER: (seed + 4) % EMPOWER_PATTERNS.length,
    };
  }

  /**
   * 🆕 범용 컨텍스트 빌드 — 모든 Phase에서 동작
   */
  buildContext(
    phase: PhaseKey,
    turnInPhase: number,
    userMessage: string,
    emotionScore: number,
    recentExpressions: string[],
  ): TurnContext {
    // 해당 Phase의 패턴 가져오기
    const patternIdx = this.phasePatternIndex[phase];
    const patterns = PHASE_PATTERNS[phase];
    const pattern = patterns[patternIdx];

    // 턴 번호에 해당하는 역할 (패턴 초과 시 마지막 반복)
    const idx = Math.min(turnInPhase - 1, pattern.length - 1);
    const turnType = pattern[idx];

    const userEmotion = detectUserEmotion(userMessage);
    const emotionIntensity = Math.min(10, Math.abs(emotionScore) * 2);
    const baseConstraints = { ...BASE_CONSTRAINTS[turnType] };
    const adjusted = adjustForUserLength(baseConstraints, userMessage.length, emotionIntensity);

    const ctx: TurnContext = {
      turnNumber: turnInPhase,
      turnType,
      constraints: adjusted,
      userEmotion,
      userMsgLength: userMessage.length,
      emotionIntensity,
      prevTurnType: this.prevTurnType,
      prevResponseStructure: this.prevStructure,
      recentExpressions,
      patternIndex: patternIdx,
      phase,
    };

    this.prevTurnType = turnType;
    return ctx;
  }

  /**
   * v1 호환 — HOOK Phase 전용 (기존 코드 깨지지 않게)
   */
  buildHookContext(
    turnInPhase: number,
    userMessage: string,
    emotionScore: number,
    recentExpressions: string[],
  ): TurnContext {
    return this.buildContext('HOOK', turnInPhase, userMessage, emotionScore, recentExpressions);
  }

  recordStructure(structure: string) {
    this.prevStructure = structure;
  }

  getPattern(phase?: PhaseKey): TurnType[] {
    const p = phase ?? 'HOOK';
    const idx = this.phasePatternIndex[p];
    return [...PHASE_PATTERNS[p][idx]];
  }

  getAllPatterns(): Record<PhaseKey, TurnType[]> {
    const result: Record<string, TurnType[]> = {};
    for (const phase of Object.keys(PHASE_PATTERNS) as PhaseKey[]) {
      result[phase] = this.getPattern(phase);
    }
    return result as Record<PhaseKey, TurnType[]>;
  }
}

// ============================================
// 유저 메시지 길이 기반 제약조건 조정
// ============================================

function adjustForUserLength(
  base: TurnConstraint,
  userLen: number,
  emotionIntensity: number,
): TurnConstraint {
  // 🆕 완화: 유저 메시지가 짧아도 AI 응답은 최소 원본의 70% 유지
  // 이전: 0.5 → 최소 10자까지 떨어져 한국어 문장이 짤림
  const lengthMult = userLen <= 15 ? 0.75
    : userLen <= 30 ? 0.85
    : userLen <= 60 ? 0.95
    : userLen <= 100 ? 1.0
    : 1.1;

  // 🆕 완화: 감정 강도가 높아도 최소 0.85 보장
  const emotionMult = emotionIntensity >= 8 ? 0.85
    : emotionIntensity >= 5 ? 0.9
    : 1.0;

  return {
    ...base,
    // 🆕 v29: 최소 40자 보장 (한국어 기준 문장 1-2개 분량)
    maxCharsPerBubble: Math.max(40, Math.round(base.maxCharsPerBubble * lengthMult * emotionMult)),
    maxBubbles: emotionIntensity >= 8 ? Math.min(base.maxBubbles, 2) : base.maxBubbles,
  };
}
