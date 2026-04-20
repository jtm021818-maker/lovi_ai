/**
 * 🎬 Event Memory — 발동된 이벤트 기록 + 자발 참조
 *
 * 루나가 "3일 전 너랑 타로 봤잖아" 같은 자발적 회상 가능.
 * event_triggers 테이블 활용 (KBE에서 이미 만든 것 재사용).
 */

export type EventKind =
  | 'VN_THEATER'
  | 'LUNA_STORY'
  | 'TAROT'
  | 'ACTION_PLAN'
  | 'WARM_WRAP'
  | 'EMOTION_MIRROR'
  | 'PATTERN_MIRROR'
  // 🆕 v84: 루나 자율 판단형 인터넷 검색 이벤트
  | 'SONG_RECOMMENDATION'
  | 'DATE_SPOT_RECOMMENDATION';

export interface EventMemory {
  id?: string;
  user_id: string;
  session_id?: string;
  event_type: EventKind;
  triggered_at: string;
  /** 이벤트 발동 당시 컨텍스트 요약 */
  context_summary?: string;
  /** 유저가 따라왔는지 */
  user_accepted?: boolean;
  /** 유저 반응 (긍정/중립/부정) */
  user_reaction?: 'positive' | 'neutral' | 'negative';
}

/** 좌뇌 컨텍스트에 주입할 형태 */
export interface RecentEventForLeftBrain {
  type: string;
  days_ago: number;
  context_summary?: string;
  user_accepted?: boolean;
}
