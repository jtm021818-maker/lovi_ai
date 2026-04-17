/**
 * 🎭 ACE v5 — 외부 API
 *
 * 사용법:
 *   import { executeAceV5, ACE_V5_CONFIG } from '@/engines/ace-v5';
 *
 *   for await (const chunk of executeAceV5({
 *     userUtterance: '...',
 *     sessionId: '...',
 *     turnIdx: 0,
 *     leftBrain: leftBrainAnalysis,
 *     handoff: ...,            // buildHandoff() 호출 결과
 *     intimacyLevel: 1,
 *     phase: 'HOOK',
 *   })) {
 *     if (chunk.type === 'text') yield { type: 'text', data: chunk.data };
 *   }
 */

export { executeAceV5, type AceV5StreamYield } from './orchestrator';

export {
  ACE_V5_CONFIG,
  logAceV5Turn,
  outputToLogEntry,
  getRecentAceLogs,
  getAceV5Stats,
  getAceV5HealthStatus,
  type AceV5LogEntry,
} from './config';

export {
  buildHandoff,
  formatHandoffForPrompt,
  detectSituation,
  type SituationType,
} from './handoff-builder';

export {
  ACE_V5_SYSTEM_PROMPT,
  buildAceV5UserMessage,
} from './ace-system-prompt';

export {
  TONE_LIBRARY,
  buildToneLibraryText,
  getTonesForCategory,
  mapLeftBrainToneToCategory,
} from './tone-library';

export {
  detectReanalysisRequest,
  detectLeftBrainHints,         // 🆕 v57
  detectSelfCorrection,
  cleanResponseText,
  validateAceResponse,
  appendTagsToResponse,
  type ReanalysisRequest,
  type LeftBrainHints,          // 🆕 v57
  type SelfCorrectionInfo,
  type CleanedResponse,
  type ValidationResult,
} from './reanalysis-handler';

export type {
  AceV5Input,
  AceV5Output,
  LeftToRightHandoff,
  TrackWeight,
  ToneCategory,
  ToneExample,
  CandidateAnalysis,
} from './types';

export { TRACK_WEIGHTS_BY_SITUATION, SELF_CORRECTION_MARKERS } from './types';
