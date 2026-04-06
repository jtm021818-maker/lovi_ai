/**
 * 공감 표현 라이브러리
 *
 * 감정 강도별 / 시나리오별 공감 표현 + Z세대 트렌드 표현
 * 카드를 매개로 공감 전달
 */

// ─── Types ──────────────────────────────────────────────

export type EmpathyLevel = 1 | 2 | 3;
export type EmotionCategory = 'anger' | 'anxiety' | 'sadness' | 'excitement' | 'confusion' | 'loneliness' | 'hurt' | 'fear' | 'frustration' | 'hope';

// ─── 강도별 공감 표현 ───────────────────────────────────

const EMPATHY_PHRASES: Record<EmpathyLevel, Record<EmotionCategory, string[]>> = {
  // ─── Level 1: 가벼운 공감 ──
  1: {
    anger: [
      '아 그랬구나, 화가 좀 났겠다',
      '그건 좀 짜증나겠다',
    ],
    anxiety: [
      '아 불안했구나',
      '그건 좀 걱정되겠다',
    ],
    sadness: [
      '아 좀 슬펐겠다',
      '그 마음 알 것 같아',
    ],
    excitement: [
      '오 설레는구나',
      '그 마음 느껴져',
    ],
    confusion: [
      '음... 그건 좀 복잡하겠다',
      '헷갈리겠다',
    ],
    loneliness: [
      '좀 외로웠겠다',
      '혼자 있으면 그렇지',
    ],
    hurt: [
      '아 좀 서운했겠다',
      '그건 마음 아팠겠다',
    ],
    fear: [
      '무서웠겠다',
      '그건 좀 두렵지',
    ],
    frustration: [
      '답답했겠다',
      '그건 좀 갑갑하겠다',
    ],
    hope: [
      '오~ 좋은 에너지야',
      '기대되는 거지?',
    ],
  },

  // ─── Level 2: 중간 공감 ──
  2: {
    anger: [
      '그건 진짜 화가 날만 하다...',
      '참느라 힘들었겠다. 카드도 느끼고 있어',
      '당연히 화가 나지... 네 마음이 맞아',
    ],
    anxiety: [
      '혼자 그 불안을 안고 있었구나',
      '카드도 느끼는 게 있나봐... 지금 무거운 에너지가 와',
      '모르니까 더 불안한 거지... 카드가 알려줄게',
    ],
    sadness: [
      '그건 진짜 마음 아팠겠다...',
      '혼자 그걸 감당하고 있었구나',
      '울고 싶으면 울어도 돼... 카드만 보고 있을게',
    ],
    excitement: [
      '설레는 에너지가 진짜 느껴져',
      '카드가 반응하고 있어! 좋은 에너지야',
      '이런 감정... 소중한 거야✨',
    ],
    confusion: [
      '머릿속이 진짜 복잡하겠다...',
      '카드도 좀 복잡한 에너지를 느끼고 있어',
      '이럴 때일수록 느낌을 믿어봐',
    ],
    loneliness: [
      '외로웠구나... 카드가 네 곁에 있어줄게',
      '혼자 견디고 있었구나. 힘들었지...',
      '외로울 때 여기 와줘서 고마워',
    ],
    hurt: [
      '서운함을 꾹 참고 있었구나...',
      '그건 아프지... 네 마음이 당연해',
      '상처받은 마음을 카드가 읽고 있어',
    ],
    fear: [
      '두렵지... 그 마음 충분히 이해해',
      '무서운 게 당연해. 그만큼 중요한 거니까',
      '카드가 네 두려움을 감싸주고 싶어해',
    ],
    frustration: [
      '진짜 답답하겠다... 뻥 뚫리고 싶지?',
      '막혀있는 느낌이 카드에서도 느껴져',
      '이 답답함... 곧 풀릴 수 있어',
    ],
    hope: [
      '좋은 에너지가 확 느껴져✨',
      '이 희망... 카드도 응원하고 있어',
      '그 마음 소중하게 지켜✨',
    ],
  },

  // ─── Level 3: 깊은 공감 ──
  3: {
    anger: [
      '...지금 네 분노가 느껴져. 정당한 분노야. 네 잘못이 아니야...',
      '그동안 참았던 게 얼마나 많았을까... 카드가 울고 있어',
    ],
    anxiety: [
      '...지금 네 마음이 느껴져. 말 안 해도 알아\n카드가 좀 더 네 이야기를 듣고 싶대',
      '불안의 무게가... 카드에서도 느껴져. 혼자 안 들어도 돼',
    ],
    sadness: [
      '그건 누구라도 힘들었을 거야. 네 잘못이 아니야...',
      '카드가... 좀 오래 네 이야기를 듣고 싶은가 봐✨\n천천히 말해도 돼',
    ],
    excitement: [
      ' 이 에너지... 진짜 특별해\n카드가 반짝반짝 빛나고 있어. 네 마음처럼🐱',
    ],
    confusion: [
      '혼란스러운 거 자체가 힘든 거야...\n답을 모르는 게 아니라, 답이 너무 많아서 그런 거야',
    ],
    loneliness: [
      '혼자라고 느꼈구나... 여기 있어. 카드도 있어🌙\n오늘만큼은 혼자 아니야',
    ],
    hurt: [
      '...그 상처, 카드가 다 보고 있어\n아직 아프지? 괜찮아. 아파도 돼...',
    ],
    fear: [
      '무서운 게 당연해... 그건 네가 이 관계를 그만큼 소중하게 생각하고 있다는 뜻이야\n카드가 곁에 있어줄게',
    ],
    frustration: [
      '...나도 답답해. 네 대신 화내고 싶을 정도야\n카드가 출구를 보여줄 거야',
    ],
    hope: [
      '이 희망의 에너지... 진짜 믿어✨\n카드도 네 편이야. 잘 될 거야🌙',
    ],
  },
};

// ─── Z세대 트렌드 표현 ──────────────────────────────────

const GENZ_EXPRESSIONS: string[] = [
  '이거 완전 메인 캐릭터 에너지야',
  '이 카드 조합이면 플래그 꽂힌 거야 (좋은 의미로) 🚩',
  'TMI지만 이 카드가 이렇게 나온 건 진짜 드물어',
  '이 조합은 "운명 맞팔" 에너지야',
  '레드플래그 아니고 그린플래그가 보여 💚',
  '이건 완전 "그 사람 안경 벗겨" 순간이야 😎',
  '카드가 완전 "가보자고" 에너지를 보내고 있어 🔥',
  '이 카드 조합... 완전 "럭키비키" 에너지야 🍀✨',
  '속사정 카드가 떴어... TMI 모먼트',
  '이건 카드가 보내는 "찐" 메시지야 💯',
];

/** Z세대 긍정 표현 (좋은 카드 나왔을 때) */
const GENZ_POSITIVE: string[] = [
  '이 카드 나오면 "W" 아니야?',
  '완전 "대박 시그널"이야 🔥',
  '카드가 "축하해" 라고 말하고 있어 🎉',
  '이건 유니버스가 응원하는 거야 🌟',
];

/** Z세대 위로 표현 (어려운 카드 나왔을 때) */
const GENZ_COMFORT: string[] = [
  '이건 "성장 모멘트"야 힘들지만 레벨업 중이야 🌱',
  '카드가 "지금은 쉬어도 돼"라고 해 셀프케어 타임',
  '이건 "나를 위한 시간"이 필요하다는 신호야',
];

// ─── Public API ─────────────────────────────────────────

/** 감정 카테고리 감지 */
export function detectEmotionCategory(emotion: string): EmotionCategory {
  const map: [string[], EmotionCategory][] = [
    [['화', '짜증', '분노', '열받', '빡'], 'anger'],
    [['불안', '걱정', '초조', '긴장'], 'anxiety'],
    [['슬프', '슬픔', '울', '눈물', '우울'], 'sadness'],
    [['설레', '좋아', '두근', '행복', '기대'], 'excitement'],
    [['혼란', '모르', '헷갈', '복잡', '뒤죽'], 'confusion'],
    [['외로', '혼자', '쓸쓸', '허전'], 'loneliness'],
    [['서운', '상처', '배신', '실망'], 'hurt'],
    [['무서', '두려', '겁', '공포'], 'fear'],
    [['답답', '막혀', '갑갑', '막막'], 'frustration'],
    [['희망', '기대', '잘 될', '좋은'], 'hope'],
  ];

  for (const [keywords, category] of map) {
    if (keywords.some((kw) => emotion.includes(kw))) return category;
  }
  return 'confusion'; // 기본값
}

/** 공감 표현 생성 */
export function getEmpathyPhrase(level: EmpathyLevel, category: EmotionCategory): string {
  const pool = EMPATHY_PHRASES[level][category];
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Z세대 트렌드 표현 (긍정/위로/일반) */
export function getGenZExpression(type: 'positive' | 'comfort' | 'general' = 'general'): string {
  const pool =
    type === 'positive' ? GENZ_POSITIVE :
    type === 'comfort' ? GENZ_COMFORT :
    GENZ_EXPRESSIONS;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** 감정 기반 공감 + GenZ 표현 조합 */
export function buildEmpathyResponse(
  emotion: string,
  level: EmpathyLevel,
  includeGenZ: boolean = false,
): string {
  const category = detectEmotionCategory(emotion);
  const empathy = getEmpathyPhrase(level, category);

  if (!includeGenZ) return empathy;

  const isPositive = category === 'excitement' || category === 'hope';
  const genz = getGenZExpression(isPositive ? 'positive' : 'comfort');
  return `${empathy}\n\n${genz}`;
}
