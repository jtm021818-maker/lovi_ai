/**
 * 🔮 Turn 2-3: INTAKE — 고민 청취 + 감정 탐색 + 관계 역학 파악
 *
 * Turn 2 (INTAKE_1): 핵심 고민 파악 + 표면 감정 캡처 + 공감 응답
 * Turn 3 (INTAKE_2): 심층 감정 탐색 + 관계 역학 + 콜드리딩 준비
 */

import type { RelationshipScenario } from '@/types/engine.types';

// ─── Types ──────────────────────────────────────────────

export type Intake1Strategy = 'emotion_first' | 'situation_zoom' | 'intuition_hook';
export type Intake2Strategy = 'emotion_layering' | 'feeling_thermometer' | 'somatic_check';

export interface Intake1Config {
  strategy: Intake1Strategy;
  empathyLevel: 1 | 2 | 3;
  offerChoices: boolean;
  detectedScenario?: RelationshipScenario;
}

export interface Intake2Config {
  strategy: Intake2Strategy;
  includeRelationDynamic: boolean;
  includeAttachmentProbe: boolean;
  previousEmotion?: string;
}

// ─── 시나리오 감지 키워드 ────────────────────────────────

const SCENARIO_KEYWORDS: Record<string, { keywords: string[]; scenario: RelationshipScenario }> = {
  unrequited: {
    keywords: ['짝사랑', '좋아하는 사람', '고백', '마음을 전', '단짝', '몰래 좋아'],
    scenario: 'UNREQUITED_LOVE' as RelationshipScenario,
  },
  reconnection: {
    keywords: ['재회', '다시 만나', '헤어진', '전 남친', '전 여친', '전남친', '전여친', '다시 연락', '돌아오'],
    scenario: 'RECONNECTION' as RelationshipScenario,
  },
  firstMeeting: {
    keywords: ['썸', '새로운 사람', '처음 만난', '소개팅', '매칭', '앱에서', '관심있는'],
    scenario: 'FIRST_MEETING' as RelationshipScenario,
  },
  ghosting: {
    keywords: ['연락 안', '잠수', '고스팅', '안 읽', '무시', '차단'],
    scenario: 'GHOSTING' as RelationshipScenario,
  },
  readIgnored: {
    keywords: ['읽씹', '읽고 씹', '읽고 무시', '읽었는데'],
    scenario: 'READ_AND_IGNORED' as RelationshipScenario,
  },
  boredom: {
    keywords: ['권태기', '지루', '감정이 식', '예전 같지', '설레지 않', '무덤덤'],
    scenario: 'BOREDOM' as RelationshipScenario,
  },
  breakup: {
    keywords: ['헤어질까', '이별', '끝내', '그만하고', '관계 정리', '이별 고민'],
    scenario: 'BREAKUP_CONTEMPLATION' as RelationshipScenario,
  },
  jealousy: {
    keywords: ['질투', '의심', '불안해서', '다른 여자', '다른 남자', '바람'],
    scenario: 'JEALOUSY' as RelationshipScenario,
  },
  commitmentFear: {
    keywords: ['회피', '도망', '무서워', '가까워지면', '부담', '약속이 두려'],
    scenario: 'COMMITMENT_FEAR' as RelationshipScenario,
  },
  pace: {
    keywords: ['진도', '속도', '너무 빠르', '너무 느리', '고백 타이밍', '언제'],
    scenario: 'RELATIONSHIP_PACE' as RelationshipScenario,
  },
};

/** 유저 메시지에서 시나리오 감지 */
export function detectScenario(message: string): { scenario: RelationshipScenario; confidence: number } | null {
  let bestMatch: { scenario: RelationshipScenario; confidence: number } | null = null;
  let maxScore = 0;

  for (const entry of Object.values(SCENARIO_KEYWORDS)) {
    const matchCount = entry.keywords.filter((kw) => message.includes(kw)).length;
    if (matchCount > 0) {
      const confidence = Math.min(0.5 + matchCount * 0.2, 1.0);
      if (confidence > maxScore) {
        maxScore = confidence;
        bestMatch = { scenario: entry.scenario, confidence };
      }
    }
  }

  return bestMatch;
}

// ─── INTAKE_1 감정 탐색 질문 ─────────────────────────────

/** 시나리오별 감정 확인 질문 */
const SCENARIO_EMOTION_QUESTIONS: Record<string, string[]> = {
  UNREQUITED_LOVE: [
    '그 사람 생각하면 설레는 쪽이야, 아니면 답답한 쪽이 더 커? 냥~',
    '혹시... 그 마음을 얼마나 오래 품고 있었어? 🌙',
    '제일 힘든 건 "모르는 것"이야, 아니면 "알면서도 못하는 것"이야? 냥~',
  ],
  RECONNECTION: [
    '그 사람이 보고 싶은 거야, 아니면 그때로 돌아가고 싶은 거야? 냥~',
    '헤어진 후에... 제일 많이 생각나는 순간이 뭐야? 🌙',
    '재회하면 뭐가 달라질 것 같아? 솔직하게 냥~',
  ],
  FIRST_MEETING: [
    '이 썸... 설레는 쪽이야 답답한 쪽이야? 냥~ ✨',
    '그 사람이랑 대화할 때 느낌이 어때? 편해? 긴장돼?',
    '이 관계에서 제일 궁금한 거 딱 하나만 말해봐 🔮',
  ],
  GHOSTING: [
    '지금 화가 나? 아니면 불안해? 그것도 아니면 포기한 느낌? 냥~',
    '연락 끊긴 지 얼마나 됐어? 🌙',
    '기다리는 게 더 힘들어, 아니면 모르는 게 더 힘들어? 냥~',
  ],
  READ_AND_IGNORED: [
    '읽씹 당하면... 화가 더 나? 아니면 불안한 쪽이 더 커? 냥~',
    '혹시 내가 뭘 잘못했나 싶은 생각도 들어? 🌙',
    '읽씹 전에 분위기가 어땠어? 냥~',
  ],
  BOREDOM: [
    '사랑이 식은 건지, 아니면 지친 건지... 어느 쪽이야? 냥~',
    '언제부터 이런 느낌이 들었어? 🌙',
    '솔직히... 헤어지고 싶은 마음도 있어? 판단 안 해, 냥~ 🐱',
  ],
  BREAKUP_CONTEMPLATION: [
    '이별을 생각하면 마음이 어때? 시원? 아니면 무서워? 냥~',
    '이 생각을 한 게 어제오늘이 아니지? 🌙',
    '가장 두려운 게 뭐야? 후회? 혼자? 아니면 다른 거? 냥~',
  ],
  JEALOUSY: [
    '지금 질투심이 더 커? 아니면 배신감이 더 커? 냥~',
    '그 질투의 시작점이 뭐였어? 🌙',
    '솔직히... 내가 부족한 것 같은 느낌도 있어? 판단 안 해 냥~',
  ],
  COMMITMENT_FEAR: [
    '가까워지는 게 좋은데 동시에 무서운 거야? 냥~',
    '혹시 이전 연애에서 비슷한 느낌 받은 적 있어? 🌙',
    '제일 두려운 게 뭐야? 구속? 실망? 아니면 다른 거? 냥~',
  ],
  RELATIONSHIP_PACE: [
    '이 관계가 너무 빠른 거야, 너무 느린 거야? 냥~',
    '네가 원하는 속도가 있어? 🌙',
    '상대가 어떻게 반응하고 있어? 냥~',
  ],
  GENERAL: [
    '지금 마음이 어때? 한 단어로 표현한다면? 냥~',
    '제일 마음에 걸리는 게 뭐야? 🌙',
    '카드한테 제일 묻고 싶은 거 하나만 말해봐 냥~ 🔮',
  ],
};

/** INTAKE_1 감정 탐색 질문 가져오기 */
export function getIntake1Question(scenario: string): string {
  const questions = SCENARIO_EMOTION_QUESTIONS[scenario] ?? SCENARIO_EMOTION_QUESTIONS.GENERAL;
  return questions[Math.floor(Math.random() * questions.length)];
}

// ─── INTAKE_1 응답 전략 ──────────────────────────────────

/** Emotion-First 응답: 유저가 상황을 길게 설명한 경우 */
export function buildEmotionFirstResponse(
  _userMessage: string,
  empathyLevel: 1 | 2 | 3,
  scenario: string,
): string {
  const empathy = getEmpathyPhrase(empathyLevel);
  const question = getIntake1Question(scenario);
  return `${empathy}\n\n${question}`;
}

/** Situation-Zoom 응답: 유저가 짧거나 모호한 경우 */
export function buildSituationZoomResponse(_scenario: string): string {
  const intro = '냥~ 카드가 더 정확하게 읽으려면 조금만 더 알려줄래? 🔮\n어떤 부분이 제일 힘들어?\n';
  const choices =
    '💬 연락/대화가 안 돼서\n💔 마음이 예전 같지 않아서\n⚡ 특별한 사건이 있었어서\n🤔 잘 모르겠지만 그냥 힘들어서';
  return `${intro}\n${choices}`;
}

/** Intuition-Hook 응답: 유저가 질문형으로 온 경우 */
export function buildIntuitionHookResponse(scenario: string): string {
  const hooks: Record<string, string> = {
    UNREQUITED_LOVE:
      '냥~ 짝사랑 에너지가 느껴져 🔮\n\n근데 잠깐, 카드 뽑기 전에 하나만 물어볼게.\n지금 그 사람이 너를 좋아한다고 하면...\n네 마음은 어때?\n\n설레? 아니면 오히려 무서워? 냥~ 🌙',
    RECONNECTION:
      '냥~ 재회의 에너지가 느껴져 🔮\n\n근데 잠깐, 하나만 물어볼게.\n다시 만나면 정말 행복할 것 같아?\n아니면... 확인하고 싶은 거야? 냥~ 🌙',
    GENERAL:
      '냥~ 궁금한 게 있구나 🔮\n\n카드 뽑기 전에 하나만!\n그 질문의 답을 알면... 뭐가 달라질 것 같아? 냥~ 🌙',
  };
  return hooks[scenario] ?? hooks.GENERAL;
}

// ─── 공감 표현 라이브러리 ────────────────────────────────

function getEmpathyPhrase(level: 1 | 2 | 3): string {
  const phrases: Record<number, string[]> = {
    1: [
      '아 그랬구나 냥~',
      '그 마음 알 것 같아 🐱',
      '음... 그건 좀 복잡하겠다 냥',
    ],
    2: [
      '그건 진짜 마음 아팠겠다 냥...',
      '혼자 그걸 감당하고 있었구나 🌙',
      '카드도 느끼는 게 있나봐... 지금 무거운 에너지가 와 🔮',
    ],
    3: [
      '...냥은 지금 네 마음이 느껴져. 말 안 해도 알아 🐱',
      '그건 누구라도 힘들었을 거야. 네 잘못이 아니야 냥...',
      '카드가... 좀 오래 네 이야기를 듣고 싶은가 봐 🌙✨',
    ],
  };
  const pool = phrases[level];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── INTAKE_2 심층 감정 탐색 ─────────────────────────────

/** 감정 레이어링 질문 */
export function getEmotionLayeringQuestion(surfaceEmotion: string): string {
  const layering: Record<string, string> = {
    '화': '화... 그래, 당연히 화가 나지 냥.\n\n근데 잠깐, 그 화 밑에 뭐가 있는지 같이 봐볼까? 🌙\n보통 화 밑에는...\n\n💧 서운함 — "나는 이렇게 신경 쓰는데..."\n💔 상처 — "내가 중요하지 않은 것 같아서..."\n😰 두려움 — "이대로 끝나면 어쩌지..."\n\n혹시 이 중에 하나 찔리는 거 있어? 냥~',
    '불안': '불안하구나 냥... 🌙\n\n그 불안 밑에 뭐가 있을까?\n\n💔 버림받을까 봐 — "나를 떠날까 봐..."\n🤔 모르니까 — "상대 마음을 모르니까..."\n😰 자신없어서 — "내가 충분하지 않은 것 같아서..."\n\n뭐가 제일 가까워? 냥~',
    '슬픔': '슬프구나... 🌙 괜찮아, 냥이 있어.\n\n그 슬픔이 어디서 오는 건지 같이 봐볼까?\n\n💧 그리움 — 그 사람이 보고 싶어서\n💔 상실감 — 뭔가를 잃은 것 같아서\n😢 무력감 — 내가 할 수 있는 게 없어서\n\n어느 쪽이야? 냥~',
    '혼란': '혼란스럽구나 냥... 🌙\n\n머릿속이 엉켜있을 때는 하나씩 풀어야 해.\n\n🔀 마음이 왔다갔다 — 좋았다 싫었다\n❓ 상대가 읽히지 않아 — 뭘 원하는지 모르겠어\n🤯 내 마음을 모르겠어 — 내가 뭘 원하는지도\n\n어디가 제일 엉켜있어? 냥~',
  };

  // 부분 매칭
  for (const [key, response] of Object.entries(layering)) {
    if (surfaceEmotion.includes(key)) return response;
  }

  // 기본 레이어링
  return `${surfaceEmotion}이구나... 냥 🌙\n\n그 감정 밑에 뭐가 있는지 같이 봐볼까?\n솔직하게 말해봐. 카드만 알아 냥~ 🐱`;
}

/** 감정 온도계 */
export function getFeelingThermometer(): string {
  return `냥~ 지금 마음 상태를 카드의 온도로 말해줄래? 🔮

🧊 1-2: 아예 감정이 꽁꽁 얼어있어 (무감각)
❄️ 3-4: 차갑고 우울해
🌊 5-6: 출렁출렁, 불안정해
🔥 7-8: 뜨거워, 감정이 격해
🌋 9-10: 폭발 직전이야

몇이야? 냥~ 솔직하게 🐱`;
}

/** 몸 감각 체크 */
export function getSomaticCheck(): string {
  return `냥~ 좀 특이한 질문 할게 🔮

지금 그 사람 생각하면 몸 어디가 반응해?
가슴이 답답해? 배가 뒤틀려? 머리가 복잡해?
아니면 아무 느낌 없어?

몸은 마음보다 솔직하거든 냥~ 🐱`;
}

/** 관계 역학 파악 질문 */
export function getRelationDynamicQuestion(): string {
  const questions = [
    '냥~ 하나만 물어볼게 🔮\n\n너랑 그 사람 관계에서...\n누가 더 연락을 먼저 해?\n누가 더 맞춰주는 편이야?\n\n괜찮아, 카드한테만 말하면 돼 냥~ 🐱',
    '잠깐... 카드가 뭔가를 읽고 있어 🌙\n\n혹시... 그 사람이 좀 멀어지면\n네가 더 매달리게 되는 편이야?\n아니면 너도 같이 물러나는 편?\n\n이건 카드가 꼭 알아야 하는 정보야 냥~ 🔮',
  ];
  return questions[Math.floor(Math.random() * questions.length)];
}

/** 반복 패턴 체크 */
export function getRepetitionPatternCheck(): string {
  return `냥~ 이건 좀 깊은 질문인데 🌙

혹시 이전 연애에서도 비슷한 패턴이 있었어?
예를 들면...
- 항상 내가 더 좋아하는 쪽이었다든가
- 잘 되다가 어느 순간 갑자기 틀어진다든가
- 가까워지면 오히려 무서워진다든가

없으면 없는 거고! 냥~`;
}

/** 감정 온도 응답 생성 */
export function getTemperatureResponse(temp: number): string {
  if (temp <= 2) {
    return '1-2... 감정이 얼어있는 상태구나 냥 🧊\n카드가 살살 녹여줄게. 천천히 가자 냥~ 🐱';
  } else if (temp <= 4) {
    return '3-4... 차갑고 우울한 상태야 냥 ❄️\n카드가 따뜻한 메시지를 줄 거야 🌙';
  } else if (temp <= 6) {
    return '5-6... 출렁거리는 상태구나 냥 🌊\n감정이 불안정할 때 카드가 제일 잘 읽혀 🔮';
  } else if (temp <= 8) {
    return '7-8... 감정이 꽤 뜨거운 상태야 냥 🔥\n그 에너지를 카드에 담아볼게 🔮';
  } else {
    return '9-10... 폭발 직전이구나 냥 🌋\n괜찮아, 여기서는 다 쏟아내도 돼. 카드가 받아줄 거야 🐱🔮';
  }
}
