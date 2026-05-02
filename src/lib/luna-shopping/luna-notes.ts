/**
 * v104: Luna Note Templates
 *
 * 외출 후 선물에 붙이는 한 줄 카드 — 감정 태그별 풀.
 * Kakao 선물하기 패턴: 마음을 전달하는 톤.
 */

import type { EmotionTag } from './shopping-engine';

const NOTE_POOLS: Record<EmotionTag, string[]> = {
  anxious: [
    '요즘 좀 힘들어 보여서… 이거 맡으면 좀 나아질까 해서.',
    '한 숨 돌릴 시간이 필요할 것 같아서 골랐어.',
    '잠깐 멈출 핑계가 됐으면 해서.',
    '오늘은 어깨를 좀 내려놔도 되겠어.',
  ],
  sad: [
    '오늘 네 생각이 자꾸 나서 발이 거기로 갔어.',
    '말 안 해도 알아 — 그래서 사왔어.',
    '울어도 돼. 그치만 이거 하나 들고 울자.',
    '슬픈 날엔 이런 작은 거라도 손에 쥐고 있어줘.',
  ],
  happy: [
    '표정이 밝길래 나도 덩달아 기분이 좋았어.',
    '같이 웃을 핑계 하나.',
    '이거 보면 너 더 좋아할 것 같아서.',
    '너 좋아할 만한 거 발견해서 바로 사왔어.',
  ],
  proud: [
    '네가 해낸 거 — 진짜 대단했어.',
    '오늘은 너에게 작은 트로피.',
    '내가 보고 있어. 잊지 마.',
    '오늘의 너에게 어울리는 거 같아서.',
  ],
  lonely: [
    '혼자 있을 때 — 옆에 있다고 생각해줘.',
    '너만 알아도 되는 한 개.',
    '말 안 걸어도 곁에 있을게.',
    '이거 가지고 있으면 — 한 명은 늘 너를 생각하는 거야.',
  ],
  excited: [
    '두근거림 채운 김에 뭐라도 사왔어.',
    '오늘 같은 날엔 뭐든 어울려.',
    '같이 흔들자.',
    '신난 김에 — 너랑 나누고 싶어서.',
  ],
  neutral: [
    '지나가다가 너 생각이 났어.',
    '특별한 이유는 없어 — 그냥 보고 골랐어.',
    '오늘 한 마디 없는 선물.',
    '딱히 이유 없이 — 그게 더 진짜.',
  ],
};

export function pickLunaNote(emotion: EmotionTag): string {
  const pool = NOTE_POOLS[emotion] ?? NOTE_POOLS.neutral;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * 사용자 최근 세션 요약/감정에서 우세 태그 추출.
 * v104 M1: 키워드 매칭 단순 휴리스틱. M2 에서 ACE 감정 직접 사용.
 */
export function extractEmotionTag(
  recentSummaries: Array<{ summary: string | null; emotion?: string | null }>,
): EmotionTag {
  if (recentSummaries.length === 0) return 'neutral';

  const counts: Record<EmotionTag, number> = {
    anxious: 0, sad: 0, happy: 0, proud: 0, lonely: 0, excited: 0, neutral: 0,
  };

  const KEYWORD_MAP: Array<[RegExp, EmotionTag]> = [
    [/불안|걱정|초조|두려|무서|긴장/, 'anxious'],
    [/슬프|울|눈물|상실|이별|외로운|허전/, 'sad'],
    [/외로|혼자|고독|쓸쓸/, 'lonely'],
    [/기쁘|행복|좋아|웃|환|즐거/, 'happy'],
    [/뿌듯|자랑|성취|해냈|이겨|극복/, 'proud'],
    [/설레|두근|신나|기대|벅차/, 'excited'],
  ];

  for (const s of recentSummaries) {
    const text = `${s.summary ?? ''} ${s.emotion ?? ''}`;
    for (const [re, tag] of KEYWORD_MAP) {
      if (re.test(text)) counts[tag] += 1;
    }
  }

  let best: EmotionTag = 'neutral';
  let max = 0;
  for (const k of Object.keys(counts) as EmotionTag[]) {
    if (counts[k] > max) {
      max = counts[k];
      best = k;
    }
  }
  return max === 0 ? 'neutral' : best;
}
