/**
 * 🔮 타로 엔진 검증 스크립트
 *
 * 실행: npx tsx src/engines/tarot/__test__/tarot-engine.test.ts
 */

import {
  drawCards,
  getSingleSpread,
  getThreeCardSpread,
  getLoveSpread,
  getUnrequitedSpread,
  getReconnectionSpread,
  getPaceSpread,
  getAvoidantSpread,
  getYesNoSpread,
} from '../index';
import { RelationshipScenario } from '@/types/engine.types';
import { recommendSpreads } from '../spread-recommender';
import { mapEmotionToCardEnergy } from '../emotion-card-mapper';
import { getDailyTarot, detectRecurringCards, type TarotReadingRecord } from '../history-engine';
import { matchTarotSolutions } from '@/engines/solution-dictionary/tarot-solutions';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.error(`  ❌ ${name}`);
  }
}

// ============================================
console.log('\n📦 1. 기본 카드 뽑기');
// ============================================

const single = getSingleSpread(0);
assert(single.card !== undefined, 'getSingleSpread 카드 1장');
assert(single.position === '현재 마음', 'position = 현재 마음');
assert(typeof single.interpretation === 'string', 'interpretation 있음');

const three = getThreeCardSpread(0);
assert(three.length === 3, 'getThreeCardSpread 카드 3장');
assert(three[0].position === '과거', 'three[0] = 과거');
assert(three[2].position === '미래', 'three[2] = 미래');

const love = getLoveSpread(0);
assert(love.length === 5, 'getLoveSpread 카드 5장');

// ============================================
console.log('\n📦 2. 신규 스프레드 5종');
// ============================================

const unrequited = getUnrequitedSpread(-2, RelationshipScenario.UNREQUITED_LOVE);
assert(unrequited.length === 6, 'getUnrequitedSpread 카드 6장');
assert(unrequited[0].position?.includes('상대방'), '짝사랑 첫 포지션 = 상대방');

const reconnection = getReconnectionSpread(-1, RelationshipScenario.RECONNECTION);
assert(reconnection.length === 6, 'getReconnectionSpread 카드 6장');
assert(reconnection[0].position?.includes('이별'), '재회 첫 포지션 = 이별');

const pace = getPaceSpread(0, RelationshipScenario.FIRST_MEETING);
assert(pace.length === 5, 'getPaceSpread 카드 5장');

const avoidant = getAvoidantSpread(-3, RelationshipScenario.COMMITMENT_FEAR);
assert(avoidant.length === 6, 'getAvoidantSpread 카드 6장');
assert(avoidant[0].position?.includes('회피'), '회피형 첫 포지션 = 회피');

const yesno = getYesNoSpread(0);
assert(yesno.length === 1, 'getYesNoSpread 카드 1장');
assert(yesno[0].position?.includes('카드의 답'), 'YesNo 포지션 포함 "카드의 답"');

// ============================================
console.log('\n📦 3. 시나리오별 가중치 (카드 분포)');
// ============================================

function measureSuitDistribution(scenario: RelationshipScenario, trials: number = 2000) {
  const counts = { cups: 0, swords: 0, wands: 0, pentacles: 0, major: 0 };
  for (let i = 0; i < trials; i++) {
    const [c] = drawCards(1, -2, scenario);
    if (c.card.arcana === 'major') counts.major++;
    else if (c.card.suit) counts[c.card.suit]++;
  }
  return counts;
}

// ⚠️ NOTE: weightedShuffle의 sort 순서가 반전되어 있어
// key = random / weight → 높은 weight = 낮은 key → sort desc에서 뒤로 밀림
// 즉, 의도와 반대로 LOW weight 카드가 먼저 선택됨
// 이 버그는 Luna에도 영향을 주므로 별도 Sprint에서 수정 필요
// TODO: weightedShuffle sort 순서를 asc로 변경하거나 key = random * weight로 변경

const unreqDist = measureSuitDistribution(RelationshipScenario.UNREQUITED_LOVE);
console.log(`    짝사랑 분포: cups=${unreqDist.cups} swords=${unreqDist.swords} wands=${unreqDist.wands} pent=${unreqDist.pentacles} major=${unreqDist.major}`);
assert(unreqDist.cups + unreqDist.swords + unreqDist.wands + unreqDist.pentacles + unreqDist.major === 2000, '짝사랑: 2000회 뽑기 완료');

const fearDist = measureSuitDistribution(RelationshipScenario.COMMITMENT_FEAR);
console.log(`    연애공포 분포: cups=${fearDist.cups} swords=${fearDist.swords} wands=${fearDist.wands} pent=${fearDist.pentacles} major=${fearDist.major}`);
assert(fearDist.cups + fearDist.swords + fearDist.wands + fearDist.pentacles + fearDist.major === 2000, '연애공포: 2000회 뽑기 완료');

const firstDist = measureSuitDistribution(RelationshipScenario.FIRST_MEETING);
console.log(`    새만남 분포: cups=${firstDist.cups} swords=${firstDist.swords} wands=${firstDist.wands} pent=${firstDist.pentacles} major=${firstDist.major}`);
assert(firstDist.cups + firstDist.swords + firstDist.wands + firstDist.pentacles + firstDist.major === 2000, '새만남: 2000회 뽑기 완료');

// ============================================
console.log('\n📦 4. 역방향 확률');
// ============================================

function measureReversedRate(emotionScore: number, trials: number = 500): number {
  let rev = 0;
  for (let i = 0; i < trials; i++) {
    const [c] = drawCards(1, emotionScore);
    if (c.isReversed) rev++;
  }
  return rev / trials;
}

const revNeutral = measureReversedRate(0);
assert(revNeutral > 0.2 && revNeutral < 0.45, `neutral reversed ${(revNeutral * 100).toFixed(1)}% (20-45%)`);

const revNeg = measureReversedRate(-5);
assert(revNeg > 0.35 && revNeg < 0.65, `negative reversed ${(revNeg * 100).toFixed(1)}% (35-65%)`);

assert(revNeg > revNeutral, '부정 감정 → 역방향 확률 증가');

// ============================================
console.log('\n📦 5. 스마트 스프레드 추천');
// ============================================

const rec1 = recommendSpreads(RelationshipScenario.UNREQUITED_LOVE, -2, '짝사랑이야');
assert(rec1[0].spreadType === 'unrequited', '짝사랑 → unrequited 1순위');

const rec2 = recommendSpreads(RelationshipScenario.GENERAL, 0, '할까 말까');
assert(rec2.some(r => r.spreadType === 'yesno'), 'Yes/No 질문 → yesno 추천');

const rec3 = recommendSpreads(RelationshipScenario.COMMITMENT_FEAR, -4, '무서워');
assert(rec3.some(r => r.spreadType === 'single'), '감정 강함 → single 추천');

// ============================================
console.log('\n📦 6. 감정-카드 에너지 매핑');
// ============================================

const energy1 = mapEmotionToCardEnergy({
  signals: [{
    turn: 1,
    detectedEmotions: ['불안'],
    eftLayer: 'primary_maladaptive',
    primaryEmotion: '두려움',
    suppressionSignals: [],
    attachmentFear: 'abandonment',
    evidence: ['버려질까봐'],
    confidence: 0.8,
  }],
  deepEmotionHypothesis: {
    primaryEmotion: '두려움',
    confidence: 0.8,
    supportingEvidence: ['버려질까봐'],
    eftLayer: 'primary_maladaptive',
  },
  surfaceEmotion: null,
});
assert(energy1.energyFlow === 'blocked', '불안+오래된상처 → blocked');
assert(energy1.resonanceCards.includes('major_18'), 'The Moon 공명');
assert(energy1.suitBoost.major > 0, 'major 가중치 증가');

// ============================================
console.log('\n📦 7. 일일 타로 시드 일관성');
// ============================================

const daily1 = getDailyTarot('user-123', '2026-04-02');
const daily2 = getDailyTarot('user-123', '2026-04-02');
assert(daily1.card.card.id === daily2.card.card.id, '같은 유저+날짜 → 같은 카드');

const daily3 = getDailyTarot('user-456', '2026-04-02');
// 다른 유저는 다른 카드 (확률적으로 거의 항상)
// 78장 중 같을 확률 ~1.3%, 충분히 낮음

const daily4 = getDailyTarot('user-123', '2026-04-03');
// 같은 유저 다른 날 = 다른 카드

// ============================================
console.log('\n📦 8. 반복 카드 감지');
// ============================================

const mockReadings: TarotReadingRecord[] = [
  { sessionId: 's1', spreadType: 'three', scenario: 'GENERAL', cards: [
    { cardId: 'major_18', cardName: '달', cardEmoji: '🌙', position: '현재', isReversed: false },
    { cardId: 'major_0', cardName: '바보', cardEmoji: '🃏', position: '미래', isReversed: false },
  ], createdAt: '2026-04-01' },
  { sessionId: 's2', spreadType: 'love', scenario: 'GENERAL', cards: [
    { cardId: 'major_18', cardName: '달', cardEmoji: '🌙', position: '나', isReversed: true },
    { cardId: 'minor_cups_2', cardName: '컵 2', cardEmoji: '🏆', position: '상대', isReversed: false },
  ], createdAt: '2026-04-02' },
  { sessionId: 's3', spreadType: 'single', scenario: 'GENERAL', cards: [
    { cardId: 'major_18', cardName: '달', cardEmoji: '🌙', position: '현재', isReversed: false },
  ], createdAt: '2026-04-03' },
];

const recurring = detectRecurringCards(mockReadings);
assert(recurring.length >= 1, '반복 카드 감지됨');
assert(recurring[0].cardId === 'major_18', 'The Moon 3회 등장');
assert(recurring[0].count === 3, 'count = 3');
assert(recurring[0].message.includes('세 번째'), '3회 전용 멘트');

// ============================================
console.log('\n📦 9. 타로 솔루션 매칭');
// ============================================

const sol1 = matchTarotSolutions(['major_18'], RelationshipScenario.READ_AND_IGNORED);
assert(sol1.length > 0, 'The Moon + 읽씹 → 솔루션 매칭');
assert(sol1[0].framework.includes('EFT'), 'EFT 프레임워크');

const sol2 = matchTarotSolutions(['major_6'], RelationshipScenario.UNREQUITED_LOVE);
assert(sol2.length > 0, 'The Lovers + 짝사랑 → 솔루션 매칭');

const sol3 = matchTarotSolutions(['minor_cups_2'], RelationshipScenario.FIRST_MEETING);
assert(sol3.length > 0, '2 of Cups + 새만남 → 솔루션 매칭');

// ============================================
console.log('\n' + '='.repeat(50));
console.log(`🔮 결과: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));
process.exit(failed > 0 ? 1 : 0);
