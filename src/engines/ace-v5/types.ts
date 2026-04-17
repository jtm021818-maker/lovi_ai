/**
 * 🎭 ACE v5 표현 엔진 — 타입 정의
 *
 * 우뇌(Claude)의 4-트랙 병렬 사고 + 후보 비교 + 자기 정정 + 양방향 피드백
 */

import type { LeftBrainAnalysis } from '@/engines/left-brain';

// ============================================================
// 1. 좌뇌 → 우뇌 데이터 인터페이스 (Handoff)
// ============================================================

/** 좌뇌 분석을 우뇌가 활용할 형태로 가공 */
export interface LeftToRightHandoff {
  /** 좌뇌가 본 상태 요약 (자연어) */
  state_summary: {
    valence: string;       // "슬픔 강함" / "기쁨 약함" 등
    arousal: string;       // "차분함" / "활성" / "격앙"
    dominance: string;     // "통제감 낮음" / "주도적"
    intimacy: string;      // "예의 거리" / "친한 사이"
  };

  /** 소마틱 마커 (트랙 A 출발점) */
  somatic: {
    gut_reaction: string;
    intensity: number;
    meaning: string;
  };

  /** 2차 ToM (트랙 C 입력) */
  user_expectation: {
    surface: string;
    deep: string;
    mismatch: boolean;
    hidden_fear: string | null;
    pattern: string;
  };

  /** 활성 신호들 (자연어 힌트) */
  active_signals: string[];
  signal_hints: string[];
  avoidances: string[];

  /** 좌뇌 초안 (참고용, 그대로 안 써도 됨) */
  draft: string;

  /** 좌뇌 추천 톤/길이 */
  recommended_tone: string;
  recommended_length: '침묵' | '한마디' | '짧음' | '보통';

  /** 좌뇌 태그 (자동 첨부) */
  tags: LeftBrainAnalysis['tags'];

  /** 신뢰도 (낮으면 우뇌가 의심해도 됨) */
  confidence: number;
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
