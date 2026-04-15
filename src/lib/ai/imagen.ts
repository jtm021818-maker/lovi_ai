/**
 * v49: 씬 배경 이미지 생성기 (Pollinations.ai)
 *
 * 루나의 1인 연극에서 사용할 배경 이미지 생성.
 * Pollinations.ai: 무료, API 키 불필요, FLUX 모델, 애니메이션 스타일 지원.
 *
 * 한도: IP 기반 rate limit, 일 100개+ 가능 (시나리오 캐시로 실제 7-10개/일)
 */

import type { RelationshipScenario } from '@/types/engine.types';

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
  ', anime illustration style, Korean webtoon art, soft emotional lighting, cinematic composition, Makoto Shinkai color palette, no text, no characters, no people, high quality digital art';

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

  const tier = (emotionScore ?? 0) <= -3 ? 'negative' : (emotionScore ?? 0) >= 3 ? 'positive' : 'neutral';
  return DEFAULT_PROMPTS[tier] + STYLE_SUFFIX;
}

/** Pollinations.ai로 씬 배경 이미지 생성 (캐시 우선, API 키 불필요) */
export async function generateSceneBackground(
  scenario: RelationshipScenario,
  sceneTitle?: string,
  emotionScore?: number,
): Promise<string | null> {
  const cacheKey = scenario;

  // 1. 캐시 히트
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[SceneBG] ✅ 캐시 히트: ${cacheKey}`);
    return cached;
  }

  // 2. 프롬프트 생성
  const prompt = getScenarioVisualPrompt(scenario, emotionScore);
  const encodedPrompt = encodeURIComponent(prompt);
  const seed = Math.abs(hashCode(cacheKey)); // 같은 시나리오 = 같은 seed = 일관된 이미지
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=576&height=1024&seed=${seed}&nologo=true`;

  console.log(`[SceneBG] 🎨 배경 생성 시작: ${cacheKey}`);
  const t0 = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15초 타임아웃

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[SceneBG] ⚠️ HTTP ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    console.log(`[SceneBG] ✅ 배경 생성 완료: ${cacheKey} (${Date.now() - t0}ms, ${Math.round(base64.length / 1024)}KB)`);

    // 3. 캐시 저장
    setCache(cacheKey, base64);
    return base64;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.warn(`[SceneBG] ⏰ 타임아웃: ${cacheKey} (15초 초과)`);
    } else {
      console.error(`[SceneBG] ❌ 배경 생성 실패: ${cacheKey}`, err?.message?.slice(0, 100));
    }
    return null;
  }
}

/** 문자열 해시 (시드 생성용) */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
