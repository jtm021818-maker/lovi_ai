/**
 * 🧪 Response Learning — 도파민 학습 시스템
 *
 * 매 턴 끝나면 다음 턴 유저 반응으로 직전 응답 효과 평가.
 * 누적 데이터로 좌뇌의 personalProfile.effective_strategies 자동 채움.
 */

export type LunaStrategy =
  | 'empathy'
  | 'questioning'
  | 'confrontation'
  | 'reassurance'
  | 'explore'
  | 'pace_back';

export type EngagementShift =
  | 'withdrew'        // 더 짧고 위축
  | 'neutral'         // 변화 없음
  | 'deepened'        // 더 길고 깊어짐
  | 'recovered';      // 부정 → 긍정 회복

export interface ResponseFeedbackEntry {
  id?: string;
  user_id: string;
  session_id?: string;
  turn_idx: number;

  /** 루나 응답 요약 (50자 이내) */
  luna_response_summary: string;

  /** 어떤 전략 썼나 */
  luna_strategy: LunaStrategy;

  /** 톤 */
  luna_tone?: string;

  /** 다음 턴 유저 valence 변화 (-2 ~ +2) */
  user_next_emotion_shift?: number;

  /** 다음 턴 유저 engagement */
  user_next_engagement?: EngagementShift;

  /** 효과적이었나 */
  effective?: boolean;

  /** 효과 점수 (0~1) */
  effectiveness_score?: number;

  /** 기록 시각 */
  created_at?: string;
}

/** 학습 결과 (좌뇌 personalProfile 에 주입) */
export interface LearnedStrategies {
  /** 효과 있던 전략 (자연어) */
  effective: string[];
  /** 효과 없던 / 피해야 할 접근 */
  avoid: string[];
}
