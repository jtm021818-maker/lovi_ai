/**
 * Gemini Vision 캐스케이드 — 듀얼 키 × 멀티 모델
 * Plan: docs/xray-v2-pro-plan.md §4.1
 *
 * v1 (api/xray/analyze/route.ts) 의 폴백 로직을 모듈화 + 모델 리스트 갱신.
 * v2 는 bbox 지원 모델 우선.
 */

import { GoogleGenAI } from '@google/genai';

const API_KEYS = [
  process.env.GOOGLE_API_KEY,
  process.env.GEMINI_API_KEY,
].filter(Boolean) as string[];

/**
 * 우선순위:
 * 1. gemini-2.5-pro          — bbox 정확도 최고
 * 2. gemini-2.5-flash        — 빠름 + bbox 지원
 * 3. gemini-2.5-flash-lite   — RPD 여유 + bbox 지원
 * 4. gemini-2.0-flash        — bbox 미지원 폴백 (분석은 살림)
 */
const MODEL_CASCADE_V2 = [
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
];

export interface VisionResult {
  text: string;
  modelUsed: string;
  apiKeyHint: string;
}

export class GeminiCascadeError extends Error {
  constructor(public readonly attempts: string[]) {
    super(`Gemini cascade failed: ${attempts.join(' | ')}`);
    this.name = 'GeminiCascadeError';
  }
}

/**
 * 이미지 + 프롬프트를 캐스케이드 호출.
 * 429 가 나면 다음 (model | key) 조합 시도.
 * 비-429 에러도 폴백 (다음 모델로) — 모든 조합 실패 시 GeminiCascadeError.
 */
export async function geminiVisionCascade(args: {
  prompt: string;
  imageBase64: string;          // raw base64 (data: prefix 제거된 것)
  mimeType: string;             // image/png 등
  temperature?: number;
  topP?: number;
}): Promise<VisionResult> {
  const { prompt, imageBase64, mimeType, temperature = 0.2, topP = 0.9 } = args;
  const attempts: string[] = [];

  if (API_KEYS.length === 0) {
    throw new GeminiCascadeError(['no API keys configured']);
  }

  for (const apiKey of API_KEYS) {
    const client = new GoogleGenAI({ apiKey });
    const keyHint = apiKey.slice(-6);

    for (const model of MODEL_CASCADE_V2) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: [{
            role: 'user',
            parts: [
              { inlineData: { mimeType, data: imageBase64 } },
              { text: prompt },
            ],
          }],
          config: {
            temperature,
            topP,
          },
        });

        const text = response.text || '';
        if (text) {
          console.log(`[XRayV2] ✅ model=${model} key=...${keyHint} bytes=${text.length}`);
          return { text, modelUsed: model, apiKeyHint: keyHint };
        }
        attempts.push(`${model}@${keyHint}: empty`);
      } catch (err) {
        const e = err as { status?: number; code?: number | string; error?: { code?: number; status?: string }; message?: string };
        const code = e?.status || e?.code || e?.error?.code;
        const isRateLimit = code === 429 || code === '429' || e?.error?.status === 'RESOURCE_EXHAUSTED';

        if (isRateLimit) {
          console.warn(`[XRayV2] ⚠️ 429 model=${model} key=...${keyHint}`);
          attempts.push(`${model}@${keyHint}: 429`);
        } else {
          console.error(`[XRayV2] ❌ model=${model} err=${e?.message}`);
          attempts.push(`${model}@${keyHint}: ${e?.message ?? 'err'}`);
        }
        continue;
      }
    }
  }

  throw new GeminiCascadeError(attempts);
}

/**
 * data:image/...;base64,xxxx → { mimeType, data } 분리
 */
export function parseDataUri(dataUri: string): { mimeType: string; data: string } {
  const m = dataUri.match(/^data:(image\/\w+);base64,(.+)$/);
  return {
    mimeType: m?.[1] || 'image/png',
    data: m?.[2] || dataUri,
  };
}

/**
 * Gemini 응답에서 마크다운 코드블록 제거 + 트림
 */
export function stripJsonFence(text: string): string {
  return text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
}
