/**
 * AI 응답 타이핑 딜레이 유틸리티
 * 응답 길이에 비례한 자연스러운 딜레이 계산
 */

/** 기본 딜레이 (ms) */
export const BASE_DELAY_MS = 1000;

/** 글자당 추가 딜레이 (ms) */
export const MS_PER_CHAR = 20;

/** 최대 딜레이 (ms) */
export const MAX_DELAY_MS = 3000;

/** 최소 딜레이 (ms) — v31: 500→100ms (TTFB 최적화) */
export const MIN_DELAY_MS = 100;

/**
 * AI 응답 텍스트 길이에 따른 타이핑 딜레이 계산
 * @param text 응답 텍스트 (또는 글자 수)
 * @returns 딜레이 값 (ms)
 *
 * @example
 * calcTypingDelay("안녕하세요!")  // 1000 + 6 * 20 = 1120ms
 * calcTypingDelay("...")          // 기본 1000ms
 * calcTypingDelay("아주 긴 응답...") // 최대 3000ms 이내
 */
export function calcTypingDelay(text: string): number {
  const charCount = text?.length ?? 0;
  const delay = BASE_DELAY_MS + charCount * MS_PER_CHAR;
  return Math.min(MAX_DELAY_MS, Math.max(MIN_DELAY_MS, delay));
}

/**
 * 글자 수 직접 입력 버전
 * @param charCount 글자 수
 * @returns 딜레이 값 (ms)
 */
export function calcTypingDelayByCount(charCount: number): number {
  const delay = BASE_DELAY_MS + charCount * MS_PER_CHAR;
  return Math.min(MAX_DELAY_MS, Math.max(MIN_DELAY_MS, delay));
}

/**
 * Promise 기반 딜레이 (await 사용 가능)
 * @param ms 대기 시간 (ms)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 텍스트 기반 타이핑 딜레이 적용 (await 사용 가능)
 * @param text 응답 텍스트
 */
export async function waitTypingDelay(text: string): Promise<void> {
  const delay = calcTypingDelay(text);
  await sleep(delay);
}
