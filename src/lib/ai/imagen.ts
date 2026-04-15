/**
 * v49: Google Imagen API 래퍼
 *
 * 루나의 1인 연극에서 사용할 배경 이미지를 Imagen 4.0으로 생성.
 * 시나리오별 프롬프트 매핑 + 인메모리 캐시로 무료 티어 보호.
 *
 * 무료 티어: ~10-20 RPD → 시나리오 7개 + 기본 3개 = 최대 10개/일 (cold start)
 */

import type { RelationshipScenario } from '@/types/engine.types';

const IMAGEN_MODEL = 'imagen-4.0-generate-001';

/** Lazy SDK 초기화 — import 시점에 크래시 방지 */
let _ai: any = null;
function getAI() {
  if (!_ai) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { GoogleGenAI } = require('@google/genai');
      _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    } catch (e) {
      console.warn('[Imagen] GoogleGenAI SDK 로드 실패:', e);
      return null;
    }
  }
  return _ai;
}

// ============================================================
// 시나리오별 배경 프롬프트
// ============================================================

const SCENARIO_PROMPTS: Partial<Record<RelationshipScenario, string>> = {
  READ_AND_IGNORED:
    'dimly lit cozy bedroom at night, phone screen glowing softly on the bed, moonlight through curtains, melancholy mood',
  GHOSTING:
    'empty park bench under warm streetlights at night, fallen autumn leaves, lonely misty atmosphere',
  JEALOUSY:
    'cozy room interior with warm desk lamp, phone showing social media feed on desk, anxious warm lighting',
  LONG_DISTANCE:
    'window view of beautiful city skyline at night, crescent moon, cozy room with fairy lights, longing mood',
  INFIDELITY:
    'rain droplets on window glass with blurred neon city lights behind, dramatic shadows, melancholy atmosphere',
  BREAKUP_CONTEMPLATION:
    'messy bedroom with scattered polaroid photos, golden hour sunset light through window, bittersweet mood',
  BOREDOM:
    'modern living room with two separate seats far apart, flat muted lighting, emotional distance feeling',
  UNREQUITED_LOVE:
    'school corridor at golden hour, sunlight through windows casting long shadows, wistful atmosphere',
  RECONNECTION:
    'quiet cafe interior at evening, two empty coffee cups on table, warm ambient lighting, nostalgic mood',
  FIRST_MEETING:
    'cherry blossom petals falling on a quiet street, spring afternoon, soft pink lighting, hopeful mood',
  COMMITMENT_FEAR:
    'crossroads at twilight, forking path in a beautiful garden, uncertain but warm atmosphere',
  RELATIONSHIP_PACE:
    'train platform at sunset, one person waiting, golden light on tracks, contemplative mood',
  ONLINE_LOVE:
    'cozy bedroom with laptop open showing chat bubbles, soft blue screen glow mixed with warm lamp light',
  GENERAL:
    'quiet rooftop at twilight, city lights beginning to glow below, contemplative evening sky',
};

const DEFAULT_PROMPTS: Record<string, string> = {
  negative: 'dark bedroom corner at night, single moonbeam through curtain, deep blue and purple tones, heavy emotional atmosphere',
  neutral: 'quiet room with warm desk lamp, late evening, soft amber tones, calm contemplative mood',
  positive: 'sunrise through sheer curtains, gentle morning light on wooden floor, warm hopeful atmosphere',
};

const STYLE_SUFFIX =
  ', anime illustration style, Korean webtoon art, soft emotional lighting, cinematic composition, Makoto Shinkai color palette, no text, no characters, no people, portrait orientation 9:16, high quality digital art';

// ============================================================
// 인메모리 캐시 (시나리오 기반)
// ============================================================

interface CacheEntry {
  base64: string;
  timestamp: number;
}

const imageCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24시간
const MAX_CACHE_SIZE = 50;

function getCached(key: string): string | null {
  const entry = imageCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    imageCache.delete(key);
    return null;
  }
  return entry.base64;
}

function setCache(key: string, base64: string): void {
  // LRU: 초과 시 가장 오래된 엔트리 제거
  if (imageCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = imageCache.keys().next().value;
    if (oldestKey) imageCache.delete(oldestKey);
  }
  imageCache.set(key, { base64, timestamp: Date.now() });
}

// ============================================================
// Public API
// ============================================================

/** 시나리오에 맞는 배경 이미지 프롬프트 반환 */
export function getScenarioVisualPrompt(scenario: RelationshipScenario, emotionScore?: number): string {
  const base = SCENARIO_PROMPTS[scenario];
  if (base) return base + STYLE_SUFFIX;

  // 시나리오 매핑 없으면 감정 점수 기반 기본 프롬프트
  const tier = (emotionScore ?? 0) <= -3 ? 'negative' : (emotionScore ?? 0) >= 3 ? 'positive' : 'neutral';
  return DEFAULT_PROMPTS[tier] + STYLE_SUFFIX;
}

/** Imagen 4.0으로 씬 배경 이미지 생성 (캐시 우선) */
export async function generateSceneBackground(
  scenario: RelationshipScenario,
  sceneTitle?: string,
  emotionScore?: number,
): Promise<string | null> {
  const cacheKey = scenario;

  // 1. 캐시 히트
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[Imagen] ✅ 캐시 히트: ${cacheKey}`);
    return cached;
  }

  // 2. 프롬프트 생성
  const prompt = getScenarioVisualPrompt(scenario, emotionScore);

  const ai = getAI();
  if (!ai) {
    console.warn('[Imagen] ⚠️ SDK 사용 불가 — 폴백 사용');
    return null;
  }

  console.log(`[Imagen] 🎨 배경 생성 시작: ${cacheKey} (${prompt.slice(0, 60)}...)`);
  const t0 = Date.now();

  try {
    const response = await ai.models.generateImages({
      model: IMAGEN_MODEL,
      prompt,
      config: {
        numberOfImages: 1,
        includeRaiReason: true,
      },
    });

    const imageBytes = response?.generatedImages?.[0]?.image?.imageBytes;

    if (!imageBytes) {
      const reason = response?.generatedImages?.[0]?.raiFilteredReason;
      console.warn(`[Imagen] ⚠️ 이미지 없음 (reason: ${reason || 'unknown'})`);
      return null;
    }

    console.log(`[Imagen] ✅ 배경 생성 완료: ${cacheKey} (${Date.now() - t0}ms, ${Math.round(imageBytes.length / 1024)}KB)`);

    // 3. 캐시 저장
    setCache(cacheKey, imageBytes);
    return imageBytes;
  } catch (err: any) {
    console.error(`[Imagen] ❌ 배경 생성 실패: ${cacheKey}`, err?.message?.slice(0, 100));
    return null;
  }
}
