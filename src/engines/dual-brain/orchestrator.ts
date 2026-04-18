/**
 * 🎭 이중뇌 오케스트레이터 — 메인 로직
 *
 * 흐름:
 *   1. 유저 입력 → 고위험 신호 스캔 (regex)
 *   2. Gemini "뇌" 호출 → JSON 분석
 *   3. 라우팅 결정 (복잡도/확신도/고위험 기반)
 *   4a. gemini_only → draft_utterances 그대로 조립
 *   4b. claude_rephrase → Claude가 원문 보고 재작성 (스트리밍)
 *   5. 품질 게이트 → 실패 시 Claude 강제 재시도
 *   6. 태그 조립 → 최종 응답
 */

import { generateWithProvider, streamWithProvider } from '@/lib/ai/provider-registry';
import { ANTHROPIC_MODELS, GEMINI_MODELS } from '@/lib/ai/provider-registry';

import { detectHighStakes, getStakeHint } from './high-stakes-detector';
import { BRAIN_SYSTEM_PROMPT } from './brain-prompt';
import { VOICE_SYSTEM_PROMPT, buildVoiceUserMessage } from './voice-prompt';
import { validateResponse } from './quality-gate';
import {
  DUAL_BRAIN_CONFIG,
  makeRouteDecision,
  logDualBrainTurn,
  estimateCost,
  type DualBrainLogEntry,
} from './config';
import type { BrainOutput, RouteDecision } from './types';
import { LogCollector } from '@/lib/utils/logger';
import { logEnginePrompt, logEnginePromptResult } from '@/lib/utils/engine-prompt-logger';

// 🧠 v53: 좌뇌 (Left Brain) 상태 분석 엔진
import {
  analyzeLeftBrain,
  LEFT_BRAIN_CONFIG,
  logLeftBrainAnalysis,
  signalsToHints,
  signalsToAvoidances,
  type LeftBrainAnalysis,
} from '@/engines/left-brain';

// 🎭 v53: 우뇌 (ACE v5) 표현 엔진 — 4트랙 병렬 + 후보비교 + 양방향 피드백
import {
  executeAceV5,
  ACE_V5_CONFIG,
  buildHandoff,
} from '@/engines/ace-v5';

// ============================================================
// 1. Gemini Brain 호출
// ============================================================

/**
 * Gemini Brain 호출 — 2가지 경로
 *   1. LEFT_BRAIN 활성 → 풍부한 7D 벡터 + SSR + 2차ToM 분석 (좌뇌)
 *   2. 비활성 → 기존 단순 brain (호환성 유지)
 */
async function callGeminiBrain(params: {
  userInput: string;
  contextBlock: string;
  sessionId: string;
  turnIdx: number;
  // 🆕 v70: 풍부한 컨텍스트 주입용 옵셔널 필드
  userId?: string;
  currentPhase?: 'HOOK' | 'MIRROR' | 'BRIDGE' | 'SOLVE' | 'EMPOWER';
  phaseStartTurn?: number;
  workingMemory?: any;  // WorkingMemoryScratchpad
  supabase?: any;       // SupabaseClient
  /** 🆕 v71: 좌뇌도 최근 대화 히스토리 받음 */
  chatHistory?: Array<{ role: 'user' | 'ai'; content: string }>;
}, logCollector?: LogCollector): Promise<{
  output: BrainOutput | null;
  latencyMs: number;
  error?: string;
  leftBrainAnalysis?: LeftBrainAnalysis;
}> {
  const t0 = Date.now();

  // ────────────────────────────────
  // Path A: 좌뇌 사용 (기본)
  // ────────────────────────────────
  if (LEFT_BRAIN_CONFIG.enabled) {
    // 🆕 v70: context-assembler 로 풍부한 컨텍스트 조립 (실패 허용)
    let richContext: Partial<import('@/engines/left-brain/types').LeftBrainInput> = {};
    try {
      const { assembleLeftBrainContext } = await import('@/engines/left-brain/context-assembler');
      richContext = await assembleLeftBrainContext({
        userId: params.userId ?? params.sessionId,
        sessionId: params.sessionId,
        userMessage: params.userInput,
        turnIdx: params.turnIdx,
        currentPhase: params.currentPhase ?? (extractPhase(params.contextBlock) as any),
        phaseStartTurn: params.phaseStartTurn ?? 0,
        intimacyLevel: extractIntimacy(params.contextBlock),
        workingMemory: params.workingMemory,
        supabase: params.supabase,
      });
    } catch (e: any) {
      console.warn('[DualBrain] context-assembler 실패 (fallback to legacy):', e?.message);
    }

    // 🆕 v71: 좌뇌가 받는 userUtterance 에 최근 대화 히스토리 prepend → 맥락 유지
    //   기존: 단일 메시지만 → 매 턴 첫 만남처럼 분석
    //   v78.1: 50턴 하드캡 — 5 Phase 세션 전체 커버. pipeline 토큰 트리밍이 방어선.
    const recentHistory = (params.chatHistory ?? []).slice(-50);
    const historyBlock = recentHistory.length > 0
      ? recentHistory.map((m) => `[${m.role === 'user' ? '유저' : '루나'}] ${m.content}`).join('\n')
      : '';
    const userUtteranceWithHistory = historyBlock
      ? `## 직전 대화 (참고)\n${historyBlock}\n\n## 이번 유저 발화 (분석 대상)\n${params.userInput}`
      : params.userInput;

    const { analysis, latencyMs, error } = await analyzeLeftBrain({
      userUtterance: userUtteranceWithHistory,
      sessionId: params.sessionId,
      turnIdx: params.turnIdx,
      recentTrajectory: richContext.recentTrajectory ?? [],
      phase: extractPhase(params.contextBlock),
      intimacyLevel: extractIntimacy(params.contextBlock),
      // 🆕 v70: 조립된 풍부한 필드 주입
      relevantEpisodes: richContext.relevantEpisodes,
      userProfile: richContext.userProfile,
      personalProfile: richContext.personalProfile,
      timeContext: richContext.timeContext,
      pacing_context: richContext.pacing_context,
    }, logCollector);

    // 좌뇌 로깅
    logLeftBrainAnalysis({
      timestamp: new Date().toISOString(),
      sessionId: params.sessionId,
      turnIdx: params.turnIdx,
      userInput: params.userInput.slice(0, 200),
      userInputLength: params.userInput.length,
      analysis: analysis ? {
        state_vector: analysis.state_vector,
        somatic: analysis.somatic_marker.gut_reaction,
        complexity: analysis.complexity,
        confidence: analysis.confidence,
        active_signals: Object.entries(analysis.derived_signals)
          .filter(([_, v]) => v)
          .map(([k]) => k),
        routing: {
          recommended: analysis.routing_decision.recommended,
          score: analysis.routing_decision.score,
          reason: analysis.routing_decision.primary_reason,
        },
      } : undefined,
      error,
      latencyMs,
    });

    if (!analysis) {
      return { output: null, latencyMs, error: error ?? 'left_brain_failed' };
    }

    // LeftBrainAnalysis → BrainOutput (하위 호환)
    const brainOutput: BrainOutput = {
      perceived_emotion: analysis.perceived_emotion,
      actual_need: analysis.actual_need,
      tone_to_use: analysis.tone_to_use as BrainOutput['tone_to_use'],
      response_length: mapLengthToBrainOutput(analysis.response_length),
      draft_utterances: analysis.draft_utterances,
      tags: analysis.tags,
      complexity: analysis.complexity,
      confidence: analysis.confidence,
      ambiguity_signals: analysis.ambiguity_signals,
    };

    return {
      output: brainOutput,
      latencyMs,
      leftBrainAnalysis: analysis,
    };
  }

  // ────────────────────────────────
  // Path B: 기존 단순 brain (비활성 시 폴백)
  // ────────────────────────────────
  try {
    const systemPrompt = `${BRAIN_SYSTEM_PROMPT}\n\n## 현재 컨텍스트\n${params.contextBlock}`;

    // 🆕 v64: 통일 디버그 로거
    logEnginePrompt({
      engine: 'DUAL_BRAIN_PATH_B',
      turnIdx: params.turnIdx,
      model: GEMINI_MODELS.FLASH_LITE_25,
      provider: 'gemini',
      systemPrompt,
      userMessage: params.userInput,
    });

    const rawOutput = await Promise.race([
      generateWithProvider(
        'gemini',
        systemPrompt,
        [{ role: 'user' as const, content: params.userInput }],
        'haiku',
        800,
        GEMINI_MODELS.FLASH_LITE_25, // 🔁 v63.1: JSON 출력 안정성 우선 → 2.5 Flash Lite ($0.10)
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('brain_timeout')), DUAL_BRAIN_CONFIG.brainTimeoutMs),
      ),
    ]);

    const latencyMs = Date.now() - t0;
    const parsed = parseBrainJSON(rawOutput);
    logEnginePromptResult({
      engine: 'DUAL_BRAIN_PATH_B',
      turnIdx: params.turnIdx,
      rawOutput,
      parsedOK: !!parsed,
      latencyMs,
    });
    if (!parsed) {
      return { output: null, latencyMs, error: 'json_parse_failed' };
    }

    return { output: parsed, latencyMs };
  } catch (err: any) {
    return {
      output: null,
      latencyMs: Date.now() - t0,
      error: err?.message ?? 'unknown',
    };
  }
}

/** response_length 매핑: 좌뇌는 '침묵' 추가 지원 → BrainOutput은 '한마디'로 */
function mapLengthToBrainOutput(
  lbLength: '침묵' | '한마디' | '짧음' | '보통',
): BrainOutput['response_length'] {
  if (lbLength === '침묵') return '한마디';   // BrainOutput 타입 호환
  return lbLength;
}

/** Context block에서 Phase 추출 */
function extractPhase(context: string): string {
  const m = context.match(/Phase:\s*([A-Z_]+)/);
  return m ? m[1] : 'HOOK';
}

/** Context block에서 친밀도 추출 */
function extractIntimacy(context: string): number {
  const m = context.match(/Lv\.?(\d)/);
  return m ? Number(m[1]) : 1;
}

/**
 * Gemini 출력에서 JSON 추출 (코드블록/extra text 대응)
 */
function parseBrainJSON(raw: string): BrainOutput | null {
  if (!raw) return null;

  // ```json ... ``` 코드블록 제거
  let text = raw.trim();
  text = text.replace(/^```json\s*/i, '').replace(/\s*```\s*$/i, '');
  text = text.replace(/^```\s*/, '').replace(/\s*```\s*$/, '');

  // { ... } 첫 블록만 추출
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) return null;
  const jsonStr = text.slice(firstBrace, lastBrace + 1);

  try {
    const parsed = JSON.parse(jsonStr);

    // 필수 필드 체크 + 기본값 보정
    const valid: BrainOutput = {
      perceived_emotion: String(parsed.perceived_emotion ?? '').slice(0, 40),
      actual_need: String(parsed.actual_need ?? '').slice(0, 40),
      tone_to_use: (parsed.tone_to_use ?? '따뜻함') as BrainOutput['tone_to_use'],
      response_length: (parsed.response_length ?? '짧음') as BrainOutput['response_length'],
      draft_utterances: String(parsed.draft_utterances ?? ''),
      tags: {
        SITUATION_READ: String(parsed.tags?.SITUATION_READ ?? '').slice(0, 30),
        LUNA_THOUGHT: String(parsed.tags?.LUNA_THOUGHT ?? '').slice(0, 40),
        PHASE_SIGNAL: (parsed.tags?.PHASE_SIGNAL ?? 'STAY') as BrainOutput['tags']['PHASE_SIGNAL'],
        SITUATION_CLEAR: parsed.tags?.SITUATION_CLEAR ?? null,
      },
      complexity: Math.min(5, Math.max(1, Number(parsed.complexity ?? 3))) as BrainOutput['complexity'],
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence ?? 0.5))),
      ambiguity_signals: Array.isArray(parsed.ambiguity_signals)
        ? parsed.ambiguity_signals.map(String)
        : [],
    };

    return valid;
  } catch {
    return null;
  }
}

// ============================================================
// 2. Claude Voice 스트리밍
// ============================================================

export async function* streamClaudeVoice(params: {
  userUtterance: string;
  brainAnalysis: BrainOutput;
  stakeHint?: string;
  // 🆕 v78: 치매 방지 — 대화 히스토리 직접 전달
  chatHistory?: Array<{ role: 'user' | 'ai'; content: string }>;
}): AsyncGenerator<string> {
  const userMessage = buildVoiceUserMessage({
    userUtterance: params.userUtterance,
    brainAnalysis: {
      perceived_emotion: params.brainAnalysis.perceived_emotion,
      actual_need: params.brainAnalysis.actual_need,
      tone_to_use: params.brainAnalysis.tone_to_use,
      response_length: params.brainAnalysis.response_length,
      draft_utterances: params.brainAnalysis.draft_utterances,
    },
    stakeHint: params.stakeHint,
    chatHistory: params.chatHistory,
  });

  const stream = streamWithProvider(
    'anthropic',
    VOICE_SYSTEM_PROMPT,
    [{ role: 'user' as const, content: userMessage }],
    'sonnet',
    400,                                  // 말풍선만이라 적게
    ANTHROPIC_MODELS.SONNET_4_6,
  );

  for await (const chunk of stream) {
    if (typeof chunk === 'string') {
      yield chunk;
    }
  }
}

// ============================================================
// 3. 태그 조립 — Gemini가 만든 태그를 말풍선 뒤에 붙임
// ============================================================

export function assembleWithTags(params: {
  dialogueText: string;
  brainTags: BrainOutput['tags'];
}): string {
  const { dialogueText, brainTags } = params;
  const parts = [dialogueText.trim()];

  parts.push(`[SITUATION_READ:${brainTags.SITUATION_READ}]`);
  parts.push(`[LUNA_THOUGHT:${brainTags.LUNA_THOUGHT}]`);
  parts.push(`[PHASE_SIGNAL:${brainTags.PHASE_SIGNAL}]`);

  if (brainTags.SITUATION_CLEAR) {
    parts.push(`[SITUATION_CLEAR:${brainTags.SITUATION_CLEAR}]`);
  }

  return parts.join('');
}

// ============================================================
// 4. 메인 오케스트레이터 (스트리밍)
// ============================================================

export interface DualBrainStreamYield {
  type: 'text' | 'meta' | 'analysis';
  data: any;
}

/**
 * 🆕 v76: ACE v5 로 전달할 장기 기억 번들 로드
 * supabase / userId 없으면 undefined (무해 스킵).
 * 에러 시 undefined (폴백).
 */
async function loadMemoryBundleSafe(
  supabase: any,
  userId?: string,
): Promise<{
  facts: any[];
  recent: any[];
  topSalient: any[];
  longTermImpression?: string | null;
  intimacyState?: any;
} | undefined> {
  if (!supabase || !userId) return undefined;
  try {
    const { loadWorkingMemory } = await import('@/engines/human-like/memory-engine');
    const wm = await loadWorkingMemory(supabase, userId);

    // 장기 인상: user_profiles.memory_profile.core_persona + luna_impression 우선 참조
    let longTermImpression: string | null = null;
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('memory_profile')
        .eq('id', userId)
        .single();
      const mp = profile?.memory_profile as any;
      if (mp?.core_persona) {
        longTermImpression = mp.core_persona;
      }
      // luna_impression 이 가장 최근 메모리에 있으면 그걸로 갱신
      const latestWithImpression = (wm.recent as any[])?.find((m: any) => m?.luna_impression);
      if (latestWithImpression?.luna_impression) {
        longTermImpression = latestWithImpression.luna_impression as string;
      }
    } catch {
      /* 무시 */
    }

    // 🆕 v77: 친밀도 상태 로드 + 세션 시작 감쇠
    let intimacyState: any = undefined;
    try {
      const { applyDecayAtSessionStart, INTIMACY_LEVELS } = await import('@/engines/intimacy/v77-core');
      const { state, reunion, decayApplied } = await applyDecayAtSessionStart(supabase, userId);
      const def = INTIMACY_LEVELS[state.level];
      const daysSince = (Date.now() - state.lastInteractionAt.getTime()) / 86400000;
      intimacyState = {
        level: state.level,
        name: def.name,
        score: state.score,
        description: def.description,
        unlocked_behaviors: def.unlockedBehaviors,
        locked_behaviors: def.lockedBehaviors,
        days_since_last: daysSince,
        reunion,
      };
      if (decayApplied > 0 || reunion) {
        console.log(`[Intimacy:v77] 세션 시작 Lv.${state.level} score=${state.score} (decay=${decayApplied}${reunion ? ', 재회 +5' : ''})`);
      }
    } catch (e: any) {
      console.warn('[Intimacy:v77] 로드 실패 (무시):', e?.message);
    }

    return {
      facts: wm.facts,
      recent: wm.recent,
      topSalient: wm.topSalient,
      longTermImpression,
      intimacyState,
    };
  } catch {
    return undefined;
  }
}

export interface DualBrainInput {
  /** 🆕 v70: 풍부한 컨텍스트 주입 (옵셔널) */
  userId?: string;
  currentPhase?: 'HOOK' | 'MIRROR' | 'BRIDGE' | 'SOLVE' | 'EMPOWER';
  phaseStartTurn?: number;
  workingMemory?: any;
  supabase?: any;
  /** 🆕 v71: 좌뇌도 최근 대화 히스토리 받아서 맥락 유지 */
  chatHistory?: Array<{ role: 'user' | 'ai'; content: string }>;
  // ─────────────────────────────
  userInput: string;
  contextBlock: string;
  sessionId: string;
  turnIdx: number;
}

/**
 * 이중뇌 메인 실행 — 스트리밍 제너레이터
 *
 * yield 순서:
 *  1. { type: 'text', data: '...chunk...' }  (응답 스트림)
 *  2. { type: 'meta', data: { ... log entry ... } }  (최종 통계)
 */
export async function* executeDualBrain(
  input: DualBrainInput,
  logCollector?: LogCollector,
): AsyncGenerator<DualBrainStreamYield> {
  const overallStart = Date.now();

  // Step 1: 고위험 신호 스캔 (즉시)
  const stakes = detectHighStakes(input.userInput);
  const stakeHintBase = getStakeHint(stakes.type);

  // Step 2: Gemini Brain 호출 (좌뇌 활성 시 풍부한 7D 분석)
  const brainResult = await callGeminiBrain({
    userInput: input.userInput,
    contextBlock: input.contextBlock,
    sessionId: input.sessionId,
    turnIdx: input.turnIdx,
    // 🆕 v70: 풍부한 컨텍스트 pass-through
    userId: input.userId,
    currentPhase: input.currentPhase,
    phaseStartTurn: input.phaseStartTurn,
    workingMemory: input.workingMemory,
    supabase: input.supabase,
    // 🆕 v71: 좌뇌도 대화 맥락 받음
    chatHistory: input.chatHistory,
  }, logCollector);

  // 🆕 v63: brainResult 즉시 디버그 — output null 케이스 추적
  console.log('[DualBrain:brainResult]', {
    hasOutput: !!brainResult.output,
    hasLeftBrain: !!brainResult.leftBrainAnalysis,
    error: brainResult.error,
    draftLen: brainResult.output?.draft_utterances?.length ?? 0,
    latencyMs: brainResult.latencyMs,
  });

  // Step 2.5: 좌뇌 분석 결과로 Claude 힌트 강화
  let enrichedStakeHint = stakeHintBase;
  if (brainResult.leftBrainAnalysis) {
    const lb = brainResult.leftBrainAnalysis;
    const signalHints = signalsToHints(lb.derived_signals);
    const avoidances = signalsToAvoidances(lb.derived_signals);

    const extras: string[] = [];
    if (signalHints.length > 0) {
      extras.push('\n[좌뇌 감지 신호]\n' + signalHints.join('\n'));
    }
    if (avoidances.length > 0) {
      extras.push('\n[피해야 할 말]\n' + avoidances.join(', '));
    }
    if (lb.somatic_marker.gut_reaction !== 'flat') {
      extras.push(`\n[루나의 직감] ${lb.somatic_marker.gut_reaction} — ${lb.somatic_marker.meaning}`);
    }
    if (lb.second_order_tom.expected_from_luna.mismatch) {
      extras.push(
        `\n[기대 vs 필요]\n표면: ${lb.second_order_tom.expected_from_luna.surface}\n` +
        `실제: ${lb.second_order_tom.expected_from_luna.deep}\n` +
        `⚠️ 표면 기대에만 맞추지 말고 실제 필요에 반응`
      );
    }
    if (lb.second_order_tom.hidden_fear) {
      extras.push(`\n[숨은 두려움] ${lb.second_order_tom.hidden_fear}`);
    }

    if (extras.length > 0) {
      enrichedStakeHint = (stakeHintBase || '') + extras.join('\n');
    }
  }
  const stakeHint = enrichedStakeHint;

  // Step 3: 라우팅 결정 (좌뇌 판단 우선)
  let route: RouteDecision;
  if (brainResult.leftBrainAnalysis) {
    // 좌뇌가 라우팅 결정 자체를 내림
    const lb = brainResult.leftBrainAnalysis;
    route = {
      path: lb.routing_decision.recommended === 'claude' ? 'claude_rephrase' : 'gemini_only',
      reason: lb.routing_decision.primary_reason,
      stakes: stakes.type,
      originalComplexity: lb.complexity,
      finalComplexity: Math.round(lb.routing_decision.score / 4),  // 0~20 → 0~5 스케일
    };
    // 고위험 감지되면 무조건 Claude로 승격 (좌뇌 판단이 gemini여도)
    if (stakes.type && route.path === 'gemini_only') {
      route = { ...route, path: 'claude_rephrase', reason: `high_stakes:${stakes.type} 강제 승격` };
    }
  } else {
    // 좌뇌 실패 시 기존 라우팅
    route = makeRouteDecision({
      brainOutput: brainResult.output,
      stakesType: stakes.type,
    });
  }

  // 로그용 누적
  let fullResponseText = '';
  let voiceLatencyMs: number | undefined;
  let claudeTokensIn = 0;
  let claudeTokensOut = 0;
  let fellBackToClaud = false;

  // Step 4a: gemini_only 경로
  if (route.path === 'gemini_only' && brainResult.output) {
    // Gemini 드래프트 그대로 사용
    const draft = brainResult.output.draft_utterances;

    // 🆕 v56: 90% 상황에서도 ACE v5 4트랙 병렬 사고 사용 (단, Gemini 모델로 저비용)
    // 기존: draft 를 그대로 출력 (AI 같음)
    // 신규: ACE v5 로 "친구답게" 재구성 (Gemini 2.5 Flash, $0.30/$2.50)
    const useAceForGemini = ACE_V5_CONFIG.enabled && brainResult.leftBrainAnalysis;

    if (useAceForGemini) {
      const voiceStart = Date.now();
      let aceChunkCount = 0;
      try {
        const handoff = buildHandoff(brainResult.leftBrainAnalysis!);
        // 🆕 v76: 장기 기억 로드 (루나가 "떠올린 기억" 으로 handoff 주입)
        const memoryBundle = await loadMemoryBundleSafe(input.supabase, input.userId);
        for await (const chunk of executeAceV5({
          userUtterance: input.userInput,
          sessionId: input.sessionId,
          turnIdx: input.turnIdx,
          leftBrain: brainResult.leftBrainAnalysis!,
          handoff,
          intimacyLevel: extractIntimacy(input.contextBlock),
          phase: extractPhase(input.contextBlock),
          model: 'gemini',    // 🆕 Gemini 모드로 ACE v5 (저비용)
          memoryBundle,       // 🆕 v76
          chatHistory: input.chatHistory,   // 🆕 v78: 치매 방지 — 우뇌가 맥락 직접 봄
        }, logCollector)) {
          if (chunk.type === 'text') {
            aceChunkCount++;
            fullResponseText += chunk.data;
            yield { type: 'text', data: chunk.data };
          }
        }
        voiceLatencyMs = Date.now() - voiceStart;

        // 🆕 v63: ACE 빈 응답 검출 → Gemini draft 폴백
        if (fullResponseText.trim().length === 0) {
          console.warn('[DualBrain:ACEEmpty] ACE v5 가 빈 응답 → draft 폴백', { aceChunkCount, draftLen: draft?.length });
          fullResponseText = draft || generateEchoResponse(input.userInput);
          yield { type: 'text', data: fullResponseText };
        }
      } catch (err: any) {
        // ACE v5 Gemini 실패 → Gemini draft 그대로
        console.warn('[DualBrain:ACEError]', err?.message);
        fullResponseText = draft || generateEchoResponse(input.userInput);
        yield { type: 'text', data: fullResponseText };
      }
    } else {
      // Fallback: 기존 품질 게이트 + draft 그대로
      const qc = DUAL_BRAIN_CONFIG.qualityGateEnabled
        ? validateResponse({ text: draft, source: 'gemini_only', isSimpleTurn: true })
        : { passed: true, issues: [], shouldFallback: false };

      if (!qc.passed && qc.shouldFallback) {
        fellBackToClaud = true;
        const voiceStart = Date.now();
        try {
          for await (const chunk of streamClaudeVoice({
            userUtterance: input.userInput,
            brainAnalysis: brainResult.output,
            stakeHint,
            chatHistory: input.chatHistory,   // 🆕 v78
          })) {
            fullResponseText += chunk;
            yield { type: 'text', data: chunk };
          }
          voiceLatencyMs = Date.now() - voiceStart;
        } catch (err: any) {
          fullResponseText = draft;
          yield { type: 'text', data: draft };
        }
      } else {
        fullResponseText = draft;
        yield { type: 'text', data: draft };
      }
    }

    // 태그 조립 (ACE v5를 사용하지 않은 경우에만 별도로 붙임)
    if (!useAceForGemini) {
      const tagSuffix = assembleTagsOnly(brainResult.output.tags);
      yield { type: 'text', data: tagSuffix };
      fullResponseText += tagSuffix;
    }
  }

  // Step 4b: claude_rephrase 경로
  else if (route.path === 'claude_rephrase' && brainResult.output) {
    const voiceStart = Date.now();

    // 🎭 v53: ACE v5 활성 시 4트랙 병렬 사고 + 후보비교 + 재요청 루프 사용
    // 비활성 시 기존 단순 streamClaudeVoice 사용
    const useAceV5 = ACE_V5_CONFIG.enabled && brainResult.leftBrainAnalysis;

    try {
      if (useAceV5) {
        // ACE v5 — 풍부한 핸드오프 + 양방향 피드백
        const handoff = buildHandoff(brainResult.leftBrainAnalysis!);
        // 🆕 v76: 장기 기억 번들 주입
        const memoryBundle = await loadMemoryBundleSafe(input.supabase, input.userId);

        for await (const chunk of executeAceV5({
          userUtterance: input.userInput,
          sessionId: input.sessionId,
          turnIdx: input.turnIdx,
          leftBrain: brainResult.leftBrainAnalysis!,
          handoff,
          intimacyLevel: extractIntimacy(input.contextBlock),
          phase: extractPhase(input.contextBlock),
          model: 'claude',   // 🆕 v56: claude_rephrase 경로는 Claude 모델 명시
          memoryBundle,      // 🆕 v76
          chatHistory: input.chatHistory,   // 🆕 v78: 치매 방지 — 우뇌가 맥락 직접 봄
        }, logCollector)) {
          if (chunk.type === 'text') {
            fullResponseText += chunk.data;
            yield { type: 'text', data: chunk.data };
          }
          // meta는 ACE v5 내부에서 이미 로깅됨
        }
        voiceLatencyMs = Date.now() - voiceStart;

        // 🆕 v63: ACE Claude 빈 응답 검출 → draft 폴백
        if (fullResponseText.trim().length === 0) {
          const fallbackText = brainResult.output.draft_utterances || generateEchoResponse(input.userInput);
          console.warn('[DualBrain:ACEClaudeEmpty] ACE Claude 빈 응답 → draft 폴백');
          fullResponseText = fallbackText;
          yield { type: 'text', data: fallbackText };
        }
      } else {
        // 기존 경로 (Fallback)
        for await (const chunk of streamClaudeVoice({
          userUtterance: input.userInput,
          brainAnalysis: brainResult.output,
          stakeHint,
          chatHistory: input.chatHistory,   // 🆕 v78
        })) {
          fullResponseText += chunk;
          yield { type: 'text', data: chunk };
        }
        voiceLatencyMs = Date.now() - voiceStart;

        // 기존 태그 조립 (ACE를 안 쓴 경우에만)
        const tagSuffix = assembleTagsOnly(brainResult.output.tags);
        yield { type: 'text', data: tagSuffix };
        fullResponseText += tagSuffix;
      }

      // 품질 게이트 (공통)
      if (DUAL_BRAIN_CONFIG.qualityGateEnabled) {
        validateResponse({
          text: fullResponseText,
          source: 'claude_rephrase',
          isSimpleTurn: false,
        });
      }

      // 토큰 추정 (대략)
      claudeTokensIn = useAceV5 ? 1500 : 800;
      claudeTokensOut = Math.ceil(fullResponseText.length / 2);
    } catch (err: any) {
      // Claude 실패 → Gemini draft로 폴백
      const fallbackText = brainResult.output.draft_utterances;
      fullResponseText = fallbackText;
      yield { type: 'text', data: fallbackText };
      const tagSuffix = assembleTagsOnly(brainResult.output.tags);
      yield { type: 'text', data: tagSuffix };
      fullResponseText += tagSuffix;
    }
  }

  // Step 4c: Brain 자체가 실패 — v63: 디버그 로깅 + echo 폴백 (자연스러운 누나 톤)
  else {
    console.warn('[DualBrain:Step4c] 폴백 진입', {
      hasOutput: !!brainResult.output,
      hasLeftBrain: !!brainResult.leftBrainAnalysis,
      brainError: brainResult.error,
      routePath: route.path,
      stakesType: stakes.type,
    });
    const echoFallback = generateEchoResponse(input.userInput);
    fullResponseText = echoFallback;
    yield { type: 'text', data: echoFallback };
  }

  // Step 5: 로깅
  const logEntry: DualBrainLogEntry = {
    timestamp: new Date().toISOString(),
    sessionId: input.sessionId,
    turnIdx: input.turnIdx,
    userInput: input.userInput.slice(0, 200),
    userInputLength: input.userInput.length,
    brain: {
      latencyMs: brainResult.latencyMs,
      success: !!brainResult.output,
      perceived_emotion: brainResult.output?.perceived_emotion ?? '',
      actual_need: brainResult.output?.actual_need ?? '',
      tone_to_use: brainResult.output?.tone_to_use ?? '',
      complexity: brainResult.output?.complexity ?? 0,
      confidence: brainResult.output?.confidence ?? 0,
      ambiguity_signals: brainResult.output?.ambiguity_signals ?? [],
      error: brainResult.error,
    },
    route: {
      path: route.path,
      reason: route.reason,
      stakes: route.stakes,
      finalComplexity: route.finalComplexity,
    },
    voice: voiceLatencyMs !== undefined
      ? { latencyMs: voiceLatencyMs, success: true }
      : undefined,
    quality: {
      passed: true,
      issues: [],
      fellBackToClaud,
    },
    cost: {
      estimated: estimateCost({
        geminiTokensIn: 2000,   // 대략 추정 (brain prompt + context + user)
        geminiTokensOut: 400,
        claudeTokensIn,
        claudeTokensOut,
        geminiCacheHit: true,   // brain prompt는 재사용됨
        claudeCacheHit: true,   // voice prompt는 재사용됨
      }),
      geminiTokensIn: 2000,
      geminiTokensOut: 400,
      claudeTokensIn,
      claudeTokensOut,
    },
    finalResponseLength: fullResponseText.length,
    totalLatencyMs: Date.now() - overallStart,
  };

  logDualBrainTurn(logEntry);

  // 🆕 v60: 좌뇌 전체 analysis 를 yield (pipeline 에서 pacing_meta 사용)
  if (brainResult.leftBrainAnalysis) {
    yield { type: 'analysis', data: brainResult.leftBrainAnalysis };
  }

  // 메타 정보 yield (pipeline에서 사용)
  yield { type: 'meta', data: logEntry };
}

/**
 * 🆕 v63: 폴백 echo 응답 생성기
 * Brain 실패 시에도 자연스러운 누나 톤으로 응답 (LLM 안 부르고 즉답).
 * 키워드 기반 분기 + 안전한 보수적 멘트.
 */
function generateEchoResponse(userInput: string): string {
  const text = (userInput ?? '').trim();
  if (!text) return '음...|||다시 말해줄래?';

  // 긍정 키워드
  const isPositive = /(좋아|기뻐|행복|설레|생겼|만났|사귀|고백|성공|붙었|합격|뿌듯)/.test(text);
  // 부정/위기 키워드
  const isCrisis = /(죽고싶|자살|살기 싫|끝내고싶)/.test(text);
  const isNegative = /(힘들|짜증|울|싫|헤어|배신|읽씹|싸웠|불안|무서|외로)/.test(text);

  if (isCrisis) {
    return '야 잠깐|||지금 많이 힘든 거 같아|||어디야 너?';
  }
  if (isPositive) {
    return '오 진짜?ㅋㅋ|||어떻게 된 건데?';
  }
  if (isNegative) {
    return '아... 무슨 일이야|||말해봐';
  }
  // 기본: 호기심 표현
  return '오 잠깐|||그게 어떻게 된 건데?';
}

/** 태그만 있는 suffix 생성 헬퍼 */
function assembleTagsOnly(tags: BrainOutput['tags']): string {
  const parts: string[] = [];
  parts.push(`[SITUATION_READ:${tags.SITUATION_READ}]`);
  parts.push(`[LUNA_THOUGHT:${tags.LUNA_THOUGHT}]`);
  parts.push(`[PHASE_SIGNAL:${tags.PHASE_SIGNAL}]`);
  if (tags.SITUATION_CLEAR) {
    parts.push(`[SITUATION_CLEAR:${tags.SITUATION_CLEAR}]`);
  }
  return parts.join('');
}
