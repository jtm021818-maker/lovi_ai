/**
 * 🎪 v85: ActivitySearch — 체험 데이트(방탈출/공방/원데이클래스/와인 등) 추천
 *
 * 2026 트렌드 "함께 성장하는 경험" 직결. DateSpot(장소) 과 다른 축 — "뭘 할까".
 */

import { GoogleGenAI } from '@google/genai';
import { braveWebSearch, formatBraveResultsForPrompt, type BraveWebResult } from './brave-search';
import { LUNA_SYNTHESIS_PREAMBLE, scrubForbiddenPhrasing } from './luna-tone';
import type { ActivityRecommendationData, Activity } from '@/types/engine.types';

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface ActivitySearchParams {
  area: string;
  /** 방탈출/공방/원데이클래스/도예/와인/스파/전시/VR/실내암장/보드게임카페 등 */
  category: string;
  /** 편하게/도전적/로맨틱/재미난 */
  vibe: string;
  /** 초보/중급 */
  level?: string;
}

interface CacheEntry {
  result: ActivityRecommendationData;
  expiresAt: number;
}
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const IN_FLIGHT = new Map<string, Promise<ActivityRecommendationData>>();

function buildCacheKey(p: ActivitySearchParams): string {
  return `act:${p.area}:${p.category}:${p.vibe}:${p.level ?? ''}`.slice(0, 140);
}

function buildBraveQuery(p: ActivitySearchParams): string {
  return `${p.area} ${p.category} 데이트 ${p.vibe} 후기 2026`;
}

function buildSynthesisPrompt(p: ActivitySearchParams, snippets: string): string {
  return `${LUNA_SYNTHESIS_PREAMBLE}

[이번 요청 맥락]
area: ${p.area}
category: ${p.category}
vibe: ${p.vibe}
level: ${p.level ?? '제한 없음'}

[Brave 검색 스니펫 — 네이버 블로그/후기]
${snippets}

[출력 규칙 — 반드시 이 JSON 형식만, 코드블록 금지]
{
  "openerMsg": "루나가 친구한테 툭 건네는 한 줄 (~30자, 반말)",
  "area": "${p.area}",
  "category": "${p.category}",
  "activities": [
    {
      "name": "실제 영업 중인 장소/업체 이름",
      "category": "세부 카테고리 (방탈출 | 도예공방 | 와인클래스 | 보드게임카페 등)",
      "address": "구/동 수준, 모르면 null",
      "vibe": "한 줄 분위기 (감정 언어)",
      "reviewSummary": "실제 커플들이 어떤 순간을 좋아했는지 2~3줄 (줄바꿈 없이 한 문단, 감정 중심)",
      "priceHint": "1인 가격대 (예: '2~3만원') 또는 null",
      "duration": "소요 시간 (예: '1~2시간') 또는 null",
      "mapLink": "https://map.naver.com/v5/search/URL인코딩된_이름",
      "sourceUri": "스니펫 중 참고한 URL 하나 또는 null"
    }
  ],
  "lunaComment": "마무리 한 줄 (~30자, 반말)"
}

⚠️ 규칙
- activities 배열 2개 또는 3개, 실존 업체만.
- reviewSummary 는 평점/스펙 금지. '둘이 이런 순간이 좋았다' 같은 경험담 중심.
- mapLink 는 반드시 "https://map.naver.com/v5/search/" + encodeURIComponent(name)
- 설명 없이 JSON 만.`;
}

function extractJson(text: string): any | null {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace < 0) return null;
  try {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

function makeFallback(area: string, category: string): ActivityRecommendationData {
  return {
    openerMsg: '음... 지금은 잘 안 떠오르네',
    area,
    category,
    activities: [],
    lunaComment: '나중에 다시 찾아볼게 ㅠ',
  };
}

function buildNaverMapFallback(name: unknown): string {
  return `https://map.naver.com/v5/search/${encodeURIComponent(String(name ?? ''))}`;
}

function cleanNullable(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (!s || s === 'null' || s === 'undefined') return undefined;
  return s;
}

export async function runActivitySearch(params: ActivitySearchParams): Promise<ActivityRecommendationData> {
  const key = buildCacheKey(params);

  const cached = CACHE.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    console.log(`[ActivitySearch] 💾 캐시 히트: "${params.category}" (호출 0회)`);
    return cached.result;
  }

  const inflight = IN_FLIGHT.get(key);
  if (inflight) {
    console.log(`[ActivitySearch] 🔒 in-flight dedup`);
    return inflight;
  }

  const promise = _runActivitySearchImpl(params, key);
  IN_FLIGHT.set(key, promise);
  promise.finally(() => IN_FLIGHT.delete(key));
  return promise;
}

async function _runActivitySearchImpl(params: ActivitySearchParams, key: string): Promise<ActivityRecommendationData> {
  let braveResults: BraveWebResult[] = [];
  const braveQuery = buildBraveQuery(params);
  try {
    braveResults = await braveWebSearch({ q: braveQuery, count: 10, freshness: 'year' });
    console.log(`[ActivitySearch] 🦁 Brave ${braveResults.length}건: "${braveQuery}"`);
  } catch (err) {
    console.warn(`[ActivitySearch] ⚠️ Brave 실패, Gemini 단독 진행:`, err);
  }

  try {
    const snippets = braveResults.length > 0
      ? formatBraveResultsForPrompt(braveResults)
      : '(검색 실패 — 일반 지식으로 추천)';
    const prompt = buildSynthesisPrompt(params, snippets);

    const response = await gemini.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      config: { maxOutputTokens: 1200, temperature: 0.6 },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const raw = (response.text ?? '').trim();
    const parsed = extractJson(raw);
    if (!parsed || !Array.isArray(parsed.activities)) {
      console.warn(`[ActivitySearch] ⚠️ JSON 파싱 실패 — raw(앞 200): ${raw.slice(0, 200)}`);
      return makeFallback(params.area, params.category);
    }

    const activities: Activity[] = (parsed.activities as any[]).slice(0, 3).map((a) => ({
      name: String(a.name ?? '').trim() || '장소 미상',
      category: String(a.category ?? '').trim() || params.category,
      address: cleanNullable(a.address),
      vibe: scrubForbiddenPhrasing(String(a.vibe ?? '').trim()) || '',
      reviewSummary: scrubForbiddenPhrasing(String(a.reviewSummary ?? '').trim().replace(/\n+/g, ' ')),
      priceHint: cleanNullable(a.priceHint),
      duration: cleanNullable(a.duration),
      mapLink: String(a.mapLink ?? buildNaverMapFallback(a.name)),
      sourceUri: cleanNullable(a.sourceUri),
    }));

    const sources = braveResults.slice(0, 5).map((r) => r.url);

    const result: ActivityRecommendationData = {
      openerMsg: scrubForbiddenPhrasing(String(parsed.openerMsg ?? '여기 가봐').trim()),
      area: String(parsed.area ?? params.area).trim(),
      category: String(parsed.category ?? params.category).trim(),
      activities,
      lunaComment: scrubForbiddenPhrasing(String(parsed.lunaComment ?? '재밌게 놀다 와').trim()),
      sources: sources.length > 0 ? sources : undefined,
      searchQueries: [braveQuery],
    };

    CACHE.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    if (CACHE.size > 50) {
      const first = CACHE.keys().next().value;
      if (first) CACHE.delete(first);
    }

    console.log(`[ActivitySearch] ✅ ${activities.length}개 체험 (Brave ${braveResults.length}건 참고)`);
    return result;
  } catch (err) {
    console.error(`[ActivitySearch] ❌ 실패:`, err);
    return makeFallback(params.area, params.category);
  }
}
