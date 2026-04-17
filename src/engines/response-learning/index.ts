/**
 * 🧪 Response Learning — 외부 API
 *
 * 사용:
 *   // 매 턴 끝나면 응답 기록
 *   const { entry_id } = await recordResponseFeedback(supabase, {
 *     user_id, session_id, turn_idx,
 *     luna_response_summary: '...',
 *     luna_strategy: 'empathy',
 *   });
 *
 *   // 다음 턴 시작 시 직전 응답 효과 평가
 *   const engagement = deriveEngagement(prevLen, curLen, prevV, curV);
 *   await updateFeedbackEffectiveness(supabase, entry_id, valenceShift, engagement);
 *
 *   // 좌뇌 컨텍스트 주입 시
 *   const learned = await getLearnedStrategies(supabase, userId);
 *   // → personalProfile.effective_strategies / avoid_approaches 에 병합
 */

export {
  recordResponseFeedback,
  updateFeedbackEffectiveness,
  getLearnedStrategies,
  deriveEngagement,
} from './store';

export type {
  ResponseFeedbackEntry,
  LunaStrategy,
  EngagementShift,
  LearnedStrategies,
} from './types';
