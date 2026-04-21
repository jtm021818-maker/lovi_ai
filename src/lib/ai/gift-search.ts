/**
 * 🎁 v85: GiftSearch — Brave Search + Gemini Flash-Lite 합성
 *
 * 2026 한국 연애 선물 트렌드(각인/포토북/경험형) 반영.
 * 루나가 "관계단계+사유+예산+취향" 맞춰 직접 골라준 3개 선물.
 *
 * 흐름: occasion/budget/vibe → Brave 쿼리 → Gemini Flash-Lite JSON 합성 → 검색 딥링크.
 */

import { GoogleGenAI } from '@google/genai';
import { braveWebSearch, formatBraveResultsForPrompt, type BraveWebResult } from './brave-search';
import { LUNA_SYNTHESIS_PREAMBLE, scrubForbiddenPhrasing } from './luna-tone';
import type { GiftRecommendationData, GiftCard } from '@/types/engine.types';

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface GiftSearchParams {
  /** 관계 단계 (썸/연애초반/1년+/예비부부) */
  relation: string;
  /** 사유 (생일/100일/1주년/발렌타인/화이트데이/빼빼로데이/크리스마스/깜짝) */
  occasion: string;
  /** 예산대 (3만/5만/10만/20만/무제한) */
  budget: string;
  /** 취향/분위기 (실용/감성/각인/경험형/DIY) */
  vibe?: string;
}

interface CacheEntry {
  result: GiftRecommendationData;
  expiresAt: number;
}
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const IN_FLIGHT = new Map<string, Promise<GiftRecommendationData>>();

function buildCacheKey(p: GiftSearchParams): string {
  return `gift:${p.occasion}:${p.relation}:${p.budget}:${p.vibe ?? ''}`.slice(0, 140);
}

function buildBraveQuery(p: GiftSearchParams): string {
  const vibePart = p.vibe ? ` ${p.vibe}` : '';
  return `${p.occasion} 선물 추천${vibePart} ${p.budget} 2026`;
}

function buildSynthesisPrompt(p: GiftSearchParams, snippets: string): string {
  return `${LUNA_SYNTHESIS_PREAMBLE}

[이번 요청 맥락]
relation: ${p.relation}
occasion: ${p.occasion}
budget: ${p.budget}
vibe: ${p.vibe ?? '제한 없음'}

[Brave 검색 스니펫 — 2026 한국 선물 트렌드 블로그/쇼핑몰 리뷰]
${snippets}

[출력 규칙 — 반드시 이 JSON 형식만, 코드블록 금지]
{
  "openerMsg": "루나가 친구한테 툭 건네는 한 줄 (~30자, 반말, 검색 얘기 X)",
  "relation": "${p.relation}",
  "occasion": "${p.occasion}",
  "budget": "${p.budget}",
  "gifts": [
    {
      "name": "구체적 선물 이름 (예: '각인 이니셜 실버 펜던트')",
      "category": "주얼리 | 포토북 | 경험권 | 각인 | DIY | 소품 | 뷰티 등 한 단어",
      "priceRange": "가격대 (예: '3~5만원', '10만원대')",
      "reason": "왜 이 선물이 지금 이 사람한테 맞는지 감정 언어 한 줄 (~40자)",
      "searchLink": "https://search.shopping.naver.com/search/all?query=URL인코딩된_선물이름",
      "trendBadge": "선택 — '각인트렌드' | '경험형' | 'MZ 인기' 중 하나, 없으면 null"
    },
    ...정확히 3개
  ],
  "lunaComment": "마무리 한 줄 (~30자, 반말) — '내가 고른 거야' 뉘앙스"
}

⚠️ 규칙
- 스니펫의 실제 2026 트렌드 반영 (각인/포토북/경험형 선호 추세)
- gifts 배열 정확히 3개, 가격대 다양하게 (예산 범위 내에서)
- searchLink 는 반드시 "https://search.shopping.naver.com/search/all?query=" + encodeURIComponent(name)
- reason 은 스펙 나열 금지. '받는 사람 감정' 중심.
- 설명/주석 없이 JSON 만.`;
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

function makeFallback(p: GiftSearchParams): GiftRecommendationData {
  return {
    openerMsg: '음... 지금은 잘 안 떠오르네',
    relation: p.relation,
    occasion: p.occasion,
    budget: p.budget,
    gifts: [],
    lunaComment: '나중에 다시 골라볼게 ㅠ',
  };
}

function buildShoppingFallback(name: unknown): string {
  return `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(String(name ?? ''))}`;
}

function cleanNullable(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (!s || s === 'null' || s === 'undefined') return undefined;
  return s;
}

export async function runGiftSearch(params: GiftSearchParams): Promise<GiftRecommendationData> {
  const key = buildCacheKey(params);

  const cached = CACHE.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    console.log(`[GiftSearch] 💾 캐시 히트: "${params.occasion}" (호출 0회)`);
    return cached.result;
  }

  const inflight = IN_FLIGHT.get(key);
  if (inflight) {
    console.log(`[GiftSearch] 🔒 in-flight dedup`);
    return inflight;
  }

  const promise = _runGiftSearchImpl(params, key);
  IN_FLIGHT.set(key, promise);
  promise.finally(() => IN_FLIGHT.delete(key));
  return promise;
}

async function _runGiftSearchImpl(params: GiftSearchParams, key: string): Promise<GiftRecommendationData> {
  let braveResults: BraveWebResult[] = [];
  const braveQuery = buildBraveQuery(params);
  try {
    braveResults = await braveWebSearch({ q: braveQuery, count: 10, freshness: 'year' });
    console.log(`[GiftSearch] 🦁 Brave ${braveResults.length}건: "${braveQuery}"`);
  } catch (err) {
    console.warn(`[GiftSearch] ⚠️ Brave 실패, Gemini 단독 진행:`, err);
  }

  try {
    const snippets = braveResults.length > 0
      ? formatBraveResultsForPrompt(braveResults)
      : '(검색 실패 — 네 일반 지식과 2026 트렌드로 추천)';
    const prompt = buildSynthesisPrompt(params, snippets);

    const response = await gemini.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      config: { maxOutputTokens: 1000, temperature: 0.7 },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const raw = (response.text ?? '').trim();
    const parsed = extractJson(raw);
    if (!parsed || !Array.isArray(parsed.gifts)) {
      console.warn(`[GiftSearch] ⚠️ JSON 파싱 실패 — raw(앞 200): ${raw.slice(0, 200)}`);
      return makeFallback(params);
    }

    const gifts: GiftCard[] = (parsed.gifts as any[]).slice(0, 3).map((g) => ({
      name: String(g.name ?? '').trim() || '선물 미상',
      category: String(g.category ?? '').trim() || '기타',
      priceRange: String(g.priceRange ?? '').trim() || params.budget,
      reason: scrubForbiddenPhrasing(String(g.reason ?? '').trim()) || '',
      searchLink: String(g.searchLink ?? buildShoppingFallback(g.name)),
      trendBadge: cleanNullable(g.trendBadge),
    }));

    const sources = braveResults.slice(0, 5).map((r) => r.url);

    const result: GiftRecommendationData = {
      openerMsg: scrubForbiddenPhrasing(String(parsed.openerMsg ?? '이거 어때').trim()),
      relation: String(parsed.relation ?? params.relation).trim(),
      occasion: String(parsed.occasion ?? params.occasion).trim(),
      budget: String(parsed.budget ?? params.budget).trim(),
      gifts,
      lunaComment: scrubForbiddenPhrasing(String(parsed.lunaComment ?? '잘 써').trim()),
      sources: sources.length > 0 ? sources : undefined,
      searchQueries: [braveQuery],
    };

    CACHE.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    if (CACHE.size > 50) {
      const first = CACHE.keys().next().value;
      if (first) CACHE.delete(first);
    }

    console.log(`[GiftSearch] ✅ ${gifts.length}개 선물 추천 (Brave ${braveResults.length}건 참고)`);
    return result;
  } catch (err) {
    console.error(`[GiftSearch] ❌ 실패:`, err);
    return makeFallback(params);
  }
}
