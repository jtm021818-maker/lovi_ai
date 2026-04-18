/**
 * 🆕 v4 ACE: Autonomous Cognition Engine
 *
 * "자율 사고 엔진" — 루나가 규칙을 따르는 AI가 아니라,
 * 스스로 생각하고 판단하는 사람처럼 행동하게 만든다.
 *
 * 핵심 철학: "규칙을 줄이면 줄일수록 사람에 가까워진다."
 *
 * 3-Layer Architecture:
 *   Layer 1: Identity   — 루나라는 사람 (불변)
 *   Layer 2: Context    — 지금 무슨 상황인가 (코드가 수집)
 *   Layer 3: Cognition  — 루나가 스스로 생각한다 (AI 자율)
 *
 * 이전 v28-v31의 200개 하드코딩 규칙 → 3개 레이어로 단순화.
 * 코드는 맥락 제공자, AI는 판단자.
 */

// === ACE 3-Layer ===
import { buildIdentityPrompt, buildSafetyPrompt } from './identity';
import { buildContextPrompt, type SessionContext } from './context-builder';
import { buildCognitionPrompt, buildEmotionUncertaintyHint, buildUnspokenHint, buildPhasePurposePrompt } from './cognition-prompt';

// === 유지 모듈: 감정 ===
import {
  type LunaEmotionState,
  createLunaEmotionState, deserializeEmotionState, serializeEmotionState,
  decayTick, processEvent, detectConversationEvent,
} from './luna-emotion-core';
import { applyContagion, scoreToIntensity } from './emotion-contagion';

// === 유지 모듈: 기억 ===
import { WorkingMemory, extractFacts, buildMemoryPrompt, type MemoryProfile } from './memory-context';
import { MemoryTriggerEngine, loadWorkingMemory, formatWorkingMemoryPrompt, type MemoryTriggerResult } from './memory-engine';

// === 유지 모듈: 대화 흐름 ===
import { type SessionStoryState, createSessionStory, extractStoryBeat, updateSessionStory, buildStoryPrompt, serializeStory, deserializeStory } from './session-story';
import { type TurnArcState, createTurnArcState, updateTurnArc, summarizeLunaResponse, buildArcPrompt } from './turn-arc';
import { parsePhaseSignal, getPhaseSignalPrompt, type PhaseSignal, type ReadinessSignals } from './phase-signal';
import { detectReadinessSignals, shouldTransitionPhase, detectPurposeAchievement } from './phase-signal';

// === 유지 모듈: 유저 이해 ===
import { type UserModel, createDefaultUserModel, loadUserModel, buildUserModelPrompt } from './user-model';
import { buildRelationshipPrompt } from './relationship-graph';

// === 유지 모듈: 성장 (맥락 제공만) ===
import { detectPatterns, buildSharedLanguagePrompt, getIntimacyBehavior, getLunaVulnerabilityHint } from './luna-growth';

// === 유지 모듈: 여정 (맥락 제공만) ===
import { type JourneyState, createJourneyState, updateJourney } from './journey-tracker';

// === 유지 모듈: 감정 감지 (turn-context에서 이것만 사용) ===
import { detectUserEmotion } from './turn-context';

// === 🆕 행동 분류기 (anti-monotony + 자기 인식) ===
import {
  type LunaActionType,
  classifyLunaAction,
  buildActionPatternHint,
  formatRecentActions,
  actionToTurnType,
} from './action-classifier';

// === 유지 모듈: 기타 ===
// proactive-emotion은 파이프라인에서 직접 사용 가능 (ACE에서는 맥락으로 자연스럽게 처리)

// ============================================
// 하위 호환 타입 (pipeline이 참조)
// ============================================

/** 파이프라인 하위 호환용 최소 TurnContext */
export interface TurnContext {
  turnNumber: number;
  turnType: string;
  phase: string;
  userEmotion: string;
  emotionIntensity: number;
}

/** 파이프라인 하위 호환용 ValidateResult */
interface ValidateResult {
  passed: boolean;
  response: string;
  blocked: string[];
  fixed: string[];
  warnings: string[];
  attempts: number;
  structureHash: string;
}

// ============================================
// ACE 메인 클래스
// ============================================

export class HumanLikeEngine {
  // 감정
  private lunaEmotion: LunaEmotionState;

  // 기억
  private workingMemory: WorkingMemory;
  private memoryEngine = new MemoryTriggerEngine();
  private lastMemoryResult: MemoryTriggerResult | null = null;

  // 대화 흐름
  private turnArc: TurnArcState;
  private sessionStory: SessionStoryState;
  private turnCount: number = 0;
  private lastTurnContext?: TurnContext;

  // 유저 이해
  private userModel: UserModel = createDefaultUserModel();
  private userMessages: string[] = [];

  // 여정 (맥락 제공용)
  private journeyState: JourneyState = createJourneyState();

  // 루나 최근 행동 (반복 방지 맥락)
  private lunaRecentSummaries: string[] = [];

  // 🆕 행동 유형 분류 (anti-monotony 자기 인식)
  private recentActionTypes: LunaActionType[] = [];

  constructor(_sessionSeed?: number, savedEmotionState?: string | null, savedSessionStory?: string | null) {
    this.lunaEmotion = savedEmotionState
      ? deserializeEmotionState(savedEmotionState)
      : createLunaEmotionState();
    this.workingMemory = new WorkingMemory();
    this.turnArc = createTurnArcState();
    this.sessionStory = savedSessionStory
      ? deserializeStory(savedSessionStory)
      : createSessionStory();
  }

  // ============================================
  // 전처리 (API 호출 전)
  // ============================================

  async preProcess(
    turnInPhase: number,
    userMessage: string,
    emotionScore: number,
    longTermMemory?: MemoryProfile | null,
    userName?: string,
    phase: 'HOOK' | 'MIRROR' | 'BRIDGE' | 'SOLVE' | 'EMPOWER' = 'HOOK',
    supabase?: any,
    userId?: string,
    completedEvents?: string[],
    previousSessionContext?: string,
    strategyMode?: import('@/types/engine.types').StrategyMode | null,
  ): Promise<{ prompt: string; turnContext: TurnContext; memoryTriggered: MemoryTriggerResult | null }> {
    this.turnCount++;

    // ① 감정 감쇠 + 이벤트 감지 + 감정 전염
    this.lunaEmotion = decayTick(this.lunaEmotion);
    const events = detectConversationEvent(userMessage);
    for (const event of events) {
      this.lunaEmotion = processEvent(this.lunaEmotion, event);
    }
    const userEmotion = detectUserEmotion(userMessage);
    const userIntensity = scoreToIntensity(emotionScore);
    this.lunaEmotion = applyContagion(this.lunaEmotion, userEmotion, userIntensity);

    // ② Working Memory 업데이트
    const newFacts = extractFacts(userMessage, this.turnCount);
    for (const fact of newFacts) {
      this.workingMemory.upsertFact(fact);
    }
    this.workingMemory.recordEmotion(
      this.lunaEmotion.currentEmotion,
      emotionScore,
      this.turnCount,
    );

    // ③ Turn Arc 업데이트
    const depthMax: Record<string, number> = { HOOK: 5, MIRROR: 4, BRIDGE: 4, SOLVE: 4, EMPOWER: 3 };
    // 🆕 이전 행동 유형을 정확히 전달 (기존: 'EMPATHY' 하드코딩 → AI가 "계속 공감했다"고 오인)
    const lastActionAsTurnType = this.recentActionTypes.length > 0
      ? actionToTurnType(this.recentActionTypes[this.recentActionTypes.length - 1])
      : 'EMPATHY';
    this.turnArc = updateTurnArc(
      this.turnArc,
      turnInPhase,
      lastActionAsTurnType, // 🆕 실제 행동 유형 전달
      phase,
      userMessage,
      null,
      depthMax[phase] ?? 5,
      turnInPhase >= (depthMax[phase] ?? 5),
    );

    // ④ 기억 검색
    this.lastMemoryResult = null;
    if (supabase && userId) {
      try {
        const emotionTag = userEmotion === 'neutral' ? null : userEmotion;
        this.lastMemoryResult = await this.memoryEngine.processTurn(
          supabase, userId, userMessage, emotionTag,
        );
        if (this.lastMemoryResult) {
          console.log(`[ACE] 💭 기억 트리거: ${this.lastMemoryResult.triggerType} — "${this.lastMemoryResult.memory.summary?.slice(0, 30)}"`);
        }
      } catch (e) {
        console.warn('[ACE] 기억 검색 실패 (무시):', e);
      }
    }

    // ⑤ Working Memory + 유저 모델 로드 (세션 시작 시 1회)
    let workingMemoryPrompt = '';
    if (supabase && userId && turnInPhase === 1) {
      try {
        const wm = await loadWorkingMemory(supabase, userId);
        workingMemoryPrompt = formatWorkingMemoryPrompt(wm, userName);
        this.userModel = await loadUserModel(supabase, userId);

        // 🆕 v41.1: intimacy 구조만 보장. 세션 시작 훅은 pipeline이 persona 알면서 호출.
        this.ensureIntimacyShape();
        console.log(`[ACE] 📂 userModel 로드 완료 | intimacy.luna.sessions=${this.userModel.intimacy?.luna?.totalSessions ?? '?'} intimacy.tarot.sessions=${this.userModel.intimacy?.tarot?.totalSessions ?? '?'}`);
      } catch (e) {
        console.error('[ACE] ❌ userModel 로드 실패 — 기본값 사용됨 (친밀도 데이터 손실 위험!):', (e as Error).message);
      }
    }

    // ⑥ 유저 메시지 누적
    this.userMessages.push(userMessage);

    // ⑦ 여정 업데이트 (맥락 제공용 — 판단 안 함)
    this.journeyState = updateJourney(
      this.journeyState,
      this.turnCount,
      userMessage,
      null, // ACE: 코드가 행동을 결정하지 않음
    );

    // ⑧ 세션 스토리 (서사 기록)
    // beat 기록은 postProcess에서

    // ⑨ 프롬프트 조립 — ACE 3-Layer + Phase Purpose + 모드별 SOLVE
    const prompt = this.buildACEPrompt(
      emotionScore,
      userMessage,
      phase,
      turnInPhase,
      completedEvents ?? [],
      longTermMemory,
      userName,
      workingMemoryPrompt,
      previousSessionContext,
      strategyMode ?? null,
    );

    // 하위 호환 TurnContext
    const turnContext: TurnContext = {
      turnNumber: turnInPhase,
      turnType: 'ACE_AUTONOMOUS', // AI 자율 판단
      phase,
      userEmotion,
      emotionIntensity: emotionScore,
    };
    this.lastTurnContext = turnContext;

    console.log(`[ACE] 🧠 자율사고 모드 | 턴 ${this.turnCount} | 여정: ${this.journeyState.phase} | 루나: ${this.lunaEmotion.currentEmotion}(${Math.round(this.lunaEmotion.currentIntensity * 100)}%)`);

    return { prompt, turnContext, memoryTriggered: this.lastMemoryResult };
  }

  // ============================================
  // 후처리 (API 호출 후)
  // ============================================

  async postProcess(
    response: string,
    userMessages?: string[],
    _regenerate?: () => Promise<string>,
  ): Promise<{
    finalResponse: string;
    validation: ValidateResult;
    selfCorrected: boolean;
    emotionState: LunaEmotionState;
    phaseSignal: PhaseSignal | null;
    readinessSignals: ReadinessSignals;
    shouldTransition: boolean;
    transitionReason: string;
    mindReadReady: boolean;
    storyData: import('./phase-signal').ParsedStoryData | null;
    strategyData: import('./phase-signal').ParsedStrategyData | null;
    // 🆕 v35: 모드별 SOLVE 데이터
    toneSelectData: import('./phase-signal').ParsedToneSelectData | null;
    draftCards: import('./phase-signal').ParsedDraftCard[] | null;
    rpIn: boolean;
    rpOut: boolean;
    roleplayFeedback: import('./phase-signal').ParsedRoleplayFeedback | null;
    panelReport: import('./phase-signal').ParsedPanelReport | null;
    ideaRefine: import('./phase-signal').ParsedIdeaRefine | null;
    // 🆕 v39: SOLVE/EMPOWER 재설계 태그
    actionPlan: import('./phase-signal').ParsedActionPlan | null;
    warmWrap: import('./phase-signal').ParsedWarmWrap | null;
    // 🆕 v40: 딥리서치 요청 (다음 턴 Grounding 트리거)
    thinkingDeepKeyword: string | null;
    // 🆕 v36: 루나 인사이트 태그
    situationRead: string | null;
    lunaThought: string | null;
    // 🆕 v4: 상황 파악 카드 데이터
    situationSummary: string | null;
    coreProblem: string | null;
    // 🆕 v81: 몰입 모드 완료 태그
    operationComplete: import('./phase-signal').ParsedOperationComplete | null;
  }> {
    // Phase 시그널 파싱 (모든 태그 한 번에 추출 + 제거)
    const parsed = parsePhaseSignal(response);
    const { cleanResponse, signal, mindReadReady, storyData, strategyData,
      toneSelectData, draftCards, rpIn, rpOut, roleplayFeedback, panelReport, ideaRefine,
      actionPlan, warmWrap, thinkingDeepKeyword,
      situationRead, lunaThought, situationSummary, coreProblem,
      operationComplete } = parsed;
    if (operationComplete) {
      console.log(`[ACE] 🎬 작전 완료: mode=${operationComplete.mode} | "${operationComplete.summary}"`);
    }
    if (signal) {
      console.log(`[ACE] 🏷️ Phase시그널: ${signal}`);
    }
    if (mindReadReady) {
      console.log(`[ACE] 🧠 마음읽기 준비: AI가 [MIND_READ_READY] 태그 출력!`);
    }
    if (storyData) {
      console.log(`[ACE] 📖 루나 이야기 준비: "${storyData.opener.slice(0, 30)}..." → cliffhanger: "${storyData.cliffhanger.slice(0, 30)}..."`);
    }
    if (strategyData) {
      console.log(`[ACE] 🔥 작전회의 준비: "${strategyData.opener.slice(0, 30)}..." | 상황: "${strategyData.situationSummary.slice(0, 40)}..."`);
    }
    if (situationRead) {
      console.log(`[ACE] 🔍 상황 인식: "${situationRead}"`);
    }
    if (lunaThought) {
      console.log(`[ACE] 💭 속마음: "${lunaThought}"`);
    }

    // 코드 레벨 준비도 판단
    const readiness = detectReadinessSignals(userMessages ?? []);

    // 🆕 ACE: 목적 달성 기반 준비도 보강
    const currentPhase = this.lastTurnContext?.phase ?? 'HOOK';
    const purposeResult = detectPurposeAchievement(currentPhase, userMessages ?? []);
    if (purposeResult.achieved) {
      // 목적 달성 시 ready 점수 부스트
      readiness.ready = Math.min(1, readiness.ready + purposeResult.confidence * 0.4);
      readiness.reasons.push(`purpose:${purposeResult.signal}`);
      console.log(`[ACE] 🎯 목적달성 감지: ${currentPhase} → ${purposeResult.signal} (신뢰도 ${purposeResult.confidence})`);
    }

    // 전환 판단
    const turnInPhase = this.lastTurnContext?.turnNumber ?? 1;
    const transition = shouldTransitionPhase(signal, readiness, turnInPhase, 2, 8);
    if (transition.transition) {
      console.log(`[ACE] 🔄 전환 판단: YES (${transition.reason})`);
    }

    // ACE: 검증/자기수정 없음 — AI 자유
    const finalResponse = cleanResponse;

    // Turn Arc에 루나 응답 기록
    if (this.turnArc.previousTurns.length > 0) {
      const lastRecord = this.turnArc.previousTurns[this.turnArc.previousTurns.length - 1];
      lastRecord.lunaSummary = summarizeLunaResponse(finalResponse);
    }

    // 루나 최근 행동 추적 (맥락용)
    const summary = summarizeLunaResponse(finalResponse);
    this.lunaRecentSummaries.push(summary);
    if (this.lunaRecentSummaries.length > 5) this.lunaRecentSummaries.shift();

    // 🆕 행동 유형 분류 (anti-monotony 자기 인식)
    const actionType = classifyLunaAction(finalResponse);
    this.recentActionTypes.push(actionType);
    if (this.recentActionTypes.length > 5) this.recentActionTypes.shift();
    console.log(`[ACE] 🎭 행동분류: ${actionType} | 최근: [${this.recentActionTypes.join(', ')}]`);

    // 세션 스토리 비트 기록
    const lastUserMsg = userMessages?.[userMessages.length - 1] ?? '';
    const prevEmotion = this.sessionStory.beats.length > 0
      ? this.sessionStory.beats[this.sessionStory.beats.length - 1].emotionShift?.split(' → ')[1] ?? null
      : null;
    const beat = extractStoryBeat(
      this.turnCount,
      lastUserMsg,
      finalResponse,
      prevEmotion,
      this.lunaEmotion.currentEmotion,
    );
    this.sessionStory = updateSessionStory(this.sessionStory, beat, lastUserMsg, finalResponse);

    return {
      finalResponse,
      validation: {
        passed: true, response: finalResponse,
        blocked: [], fixed: [], warnings: [],
        attempts: 1, structureHash: '',
      },
      selfCorrected: false,
      emotionState: this.lunaEmotion,
      phaseSignal: signal,
      readinessSignals: readiness,
      shouldTransition: transition.transition,
      transitionReason: transition.reason,
      mindReadReady,
      storyData,
      strategyData,
      toneSelectData,
      draftCards,
      rpIn,
      rpOut,
      roleplayFeedback,
      panelReport,
      ideaRefine,
      actionPlan,
      warmWrap,
      thinkingDeepKeyword,
      situationRead,
      lunaThought,
      situationSummary,
      coreProblem,
      operationComplete,
    };
  }

  // ============================================
  // ACE 프롬프트 조립 — 핵심!
  // ============================================

  /**
   * 3-Layer Architecture:
   *   1. Identity  — "루나는 누구인가" (불변)
   *   2. Context   — "지금 무슨 상황인가" (코드가 수집)
   *   3. Cognition — "루나가 스스로 생각한다" (AI 자율)
   */
  private buildACEPrompt(
    emotionScore: number,
    userMessage: string,
    phase: string,
    turnInPhase: number,
    completedEvents: string[],
    longTermMemory?: MemoryProfile | null,
    userName?: string,
    workingMemoryPrompt?: string,
    previousSessionContext?: string,
    strategyMode?: import('@/types/engine.types').StrategyMode | null,
  ): string {
    const parts: string[] = [];

    // ========== Layer 1: 루나의 존재 ==========
    parts.push(buildIdentityPrompt());
    parts.push(buildSafetyPrompt());

    // ========== Layer 2: 대화의 맥락 ==========
    const sessionCtx: SessionContext = {
      userMessage,
      userEmotionHint: this.describeEmotion(emotionScore),
      emotionScore,

      lunaEmotion: this.lunaEmotion,
      lunaRecentActions: (this.lunaRecentSummaries || []).slice(-3),

      turnInSession: this.turnCount,
      recentExchange: this.getRecentExchange(),
      sessionSummary: this.sessionStory.sessionTheme ?? '',

      relationshipSummary: this.describeRelationship(),
      intimacyScore: this.userModel.lunaRelationship.intimacyScore,

      relevantMemories: '',
      workingMemoryPrompt: workingMemoryPrompt ?? '',

      journeyPhase: this.describeJourney(),

      userModelSummary: buildUserModelPrompt(this.userModel),
      userPatterns: detectPatterns(
        [],
        [],
        this.userMessages,
      ),

      storyPrompt: buildStoryPrompt(this.sessionStory),

      relationshipsPrompt: buildRelationshipPrompt(this.userModel?.relationships ?? []),
      sharedLanguagePrompt: buildSharedLanguagePrompt(
        (this.userModel?.lunaRelationship?.sharedLanguage ?? [])
          .filter((s: any) => s && s.term)
          .map((s: { term: string; meaning: string }) => ({ ...s, createdBy: 'user' as const }))
      ),

      triggeredMemory: this.lastMemoryResult?.injection ?? null,

      // 🆕 행동 패턴 인식
      lunaRecentActionTypes: (this.recentActionTypes ?? []).map(String),
      actionPatternHint: buildActionPatternHint(this.recentActionTypes ?? []),
      formattedRecentActions: formatRecentActions(this.recentActionTypes ?? [], this.lunaRecentSummaries ?? []),
    };

    // 기억 컨텍스트 추가
    const memoryPrompt = buildMemoryPrompt(this.workingMemory, longTermMemory, userName);
    if (memoryPrompt) {
      sessionCtx.relevantMemories = memoryPrompt;
    }

    // 🆕 ACE v4: 이전 세션 컨텍스트 (cross-session 기억)
    if (previousSessionContext) {
      sessionCtx.relevantMemories = (sessionCtx.relevantMemories ? sessionCtx.relevantMemories + '\n' : '') + previousSessionContext;
    }

    parts.push(buildContextPrompt(sessionCtx));

    // 🆕 ACE v4: Turn Arc — 대화 흐름 기승전결 (이전 턴 요약 + 유저 키워드)
    const arcPrompt = buildArcPrompt(this.turnArc);
    if (arcPrompt) parts.push(arcPrompt);

    // 감정 불확실성 힌트 (상황에 따라)
    const uncertaintyHint = buildEmotionUncertaintyHint(emotionScore, userMessage);
    if (uncertaintyHint) parts.push(uncertaintyHint);

    // 유저 내면 추론 힌트 (상황에 따라)
    const unspokenHint = buildUnspokenHint({
      userMessage,
      sessionTheme: this.sessionStory.sessionTheme,
      // 🆕 v78: 3→8 치매 방지 — 초반 맥락까지 추론에 반영
      recentUserMessages: (this.userMessages || []).slice(-8),
      fears: this.sessionStory?.formulation?.fears ? [this.sessionStory.formulation.fears] : [],
      wants: this.sessionStory?.formulation?.wants ? [this.sessionStory.formulation.wants] : [],
    });
    if (unspokenHint) parts.push(unspokenHint);

    // 친밀도 행동 힌트 (맥락 — 지시 아님)
    const intimacyHint = getIntimacyBehavior(this.userModel?.lunaRelationship?.intimacyScore ?? 10);
    if (intimacyHint) parts.push(intimacyHint);

    // 루나 취약함 (확률적 — 사람다움)
    const vulnHint = getLunaVulnerabilityHint(this.turnCount, this.userModel?.lunaRelationship?.intimacyScore ?? 10);
    if (vulnHint) parts.push(vulnHint);

    // 🆕 v3: 감정-행동 일관성 힌트 (Feeling-First)
    // 루나가 화난 상태인데 공감만 계속하면 → "화난 대로 보여줘도 돼"
    if (this.lunaEmotion.currentIntensity > 0.5 && (this.recentActionTypes ?? []).length >= 2) {
      const emotionBehaviorMap: Record<string, string[]> = {
        angry: ['side_take', 'opinion'],
        sad: ['empathy', 'experience'],
        worried: ['empathy', 'normalization'],
        anxious: ['empathy', 'normalization'],
        happy: ['relief', 'reaction_only'],
        excited: ['relief', 'reaction_only'],
        affection: ['experience', 'meta_comment'],
      };
      const naturalBehaviors = emotionBehaviorMap[this.lunaEmotion.currentEmotion] ?? [];
      const recent = this.recentActionTypes.slice(-2);
      const mismatch = naturalBehaviors.length > 0 && recent.every(a => !naturalBehaviors.includes(a));
      if (mismatch) {
        const LABELS: Record<string, string> = {
          angry: '화남', sad: '슬픔', worried: '걱정', anxious: '불안',
          happy: '기쁨', excited: '신남', affection: '따뜻함',
        };
        const label = LABELS[this.lunaEmotion.currentEmotion] ?? this.lunaEmotion.currentEmotion;
        parts.push(`[참고: 너 지금 ${label} 상태인데 최근 반응이 그 감정과 안 맞아. 감정을 숨기지 말고 드러내도 돼.]`);
      }
    }

    // ========== Layer 2.5: Phase 목적 (루나의 숨겨진 의도) ==========
    const purposePrompt = buildPhasePurposePrompt(phase, turnInPhase, completedEvents, strategyMode ?? null);
    if (purposePrompt) parts.push(purposePrompt);

    // ========== Layer 3: 자율 사고 ==========
    parts.push(buildCognitionPrompt());

    // 🆕 v36: Phase 시그널 + 상황 인식 + 속마음 태그 출력 지시
    parts.push(getPhaseSignalPrompt());

    return parts.filter(Boolean).join('\n\n');
  }

  // ============================================
  // 맥락 헬퍼 (판단 없이 정보만)
  // ============================================

  private describeEmotion(score: number): string {
    if (score <= -5) return '매우 부정적 (화남/절망)';
    if (score <= -2) return '부정적 (슬픔/답답함)';
    if (score <= 1) return '중립~약간 부정';
    if (score <= 4) return '약간 긍정';
    return '긍정적';
  }

  private describeRelationship(): string {
    const score = this.userModel.lunaRelationship.intimacyScore;
    const sessions = (this.userModel.lunaRelationship as any).sessionCount ?? Math.round(this.userModel.lunaRelationship.intimacyScore / 10);
    if (sessions <= 1) return '첫 만남';
    if (score > 50) return `${sessions}번째 만남. 꽤 편해진 사이.`;
    if (score > 25) return `${sessions}번째 만남. 조금씩 편해지는 중.`;
    return `${sessions}번째 만남. 아직 서먹한 편.`;
  }

  private describeJourney(): string {
    const p = this.journeyState.phase;
    const map: Record<string, string> = {
      LISTENING: '유저 얘기 듣는 중. 상황과 해결 과제가 보이면 [SITUATION_CLEAR] 붙여.',
      UNDERSTANDING: '핵심 감정이 보이기 시작. 좀 더 깊이 갈 수 있어.',
      SUPPORTING: '유저가 안정 찾아가는 중. 다른 시각이나 정리가 도움될 수 있어.',
      EMPOWERING: '유저가 스스로 방향 잡아가는 중. 응원해주면 돼.',
    };
    return map[p] ?? '유저 이야기 듣는 중.';
  }

  private getRecentExchange(): string {
    const recent = this.userMessages.slice(-2);
    if (recent.length === 0) return '';
    return recent.map((m, i) => `유저(${this.turnCount - recent.length + i + 1}): ${m.slice(0, 50)}`).join(' → ');
  }

  // ============================================
  // 상태 접근자
  // ============================================

  getLunaEmotionState(): LunaEmotionState {
    return this.lunaEmotion;
  }

  serializeEmotionState(): string {
    return serializeEmotionState(this.lunaEmotion);
  }

  serializeSessionStory(): string {
    return serializeStory(this.sessionStory);
  }

  /** 🆕 v48: 코드 레벨 상황 파악 판단 — AI 태그 안전망 (완화) */
  isFormulationReady(): { ready: boolean; summary: string; problem: string } {
    const f = this.sessionStory.formulation;
    const hasHurt = !!f.hurtBecause && f.hurtBecause.length > 3;
    // v48: 상황만 파악되면 ready (해결과제는 없어도 됨 — 연극할 수 있으면 충분)
    if (hasHurt) {
      return {
        ready: true,
        summary: f.hurtBecause!,
        problem: f.wants || f.fears || '아직 모르겠음',
      };
    }
    return { ready: false, summary: '', problem: '' };
  }

  getWorkingMemory(): WorkingMemory {
    return this.workingMemory;
  }

  getLastTurnContext(): TurnContext | undefined {
    return this.lastTurnContext;
  }

  // ============================================================
  // 🆕 v41.1: 친밀도 시스템 — 페르소나별 독립 처리
  // ============================================================

  /** intimacy 구조 보장 (누락 시 초기화) */
  private ensureIntimacyShape(): {
    luna: import('@/engines/intimacy').IntimacyState;
    tarot: import('@/engines/intimacy').IntimacyState;
  } {
    const {
      createDefaultIntimacyState,
    } = require('@/engines/intimacy') as typeof import('@/engines/intimacy');

    if (!this.userModel.intimacy) {
      this.userModel.intimacy = {
        luna: createDefaultIntimacyState(),
        tarot: createDefaultIntimacyState(),
      };
    }
    return this.userModel.intimacy;
  }

  /**
   * 현재 턴의 유저 메시지에서 친밀도 트리거를 감지하고 처리.
   * pipeline이 postProcess 전에 호출.
   *
   * @param userMessage 이번 턴 유저 메시지
   * @param recentUserMessages 최근 3~5개 유저 메시지 (단답 반복 감지용)
   * @param sessionNumber 세션 카운트 (숙제 이행 감지용)
   * @param persona 'luna' | 'tarot' — 해당 페르소나의 친밀도만 업데이트
   */
  processIntimacyTurn(
    userMessage: string,
    recentUserMessages: string[],
    sessionNumber: number,
    persona: 'luna' | 'tarot' = 'luna',
  ): {
    detectedTriggers: string[];
    delta: { trust: number; openness: number; bond: number; respect: number };
    newMilestones: string[];
    levelChanged: boolean;
  } {
    try {
      const {
        detectTurnTriggers,
        processTriggers,
      } = require('@/engines/intimacy') as typeof import('@/engines/intimacy');

      const intimacy = this.ensureIntimacyShape();
      const personaState = intimacy[persona];

      const detected = detectTurnTriggers({
        userMessage,
        recentUserMessages,
        sessionNumber,
        currentState: personaState,
      });

      if (detected.length === 0) {
        return {
          detectedTriggers: [],
          delta: { trust: 0, openness: 0, bond: 0, respect: 0 },
          newMilestones: [],
          levelChanged: false,
        };
      }

      const result = processTriggers(personaState, detected, persona);
      intimacy[persona] = result.after;

      // 레거시 미러 업데이트 — 오직 luna만 (lunaRelationship 이름이 루나 전용)
      if (persona === 'luna') {
        const dims = result.after.dimensions;
        const avg = (dims.trust + dims.openness + dims.bond + dims.respect) / 4;
        this.userModel.lunaRelationship.intimacyScore = Math.round(avg);
        this.userModel.lunaRelationship.trustLevel = Math.min(1, dims.trust / 100);
      }

      console.log(
        `[Intimacy:${persona}] 턴 트리거: [${detected.join(', ')}] | Δ 🛡️${result.totalDelta.trust.toFixed(1)} 💜${result.totalDelta.openness.toFixed(1)} 🦊${result.totalDelta.bond.toFixed(1)} ⭐${result.totalDelta.respect.toFixed(1)} | Lv.${result.after.level}${result.levelChanged ? ' ⬆️ LEVEL UP!' : ''}`,
      );

      return {
        detectedTriggers: detected,
        delta: result.totalDelta,
        newMilestones: result.newMilestones,
        levelChanged: result.levelChanged,
      };
    } catch (e) {
      console.warn('[Intimacy] 턴 처리 실패 (무시):', e);
      return {
        detectedTriggers: [],
        delta: { trust: 0, openness: 0, bond: 0, respect: 0 },
        newMilestones: [],
        levelChanged: false,
      };
    }
  }

  /**
   * 현재 친밀도 상태에 맞는 프롬프트 힌트 블록을 반환.
   * 페르소나별 상태 사용.
   *
   * @param persona 'luna' | 'tarot'
   */
  getIntimacyPromptBlock(persona: 'luna' | 'tarot' = 'luna'): string {
    if (!this.userModel.intimacy) return '';
    try {
      const { buildIntimacyHints } =
        require('@/engines/intimacy') as typeof import('@/engines/intimacy');
      return buildIntimacyHints(this.userModel.intimacy[persona]);
    } catch {
      return '';
    }
  }

  /**
   * 해당 페르소나 친밀도 상태 스냅샷 (UI/API용)
   */
  getIntimacyState(persona: 'luna' | 'tarot' = 'luna') {
    return this.userModel.intimacy?.[persona] ?? null;
  }

  /** 전체 intimacy 구조 반환 (양쪽 다 필요할 때) */
  getIntimacyAll() {
    return this.userModel.intimacy ?? null;
  }

  /**
   * 🆕 v41.1: 특정 페르소나에 대해 onSessionStart 훅 실행 (감쇠 + 재방문 트리거).
   * 세션 내 첫 호출에서만 실행되도록 플래그 관리.
   */
  runIntimacySessionStart(persona: 'luna' | 'tarot'): void {
    // 이미 이번 요청에서 처리됐으면 스킵
    const key = `_intimacySessionStarted_${persona}`;
    if ((this as any)[key]) return;
    (this as any)[key] = true;

    try {
      const {
        onSessionStart,
        processTriggers,
      } = require('@/engines/intimacy') as typeof import('@/engines/intimacy');

      const intimacy = this.ensureIntimacyShape();
      const current = intimacy[persona];
      const { state: started, autoTriggers } = onSessionStart(current);

      if (autoTriggers.length > 0) {
        const result = processTriggers(started, autoTriggers, persona);
        intimacy[persona] = result.after;
      } else {
        intimacy[persona] = started;
      }

      const cur = intimacy[persona];
      console.log(
        `[Intimacy:${persona}] Lv.${cur.level} ${cur.levelName} | 🛡️${cur.dimensions.trust.toFixed(0)} 💜${cur.dimensions.openness.toFixed(0)} 🦊${cur.dimensions.bond.toFixed(0)} ⭐${cur.dimensions.respect.toFixed(0)} | 연속 ${cur.consecutiveDays}일 | 총 ${cur.totalSessions}회${autoTriggers.length > 0 ? ' | 자동 트리거: ' + autoTriggers.join(', ') : ''}`,
      );
    } catch (e) {
      console.warn('[Intimacy] 세션 시작 훅 실패 (무시):', e);
    }
  }

  getDebugInfo() {
    return {
      lunaEmotion: this.lunaEmotion,
      workingFacts: this.workingMemory.getFacts(),
      lastContext: this.lastTurnContext,
      journeyPhase: this.journeyState.phase,
      recentSummaries: this.lunaRecentSummaries,
    };
  }
}
