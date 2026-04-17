/**
 * 🎛️ KBE 설정
 */

export const KBE_CONFIG = {
  /** 마스터 스위치 */
  enabled: process.env.KBE_ENABLED !== 'false',

  /** 지연 전체 배율 (0.5 = 절반, 2 = 두 배). 빠른 테스트에 0.3 권장 */
  delay_multiplier: Number(process.env.KBE_DELAY_MULTIPLIER ?? 1),

  /** 침묵 기능 활성 */
  allow_silence: process.env.KBE_ALLOW_SILENCE !== 'false',

  /** 이벤트 자동 트리거 활성 */
  allow_event_triggers: process.env.KBE_ALLOW_EVENTS !== 'false',

  /** 스티커 활성 */
  allow_stickers: process.env.KBE_ALLOW_STICKERS !== 'false',

  /** 세션당 스티커 최대 (가드레일) */
  max_stickers_per_session: Number(process.env.KBE_MAX_STICKERS ?? 2),

  /** 타이핑 인디케이터 활성 */
  show_typing_indicator: process.env.KBE_TYPING_INDICATOR !== 'false',

  /** 상세 로깅 */
  verbose_logging: process.env.KBE_VERBOSE === 'true' || process.env.NODE_ENV !== 'production',
} as const;

// ============================================================
// 로깅
// ============================================================

import type { KakaoActionPlan } from './types';

export interface KbeLogEntry {
  timestamp: string;
  session_id?: string;
  turn_idx: number;
  mood_label: string;
  bursts_count: number;
  has_sticker: boolean;
  has_event: boolean;
  is_silent: boolean;
  total_delay_ms: number;
  llm_latency_ms: number;
  used_fallback: boolean;
  reasoning: string;
}

const _logBuffer: KbeLogEntry[] = [];
const LOG_BUFFER_LIMIT = 500;

export function logKbeTurn(entry: KbeLogEntry): void {
  _logBuffer.push(entry);
  if (_logBuffer.length > LOG_BUFFER_LIMIT) _logBuffer.shift();

  if (KBE_CONFIG.verbose_logging) {
    const flags: string[] = [entry.mood_label];
    if (entry.is_silent) flags.push('🤫침묵');
    if (entry.has_sticker) flags.push('🎨스티커');
    if (entry.has_event) flags.push('🎬이벤트');
    if (entry.used_fallback) flags.push('⚠️fallback');

    console.log(
      `[KBE] ${flags.join(' ')} | bursts ${entry.bursts_count}개 | ` +
      `총 ${entry.total_delay_ms}ms | LLM ${entry.llm_latency_ms}ms | ` +
      `"${entry.reasoning.slice(0, 60)}"`,
    );
  }
}

export function planToLogEntry(
  session_id: string | undefined,
  turn_idx: number,
  plan: KakaoActionPlan,
  llm_latency_ms: number,
  used_fallback: boolean,
  total_delay_ms: number,
): KbeLogEntry {
  return {
    timestamp: new Date().toISOString(),
    session_id,
    turn_idx,
    mood_label: plan.mood_label,
    bursts_count: plan.bursts.length,
    has_sticker: plan.sticker !== null,
    has_event: plan.event !== null,
    is_silent: plan.silence,
    total_delay_ms,
    llm_latency_ms,
    used_fallback,
    reasoning: plan.reasoning,
  };
}

export function getKbeStats() {
  const total = _logBuffer.length;
  if (total === 0) return null;

  const silent = _logBuffer.filter(e => e.is_silent).length;
  const withSticker = _logBuffer.filter(e => e.has_sticker).length;
  const withEvent = _logBuffer.filter(e => e.has_event).length;
  const fallback = _logBuffer.filter(e => e.used_fallback).length;

  const moodCounts: Record<string, number> = {};
  for (const e of _logBuffer) {
    moodCounts[e.mood_label] = (moodCounts[e.mood_label] || 0) + 1;
  }

  return {
    total_turns: total,
    silence_rate: silent / total,
    sticker_rate: withSticker / total,
    event_rate: withEvent / total,
    fallback_rate: fallback / total,
    avg_bursts: _logBuffer.reduce((s, e) => s + e.bursts_count, 0) / total,
    avg_total_delay_ms: _logBuffer.reduce((s, e) => s + e.total_delay_ms, 0) / total,
    avg_llm_latency_ms: _logBuffer.reduce((s, e) => s + e.llm_latency_ms, 0) / total,
    mood_distribution: moodCounts,
  };
}
