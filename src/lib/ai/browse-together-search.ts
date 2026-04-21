/**
 * 🔍 v85.6: BrowseTogetherSearch — 같이 찾기 (멀티턴 탐색 전략)
 *
 * 기존 단발 추천(GIFT/ACTIVITY/DATE_SPOT 등) 과 달리:
 *   - 8개 후보 수집
 *   - 각 후보에 루나 stance (love/good/mixed/meh) + 이유 부여
 *   - 클라이언트가 1개씩 브라우징하며 반응 → 자연 대화로 narrow down
 *
 * topic 별 Brave 쿼리 전략 다르게. 단일 Gemini 호출로 합성.
 */

import { GoogleGenAI } from '@google/genai';
import { braveWebSearch, formatBraveResultsForPrompt, type BraveWebResult } from './brave-search';
import {
  LUNA_SYNTHESIS_PREAMBLE,
  LUNA_BROWSE_STANCE_GUIDE,
  scrubForbiddenPhrasing,
} from './luna-tone';
import type {
  BrowseSessionData,
  BrowseCandidate,
  LunaStance,
} from '@/types/engine.types';

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface BrowseSearchParams {
  topic: BrowseSessionData['topic'];
  /** 원 유저 질문 요약 */
  query: string;
  /** 상황 힌트 (선택) */
  context?: string;
  /** 예산/범위 힌트 (선택) */
  budget?: string;
}

interface CacheEntry {
  result: BrowseSessionData;
  expiresAt: number;
}
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const IN_FLIGHT = new Map<string, Promise<BrowseSessionData>>();

function buildCacheKey(p: BrowseSearchParams): string {
  return `browse:${p.topic}:${p.query}:${p.budget ?? ''}:${p.context ?? ''}`.slice(0, 160);
}

/** topic 별 Brave 쿼리 빌더 */
function buildBraveQuery(p: BrowseSearchParams): string {
  const extra = [p.context, p.budget].filter(Boolean).join(' ');
  switch (p.topic) {
    case 'gift':
      return `${p.query} 선물 추천 ${extra} 2026`;
    case 'date-spot':
      return `${p.query} 데이트 장소 ${extra} 리뷰 2026`;
    case 'activity':
      return `${p.query} 체험 데이트 ${extra} 후기 2026`;
    case 'movie':
      return `${p.query} 영화 드라마 추천 ${extra} 2026`;
    case 'anniversary':
      return `${p.query} 기념일 이벤트 아이디어 ${extra} 2026`;
    case 'general':
    default:
      return `${p.query} ${extra} 추천 2026`.trim();
  }
}

/** topic 별 기본 이모지/테마 (Gemini 가 개별 지정 안 했을 때 fallback) */
const TOPIC_FALLBACK: Record<BrowseSessionData['topic'], { emoji: string; color: string; label: string }> = {
  gift:        { emoji: '🎁', color: '#ec4899', label: '선물' },
  'date-spot': { emoji: '📍', color: '#fb923c', label: '장소' },
  activity:    { emoji: '🎪', color: '#14b8a6', label: '체험' },
  movie:       { emoji: '🎬', color: '#6366f1', label: '영화/드라마' },
  anniversary: { emoji: '💌', color: '#f59e0b', label: '기념일' },
  general:     { emoji: '✨', color: '#a855f7', label: '추천' },
};

function buildSynthesisPrompt(p: BrowseSearchParams, snippets: string): string {
  const fb = TOPIC_FALLBACK[p.topic];
  return `${LUNA_SYNTHESIS_PREAMBLE}

${LUNA_BROWSE_STANCE_GUIDE}

[이번 요청 맥락]
topic: ${p.topic} (${fb.label})
query: ${p.query}
context: ${p.context ?? '없음'}
budget: ${p.budget ?? '없음'}

[Brave 검색 스니펫]
${snippets}

[출력 규칙 — 반드시 이 JSON 형식만, 코드블록 금지]
{
  "openerMsg": "루나가 '같이 고르자' 건네는 한 줄 (~35자, 반말, 검색 얘기 X, 기대감)",
  "topicLabel": "화면 상단 라벨 (예: '여친 생일 선물 고르기', '성수 조용한 카페')",
  "candidates": [
    {
      "id": "c1",
      "title": "구체적 이름 (실존 장소/상품/작품)",
      "category": "세부 분류 한 단어",
      "emoji": "적절한 이모지 1개",
      "themeColor": "#HEX 또는 null",
      "oneLine": "한 줄 요약 (~35자)",
      "detail": "조금 더 긴 설명 (~60자, 선택)",
      "priceHint": "가격/비용 (예: '2~3만원') 또는 null",
      "sourceUrl": "출처 URL (스니펫에 있으면)",
      "deepLink": "지도/쇼핑 검색 URL",
      "lunaTake": {
        "stance": "love | good | mixed | meh 중 하나",
        "reason": "이 후보에 대한 루나의 감상 한 줄 (~35자, 반말)"
      }
    },
    ...총 8개 (id: c1~c8)
  ],
  "lunaClosing": "모든 후보 훑었을 때 건넬 마무리 한 줄 (~30자)"
}

⚠️ 규칙
- candidates 정확히 8개. id 는 c1~c8.
- stance 분포: love 1~2, good 2~3, mixed 2~3, meh 1~2 (섞여 있어야 고르는 맛)
- **실존하는 것만** (장소/상품/작품 모두). 스니펫 우선.
- 설명 없이 JSON 만. 출력 앞뒤에 다른 텍스트 절대 금지.`;
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

function cleanNullable(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (!s || s === 'null' || s === 'undefined') return undefined;
  return s;
}

function sanitizeStance(v: unknown): LunaStance {
  const s = String(v ?? '').toLowerCase().trim();
  if (s === 'love' || s === 'good' || s === 'mixed' || s === 'meh') return s;
  return 'good';
}

function makeFallback(p: BrowseSearchParams, sessionId: string): BrowseSessionData {
  return {
    sessionId,
    topic: p.topic,
    topicLabel: p.query,
    userAsk: p.query,
    openerMsg: '음... 지금은 같이 볼 게 잘 안 떠오르네',
    candidates: [],
    lunaClosing: '나중에 다시 찾아볼게 ㅠ',
  };
}

function defaultDeepLink(topic: BrowseSessionData['topic'], title: string): string {
  const q = encodeURIComponent(title);
  switch (topic) {
    case 'gift':        return `https://search.shopping.naver.com/search/all?query=${q}`;
    case 'date-spot':   return `https://map.naver.com/v5/search/${q}`;
    case 'activity':    return `https://map.naver.com/v5/search/${q}`;
    case 'movie':       return `https://www.google.com/search?q=${q}+%EB%84%B7%ED%94%8C%EB%A6%AD%EC%8A%A4`;
    case 'anniversary': return `https://www.google.com/search?q=${q}`;
    case 'general':
    default:            return `https://www.google.com/search?q=${q}`;
  }
}

export async function runBrowseTogetherSearch(params: BrowseSearchParams): Promise<BrowseSessionData> {
  const key = buildCacheKey(params);
  const sessionId = `browse-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const cached = CACHE.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    console.log(`[BrowseSearch] 💾 캐시 히트: "${params.topic}/${params.query}"`);
    // 세션 ID 는 새로 부여 (같은 후보 셋이어도 세션 구분)
    return { ...cached.result, sessionId };
  }

  const inflight = IN_FLIGHT.get(key);
  if (inflight) {
    console.log(`[BrowseSearch] 🔒 in-flight dedup`);
    return (await inflight);
  }

  const promise = _runImpl(params, key, sessionId);
  IN_FLIGHT.set(key, promise);
  promise.finally(() => IN_FLIGHT.delete(key));
  return promise;
}

async function _runImpl(
  params: BrowseSearchParams,
  key: string,
  sessionId: string,
): Promise<BrowseSessionData> {
  let braveResults: BraveWebResult[] = [];
  const braveQuery = buildBraveQuery(params);
  try {
    braveResults = await braveWebSearch({ q: braveQuery, count: 12, freshness: 'year' });
    console.log(`[BrowseSearch] 🦁 Brave ${braveResults.length}건: "${braveQuery}"`);
  } catch (err) {
    console.warn(`[BrowseSearch] ⚠️ Brave 실패, Gemini 단독:`, err);
  }

  const fb = TOPIC_FALLBACK[params.topic];

  try {
    const snippets = braveResults.length > 0
      ? formatBraveResultsForPrompt(braveResults)
      : '(검색 실패 — 일반 지식으로 8개 후보)';
    const prompt = buildSynthesisPrompt(params, snippets);

    const response = await gemini.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      config: { maxOutputTokens: 2400, temperature: 0.7 },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const raw = (response.text ?? '').trim();
    const parsed = extractJson(raw);
    if (!parsed || !Array.isArray(parsed.candidates)) {
      console.warn(`[BrowseSearch] ⚠️ JSON 파싱 실패 — raw(앞 200): ${raw.slice(0, 200)}`);
      return makeFallback(params, sessionId);
    }

    const candidates: BrowseCandidate[] = (parsed.candidates as any[]).slice(0, 8).map((c, i) => {
      const title = String(c.title ?? `후보 ${i + 1}`).trim();
      return {
        id: String(c.id ?? `c${i + 1}`),
        title,
        category: cleanNullable(c.category),
        emoji: cleanNullable(c.emoji) ?? fb.emoji,
        themeColor: cleanNullable(c.themeColor) ?? fb.color,
        oneLine: scrubForbiddenPhrasing(String(c.oneLine ?? '').trim()),
        detail: cleanNullable(c.detail),
        priceHint: cleanNullable(c.priceHint),
        sourceUrl: cleanNullable(c.sourceUrl),
        deepLink: cleanNullable(c.deepLink) ?? defaultDeepLink(params.topic, title),
        lunaTake: {
          stance: sanitizeStance(c?.lunaTake?.stance),
          reason: scrubForbiddenPhrasing(String(c?.lunaTake?.reason ?? '').trim()) || '괜찮아 보여',
        },
      };
    });

    const sources = braveResults.slice(0, 8).map((r) => r.url);

    const result: BrowseSessionData = {
      sessionId,
      topic: params.topic,
      topicLabel: scrubForbiddenPhrasing(String(parsed.topicLabel ?? params.query).trim()),
      userAsk: params.query,
      openerMsg: scrubForbiddenPhrasing(String(parsed.openerMsg ?? '같이 보자').trim()),
      candidates,
      lunaClosing: cleanNullable(parsed.lunaClosing) ?? '이 중에 골라봐',
      sources: sources.length > 0 ? sources : undefined,
      searchQueries: [braveQuery],
    };

    CACHE.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    if (CACHE.size > 40) {
      const first = CACHE.keys().next().value;
      if (first) CACHE.delete(first);
    }

    console.log(`[BrowseSearch] ✅ ${candidates.length}개 후보 (Brave ${braveResults.length}건 참고)`);
    return result;
  } catch (err) {
    console.error(`[BrowseSearch] ❌ 실패:`, err);
    return makeFallback(params, sessionId);
  }
}
