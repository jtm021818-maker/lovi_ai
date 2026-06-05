/**
 * 검색 쿼리용 연도 태그 — 하드코딩("2026") 대신 동적 현재연도.
 *
 * 추천/검색(같이 둘러보기, 노래/데이트장소/선물 등)이 "최신" 결과를 끌어오도록
 * 검색 쿼리에 붙이는 연도 문자열을 한 곳에서 생성한다.
 */

/** 현재 연도 (서버 시각 기준). */
export function currentYear(): number {
  return new Date().getFullYear();
}

/**
 * 검색용 연도 태그.
 *  - span=1 → "2026"
 *  - span=2 → "2025 2026" (작년+올해, 최신성 폭 넓힐 때)
 */
export function searchYearTag(span = 1): string {
  const y = currentYear();
  if (span <= 1) return String(y);
  const years: number[] = [];
  for (let i = span - 1; i >= 0; i--) years.push(y - i);
  return years.join(' ');
}
