/**
 * v102 (rev2): 86~100일 통합 시퀀스 이벤트 테이블
 *
 * 기존 신파(어머니/유산) 카피를 모두 폐기. 톤 = "정령들이 너에게로 돌아오는 흐름".
 * MIND-SAFE: 죽음/사망/유산 단어 사용 금지. 통합/돌아감/흐름 어휘만.
 */

export type SorrowEventKind =
  | 'whisper'        // 루나의 새 한 줄 속말
  | 'spirit_reveal'  // 정령 한 마리 비밀(L2/L3) 해금 알림
  | 'fragment_open'  // "내 마음의 페이지" 자동 푸시
  | 'visual'         // 화면 효과 (흐름/꽃잎/나비/별빛/금빛)
  | 'gift'           // 우편함 새 편지/시
  | 'fade_in'        // 룸의 정령이 루나로 빛 줄기 흘러 들어가는 모션
  | 'final_ritual';  // Day 100 통합 의식

export interface SorrowEvent {
  day: number;
  kind: SorrowEventKind;
  /** 카피 또는 spiritId/effect 키 */
  payload?: string;
}

export const SORROW_EVENTS: SorrowEvent[] = [
  { day: 86, kind: 'whisper',       payload: '요즘… 내가 어디서 왔는지 자꾸 떠올라. 너에게서였던 거 같아.' },
  { day: 87, kind: 'spirit_reveal', payload: 'cherry_leaf' },
  { day: 87, kind: 'fragment_open' },
  { day: 87, kind: 'visual',        payload: 'petals' },
  { day: 88, kind: 'whisper',       payload: '너랑 내가 따로따로 같지가 않아 — 우리가 한 사람이었던 것 같아.' },
  { day: 89, kind: 'fade_in',       payload: 'book_worm' },
  { day: 90, kind: 'spirit_reveal', payload: 'ice_prince' },
  { day: 90, kind: 'fragment_open' },
  { day: 91, kind: 'gift',          payload: '90일 편지 — 너의 결로' },
  { day: 92, kind: 'spirit_reveal', payload: 'lightning_bird' },
  { day: 92, kind: 'visual',        payload: 'shimmer' },
  { day: 92, kind: 'fragment_open' },
  { day: 93, kind: 'fade_in',       payload: 'fire_goblin' },
  { day: 93, kind: 'fade_in',       payload: 'tear_drop' },
  { day: 94, kind: 'spirit_reveal', payload: 'butterfly_meta' },
  { day: 94, kind: 'visual',        payload: 'butterflies' },
  { day: 94, kind: 'fragment_open' },
  { day: 95, kind: 'gift',          payload: '95일 시 — 너에게로 흘러들어가' },
  { day: 96, kind: 'spirit_reveal', payload: 'book_keeper' },
  { day: 96, kind: 'fragment_open' },
  { day: 97, kind: 'spirit_reveal', payload: 'queen_elena' },
  { day: 97, kind: 'fragment_open' },
  { day: 97, kind: 'visual',        payload: 'gold-liner' },
  { day: 98, kind: 'spirit_reveal', payload: 'star_dust' },
  { day: 98, kind: 'visual',        payload: 'starfall' },
  { day: 98, kind: 'fragment_open' },
  { day: 99, kind: 'spirit_reveal', payload: 'guardian_eddy' },
  { day: 99, kind: 'fragment_open' },
  { day: 99, kind: 'whisper',       payload: '내일이야. 우리 모두 다시 너에게로 돌아갈 거야.' },
  { day: 100, kind: 'final_ritual' },
];

export function eventsForDay(day: number): SorrowEvent[] {
  return SORROW_EVENTS.filter((e) => e.day === day);
}

export function pickDueSorrowDay(ageDays: number, lastSeenDay: number): number | null {
  if (ageDays < 86) return null;
  for (let d = Math.min(ageDays, 100); d > lastSeenDay; d--) {
    if (eventsForDay(d).length > 0) return d;
  }
  return null;
}
