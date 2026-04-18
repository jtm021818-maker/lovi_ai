import { StateAnalysisEngine } from '@/engines/state-analysis';
import { StrategySelectionEngine } from '@/engines/strategy-selection';
import { PromptGenerator } from '@/engines/prompt-generator';
import { BehavioralInductionEngine } from '@/engines/behavioral-induction';
import { shouldShowSuggestions } from '@/engines/suggestion-gate';
import { mapTherapeuticResponse, determineRelationshipPhase, shouldAskPermission } from '@/engines/response-type';
import { RiskLevel, ResponseMode, ClientIntent, RelationshipScenario, STRATEGY_TO_CATEGORY, CATEGORY_INTENT_MAP } from '@/types/engine.types';
import type { PipelineResult, NudgeAction, StateResult, StrategyResult, SuggestionMeta, SuggestionItem, SuggestionCategory, ConversationPhaseV2, PhaseEvent, PhaseEventType, EmotionAccumulatorState, EmotionMirrorData, StrategyMode } from '@/types/engine.types';
import { accumulateSignal, setSurfaceFromThermometer } from '@/engines/emotion-accumulator';
import { generateDynamicMirror } from '@/engines/emotion-accumulator/mirror-generator';
import { generateDynamicPatterns } from '@/engines/emotion-accumulator/pattern-generator';
import { generateSituationScene } from '@/engines/situation-scene-generator';
import { matchSolutions, calculateReadiness, getSolutionDictionaryPrompt, parseAxesFromMessage, analyzeAxesState, generateDiagnosticPrompt, mergeLLMAxes, markAxisAsked, generateAxisChoices } from '@/engines/solution-dictionary';
import type { ReadIgnoredAxes, AxisChoice } from '@/engines/solution-dictionary';
import type { PersonaMode, PanelResponse } from '@/types/persona.types';
import { generateWithCascade, streamWithCascade, type RetryStatusEvent, type CascadeStreamChunk } from '@/lib/ai/provider-registry';
import { runDeepResearch, generateThinkingPhrases, extractKeyword } from '@/lib/ai/deep-research';
import { saveMemory } from '@/engines/human-like/memory-engine';
import { routeModel } from '@/lib/ai/model-router';
import { validateResponse } from '@/lib/ai/response-validator';
import { retrieveMemories, formatMemoriesAsContext } from '@/lib/rag/retriever';
import { PhaseManager, type PhaseContext } from '@/engines/phase-manager';
import { HumanLikeEngine } from '@/engines/human-like';
import { parsePhaseSignal } from '@/engines/human-like/phase-signal';
import { resetCascadeLog, getCascadeLog } from '@/lib/ai/provider-registry';
import { LogCollector } from '@/lib/utils/logger';
// 🧠 이중뇌 (Gemini 판단 → Claude 발화) — 상담 모드 전용
import { executeDualBrain, DUAL_BRAIN_CONFIG } from '@/engines/dual-brain';

// 🫀 v54: 변연계 (Limbic System) — 시간적 감정 지속
import {
  onSessionStart as limbicSessionStart,
  onTurn as limbicOnTurn,
  formatLimbicForPrompt,
  LIMBIC_CONFIG,
} from '@/engines/limbic';

// 🧠 v54: ACC (Anterior Cingulate Cortex) — 모순 감지
import { analyzeAcc, ACC_CONFIG } from '@/engines/acc';

// 📱 v55: KBE (Kakao Behavior Engine) — 카톡 행동 LLM 판단
import { runKBE, KBE_CONFIG } from '@/engines/kbe';
import { createEmotionThermometer, createMindReading, createSituationSummary, createEmotionMirror, createPatternMirror, createSolutionPreview, createSolutionCard, createMessageDraft, createGrowthReport, createSessionSummary, createHomeworkCard, createTarotAxisCollect, createTarotDraw, createTarotInsight, createTarotSessionSummary, createTarotHomework, createLunaStory, createLunaStrategy, createToneSelect, createDraftWorkshop, createRoleplayFeedback, createPanelReport, createIdeaRefine, createActionPlan, createWarmWrap } from '@/engines/phase-manager/events';
import { generateDynamicTarotInsight } from '@/engines/tarot/interpretation-engine';
import { matchTarotSolutions, getTarotSolutionPrompt } from '@/engines/solution-dictionary/tarot-solutions';
import { mapEmotionToCardEnergy, getEnergyPromptHint } from '@/engines/tarot/emotion-card-mapper';
import { getPhasePrompt, getTransitionPrompt } from '@/engines/phase-manager/phase-prompts';
import { RelationshipDiagnosisEngine } from '@/engines/relationship-diagnosis';
import type { DiagnosisResult, DiagnosisAxesState } from '@/engines/relationship-diagnosis/types';
import { generateDiagnosisPrompt } from '@/engines/relationship-diagnosis/diagnosis-prompts';
import { buildTurnPrompt, type TurnPromptContext } from '@/engines/tarot/prompts/turn-prompts';
import { detectScenario as detectTarotScenario } from '@/engines/tarot/consultation/intake';

/** 위기 대응 메시지 */
const CRISIS_MESSAGE = `지금 많이 힘드시죠. 혼자가 아니에요. 💙

지금 느끼시는 감정은 충분히 이해할 수 있어요. 하지만 이런 순간에는 전문 상담사와 이야기하는 것이 큰 도움이 될 수 있어요.

📞 자살예방상담전화: 1393 (24시간)
📞 정신건강위기상담전화: 1577-0199
📞 생명의전화: 1588-9191

언제든 다시 이야기하러 오셔도 괜찮아요. 당신은 소중한 사람이에요.`;

/**
 * 6단계 파이프라인 오케스트레이터 (인간화 고도화)
 */
// 🆕 ACE v4: 루나의 현재 생각 + 이해도 계산
function computeLunaThinking(
  phase: ConversationPhaseV2,
  turnsInPhase: number,
  stateResult: StateResult,
  completedEvents: string[],
): { lunaThinking: string; understandingLevel: number } {
  const hasEmotion = stateResult.emotionReason && stateResult.emotionReason.length > 5;
  const emotionScore = Math.abs(stateResult.emotionScore ?? 0);

  switch (phase) {
    case 'HOOK': {
      // 이해도: 감정 파악 정도에 따라
      let level = Math.min(30, turnsInPhase * 10); // 기본: 턴당 10%
      if (hasEmotion) level += 25; // 감정 이유 파악됨
      if (emotionScore >= 3) level += 15; // 강한 감정 감지
      if (completedEvents.includes('EMOTION_THERMOMETER')) level = 95;
      level = Math.min(95, level);

      // 생각 텍스트: 이해도에 따라 변화
      const thoughts = level < 20
        ? '이야기 더 들어볼게...'
        : level < 40
        ? '음... 좀 더 들어봐야겠어'
        : level < 60
        ? '감정이 좀 보이기 시작해...'
        : level < 80
        ? '아... 이 사람 마음이 읽히기 시작해'
        : '거의 파악했어, 마음 읽어볼게';

      return { lunaThinking: thoughts, understandingLevel: level };
    }
    case 'MIRROR': {
      let level = Math.min(40, turnsInPhase * 15);
      if (hasEmotion) level += 30;
      if (completedEvents.includes('EMOTION_MIRROR')) level = 95;
      level = Math.min(95, level);
      const thoughts = level < 40
        ? '겉감정 말고 진짜 감정을 찾는 중...'
        : level < 70
        ? '이 감정 밑에 뭐가 있는 것 같은데...'
        : '진짜 감정이 보여... 확인해볼게';
      return { lunaThinking: thoughts, understandingLevel: level };
    }
    case 'BRIDGE': {
      // 🆕 v38: BRIDGE = 같이 준비 (모드별 실행)
      // 모드 완료 이벤트(DRAFT_WORKSHOP/ROLEPLAY_FEEDBACK/PANEL_REPORT/IDEA_REFINE)로 진행률 계산
      const modeCompleteEvents = ['DRAFT_WORKSHOP', 'ROLEPLAY_FEEDBACK', 'PANEL_REPORT', 'IDEA_REFINE'];
      const modeCompleted = modeCompleteEvents.some(e => completedEvents.includes(e));

      let level = Math.min(40, turnsInPhase * 20);
      if (completedEvents.includes('TONE_SELECT')) level = Math.max(level, 55);
      if (modeCompleted) level = 95;
      level = Math.min(95, level);

      // 현재 어떤 모드인지 판단해서 적절한 사고 문구
      let thoughts: string;
      if (modeCompleted) {
        thoughts = '준비 됐어! 정리해볼게';
      } else if (completedEvents.includes('TONE_SELECT')) {
        thoughts = '카톡 초안 만드는 중... ✍️';
      } else if (level < 40) {
        thoughts = '어떻게 할지 같이 생각 중 🔥';
      } else {
        thoughts = '같이 준비하는 중...';
      }
      return { lunaThinking: thoughts, understandingLevel: level };
    }
    case 'SOLVE': {
      // 🆕 v39: SOLVE = "같이 해보기" (S1 실전제안 → S2 같이만들기 → S3 시뮬레이션)
      // ACTION_PLAN 카드 발동 시 100%
      let level = Math.min(50, 30 + turnsInPhase * 18);
      if (completedEvents.includes('ACTION_PLAN')) level = 95;
      level = Math.min(95, level);

      let thoughts: string;
      if (completedEvents.includes('ACTION_PLAN')) {
        thoughts = '오늘의 작전 완성! 🔥';
      } else if (turnsInPhase <= 1) {
        thoughts = '실전에서 해볼 방법 떠올리는 중... 💡';
      } else if (turnsInPhase === 2) {
        thoughts = '너 스타일로 다듬는 중 🛠️';
      } else {
        thoughts = '머릿속으로 한번 돌려보자 🎯';
      }
      return { lunaThinking: thoughts, understandingLevel: level };
    }
    case 'EMPOWER': {
      // 🆕 v39: EMPOWER = 다독이기 + 재방문 약속
      let level = Math.min(80, 60 + turnsInPhase * 15);
      if (completedEvents.includes('WARM_WRAP')) level = 100;
      level = Math.min(100, level);

      const thoughts = completedEvents.includes('WARM_WRAP')
        ? '오늘 정말 잘했어 💜'
        : '따뜻하게 마무리 중... 🤗';
      return { lunaThinking: thoughts, understandingLevel: level };
    }
    default:
      return { lunaThinking: '듣고 있어...', understandingLevel: 10 };
  }
}

export class CounselingPipeline {
  private stateEngine = StateAnalysisEngine.getInstance();
  private strategyEngine = StrategySelectionEngine.getInstance();
  private promptGen = PromptGenerator.getInstance();
  private behaviorEngine = BehavioralInductionEngine.getInstance();

  async *execute(
    userMessage: string,
    chatHistory: { role: 'user' | 'ai'; content: string }[],
    context: string = '',
    ragContext?: { supabase: any; userId: string; sessionId?: string; activeMode?: string | null },
    /** 페르소나 모드 (상담사/친구/전문가 패널) */
    persona: PersonaMode = 'counselor',
    /** 현재 대화 턴 수 */
    turnCount: number = 0,
    /** 🆕 선택지 메타 (피드백 루프) */
    suggestionMeta?: SuggestionMeta,
    /** 🆕 마지막으로 선택지를 표시한 턴 번호 */
    lastSuggestionTurn: number = -1,
    /** 🆕 현재 전략이 연속으로 선택된 횟수 */
    consecutiveStrategyCount: number = 1,
    /** 🆕 v3: 직전 응답 모드 (연속 방지) */
    lastResponseMode?: string,
    /** 🆕 v2: 감정 메모리 요약 */
    emotionalMemorySummary: string = '',
    /** 🆕 v7: 읽씹 5축 진단 상태 (세션 누적) */
    diagnosticAxes?: Partial<ReadIgnoredAxes>,
    /** 🆕 v8: 현재 Phase (세션 누적) */
    currentPhaseV2?: ConversationPhaseV2,
    /** 🆕 v8: 완료된 이벤트 목록 */
    completedEvents?: PhaseEventType[],
    /** 🆕 v8: 감정 기준선 */
    emotionBaseline?: number,
    /** 🆕 v9: 고정된 시나리오 (세션 최초 감지 후 끝까지 유지) */
    lockedScenario?: RelationshipScenario,
    /** 🆕 v10: 마지막 이벤트 발생 턴 (쿨다운용) */
    lastEventTurn: number = 0,
    /** 🆕 v10.1: 유저 확정 감정 점수 (온도계 조정 후 확정된 값) */
    confirmedEmotionScore?: number,
    /** 🆕 v10.2: 턴별 감정 점수 히스토리 (세션 누적) */
    emotionHistory: number[] = [],
    /** 🆕 v19: 감정 누적기 상태 (세션 누적) */
    emotionAccumulatorState?: EmotionAccumulatorState,
    /** 🆕 v20: Phase 시작 턴 (상대 턴 계산용) */
    phaseStartTurn: number = 0,
    /** 🆕 v23: 타로 세션 메타 (스프레드 선택, 뽑은 카드 등) */
    tarotMeta?: { chosenSpreadType?: string; cards?: any[] },
    /** 🆕 v29: 루나 감정 상태 (세션간 유지) */
    savedLunaEmotionState?: string | null,
    /** 🆕 v30: 세션 스토리 상태 (대화 흐름 누적) */
    savedSessionStory?: string | null,
    /** 🆕 ACE v4: 메모리 프로필 (유저 장기 기억) */
    memoryProfile?: any,
    /** 🆕 ACE v4: 유저 이름 */
    userName?: string,
    /** 🆕 v35: 저장된 작전 모드 (BRIDGE 모드 실행 단계 지속) */
    savedStrategyMode?: StrategyMode | null,
    /** 🆕 v37: 저장된 상황 인식 히스토리 (세션간 유지) */
    savedSituationReadHistory?: string[],
    /** 🆕 v37: 저장된 속마음 히스토리 (세션간 유지) */
    savedLunaThoughtHistory?: string[],
  ): AsyncGenerator<
    | { type: 'state'; data: StateResult }
    | { type: 'strategy'; data: StrategyResult }
    | { type: 'text'; data: string }
    | { type: 'panel'; data: PanelResponse }
    | { type: 'suggestions'; data: SuggestionItem[] }
    | { type: 'nudge'; data: NudgeAction[] }
    | { type: 'axis_choices'; data: { axis: 'duration' | 'stage'; choices: AxisChoice[] } }
    | { type: 'axes_progress'; data: { filledCount: number; totalCount: number; isComplete: boolean; axes?: Partial<ReadIgnoredAxes> } }
    | { type: 'phase_event'; data: PhaseEvent }
    | { type: 'phase_change'; data: { phase: ConversationPhaseV2; progress: number; lunaThinking?: string; understandingLevel?: number } }
    // 🆕 v40: 루나가 "진짜 생각하는 중" UI 이벤트 (Gemini Grounding DeepResearch)
    | { type: 'luna_thinking_deep'; data: { status: 'started' | 'done'; keyword?: string; phrases?: string[]; durationMs?: number; hasInsight?: boolean } }
    // 🆕 v79: 루나 감정 기반 미세 연출 (shake/flash/particle/bubble 효과)
    | { type: 'fx'; data: { id: string; target: 'screen' | 'bubble' | 'text' | 'avatar' | 'particle' | 'bg'; duration?: number; params?: Record<string, any>; messageId?: string } }
    // 🆕 v81: BRIDGE 몰입 모드 완료 — 프론트에서 modeStore.exit() 트리거
    | { type: 'mode_complete'; data: { mode: string; summary: string; nextStep?: string } }
    // 🆕 v48: 캐스케이드 재시도 상태 — UI에서 예쁜 재시도 표시용
    | { type: 'retry_status'; data: RetryStatusEvent }
    | { type: 'done'; data: { stateResult: StateResult; strategyResult: StrategyResult; suggestionShown: boolean; responseMode?: ResponseMode; updatedAxes?: Partial<ReadIgnoredAxes>; phaseV2?: ConversationPhaseV2; completedEvents?: PhaseEventType[]; lastEventTurn?: number; confirmedEmotionScore?: number; emotionHistory?: number[]; promptStyle?: string; emotionAccumulatorState?: EmotionAccumulatorState; phaseStartTurn?: number; lunaEmotionState?: string; sessionStoryState?: string; strategyMode?: StrategyMode | null; intimacyState?: import('@/engines/intimacy').IntimacyState | null; intimacyPersonaKey?: 'luna' | 'tarot'; intimacyAll?: { luna: import('@/engines/intimacy').IntimacyState; tarot: import('@/engines/intimacy').IntimacyState } | null; intimacyLevelUp?: { oldLevel: number; newLevel: number; newLevelName: string } | null; _contextLog?: any } }
  > {
    const logCollector = new LogCollector();
    // 🆕 v31: Step 1 + Step 4를 병렬 실행 (상태분석과 RAG는 독립적 — ~200~500ms 절약)
    const tPipeStart = Date.now();
    resetCascadeLog(); // 🆕 v46: 이번 턴의 캐스케이드 로그 초기화
    const ragPromise = ragContext
      ? retrieveMemories(ragContext.supabase, ragContext.userId, userMessage)
          .then(formatMemoriesAsContext)
          .catch(() => '')
      : Promise.resolve('');

    const [stateResult, ragText] = await Promise.all([
      this.stateEngine.analyze(userMessage, chatHistory, context),
      ragPromise,
    ]);
    console.log(`[Perf] ⏱️ state+RAG 병렬: ${Date.now() - tPipeStart}ms`);

    // 🆕 v9: 시나리오 sticky — 세션에 고정된 시나리오가 있으면 LLM 재감지 결과를 무시
    if (lockedScenario && lockedScenario !== RelationshipScenario.GENERAL) {
      if (stateResult.scenario !== lockedScenario) {
        console.log(`[Pipeline] 🔒 시나리오 sticky: ${stateResult.scenario} → ${lockedScenario} (세션 고정)`);
        stateResult.scenario = lockedScenario;
      }
    }

    yield { type: 'state', data: stateResult };

    // 🆕 v19: 감정 누적기 — 매 턴 감정 신호 누적
    let updatedAccumulator = emotionAccumulatorState ?? { signals: [], deepEmotionHypothesis: null, surfaceEmotion: null };
    if (stateResult.emotionSignal) {
      updatedAccumulator = accumulateSignal(updatedAccumulator, stateResult.emotionSignal, turnCount);
      console.log(`[Pipeline] 🧠 감정 신호 누적: turn=${turnCount}, deep="${updatedAccumulator.deepEmotionHypothesis?.primaryEmotion ?? '(없음)'}", signals=${updatedAccumulator.signals.length}`);
    }

    // 🆕 v19: 온도계 응답 시 겉감정 설정
    if (suggestionMeta?.source === 'emotion_thermometer' && confirmedEmotionScore !== undefined) {
      updatedAccumulator = setSurfaceFromThermometer(updatedAccumulator, confirmedEmotionScore);
      console.log(`[Pipeline] 🌡️→🪞 온도계 결과를 겉감정으로 설정: "${updatedAccumulator.surfaceEmotion?.label}" (${confirmedEmotionScore}점)`);
    }

    // 🆕 v10.2: 감정 히스토리 누적 + 급격한 변화 감지
    const updatedEmotionHistory = [...emotionHistory, stateResult.emotionScore];
    if (emotionHistory.length > 0) {
      const prevScore = emotionHistory[emotionHistory.length - 1];
      const delta = Math.abs(stateResult.emotionScore - prevScore);
      if (delta >= 3) {
        console.warn(`[Pipeline] ⚠️ 감정 급변 감지! ${prevScore} → ${stateResult.emotionScore} (Δ=${delta}) — 위기 모니터링`);
      }
    }
    console.log(`[Pipeline] 📊 감정 히스토리: [${updatedEmotionHistory.join(', ')}]`);

    // Step 2: 위기 선택지 직접 실행 — CRISIS_CONNECT
    if (suggestionMeta?.category === 'CRISIS_CONNECT') {
      yield { type: 'text', data: '전문 상담사와 연결해 드릴게요. 💙\n\n📞 자살예방상담전화: 1393 (24시간)\n📞 정신건강위기상담전화: 1577-0199\n📱 카카오톡 상담: "마음이음" 검색' };
      yield {
        type: 'nudge',
        data: [{
          type: 'quick_reply',
          title: '지금 바로 전화하기',
          description: '1393 (24시간 무료)',
          data: { phone: '1393' },
        }],
      };
      yield { type: 'done', data: { stateResult, strategyResult: { strategyType: 'CRISIS_SUPPORT' as any, reason: '전문기관 연결 요청', priority: 0, thinkingBudget: 'low' as const, modelTier: 'sonnet' as const }, suggestionShown: false } };
      return;
    }

    // Step 2b: 위기 대응 — CRITICAL만 즉시 반환
    if (stateResult.riskLevel === RiskLevel.CRITICAL) {
      yield { type: 'text', data: CRISIS_MESSAGE };
      yield {
        type: 'nudge',
        data: [
          {
            type: 'quick_reply',
            title: '긴급 연결',
            description: '전문 상담 기관에 연결합니다.',
            data: { options: ['전화 상담 연결', '채팅 상담 연결', '괜찮아요, 대화 계속할래요'] },
          },
        ],
      };
      yield { type: 'done', data: { stateResult, strategyResult: { strategyType: 'CALMING' as any, reason: '위기 대응', priority: 0, thinkingBudget: 'low', modelTier: 'sonnet' }, suggestionShown: false } };
      return;
    }

    // Step 3: 전략 선택 + 선택지 오버라이드
    let strategyResult = this.strategyEngine.selectStrategy(stateResult);

    // 🆕 선택지 피드백 루프: 전략 오버라이드
    if (suggestionMeta?.source === 'suggestion' && suggestionMeta.strategyHint) {
      const shouldRejectOverride =
        stateResult.riskLevel === RiskLevel.HIGH ||
        stateResult.riskLevel === RiskLevel.MEDIUM_HIGH;

      if (!shouldRejectOverride) {
        const originalStrategy = strategyResult.strategyType;
        strategyResult = {
          ...strategyResult,
          strategyType: suggestionMeta.strategyHint,
          reason: `선택지 오버라이드: ${originalStrategy} → ${suggestionMeta.strategyHint} (사용자 의지 존중)`,
        };
      }
    }

    yield { type: 'strategy', data: strategyResult };


    // 🆕 v31: RAG는 상단에서 상태분석과 병렬 실행 완료 (ragText 사용 가능)

    // 🆕 선택지 컨텍스트 주입 (프롬프트에 사용자 의도 전달)
    let suggestionContext = '';
    if (suggestionMeta?.source === 'suggestion' && suggestionMeta.category) {
      const intent = CATEGORY_INTENT_MAP[suggestionMeta.category] || '';
      suggestionContext = `\n[선택지 클릭 감지] 사용자가 선택지에서 "${userMessage}"를 골랐습니다.\n이는 ${intent}을(를) 보인 것이므로, 이를 반영하여 응답하세요.`;
    }

    // 🆕 v10.2: effectiveEmotionScore — 확정 점수 우선, 없으면 AI 분석 점수
    const effectiveEmotionScore = confirmedEmotionScore ?? stateResult.emotionScore;
    console.log(`[Pipeline] 🎯 유효 감정점수: ${effectiveEmotionScore} (${confirmedEmotionScore !== undefined ? `유저확정=${confirmedEmotionScore}` : `AI분석=${stateResult.emotionScore}`})`);

    // 🆕 Step 4.5: 선택지 게이트 판단 — effectiveEmotionScore 사용
    // 🆕 v23: 타로 페르소나에서는 Luna식 텍스트 선택지 비활성화 (카드 이벤트가 대신)
    const gateResult = persona === 'tarot'
      ? { show: false, reason: '타로 페르소나: 카드 이벤트로 대체' }
      : shouldShowSuggestions({
          turnCount,
          strategyType: strategyResult.strategyType,
          emotionScore: effectiveEmotionScore,
          riskLevel: stateResult.riskLevel,
          persona,
          lastSuggestionTurn,
          consecutiveStrategyCount,
          isFromSuggestion: suggestionMeta?.source === 'suggestion',
        });
    console.log(`[Pipeline] 선택지 게이트: ${gateResult.show ? '✅ PASS' : '❌ BLOCK'} — ${gateResult.reason}`);

    // 🆕 v4: 연애 특화 단계 결정
    const intentResult = stateResult.intent ?? {
      primaryIntent: ClientIntent.VENTING,
      confidence: 0.5,
      emotionalIntensity: 'medium' as const,
      changeReadiness: 'contemplation' as const,
    };

    // 의도 기반 단계 전이 판단
    const hasAskedForAdvice = intentResult.primaryIntent === ClientIntent.SEEKING_ADVICE;
    const hasExpressedInsight = intentResult.primaryIntent === ClientIntent.INSIGHT_EXPRESSION;

    // 시나리오는 sticky에서 이미 보정됨 (위의 state yield 전 체크)
    let currentScenario = stateResult.scenario ?? RelationshipScenario.GENERAL;
    let updatedAxes = diagnosticAxes ?? {};
    let axesState = analyzeAxesState(updatedAxes);
    let diagnosticPromptText = '';

    // 🆕 ACE v4: Luna 모드 — 축/솔루션 사전 우회. AI가 대화 맥락으로 직접 판단.
    // 시나리오는 맥락 힌트로만 유지 (라우팅에 사용 안 함)
    const isLunaACE = persona !== 'tarot' && persona !== 'panel';

    if (!isLunaACE && currentScenario === RelationshipScenario.READ_AND_IGNORED) {
      // 타로/패널만 축 분석 (Luna는 스킵)
      updatedAxes = parseAxesFromMessage(userMessage, updatedAxes);

      // ② 2차: LLM 축 추출 머지 (자연어 이해 기반)
      if (stateResult.llmReadIgnoredAxes) {
        updatedAxes = mergeLLMAxes(updatedAxes, stateResult.llmReadIgnoredAxes as Partial<ReadIgnoredAxes>);
        console.log(`[Pipeline] 🤖 LLM 축 머지 완료`);
      }

      axesState = analyzeAxesState(updatedAxes);
      console.log(`[Pipeline] 📱 읽씹 축: ${axesState.filledCount}/5 | 진단필요: ${axesState.needsDiagnostic} | 다음축: ${axesState.nextAxis} | 선택지폴백: ${axesState.shouldShowChoices}`);

      // 🆕 UI에 축 수집 진행률 전송
      yield {
        type: 'axes_progress',
        data: {
          filledCount: Math.min(5, axesState.filledCount),
          totalCount: 5,
          isComplete: !axesState.needsDiagnostic,
          axes: updatedAxes,
        }
      };

      // 🆕 v9: HOOK 구간(1~2턴)에서는 진단축 질문 금지 (순수 공감만)
      // MIRROR(3턴)부터 매 턴 우선순위대로 자연스럽게 질문
      const shouldAskDiagnostic = turnCount >= 3; // MIRROR 이후부터
      
      // ③ 3차: 선택지 폴백 (duration/stage만 — 이미 질문했는데 못 잡을 때)
      if (shouldAskDiagnostic && axesState.shouldShowChoices && axesState.choicesAxis) {
        const choices = generateAxisChoices(axesState.choicesAxis);
        yield { type: 'axis_choices', data: { axis: axesState.choicesAxis, choices } };
        console.log(`[Pipeline] 🎯 선택지 폴백: ${axesState.choicesAxis} (${choices.length}개)`);
      }
      // 축 질문: MIRROR 이후에만 우선순위대로 자연스럽게 질문
      else if (shouldAskDiagnostic && axesState.needsDiagnostic && axesState.nextAxis) {
        // 축 5(attachmentClue)는 질문 대상 아님
        if (axesState.nextAxis !== 'attachmentClue') {
          diagnosticPromptText = generateDiagnosticPrompt(axesState.nextAxis, persona === 'panel' || persona === 'tarot' ? 'counselor' : persona === 'luna' ? 'friend' : persona);
          // 질문한 축 기록 (askedAxes)
          updatedAxes = markAxisAsked(updatedAxes, axesState.nextAxis);
          console.log(`[Pipeline] 📋 진단축 질문 주입: ${axesState.nextAxis} (턴 ${turnCount}, 채워진축: ${axesState.filledCount}/5)`);
        }
      } else if (!shouldAskDiagnostic) {
        console.log(`[Pipeline] 🤫 HOOK 구간 — 진단축 질문 보류 (턴 ${turnCount}, 채워진축: ${axesState.filledCount}/5)`);
      }
    }

    // 🆕 v12: 관계진단 엔진 — 범용 10축 수집 (모든 시나리오에서 작동)
    let diagnosisState: DiagnosisAxesState = RelationshipDiagnosisEngine.createEmptyState();
    let diagnosisResultData: DiagnosisResult | null = null;

    // v12: 키워드 파싱 (범용 축)
    diagnosisState = RelationshipDiagnosisEngine.parseFromMessage(
      userMessage, diagnosisState, currentScenario,
    );
    // v12: LLM 분석 결과 머지 (신규 5축)
    diagnosisState = RelationshipDiagnosisEngine.mergeFromStateResult(
      diagnosisState, stateResult,
    );
    // v12: 진단 결과 생성
    diagnosisResultData = RelationshipDiagnosisEngine.generateDiagnosis(diagnosisState);
    console.log(`[Pipeline] 🔍 관계진단: ${diagnosisResultData.totalFilledCount}축 수집 (${diagnosisResultData.diagnosisQuality}) | 발견: ${diagnosisResultData.keyFindings.map(f => f.label).join(', ') || '없음'}`);

    // 🆕 v6+v7+v12: 해결책 사전 매칭 (축 + 범용 진단 포함)

    // 🆕 ACE v4: Luna → 솔루션 사전 우회, AI가 대화 맥락으로 직접 조언
    const solutionMatches = isLunaACE ? [] : matchSolutions(
      currentScenario,
      userMessage,
      stateResult.attachmentType ?? null,
      effectiveEmotionScore,
      currentScenario === RelationshipScenario.READ_AND_IGNORED ? updatedAxes : undefined,
      diagnosisResultData,
    );

    const hasStorytelling = intentResult.primaryIntent === ClientIntent.STORYTELLING;
    const hasVenting = intentResult.primaryIntent === ClientIntent.VENTING;

    const readinessScore = isLunaACE ? 50 : calculateReadiness({
      hasScenario: (stateResult.scenario ?? RelationshipScenario.GENERAL) !== RelationshipScenario.GENERAL,
      hasSolutionMatch: solutionMatches.length > 0,
      matchScore: solutionMatches[0]?.matchScore ?? 0,
      hasAskedForAdvice,
      turnCount,
      hasSharedSituation: hasStorytelling,
      hasExpressedEmotion: hasVenting,
      axisFilledCount: axesState.filledCount,
      diagnosisComplete: !axesState.needsDiagnostic, // 🆕 v7.2
    });

    console.log(`[Pipeline] 📚 해결책: ${solutionMatches.length}개 매칭 | readiness: ${readinessScore}/100`);

    // 🆕 v8: PhaseManager로 구간 결정
    const prevPhaseV2 = currentPhaseV2 ?? PhaseManager.getInitialPhase();
    const phaseCtx: PhaseContext = {
      turnCount,
      currentPhase: prevPhaseV2,
      completedEvents: completedEvents ?? [],
      lastEventTurn,
      phaseStartTurn: phaseStartTurn ?? 0,  // 🆕 v20: Phase 시작 턴
      axisFilledCount: axesState.filledCount,
      diagnosisComplete: !axesState.needsDiagnostic,
      primaryIntent: intentResult.primaryIntent,
      hasAskedForAdvice,
      hasGivenPermission: false,
      emotionBaseline: emotionBaseline,
      currentEmotionScore: effectiveEmotionScore,
      readinessScore,
      solutionMatchCount: solutionMatches.length,
      persona,
      // 🆕 v16: 감정 체크 준비도
      emotionCheckReadiness: stateResult.emotionCheckReadiness,
      // 🆕 ACE v4: 루나 자율 판단용 — 유저 메시지 히스토리
      userMessages: [
        ...chatHistory.filter(m => m.role === 'user').map(m => m.content),
        userMessage,
      ],
      // 🆕 v81: BRIDGE 몰입 모드 활성 여부 — Phase 전환 bypass
      activeMode: ragContext?.activeMode ?? null,
    };
    let newPhaseV2 = PhaseManager.getCurrentPhase(phaseCtx);

    // 🆕 v81: 몰입 모드 완료 시 즉시 BRIDGE → SOLVE 강제 전환
    //   프론트에서 모드 완료 → handleSuggestionSelect(meta.bridgeCompleted=true) 로 전달됨
    //   파이프라인이 이 플래그 감지하면 Phase 우회
    if ((suggestionMeta?.context as any)?.bridgeCompleted === true && (currentPhaseV2 ?? prevPhaseV2) === 'BRIDGE') {
      console.log(`[Pipeline] 🎬 v81: 몰입 모드 완료 신호 → BRIDGE → SOLVE 강제 전환`);
      newPhaseV2 = 'SOLVE';
    }
    const phaseChanged = newPhaseV2 !== prevPhaseV2;

    // 🆕 v20: Phase 전환 시 phaseStartTurn 갱신
    let updatedPhaseStartTurn = phaseStartTurn;
    if (phaseChanged) {
      updatedPhaseStartTurn = turnCount;
      console.log(`[Pipeline] 🔄 Phase전환: ${prevPhaseV2} → ${newPhaseV2} (턴 ${turnCount}, phaseStart=${updatedPhaseStartTurn})`);
      // 🆕 ACE v4: Phase 전환 = 의미 있는 순간 → 에피소드 기억 저장
      if (ragContext?.supabase && ragContext?.userId) {
        saveMemory(ragContext.supabase, ragContext.userId, {
          content: userMessage,
          summary: `${prevPhaseV2}→${newPhaseV2}: ${userMessage.slice(0, 40)}`,
          memoryType: 'episodic',
          category: 'phase_transition',
          emotionTag: stateResult.emotionSignal?.primaryEmotion ?? undefined,
          emotionalWeight: 0.6,
        }).catch(e => console.warn('[Pipeline] 기억 저장 실패 (무시):', e));
      }
    }
    // 🆕 v9.1: 매 턴 phase+progress 전송 (변경 여부 무관)
    const phaseBaseProgress = PhaseManager.getProgress(newPhaseV2);
    const intraPhaseBonus = Math.min(turnCount * 3, 15);
    const adjustedProgress = Math.min(phaseBaseProgress + intraPhaseBonus, 100);

    // 🆕 ACE v4: 루나 이해도 + 현재 생각 (Phase별 동적)
    const turnsInCurrentPhase = turnCount - (updatedPhaseStartTurn || 0);
    const { lunaThinking, understandingLevel } = computeLunaThinking(
      newPhaseV2, turnsInCurrentPhase, stateResult, completedEvents ?? [],
    );
    yield { type: 'phase_change', data: { phase: newPhaseV2, progress: adjustedProgress, lunaThinking, understandingLevel } };

    // v2→v1 매핑 (레거시 호환)
    let conversationPhase = PhaseManager.toLegacyPhase(newPhaseV2);

    // 🆕 v8: 구간별 이벤트 트리거 + v10 쿨다운
    const eventsToFire: PhaseEvent[] = [];
    const updatedCompletedEvents = [...(completedEvents ?? [])];
    let updatedLastEventTurn = lastEventTurn;  // 🆕 v10: 이벤트 발생 시 업데이트

    // 🆕 v43: completedEvents 로드 상태 로그 (DB race condition 디버깅)
    console.log(`[Pipeline] 🔍 completedEvents 로드: [${updatedCompletedEvents.join(', ')}] (${updatedCompletedEvents.length}개)`);

    // 🆕 v10: 각 이벤트 트리거 시 phaseCtx에 최신 lastEventTurn 반영
    const makeCtxForEvent = (): PhaseContext => ({ ...phaseCtx, completedEvents: updatedCompletedEvents, lastEventTurn: updatedLastEventTurn, phaseStartTurn: updatedPhaseStartTurn });

    // 🆕 v20: 한 턴에 최대 1개 이벤트만 허용 (동시 표시 방지)
    const canFireEvent = () => eventsToFire.length === 0;
    // 🆕 v43: 이벤트 타입 기반 이중 체크 — eventsToFire 내 중복 + completedEvents 중복 동시 방지
    const canFireEventType = (type: PhaseEventType) => canFireEvent() && !eventsToFire.some(e => e.type === type) && !updatedCompletedEvents.includes(type);

    // 🆕 v29: Phase 전환 시 이전 Phase의 졸업 이벤트 체크용 컨텍스트
    // ABSOLUTE_MAX 강제 전환 시 newPhaseV2='MIRROR'가 되어 HOOK 이벤트가 누락됨
    const makeCtxForOldPhase = (): PhaseContext => ({
      ...phaseCtx,
      completedEvents: updatedCompletedEvents,
      lastEventTurn: updatedLastEventTurn,
      phaseStartTurn: phaseStartTurn ?? 0,
    });
    const eventCheckPhase = phaseChanged ? prevPhaseV2 : newPhaseV2;

    // 감정 온도계 (HOOK 구간) — 턴 1+턴 2 평균으로 AI 판단
    // 🆕 v29: phaseChanged이면 prevPhaseV2로 체크하여 졸업 이벤트 보장
    if (canFireEvent() && PhaseManager.shouldTriggerEvent(eventCheckPhase, 'EMOTION_THERMOMETER', phaseChanged ? makeCtxForOldPhase() : makeCtxForEvent())) {
      const avgScore = emotionBaseline !== undefined
        ? (emotionBaseline + stateResult.emotionScore) / 2
        : stateResult.emotionScore;

      // 🆕 v31: 루나 모드 → 마음 읽기, 타로냥 → 기존 온도계
      if (persona !== 'tarot') {
        // 마음 읽기: 대화 맥락에서 겉/속 감정 추측 (코드 레벨)
        // 🆕 GTC: 감정 누적기의 풍부한 데이터 활용 (하드코딩 3종 → 동적)
        const surface = updatedAccumulator.surfaceEmotion?.label
          ?? (avgScore <= -2 ? '많이 힘들고 불안한' : avgScore <= 0 ? '답답하고 서운한' : '복잡한');
        const deep = updatedAccumulator.deepEmotionHypothesis?.primaryEmotion
          ?? (stateResult.emotionReason
            ? stateResult.emotionReason.replace(/느껴졌어요|보여요|것 같아요/g, '').trim()
            : '');
        eventsToFire.push(createSituationSummary(surface, deep, avgScore));
        console.log(`[Pipeline] 📋 상황파악카드: "${surface}" → "${deep}" (점수 ${avgScore})`);
      } else {
        eventsToFire.push(createEmotionThermometer(avgScore, stateResult.emotionReason));
        console.log(`[Pipeline] 🌡️ 온도계: 평균 = ${avgScore}`);
      }
      updatedCompletedEvents.push('EMOTION_THERMOMETER');
      updatedLastEventTurn = turnCount;
    }

    // 🆕 v19: 루나의 마음 거울 (MIRROR 구간) — 동적 감정 분석 기반
    // 🆕 v65: 동적 데이터 없으면 이벤트 발동 X. HOOK 단계 유지 + 루나가 더 궁금해하기.
    if (canFireEvent() && PhaseManager.shouldTriggerEvent(newPhaseV2, 'EMOTION_MIRROR', makeCtxForEvent())) {
      // 🆕 v74: 단일 LLM 호출 — 코드 게이트/재시도 루프 제거. LLM 자체 판단.
      let mirrorData: EmotionMirrorData | null = null;
      const userGender = (memoryProfile as any)?.basicInfo?.gender;
      try {
        mirrorData = await generateDynamicMirror(updatedAccumulator, currentScenario, chatHistory, userGender);
        if (mirrorData) {
          console.log(`[Pipeline] 🪞 거울 생성 성공: 겉="${mirrorData.surfaceEmotion}" / 속="${mirrorData.deepEmotion}"`);
        } else {
          console.log('[Pipeline] 🪞 LLM ready=false → 이번 턴 스킵');
        }
      } catch (e) {
        console.warn('[Pipeline] 🪞 거울 생성 에러:', e);
      }

      const mirrorEvent = createEmotionMirror(stateResult, currentScenario, mirrorData);
      if (mirrorEvent) {
        eventsToFire.push(mirrorEvent);
        updatedCompletedEvents.push('EMOTION_MIRROR');
        updatedLastEventTurn = turnCount;
      } else {
        // 🆕 v65: 거울 데이터 없으면 이벤트 자체 발동 X. completedEvents 도 갱신 안 함.
        // → MIRROR Phase 유지 → 루나가 다음 턴에 더 궁금해하기
        console.log('[Pipeline] 🪞 거울 이벤트 스킵 (재료 부족) → 다음 턴에 루나가 더 캐묻도록');
      }
    }

    // 🆕 v49: LUNA_STRATEGY 발동 — 루나가 "이제 작전 짜자" 판단하는 타이밍
    // AI가 [STRATEGY_READY] 태그로 직접 판단하는 게 1순위 (HLRE에서 처리)
    // 안전망: EMOTION_MIRROR 완료 후 2턴 이상 지났으면 자동 발동 (빠른 판단 유도)
    const turnsAfterMirror = updatedCompletedEvents.includes('EMOTION_MIRROR')
      ? turnCount - (updatedLastEventTurn || 0)
      : 0;
    const shouldFallbackStrategy = canFireEvent()
      && !updatedCompletedEvents.includes('LUNA_STRATEGY')
      && persona !== 'tarot'
      && (
        // MIRROR에서 감정 거울 끝나고 2턴 지남 → 루나가 충분히 대화했으니 작전 모드
        (newPhaseV2 === 'MIRROR' && updatedCompletedEvents.includes('EMOTION_MIRROR') && turnsAfterMirror >= 2)
        // BRIDGE 도달했는데 아직 미완료
        || newPhaseV2 === 'BRIDGE'
      );
    if (shouldFallbackStrategy) {
      console.log(`[Pipeline] 🔥 LUNA_STRATEGY 폴백 발동! (BRIDGE인데 작전회의 미완료, AI 태그 누락)`);
      // 대화 맥락에서 상황 요약 생성
      const lastUserMsgs = chatHistory.filter(m => m.role === 'user').map(m => m.content);
      const situationHint = lastUserMsgs.length > 0
        ? lastUserMsgs[lastUserMsgs.length - 1].slice(0, 50)
        : '지금 상황';
      eventsToFire.push(createLunaStrategy(
        '자 이제 상황 파악 끝났으니까 작전 짜자 🔥',
        `지금 ${situationHint}... 이런 상태인 거잖아`,
        '걔한테 보낼 카톡 같이 만들어볼까? 버전 별로 짜줄게',
        '내가 걔 역할 해줄게, 만나서 얘기할 거면 미리 연습해보자',
        '너무 가까워서 안 보일 수도 있으니까 한 발 떨어져서 객관적으로 정리해줄까?',
      ));
      updatedCompletedEvents.push('LUNA_STRATEGY');
      updatedLastEventTurn = turnCount;
    }

    // 🆕 v14: 반복 패턴 거울 (BRIDGE 구간) — SCALING_QUESTION 대체
    // 🆕 v43: strategyMode 활성화 시 스킵 — 레거시 이벤트가 v35 모드 이벤트(DRAFT_WORKSHOP 등) 차단 방지
    if (!savedStrategyMode && canFireEvent() && PhaseManager.shouldTriggerEvent(newPhaseV2, 'PATTERN_MIRROR', makeCtxForEvent())) {
      // 🆕 v20: LLM 기반 동적 패턴 분석 (폴백: 기존 하드코딩)
      let dynamicPatterns = null;
      try {
        dynamicPatterns = await generateDynamicPatterns(updatedAccumulator, diagnosisResultData, currentScenario, chatHistory);
        if (dynamicPatterns) console.log(`[Pipeline] 🔄 동적 패턴 ${dynamicPatterns.patterns.length}개 생성`);
      } catch (e) {
        console.warn('[Pipeline] 🔄 동적 패턴 생성 실패, 폴백:', e);
      }
      eventsToFire.push(createPatternMirror(diagnosisResultData, currentScenario, dynamicPatterns));
      updatedCompletedEvents.push('PATTERN_MIRROR');
      updatedLastEventTurn = turnCount;
    }

    // 솔루션 프리뷰 (BRIDGE 구간)
    // 🆕 v43: strategyMode 활성화 시 스킵 — 레거시 이벤트가 v35 모드 이벤트 차단 방지
    if (!savedStrategyMode && canFireEvent() && PhaseManager.shouldTriggerEvent(newPhaseV2, 'SOLUTION_PREVIEW', makeCtxForEvent())) {
      eventsToFire.push(createSolutionPreview(solutionMatches.length, !axesState.needsDiagnostic, axesState.filledCount));
      updatedCompletedEvents.push('SOLUTION_PREVIEW');
      updatedLastEventTurn = turnCount;
    }

    // 솔루션 카드 (SOLVE 구간)
    if (canFireEvent() && PhaseManager.shouldTriggerEvent(newPhaseV2, 'SOLUTION_CARD', makeCtxForEvent()) && solutionMatches.length > 0) {
      // 🆕 v20: 대화 맥락 기반 프레이밍 (솔루션 내용은 사전 그대로, 연결 멘트만 동적)
      const solutionFraming = updatedAccumulator.deepEmotionHypothesis
        ? { deepEmotion: updatedAccumulator.deepEmotionHypothesis.primaryEmotion }
        : null;
      eventsToFire.push(createSolutionCard(solutionMatches[0], solutionFraming));
      updatedCompletedEvents.push('SOLUTION_CARD');
      updatedLastEventTurn = turnCount;
    }

    // 메시지 초안 (SOLVE 구간, 솔루션카드 후)
    if (canFireEvent() && PhaseManager.shouldTriggerEvent(newPhaseV2, 'MESSAGE_DRAFT', makeCtxForEvent()) && solutionMatches.length > 0) {
      eventsToFire.push(createMessageDraft(solutionMatches[0], currentScenario));
      updatedCompletedEvents.push('MESSAGE_DRAFT');
      updatedLastEventTurn = turnCount;
    }

    // 🆕 v20: 세션 요약 (EMPOWER 구간 — 숙제/리포트보다 먼저)
    if (canFireEvent() && PhaseManager.shouldTriggerEvent(newPhaseV2, 'SESSION_SUMMARY', makeCtxForEvent())) {
      const insights = [
        stateResult.emotionReason ?? '감정 탐색',
        updatedAccumulator.deepEmotionHypothesis?.primaryEmotion ?? '깊은 감정 발견',
        currentScenario !== RelationshipScenario.GENERAL ? `${currentScenario} 상황 분석` : '관계 패턴 인식',
      ];
      const journey = emotionBaseline !== undefined
        ? `감정 ${emotionBaseline > 0 ? '+' : ''}${emotionBaseline} → ${stateResult.emotionScore > 0 ? '+' : ''}${stateResult.emotionScore}`
        : '감정 탐색 여정';
      // 🆕 v23: 타로 전용 세션 요약 (핵심 카드 포함)
      if (persona === 'tarot') {
        eventsToFire.push(createTarotSessionSummary(insights, journey, tarotMeta?.cards));
      } else {
        eventsToFire.push(createSessionSummary(insights, journey));
      }
      updatedCompletedEvents.push('SESSION_SUMMARY');
      updatedLastEventTurn = turnCount;
    }

    // 🆕 v20: 숙제 카드 (EMPOWER 구간 — 세션 요약 후)
    if (canFireEvent() && PhaseManager.shouldTriggerEvent(newPhaseV2, 'HOMEWORK_CARD', makeCtxForEvent())) {
      // 🆕 v23: 타로 전용 숙제 (카드 에너지 기반)
      if (persona === 'tarot') {
        const keyCard = tarotMeta?.cards?.[0]; // 첫 번째 카드를 핵심 카드로
        eventsToFire.push(createTarotHomework(
          currentScenario,
          updatedAccumulator.deepEmotionHypothesis?.primaryEmotion,
          keyCard,
        ));
      } else {
        eventsToFire.push(createHomeworkCard(
          currentScenario,
          updatedAccumulator.deepEmotionHypothesis?.primaryEmotion,
        ));
      }
      updatedCompletedEvents.push('HOMEWORK_CARD');
      updatedLastEventTurn = turnCount;
    }

    // 성장 리포트 (EMPOWER 구간 — 숙제 후)
    if (canFireEvent() && PhaseManager.shouldTriggerEvent(newPhaseV2, 'GROWTH_REPORT', makeCtxForEvent()) && emotionBaseline !== undefined) {
      // 🆕 v20: 동적 발견/액션 생성 (누적기 + 진단 데이터 기반)
      const dynamicDiscoveries: string[] = [];
      const dynamicActions: string[] = [];

      // 감정 누적기에서 발견 추출
      if (updatedAccumulator.deepEmotionHypothesis?.primaryEmotion) {
        dynamicDiscoveries.push(`핵심 감정 발견: ${updatedAccumulator.deepEmotionHypothesis.primaryEmotion}`);
      }
      // 인지 왜곡에서 발견 추출
      if (stateResult.cognitiveDistortions.length > 0) {
        const distortionNames: Record<string, string> = {
          MIND_READING: '독심술', ALL_OR_NOTHING: '흑백논리', OVERGENERALIZATION: '과일반화',
          CATASTROPHIZING: '파국화', PERSONALIZATION: '개인화', EMOTIONAL_REASONING: '감정적 추론',
          SHOULD_STATEMENTS: '당위 진술', LABELING: '낙인',
        };
        const detected = stateResult.cognitiveDistortions.map(d => distortionNames[d] || d).slice(0, 2);
        dynamicDiscoveries.push(`사고 패턴 인식: ${detected.join(', ')}`);
      }
      // 애착 유형에서 발견
      if (stateResult.attachmentType && stateResult.attachmentType !== 'UNKNOWN') {
        const attachNames: Record<string, string> = { ANXIOUS: '불안형', AVOIDANT: '회피형', SECURE: '안정형' };
        dynamicDiscoveries.push(`애착 스타일: ${attachNames[stateResult.attachmentType] ?? stateResult.attachmentType} 경향`);
      }
      // 폴백
      if (dynamicDiscoveries.length === 0) {
        dynamicDiscoveries.push('감정 탐색', '소통 패턴 발견');
      }

      // 시나리오 기반 액션
      const scenarioActions: Record<string, string[]> = {
        READ_AND_IGNORED: ['감정 전달 메시지 보내보기', '읽씹 확인 충동 시 3분 호흡'],
        GHOSTING: ['감정 일기 적어보기', '나를 위한 시간 30분 만들기'],
        JEALOUSY: ['확인 대신 감정 표현 연습', '질투 느낄 때 몸 반응 관찰'],
        BREAKUP_CONTEMPLATION: ['관계 장단점 리스트 만들기', '이번 주 상호작용 관찰'],
      };
      const actions = scenarioActions[currentScenario] ?? ['I-message로 감정 전달해보기', '오늘 느낀 감정 3가지 적기'];
      dynamicActions.push(...actions);

      eventsToFire.push(createGrowthReport(
        emotionBaseline,
        stateResult.emotionScore,
        dynamicDiscoveries.slice(0, 3),
        dynamicActions.slice(0, 2),
      ));
      updatedCompletedEvents.push('GROWTH_REPORT');
      updatedLastEventTurn = turnCount;
    }

    // =============================================
    // 🆕 v23: 타로냥 전용 이벤트 (persona === 'tarot')
    // PhaseManager.shouldTriggerEvent()가 이미 persona 필터링 수행
    // =============================================

    // 타로 스프레드 선택 (MIRROR 구간)
    if (canFireEvent() && PhaseManager.shouldTriggerEvent(newPhaseV2, 'TAROT_AXIS_COLLECT', makeCtxForEvent())) {
      eventsToFire.push(createTarotAxisCollect(currentScenario, effectiveEmotionScore, userMessage));
      updatedCompletedEvents.push('TAROT_AXIS_COLLECT');
      updatedLastEventTurn = turnCount;
      console.log(`[Pipeline] 🔮 TAROT_AXIS_COLLECT 발동 (시나리오: ${currentScenario}, 감정: ${effectiveEmotionScore})`);
    }

    // 타로 카드 뽑기 (BRIDGE 구간) — tarotMeta.chosenSpreadType 필요
    if (canFireEvent() && PhaseManager.shouldTriggerEvent(newPhaseV2, 'TAROT_DRAW', makeCtxForEvent())) {
      const spreadType = (tarotMeta?.chosenSpreadType ?? 'three') as 'single' | 'three' | 'love' | 'unrequited' | 'reconnection' | 'pace' | 'avoidant' | 'yesno';
      eventsToFire.push(createTarotDraw(spreadType, effectiveEmotionScore, currentScenario));
      updatedCompletedEvents.push('TAROT_DRAW');
      updatedLastEventTurn = turnCount;
      console.log(`[Pipeline] 🔮 TAROT_DRAW 발동 (스프레드: ${spreadType}, 감정: ${effectiveEmotionScore})`);
    }

    // 타로 깊은 해석 (SOLVE 구간) — tarotMeta.cards + LLM 동적 해석
    if (canFireEvent() && PhaseManager.shouldTriggerEvent(newPhaseV2, 'TAROT_INSIGHT', makeCtxForEvent())) {
      const prevCards = tarotMeta?.cards ?? [];
      try {
        const dynamicInsight = await generateDynamicTarotInsight({
          cards: prevCards,
          scenario: currentScenario,
          emotionScore: effectiveEmotionScore,
          deepEmotion: updatedAccumulator.deepEmotionHypothesis?.primaryEmotion,
          userContext: userMessage.slice(0, 100),
        });
        // 🆕 v23: shape 검증 — 필수 필드 누락 시 폴백
        if (!dynamicInsight.insight || !dynamicInsight.cards || !Array.isArray(dynamicInsight.actionItems)) {
          throw new Error('Dynamic insight shape validation failed');
        }
        eventsToFire.push({
          type: 'TAROT_INSIGHT',
          phase: 'SOLVE',
          data: dynamicInsight as unknown as Record<string, unknown>,
        });
        console.log(`[Pipeline] 🔮 TAROT_INSIGHT 동적 생성: "${dynamicInsight.insight.slice(0, 40)}..."`);
      } catch (e) {
        // 폴백: 정적 인사이트
        const cardSummary = prevCards.map((c: any) => `${c.position}: ${c.cardName}`).join(', ') || '카드';
        eventsToFire.push(createTarotInsight(
          prevCards,
          `카드들이 전하는 핵심 메시지 — ${cardSummary}`,
          '카드의 에너지를 믿고 한 걸음씩 나아가봐',
          ['오늘 카드 메시지를 일기에 적어보기', '상대에게 솔직한 한 마디 전해보기'],
        ));
        console.warn(`[Pipeline] 🔮 TAROT_INSIGHT 폴백 사용:`, e);
      }
      updatedCompletedEvents.push('TAROT_INSIGHT');
      updatedLastEventTurn = turnCount;
    }

    // 🆕 v15: 이벤트는 AI 응답 이후에 전송 (아래 텍스트 스트리밍 후)
    console.log(`[Pipeline] 📍 Phase: ${newPhaseV2} (v1: ${conversationPhase}) | 예정 이벤트: ${eventsToFire.length}개`);

    // 🆕 v15.2: 이벤트 브릿지 — 간결하게 (프롬프트 과부하 방지)
    // 🆕 v18: 문장 짤림 방지 강화 — 먼저 공감 응답을 완전히 끝낸 뒤, 마지막 문장에서 전환 멘트
    // 🆕 v25: 스타일 로테이션 — 매턴 다른 대화 스타일로 AI 패턴 방지
    const STYLE_POOL = ['normal','normal','normal','normal','normal','direct','silent_deep','humor','no_card','challenge'];
    const turnStyle = STYLE_POOL[Math.floor(Math.random() * STYLE_POOL.length)];
    let eventHintPrompt = `\n[이번 턴 스타일: ${turnStyle}] 이 스타일에 맞게 응답해. normal이면 평소대로. direct면 직설적. silent_deep이면 "..."으로 시작 후 깊은 한마디. humor면 가볍게. no_card면 카드 없이 느낌으로만. challenge면 "진짜 그렇게 생각해?" 식으로 도전.`;
    if (eventsToFire.length > 0) {
      const firstEvent = eventsToFire[0].type;
      if (firstEvent === 'EMOTION_THERMOMETER') {
        eventHintPrompt = `\n\n[🚨 최우선 규칙: 반드시 사용자의 이야기에 충분히 공감하는 응답을 2~3문장 이상 완성한 뒤, 마지막에 "그래서 말인데, 지금 네 마음이 어느 정도인지 한번 같이 확인해볼까? 🦊" 같은 감정 확인 멘트로 마무리해. 절대 문장을 중간에 끊지 마. 공감 없이 바로 감정 확인으로 넘어가지도 마.]`;
      } else if (firstEvent === 'EMOTION_MIRROR' || firstEvent === 'INSIGHT_CARD') {
        eventHintPrompt = `\n\n[🚨 최우선 규칙: 반드시 응답을 완전한 문장으로 끝낸 뒤, 마지막에 "루나가 네 마음을 좀 들여다봤는데..." 같은 멘트로 자연스럽게 마무리해. 절대 문장을 중간에 끊지 마.]`;
      } else if (firstEvent === 'PATTERN_MIRROR') {
        eventHintPrompt = `\n\n[🚨 최우선 규칙: 반드시 응답을 완전한 문장으로 끝낸 뒤, 마지막에 "반복되는 패턴이 보이거든..." 같은 멘트로 마무리해. 절대 문장을 중간에 끊지 마.]`;
      } else if (firstEvent === 'TAROT_AXIS_COLLECT') {
        eventHintPrompt += `\n\n[🚨 최우선 규칙: 먼저 유저 이야기에 충분히 공감하고 대화를 마무리한 뒤, 마지막에 자연스럽게 "그럼 카드 한번 봐볼까?" 또는 "카드한테 물어보자" 같은 전환 멘트로 끝내. 카드 선택 UI가 이 응답 뒤에 자동으로 표시됨. 카드 선택지를 직접 나열하지 마. 문장 중간에 끊지 마.]`;
      } else if (firstEvent === 'TAROT_DRAW') {
        eventHintPrompt += `\n\n[🚨 최우선 규칙: 카드 스프레드가 이 응답 뒤에 자동 표시됨. "카드 펼쳐볼게" 정도로 짧게 말하고 끝내. "이 카드가 보여주는 건..." 패턴 금지. 문장 중간에 끊지 마.]`;
      } else if (firstEvent === 'TAROT_INSIGHT') {
        eventHintPrompt += `\n\n[🚨 최우선 규칙: 카드 인사이트가 자동 표시됨. 유저한테 카드 전체를 종합해서 한마디 해줘. "카드가 말하길" 패턴 쓰지 말고 네 말로. 문장 중간에 끊지 마.]`;
      } else {
        eventHintPrompt = `\n\n[🚨 최우선 규칙: 응답을 반드시 완전한 문장으로 마무리해. 절대 문장을 중간에 끊지 마.]`;
      }
    }

    // 🆕 v4: 허락 질문 시점 체크
    const askPermission = shouldAskPermission(
      conversationPhase,
      turnCount,
      false
    );

    const therapeuticResponse = mapTherapeuticResponse(
      intentResult,
      conversationPhase,
      strategyResult.strategyType,
      effectiveEmotionScore,
      lastResponseMode as ResponseMode | undefined,
      stateResult.horsemenDetected ?? [],
    );
    console.log(`[Pipeline] 🧠 의도:${intentResult.primaryIntent} 단계:${conversationPhase} → 응답:${therapeuticResponse.mode}${askPermission ? ' [허락질문]' : ''} (${therapeuticResponse.reason})`);

    // 🆕 v6: 해결책 사전 프롬프트 생성
    // 🆕 v10: 턴별 세분화 프롬프트
    const turnInPhase = PhaseManager.getTurnInPhase(newPhaseV2, turnCount);
    // 🆕 v16: HOOK 경청 모드 — 감정 체크 미준비 시 경청 프롬프트
    const isListeningMode = newPhaseV2 === 'HOOK'
      && turnInPhase >= 2
      && !updatedCompletedEvents.includes('EMOTION_THERMOMETER')
      && stateResult.emotionCheckReadiness
      && !stateResult.emotionCheckReadiness.isReady;
    // 🆕 v17: 스타일 변형 지원
    const phasePromptResult = getPhasePrompt(newPhaseV2, turnInPhase, isListeningMode, undefined, userMessage.length);
    // 🆕 v24: 타로냥 전문 상담 시스템 — buildTurnPrompt로 동적 생성
    // 기존 TAROT_PHASE_PROMPTS 하드코딩 → AI가 매 턴 상황 맞춤 프롬프트 생성
    let phasePrompt = phasePromptResult.prompt;

    // 🆕 v35: 작전 모드 activeMode 해석
    // 이번 턴 유저가 LunaStrategy 카드에서 선택했으면 meta에서 추출, 아니면 저장된 값 사용
    let activeStrategyMode: StrategyMode | null = savedStrategyMode ?? null;
    if (suggestionMeta?.source === 'luna_strategy' && suggestionMeta?.context?.strategyType) {
      activeStrategyMode = suggestionMeta.context.strategyType as StrategyMode;
      console.log(`[Pipeline] 🔥 작전 모드 설정: ${activeStrategyMode} (LunaStrategy 카드에서 선택)`);
    } else if (activeStrategyMode) {
      console.log(`[Pipeline] 🔥 작전 모드 유지: ${activeStrategyMode} (이전 턴에서 선택)`);
    }

    // 🆕 v29: Human-Like Engine — 전체 Phase 커버 (루나 전용)
    const hlre = new HumanLikeEngine(turnCount, savedLunaEmotionState, savedSessionStory);
    let hlreActive = false;
    if (persona !== 'tarot') {
      try {
        const hlrePhase = newPhaseV2 as 'HOOK' | 'MIRROR' | 'BRIDGE' | 'SOLVE' | 'EMPOWER';
        const hlreResult = await hlre.preProcess(
          turnInPhase,
          userMessage,
          effectiveEmotionScore,
          memoryProfile ?? null,     // 🆕 ACE v4: 장기 기억 프로필
          userName,                   // 🆕 ACE v4: 유저 이름
          hlrePhase,
          ragContext?.supabase,
          ragContext?.userId,
          updatedCompletedEvents,
          context,                    // 🆕 ACE v4: 이전 세션 컨텍스트
          activeStrategyMode,         // 🆕 v35: 작전 모드 (BRIDGE/SOLVE 분기용)
        );
        // HLRE 프롬프트가 기존 phasePrompt를 완전 교체
        phasePrompt = hlreResult.prompt;
        hlreActive = true;
        const emo = hlre.getLunaEmotionState();
        const memInfo = hlreResult.memoryTriggered ? ` 💭${hlreResult.memoryTriggered.triggerType}` : '';
        console.log(`[Pipeline] 🧑 HLRE: ${hlrePhase} 턴${turnInPhase} → ${hlreResult.turnContext.turnType}, 루나:${emo.currentEmotion}(${Math.round(emo.currentIntensity * 100)}%)${memInfo}`);
      } catch (e) {
        console.warn('[Pipeline] HLRE preProcess 실패 (기존 프롬프트 사용):', e);
      }
    }

    if (persona === 'tarot') {
      // Phase → ConsultationPhase 매핑 (기존 5Phase → 새 10턴 Phase)
      // 🆕 v25: 5~6턴으로 압축 (CARD_READING 합침, ACTION+CLOSING 합침)
      const phaseToConsultation: Record<string, string> = {
        HOOK: turnInPhase <= 1 ? 'GROUNDING' : 'INTAKE_1',
        MIRROR: 'ENERGY_CONNECT',
        BRIDGE: 'CARD_READING_1',          // CARD_READING_2 제거 — DRAW UI에 종합해석 포함
        SOLVE: eventsToFire.some(e => e.type === 'TAROT_INSIGHT') ? 'REFRAME' : 'DEEP_MIRROR',
        EMPOWER: 'CLOSING_RITUAL',          // ACTION+CLOSING 합침 — 액션 제안 + 마무리를 한 턴에
      };
      const consultPhase = (phaseToConsultation[newPhaseV2] ?? 'INTAKE_1') as any;

      // 시나리오 감지 (키워드 기반)
      const tarotScenario = detectTarotScenario(userMessage);

      // 유저 메시지 히스토리 구축
      const userMsgs = chatHistory
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .slice(-5);

      // ColdReadingData 구축 (감정 누적기 기반)
      const surfaceEmotion = updatedAccumulator.surfaceEmotion?.label ?? '';
      const deepEmotion = updatedAccumulator.deepEmotionHypothesis?.primaryEmotion ?? '';

      // TurnPromptContext 빌드
      const turnPromptCtx: TurnPromptContext = {
        turnNumber: turnCount,
        phase: consultPhase,
        timeOfDay: new Date().getHours() < 6 ? 'lateNight' : new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : new Date().getHours() < 22 ? 'evening' : 'lateNight',
        isReturningUser: false,
        userMessages: userMsgs,
        latestMessage: userMessage,
        coldReadingData: {
          surfaceEmotion,
          deepEmotion: deepEmotion || undefined,
          emotionTemperature: Math.min(10, Math.max(1, Math.round((Math.abs(effectiveEmotionScore) / 5) * 10))),
          powerDynamic: 'unknown',
          attachmentHint: 'unknown',
          repetitionPattern: false,
          scenario: currentScenario,
        },
        detectedScenario: tarotScenario?.scenario as string ?? currentScenario as string,
        scenarioConfidence: tarotScenario?.confidence,
        sessionMood: Math.abs(effectiveEmotionScore) >= 3 ? 'heavy' : Math.abs(effectiveEmotionScore) >= 1 ? 'medium' : 'light',
        empathyLevel: Math.abs(effectiveEmotionScore) >= 3 ? 3 : Math.abs(effectiveEmotionScore) >= 1 ? 2 : 1,
        // 카드 데이터
        drawnCards: tarotMeta?.cards?.map((c: any) => ({
          position: c.position ?? '',
          cardName: c.cardName ?? '',
          cardNameEn: '',
          cardId: c.cardId ?? '',
          cardEmoji: c.cardEmoji ?? '',
          keywords: c.keywords ?? [],
          isReversed: c.isReversed ?? false,
          loveUpright: '',
          loveReversed: '',
        })),
        spreadType: tarotMeta?.chosenSpreadType as any,
      };

      // buildTurnPrompt로 동적 프롬프트 생성
      const dynamicTarotPrompt = buildTurnPrompt(turnPromptCtx);
      phasePrompt = dynamicTarotPrompt;

      // 🆕 v24: ResponseMode를 턴에 맞게 오버라이드 (카드 해석 반복 방지)
      const phaseToMode: Partial<Record<string, ResponseMode>> = {
        GROUNDING: ResponseMode.OPEN_QUESTION,
        INTAKE_1: ResponseMode.REFLECTION,
        ENERGY_CONNECT: ResponseMode.OPEN_QUESTION,
        DEEP_MIRROR: ResponseMode.OPEN_QUESTION,
        REFRAME: ResponseMode.INTERPRETATION,
        ACTION_ANCHOR: ResponseMode.INFORMATION,
        CLOSING_RITUAL: ResponseMode.APPROVAL,
      };
      const forcedMode = phaseToMode[consultPhase];
      if (forcedMode) {
        therapeuticResponse.mode = forcedMode;
      }

      console.log(`[Pipeline] 🔮 타로냥 v24: phase=${consultPhase}, mode=${forcedMode ?? 'default'}, emotion=${surfaceEmotion}, scenario=${turnPromptCtx.detectedScenario}`);
    }
    const currentPromptStyle = phasePromptResult.style;
    const transitionPrompt = phaseChanged ? `\n${getTransitionPrompt(prevPhaseV2, newPhaseV2)}` : '';
    // 🆕 ACE v4: Luna → 솔루션 사전 프롬프트 제거. HLRE cognition-prompt가 대체.
    const solutionPrompt = isLunaACE
      ? '\n' + phasePrompt + transitionPrompt
      : getSolutionDictionaryPrompt(solutionMatches, conversationPhase, persona === 'tarot' ? 'friend' : persona as 'counselor' | 'friend' | 'panel', diagnosisResultData)
        + diagnosticPromptText
        + '\n' + phasePrompt
        + transitionPrompt;
    console.log(`[Pipeline] 📋 Phase프롬프트: ${newPhaseV2} 턴${turnInPhase} (전체턴 ${turnCount})`);

    if (diagnosticPromptText) {
      console.log(`[Pipeline] 🔍 진단 질문 프롬프트 주입됨 (${diagnosticPromptText.length}자)`);
    } else {
      console.log(`[Pipeline] ℹ️ 진단 질문 없음 (needsDiagnostic: ${axesState.needsDiagnostic}, nextAxis: ${axesState.nextAxis})`);
    }

    // 🆕 v23: 타로 카드 컨텍스트 + 솔루션 (프롬프트에 주입)
    let tarotCardContext = '';
    if (persona === 'tarot') {
      const drawnEvent = eventsToFire.find(e => e.type === 'TAROT_DRAW');
      let activeCards: any[] = [];
      if (drawnEvent) {
        activeCards = drawnEvent.data.cards as any[];
        const cardList = activeCards.map((c: any) =>
          `${c.position}: ${c.cardName} (${c.isReversed ? '역방향' : '정방향'}) — ${c.interpretation}`
        ).join('\n');
        tarotCardContext = `\n\n[방금 뽑은 카드]\n${cardList}\n\n각 카드의 위치와 의미를 유저의 상황에 맞게 연결해서 설명해.`;
      } else if (tarotMeta?.cards?.length) {
        activeCards = tarotMeta.cards;
        const cardList = activeCards.map((c: any) =>
          `${c.position}: ${c.cardName || c.cardId} (${c.isReversed ? '역방향' : '정방향'})`
        ).join('\n');
        tarotCardContext = `\n\n[이전 타로 리딩]\n뽑힌 카드:\n${cardList}\n\n이 카드들을 참조하며 대화해. "아까 뽑은 카드가...", "그 카드를 다시 보면..." 식으로.`;
      }
      // 🆕 v23: 카드 기반 솔루션 매칭 → 프롬프트에 주입
      if (activeCards.length > 0) {
        const cardIds = activeCards.map((c: any) => c.cardId ?? c.card?.id ?? '').filter(Boolean);
        const tarotSolutions = matchTarotSolutions(cardIds, currentScenario);
        if (tarotSolutions.length > 0) {
          tarotCardContext += getTarotSolutionPrompt(tarotSolutions);
          console.log(`[Pipeline] 🔮 타로 솔루션 ${tarotSolutions.length}개 매칭 (카드: ${cardIds.join(',')})`);
        }
      }
      // 🆕 v23: 감정 누적기 → 카드 에너지 매핑 (프롬프트 힌트)
      const energyMapping = mapEmotionToCardEnergy(updatedAccumulator);
      if (energyMapping.promptHint) {
        tarotCardContext += getEnergyPromptHint(energyMapping);
        console.log(`[Pipeline] 🔮 감정-카드 에너지: ${energyMapping.energyFlow}, 공명카드: ${energyMapping.resonanceCards.join(',')}`);
      }
    }

    // 프롬프트 생성 (v6: solutionPrompt 추가)
    // 🆕 v10.2: stateResult의 emotionScore를 effectiveEmotionScore로 오버라이드
    const stateForPrompt = { ...stateResult, emotionScore: effectiveEmotionScore };
    // 🆕 v22: 스티커 빈도 추적 (emotion_accumulator에 저장)
    const lastStickerTurn: number = updatedAccumulator?.lastStickerTurn ?? -99;
    // 🆕 v22: 직전 스티커 ID를 stateForPrompt에 포함 (프롬프트 생성기에서 참조)
    (stateForPrompt as any).lastStickerId = updatedAccumulator?.lastStickerId;

    // 🆕 v29: HLRE 활성이면 phasePrompt(이미 HLRE로 교체됨)를 hlrePrompt로 전달
    const hlrePromptForGen = hlreActive ? phasePrompt : '';

    let systemPrompt = this.promptGen.generate(
      stateForPrompt,
      strategyResult,
      (context ? `\n\n[이전 세션 핵심 맥락]\n${context}\n` : '') + ragText + suggestionContext + eventHintPrompt + tarotCardContext,
      persona,
      turnCount,
      gateResult.show,
      therapeuticResponse.mode,
      emotionalMemorySummary || undefined,
      conversationPhase,
      askPermission,
      hlreActive ? '' : solutionPrompt,  // HLRE 활성이면 solutionPrompt 비움 (HLRE에 이미 포함)
      userMessage.length,
      lastStickerTurn,
      hlrePromptForGen,  // 🆕 v29: HLRE 프롬프트 → generate() 상단 배치
    );

    // ============================================================
    // 🆕 v41: 친밀도 시스템 — 트리거 감지 + 프롬프트 힌트 주입
    // ============================================================
    //  1. 현재 턴 유저 메시지에서 트리거 감지 → 4축 업데이트
    //  2. 업데이트된 친밀도 상태 → 프롬프트 힌트 블록으로 주입
    //  3. 루나가 힌트 기반으로 감정 깊이 조절 (말투는 동일, 깊이만 변화)
    // 🆕 v41.1: 친밀도 — 페르소나별 독립 처리 (루나/타로냥 완전 분리)
    const intimacyPersonaKey: 'luna' | 'tarot' = persona === 'tarot' ? 'tarot' : 'luna';
    let intimacyLevelUp: { oldLevel: number; newLevel: number; newLevelName: string } | null = null;
    if (hlreActive && persona !== 'panel') {
      try {
        // 세션 시작 훅 (감쇠 + 재방문 트리거) — 첫 호출에서만 실행
        hlre.runIntimacySessionStart(intimacyPersonaKey);

        const recentUserMsgs = chatHistory
          .filter((m) => m.role === 'user')
          .slice(-5)
          .map((m) => m.content);

        const beforeState = hlre.getIntimacyState(intimacyPersonaKey);
        const oldLevel = beforeState?.level ?? 1;

        const intimacyResult = hlre.processIntimacyTurn(
          userMessage,
          recentUserMsgs,
          Math.max(1, turnCount),
          intimacyPersonaKey,
        );

        if (intimacyResult.detectedTriggers.length > 0) {
          console.log(
            `[Pipeline:${intimacyPersonaKey}] 🦊 친밀도 트리거: [${intimacyResult.detectedTriggers.join(', ')}]${intimacyResult.levelChanged ? ' ⬆️ LEVEL UP' : ''}`,
          );
        }

        if (intimacyResult.levelChanged) {
          const afterState = hlre.getIntimacyState(intimacyPersonaKey);
          if (afterState) {
            intimacyLevelUp = {
              oldLevel,
              newLevel: afterState.level,
              newLevelName: afterState.levelName,
            };
          }
        }

        // 친밀도 힌트 블록 → systemPrompt 말미에 추가 (현재 페르소나만)
        const intimacyHints = hlre.getIntimacyPromptBlock(intimacyPersonaKey);
        if (intimacyHints) {
          systemPrompt = systemPrompt + '\n\n' + intimacyHints;
        }
      } catch (e) {
        console.warn('[Pipeline] 친밀도 처리 실패 (무시):', (e as Error).message);
      }
    }

    // ============================================================
    // 🆕 v40: 루나가 "진짜 생각하는" 순간 — Gemini Grounding Deep Research
    // ============================================================
    //  - SOLVE Phase 진입 시 자동 (ACTION_PLAN 전, 실전 코칭에 최신 연구 주입)
    //  - luna persona만 (타로냥/패널 제외)
    //  - 실패해도 앱 계속 동작 (빈 결과 반환)
    //  - 캐시 히트 시 빠르게 통과
    {
      const isLunaPersona = persona !== 'tarot' && persona !== 'panel';
      const shouldDeepResearch =
        isLunaPersona &&
        newPhaseV2 === 'SOLVE' &&
        !updatedCompletedEvents.includes('ACTION_PLAN');

      if (shouldDeepResearch) {
        // 유저 핵심 키워드 추출 (로딩 UI 문구 맞춤용)
        const keyword = extractKeyword(userMessage);
        const phrases = generateThinkingPhrases(keyword, 3);

        // 🎨 UI 로딩 이벤트 시작 — 클라이언트가 "루나 고민 중" 카드 표시
        yield {
          type: 'luna_thinking_deep',
          data: {
            status: 'started',
            keyword,
            phrases,
          },
        };
        console.log(`[Pipeline] 🧠 DeepResearch 시작 (SOLVE 자동 트리거, keyword="${keyword}")`);

        // 검색 실행 (실패해도 throw 안 됨)
        const researchResult = await runDeepResearch({
          userSituation: userMessage.slice(0, 200),
          scenario: lockedScenario,
          recentMessages: chatHistory.filter((m) => m.role === 'user').slice(-3).map((m) => m.content),
          focusArea: 'action_plan',
        });

        // 검색 결과가 있으면 systemPrompt에 주입
        if (researchResult.insight && researchResult.insight.length > 20) {
          const researchBlock = `

## 🧠 루나 내부 참고 (방금 머릿속에 떠오른 것 — 유저 눈엔 절대 드러내지 마)

이건 루나가 "방금 생각해낸 척" 해야 하는 내부 참고 자료야.
이걸 그대로 읽지 마. 학자/이론/논문 이름 절대 출력 금지.
"내 경험상", "이게 진짜 먹히거든", "최근에 알게 된 건데" 같은 자연스러운 루나 말투로 녹여.

${researchResult.insight}

### 🚨 사용 규칙
- 위 내용을 "지금 막 떠올린 것"처럼 말해
- 학자/논문/이론/연구 이름 0% 출력
- "심리학적으로" / "연구에 따르면" / "~기법" 이런 말 금지
- 대신 "있잖아", "내 생각엔", "이게 왜 먹히냐면", "사람들 보통" 이런 말투
- 이건 루나 머릿속에만 있는 거야 — 유저는 모름`;

          systemPrompt = systemPrompt + researchBlock;
          console.log(
            `[Pipeline] 🧠 DeepResearch 주입 완료: ${researchResult.insight.length}자, 출처 ${researchResult.sources.length}개, ${researchResult.durationMs}ms${researchResult.fromCache ? ' (캐시)' : ''}`,
          );
        } else {
          console.log(
            `[Pipeline] 🧠 DeepResearch 결과 없음 (${researchResult.durationMs}ms) — 루나 기본 지식으로 진행`,
          );
        }

        // 🎨 UI 로딩 이벤트 종료
        yield {
          type: 'luna_thinking_deep',
          data: {
            status: 'done',
            durationMs: researchResult.durationMs,
            hasInsight: researchResult.insight.length > 20,
          },
        };
      }
    }

    // 🫀 v54: 변연계 + ACC 분석 (병렬, fail-safe)
    // 좌뇌/우뇌 호출 직전에 컨텍스트 풍부화
    let limbicHandoffText = '';
    let accConflictHint = '';

    if (LIMBIC_CONFIG.enabled || ACC_CONFIG.enabled) {
      const userId = ragContext?.userId;
      const supabase = ragContext?.supabase;

      if (userId && supabase) {
        try {
          // 병렬 실행
          const [limbicResult, accResult] = await Promise.all([
            LIMBIC_CONFIG.enabled
              ? limbicSessionStart({
                  supabase,
                  userId,
                  isFirstMeeting: turnCount === 0,
                  daysSinceLastSession: 0,    // TODO: 세션 메타에서 가져오기
                  totalSessions: turnCount,
                })
              : Promise.resolve(null),
            ACC_CONFIG.enabled
              ? analyzeAcc({
                  supabase,
                  user_id: userId,
                  user_utterance: userMessage,
                }, logCollector)
              : Promise.resolve(null),
          ]);

          // Limbic 컨텍스트 주입
          if (limbicResult) {
            limbicHandoffText = '\n\n' + formatLimbicForPrompt(limbicResult.handoff);
            // 좌뇌 신호로 Limbic 상태 갱신 (이번 턴, fire-and-forget)
            limbicOnTurn({
              state: limbicResult.state,
              signalInput: {
                derived_signals: {
                  crisis_risk: (stateResult.riskLevel as string) === 'CRITICAL' || stateResult.riskLevel === RiskLevel.HIGH,
                  escalating: false,
                  helplessness: false,
                  insight_moment: false,
                  trust_gain: false,
                },
                high_stakes_type: null,
                user_input_excerpt: userMessage.slice(0, 100),
              },
              triggerContext: `유저 발화: ${userMessage.slice(0, 50)}`,
            });
          }

          // ACC 모순 힌트 주입 + 🆕 v56: 좌뇌 strategic_shift 트리거
          if (accResult && accResult.conflict_hint) {
            accConflictHint = '\n\n' + accResult.conflict_hint;
            console.log(`[Pipeline] ⚠️ ACC 모순 ${accResult.detected_conflicts.length}개 감지`);

            // 고심각도 (severity >= 0.7) 모순은 structured data 로도 주입
            // → 좌뇌가 strategic_shift = { requires_shift: true } 로 판단하게 유도
            const highSev = accResult.detected_conflicts.filter(c => c.severity >= 0.7);
            if (highSev.length > 0) {
              const structured = highSev.map(c => ({
                type: c.conflict_type,
                previous: c.previous.content.slice(0, 80),
                current: c.current.content.slice(0, 80),
                severity: Math.round(c.severity * 100) / 100,
                days_apart: Math.round(c.days_apart),
              }));

              accConflictHint += `\n\n### 🔄 고심각도 모순 — 좌뇌 strategic_shift 재판단 요구\n` +
                `아래 모순 데이터 보고 strategic_shift.requires_shift, shift_to 진지하게 판단해.\n` +
                '```json\n' + JSON.stringify(structured, null, 2) + '\n```\n' +
                `→ 이 턴은 '공감 모드' 유지보다 'questioning/explore/confrontation' 전환 우선 고려.`;

              console.log(`[Pipeline] 🔄 ${highSev.length}개 고심각도 모순 → 좌뇌 전략 전환 유도`);
            }
          }
        } catch (err: any) {
          console.warn('[Pipeline] Limbic/ACC 분석 실패 (계속 진행):', err?.message);
        }
      }
    }

    // systemPrompt 에 Limbic + ACC 컨텍스트 주입
    if (limbicHandoffText) systemPrompt = systemPrompt + limbicHandoffText;
    if (accConflictHint) systemPrompt = systemPrompt + accConflictHint;

    // 모델 라우팅
    const modelRoute = routeModel(strategyResult.strategyType, stateResult.riskLevel);

    // Step 5: LLM 응답 생성
    const messages = chatHistory.map((m) => ({
      role: (m.role === 'ai' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.content,
    }));

    // 🆕 친구 모드: 채팅 히스토리의 존댓말 AI 메시지를 반말로 변환
    // (기존 세션에서 상담사 모드로 쌓인 히스토리가 LLM 톤을 오염시키는 문제 해결)
    if (persona === 'friend') {
      for (let i = 0; i < messages.length; i++) {
        if (messages[i].role === 'assistant') {
          let text = messages[i].content;
          // 대표적인 존댓말 어미를 반말로 변환
          text = text.replace(/하셨군요/g, '했구나');
          text = text.replace(/하셨나요\?/g, '했어?');
          text = text.replace(/드셨나요\?/g, '들었어?');
          text = text.replace(/으셨나요\?/g, '었어?');
          text = text.replace(/셨군요/g, '었구나');
          text = text.replace(/셨나요\?/g, '었어?');
          text = text.replace(/실까요\?/g, '을까?');
          text = text.replace(/드릴게요/g, '줄게');
          text = text.replace(/괜찮아요/g, '괜찮아');
          text = text.replace(/있어요/g, '있어');
          text = text.replace(/없어요/g, '없어');
          text = text.replace(/같아요/g, '같아');
          text = text.replace(/싶어요/g, '싶어');
          text = text.replace(/해볼까요\?/g, '해볼까?');
          text = text.replace(/할까요\?/g, '할까?');
          text = text.replace(/인가요\?/g, '인 거야?');
          text = text.replace(/인지요\?/g, '인 거야?');
          text = text.replace(/이에요/g, '이야');
          text = text.replace(/예요/g, '야');
          text = text.replace(/세요/g, '');
          text = text.replace(/습니다/g, '어');
          text = text.replace(/합니다/g, '해');
          text = text.replace(/됩니다/g, '돼');
          text = text.replace(/입니다/g, '이야');
          text = text.replace(/주세요/g, '줘');
          text = text.replace(/보세요/g, '봐');
          text = text.replace(/마음이 선생님/g, '마음이');
          messages[i].content = text;
        }
      }

      // 마지막 사용자 메시지 직전에 반말 리마인더 삽입
      messages.push({
        role: 'user',
        content: `[시스템 리마인더: 너는 10년 절친이야. 반드시 반말로 대답해. "~했구나", "~어때?", "~이야", "~해봐" 식으로. 존댓말("~하셨군요", "~드릴게요", "~해보실까요?") 절대 금지. 카톡처럼 짧게 3-4줄.]`,
      });
      messages.push({
        role: 'assistant',
        content: '알겠어! 반말로 얘기할게 ㅎㅎ',
      });
    }

    messages.push({ role: 'user', content: userMessage });
    let recentMessages = messages.slice(-20);

    // 🆕 v47: 프롬프트 크기 측정 + 자동 트리밍 (Groq 413 방어)
    const estimateTokens = (text: string) => Math.ceil(text.length / 2.5); // 한글 ~2.5자/토큰
    const systemTokens = estimateTokens(systemPrompt);
    const msgTokens = recentMessages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
    const totalTokens = systemTokens + msgTokens;
    console.log(`[Pipeline] 📏 프롬프트 크기: system=${systemTokens}토큰, msgs=${msgTokens}토큰 (${recentMessages.length}개), total≈${totalTokens}토큰`);

    // 32K 컨텍스트 윈도우 기준 80% = 25,600 토큰 초과 시 히스토리 축소
    if (totalTokens > 25600 && recentMessages.length > 4) {
      const targetMsgs = Math.max(4, Math.floor(recentMessages.length * 0.5));
      recentMessages = recentMessages.slice(-targetMsgs);
      const newMsgTokens = recentMessages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
      console.log(`[Pipeline] ✂️ 히스토리 축소: ${messages.length}→${recentMessages.length}개 (${msgTokens}→${newMsgTokens}토큰)`);
    }

    if (persona === 'panel') {
      // 패널 모드: 구조화 출력 (비스트리밍) — 3사 캐스케이드
      const { text: rawResponse } = await generateWithCascade(
        modelRoute.cascade,
        systemPrompt,
        recentMessages,
        modelRoute.maxTokens
      );

      try {
        // JSON 파싱 (코드블록 제거)
        const cleaned = rawResponse.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
        const panelData: PanelResponse = JSON.parse(cleaned);
        yield { type: 'panel', data: panelData };

        if (panelData.suggestions && panelData.suggestions.length > 0) {
          const panelItems: SuggestionItem[] = panelData.suggestions.map((text, idx) => ({
            text,
            category: (idx === panelData.suggestions!.length - 1 ? 'DIRECTION_CHOICE' : STRATEGY_TO_CATEGORY[strategyResult.strategyType] || 'DIRECTION_CHOICE') as SuggestionCategory,
            strategyHint: idx === panelData.suggestions!.length - 1 ? undefined : strategyResult.strategyType,
          }));
          yield { type: 'suggestions', data: panelItems };
        }
      } catch {
        // 파싱 실패 시 일반 텍스트로 전송
        yield { type: 'text', data: rawResponse };
      }

      // 🆕 v15: 이벤트 전송 (패널 모드에서도 AI 응답 완료 후)
      for (const event of eventsToFire) {
        yield { type: 'phase_event', data: event };
        console.log(`[Pipeline] 🎮 이벤트 발생 (panel): ${event.type} (${newPhaseV2})`);
      }
    } else {
      // 상담사/친구 모드: 스트리밍 — 3사 캐스케이드
      let fullText = '';
      // 🆕 v60: 좌뇌 analysis 캡쳐 (pacing_meta 추출용) — phase 재판단까지 필요
      let capturedLeftBrainAnalysis: any = null;
      // 🆕 v73: WM 캡쳐 (phase 재판단용 — filledCards/consecutive_ready_turns)
      let capturedWorkingMemory: any = null;

      // 🧠 v52: 이중뇌 분기 — 상담 모드(luna)에서만 실행
      // Gemini가 판단/태그 생성, Claude가 말풍선 생성 (복잡 턴만)
      const useDualBrain = DUAL_BRAIN_CONFIG.enabled && persona === 'luna';
      const useKBE = KBE_CONFIG.enabled && persona === 'luna';

      if (useDualBrain) {
        // 🆕 v79: 항상 ACE v5 출력을 버퍼링.
        //   우뇌가 인라인 힌트 ([DELAY:fast/med/slow], [TYPING], [STICKER:x], [SILENCE]) 로
        //   타이밍/스티커까지 직접 판단. 파싱 후 지연+말풍선 분리해서 yield.
        //   (KBE 기본 OFF — 중간 재해석 없어 버그 원천 차단)
        let claudeBuffer = '';

        // 🆕 v70: Working Memory scratchpad 로드 (세션 내 연속성)
        let workingMemory: any = null;
        if (ragContext?.supabase && ragContext?.sessionId) {
          try {
            const { loadScratchpad } = await import('@/engines/working-memory');
            workingMemory = await loadScratchpad(
              ragContext.supabase,
              ragContext.sessionId,
              ragContext.userId,
            );
            capturedWorkingMemory = workingMemory; // 🆕 v73: 재판단용 외부 캡쳐
          } catch (e: any) {
            console.warn('[Pipeline:v70] WM load 실패 (무시):', e?.message);
          }
        }

        try {
          for await (const chunk of executeDualBrain({
            userInput: userMessage,
            contextBlock: systemPrompt,
            sessionId: ragContext?.sessionId ?? ragContext?.userId ?? 'unknown',
            turnIdx: turnCount,
            // 🆕 v70: 풍부한 컨텍스트 주입
            userId: ragContext?.userId,
            currentPhase: newPhaseV2 as any,
            phaseStartTurn: updatedPhaseStartTurn ?? phaseStartTurn,
            workingMemory,
            supabase: ragContext?.supabase,
            // 🆕 v71: 좌뇌가 대화 맥락 받게 (반복 질문 박멸)
            chatHistory: chatHistory,
          }, logCollector)) {
            if (chunk.type === 'text') {
              // 🆕 v79: 항상 버퍼링 (인라인 힌트 파싱 위해)
              claudeBuffer += chunk.data;
            } else if (chunk.type === 'analysis') {
              capturedLeftBrainAnalysis = chunk.data;
            }
          }
        } catch (err: any) {
          console.warn('[Pipeline] ⚠️ DualBrain 실패 — 레거시 단일 모델로 폴백:', err?.message);
          fullText = '';
          claudeBuffer = '';
        }

        // 🆕 v70: Working Memory 턴 종료 후 업데이트 + 저장 (fire-and-forget)
        let finalWorkingMemory: any = null;
        if (workingMemory && ragContext?.supabase && ragContext?.sessionId) {
          try {
            const { updateFromTurn, saveScratchpad } = await import('@/engines/working-memory');
            const updatedWM = updateFromTurn(workingMemory, {
              turnIdx: turnCount,
              userMessage,
              lunaResponse: fullText || claudeBuffer,
              leftBrainAnalysis: capturedLeftBrainAnalysis,
              emotionScore: stateResult.emotionScore,
            });
            finalWorkingMemory = updatedWM;
            // 🆕 v73: await 로 변경 — fire-and-forget 이 다음 턴 session_metadata 덮어쓰기와 경합하던 버그 수정
            try {
              const saveRes = await saveScratchpad(ragContext.supabase, ragContext.sessionId, updatedWM);
              if (!saveRes.success) console.warn('[Pipeline:v73] WM save 실패:', saveRes.error);
            } catch (e: any) {
              console.warn('[Pipeline:v73] WM save 예외:', e?.message);
            }

            // 🆕 v77: 친밀도 실시간 누적 — 좌뇌 intimacy_signals 적용
            try {
              const signals = (capturedLeftBrainAnalysis as any)?.intimacy_signals;
              if (signals && ragContext?.userId) {
                const { applyIntimacyDeltaFromSignals } = await import('@/engines/intimacy/v77-core');
                const result = await applyIntimacyDeltaFromSignals(
                  ragContext.supabase,
                  ragContext.userId,
                  signals,
                );
                const marker = result.levelUp ? ' 🎉 LEVEL UP!' : result.levelDown ? ' ⬇️ LEVEL DOWN' : '';
                const sign = result.delta >= 0 ? '+' : '';
                console.log(`[Intimacy:v77] delta=${sign}${result.delta} → Lv.${result.state.level} (score=${result.state.score})${marker}`);
              }
            } catch (e: any) {
              console.warn('[Intimacy:v77] delta 적용 실패 (무시):', e?.message);
            }
          } catch (e: any) {
            console.warn('[Pipeline:v70] WM update 실패 (무시):', e?.message);
          }
        }

        // 🆕 v70: Reflection 트리거 (매 6턴, fire-and-forget)
        if (finalWorkingMemory && ragContext?.supabase && ragContext?.sessionId) {
          try {
            const { shouldTriggerReflection, performReflection } = await import('@/engines/consolidation/reflection');
            if (shouldTriggerReflection(turnCount)) {
              console.log(`[Memory:v70] 🧠 Reflection 트리거 (turn=${turnCount})`);
              const supa = ragContext.supabase;
              const uid = ragContext.userId;
              const sid = ragContext.sessionId;
              performReflection(supa, uid, sid, finalWorkingMemory)
                .then(async (result) => {
                  if (!result) return;
                  // scratchpad 의 session_scratchpad 를 업데이트 + 저장
                  const updated = {
                    ...finalWorkingMemory,
                    session_scratchpad: {
                      ...finalWorkingMemory.session_scratchpad,
                      main_topic: result.main_topic ?? finalWorkingMemory.session_scratchpad.main_topic,
                      situation_summary: result.situation_summary ?? finalWorkingMemory.session_scratchpad.situation_summary,
                      user_primary_stance: result.user_primary_stance ?? finalWorkingMemory.session_scratchpad.user_primary_stance,
                      key_characters: result.key_characters ?? finalWorkingMemory.session_scratchpad.key_characters,
                      unresolved_points: result.unresolved_points ?? finalWorkingMemory.session_scratchpad.unresolved_points,
                    },
                  };
                  const { saveScratchpad } = await import('@/engines/working-memory');
                  await saveScratchpad(supa, sid, updated);
                })
                .catch((e: any) => console.warn('[Pipeline:v70] Reflection 실패:', e?.message));
            }
          } catch (e: any) {
            console.warn('[Pipeline:v70] Reflection 모듈 로드 실패 (무시):', e?.message);
          }
        }

        // KBE 실행 — Claude 원문을 "친구라면 어떻게 보낼까" 판단
        // 🆕 v79: KBE 제거 → 우뇌(ACE v5) 인라인 힌트 파서
        //   형식:
        //     [SILENCE]              → 아예 답 안 보냄
        //     [DELAY:fast|med|slow]  → 버스트 앞 지연 (각 300/1500/3500ms 베이스 + 랜덤)
        //     [TYPING]               → 현재는 지연 구간으로 통합 (향후 UI 연결 시 활용)
        //     [STICKER:name]         → 버스트 뒤 스티커 전송
        //   ||| 기준으로 버스트 분리.
        if (claudeBuffer) {
          // [SILENCE] 전용 턴 — 응답 없이 침묵
          if (/^\s*\[SILENCE\]\s*$/.test(claudeBuffer)) {
            console.log('[Pipeline] 🤫 [SILENCE] — 응답 생략');
            fullText = '';
          } else if (useKBE) {
            // 레거시 KBE 호환 경로 (env KBE_ENABLED=true 일 때만)
            try {
              const cleanedClaudeBuffer = claudeBuffer
                .replace(/\[SITUATION_READ:[^\]]*\]/gi, '')
                .replace(/\[LUNA_THOUGHT:[^\]]*\]/gi, '')
                .replace(/\[PHASE_SIGNAL:[^\]]*\]/gi, '')
                .replace(/\[SITUATION_CLEAR:[^\]]*\]/gi, '')
                .replace(/\[LEFT_BRAIN_HINT:[^\]]*\]/gi, '')
                .replace(/\[REQUEST_REANALYSIS:[^\]]*\]/gi, '')
                .trim();
              const kbeStream = runKBE({
                claude_response: cleanedClaudeBuffer,
                user_utterance: userMessage,
                left_brain_summary: {
                  tone: strategyResult.strategyType,
                  somatic: limbicHandoffText ? '변연계 활성' : '평이',
                  complexity: 3,
                  ambiguity: false,
                  crisis: (stateResult.riskLevel as string) === 'CRITICAL' || stateResult.riskLevel === RiskLevel.HIGH,
                },
                limbic_mood: limbicHandoffText.slice(0, 200) || '평이한 상태',
                session_meta: {
                  turn_idx: turnCount,
                  intimacy_level: (hlre.getIntimacyState('luna') as any)?.level ?? 1,
                  stickers_used_this_session: 0,
                  last_sticker_turns_ago: -1,
                  last_event_turns_ago: -1,
                  events_fired_session: [],
                },
              });
              for await (const kbeChunk of kbeStream) {
                if (kbeChunk.type === 'text') {
                  fullText += kbeChunk.data;
                  yield { type: 'text', data: kbeChunk.data };
                } else if (kbeChunk.type === 'sticker') {
                  const stickerTag = `[STICKER:${kbeChunk.data}]`;
                  fullText += stickerTag;
                  yield { type: 'text', data: stickerTag };
                }
              }
            } catch (err: any) {
              console.warn('[Pipeline] ⚠️ KBE 실패 — 원문 그대로:', err?.message);
              fullText = claudeBuffer;
              yield { type: 'text', data: claudeBuffer };
            }
          } else {
            // 🆕 v79 기본 경로: 우뇌 인라인 힌트 파싱
            //
            // 메타 태그 (hlrePost 가 파싱할 것들) 는 fullText 에 보존, 표시용 버스트에선 제거
            //   — SITUATION_READ/LUNA_THOUGHT/PHASE_SIGNAL/SITUATION_CLEAR
            //   — MIND_READ_READY/STORY_READY/STRATEGY_READY/ACTION_PLAN/WARM_WRAP
            //   — TAROT_READY/PATTERN_MIRROR_READY/THINKING_DEEP
            //   — TONE_SELECT/DRAFT_CARD/ROLEPLAY_FEEDBACK/PANEL_REPORT/IDEA_REFINE
            //   — REQUEST_REANALYSIS/LEFT_BRAIN_HINT/RP_IN/RP_OUT
            const METADATA_TAG_RE = /\[(?:SITUATION_READ|LUNA_THOUGHT|PHASE_SIGNAL|SITUATION_CLEAR|MIND_READ_READY|STORY_READY|STRATEGY_READY|ACTION_PLAN|WARM_WRAP|TAROT_READY|PATTERN_MIRROR_READY|THINKING_DEEP|TONE_SELECT|DRAFT_CARD|ROLEPLAY_FEEDBACK|PANEL_REPORT|IDEA_REFINE|REQUEST_REANALYSIS|LEFT_BRAIN_HINT|RP_IN|RP_OUT|OPERATION_COMPLETE)(?::[^\]]*)?\]/gi;

            const rawBursts = claudeBuffer.split('|||');
            const delayMap: Record<string, [number, number]> = {
              fast: [200, 500],   // 200~700ms
              med:  [1000, 1500], // 1000~2500ms
              slow: [3000, 3000], // 3000~6000ms
            };

            for (let i = 0; i < rawBursts.length; i++) {
              let burstText = rawBursts[i];
              const burstOriginalForBuffer = burstText; // fullText 에는 메타 태그 포함된 원본

              // [DELAY:fast|med|slow] 추출 — 유연한 매칭 (AI 변형 대응)
              const delayMatch = burstText.match(/\[DELAY(?:[:\s]*(?:fast|med|slow))?\s*\]/i);
              let delayMs = i === 0 ? 100 : 600;
              if (delayMatch) {
                const speedMatch = delayMatch[0].match(/fast|med|slow/i);
                const speed = speedMatch ? speedMatch[0].toLowerCase() : 'med';
                const [base, range] = delayMap[speed];
                delayMs = base + Math.floor(Math.random() * range);
                burstText = burstText.replace(delayMatch[0], '');
              }

              // [TYPING] — 힌트만 제거 (UI 인디케이터 미연결)
              burstText = burstText.replace(/\[TYPING\]/gi, '');

              // [STICKER:name] 추출
              const stickerMatch = burstText.match(/\[STICKER:([a-z_]+)\]/i);
              const sticker = stickerMatch ? stickerMatch[1].toLowerCase() : null;
              if (stickerMatch) burstText = burstText.replace(stickerMatch[0], '');

              // 🆕 v79: [FX:id] / [FX:id]...[/FX] FX 태그 파싱
              //   단일 발동: [FX:bubble.wobble], [FX:particle.hearts] 등
              //   범위 발동: [FX:text.wave]ㅎㅎㅎ[/FX] (현재는 단일 발동으로 취급 — 버스트 전체 대상)
              const fxIds: string[] = [];
              // 범위형 — 내부 텍스트는 보존, 태그만 제거 + id 기록
              burstText = burstText.replace(/\[FX:([a-z_]+\.[a-z_]+)\]([\s\S]*?)\[\/FX\]/gi, (_f, id: string, inner: string) => {
                fxIds.push(id.toLowerCase());
                return inner;
              });
              // 단일형
              burstText = burstText.replace(/\[FX:([a-z_]+\.[a-z_]+)\]/gi, (_f, id: string) => {
                fxIds.push(id.toLowerCase());
                return '';
              });

              // 메타 태그 제거 (표시용)
              burstText = burstText.replace(METADATA_TAG_RE, '');

              // 🆕 v80: catch-all — 잔여 인라인 힌트 태그 완전 제거 (AI 변형/오타 방어)
              //   닫힌 태그: [DELAY:뭐든], [TYPING], [SILENCE], [STICKER:뭐든]
              //   열린 태그: [DELAY... (닫는 ] 없이 비정상 종료)
              burstText = burstText
                .replace(/\[(?:DELAY|TYPING|SILENCE|STICKER)(?::[^\]]*)?\]/gi, '')
                .replace(/\[(?:DELAY|TYPING|SILENCE|STICKER)[^\]\n]*/gi, '')
                .trim();

              // fullText 에는 메타 태그 포함해서 누적 (hlre.postProcess 파싱용)
              // — DELAY/TYPING/FX 는 유지 불필요, 제거 (하위 HLRE/UI 에 노출되면 안 됨)
              const bufferSnippet = burstOriginalForBuffer
                .replace(/\[DELAY(?::[^\]]*)?\]/gi, '')
                .replace(/\[DELAY[^\]\n]*/gi, '')
                .replace(/\[TYPING\]/gi, '')
                .replace(/\[STICKER:[a-z_]+\]/gi, '')
                .replace(/\[SILENCE\]/gi, '')
                // 🆕 v79 fix: FX 태그 제거 (범위형 + 단일형) — UI 노출 방지
                .replace(/\[FX:[a-z_]+\.[a-z_]+\][\s\S]*?\[\/FX\]/gi, (_m, ) => _m.replace(/\[\/?FX[^\]]*\]/gi, ''))
                .replace(/\[FX:[a-z_]+\.[a-z_]+\]/gi, '')
                .replace(/\[\/FX\]/gi, '');

              if (!burstText && !sticker && !bufferSnippet.trim()) continue;

              // 지연
              if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));

              // ||| 구분자 (첫 버스트 빼고)
              if (i > 0 && fullText.length > 0) {
                fullText += '|||';
                yield { type: 'text', data: '|||' };
              }

              // 🆕 v79: FX 이벤트 발동 — 텍스트 yield 직전에 screen 효과 먼저 터지게
              //   (쉬는 타이밍 → 화면 flash/shake → 말풍선 등장 순서)
              const FX_TARGETS: Record<string, 'screen' | 'bubble' | 'text' | 'avatar' | 'particle' | 'bg'> = {
                'shake.soft': 'screen', 'shake.hard': 'screen',
                'flash.white': 'screen', 'flash.pink': 'screen',
                'tint.sepia': 'screen', 'tint.cool': 'screen',
                'rain.sakura': 'bg', 'rain.tears': 'particle',
                'bubble.wobble': 'bubble', 'bubble.bounce': 'bubble', 'bubble.deflate': 'bubble',
                'bubble.glow': 'bubble', 'bubble.popIn': 'bubble', 'bubble.shimmer': 'bubble', 'bubble.burst': 'bubble',
                'text.wave': 'text', 'text.shake': 'text', 'text.pulse': 'text',
                'text.rainbow': 'text', 'text.scramble': 'text',
                'avatar.bounce': 'avatar', 'avatar.shake': 'avatar', 'avatar.heartBeat': 'avatar',
                'particle.hearts': 'particle', 'particle.sparkles': 'particle',
                'particle.tears': 'particle', 'particle.fire': 'particle',
                'particle.confetti': 'particle', 'particle.stars': 'particle',
              };
              for (const fxId of fxIds) {
                const target = FX_TARGETS[fxId];
                if (!target) continue;
                yield { type: 'fx', data: { id: fxId, target } };
              }

              // 표시용 yield
              if (burstText) {
                yield { type: 'text', data: burstText };
              }
              if (sticker) {
                const stickerTag = `[STICKER:${sticker}]`;
                yield { type: 'text', data: stickerTag };
              }

              // fullText 누적 (메타 태그 포함, 후처리 파싱용)
              fullText += bufferSnippet + (sticker ? `[STICKER:${sticker}]` : '');
            }

            console.log(`[Pipeline] 💬 인라인 파싱 완료: ${rawBursts.length}개 버스트 → ${fullText.length}자 (표시+메타)`);
          }
        }
      }

      // fullText가 비어있으면 기존 streamWithCascade 실행 (dual-brain 비활성/실패 시)
      // fullText가 채워졌으면 이 블록 전체 스킵하고 post-processing으로 직행
      if (fullText) {
        // dual-brain 성공 — 기존 think-filter / stream 루프 건너뛰기
      } else {
      // 🆕 v49: streamWithCascade가 텍스트 + 재시도 이벤트를 직접 yield
      const stream = streamWithCascade(
        modelRoute.cascade,
        systemPrompt,
        recentMessages,
        modelRoute.maxTokens,
      );

      // <think>...</think> 태그 스트리밍 필터 (qwen3-32b thinking mode)
      let insideThink = false;
      let stripLeadingWhitespace = false; // </think> 직후 다음 청크 공백 제거용

      for await (const chunk of stream) {
        // 🆕 v49: 재시도 이벤트는 즉시 SSE로 전달
        if (typeof chunk === 'object' && '__retry' in chunk) {
          yield { type: 'retry_status', data: chunk.__retry };
          continue;
        }

        let text = chunk as string;

        // 이전 청크에서 </think> 나왔으면 이번 청크 앞 공백 제거
        if (stripLeadingWhitespace && !insideThink) {
          text = text.replace(/^[\s\n\r]+/, '');
          if (text.length > 0) stripLeadingWhitespace = false;
          else continue; // 공백만 있는 청크 — 스킵
        }

        if (insideThink) {
          const closeIdx = text.indexOf('</think>');
          if (closeIdx !== -1) {
            insideThink = false;
            text = text.slice(closeIdx + 8);
            text = text.replace(/^[\s\n\r]+/, '');
            stripLeadingWhitespace = text.length === 0; // 남은 게 없으면 다음 청크도 공백 제거
            if (text.length === 0) continue;
          } else {
            continue; // think 블록 안 — 전부 버림
          }
        }

        // <think> 시작 태그 체크
        const openIdx = text.indexOf('<think>');
        if (openIdx !== -1) {
          const before = text.slice(0, openIdx);
          if (before.length > 0) {
            fullText += before;
            yield { type: 'text', data: before };
          }
          insideThink = true;
          // 같은 청크에 </think>도 있는지 체크
          const afterOpen = text.slice(openIdx + 7);
          const closeIdx = afterOpen.indexOf('</think>');
          if (closeIdx !== -1) {
            insideThink = false;
            const afterClose = afterOpen.slice(closeIdx + 8).replace(/^[\s\n\r]+/, '');
            stripLeadingWhitespace = afterClose.length === 0;
            if (afterClose.length > 0) {
              fullText += afterClose;
              yield { type: 'text', data: afterClose };
            }
          }
        } else {
          fullText += text;
          yield { type: 'text', data: text };
        }
      }
      }   // 🧠 v52: dual-brain 폴백 else 블록 종료

      // 🆕 v30: 응답 검증 — fire-and-forget (스트리밍 완료 후 비동기, 0.5~1초 절약)
      // 검증 결과는 로그에만 사용되므로 유저 응답 전달을 블로킹할 필요 없음
      validateResponse(fullText, effectiveEmotionScore, strategyResult.strategyType)
        .then(v => { if (!v.passed) console.warn(`[Pipeline] 응답 검증 FAIL:`, v.violations); })
        .catch(() => {});

      // 🆕 v29: HLRE 후처리 — 시그널 파싱 + 검증 + 기억
      if (hlreActive) {
        try {
          const userMsgs = chatHistory.filter(m => m.role === 'user').map(m => m.content);
          userMsgs.push(userMessage);

          // 🆕 v78.2: KBE 가 태그를 벗긴 뒤 재생성하면 fullText 에 태그 없음
          //   → UI의 situationRead / lunaThought 가 영원히 플레이스홀더("상황 듣는 중...")
          //   좌뇌 analysis 에 이미 태그 있으니 fullText 에 주입해서 파서가 읽게 함.
          const lbTags = capturedLeftBrainAnalysis?.tags;
          if (lbTags && !/\[SITUATION_READ:/i.test(fullText)) {
            const injectedTags: string[] = [];
            if (lbTags.SITUATION_READ) injectedTags.push(`[SITUATION_READ:${lbTags.SITUATION_READ}]`);
            if (lbTags.LUNA_THOUGHT) injectedTags.push(`[LUNA_THOUGHT:${lbTags.LUNA_THOUGHT}]`);
            if (lbTags.PHASE_SIGNAL) injectedTags.push(`[PHASE_SIGNAL:${lbTags.PHASE_SIGNAL}]`);
            if (lbTags.SITUATION_CLEAR) injectedTags.push(`[SITUATION_CLEAR:${lbTags.SITUATION_CLEAR}]`);
            if (injectedTags.length > 0) {
              fullText = fullText + injectedTags.join('');
              console.log(`[Pipeline] 🏷️ 좌뇌 태그 주입 (KBE 제거 보상): ${injectedTags.length}개`);
            }
          }

          const hlrePost = await hlre.postProcess(fullText, userMsgs);
          // 시그널 태그 제거된 클린 응답으로 교체
          if (hlrePost.finalResponse !== fullText) {
            yield { type: 'text', data: `\n__HLRE_REPLACE__${hlrePost.finalResponse}` };
            fullText = hlrePost.finalResponse;
          }
          if (hlrePost.phaseSignal) {
            console.log(`[Pipeline] 🏷️ Phase시그널: ${hlrePost.phaseSignal} (전환: ${hlrePost.shouldTransition ? 'YES' : 'NO'})`);
          }
          console.log(`[Pipeline] 🧑 HLRE 루나감정(후): ${hlrePost.emotionState.currentEmotion}(${Math.round(hlrePost.emotionState.currentIntensity * 100)}%)`);

          // 🆕 v74: VN 극장 발동 — 좌뇌/우뇌 LLM 판단 신호 통합 게이트
          //
          // 발동 조건 (셋 중 하나 — 전부 LLM 자체 판단 결과):
          //   A. 좌뇌 event_recommendation.suggested === 'VN_THEATER' (명시 추천)
          //   B. 좌뇌 pacing_meta.pacing_state === 'READY' (카드 충족 + 다음 단계 준비)
          //   C. 우뇌 응답에 [MIND_READ_READY] 태그 (스스로 마음 읽기 준비)
          //
          // 제거된 코드 규칙:
          //   ❌ 온도계 완료 선행 조건, turnInPhase >= 2 하드코딩,
          //      isFormulationReady() 휴리스틱, isReadyForMirror 게이트
          const lbPacingState = capturedLeftBrainAnalysis?.pacing_meta?.pacing_state;
          const lbTransition = capturedLeftBrainAnalysis?.pacing_meta?.phase_transition_recommendation;

          const vnAlreadyFired = updatedCompletedEvents.includes('EMOTION_MIRROR') || eventsToFire.some((e) => e.type === 'EMOTION_MIRROR');

          // 🆕 v78.4: Phase ↔ 이벤트 1:1 고정 (LLM 판단 X, Phase 진입 = 무조건 발동)
          //   MIRROR (마음 읽기) → EMOTION_MIRROR (VN 극장) 무조건
          //   BRIDGE (같이 준비) → LUNA_STRATEGY  (아래 블록에서 처리)
          //   SOLVE  (실행 계획) → ACTION_PLAN   (AI 태그로 발동)
          //   EMPOWER(변화 응원) → WARM_WRAP    (AI 태그로 발동)
          //
          //   이전 버그: pacing=READY 만으로도 VN 시도 → MIRROR 아닌 Phase 에서 엉뚱한 극장 발동
          //              + 좌뇌가 ACTION_PLAN 추천해도 VN 강행.
          //   유저 의도: "같이 준비 / 마음읽기 등 Phase 에 맞는 이벤트는 코드로 고정. 내용만 LLM."
          //
          // 🆕 v78.8: Phase 재판단은 이 블록 이후에 실행됨 → 여기서 `newPhaseV2` 는 아직 이전 턴 값.
          //   이 턴이 MIRROR 로 전환 예정인지 예측 판단.
          const lbRecommendsVN = capturedLeftBrainAnalysis?.event_recommendation?.suggested === 'VN_THEATER'
            || capturedLeftBrainAnalysis?.event_recommendation?.suggested === 'EMOTION_MIRROR';
          const willEnterMirror =
            newPhaseV2 === 'MIRROR' ||
            // HOOK → MIRROR 전환 신호
            (newPhaseV2 === 'HOOK' && (
              hlrePost.mindReadReady === true ||                           // Luna 가 [MIND_READ_READY] 또는 [SITUATION_CLEAR]
              lbRecommendsVN ||                                            // 좌뇌가 VN_THEATER 추천
              (lbPacingState === 'READY' && lbTransition === 'JUMP')       // 좌뇌가 이번 턴 다음 Phase JUMP
            ));
          const vnGate = willEnterMirror;

          if (vnGate && !vnAlreadyFired && canFireEvent()) {
            const trigger = `willEnterMirror (currentPhase=${newPhaseV2}, lbPacing=${lbPacingState}/${lbTransition}, aiTag=${hlrePost.mindReadReady ?? false}, lbRecVN=${lbRecommendsVN})`;
            console.log(`[Pipeline] 🎭 VN 극장 발동 시도 — 트리거: ${trigger}`);

            updatedLastEventTurn = turnCount;

            // VN 연극 준비 로딩 UI
            yield {
              type: 'luna_thinking_deep',
              data: {
                status: 'started',
                keyword: '연극',
                phrases: ['🎭 잠깐, 너 상황 한번 연기해볼게', '📝 대본 쓰는 중...', '🎨 무대 꾸미는 중...'],
              },
            };
            const dramaT0 = Date.now();

            // 생성 시도 (최대 2회 — 1차 + solo 폴백)
            let mirrorData: EmotionMirrorData | null = null;
            const userGender = (memoryProfile as any)?.basicInfo?.gender;
            for (let attempt = 1; attempt <= 2; attempt++) {
              try {
                mirrorData = await generateDynamicMirror(updatedAccumulator, currentScenario, chatHistory, userGender);
                if (mirrorData) {
                  console.log(`[Pipeline] 🎭 VN 생성 성공 (시도 ${attempt}/2): "${mirrorData.sceneTitle}" (${mirrorData.sceneLines?.length}줄)`);
                  break;
                }
                console.warn(`[Pipeline] 🎭 VN 시도 ${attempt}/2 → LLM ready=false`);
              } catch (e) {
                console.warn(`[Pipeline] 🎭 VN 시도 ${attempt}/2 에러:`, e);
              }
            }

            yield { type: 'luna_thinking_deep', data: { status: 'done', durationMs: Date.now() - dramaT0 } };

            const vnEvent = createEmotionMirror(stateResult, currentScenario, mirrorData);
            if (vnEvent) {
              eventsToFire.push(vnEvent);
              updatedCompletedEvents.push('EMOTION_MIRROR');
              if (!updatedCompletedEvents.includes('EMOTION_THERMOMETER')) {
                updatedCompletedEvents.push('EMOTION_THERMOMETER'); // 온도계 단계 스킵 처리
              }
              console.log(`[Pipeline] 🎭 VN 발동 성공! (${Date.now() - dramaT0}ms, trigger=${trigger})`);
            } else {
              console.log('[Pipeline] 🎭 VN 생성 실패 (LLM 판단) → 이번 턴 스킵, 다음 턴에 재시도 가능');
            }
          }

          // 🆕 ACE v4: AI가 [STORY_READY:...] 태그를 출력했으면 → 루나의 이야기 이벤트 발동
          // 🆕 v43: canFireEventType으로 이중 체크 (DB race condition 방어)
          if (hlrePost.storyData && canFireEventType('LUNA_STORY')) {
            const { opener, situation, innerThought, cliffhanger } = hlrePost.storyData;
            eventsToFire.push(createLunaStory(opener, situation, innerThought, cliffhanger));
            updatedCompletedEvents.push('LUNA_STORY');
            updatedLastEventTurn = turnCount;
            console.log(`[Pipeline] 📖 AI 자율 루나이야기 발동! opener: "${opener.slice(0, 30)}..."`);
          } else if (hlrePost.storyData) {
            console.log(`[Pipeline] ⚠️ LUNA_STORY 중복 차단! canFire=${canFireEvent()}, completed=${updatedCompletedEvents.includes('LUNA_STORY')}, inQueue=${eventsToFire.some(e => e.type === 'LUNA_STORY')}`);
          }

          // 🆕 ACE v4: AI가 [STRATEGY_READY:...] 태그를 출력했으면 → 루나의 작전회의 이벤트 발동
          // 🆕 v43: canFireEventType으로 이중 체크
          // 🆕 v78.4: BRIDGE(같이 준비) Phase 에서만 발동. 다른 Phase 에서 AI 가 태그 출력해도 무시.
          if (hlrePost.strategyData && newPhaseV2 === 'BRIDGE' && canFireEventType('LUNA_STRATEGY')) {
            const { opener: stratOpener, situationSummary, draftHook, roleplayHook, panelHook } = hlrePost.strategyData;
            eventsToFire.push(createLunaStrategy(stratOpener, situationSummary, draftHook, roleplayHook, panelHook));
            updatedCompletedEvents.push('LUNA_STRATEGY');
            updatedLastEventTurn = turnCount;
            console.log(`[Pipeline] 🔥 AI 자율 작전회의 발동! opener: "${stratOpener.slice(0, 30)}..." | 상황: "${situationSummary.slice(0, 40)}..."`);
          } else if (hlrePost.strategyData) {
            console.log(`[Pipeline] ⚠️ LUNA_STRATEGY 중복 차단! canFire=${canFireEvent()}, completed=${updatedCompletedEvents.includes('LUNA_STRATEGY')}`);
          }

          // 🆕 v35: 💬 메시지 초안 모드 — [TONE_SELECT:...] → TONE_SELECT 이벤트
          if (hlrePost.toneSelectData && canFireEvent() && !updatedCompletedEvents.includes('TONE_SELECT')) {
            const { soft, honest, direct } = hlrePost.toneSelectData;
            eventsToFire.push(createToneSelect(soft, honest, direct));
            updatedCompletedEvents.push('TONE_SELECT');
            updatedLastEventTurn = turnCount;
            console.log(`[Pipeline] 💬 TONE_SELECT 발동: ${soft} / ${honest} / ${direct}`);
          }

          // 🆕 v35: 💬 메시지 초안 모드 — [DRAFT_CARD:...] x3 → DRAFT_WORKSHOP 이벤트
          if (hlrePost.draftCards && hlrePost.draftCards.length > 0 && canFireEvent() && !updatedCompletedEvents.includes('DRAFT_WORKSHOP')) {
            eventsToFire.push(createDraftWorkshop(hlrePost.draftCards));
            updatedCompletedEvents.push('DRAFT_WORKSHOP');
            updatedLastEventTurn = turnCount;
            console.log(`[Pipeline] 💬 DRAFT_WORKSHOP 발동: ${hlrePost.draftCards.length}개 초안`);
          }

          // 🆕 v35: 🎭 롤플레이 모드 — [ROLEPLAY_FEEDBACK:...] → ROLEPLAY_FEEDBACK 이벤트
          if (hlrePost.roleplayFeedback && canFireEvent() && !updatedCompletedEvents.includes('ROLEPLAY_FEEDBACK')) {
            const { strengths, improvements, tip } = hlrePost.roleplayFeedback;
            eventsToFire.push(createRoleplayFeedback(strengths, improvements, tip));
            updatedCompletedEvents.push('ROLEPLAY_FEEDBACK');
            updatedLastEventTurn = turnCount;
            console.log(`[Pipeline] 🎭 ROLEPLAY_FEEDBACK 발동`);
          }

          // 🆕 v35: 🍿 연참 모드 — [PANEL_REPORT]...[/PANEL_REPORT] → PANEL_REPORT 이벤트
          if (hlrePost.panelReport && canFireEvent() && !updatedCompletedEvents.includes('PANEL_REPORT')) {
            const { situationSummary: panelSituation, strengths, cautions, lunaVerdict } = hlrePost.panelReport;
            eventsToFire.push(createPanelReport(panelSituation, strengths, cautions, lunaVerdict));
            updatedCompletedEvents.push('PANEL_REPORT');
            updatedLastEventTurn = turnCount;
            console.log(`[Pipeline] 🍿 PANEL_REPORT 발동: 강점${strengths.length}개, 주의${cautions.length}개`);
          }

          // 🆕 v35: 🤔 커스텀 모드 — [IDEA_REFINE:...] → IDEA_REFINE 이벤트
          if (hlrePost.ideaRefine && canFireEvent() && !updatedCompletedEvents.includes('IDEA_REFINE')) {
            const { original, refined, reason } = hlrePost.ideaRefine;
            eventsToFire.push(createIdeaRefine(original, refined, reason));
            updatedCompletedEvents.push('IDEA_REFINE');
            updatedLastEventTurn = turnCount;
            console.log(`[Pipeline] 🤔 IDEA_REFINE 발동`);
          }

          // 🆕 v39: 🎯 SOLVE 마무리 — [ACTION_PLAN:...] → ACTION_PLAN 이벤트
          // SOLVE S3 시뮬레이션 후 "오늘의 작전" 카드 발동 → SOLVE→EMPOWER 전환 게이트
          // 🆕 v78.4: SOLVE(실행 계획) Phase 에서만 발동. MIRROR 에서 AI 가 섣불리 태그 달아도 무시.
          if (hlrePost.actionPlan && newPhaseV2 === 'SOLVE' && canFireEvent() && !updatedCompletedEvents.includes('ACTION_PLAN')) {
            const { planType, title, coreAction, sharedResult, planB, timingHint, lunaCheer } = hlrePost.actionPlan;
            eventsToFire.push(createActionPlan(
              planType as any,
              title,
              coreAction,
              sharedResult,
              planB,
              timingHint,
              lunaCheer,
            ));
            updatedCompletedEvents.push('ACTION_PLAN');
            updatedLastEventTurn = turnCount;
            console.log(`[Pipeline] 🎯 ACTION_PLAN 발동: "${title}" | ${planType}`);
          }

          // 🆕 v39: 💜 EMPOWER 마무리 — [WARM_WRAP:...] → WARM_WRAP 이벤트
          // 학술 요약 대신 "언니의 다독임 + 재방문 약속" 카드
          // 🆕 v78.4: EMPOWER(변화 응원) Phase 에서만 발동.
          if (hlrePost.warmWrap && newPhaseV2 === 'EMPOWER' && canFireEvent() && !updatedCompletedEvents.includes('WARM_WRAP')) {
            const { strengthFound, emotionShift, nextStep, lunaMessage } = hlrePost.warmWrap;
            eventsToFire.push(createWarmWrap(strengthFound, emotionShift, nextStep, lunaMessage));
            updatedCompletedEvents.push('WARM_WRAP');
            updatedLastEventTurn = turnCount;
            console.log(`[Pipeline] 💜 WARM_WRAP 발동: "${strengthFound.slice(0, 30)}..."`);
          }

          // 🆕 v37: 이전 턴들의 히스토리 복원 (stateResult는 매 턴 새로 생성되므로 seed 필요)
          if (savedSituationReadHistory && savedSituationReadHistory.length > 0) {
            stateResult.situationReadHistory = [...savedSituationReadHistory];
          }
          if (savedLunaThoughtHistory && savedLunaThoughtHistory.length > 0) {
            stateResult.lunaThoughtHistory = [...savedLunaThoughtHistory];
          }

          // 🆕 v81: [OPERATION_COMPLETE:...] — 몰입 모드 완료 이벤트 발행
          //   프론트에서 useModeStore.exit() 트리거 → BRIDGE → SOLVE 자연 전환
          if (hlrePost.operationComplete) {
            yield {
              type: 'mode_complete',
              data: {
                mode: hlrePost.operationComplete.mode,
                summary: hlrePost.operationComplete.summary,
                nextStep: hlrePost.operationComplete.nextStep,
              },
            };
            console.log(`[Pipeline] 🎬 모드 완료 이벤트 발행: ${hlrePost.operationComplete.mode}`);
          }

          // 🆕 v36: AI가 [SITUATION_READ:...] / [LUNA_THOUGHT:...] 태그를 출력했으면 → stateResult에 주입
          if (hlrePost.situationRead || hlrePost.lunaThought) {
            if (hlrePost.situationRead) {
              stateResult.situationRead = hlrePost.situationRead;
              // 🆕 v37: 상황 인식 히스토리 누적 (중복 방지 — 직전과 같으면 추가 안 함)
              if (!stateResult.situationReadHistory) {
                stateResult.situationReadHistory = [];
              }
              const lastSituation = stateResult.situationReadHistory[stateResult.situationReadHistory.length - 1];
              if (lastSituation !== hlrePost.situationRead) {
                stateResult.situationReadHistory.push(hlrePost.situationRead);
              }
            }
            if (hlrePost.lunaThought) {
              stateResult.lunaThought = hlrePost.lunaThought;
              // 히스토리 누적 (기존 히스토리 유지 — savedLunaThoughtHistory에서 복원된 것 포함)
              if (!stateResult.lunaThoughtHistory) {
                stateResult.lunaThoughtHistory = [];
              }
              stateResult.lunaThoughtHistory.push(hlrePost.lunaThought);
            }
            // 업데이트된 stateResult를 클라이언트에 재전송
            yield { type: 'state', data: stateResult };
            console.log(`[Pipeline] 🔍 루나 인사이트 업데이트: situation="${hlrePost.situationRead ?? '—'}" | thought="${hlrePost.lunaThought ?? '—'}" | 상황 히스토리=${stateResult.situationReadHistory?.length ?? 0}개, 속마음 히스토리=${stateResult.lunaThoughtHistory?.length ?? 0}개`);
          }
        } catch (e) {
          console.warn('[Pipeline] HLRE 후처리 오류 (무시):', e);
        }
      }

      // 🆕 v46.2: Phase 재판단 — 게이트 이벤트 + AI 시그널 통합
      // 기존 v45.5에서는 AI가 STAY를 출력하면 재판단 자체를 스킵했음
      // → [SITUATION_CLEAR]로 EMOTION_THERMOMETER 완료되어도 전환 안 되는 버그
      // 수정: completedEvents가 업데이트된 후 항상 재판단 실행
      if (hlreActive) {
        try {
          const parsed2 = parsePhaseSignal(fullText);
          const aiPhaseSignal = parsed2.signal;
          // 게이트 이벤트가 이번 턴에 새로 완료되었거나, AI 시그널이 READY/URGENT이면 재판단
          const hasNewGateEvents = updatedCompletedEvents.length > (completedEvents?.length ?? 0);
          const hasTransitionSignal = aiPhaseSignal && aiPhaseSignal !== 'STAY';
          
          // 🆕 v60+v74: 좌뇌 pacing_meta 도 재판단 트리거 (PUSH 도 포함)
          const lbPacing = capturedLeftBrainAnalysis?.pacing_meta;
          const hasPacingTransition = lbPacing && (
            lbPacing.phase_transition_recommendation === 'JUMP' ||
            lbPacing.phase_transition_recommendation === 'WRAP' ||
            lbPacing.phase_transition_recommendation === 'PUSH'
          );

          if (hasNewGateEvents || hasTransitionSignal || hasPacingTransition) {
            const reCheckCtx: PhaseContext = {
              ...phaseCtx,
              currentPhase: newPhaseV2,
              completedEvents: updatedCompletedEvents,
              lastEventTurn: updatedLastEventTurn,
              phaseStartTurn: updatedPhaseStartTurn,
              phaseSignal: aiPhaseSignal,
              // 🆕 v60: 좌뇌 pacing_meta 직접 전달
              pacingMeta: lbPacing ? {
                pacing_state: lbPacing.pacing_state,
                phase_transition_recommendation: lbPacing.phase_transition_recommendation,
                direct_question_suggested: lbPacing.direct_question_suggested,
                luna_meta_thought: lbPacing.luna_meta_thought,
              } : null,
              // 🆕 v73: 카드 만족 긍정 전환 용 (WM 에서 주입)
              filledCards: (capturedWorkingMemory?.filled_cards as any) ?? {},
              consecutiveReadyTurns: (capturedWorkingMemory?.consecutive_ready_turns as number | undefined) ?? 0,
              consecutiveFrustratedTurns: (capturedWorkingMemory?.consecutive_frustrated_turns as number | undefined) ?? 0,
            };
            const reCheckedPhase = PhaseManager.getCurrentPhase(reCheckCtx);
            if (reCheckedPhase !== newPhaseV2) {
              const reason = hasNewGateEvents ? `게이트이벤트(${updatedCompletedEvents.slice(-1)})` : `AI시그널(${aiPhaseSignal})`;
              console.log(`[Pipeline] 🔄 Phase 재판단! ${reason} → ${newPhaseV2} → ${reCheckedPhase} (턴 ${turnCount})`);
              newPhaseV2 = reCheckedPhase;
              updatedPhaseStartTurn = turnCount;
              const reProgress = Math.min(PhaseManager.getProgress(reCheckedPhase) + Math.min(turnCount * 3, 15), 100);
              const reThinking = computeLunaThinking(reCheckedPhase, 0, stateResult, updatedCompletedEvents);
              yield { type: 'phase_change', data: { phase: reCheckedPhase, progress: reProgress, lunaThinking: reThinking.lunaThinking, understandingLevel: reThinking.understandingLevel } };
            }
          }
        } catch (e) {
          console.warn('[Pipeline] Phase 재판단 오류 (무시):', e);
        }
      }

      // 🆕 v15: 이벤트 전송 (AI 응답 완료 후)
      // 🆕 v82: Phase 전환 주요 이벤트는 **5초** 텀 — 유저가 마지막 말풍선 충분히 읽은 뒤 등장
      //   이전(v80): 2초 — 빠른 느낌. 유저 피드백으로 5초로 확장.
      const MAJOR_EVENT_TYPES = new Set(['EMOTION_MIRROR', 'LUNA_STRATEGY', 'LUNA_STORY', 'ACTION_PLAN', 'WARM_WRAP']);
      const MAJOR_EVENT_DELAY_MS = 5000;
      for (const event of eventsToFire) {
        if (MAJOR_EVENT_TYPES.has(event.type as string) && fullText.length > 0) {
          await new Promise((r) => setTimeout(r, MAJOR_EVENT_DELAY_MS));
        }
        yield { type: 'phase_event', data: event };
        console.log(`[Pipeline] 🎮 이벤트 발생: ${event.type} (${newPhaseV2})`);
      }

      // 🆕 선택지 파싱 — 게이트 통과 시에만 처리
      if (gateResult.show) {
        const suggestionsMatch = fullText.match(
          /\[SUGGESTIONS:\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"\]/
        );
        if (suggestionsMatch) {
          const removeText = suggestionsMatch[0];
          yield { type: 'text', data: `\n__REMOVE__${removeText}` };

          // 전략에서 기본 카테고리 결정
          const baseCategory = STRATEGY_TO_CATEGORY[strategyResult.strategyType] || 'DIRECTION_CHOICE';

          // 턴별 카테고리 오버라이드
          let itemCategory: SuggestionCategory = baseCategory;
          if (turnCount <= 3) itemCategory = 'EMOTION_EXPRESSION';
          else if (turnCount > 8) itemCategory = 'ACTION_COMMITMENT';

          const items: SuggestionItem[] = [
            suggestionsMatch[1],
            suggestionsMatch[2],
            suggestionsMatch[3],
          ].map((text, idx) => ({
            text,
            category: idx === 2 ? 'DIRECTION_CHOICE' : itemCategory,
            strategyHint: idx === 2 ? undefined : strategyResult.strategyType,
          }));

          yield { type: 'suggestions', data: items };
        }
      } else {
        // 게이트 미통과: LLM이 혹시 선택지를 넣었더라도 제거만 하고 emit하지 않음
        const suggestionsMatch = fullText.match(
          /\[SUGGESTIONS:\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"\]/
        );
        if (suggestionsMatch) {
          yield { type: 'text', data: `\n__REMOVE__${suggestionsMatch[0]}` };
        }
      }

      // 🆕 v22: 응답에서 [STICKER:xxx] 감지 → lastStickerTurn 업데이트
      const stickerInResponse = fullText.match(/\[STICKER:(\w+)\]/);
      if (stickerInResponse) {
        updatedAccumulator = { ...updatedAccumulator, lastStickerTurn: turnCount, lastStickerId: stickerInResponse[1] };
        console.log(`[Pipeline] 🎨 스티커 감지: ${stickerInResponse[1]} (턴 ${turnCount})`);
      }
    }

    // Step 6: Nudge 결정
    const nudges = this.behaviorEngine.selectNudges(strategyResult);
    yield { type: 'nudge', data: nudges };

    // 🆕 v34: AI 동적 컨텍스트 로그 (디버깅/품질 분석용)
    const _contextLog = {
      systemPrompt,
      recentMessages,
      pipelineMeta: {
        persona,
        phase: newPhaseV2,
        prevPhase: prevPhaseV2,
        phaseChanged,
        turnCount,
        turnInPhase,
        emotionScore: stateResult.emotionScore,
        effectiveEmotionScore,
        confirmedEmotionScore,
        emotionHistory: updatedEmotionHistory,
        strategy: strategyResult.strategyType,
        strategyReason: strategyResult.reason,
        responseMode: therapeuticResponse.mode,
        scenario: currentScenario,
        lockedScenario,
        riskLevel: stateResult.riskLevel,
        intent: intentResult.primaryIntent,
        emotionalIntensity: intentResult.emotionalIntensity,
        attachmentType: stateResult.attachmentType,
        cognitiveDistortions: stateResult.cognitiveDistortions,
        horsemenDetected: stateResult.horsemenDetected,
        isFlooding: stateResult.isFlooding,
        eventsToFire: eventsToFire.map(e => e.type),
        completedEvents: updatedCompletedEvents,
        gateResult,
        modelRoute: { cascade: modelRoute.cascade, maxTokens: modelRoute.maxTokens },
        hlreActive,
        ragTextLength: ragText.length,
        solutionMatchCount: solutionMatches.length,
        readinessScore,
        axesState: {
          filledCount: axesState.filledCount,
          needsDiagnostic: axesState.needsDiagnostic,
          nextAxis: axesState.nextAxis,
        },
        emotionAccumulator: {
          signalCount: updatedAccumulator.signals?.length ?? 0,
          deepEmotion: updatedAccumulator.deepEmotionHypothesis?.primaryEmotion ?? null,
          surfaceEmotion: updatedAccumulator.surfaceEmotion?.label ?? null,
        },
        phaseStartTurn: updatedPhaseStartTurn,
      },
      cascadeLog: getCascadeLog(),
      engineLogs: logCollector.getLogs(),
    };

    yield { type: 'done', data: { stateResult, strategyResult, suggestionShown: gateResult.show, responseMode: therapeuticResponse.mode, updatedAxes: currentScenario === RelationshipScenario.READ_AND_IGNORED ? updatedAxes : undefined, phaseV2: newPhaseV2, completedEvents: updatedCompletedEvents, lastEventTurn: updatedLastEventTurn, confirmedEmotionScore, emotionHistory: updatedEmotionHistory, promptStyle: currentPromptStyle, emotionAccumulatorState: updatedAccumulator, phaseStartTurn: updatedPhaseStartTurn, lunaEmotionState: hlreActive ? hlre.serializeEmotionState() : undefined, sessionStoryState: hlreActive ? hlre.serializeSessionStory() : undefined, strategyMode: activeStrategyMode, intimacyState: hlreActive ? hlre.getIntimacyState(intimacyPersonaKey) : null, intimacyPersonaKey: hlreActive ? intimacyPersonaKey : undefined, intimacyAll: hlreActive ? hlre.getIntimacyAll() : null, intimacyLevelUp, _contextLog } };
  }
}
