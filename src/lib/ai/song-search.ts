/**
 * 🎵 v84.1: SongSearch — Brave Search + Gemini Flash-Lite 합성
 *
 * 변경: Gemini grounded (₩45/호출) → Brave Web Search + 일반 Gemini (~₩8/호출).
 *
 * 흐름:
 *   1. mood/context/preference → Brave Web Search 쿼리 (한국어 최적화)
 *   2. 상위 스니펫들을 Gemini Flash-Lite (tools 없음) 프롬프트에 주입
 *   3. 3곡 JSON 합성 → YouTube 검색 링크
 *
 * 실패 시 빈 결과 반환 → pipeline fallback 멘트.
 */

import { GoogleGenAI } from '@google/genai';
import { braveWebSearch, formatBraveResultsForPrompt, type BraveWebResult } from './brave-search';
import { LUNA_SYNTHESIS_PREAMBLE, scrubForbiddenPhrasing } from './luna-tone';
import type { SongRecommendationData, SongCard } from '@/types/engine.types';

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface SongSearchParams {
  mood: string;
  context: string;
  preference?: string;
}

interface CacheEntry {
  result: SongRecommendationData;
  expiresAt: number;
}
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

// 🆕 v84.2: in-flight dedup — 동일 파라미터 동시 호출 시 같은 Promise 공유 (이벤트 1회 = 호출 1회 보장)
const IN_FLIGHT = new Map<string, Promise<SongRecommendationData>>();

function buildCacheKey(p: SongSearchParams): string {
  return `song:${p.mood}:${p.preference ?? ''}`.slice(0, 100);
}

/** Brave Search 쿼리 빌더 — mood/preference 기반 한국어 검색어 */
function buildBraveQuery(p: SongSearchParams): string {
  const prefPart = p.preference ? ` ${p.preference}` : '';
  return `${p.mood} 노래 추천${prefPart} 2025 2026`;
}

/** Gemini 합성 프롬프트 — v85: 루나 "언니가 골라준" 톤 */
function buildSynthesisPrompt(p: SongSearchParams, snippets: string): string {
  return `${LUNA_SYNTHESIS_PREAMBLE}

[이번 요청 맥락]
mood: ${p.mood}
context: ${p.context}
preference: ${p.preference ?? '제한 없음'}

[Brave 검색 스니펫 — 한국 음악 블로그/리뷰]
${snippets}

[출력 규칙 — 반드시 이 JSON 형식만, 코드블록 금지]
{
  "openerMsg": "루나가 친구한테 툭 건네는 한 줄 (~30자, 반말, 검색 얘기 X)",
  "mood": "상황 요약 한 줄",
  "songs": [
    {
      "title": "정확한 곡명",
      "artist": "아티스트명",
      "reason": "왜 '지금 이 사람에게' 이 곡이 맞는지 감정 언어 한 줄 (~40자, 반말). 장르/스펙 나열 금지.",
      "year": "발매연도(YYYY) 또는 null",
      "searchLink": "https://www.youtube.com/results?search_query=URL인코딩된_제목+아티스트"
    },
    ...정확히 3곡
  ],
  "lunaComment": "마무리 한 줄 (~30자, 반말) — '내가 직접 골랐다'는 뉘앙스"
}

⚠️ 규칙
- 스니펫에 언급된 곡 우선 선택, 부족하면 네 일반 지식으로 보완
- 실존하는 곡만 (허구 금지)
- songs 배열 정확히 3개
- searchLink 는 제목+아티스트를 encodeURIComponent 한 YouTube 검색 URL
- 설명/주석 없이 JSON 만`;
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

function makeFallback(mood: string): SongRecommendationData {
  return {
    openerMsg: '음... 인터넷이 좀 느린가',
    mood,
    songs: [],
    lunaComment: '나중에 다시 찾아볼게 ㅠ',
  };
}

function buildYoutubeFallback(title: unknown, artist: unknown): string {
  const q = encodeURIComponent(`${String(title ?? '')} ${String(artist ?? '')}`.trim());
  return `https://www.youtube.com/results?search_query=${q}`;
}

export async function runSongSearch(params: SongSearchParams): Promise<SongRecommendationData> {
  const key = buildCacheKey(params);

  // 🆕 v84.2: 캐시 먼저 — 5분 내 동일 요청이면 재호출 0회
  const cached = CACHE.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    console.log(`[SongSearch] 💾 캐시 히트: "${params.mood}" (호출 0회)`);
    return cached.result;
  }

  // 🆕 v84.2: in-flight dedup — 이미 같은 파라미터로 검색 진행 중이면 그 Promise 공유 (이벤트 1회 = 호출 1회 보장)
  const inflight = IN_FLIGHT.get(key);
  if (inflight) {
    console.log(`[SongSearch] 🔒 in-flight dedup: "${params.mood}" (중복 호출 차단)`);
    return inflight;
  }

  // 실제 검색 시작 — Promise 를 IN_FLIGHT 에 기록하고 종료 시 자동 삭제
  const promise = _runSongSearchImpl(params, key);
  IN_FLIGHT.set(key, promise);
  promise.finally(() => IN_FLIGHT.delete(key));
  return promise;
}

async function _runSongSearchImpl(params: SongSearchParams, key: string): Promise<SongRecommendationData> {
  // Brave Web Search
  let braveResults: BraveWebResult[] = [];
  const braveQuery = buildBraveQuery(params);
  try {
    braveResults = await braveWebSearch({ q: braveQuery, count: 8 });
    console.log(`[SongSearch] 🦁 Brave ${braveResults.length}건: "${braveQuery}"`);
  } catch (err) {
    console.warn(`[SongSearch] ⚠️ Brave 실패, Gemini 단독 진행:`, err);
    // Brave 실패해도 Gemini 일반 지식으로 합성 시도 (스니펫 없이)
  }

  // 3. Gemini 합성
  try {
    const snippets = braveResults.length > 0
      ? formatBraveResultsForPrompt(braveResults)
      : '(검색 실패 — 네 일반 지식으로 추천)';
    const prompt = buildSynthesisPrompt(params, snippets);

    const response = await gemini.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      config: {
        // tools 없음 — grounding 안 함 (비용 절감)
        maxOutputTokens: 800,
        temperature: 0.7,
      },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const raw = (response.text ?? '').trim();
    const parsed = extractJson(raw);
    if (!parsed || !Array.isArray(parsed.songs)) {
      console.warn(`[SongSearch] ⚠️ JSON 파싱 실패 — raw(앞 200): ${raw.slice(0, 200)}`);
      return makeFallback(params.mood);
    }

    const songs: SongCard[] = (parsed.songs as any[]).slice(0, 3).map((s) => ({
      title: String(s.title ?? '').trim() || '제목 미상',
      artist: String(s.artist ?? '').trim() || '아티스트 미상',
      reason: scrubForbiddenPhrasing(String(s.reason ?? '').trim()) || '',
      year: s.year && s.year !== 'null' ? String(s.year) : undefined,
      searchLink: String(s.searchLink ?? buildYoutubeFallback(s.title, s.artist)),
    }));

    // Brave 결과 URL 을 sources 로 보존
    const sources = braveResults.slice(0, 5).map((r) => r.url);

    const result: SongRecommendationData = {
      openerMsg: scrubForbiddenPhrasing(String(parsed.openerMsg ?? '이거 들어봐').trim()),
      mood: String(parsed.mood ?? params.mood).trim(),
      songs,
      lunaComment: scrubForbiddenPhrasing(String(parsed.lunaComment ?? '오늘 이거 같이 듣자').trim()),
      sources: sources.length > 0 ? sources : undefined,
      searchQueries: [braveQuery],
      // renderedContent — Brave 는 Google ToS 요구사항 없음 → 생략
    };

    CACHE.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    if (CACHE.size > 50) {
      const first = CACHE.keys().next().value;
      if (first) CACHE.delete(first);
    }

    console.log(`[SongSearch] ✅ ${songs.length}곡 추천 (Brave ${braveResults.length}건 참고)`);
    return result;
  } catch (err) {
    console.error(`[SongSearch] ❌ 실패:`, err);
    return makeFallback(params.mood);
  }
}
