import { TAROT_CARDS, TarotCard } from './cards';
import { RelationshipScenario } from '@/types/engine.types';

export type { SpreadType } from './reading-prompts';

export interface DrawnCard {
  card: TarotCard;
  isReversed: boolean;
  position?: string;
  interpretation?: string;
}

interface SpreadCard extends DrawnCard {
  position: string;
  interpretation: string;
}

// -------------------------------------------------------
// Internal weight helpers
// -------------------------------------------------------

type SuitWeight = {
  cups: number;
  swords: number;
  wands: number;
  pentacles: number;
  major: number;
};

function buildWeights(
  emotionScore: number,
  scenario?: RelationshipScenario,
): SuitWeight {
  const weights: SuitWeight = {
    cups: 1,
    swords: 1,
    wands: 1,
    pentacles: 1,
    major: 1,
  };

  // Negative emotions → Cups weight up
  if (emotionScore < 0) {
    weights.cups += Math.min(Math.abs(emotionScore) * 0.3, 1.5);
  }

  if (!scenario) return weights;

  switch (scenario) {
    case RelationshipScenario.READ_AND_IGNORED:
    case RelationshipScenario.GHOSTING:
      weights.cups += 1;
      weights.swords += 1;
      break;
    case RelationshipScenario.JEALOUSY:
      weights.swords += 1.5;
      break;
    case RelationshipScenario.BREAKUP_CONTEMPLATION:
      weights.major += 2;
      break;
    case RelationshipScenario.BOREDOM:
      weights.wands += 1.5;
      break;
    case RelationshipScenario.UNREQUITED_LOVE:
      weights.cups += 2.0;   // 감정 카드 집중 (Knight/Page of Cups)
      weights.wands += 1.5;  // 용기 에너지
      weights.major += 1.3;  // The Fool, The Lovers
      break;
    case RelationshipScenario.RECONNECTION:
      weights.major += 1.8;  // Judgement, Wheel of Fortune (운명적 재회)
      weights.cups += 1.5;   // 감정 연결
      weights.swords += 1.2; // 과거 상처
      break;
    case RelationshipScenario.FIRST_MEETING:
      weights.cups += 1.8;   // 설렘, 새 감정
      weights.wands += 1.5;  // 열정, 에너지
      weights.major += 1.3;  // The Fool (새 시작)
      break;
    case RelationshipScenario.COMMITMENT_FEAR:
      weights.swords += 1.8; // 내면 갈등 (8 of Swords, 4 of Swords)
      weights.major += 1.5;  // The Hermit (고독)
      weights.cups += 1.2;   // 억제된 감정
      break;
    case RelationshipScenario.RELATIONSHIP_PACE:
      weights.cups += 1.5;   // 감정 에너지
      weights.wands += 1.3;  // 진도 에너지
      weights.pentacles += 1.2; // 현실적 안정
      break;
    case RelationshipScenario.ONLINE_LOVE:
      weights.cups += 1.5;   // 감정
      weights.major += 1.2;  // The Moon (환상/현실 구분)
      weights.wands += 1.3;  // 열정
      break;
    default:
      break;
  }

  return weights;
}

function reversedProbability(emotionScore: number): number {
  // base 30%, increases to max 50% for score <= -3
  const base = 0.3;
  const max = 0.5;
  if (emotionScore >= 0) return base;
  const delta = Math.min(Math.abs(emotionScore) / 3, 1) * (max - base);
  return base + delta;
}

function cardWeight(card: TarotCard, weights: SuitWeight): number {
  if (card.arcana === 'major') return weights.major;
  switch (card.suit) {
    case 'cups':      return weights.cups;
    case 'swords':    return weights.swords;
    case 'wands':     return weights.wands;
    case 'pentacles': return weights.pentacles;
    default:          return 1;
  }
}

function weightedShuffle(
  cards: TarotCard[],
  weights: SuitWeight,
): TarotCard[] {
  // Fisher-Yates weighted shuffle: assign each card a sortKey = random / weight
  // Higher weight → smaller denominator → higher sortKey on average
  const scored = cards.map((card) => ({
    card,
    key: Math.random() / cardWeight(card, weights),
  }));
  // Sort ascending: smallest key = highest weight → comes first → slice(0,N) picks them
  scored.sort((a, b) => a.key - b.key);
  return scored.map((s) => s.card);
}

// -------------------------------------------------------
// Public API
// -------------------------------------------------------

export function drawCards(
  count: number,
  emotionScore = 0,
  scenario?: RelationshipScenario,
): DrawnCard[] {
  const weights = buildWeights(emotionScore, scenario);
  const shuffled = weightedShuffle([...TAROT_CARDS], weights);
  const revProb = reversedProbability(emotionScore);

  return shuffled.slice(0, count).map((card) => ({
    card,
    isReversed: Math.random() < revProb,
  }));
}

export function getSingleSpread(
  emotionScore = 0,
  scenario?: RelationshipScenario,
): SpreadCard {
  const [drawn] = drawCards(1, emotionScore, scenario);
  return {
    ...drawn,
    position: '현재 마음',
    interpretation: interpretCard(drawn.card, drawn.isReversed, scenario),
  };
}

export function getThreeCardSpread(
  emotionScore = 0,
  scenario?: RelationshipScenario,
): SpreadCard[] {
  const positions = ['과거', '현재', '미래'];
  const drawn = drawCards(3, emotionScore, scenario);
  return drawn.map((d, i) => ({
    ...d,
    position: positions[i],
    interpretation: interpretCard(d.card, d.isReversed, scenario),
  }));
}

export function interpretCard(
  card: TarotCard,
  isReversed: boolean,
  scenario?: RelationshipScenario,
): string {
  const base = isReversed ? card.loveReversed : card.loveUpright;

  if (!scenario || scenario === RelationshipScenario.GENERAL) {
    return base;
  }

  const contextMap: Partial<Record<RelationshipScenario, string>> = {
    [RelationshipScenario.READ_AND_IGNORED]:
      '읽씹 상황에서 상대의 침묵이 마음에 걸리는 지금,',
    [RelationshipScenario.GHOSTING]:
      '연락이 끊긴 상황에서 불안한 마음을 안고,',
    [RelationshipScenario.JEALOUSY]:
      '질투와 불안이 교차하는 지금 이 감정 속에서,',
    [RelationshipScenario.LONG_DISTANCE]:
      '멀리 있어 그리움이 쌓이는 이 시간,',
    [RelationshipScenario.INFIDELITY]:
      '배신의 상처가 아직 아픈 지금,',
    [RelationshipScenario.BREAKUP_CONTEMPLATION]:
      '헤어짐을 고민하는 갈림길에 서서,',
    [RelationshipScenario.BOREDOM]:
      '권태로움이 찾아온 이 시기에,',
    [RelationshipScenario.UNREQUITED_LOVE]:
      '혼자 품어온 마음을 카드에 담아,',
    [RelationshipScenario.RECONNECTION]:
      '다시 만남을 고민하는 갈림길에서,',
    [RelationshipScenario.FIRST_MEETING]:
      '설레는 새 만남의 에너지 속에서,',
    [RelationshipScenario.COMMITMENT_FEAR]:
      '관계 앞에서 두려움이 느껴지는 지금,',
    [RelationshipScenario.RELATIONSHIP_PACE]:
      '우리 관계가 어디로 가는지 궁금한 지금,',
    [RelationshipScenario.ONLINE_LOVE]:
      '화면 너머의 연결을 카드로 읽어,',
  };

  const prefix = contextMap[scenario];
  return prefix ? `${prefix} ${base}` : base;
}

export function getCardContext(drawnCards: DrawnCard[]): string {
  const lines: string[] = ['[현재 뽑힌 타로카드]'];

  for (const drawn of drawnCards) {
    const { card, isReversed, position, interpretation } = drawn;
    const direction = isReversed ? '역방향' : '정방향';
    const interp =
      interpretation ?? interpretCard(card, isReversed);

    const posLine = position
      ? `- 위치: ${position} | 카드: ${card.name} (${direction})`
      : `- 카드: ${card.name} (${direction})`;

    lines.push(posLine);
    lines.push(`  키워드: ${card.keywords.join(', ')}`);
    lines.push(`  해석: ${interp}`);
  }

  return lines.join('\n');
}

/** 연애 전용 5장 스프레드 */
export function getLoveSpread(
  emotionScore?: number,
  scenario?: RelationshipScenario,
): DrawnCard[] {
  const cards = drawCards(5, emotionScore, scenario);
  const positions = ['나의 마음 💜', '상대의 마음 💙', '관계의 현재 💕', '장애물 ⚡', '카드의 조언 ✨'];
  return cards.map((dc, i) => ({ ...dc, position: positions[i] }));
}

// -------------------------------------------------------
// 🆕 v23: 시나리오 전문 스프레드 5종
// -------------------------------------------------------

/** 💘 짝사랑 전용 6장 스프레드 (UNREQUITED_LOVE) */
export function getUnrequitedSpread(
  emotionScore?: number,
  scenario?: RelationshipScenario,
): SpreadCard[] {
  const positions = [
    '상대방의 특징 👤',
    '상대의 표현 방식 💬',
    '나를 향한 감정 💗',
    '숨겨진 장애물 ⚡',
    '발전 가능성 🌱',
    '최종 방향 🔮',
  ];
  const drawn = drawCards(6, emotionScore, scenario ?? RelationshipScenario.UNREQUITED_LOVE);
  return drawn.map((d, i) => ({
    ...d,
    position: positions[i],
    interpretation: interpretCard(d.card, d.isReversed, scenario ?? RelationshipScenario.UNREQUITED_LOVE),
  }));
}

/** 🔁 재회 가능성 6장 스프레드 (RECONNECTION) */
export function getReconnectionSpread(
  emotionScore?: number,
  scenario?: RelationshipScenario,
): SpreadCard[] {
  const positions = [
    '이별의 핵심 원인 💔',
    '상대의 현재 감정 💙',
    '재회 가능성 🌙',
    '내가 변화해야 할 것 🦋',
    '재회 시 리스크 ⚡',
    '최종 에너지 ✨',
  ];
  const drawn = drawCards(6, emotionScore, scenario ?? RelationshipScenario.RECONNECTION);
  return drawn.map((d, i) => ({
    ...d,
    position: positions[i],
    interpretation: interpretCard(d.card, d.isReversed, scenario ?? RelationshipScenario.RECONNECTION),
  }));
}

/** ✨ 썸·진도 5장 스프레드 (FIRST_MEETING / RELATIONSHIP_PACE) */
export function getPaceSpread(
  emotionScore?: number,
  scenario?: RelationshipScenario,
): SpreadCard[] {
  const positions = [
    '나의 내면적 욕구 💜',
    '상대의 현재 감정 💙',
    '외부 영향 요인 🌍',
    '넘어야 할 과제 ⚡',
    '관계의 방향성 🔮',
  ];
  const drawn = drawCards(5, emotionScore, scenario ?? RelationshipScenario.FIRST_MEETING);
  return drawn.map((d, i) => ({
    ...d,
    position: positions[i],
    interpretation: interpretCard(d.card, d.isReversed, scenario ?? RelationshipScenario.FIRST_MEETING),
  }));
}

/** 🚪 회피형 연인 6장 스프레드 (COMMITMENT_FEAR) */
export function getAvoidantSpread(
  emotionScore?: number,
  scenario?: RelationshipScenario,
): SpreadCard[] {
  const positions = [
    '회피의 표면 이유 🎭',
    '상대의 진짜 감정 💔',
    '내가 보내는 에너지 🔥',
    '관계의 역학 ⚖️',
    '변화 가능성 🌱',
    '나의 행동 제안 ✨',
  ];
  const drawn = drawCards(6, emotionScore, scenario ?? RelationshipScenario.COMMITMENT_FEAR);
  return drawn.map((d, i) => ({
    ...d,
    position: positions[i],
    interpretation: interpretCard(d.card, d.isReversed, scenario ?? RelationshipScenario.COMMITMENT_FEAR),
  }));
}

/** ⚡ Yes/No 타로 1장 스프레드 */
export function getYesNoSpread(
  emotionScore?: number,
  scenario?: RelationshipScenario,
): SpreadCard[] {
  const [drawn] = drawCards(1, emotionScore, scenario);
  // Yes/No 판정: Major 정방향=강한 yes, Major 역방향=강한 no
  // Cups/Wands 정방향=yes, Swords/Pentacles 역방향=no, 나머지=maybe
  let answer: 'yes' | 'no' | 'maybe' = 'maybe';
  if (drawn.card.arcana === 'major') {
    answer = drawn.isReversed ? 'no' : 'yes';
  } else if (!drawn.isReversed && (drawn.card.suit === 'cups' || drawn.card.suit === 'wands')) {
    answer = 'yes';
  } else if (drawn.isReversed && (drawn.card.suit === 'swords' || drawn.card.suit === 'pentacles')) {
    answer = 'no';
  }

  const answerLabel = answer === 'yes' ? 'Yes ✨' : answer === 'no' ? 'No 🌙' : 'Maybe 🔮';
  return [{
    ...drawn,
    position: `카드의 답: ${answerLabel}`,
    interpretation: `${answerLabel} — ${interpretCard(drawn.card, drawn.isReversed, scenario)}`,
  }];
}
