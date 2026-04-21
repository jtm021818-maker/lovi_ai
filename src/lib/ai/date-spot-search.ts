/**
 * 📍 v84.1: DateSpotSearch — Brave Search + Gemini Flash-Lite 합성
 *
 * 변경: Gemini grounded (₩45/호출) → Brave Web Search + 일반 Gemini (~₩8/호출).
 *
 * 한국 데이트 장소는 Brave Place Search 대신 **Web Search** 사용 이유:
 *   - Brave Place Search 는 Google/Naver 대비 한국 POI 커버리지 제한적
 *   - Web Search 로 네이버 블로그/리뷰 스니펫을 끌어오는 게 더 실용적
 *   - Gemini 가 스니펫에서 장소명/주소/리뷰 추출 후 JSON 합성
 *
 * 실패 시 빈 결과 반환 → pipeline fallback 멘트.
 */

import { GoogleGenAI } from '@google/genai';
import { braveWebSearch, formatBraveResultsForPrompt, type BraveWebResult } from './brave-search';
import { LUNA_SYNTHESIS_PREAMBLE, scrubForbiddenPhrasing } from './luna-tone';
import type { DateSpotRecommendationData, DateSpot } from '@/types/engine.types';

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface DateSpotSearchParams {
  area: string;
  vibe: string;
  requirements?: string;
}

interface CacheEntry {
  result: DateSpotRecommendationData;
  expiresAt: number;
}
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

// 🆕 v84.2: in-flight dedup — 동일 파라미터 동시 호출 시 같은 Promise 공유
const IN_FLIGHT = new Map<string, Promise<DateSpotRecommendationData>>();

function buildCacheKey(p: DateSpotSearchParams): string {
  return `date:${p.area}:${p.vibe}:${p.requirements ?? ''}`.slice(0, 120);
}

/** Brave Search 쿼리 빌더 — 한국어 장소 리뷰 최적화 */
function buildBraveQuery(p: DateSpotSearchParams): string {
  const reqPart = p.requirements ? ` ${p.requirements}` : '';
  return `${p.area} ${p.vibe} 데이트${reqPart} 리뷰 2025 2026`;
}

function buildSynthesisPrompt(p: DateSpotSearchParams, snippets: string): string {
  return `${LUNA_SYNTHESIS_PREAMBLE}

[이번 요청 맥락]
area: ${p.area}
vibe: ${p.vibe}
requirements: ${p.requirements ?? '제한 없음'}

[Brave 검색 스니펫 — 네이버 블로그/리뷰 포함]
${snippets}

[출력 규칙 — 반드시 이 JSON 형식만, 코드블록/설명 금지]
{
  "openerMsg": "루나가 친구한테 툭 던지는 한 줄 (~30자, 반말, 검색 얘기 X)",
  "area": "${p.area}",
  "vibe": "${p.vibe}",
  "spots": [
    {
      "name": "정확한 장소명",
      "type": "카페 | 식당 | 전시관 | 바 | 공원 등",
      "address": "간단 주소 (구/동 수준) — 모르면 null",
      "vibe": "한 줄 분위기 묘사 (감정 언어)",
      "reviewSummary": "실제 커플/방문자들이 '어떤 순간'을 좋아했는지 2~3줄 (줄바꿈 없이 한 문단, 평점/스펙 금지, 감정 중심)",
      "priceHint": "1인 가격대 (예: 1~2만원) — 모르면 null",
      "mapLink": "https://map.naver.com/v5/search/URL인코딩된_장소명",
      "sourceUri": "스니펫 중 참고한 URL 중 하나 — 없으면 null"
    }
  ],
  "lunaComment": "마무리 한 줄 (~30자, 반말) — '내가 골라둔 곳' 뉘앙스"
}

⚠️ 규칙
- 스니펫에 언급된 **실제 장소**만 선택. 검색 결과에 없으면 네 일반 지식도 활용 가능하되 실존 장소만.
- spots 배열 2개 또는 3개.
- area 가 모호하면 "서울" 기준.
- mapLink 는 반드시 "https://map.naver.com/v5/search/" + encodeURIComponent(name)
- sourceUri 는 가능하면 스니펫 URL 중 하나.
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

function makeFallback(area: string, vibe: string): DateSpotRecommendationData {
  return {
    openerMsg: '음... 지금 검색이 좀 안되네',
    area,
    vibe,
    spots: [],
    lunaComment: '나중에 다시 찾아볼게 ㅠ',
  };
}

function buildNaverMapFallback(name: unknown): string {
  const q = encodeURIComponent(String(name ?? ''));
  return `https://map.naver.com/v5/search/${q}`;
}

function cleanNullable(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (!s || s === 'null' || s === 'undefined') return undefined;
  return s;
}

export async function runDateSpotSearch(params: DateSpotSearchParams): Promise<DateSpotRecommendationData> {
  const key = buildCacheKey(params);

  // 🆕 v84.2: 캐시 먼저
  const cached = CACHE.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    console.log(`[DateSpotSearch] 💾 캐시 히트: "${params.area}/${params.vibe}" (호출 0회)`);
    return cached.result;
  }

  // 🆕 v84.2: in-flight dedup
  const inflight = IN_FLIGHT.get(key);
  if (inflight) {
    console.log(`[DateSpotSearch] 🔒 in-flight dedup: "${params.area}/${params.vibe}" (중복 호출 차단)`);
    return inflight;
  }

  const promise = _runDateSpotSearchImpl(params, key);
  IN_FLIGHT.set(key, promise);
  promise.finally(() => IN_FLIGHT.delete(key));
  return promise;
}

async function _runDateSpotSearchImpl(params: DateSpotSearchParams, key: string): Promise<DateSpotRecommendationData> {
  // Brave Web Search
  let braveResults: BraveWebResult[] = [];
  const braveQuery = buildBraveQuery(params);
  try {
    braveResults = await braveWebSearch({ q: braveQuery, count: 10, freshness: 'year' });
    console.log(`[DateSpotSearch] 🦁 Brave ${braveResults.length}건: "${braveQuery}"`);
  } catch (err) {
    console.warn(`[DateSpotSearch] ⚠️ Brave 실패, Gemini 단독 진행:`, err);
  }

  // 2. Gemini 합성
  try {
    const snippets = braveResults.length > 0
      ? formatBraveResultsForPrompt(braveResults)
      : '(검색 실패 — 네 일반 지식으로 추천)';
    const prompt = buildSynthesisPrompt(params, snippets);

    const response = await gemini.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      config: {
        maxOutputTokens: 1200,
        temperature: 0.6,
      },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const raw = (response.text ?? '').trim();
    const parsed = extractJson(raw);
    if (!parsed || !Array.isArray(parsed.spots)) {
      console.warn(`[DateSpotSearch] ⚠️ JSON 파싱 실패 — raw(앞 200): ${raw.slice(0, 200)}`);
      return makeFallback(params.area, params.vibe);
    }

    const spots: DateSpot[] = (parsed.spots as any[]).slice(0, 3).map((s) => ({
      name: String(s.name ?? '').trim() || '장소 미상',
      type: String(s.type ?? '').trim() || '장소',
      address: cleanNullable(s.address),
      vibe: scrubForbiddenPhrasing(String(s.vibe ?? '').trim()) || '',
      reviewSummary: scrubForbiddenPhrasing(String(s.reviewSummary ?? '').trim().replace(/\n+/g, ' ')),
      priceHint: cleanNullable(s.priceHint),
      mapLink: String(s.mapLink ?? buildNaverMapFallback(s.name)),
      sourceUri: cleanNullable(s.sourceUri),
    }));

    const sources = braveResults.slice(0, 5).map((r) => r.url);

    const result: DateSpotRecommendationData = {
      openerMsg: scrubForbiddenPhrasing(String(parsed.openerMsg ?? '여기 괜찮은데 봐봐').trim()),
      area: String(parsed.area ?? params.area).trim(),
      vibe: String(parsed.vibe ?? params.vibe).trim(),
      spots,
      lunaComment: scrubForbiddenPhrasing(String(parsed.lunaComment ?? '혼자 가도 좋아').trim()),
      sources: sources.length > 0 ? sources : undefined,
      searchQueries: [braveQuery],
      // renderedContent — Brave 는 ToS 의무 없음 → 생략
    };

    CACHE.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    if (CACHE.size > 50) {
      const first = CACHE.keys().next().value;
      if (first) CACHE.delete(first);
    }

    console.log(`[DateSpotSearch] ✅ ${spots.length}곳 추천 (Brave ${braveResults.length}건 참고)`);
    return result;
  } catch (err) {
    console.error(`[DateSpotSearch] ❌ 실패:`, err);
    return makeFallback(params.area, params.vibe);
  }
}
