/**
 * 스마트 라우터 — 태스크×전략별 프로바이더 캐스케이드 체인 결정
 *
 * [v50 원칙 — Gemini 전용]
 * 모든 태스크를 Gemini로 통일 (Groq/Cerebras 제거)
 * - 상담 메인: Gemini Flash
 * - 라운지: Gemini Flash-Lite
 * - 이벤트: Gemini Flash
 * - 상태분석/검증: Gemini Flash-Lite
 */

import type { Provider, ModelTier } from './provider-registry';
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
  | 'event_generation'   // 이벤트 생성 — 감정거울, 패턴분석 등
  | 'session_summary'    // 세션 요약
  | 'response_validation' // 응답 검증
  | 'lounge_generation'; // 🆕 v25: 라운지 (캐릭터 데일리 상태 등)

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
        { provider: 'gemini', tier: 'haiku' },       // Gemini Flash-Lite
      ];

    // ──────────────────────────────────────────
    // 🆕 v25: 메인 상담 응답: Gemini Flash → Qwen3 → Cerebras 70B
    // 한국어 감정 표현 품질 우선!
    // ──────────────────────────────────────────
    case 'main_response':
      return getMainResponseCascade(strategy, riskLevel);

    // ──────────────────────────────────────────
    // 이벤트 생성: Gemini Flash (감정거울, 패턴분석 등)
    // ──────────────────────────────────────────
    case 'event_generation':
      return getEventCascade(riskLevel);

    // ──────────────────────────────────────────
    // 세션 요약: 8B 모델 (짧은 출력)
    // ──────────────────────────────────────────
    case 'session_summary':
      return [
        { provider: 'gemini', tier: 'haiku' },       // Gemini Flash-Lite
      ];

    // ──────────────────────────────────────────
    // 응답 검증: 8B 모델 (~50ms)
    // ──────────────────────────────────────────
    case 'response_validation':
      return [
        { provider: 'gemini', tier: 'haiku' },       // Gemini Flash-Lite
      ];

    // ──────────────────────────────────────────
    // 🆕 v25: 라운지 생성: Qwen3 → Cerebras 70B → Gemini Flash-Lite
    // 라운지는 서브니까 Gemini 한도 절약
    // ──────────────────────────────────────────
    case 'lounge_generation':
      return [
        { provider: 'gemini', tier: 'sonnet' },            // Gemini Flash
      ];

    default:
      return [
        { provider: 'gemini', tier: 'sonnet' },            // Gemini Flash
      ];
  }
}

/**
 * 메인 상담 응답 캐스케이드 — v25
 * 🆕 Gemini Flash 메인 (한국어 감정 표현 최강)
 * 위기도 Gemini Flash 우선
 */
function getMainResponseCascade(
  _strategy?: StrategyType,
  _riskLevel?: RiskLevel
): CascadeItem[] {
  // v50: Gemini 전용
  return [
    { provider: 'gemini', tier: 'sonnet' },            // Gemini Flash
  ];
}

/**
 * 이벤트 생성 캐스케이드 — v25
 * Gemini 2.5 Flash (임팩트 순간 품질 집중)
 */
function getEventCascade(
  _riskLevel?: RiskLevel
): CascadeItem[] {
  // v50: Gemini 전용
  return [
    { provider: 'gemini', tier: 'sonnet' },            // Gemini Flash
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
    case 'lounge_generation':
      return 1024;   // 🆕 v25: 라운지 (캐릭터 데일리 상태)
    case 'main_response':
      if (strategy === 'CBT' || strategy === 'ACT' || strategy === 'MI') return 1024;
      if (strategy === 'CRISIS_SUPPORT') return 512;
      return 768;
    default:
      return 768;
  }
}
