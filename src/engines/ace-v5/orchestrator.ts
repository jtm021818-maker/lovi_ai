/**
 * 🎭 ACE v5 오케스트레이터
 *
 * 흐름:
 *   1. 좌뇌 분석 → 핸드오프 빌드
 *   2. ACE v5 시스템 프롬프트 + 동적 컨텍스트 조립
 *   3. Claude 스트리밍 호출
 *   4. 스트리밍 중 [REQUEST_REANALYSIS] 감지 시 좌뇌 재분석
 *   5. 재호출 (최대 1회)
 *   6. 메타 발화 제거 + 태그 첨부
 */

import { streamWithProvider, ANTHROPIC_MODELS, GEMINI_MODELS } from '@/lib/ai/provider-registry';
import { analyzeLeftBrain } from '@/engines/left-brain';
import { LogCollector } from '@/lib/utils/logger';

import { logEnginePrompt } from '@/lib/utils/engine-prompt-logger';
import { ACE_V5_SYSTEM_PROMPT, buildAceV5UserMessage } from './ace-system-prompt';
import { buildHandoff, formatHandoffForPrompt } from './handoff-builder';
import {
  detectReanalysisRequest,
  detectLeftBrainHints,         // 🆕 v57
  detectSelfCorrection,
  cleanResponseText,
  validateAceResponse,
  appendTagsToResponse,
} from './reanalysis-handler';
import type { AceV5Input, AceV5Output } from './types';

// ============================================================
// 🆕 v74: 좌뇌 self_expression pass-through (LLM 판단 그대로 전달)
// ============================================================

/**
 * 좌뇌가 자체 판단한 self_expression 을 그대로 우뇌에 전달.
 * 코드 휴리스틱 없음 — LLM 이 맥락 이해로 결정.
 * 시그널이 전혀 없으면 null (우뇌 프롬프트 부하 경감).
 */
function passSelfExpression(llm: any): {
  should_express_thought: boolean;
  projection_seed: string | null;
  consecutive_questions_last3: number;
  must_avoid_question: boolean;
  self_disclosure_opportunity: string | null;
} | null {
  if (!llm) return null;
  const hasSignal =
    llm.should_express_thought === true ||
    llm.must_avoid_question === true ||
    (typeof llm.projection_seed === 'string' && llm.projection_seed.trim().length > 0);
  if (!hasSignal) return null;

  return {
    should_express_thought: llm.should_express_thought === true,
    projection_seed: typeof llm.projection_seed === 'string' && llm.projection_seed.trim().length > 0
      ? llm.projection_seed
      : null,
    consecutive_questions_last3: typeof llm.consecutive_questions_last3 === 'number'
      ? llm.consecutive_questions_last3
      : 0,
    must_avoid_question: llm.must_avoid_question === true,
    self_disclosure_opportunity: typeof llm.self_disclosure_opportunity === 'string' && llm.self_disclosure_opportunity.trim().length > 0
      ? llm.self_disclosure_opportunity
      : null,
  };
}

// ============================================================
// 메인 스트리밍 함수
// ============================================================

export interface AceV5StreamYield {
  type: 'text' | 'meta';
  data: any;
}

/**
 * ACE v5 실행 (스트리밍)
 *
 * yield:
 *   { type: 'text', data: chunk }      - 텍스트 청크
 *   { type: 'meta', data: AceV5Output } - 최종 메타 (마지막에 1회)
 */
export async function* executeAceV5(
  input: AceV5Input,
  logCollector?: LogCollector,
): AsyncGenerator<AceV5StreamYield> {
  const overallStart = Date.now();

  // ────────────────────────────────────────
  // 1단계: 핸드오프 조립
  // ────────────────────────────────────────
  const handoff = buildHandoff(input.leftBrain);
  const handoffText = formatHandoffForPrompt(handoff);

  // ────────────────────────────────────────
  // 2단계: 1차 우뇌 호출 (model 선택, 기본 gemini)
  // ────────────────────────────────────────
  const selectedModel: 'gemini' | 'claude' = input.model ?? 'gemini';
  const firstCallResult = await streamVoiceOnce({
    userUtterance: input.userUtterance,
    handoffText,
    recentLunaActions: input.recentLunaActions,
    intimacyLevel: input.intimacyLevel,
    phase: input.phase,
    isReanalysis: input.alreadyReanalyzed === true,
    model: selectedModel,
    onChunk: undefined,
    metaAwareness: (input.leftBrain as any)?.meta_awareness ?? null,
    previousLunaText: input.previousLunaText ?? null,
    selfExpression: passSelfExpression((input.leftBrain as any)?.self_expression),
  }, logCollector);

  // ────────────────────────────────────────
  // 3단계: 재요청 감지
  // ────────────────────────────────────────
  const reanalysisCheck = detectReanalysisRequest(firstCallResult.fullText);

  let finalText: string;
  let voiceLatencyMs = firstCallResult.latencyMs;
  let reanalysisRequested = false;
  let reanalysisReason: string | undefined;
  let totalTokensIn = firstCallResult.tokensIn;
  let totalTokensOut = firstCallResult.tokensOut;

  if (reanalysisCheck.detected && !input.alreadyReanalyzed) {
    // ────────────────────────────────────────
    // 4단계: 좌뇌 재분석 (강화 모드)
    // ────────────────────────────────────────
    reanalysisRequested = true;
    reanalysisReason = reanalysisCheck.reason;
    const msg = `[ACEv5] ↩️ 재요청 감지: ${reanalysisReason}`;
    if (logCollector) logCollector.log(msg);
    else console.log(msg);

    const refinedAnalysis = await analyzeLeftBrain({
      userUtterance: input.userUtterance,
      sessionId: input.sessionId,
      turnIdx: input.turnIdx,
      recentTrajectory: [],   // TODO: 세션 스토어 연동
      phase: input.phase,
      intimacyLevel: input.intimacyLevel,
    }, logCollector);

    if (refinedAnalysis.analysis) {
      // 재핸드오프
      const refinedHandoff = buildHandoff(refinedAnalysis.analysis);
      // claudeConcern을 핸드오프 텍스트에 prepend
      const refinedHandoffText =
        `### ⚠️ 우뇌 의심사항 반영\n${reanalysisCheck.reason}\n\n` +
        formatHandoffForPrompt(refinedHandoff);

      // 5단계: 재호출 (재분석은 Claude 강제 — 더 깊은 사고)
      const secondCallResult = await streamVoiceOnce({
        userUtterance: input.userUtterance,
        handoffText: refinedHandoffText,
        recentLunaActions: input.recentLunaActions,
        intimacyLevel: input.intimacyLevel,
        phase: input.phase,
        isReanalysis: true,
        model: 'claude',    // 재요청은 Claude 로 고정
        onChunk: undefined,
        metaAwareness: (refinedAnalysis.analysis as any)?.meta_awareness ?? null,
        previousLunaText: input.previousLunaText ?? null,
        selfExpression: passSelfExpression((refinedAnalysis.analysis as any)?.self_expression),
      }, logCollector);

      finalText = secondCallResult.fullText;
      voiceLatencyMs += secondCallResult.latencyMs;
      totalTokensIn += secondCallResult.tokensIn;
      totalTokensOut += secondCallResult.tokensOut;
    } else {
      // 재분석 실패 → 원본 핸드오프로 응답 생성 (최후 수단)
      finalText = reanalysisCheck.cleanText || handoff.draft;
    }
  } else {
    // 재요청 없음 → 1차 응답 그대로
    finalText = reanalysisCheck.cleanText;
  }

  // ────────────────────────────────────────
  // 6단계: 메타 발화 제거 + 검증
  // ────────────────────────────────────────
  const cleaned = cleanResponseText(finalText);
  const validation = validateAceResponse(cleaned.text);
  const correction = detectSelfCorrection(cleaned.text);

  if (!validation.passed) {
    const msg = `[ACEv5] ⚠️ 품질 검증 실패: ${validation.issues.join(', ')}`;
    if (logCollector) logCollector.log(msg);
    else console.warn(msg);

    // 🆕 v73: reasoning_leak (사고 노출) 감지 시 무조건 좌뇌 draft 로 폴백
    //   cleaned.text 에 🫀/트랙/후보 등 사고 흔적이 남아 있으면 유저 노출 → 치명
    const hasLeak = validation.issues.some((i) => i.includes('reasoning_leak'));
    if (hasLeak) {
      console.warn(`[ACEv5:v73] 🚨 reasoning_leak → 좌뇌 draft 강제 폴백 ("${handoff.draft?.slice(0, 40)}")`);
      finalText = handoff.draft || '...';
    } else if (cleaned.text.length < 5) {
      finalText = handoff.draft;
    } else {
      finalText = cleaned.text;
    }
  } else {
    finalText = cleaned.text;
  }

  // 🆕 v57: LEFT_BRAIN_HINT 추출 (다음 턴 좌뇌에 전달용)
  const hintExtraction = detectLeftBrainHints(finalText);
  finalText = hintExtraction.cleanText;
  const leftBrainHints = hintExtraction.hints;

  // ────────────────────────────────────────
  // 7단계: 태그 첨부
  // ────────────────────────────────────────
  const finalWithTags = appendTagsToResponse(finalText, handoff.tags);

  // ────────────────────────────────────────
  // 8단계: 텍스트 yield (한 번에)
  // ACE v5는 진정한 스트리밍이 아닌 "버퍼링 후 전송"
  // (재요청 감지 위해 어차피 끝까지 받아야 함)
  // ────────────────────────────────────────
  // 🆕 v63: ACE 출력 디버그 — 빈 응답 케이스 추적
  console.log('[ACE:finalText]', {
    model: input.model,
    finalTextLen: finalText?.length ?? 0,
    finalWithTagsLen: finalWithTags?.length ?? 0,
    reanalysisRequested,
    isEmpty: !finalWithTags || finalWithTags.trim().length === 0,
  });
  yield { type: 'text', data: finalWithTags };

  // ────────────────────────────────────────
  // 9단계: 메타
  // ────────────────────────────────────────
  const meta: AceV5Output = {
    fullText: finalWithTags,
    reanalysisRequested,
    reanalysisReason,
    // 🆕 v57: 우뇌가 다음 턴 좌뇌에 남기는 힌트
    left_brain_hints_for_next_turn: leftBrainHints.length > 0 ? leftBrainHints : undefined,
    meta: {
      latencyMs: Date.now() - overallStart,
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      estimatedCost: estimateAceCost(totalTokensIn, totalTokensOut),
      selfCorrectionDetected: correction.detected && correction.naturalness === 'natural',
      pacingHint: handoff.recommended_length === '침묵' ? '한마디' : handoff.recommended_length,
    },
  };

  if (leftBrainHints.length > 0) {
    const msg = `[ACEv5] ↩️ 좌뇌 힌트 ${leftBrainHints.length}개 추출: ${leftBrainHints.join(', ')}`;
    if (logCollector) logCollector.log(msg);
    else console.log(msg);
  }

  yield { type: 'meta', data: meta };
}

// ============================================================
// Claude 1회 호출 (스트리밍)
// ============================================================

interface SingleCallParams {
  userUtterance: string;
  handoffText: string;
  recentLunaActions?: string[];
  intimacyLevel: number;
  phase: string;
  isReanalysis: boolean;
  /** 🆕 v56: 우뇌 모델 선택 */
  model: 'gemini' | 'claude';
  onChunk?: (chunk: string) => void;
  /** 🆕 v73+74: 메타-자각 (+ too_many_questions) */
  metaAwareness?: {
    user_meta_complaint: boolean;
    complaint_type: 'confusion' | 'off_topic' | 'repeat' | 'ignored' | 'too_many_questions' | null;
    last_user_substance_quote: string | null;
    recovery_move: 'self_reference_and_clarify' | 'self_reference_and_express_thought' | null;
  } | null;
  /** 🆕 v73: 직전 루나 응답 (자기-참조용) */
  previousLunaText?: string | null;
  /** 🆕 v74: 자아 표현 신호 */
  selfExpression?: {
    should_express_thought: boolean;
    projection_seed: string | null;
    consecutive_questions_last3: number;
    must_avoid_question: boolean;
    self_disclosure_opportunity: string | null;
  } | null;
}

interface SingleCallResult {
  fullText: string;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
}

/**
 * ACE v5 1회 우뇌 호출 (스트리밍).
 * model='gemini' → Gemini 2.5 Flash (90% 상황, 저비용)
 * model='claude' → Claude Sonnet 4.6 (10% 고복잡도)
 */
async function streamVoiceOnce(params: SingleCallParams, logCollector?: LogCollector): Promise<SingleCallResult> {
  const t0 = Date.now();

  const userMessage = buildAceV5UserMessage({
    userUtterance: params.userUtterance,
    handoffPromptText: params.handoffText,
    recentLunaActions: params.recentLunaActions,
    intimacyLevel: params.intimacyLevel,
    phase: params.phase,
    isReanalysis: params.isReanalysis,
    metaAwareness: params.metaAwareness ?? null,
    previousLunaText: params.previousLunaText ?? null,
    selfExpression: params.selfExpression ?? null,
  });

  const provider = params.model === 'claude' ? 'anthropic' : 'gemini';
  const modelId = params.model === 'claude'
    ? ANTHROPIC_MODELS.SONNET_4_6
    : GEMINI_MODELS.FLASH_25; // 🆕 v74: 2.5 Flash ($0.30) — 메인 상담 모델과 통일 (안정성)

  // 🆕 v64: 통일 디버그 로거 (engine + model + 프롬프트 + 유저 메시지)
  logEnginePrompt({
    engine: 'ACE_V5_RIGHT_BRAIN',
    model: modelId,
    provider,
    systemPrompt: ACE_V5_SYSTEM_PROMPT,
    userMessage,
    extra: {
      reanalysis: !!params.isReanalysis,
      phase: params.phase,
      intimacyLevel: params.intimacyLevel,
    },
  });

  const stream = streamWithProvider(
    provider,
    ACE_V5_SYSTEM_PROMPT,
    [{ role: 'user' as const, content: userMessage }],
    'sonnet',
    600,                            // 응답은 짧게
    modelId,
  );

  let fullText = '';
  for await (const chunk of stream) {
    if (typeof chunk === 'string') {
      fullText += chunk;
      params.onChunk?.(chunk);
    }
  }

  return {
    fullText,
    latencyMs: Date.now() - t0,
    tokensIn: estimateTokens(ACE_V5_SYSTEM_PROMPT) + estimateTokens(userMessage),
    tokensOut: estimateTokens(fullText),
  };
}

// ============================================================
// 헬퍼
// ============================================================

function estimateTokens(text: string): number {
  // 한국어 ~2.5자/토큰
  return Math.ceil(text.length / 2.5);
}

function estimateAceCost(tokensIn: number, tokensOut: number): number {
  // Claude Sonnet 4.6 (캐시 적용)
  // 입력 1M: $3 (캐시 시 $0.30)
  // 출력 1M: $15
  // 시스템 프롬프트는 캐시되므로 ~80% 캐시 적중 가정
  const cachedRatio = 0.8;
  const inputCost = (tokensIn * cachedRatio * 0.30 + tokensIn * (1 - cachedRatio) * 3.0) / 1_000_000;
  const outputCost = (tokensOut * 15.0) / 1_000_000;
  return inputCost + outputCost;
}
