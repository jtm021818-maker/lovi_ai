/**
 * AI 프로바이더 레지스트리 (Gemini 전용)
 *
 * [v52 — Gemini 멀티모델 캐스케이드]
 * 무료 Rate Limit 기반 최적 분배:
 * - 2.5 Flash-Lite: 전체 1순위 (메인 상담 + 이벤트 + 분석)
 * - 2 Flash:        폴백 (RPD 무제한)
 * - 2 Flash-Lite:   경량 분석/검증 (RPD 무제한)
 */

import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';
import { checkProviderRateLimit, recordProviderUsage } from '@/lib/utils/rate-limit';

// ============================================================
// SDK 초기화
// ============================================================
const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

// ============================================================
// 프로바이더 + 모델 타입
// ============================================================
export type Provider = 'gemini' | 'groq' | 'cerebras';
export type ModelTier = 'haiku' | 'sonnet' | 'opus';

export const GEMINI_MODELS = {
  FLASH_3:       'gemini-3-flash',          // 전체 1순위 (신규 고성능 모델)
  FLASH_15:      'gemini-1.5-flash',        // 안정적 폴백
  FLASH_25:      'gemini-3-flash',          // 하위 호환 매핑
  FLASH_LITE_25: 'gemini-3-flash',          // 하위 호환 매핑
  FLASH_LITE_31: 'gemini-1.5-flash',        // 임시 폴백
} as const;

/** 프로바이더별 모델 매핑 (기본 — modelOverride로 재정의 가능) */
const PROVIDER_MODELS: Record<Provider, Record<ModelTier, string>> = {
  gemini: {
    haiku: GEMINI_MODELS.FLASH_3,             // 전체 1순위 고정
    sonnet: GEMINI_MODELS.FLASH_3,            // 전체 1순위 고정
    opus: GEMINI_MODELS.FLASH_15,             // 안정적 폴백: 1.5 Flash
  },
  groq: { 
    haiku: 'llama-3.1-8b-instant', 
    sonnet: 'llama-3.3-70b-versatile', 
    opus: 'llama-3.3-70b-versatile' 
  },
  cerebras: { 
    haiku: 'llama3.1-8b', 
    sonnet: 'llama3.1-70b', 
    opus: 'llama3.1-70b' 
  },
};

/** 전략별 temperature */
const TEMPERATURE: Record<ModelTier, number> = {
  haiku: 0.7,
  sonnet: 0.4,
  opus: 0.3,
};

// ============================================================
// 🆕 v46: 캐스케이드 시도 로그 (브라우저 F12 전송용)
// ============================================================
export interface CascadeAttemptLog {
  provider: Provider;
  tier: ModelTier;
  model: string;
  status: 'success' | 'error' | 'rate_limit' | 'timeout' | 'empty' | 'retry';
  ttfbMs?: number;
  totalMs?: number;
  error?: string;
  attempt?: number;
}

let _cascadeLog: CascadeAttemptLog[] = [];

/** 캐스케이드 로그 초기화 (매 턴 시작 시 호출) */
export function resetCascadeLog(): void { _cascadeLog = []; }

/** 캐스케이드 로그 조회 */
export function getCascadeLog(): CascadeAttemptLog[] { return [..._cascadeLog]; }

function logAttempt(entry: CascadeAttemptLog): void {
  _cascadeLog.push(entry);
  const icon = entry.status === 'success' ? '✅' : entry.status === 'retry' ? '🔄' : '❌';
  console.log(`[Cascade] ${icon} ${entry.provider}/${entry.tier} (${entry.model}) → ${entry.status}${entry.ttfbMs ? ` TTFB:${entry.ttfbMs}ms` : ''}${entry.totalMs ? ` Total:${entry.totalMs}ms` : ''}${entry.error ? ` [${entry.error}]` : ''}`);
}

// ============================================================
// Gemini 호출
// ============================================================
async function geminiGenerate(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number,
  tier: ModelTier = 'sonnet',
  modelOverride?: string
): Promise<string> {
  const model = modelOverride || PROVIDER_MODELS.gemini[tier];
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
    parts: [{ text: m.content }],
  }));

  const MAX_RETRIES = 1;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await gemini.models.generateContent({
        model,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: maxTokens,
          temperature: TEMPERATURE[tier],
        },
        contents,
      });

      const text = response.text ?? '';
      if (!text && attempt < MAX_RETRIES) {
        console.warn(`[Gemini] ⚠️ 빈 응답 — 재시도 ${attempt + 1}/${MAX_RETRIES}`);
        continue;
      }

      recordProviderUsage('gemini');
      return text;
    } catch (err: any) {
      if (attempt < MAX_RETRIES) {
        console.warn(`[Gemini] ⚠️ 에러 → 재시도 ${attempt + 1}/${MAX_RETRIES}:`, err?.message);
        await new Promise(r => setTimeout(r, 500));
        continue;
      }
      throw err;
    }
  }
  return ''; // 여기 도달하면 빈 문자열(캐스케이드가 처리)
}

/** Groq 호출 (v44) */
async function groqGenerate(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number,
  tier: ModelTier = 'sonnet',
  modelOverride?: string
): Promise<string> {
  const model = modelOverride || PROVIDER_MODELS.groq[tier];
  try {
    const response = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      max_tokens: maxTokens,
      temperature: TEMPERATURE[tier],
    });
    recordProviderUsage('groq');
    return response.choices[0]?.message?.content || '';
  } catch (err: any) {
    console.error(`[Groq] Error (${model}):`, err?.message);
    throw err;
  }
}

/** Cerebras 호출 (v47) */
async function cerebrasGenerate(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number,
  tier: ModelTier = 'sonnet',
  modelOverride?: string
): Promise<string> {
  const model = modelOverride || PROVIDER_MODELS.cerebras[tier];
  try {
    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        max_tokens: maxTokens,
        temperature: TEMPERATURE[tier],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Cerebras API Error: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    recordProviderUsage('cerebras');
    return data.choices?.[0]?.message?.content || '';
  } catch (err: any) {
    console.error(`[Cerebras] Error (${model}):`, err?.message);
    throw err;
  }
}

async function* geminiStream(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number,
  tier: ModelTier = 'sonnet',
  onRetry?: (event: RetryStatusEvent) => void,
  modelOverride?: string,
): AsyncGenerator<string> {
  const model = modelOverride || PROVIDER_MODELS.gemini[tier];
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
    parts: [{ text: m.content }],
  }));

  const MAX_RETRIES_503 = 4;
  const MAX_RETRIES_OTHER = 1;
  let currentMax = MAX_RETRIES_OTHER;

  for (let attempt = 0; attempt <= currentMax; attempt++) {
    try {
      const response = await gemini.models.generateContentStream({
        model,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: maxTokens,
          temperature: TEMPERATURE[tier],
        },
        contents,
      });

      let yieldedAny = false;
      for await (const chunk of response) {
        const text = chunk.text;
        if (text) {
          yieldedAny = true;
          yield text;
        }
      }

      if (!yieldedAny && attempt < currentMax) {
        console.warn(`[Gemini] ⚠️ 빈 응답 — 재시도 ${attempt + 1}/${currentMax + 1}`);
        continue;
      }

      recordProviderUsage('gemini');
      return;
    } catch (err: any) {
      const is503 = err?.status === 503 || err?.code === 503 || err?.message?.includes('503');
      // 503 첫 감지 시 최대 재시도 횟수를 5회로 확장
      if (is503 && currentMax < MAX_RETRIES_503) {
        currentMax = MAX_RETRIES_503;
      }

      if (attempt < currentMax) {
        const delayMs = is503
          ? Math.min(2000 * (attempt + 1), 5000) // 503: 2초→4초→5초→5초
          : 500 * (attempt + 1);
        console.warn(`[Gemini] ⚠️ 스트리밍 에러 → 재시도 ${attempt + 1}/${currentMax + 1} (${delayMs}ms 대기):`, err?.message?.slice(0, 80));
        // 🆕 v49: 503 재시도 UI 알림
        if (is503 && onRetry) {
          const RETRY_503_MESSAGES = [
            '루나가 생각을 정리하고 있어... 🦊',
            '서버가 좀 바쁜가봐, 잠시만...! 💭',
            '거의 다 됐어! 조금만 더... ✨',
            '포기 안 해! 기다려줘~! 💜',
            '마지막으로 한번 더...! 🔥',
          ];
          onRetry({
            provider: 'gemini',
            attempt: attempt + 1,
            maxAttempts: currentMax + 1,
            reason: 'error',
            message: RETRY_503_MESSAGES[Math.min(attempt, RETRY_503_MESSAGES.length - 1)],
          });
        }
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }
      throw err;
    }
  }
}

// ============================================================
// Public API — Gemini 전용
// ============================================================

/** 특정 프로바이더로 생성 (Gemini 전용, modelOverride로 모델 지정 가능) */
export async function generateWithProvider(
  provider: Provider,
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  tier: ModelTier = 'sonnet',
  maxTokens: number = 1024,
  modelOverride?: string
): Promise<string> {
  if (provider === 'groq') {
    return groqGenerate(systemPrompt, messages, maxTokens, tier, modelOverride);
  }
  if (provider === 'cerebras') {
    return cerebrasGenerate(systemPrompt, messages, maxTokens, tier, modelOverride);
  }
  return geminiGenerate(systemPrompt, messages, maxTokens, tier, modelOverride);
}

/** 특정 프로바이더로 스트리밍 (Gemini 전용, modelOverride로 모델 지정 가능) */
export async function* streamWithProvider(
  _provider: Provider,
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  tier: ModelTier = 'sonnet',
  maxTokens: number = 1024,
  modelOverride?: string,
  onRetry?: (event: RetryStatusEvent) => void,
): AsyncGenerator<string> {
  yield* geminiStream(systemPrompt, messages, maxTokens, tier, onRetry, modelOverride);
}

/** 🆕 v31: 타임아웃 헬퍼 — Promise.race로 최대 대기시간 제한 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`[Timeout] ${label} ${ms}ms 초과`)), ms)
    ),
  ]);
}

/** 캐스케이드 호출 — 4단계 폴백 체인 (🆕 v31: 8초 타임아웃, v46: 상세 로그) */
export async function generateWithCascade(
  chain: { provider: Provider; tier: ModelTier; modelOverride?: string }[],
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number = 1024
): Promise<{ text: string; usedProvider: Provider; usedTier: ModelTier }> {
  for (const { provider, tier, modelOverride } of chain) {
    const actualModel = modelOverride || PROVIDER_MODELS[provider][tier];
    const limit = checkProviderRateLimit(provider);
    if (!limit.allowed) {
      logAttempt({ provider, tier, model: actualModel, status: 'rate_limit' });
      continue;
    }

    const t0 = Date.now();
    try {
      const text = await withTimeout(
        generateWithProvider(provider, systemPrompt, messages, tier, maxTokens, modelOverride),
        8000,
        `${provider}/${tier}`
      );
      logAttempt({ provider, tier, model: actualModel, status: 'success', totalMs: Date.now() - t0 });
      return { text, usedProvider: provider, usedTier: tier };
    } catch (err: any) {
      const isTimeout = err?.message?.includes('Timeout');
      const is429 = err?.status === 429 || err?.code === 429;
      logAttempt({
        provider, tier, model: actualModel,
        status: isTimeout ? 'timeout' : is429 ? 'rate_limit' : 'error',
        totalMs: Date.now() - t0,
        error: err?.message?.slice(0, 100),
      });
      continue;
    }
  }

  // 모든 폴백 실패 시 마지막 체인 강제 시도
  const last = chain[chain.length - 1];
  const lastModel = last.modelOverride || PROVIDER_MODELS[last.provider][last.tier];
  const t0 = Date.now();
  try {
    const text = await generateWithProvider(last.provider, systemPrompt, messages, last.tier, maxTokens, last.modelOverride);
    logAttempt({ provider: last.provider, tier: last.tier, model: lastModel, status: 'success', totalMs: Date.now() - t0 });
    return { text, usedProvider: last.provider, usedTier: last.tier };
  } catch (err: any) {
    logAttempt({ provider: last.provider, tier: last.tier, model: lastModel, status: 'error', totalMs: Date.now() - t0, error: err?.message?.slice(0, 100) });
    throw err;
  }
}

/** 🆕 v48: 재시도 상태 콜백 타입 — UI에서 재시도 진행상황 표시용 */
export interface RetryStatusEvent {
  provider: Provider;
  attempt: number;
  maxAttempts: number;
  reason: 'timeout' | 'error' | 'empty' | 'rate_limit';
  message: string;
}

/** 캐스케이드 스트리밍 — 4단계 폴백 체인 (🆕 v48: 재시도 UI 이벤트, TTFB 30초 타임아웃) */
/** yield 타입: 문자열(텍스트 청크) 또는 RetryStatusEvent(재시도 알림) */
export type CascadeStreamChunk = string | { __retry: RetryStatusEvent };

export async function* streamWithCascade(
  chain: { provider: Provider; tier: ModelTier; modelOverride?: string }[],
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number = 1024
): AsyncGenerator<CascadeStreamChunk> {
  let cascadeAttempt = 0;
  const totalProviders = chain.length;

  for (const { provider, tier, modelOverride } of chain) {
    cascadeAttempt++;
    const actualModel = modelOverride || PROVIDER_MODELS[provider][tier];
    const limit = checkProviderRateLimit(provider);
    if (!limit.allowed) {
      logAttempt({ provider, tier, model: actualModel, status: 'rate_limit' });
      yield { __retry: {
        provider, attempt: cascadeAttempt, maxAttempts: totalProviders,
        reason: 'rate_limit' as const,
        message: '잠깐, 다시 정리해볼게...',
      }} as CascadeStreamChunk;
      continue;
    }

    let hasYieldedAny = false;
    const startTime = Date.now();
    let ttfbMs: number | undefined;
    // 🆕 v49: Gemini 내부 503 재시도 이벤트를 수집하는 버퍼
    const internalRetryBuf: RetryStatusEvent[] = [];
    const internalRetryCallback = (evt: RetryStatusEvent) => { internalRetryBuf.push(evt); };
    try {
      const gen = streamWithProvider(provider, systemPrompt, messages, tier, maxTokens, modelOverride, internalRetryCallback);
      const TTFB_TIMEOUT_MS = 30000;

      for await (const chunk of wrapWithTTFBTimeout(gen, TTFB_TIMEOUT_MS, `${provider}/${tier}`)) {
        // 내부 재시도 이벤트 먼저 flush (Gemini 503 재시도 후 성공 시)
        while (internalRetryBuf.length > 0) {
          yield { __retry: internalRetryBuf.shift()! } as CascadeStreamChunk;
        }
        if (!hasYieldedAny) {
          ttfbMs = Date.now() - startTime;
        }
        hasYieldedAny = true;
        yield chunk;
      }
      logAttempt({ provider, tier, model: actualModel, status: 'success', ttfbMs, totalMs: Date.now() - startTime });
      return;
    } catch (err: any) {
      if (hasYieldedAny) {
        logAttempt({ provider, tier, model: actualModel, status: 'success', ttfbMs, totalMs: Date.now() - startTime, error: `부분전송 후 에러: ${err?.message?.slice(0, 60)}` });
        return;
      }
      const isTimeout = err?.message?.includes('TTFB Timeout');
      const is429 = err?.status === 429 || err?.code === 429;
      logAttempt({
        provider, tier, model: actualModel,
        status: isTimeout ? 'timeout' : is429 ? 'rate_limit' : 'error',
        totalMs: Date.now() - startTime,
        error: err?.message?.slice(0, 100),
      });
      // 🆕 v49: Gemini 내부 503 재시도 이벤트 flush (실패했어도 UI에 표시)
      while (internalRetryBuf.length > 0) {
        yield { __retry: internalRetryBuf.shift()! } as CascadeStreamChunk;
      }
      // 재시도 UI 이벤트 — 에러 유형별 메시지
      const is503 = err?.status === 503 || err?.code === 503 || err?.message?.includes('503');
      const RETRY_MESSAGES_NORMAL = [
        '음... 잠깐만, 다시 생각해볼게',
        '어, 잠시만! 다시 정리해볼게',
        '기다려줘, 조금만 더 생각해볼게',
      ];
      const RETRY_MESSAGES_503 = [
        '어... 지금 좀 머리가 복잡한데, 잠시만 기다려줘 💭',
        '으으 서버가 바쁜가봐... 조금만 더 기다려줘!',
        '거의 다 됐어, 조금만 더...!',
      ];
      const msgs = is503 ? RETRY_MESSAGES_503 : RETRY_MESSAGES_NORMAL;
      yield { __retry: {
        provider, attempt: cascadeAttempt, maxAttempts: totalProviders,
        reason: (isTimeout ? 'timeout' : is429 ? 'rate_limit' : 'error') as 'timeout' | 'rate_limit' | 'error',
        message: msgs[Math.min(cascadeAttempt - 1, msgs.length - 1)],
      }} as CascadeStreamChunk;
      continue;
    }
  }

  // 🆕 v49: 모든 캐스케이드 실패 — 에러 대신 사용자 친화 메시지
  // (Gemini 503이면 이미 geminiStream에서 5회 시도했으므로 추가 시도 불필요)
  console.error(`[Cascade] ❌❌ 모든 프로바이더 실패`);
  const lastEntry = chain[chain.length - 1];
  logAttempt({ provider: lastEntry.provider, tier: lastEntry.tier, model: PROVIDER_MODELS[lastEntry.provider][lastEntry.tier], status: 'error', error: '모든 시도 소진' });
  yield '아 미안...! 지금 루나 머리가 좀 복잡한가봐 💜\n잠깐만 기다렸다가 다시 말해줄래? 금방 돌아올게!';
}

/**
 * 🆕 v45.5: TTFB(Time to First Byte) 타임아웃 래퍼
 * AsyncGenerator를 감싸서 첫 청크가 timeoutMs 내에 안 오면 에러 발생.
 * 첫 청크 이후에는 타임아웃 없이 정상 스트리밍.
 */
async function* wrapWithTTFBTimeout<T>(
  gen: AsyncGenerator<T>,
  timeoutMs: number,
  label: string
): AsyncGenerator<T> {
  // 첫 번째 next() 결과를 타임아웃과 경쟁
  const first = await Promise.race([
    gen.next(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`[TTFB Timeout] ${label}: ${timeoutMs}ms 내 첫 응답 없음`)), timeoutMs)
    ),
  ]);

  if (first.done) return;
  yield first.value;

  // 나머지는 타임아웃 없이 정상 스트리밍
  for await (const chunk of gen) {
    yield chunk;
  }
}

/** 프로바이더 가용 확인 */
export function isProviderAvailable(provider: Provider): boolean {
  return checkProviderRateLimit(provider).allowed;
}
