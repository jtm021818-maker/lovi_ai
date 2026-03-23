/** 채팅 메시지 */
export interface ChatMessage {
  id: string;
  sessionId: string;
  senderType: 'user' | 'ai';
  content: string;
  sentimentScore?: number;
  strategyUsed?: string;
  createdAt: string;
}

/** 상담 세션 */
export interface Session {
  id: string;
  userId: string;
  title?: string;
  status: 'active' | 'completed' | 'crisis';
  sessionSummary?: string;
  createdAt: string;
  endedAt?: string;
}

/** 온보딩 상황 */
export type OnboardingSituation = 'breakup' | 'crush' | 'relationship' | 'confused' | 'free';

/** 사용자 프로필 */
export interface UserProfile {
  id: string;
  nickname: string;
  onboardingCompleted: boolean;
  onboardingSituation?: OnboardingSituation;
  attachmentType: string;
  createdAt: string;
}

/** 감정 일기 */
export interface JournalEntry {
  id: string;
  userId: string;
  emotionWords: string[];
  content: string;
  gratitude?: string;
  emotionScore: number;
  createdAt: string;
}

/** 스트리밍 이벤트 */
export interface StreamEvent {
  type: 'text' | 'state' | 'nudge' | 'done' | 'error' | 'suggestions' | 'panel' | 'strategy' | 'axes_progress' | 'axis_choices' | 'phase_event' | 'phase_change';
  data: string | string[] | Record<string, unknown> | Record<string, unknown>[];
}

/** 퀵 리플라이 옵션 */
export interface QuickReply {
  label: string;
  value: string;
}
