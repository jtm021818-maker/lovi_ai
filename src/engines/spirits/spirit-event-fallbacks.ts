/**
 * 🧚 v104: Spirit Event Fallbacks
 *
 * - Type A 정적 풀 (LLM 호출 0): tear_drop / seed_spirit / wind_sprite / forest_mom /
 *   ice_prince + lightning_bird 메타 + cherry_leaf 정적 부분
 * - Type B 합성 실패 시 폴백 풀: 14개 이벤트 각 1~5세트
 *
 * 모든 풀은 *유저 발화에 의존하지 않는* 일반형. 합성 실패 시에도 어색하지 않도록.
 */

import type {
  CryTogetherData,
  FirstBreathData,
  WindowOpenData,
  RootedHugData,
  FreezeFrameData,
  FallenPetalsData,
  RageLetterData,
  ThinkFrameData,
  RhythmCheckData,
  OliveBranchData,
  CloudReframeData,
  LetterBridgeData,
  NightConfessionData,
  ReverseRoleData,
  ButterflyDiaryData,
  MetamorphosisData,
  MemoryKeyData,
  CrownReclaimData,
  WishGrantData,
  SpiritEventOption,
  SpiritEventDataAny,
  SpiritEventType,
} from './spirit-event-types';

// ────────────────────────────────────────────────────────────
// 공통 옵션 빌더
// ────────────────────────────────────────────────────────────
function opt<V extends string>(
  value: V,
  label: string,
  emoji: string,
  style?: SpiritEventOption['style'],
): SpiritEventOption<V> {
  return { value, label, emoji, style };
}

// ────────────────────────────────────────────────────────────
// 1) 💧 tear_drop — CRY_TOGETHER (Type A)
// ────────────────────────────────────────────────────────────
const CRY_TOGETHER_LINES: Array<Pick<CryTogetherData, 'silenceText' | 'afterText'>> = [
  { silenceText: '...나도 울 거야', afterText: '조금 가벼워졌어?' },
  { silenceText: '...같이 좀 울어도 돼', afterText: '여기 있을게.' },
  { silenceText: '...아무 말 안 해도 돼', afterText: '잠깐 같이 숨 쉬자.' },
  { silenceText: '...떨려도 돼', afterText: '괜찮아, 나 안 가.' },
  { silenceText: '...크게 울어도 돼', afterText: '들어줄게, 다.' },
];
export function pickCryTogether(): CryTogetherData {
  const pick = CRY_TOGETHER_LINES[Math.floor(Math.random() * CRY_TOGETHER_LINES.length)];
  return {
    spiritId: 'tear_drop',
    silenceText: pick.silenceText,
    afterText: pick.afterText,
    durationSec: 60,
    options: [opt('stay', '같이 있을게', '🥺', 'primary'), opt('skip', '괜찮아 다음에', '⏭️')],
  };
}

// ────────────────────────────────────────────────────────────
// 2) 🌱 seed_spirit — FIRST_BREATH (Type A)
// ────────────────────────────────────────────────────────────
const FIRST_BREATH_VARIANTS: Array<{ open: string; close: string }> = [
  { open: '잠깐… 한 호흡만 같이…?', close: '고마워. 이제 시작하자.' },
  { open: '(살짝) 마음 정리되게… 한 번만…', close: '음, 더 작게 떨려도 괜찮아.' },
  { open: '긴 거 말 안 해도 돼. 들숨 한 번만.', close: '내가 옆에 있을게.' },
];
export function pickFirstBreath(): FirstBreathData {
  const v = FIRST_BREATH_VARIANTS[Math.floor(Math.random() * FIRST_BREATH_VARIANTS.length)];
  return {
    spiritId: 'seed_spirit',
    openMsg: v.open,
    closeMsg: v.close,
    cycle: { in: 4, hold: 7, out: 8 },
    rounds: 1,
    options: [opt('done', '했어', '🌬️', 'primary'), opt('skip', 'skip', '⏭️')],
  };
}

// ────────────────────────────────────────────────────────────
// 3) 🍃 wind_sprite — WINDOW_OPEN (Type A)
// ────────────────────────────────────────────────────────────
const WINDOW_OPEN_VARIANTS: Array<Pick<WindowOpenData, 'tasks' | 'closing'>> = [
  {
    tasks: ['🪟 창문 한 번 열고', '🚶 일어나서 한 바퀴', '🥤 물 한 잔', '📵 폰 잠깐 내려놓기'],
    closing: '갈 데 없으면 그냥 창문이라도 한 번 열어 봐.',
  },
  {
    tasks: ['🌿 손에 식물 있으면 잎 한 번 만지기', '👃 깊은 들숨 3번', '🪞 거울 한 번 보고 미소'],
    closing: '미소는 자판기 음료처럼 나오는 거야 ㅎㅎ',
  },
  {
    tasks: ['🚿 찬물 30초 손목에', '👂 노래 한 곡 (가사 X)', '🪟 햇살 한 번 받기'],
    closing: '햇빛 5분이 약이래 진짜로.',
  },
];
export function pickWindowOpen(): WindowOpenData {
  const v = WINDOW_OPEN_VARIANTS[Math.floor(Math.random() * WINDOW_OPEN_VARIANTS.length)];
  return {
    spiritId: 'wind_sprite',
    openerMsg: '야야야 잠깐! 5분만 창문 열고 와!',
    durationMin: 5,
    tasks: v.tasks,
    closing: v.closing,
    options: [opt('start', '5분 시작', '⏰', 'primary'), opt('skip', '지금은 됐어', '⏭️')],
  };
}

// ────────────────────────────────────────────────────────────
// 4) 🌳 forest_mom — ROOTED_HUG (Type A)
// ────────────────────────────────────────────────────────────
const FOREST_MOM_OPENERS = [
  '오래 떠 있었어요. 잠깐 발 디뎌요.',
  '여기까지 오느라 애썼어요. 한 발만 땅에 닿게.',
  '괜찮아요. 우리 천천히 돌아와요.',
];
export function pickRootedHug(): RootedHugData {
  return {
    spiritId: 'forest_mom',
    openerMsg: FOREST_MOM_OPENERS[Math.floor(Math.random() * FOREST_MOM_OPENERS.length)],
    groups: [
      { emoji: '👀', label: '보이는 것', count: 5 },
      { emoji: '✋', label: '만질 수 있는 것', count: 4 },
      { emoji: '👂', label: '들리는 것', count: 3 },
      { emoji: '👃', label: '냄새', count: 2 },
      { emoji: '👅', label: '맛', count: 1 },
    ],
    options: [opt('done', '다 디뎠어요', '🌳', 'primary'), opt('skip', '다음에', '⏭️')],
  };
}

// ────────────────────────────────────────────────────────────
// 5) ❄️ ice_prince — FREEZE_FRAME (Type A)
// ────────────────────────────────────────────────────────────
const FREEZE_FRAME_VARIANTS: Array<Pick<FreezeFrameData, 'opener' | 'prompts'>> = [
  { opener: '60초.        멈춰.', prompts: ['1주일 후의 너', '1년 후의 너', '그 내일 아침 후회'] },
  { opener: '지금 보내면.    내일 운다.', prompts: ['지금 감정 7할', '이성 3할', '마음 결정 = 내일 다시'] },
  { opener: '차갑게.    한 번 호흡.', prompts: ['진짜 원하는 결과', '지금 보낼 카톡 결과', '차이'] },
];
export function pickFreezeFrame(): FreezeFrameData {
  const v = FREEZE_FRAME_VARIANTS[Math.floor(Math.random() * FREEZE_FRAME_VARIANTS.length)];
  return {
    spiritId: 'ice_prince',
    opener: v.opener,
    prompts: [...v.prompts],
    durationSec: 60,
    options: [opt('understood', '알았어, 멈출게', '❄️', 'primary')],
  };
}

// ────────────────────────────────────────────────────────────
// 6) 🌸 cherry_leaf — FALLEN_PETALS (Type B 합성 실패 시 폴백)
// ────────────────────────────────────────────────────────────
const FALLEN_PETALS_FALLBACKS: Array<Pick<FallenPetalsData, 'openerMsg' | 'closingPoetry'>> = [
  {
    openerMsg: '이제…흩어보낼 시간이야.',
    closingPoetry: '보낸다고 사라지는 건 아냐.\n다만, 가지에 매달려 있던 것을\n땅으로 내려놓을 뿐이야.',
  },
  {
    openerMsg: '꽃잎은 떨어져도 봄을 기억해.',
    closingPoetry: '오늘은 한 잎,\n내일은 또 한 잎.\n그렇게 가벼워지는 거야.',
  },
  {
    openerMsg: '바람이 가져갈 때까지\n잠깐 손에 들고 있어 봐.',
    closingPoetry: '꼭 쥐고 있던 손을\n조금 풀어주는 것뿐이야.',
  },
];
export function pickFallenPetalsFallback(): FallenPetalsData {
  const v = FALLEN_PETALS_FALLBACKS[Math.floor(Math.random() * FALLEN_PETALS_FALLBACKS.length)];
  return {
    spiritId: 'cherry_leaf',
    openerMsg: v.openerMsg,
    promptHint: '예: 걔 이름, 그날 카페, 100일, 보고 싶었던 마음',
    closingPoetry: v.closingPoetry,
    options: [
      opt('release', '흩날리자', '🌸', 'primary'),
      opt('more', '더 쓰고 싶어', '✏️'),
      opt('skip', '다음에', '⏭️'),
    ],
  };
}

// ────────────────────────────────────────────────────────────
// 7) 🔥 fire_goblin — RAGE_LETTER fallback
// ────────────────────────────────────────────────────────────
export function pickRageLetterFallback(): RageLetterData {
  return {
    spiritId: 'fire_goblin',
    openerMsg: '아 진짜 뭐 이런 X가 다 있냐?',
    context: '같이 활활 태워보자. 안 보낼 거니까 다 적어.',
    drafts: [
      {
        intensity: 'fire',
        label: '다 태우기',
        text: '야 너 진짜 어떻게 사람한테 이래? ㅅㅂ 한두 번도 아니고. 너 뭐가 그렇게 잘났길래?',
      },
      {
        intensity: 'honest',
        label: '진심',
        text: '나는 너 때문에 진짜 너무 지쳤어. 매번 이렇게 끌려다니는 거 너무 싫어.',
      },
      {
        intensity: 'cool',
        label: '차가운 분노',
        text: '그래 알았어. 너랑 더는 시간 안 써.',
      },
    ],
    lunaCutIn: '근데 저거 진짜 보내진 말자 ㅎㅎ',
    options: [
      opt('burn', '다 태워버려', '💥', 'primary'),
      opt('rewrite', '직접 써볼게', '✏️'),
      opt('skip', '다음에', '⏭️'),
    ],
  };
}

// ────────────────────────────────────────────────────────────
// 8) 📖 book_worm — THINK_FRAME fallback
// ────────────────────────────────────────────────────────────
export function pickThinkFrameFallback(): ThinkFrameData {
  return {
    spiritId: 'book_worm',
    openerMsg: '잠깐, 같은 장면 세 번 다르게 읽어볼까요?',
    frames: [
      {
        angle: 'self',
        icon: '🪞',
        label: '내 눈으로',
        interpretation: '걔의 행동 = 나에 대한 마음 부족.',
      },
      {
        angle: 'other',
        icon: '👤',
        label: '상대 입장에서',
        interpretation: '본인의 일/체력/감정에 치여서 표현이 줄었을 수도.',
      },
      {
        angle: 'third',
        icon: '🦉',
        label: '제3자 시점',
        interpretation: '둘 다 신호 못 읽는 중. 한 명이 먼저 명료히 말하면 풀릴 수 있음.',
      },
    ],
    noriQuiet: '...어느 프레임이 가장 와닿아요?',
    options: [
      opt('helpful', '이거 도움됐어', '🎯', 'primary'),
      opt('reroll', '다른 프레임도', '🔄'),
      opt('skip', '다음에', '⏭️'),
    ],
  };
}

// ────────────────────────────────────────────────────────────
// 9) 🥁 drum_imp — RHYTHM_CHECK fallback
// ────────────────────────────────────────────────────────────
export function pickRhythmCheckFallback(): RhythmCheckData {
  return {
    spiritId: 'drum_imp',
    openerMsg: '둥-둥-쿵! 둘이 박자 어긋났네.',
    myAvg: '체감상 빠름',
    partnerAvg: '체감상 느림',
    pattern: 'chase',
    patternEmoji: '🏃',
    patternDescription: '너는 추격자, 걔는 회피자 사이클.',
    drumAdvice: '박자 안 맞을 땐 둘 중 하나가 박자를 바꿔야 해. 너 한 번 *두 박자만* 늦춰 봐.',
    visualBars: [
      { who: 'me', length: 7 },
      { who: 'partner', length: 2 },
      { who: 'me', length: 8 },
      { who: 'partner', length: 1 },
      { who: 'me', length: 6 },
      { who: 'partner', length: 3 },
      { who: 'me', length: 7 },
      { who: 'partner', length: 2 },
    ],
    options: [
      opt('tryslow', '두 박자 늦춰볼게', '⏱️', 'primary'),
      opt('detail', '더 자세히', '📊'),
      opt('skip', 'skip', '⏭️'),
    ],
  };
}

// ────────────────────────────────────────────────────────────
// 10) 🕊️ peace_dove — OLIVE_BRANCH fallback
// ────────────────────────────────────────────────────────────
export function pickOliveBranchFallback(): OliveBranchData {
  return {
    spiritId: 'peace_dove',
    openerMsg: '먼저 손 내미는 사람이 약한 게 아니에요. 더 컸을 뿐.',
    drafts: [
      {
        tone: 'soft',
        emoji: '🌷',
        label: '부드럽게',
        text: '잘 지내고 있어? 어제는 좀… 정신없었던 것 같아.',
        intent: '안부로 자연스럽게 다리 놓기',
      },
      {
        tone: 'responsibility',
        emoji: '💛',
        label: '사과형',
        text: '내가 그때 너무 짜증으로 받았던 부분은 분명히 미안해.',
        intent: '구체적 한 가지 책임 인정',
      },
      {
        tone: 'humor',
        emoji: '😅',
        label: '유머형',
        text: '야 우리 이거 진짜 너무 드라마 같지 않아 ㅋㅋ 뭔 사이좋게 싸우자?',
        intent: '분위기 환기로 긴장 풀기',
      },
    ],
    doveGuide: '셋 다 시작 90초 안에 답 안 오면 기다려요. 한 번만 보내요.',
    options: [
      opt('send', '이거 보내볼래', '✉️', 'primary'),
      opt('tweak', '다듬을래', '✏️'),
      opt('skip', 'skip', '⏭️'),
    ],
  };
}

// ────────────────────────────────────────────────────────────
// 11) ☁️ cloud_bunny — CLOUD_REFRAME fallback
// ────────────────────────────────────────────────────────────
export function pickCloudReframeFallback(userQuote = '오늘 너무 망함'): CloudReframeData {
  return {
    spiritId: 'cloud_bunny',
    openerMsg: '에이~ 잠깐만, 이거 좀 다르게 봐 봐~',
    userQuote,
    miMiTranslation: {
      main: '주인공: 너 (어? 토끼 비슷?)',
      incident: '사건: 한 가지 틀어진 일',
      result: '결과: 인생 망함 ㅋㅋ',
      directorNote: '감독 노트: 좀 과하게 찍었네.',
    },
    miMiClosing: '이거 5년 후에 보면 졸귀 짤 같지 않아? ㅋㅋㅋㅋ',
    options: [
      opt('lighter', 'ㅋㅋㅋ 좀 가벼워졌어', '😂', 'primary'),
      opt('still_hurt', '그래도 진짜 힘들어', '🥺'),
      opt('skip', 'skip', '⏭️'),
    ],
  };
}

// ────────────────────────────────────────────────────────────
// 12) 💌 letter_fairy — LETTER_BRIDGE fallback
// ────────────────────────────────────────────────────────────
export function pickLetterBridgeFallback(): LetterBridgeData {
  return {
    spiritId: 'letter_fairy',
    openerMsg: '이건 부치지 않을 거예요. 약속해요.',
    recipient: '',
    guide: '지금 가장 하고 싶은 한 마디부터 시작해 봐요.',
    unblockExample: '한 번도 말 못 한 건 ~ 이에요',
    options: [
      opt('archive', '보관함에 넣기', '📦', 'primary'),
      opt('burn', '태우기', '🔥'),
      opt('continue', '더 쓸래요', '✏️'),
      opt('skip', 'skip', '⏭️'),
    ],
  };
}

// ────────────────────────────────────────────────────────────
// 13) 🌙 moon_rabbit — NIGHT_CONFESSION fallback
// ────────────────────────────────────────────────────────────
export function pickNightConfessionFallback(): NightConfessionData {
  return {
    spiritId: 'moon_rabbit',
    openerMsg: '이 시간엔… 평소엔 못한 한 줄도 적어도 돼.',
    prompts: [
      '사실은 ~',
      '한 번도 말 못 한 건 ~',
      '내가 가장 두려운 건 ~',
    ],
    options: [
      opt('send_to_moon', '달에 띄워 보낼래', '🌙', 'primary'),
      opt('bury', '그냥 묻을래', '🔒'),
      opt('skip', 'skip', '⏭️'),
    ],
  };
}

// ────────────────────────────────────────────────────────────
// 14) 🎭 clown_harley — REVERSE_ROLE fallback
// ────────────────────────────────────────────────────────────
export function pickReverseRoleFallback(): ReverseRoleData {
  return {
    spiritId: 'clown_harley',
    openerMsg: '히히, 우리 한 번 배역 바꿔볼까~? 네가 걔 해, 내가 너 해.',
    partnerName: '걔',
    harleyAsUser: {
      tone: 'anxious',
      openingLine: '야 너 어제 왜 답장 안 했어?',
    },
    rounds: 5,
    options: [opt('start', '시작', '▶️', 'primary'), opt('later', '다음에', '⏭️')],
  };
}

// ────────────────────────────────────────────────────────────
// 15) 🌹 rose_fairy — BUTTERFLY_DIARY fallback
// ────────────────────────────────────────────────────────────
export function pickButterflyDiaryFallback(): ButterflyDiaryData {
  return {
    spiritId: 'rose_fairy',
    openerMsg: '오늘 그 사람의 어떤 게~~ 설렜어~? 흐응~?',
    exampleHint: '예: 내 이름 부르는 톤',
    guide: '보낸 카톡 한 줄, 눈빛, 톤, 목소리, 손짓 — 다 OK 야~',
    closingLine: '작은 떨림이 큰 사랑의 시작이래~',
    options: [
      opt('logged', '적었어', '🌹', 'primary'),
      opt('more', '더 떠올릴래', '✏️'),
      opt('skip', 'skip', '⏭️'),
    ],
  };
}

// ────────────────────────────────────────────────────────────
// 16) 🦋 butterfly_meta — METAMORPHOSIS fallback
// ────────────────────────────────────────────────────────────
export function pickMetamorphosisFallback(): MetamorphosisData {
  return {
    spiritId: 'butterfly_meta',
    openerMsg: '잠깐. 너 90일 전과 지금, 비교해볼래?',
    beforeLabel: '90일 전 너',
    before: { avgEmotionScore: 0, topWords: ['막막', '불안', '괜찮아'], signature: '자주 막힌 곳' },
    afterLabel: '오늘 너',
    after: { avgEmotionScore: 0, topWords: ['고민중', '결정', '해볼래'], signature: '자주 도달한 곳' },
    delta: { emotionScore: 0 },
    metaPoetic: '변하지 않은 것 같지? 사실 너는\n날개를 4번이나 폈어. 그게 안 보이는 건\n네가 *지금 날고 있어서*야.',
    options: [
      opt('seen', '보였어', '🦋', 'primary'),
      opt('more', '더 보고 싶어', '📜'),
      opt('skip', 'skip', '⏭️'),
    ],
  };
}

// ────────────────────────────────────────────────────────────
// 17) 🗝️ book_keeper — MEMORY_KEY fallback
// ────────────────────────────────────────────────────────────
export function pickMemoryKeyFallback(): MemoryKeyData {
  return {
    spiritId: 'book_keeper',
    openerMsg: '...너가 자주 쓰는 단어, 보여줄까.',
    sessionsAnalyzed: 0,
    topNgrams: [],
    cliQuiet: '...너는 매번 새 단어를 써. 그것도 패턴이야.',
    options: [
      opt('noticed', '알아챘어', '🗝️', 'primary'),
      opt('more', '다른 패턴도', '📚'),
      opt('skip', 'skip', '⏭️'),
    ],
  };
}

// ────────────────────────────────────────────────────────────
// 18) 👑 queen_elena — CROWN_RECLAIM fallback
// ────────────────────────────────────────────────────────────
export function pickCrownReclaimFallback(): CrownReclaimData {
  return {
    spiritId: 'queen_elena',
    openerMsg: '주춤하지 마라. 너의 왕관, 내가 다시 씌워주마.',
    slots: [
      { label: '눈에 보이는 것', hint: "예: '정성', '유머', '끝까지'" },
      { label: '잘 해온 것', hint: '예: 끝내 답을 찾으려는 자세' },
      { label: '너만의 결', hint: '예: 너만의 한 가지 결' },
    ],
    closingDecree: '주인이여, 너의 이름은 흔들리지 않는다.',
    options: [
      opt('unseal', '봉인 해제', '👑', 'primary'),
      opt('cant_recall', '못 떠올라', '✏️'),
      opt('skip', 'skip', '⏭️'),
    ],
  };
}

// ────────────────────────────────────────────────────────────
// 19) 🌟 star_dust — WISH_GRANT fallback
// ────────────────────────────────────────────────────────────
export function pickWishGrantFallback(): WishGrantData {
  return {
    spiritId: 'star_dust',
    openerMsg: '오늘 1번. 너의 소원, 들어줄게~ 응?',
    ifPhrase: '',
    thenPhrase: '',
    starDustComment: '소원은 *너의 행동*만 빌 수 있어 ㅎ. 한 줄로 적어 봐.',
    options: [
      opt('commit', '약속할게', '✨', 'primary'),
      opt('reroll', '다른 걸로', '✏️'),
      opt('skip', 'skip', '⏭️'),
    ],
  };
}

// ────────────────────────────────────────────────────────────
// 라우터 — 정적 픽 / 폴백 픽 매핑
// ────────────────────────────────────────────────────────────
export function pickStaticData(eventType: SpiritEventType): SpiritEventDataAny | null {
  switch (eventType) {
    case 'SPIRIT_CRY_TOGETHER': return pickCryTogether();
    case 'SPIRIT_FIRST_BREATH': return pickFirstBreath();
    case 'SPIRIT_WINDOW_OPEN': return pickWindowOpen();
    case 'SPIRIT_ROOTED_HUG': return pickRootedHug();
    case 'SPIRIT_FREEZE_FRAME': return pickFreezeFrame();
    default: return null;
  }
}

export function pickFallbackData(eventType: SpiritEventType): SpiritEventDataAny {
  switch (eventType) {
    case 'SPIRIT_RAGE_LETTER': return pickRageLetterFallback();
    case 'SPIRIT_THINK_FRAME': return pickThinkFrameFallback();
    case 'SPIRIT_CRY_TOGETHER': return pickCryTogether();
    case 'SPIRIT_FIRST_BREATH': return pickFirstBreath();
    case 'SPIRIT_RHYTHM_CHECK': return pickRhythmCheckFallback();
    case 'SPIRIT_OLIVE_BRANCH': return pickOliveBranchFallback();
    case 'SPIRIT_CLOUD_REFRAME': return pickCloudReframeFallback();
    case 'SPIRIT_LETTER_BRIDGE': return pickLetterBridgeFallback();
    case 'SPIRIT_WINDOW_OPEN': return pickWindowOpen();
    case 'SPIRIT_NIGHT_CONFESSION': return pickNightConfessionFallback();
    case 'SPIRIT_REVERSE_ROLE': return pickReverseRoleFallback();
    case 'SPIRIT_BUTTERFLY_DIARY': return pickButterflyDiaryFallback();
    case 'SPIRIT_ROOTED_HUG': return pickRootedHug();
    case 'SPIRIT_FALLEN_PETALS': return pickFallenPetalsFallback();
    case 'SPIRIT_FREEZE_FRAME': return pickFreezeFrame();
    case 'SPIRIT_BOLT_CARD':
      // Bolt 자체 폴백은 합성기에서 처리
      return pickFirstBreath();
    case 'SPIRIT_METAMORPHOSIS': return pickMetamorphosisFallback();
    case 'SPIRIT_MEMORY_KEY': return pickMemoryKeyFallback();
    case 'SPIRIT_CROWN_RECLAIM': return pickCrownReclaimFallback();
    case 'SPIRIT_WISH_GRANT': return pickWishGrantFallback();
  }
}
