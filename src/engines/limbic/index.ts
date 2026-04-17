/**
 * 🫀 변연계 (Limbic System) 외부 API
 *
 * 사용:
 *   import { onSessionStart, onTurn, onSessionEnd, formatLimbicForPrompt } from '@/engines/limbic';
 */

export {
  onSessionStart,
  onTurn,
  onTurnWithLlmJudgment,         // 🆕 v56
  applyAccSignalsToLimbic,        // 🆕 v57: ACC ↔ Limbic 직접 연결
  onSessionEnd,
  getLimbicHandoff,
  type SessionStartParams,
  type SessionStartResult,
  type OnTurnParams,
  type OnTurnResult,
  type OnTurnWithLlmParams,       // 🆕 v56
  type AccSignalsForLimbic,       // 🆕 v57
  type SessionEndParams,
  type SessionEndResult,
} from './orchestrator';

export {
  buildLimbicHandoff,
  formatLimbicForPrompt,
} from './handoff-injector';

export {
  loadAndDecayLimbicState,
  saveLimbicState,
  getCachedLimbicState,
  updateLimbicCache,
  invalidateLimbicCache,
} from './state-loader';

export {
  decayLimbicState,
  addEmotion,
  applyHormoneChanges,
  updateBaselineMood,
  updateBaselineHistory,        // 🆕 v58
  createInitialLimbicState,
} from './emotion-decay';

export {
  TRIGGER_EFFECTS,
  inferTriggersFromSignals,
  triggerToActiveEmotion,
  applyTriggersToState,
  inferSessionStartTriggers,
  inferSessionEndTriggers,
} from './trigger-mapper';

export { LIMBIC_CONFIG } from './config';

// 🆕 v57: 위기 후 여운
export {
  recordCrisisResidue,
  fetchUnresolvedCrisisResidue,
  injectCrisisResidueToLimbic,
  markCrisisResolved,
} from './crisis-residue';

export type {
  EmotionType,
  ActiveEmotion,
  LimbicState,
  LimbicTrigger,
  TriggerEffect,
  LimbicHandoff,
  SignalToTriggerInput,
} from './types';
