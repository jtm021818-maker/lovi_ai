/**
 * 🧠 Working Memory (v70)
 *
 * 인간 뇌의 작업 기억 (Baddeley-Hitch 모델) 모사.
 * 세션 단위로 휘발성. 세션 종료 시 Layer 2 (해마) 로 공고화 후 사라짐.
 *
 * 저장 위치: counseling_sessions.session_metadata.working_memory (JSONB)
 */

import type { StateVector } from '@/engines/left-brain/types';
import type { PacingState } from '@/engines/left-brain/types';
import type { FilledCard } from '@/engines/left-brain/types';

/** 최근 대화 턴 (음운 루프 + 에피소드 버퍼) */
export interface RecentTurn {
  role: 'user' | 'luna';
  content: string;
  turn_idx: number;
  emotion_score?: number;
  key_phrase?: string;       // LLM 이 뽑은 1줄 핵심 (선택)
  timestamp?: string;
}

/** 감정 궤적 한 포인트 */
export interface EmotionTrajectoryPoint {
  turn: number;
  score: number;                 // -5 ~ +5
  primary_emotion?: string;      // "슬픔", "분노" 등
  delta?: number;                // 직전 대비 변화
}

/** 활성 세션 스레드 후보 */
export interface ActiveThreadCandidate {
  theme: string;
  open_at_turn: number;
  importance: number;            // 0~1
  last_mentioned_turn?: number;
}

/** 세션 내 스크래치패드 (대화 맥락 요약) */
export interface SessionScratchpad {
  main_topic?: string;           // "여친과의 청소 갈등"
  key_characters?: string[];     // ["유저", "여친"]
  situation_summary?: string;    // "청소 문제로 싸웠고 유저 피곤함"
  user_primary_stance?: string;  // "억울함 + 피곤함 + 자기 합리화"
  unresolved_points?: string[];  // ["누가 먼저 잘못", "화해 방법"]
  updated_at_turn?: number;
}

/**
 * Working Memory Scratchpad
 * 세션당 1개. 턴마다 갱신.
 */
export interface WorkingMemoryScratchpad {
  session_id: string;
  user_id: string;
  turn_idx: number;

  /** 1. 대화 버퍼 — 최근 10턴 */
  recent_turns: RecentTurn[];

  /** 2. 오래된 턴 요약 (10턴 넘으면 1~2문장으로 축약) */
  rolling_summary?: string;

  /** 3. 세션 내 감정 궤적 */
  emotion_trajectory: EmotionTrajectoryPoint[];

  /** 4. 세션 내 7D 상태 궤적 (최근 5턴) */
  state_trajectory: StateVector[];

  /** 5. 직전 턴 메타 (연속성 유지) */
  previous_pacing_state?: PacingState;
  previous_luna_thought?: string;
  previous_tone?: string;

  /** 6. 활성 정보 카드 (HOOK W1~W4 등 누적) */
  filled_cards: Record<string, FilledCard>;

  /** 7. 활성 세션 스레드 후보 */
  active_threads: ActiveThreadCandidate[];

  /** 8. 세션 스크래치패드 */
  session_scratchpad: SessionScratchpad;

  /** 9. 연속 짧은 답 카운트 */
  consecutive_short_replies: number;

  /** 10. 연속 FRUSTRATED 카운트 */
  consecutive_frustrated_turns: number;

  /** 생성/수정 시각 */
  created_at: string;
  updated_at: string;
}

/** 기본 빈 스크래치패드 생성 */
export function createEmptyScratchpad(
  sessionId: string,
  userId: string,
): WorkingMemoryScratchpad {
  const now = new Date().toISOString();
  return {
    session_id: sessionId,
    user_id: userId,
    turn_idx: 0,
    recent_turns: [],
    rolling_summary: undefined,
    emotion_trajectory: [],
    state_trajectory: [],
    previous_pacing_state: undefined,
    previous_luna_thought: undefined,
    previous_tone: undefined,
    filled_cards: {},
    active_threads: [],
    session_scratchpad: {},
    consecutive_short_replies: 0,
    consecutive_frustrated_turns: 0,
    created_at: now,
    updated_at: now,
  };
}
