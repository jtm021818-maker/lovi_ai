/**
 * 🎬 v85: MovieSearch — 감정 기반 영화/드라마/OTT 추천
 *
 * 노래 이벤트의 시각 버전. 플랫폼(넷플릭스/티빙/디즈니+/웨이브/왓챠)/년도가 빠르게 바뀌어 Brave 필수.
 */

import { GoogleGenAI } from '@google/genai';
import { braveWebSearch, formatBraveResultsForPrompt, type BraveWebResult } from './brave-search';
import { LUNA_SYNTHESIS_PREAMBLE, scrubForbiddenPhrasing } from './luna-tone';
import type { MovieRecommendationData, MovieCard } from '@/types/engine.types';

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface MovieSearchParams {
  mood: string;
  context: string;
  preference?: string;
}

interface CacheEntry {
  result: MovieRecommendationData;
  expiresAt: number;
}
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const IN_FLIGHT = new Map<string, Promise<MovieRecommendationData>>();

function buildCacheKey(p: MovieSearchParams): string {
  return `movie:${p.mood}:${p.preference ?? ''}`.slice(0, 120);
}

function buildBraveQuery(p: MovieSearchParams): string {
  const prefPart = p.preference ? ` ${p.preference}` : '';
  return `${p.mood} 영화 드라마 추천${prefPart} 넷플릭스 티빙 2026`;
}

function buildSynthesisPrompt(p: MovieSearchParams, snippets: string): string {
  return `${LUNA_SYNTHESIS_PREAMBLE}

[이번 요청 맥락]
mood: ${p.mood}
context: ${p.context}
preference: ${p.preference ?? '제한 없음'}

[Brave 검색 스니펫 — 2026 OTT 추천 블로그/리뷰]
${snippets}

[출력 규칙 — 반드시 이 JSON 형식만, 코드블록 금지]
{
  "openerMsg": "루나가 친구한테 툭 건네는 한 줄 (~30자, 반말)",
  "mood": "상황 요약 한 줄",
  "movies": [
    {
      "title": "정확한 작품명",
      "type": "영화 | 드라마 | 시리즈 | 애니 중 하나",
      "year": "YYYY 또는 null",
      "genre": "장르 (예: '로맨스', '드라마') 또는 null",
      "platform": "넷플릭스 | 티빙 | 디즈니+ | 웨이브 | 왓챠 | 쿠팡플레이 중 하나",
      "reason": "왜 지금 이 사람에게 이 작품이 맞는지 감정 언어 한 줄 (~40자)",
      "searchLink": "플랫폼 검색 딥링크 (예: 넷플릭스: https://www.netflix.com/search?q=URL인코딩, 티빙/웨이브 등은 자체 검색 URL)"
    },
    ...정확히 3개
  ],
  "lunaComment": "마무리 한 줄 (~30자, 반말)"
}

⚠️ 규칙
- 실존 작품만. 스니펫에서 확인된 것 우선.
- movies 3개, 플랫폼 섞기 가능.
- reason 은 줄거리 요약 X. '이 사람의 지금 기분에 왜 맞는지' 중심.
- searchLink 는 플랫폼별 실제 검색 URL — 모르면 "https://www.google.com/search?q=" + encodeURIComponent(title + ' 넷플릭스').
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

function makeFallback(mood: string): MovieRecommendationData {
  return {
    openerMsg: '음... 지금 머릿속이 비었네',
    mood,
    movies: [],
    lunaComment: '나중에 더 좋은 거 찾아볼게 ㅠ',
  };
}

function buildSearchFallback(title: unknown): string {
  const q = encodeURIComponent(`${String(title ?? '')} 넷플릭스`);
  return `https://www.google.com/search?q=${q}`;
}

function cleanNullable(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (!s || s === 'null' || s === 'undefined') return undefined;
  return s;
}

export async function runMovieSearch(params: MovieSearchParams): Promise<MovieRecommendationData> {
  const key = buildCacheKey(params);

  const cached = CACHE.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    console.log(`[MovieSearch] 💾 캐시 히트: "${params.mood}"`);
    return cached.result;
  }

  const inflight = IN_FLIGHT.get(key);
  if (inflight) {
    console.log(`[MovieSearch] 🔒 in-flight dedup`);
    return inflight;
  }

  const promise = _runImpl(params, key);
  IN_FLIGHT.set(key, promise);
  promise.finally(() => IN_FLIGHT.delete(key));
  return promise;
}

async function _runImpl(params: MovieSearchParams, key: string): Promise<MovieRecommendationData> {
  let braveResults: BraveWebResult[] = [];
  const braveQuery = buildBraveQuery(params);
  try {
    braveResults = await braveWebSearch({ q: braveQuery, count: 10, freshness: 'year' });
    console.log(`[MovieSearch] 🦁 Brave ${braveResults.length}건: "${braveQuery}"`);
  } catch (err) {
    console.warn(`[MovieSearch] ⚠️ Brave 실패, Gemini 단독:`, err);
  }

  try {
    const snippets = braveResults.length > 0
      ? formatBraveResultsForPrompt(braveResults)
      : '(검색 실패 — 일반 지식으로 추천)';
    const prompt = buildSynthesisPrompt(params, snippets);

    const response = await gemini.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      config: { maxOutputTokens: 1000, temperature: 0.7 },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const raw = (response.text ?? '').trim();
    const parsed = extractJson(raw);
    if (!parsed || !Array.isArray(parsed.movies)) {
      console.warn(`[MovieSearch] ⚠️ JSON 파싱 실패 — raw(앞 200): ${raw.slice(0, 200)}`);
      return makeFallback(params.mood);
    }

    const movies: MovieCard[] = (parsed.movies as any[]).slice(0, 3).map((m) => ({
      title: String(m.title ?? '').trim() || '제목 미상',
      type: String(m.type ?? '').trim() || '영화',
      year: cleanNullable(m.year),
      genre: cleanNullable(m.genre),
      platform: String(m.platform ?? '').trim() || '넷플릭스',
      reason: scrubForbiddenPhrasing(String(m.reason ?? '').trim()),
      searchLink: String(m.searchLink ?? buildSearchFallback(m.title)),
    }));

    const sources = braveResults.slice(0, 5).map((r) => r.url);

    const result: MovieRecommendationData = {
      openerMsg: scrubForbiddenPhrasing(String(parsed.openerMsg ?? '이거 봐봐').trim()),
      mood: String(parsed.mood ?? params.mood).trim(),
      movies,
      lunaComment: scrubForbiddenPhrasing(String(parsed.lunaComment ?? '오늘 밤 이거 보자').trim()),
      sources: sources.length > 0 ? sources : undefined,
      searchQueries: [braveQuery],
    };

    CACHE.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    if (CACHE.size > 50) {
      const first = CACHE.keys().next().value;
      if (first) CACHE.delete(first);
    }

    console.log(`[MovieSearch] ✅ ${movies.length}개 (Brave ${braveResults.length}건 참고)`);
    return result;
  } catch (err) {
    console.error(`[MovieSearch] ❌ 실패:`, err);
    return makeFallback(params.mood);
  }
}
