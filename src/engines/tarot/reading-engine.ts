import {
  generateWithCascade,
  streamWithCascade,
  type CascadeStreamChunk,
} from '@/lib/ai/provider-registry';
import { getProviderCascade } from '@/lib/ai/smart-router';
import { drawCards, getLoveSpread, getSingleSpread, getThreeCardSpread, getUnrequitedSpread, getReconnectionSpread, getPaceSpread, getAvoidantSpread } from './index';
import type { DrawnCard } from './index';
import type { RelationshipScenario } from '@/types/engine.types';
import {
  type SpreadType,
  getQuestionAnalysisPrompt,
  getReadingPrompt,
  getFollowUpPrompt,
  TAROT_NYANG_SYSTEM,
} from './reading-prompts';

export interface TarotReading {
  spreadType: SpreadType;
  question: string;
  scenario: RelationshipScenario;
  cards: {
    position: string;
    cardId: string;
    cardName: string;
    cardNameEn: string;
    cardEmoji: string;
    keywords: string[];
    isReversed: boolean;
    interpretation: string;
  }[];
  overallReading: string;
  advice: string;
  tarotNyangMessage: string;
  followUpQuestions: string[];
}

export class TarotReadingEngine {
  /** 질문 분석 → 시나리오 + 스프레드 추천 */
  async analyzeQuestion(question: string): Promise<{
    scenario: RelationshipScenario;
    suggestedSpread: SpreadType;
    emotionScore: number;
    spreadReason: string;
  }> {
    const cascade = getProviderCascade('state_analysis');
    const result = await generateWithCascade(
      cascade,
      '',
      [{ role: 'user', content: getQuestionAnalysisPrompt(question) }],
      500,
    );

    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch?.[0] || result.text);
      return {
        scenario: parsed.scenario || 'GENERAL',
        suggestedSpread: parsed.suggestedSpread || 'three',
        emotionScore: parsed.emotionScore ?? 0,
        spreadReason: parsed.spreadReason || '카드가 이 스프레드를 추천하고 있어 🔮',
      };
    } catch {
      return {
        scenario: 'GENERAL' as RelationshipScenario,
        suggestedSpread: 'three',
        emotionScore: 0,
        spreadReason: '카드가 이 스프레드를 추천하고 있어 🔮',
      };
    }
  }

  /** 카드 뽑기 + AI 해석 생성 */
  async generateReading(params: {
    question: string;
    spreadType: SpreadType;
    scenario: RelationshipScenario;
    emotionScore: number;
  }): Promise<TarotReading> {
    // 1. 카드 뽑기
    const drawnCards = this.drawForSpread(params.spreadType, params.emotionScore, params.scenario);

    // 2. AI 해석 생성
    const readingPrompt = getReadingPrompt({
      question: params.question,
      spreadType: params.spreadType,
      cards: drawnCards.map(dc => ({
        position: dc.position || '',
        name: dc.card.name,
        nameEn: dc.card.nameEn,
        keywords: dc.card.keywords,
        isReversed: dc.isReversed,
        loveUpright: dc.card.loveUpright,
        loveReversed: dc.card.loveReversed,
      })),
      scenario: params.scenario,
    });

    const cascade = getProviderCascade('main_response');
    const result = await generateWithCascade(cascade, TAROT_NYANG_SYSTEM, [
      { role: 'user', content: readingPrompt },
    ], 2000);

    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch?.[0] || result.text);

      return {
        spreadType: params.spreadType,
        question: params.question,
        scenario: params.scenario,
        cards: drawnCards.map((dc, i) => ({
          position: dc.position || '',
          cardId: dc.card.id,
          cardName: dc.card.name,
          cardNameEn: dc.card.nameEn,
          cardEmoji: dc.card.emoji,
          keywords: dc.card.keywords,
          isReversed: dc.isReversed,
          interpretation: parsed.cardInterpretations?.[i]?.interpretation ||
            (dc.isReversed ? dc.card.loveReversed : dc.card.loveUpright),
        })),
        overallReading: parsed.overallReading || '',
        advice: parsed.advice || '',
        tarotNyangMessage: parsed.tarotNyangMessage || '카드가 네 마음을 비추고 있어... 🐱',
        followUpQuestions: parsed.followUpQuestions || [
          '이 카드에 대해 더 알고 싶어',
          '다른 카드를 뽑아볼래',
          '구체적인 조언이 궁금해',
        ],
      };
    } catch {
      // 파싱 실패 시 기본 해석 사용
      return {
        spreadType: params.spreadType,
        question: params.question,
        scenario: params.scenario,
        cards: drawnCards.map(dc => ({
          position: dc.position || '',
          cardId: dc.card.id,
          cardName: dc.card.name,
          cardNameEn: dc.card.nameEn,
          cardEmoji: dc.card.emoji,
          keywords: dc.card.keywords,
          isReversed: dc.isReversed,
          interpretation: dc.isReversed ? dc.card.loveReversed : dc.card.loveUpright,
        })),
        overallReading: result.text,
        advice: '',
        tarotNyangMessage: '카드가 네 마음을 비추고 있어... 🐱',
        followUpQuestions: ['이 카드에 대해 더 알고 싶어', '다른 카드를 뽑아볼래', '구체적인 조언이 궁금해'],
      };
    }
  }

  /** 후속 대화 — 스트리밍 */
  async *followUp(params: {
    reading: TarotReading;
    userMessage: string;
    chatHistory: { role: 'user' | 'assistant'; content: string }[];
  }): AsyncGenerator<CascadeStreamChunk> {
    const systemPrompt = getFollowUpPrompt({
      originalQuestion: params.reading.question,
      cards: params.reading.cards.map(c => ({
        position: c.position,
        name: c.cardName,
        isReversed: c.isReversed,
      })),
      overallReading: params.reading.overallReading,
    });

    const cascade = getProviderCascade('main_response');
    yield* streamWithCascade(cascade, systemPrompt, [
      ...params.chatHistory,
      { role: 'user', content: params.userMessage },
    ], 1000);
  }

  /** 스프레드 타입별 카드 뽑기 */
  private drawForSpread(
    spreadType: SpreadType,
    emotionScore?: number,
    scenario?: RelationshipScenario,
  ): DrawnCard[] {
    switch (spreadType) {
      case 'single':
      case 'yesno':
        return [getSingleSpread(emotionScore, scenario)];
      case 'three':
        return getThreeCardSpread(emotionScore, scenario);
      case 'love':
        return getLoveSpread(emotionScore, scenario);
      case 'unrequited':
        return getUnrequitedSpread(emotionScore, scenario);
      case 'reconnection':
        return getReconnectionSpread(emotionScore, scenario);
      case 'pace':
        return getPaceSpread(emotionScore, scenario);
      case 'avoidant':
        return getAvoidantSpread(emotionScore, scenario);
      default:
        return getThreeCardSpread(emotionScore, scenario);
    }
  }
}
