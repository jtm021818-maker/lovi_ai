/**
 * 🃏 타로 카드 앞면 이미지 경로 매핑
 *
 * 이미지 파일 규칙:
 *   /public/tarot-cards/{suit}/{id}.webp
 *
 * 예시:
 *   major_0  → /tarot-cards/major/major_0.webp   (The Fool)
 *   cups_1   → /tarot-cards/cups/cups_1.webp     (Ace of Cups)
 *   swords_knight → /tarot-cards/swords/swords_knight.webp
 *
 * 이미지가 없으면 fallback(이모지 기반 렌더링) 사용
 */

/** 카드 ID → 이미지 경로 변환 */
export function getCardImagePath(cardId: string): string {
  const folder = getCardFolder(cardId);
  return `/tarot-cards/${folder}/${cardId}.webp`;
}

/** 카드 ID → 폴더명 추출 */
function getCardFolder(cardId: string): string {
  if (cardId.startsWith('major_')) return 'major';
  if (cardId.startsWith('cups_')) return 'cups';
  if (cardId.startsWith('swords_')) return 'swords';
  if (cardId.startsWith('wands_')) return 'wands';
  if (cardId.startsWith('pentacles_')) return 'pentacles';
  return 'major'; // fallback
}

/**
 * 전체 78장 카드 ID 목록
 * 이미지 파일명 확인용
 */
export const ALL_CARD_IDS = [
  // Major Arcana (22)
  'major_0', 'major_1', 'major_2', 'major_3', 'major_4',
  'major_5', 'major_6', 'major_7', 'major_8', 'major_9',
  'major_10', 'major_11', 'major_12', 'major_13', 'major_14',
  'major_15', 'major_16', 'major_17', 'major_18', 'major_19',
  'major_20', 'major_21',
  // Cups (14)
  'cups_1', 'cups_2', 'cups_3', 'cups_4', 'cups_5',
  'cups_6', 'cups_7', 'cups_8', 'cups_9', 'cups_10',
  'cups_page', 'cups_knight', 'cups_queen', 'cups_king',
  // Swords (14)
  'swords_1', 'swords_2', 'swords_3', 'swords_4', 'swords_5',
  'swords_6', 'swords_7', 'swords_8', 'swords_9', 'swords_10',
  'swords_page', 'swords_knight', 'swords_queen', 'swords_king',
  // Wands (14)
  'wands_1', 'wands_2', 'wands_3', 'wands_4', 'wands_5',
  'wands_6', 'wands_7', 'wands_8', 'wands_9', 'wands_10',
  'wands_page', 'wands_knight', 'wands_queen', 'wands_king',
  // Pentacles (14)
  'pentacles_1', 'pentacles_2', 'pentacles_3', 'pentacles_4', 'pentacles_5',
  'pentacles_6', 'pentacles_7', 'pentacles_8', 'pentacles_9', 'pentacles_10',
  'pentacles_page', 'pentacles_knight', 'pentacles_queen', 'pentacles_king',
] as const;

export type CardId = typeof ALL_CARD_IDS[number];
