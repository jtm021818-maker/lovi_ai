/**
 * 🎬 Event Memory — 외부 API
 *
 * 사용:
 *   // 이벤트 발동 시
 *   await recordEvent(supabase, { user_id, event_type: 'TAROT', triggered_at: ... });
 *
 *   // 세션 시작 시 좌뇌 컨텍스트 주입
 *   const recent = await fetchRecentEvents(supabase, userId);
 *   const text = formatRecentEventsForContext(recent);
 *   // → systemPrompt 에 prepend
 */

export {
  recordEvent,
  fetchRecentEvents,
  formatRecentEventsForContext,
  updateUserReaction,
} from './store';

export type {
  EventMemory,
  EventKind,
  RecentEventForLeftBrain,
} from './types';
