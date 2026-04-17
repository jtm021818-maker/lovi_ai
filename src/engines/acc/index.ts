/**
 * 🧠 ACC (Anterior Cingulate Cortex) — 외부 API
 *
 * 사용:
 *   import { analyzeAcc, ACC_CONFIG } from '@/engines/acc';
 *
 *   const result = await analyzeAcc({
 *     supabase, user_id, session_id, user_utterance, context
 *   });
 *
 *   if (result.conflict_hint) {
 *     // 좌뇌 핸드오프에 추가
 *   }
 */

export {
  analyzeAcc,
  summarizeStatementsForLeftBrain,
  type AccAnalyzeParams,
} from './orchestrator';

export {
  extractStatements,
} from './statement-extractor';

export {
  detectConflicts,
} from './conflict-detector';

export {
  saveStatements,
  fetchStatementsBySubject,
  fetchRecentStatements,
  markSuperseded,
  archiveOldStatements,
} from './statement-store';

export { ACC_CONFIG } from './config';

export type {
  Statement,
  StatementType,
  ConflictType,
  DetectedConflict,
  AccAnalysisResult,
  ExtractionInput,
  ConflictDetectionOptions,
} from './types';
