import { StateAnalysisEngine } from '@/engines/state-analysis';
import { StrategySelectionEngine } from '@/engines/strategy-selection';
import { PromptGenerator } from '@/engines/prompt-generator';
import { BehavioralInductionEngine } from '@/engines/behavioral-induction';
import { shouldShowSuggestions } from '@/engines/suggestion-gate';
import { mapTherapeuticResponse, determineRelationshipPhase, shouldAskPermission } from '@/engines/response-type';
import { RiskLevel, ResponseMode, ClientIntent, RelationshipScenario, STRATEGY_TO_CATEGORY, CATEGORY_INTENT_MAP } from '@/types/engine.types';
import type { PipelineResult, NudgeAction, StateResult, StrategyResult, SuggestionMeta, SuggestionItem, SuggestionCategory, ConversationPhaseV2, PhaseEvent, PhaseEventType } from '@/types/engine.types';
import { matchSolutions, calculateReadiness, getSolutionDictionaryPrompt, parseAxesFromMessage, analyzeAxesState, generateDiagnosticPrompt, mergeLLMAxes, markAxisAsked, generateAxisChoices } from '@/engines/solution-dictionary';
import type { ReadIgnoredAxes, AxisChoice } from '@/engines/solution-dictionary';
import type { PersonaMode, PanelResponse } from '@/types/persona.types';
import { generateWithCascade, streamWithCascade } from '@/lib/ai/provider-registry';
import { routeModel } from '@/lib/ai/model-router';
import { validateResponse } from '@/lib/ai/response-validator';
import { retrieveMemories, formatMemoriesAsContext } from '@/lib/rag/retriever';
import { PhaseManager, type PhaseContext } from '@/engines/phase-manager';
import { createEmotionThermometer, createInsightCard, createScalingQuestion, createSolutionPreview, createSolutionCard, createMessageDraft, createGrowthReport } from '@/engines/phase-manager/events';
import { getPhasePrompt, getTransitionPrompt } from '@/engines/phase-manager/phase-prompts';

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
    | { type: 'done'; data: { stateResult: StateResult; strategyResult: StrategyResult; suggestionShown: boolean; responseMode?: ResponseMode; updatedAxes?: Partial<ReadIgnoredAxes>; phaseV2?: ConversationPhaseV2; completedEvents?: PhaseEventType[]; lastEventTurn?: number; confirmedEmotionScore?: number } }
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

    // 🆕 Step 4.5: 선택지 게이트 판단
    const gateResult = shouldShowSuggestions({
      turnCount,
      strategyType: strategyResult.strategyType,
      emotionScore: stateResult.emotionScore,
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
          diagnosticPromptText = generateDiagnosticPrompt(axesState.nextAxis, persona === 'panel' ? 'counselor' : persona);
          // 질문한 축 기록 (askedAxes)
          updatedAxes = markAxisAsked(updatedAxes, axesState.nextAxis);
          console.log(`[Pipeline] 📋 진단축 질문 주입: ${axesState.nextAxis} (턴 ${turnCount}, 채워진축: ${axesState.filledCount}/5)`);
        }
      } else if (!shouldAskDiagnostic) {
        console.log(`[Pipeline] 🤫 HOOK 구간 — 진단축 질문 보류 (턴 ${turnCount}, 채워진축: ${axesState.filledCount}/5)`);
      }
    }

    // 🆕 v6+v7: 해결책 사전 매칭 (축 포함)
    // 🆕 v10.1: 확정된 감정 점수가 있으맄 솔루션 매칭에 그걸 사용
    const emotionScoreForMatching = confirmedEmotionScore ?? stateResult.emotionScore;
    console.log(`[Pipeline] 🌡️ 감정점수: ${confirmedEmotionScore !== undefined ? `확정=${confirmedEmotionScore}` : `AI판단=${stateResult.emotionScore}`}`);

    const solutionMatches = matchSolutions(
      currentScenario,
      userMessage,
      stateResult.attachmentType ?? null,
      emotionScoreForMatching,
      currentScenario === RelationshipScenario.READ_AND_IGNORED ? updatedAxes : undefined,
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
      lastEventTurn,  // 🆕 v10: 쿨다운용
      axisFilledCount: axesState.filledCount,
      diagnosisComplete: !axesState.needsDiagnostic,
      primaryIntent: intentResult.primaryIntent,
      hasAskedForAdvice,
      hasGivenPermission: false,
      emotionBaseline: emotionBaseline,
      currentEmotionScore: stateResult.emotionScore,
      readinessScore,
      solutionMatchCount: solutionMatches.length,
    };
    const newPhaseV2 = PhaseManager.getCurrentPhase(phaseCtx);
    const phaseChanged = newPhaseV2 !== prevPhaseV2;

    if (phaseChanged) {
      console.log(`[Pipeline] 🔄 Phase전환: ${prevPhaseV2} → ${newPhaseV2} (턴 ${turnCount})`);
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
    const makeCtxForEvent = (): PhaseContext => ({ ...phaseCtx, completedEvents: updatedCompletedEvents, lastEventTurn: updatedLastEventTurn });

    // 감정 온도계 (HOOK 구간) — 턴 1+턴 2 평균으로 AI 판단
    if (PhaseManager.shouldTriggerEvent(newPhaseV2, 'EMOTION_THERMOMETER', makeCtxForEvent())) {
      // 턴 1(emotionBaseline) + 턴 2(current) 평균
      const avgScore = emotionBaseline !== undefined
        ? (emotionBaseline + stateResult.emotionScore) / 2
        : stateResult.emotionScore;
      eventsToFire.push(createEmotionThermometer(avgScore));
      console.log(`[Pipeline] 🌡️ 온도계: 턴 1(${emotionBaseline}) + 턴 2(${stateResult.emotionScore}) 평균 = ${avgScore}`);
      updatedCompletedEvents.push('EMOTION_THERMOMETER');
      updatedLastEventTurn = turnCount;
    }

    // 인사이트 카드 (MIRROR 구간)
    if (PhaseManager.shouldTriggerEvent(newPhaseV2, 'INSIGHT_CARD', makeCtxForEvent())) {
      eventsToFire.push(createInsightCard(stateResult, userMessage, currentScenario));
      updatedCompletedEvents.push('INSIGHT_CARD');
      updatedLastEventTurn = turnCount;
    }

    // 스케일링 질문 (BRIDGE 구간)
    if (PhaseManager.shouldTriggerEvent(newPhaseV2, 'SCALING_QUESTION', makeCtxForEvent())) {
      eventsToFire.push(createScalingQuestion(currentScenario));
      updatedCompletedEvents.push('SCALING_QUESTION');
      updatedLastEventTurn = turnCount;
    }

    // 솔루션 프리뷰 (BRIDGE 구간)
    if (PhaseManager.shouldTriggerEvent(newPhaseV2, 'SOLUTION_PREVIEW', makeCtxForEvent())) {
      eventsToFire.push(createSolutionPreview(solutionMatches.length, !axesState.needsDiagnostic, axesState.filledCount));
      updatedCompletedEvents.push('SOLUTION_PREVIEW');
      updatedLastEventTurn = turnCount;
    }

    // 솔루션 카드 (SOLVE 구간)
    if (PhaseManager.shouldTriggerEvent(newPhaseV2, 'SOLUTION_CARD', makeCtxForEvent()) && solutionMatches.length > 0) {
      eventsToFire.push(createSolutionCard(solutionMatches[0]));
      updatedCompletedEvents.push('SOLUTION_CARD');
      updatedLastEventTurn = turnCount;
    }

    // 메시지 초안 (SOLVE 구간, 솔루션카드 후)
    if (PhaseManager.shouldTriggerEvent(newPhaseV2, 'MESSAGE_DRAFT', makeCtxForEvent()) && solutionMatches.length > 0) {
      eventsToFire.push(createMessageDraft(solutionMatches[0]));
      updatedCompletedEvents.push('MESSAGE_DRAFT');
      updatedLastEventTurn = turnCount;
    }

    // 성장 리포트 (EMPOWER 구간)
    if (PhaseManager.shouldTriggerEvent(newPhaseV2, 'GROWTH_REPORT', makeCtxForEvent()) && emotionBaseline !== undefined) {
      eventsToFire.push(createGrowthReport(
        emotionBaseline,
        stateResult.emotionScore,
        ['소통 패턴 발견', '감정 표현 연습'],
        ['I-message로 메시지 보내기'],
      ));
      updatedCompletedEvents.push('GROWTH_REPORT');
      updatedLastEventTurn = turnCount;
    }

    // 이벤트 전송
    for (const event of eventsToFire) {
      yield { type: 'phase_event', data: event };
      console.log(`[Pipeline] 🎮 이벤트 발생: ${event.type} (${newPhaseV2})`);
    }

    console.log(`[Pipeline] 📍 Phase: ${newPhaseV2} (v1: ${conversationPhase}) | 이벤트: ${eventsToFire.length}개`);

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
      stateResult.emotionScore,
      lastResponseMode as ResponseMode | undefined,
      stateResult.horsemenDetected ?? [],
    );
    console.log(`[Pipeline] 🧠 의도:${intentResult.primaryIntent} 단계:${conversationPhase} → 응답:${therapeuticResponse.mode}${askPermission ? ' [허락질문]' : ''} (${therapeuticResponse.reason})`);

    // 🆕 v6: 해결책 사전 프롬프트 생성
    // 🆕 v10: 턴별 세분화 프롬프트
    const turnInPhase = PhaseManager.getTurnInPhase(newPhaseV2, turnCount);
    const phasePrompt = getPhasePrompt(newPhaseV2, turnInPhase);
    const transitionPrompt = phaseChanged ? `\n${getTransitionPrompt(prevPhaseV2, newPhaseV2)}` : '';
    const solutionPrompt = getSolutionDictionaryPrompt(solutionMatches, conversationPhase, persona)
      + diagnosticPromptText
      + '\n' + phasePrompt
      + transitionPrompt;
    console.log(`[Pipeline] 📋 Phase프롬프트: ${newPhaseV2} 턴${turnInPhase} (전체턴 ${turnCount})`);

    if (diagnosticPromptText) {
      console.log(`[Pipeline] 🔍 진단 질문 프롬프트 주입됨 (${diagnosticPromptText.length}자)`);
    } else {
      console.log(`[Pipeline] ℹ️ 진단 질문 없음 (needsDiagnostic: ${axesState.needsDiagnostic}, nextAxis: ${axesState.nextAxis})`);
    }

    // 프롬프트 생성 (v6: solutionPrompt 추가)
    const systemPrompt = this.promptGen.generate(
      stateResult,
      strategyResult,
      ragText + suggestionContext,
      persona,
      turnCount,
      gateResult.show,
      therapeuticResponse.mode,
      emotionalMemorySummary || undefined,
      conversationPhase,
      askPermission,
      solutionPrompt,  // 🆕 v6
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
    } else {
      // 상담사/친구 모드: 스트리밍 — 3사 캐스케이드
      let fullText = '';
      const stream = streamWithCascade(
        modelRoute.cascade,
        systemPrompt,
        recentMessages,
        modelRoute.maxTokens
      );

      for await (const chunk of stream) {
        fullText += chunk;
        yield { type: 'text', data: chunk };
      }

      // 🆕 응답 검증 (Groq 8B, ~50ms)
      try {
        const validation = await validateResponse(
          fullText,
          stateResult.emotionScore,
          strategyResult.strategyType
        );
        if (!validation.passed) {
          console.warn(`[Pipeline] 응답 검증 FAIL:`, validation.violations);
        }
      } catch {
        // 검증 실패해도 응답은 전달 (안전 우선)
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
    }

    // Step 6: Nudge 결정
    const nudges = this.behaviorEngine.selectNudges(strategyResult);
    yield { type: 'nudge', data: nudges };

    yield { type: 'done', data: { stateResult, strategyResult, suggestionShown: gateResult.show, responseMode: therapeuticResponse.mode, updatedAxes: currentScenario === RelationshipScenario.READ_AND_IGNORED ? updatedAxes : undefined, phaseV2: newPhaseV2, completedEvents: updatedCompletedEvents, lastEventTurn: updatedLastEventTurn, confirmedEmotionScore } };
  }
}
