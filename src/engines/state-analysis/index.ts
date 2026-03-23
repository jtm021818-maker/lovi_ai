import {
  StateResult,
  RiskLevel,
  AttachmentType,
  DistortionType,
  HorsemenType,
  ClientIntent,
  RelationshipScenario,
} from '@/types/engine.types';
import { RiskUtil } from './risk.util';
import { FloodingUtil } from './flooding.util';
import { analyzeStateWithHaiku } from '@/lib/ai/claude';
import { calcEmotionScore } from '@/lib/utils/korean-nlp';
import { safeParseLLMJson } from '@/lib/utils/safe-json';

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

      // 🆕 v7.1: 키워드 기반 시나리오 오버라이드 (8B LLM 오분류 보정)
      const msgLower = userMessage.toLowerCase();
      const readIgnoredKeywords = ['읽씹', '안읽씹', '읽고 답', '읽었는데 답', '확인만 하고', '1 사라졌', '1 그대로', '읽고 무시'];
      if (scenario !== RelationshipScenario.READ_AND_IGNORED &&
          readIgnoredKeywords.some(kw => msgLower.includes(kw))) {
        console.log(`[StateAnalysis] ⚠️ 시나리오 오버라이드: ${scenario} → READ_AND_IGNORED (키워드 감지)`);
        scenario = RelationshipScenario.READ_AND_IGNORED;
      }

      return {
        emotionScore: Math.max(-5, Math.min(5, parsed.emotionScore ?? 0)),
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
