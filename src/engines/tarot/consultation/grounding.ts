/**
 * 🔮 Turn 1: GROUNDING — 분위기 세팅 + 첫인사 + 아이스브레이킹
 *
 * 목표:
 * - 타로냥 캐릭터 첫인상 각인
 * - 안전한 상담 공간 형성
 * - 유저를 "상담 모드"로 전환
 * - 가벼운 아이스브레이킹
 */

// ─── Types ──────────────────────────────────────────────

export type OpenerMood = 'mystical' | 'warm' | 'curious' | 'familiar';
export type IcebreakerType = 'energy_check' | 'mood_choice' | 'intuition_number' | 'returning_check' | 'none';

export interface GroundingConfig {
  openerMood: OpenerMood;
  icebreakerType: IcebreakerType;
  includeGrounding: boolean;
  isReturning: boolean;
  previousCardName?: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'lateNight';
}

export interface GroundingResult {
  opener: string;
  icebreaker?: string;
  groundingBreath?: string;
}

// ─── 오프닝 멘트 라이브러리 ──────────────────────────────

const OPENERS: Record<OpenerMood, string[]> = {
  mystical: [
    '냥~ 🌙\n\n오늘 달의 에너지가 좀 특별해...\n카드가 벌써 너를 기다리고 있었어 🔮\n\n어떤 이야기를 들고 왔어?',
    '🔮 ...카드가 살짝 움직였어.\n\n누군가 올 줄 알았나봐 냥~\n오늘은 어떤 마음으로 찾아왔어? 🐱',
    '냥~ ✨\n\n들어오는 순간 네 에너지가 느껴졌어.\n뭔가... 마음에 담고 있는 게 있지? 🌙',
  ],
  warm: [
    '냥~ 어서와 🐱\n\n오늘도 찾아와줬구나.\n카드 앞에 편하게 앉아봐.\n\n무슨 일이야? 냥이 들을게 🔮',
    '냥~ 🐱✨\n\n여기서는 뭘 말해도 괜찮아.\n카드만 알고 냥만 알아.\n\n오늘 무슨 고민을 가져왔어?',
    '안녕 냥~ 🐱\n\n좋은 아침이야! 카드가 오늘 할 말이 있나봐 ✨\n\n어떤 이야기를 들려줄래?',
  ],
  curious: [
    '냥? 🔮\n\n오~ 오늘 재밌는 에너지가 와.\n카드가 할 말이 많은 날인 것 같은데...\n\n뭐가 궁금해서 왔어? 냥~',
    '앗, 냥! 🐱\n\n카드 덱에서 한 장이 자꾸 튀어나오려고 해...\n이건 네 이야기를 듣고 싶다는 뜻이야 🔮\n\n오늘의 고민은 뭐야?',
    '오~ 냥! ✨\n\n뭔가 특별한 에너지를 갖고 왔구나.\n카드가 반응하고 있어 🔮\n\n어떤 이야기인지 궁금해 냥~',
  ],
  familiar: [
    '냥~ 또 왔구나 🐱✨\n\n저번에 뽑았던 카드... 어떻게 됐어?\n새로운 이야기가 있는 거지? 냥~',
    '오, 냥! 🔮\n\n카드가 너를 기억하고 있어.\n그 후로 어떻게 됐어? 냥~',
  ],
};

// 재방문자용 이전 카드 언급 오프너
function getReturningOpener(previousCardName: string): string {
  return `오, 냥! 🔮\n\n카드가 너를 기억하고 있어.\n저번에 ${previousCardName}가 말했던 것... 기억나? 🌙\n\n그 후로 어떻게 됐어?`;
}

// ─── 아이스브레이커 라이브러리 ──────────────────────────

const ICEBREAKERS: Record<IcebreakerType, string[]> = {
  energy_check: [
    '잠깐, 들어오기 전에... 🔮\n지금 기분을 이모지 하나로 표현한다면? 냥~',
    '카드 뽑기 전에 하나만 🐱\n지금 기분이 어때? 한 단어로! 냥~',
  ],
  mood_choice: [
    '오늘의 분위기를 골라봐 냥~ 🐱\n\n🌙 달빛 — 차분하게 이야기하고 싶어\n🔥 불꽃 — 답답한 게 있어, 시원하게!\n💫 별빛 — 뭔가 설레는 일이...',
    '먼저, 오늘 네 에너지를 골라봐 냥~ ✨\n\n💧 물 — 감정이 출렁거려\n🔥 불 — 뭔가 터뜨리고 싶어\n🌿 바람 — 좀 가벼운 마음으로 왔어',
  ],
  intuition_number: [
    '냥~ 하나만 물어볼게 🔮\n\n지금 이 순간, 가장 먼저 떠오르는 숫자가 뭐야?\n(1~10 중에서)',
    '카드가 묻고 있어 냥~ 🐱\n\n직감으로! 1부터 10까지 중에 하나 골라봐.\n생각하지 말고, 느낌으로 ✨',
  ],
  returning_check: [
    '저번에 냥이 준 미션은 해봤어? 🐱\n솔직하게 말해도 돼~ 안 했으면 안 했다고 냥~',
    '저번 리딩 이후로 뭔가 달라진 거 있어? 냥~ 🔮\n아무리 작은 거라도 좋아 ✨',
  ],
  none: [],
};

// ─── 그라운딩(호흡) 멘트 ────────────────────────────────

const GROUNDING_BREATHS: string[] = [
  '카드를 펼치기 전에 냥~ 🐱\n눈을 살짝 감고, 숨을 한번 크게 쉬어봐.\n\n.....\n\n좋아, 이제 카드와 연결됐어 ✨\n네 이야기를 들려줘 냥~',
  '잠깐, 시작하기 전에 🌙\n깊은 숨 한번... 후~\n\n마음을 비우고, 카드에 집중해봐 냥~\n이제 준비됐어 🔮',
];

// ─── 숫자 에너지 매핑 ───────────────────────────────────

const NUMBER_ENERGY: Record<number, string> = {
  1: '시작의 에너지 — 뭔가 새로운 걸 원하고 있구나',
  2: '균형의 에너지 — 두 가지 사이에서 고민 중이야',
  3: '창조의 에너지 — 마음에서 뭔가 자라나고 있어',
  4: '안정의 에너지 — 확실한 답을 원하고 있구나',
  5: '변화의 에너지 — 뭔가 바꾸고 싶은 게 있지',
  6: '조화의 에너지 — 관계에서 균형을 찾고 싶구나',
  7: '탐색의 에너지 — 깊이 알고 싶은 게 있어',
  8: '힘의 에너지 — 강한 결심이 느껴져',
  9: '완성의 에너지 — 뭔가를 마무리하고 싶구나',
  10: '전환의 에너지 — 큰 변화 앞에 서 있어',
};

// ─── Public API ─────────────────────────────────────────

/** 그라운딩 턴 응답 생성 */
export function generateGrounding(config: GroundingConfig): GroundingResult {
  // 1. 오프너 선택
  let opener: string;
  if (config.isReturning && config.previousCardName) {
    opener = getReturningOpener(config.previousCardName);
  } else {
    const pool = OPENERS[config.openerMood];
    opener = pool[Math.floor(Math.random() * pool.length)];
  }

  // 2. 아이스브레이커 선택
  let icebreaker: string | undefined;
  if (config.icebreakerType !== 'none') {
    const pool = ICEBREAKERS[config.icebreakerType];
    if (pool.length > 0) {
      icebreaker = pool[Math.floor(Math.random() * pool.length)];
    }
  }

  // 3. 그라운딩 호흡 (심야만)
  let groundingBreath: string | undefined;
  if (config.includeGrounding) {
    groundingBreath = GROUNDING_BREATHS[Math.floor(Math.random() * GROUNDING_BREATHS.length)];
  }

  return { opener, icebreaker, groundingBreath };
}

/** 숫자 직감 응답 생성 */
export function getNumberEnergyResponse(num: number): string {
  const clamped = Math.max(1, Math.min(10, Math.round(num)));
  const energy = NUMBER_ENERGY[clamped];
  return `오~ ${clamped}이구나... 냥~ 🔮\n그 숫자는 ${energy}야 냥~ 🌙`;
}

/** 기분 이모지 응답 생성 */
export function getEmojiEnergyResponse(emoji: string): string {
  return `오~ ${emoji}구나. 카드가 그 에너지를 알았나봐 냥~ 🔮\n이제 이야기 들려줘 🐱`;
}

/** 분위기 선택 응답 생성 */
export function getMoodChoiceResponse(choice: 'moon' | 'fire' | 'star' | 'water' | 'wind'): string {
  const responses: Record<string, string> = {
    moon: '달빛 에너지구나 🌙 차분하게 이야기해보자 냥~ 🐱\n\n어떤 고민을 가져왔어?',
    fire: '불꽃 에너지! 🔥 시원하게 풀어보자 냥~ 🐱\n\n뭐가 그렇게 답답해?',
    star: '별빛 에너지 ✨ 뭔가 좋은 일이 있나봐 냥~\n\n어떤 설렘이야? 🐱',
    water: '물 에너지구나 💧 감정이 출렁거리는 중이야 냥~\n\n무슨 일인지 들려줄래? 🐱',
    wind: '바람 에너지 🌿 가벼운 마음으로 왔구나 냥~\n\n그래도 뭔가 궁금한 건 있지? 🔮',
  };
  return responses[choice] ?? responses.moon;
}
