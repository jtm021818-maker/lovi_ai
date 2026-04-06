import {
  StateResult,
  RiskLevel,
  AttachmentType,
  DistortionType,
  HorsemenType,
  ClientIntent,
  RelationshipScenario,
  EmotionSignal,
} from '@/types/engine.types';
import { RiskUtil } from './risk.util';
import { FloodingUtil } from './flooding.util';
import { analyzeStateWithHaiku } from '@/lib/ai/claude';
import { calcEmotionScore } from '@/lib/utils/korean-nlp';
import { safeParseLLMJson } from '@/lib/utils/safe-json';
import { getScenarioOverride } from './scenario-keywords';

/**
 * 상태 분석 엔진 (하이브리드 접근)
 * - 1차 필터: 로컬 위기감지 + 플러딩 감지 (결정론적, 즉시)
 * - 2차 분석: Claude Haiku structured output (확률적, 정확)
 */
export class StateAnalysisEngine {
  private static instance: StateAnalysisEngine;

  static getInstance(): StateAnalysisEngine {
    if (!StateAnalysisEngine.instance) {
      StateAnalysisEngine.instance = new StateAnalysisEngine();
    }
    return StateAnalysisEngine.instance;
  }

  /**
   * 🆕 v19: LLM 응답에서 EmotionSignal 구성
   */
  private buildEmotionSignal(parsed: any, turn: number): EmotionSignal {
    const validEftLayers = ['primary_adaptive', 'primary_maladaptive', 'secondary_reactive', 'instrumental'];
    const validFears = ['abandonment', 'rejection', 'inadequacy', 'loss_of_control'];

    return {
      turn,
      detectedEmotions: Array.isArray(parsed.detectedEmotions)
        ? parsed.detectedEmotions.filter((e: any) => typeof e === 'string').slice(0, 5)
        : [],
      eftLayer: validEftLayers.includes(parsed.eftLayer)
        ? parsed.eftLayer
        : 'secondary_reactive',
      primaryEmotion: typeof parsed.primaryDeepEmotion === 'string'
        ? parsed.primaryDeepEmotion.slice(0, 30)
        : undefined,
      suppressionSignals: Array.isArray(parsed.suppressionSignals)
        ? parsed.suppressionSignals.filter((s: any) => typeof s === 'string').slice(0, 5)
        : [],
      attachmentFear: validFears.includes(parsed.attachmentFear)
        ? parsed.attachmentFear as EmotionSignal['attachmentFear']
        : null,
      evidence: Array.isArray(parsed.emotionEvidence)
        ? parsed.emotionEvidence.filter((e: any) => typeof e === 'string').slice(0, 3)
        : [],
      confidence: 0.7,
    };
  }

  /**
   * 🆕 v16: 감정 체크 준비도 신호 감지
   * - 지연 신호: 유저가 아직 더 말하고 싶어하는 패턴
   * - 준비 신호: 유저가 감정 체크에 준비된 패턴
   */
  private detectEmotionCheckReadiness(
    userMessage: string,
    primaryIntent: string,
  ): { delaySignals: string[]; readySignals: string[]; isReady: boolean } {
    const delaySignals: string[] = [];
    const readySignals: string[] = [];

    // 지연 신호 1: 긴 메시지 (80자 이상 → 아직 할 말이 많음)
    if (userMessage.length >= 80) {
      delaySignals.push('long_message');
    }

    // 지연 신호 2: 연결어/계속어 포함
    const continuationMarkers = ['근데', '그리고', '또', '사실은', '있잖아', '그래서', '아 그리고', '추가로', '더 말하자면', '참고로'];
    if (continuationMarkers.some(m => userMessage.includes(m))) {
      delaySignals.push('continuation_marker');
    }

    // 지연 신호 3: 유저가 질문을 던짐 (아직 대화를 이어가고 싶음)
    const questionPatterns = ['어떻게 해', '이거 정상', '이게 맞아', '왜 그런', '어떡해', '뭐가 문제', '이유가 뭐'];
    if (questionPatterns.some(q => userMessage.includes(q))) {
      delaySignals.push('user_question');
    }

    // 지연 신호 4: VENTING 또는 STORYTELLING intent
    if (primaryIntent === 'VENTING' || primaryIntent === 'STORYTELLING') {
      delaySignals.push('venting_or_storytelling');
    }

    // 준비 신호 1: 짧은 반응 (30자 이하)
    if (userMessage.length <= 30) {
      readySignals.push('short_reply');
    }

    // 준비 신호 2: 감정 단어 사용
    const emotionWords = ['힘들어', '슬퍼', '화나', '짜증', '속상', '서운', '불안', '무서워', '답답', '외로워', '우울', '지쳐', '멘붕', '미칠것같', '죽겠', '눈물'];
    if (emotionWords.some(w => userMessage.includes(w))) {
      readySignals.push('emotion_word');
    }

    // 준비 신호 3: 공감/인정 추구 intent
    if (primaryIntent === 'SEEKING_EMPATHY' || primaryIntent === 'SEEKING_VALIDATION') {
      readySignals.push('seeking_empathy');
    }

    // 준비 신호 4: 동의/수긍 반응
    const agreementWords = ['맞아', '응', '그래', 'ㅇㅇ', 'ㅇ', '그치', '맞는데', '인정'];
    if (agreementWords.some(w => userMessage.trim().startsWith(w) || userMessage.length <= 10)) {
      readySignals.push('agreement');
    }

    // 판단: 준비 신호가 있고 지연 신호가 없으면 ready
    const isReady = readySignals.length > 0 && delaySignals.length === 0;

    return { delaySignals, readySignals, isReady };
  }

  async analyze(
    userMessage: string,
    recentMessages: { role: 'user' | 'ai'; content: string }[],
    context: string = ''
  ): Promise<StateResult> {
    // 1차 필터: 로컬 위기 감지 (즉시, 결정론적)
    const riskLevel = RiskUtil.assess(userMessage);

    // 위기 상황이면 나머지 분석 스킵 → 즉시 반환
    if (riskLevel === RiskLevel.HIGH) {
      return {
        emotionScore: -5,
        cognitiveDistortions: [],
        attachmentType: AttachmentType.UNKNOWN,
        horsemenDetected: [],
        riskLevel: RiskLevel.HIGH,
        isFlooding: false,
        linguisticProfile: { isAmbivalent: false, isSuppressive: false },
      };
    }

    // 1차 필터: 플러딩 감지
    const recentUserMessages = recentMessages
      .filter((m) => m.role === 'user')
      .map((m) => m.content);
    const isFlooding = FloodingUtil.detect(userMessage, recentUserMessages);

    // 2차 분석: Claude Haiku structured output
    try {
      const haikuResponse = await analyzeStateWithHaiku(
        userMessage,
        recentUserMessages.slice(-5),
        context
      );

      const parsed = safeParseLLMJson(haikuResponse, null as any);
      if (!parsed) throw new Error('LLM JSON 파싱 실패');

      // Gemini가 대소문자를 다르게 반환할 수 있으므로 대문자로 정규화
      const normalizeUpper = (arr: string[]) => (arr ?? []).map((s: string) => s.toUpperCase().replace(/[\s-]/g, '_'));

      // 시나리오 분류
      let scenario = Object.values(RelationshipScenario).includes(parsed.relationshipScenario)
        ? parsed.relationshipScenario as RelationshipScenario
        : RelationshipScenario.GENERAL;

      // 🆕 v13: 키워드 사전 기반 시나리오 오버라이드 (전체 8 시나리오, 가중치+패턴+disambiguation)
      const override = getScenarioOverride(userMessage, scenario);
      if (override) {
        console.log(`[StateAnalysis] ⚠️ 시나리오 오버라이드: ${scenario} → ${override.scenario} (${override.reason})`);
        scenario = override.scenario;
      }

      // 🆕 v16: 감정 체크 준비도 신호 감지
      const emotionCheckReadiness = this.detectEmotionCheckReadiness(
        userMessage,
        parsed.primaryIntent ?? 'VENTING',
      );

      return {
        emotionScore: Math.max(-5, Math.min(5, parsed.emotionScore ?? 0)),
        emotionReason: typeof parsed.emotionReason === 'string' ? parsed.emotionReason : undefined,
        cognitiveDistortions: normalizeUpper(parsed.cognitiveDistortions).filter(
          (d: string) => Object.values(DistortionType).includes(d as DistortionType)
        ) as DistortionType[],
        attachmentType: Object.values(AttachmentType).includes(parsed.attachmentType?.toUpperCase())
          ? parsed.attachmentType.toUpperCase()
          : AttachmentType.UNKNOWN,
        horsemenDetected: normalizeUpper(parsed.horsemenDetected).filter(
          (h: string) => Object.values(HorsemenType).includes(h as HorsemenType)
        ) as HorsemenType[],
        riskLevel,
        isFlooding,
        linguisticProfile: {
          isAmbivalent: parsed.isAmbivalent ?? false,
          isSuppressive: parsed.isSuppressive ?? false,
        },
        intent: {
          primaryIntent: Object.values(ClientIntent).includes(parsed.primaryIntent)
            ? parsed.primaryIntent
            : ClientIntent.VENTING,
          secondaryIntent: parsed.secondaryIntent && Object.values(ClientIntent).includes(parsed.secondaryIntent)
            ? parsed.secondaryIntent
            : undefined,
          confidence: 0.8,
          emotionalIntensity: ['low', 'medium', 'high', 'crisis'].includes(parsed.emotionalIntensity)
            ? parsed.emotionalIntensity
            : 'medium',
          changeReadiness: 'contemplation' as const,
        },
        scenario,
        // 🆕 v7.1: LLM 기반 읽씹 축 추출
        llmReadIgnoredAxes: scenario === RelationshipScenario.READ_AND_IGNORED ? {
          duration: parsed.readIgnoredDuration ?? undefined,
          stage: parsed.readIgnoredStage ?? undefined,
          readType: parsed.readIgnoredReadType ?? undefined,
          pattern: parsed.readIgnoredPattern ?? undefined,
        } : undefined,
        // 🆕 v12: 관계진단 범용 축
        conflictStyle: parsed.conflictStyle ?? undefined,
        relationshipStrength: parsed.relationshipStrength ?? undefined,
        changeReadiness: parsed.changeReadiness ?? undefined,
        partnerContext: parsed.partnerContext ?? undefined,
        previousAttempts: parsed.previousAttempts ?? undefined,
        // 🆕 v16: 감정 체크 준비도
        emotionCheckReadiness,
        // 🆕 v19: 감정 신호 (감정 누적기용)
        emotionSignal: this.buildEmotionSignal(parsed, 0),
        // 🆕 v20: 해결책 준비도 (5A Framework)
        solutionReadiness: ['NOT_READY', 'EXPLORING', 'READY'].includes(parsed.solutionReadiness)
          ? parsed.solutionReadiness
          : 'NOT_READY',
      };
    } catch {
      // LLM 분석 실패 시 korean-nlp 기반 fallback
      const localEmotionScore = calcEmotionScore(userMessage);
      console.warn(`[StateAnalysis] LLM 분석 실패 → korean-nlp fallback (score: ${localEmotionScore})`);
      return {
        emotionScore: localEmotionScore,
        cognitiveDistortions: [],
        attachmentType: AttachmentType.UNKNOWN,
        horsemenDetected: [],
        riskLevel,
        isFlooding,
        linguisticProfile: { isAmbivalent: false, isSuppressive: false },
      };
    }
  }
}
