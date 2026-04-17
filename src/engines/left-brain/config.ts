/**
 * 🎛️ 좌뇌 설정 + 로깅
 */

import type { LeftBrainAnalysis } from './types';

export const LEFT_BRAIN_CONFIG = {
  /** 마스터 스위치. false면 기존 dual-brain 단순 버전 사용 */
  enabled: process.env.LEFT_BRAIN_ENABLED !== 'false',

  /** 각 기능 개별 토글 */
  useSomaticMarker: process.env.LB_SSR !== 'false',
  useSecondOrderTom: process.env.LB_TOM !== 'false',
  useDerivedSignals: process.env.LB_SIGNALS !== 'false',
  useEpisodeMemory: process.env.LB_MEMORY === 'true',  // 기본 off (DB 준비 필요)

  /** Gemini 자기 판단 vs 계산 라우팅 — 어느 쪽 우선? */
  preferComputedRouting: process.env.LB_COMPUTED_ROUTING !== 'false',

  /** 임계값 */
  claudeRoutingThreshold: Number(process.env.LB_CLAUDE_THRESHOLD ?? 13),   // 🆕 v56: 90%Gemini/10%Claude 정책
  confidenceThreshold: Number(process.env.LB_CONFIDENCE_THRESHOLD ?? 0.7),

  /** 타임아웃 */
  analysisTimeoutMs: Number(process.env.LB_TIMEOUT_MS ?? 6000),

  /** 로깅 */
  verboseLogging: process.env.LB_VERBOSE === 'true' || process.env.NODE_ENV !== 'production',
  sampleRate: Number(process.env.LB_SAMPLE_RATE ?? 1.0),
} as const;

// ============================================================
// 로깅
// ============================================================

export interface LeftBrainLogEntry {
  timestamp: string;
  sessionId: string;
  turnIdx: number;

  userInput: string;
  userInputLength: number;

  // 분석 결과 (성공 시)
  analysis?: {
    state_vector: LeftBrainAnalysis['state_vector'];
    somatic: string;
    complexity: number;
    confidence: number;
    active_signals: string[];
    routing: {
      recommended: string;
      score: number;
      reason: string;
    };
  };

  // 실패 시
  error?: string;

  latencyMs: number;
}

const _logBuffer: LeftBrainLogEntry[] = [];
const LOG_BUFFER_LIMIT = 500;

export function logLeftBrainAnalysis(entry: LeftBrainLogEntry): void {
  _logBuffer.push(entry);
  if (_logBuffer.length > LOG_BUFFER_LIMIT) {
    _logBuffer.shift();
  }

  if (LEFT_BRAIN_CONFIG.verboseLogging) {
    if (entry.analysis) {
      const a = entry.analysis;
      console.log(
        `[LeftBrain] 🧠 ${entry.latencyMs}ms ` +
        `V=${a.state_vector.V.toFixed(2)} A=${a.state_vector.A.toFixed(2)} D=${a.state_vector.D.toFixed(2)} ` +
        `U=${a.state_vector.U.toFixed(2)} M=${a.state_vector.M.toFixed(2)} ` +
        `| SSR=${a.somatic} | 복잡도=${a.complexity}/5 confidence=${a.confidence.toFixed(2)} ` +
        `| 라우팅=${a.routing.recommended} (${a.routing.score.toFixed(1)}): ${a.routing.reason}`
      );

      if (a.active_signals.length > 0) {
        console.log(`[LeftBrain] ⚡ 활성 신호: ${a.active_signals.join(', ')}`);
      }
    } else if (entry.error) {
      console.warn(`[LeftBrain] ❌ ${entry.error} (${entry.latencyMs}ms)`);
    }
  }
}

export function getRecentLogs(limit = 100): LeftBrainLogEntry[] {
  return _logBuffer.slice(-limit);
}

export function getLeftBrainStats() {
  const total = _logBuffer.length;
  if (total === 0) return null;

  const successful = _logBuffer.filter(e => e.analysis);
  const claudeRoutes = successful.filter(e => e.analysis!.routing.recommended === 'claude').length;

  const avgState = successful.reduce(
    (acc, e) => {
      const v = e.analysis!.state_vector;
      return {
        V: acc.V + v.V, A: acc.A + v.A, D: acc.D + v.D,
        I: acc.I + v.I, T: acc.T + v.T, U: acc.U + v.U, M: acc.M + v.M,
      };
    },
    { V: 0, A: 0, D: 0, I: 0, T: 0, U: 0, M: 0 }
  );

  const n = successful.length || 1;

  return {
    totalTurns: total,
    successRate: successful.length / total,
    claudeRate: claudeRoutes / successful.length,
    avgConfidence: successful.reduce((s, e) => s + e.analysis!.confidence, 0) / n,
    avgLatency: _logBuffer.reduce((s, e) => s + e.latencyMs, 0) / total,
    avgState: {
      V: avgState.V / n, A: avgState.A / n, D: avgState.D / n,
      I: avgState.I / n, T: avgState.T / n, U: avgState.U / n, M: avgState.M / n,
    },
  };
}
