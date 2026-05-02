/**
 * 🎭 ACE v5 표현 엔진 — 타입 정의
 *
 * 우뇌(Claude)의 4-트랙 병렬 사고 + 후보 비교 + 자기 정정 + 양방향 피드백
 */

import type { LeftBrainAnalysis } from '@/engines/left-brain';

// ============================================================
// 1. 좌뇌 → 우뇌 데이터 인터페이스 (Handoff)
// ============================================================

/**
 * 좌뇌 분석을 우뇌가 활용할 형태로 가공.
 * 🆕 v75: 좌뇌 전체 필드 pass-through. 우뇌 LLM 이 판단해서 취사선택.
 */
export interface LeftToRightHandoff {
  /** 좌뇌가 본 상태 요약 (자연어) */
  state_summary: {
    valence: string;
    arousal: string;
    dominance: string;
    intimacy: string;
  };

  /** 원시 7차원 벡터 (우뇌가 세밀한 값 필요 시) */
  state_vector_raw: LeftBrainAnalysis['state_vector'];

  /** 소마틱 마커 */
  somatic: {
    gut_reaction: string;
    intensity: number;
    triggered_by: string;
    meaning: string;
  };

  /** 2차 ToM (확장) */
  user_expectation: {
    surface: string;
    deep: string;
    mismatch: boolean;
    hidden_fear: string | null;
    pattern: string;
    conversational_goal: { type: string; strength: number };
    avoided_topics: string[];
  };

  /** 활성 신호들 (자연어 힌트) */
  active_signals: string[];
  signal_hints: string[];
  avoidances: string[];

  /** 좌뇌가 읽은 루나 속마음/상황 */
  perceived_emotion: string;
  actual_need: string;
  luna_thought: string;
  situation_read: string;

  /** 🆕 v75: 파생 감정 (서러움/애증 같은 복합) */
  emotion_blend: LeftBrainAnalysis['emotion_blend'];

  /** 🆕 v75: 루나 자신의 호르몬 반응 (루나 내면 상태) */
  hormonal_impact: LeftBrainAnalysis['hormonal_impact'];

  /** 🆕 v75: 기억 연결 (과거 에피소드) */
  memory_connections: LeftBrainAnalysis['memory_connections'];

  /** 좌뇌 초안 (참고용) */
  draft: string;

  /** 좌뇌 추천 톤/길이 */
  recommended_tone: string;
  recommended_length: '침묵' | '한마디' | '짧음' | '보통';

  /** 좌뇌 태그 (자동 첨부) */
  tags: LeftBrainAnalysis['tags'];

  /** 복잡도 + 신뢰도 + 애매함 */
  complexity: number;
  confidence: number;
  ambiguity_signals: string[];

  /** 🆕 v74: 좌뇌 이벤트 추천 (우뇌가 이걸 보고 해당 태그 출력) */
  event_recommendation?: LeftBrainAnalysis['event_recommendation'];

  /** 🆕 v74: 좌뇌 전략적 전환 판단 */
  strategic_shift?: LeftBrainAnalysis['strategic_shift'];

  /** 🆕 v74: 좌뇌 pacing 메타 */
  pacing_meta?: LeftBrainAnalysis['pacing_meta'];

  /** 🆕 v75: 메타-항의 감지 */
  meta_awareness?: LeftBrainAnalysis['meta_awareness'];

  /** 🆕 v75: 자아 표현 (질문 과잉 감지 + 망상 시드) */
  self_expression?: LeftBrainAnalysis['self_expression'];

  /** 🆕 v75: 이번 턴 채워진 정보 카드들 */
  cards_filled_this_turn: LeftBrainAnalysis['cards_filled_this_turn'];

  /**
   * 🆕 v76: 루나의 "떠오른 기억" — 장기 기억 RAG 결과
   * user_memories 에서 가져온 카드들. 1인칭 독백으로 handoff 에 렌더링.
   */
  memory_recalls?: Array<{
    content: string;
    summary?: string | null;
    luna_feeling?: string | null;
    time_ago?: string; // "며칠 전", "저번주", "오늘 아까"
    emotional_weight?: number;
  }>;

  /**
   * 🆕 v76: 이 유저에 대한 루나의 장기 인상 (한 줄)
   * 예: "얘는 자책이 강하고 직설을 힘들어함"
   */
  long_term_impression?: string | null;

  /**
   * 🆕 v77: 친밀도 상태 — 매턴 업데이트
   * 우뇌가 현재 Lv 기반으로 해제된 행동 자연스럽게 활용.
   */
  intimacy_state?: {
    level: 1 | 2 | 3 | 4 | 5;
    name: string;                // "아는 사이" / "편해진 사이" / ...
    score: number;               // 0-100
    description: string;         // 관계 상태 서술
    unlocked_behaviors: string[];
    locked_behaviors: string[];
    days_since_last?: number;
    reunion?: boolean;
    level_up_moment?: boolean;   // 이번 턴 Lv 올라갔는가
  };
}

// ============================================================
// 2. ACE v5 입력
// ============================================================

export interface AceV5Input {
  /** 유저 원문 (필수, "고급진 헛소리" 방지) */
  userUtterance: string;

  /** 세션 식별 */
  sessionId: string;
  turnIdx: number;

  /**
   * 🆕 v78: 실제 대화 히스토리 (치매 방지 핵심)
   * 우뇌(Claude/Gemini)가 직접 볼 수 있는 유저↔루나 전체 주고받음.
   * handoff/draft 만 보고 답하면 초반 맥락("여친이 밥사래") 소실.
   */
  chatHistory?: Array<{ role: 'user' | 'ai'; content: string }>;

  /**
   * 🆕 v56: 우뇌 모델 선택
   *   'gemini' - Gemini 2.5 Flash (90% 상황, 비용 저렴)
   *   'claude' - Claude Sonnet 4.6 (10% 고복잡도, 정밀)
   */
  model?: 'gemini' | 'claude';

  /** 좌뇌 분석 결과 */
  leftBrain: LeftBrainAnalysis;

  /** 좌뇌→우뇌 핸드오프 */
  handoff: LeftToRightHandoff;

  /** 친밀도 레벨 (1~5) */
  intimacyLevel: number;

  /** 현재 Phase */
  phase: string;

  /** 직전 3턴 요약 (반복 방지용) */
  recentLunaActions?: string[];

  /** 재요청 모드 (true면 1차 응답이 [REQUEST_REANALYSIS] 출력한 후 재시도) */
  alreadyReanalyzed?: boolean;

  /** 우뇌의 의심사항 (재요청 시 좌뇌에 전달용) */
  claudeConcern?: string;

  /** 🆕 v73: 직전 루나 응답 (메타-항의 시 자기-참조용) */
  previousLunaText?: string | null;

  /**
   * 🆕 v76: 루나의 장기 기억 번들
   * caller (pipeline) 가 loadWorkingMemory 호출 후 그 결과 + 장기 인상을 넘김.
   * ACE v5 가 buildHandoff 후 mergeMemoryIntoHandoff 로 주입.
   */
  memoryBundle?: {
    facts: any[];
    recent: any[];
    topSalient: any[];
    longTermImpression?: string | null;
    /** 🆕 v77: 친밀도 상태 (handoff 에 주입됨) */
    intimacyState?: LeftToRightHandoff['intimacy_state'];
  };

  /** 🆕 v86: 이미 완료된 이벤트 목록 — AI가 중복 발동 멘트 반복 방지 */
  completedEvents?: string[];

  /** 🆕 v104: 활성 정령 시그니처 카드 가이드 (방 Lv3+ 정령) — buildAceV5UserMessage 에 주입 */
  activeSpiritsHint?: string | null;
}

// ============================================================
// 3. ACE v5 출력
// ============================================================

export interface AceV5Output {
  /** 최종 말풍선 텍스트 (태그 포함) */
  fullText: string;

  /** 재요청 발생 여부 */
  reanalysisRequested: boolean;

  /** 재요청 사유 (있을 때) */
  reanalysisReason?: string;

  /** 🆕 v57: 우뇌가 다음 턴 좌뇌에 남기는 힌트 */
  left_brain_hints_for_next_turn?: string[];

  /** 메타 (로깅용) */
  meta: {
    latencyMs: number;
    tokensIn: number;
    tokensOut: number;
    estimatedCost: number;
    selfCorrectionDetected: boolean;
    pacingHint?: '한마디' | '짧음' | '보통';
  };
}

// ============================================================
// 4. 4-트랙 가중치 (상황별 우세 트랙)
// ============================================================

export type TrackWeight = {
  A_sensation: number;   // 0~1
  B_memory: number;
  C_intuition: number;
  D_expression: number;
};

/** 상황별 추천 가중치 (좌뇌 신호 기반) */
export const TRACK_WEIGHTS_BY_SITUATION = {
  escalating:    { A_sensation: 0.45, B_memory: 0.10, C_intuition: 0.20, D_expression: 0.25 },
  pattern_match: { A_sensation: 0.15, B_memory: 0.50, C_intuition: 0.20, D_expression: 0.15 },
  tom_mismatch:  { A_sensation: 0.15, B_memory: 0.10, C_intuition: 0.55, D_expression: 0.20 },
  daily_chat:    { A_sensation: 0.20, B_memory: 0.10, C_intuition: 0.20, D_expression: 0.50 },
  crisis:        { A_sensation: 0.30, B_memory: 0.05, C_intuition: 0.55, D_expression: 0.10 },
  ambivalence:   { A_sensation: 0.25, B_memory: 0.10, C_intuition: 0.50, D_expression: 0.15 },
  default:       { A_sensation: 0.25, B_memory: 0.20, C_intuition: 0.30, D_expression: 0.25 },
} as const satisfies Record<string, TrackWeight>;

// ============================================================
// 5. 톤 라이브러리 항목
// ============================================================

export type ToneCategory =
  | '따뜻함'
  | '분노공감'
  | '가벼움'
  | '진지함'
  | '위기모드'
  | '자책완화'
  | '양가수용'
  | '정정'
  | '침묵'
  | '호기심'
  | '공명'
  | '부드러움'
  | '직면'
  | '안심'
  | '기쁨공유';

export interface ToneExample {
  category: ToneCategory;
  trigger: string;       // 언제 쓰는가
  examples: string[];    // 실제 응답 예시 (2-3개)
  description?: string;  // 추가 설명
}

// ============================================================
// 6. 후보 비교 결과 (선택적 후처리)
// ============================================================

export interface CandidateAnalysis {
  total_candidates: number;
  selected_index: number;
  selection_reason: string;
}

// ============================================================
// 7. 자기 정정 패턴
// ============================================================

/** 자기 정정 표현 (자연스러운가 검증용) */
export const SELF_CORRECTION_MARKERS = [
  '아 그게 아니라',
  '잠깐',
  '잠깐 다시',
  '아 다시',
  '음...',
  '아니 그게',
  '잠깐만',
  '아 잠깐',
  '음 다시 말할게',
  '아 그러니까',
] as const;
