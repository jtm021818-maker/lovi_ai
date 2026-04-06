/**
 * 🔮 v2.0: 타로냥 전문 상담 턴 오케스트레이터
 *
 * 10턴 구조의 전문 상담 플로우를 관리
 * 각 턴의 전략 결정 + 컨텍스트 누적 + Phase 자동 전진
 */

import type { RelationshipScenario, EmotionAccumulatorState } from '@/types/engine.types';
import type { SpreadType } from '../reading-prompts';
import type { DrawnCard } from '../index';
import type { CardEnergyMapping } from '../emotion-card-mapper';

// ─── Types ──────────────────────────────────────────────

export type ConsultationPhase =
  | 'GROUNDING'
  | 'INTAKE_1'
  | 'INTAKE_2'
  | 'ENERGY_CONNECT'
  | 'CARD_READING_1'
  | 'CARD_READING_2'
  | 'DEEP_MIRROR'
  | 'REFRAME'
  | 'ACTION_ANCHOR'
  | 'CLOSING_RITUAL';

export type SessionMood = 'light' | 'medium' | 'heavy';
export type PowerDynamic = 'pursuer' | 'distancer' | 'balanced' | 'unknown';
export type AttachmentHint = 'anxious' | 'avoidant' | 'secure' | 'unknown';

export interface ColdReadingData {
  surfaceEmotion: string;
  deepEmotion?: string;
  emotionTemperature: number;
  somaticResponse?: string;
  powerDynamic: PowerDynamic;
  attachmentHint: AttachmentHint;
  repetitionPattern: boolean;
  scenario: RelationshipScenario;
  barnumHits: number;
}

export interface TurnOrchestratorConfig {
  sessionId: string;
  userId: string;
  isReturningUser: boolean;
  previousCards?: string[];
  previousInsight?: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'lateNight';
}

export interface TurnContext {
  turnNumber: number;
  phase: ConsultationPhase;

  // 누적 유저 메시지
  userMessages: string[];

  // 감정/상담 데이터 (턴별 누적)
  coldReadingData: Partial<ColdReadingData>;
  emotionAccumulator?: EmotionAccumulatorState;
  energyMapping?: CardEnergyMapping;
  scenarioConfidence: { scenario: RelationshipScenario; confidence: number } | null;

  // 카드 데이터 (Turn 4+)
  selectedEnergyCard?: string;
  drawnCards?: DrawnCard[];
  spreadType?: SpreadType;

  // 상담 데이터 (Turn 7+)
  mirroringResponse?: string;
  dominantNarrative?: string;
  reframingApplied: boolean;
  projectionResponse?: string;

  // 세션 메타
  sessionMood: SessionMood;
  empathyLevel: 1 | 2 | 3;
}

export interface TurnResponse {
  phase: ConsultationPhase;
  turnNumber: number;
  message: string;
  event?: 'TAROT_AXIS_COLLECT' | 'TAROT_DRAW' | 'TAROT_INSIGHT';
  promptContext: string;
  metadata: Record<string, unknown>;
}

// Phase 순서 (고정)
const PHASE_ORDER: ConsultationPhase[] = [
  'GROUNDING',
  'INTAKE_1',
  'INTAKE_2',
  'ENERGY_CONNECT',
  'CARD_READING_1',
  'CARD_READING_2',
  'DEEP_MIRROR',
  'REFRAME',
  'ACTION_ANCHOR',
  'CLOSING_RITUAL',
];

// ─── 오케스트레이터 ──────────────────────────────────────

export class TurnOrchestrator {
  private config: TurnOrchestratorConfig;
  private context: TurnContext;

  constructor(config: TurnOrchestratorConfig) {
    this.config = config;
    this.context = this.initContext();
  }

  // ─── 초기화 ──────────────────

  private initContext(): TurnContext {
    return {
      turnNumber: 1,
      phase: 'GROUNDING',
      userMessages: [],
      coldReadingData: {},
      scenarioConfidence: null,
      reframingApplied: false,
      sessionMood: 'medium',
      empathyLevel: 2,
    };
  }

  // ─── Public API ──────────────

  /** 현재 턴 컨텍스트 조회 */
  getContext(): Readonly<TurnContext> {
    return { ...this.context };
  }

  /** 현재 Phase 조회 */
  getCurrentPhase(): ConsultationPhase {
    return this.context.phase;
  }

  /** 현재 턴 번호 */
  getCurrentTurn(): number {
    return this.context.turnNumber;
  }

  /** 유저 메시지 수신 → 다음 턴 전략 결정 */
  processUserMessage(message: string): TurnStrategy {
    this.context.userMessages.push(message);

    const strategy = this.buildStrategy(message);

    return strategy;
  }

  /** Phase 전진 (외부에서 턴 완료 후 호출) */
  advancePhase(): ConsultationPhase {
    const idx = PHASE_ORDER.indexOf(this.context.phase);
    if (idx < PHASE_ORDER.length - 1) {
      this.context.phase = PHASE_ORDER[idx + 1];
      this.context.turnNumber++;
    }
    return this.context.phase;
  }

  /** 감정 데이터 업데이트 */
  updateColdReadingData(data: Partial<ColdReadingData>): void {
    this.context.coldReadingData = {
      ...this.context.coldReadingData,
      ...data,
    };
  }

  /** 시나리오 확정 */
  setScenario(scenario: RelationshipScenario, confidence: number): void {
    this.context.scenarioConfidence = { scenario, confidence };
  }

  /** 에너지 카드 선택 기록 */
  setEnergyCard(card: string): void {
    this.context.selectedEnergyCard = card;
  }

  /** 카드 리딩 결과 기록 */
  setDrawnCards(cards: DrawnCard[], spreadType: SpreadType): void {
    this.context.drawnCards = cards;
    this.context.spreadType = spreadType;
  }

  /** 미러링 반응 기록 */
  setMirroringResponse(response: string): void {
    this.context.mirroringResponse = response;
  }

  /** 지배적 서사 기록 */
  setDominantNarrative(narrative: string): void {
    this.context.dominantNarrative = narrative;
  }

  /** 세션 무드 업데이트 */
  updateSessionMood(mood: SessionMood): void {
    this.context.sessionMood = mood;
  }

  /** 공감 레벨 업데이트 */
  updateEmpathyLevel(level: 1 | 2 | 3): void {
    this.context.empathyLevel = level;
  }

  /** 세션 요약 데이터 생성 */
  buildSessionSummary(): SessionSummary {
    return {
      sessionId: this.config.sessionId,
      userId: this.config.userId,
      totalTurns: this.context.turnNumber,
      scenario: this.context.scenarioConfidence?.scenario ?? ('GENERAL' as RelationshipScenario),
      spreadType: this.context.spreadType,
      cards: this.context.drawnCards?.map((dc) => ({
        cardId: dc.card.id,
        cardName: dc.card.name,
        cardEmoji: dc.card.emoji,
        position: dc.position ?? '',
        isReversed: dc.isReversed,
      })),
      emotionJourney: {
        initial: this.context.coldReadingData.surfaceEmotion ?? 'unknown',
        deep: this.context.coldReadingData.deepEmotion,
        temperature: this.context.coldReadingData.emotionTemperature ?? 5,
      },
      dominantNarrative: this.context.dominantNarrative,
      reframingApplied: this.context.reframingApplied,
      sessionMood: this.context.sessionMood,
      isReturningUser: this.config.isReturningUser,
    };
  }

  // ─── 전략 빌더 (내부) ─────────

  private buildStrategy(message: string): TurnStrategy {
    const msgLen = message.length;

    switch (this.context.phase) {
      case 'GROUNDING':
        return this.groundingStrategy();

      case 'INTAKE_1':
        return this.intake1Strategy(message, msgLen);

      case 'INTAKE_2':
        return this.intake2Strategy(message, msgLen);

      case 'ENERGY_CONNECT':
        return this.energyConnectStrategy();

      case 'CARD_READING_1':
        return this.cardReading1Strategy();

      case 'CARD_READING_2':
        return this.cardReading2Strategy();

      case 'DEEP_MIRROR':
        return this.deepMirrorStrategy(message);

      case 'REFRAME':
        return this.reframeStrategy(message);

      case 'ACTION_ANCHOR':
        return this.actionAnchorStrategy();

      case 'CLOSING_RITUAL':
        return this.closingRitualStrategy();
    }
  }

  private groundingStrategy(): TurnStrategy {
    const { isReturningUser, timeOfDay, previousCards } = this.config;

    let openerType: 'mystical' | 'warm' | 'curious' | 'familiar' = 'mystical';
    if (isReturningUser && previousCards?.length) openerType = 'familiar';
    else if (timeOfDay === 'morning') openerType = 'warm';
    else if (timeOfDay === 'afternoon') openerType = 'curious';
    else if (timeOfDay === 'lateNight') openerType = 'mystical';

    return {
      phase: 'GROUNDING',
      responseType: 'opener',
      openerType,
      includeGrounding: timeOfDay === 'lateNight',
      icebreakerType: isReturningUser ? 'returning_check' : 'mood_choice',
      event: undefined,
    };
  }

  private intake1Strategy(message: string, msgLen: number): TurnStrategy {
    let responseType: 'emotion_first' | 'situation_zoom' | 'intuition_hook' = 'emotion_first';

    if (msgLen < 20) responseType = 'situation_zoom';
    else if (message.includes('?') || message.includes('까')) responseType = 'intuition_hook';

    // 감정 강도 추정
    const negativeWords = ['힘들', '아프', '슬프', '화나', '불안', '무서', '답답', '우울', '지치'];
    const matchCount = negativeWords.filter((w) => message.includes(w)).length;
    if (matchCount >= 2) this.context.empathyLevel = 3;
    else if (matchCount >= 1) this.context.empathyLevel = 2;

    return {
      phase: 'INTAKE_1',
      responseType,
      empathyLevel: this.context.empathyLevel,
      offerChoices: msgLen < 30,
      event: undefined,
    };
  }

  private intake2Strategy(message: string, _msgLen: number): TurnStrategy {
    const hasEmotionDetail =
      message.includes('불안') ||
      message.includes('화') ||
      message.includes('슬프') ||
      message.includes('두려') ||
      message.includes('무서');

    return {
      phase: 'INTAKE_2',
      responseType: hasEmotionDetail ? 'emotion_layering' : 'feeling_thermometer',
      includeRelationDynamic: true,
      includeAttachmentProbe: this.context.turnNumber >= 3,
      event: undefined,
    };
  }

  private energyConnectStrategy(): TurnStrategy {
    return {
      phase: 'ENERGY_CONNECT',
      responseType: 'cold_reading_then_axis',
      coldReadingTechniques: ['barnum', 'rainbow_ruse'],
      event: 'TAROT_AXIS_COLLECT',
    };
  }

  private cardReading1Strategy(): TurnStrategy {
    return {
      phase: 'CARD_READING_1',
      responseType: 'narrative_reading_part1',
      cardRange: [0, 3],
      narrativeStyle: 'storytelling',
      event: 'TAROT_DRAW',
    };
  }

  private cardReading2Strategy(): TurnStrategy {
    const totalCards = this.context.drawnCards?.length ?? 3;
    return {
      phase: 'CARD_READING_2',
      responseType: 'narrative_reading_part2',
      cardRange: [3, totalCards],
      narrativeStyle: 'synthesis',
      event: undefined,
    };
  }

  private deepMirrorStrategy(_message: string): TurnStrategy {
    // Major Arcana 카드가 있으면 아키타입 연결
    const hasMajor = this.context.drawnCards?.some((dc) => dc.card.arcana === 'major') ?? false;

    return {
      phase: 'DEEP_MIRROR',
      responseType: 'projection_and_mirror',
      useProjection: true,
      useMirroring: true,
      useArchetype: hasMajor,
      event: undefined,
    };
  }

  private reframeStrategy(_message: string): TurnStrategy {
    this.context.reframingApplied = true;
    return {
      phase: 'REFRAME',
      responseType: 'reframe_with_sfbt',
      useSFBT: true,
      event: 'TAROT_INSIGHT',
    };
  }

  private actionAnchorStrategy(): TurnStrategy {
    const scenario = this.context.scenarioConfidence?.scenario;
    return {
      phase: 'ACTION_ANCHOR',
      responseType: 'mini_experiment',
      actionCategory: this.pickActionCategory(scenario),
      includeRitual: true,
      event: undefined,
    };
  }

  private closingRitualStrategy(): TurnStrategy {
    return {
      phase: 'CLOSING_RITUAL',
      responseType: 'closing',
      sessionMood: this.context.sessionMood,
      includeCliffhanger: true,
      includeDailyCard: true,
      event: undefined,
    };
  }

  private pickActionCategory(
    scenario?: RelationshipScenario,
  ): string {
    if (!scenario) return 'reflection';
    const map: Partial<Record<string, string>> = {
      UNREQUITED_LOVE: 'courage',
      RECONNECTION: 'reflection',
      FIRST_MEETING: 'courage',
      BREAKUP_CONTEMPLATION: 'self_care',
      BOREDOM: 'communication',
      GHOSTING: 'boundary',
      READ_AND_IGNORED: 'boundary',
      JEALOUSY: 'reflection',
      COMMITMENT_FEAR: 'self_care',
      RELATIONSHIP_PACE: 'communication',
    };
    return map[scenario as string] ?? 'reflection';
  }
}

// ─── 전략 인터페이스 ─────────────────────────────────────

export interface TurnStrategy {
  phase: ConsultationPhase;
  responseType: string;
  event?: 'TAROT_AXIS_COLLECT' | 'TAROT_DRAW' | 'TAROT_INSIGHT';
  [key: string]: unknown;
}

export interface SessionSummary {
  sessionId: string;
  userId: string;
  totalTurns: number;
  scenario: RelationshipScenario;
  spreadType?: SpreadType;
  cards?: {
    cardId: string;
    cardName: string;
    cardEmoji: string;
    position: string;
    isReversed: boolean;
  }[];
  emotionJourney: {
    initial: string;
    deep?: string;
    temperature: number;
  };
  dominantNarrative?: string;
  reframingApplied: boolean;
  sessionMood: SessionMood;
  isReturningUser: boolean;
}
