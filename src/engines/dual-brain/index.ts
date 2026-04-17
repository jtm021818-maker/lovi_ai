/**
 * 이중뇌 아키텍처 외부 API
 *
 * 사용법 (pipeline/index.ts에서):
 *   import { executeDualBrain, DUAL_BRAIN_CONFIG } from '@/engines/dual-brain';
 *
 *   if (DUAL_BRAIN_CONFIG.enabled) {
 *     for await (const chunk of executeDualBrain({...})) {
 *       if (chunk.type === 'text') yield { type: 'text', data: chunk.data };
 *     }
 *   }
 */

export {
  executeDualBrain,
  streamClaudeVoice,
  assembleWithTags,
  type DualBrainStreamYield,
  type DualBrainInput,
} from './orchestrator';

export {
  DUAL_BRAIN_CONFIG,
  logDualBrainTurn,
  getRecentLogs,
  getAggregateStats,
  estimateCost,
  makeRouteDecision,
  type DualBrainLogEntry,
} from './config';

export {
  detectHighStakes,
  getStakeHint,
  type HighStakesType,
  type HighStakesResult,
} from './high-stakes-detector';

export {
  validateResponse,
  compareResponseSimilarity,
} from './quality-gate';

export type {
  BrainOutput,
  RouteDecision,
  VoiceInput,
  AssembledResponse,
  QualityCheckResult,
} from './types';
