/**
 * 🧵 Session Threads — 외부 API
 *
 * 사용:
 *   import { fetchActiveThreads, createThread, updateThread } from '@/engines/session-threads';
 *
 *   // 세션 시작 시
 *   const threads = await fetchActiveThreads(supabase, userId);
 *   const forLeftBrain = threadsToLeftBrainFormat(threads);
 *
 *   // 좌뇌 input.personalProfile.ongoing_themes 에 전달
 */

export {
  fetchActiveThreads,
  threadsToLeftBrainFormat,
  createThread,
  updateThread,
  findSimilarThreads,
  markOldThreadsAsDormant,
} from './store';

export type {
  SessionThread,
  ThreadStatus,
  CreateThreadInput,
  UpdateThreadInput,
  ThreadsForLeftBrain,
} from './types';
