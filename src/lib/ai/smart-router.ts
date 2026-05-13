/**
 * 스마트 라우터 — 태스크별 모델 캐스케이드 (3순위까지) 결정
 *
 * v63 (2026-05-13) — Gemini 3.1 라인업 통일:
 *   $0.25/$1.50  Gemini 3.1 Flash-Lite GA  — 전체 1순위 (정식 출시 2026-05-07)
 *   $0.50        Gemini 3 Flash Preview    — 복잡한 추론 폴백 (PhD GPQA 90.4%)
 *
 * 전략: 모든 일반 작업은 3.1 Lite GA, 위기/복잡 추론은 3 Flash Preview.
 *       Claude 완전 제거. 1순위 실패 → 2순위 → 3순위 폴백 (전부 Gemini).
 */

import type { Provider, ModelTier } from './provider-registry';
import { GEMINI_MODELS } from './provider-registry';
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
    //   위기/CBT/ACT → 3 Flash Preview 우선 (강한 추론)
    //   일반        → 3.1 Lite GA 우선 (가성비 + 빠름)
    // ──────────────────────────────────────────
    case 'main_response': {
      const isCrisis = _riskLevel === 'CRITICAL' || _riskLevel === 'HIGH';
      const isHighStrategy = _strategy === 'CRISIS_SUPPORT' || _strategy === 'CBT' || _strategy === 'ACT';
      if (isCrisis || isHighStrategy) {
        // 위기/복잡 → 3 Flash Preview 1순위 (추론 강함)
        return [
          { provider: 'gemini', tier: 'opus',   modelOverride: GEMINI_MODELS.FLASH_3 },        // 3 Flash Preview
          { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_GA },  // 3.1 Lite GA 폴백
        ];
      }
      // 평범한 카톡 응답 → 3.1 Lite GA 우선 (가성비 + 빠름)
      return [
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_GA },  // 3.1 Lite GA 1순위
        { provider: 'gemini', tier: 'opus',   modelOverride: GEMINI_MODELS.FLASH_3 },        // 3 Flash Preview 폴백
      ];
    }

    // ──────────────────────────────────────────
    // 이벤트 생성 (VN 연극, 감정거울 등) — 큰 JSON 안정성 우선
    //   1순위: 3.1 Lite GA — JSON 안정성 + 빠른 응답
    //   2순위: 3 Flash Preview — 추론 폴백
    // ──────────────────────────────────────────
    case 'event_generation':
      return [
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_GA },
        { provider: 'gemini', tier: 'opus',   modelOverride: GEMINI_MODELS.FLASH_3 },
      ];

    // ──────────────────────────────────────────
    // 상태 분석 (좌뇌 7D + 페이싱 + 호르몬) — JSON 구조화
    //   1순위: 3.1 Lite GA
    //   2순위: 3 Flash Preview
    // ──────────────────────────────────────────
    case 'state_analysis':
      return [
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_GA },
        { provider: 'gemini', tier: 'opus',   modelOverride: GEMINI_MODELS.FLASH_3 },
      ];

    // ──────────────────────────────────────────
    // 응답 검증 — 경량 분류, 3.1 Lite GA 단일
    // ──────────────────────────────────────────
    case 'response_validation':
      return [
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_GA },
      ];

    // ──────────────────────────────────────────
    // 세션 요약 — 단순 요약, 3.1 Lite GA 단일
    // ──────────────────────────────────────────
    case 'session_summary':
      return [
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_GA },
      ];

    // ──────────────────────────────────────────
    // 라운지 (캐릭터 잡담) — 무료 제공자 우선
    //   1순위: Cerebras → 2순위: Groq → 3순위: 3.1 Lite GA 폴백
    // ──────────────────────────────────────────
    case 'lounge_generation':
      return [
        { provider: 'cerebras', tier: 'haiku' },
        { provider: 'groq',     tier: 'haiku' },
        { provider: 'gemini',   tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_GA },
      ];

    default:
      return [
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_GA },
        { provider: 'gemini', tier: 'opus',   modelOverride: GEMINI_MODELS.FLASH_3 },
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
