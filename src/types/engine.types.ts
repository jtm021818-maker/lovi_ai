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

/** Phase 이벤트 유형 (7종) */
export type PhaseEventType =
  | 'EMOTION_THERMOMETER'   // 감정 온도계 🌡️
  | 'INSIGHT_CARD'          // 인사이트 카드 💡
  | 'SCALING_QUESTION'      // SFBT 스케일링 질문 📊
  | 'SOLUTION_PREVIEW'      // 솔루션 프리뷰 🔮
  | 'SOLUTION_CARD'         // 솔루션 카드 🎯
  | 'MESSAGE_DRAFT'         // 메시지 초안 💬
  | 'GROWTH_REPORT';        // 성장 리포트 📈

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

/** 인사이트 카드 데이터 */
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

/** 스케일링 질문 데이터 */
export interface ScalingQuestionData {
  question: string;
  minLabel: string;
  maxLabel: string;
  currentScore?: number;
  followUpQuestion: string;
  options: string[];
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
}

/** 상태 분석 결과 */
export interface StateResult {
  emotionScore: number;
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
  source: 'typed' | 'suggestion' | 'emotion_thermometer' | 'insight_card' | 'scaling_question' | 'solution_preview' | 'solution_preview_delay' | 'solution_card_draft' | 'solution_card_other' | 'message_copy' | 'message_modify' | 'message_custom' | 'growth_report_promise' | 'growth_report_continue';
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

