/**
 * 스마트 라우터 — 태스크별 모델 캐스케이드 (3순위까지) 결정
 *
 * v62 가성비 라인업:
 *   $0.10  Gemini 2.5 Flash Lite        — 단순 작업
 *   $0.25  Gemini 3.1 Flash Lite preview — 빠름(2.5x) + 추론 향상
 *   $0.30  Gemini 2.5 Flash              — 안정적
 *   $0.50  Gemini 3 Flash preview        — 최강 추론 (PhD/SWE)
 *   $$$    Claude Sonnet 4.6              — 진짜 복잡한 한국어 공감만
 *
 * 전략: 가장 가벼운 작업은 2.5 Flash Lite, 추론 필요시 3.1 Lite,
 *       진짜 복잡 응답만 Claude. 1순위 실패 → 2순위 → 3순위 폴백.
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
  _riskLevel?: RiskLevel,
): CascadeItem[] {
  switch (task) {
    // ──────────────────────────────────────────
    // 메인 상담 응답 (매 턴 카톡 답변)
    //   진짜 복잡 (CRISIS, 깊은 공감) → Claude
    //   일반 → Gemini 3.1 Flash Lite (가성비 추론)
    //   폴백 → Gemini 3 Flash (추론 강함) → Gemini 2.5 Flash (안정)
    //
    // 위기/고복잡 케이스: Claude 1순위 (한국어 공감 품질)
    // ──────────────────────────────────────────
    case 'main_response': {
      const isCrisis = _riskLevel === 'CRITICAL' || _riskLevel === 'HIGH';
      const isHighStrategy = _strategy === 'CRISIS_SUPPORT' || _strategy === 'CBT' || _strategy === 'ACT';
      if (isCrisis || isHighStrategy) {
        // 진짜 복잡 → Claude
        return [
          { provider: 'anthropic', tier: 'sonnet', modelOverride: ANTHROPIC_MODELS.SONNET_4_6 },
          { provider: 'gemini',    tier: 'opus',   modelOverride: GEMINI_MODELS.FLASH_3 },          // $0.50 추론 폴백
          { provider: 'gemini',    tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_31 },    // $0.25 최후
        ];
      }
      // 평범한 카톡 응답 → 가성비 우선
      return [
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_31 }, // $0.25 1순위
        { provider: 'gemini', tier: 'opus',   modelOverride: GEMINI_MODELS.FLASH_25 },      // $0.30 2순위
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_25 }, // $0.10 최후 폴백
      ];
    }

    // ──────────────────────────────────────────
    // 이벤트 생성 (VN 연극, 감정거울 등) — 큰 JSON (facts+characterSetup+sceneLines) 안정성 우선
    //   v63.1: JSON 깨짐 빈번 → 2.5 Lite 1순위로
    //   1순위: 2.5 Flash Lite ($0.10) — 검증된 JSON 안정성
    //   2순위: 2.5 Flash ($0.30) — 안정 폴백
    //   3순위: 3.1 Flash Lite ($0.25) — 최후 시도
    // ──────────────────────────────────────────
    case 'event_generation':
      return [
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_25 }, // $0.10
        { provider: 'gemini', tier: 'opus',   modelOverride: GEMINI_MODELS.FLASH_25 },      // $0.30
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_31 }, // $0.25
      ];

    // ──────────────────────────────────────────
    // 상태 분석 (좌뇌 7D + 페이싱 + 호르몬) — JSON 구조화 안정성 우선
    //   v63.1: JSON 출력은 2.5 Flash Lite 가 가장 안정적
    //          (3.1 Lite 는 큰 JSON 가끔 깨짐 → 비용 낭비 + parse 실패)
    //   1순위: 2.5 Flash Lite ($0.10) — 검증된 JSON 안정성
    //   2순위: 2.5 Flash ($0.30) — 안정 폴백
    //   3순위: 3.1 Flash Lite ($0.25) — 최후 시도
    // ──────────────────────────────────────────
    case 'state_analysis':
      return [
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_25 }, // $0.10
        { provider: 'gemini', tier: 'opus',   modelOverride: GEMINI_MODELS.FLASH_25 },      // $0.30
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_31 }, // $0.25
      ];

    // ──────────────────────────────────────────
    // 응답 검증 — 경량 분류 작업, 최저가 우선
    //   1순위: 2.5 Flash Lite ($0.10)
    //   2순위: 3.1 Flash Lite ($0.25)
    //   3순위: 2.5 Flash ($0.30)
    // ──────────────────────────────────────────
    case 'response_validation':
      return [
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_25 }, // $0.10
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_31 }, // $0.25
        { provider: 'gemini', tier: 'opus',   modelOverride: GEMINI_MODELS.FLASH_25 },      // $0.30
      ];

    // ──────────────────────────────────────────
    // 세션 요약 — 단순 요약, 최저가 우선
    // ──────────────────────────────────────────
    case 'session_summary':
      return [
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_25 }, // $0.10
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_31 }, // $0.25
        { provider: 'gemini', tier: 'opus',   modelOverride: GEMINI_MODELS.FLASH_25 },      // $0.30
      ];

    // ──────────────────────────────────────────
    // 라운지 (캐릭터 잡담) — 초고속 무료 제공자 우선
    //   1순위: Cerebras (무료/초고속)
    //   2순위: Groq (무료/빠름)
    //   3순위: Gemini 2.5 Flash Lite ($0.10 폴백)
    // ──────────────────────────────────────────
    case 'lounge_generation':
      return [
        { provider: 'cerebras', tier: 'haiku' },
        { provider: 'groq',     tier: 'haiku' },
        { provider: 'gemini',   tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_25 },
      ];

    default:
      return [
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_25 },
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_31 },
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
