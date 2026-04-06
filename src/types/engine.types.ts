// ============================================
// 4대 핵심 엔진 타입 정의
// ============================================

/** 애착 유형 */
export enum AttachmentType {
  ANXIOUS = 'ANXIOUS',
  AVOIDANT = 'AVOIDANT',
  SECURE = 'SECURE',
  UNKNOWN = 'UNKNOWN',
}

/** 위험 수준 (5단계 — 한국생명존중희망재단 가이드라인 기반) */
export enum RiskLevel {
  LOW = 'LOW',                 // ⚪ 위기 아님
  MEDIUM = 'MEDIUM',           // 🟢 갈등 격화
  MEDIUM_HIGH = 'MEDIUM_HIGH', // 🟡 극단적 절망/무기력
  HIGH = 'HIGH',               // 🟠 간접적 자살 암시
  CRITICAL = 'CRITICAL',       // 🔴 직접적 자살 의도/계획
}

/** 상담 전략 유형 */
export enum StrategyType {
  CRISIS_SUPPORT = 'CRISIS_SUPPORT', // 🆕 간접 위기 — 순수 공감 + 전문기관 안내
  CALMING = 'CALMING',
  CBT = 'CBT',
  ACT = 'ACT',
  MI = 'MI',
  SUPPORT = 'SUPPORT',
}

/** 가트맨 4 Horsemen */
export enum HorsemenType {
  CRITICISM = 'CRITICISM',
  CONTEMPT = 'CONTEMPT',
  DEFENSIVENESS = 'DEFENSIVENESS',
  STONEWALLING = 'STONEWALLING',
}

/** 인지 왜곡 유형 (CBT 표준 8종) */
export enum DistortionType {
  MIND_READING = 'MIND_READING',
  CATASTROPHIZING = 'CATASTROPHIZING',
  PERSONALIZATION = 'PERSONALIZATION',
  ALL_OR_NOTHING = 'ALL_OR_NOTHING',
  OVERGENERALIZATION = 'OVERGENERALIZATION',
  EMOTIONAL_REASONING = 'EMOTIONAL_REASONING',
  SHOULD_STATEMENTS = 'SHOULD_STATEMENTS',
  LABELING = 'LABELING',
}

/** 🆕 내담자 의도 8분류 (MISC 2.5 + ESConv 기반) */
export enum ClientIntent {
  /** 감정 토로 — "서운해 ㅠㅠ", "미칠것같아" */
  VENTING = 'VENTING',
  /** 상황 설명 — "어제 카페에서 걔가..." */
  STORYTELLING = 'STORYTELLING',
  /** 인정 추구 — "이게 정상이지?", "내가 맞지?" */
  SEEKING_VALIDATION = 'SEEKING_VALIDATION',
  /** 조언 요청 — "어떻게 해?", "뭘 해야 해?" */
  SEEKING_ADVICE = 'SEEKING_ADVICE',
  /** 양가감정 — "~인데 ~도", "헤어지고 싶은데 무서워" */
  EXPRESSING_AMBIVALENCE = 'EXPRESSING_AMBIVALENCE',
  /** 통찰 표현 — "아...", "그러네", "맞아 사실은" */
  INSIGHT_EXPRESSION = 'INSIGHT_EXPRESSION',
  /** 저항/방어 — "아 그건 아니고", "별거 아닌데" */
  RESISTANCE = 'RESISTANCE',
  /** 짧은 응답 — "응", "몰라", "그래" */
  MINIMAL_RESPONSE = 'MINIMAL_RESPONSE',
}

/** 🆕 Hill HCVRMCS 기반 상담사 응답 모드 12가지 */
export enum ResponseMode {
  /** 최소 격려 — "음", "계속해봐" */
  MINIMAL_ENCOURAGER = 'MINIMAL_ENCOURAGER',
  /** 사실 되풀이 */
  RESTATEMENT = 'RESTATEMENT',
  /** 감정 반영 */
  REFLECTION = 'REFLECTION',
  /** 열린 질문 */
  OPEN_QUESTION = 'OPEN_QUESTION',
  /** 인정/안심 */
  APPROVAL = 'APPROVAL',
  /** 공감 경험 공유 */
  SELF_DISCLOSURE = 'SELF_DISCLOSURE',
  /** 부드러운 도전 */
  CHALLENGE = 'CHALLENGE',
  /** 해석/새 관점 */
  INTERPRETATION = 'INTERPRETATION',
  /** 지금 이 순간 */
  IMMEDIACY = 'IMMEDIACY',
  /** 정보 제공 */
  INFORMATION = 'INFORMATION',
  /** 직접 제안 */
  DIRECT_GUIDANCE = 'DIRECT_GUIDANCE',
  /** 침묵/존재 */
  PRESENCE = 'PRESENCE',
}

/** 🆕 내담자 의도 분석 결과 */
export interface IntentResult {
  primaryIntent: ClientIntent;
  secondaryIntent?: ClientIntent;
  confidence: number;
  emotionalIntensity: 'low' | 'medium' | 'high' | 'crisis';
  changeReadiness: 'pre_contemplation' | 'contemplation' | 'preparation' | 'action';
}

/** 대화 단계 (ESConv 3단계 — 레거시 호환) */
export type ConversationPhase = 'EXPLORATION' | 'COMFORTING' | 'ACTION';

// ============================================
// 🆕 v8: 5구간 이벤트 기반 턴 시스템
// ============================================

/** 5구간 Phase (v2 턴 아키텍처) */
export type ConversationPhaseV2 =
  | 'HOOK'      // 턴 1-2: 감정 포착 & 첫인상
  | 'MIRROR'    // 턴 3-4: 거울처럼 비춰주기 + 첫 보상
  | 'BRIDGE'    // 턴 5-6: 다리 놓기 + 솔루션 프리뷰
  | 'SOLVE'     // 턴 7-8: 해결책 전달 + 실행 도구
  | 'EMPOWER';  // 턴 9+: 임파워먼트 & 클로징

/** v2→v1 레거시 매핑 (하위 호환) */
export const PHASE_V2_TO_V1: Record<ConversationPhaseV2, ConversationPhase> = {
  HOOK: 'EXPLORATION',
  MIRROR: 'EXPLORATION',
  BRIDGE: 'COMFORTING',
  SOLVE: 'ACTION',
  EMPOWER: 'ACTION',
};

/** Phase 이벤트 유형 (8종) */
export type PhaseEventType =
  | 'EMOTION_THERMOMETER'   // 감정 온도계 🌡️
  | 'INSIGHT_CARD'          // 인사이트 카드 💡 (레거시 — EMOTION_MIRROR로 대체)
  | 'EMOTION_MIRROR'        // 🆕 v17: 루나의 마음 거울 🪞 (INSIGHT_CARD 대체)
  | 'PATTERN_MIRROR'        // 🆕 v14: 반복 패턴 거울 🪞 (SCALING_QUESTION 대체)
  | 'SOLUTION_PREVIEW'      // 솔루션 프리뷰 🔮
  | 'SOLUTION_CARD'         // 솔루션 카드 🎯
  | 'MESSAGE_DRAFT'         // 메시지 초안 💬
  | 'GROWTH_REPORT'         // 성장 리포트 📈
  | 'SESSION_SUMMARY'       // 🆕 v20: 세션 요약 📋
  | 'HOMEWORK_CARD'         // 🆕 v20: 숙제 카드 📝
  | 'TAROT_DRAW'            // 🔮 타로카드 뽑기
  | 'TAROT_AXIS_COLLECT'    // 🔮 타로냥 스프레드 축 수집
  | 'TAROT_INSIGHT';        // 🔮 타로냥 카드 인사이트 (SOLVE단계)

/** Phase 이벤트 데이터 */
export interface PhaseEvent {
  type: PhaseEventType;
  phase: ConversationPhaseV2;
  data: Record<string, unknown>;
}

/** 감정 온도계 데이터 */
export interface EmotionThermometerData {
  question: string;
  minLabel: string;
  maxLabel: string;
  currentValue?: number;
  /** 🆕 v10: AI가 대화 기반으로 자체 판단한 감정 점수 (0~10) */
  aiAssessedScore: number;
  /** 🆕 v10: AI가 판단한 감정 라벨 */
  aiEmotionLabel: string;
  /** 🆕 v10: AI 판단 근거 (짧은 설명) */
  assessmentBasis: string;
}

/** 인사이트 카드 데이터 (레거시) */
export interface InsightCardData {
  title: string;
  situation: string;
  emotion: string;
  pattern: string;
  scenario: string;
  duration?: string;
  emotions: string[];
  insight: string;
  choices: { label: string; value: string }[];
}

/** 🆕 v17: 루나의 마음 거울 데이터 (EFT 표면→1차 감정) */
export interface EmotionMirrorData {
  surfaceEmotion: string;     // 겉으로 보이는 감정 (예: "화가 나는 상태")
  surfaceEmoji: string;       // 표면 감정 이모지
  deepEmotion: string;        // 속마음 진짜 감정 (예: "서운하고 불안한 마음")
  deepEmoji: string;          // 깊은 감정 이모지
  lunaMessage: string;        // 루나의 한마디 (예: "이거 맞아? 아니면 다른 느낌이야?")
  choices: { label: string; value: string }[];
}

/**
 * 🆕 v19: 감정 신호 (한 턴에서 감지된 감정 데이터)
 *
 * EFT Primary/Secondary 감정 모델 + Greenberg 4층 모델 기반
 * 매 턴 State Analysis에서 추출되어 세션 전체에 걸쳐 누적됨
 */
export interface EmotionSignal {
  turn: number;
  /** 감지된 감정 키워드 (한국어) */
  detectedEmotions: string[];
  /** EFT 감정 층위 */
  eftLayer: 'primary_adaptive' | 'primary_maladaptive' | 'secondary_reactive' | 'instrumental';
  /** 핵심 깊은 감정 (예: "두려움", "수치심", "서운함") */
  primaryEmotion?: string;
  /** 감정 억압 신호 ("괜찮아", "상관없어", "별거 아닌데") */
  suppressionSignals: string[];
  /** 핵심 애착 두려움 */
  attachmentFear?: 'abandonment' | 'rejection' | 'inadequacy' | 'loss_of_control' | null;
  /** 근거가 된 사용자 발화 조각 */
  evidence: string[];
  /** 확신도 0~1 */
  confidence: number;
}

/**
 * 🆕 v19: 감정 누적 상태 (세션 전체)
 *
 * 턴별 감정 신호를 누적하고, 겉감정(온도계)과 속마음(AI 분석) 가설을 관리
 */
export interface EmotionAccumulatorState {
  /** 턴별 감정 신호 (최대 8개) */
  signals: EmotionSignal[];
  /** 누적 분석 기반 속마음 가설 */
  deepEmotionHypothesis: {
    primaryEmotion: string;
    confidence: number;
    supportingEvidence: string[];
    eftLayer: string;
  } | null;
  /** 온도계 기반 겉감정 (온도계 완료 후 설정) */
  surfaceEmotion: {
    label: string;
    score: number;
    emoji: string;
  } | null;
  /** 🆕 v22: 마지막 스티커 사용 턴 (빈도 제어) */
  lastStickerTurn?: number;
  /** 🆕 v22: 마지막 사용한 스티커 ID (연속 중복 방지) */
  lastStickerId?: string;
}

/**
 * 🆕 v14: 반복 패턴 거울 데이터
 *
 * 축 데이터 기반 패턴 감지 → 시각화 → 해결책 전환
 * 근거: Gottman 반복 패턴 연구 + EFT Infinity Loop + AI 패턴 감지 (2024-2025)
 */
export interface PatternMirrorData {
  /** 메인 타이틀 */
  title: string;
  /** 감지된 반복 패턴 (최대 3개, 강도 내림차순) */
  patterns: PatternItem[];
  /** EFT 추구-회피 등 사이클 시각화 */
  cycle?: PatternCycle;
  /** 패턴 기반 한줄 통찰 */
  insight: string;
  /** 학술 근거 인용 (UI 하단 표시) */
  researchBasis: string;
  /** 선택지 */
  choices: { label: string; value: string }[];
}

/** 개별 패턴 아이템 */
export interface PatternItem {
  /** 아이콘 이모지 */
  icon: string;
  /** 패턴 레이블 (예: "추구-회피 사이클") */
  label: string;
  /** 설명 (1줄) */
  description: string;
  /** 패턴 강도 (1~5) — 강도 바 시각화 */
  intensity: number;
  /** 근거 축 이름 */
  basedOn: string;
  /** 반복 빈도 텍스트 ("자주", "점점 심해짐" 등) */
  frequency?: string;
}

/** EFT 기반 관계 사이클 시각화 */
export interface PatternCycle {
  /** 사이클 이름 (예: "추구-회피 사이클") */
  name: string;
  /** 내 역할 (예: "추구자") */
  myRole: string;
  /** 상대 역할 추정 (예: "회피자") */
  partnerRole: string;
  /** 사이클 설명 (화살표 포함) */
  description: string;
}

/** 솔루션 프리뷰 데이터 */
export interface SolutionPreviewData {
  title: string;
  completedSteps: string[];
  strategyCount: number;
  teaser: string;
  choices: { label: string; value: string }[];
}

/** 솔루션 카드 데이터 */
export interface SolutionCardData {
  title: string;
  frameworkName: string;
  rationale: string;
  hasDraft: boolean;
  steps: {
    name: string;
    description: string;
    action?: string;
  }[];
  choices: { label: string; value: string }[];
}

/** 메시지 초안 데이터 */
export interface MessageDraftData {
  title: string;
  drafts: { intent: string; text: string }[];
}

/** 성장 리포트 데이터 */
export interface GrowthReportData {
  title: string;
  beforeScore: number;
  afterScore: number;
  pointDifference: number;
  keyDiscoveries: string[];
  actionPlan: string[];
}

/** 🆕 v20: 세션 요약 데이터 */
export interface SessionSummaryData {
  title: string;
  keyInsights: string[];        // 핵심 발견 3가지
  emotionJourney: string;       // 감정 여정 요약 1줄
  lunaMessage: string;          // 루나의 마무리 멘트
}

/** 🆕 v20: 숙제 카드 데이터 */
export interface HomeworkCardData {
  title: string;
  homeworks: {
    type: 'behavior' | 'observe' | 'selfcare';
    emoji: string;
    task: string;               // 과제 내용
    detail: string;             // 구체적 방법
  }[];
  encouragement: string;        // 격려 멘트
}

/** 🔮 타로냥 에너지 카드 선택 이벤트 데이터 (Pick-a-Card) */
export interface TarotAxisCollectData {
  question: string;
  tarotNyangMessage: string;
  /** 뒤집힌 3장 카드 — 유저가 끌리는 1장 선택 */
  pickCards: {
    id: string;
    backEmoji: string; // 뒷면 이모지 (🌙, ⭐, 🔥)
    label: string;     // "첫 번째 카드", "두 번째 카드"
    // 선택 후 공개되는 앞면 정보
    cardName: string;
    cardEmoji: string;
    isReversed: boolean;
    keywords: string[];
    /** 오늘의 에너지 메시지 — 유저 고민과 연결된 해석 */
    energyMessage: string;
  }[];
  /** 하위 호환 — 기존 choices 형태 (미사용 시 빈 배열) */
  choices: { label: string; value: string; emoji: string; description: string }[];
}

/** 🔮 타로냥 인사이트 이벤트 데이터 (SOLVE 단계) */
export interface TarotInsightData {
  cards: { position: string; cardName: string; cardEmoji: string; isReversed: boolean }[];
  insight: string;       // 카드 조합이 말하는 핵심 메시지
  advice: string;        // 구체적 행동 조언
  actionItems: string[]; // 실행 항목 1-3개
  tarotNyangMessage: string;
}

/** 🔮 타로카드 뽑기 이벤트 데이터 */
export interface TarotDrawData {
  spreadType: 'single' | 'three' | 'love' | 'unrequited' | 'reconnection' | 'pace' | 'avoidant' | 'yesno';
  cards: {
    position: string;
    cardName: string;
    cardEmoji: string;
    keywords: string[];
    isReversed: boolean;
    interpretation: string;
  }[];
  overallMessage: string;
  /** 🆕 v23: 종합 해석 (overallMessage의 확장, TarotDraw.tsx에서 우선 렌더링) */
  overallReading?: string;
  /** 🆕 v23: 카드의 조언 */
  advice?: string;
  tarotNyangMessage: string;
  /** 🆕 v23: 후속 질문 목록 */
  followUpQuestions?: string[];
  choices: { label: string; value: string }[];
}

/** 구간 전환 규칙 */
export interface PhaseTransitionRule {
  from: ConversationPhaseV2;
  to: ConversationPhaseV2;
  minTurn: number;
  maxTurn: number;
  hardTriggers: {
    diagnosisComplete?: boolean;
    adviceRequested?: boolean;
    eventCompleted?: PhaseEventType;
    axisCount?: number;
    readinessScore?: number;
  };
}

/** 🆕 v5: 연애 시나리오 8분류 (한국 MZ세대 Top 7 + 범용) */
export enum RelationshipScenario {
  /** 카톡 읽씹/안읽씹 — 불안 유발 */
  READ_AND_IGNORED = 'READ_AND_IGNORED',
  /** 잠수/고스팅 — 그리프 케어 */
  GHOSTING = 'GHOSTING',
  /** 장거리 연애 — 소통 루틴 */
  LONG_DISTANCE = 'LONG_DISTANCE',
  /** 질투/집착 — 불안형 탐색 */
  JEALOUSY = 'JEALOUSY',
  /** 바람/외도 — 트라우마 케어 */
  INFIDELITY = 'INFIDELITY',
  /** 이별 고민 — 양가감정 + 결정 지원 */
  BREAKUP_CONTEMPLATION = 'BREAKUP_CONTEMPLATION',
  /** 권태기 — 소통 패턴 개선 */
  BOREDOM = 'BOREDOM',
  /** 일반 연애 고민 */
  GENERAL = 'GENERAL',
  /** 짝사랑 — 혼자 좋아함, 고백 고민 */
  UNREQUITED_LOVE = 'UNREQUITED_LOVE',
  /** 재회/연락 시도 — 전 연인, 다시 만남 */
  RECONNECTION = 'RECONNECTION',
  /** 새로운 만남/썸 — 설레는 초기 단계 */
  FIRST_MEETING = 'FIRST_MEETING',
  /** 연애 공포증/회피형 — 진지한 관계 기피 */
  COMMITMENT_FEAR = 'COMMITMENT_FEAR',
  /** 진도 차이 — 만남→교제 불일치 */
  RELATIONSHIP_PACE = 'RELATIONSHIP_PACE',
  /** 온라인/앱 만남 특수성 */
  ONLINE_LOVE = 'ONLINE_LOVE',
}

/** 상태 분석 결과 */
export interface StateResult {
  emotionScore: number;
  /** 🆕 v10.2: 감정 판단 근거 (AI가 왜 이 점수를 줬는지 자연어 설명) */
  emotionReason?: string;
  cognitiveDistortions: DistortionType[];
  attachmentType: AttachmentType;
  horsemenDetected: HorsemenType[];
  riskLevel: RiskLevel;
  isFlooding: boolean;
  linguisticProfile: {
    isAmbivalent: boolean;
    isSuppressive: boolean;
  };
  /** 🆕 내담자 의도 분류 결과 */
  intent?: IntentResult;
  /** 🆕 v5: 연애 시나리오 분류 */
  scenario?: RelationshipScenario;
  /** 🆕 v7.1: LLM 기반 읽씹 축 추출 결과 */
  llmReadIgnoredAxes?: {
    duration?: string;
    stage?: string;
    readType?: string;
    pattern?: string;
  };
  /** 🆕 v12: 관계진단 범용 축 (LLM 추출) */
  conflictStyle?: string;
  relationshipStrength?: string;
  changeReadiness?: string;
  partnerContext?: string;
  previousAttempts?: string;
  /** 🆕 v16: 감정 체크 준비도 (적응형 타이밍) */
  emotionCheckReadiness?: {
    delaySignals: string[];
    readySignals: string[];
    isReady: boolean;
  };
  /** 🆕 v19: 턴별 감정 신호 (감정 누적기용) */
  emotionSignal?: EmotionSignal;
  /** 🆕 v20: 해결책 준비도 (5A Framework) */
  solutionReadiness?: 'NOT_READY' | 'EXPLORING' | 'READY';
}

/** 전략 선택 결과 */
export interface StrategyResult {
  strategyType: StrategyType;
  reason: string;
  priority: number;
  thinkingBudget: 'low' | 'medium' | 'high';
  modelTier: 'haiku' | 'sonnet' | 'opus';
}

/** Nudge 행동 유도 */
export interface NudgeAction {
  type: 'calming_timer' | 'breathing_guide' | 'thought_record' | 'value_explore' | 'importance_ruler' | 'emotion_feedback' | 'draft_builder' | 'quick_reply';
  title: string;
  description: string;
  data?: Record<string, unknown>;
}

/** 파이프라인 결과 */
export interface PipelineResult {
  aiMessage: string;
  stateResult: StateResult;
  strategyResult: StrategyResult;
  nudges: NudgeAction[];
}

// ============================================
// 선택지 피드백 루프 타입
// ============================================

/** 선택지 카테고리 — 엔진이 사용자 의도를 분류 */
export type SuggestionCategory =
  | 'SAFETY_CHECK'          // 위기: "지금 안전해요"
  | 'CRISIS_CONNECT'        // 긴급: "전문 상담 연결해주세요"
  | 'STABILIZATION'         // CALMING: "호흡 운동" / "쉬고 올게요"
  | 'PERSPECTIVE_EXPLORE'   // CBT: "근거가 있어요?" / "반대로 생각"
  | 'VALUE_EXPLORE'         // ACT: "제일 중요한 건" / "감정 느껴볼래요"
  | 'CHANGE_TALK'           // MI: "바꾸고 싶어요" / "못 바꿀 것 같아요"
  | 'DIRECTION_CHOICE'      // SUPPORT: "더 이야기할래요" / "여기까지"
  | 'EMOTION_EXPRESSION'    // 초반 턴: "더 말해줄래요?"
  | 'ACTION_COMMITMENT'     // 후반 턴: "해볼게요"
  ;

/** 선택지 메타 정보 — 프론트→서버→엔진 전달 */
export interface SuggestionMeta {
  /** 메시지 출처 */
  source: 'typed' | 'suggestion' | 'emotion_thermometer' | 'insight_card' | 'emotion_mirror' | 'pattern_mirror' | 'solution_preview' | 'solution_preview_delay' | 'solution_card_draft' | 'solution_card_other' | 'message_copy' | 'message_modify' | 'message_custom' | 'growth_report_promise' | 'growth_report_continue';
  context?: Record<string, any>;
  /** 선택지가 의도한 전략 */
  strategyHint?: StrategyType;
  /** 선택지 카테고리 */
  category?: SuggestionCategory;
  /** 선택한 옵션 인덱스 (0, 1, 2) */
  suggestionIndex?: number;
}

/** 구조화 선택지 아이템 — 서버→프론트 전달 */
export interface SuggestionItem {
  text: string;
  category: SuggestionCategory;
  strategyHint?: StrategyType;
}

/** 전략 → 기본 선택지 카테고리 매핑 */
export const STRATEGY_TO_CATEGORY: Record<StrategyType, SuggestionCategory> = {
  [StrategyType.CRISIS_SUPPORT]: 'SAFETY_CHECK',
  [StrategyType.CALMING]: 'STABILIZATION',
  [StrategyType.CBT]: 'PERSPECTIVE_EXPLORE',
  [StrategyType.ACT]: 'VALUE_EXPLORE',
  [StrategyType.MI]: 'CHANGE_TALK',
  [StrategyType.SUPPORT]: 'DIRECTION_CHOICE',
};

/** 카테고리 → AI 프롬프트 의도 설명 */
export const CATEGORY_INTENT_MAP: Record<SuggestionCategory, string> = {
  SAFETY_CHECK: '자신의 안전 상태를 확인하려는 의지',
  CRISIS_CONNECT: '전문기관 연결 요청',
  STABILIZATION: '감정 안정화 행동을 원하는 의지',
  PERSPECTIVE_EXPLORE: '관점을 바꿔보려는 의지 (인지 재구성)',
  VALUE_EXPLORE: '핵심 가치나 깊은 감정을 탐색하려는 의지',
  CHANGE_TALK: '변화에 대한 양가감정을 표현',
  DIRECTION_CHOICE: '대화 방향을 자율적으로 선택',
  EMOTION_EXPRESSION: '감정을 더 표현하고 싶은 의지',
  ACTION_COMMITMENT: '실천 의지를 보이는 행동 결심',
};

