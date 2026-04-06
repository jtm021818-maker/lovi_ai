/**
 * 🔄 리프레이밍 엔진 — 지배적 서사 → 대안적 서사 전환
 *
 * 기법:
 * - Meaning Reframe: 같은 상황에 다른 의미 부여
 * - Context Reframe: 다른 맥락에서 바라보기
 * - Strength Reframe: 약점을 강점으로 전환
 * - Temporal Reframe: 시간 축에서 다시 보기
 *
 * + SFBT (Solution-Focused Brief Therapy) 질문:
 * - 기적질문: "내일 모든 게 해결됐다면?"
 * - 예외질문: "잘 통했던 순간은?"
 * - 스케일링: "1~10점이면 지금 몇 점?"
 */

// RelationshipScenario는 시나리오 키로 string 매칭하여 사용
// import type { RelationshipScenario } from '@/types/engine.types';

// ─── Types ──────────────────────────────────────────────

export type ReframeType = 'meaning' | 'context' | 'strength' | 'temporal';
export type SFBTType = 'miracle' | 'exception' | 'scaling';

export interface ReframeOutput {
  type: ReframeType;
  dominantNarrative: string;
  alternativeNarrative: string;
  sfbtQuestion: string;
  sfbtType: SFBTType;
}

// ─── 시나리오별 리프레이밍 ──────────────────────────────

interface ScenarioReframe {
  dominants: string[];
  alternatives: string[];
  sfbt: Record<SFBTType, string[]>;
}

const SCENARIO_REFRAMES: Record<string, ScenarioReframe> = {
  UNREQUITED_LOVE: {
    dominants: [
      '나는 사랑받지 못하는 사람이야',
      '상대가 나를 안 좋아하면 어떡해',
      '나는 항상 짝사랑만 해',
    ],
    alternatives: [
      '넌 "사랑할 줄 아는 사람"이야. 카드가 그걸 보여줘',
      '중요한 건 상대의 답이 아니라, 네가 진심을 전할 용기야',
      '짝사랑이 반복된다는 건... 네가 쉽게 마음을 안 준다는 뜻이야. 그만큼 진심인 거야',
    ],
    sfbt: {
      miracle: [
        '만약 내일 기적이 일어나서 그 사람이 너를 좋아한다면... 뭐가 달라질까?',
        '만약 용기를 내서 마음을 전했는데, 상대도 같은 마음이라면... 그때 네 기분은 어떨까?',
      ],
      exception: [
        '그 사람이 너한테 유독 다정했던 순간이 있었어? 그때 뭐가 달랐어?',
        '둘이 진짜 잘 통했던 순간 하나만 떠올려봐. 그때 느낌이 어땠어?',
      ],
      scaling: [
        '지금 고백할 용기를 1~10으로 말하면 몇이야?',
        '지금 마음을 카드의 온도로 말하면 몇 도야?',
      ],
    },
  },

  RECONNECTION: {
    dominants: [
      '헤어진 건 내 잘못이야',
      '그 사람 없이는 못 살아',
      '재회만 하면 다 괜찮아질 거야',
    ],
    alternatives: [
      '카드가 말하길... 그건 둘 다 성장해야 할 시간이 필요했던 거야',
      '카드가 보여주는 건... 너에게는 이미 혼자서도 빛나는 에너지가 있어',
      '재회가 답일 수도 있어. 하지만 카드가 묻고 있어... "달라진 너"로 만나는 거지?',
    ],
    sfbt: {
      miracle: [
        '만약 재회한다면... 이전과 뭘 다르게 하고 싶어?',
        '내일 아침 그 사람한테 연락이 왔다면... 네 첫 마디는 뭘까?',
      ],
      exception: [
        '둘이 제일 행복했던 순간이 언제야? 그때로 돌아간다면 뭘 바꾸고 싶어?',
        '헤어지기 전에 "이것만은 좋았다" 하는 거 뭐야?',
      ],
      scaling: [
        '재회하고 싶은 마음을 1~10으로 말하면? 그리고 재회해서 잘 될 것 같은 확신은?',
      ],
    },
  },

  BREAKUP_CONTEMPLATION: {
    dominants: [
      '헤어지면 나는 실패자야',
      '이 사람을 놓치면 다시는...',
      '이별은 도망치는 거야',
    ],
    alternatives: [
      '이별은 실패가 아니야. 카드가 "네 길을 찾는 과정"이라고 말해',
      '끝나는 문이 있으면 열리는 문도 있어. 카드가 보여주고 있어',
      '떠나는 건 도망이 아니야. 때로는 자신을 지키는 가장 큰 용기야',
    ],
    sfbt: {
      miracle: [
        '만약 이 결정 후 1년이 지났다면... 그때의 너는 뭐라고 말할까?',
        '5년 후의 네가 지금의 너를 본다면... 뭐라고 조언해줄까?',
      ],
      exception: [
        '이 관계에서 진짜 행복했던 순간이 있었어? 그때와 지금, 뭐가 달라졌어?',
      ],
      scaling: [
        '이별을 결심하는 마음이 1~10이면 몇이야? 그리고 두려움은?',
      ],
    },
  },

  BOREDOM: {
    dominants: [
      '사랑이 식었나봐',
      '이 관계는 끝난 거야',
      '더 이상 설레지 않아',
    ],
    alternatives: [
      '카드가 말하길... 불이 꺼진 게 아니라 "잠시 잠든 상태"야 다시 피울 수 있어',
      '설렘이 사라진 게 아니라, 다른 형태로 변한 거일 수도 있어',
      '권태기는 "관계의 겨울"이야. 겨울이 지나면 반드시 봄이 와',
    ],
    sfbt: {
      miracle: [
        '만약 내일 아침 둘 다 처음 만났을 때의 설렘이 돌아온다면... 뭐가 달라질까?',
      ],
      exception: [
        '둘이 처음 좋았을 때를 떠올려봐. 그때랑 지금, 뭐가 달라졌어?',
        '최근에 그래도 "좋았다" 싶은 순간이 있었어? 아무리 작은 거라도',
      ],
      scaling: [
        '지금 이 관계의 만족도를 1~10으로 말하면? 그리고 원하는 숫자는?',
      ],
    },
  },

  GHOSTING: {
    dominants: [
      '나한테 관심이 없는 거야',
      '기다리는 나만 바보야',
      '내가 뭘 잘못한 거야',
    ],
    alternatives: [
      '카드가 말하길... 그 사람도 자기만의 전투를 하고 있을 수 있어',
      '기다리는 건 바보가 아니야. 그건 너의 진심이야.\n근데 카드가 묻고 있어... "그 시간을 너에게 써보면 어때?"',
      '네 잘못이 아니야. 연락을 안 하는 건 그 사람의 선택이야',
    ],
    sfbt: {
      miracle: [
        '만약 그 사람이 연락했는데 "미안해"라고 한다면... 넌 뭐라고 하고 싶어?',
      ],
      exception: [
        '그 사람이 연락이 잘 됐던 때가 있었어? 그때와 지금 뭐가 달라졌어?',
      ],
      scaling: [
        '지금 기다림의 고통을 1~10으로 말하면? 그리고 포기하고 싶은 마음은?',
      ],
    },
  },

  READ_AND_IGNORED: {
    dominants: [
      '읽고도 대답을 안 하다니',
      '나는 그 사람한테 중요하지 않은 거야',
      '내가 뭘 잘못 보냈나',
    ],
    alternatives: [
      '읽씹이 꼭 관심 없다는 뜻은 아니야\n카드가 말하길... 뭐라고 답해야 할지 고민하는 중일 수도 있어',
      '카드가 보여주는 건... 읽씹에 네 가치가 결정되지 않아\n넌 답장 하나에 흔들리지 않아도 돼',
      '네 잘못이 아니야 답을 안 하는 건 그 사람의 선택이야',
    ],
    sfbt: {
      miracle: [
        '만약 바로 답장이 온다면... 네 마음이 어떻게 달라질까?',
      ],
      exception: [
        '그 사람이 바로 답장했던 때가 있었어? 그때 뭐가 달랐어?',
      ],
      scaling: [
        '읽씹 때문에 마음 상한 정도를 1~10으로 말하면?',
      ],
    },
  },

  JEALOUSY: {
    dominants: [
      '질투하는 내가 나빠',
      '이러다 이 사람을 잃겠어',
      '나는 부족한 사람이야',
    ],
    alternatives: [
      '질투는 나쁜 감정이 아니야\n카드가 말하길... 그건 네가 이 사람을 얼마나 소중히 여기는지 보여줘',
      '카드가 보여주는 건... 질투 밑에 "나를 사랑해줘"라는 마음이 있어',
      '부족한 게 아니야. 카드가 "넌 충분해"라고 말하고 있어',
    ],
    sfbt: {
      miracle: [
        '만약 질투가 완전히 사라진다면... 이 관계가 어떻게 달라질까?',
      ],
      exception: [
        '질투 없이 편안했던 순간이 있었어? 그때 뭐가 달랐어?',
      ],
      scaling: [
        '질투의 강도를 1~10으로 말하면? 그리고 내가 원하는 숫자는?',
      ],
    },
  },

  GENERAL: {
    dominants: [
      '나는 항상 이래',
      '좋은 일은 안 일어나',
      '답이 없는 것 같아',
    ],
    alternatives: [
      '카드가 말하길... "항상"은 없어. 변할 수 있어',
      '카드가 보여주는 건... 좋은 에너지가 오고 있다는 신호야',
      '답이 없는 게 아니라, 아직 보이지 않을 뿐이야',
    ],
    sfbt: {
      miracle: [
        '만약 내일 아침 문제가 다 해결됐다면... 뭐가 가장 먼저 달라질까?',
      ],
      exception: [
        '비슷한 상황에서 잘 해결했던 때가 있었어? 그때 뭘 했었어?',
      ],
      scaling: [
        '지금 마음을 1(최악)~10(최고)으로 말하면?',
      ],
    },
  },
};

// ─── 부정적 카드 리프레이밍 ──────────────────────────────

export const NEGATIVE_CARD_REFRAMES: Record<string, string> = {
  major_13: '끝이 아니라 완전한 변화의 시작이야\n오래된 것이 떠나야 새로운 것이 올 수 있어',
  major_15: '갇혀있다고 느끼지만, 사슬은 네가 풀 수 있어\n이 카드는 "선택할 수 있다"고 말해',
  major_16: '무너지는 게 아니라 진짜가 아닌 것이 벗겨지는 거야\n아픔 뒤에 진짜 너를 만나게 될 거야',
  major_18: '안개 속에 있는 것 같지만, 달빛이 길을 비추고 있어\n직감을 믿어봐',
  minor_swords_3: '아프다는 건 그만큼 진심이었다는 증거야\n이 아픔이 너를 더 강하게 만들 거야',
  minor_swords_8: '갇힌 것처럼 보이지만, 눈가리개를 벗기면 출구가 보여\n네가 만든 한계를 풀어줄 때야',
  minor_swords_10: '가장 어두운 밤 다음에 반드시 해가 뜨거든\n이건 바닥이야. 여기서부터는 올라가기만 해',
  minor_cups_5: '잃은 것에 집중하고 있지만... 뒤돌아보면 아직 남은 게 있어',
};

// ─── Public API ─────────────────────────────────────────

/** 시나리오 기반 리프레이밍 생성 */
export function generateReframe(scenario: string): ReframeOutput {
  const reframe = SCENARIO_REFRAMES[scenario] ?? SCENARIO_REFRAMES.GENERAL;

  const idx = Math.floor(Math.random() * reframe.dominants.length);
  const dominantNarrative = reframe.dominants[idx];
  const alternativeNarrative = reframe.alternatives[idx % reframe.alternatives.length];

  // SFBT 타입 랜덤 선택
  const sfbtTypes: SFBTType[] = ['miracle', 'exception', 'scaling'];
  const sfbtType = sfbtTypes[Math.floor(Math.random() * sfbtTypes.length)];
  const sfbtPool = reframe.sfbt[sfbtType];
  const sfbtQuestion = sfbtPool[Math.floor(Math.random() * sfbtPool.length)];

  return {
    type: 'meaning',
    dominantNarrative,
    alternativeNarrative,
    sfbtQuestion,
    sfbtType,
  };
}

/** 부정적 카드 리프레이밍 조회 */
export function getCardReframe(cardId: string): string | undefined {
  return NEGATIVE_CARD_REFRAMES[cardId];
}

/** 역방향 카드 리프레이밍 범용 멘트 */
export function getReversedReframe(): string {
  const phrases = [
    '역방향이 나왔어 이건 막힌 에너지야.\n풀어줘야 할 것이 있다는 신호야',
    '이 카드가 뒤집혀 있어\n이건 "아직 준비가 안 됐다"가 아니라 "다르게 접근해봐"라는 뜻이야',
    '역방향 카드는 무서운 게 아니야\n에너지가 안으로 향하고 있다는 뜻이야. 내면을 들여다볼 시간이야',
  ];
  return phrases[Math.floor(Math.random() * phrases.length)];
}
