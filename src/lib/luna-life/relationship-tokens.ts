/**
 * v114 Bond/Relationship 디자인 토큰
 *
 * 컨셉: 여행 일지 / 폴라로이드 스크랩북.
 * v113.5 외출 복귀 UI 와 동일한 비주얼 어휘 (cream paper / 워시테이프 / 손글씨 / 도장).
 */

export const BOND_TOKENS = {
  // ─── 베이스 종이 ───
  paper: '#FAF6F0',
  paperEdge: '#E8DCC9',
  paperGrain: 'rgba(45,32,19,0.04)',

  // ─── 잉크 / 텍스트 ───
  ink: '#2D2013',
  inkSoft: '#6B5744',
  inkPale: 'rgba(45,32,19,0.45)',
  inkLine: 'rgba(45,32,19,0.18)',

  // ─── 워시테이프 ───
  washiPurple: '#C4A8D4',
  washiPeach: '#F2C9A0',
  washiSage: '#B8D4C8',

  // ─── 4축 페탈 색 ───
  petalTrust: '#E8B4C8',     // 더스티 로즈 — 신뢰
  petalOpenness: '#B8D4C8',  // 세이지 그린 — 개방
  petalBond: '#F5D4A0',      // 웜 앰버 — 유대
  petalRespect: '#B4C4E8',   // 페리윙클 — 존경

  // ─── 도장 잉크 ───
  stampInk: '#7B5EA7',
  stampInkDeep: '#5B3F87',

  // ─── 진행도 잉크 바 ───
  inkBarFill: '#7B5EA7',
  inkBarFillEnd: '#5B3F87',
  inkBarTrack: 'rgba(123,94,167,0.12)',
} as const;

/** 손글씨 폰트 — v113.5 와 공유 */
export const HANDWRITE_FONT =
  '"Nanum Pen Script", "Caveat", "Gowun Dodum", "Comic Sans MS", cursive';

/** 숫자/본문 폰트 */
export const NUMERIC_FONT =
  'Pretendard, ui-sans-serif, -apple-system, BlinkMacSystemFont, sans-serif';

/** 이즈 / 지속 */
export const BOND_EASE = {
  petalGrow: [0.34, 1.56, 0.64, 1] as const,
  polaroidSlide: [0.22, 1, 0.36, 1] as const,
  stampPress: [0.68, -0.55, 0.27, 1.55] as const,
  captionInk: [0.16, 1, 0.3, 1] as const,
} as const;
