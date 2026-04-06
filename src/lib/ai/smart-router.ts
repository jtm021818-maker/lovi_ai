/**
 * 스마트 라우터 — 태스크×전략별 프로바이더 캐스케이드 체인 결정
 *
 * [v24 원칙 — 무료 100명/일 설계]
 * 1. 매 턴 대화: Qwen3-32B → Cerebras 70B (한도 큰 모델)
 * 2. 이벤트(거울/패턴): Gemini 2.5 Flash-Lite (Stable, 무료 한도 최대)
 * 3. 위기/감정거울: Gemini 2.5 Flash-Lite
 * 4. 상태분석/검증: 8B 모델 (15,000+/일)
 * 5. Gemini는 임팩트 큰 순간에만 집중 사용
 */

import type { Provider, ModelTier } from './provider-registry';
import { GROQ_EXTRA_MODELS } from './provider-registry';
import type { StrategyType, RiskLevel } from '@/types/engine.types';

/** 캐스케이드 체인 아이템 */
export interface CascadeItem {
  provider: Provider;
  tier: ModelTier;
  modelOverride?: string;
}

/** 태스크 종류 */
export type TaskType =
  | 'state_analysis'     // 상태 분석 (JSON)
  | 'main_response'      // 메인 상담 응답 (매 턴)
  | 'event_generation'   // 이벤트 생성 — 감정거울, 패턴분석 등 (Gemini 전용)
  | 'session_summary'    // 세션 요약
  | 'response_validation'; // 응답 검증

/**
 * 태스크 + 전략 + 위기수준에 따라 최적 프로바이더 캐스케이드 반환
 */
export function getProviderCascade(
  task: TaskType,
  strategy?: StrategyType,
  riskLevel?: RiskLevel
): CascadeItem[] {
  switch (task) {
    // ──────────────────────────────────────────
    // 상태 분석: 8B 모델 (JSON 구조화, 15,000+/일)
    // ──────────────────────────────────────────
    case 'state_analysis':
      return [
        { provider: 'cerebras', tier: 'haiku' },    // 1순위: Cerebras 8B (1M 토큰/일)
        { provider: 'groq', tier: 'haiku' },         // 2순위: Groq 8B (14,400 RPD)
        { provider: 'gemini', tier: 'haiku' },       // 3순위: Gemini 2.5 Flash-Lite
      ];

    // ──────────────────────────────────────────
    // 메인 응답: Qwen3 → Cerebras 70B (매 턴, 4,000+/일)
    // ──────────────────────────────────────────
    case 'main_response':
      return getMainResponseCascade(strategy, riskLevel);

    // ──────────────────────────────────────────
    // 이벤트 생성: Gemini 전용 (감정거울, 패턴분석 등)
    // 하루 350회를 임팩트 순간에 집중 사용
    // ──────────────────────────────────────────
    case 'event_generation':
      return getEventCascade(riskLevel);

    // ──────────────────────────────────────────
    // 세션 요약: 8B 모델 (짧은 출력)
    // ──────────────────────────────────────────
    case 'session_summary':
      return [
        { provider: 'cerebras', tier: 'haiku' },    // 1순위: Cerebras 8B (초고속)
        { provider: 'groq', tier: 'haiku' },         // 2순위: Groq 8B
        { provider: 'gemini', tier: 'haiku' },       // 3순위: Gemini 2.5 Flash-Lite
      ];

    // ──────────────────────────────────────────
    // 응답 검증: 8B 모델 (~50ms)
    // ──────────────────────────────────────────
    case 'response_validation':
      return [
        { provider: 'cerebras', tier: 'haiku' },    // 1순위: Cerebras 8B
        { provider: 'groq', tier: 'haiku' },         // 2순위: Groq 8B
      ];

    default:
      return [
        { provider: 'groq', tier: 'haiku', modelOverride: GROQ_EXTRA_MODELS.qwen3 },
        { provider: 'cerebras', tier: 'sonnet' },
      ];
  }
}

/**
 * 메인 응답 캐스케이드 — v22
 * 모든 전략에서 Qwen3 → Cerebras 70B 사용 (매 턴, 4,000+/일)
 * 위기만 Gemini 2.5 Flash-Lite 사용 (Stable, 무료 한도 최대)
 */
function getMainResponseCascade(
  strategy?: StrategyType,
  riskLevel?: RiskLevel
): CascadeItem[] {
  // ① CRITICAL 위기 → Gemini 2.5 Flash-Lite (감정 깊이 필요)
  if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH' || strategy === 'CRISIS_SUPPORT') {
    return [
      { provider: 'gemini', tier: 'sonnet' },         // Gemini 2.5 Flash-Lite (Stable)
      { provider: 'groq', tier: 'haiku', modelOverride: GROQ_EXTRA_MODELS.qwen3 }, // Qwen3 폴백
      { provider: 'cerebras', tier: 'sonnet' },        // Cerebras 70B 최후 폴백
    ];
  }

  // ② 모든 일반 전략 → Qwen3 → Cerebras 70B
  // CBT/ACT/MI/SUPPORT/CALMING 모두 동일 체인
  return [
    { provider: 'groq', tier: 'haiku', modelOverride: GROQ_EXTRA_MODELS.qwen3 }, // Qwen3-32B (3,000 RPD)
    { provider: 'cerebras', tier: 'sonnet' },          // Cerebras 70B (1M 토큰/일)
    { provider: 'gemini', tier: 'haiku' },              // Gemini 2.5 Flash-Lite (Stable, 최후 폴백)
  ];
}

/**
 * 이벤트 생성 캐스케이드 — v24
 * Gemini 2.5 Flash-Lite (Stable, 무료 한도 최대)
 * 감정거울, 패턴분석, 성장리포트 등 임팩트 순간
 */
function getEventCascade(
  riskLevel?: RiskLevel
): CascadeItem[] {
  // 위기 상황의 이벤트 → Gemini 2.5 Flash-Lite
  if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
    return [
      { provider: 'gemini', tier: 'sonnet' },         // Gemini 2.5 Flash-Lite (Stable)
      { provider: 'groq', tier: 'haiku', modelOverride: GROQ_EXTRA_MODELS.qwen3 }, // Qwen3 폴백
    ];
  }

  // 일반 이벤트 → Gemini 2.5 Flash-Lite
  return [
    { provider: 'gemini', tier: 'sonnet' },            // Gemini 2.5 Flash-Lite (Stable, 이벤트 전용)
    { provider: 'groq', tier: 'haiku', modelOverride: GROQ_EXTRA_MODELS.qwen3 }, // Qwen3 폴백
    { provider: 'cerebras', tier: 'sonnet' },          // Cerebras 70B 최후 폴백
  ];
}

/** 태스크별 최대 토큰 */
export function getMaxTokensForTask(
  task: TaskType,
  strategy?: StrategyType
): number {
  switch (task) {
    case 'state_analysis':
      return 512;
    case 'session_summary':
      return 256;
    case 'response_validation':
      return 64;
    case 'event_generation':
      return 1024;   // 이벤트(감정거울, 패턴분석 등)는 충분한 토큰 필요
    case 'main_response':
      if (strategy === 'CBT' || strategy === 'ACT' || strategy === 'MI') return 1024;
      if (strategy === 'CRISIS_SUPPORT') return 512;
      return 768;
    default:
      return 768;
  }
}
