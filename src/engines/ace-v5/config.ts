/**
 * 🎛️ ACE v5 Feature flag + 로깅
 */

import type { AceV5Output } from './types';

// ============================================================
// Feature Flag (환경변수 기반)
// ============================================================

export const ACE_V5_CONFIG = {
  /** 마스터 스위치 — false면 기존 dual-brain voice (단순 Claude rephrasing) 사용 */
  enabled: process.env.ACE_V5_ENABLED !== 'false',

  /** 양방향 피드백 (재요청) 허용 */
  allowReanalysis: process.env.ACE_V5_REANALYSIS !== 'false',

  /** 자기정정 표현 권장 */
  encourageSelfCorrection: process.env.ACE_V5_SELF_CORRECTION !== 'false',

  /** 메타 발화 자동 제거 */
  cleanMetaUtterances: process.env.ACE_V5_CLEAN_META !== 'false',

  /** 품질 게이트 활성화 */
  qualityGateEnabled: process.env.ACE_V5_QUALITY_GATE !== 'false',

  /** 응답 최대 토큰 (기본 600) */
  maxOutputTokens: Number(process.env.ACE_V5_MAX_TOKENS ?? 600),

  /** Claude 호출 타임아웃 */
  claudeTimeoutMs: Number(process.env.ACE_V5_TIMEOUT_MS ?? 20000),

  /** 재요청 시 좌뇌 thinking budget */
  reanalysisThinkingBudget: Number(process.env.ACE_V5_REANALYSIS_THINKING ?? 1024),

  /** 상세 로깅 */
  verboseLogging: process.env.ACE_V5_VERBOSE === 'true' || process.env.NODE_ENV !== 'production',
} as const;

// ============================================================
// 로깅
// ============================================================

export interface AceV5LogEntry {
  timestamp: string;
  sessionId: string;
  turnIdx: number;

  userInputLength: number;
  responseLength: number;

  /** 재요청 발생 여부 */
  reanalysisRequested: boolean;
  reanalysisReason?: string;

  /** 자기정정 감지 */
  selfCorrectionDetected: boolean;

  /** 비용/시간 */
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  estimatedCost: number;

  /** 4트랙 우세 (분석 결과) */
  dominantTrack?: 'A' | 'B' | 'C' | 'D';

  /** 품질 통과 여부 */
  qualityPassed: boolean;
  qualityIssues?: string[];
}

// 메모리 내 로그 버퍼
const _logBuffer: AceV5LogEntry[] = [];
const LOG_BUFFER_LIMIT = 500;

export function logAceV5Turn(entry: AceV5LogEntry): void {
  _logBuffer.push(entry);
  if (_logBuffer.length > LOG_BUFFER_LIMIT) {
    _logBuffer.shift();
  }

  if (ACE_V5_CONFIG.verboseLogging) {
    const reanalysisFlag = entry.reanalysisRequested ? ' ↩️재요청' : '';
    const correctionFlag = entry.selfCorrectionDetected ? ' ✏️정정' : '';
    const trackFlag = entry.dominantTrack ? ` [트랙${entry.dominantTrack}]` : '';

    console.log(
      `[ACEv5] 🎭${trackFlag}${reanalysisFlag}${correctionFlag} ` +
      `${entry.latencyMs}ms ${entry.responseLength}자 ` +
      `$${entry.estimatedCost.toFixed(5)} ` +
      (entry.reanalysisReason ? `(이유: ${entry.reanalysisReason})` : '')
    );

    if (entry.qualityIssues && entry.qualityIssues.length > 0) {
      console.warn(`[ACEv5] ⚠️ 품질 이슈: ${entry.qualityIssues.join(', ')}`);
    }
  }
}

/** AceV5Output → 로그 엔트리 변환 헬퍼 */
export function outputToLogEntry(
  sessionId: string,
  turnIdx: number,
  userInputLength: number,
  output: AceV5Output,
  qualityPassed: boolean,
  qualityIssues?: string[],
): AceV5LogEntry {
  return {
    timestamp: new Date().toISOString(),
    sessionId,
    turnIdx,
    userInputLength,
    responseLength: output.fullText.length,
    reanalysisRequested: output.reanalysisRequested,
    reanalysisReason: output.reanalysisReason,
    selfCorrectionDetected: output.meta.selfCorrectionDetected,
    latencyMs: output.meta.latencyMs,
    tokensIn: output.meta.tokensIn,
    tokensOut: output.meta.tokensOut,
    estimatedCost: output.meta.estimatedCost,
    qualityPassed,
    qualityIssues,
  };
}

// ============================================================
// 통계 조회
// ============================================================

export function getRecentAceLogs(limit = 100): AceV5LogEntry[] {
  return _logBuffer.slice(-limit);
}

export function getAceV5Stats() {
  const total = _logBuffer.length;
  if (total === 0) return null;

  const reanalyses = _logBuffer.filter(e => e.reanalysisRequested).length;
  const corrections = _logBuffer.filter(e => e.selfCorrectionDetected).length;
  const qualityFails = _logBuffer.filter(e => !e.qualityPassed).length;

  return {
    totalTurns: total,
    reanalysisRate: reanalyses / total,
    selfCorrectionRate: corrections / total,
    qualityFailRate: qualityFails / total,
    avgLatency: _logBuffer.reduce((s, e) => s + e.latencyMs, 0) / total,
    avgCostPerTurn: _logBuffer.reduce((s, e) => s + e.estimatedCost, 0) / total,
    avgResponseLength: _logBuffer.reduce((s, e) => s + e.responseLength, 0) / total,
  };
}

// ============================================================
// 헬스 체크
// ============================================================

/**
 * ACE v5 동작 상태 점검 (대시보드/모니터링용)
 */
export function getAceV5HealthStatus(): {
  status: 'healthy' | 'degraded' | 'critical';
  issues: string[];
} {
  const stats = getAceV5Stats();
  const issues: string[] = [];

  if (!stats) return { status: 'healthy', issues: [] };

  // 재요청율 너무 높음 (>15%) → 좌뇌 분석 품질 문제
  if (stats.reanalysisRate > 0.15) {
    issues.push(`재요청 ${(stats.reanalysisRate * 100).toFixed(1)}% (목표 <10%)`);
  }

  // 정정 너무 잦음 (>30%) → Claude가 과도하게 정정
  if (stats.selfCorrectionRate > 0.3) {
    issues.push(`자기정정 ${(stats.selfCorrectionRate * 100).toFixed(1)}% (목표 <20%)`);
  }

  // 품질 실패율 (>5%) → 응답 품질 저하
  if (stats.qualityFailRate > 0.05) {
    issues.push(`품질실패 ${(stats.qualityFailRate * 100).toFixed(1)}%`);
  }

  // 평균 비용 (>$0.015) → 비용 폭증
  if (stats.avgCostPerTurn > 0.015) {
    issues.push(`평균 비용 $${stats.avgCostPerTurn.toFixed(4)}/턴 (목표 <$0.01)`);
  }

  let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if (issues.length >= 3) status = 'critical';
  else if (issues.length >= 1) status = 'degraded';

  return { status, issues };
}
