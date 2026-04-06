/**
 * 🔮 v23: 타로 카드 동적 해석 엔진
 *
 * TAROT_INSIGHT (SOLVE 단계)에서 사용
 * LLM이 카드 조합 + 유저 감정 + 시나리오를 종합해서 깊은 해석 생성
 */

import { generateWithCascade } from '@/lib/ai/provider-registry';
import { getProviderCascade } from '@/lib/ai/smart-router';
import type { RelationshipScenario, TarotInsightData } from '@/types/engine.types';
import { TAROT_NYANG_SYSTEM } from './reading-prompts';

interface InsightInput {
  cards: {
    position: string;
    cardName: string;
    cardEmoji: string;
    isReversed: boolean;
    interpretation?: string;
  }[];
  scenario: RelationshipScenario;
  emotionScore: number;
  /** 감정 누적기에서 추출한 깊은 감정 (예: "버림받을까봐 두려움") */
  deepEmotion?: string;
  /** 대화에서 감지된 핵심 키워드 */
  userContext?: string;
}

/**
 * LLM 기반 동적 타로 인사이트 생성
 *
 * 카드 조합 + 시나리오 + 감정을 종합해서
 * insight(핵심 메시지), advice(조언), actionItems(미니 과제)를 생성
 */
export async function generateDynamicTarotInsight(
  input: InsightInput,
): Promise<TarotInsightData> {
  const { cards, scenario, emotionScore, deepEmotion, userContext } = input;

  const cardList = cards
    .map(
      (c) =>
        `- ${c.position}: ${c.cardEmoji} ${c.cardName} (${c.isReversed ? '역방향' : '정방향'})${c.interpretation ? ' — ' + c.interpretation : ''}`,
    )
    .join('\n');

  const prompt = `아래 타로 카드 리딩 결과를 종합 분석해서 JSON으로 답해.

## 뽑힌 카드
${cardList}

## 유저 상황
- 시나리오: ${scenario}
- 감정 점수: ${emotionScore} (-5=매우 힘듬 ~ +5=괜찮음)
${deepEmotion ? `- 핵심 감정: ${deepEmotion}` : ''}
${userContext ? `- 맥락: ${userContext}` : ''}

## 요구사항
반드시 다음 JSON만 출력 (다른 텍스트 없이):
{
  "insight": "카드 조합이 말하는 핵심 메시지 (2문장, 시적이면서 구체적. 타로냥 톤)",
  "advice": "카드가 제안하는 구체적 행동 조언 (1-2문장, 현실적)",
  "actionItems": ["이번 주 실행 가능한 미니 과제 1", "미니 과제 2"],
  "tarotNyangMessage": "타로냥 캐릭터 멘트 (1문장, 🐱 이모지 포함)"
}

## 해석 원칙
1. 카드 조합의 시너지를 읽어. 개별 카드보다 조합이 중요
2. 역방향 카드는 "차단된 에너지"로 해석 (부정 아닌 성장 기회)
3. actionItems는 카드 메타포를 활용해. "달 카드처럼..." 식으로
4. 심리학(EFT/CBT) 개념은 타로 메타포로 변환해서 전달`;

  try {
    const cascade = getProviderCascade('state_analysis');
    const result = await generateWithCascade(cascade, TAROT_NYANG_SYSTEM, [
      { role: 'user', content: prompt },
    ], 600);

    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[0] || result.text);

    return {
      cards: cards.map((c) => ({
        position: c.position,
        cardName: c.cardName,
        cardEmoji: c.cardEmoji,
        isReversed: c.isReversed,
      })),
      insight: parsed.insight || '카드들이 네 마음을 비추고 있어...',
      advice: parsed.advice || '카드의 에너지를 믿고 한 걸음씩 나아가봐',
      actionItems: (parsed.actionItems || []).slice(0, 3),
      tarotNyangMessage:
        parsed.tarotNyangMessage || '냥~ 카드들이 말하는 걸 좀 더 깊이 읽어볼게 🐱✨',
    };
  } catch (e) {
    console.warn('[TarotInsight] LLM 해석 실패, 폴백 사용:', e);
    // 폴백: 카드 이름 기반 정적 메시지
    const cardNames = cards.map((c) => c.cardName).join(', ');
    return {
      cards: cards.map((c) => ({
        position: c.position,
        cardName: c.cardName,
        cardEmoji: c.cardEmoji,
        isReversed: c.isReversed,
      })),
      insight: `${cardNames} — 이 카드들이 함께 나온 건 변화의 시점이 왔다는 뜻이야.`,
      advice: '카드의 에너지를 믿고 한 걸음씩 나아가봐',
      actionItems: [
        '오늘 카드 메시지를 일기에 적어보기',
        '상대에게 솔직한 한 마디 전해보기',
      ],
      tarotNyangMessage: '냥~ 카드들이 말하는 걸 좀 더 깊이 읽어볼게 🐱✨',
    };
  }
}
