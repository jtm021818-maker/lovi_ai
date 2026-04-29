/**
 * Luna Room v100 — shared design tokens.
 * 글래스모피즘 카드 스타일/스프링 프리셋.
 */

export const ROOM_TOKENS = {
  cardBg: 'rgba(255, 251, 247, 0.78)',
  cardBgDark: 'rgba(30, 27, 75, 0.55)',
  cardShadow:
    '0 4px 20px rgba(120, 80, 60, 0.10), 0 1px 3px rgba(120, 80, 60, 0.06)',
  cardShadowDark:
    '0 4px 20px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.25)',
  cardRadius: 20,
  hudFont: "'Pretendard', system-ui, sans-serif",
  whisperFont: "var(--font-gaegu), 'Gaegu', cursive",
  springSoft: { type: 'spring', stiffness: 220, damping: 26 } as const,
  springTap: { type: 'spring', stiffness: 380, damping: 18 } as const,
  springGentle: { type: 'spring', stiffness: 180, damping: 28 } as const,
} as const;
