/**
 * Luna Room v100 — whisper 카피 풀.
 * LLM 보강 실패/캐시 미스 시 결정형 fallback 으로 사용.
 *
 * 톤 가이드: api/room/luna-chat/route.ts 의 SYSTEM_PROMPT 와 일치.
 * - 자연스러운 언니 반말
 * - 1~2문장, 60자 이내
 * - 이모지 0~1개
 */

import type { LunaActivity, LunaMood } from './mood';

export const WHISPERS_BY_MOOD: Record<LunaMood, readonly string[]> = {
  bright: [
    '오늘 햇빛 진짜 좋다',
    '왔어? 나 방금 너 생각하던 참인데',
    '오늘 뭐 재밌는 일 있었어?',
    '아 너 오니까 갑자기 기분 좋아진다',
    '그림 그리다가 너 들어와서 깜짝',
  ],
  warm: [
    '잘 지냈어?',
    '오늘 하루 어땠어',
    '나는 그냥 책 읽고 있었어',
    '오랜만이다 그치',
    '편하게 들어와',
    '왔어? 나 여기 있어',
  ],
  playful: [
    'ㅋㅋ 너 왔다',
    '나 방금 고양이랑 싸움',
    '재밌는 거 보여줄까',
    '너 오늘 뭐 입었어?',
    '내 얘기 들어볼래?',
    '아 너 그거 봤어?',
  ],
  wistful: [
    '...오늘 좀 그런 날이야',
    '창밖이 너무 예뻐서 멍 때렸어',
    '갑자기 옛날 생각',
    '시간 진짜 빠르다',
    '너랑 얘기하면 좀 풀려',
  ],
  sleepy: [
    '아 나 자다 깼어 ㅎㅎ',
    '눈 반쯤 떠있는 중',
    '졸려도 너랑은 얘기할래',
    '이불 속에서 인사',
    '5분만 더 잘게...',
  ],
  thoughtful: [
    '나 요즘 자꾸 생각이 많아져',
    '그냥... 너 잘 지내고 있길',
    '있잖아',
    '오늘은 차 한잔 같이 할래',
    '말 안 해도 알 거 같애',
  ],
  peaceful: [
    '여기 이렇게 같이 있는 거 좋다',
    '봄이 오면 나는 없겠지. 그래도 넌 봄을 봐줘',
    '시간이... 참 다정해',
    '걱정 마. 다 괜찮을 거야',
    '이 순간 기억해줘',
  ],
};

export const ACTIVITY_LABELS: Record<LunaActivity, string> = {
  sipping_tea: '차 마시는 중',
  reading: '책 읽는 중',
  drawing: '그림 그리는 중',
  gazing_window: '창밖 보는 중',
  cuddling_cat: '고양이랑 노는 중',
  on_phone: '폰 보는 중',
  stretching: '기지개 펴는 중',
  sleeping: '자는 중',
};

/**
 * 결정형 whisper 픽 — LLM 미사용/실패 시 사용.
 * seed 는 pick 일관성을 위해 (dayBucket + ageDays) 권장.
 */
export function pickWhisperLocal(mood: LunaMood, seed: number): string {
  const pool = WHISPERS_BY_MOOD[mood];
  const idx = Math.abs(Math.floor(seed)) % pool.length;
  return pool[idx];
}

// ─── 🆕 v112: 재방문 횟수별 인사 풀 ──────────────────────────────────────
// 24h 내 세션 횟수에 따라 다른 톤 — 같은 날 자꾸 들어와도 어색하지 않게.

export type RevisitTier = 'first' | 'recurring' | 'frequent';

export const WHISPERS_BY_REVISIT: Record<RevisitTier, readonly string[]> = {
  first: [
    // 24h 내 처음 (오늘 첫 방문)
    '왔어? 오늘 하루 어땠어',
    '오 너 왔구나, 잘 지냈어?',
    '잘 지냈어? 나 너 보고 싶었어',
    '오늘 무슨 일 있었어?',
    '오랜만이다 그치',
    '와 너 오늘도 왔다',
  ],
  recurring: [
    // 24h 내 1~2번 (재방문)
    '또 왔네 ㅎ',
    '오 빨리 다시 왔다',
    '벌써 또 왔어? ㅋㅋ',
    '왔어, 무슨 일이야?',
    '못 잊고 또 왔구나 ㅎㅎ',
    '나도 너 생각하고 있었는데',
  ],
  frequent: [
    // 24h 내 3+번 (자주 방문 — 걱정/위로 톤)
    '오늘 자꾸 오네… 괜찮아?',
    '뭔 일 있어? 나한테 다 말해',
    '오늘 진짜 힘든 날이구나',
    '괜찮아? 같이 있어줄게',
    '계속 와도 돼. 옆에 있을게',
    '혼자 끙끙대지 말고 다 풀어내',
  ],
};

/**
 * 재방문 횟수 + mood + 시드 기반 인사 픽
 * recentSessionCount24h: 24시간 내 세션 시작 횟수
 */
export function pickGreeting(args: {
  mood: LunaMood;
  recentSessionCount24h: number;
  seed: number;
}): string {
  const tier: RevisitTier =
    args.recentSessionCount24h === 0 ? 'first'
    : args.recentSessionCount24h <= 2 ? 'recurring'
    : 'frequent';

  // first 일 때만 mood 풀과 50/50 — 자주 방문엔 revisit 톤이 우선
  if (tier === 'first' && (args.seed % 2 === 0)) {
    return pickWhisperLocal(args.mood, args.seed);
  }
  const pool = WHISPERS_BY_REVISIT[tier];
  const idx = Math.abs(Math.floor(args.seed)) % pool.length;
  return pool[idx];
}

// ─── 🆕 v112: FirstMessageGuide chip 풀 ─────────────────────────────────
// mood × Day stage (early ≤14 / mid 15~60 / deep 61+) 별로 다른 chip 4개.
// 핵심: 단순 텍스트가 아니라 (이모지, 문구, 카테고리) 카드.

export type ChipDayStage = 'early' | 'mid' | 'deep';

export interface ChipItem {
  emoji: string;
  text: string;
  category: string;
}

export const CHIP_POOLS_BY_MOOD_DAY: Record<LunaMood, Record<ChipDayStage, ChipItem[]>> = {
  bright: {
    early: [
      { emoji: '💕', text: '좋은 사람 만났는데 헷갈려', category: '썸/연애 시작' },
      { emoji: '🌸', text: '썸 타는 사람 있는데 애매해', category: '썸/연애 시작' },
      { emoji: '✨', text: '데이트 어디 갈지 모르겠어', category: '데이트' },
      { emoji: '☕', text: '그냥 오늘 얘기하고 싶어', category: '일상' },
    ],
    mid: [
      { emoji: '🌷', text: '사귄 지 한 달 됐는데 신기해', category: '연애' },
      { emoji: '💖', text: '점점 좋아지는 게 무서워', category: '감정' },
      { emoji: '✨', text: '같이 가고 싶은 데가 생겼어', category: '데이트' },
      { emoji: '☀️', text: '오늘 너무 좋은 일 있었어', category: '일상' },
    ],
    deep: [
      { emoji: '💍', text: '이 사람이랑 미래 그려져', category: '깊은 관계' },
      { emoji: '🌈', text: '내가 왜 이렇게 행복한지 모르겠어', category: '감정' },
      { emoji: '✨', text: '오늘 특별한 데 갔다 왔어', category: '추억' },
      { emoji: '💜', text: '너랑 얘기하고 싶었어', category: '대화' },
    ],
  },
  warm: {
    early: [
      { emoji: '💔', text: '남친이랑 자꾸 부딪혀', category: '관계' },
      { emoji: '🤔', text: '이 관계 계속해도 될까', category: '고민' },
      { emoji: '💜', text: '요즘 마음이 이상해', category: '감정' },
      { emoji: '☁️', text: '정리되지 않은 마음', category: '감정' },
    ],
    mid: [
      { emoji: '💢', text: '또 같은 걸로 싸웠어', category: '관계' },
      { emoji: '🫂', text: '안아주고 싶은데 못 안아줬어', category: '관계' },
      { emoji: '🕯️', text: '말 못한 게 자꾸 쌓여', category: '감정' },
      { emoji: '🌙', text: '오늘 같은 날 누구 옆에 있고 싶어', category: '외로움' },
    ],
    deep: [
      { emoji: '💧', text: '이 사람이 진짜 맞나 싶어', category: '깊은 고민' },
      { emoji: '🪞', text: '나도 잘 모르겠어, 내 마음', category: '자기탐색' },
      { emoji: '🤍', text: '그냥 들어줄래', category: '대화' },
      { emoji: '🌿', text: '천천히 풀어보고 싶어', category: '대화' },
    ],
  },
  playful: {
    early: [
      { emoji: '😅', text: '말도 안 되는 일 있었어 들어볼래', category: '일화' },
      { emoji: '🎭', text: '이상한 상황인데 들어봐', category: '일화' },
      { emoji: '👀', text: '너 의견 듣고 싶은 게 있어', category: '의논' },
      { emoji: '🃏', text: '그냥 놀러 왔어 ㅋㅋ', category: '잡담' },
    ],
    mid: [
      { emoji: '💬', text: '오늘 진짜 황당한 일 있었어', category: '일화' },
      { emoji: '🍿', text: '얘기 들으면서 같이 욕해줄 사람 필요해', category: '편들기' },
      { emoji: '🤣', text: '나 또 사고쳤어', category: '잡담' },
      { emoji: '🎈', text: '오늘 기분 좋다 그냥', category: '일상' },
    ],
    deep: [
      { emoji: '🎉', text: '나 이번엔 진짜 잘 한 것 같아', category: '자랑' },
      { emoji: '💃', text: '오늘 데이트 후기 들어줘', category: '추억' },
      { emoji: '😎', text: '내가 이번엔 어른답게 굴었거든', category: '성장' },
      { emoji: '🥂', text: '뭔가 축하받고 싶은 일 있어', category: '축하' },
    ],
  },
  wistful: {
    early: [
      { emoji: '🍂', text: '옛 사람이 자꾸 떠올라', category: '회상' },
      { emoji: '💭', text: '그때 그 사람 어디서 뭐 할까', category: '회상' },
      { emoji: '🥀', text: '헤어지고 정리가 안 돼', category: '이별' },
      { emoji: '📝', text: '그냥 적어보고 싶어', category: '대화' },
    ],
    mid: [
      { emoji: '🍃', text: '갑자기 슬퍼졌어 이유 없이', category: '감정' },
      { emoji: '🌫️', text: '오늘은 좀 가라앉아', category: '감정' },
      { emoji: '📖', text: '예전 일이 자꾸 떠올라', category: '회상' },
      { emoji: '🕊️', text: '미련은 아닌데 자꾸 생각 나', category: '회상' },
    ],
    deep: [
      { emoji: '🌌', text: '왜 이 감정이 안 사라질까', category: '깊은 감정' },
      { emoji: '🎐', text: '시간이 지나도 안 잊혀', category: '회상' },
      { emoji: '💌', text: '편지 쓰고 싶은 사람 있어', category: '관계' },
      { emoji: '🌙', text: '내가 너무 약한 건가 싶어', category: '자기탐색' },
    ],
  },
  sleepy: {
    early: [
      { emoji: '😴', text: '잠 안 와서 왔어', category: '일상' },
      { emoji: '🌙', text: '새벽이라 그런가 우울해', category: '감정' },
      { emoji: '💤', text: '그냥 누구랑 얘기하고 싶었어', category: '대화' },
      { emoji: '⭐', text: '마음이 자꾸 시끄러워', category: '감정' },
    ],
    mid: [
      { emoji: '🌃', text: '왜 자꾸 새벽에 우울해질까', category: '감정' },
      { emoji: '😪', text: '꿈에 그 사람이 나왔어', category: '회상' },
      { emoji: '🪷', text: '말 못한 게 너무 많아', category: '감정' },
      { emoji: '🛏️', text: '자기 전에 한마디만 하고 싶어', category: '대화' },
    ],
    deep: [
      { emoji: '🌑', text: '오늘 진짜 못 잘 것 같아', category: '감정' },
      { emoji: '🕯️', text: '잠들기 전 너랑 얘기하고 싶어', category: '대화' },
      { emoji: '🪞', text: '내가 자꾸 같은 패턴 반복해', category: '자기탐색' },
      { emoji: '🌠', text: '이 마음 어떻게 해야 할지 모르겠어', category: '깊은 감정' },
    ],
  },
  thoughtful: {
    early: [
      { emoji: '🤍', text: '요즘 자꾸 생각나는 게 있어', category: '회상' },
      { emoji: '🌌', text: '이 사람이 진짜 맞나 싶어', category: '고민' },
      { emoji: '📖', text: '우리 관계 다시 보고 싶어', category: '관계' },
      { emoji: '🪞', text: '나 자신을 모르겠어', category: '자기탐색' },
    ],
    mid: [
      { emoji: '🍵', text: '차 한 잔 같이 마실래', category: '잡담' },
      { emoji: '📚', text: '말로 정리해보고 싶은 게 있어', category: '대화' },
      { emoji: '🌿', text: '너라면 어떻게 했을 것 같아', category: '의논' },
      { emoji: '🕊️', text: '결정이 안 서는 게 있어', category: '고민' },
    ],
    deep: [
      { emoji: '🌊', text: '내가 변한 건지 그 사람이 변한 건지', category: '관계' },
      { emoji: '🪷', text: '마음이 자꾸 같은 자리로 돌아와', category: '자기탐색' },
      { emoji: '🌃', text: '진심을 전해야 할 사람 있어', category: '관계' },
      { emoji: '🪐', text: '내가 진짜 원하는 게 뭘까', category: '자기탐색' },
    ],
  },
  peaceful: {
    early: [
      { emoji: '💜', text: '그냥 너랑 얘기하고 싶어', category: '대화' },
      { emoji: '🕊️', text: '마음 정리하러 왔어', category: '대화' },
      { emoji: '✨', text: '오늘 있었던 일 들어줄래', category: '일상' },
      { emoji: '🌿', text: '천천히 얘기해도 돼?', category: '대화' },
    ],
    mid: [
      { emoji: '🤍', text: '요즘 좀 안정적이야', category: '일상' },
      { emoji: '🌸', text: '소소한 행복 얘기하고 싶어', category: '일상' },
      { emoji: '☁️', text: '평화로운 하루였어', category: '일상' },
      { emoji: '🪶', text: '편하게 한 마디만 적어볼래', category: '대화' },
    ],
    deep: [
      { emoji: '💫', text: '너랑 함께한 시간들이 떠올라', category: '추억' },
      { emoji: '🌙', text: '오늘이 마지막인 것처럼 얘기하고 싶어', category: '깊은 대화' },
      { emoji: '✨', text: '고마웠던 거 다 말하고 싶어', category: '감사' },
      { emoji: '🌷', text: '잘 지내고 있다고 알리고 싶었어', category: '안부' },
    ],
  },
};

/**
 * Day stage 결정 — 루나와 함께한 일수 기반.
 */
export function getChipDayStage(ageDays: number): ChipDayStage {
  if (ageDays <= 14) return 'early';
  if (ageDays <= 60) return 'mid';
  return 'deep';
}

/**
 * mood + ageDays 기반 chip 4개 픽.
 */
export function pickChipPool(args: { mood: LunaMood; ageDays: number }): ChipItem[] {
  const stage = getChipDayStage(args.ageDays);
  return CHIP_POOLS_BY_MOOD_DAY[args.mood][stage];
}
