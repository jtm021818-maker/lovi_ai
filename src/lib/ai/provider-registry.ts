/**
 * 3사 AI 프로바이더 레지스트리 (Gemini + Groq + Cerebras)
 *
 * [역할 분배]
 * - Gemini Pro:      위기 응답 전용 (최고 품질, 100 RPD)
 * - Gemini Flash:    CBT/ACT/MI 심층 응답 (250 RPD)
 * - Gemini Lite:     폴백 공감 (1,000 RPD)
 * - Groq Qwen3:      SUPPORT/CALMING 응답 (1,000 RPD, 60 RPM)
 * - Groq Llama 70B:  심층 폴백 (1,000 RPD)
 * - Groq Llama 8B:   상태 분석 + 응답 검증 (14,400 RPD)
 * - Cerebras 8B:     상태 분석 폴백 + 세션 요약 (14,400 RPD, 16bit)
 *
 * [프롬프트 캐싱]
 * Groq/Cerebras는 프롬프트 프리픽스를 자동 캐싱 → 시스템 프롬프트 앞 배치 필수
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
    haiku: 'gemini-2.5-flash-lite',
    sonnet: 'gemini-2.5-flash',
    opus: 'gemini-2.5-pro',         // 🆕 위기 전용!
  },
  groq: {
    haiku: 'llama-3.1-8b-instant',
    sonnet: 'llama-3.3-70b-versatile',
    opus: 'llama-3.3-70b-versatile',
  },
  cerebras: {
    haiku: 'llama-3.1-8b',          // 16bit 고정밀
    sonnet: 'llama-3.1-8b',         // Cerebras는 8B만 무료
    opus: 'llama-3.1-8b',
  },
};

/** Groq 추가 모델 (직접 지정용) */
export const GROQ_EXTRA_MODELS = {
  qwen3: 'qwen-qwq-32b',           // 60 RPM, SUPPORT 최적
} as const;

/** 전략별 temperature */
const TEMPERATURE: Record<ModelTier, number> = {
  haiku: 0.7,
  sonnet: 0.4,
  opus: 0.3,
};

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

  const response = await gemini.models.generateContent({
    model: PROVIDER_MODELS.gemini[tier],
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: maxTokens,
      temperature: TEMPERATURE[tier],
    },
    contents,
  });

  recordProviderUsage('gemini');
  return response.text ?? '';
}

async function* geminiStream(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number,
  tier: ModelTier = 'sonnet'
): AsyncGenerator<string> {
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
    parts: [{ text: m.content }],
  }));

  const response = await gemini.models.generateContentStream({
    model: PROVIDER_MODELS.gemini[tier],
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: maxTokens,
      temperature: TEMPERATURE[tier],
    },
    contents,
  });

  for await (const chunk of response) {
    const text = chunk.text;
    if (text) yield text;
  }

  recordProviderUsage('gemini');
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

  const response = await groq.chat.completions.create({
    model: modelOverride || PROVIDER_MODELS.groq[tier],
    messages: groqMessages,
    max_tokens: maxTokens,
    temperature: TEMPERATURE[tier],
  });

  recordProviderUsage('groq');
  return response.choices[0]?.message?.content ?? '';
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

  const stream = await groq.chat.completions.create({
    model: modelOverride || PROVIDER_MODELS.groq[tier],
    messages: groqMessages,
    max_tokens: maxTokens,
    temperature: TEMPERATURE[tier],
    stream: true,
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
    model: PROVIDER_MODELS.cerebras.haiku,
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
    model: PROVIDER_MODELS.cerebras.haiku,
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
  modelOverride?: string
): AsyncGenerator<string> {
  switch (provider) {
    case 'gemini':
      yield* geminiStream(systemPrompt, messages, maxTokens, tier);
      break;
    case 'groq':
      yield* groqStream(systemPrompt, messages, maxTokens, tier, modelOverride);
      break;
    case 'cerebras':
      yield* cerebrasStream(systemPrompt, messages, maxTokens, tier);
      break;
  }
}

/** 캐스케이드 호출 — 4단계 폴백 체인 */
export async function generateWithCascade(
  chain: { provider: Provider; tier: ModelTier; modelOverride?: string }[],
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number = 1024
): Promise<{ text: string; usedProvider: Provider; usedTier: ModelTier }> {
  for (const { provider, tier, modelOverride } of chain) {
    const limit = checkProviderRateLimit(provider);
    if (!limit.allowed) continue;

    try {
      const text = await generateWithProvider(provider, systemPrompt, messages, tier, maxTokens, modelOverride);
      return { text, usedProvider: provider, usedTier: tier };
    } catch (err: any) {
      if (err?.status === 429 || err?.code === 429) {
        console.warn(`[ProviderRegistry] ${provider}/${tier} 429 → 다음 폴백`);
        continue;
      }
      console.error(`[ProviderRegistry] ${provider}/${tier} 에러:`, err?.message);
      continue;
    }
  }

  // 모든 폴백 실패 시 마지막 체인 강제 시도
  const last = chain[chain.length - 1];
  const text = await generateWithProvider(last.provider, systemPrompt, messages, last.tier, maxTokens, last.modelOverride);
  return { text, usedProvider: last.provider, usedTier: last.tier };
}

/** 캐스케이드 스트리밍 — 4단계 폴백 체인 */
export async function* streamWithCascade(
  chain: { provider: Provider; tier: ModelTier; modelOverride?: string }[],
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number = 1024
): AsyncGenerator<string> {
  for (const { provider, tier, modelOverride } of chain) {
    const limit = checkProviderRateLimit(provider);
    if (!limit.allowed) continue;

    try {
      yield* streamWithProvider(provider, systemPrompt, messages, tier, maxTokens, modelOverride);
      return;
    } catch (err: any) {
      if (err?.status === 429 || err?.code === 429) {
        console.warn(`[ProviderRegistry] ${provider}/${tier} 스트리밍 429 → 다음 폴백`);
        continue;
      }
      console.error(`[ProviderRegistry] ${provider}/${tier} 스트리밍 에러:`, err?.message);
      continue;
    }
  }

  // 모든 폴백 실패 → 마지막 강제
  const last = chain[chain.length - 1];
  yield* streamWithProvider(last.provider, systemPrompt, messages, last.tier, maxTokens, last.modelOverride);
}

/** 프로바이더 가용 확인 */
export function isProviderAvailable(provider: Provider): boolean {
  return checkProviderRateLimit(provider).allowed;
}
