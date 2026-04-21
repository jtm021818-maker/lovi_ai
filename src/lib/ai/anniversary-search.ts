/**
 * 💌 v85: AnniversarySearch — 기념일 이벤트 아이디어 (서프라이즈/편지/미니 이벤트)
 *
 * 장소/선물과 달리 "실행 가이드" 중심. 2026 "질적인 시간" 트렌드.
 * 결과 카드는 steps[] (실행 3~4단계) + materials[] + lunaTip. 링크 없음.
 */

import { GoogleGenAI } from '@google/genai';
import { braveWebSearch, formatBraveResultsForPrompt, type BraveWebResult } from './brave-search';
import { LUNA_SYNTHESIS_PREAMBLE, scrubForbiddenPhrasing } from './luna-tone';
import type { AnniversaryRecommendationData, AnniversaryIdea } from '@/types/engine.types';

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface AnniversarySearchParams {
  /** 100일 / 200일 / 1주년 / 생일 / 프로포즈 / 화해선물 / 서프라이즈 / 평일깜짝 */
  milestone: string;
  /** 여친 / 남친 / 예비 */
  relation: string;
  /** 시간만 / 5만 / 20만 / 무제한 */
  budget: string;
  /** 감동 / 유쾌 / 조용히 / 스펙터클 */
  style: string;
}

interface CacheEntry {
  result: AnniversaryRecommendationData;
  expiresAt: number;
}
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const IN_FLIGHT = new Map<string, Promise<AnniversaryRecommendationData>>();

function buildCacheKey(p: AnniversarySearchParams): string {
  return `anv:${p.milestone}:${p.relation}:${p.style}:${p.budget}`.slice(0, 140);
}

function buildBraveQuery(p: AnniversarySearchParams): string {
  return `${p.milestone} 이벤트 아이디어 ${p.style} ${p.relation} 2026`;
}

function buildSynthesisPrompt(p: AnniversarySearchParams, snippets: string): string {
  return `${LUNA_SYNTHESIS_PREAMBLE}

[이번 요청 맥락]
milestone: ${p.milestone}
relation: ${p.relation}
budget: ${p.budget}
style: ${p.style}

[Brave 검색 스니펫 — 한국 커플 이벤트/서프라이즈 블로그]
${snippets}

[출력 규칙 — 반드시 이 JSON 형식만, 코드블록 금지]
{
  "openerMsg": "루나가 친구한테 툭 건네는 한 줄 (~30자, 반말)",
  "milestone": "${p.milestone}",
  "relation": "${p.relation}",
  "style": "${p.style}",
  "ideas": [
    {
      "title": "이벤트 이름 (예: '편지 + 미니 영상 깜짝 상영')",
      "steps": [
        "실행 1단계 (~40자)",
        "실행 2단계",
        "실행 3단계",
        "실행 4단계(있으면)"
      ],
      "materials": ["준비물1", "준비물2"],
      "estimatedCost": "예상 비용/시간 (예: '3만원 + 2시간', '무료') 또는 null",
      "lunaTip": "루나 한마디 — 왜 이게 효과 있는지, 감정 포인트 (~40자)",
      "difficulty": "쉬움 | 중간 | 공들임 중 하나"
    }
  ],
  "lunaComment": "마무리 한 줄 (~30자, 반말)"
}

⚠️ 규칙
- ideas 배열 2개 또는 3개.
- steps 는 구체적 실행 지시 (단순 '편지 써줘' X, '오늘 밤 잠들기 전 손편지 한 페이지 써서 아침에 테이블에 올려둬' O).
- lunaTip 은 심리학 용어 금지. 왜 상대가 감동받을지 감정 언어.
- 예산 대비 현실적. 'budget: 시간만' 이면 물건 구매 아이디어 금지.
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

function makeFallback(p: AnniversarySearchParams): AnniversaryRecommendationData {
  return {
    openerMsg: '음... 잠깐 생각 좀 해볼게',
    milestone: p.milestone,
    relation: p.relation,
    style: p.style,
    ideas: [],
    lunaComment: '나중에 더 좋은 거 생각나면 알려줄게 ㅠ',
  };
}

function cleanNullable(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (!s || s === 'null' || s === 'undefined') return undefined;
  return s;
}

function cleanArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map(x => String(x ?? '').trim()).filter(Boolean).slice(0, 6);
}

export async function runAnniversarySearch(params: AnniversarySearchParams): Promise<AnniversaryRecommendationData> {
  const key = buildCacheKey(params);

  const cached = CACHE.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    console.log(`[AnniversarySearch] 💾 캐시 히트: "${params.milestone}"`);
    return cached.result;
  }

  const inflight = IN_FLIGHT.get(key);
  if (inflight) {
    console.log(`[AnniversarySearch] 🔒 in-flight dedup`);
    return inflight;
  }

  const promise = _runImpl(params, key);
  IN_FLIGHT.set(key, promise);
  promise.finally(() => IN_FLIGHT.delete(key));
  return promise;
}

async function _runImpl(params: AnniversarySearchParams, key: string): Promise<AnniversaryRecommendationData> {
  let braveResults: BraveWebResult[] = [];
  const braveQuery = buildBraveQuery(params);
  try {
    braveResults = await braveWebSearch({ q: braveQuery, count: 10, freshness: 'year' });
    console.log(`[AnniversarySearch] 🦁 Brave ${braveResults.length}건: "${braveQuery}"`);
  } catch (err) {
    console.warn(`[AnniversarySearch] ⚠️ Brave 실패, Gemini 단독:`, err);
  }

  try {
    const snippets = braveResults.length > 0
      ? formatBraveResultsForPrompt(braveResults)
      : '(검색 실패 — 일반 지식으로 추천)';
    const prompt = buildSynthesisPrompt(params, snippets);

    const response = await gemini.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      config: { maxOutputTokens: 1300, temperature: 0.75 },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const raw = (response.text ?? '').trim();
    const parsed = extractJson(raw);
    if (!parsed || !Array.isArray(parsed.ideas)) {
      console.warn(`[AnniversarySearch] ⚠️ JSON 파싱 실패 — raw(앞 200): ${raw.slice(0, 200)}`);
      return makeFallback(params);
    }

    const ideas: AnniversaryIdea[] = (parsed.ideas as any[]).slice(0, 3).map((i) => ({
      title: String(i.title ?? '').trim() || '깜짝 이벤트',
      steps: cleanArray(i.steps).slice(0, 4),
      materials: cleanArray(i.materials).length > 0 ? cleanArray(i.materials) : undefined,
      estimatedCost: cleanNullable(i.estimatedCost),
      lunaTip: scrubForbiddenPhrasing(String(i.lunaTip ?? '').trim()),
      difficulty: cleanNullable(i.difficulty),
    }));

    const sources = braveResults.slice(0, 5).map((r) => r.url);

    const result: AnniversaryRecommendationData = {
      openerMsg: scrubForbiddenPhrasing(String(parsed.openerMsg ?? '이거 어때').trim()),
      milestone: String(parsed.milestone ?? params.milestone).trim(),
      relation: String(parsed.relation ?? params.relation).trim(),
      style: String(parsed.style ?? params.style).trim(),
      ideas,
      lunaComment: scrubForbiddenPhrasing(String(parsed.lunaComment ?? '진심 담아서').trim()),
      sources: sources.length > 0 ? sources : undefined,
      searchQueries: [braveQuery],
    };

    CACHE.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    if (CACHE.size > 50) {
      const first = CACHE.keys().next().value;
      if (first) CACHE.delete(first);
    }

    console.log(`[AnniversarySearch] ✅ ${ideas.length}개 아이디어 (Brave ${braveResults.length}건 참고)`);
    return result;
  } catch (err) {
    console.error(`[AnniversarySearch] ❌ 실패:`, err);
    return makeFallback(params);
  }
}
