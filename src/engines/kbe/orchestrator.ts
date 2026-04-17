/**
 * 🎼 KBE 메인 오케스트레이터
 *
 * 외부 진입점: runKBE(input) 하나면 됨.
 *
 * 흐름:
 *   1. Gemini 가 KakaoActionPlan 생성 (규칙 X, 상황 이해 O)
 *   2. Executor 가 plan 을 스트림으로 변환
 *   3. pipeline 이 yield 받아서 UI 로 전송
 */

import { planKakaoAction } from './kakao-action-planner';
import { executeKakaoAction } from './transmission-executor';
import type { KbeInput, KbeStreamChunk } from './types';

// ============================================================
// 유저 스타일 자동 감지 (Claude 입력 전처리)
// ============================================================

/**
 * 유저 메시지에서 자동으로 감지되는 카톡 스타일 힌트.
 * LLM 에게 "유저가 이런 식으로 말해" 힌트로 전달.
 */
export function detectUserStyle(userUtterance: string): KbeInput['user_style'] {
  // 웃음 패턴 (ㅋㅋㅋ, ㅎㅎ)
  const laughMatch = userUtterance.match(/(ㅋ+|ㅎ+)/);
  const laugh_pattern = laughMatch ? laughMatch[0] : null;

  // 눈물 패턴 (ㅠㅠ, ㅜㅜ)
  const tearMatch = userUtterance.match(/([ㅠㅜ]+)/);
  const tear_pattern = tearMatch ? tearMatch[0] : null;

  // 유저가 스티커 전송했는지 (카톡 첨부 포맷 예시: "[스티커]" 또는 "[사진]")
  const sent_sticker = /\[스티커\]|\[이모티콘\]/.test(userUtterance);

  return {
    laugh_pattern,
    tear_pattern,
    sent_sticker,
    message_length: userUtterance.length,
  };
}

// ============================================================
// 메인 KBE 실행
// ============================================================

export interface RunKbeParams {
  claude_response: string;
  user_utterance: string;
  left_brain_summary: KbeInput['left_brain_summary'];
  limbic_mood: string;
  session_meta: KbeInput['session_meta'];
}

export async function* runKBE(
  params: RunKbeParams,
): AsyncGenerator<KbeStreamChunk> {
  // 1. 입력 조립 (유저 스타일 자동 감지 포함)
  const input: KbeInput = {
    claude_response: params.claude_response,
    user_utterance: params.user_utterance,
    left_brain_summary: params.left_brain_summary,
    limbic_mood: params.limbic_mood,
    session_meta: params.session_meta,
    user_style: detectUserStyle(params.user_utterance),
  };

  // 2. Gemini 가 KakaoActionPlan 생성
  const { plan, latencyMs, usedFallback } = await planKakaoAction(input);

  // 3. Executor 로 스트림 변환
  for await (const chunk of executeKakaoAction(plan)) {
    yield chunk;
  }

  // (로깅은 planKakaoAction 호출자나 config 에서 처리)
  void latencyMs;
  void usedFallback;
}

// ============================================================
// 간이 헬퍼: plan 만 받고싶을 때
// ============================================================

export async function getKakaoActionPlanOnly(
  params: RunKbeParams,
): Promise<{ plan: import('./types').KakaoActionPlan; latencyMs: number; usedFallback: boolean }> {
  const input: KbeInput = {
    ...params,
    user_style: detectUserStyle(params.user_utterance),
  };

  return planKakaoAction(input);
}
