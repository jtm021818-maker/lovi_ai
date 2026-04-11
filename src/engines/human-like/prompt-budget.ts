/**
 * 🆕 ACE v4: 프롬프트 토큰 예산 관리자
 *
 * 모든 메모리/맥락 섹션을 우선순위별로 정렬하고,
 * 토큰 예산 내에서 프롬프트를 조립한다.
 *
 * 한국어 기준: 1토큰 ≈ 2-3자
 */

export interface PromptSection {
  key: string;
  content: string;
  priority: 0 | 1 | 2 | 3;  // 0=필수(Identity/Safety), 1=핵심(맥락), 2=보조(기억), 3=선택(힌트)
  estimatedTokens: number;
}

/**
 * 한국어 텍스트의 토큰 수 추정 (근사치)
 * 한국어 1토큰 ≈ 2-3자, 공백/줄바꿈 포함
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // 한국어는 대략 2.5자 = 1토큰
  return Math.ceil(text.length / 2.5);
}

/**
 * 프롬프트 섹션을 우선순위 기반으로 예산 내에서 조립
 *
 * @param sections - 프롬프트 섹션 배열
 * @param maxTokens - 최대 토큰 예산 (기본 2500)
 * @returns 예산 내에서 조립된 프롬프트 문자열
 */
export function budgetPrompt(sections: PromptSection[], maxTokens: number = 2500): string {
  // P0 → P1 → P2 → P3 순서로 정렬
  const sorted = [...sections]
    .filter(s => s.content && s.content.trim())
    .sort((a, b) => a.priority - b.priority);

  let usedTokens = 0;
  const result: string[] = [];

  for (const section of sorted) {
    const tokens = section.estimatedTokens || estimateTokens(section.content);

    if (usedTokens + tokens <= maxTokens) {
      // 예산 내 → 전체 포함
      result.push(section.content);
      usedTokens += tokens;
    } else if (section.priority <= 1) {
      // P0-P1은 잘라서라도 포함 (핵심 정보 보존)
      const remaining = maxTokens - usedTokens;
      if (remaining > 50) {
        const charLimit = remaining * 2.5; // 토큰 → 한국어 문자 추정
        result.push(section.content.slice(0, charLimit) + '...');
        usedTokens = maxTokens;
      }
      break; // 예산 소진
    }
    // P2-P3은 예산 초과 시 스킵
  }

  return result.filter(Boolean).join('\n\n');
}

/**
 * 프롬프트 섹션 생성 헬퍼
 */
export function createSection(
  key: string,
  content: string,
  priority: 0 | 1 | 2 | 3,
): PromptSection {
  return {
    key,
    content,
    priority,
    estimatedTokens: estimateTokens(content),
  };
}
