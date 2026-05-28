/**
 * v120 루나의 생각 노트 — 타입 정의.
 *
 * user_profiles.luna_impression_state 의 shape.
 */

export interface PonderingCandidate {
  /** 후보 별명 */
  name: string;
  /** 왜 이 이름을 고민 중인지 (1줄, ~60자) */
  reason: string;
  /** 0~1. 1.0 이면 곧 정식 candidate 로 등록할 만큼 무르익음 */
  maturity: number;
  /** 어떤 맥락에서 부르고 싶은지 — 동시에 use_context_hint 로 승급 */
  context_hint?: string;
  /** 맥락 태그 — late_night / vulnerable_moment / playful_banter / morning_greeting 등 */
  context_tags?: string[];
}

export interface PonderingState {
  is_pondering: boolean;
  candidates: PonderingCandidate[];
  /** "최근 새벽 대화에서 너가 ~ 해서 떠올랐어" — 한 줄 (~80자) */
  why_now: string;
}

export interface LunaImpressionState {
  /** 80~180자. 손글씨 1인칭. "지금 너를 이렇게 봐" */
  impression_text: string;
  /** UI 칩으로 노출할 짧은 형용 (3~5개, 각 ~12자) */
  impression_facets: string[];
  /** ISO timestamp */
  updated_at: string;
  /** 갱신 시점의 누적 세션 수 (UI: "27회차") */
  session_count_at_update: number;
  /** 다음 호칭 변화 — 고민 중 / 결정 임박 */
  pondering: PonderingState;
}

export const EMPTY_IMPRESSION_STATE: LunaImpressionState = {
  impression_text: '',
  impression_facets: [],
  updated_at: '',
  session_count_at_update: 0,
  pondering: {
    is_pondering: false,
    candidates: [],
    why_now: '',
  },
};

/** Gemini structured JSON output schema (서버 검증용) */
export interface ImpressionLLMResponse {
  impression_text: string;
  impression_facets: string[];
  pondering: {
    is_pondering: boolean;
    candidates: Array<{
      name: string;
      reason: string;
      maturity: number;
      context_hint?: string;
      context_tags?: string[];
    }>;
    why_now: string;
  };
}
