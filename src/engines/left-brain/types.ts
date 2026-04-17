/**
 * 🧠 좌뇌 (Left Brain) 상태 분석 엔진 — 타입 정의
 *
 * 원칙:
 *   내부는 구조화되어야 한다 (인간 뇌의 인지 과정 모사)
 *   외부는 자연스러워야 한다 (사용자가 보는 건 자연어)
 */

// ============================================================
// 1. 7차원 상태 벡터 (VAD + 루나 전용 4축)
// ============================================================

/** 감정/관계의 7차원 표현 */
export interface StateVector {
  /** Valence: 감정 극성 (-1 매우부정 ~ +1 매우긍정) */
  V: number;
  /** Arousal: 각성도 (0 차분 ~ 1 극도활성) */
  A: number;
  /** Dominance: 통제감 (0 무력 ~ 1 주도) */
  D: number;
  /** Intimacy: 루나와의 정서적 거리 (0 예의 ~ 1 절친) */
  I: number;
  /** Trust: 신뢰도 (0 낯섦 ~ 1 속마음공개) */
  T: number;
  /** Urgency: 긴급도 (0 일상 ~ 1 위기) */
  U: number;
  /** Meta: 유저의 자기 상태 인식 (0 혼란 ~ 1 명료) */
  M: number;
}

/** 벡터의 변화량 (이전 턴과 비교) */
export interface StateVelocity {
  V_delta: number;
  A_delta: number;
  D_delta: number;
  I_delta: number;
  T_delta: number;
  U_delta: number;
  M_delta: number;
  /** 종합 변화 크기 */
  magnitude: number;
}

// ============================================================
// 2. Simulated Somatic Response (소마틱 마커)
// ============================================================

/** 루나가 "몸으로" 느끼는 반응 (8종) */
export type GutReaction =
  | 'warm'      // 따뜻함, 긍정적인 얘기
  | 'heavy'     // 무거움, 답답
  | 'sharp'     // 날카로움, 경계 신호
  | 'flat'      // 평이함, 일상
  | 'electric'  // 흥분, 동요
  | 'cold'      // 차가움, 거리감
  | 'tight'     // 조임, 불편
  | 'open';     // 열림, 수용

export interface SomaticMarker {
  /** 8종 중 하나 */
  gut_reaction: GutReaction;
  /** 강도 (0~1) */
  intensity: number;
  /** 이 감각을 유발한 것 */
  triggered_by: string;
  /** 이 감각의 의미 해석 */
  meaning: string;
}

// ============================================================
// 3. 2차 Theory of Mind (유저가 루나에게 기대하는 것)
// ============================================================

/** 유저의 대화 목적 */
export type ConversationalGoal =
  | 'venting'         // 쏟아내기 (해결책 필요 X)
  | 'advice'          // 조언 요청
  | 'validation'      // 인정/공감 원함
  | 'confrontation'   // 직면/도전
  | 'distraction'     // 주의 돌리기
  | 'connection';     // 그냥 대화하고 싶음

/** 2차 ToM 패턴 */
export type ToMPattern =
  | 'response_probing'      // "나 괜찮지?" = "괜찮다고 말해줘"
  | 'self_justification'    // "내가 예민한가?" = "아니다"
  | 'permission_seeking'    // "화내도 돼?" = "당연하지"
  | 'reassurance_seeking'   // "안 좋아하는 거 아닐까?" = "아니다"
  | 'genuine_question'      // 진짜 질문
  | 'none';

export interface SecondOrderToM {
  /** 유저가 루나에게 기대하는 것 */
  expected_from_luna: {
    /** 표면적 기대 */
    surface: string;
    /** 실제로 필요한 것 */
    deep: string;
    /** 표면과 실제가 다른가 */
    mismatch: boolean;
  };
  /** 유저의 대화 목적 */
  conversational_goal: {
    type: ConversationalGoal;
    strength: number; // 0~1
  };
  /** 2차 ToM 패턴 */
  pattern: ToMPattern;
  /** 유저가 피하고 싶어하는 주제 */
  avoided_topics: string[];
  /** 유저의 숨은 두려움 (있을 때만) */
  hidden_fear: string | null;
}

// ============================================================
// 4. 유도 신호 (9가지)
// ============================================================

export interface DerivedSignals {
  /** 감정 격앙 중 (V 하락 + A 상승) */
  escalating: boolean;
  /** 무력감 (D 낮음 + M 낮음) */
  helplessness: boolean;
  /** 감정 억압 (V 부정 + A 낮음) */
  suppression: boolean;
  /** 양가감정 (V 애매 + A 높음) */
  ambivalence: boolean;
  /** 메타인지 붕괴 (M 하락 추세) */
  meta_collapse: boolean;
  /** 신뢰 상승 (T 증가) */
  trust_gain: boolean;
  /** 위기 위험 (U 높음) */
  crisis_risk: boolean;
  /** 자각의 순간 (M 급증) */
  insight_moment: boolean;
  /** 후퇴 (I 감소) */
  withdrawal: boolean;
}

// ============================================================
// 5. 기억 연결
// ============================================================

export type ConnectionType =
  | 'character_reference'   // 같은 인물 등장
  | 'emotional_echo'        // 비슷한 감정 패턴
  | 'unresolved_followup'   // 미해결 주제 복귀
  | 'pattern_repeat';       // 반복 패턴

export interface MemoryConnection {
  type: ConnectionType;
  episode_id: string;
  relevance: number; // 0~1
  hint: string;      // Claude에게 전달할 힌트
  suggestion: string;  // 루나가 취할 수 있는 행동
}

// ============================================================
// 6. 라우팅 결정
// ============================================================

export type RouteTarget = 'gemini' | 'claude';

export interface RoutingDecision {
  recommended: RouteTarget;
  /** 라우팅 점수 (0~20) */
  score: number;
  /** 주요 결정 이유 */
  primary_reason: string;
  /** 세부 점수 기여 */
  score_breakdown: {
    high_stakes: number;
    complexity: number;
    low_confidence: number;
    ambiguity: number;
    urgency: number;
    low_meta: number;
    tom_mismatch: number;
    somatic_alert: number;
  };
}

// ============================================================
// 7. 좌뇌의 전체 출력 (하나의 JSON)
// ============================================================

export interface LeftBrainAnalysis {
  // 핵심 4요소
  state_vector: StateVector;
  somatic_marker: SomaticMarker;
  second_order_tom: SecondOrderToM;
  derived_signals: DerivedSignals;

  // 기억 연결 (있을 때만)
  memory_connections: MemoryConnection[];

  // 🆕 v56: 변연계 호르몬 직접 판단 (하드코딩 탈피)
  // LLM 이 이 발화의 루나에게 미치는 호르몬 영향을 맥락 이해로 결정
  hormonal_impact: {
    /** -1 ~ +1. 스트레스 변화 (양수면 상승, 음수면 감소) */
    cortisol_delta: number;
    /** -1 ~ +1. 친밀감 변화 */
    oxytocin_delta: number;
    /** -1 ~ +1. 보상 변화 */
    dopamine_delta: number;
    /** -1 ~ +1. 위협 각성 변화 */
    threat_delta: number;
    /** 왜 이렇게 판단했는지 (디버깅/로깅) */
    reasoning: string;
  };

  // 🆕 v57: 파생 감정 (단일 감정 X, 복합/제3의 감정 추출)
  /**
   * 두 감정이 섞여서 만들어지는 미묘한 제3의 감정.
   * 예: sad+angry → 서러움, joy+anxious → 설렘, fear+love → 집착
   * 단일 감정으로 충분하면 null.
   */
  emotion_blend: {
    /** 파생 감정 이름 (자연어, 한국어) */
    derived_emotion: string;
    /** 구성 요소 감정 2-3개 */
    component_emotions: string[];
    /** 강도 (0~1) */
    intensity: number;
    /** 왜 이렇게 봤는지 */
    reasoning: string;
  } | null;

  // 🆕 v56: 전략적 전환 판단 (ACC 피드백 수용용)
  // 모순 감지 등의 신호를 받으면 좌뇌가 다시 평가하는 '전략'
  strategic_shift: {
    /** 현재 권장 전략 */
    current_strategy: 'empathy' | 'questioning' | 'confrontation' | 'reassurance' | 'explore' | 'pace_back';
    /** 모순/의문에 의한 전략 수정 필요한가 */
    requires_shift: boolean;
    /** 어떻게 수정할지 */
    shift_to?: 'empathy' | 'questioning' | 'confrontation' | 'reassurance' | 'explore' | 'pace_back';
    /** 이유 */
    reasoning: string;
  };

  // 🆕 v58: 이벤트 공동 판단 (좌뇌가 추천 → KBE 가 타이밍 결정)
  /**
   * 좌뇌가 "지금 이 이벤트가 어울릴 것 같다" 추천.
   * KBE 가 최종 발동/타이밍 결정.
   */
  event_recommendation: {
    /** 추천 이벤트 종류 */
    suggested?: 'VN_THEATER' | 'LUNA_STORY' | 'TAROT' | 'ACTION_PLAN' | 'WARM_WRAP' | 'EMOTION_MIRROR' | 'PATTERN_MIRROR';
    /** 추천 강도 (0~1, 0.7+ 면 발동 권장) */
    confidence: number;
    /** 추천 이유 */
    reasoning: string;
  } | null;

  // 기존 dual-brain 호환 필드
  perceived_emotion: string;
  actual_need: string;
  tone_to_use: string;
  response_length: '침묵' | '한마디' | '짧음' | '보통';
  draft_utterances: string;
  tags: {
    SITUATION_READ: string;
    LUNA_THOUGHT: string;
    PHASE_SIGNAL: 'STAY' | 'READY' | 'URGENT';
    SITUATION_CLEAR: string | null;
  };

  // 판단
  complexity: 1 | 2 | 3 | 4 | 5;
  confidence: number;
  ambiguity_signals: string[];

  // 라우팅 (좌뇌의 자기 판단)
  routing_decision: RoutingDecision;
}

// ============================================================
// 8. 입력 컨텍스트
// ============================================================

export interface LeftBrainInput {
  userUtterance: string;
  sessionId: string;
  turnIdx: number;
  /** 최근 3턴의 상태 벡터 (있을 때) */
  recentTrajectory: StateVector[];
  /** Phase 정보 */
  phase: string;
  /** 친밀도 정보 */
  intimacyLevel: number;
  /** 관련 에피소드 (있을 때) */
  relevantEpisodes?: {
    id: string;
    summary: string;
    days_ago: number;
  }[];
  /** 사용자 프로파일 */
  userProfile?: {
    attachmentType?: string;
    gender?: 'male' | 'female';
    scenario?: string;
  };

  // 🆕 v56: 사적 페르소나 — 기억-판단 깊은 통합
  /** 이 유저에 대한 깊은 프로파일 (장기 누적) */
  personalProfile?: {
    /** 핵심 성향 한 문장 — "강한 척 하지만 여린 친구" */
    core_persona?: string;
    /** 반복 패턴들 — "갈등 회피", "감정 지연 폭발" 등 */
    recurring_patterns?: string[];
    /** 과거 효과 있던 루나 전략 — "감정 공명 > 직면" */
    effective_strategies?: string[];
    /** 피해야 할 접근 — "해결책 바로 제시" */
    avoid_approaches?: string[];
    /** 현재 이어지는 장기 테마 (session_threads) */
    ongoing_themes?: Array<{ theme: string; status: string; days_ago: number }>;
    /** 루나가 이전에 이 유저에게 남긴 힌트 (left_brain_future_hints) */
    previous_hints?: string[];
  };

  // 🆕 v58: 시간대 인식
  /** 발화 발생 시간 컨텍스트 */
  timeContext?: {
    hour: number;          // 0~23
    dayOfWeek: number;     // 0=일, 6=토
    timeLabel: '새벽' | '아침' | '오전' | '점심' | '오후' | '저녁' | '밤' | '심야';
  };

  // 🆕 v56: ACC 재귀 피드백 (2차 분석 시)
  /** ACC 가 감지한 모순들 — 좌뇌가 전략적 전환 결정에 사용 */
  detected_conflicts?: Array<{
    previous_statement: string;
    current_statement: string;
    conflict_type: string;
    severity: number;
    description: string;
  }>;

  /** 기존 (1차) 분석 결과 — 2차 분석 시에만 전달됨 */
  previous_analysis?: Partial<LeftBrainAnalysis>;

  /** 이 호출이 재분석인가 */
  is_reanalysis?: boolean;
}

// ============================================================
// 9. Episode Memory (스텁 — Phase 2에서 구현)
// ============================================================

export interface Episode {
  id: string;
  session_id: string;
  timestamp: Date;
  summary: string;
  emotional_arc: {
    start: StateVector;
    peak: StateVector;
    end: StateVector;
    pattern: 'escalation' | 'resolution' | 'stagnation' | 'breakthrough';
  };
  characters: Array<{
    name: string;
    role: string;
    sentiment: number;
  }>;
  resolution: {
    resolved: boolean;
    decision: string | null;
    follow_up_needed: boolean;
  };
  luna_insights: string[];
}
