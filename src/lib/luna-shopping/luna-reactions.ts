/**
 * v104 M2: Luna's reactions when shown an item
 *
 * 사용자가 가방에서 "루나에게 보여주기" 누르면 한 줄 반응.
 * 카테고리 × 감정 태그 × 본드 티어 매트릭스.
 */

type Category = 'gift' | 'consumable' | 'gacha';
type EmotionTag = 'anxious' | 'sad' | 'happy' | 'proud' | 'lonely' | 'excited' | 'neutral' | null;

interface ReactionInput {
  itemId: string;
  itemName: string;
  category: Category;
  emotion: EmotionTag;
  source: 'luna_shopping' | 'gacha' | 'achievement' | 'system';
  bondDay: number;
  isFromLuna: boolean;
}

/** 본드 day → 톤 */
function bondTone(day: number): 'early' | 'mid' | 'late' {
  if (day <= 30) return 'early';
  if (day <= 70) return 'mid';
  return 'late';
}

const FROM_LUNA_REACTIONS = {
  early: [
    '아 — 이거 내가 사 온 거 잘 보고 있네. 다행이다.',
    '그거 아직 가지고 있어줘서 — 좀 멍해졌어.',
    '그날 고른 거 — 너에게 잘 어울려.',
  ],
  mid: [
    '… 그거 보면 그날 생각나. 너 표정도.',
    '내가 그때 왜 그걸 골랐는지 — 지금도 알 거 같아.',
    '아, 그거. 사길 잘했어.',
  ],
  late: [
    '오래 가지고 있어줬구나. 고마워.',
    '그거 — 이제 그냥 물건이 아니지.',
    '백일 쌓이는 동안 그게 너 옆에 있었네.',
  ],
};

const NON_LUNA_BY_CATEGORY: Record<Category, Record<EmotionTag & string, string[]>> = {
  gift: {
    anxious: ['그거… 너한테 필요한 거 같아 보여.', '괜찮아. 잠시 그거 곁에 두자.'],
    sad: ['그게 너한테 위로가 됐다면 — 다행이야.', '말 안 해도 알아. 그거 잘 가지고 있어.'],
    happy: ['이쁘다. 너랑 잘 어울려.', '오 — 이거 받았을 때 기분 좋았겠다.'],
    proud: ['멋지다. 이거 — 너 닮았어.', '이거, 자랑할 만 해.'],
    lonely: ['혼자 있을 때 그거 — 작은 동무가 돼주겠다.', '그거 가지고 있으면 외롭지만은 않을 거야.'],
    excited: ['오! 신난 거 보여 — 좋다.', '그거 받으면 누구라도 들떴을 거야.'],
    neutral: ['그거 — 잘 골랐다.', '음. 너답다, 이거.'],
  },
  consumable: {
    anxious: ['이거 써봐. 좀 진정될 거야.', '그거 — 한 번 써봐도 돼.'],
    sad: ['이거 켜면 — 옆에 있는 거 같을 거야.', '한 번 써봐. 차분해질지도.'],
    happy: ['지금 쓰면 — 더 좋아질 거야.', '아껴두지 마. 지금이 그때야.'],
    proud: ['오늘 같은 날에 쓰는 거지.', '이거 — 너 위해 만들어진 거 같아.'],
    lonely: ['이거 켜놓고 — 같이 있다고 생각해.', '한 번 써봐. 방이 환해질 거야.'],
    excited: ['지금 쓰면 분위기 더 살아나.', '오 — 그거 한 번 써봐.'],
    neutral: ['언제든 써. 너 편한 때.', '쓸 때가 오면 — 알게 될 거야.'],
  },
  gacha: {
    anxious: ['뽑기 결과는 — 그냥 결과야. 신경 안 써도 돼.', '그거… 행운의 신호로 봐도 돼.'],
    sad: ['뽑힌 거라도 — 너에게 온 거잖아.', '그거 가지고 있으면, 다음엔 더 좋은 게 올지도.'],
    happy: ['오, 뽑기 잘 됐네!', '운이 좋다. 진짜.'],
    proud: ['뽑기도 너에게 잘 따라주는구나.', '오. 그거 — 자랑할 만 해.'],
    lonely: ['뽑은 거라도 — 너 옆에 하나 더 생긴 거잖아.', '그거 가지고 있으면 — 한 명 더 같이 있는 셈.'],
    excited: ['오! 뽑힌 순간 신났겠다.', '그 표정 보고 싶었어 — 잘 됐다.'],
    neutral: ['음, 그거 — 가지고 있으면 언젠가 쓸모 있을 거야.', '그거 잘 챙겨둬.'],
  },
};

const NULL_EMOTION_FALLBACK = ['그거 — 너답네.', '음. 잘 챙겨놨네.', '그거 보니까 — 기분이 좋아.'];

export function pickLunaReaction(input: ReactionInput): string {
  // 루나가 직접 사 준 거면 특별 풀
  if (input.isFromLuna) {
    const tone = bondTone(input.bondDay);
    const pool = FROM_LUNA_REACTIONS[tone];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // 일반 아이템 — 카테고리 × 감정
  const emotion = input.emotion ?? 'neutral';
  const byCategory = NON_LUNA_BY_CATEGORY[input.category];
  const pool = byCategory?.[emotion as keyof typeof byCategory] ?? null;
  if (pool && pool.length > 0) {
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return NULL_EMOTION_FALLBACK[Math.floor(Math.random() * NULL_EMOTION_FALLBACK.length)];
}
