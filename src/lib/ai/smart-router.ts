/**
 * 스마트 라우터 — 태스크별 Gemini 멀티모델 캐스케이드 체인 결정
 *
 * 모델별 무료 한도:
 *   2.5 Flash-Lite  — 전체 1순위 (메인 + 이벤트 + 분석)
 *   2.5 Flash       — 폴백 (안정적 품질)
 *
 * 전략:
 *   전체 → 2.5 Flash-Lite (1순위) → 2.5 Flash (폴백)
 */

import type { Provider, ModelTier } from './provider-registry';
import { GEMINI_MODELS, ANTHROPIC_MODELS } from './provider-registry';
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
 * 태스크 + 전략 + 위기수준에 따라 최적 Gemini 멀티모델 캐스케이드 반환
 *
 * 1순위에서 3번 에러나면 → 2순위로 폴백 (캐스케이드 체인)
 */
export function getProviderCascade(
  task: TaskType,
  _strategy?: StrategyType,
  _riskLevel?: RiskLevel
): CascadeItem[] {
  switch (task) {
    // ──────────────────────────────────────────
    // 메인 상담: Claude Sonnet 4.6 + 프롬프트 캐싱 (30~40% 절감)
    // 1순위: Claude Sonnet 4.6 (한국어 공감 품질 최강)
    // 2순위: Gemini 2.5 Flash Lite (무료 폴백)
    // ──────────────────────────────────────────
    case 'main_response':
      return [
        { provider: 'anthropic', tier: 'sonnet', modelOverride: ANTHROPIC_MODELS.SONNET_4_6 },
        { provider: 'gemini',    tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_25 },
        { provider: 'gemini',    tier: 'opus',   modelOverride: GEMINI_MODELS.FLASH_25 },
      ];

    // ──────────────────────────────────────────
    // 이벤트 (VN연극, 감정거울 등): 2.5 Flash-Lite
    // ──────────────────────────────────────────
    case 'event_generation':
      return [
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_25 },
        { provider: 'gemini', tier: 'opus',   modelOverride: GEMINI_MODELS.FLASH_25 },
      ];

    // ──────────────────────────────────────────
    // 상태 분석: RPD 무제한 모델로 (3.1 한도 절약)
    // 1순위: 2 Flash-Lite (무제한, JSON 구조화)
    // 2순위: 2 Flash (무제한 폴백)
    // ──────────────────────────────────────────
    case 'state_analysis':
      return [
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_25 },
        { provider: 'gemini', tier: 'opus',   modelOverride: GEMINI_MODELS.FLASH_25 },
      ];

    // ──────────────────────────────────────────
    // 응답 검증: 경량 + 무제한
    // 1순위: 2 Flash-Lite
    // 2순위: 2 Flash
    // ──────────────────────────────────────────
    case 'response_validation':
      return [
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_25 },
        { provider: 'gemini', tier: 'opus',   modelOverride: GEMINI_MODELS.FLASH_25 },
      ];

    // ──────────────────────────────────────────
    // 세션 요약: 경량 + 무제한
    // ──────────────────────────────────────────
    case 'session_summary':
      return [
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_25 },
        { provider: 'gemini', tier: 'opus',   modelOverride: GEMINI_MODELS.FLASH_25 },
      ];

    // ──────────────────────────────────────────
    // 라운지: 3.1 한도 절약, 무제한 모델 사용
    // 1순위: 2 Flash-Lite (캐릭터 대화)
    // 2순위: 2 Flash
    // ──────────────────────────────────────────
    case 'lounge_generation':
      return [
        { provider: 'cerebras', tier: 'haiku' },    // 1순위: Cerebras 8B (초고속/무료)
        { provider: 'groq', tier: 'haiku' },        // 2순위: Groq 8B
      ];

    default:
      return [
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_25 },
        { provider: 'gemini', tier: 'opus',   modelOverride: GEMINI_MODELS.FLASH_25 },
      ];
  }
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
