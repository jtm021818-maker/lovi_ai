/**
 * 🎯 액션 라이브러리 — 미니 실험 + 카드 리추얼
 *
 * Turn 9 (ACTION_ANCHOR)에서 사용
 * 시나리오별 구체적이고 작은 행동 계획 + 카드 에너지 리추얼
 */

// ─── Types ──────────────────────────────────────────────

export type ActionCategory = 'communication' | 'self_care' | 'boundary' | 'courage' | 'reflection' | 'ritual';

export interface MiniExperiment {
  category: ActionCategory;
  title: string;
  description: string;
  emoji: string;
}

export interface CardRitual {
  name: string;
  description: string;
}

// ─── 시나리오별 미니 실험 ────────────────────────────────

const SCENARIO_EXPERIMENTS: Record<string, MiniExperiment[]> = {
  UNREQUITED_LOVE: [
    {
      category: 'courage',
      title: '작은 용기 한 스푼',
      emoji: '💪',
      description: '이번 주에 그 사람한테 "가벼운 질문" 하나만 해봐\n날씨 얘기도 좋고, 공통 관심사 질문도 좋아.\n큰 거 하지 말고, 작은 한 발짝만✨',
    },
    {
      category: 'reflection',
      title: '진짜 이유 찾기',
      emoji: '📝',
      description: '오늘 밤에 이거 해봐 📝\n"내가 그 사람을 좋아하는 진짜 이유 3가지" 적어봐.\n외모 빼고! 진짜 이유만 🔮',
    },
    {
      category: 'ritual',
      title: '거울 에너지 충전',
      emoji: '🪞',
      description: '카드의 에너지를 담아\n이번 주에 하루 한 번, 거울 보면서\n"나는 충분히 좋은 사람이야"라고 말해봐.\n쑥스러워도! 카드가 시킨 거야',
    },
  ],

  RECONNECTION: [
    {
      category: 'reflection',
      title: '변화 인벤토리',
      emoji: '📝',
      description: '이번 주 미니 실험이야 📝\n"그 사람과 다시 만난다면 내가 바꾸고 싶은 것 1가지" 적어봐.\n그리고 "절대 바꾸지 않을 것 1가지"도 🔮',
    },
    {
      category: 'self_care',
      title: '나를 위한 30분',
      emoji: '🧘',
      description: '카드가 말하길... 지금은 네 에너지를 채울 시간이야\n이번 주에 "나를 위한 시간" 30분만 만들어봐.\n좋아하는 음악 듣기, 산책, 아무거나✨',
    },
    {
      category: 'boundary',
      title: 'SNS 디톡스 하루',
      emoji: '📱',
      description: '이번 주 미션 🔮\n그 사람 SNS를 하루만, 딱 하루만 안 보기.\n24시간 후에 기분이 어떤지한테 알려줘',
    },
  ],

  BREAKUP_CONTEMPLATION: [
    {
      category: 'reflection',
      title: '미래의 나에게 편지',
      emoji: '✉️',
      description: '이번 주 미션이야 ✉️\n1년 후의 너에게 편지를 써봐.\n"지금 나는 이런 고민을 하고 있어" 부터 시작해서\n"1년 후의 나는 어떨까?" 까지',
    },
    {
      category: 'self_care',
      title: '감정 해방 리추얼',
      emoji: '🌙',
      description: '카드가 특별한 미션을 줬어 🔮\n\n오늘 밤, 하고 싶은 말을 편지로 써봐.\n다 쓰면... 보내지 말고 찢어.\n그게 "감정 해방" 리추얼이야 ✨\n카드가 "놓아줘도 돼"라고 말하고 있어',
    },
  ],

  BOREDOM: [
    {
      category: 'communication',
      title: '서프라이즈 한 마디',
      emoji: '💬',
      description: '이번 주에 그 사람한테 평소에 안 하던 말 하나 해봐\n"오늘 뭔가 멋있어 보인다" 같은 거!\n작은 변화가 큰 파도를 만들어✨',
    },
    {
      category: 'courage',
      title: '새로운 데이트',
      emoji: '🗺️',
      description: '카드가 "변화"를 원하고 있어 🔮\n이번 주에 둘이 처음 해보는 거 하나 도전해봐!\n새로운 맛집, 전시회, 산책 코스... 뭐든 ✨',
    },
  ],

  GHOSTING: [
    {
      category: 'boundary',
      title: '연락 금지 3일',
      emoji: '🚫',
      description: '카드가 주는 미션은... 3일만 먼저 연락하지 않기\n힘들어도 참아봐. 그 3일 동안 네 에너지를 채워.\n3일 후에 마음이 어떤지 봐봐',
    },
    {
      category: 'self_care',
      title: '나 중심 타임라인',
      emoji: '⏰',
      description: '이번 주 미션이야 ⏰\n그 사람을 기다리는 시간 대신\n"나를 위한 시간"으로 채워봐.\n운동, 취미, 친구 만남... 뭐든✨',
    },
  ],

  READ_AND_IGNORED: [
    {
      category: 'boundary',
      title: '답장 기다리지 않기',
      emoji: '📵',
      description: '이번 주 미션 🔮\n메시지 보내고 나면 핸드폰 뒤집어놓기.\n답장은 올 때 오는 거야.\n네 시간을 핸드폰에 뺏기지 마',
    },
    {
      category: 'reflection',
      title: '감정 일기',
      emoji: '📔',
      description: '읽씹 당했을 때 드는 감정을 적어봐 📔\n"화가 난다" "불안하다" "서운하다"\n적다 보면 패턴이 보일 거야',
    },
  ],

  JEALOUSY: [
    {
      category: 'reflection',
      title: '질투 일기',
      emoji: '📝',
      description: '이번 주에 질투가 느껴질 때마다 적어봐 📝\n언제, 어떤 상황에서, 얼마나 강했는지.\n패턴을 알면 다스릴 수 있어 🔮',
    },
    {
      category: 'self_care',
      title: '자존감 충전',
      emoji: '💎',
      description: '카드가 "네 빛을 봐"라고 해 💎\n이번 주에 매일 하나씩 "내가 잘하는 것"을 적어봐.\n질투의 뿌리는 자신감이야. 그걸 채우는 거야 ✨',
    },
  ],

  COMMITMENT_FEAR: [
    {
      category: 'self_care',
      title: '안전지대 탐험',
      emoji: '🏠',
      description: '카드가 말하길... 두려움은 자연스러운 거야\n이번 주에 "살짝 불편하지만 해볼 수 있는" 작은 거 하나 해봐.\n새 카페 가기 같은 거! 안전지대를 조금씩 넓히는 거야',
    },
    {
      category: 'reflection',
      title: '두려움 리스트',
      emoji: '📋',
      description: '이 관계에서 네가 두려운 것들을 다 적어봐 📋\n적다 보면 "생각보다 별거 아닌 것"이 보일 거야.\n그게 첫 번째 벽을 허무는 거야 🔮',
    },
  ],

  GENERAL: [
    {
      category: 'reflection',
      title: '카드 저널링',
      emoji: '📖',
      description: '오늘 뽑은 카드에 대해 자유롭게 적어봐 📖\n"이 카드를 보면 떠오르는 것"\n"이 카드가 나한테 하고 싶은 말"\n적다 보면 뭔가 보일 거야 🔮',
    },
    {
      category: 'ritual',
      title: '아침 에너지 세팅',
      emoji: '☀️',
      description: '카드가 에너지 전환 미션을 줬어 🔮\n\n내일 아침에 일어나면 제일 먼저\n"오늘은 나를 위한 하루야"라고 말해봐.\n그리고 좋아하는 음료 한 잔 마시면서\n오늘의 카드 에너지를 떠올려✨',
    },
    {
      category: 'courage',
      title: '작은 변화 챌린지',
      emoji: '🔥',
      description: '카드가 용기 미션을 줬어 🔮\n\n이번 주에 "평소에 안 하던 것" 하나만 해봐.\n새 카페 가기, 모르는 사람한테 인사하기,\nSNS에 솔직한 글 올리기... 뭐든!\n카드가 "변화의 에너지"를 보내주고 있어 ✨',
    },
  ],
};

// ─── 카드 리추얼 ────────────────────────────────────────

const CARD_RITUALS: CardRitual[] = [
  {
    name: '달빛 편지 쓰기',
    description: '오늘 밤, 하고 싶은 말을 편지로 써봐.\n다 쓰면... 보내지 말고 찢어.\n그게 "감정 해방" 리추얼이야 ✨\n카드가 "놓아줘도 돼"라고 말하고 있어',
  },
  {
    name: '아침 에너지 세팅 ☀️',
    description: '내일 아침에 일어나면 제일 먼저\n"오늘은 나를 위한 하루야"라고 말해봐.\n그리고 좋아하는 음료 한 잔 마시면서\n오늘의 카드 에너지를 떠올려✨',
  },
  {
    name: '작은 용기 챌린지 💪',
    description: '이번 주에 "평소에 안 하던 것" 하나만 해봐.\n새로운 카페, 모르는 사람한테 인사, 솔직한 표현...\n카드가 "변화의 에너지"를 보내주고 있어 ✨',
  },
  {
    name: '감사 에너지 충전 🙏',
    description: '잠들기 전에 오늘 감사한 것 3가지만 떠올려봐\n아무리 작은 거라도! 커피가 맛있었다도 OK\n감사 에너지가 카드의 힘을 증폭시켜 ✨',
  },
];

// ─── Public API ─────────────────────────────────────────

/** 시나리오 기반 미니 실험 추천 (1~2개) */
export function getExperiments(scenario: string, count: number = 1): MiniExperiment[] {
  const pool = SCENARIO_EXPERIMENTS[scenario] ?? SCENARIO_EXPERIMENTS.GENERAL;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/** 카테고리 기반 미니 실험 추천 */
export function getExperimentByCategory(scenario: string, category: ActionCategory): MiniExperiment | null {
  const pool = SCENARIO_EXPERIMENTS[scenario] ?? SCENARIO_EXPERIMENTS.GENERAL;
  const filtered = pool.filter((e) => e.category === category);
  if (filtered.length === 0) return null;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

/** 카드 리추얼 추천 */
export function getCardRitual(): CardRitual {
  return CARD_RITUALS[Math.floor(Math.random() * CARD_RITUALS.length)];
}

/** 미니 실험 메시지 포맷팅 */
export function formatExperimentMessage(experiment: MiniExperiment): string {
  return `좋아, 카드가 이번 주 미니 실험을 줬어 🔮\n\n${experiment.emoji} ${experiment.title}\n${experiment.description}`;
}

/** 미니 실험 + 리추얼 조합 메시지 */
export function formatActionAnchorMessage(scenario: string): string {
  const experiment = getExperiments(scenario, 1)[0];
  const ritual = getCardRitual();

  return `좋아, 카드가 이번 주 미션을 줬어 🔮

📌 미니 실험: ${experiment.title} ${experiment.emoji}
${experiment.description}

🕯️ 카드 리추얼: ${ritual.name}
${ritual.description}

작은 한 걸음이 큰 변화를 만들어✨`;
}
