/**
 * 🧠 좌뇌 (Left Brain) — 외부 API
 *
 * 사용법:
 *   import { analyzeLeftBrain, LEFT_BRAIN_CONFIG } from '@/engines/left-brain';
 *
 *   const { analysis } = await analyzeLeftBrain({
 *     userUtterance: '...',
 *     sessionId: '...',
 *     turnIdx: 0,
 *     recentTrajectory: [],
 *     phase: 'HOOK',
 *     intimacyLevel: 1,
 *   });
 *
 *   if (analysis?.routing_decision.recommended === 'claude') {
 *     // Claude 호출
 *   } else {
 *     // Gemini 드래프트 그대로 사용
 *   }
 */

export { analyzeLeftBrain } from './orchestrator';
export {
  LEFT_BRAIN_CONFIG,
  logLeftBrainAnalysis,
  getRecentLogs,
  getLeftBrainStats,
  type LeftBrainLogEntry,
} from './config';

export {
  LEFT_BRAIN_SYSTEM_PROMPT,
  buildContextBlock,
} from './left-brain-prompt';

export {
  updateStateVector,
  calculateVelocity,
  analyzeTrajectory,
  syncIntimacyWithExternal,
  NEUTRAL_STATE,
  type TrajectoryPattern,
} from './state-vector';

export {
  SSR_TO_STRATEGY,
  inferGutReactionFromVAD,
  detectSSRConflict,
  ssrAlertWeight,
  type ResponseStrategy,
} from './somatic-marker';

export {
  deriveSignals,
  signalsToHints,
  signalsToAvoidances,
  countActiveSignals,
} from './derived-signals';

export {
  calculateRoutingScore,
  shouldAdjustThreshold,
  type ScoringInput,
  type RoutingFeedback,
} from './routing-scorer';

export type {
  StateVector,
  StateVelocity,
  GutReaction,
  SomaticMarker,
  ConversationalGoal,
  ToMPattern,
  SecondOrderToM,
  DerivedSignals,
  MemoryConnection,
  RouteTarget,
  RoutingDecision,
  LeftBrainAnalysis,
  LeftBrainInput,
  Episode,
  ConnectionType,
} from './types';
