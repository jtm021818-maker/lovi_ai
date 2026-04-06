/**
 * 🎪 NPC 이벤트 풀 — 랜덤 이벤트 70+
 * 시드 기반으로 매 시간 이벤트 발생 (API 0회)
 */

import type { EmotionalState } from './emotion-fsm';
import { seededRandom } from './seeded-random';

export interface NpcEvent {
  id: string;
  character: 'luna' | 'tarot' | 'both';
  systemMessage: string;
  dialogue: { speaker: 'luna' | 'tarot'; text: string }[];
  emotionEffect?: Partial<EmotionalState>;
  validHours?: number[];
}

// ─── 루나 이벤트 ────────────────────────────────────────

const LUNA_EVENTS: NpcEvent[] = [
  { id: 'luna_baking', character: 'luna', systemMessage: '루나가 쿠키를 굽고 있어요 🍪',
    dialogue: [{ speaker: 'luna', text: '초코칩 쿠키 구워봤어~ 먹을래?' }],
    emotionEffect: { valence: 0.3, arousal: 0.2 }, validHours: [10, 11, 14, 15, 16] },
  { id: 'luna_reading', character: 'luna', systemMessage: '루나가 책에서 재밌는 걸 발견했어요 📖',
    dialogue: [{ speaker: 'luna', text: '이거 봐! "사람은 좋아하는 사람 앞에서 무의식적으로 자세를 따라한대"' }],
    emotionEffect: { valence: 0.2, arousal: 0.3 }, validHours: [9, 10, 11, 14, 15, 20, 21] },
  { id: 'luna_worry', character: 'luna', systemMessage: '',
    dialogue: [{ speaker: 'luna', text: '...(조용히 창밖을 보며) {name} 요즘 괜찮은 건지 걱정돼...' }],
    emotionEffect: { valence: -0.2, arousal: -0.1 }, validHours: [19, 20, 21, 22] },
  { id: 'luna_stretch', character: 'luna', systemMessage: '루나가 스트레칭하고 있어요 🧘',
    dialogue: [{ speaker: 'luna', text: '앉아만 있으니까 몸이 뻣뻣해~ 같이 스트레칭 할래?' }],
    emotionEffect: { valence: 0.1, arousal: 0.3 }, validHours: [9, 10, 15, 16] },
  { id: 'luna_daydream', character: 'luna', systemMessage: '',
    dialogue: [{ speaker: 'luna', text: '가끔 생각해... 내가 진짜 여우면 어떨까? ㅋ 숲에서 살면서 상담해주고...' }],
    emotionEffect: { valence: 0.2, arousal: -0.2 }, validHours: [14, 15, 20, 21] },
  { id: 'luna_music', character: 'luna', systemMessage: '루나가 노래를 흥얼거리고 있어요 🎵',
    dialogue: [{ speaker: 'luna', text: '🎵 흥~ 이 노래 좋다~' }],
    emotionEffect: { valence: 0.3, arousal: 0.1 }, validHours: [9, 10, 11, 16, 17, 18] },
  { id: 'luna_tea', character: 'luna', systemMessage: '루나가 차를 끓이고 있어요 🍵',
    dialogue: [{ speaker: 'luna', text: '캐모마일 끓였어~ 한 잔 할래?' }],
    emotionEffect: { valence: 0.2, arousal: -0.1 }, validHours: [10, 15, 20, 21] },
  { id: 'luna_cleaning', character: 'luna', systemMessage: '루나가 정리하고 있어요 🧹',
    dialogue: [{ speaker: 'luna', text: '타로냥 카드가 또 여기저기... (한숨) 정리 좀 해야겠다.' }],
    emotionEffect: { valence: -0.1, arousal: 0.2 }, validHours: [9, 10, 14, 15] },
  { id: 'luna_photo', character: 'luna', systemMessage: '',
    dialogue: [{ speaker: 'luna', text: '창밖에 노을이 예쁘다... 사진 찍어야지 📸' }],
    emotionEffect: { valence: 0.3, arousal: 0.1 }, validHours: [18, 19] },
  { id: 'luna_diary', character: 'luna', systemMessage: '루나가 일기를 쓰고 있어요 📔',
    dialogue: [{ speaker: 'luna', text: '오늘 하루도 기록해둬야지... {name}이랑 이야기한 것도.' }],
    emotionEffect: { valence: 0.1, arousal: -0.2 }, validHours: [21, 22] },
];

// ─── 타로냥 이벤트 ──────────────────────────────────────

const TAROT_EVENTS: NpcEvent[] = [
  { id: 'tarot_energy', character: 'tarot', systemMessage: '타로냥이 카드에서 뭔가 발견했어요 🔮',
    dialogue: [{ speaker: 'tarot', text: '...이 카드, 오늘 유독 에너지가 강해. {name}한테 보여줘야겠다.' }],
    emotionEffect: { valence: 0.3, arousal: 0.4 }, validHours: [10, 11, 16, 17, 20, 21] },
  { id: 'tarot_nap', character: 'tarot', systemMessage: '타로냥이 카드 위에서 낮잠 자고 있어요 😺💤',
    dialogue: [{ speaker: 'tarot', text: 'zzz... (꼬리만 살짝 흔들림)' }],
    emotionEffect: { valence: 0.1, arousal: -0.8 }, validHours: [12, 13, 14] },
  { id: 'tarot_trick', character: 'tarot', systemMessage: '타로냥이 카드 트릭 연습 중이에요 🃏',
    dialogue: [{ speaker: 'tarot', text: '(카드를 공중에 날려 잡으며) ...완벽해.' }],
    emotionEffect: { valence: 0.2, arousal: 0.4 }, validHours: [10, 11, 15, 16, 17] },
  { id: 'tarot_moon', character: 'tarot', systemMessage: '',
    dialogue: [{ speaker: 'tarot', text: '...오늘 달이 예쁘다. 달의 카드가 떠오르네.' }],
    emotionEffect: { valence: 0.2, arousal: -0.3 }, validHours: [20, 21, 22, 23] },
  { id: 'tarot_mysterious', character: 'tarot', systemMessage: '',
    dialogue: [{ speaker: 'tarot', text: '...이상해. 카드가 자꾸 같은 걸 보여줘. 뭔가 변화가 올 것 같아.' }],
    emotionEffect: { valence: 0, arousal: 0.3 } },
  { id: 'tarot_collection', character: 'tarot', systemMessage: '타로냥이 카드 컬렉션을 정리하고 있어요 🃏',
    dialogue: [{ speaker: 'tarot', text: '지금 덱이 3개인데... 하나 더 살까. 루나가 뭐라 하겠지만.' }],
    emotionEffect: { valence: 0.2, arousal: 0.1 }, validHours: [10, 11, 14, 15, 16] },
  { id: 'tarot_hungry', character: 'tarot', systemMessage: '',
    dialogue: [{ speaker: 'tarot', text: '...배고프다. 루나 밥 안 주나.' }],
    emotionEffect: { valence: -0.2, arousal: 0.1 }, validHours: [12, 13, 18, 19] },
  { id: 'tarot_star_gaze', character: 'tarot', systemMessage: '타로냥이 별을 보고 있어요 ⭐',
    dialogue: [{ speaker: 'tarot', text: '별이 많은 날엔 카드가 더 잘 읽혀. {name}도 와서 같이 봐.' }],
    emotionEffect: { valence: 0.3, arousal: -0.2 }, validHours: [21, 22, 23] },
  { id: 'tarot_grumpy', character: 'tarot', systemMessage: '',
    dialogue: [{ speaker: 'tarot', text: '...(불만족스러운 표정으로 카드 뒤적)' }],
    emotionEffect: { valence: -0.2, arousal: 0.1 }, validHours: [14, 15] },
  { id: 'tarot_yarn', character: 'tarot', systemMessage: '타로냥이 실뭉치를 발견했어요 🧶',
    dialogue: [{ speaker: 'tarot', text: '...이건 카드가 아니라 (실뭉치 톡톡) ...재밌다.' }],
    emotionEffect: { valence: 0.3, arousal: 0.3 }, validHours: [10, 11, 15, 16] },
];

// ─── 공동 이벤트 ────────────────────────────────────────

const BOTH_EVENTS: NpcEvent[] = [
  { id: 'both_scold', character: 'both', systemMessage: '',
    dialogue: [
      { speaker: 'luna', text: '타로냥! 또 소파에서 카드 흘렸잖아!' },
      { speaker: 'tarot', text: '...카드는 자유로운 존재야.' },
      { speaker: 'luna', text: '정리 좀 해! ㅋㅋ' },
    ], emotionEffect: { valence: -0.1, arousal: 0.3 } },
  { id: 'both_tea', character: 'both', systemMessage: '',
    dialogue: [
      { speaker: 'luna', text: '타로냥 차 마실래? 캐모마일인데.' },
      { speaker: 'tarot', text: '...고양이한테 차를?' },
      { speaker: 'luna', text: '맛있는데! 한번 마셔봐.' },
      { speaker: 'tarot', text: '(한 모금) ...나쁘지 않네.' },
    ], emotionEffect: { valence: 0.2, arousal: 0.1 }, validHours: [10, 11, 15, 16, 20, 21] },
  { id: 'both_tease', character: 'both', systemMessage: '',
    dialogue: [
      { speaker: 'tarot', text: '루나, 너 오늘 뭐 했어? 책만 읽었지?' },
      { speaker: 'luna', text: '뭐 어때! 너는 맨날 카드만 만지잖아.' },
      { speaker: 'tarot', text: '카드는 세계의 진리를 담고 있거든.' },
      { speaker: 'luna', text: '...그래그래 ㅋㅋ' },
    ], emotionEffect: { valence: 0.1, arousal: 0.2 } },
  { id: 'both_gift', character: 'both', systemMessage: '',
    dialogue: [
      { speaker: 'tarot', text: '(뭔가 슬쩍 내밀며) ...이거.' },
      { speaker: 'luna', text: '뭐야? 카드? 나한테?' },
      { speaker: 'tarot', text: '별의 카드. 네가 좋아할 것 같아서.' },
      { speaker: 'luna', text: '고마워 타로냥! (감동)' },
      { speaker: 'tarot', text: '...별거 아니야. (시선 회피)' },
    ], emotionEffect: { valence: 0.4, arousal: 0.1 }, validHours: [18, 19, 20] },
  { id: 'both_user_worry', character: 'both', systemMessage: '',
    dialogue: [
      { speaker: 'luna', text: '{name} 요즘 좀 힘들어 보이지 않아?' },
      { speaker: 'tarot', text: '카드도 비슷한 걸 보여줬어. 좀 걱정돼.' },
      { speaker: 'luna', text: '다음에 오면 편하게 이야기할 수 있게 해줘야겠다.' },
    ], emotionEffect: { valence: -0.1, arousal: 0.1 }, validHours: [17, 18, 19, 20, 21] },
  { id: 'both_laugh', character: 'both', systemMessage: '',
    dialogue: [
      { speaker: 'luna', text: 'ㅋㅋㅋ 타로냥 방금 표정 뭐야' },
      { speaker: 'tarot', text: '...뭐가?' },
      { speaker: 'luna', text: '카드 뒤집다가 놀랐잖아 ㅋㅋ' },
      { speaker: 'tarot', text: '...안 놀랐어. (귀 접으며)' },
    ], emotionEffect: { valence: 0.3, arousal: 0.3 } },
];

// ─── Public API ─────────────────────────────────────────

const ALL_EVENTS = { luna: LUNA_EVENTS, tarot: TAROT_EVENTS, both: BOTH_EVENTS };

/** 시드 + 시간 → 이벤트 발생 (API 0회) */
export function getHourlyEvent(
  seed: number,
  hour: number,
  character: 'luna' | 'tarot',
  userName: string,
): NpcEvent | null {
  const offset = character === 'tarot' ? 100 : 0;
  const rand = seededRandom(seed, hour + offset);

  // 40% 확률로 개인 이벤트
  if (rand < 0.4) {
    const pool = ALL_EVENTS[character];
    const valid = pool.filter(e => !e.validHours || e.validHours.includes(hour));
    if (valid.length === 0) return null;
    const picked = valid[Math.floor(rand * 2.5 * valid.length) % valid.length];
    return fillName(picked, userName);
  }

  // 15% 확률로 공동 이벤트
  if (rand < 0.55) {
    const pool = ALL_EVENTS.both;
    const valid = pool.filter(e => !e.validHours || e.validHours.includes(hour));
    if (valid.length === 0) return null;
    const picked = valid[Math.floor(rand * 3.3 * valid.length) % valid.length];
    return fillName(picked, userName);
  }

  return null; // 45% 확률로 이벤트 없음
}

function fillName(event: NpcEvent, name: string): NpcEvent {
  return {
    ...event,
    dialogue: event.dialogue.map(d => ({
      ...d,
      text: d.text.replace(/\{name\}/g, name),
    })),
  };
}
