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
    // 좌뇌 초안으로 폴백
    if (cleaned.text.length < 5) {
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
  });

  const provider = params.model === 'claude' ? 'anthropic' : 'gemini';
  const modelId = params.model === 'claude'
    ? ANTHROPIC_MODELS.SONNET_4_6
    : GEMINI_MODELS.FLASH_25;

  const fullPromptDump = `${ACE_V5_SYSTEM_PROMPT}\n\n## 우뇌 컨텍스트\n${userMessage}`;

  const msg = `\n================ [🗣️ 우뇌 (Right-Brain) 프로세스 시작] ================\n` +
    `[MODEL]: ${provider} - ${modelId}\n` +
    `[REANALYSIS MODE]: ${params.isReanalysis}\n` +
    `[FULL PROMPT DUMP]:\n${fullPromptDump}\n` +
    `=======================================================================\n`;

  if (logCollector) {
    logCollector.log(msg);
  } else {
    console.log(msg);
  }

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
