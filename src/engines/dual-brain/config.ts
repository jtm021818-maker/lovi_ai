/**
 * 🎛️ 이중뇌 설정 + 로깅 (안전망 #3)
 *
 * 환경변수 기반 Feature Flag로 즉시 on/off 가능.
 * 초기 2주 모니터링 위한 상세 로깅 포함.
 */

import type { BrainOutput, RouteDecision } from './types';

// ============================================================
// Feature Flag (환경변수 기반)
// ============================================================
export const DUAL_BRAIN_CONFIG = {
  /** 마스터 스위치 — false면 기존 단일 모델 흐름 */
  enabled: process.env.DUAL_BRAIN_ENABLED !== 'false',

  /** 강제로 항상 Claude rephrase (비용 무시, 품질 최우선) */
  forceClaudeAlways: process.env.DUAL_BRAIN_FORCE_CLAUDE === 'true',

  /** 강제로 Gemini만 (비용 최우선, 테스트용) */
  forceGeminiOnly: process.env.DUAL_BRAIN_FORCE_GEMINI === 'true',

  /** 복잡도 임계값 — 이 이상이면 Claude 호출 (기본 3) */
  complexityThreshold: Number(process.env.DUAL_BRAIN_COMPLEXITY_THRESHOLD ?? 5),   // 🆕 v56: complexity 5 (최상) 만 Claude

  /** 확신도 임계값 — 이 미만이면 Claude 호출 (기본 0.7) */
  confidenceThreshold: Number(process.env.DUAL_BRAIN_CONFIDENCE_THRESHOLD ?? 0.7),

  /** 품질 게이트 활성화 */
  qualityGateEnabled: process.env.DUAL_BRAIN_QUALITY_GATE !== 'false',

  /** 상세 로깅 (모니터링 기간엔 true) */
  verboseLogging: process.env.DUAL_BRAIN_VERBOSE === 'true' || process.env.NODE_ENV !== 'production',

  /** Gemini 호출 타임아웃 (ms) */
  brainTimeoutMs: Number(process.env.DUAL_BRAIN_BRAIN_TIMEOUT_MS ?? 5000),

  /** Claude 호출 타임아웃 (ms) */
  voiceTimeoutMs: Number(process.env.DUAL_BRAIN_VOICE_TIMEOUT_MS ?? 15000),
} as const;

// ============================================================
// 로깅 — 모니터링 대시보드용 데이터 수집
// ============================================================

export interface DualBrainLogEntry {
  timestamp: string;
  sessionId: string;
  turnIdx: number;

  // 입력
  userInput: string;
  userInputLength: number;

  // Brain 결과
  brain: {
    latencyMs: number;
    success: boolean;
    perceived_emotion: string;
    actual_need: string;
    tone_to_use: string;
    complexity: number;
    confidence: number;
    ambiguity_signals: string[];
    error?: string;
  };

  // 라우팅 결정
  route: {
    path: 'gemini_only' | 'claude_rephrase';
    reason: string;
    stakes: string | null;
    finalComplexity: number;
  };

  // Voice (Claude) 결과
  voice?: {
    latencyMs: number;
    success: boolean;
    error?: string;
  };

  // 품질 게이트
  quality: {
    passed: boolean;
    issues: string[];
    fellBackToClaud: boolean;
  };

  // 비용 (USD)
  cost: {
    estimated: number;
    geminiTokensIn: number;
    geminiTokensOut: number;
    claudeTokensIn: number;
    claudeTokensOut: number;
  };

  // 최종 응답
  finalResponseLength: number;
  totalLatencyMs: number;
}

// 메모리 내 로그 버퍼 (DB 저장은 추후)
const _logBuffer: DualBrainLogEntry[] = [];
const LOG_BUFFER_LIMIT = 1000;

export function logDualBrainTurn(entry: DualBrainLogEntry): void {
  _logBuffer.push(entry);
  if (_logBuffer.length > LOG_BUFFER_LIMIT) {
    _logBuffer.shift();
  }

  if (DUAL_BRAIN_CONFIG.verboseLogging) {
    const icon = entry.route.path === 'gemini_only' ? '🧠' : '🧠➡️🗣️';
    const stakeFlag = entry.route.stakes ? ` [${entry.route.stakes}]` : '';
    console.log(
      `[DualBrain] ${icon}${stakeFlag} ` +
      `복잡도:${entry.route.finalComplexity}/5 ` +
      `확신:${entry.brain.confidence.toFixed(2)} ` +
      `Gemini:${entry.brain.latencyMs}ms ` +
      (entry.voice ? `Claude:${entry.voice.latencyMs}ms ` : '') +
      `비용:$${entry.cost.estimated.toFixed(5)} ` +
      `→ ${entry.finalResponseLength}자`
    );

    if (entry.quality.issues.length > 0) {
      console.warn(`[DualBrain] ⚠️ 품질 이슈:`, entry.quality.issues);
    }

    if (entry.brain.ambiguity_signals.length > 0) {
      console.log(`[DualBrain] 🤔 애매함 신호:`, entry.brain.ambiguity_signals);
    }
  }
}

/** 최근 N건 로그 조회 (대시보드 API용) */
export function getRecentLogs(limit = 100): DualBrainLogEntry[] {
  return _logBuffer.slice(-limit);
}

/** 집계 통계 (모니터링용) */
export function getAggregateStats(): {
  totalTurns: number;
  geminiOnlyRate: number;
  claudeRephraseRate: number;
  avgComplexity: number;
  avgConfidence: number;
  avgCostPerTurn: number;
  qualityPassRate: number;
  fallbackRate: number;
  stakesDistribution: Record<string, number>;
  avgGeminiLatency: number;
  avgClaudeLatency: number;
} {
  const total = _logBuffer.length;
  if (total === 0) {
    return {
      totalTurns: 0,
      geminiOnlyRate: 0,
      claudeRephraseRate: 0,
      avgComplexity: 0,
      avgConfidence: 0,
      avgCostPerTurn: 0,
      qualityPassRate: 0,
      fallbackRate: 0,
      stakesDistribution: {},
      avgGeminiLatency: 0,
      avgClaudeLatency: 0,
    };
  }

  const geminiOnlyCount = _logBuffer.filter(e => e.route.path === 'gemini_only').length;
  const claudeCount = _logBuffer.filter(e => e.route.path === 'claude_rephrase').length;
  const passedCount = _logBuffer.filter(e => e.quality.passed).length;
  const fallbackCount = _logBuffer.filter(e => e.quality.fellBackToClaud).length;

  const stakesDistribution: Record<string, number> = {};
  for (const e of _logBuffer) {
    const key = e.route.stakes || 'normal';
    stakesDistribution[key] = (stakesDistribution[key] || 0) + 1;
  }

  const claudeLogs = _logBuffer.filter(e => e.voice);

  return {
    totalTurns: total,
    geminiOnlyRate: geminiOnlyCount / total,
    claudeRephraseRate: claudeCount / total,
    avgComplexity:
      _logBuffer.reduce((s, e) => s + e.route.finalComplexity, 0) / total,
    avgConfidence:
      _logBuffer.reduce((s, e) => s + e.brain.confidence, 0) / total,
    avgCostPerTurn:
      _logBuffer.reduce((s, e) => s + e.cost.estimated, 0) / total,
    qualityPassRate: passedCount / total,
    fallbackRate: fallbackCount / total,
    stakesDistribution,
    avgGeminiLatency:
      _logBuffer.reduce((s, e) => s + e.brain.latencyMs, 0) / total,
    avgClaudeLatency: claudeLogs.length
      ? claudeLogs.reduce((s, e) => s + (e.voice?.latencyMs ?? 0), 0) / claudeLogs.length
      : 0,
  };
}

// ============================================================
// 비용 추정 (2026년 4월 기준 단가)
// ============================================================

const PRICING = {
  gemini_2_5_flash: {
    input: 0.30 / 1_000_000,         // $0.30 per 1M input
    output: 2.50 / 1_000_000,        // $2.50 per 1M output
    cachedInput: 0.075 / 1_000_000,  // 25% of input
  },
  claude_sonnet_4_6: {
    input: 3.00 / 1_000_000,
    output: 15.00 / 1_000_000,
    cachedInput: 0.30 / 1_000_000,   // 10% of input
  },
};

export function estimateCost(params: {
  geminiTokensIn: number;
  geminiTokensOut: number;
  claudeTokensIn?: number;
  claudeTokensOut?: number;
  geminiCacheHit?: boolean;
  claudeCacheHit?: boolean;
}): number {
  const g = PRICING.gemini_2_5_flash;
  const c = PRICING.claude_sonnet_4_6;

  let cost = 0;

  // Gemini 비용
  if (params.geminiCacheHit) {
    cost += params.geminiTokensIn * g.cachedInput;
  } else {
    cost += params.geminiTokensIn * g.input;
  }
  cost += params.geminiTokensOut * g.output;

  // Claude 비용 (호출됐을 때만)
  if (params.claudeTokensIn) {
    if (params.claudeCacheHit) {
      cost += params.claudeTokensIn * c.cachedInput;
    } else {
      cost += params.claudeTokensIn * c.input;
    }
  }
  if (params.claudeTokensOut) {
    cost += params.claudeTokensOut * c.output;
  }

  return cost;
}

// ============================================================
// 라우팅 결정 헬퍼 (orchestrator에서 사용)
// ============================================================

export function makeRouteDecision(params: {
  brainOutput: BrainOutput | null;
  stakesType: string | null;
}): RouteDecision {
  const cfg = DUAL_BRAIN_CONFIG;

  // 강제 모드
  if (cfg.forceClaudeAlways) {
    return {
      path: 'claude_rephrase',
      reason: 'forceClaudeAlways=true',
      stakes: params.stakesType as any,
      originalComplexity: params.brainOutput?.complexity ?? 0,
      finalComplexity: 5,
    };
  }
  if (cfg.forceGeminiOnly) {
    return {
      path: 'gemini_only',
      reason: 'forceGeminiOnly=true',
      stakes: params.stakesType as any,
      originalComplexity: params.brainOutput?.complexity ?? 0,
      finalComplexity: params.brainOutput?.complexity ?? 1,
    };
  }

  // Brain 실패 → 안전하게 Claude
  if (!params.brainOutput) {
    return {
      path: 'claude_rephrase',
      reason: 'brain_failed',
      stakes: params.stakesType as any,
      originalComplexity: 0,
      finalComplexity: 5,
    };
  }

  const original: number = params.brainOutput.complexity;
  let finalComplexity: number = original;
  const reasons: string[] = [];

  // 안전망 #2: 고위험 신호 → 복잡도 5 강제
  if (params.stakesType) {
    finalComplexity = 5;
    reasons.push(`high_stakes:${params.stakesType}`);
  }

  // 안전망 #2 변형: 확신도 낮음 → 복잡도 5 강제
  if (params.brainOutput.confidence < cfg.confidenceThreshold) {
    finalComplexity = Math.max(finalComplexity, 5);
    reasons.push(`low_confidence:${params.brainOutput.confidence.toFixed(2)}`);
  }

  // 애매함 신호 → 복잡도 5 강제
  if (params.brainOutput.ambiguity_signals.length > 0) {
    finalComplexity = Math.max(finalComplexity, 5);
    reasons.push(`ambiguity:${params.brainOutput.ambiguity_signals.length}signals`);
  }

  // 라우팅
  const path: 'gemini_only' | 'claude_rephrase' =
    finalComplexity >= cfg.complexityThreshold ? 'claude_rephrase' : 'gemini_only';

  return {
    path,
    reason: reasons.length > 0 ? reasons.join(',') : `complexity:${finalComplexity}`,
    stakes: params.stakesType as any,
    originalComplexity: original,
    finalComplexity,
  };
}
