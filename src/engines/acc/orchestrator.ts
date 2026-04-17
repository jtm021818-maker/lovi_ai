/**
 * 🎼 ACC 오케스트레이터
 *
 * 매 턴 호출되는 메인 진입점:
 *   1. statement 추출 (Gemini Flash Lite)
 *   2. 같은 subject 의 과거 statement 와 모순 감지
 *   3. 추출된 statement 저장 (fire-and-forget)
 *   4. AccAnalysisResult 반환 (좌뇌 핸드오프에 추가)
 */

import { extractStatements } from './statement-extractor';
import { detectConflicts } from './conflict-detector';
import { saveStatements } from './statement-store';
import { ACC_CONFIG } from './config';
import type {
  AccAnalysisResult,
  ExtractionInput,
  DetectedConflict,
  Statement,
} from './types';

interface SupabaseLike {
  from(table: string): any;
}

export interface AccAnalyzeParams extends ExtractionInput {
  supabase: SupabaseLike;
}

// ============================================================
// 메인 분석
// ============================================================

export async function analyzeAcc(params: AccAnalyzeParams): Promise<AccAnalysisResult> {
  if (!ACC_CONFIG.enabled) {
    return emptyResult();
  }

  // Step 1: statement 추출
  const extractStart = Date.now();
  const extracted = ACC_CONFIG.extractStatements
    ? await extractStatements({
        user_id: params.user_id,
        session_id: params.session_id,
        user_utterance: params.user_utterance,
        context: params.context,
      })
    : { statements: [], latencyMs: 0 };

  const extractionLatencyMs = Date.now() - extractStart;

  if (extracted.statements.length === 0) {
    return {
      extracted_statements: [],
      detected_conflicts: [],
      meta: {
        extraction_latency_ms: extractionLatencyMs,
        conflict_check_latency_ms: 0,
        statements_compared: 0,
      },
    };
  }

  // Step 2: 각 statement 별 모순 감지 (병렬)
  const conflictStart = Date.now();
  let detectedConflicts: DetectedConflict[] = [];
  let statementsCompared = 0;

  if (ACC_CONFIG.detectConflicts) {
    const conflictPromises = extracted.statements.map(async stmt => {
      const conflicts = await detectConflicts(params.supabase, stmt, {
        lookback_days: ACC_CONFIG.defaultLookbackDays,
        max_previous: ACC_CONFIG.maxComparisons,
        same_subject_only: true,
      });
      statementsCompared += 1;
      return conflicts;
    });

    const allConflicts = await Promise.all(conflictPromises);
    detectedConflicts = allConflicts.flat();

    // 가장 심각한 1-2개만
    detectedConflicts.sort((a, b) => b.severity - a.severity);
    detectedConflicts = detectedConflicts.slice(0, 2);
  }

  const conflictLatencyMs = Date.now() - conflictStart;

  // Step 3: 저장 (fire-and-forget)
  if (ACC_CONFIG.saveStatements) {
    saveStatements(params.supabase, extracted.statements).then(result => {
      if (!result.success && ACC_CONFIG.verboseLogging) {
        console.warn(`[ACC] ⚠️ statement 저장 실패:`, result.error);
      }
    });
  }

  // 우뇌에 전달할 가이드 생성
  const conflictHint = buildConflictHint(detectedConflicts);

  if (ACC_CONFIG.verboseLogging) {
    console.log(`\n================ [⚡ 전대상피질 (ACC) 모순 검증] ================`);
    console.log(
      `[📝 추출 됨]: ${extracted.statements.length}개 (${extractionLatencyMs}ms) | ` +
      `[⚠️ 모순 발견]: ${detectedConflicts.length}개 (${conflictLatencyMs}ms)`,
    );
    if (detectedConflicts.length > 0) {
      for (const c of detectedConflicts) {
        console.log(`[⚠️ 모순 내용]: ${c.description} (severity ${c.severity.toFixed(2)})`);
      }
    }
    console.log(`=========================================================\n`);
  }

  return {
    extracted_statements: extracted.statements,
    detected_conflicts: detectedConflicts,
    conflict_hint: conflictHint,
    meta: {
      extraction_latency_ms: extractionLatencyMs,
      conflict_check_latency_ms: conflictLatencyMs,
      statements_compared: statementsCompared,
    },
  };
}

// ============================================================
// 우뇌 가이드 생성
// ============================================================

function buildConflictHint(conflicts: DetectedConflict[]): string | undefined {
  if (conflicts.length === 0) return undefined;

  const lines: string[] = ['### ⚠️ 과거 발화와 모순 감지'];

  for (const c of conflicts) {
    lines.push('');
    lines.push(`- **변화**: ${c.description}`);
    lines.push(`- **루나가 자연스럽게 짚을 수 있는 한마디**:`);
    lines.push(`  "${c.natural_callout_hint}"`);
    lines.push(`- **주의**: 비난 X, 호기심 + 따뜻함으로. 또는 그냥 인지만 하고 안 짚어도 OK.`);
  }

  return lines.join('\n');
}

// ============================================================
// 빈 결과
// ============================================================

function emptyResult(): AccAnalysisResult {
  return {
    extracted_statements: [],
    detected_conflicts: [],
    meta: {
      extraction_latency_ms: 0,
      conflict_check_latency_ms: 0,
      statements_compared: 0,
    },
  };
}

// ============================================================
// 헬퍼: 좌뇌 컨텍스트에 추가할 statement 요약
// ============================================================

export function summarizeStatementsForLeftBrain(statements: Statement[]): string {
  if (statements.length === 0) return '';

  const lines: string[] = ['### 추출된 statement (이번 발화)'];
  for (const s of statements) {
    lines.push(`- [${s.type}/${s.subject}] ${s.content}`);
  }
  return lines.join('\n');
}
