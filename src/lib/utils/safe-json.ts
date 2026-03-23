/**
 * LLM JSON 응답 안전 파싱 유틸리티
 * - 코드블록(```json ... ```) 자동 제거
 * - 앞뒤 공백/BOM 제거
 * - { } 블록 추출 후 재시도
 * - 모두 실패 시 fallback 반환
 */

/**
 * LLM이 반환한 문자열에서 JSON을 안전하게 파싱
 * @param raw LLM 응답 원본 문자열
 * @param fallback 파싱 실패 시 반환할 기본값
 * @returns 파싱된 객체 또는 fallback
 */
export function safeParseLLMJson<T>(raw: string, fallback: T): T {
  if (!raw || typeof raw !== 'string') return fallback;

  // 1단계: 코드블록 제거 + 앞뒤 정리
  let cleaned = raw
    .replace(/^\uFEFF/, '')           // BOM 제거
    .replace(/```(?:json)?\s*/gi, '') // 코드블록 열기 제거
    .replace(/```\s*/g, '')           // 코드블록 닫기 제거
    .trim();

  // 2단계: 직접 파싱 시도
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // 3단계: { } 블록 추출 후 재시도
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        // 4단계: 마지막 시도 — 줄바꿈/탭 제거 후 재파싱
        try {
          const normalized = match[0]
            .replace(/[\r\n\t]/g, ' ')
            .replace(/,\s*}/g, '}')       // trailing comma 제거
            .replace(/,\s*]/g, ']');      // trailing comma 제거
          return JSON.parse(normalized) as T;
        } catch {
          // 모두 실패
        }
      }
    }
  }

  console.warn('[safeParseLLMJson] 모든 파싱 실패, fallback 사용');
  return fallback;
}
