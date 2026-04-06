import { StateAnalysisEngine } from '@/engines/state-analysis';
import { StrategySelectionEngine } from '@/engines/strategy-selection';
import { PromptGenerator } from '@/engines/prompt-generator';
import { BehavioralInductionEngine } from '@/engines/behavioral-induction';
import { shouldShowSuggestions } from '@/engines/suggestion-gate';
import { mapTherapeuticResponse, determineRelationshipPhase, shouldAskPermission } from '@/engines/response-type';
import { RiskLevel, ResponseMode, ClientIntent, RelationshipScenario, STRATEGY_TO_CATEGORY, CATEGORY_INTENT_MAP } from '@/types/engine.types';
import type { PipelineResult, NudgeAction, StateResult, StrategyResult, SuggestionMeta, SuggestionItem, SuggestionCategory, ConversationPhaseV2, PhaseEvent, PhaseEventType, EmotionAccumulatorState, EmotionMirrorData } from '@/types/engine.types';
import { accumulateSignal, setSurfaceFromThermometer, isReadyForMirror } from '@/engines/emotion-accumulator';
import { generateDynamicMirror } from '@/engines/emotion-accumulator/mirror-generator';
import { generateDynamicPatterns } from '@/engines/emotion-accumulator/pattern-generator';
import { matchSolutions, calculateReadiness, getSolutionDictionaryPrompt, parseAxesFromMessage, analyzeAxesState, generateDiagnosticPrompt, mergeLLMAxes, markAxisAsked, generateAxisChoices } from '@/engines/solution-dictionary';
import type { ReadIgnoredAxes, AxisChoice } from '@/engines/solution-dictionary';
import type { PersonaMode, PanelResponse } from '@/types/persona.types';
import { generateWithCascade, streamWithCascade } from '@/lib/ai/provider-registry';
import { routeModel } from '@/lib/ai/model-router';
import { validateResponse } from '@/lib/ai/response-validator';
import { retrieveMemories, formatMemoriesAsContext } from '@/lib/rag/retriever';
import { PhaseManager, type PhaseContext } from '@/engines/phase-manager';
import { createEmotionThermometer, createEmotionMirror, createPatternMirror, createSolutionPreview, createSolutionCard, createMessageDraft, createGrowthReport, createSessionSummary, createHomeworkCard, createTarotAxisCollect, createTarotDraw, createTarotInsight, createTarotSessionSummary, createTarotHomework } from '@/engines/phase-manager/events';
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
export class CounselingPipeline {
  private stateEngine = StateAnalysisEngine.getInstance();
  private strategyEngine = StrategySelectionEngine.getInstance();
  private promptGen = PromptGenerator.getInstance();
  private behaviorEngine = BehavioralInductionEngine.getInstance();

  async *execute(
    userMessage: string,
    chatHistory: { role: 'user' | 'ai'; content: string }[],
    context: string = '',
    ragContext?: { supabase: any; userId: string },
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
    | { type: 'phase_change'; data: { phase: ConversationPhaseV2; progress: number } }
    | { type: 'done'; data: { stateResult: StateResult; strategyResult: StrategyResult; suggestionShown: boolean; responseMode?: ResponseMode; updatedAxes?: Partial<ReadIgnoredAxes>; phaseV2?: ConversationPhaseV2; completedEvents?: PhaseEventType[]; lastEventTurn?: number; confirmedEmotionScore?: number; emotionHistory?: number[]; promptStyle?: string; emotionAccumulatorState?: EmotionAccumulatorState; phaseStartTurn?: number } }
  > {
    // Step 1: 상태 분석
    const stateResult = await this.stateEngine.analyze(userMessage, chatHistory, context);

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

    // Step 4: RAG 검색 (병렬)
    const ragPromise = ragContext
      ? retrieveMemories(ragContext.supabase, ragContext.userId, userMessage)
          .then(formatMemoriesAsContext)
          .catch(() => '')
      : Promise.resolve('');

    const ragText = await ragPromise;

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

    if (currentScenario === RelationshipScenario.READ_AND_IGNORED) {
      // ① 1차: 키워드 파서 (빠르고 결정적)
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

    const solutionMatches = matchSolutions(
      currentScenario,
      userMessage,
      stateResult.attachmentType ?? null,
      effectiveEmotionScore,
      currentScenario === RelationshipScenario.READ_AND_IGNORED ? updatedAxes : undefined,
      diagnosisResultData,
    );

    // 🆕 v6: ReadinessScore 계산
    const hasStorytelling = intentResult.primaryIntent === ClientIntent.STORYTELLING;
    const hasVenting = intentResult.primaryIntent === ClientIntent.VENTING;

    const readinessScore = calculateReadiness({
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
    };
    const newPhaseV2 = PhaseManager.getCurrentPhase(phaseCtx);
    const phaseChanged = newPhaseV2 !== prevPhaseV2;

    // 🆕 v20: Phase 전환 시 phaseStartTurn 갱신
    let updatedPhaseStartTurn = phaseStartTurn;
    if (phaseChanged) {
      updatedPhaseStartTurn = turnCount;
      console.log(`[Pipeline] 🔄 Phase전환: ${prevPhaseV2} → ${newPhaseV2} (턴 ${turnCount}, phaseStart=${updatedPhaseStartTurn})`);
    }
    // 🆕 v9.1: 매 턴 phase+progress 전송 (변경 여부 무관)
    const phaseBaseProgress = PhaseManager.getProgress(newPhaseV2);
    // Phase 내 세밀한 진행률: 턴 수 기반으로 약간의 보정
    const intraPhaseBonus = Math.min(turnCount * 3, 15); // 최대 15% 보너스
    const adjustedProgress = Math.min(phaseBaseProgress + intraPhaseBonus, 100);
    yield { type: 'phase_change', data: { phase: newPhaseV2, progress: adjustedProgress } };

    // v2→v1 매핑 (레거시 호환)
    let conversationPhase = PhaseManager.toLegacyPhase(newPhaseV2);

    // 🆕 v8: 구간별 이벤트 트리거 + v10 쿨다운
    const eventsToFire: PhaseEvent[] = [];
    const updatedCompletedEvents = [...(completedEvents ?? [])];
    let updatedLastEventTurn = lastEventTurn;  // 🆕 v10: 이벤트 발생 시 업데이트

    // 🆕 v10: 각 이벤트 트리거 시 phaseCtx에 최신 lastEventTurn 반영
    const makeCtxForEvent = (): PhaseContext => ({ ...phaseCtx, completedEvents: updatedCompletedEvents, lastEventTurn: updatedLastEventTurn, phaseStartTurn: updatedPhaseStartTurn });

    // 🆕 v20: 한 턴에 최대 1개 이벤트만 허용 (동시 표시 방지)
    const canFireEvent = () => eventsToFire.length === 0;

    // 감정 온도계 (HOOK 구간) — 턴 1+턴 2 평균으로 AI 판단
    if (canFireEvent() && PhaseManager.shouldTriggerEvent(newPhaseV2, 'EMOTION_THERMOMETER', makeCtxForEvent())) {
      // 턴 1(emotionBaseline) + 턴 2(current) 평균
      const avgScore = emotionBaseline !== undefined
        ? (emotionBaseline + stateResult.emotionScore) / 2
        : stateResult.emotionScore;
      // 🆕 v10.2: AI의 실제 감정 분석 근거를 온도계에 전달
      eventsToFire.push(createEmotionThermometer(avgScore, stateResult.emotionReason));
      console.log(`[Pipeline] 🌡️ 온도계: 턴 1(${emotionBaseline}) + 턴 2(${stateResult.emotionScore}) 평균 = ${avgScore} | 근거: ${stateResult.emotionReason ?? '(기본값)'}`);
      updatedCompletedEvents.push('EMOTION_THERMOMETER');
      updatedLastEventTurn = turnCount;
    }

    // 🆕 v19: 루나의 마음 거울 (MIRROR 구간) — 동적 감정 분석 기반
    if (canFireEvent() && PhaseManager.shouldTriggerEvent(newPhaseV2, 'EMOTION_MIRROR', makeCtxForEvent())) {
      let mirrorData: EmotionMirrorData | null = null;
      if (isReadyForMirror(updatedAccumulator)) {
        try {
          mirrorData = await generateDynamicMirror(updatedAccumulator, currentScenario, chatHistory);
          console.log(`[Pipeline] 🪞 동적 거울 생성 성공: 겉="${mirrorData?.surfaceEmotion}" / 속="${mirrorData?.deepEmotion}"`);
        } catch (e) {
          console.warn('[Pipeline] 🪞 동적 거울 생성 실패, 폴백 사용:', e);
        }
      }
      eventsToFire.push(createEmotionMirror(stateResult, currentScenario, mirrorData));
      updatedCompletedEvents.push('EMOTION_MIRROR');
      updatedLastEventTurn = turnCount;
    }

    // 🆕 v14: 반복 패턴 거울 (BRIDGE 구간) — SCALING_QUESTION 대체
    if (canFireEvent() && PhaseManager.shouldTriggerEvent(newPhaseV2, 'PATTERN_MIRROR', makeCtxForEvent())) {
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
    if (canFireEvent() && PhaseManager.shouldTriggerEvent(newPhaseV2, 'SOLUTION_PREVIEW', makeCtxForEvent())) {
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
    const solutionPrompt = getSolutionDictionaryPrompt(solutionMatches, conversationPhase, (persona === 'luna' || persona === 'tarot') ? 'friend' : persona as 'counselor' | 'friend' | 'panel', diagnosisResultData)
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

    const systemPrompt = this.promptGen.generate(
      stateForPrompt,
      strategyResult,
      ragText + suggestionContext + eventHintPrompt + tarotCardContext,
      persona,
      turnCount,
      gateResult.show,
      therapeuticResponse.mode,
      emotionalMemorySummary || undefined,
      conversationPhase,
      askPermission,
      solutionPrompt,  // 🆕 v6
      userMessage.length,  // 🆕 v16: 응답 길이 적응
      lastStickerTurn,  // 🆕 v22: 스티커 빈도 제어
    );

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
    const recentMessages = messages.slice(-20);

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
      const stream = streamWithCascade(
        modelRoute.cascade,
        systemPrompt,
        recentMessages,
        modelRoute.maxTokens
      );

      // <think>...</think> 태그 스트리밍 필터 (qwen3-32b thinking mode)
      let insideThink = false;
      let stripLeadingWhitespace = false; // </think> 직후 다음 청크 공백 제거용

      for await (const chunk of stream) {
        let text = chunk;

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

      // 🆕 응답 검증 (Groq 8B, ~50ms)
      try {
        const validation = await validateResponse(
          fullText,
          effectiveEmotionScore,
          strategyResult.strategyType
        );
        if (!validation.passed) {
          console.warn(`[Pipeline] 응답 검증 FAIL:`, validation.violations);
        }
      } catch {
        // 검증 실패해도 응답은 전달 (안전 우선)
      }

      // 🆕 v15: 이벤트 전송 (AI 응답 완료 후)
      for (const event of eventsToFire) {
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

    yield { type: 'done', data: { stateResult, strategyResult, suggestionShown: gateResult.show, responseMode: therapeuticResponse.mode, updatedAxes: currentScenario === RelationshipScenario.READ_AND_IGNORED ? updatedAxes : undefined, phaseV2: newPhaseV2, completedEvents: updatedCompletedEvents, lastEventTurn: updatedLastEventTurn, confirmedEmotionScore, emotionHistory: updatedEmotionHistory, promptStyle: currentPromptStyle, emotionAccumulatorState: updatedAccumulator, phaseStartTurn: updatedPhaseStartTurn } };
  }
}
