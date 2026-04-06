/**
 * 🏛️ 아키타입 매퍼 — Major Arcana → 융 심리학 아키타입 연결
 *
 * 각 Major Arcana 카드를 보편적 무의식 원형(archetype)에 매핑하고
 * 유저에게 의미 있는 심층 메시지 + 투사 질문을 생성
 */

// ─── Types ──────────────────────────────────────────────

export interface ArchetypeInsight {
  archetype: string;
  archetypeEn: string;
  message: string;
  projectionQuestion: string;
}

// ─── 아키타입 매핑 ──────────────────────────────────────

const ARCHETYPE_MAP: Record<string, ArchetypeInsight> = {
  major_0: {
    archetype: '탐험가',
    archetypeEn: 'The Explorer',
    message: 'The Fool이 나왔다는 건... 네 안에 "탐험가" 에너지가 있다는 거야 냥~ 🌙\n새로운 시작을 두려워하지 마. 어리석어 보여도, 그게 용기야 ✨',
    projectionQuestion: '만약 두려움이 사라진다면... 제일 먼저 뭘 하고 싶어? 냥~',
  },
  major_1: {
    archetype: '창조자',
    archetypeEn: 'The Creator',
    message: 'The Magician... 네 안에 "창조자" 에너지가 있어 냥~ 🔮\n필요한 건 이미 네 손에 있어. 시작할 용기만 있으면 돼 ✨',
    projectionQuestion: '지금 네가 가진 것 중에... 과소평가하고 있는 게 뭘까? 냥~',
  },
  major_2: {
    archetype: '현자',
    archetypeEn: 'The Sage',
    message: 'High Priestess... "현자" 에너지야 냥~ 🌙\n답은 밖이 아니라 네 안에 있어. 직감을 믿어봐 ✨',
    projectionQuestion: '마음 깊은 곳에서... 이미 답을 알고 있지 않아? 냥~',
  },
  major_3: {
    archetype: '양육자',
    archetypeEn: 'The Nurturer',
    message: 'The Empress... "양육자" 에너지가 빛나고 있어 냥~ 🌙\n사랑을 주는 것도 좋지만, 너 자신도 돌봐야 해 ✨',
    projectionQuestion: '너를 가장 편안하게 해주는 건 뭐야? 사람? 장소? 냥~',
  },
  major_4: {
    archetype: '통치자',
    archetypeEn: 'The Ruler',
    message: 'The Emperor... "통치자" 에너지야 냥~ 🔮\n지금 네게 필요한 건 감정이 아니라 구조와 질서일 수 있어 ✨',
    projectionQuestion: '이 상황에서 네가 "컨트롤"할 수 있는 건 뭐가 있어? 냥~',
  },
  major_5: {
    archetype: '안내자',
    archetypeEn: 'The Guide',
    message: 'The Hierophant... "안내자" 에너지야 냥~ 🌙\n경험에서 배운 것을 믿어도 돼. 지혜가 네 안에 있어 ✨',
    projectionQuestion: '이 상황에 대해 조언해줄 수 있는 사람이 있다면 누구야? 냥~',
  },
  major_6: {
    archetype: '선택자',
    archetypeEn: 'The Chooser',
    message: 'The Lovers... 넌 지금 "선택"의 순간에 있어 냥~ 🔮\n운명이 두 가지 길을 보여주고 있어 🌙',
    projectionQuestion: '마음 깊은 곳에서... 이미 답을 알고 있지 않아? 냥~',
  },
  major_7: {
    archetype: '전사',
    archetypeEn: 'The Warrior',
    message: 'The Chariot... "전사" 에너지가 타오르고 있어 냥~ 🔥\n의지와 집중력으로 돌파할 때야 ✨',
    projectionQuestion: '지금 네가 "돌파"하고 싶은 건 정확히 뭐야? 냥~',
  },
  major_8: {
    archetype: '내면의 힘',
    archetypeEn: 'Inner Strength',
    message: 'Strength... 네 안에 "부드러운 힘"이 있어 냥~ 🌙\n강한 척 안 해도 돼. 진짜 강함은 부드러움에서 나와 ✨',
    projectionQuestion: '네가 가장 강했던 순간은 언제야? 그때 뭐가 너를 지탱했어? 냥~',
  },
  major_9: {
    archetype: '은둔자',
    archetypeEn: 'The Hermit',
    message: 'The Hermit... "은둔자" 에너지야 냥~ 🌙\n혼자만의 시간이 필요해. 그건 도망이 아니라 성찰이야 ✨',
    projectionQuestion: '혼자 조용히 있을 때... 네 안에서 뭐가 들려? 냥~',
  },
  major_10: {
    archetype: '운명의 수레바퀴',
    archetypeEn: 'Wheel of Fortune',
    message: 'Wheel of Fortune... "변화의 바퀴"가 돌고 있어 냥~ 🔮\n지금이 전환점이야. 흐름에 몸을 맡겨봐 ✨',
    projectionQuestion: '지금 네 인생에서 "돌아가고 있는" 건 뭐야? 냥~',
  },
  major_11: {
    archetype: '균형자',
    archetypeEn: 'The Balancer',
    message: 'Justice... "균형자" 에너지야 냥~ ⚖️\n공정함과 진실이 필요한 시간이야 🌙',
    projectionQuestion: '이 상황에서 "공정한" 건 뭐라고 생각해? 냥~',
  },
  major_12: {
    archetype: '순교자',
    archetypeEn: 'The Surrendered',
    message: 'The Hanged Man... "항복" 에너지야 냥~ 🌙\n포기가 아니라, 다른 시각으로 보는 거야. 뒤집어서 보면 답이 보여 ✨',
    projectionQuestion: '이 상황을 완전히 반대로 본다면... 뭐가 보여? 냥~',
  },
  major_13: {
    archetype: '변환자',
    archetypeEn: 'The Transformer',
    message: 'Death... 무서운 카드 같지만 냥~ 🌙\n이건 "변환자" 에너지야. 끝이 아니라 탈피야.\n오래된 껍질을 벗어야 새로운 내가 나와 ✨',
    projectionQuestion: '지금 "끝내야 하는데 못 끝내고 있는" 게 뭐야? 냥~',
  },
  major_14: {
    archetype: '조화자',
    archetypeEn: 'The Harmonizer',
    message: 'Temperance... "조화자" 에너지야 냥~ ✨\n극단이 아니라 중용이 답이야. 천천히, 균형 있게 🌙',
    projectionQuestion: '지금 네 삶에서 "균형이 깨진" 부분은 어디야? 냥~',
  },
  major_15: {
    archetype: '그림자',
    archetypeEn: 'The Shadow',
    message: 'The Devil... "그림자" 에너지야 냥~ 🌙\n네가 인정하기 싫은 부분이 있어. 하지만 그림자도 너의 일부야.\n직면하면 자유로워져 ✨',
    projectionQuestion: '이 관계에서 너도 모르게 "집착"하고 있는 게 있어? 냥~',
  },
  major_16: {
    archetype: '해방자',
    archetypeEn: 'The Liberator',
    message: 'The Tower... "해방자" 에너지야 냥~ 🌙\n무너지는 게 아니라, 진짜가 아닌 것이 벗겨지는 거야.\n아픔 뒤에 진짜 너를 만나게 될 거야 ✨',
    projectionQuestion: '만약 지금 모든 게 무너진다면... 뭐가 남을 것 같아? 그게 진짜야 냥~',
  },
  major_17: {
    archetype: '치유자',
    archetypeEn: 'The Healer',
    message: 'The Star ✨ 냥~\n넌 지금 상처받고 있지만, 이 카드는 "치유자" 에너지를 보여줘 🌙\n네 안에 스스로를 치유할 힘이 있어 🐱',
    projectionQuestion: '너를 가장 치유해주는 건 뭐야? 사람? 장소? 행동? 냥~',
  },
  major_18: {
    archetype: '몽상가',
    archetypeEn: 'The Dreamer',
    message: 'The Moon... "몽상가" 에너지야 냥~ 🌙\n지금 안개 속에 있는 것 같지만, 직감이 길을 알고 있어.\n논리가 아니라 느낌을 따라가봐 ✨',
    projectionQuestion: '최근에 꾼 꿈이나 반복되는 느낌이 있어? 냥~',
  },
  major_19: {
    archetype: '빛의 아이',
    archetypeEn: 'The Radiant Child',
    message: 'The Sun ☀️ 냥~!\n"빛의 아이" 에너지가 환하게 빛나고 있어 ✨\n기쁨과 순수함을 되찾을 시간이야 🐱',
    projectionQuestion: '어릴 때처럼 순수하게 행복했던 순간... 언제야? 냥~',
  },
  major_20: {
    archetype: '심판자',
    archetypeEn: 'The Judge',
    message: 'Judgement... "심판" 에너지야 냥~ 🔮\n과거를 돌아보고 스스로를 용서할 시간이야.\n새로운 부름이 오고 있어 ✨',
    projectionQuestion: '과거의 너에게 한마디 한다면 뭐라고 할래? 냥~',
  },
  major_21: {
    archetype: '완성자',
    archetypeEn: 'The Achiever',
    message: 'The World ✨ 냥~!\n"완성자" 에너지야. 하나의 여정이 끝나고 있어.\n이건 끝이 아니라 다음 여정의 시작이야 🌙🔮',
    projectionQuestion: '이 여정에서 네가 가장 성장한 부분은 뭐야? 냥~',
  },
};

// ─── 투사 질문 (범용) ───────────────────────────────────

const GENERIC_PROJECTION_QUESTIONS: string[] = [
  '이 카드를 보고 처음 떠오르는 느낌이 뭐야? 냥~',
  '이 카드 속 인물... 혹시 누구랑 닮았다고 느껴져? 너? 그 사람? 냥~',
  '만약 이 카드 속에 네가 들어간다면... 넌 뭘 하고 있을 것 같아? 냥~ 🌙',
  '이 카드가 너한테 한마디 한다면 뭐라고 할 것 같아? 냥~ 🔮',
  '이 카드를 보면 어떤 감정이 올라와? 정답은 없어 냥~ 🐱',
  '이 그림에서 네가 가장 눈이 가는 부분이 어디야? 냥~',
  '이 카드가 너의 현재 상황이라면... 뭘 바꾸고 싶어? 냥~ 🌙',
  '이 카드를 그 사람한테 보여준다면... 어떤 반응일 것 같아? 냥~',
  '이 카드가 말하는 "진짜 너"는 어떤 모습일까? 냥~ 🔮',
  '이 카드를 보고 떠오르는 단어 하나만 말해봐 냥~ ✨',
];

// ─── Public API ─────────────────────────────────────────

/** Major Arcana 카드 ID → 아키타입 인사이트 */
export function getArchetypeInsight(cardId: string): ArchetypeInsight | null {
  return ARCHETYPE_MAP[cardId] ?? null;
}

/** 카드 목록에서 Major Arcana의 아키타입 인사이트 추출 */
export function extractArchetypeInsights(
  cardIds: string[],
): ArchetypeInsight[] {
  return cardIds
    .filter((id) => id.startsWith('major_'))
    .map((id) => ARCHETYPE_MAP[id])
    .filter(Boolean);
}

/** 범용 투사 질문 가져오기 */
export function getProjectionQuestion(): string {
  return GENERIC_PROJECTION_QUESTIONS[
    Math.floor(Math.random() * GENERIC_PROJECTION_QUESTIONS.length)
  ];
}

/** 특정 카드의 투사 질문 (Major면 전용, 아니면 범용) */
export function getCardProjectionQuestion(cardId: string): string {
  const archetype = ARCHETYPE_MAP[cardId];
  if (archetype) return archetype.projectionQuestion;
  return getProjectionQuestion();
}
