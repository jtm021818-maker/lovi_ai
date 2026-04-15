/**
 * 3사 AI 프로바이더 레지스트리 (Gemini + Groq + Cerebras)
 *
 * [v25 역할 분배 — 무료 100명/일 설계]
 * - Gemini 2.5 Flash:  메인 상담 응답 (한국어 최강, ~1,000 RPD)
 * - Groq Qwen3-32B:    상담 폴백 + 라운지 메인 (3,000 RPD)
 * - Cerebras 70B:      최종 폴백 (1M 토큰/일)
 * - Gemini 2.5 Flash-Lite: 라운지 최후 폴백 + 상태분석 3순위
 * - Groq/Cerebras 8B:  상태분석 + 응답검증 (14,400+ RPD)
 *
 * [원칙]
 * - 상담 = Gemini Flash 메인 (한국어 감정 표현 품질 우선)
 * - 라운지 = Groq Qwen3 메인 (한도 절약)
 * - Preview 대신 Stable 모델 사용 (rate limit 넉넉)
 */

import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { checkProviderRateLimit, recordProviderUsage } from '@/lib/utils/rate-limit';

// ============================================================
// SDK 초기화
// ============================================================
const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

// Cerebras는 OpenAI 호환 API
const cerebras = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY!,
  baseURL: 'https://api.cerebras.ai/v1',
});

// ============================================================
// 프로바이더 + 모델 타입
// ============================================================
export type Provider = 'gemini' | 'groq' | 'cerebras';
export type ModelTier = 'haiku' | 'sonnet' | 'opus';

/** 프로바이더별 모델 매핑 */
const PROVIDER_MODELS: Record<Provider, Record<ModelTier, string>> = {
  gemini: {
    haiku: 'gemini-3.1-flash-lite-preview',     // 상담 메인 모델
    sonnet: 'gemini-3.1-flash-lite-preview',    // 상담 메인 모델
    opus: 'gemini-3.1-flash-lite-preview',      // 상담 메인 모델
  },
  groq: {
    haiku: 'llama-3.1-8b-instant',
    sonnet: 'llama-3.3-70b-versatile',
    opus: 'llama-3.3-70b-versatile',
  },
  cerebras: {
    haiku: 'llama3.1-8b',           // 🆕 v47: ID 수정 (llama-3.1-8b → llama3.1-8b)
    sonnet: 'llama3.1-8b',          // 🆕 gpt-oss-120b 404 에러로 확실히 작동하는 8B로 통일
    opus: 'llama3.1-8b',            // 🆕 최후 폴백이므로 에러 방지 최우선
  },
};

/** Groq 추가 모델 (직접 지정용) */
export const GROQ_EXTRA_MODELS = {
  qwen3: 'qwen/qwen3-32b',           // qwen-qwq-32b 폐기 → qwen3-32b 대체 (무료 확인)
} as const;

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
  tier: ModelTier = 'sonnet'
): Promise<string> {
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
    parts: [{ text: m.content }],
  }));

  // 🆕 v45.5: 1회 자동 재시도 — preview 모델 간헐적 실패 대응
  const MAX_RETRIES = 1;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await gemini.models.generateContent({
        model: PROVIDER_MODELS.gemini[tier],
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

async function* geminiStream(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number,
  tier: ModelTier = 'sonnet',
  onRetry?: (event: RetryStatusEvent) => void,
): AsyncGenerator<string> {
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
    parts: [{ text: m.content }],
  }));

  // 🆕 v49: 503은 5회 시도 (일시적 과부하), 그 외는 2회
  const MAX_RETRIES_503 = 4;  // 0~4 = 총 5회
  const MAX_RETRIES_OTHER = 1; // 0~1 = 총 2회
  let currentMax = MAX_RETRIES_OTHER;

  for (let attempt = 0; attempt <= currentMax; attempt++) {
    try {
      const response = await gemini.models.generateContentStream({
        model: PROVIDER_MODELS.gemini[tier],
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
// Groq 호출 (OpenAI 호환)
// ============================================================
async function groqGenerate(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number,
  tier: ModelTier = 'sonnet',
  modelOverride?: string
): Promise<string> {
  const groqMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];

  const model = modelOverride || PROVIDER_MODELS.groq[tier];
  const isQwen3 = model.includes('qwen3');

  const response = await groq.chat.completions.create({
    model,
    messages: groqMessages,
    max_tokens: maxTokens,
    temperature: TEMPERATURE[tier],
    ...(isQwen3 && { reasoning_format: 'hidden' as any }),
  });

  recordProviderUsage('groq');
  // qwen3 thinking 모드가 hidden이어도 혹시 <think> 태그가 남을 수 있으므로 제거
  const content = response.choices[0]?.message?.content ?? '';
  return content.replace(/<think>[\s\S]*?<\/think>\s*/g, '');
}

async function* groqStream(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number,
  tier: ModelTier = 'sonnet',
  modelOverride?: string
): AsyncGenerator<string> {
  const groqMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];

  // qwen3-32b thinking 모드 OFF (토큰 절약 + 2~5초 지연 제거)
  const model = modelOverride || PROVIDER_MODELS.groq[tier];
  const isQwen3 = model.includes('qwen3');

  const stream = await groq.chat.completions.create({
    model,
    messages: groqMessages,
    max_tokens: maxTokens,
    temperature: TEMPERATURE[tier],
    stream: true,
    ...(isQwen3 && { reasoning_format: 'hidden' as any }),
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) yield text;
  }

  recordProviderUsage('groq');
}

// ============================================================
// Cerebras 호출 (OpenAI 호환, 16bit 고정밀)
// ============================================================
async function cerebrasGenerate(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number,
  _tier: ModelTier = 'haiku'
): Promise<string> {
  const cerebrasMessages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  const response = await cerebras.chat.completions.create({
    model: PROVIDER_MODELS.cerebras[_tier],
    messages: cerebrasMessages,
    max_tokens: maxTokens,
    temperature: TEMPERATURE[_tier],
  });

  recordProviderUsage('cerebras');
  return response.choices[0]?.message?.content ?? '';
}

async function* cerebrasStream(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number,
  _tier: ModelTier = 'haiku'
): AsyncGenerator<string> {
  const cerebrasMessages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  const stream = await cerebras.chat.completions.create({
    model: PROVIDER_MODELS.cerebras[_tier],
    messages: cerebrasMessages,
    max_tokens: maxTokens,
    temperature: TEMPERATURE[_tier],
    stream: true,
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) yield text;
  }

  recordProviderUsage('cerebras');
}

// ============================================================
// Public API — 프로바이더 지정 호출
// ============================================================

/** 특정 프로바이더로 생성 (폴백 없음) */
export async function generateWithProvider(
  provider: Provider,
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  tier: ModelTier = 'sonnet',
  maxTokens: number = 1024,
  modelOverride?: string
): Promise<string> {
  switch (provider) {
    case 'gemini':
      return geminiGenerate(systemPrompt, messages, maxTokens, tier);
    case 'groq':
      return groqGenerate(systemPrompt, messages, maxTokens, tier, modelOverride);
    case 'cerebras':
      return cerebrasGenerate(systemPrompt, messages, maxTokens, tier);
  }
}

/** 특정 프로바이더로 스트리밍 (폴백 없음) */
export async function* streamWithProvider(
  provider: Provider,
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  tier: ModelTier = 'sonnet',
  maxTokens: number = 1024,
  modelOverride?: string,
  onRetry?: (event: RetryStatusEvent) => void,
): AsyncGenerator<string> {
  switch (provider) {
    case 'gemini':
      yield* geminiStream(systemPrompt, messages, maxTokens, tier, onRetry);
      break;
    case 'groq':
      yield* groqStream(systemPrompt, messages, maxTokens, tier, modelOverride);
      break;
    case 'cerebras':
      yield* cerebrasStream(systemPrompt, messages, maxTokens, tier);
      break;
  }
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
export async function* streamWithCascade(
  chain: { provider: Provider; tier: ModelTier; modelOverride?: string }[],
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number = 1024,
  onRetry?: (event: RetryStatusEvent) => void
): AsyncGenerator<string> {
  let cascadeAttempt = 0;
  const totalProviders = chain.length;

  for (const { provider, tier, modelOverride } of chain) {
    cascadeAttempt++;
    const actualModel = modelOverride || PROVIDER_MODELS[provider][tier];
    const limit = checkProviderRateLimit(provider);
    if (!limit.allowed) {
      logAttempt({ provider, tier, model: actualModel, status: 'rate_limit' });
      // 🆕 v48: 재시도 UI 이벤트 — rate limit
      onRetry?.({
        provider, attempt: cascadeAttempt, maxAttempts: totalProviders,
        reason: 'rate_limit',
        message: '잠깐, 다시 정리해볼게...',
      });
      continue;
    }

    let hasYieldedAny = false;
    const startTime = Date.now();
    let ttfbMs: number | undefined;
    try {
      const gen = streamWithProvider(provider, systemPrompt, messages, tier, maxTokens, modelOverride, onRetry);
      const TTFB_TIMEOUT_MS = 30000;

      for await (const chunk of wrapWithTTFBTimeout(gen, TTFB_TIMEOUT_MS, `${provider}/${tier}`)) {
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
      // 🆕 v49: 재시도 UI 이벤트 — 에러 유형별 메시지
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
      onRetry?.({
        provider, attempt: cascadeAttempt, maxAttempts: totalProviders,
        reason: isTimeout ? 'timeout' : is429 ? 'rate_limit' : 'error',
        message: msgs[Math.min(cascadeAttempt - 1, msgs.length - 1)],
      });
      continue;
    }
  }

  // 🆕 v49: 모든 캐스케이드 실패 — 에러 대신 사용자 친화 메시지
  // (Gemini 503이면 이미 geminiStream에서 5회 시도했으므로 추가 시도 불필요)
  console.error(`[Cascade] ❌❌ 모든 프로바이더 실패`);
  const lastEntry = chain[chain.length - 1];
  logAttempt({ provider: lastEntry.provider, tier: lastEntry.tier, model: PROVIDER_MODELS[lastEntry.provider][lastEntry.tier], status: 'error', error: '모든 시도 소진' });
  yield '잠깐 서버가 바빠서 응답이 어려워... 💜|||조금 뒤에 다시 말해줄 수 있어?';
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
