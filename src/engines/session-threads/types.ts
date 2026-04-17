/**
 * 🧵 Session Threads — 세션 간 장기 테마 연결
 *
 * "어제 그 남친 얘기 어떻게 됐어?" 같은 자연스러운 연결.
 * 세션 종료 시 주요 테마 추출 → DB 저장 → 다음 세션 시작 시 자동 로드.
 */

export type ThreadStatus = 'open' | 'resolved' | 'dormant' | 'abandoned';

export interface SessionThread {
  id?: string;
  user_id: string;

  /** 테마 이름 (자연어) */
  theme: string;

  /** 상세 요약 */
  summary?: string;

  /** 시간 */
  started_at: string;
  last_mentioned_at: string;

  /** 상태 */
  status: ThreadStatus;

  /** 중요도 (0~1) */
  importance: number;

  /** 관련 인물 */
  characters: string[];

  /** 등장 세션 수 */
  session_mention_count: number;

  /** 임베딩 (optional) */
  embedding?: number[];
}

/** 새 스레드 생성 입력 */
export interface CreateThreadInput {
  user_id: string;
  theme: string;
  summary?: string;
  importance?: number;
  characters?: string[];
}

/** 기존 스레드 업데이트 */
export interface UpdateThreadInput {
  id: string;
  last_mentioned_at?: string;
  status?: ThreadStatus;
  summary?: string;
  importance?: number;
  increment_mention_count?: boolean;
}

/** 좌뇌에 주입할 포맷 */
export interface ThreadsForLeftBrain {
  theme: string;
  status: string;
  days_ago: number;
}
