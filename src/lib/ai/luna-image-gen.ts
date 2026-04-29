/**
 * v101: 루나의 추억 이미지 생성기
 *
 * 무료 이미지 생성 캐스케이드 (2026 기준):
 *   1. Pollinations AI (Flux, no key, fair-use 무료) — URL을 그대로 사용
 *   2. Cloudflare Workers AI (Flux-1 Schnell, 일 10K Neurons 무료) — base64 → Storage
 *   3. Gemini Flash Image (이미 키 있음) — base64 → Storage
 *   4. null fallback (UI 글자 fallback)
 *
 * 결과: 영구 URL (외부 또는 내부 storage)
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';

const STYLE_SUFFIX =
  'soft watercolor illustration, dreamy nostalgic memory, '
  + 'pastel pink lavender cream palette, cozy bokeh, '
  + 'korean webtoon art, gentle warm lighting, '
  + 'no text, no watermark, no logo';

const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt';
const STORAGE_BUCKET = 'luna-memory-images';

const PROVIDER_ORDER_DEFAULT = ['pollinations', 'cloudflare', 'gemini'] as const;

type Provider = typeof PROVIDER_ORDER_DEFAULT[number];

interface GenInput {
  /** memory.id (seed 결정용 — 같은 추억이면 같은 이미지) */
  memoryId: string;
  /** 영어 prompt (judge 가 만들어준 것) */
  prompt: string;
  /** 정사각 고정 (액자에 적합) */
  size?: 512 | 768;
}

interface GenResult {
  imageUrl: string;
  imagePrompt: string;
  provider: Provider;
}

// ─── Public API ─────────────────────────────────────────────────────────────
export async function generateLunaMemoryImage(input: GenInput): Promise<GenResult | null> {
  const cleaned = sanitizePrompt(input.prompt);
  const finalPrompt = `${cleaned}, ${STYLE_SUFFIX}`;
  const seed = stableSeed(input.memoryId);
  const size = input.size ?? 512;
  const order = parseOrderEnv();

  for (const provider of order) {
    try {
      let url: string | null = null;
      if (provider === 'pollinations') {
        url = await tryPollinations(finalPrompt, seed, size);
      } else if (provider === 'cloudflare') {
        url = await tryCloudflare(finalPrompt, seed, size, input.memoryId);
      } else if (provider === 'gemini') {
        url = await tryGemini(finalPrompt, input.memoryId);
      }
      if (url) {
        console.log(`[LunaImg] ✅ ${provider} → ${url.slice(0, 80)}…`);
        return { imageUrl: url, imagePrompt: finalPrompt, provider };
      }
    } catch (err) {
      console.warn(`[LunaImg] ${provider} 실패:`, (err as Error)?.message?.slice(0, 120));
    }
  }
  return null;
}

// ─── 1. Pollinations: URL 직접 사용 (가장 가볍고 무료) ──────────────────────
async function tryPollinations(prompt: string, seed: number, size: number): Promise<string | null> {
  const url =
    `${POLLINATIONS_BASE}/${encodeURIComponent(prompt)}`
    + `?width=${size}&height=${size}&model=flux&seed=${seed}`
    + `&nologo=true&enhance=true&safe=true`;

  // HEAD 헬스체크 (8초 타임아웃)
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(t);
    // Pollinations 는 GET 시 실제 생성 — HEAD가 200/304/4xx 일 수 있음. 200/302만 통과.
    if (res.ok || res.status === 200) return url;
    return null;
  } catch {
    clearTimeout(t);
    // HEAD가 막힌 경우라도 URL 자체는 살아있을 수 있음 — 폴백 trigger 위해 null 반환
    return null;
  }
}

// ─── 2. Cloudflare Workers AI ─────────────────────────────────────────────
async function tryCloudflare(prompt: string, seed: number, size: number, memoryId: string): Promise<string | null> {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_AI_TOKEN;
  if (!account || !token) return null;

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/@cf/black-forest-labs/flux-1-schnell`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        seed,
        steps: 4,
        width: size,
        height: size,
      }),
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json() as { result?: { image?: string } };
    const b64 = data?.result?.image;
    if (!b64) return null;
    return await uploadBase64ToStorage(b64, memoryId, 'cloudflare');
  } catch {
    clearTimeout(t);
    return null;
  }
}

// ─── 3. Gemini Image (last resort) ─────────────────────────────────────────
async function tryGemini(prompt: string, memoryId: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  // gemini-2.5-flash-image-preview (or compatible)
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key='
    + encodeURIComponent(key);

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json() as any;
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    for (const p of parts) {
      const inline = p?.inlineData ?? p?.inline_data;
      if (inline?.data) {
        return await uploadBase64ToStorage(inline.data, memoryId, 'gemini');
      }
    }
    return null;
  } catch {
    clearTimeout(t);
    return null;
  }
}

// ─── Storage 업로드 (Cloudflare/Gemini 공용) ────────────────────────────────
async function uploadBase64ToStorage(b64: string, memoryId: string, tag: string): Promise<string | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const buf = Buffer.from(b64, 'base64');
    const path = `${memoryId}/${tag}.png`;
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, buf, { contentType: 'image/png', upsert: true });
    if (error) {
      console.warn('[LunaImg] storage 업로드 실패:', error.message);
      return null;
    }
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch (e) {
    console.warn('[LunaImg] storage 예외:', (e as Error).message);
    return null;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function stableSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const UNSAFE_RE = /\b(nsfw|explicit|nude|naked|gore|violence|porn|sex)\b/gi;
function sanitizePrompt(p: string): string {
  return (p || '')
    .replace(UNSAFE_RE, '')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, 320);
}

function parseOrderEnv(): Provider[] {
  const raw = process.env.LUNA_IMAGE_PROVIDER_ORDER;
  if (!raw) return [...PROVIDER_ORDER_DEFAULT];
  const parts = raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const valid = parts.filter((p): p is Provider =>
    (PROVIDER_ORDER_DEFAULT as readonly string[]).includes(p),
  );
  return valid.length > 0 ? valid : [...PROVIDER_ORDER_DEFAULT];
}
