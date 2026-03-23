/**
 * 스마트 라우터 — 태스크×전략별 프로바이더 캐스케이드 체인 결정
 *
 * [원칙]
 * 1. 300원 일에 30,000원 모델 쓰지 마라
 * 2. 위기엔 최고 모델, 일상엔 가벼운 모델
 * 3. Gemini는 절약하고 Groq/Cerebras로 분산
 * 4. 프롬프트 캐싱은 Groq/Cerebras에서 자동 작동
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
  | 'main_response'      // 메인 상담 응답
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
    // 상태 분석: 소형 모델 우선 (JSON 구조화)
    // ──────────────────────────────────────────
    case 'state_analysis':
      return [
        { provider: 'groq', tier: 'haiku' },       // 1순위: Groq 8B (14,400 RPD)
        { provider: 'cerebras', tier: 'haiku' },    // 2순위: Cerebras 8B (16bit)
        { provider: 'gemini', tier: 'haiku' },      // 3순위: Gemini Lite
      ];

    // ──────────────────────────────────────────
    // 메인 응답: 전략 + 위기수준별 분기
    // ──────────────────────────────────────────
    case 'main_response':
      return getMainResponseCascade(strategy, riskLevel);

    // ──────────────────────────────────────────
    // 세션 요약: 소형 모델 (짧은 출력)
    // ──────────────────────────────────────────
    case 'session_summary':
      return [
        { provider: 'cerebras', tier: 'haiku' },    // 1순위: Cerebras (초고속)
        { provider: 'groq', tier: 'haiku' },        // 2순위: Groq 8B
        { provider: 'gemini', tier: 'haiku' },      // 3순위: Gemini Lite
      ];

    // ──────────────────────────────────────────
    // 응답 검증: 초고속 소형 (~50ms)
    // ──────────────────────────────────────────
    case 'response_validation':
      return [
        { provider: 'groq', tier: 'haiku' },        // 1순위: Groq 8B
        { provider: 'cerebras', tier: 'haiku' },    // 2순위: Cerebras 8B
      ];

    default:
      return [
        { provider: 'groq', tier: 'haiku' },
        { provider: 'gemini', tier: 'haiku' },
      ];
  }
}

/** 메인 응답 캐스케이드 — 전략 + 위기수준별 */
function getMainResponseCascade(
  strategy?: StrategyType,
  riskLevel?: RiskLevel
): CascadeItem[] {
  // ① CRITICAL 위기 → Gemini Pro (최고 품질)
  if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
    return [
      { provider: 'gemini', tier: 'opus' },         // Gemini Pro (100 RPD)
      { provider: 'gemini', tier: 'sonnet' },        // Gemini Flash (250 RPD)
      { provider: 'groq', tier: 'sonnet' },          // Groq 70B (1,000 RPD)
    ];
  }

  // ② 위기 지원 전략
  if (strategy === 'CRISIS_SUPPORT') {
    return [
      { provider: 'gemini', tier: 'opus' },          // Gemini Pro
      { provider: 'gemini', tier: 'sonnet' },         // Gemini Flash
      { provider: 'groq', tier: 'sonnet' },           // Groq 70B
    ];
  }

  // ③ 심층 전략 (CBT/ACT/MI) → Gemini Flash 우선
  if (strategy === 'CBT' || strategy === 'ACT' || strategy === 'MI') {
    return [
      { provider: 'gemini', tier: 'sonnet' },         // Gemini Flash (250 RPD)
      { provider: 'groq', tier: 'sonnet' },            // Groq 70B
      { provider: 'groq', tier: 'haiku', modelOverride: GROQ_EXTRA_MODELS.qwen3 }, // Qwen3
    ];
  }

  // ④ 안정화 전략 → 빠른 응답 우선
  if (strategy === 'CALMING') {
    return [
      { provider: 'groq', tier: 'haiku', modelOverride: GROQ_EXTRA_MODELS.qwen3 }, // Qwen3 (60RPM)
      { provider: 'groq', tier: 'haiku' },             // Groq 8B
      { provider: 'gemini', tier: 'haiku' },            // Gemini Lite
    ];
  }

  // ⑤ 기본 공감 (SUPPORT) → Groq Qwen3 우선
  return [
    { provider: 'groq', tier: 'haiku', modelOverride: GROQ_EXTRA_MODELS.qwen3 }, // Qwen3
    { provider: 'cerebras', tier: 'haiku' },           // Cerebras 8B
    { provider: 'gemini', tier: 'haiku' },              // Gemini Lite
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
    case 'main_response':
      if (strategy === 'CBT' || strategy === 'ACT' || strategy === 'MI') return 1024;
      if (strategy === 'CRISIS_SUPPORT') return 512;
      return 768;
    default:
      return 768;
  }
}
