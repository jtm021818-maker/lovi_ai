/**
 * 이중뇌 아키텍처 공유 타입
 */

import type { HighStakesType } from './high-stakes-detector';

/** Gemini 뇌가 출력하는 JSON 구조 */
export interface BrainOutput {
  /** 유저의 현재 감정 (20자 이내) */
  perceived_emotion: string;

  /** 유저가 진짜 원하는 것 (20자 이내) */
  actual_need: string;

  /** 톤 카테고리 */
  tone_to_use:
    | '따뜻함'
    | '분노공감'
    | '가벼움'
    | '진지함'
    | '위기모드'
    | '자책완화'
    | '양가수용';

  /** 응답 길이 가이드 */
  response_length: '한마디' | '짧음' | '보통';

  /** Gemini 초안 (단순 턴에선 이걸 그대로 씀) */
  draft_utterances: string;

  /** 출력 태그 (파이프라인의 기존 태그 시스템 재사용) */
  tags: {
    SITUATION_READ: string;
    LUNA_THOUGHT: string;
    PHASE_SIGNAL: 'STAY' | 'READY' | 'URGENT';
    SITUATION_CLEAR: string | null;
  };

  /**
   * 복잡도 자가 평가 (1~5)
   * 1: "헐" "아..." 한마디
   * 2: 가벼운 궁금증/공감
   * 3: 감정 공명 필요
   * 4: SITUATION_CLEAR 판정 시점
   * 5: 위기/통찰 필요 — 무조건 Claude
   */
  complexity: 1 | 2 | 3 | 4 | 5;

  /** 자신의 판단에 대한 확신도 (0~1). 0.7 미만이면 Claude 강제 호출 */
  confidence: number;

  /** 애매함 신호 (있으면 Claude 강제) */
  ambiguity_signals: string[];
}

/** 라우팅 결정 결과 */
export interface RouteDecision {
  /** 'gemini_only' — Gemini 초안 그대로 사용 / 'claude_rephrase' — Claude 재작성 */
  path: 'gemini_only' | 'claude_rephrase';

  /** 결정 이유 (로깅용) */
  reason: string;

  /** 고위험 감지 결과 */
  stakes: HighStakesType;

  /** 원래 Gemini 복잡도 */
  originalComplexity: number;

  /** 안전망에 의해 조정된 최종 복잡도 */
  finalComplexity: number;
}

/** Claude 입(rephrase)에 전달될 입력 */
export interface VoiceInput {
  /** 유저 원문 (필수 — "고급진 헛소리" 방지) */
  userUtterance: string;

  /** Gemini 분석 결과 (참고용 힌트) */
  brainAnalysis: BrainOutput;

  /** 고위험 신호 + 힌트 메시지 */
  stakeHint?: string;
}

/** 최종 조립 결과 */
export interface AssembledResponse {
  /** 유저에게 전달될 최종 텍스트 (태그 포함) */
  fullText: string;

  /** 어떤 경로로 생성됐는지 */
  path: 'gemini_only' | 'claude_rephrase';

  /** 메타 정보 (로깅/대시보드용) */
  meta: {
    complexity: number;
    confidence: number;
    stakes: HighStakesType;
    geminiLatencyMs: number;
    claudeLatencyMs?: number;
    totalTokensIn: number;
    totalTokensOut: number;
    estimatedCostUSD: number;
  };
}

/** 품질 게이트 검증 결과 */
export interface QualityCheckResult {
  passed: boolean;
  issues: string[];
  shouldFallback: boolean;
}
