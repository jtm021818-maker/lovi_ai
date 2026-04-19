/**
 * 🧚 v83: Inter-Spirit Interactions (Lv 4+ both)
 *
 * 방에 배치된 정령들 Lv 4+ 둘이 매칭되면 5분마다 랜덤 대사.
 * 유저는 방 탭 시 말풍선으로 볼 수 있음.
 */

import type { SpiritInteraction } from '@/types/spirit.types';

/** 짝 ID 정렬 규칙: 알파벳 순 후 `+` 로 연결 */
function pairKey(a: string, b: string): string {
  return [a, b].sort().join('+');
}

export const INTERACTIONS: SpiritInteraction[] = [
  {
    pairKey: pairKey('fire_goblin', 'moon_rabbit'),
    minBondLv: 4,
    dialogues: [
      { a: '새벽에 불꽃 끄라니까ㅋㅋ', b: '흥! 너나 자' },
      { a: '야 토끼, 잠 안 와?', b: '조용... 너 때문에 더 깨어있어' },
      { a: '아 너 또 벌떡 일어났어?', b: '...' },
    ],
  },
  {
    pairKey: pairKey('cherry_leaf', 'letter_fairy'),
    minBondLv: 4,
    dialogues: [
      { a: '네 편지에 꽃잎 섞어도 될까?', b: '좋지, 향기 더해지겠다' },
      { a: '오늘 편지 써? 내가 꽃잎 붙여줄게', b: '벚잎아... 이번 건 슬픈 편지야' },
    ],
  },
  {
    pairKey: pairKey('queen_elena', 'clown_harley'),
    minBondLv: 4,
    dialogues: [
      { a: '광대, 춤 한 번 춰보거라', b: '황공하옵니다 여왕님ㅋㅋ' },
      { a: '짐은 진지한 이야기 중이다', b: '짐짐짐짐 (장난)' },
    ],
  },
  {
    pairKey: pairKey('book_worm', 'wind_sprite'),
    minBondLv: 4,
    dialogues: [
      { a: '책장 넘기지 마!!', b: '쉭~ 미안 미안' },
      { a: '바람아 좀 조용히...', b: '너무 정적이면 숨막혀 너도' },
    ],
  },
  {
    pairKey: pairKey('tear_drop', 'forest_mom'),
    minBondLv: 4,
    dialogues: [
      { a: '어머 또 울어?', b: '...(훌쩍)' },
      { a: '이리 와, 안아줄게', b: '고마워요...' },
    ],
  },
  {
    pairKey: pairKey('lightning_bird', 'ice_prince'),
    minBondLv: 4,
    dialogues: [
      { a: '야 얼음! 좀 움직여!', b: '...조용해라' },
      { a: '너 너무 느려!', b: '너는 너무 빨라' },
    ],
  },
  {
    pairKey: pairKey('rose_fairy', 'star_dust'),
    minBondLv: 4,
    dialogues: [
      { a: '별똥아 오늘 밤 설레는 소원 있어?', b: '로제 누나 사랑 받아보고 싶어...' },
      { a: '사랑에 빠지는 기분 알려줄까?', b: '응응! 말해줘!' },
    ],
  },
  {
    pairKey: pairKey('butterfly_meta', 'seed_spirit'),
    minBondLv: 4,
    dialogues: [
      { a: '새싹아, 넌 지금 몇 단계야?', b: '...잘 모르겠어. 그냥 자라는 중...' },
      { a: '나도 처음엔 알이었어. 괜찮아.', b: '와...' },
    ],
  },
  {
    pairKey: pairKey('peace_dove', 'fire_goblin'),
    minBondLv: 4,
    dialogues: [
      { a: '불꽃, 진정해...', b: '내가 왜!! 걔가 잘못했는데!!' },
      { a: '분노도 소통의 한 방식이야', b: '...' },
    ],
  },
  {
    pairKey: pairKey('book_keeper', 'cherry_leaf'),
    minBondLv: 4,
    dialogues: [
      { a: '네 이야기 적어두고 있어', b: '...부끄러워' },
      { a: '잊히지 않게 꼭 기록할게', b: '고마워...' },
    ],
  },
  {
    pairKey: pairKey('drum_imp', 'clown_harley'),
    minBondLv: 4,
    dialogues: [
      { a: '둥둥둥 박자 맞춰!', b: '짜란~ 춤춘다!' },
      { a: '너 박자 흐트러졌어', b: '일부러야ㅋㅋ' },
    ],
  },
  {
    pairKey: pairKey('cloud_bunny', 'wind_sprite'),
    minBondLv: 4,
    dialogues: [
      { a: '바람아 나 좀 날려줘~', b: '쉭! 같이 날자' },
      { a: '너는 어디서 왔어?', b: '몰라, 그냥 여기저기' },
    ],
  },
];

export function getInteractions(spiritIds: string[], bondLvs: Record<string, number>): SpiritInteraction[] {
  // 배치된 정령 쌍 중 둘 다 Lv 4+ 인 경우만
  const result: SpiritInteraction[] = [];
  for (const interaction of INTERACTIONS) {
    const [a, b] = interaction.pairKey.split('+');
    if (spiritIds.includes(a) && spiritIds.includes(b) && (bondLvs[a] ?? 0) >= 4 && (bondLvs[b] ?? 0) >= 4) {
      result.push(interaction);
    }
  }
  return result;
}

export function pickRandomInteraction(interactions: SpiritInteraction[]): { pairKey: string; dialogue: { a: string; b: string } } | null {
  if (interactions.length === 0) return null;
  const i = interactions[Math.floor(Math.random() * interactions.length)];
  const d = i.dialogues[Math.floor(Math.random() * i.dialogues.length)];
  return { pairKey: i.pairKey, dialogue: d };
}
