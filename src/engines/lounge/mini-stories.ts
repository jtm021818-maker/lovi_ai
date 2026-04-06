/**
 * 📖 미니 스토리 — 하루 1개 서사가 진행됨
 * 아침 시작 → 저녁 결말, API 0회
 */

import type { EmotionalState } from './emotion-fsm';

export interface StoryBeat {
  hour: number;
  systemMessage?: string;
  dialogue: { speaker: 'luna' | 'tarot'; text: string }[];
  emotionEffect?: Partial<EmotionalState>;
}

export interface MiniStory {
  id: string;
  title: string;
  beats: StoryBeat[];
}

export const MINI_STORIES: MiniStory[] = [
  {
    id: 'new_deck', title: '타로냥의 새 카드 덱',
    beats: [
      { hour: 10, dialogue: [{ speaker: 'tarot', text: '...이 덱 진짜 예쁘다. 사야 하나...' }] },
      { hour: 13, dialogue: [
        { speaker: 'tarot', text: '루나, 이 카드 덱 봐봐. 한정판이래.' },
        { speaker: 'luna', text: '또 카드? 집에 몇 개야 ㅋㅋ' },
        { speaker: 'tarot', text: '...이건 다른 거야.' },
      ]},
      { hour: 15, systemMessage: '타로냥이 새 카드 덱을 주문했어요 📦', dialogue: [
        { speaker: 'tarot', text: '...눌러버렸다.' },
        { speaker: 'luna', text: '역시 ㅋㅋㅋ' },
      ]},
      { hour: 18, systemMessage: '새 카드 덱이 도착했어요! 📦✨', dialogue: [
        { speaker: 'tarot', text: '왔다!!! (포장 뜯으며 눈 반짝)' },
        { speaker: 'luna', text: '저거 봐... 완전 어린아이야 ㅋ' },
      ], emotionEffect: { valence: 0.5, arousal: 0.6 }},
      { hour: 20, dialogue: [
        { speaker: 'tarot', text: '이 카드 봐. 달빛 에디션이야. 밤에 더 잘 읽혀.' },
        { speaker: 'luna', text: '오 진짜 예쁘다!' },
        { speaker: 'tarot', text: '{name}도 나중에 이걸로 뽑아볼래?' },
      ]},
    ],
  },
  {
    id: 'cooking_fail', title: '루나의 요리 도전',
    beats: [
      { hour: 10, dialogue: [{ speaker: 'luna', text: '오늘 파스타 만들어볼까? 레시피 찾았거든!' }] },
      { hour: 12, systemMessage: '루나가 요리 중이에요... 🍳💨', dialogue: [
        { speaker: 'luna', text: '어... 이거 왜 이렇게 됐지?' },
        { speaker: 'tarot', text: '(냄새 맡으며) ...뭔가 타는 냄새가.' },
      ]},
      { hour: 13, dialogue: [
        { speaker: 'luna', text: '...망했어 ㅠ' },
        { speaker: 'tarot', text: '배달 시킬까?' },
        { speaker: 'luna', text: '그래... (쪼그리고 앉음)' },
      ], emotionEffect: { valence: -0.3, arousal: -0.1 }},
      { hour: 15, dialogue: [
        { speaker: 'luna', text: '다음엔 잘 할 수 있을 거야! (주먹 불끈)' },
        { speaker: 'tarot', text: '...응원할게. (작게) 다음엔 내가 주문할게.' },
      ], emotionEffect: { valence: 0.2, arousal: 0.1 }},
    ],
  },
  {
    id: 'argument', title: '작은 다툼',
    beats: [
      { hour: 11, dialogue: [
        { speaker: 'tarot', text: '루나, 내 카드 어디 갔어?' },
        { speaker: 'luna', text: '난 안 건드렸는데?' },
      ]},
      { hour: 14, dialogue: [
        { speaker: 'tarot', text: '...아직도 못 찾았어.' },
        { speaker: 'luna', text: '내가 안 건드렸다니까!' },
      ], emotionEffect: { valence: -0.3, arousal: 0.3 }},
      { hour: 17, dialogue: [
        { speaker: 'tarot', text: '...찾았다. 소파 밑에 있었어.' },
        { speaker: 'luna', text: '그것 봐! 내가 뭐랬어!' },
        { speaker: 'tarot', text: '...미안.' },
        { speaker: 'luna', text: '됐어 ㅋ 다음부턴 정리해.' },
      ], emotionEffect: { valence: 0.2, arousal: -0.1 }},
    ],
  },
  {
    id: 'rainy_day', title: '비 오는 날',
    beats: [
      { hour: 9, systemMessage: '오늘은 비가 오고 있어요 🌧️', dialogue: [
        { speaker: 'luna', text: '비다... 오늘은 집에서 쉬자~' },
      ]},
      { hour: 14, dialogue: [
        { speaker: 'tarot', text: '비 올 때 카드가 더 잘 읽혀.' },
        { speaker: 'luna', text: '차나 마시자~' },
      ]},
      { hour: 20, dialogue: [
        { speaker: 'luna', text: '{name}도 비 맞지 않았어? 감기 조심!' },
      ]},
    ],
  },
  {
    id: 'fortune', title: '타로냥의 점괘',
    beats: [
      { hour: 10, dialogue: [{ speaker: 'tarot', text: '오늘 아침에 카드 뽑았는데... 흥미로운 게 나왔어.' }] },
      { hour: 14, dialogue: [
        { speaker: 'tarot', text: '루나, 오늘 뭔가 좋은 일이 올 것 같아.' },
        { speaker: 'luna', text: '정말? 카드가 그랬어?' },
        { speaker: 'tarot', text: '태양 카드. 진짜 좋은 신호야.' },
      ]},
      { hour: 18, dialogue: [
        { speaker: 'tarot', text: '{name} 오늘 좋은 일 있었어? 카드가 그러더라고.' },
      ]},
    ],
  },
  {
    id: 'luna_nostalgia', title: '루나의 추억',
    beats: [
      { hour: 11, dialogue: [
        { speaker: 'luna', text: '오늘 옛날 사진 보다가 웃겼던 거 생각났어 ㅋ' },
      ]},
      { hour: 16, dialogue: [
        { speaker: 'luna', text: '타로냥, 우리 처음 만났을 때 기억나?' },
        { speaker: 'tarot', text: '...네가 나한테 "귀엽다"고 했잖아. 난 귀엽지 않거든.' },
        { speaker: 'luna', text: '지금도 귀여운데? ㅋ' },
        { speaker: 'tarot', text: '...(귀 접음)' },
      ], emotionEffect: { valence: 0.3, arousal: 0.1 }},
    ],
  },
  {
    id: 'tarot_insomnia', title: '타로냥의 불면',
    beats: [
      { hour: 22, dialogue: [
        { speaker: 'tarot', text: '...잠이 안 온다.' },
        { speaker: 'tarot', text: '카드나 좀 더 보자.' },
      ]},
      { hour: 23, dialogue: [
        { speaker: 'luna', text: '타로냥 아직 안 자? 내일도 있잖아.' },
        { speaker: 'tarot', text: '...좀만 더.' },
        { speaker: 'luna', text: '카드는 내일도 있어. 자자~' },
      ], emotionEffect: { valence: 0.1, arousal: -0.3 }},
    ],
  },
  {
    id: 'sunny_mood', title: '화창한 날',
    beats: [
      { hour: 9, systemMessage: '오늘 날씨가 정말 좋아요 ☀️', dialogue: [
        { speaker: 'luna', text: '날씨 좋다~! 기분 좋은 하루가 될 것 같아!' },
        { speaker: 'tarot', text: '...카드도 밝은 에너지야.' },
      ], emotionEffect: { valence: 0.3, arousal: 0.3 }},
      { hour: 15, dialogue: [
        { speaker: 'luna', text: '산책 가고 싶다~ {name}도 같이 가자!' },
      ]},
      { hour: 19, dialogue: [
        { speaker: 'tarot', text: '오늘 노을이 예쁘네. 사진 찍어둘까.' },
        { speaker: 'luna', text: '오 타로냥이 감성적이네? ㅋ' },
        { speaker: 'tarot', text: '...감성이 아니라 기록이야.' },
      ]},
    ],
  },
];

/** 시드 기반 오늘의 미니 스토리 선택 */
export function selectTodayStory(seed: number, userName: string): MiniStory {
  const idx = seed % MINI_STORIES.length;
  const story = MINI_STORIES[idx];
  // {name} 치환
  return {
    ...story,
    beats: story.beats.map(b => ({
      ...b,
      dialogue: b.dialogue.map(d => ({
        ...d,
        text: d.text.replace(/\{name\}/g, userName),
      })),
    })),
  };
}
