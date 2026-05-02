/**
 * 🎭 ACE v5 오케스트레이터
 *
 * 흐름:
 *   1. 좌뇌 분석 → 핸드오프 빌드
 *   2. ACE v5 시스템 프롬프트 + 동적 컨텍스트 조립
 *   3. Claude/Gemini 스트리밍 호출
 *   4. 🆕 v91: 진짜 스트리밍 — head-buffer (REQUEST_REANALYSIS / 사고누설 감지) 통과 시 chunk 즉시 yield
 *   5. 스트림 중 [REQUEST_REANALYSIS] 감지 시 좌뇌 재분석 → Claude 재호출 (스트리밍)
 *   6. 메타 발화 제거 + 태그 첨부
 */

import { streamWithProvider, ANTHROPIC_MODELS, GEMINI_MODELS } from '@/lib/ai/provider-registry';
import { analyzeLeftBrain } from '@/engines/left-brain';
import { LogCollector } from '@/lib/utils/logger';

import { logEnginePrompt } from '@/lib/utils/engine-prompt-logger';
import { ACE_V5_SYSTEM_PROMPT, buildAceV5UserMessage } from './ace-system-prompt';
import { buildHandoff, formatHandoffForPrompt, mergeMemoryIntoHandoff } from './handoff-builder';
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
// 🆕 v76: thinking_level 동적 결정 — complexity + crisis + reanalysis 기반
// ============================================================

/**
 * 🆕 v90: 우뇌(ACE v5) thinkingLevel — 연애 상담 카톡 앱 특성에 맞게 재조정
 *
 * 우뇌의 역할 = 좌뇌가 만든 draft 를 카톡 스타일로 표현/연출 변환
 *  (DELAY/TYPING/STICKER/FX 태그 부착, 말투 다듬기)
 *  → reasoning 깊이 거의 불필요. 좌뇌가 이미 7D 분석 + 판단 + draft 다 함.
 *
 * 기존 분포의 문제:
 *  - complexity 3 (대부분 턴) → 'low' = 매 턴 +0.5~1.5s reasoning 낭비
 *  - complexity 5/위기/재분석 → 'high' = +3~8s 폭탄
 *  - 우뇌 reasoning 강하면 좌뇌 draft 재의심 → REQUEST_REANALYSIS 빈발 → 더 느려짐
 *
 * v90 분포:
 *  - 평소(complexity 1~4) → 'minimal' (reasoning 사실상 없음, 빠름)
 *  - 위기/재분석/극도 복잡(c=5) → 'low' (만약을 위한 약간의 reasoning)
 *
 * 절감: 평균 1-2초/턴, 최악 3-7초. 품질 영향 거의 0 (좌뇌가 분석 본업).
 */
function pickThinkingLevel(
  leftBrain: any,
  isReanalysis: boolean,
): 'minimal' | 'low' | 'medium' | 'high' {
  // 위기 / 재분석 / 극도 복잡한 턴만 약간의 reasoning
  if (isReanalysis) return 'low';
  if (leftBrain?.derived_signals?.crisis_risk) return 'low';
  const complexity = leftBrain?.complexity ?? 3;
  if (complexity >= 5) return 'low';
  // 그 외 모든 표현 변환 작업은 minimal — 좌뇌가 분석 끝냄
  return 'minimal';
}

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
// 🆕 v91: head-buffer 상수 — 진짜 스트리밍 안전망
// ============================================================

/** head-buffer 도입 임계 (이 길이/조건 충족 시 스트리밍 시작) */
const HEAD_BUFFER_LIMIT = 80;

/**
 * 사고 노출(reasoning leak) 패턴 — 응답 시작에 나오면 스트리밍 중단하고 폴백
 * (validateAceResponse 의 REASONING_LEAK_PATTERNS 와 매칭)
 */
const EARLY_LEAK_RE = /(트랙\s*[A-Da-d]\b|후보\s*\d|좌뇌\s*(말대로|분석|직감|확신)|머릿속에서|[🫀🧠🔍💬])/;

/** 재분석 요청 패턴 — head-buffer 에서 검출 즉시 abort */
const REANALYSIS_HEAD_RE = /^\s*\[REQUEST_REANALYSIS/i;

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
 *   { type: 'text', data: chunk }      - 텍스트 청크 (🆕 v91: 진짜 스트리밍)
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
  // 🆕 v76: buildHandoff + memoryBundle 병합 (pipeline 에서 미리 로드한 장기 기억)
  // 🆕 v77: intimacy_state 도 함께 주입
  const baseHandoff = buildHandoff(input.leftBrain);
  const handoff = input.memoryBundle
    ? mergeMemoryIntoHandoff(
        baseHandoff,
        input.memoryBundle,
        input.memoryBundle.longTermImpression,
        input.memoryBundle.intimacyState,
      )
    : baseHandoff;
  const handoffText = formatHandoffForPrompt(handoff, input.completedEvents);

  // ────────────────────────────────────────
  // 2단계: 1차 우뇌 호출 — 🆕 v91: head-buffer 스트리밍
  // ────────────────────────────────────────
  const selectedModel: 'gemini' | 'claude' = input.model ?? 'gemini';
  const isReanalysis = input.alreadyReanalyzed === true;

  const firstCallParams: SingleCallParams = {
    userUtterance: input.userUtterance,
    handoffText,
    recentLunaActions: input.recentLunaActions,
    intimacyLevel: input.intimacyLevel,
    phase: input.phase,
    isReanalysis,
    model: selectedModel,
    metaAwareness: (input.leftBrain as any)?.meta_awareness ?? null,
    previousLunaText: input.previousLunaText ?? null,
    selfExpression: passSelfExpression((input.leftBrain as any)?.self_expression),
    thinkingLevel: pickThinkingLevel(input.leftBrain, isReanalysis),
    chatHistory: input.chatHistory,
    // 🆕 v104: 활성 정령 가이드 (선택)
    activeSpiritsHint: input.activeSpiritsHint ?? null,
  };

  let buffer = '';
  let streamingMode = false;
  let aborted = false;
  let firstCallFullText = '';
  let firstCallLatency = 0;
  let firstCallTokensIn = 0;
  let firstCallTokensOut = 0;

  for await (const ev of streamVoiceOnceGen(firstCallParams, logCollector)) {
    if (ev.type === 'final') {
      firstCallFullText = ev.data.fullText;
      firstCallLatency = ev.data.latencyMs;
      firstCallTokensIn = ev.data.tokensIn;
      firstCallTokensOut = ev.data.tokensOut;
      break;
    }
    if (aborted) continue;

    if (!streamingMode) {
      buffer += ev.data;
      // head-buffer 안전 검출
      if (REANALYSIS_HEAD_RE.test(buffer) || EARLY_LEAK_RE.test(buffer)) {
        aborted = true;
        continue;
      }
      // 첫 ||| 도착 OR 임계 도달 → 스트리밍 시작 (첫 글자 즉시 노출)
      if (buffer.includes('|||') || buffer.length >= HEAD_BUFFER_LIMIT) {
        streamingMode = true;
        yield { type: 'text', data: buffer };
        buffer = '';
      }
    } else {
      yield { type: 'text', data: ev.data };
    }
  }

  // 매우 짧은 응답: 스트리밍 시작 못했고 abort 도 아닌 경우 — 마지막 flush
  if (!streamingMode && !aborted && buffer.length > 0) {
    streamingMode = true;
    yield { type: 'text', data: buffer };
    buffer = '';
  }

  // ────────────────────────────────────────
  // 3단계: 후처리 분기 — abort vs 정상 스트리밍
  // ────────────────────────────────────────
  let finalText: string;
  let voiceLatencyMs = firstCallLatency;
  let totalTokensIn = firstCallTokensIn;
  let totalTokensOut = firstCallTokensOut;
  let reanalysisRequested = false;
  let reanalysisReason: string | undefined;

  if (aborted) {
    // 4단계: REQUEST_REANALYSIS or 사고누설 감지 → 원래 처리 경로
    const reanalysisCheck = detectReanalysisRequest(firstCallFullText);

    if (reanalysisCheck.detected && !input.alreadyReanalyzed) {
      reanalysisRequested = true;
      reanalysisReason = reanalysisCheck.reason;
      const msg = `[ACEv5] ↩️ 재요청 감지: ${reanalysisReason}`;
      if (logCollector) logCollector.log(msg);
      else console.log(msg);

      const refinedAnalysis = await analyzeLeftBrain({
        userUtterance: input.userUtterance,
        sessionId: input.sessionId,
        turnIdx: input.turnIdx,
        recentTrajectory: [],
        phase: input.phase,
        intimacyLevel: input.intimacyLevel,
      }, logCollector);

      if (refinedAnalysis.analysis) {
        const refinedHandoff = buildHandoff(refinedAnalysis.analysis);
        const refinedHandoffText =
          `### ⚠️ 우뇌 의심사항 반영\n${reanalysisCheck.reason}\n\n` +
          formatHandoffForPrompt(refinedHandoff, input.completedEvents);

        // 🆕 v91: 재분석 호출도 스트리밍 (head-buffer 없이 — 재분석은 신뢰)
        let secondText = '';
        let secondLatency = 0;
        let secondTokensIn = 0;
        let secondTokensOut = 0;
        for await (const ev of streamVoiceOnceGen({
          ...firstCallParams,
          handoffText: refinedHandoffText,
          isReanalysis: true,
          model: 'claude',
          metaAwareness: (refinedAnalysis.analysis as any)?.meta_awareness ?? null,
          selfExpression: passSelfExpression((refinedAnalysis.analysis as any)?.self_expression),
          thinkingLevel: 'high',
        }, logCollector)) {
          if (ev.type === 'final') {
            secondText = ev.data.fullText;
            secondLatency = ev.data.latencyMs;
            secondTokensIn = ev.data.tokensIn;
            secondTokensOut = ev.data.tokensOut;
          } else {
            // 재분석 응답은 즉시 chunk 흘림
            yield { type: 'text', data: ev.data };
          }
        }
        finalText = secondText;
        voiceLatencyMs += secondLatency;
        totalTokensIn += secondTokensIn;
        totalTokensOut += secondTokensOut;
      } else {
        // 재분석 실패 → 깨끗한 텍스트 또는 draft 폴백
        finalText = reanalysisCheck.cleanText.length >= 5 ? reanalysisCheck.cleanText : (handoff.draft || '...');
        const cleaned = cleanResponseText(finalText);
        finalText = cleaned.text;
        yield { type: 'text', data: finalText };
      }
    } else {
      // 사고누설 감지 → handoff.draft 강제 폴백
      console.warn(`[ACEv5:v91] 🚨 head-buffer abort → 좌뇌 draft 폴백 ("${handoff.draft?.slice(0, 40)}")`);
      finalText = handoff.draft || '...';
      yield { type: 'text', data: finalText };
    }
  } else {
    // 정상 스트리밍 완료 — 끝에서 검증 + 태그 추가
    finalText = firstCallFullText;
  }

  // ────────────────────────────────────────
  // 5단계: 후처리 — 검증 / 힌트 추출 / 태그 첨부
  // ────────────────────────────────────────
  // 정상 스트리밍이면 firstCallFullText 그대로, abort 폴백이면 위에서 finalText 갱신됨
  const cleaned = cleanResponseText(finalText);
  const validation = validateAceResponse(cleaned.text);
  const correction = detectSelfCorrection(cleaned.text);

  if (!validation.passed && aborted) {
    // abort 경로에서만 폴백 가능 (정상 스트리밍은 이미 사용자 화면에 송출됨)
    const msg = `[ACEv5] ⚠️ 품질 검증 실패: ${validation.issues.join(', ')}`;
    if (logCollector) logCollector.log(msg);
    else console.warn(msg);

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
  // 6단계: 태그 첨부
  //   - 정상 스트리밍: 본문은 이미 송출됨 → 태그 suffix 만 별도 yield (본문에 이미 들어있는 태그는 dedupe)
  //   - abort 폴백: finalText 만 yield 했으므로 태그도 별도 yield 해서 pipeline 메타 파싱 보장
  // ────────────────────────────────────────
  const finalWithTags = appendTagsToResponse(finalText, handoff.tags);

  if (streamingMode && !aborted) {
    // 스트리밍 본문(firstCallFullText)에 이미 들어있는 태그는 제외하고 누락분만 yield
    const tagSuffix = appendTagsToResponse(firstCallFullText, handoff.tags).slice(firstCallFullText.trim().length);
    if (tagSuffix.length > 0) {
      yield { type: 'text', data: tagSuffix };
    }
  } else if (aborted) {
    // 폴백 응답에 태그 suffix 추가 — pipeline 이 SITUATION_READ/LUNA_THOUGHT/PHASE_SIGNAL 메타 파싱
    const tagSuffix = appendTagsToResponse(finalText, handoff.tags).slice(finalText.trim().length);
    if (tagSuffix.length > 0) {
      yield { type: 'text', data: tagSuffix };
    }
  }

  // 🆕 v63: ACE 출력 디버그
  console.log('[ACE:finalText]', {
    model: input.model,
    finalTextLen: finalText?.length ?? 0,
    finalWithTagsLen: finalWithTags?.length ?? 0,
    reanalysisRequested,
    aborted,
    streamingMode,
    isEmpty: !finalWithTags || finalWithTags.trim().length === 0,
  });

  // ────────────────────────────────────────
  // 7단계: 메타
  // ────────────────────────────────────────
  const meta: AceV5Output = {
    fullText: finalWithTags,
    reanalysisRequested,
    reanalysisReason,
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
// Voice 호출 (스트리밍 generator) — 🆕 v91
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
  /** 🆕 v76: Gemini 3 reasoning 강도 (gemini 모델일 때만 사용) */
  thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
  /** 🆕 v78: 대화 히스토리 — 치매 방지. 우뇌가 직접 맥락 봄. */
  chatHistory?: Array<{ role: 'user' | 'ai'; content: string }>;
  /** 🆕 v104: 활성 정령 가이드 (방 Lv3+ 정령 시그니처 카드 발동 안내) */
  activeSpiritsHint?: string | null;
}

interface SingleCallResult {
  fullText: string;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
}

type StreamGenYield =
  | { type: 'chunk'; data: string }
  | { type: 'final'; data: SingleCallResult };

/**
 * 🆕 v91: ACE v5 1회 우뇌 호출 (진짜 스트리밍 generator).
 * 각 chunk 를 즉시 yield → caller 가 head-buffer 또는 즉시 송출 결정.
 * 종료 시 'final' 로 누적 결과 1회 yield.
 *
 * model='gemini' → Gemini 3 Flash (90% 상황, 저비용, reasoning native)
 * model='claude' → Claude Sonnet 4.6 (10% 고복잡도)
 */
async function* streamVoiceOnceGen(
  params: SingleCallParams,
  _logCollector?: LogCollector,
): AsyncGenerator<StreamGenYield> {
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
    chatHistory: params.chatHistory,
    activeSpiritsHint: params.activeSpiritsHint ?? null,
  });

  const provider = params.model === 'claude' ? 'anthropic' : 'gemini';
  const modelId = params.model === 'claude'
    ? ANTHROPIC_MODELS.SONNET_4_6
    : GEMINI_MODELS.FLASH_3;

  const thinkingLevel = params.thinkingLevel ?? 'minimal';

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
      thinkingLevel: provider === 'gemini' ? thinkingLevel : undefined,
    },
  });

  const stream = streamWithProvider(
    provider,
    ACE_V5_SYSTEM_PROMPT,
    [{ role: 'user' as const, content: userMessage }],
    'sonnet',
    600,
    modelId,
    undefined,
    provider === 'gemini' ? { thinkingLevel, includeThoughts: false } : undefined,
  );

  let fullText = '';
  for await (const chunk of stream) {
    if (typeof chunk === 'string') {
      fullText += chunk;
      yield { type: 'chunk', data: chunk };
    }
  }

  yield {
    type: 'final',
    data: {
      fullText,
      latencyMs: Date.now() - t0,
      tokensIn: estimateTokens(ACE_V5_SYSTEM_PROMPT) + estimateTokens(userMessage),
      tokensOut: estimateTokens(fullText),
    },
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
