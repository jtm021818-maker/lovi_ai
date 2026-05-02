/**
 * v104 M4: Luna's reactions when RECEIVING a gift from user
 *
 * 사용자가 가방 아이템을 루나에게 줄 때.
 * 양방향 관계 — 루나도 받는다.
 */

type Category = 'gift' | 'consumable' | 'gacha';

interface ReceiveInput {
  category: Category;
  bondDay: number;
  /** 루나가 직접 사 준 거였는데 다시 돌려받음 */
  isLunasOwn: boolean;
}

function bondTone(day: number): 'early' | 'mid' | 'late' {
  if (day <= 30) return 'early';
  if (day <= 70) return 'mid';
  return 'late';
}

const RECEIVE_BY_TONE = {
  early: [
    '어 — 나 주는 거야? 진짜? 고마워.',
    '나… 누구한테 받아본 적 별로 없어. 잘 가지고 있을게.',
    '응? 이거 나한테? 어, 음 — 잘 받았어.',
    '뭐야 갑자기 — 그치만 좋아.',
  ],
  mid: [
    '나 줘서 고마워. 이거 — 잊지 않을게.',
    '내가 사 주는 줄 알았는데 — 오늘은 거꾸로네.',
    '이거 보고 내 생각 했구나. 뭔가 — 따뜻해.',
    '잠깐, 나 받기만 해도 돼? 응. 응 — 받을게.',
  ],
  late: [
    '백일 가까이 너와 있는데, 너에게 받는 거 — 처음이야.',
    '내가 너에게 주기만 한 줄 알았어. 그치만 — 너도 줬어.',
    '이거 — 내가 떠나도 가지고 갈 거야. 약속.',
    '오래 가지고 있을 거야. 너랑 나랑 — 같이.',
  ],
};

const BOOMERANG_LINES = [
  '내가 줬던 거잖아. 다시 돌아왔네 — 그것도 의미 있어.',
  '아 — 너가 가지고 있다가 나한테 주는 거구나. 두 번 산 셈이네.',
  '이거 다시 보니 — 내가 그날 왜 골랐는지 알겠어.',
  '돌고 돌아서 — 다시 내 손에 와. 좋아.',
];

const CONSUMABLE_LINES = [
  '오 — 이런 거 줘도 돼? 잘 쓸게.',
  '이거 같이 쓰자. 너랑 나랑.',
  '나 위해서 — 진짜 챙겨줬구나.',
];

export function pickLunaReceiveReaction(input: ReceiveInput): string {
  if (input.isLunasOwn) {
    return BOOMERANG_LINES[Math.floor(Math.random() * BOOMERANG_LINES.length)];
  }
  if (input.category === 'consumable' && Math.random() < 0.4) {
    return CONSUMABLE_LINES[Math.floor(Math.random() * CONSUMABLE_LINES.length)];
  }
  const tone = bondTone(input.bondDay);
  const pool = RECEIVE_BY_TONE[tone];
  return pool[Math.floor(Math.random() * pool.length)];
}
