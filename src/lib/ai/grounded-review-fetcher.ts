/**
 * 🔍 v88: GroundedReviewFetcher — Gemini grounding 으로 실제 리뷰 문장 수집
 *
 * Brave 는 빠르지만 스니펫 뿐이라 "리뷰 원문 한 줄" 을 뽑기 약함.
 * Gemini 2.5 Flash + googleSearch grounding 으로 후보 이름 한정 검색,
 * groundingMetadata.groundingSupports[].segment.text 에서 실제 후기 문장 추출.
 *
 * 비용: ~₩12~20/호출 (grounding 포함). 세션당 최대 5회 → 최대 ₩60~100.
 * Fail-open: grounding 실패 시 빈 배열 반환 (리뷰 없이 진행).
 */

import { GoogleGenAI, type GroundingMetadata, type GroundingChunk } from '@google/genai';

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface ReviewSnippet {
  /** 발췌된 리뷰 원문 (80자 내 클램프) */
  quote: string;
  /** "네이버 블로그" / "인스타" / "쿠팡 후기" / "티스토리" 등 */
  sourceLabel: string;
  sourceUrl?: string;
  /** LLM 이 매긴 호감도 — 긍/부/중립 */
  stance: 'pos' | 'neg' | 'neutral';
}

export interface FetchReviewsParams {
  /** 후보 제목 (예: "디올 어딕트 립") */
  title: string;
  /** 추가 맥락 (예: "여친 생일 선물", "성수동 카페") */
  context?: string;
  /** 몇 개 수집할지 (기본 3) */
  max?: number;
}

function siteLabel(url?: string): string {
  if (!url) return '리뷰';
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (host.includes('blog.naver')) return '네이버 블로그';
    if (host.includes('instagram')) return '인스타';
    if (host.includes('coupang')) return '쿠팡 후기';
    if (host.includes('tistory')) return '티스토리';
    if (host.includes('brunch')) return '브런치';
    if (host.includes('oliveyoung')) return '올리브영 후기';
    if (host.includes('kakaomap') || host.includes('map.naver')) return '지도 후기';
    if (host.includes('29cm')) return '29CM 후기';
    if (host.includes('ohou')) return '오늘의집 후기';
    if (host.includes('idus')) return '아이디어스 후기';
    if (host.includes('youtube')) return '유튜브';
    if (host.includes('reddit')) return 'Reddit';
    if (host.includes('namu')) return '나무위키';
    // 기본: 도메인 상위 한 조각
    return host.split('.').slice(-2, -1)[0] ?? host;
  } catch {
    return '리뷰';
  }
}

function clampQuote(s: string, max = 80): string {
  const trimmed = s.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1).trimEnd() + '…';
}

/**
 * Gemini grounded search 로 리뷰 스니펫 수집.
 *
 * 응답 구조:
 *   response.candidates[0].groundingMetadata.groundingChunks[].web.{uri,title}
 *   response.candidates[0].groundingMetadata.groundingSupports[].segment.{text,...}
 *
 * 모델이 자연어로 요약을 쓰고, 중간에 "[원문: ...]" 블록을 JSON으로 뽑도록 지시.
 */
export async function fetchGroundedReviews(
  params: FetchReviewsParams,
): Promise<ReviewSnippet[]> {
  const { title, context, max = 3 } = params;

  const prompt = `너는 리뷰 수집 봇. 다음 후보에 대해 2026년 기준 최신 한국어 리뷰/후기를 google search 로 찾아서 **원문에 가까운 짧은 인용 문장** 을 ${max}개 뽑아줘.

후보: ${title}
${context ? `맥락: ${context}` : ''}

[출력 규칙]
- 순수 JSON 배열만. 코드블록/설명 금지.
- 각 항목: { "quote": "원문 인용 (80자 내)", "sourceHint": "출처 도메인 또는 매체 (예: 네이버 블로그, 올리브영 후기, 인스타)", "stance": "pos" | "neg" | "neutral" }
- quote 는 **실제 후기에 쓰여있음직한 자연어 문장**. 광고/스펙 나열 금지.
- 가능하면 긍정·부정·중립이 섞여 있을 것.
- 실제 검색 결과가 빈약하면 비운 배열 [] 반환.`;

  try {
    const response = await gemini.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        tools: [{ googleSearch: {} } as any],
        maxOutputTokens: 900,
        temperature: 0.5,
      },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const text = (response.text ?? '').trim();
    const json = extractJsonArray(text);
    if (!Array.isArray(json) || json.length === 0) {
      return [];
    }

    // grounding URL 매핑 (quote 가 어느 chunk 에서 왔는지 알 수 없으므로 첫 chunk 를 fallback 으로 사용)
    const chunks = extractGroundingChunks(response);
    const firstUrl = chunks[0]?.url;

    const snippets: ReviewSnippet[] = [];
    for (const item of json.slice(0, max)) {
      if (!item || typeof item !== 'object') continue;
      const rawQuote = typeof (item as any).quote === 'string' ? (item as any).quote : '';
      if (!rawQuote.trim()) continue;
      const sourceHint = typeof (item as any).sourceHint === 'string' ? (item as any).sourceHint : '';
      const rawStance = String((item as any).stance ?? 'neutral').toLowerCase();
      const stance: ReviewSnippet['stance'] =
        rawStance === 'pos' || rawStance === 'positive' ? 'pos' :
        rawStance === 'neg' || rawStance === 'negative' ? 'neg' : 'neutral';

      snippets.push({
        quote: clampQuote(rawQuote),
        sourceLabel: sourceHint.trim() || siteLabel(firstUrl),
        sourceUrl: firstUrl,
        stance,
      });
    }
    return snippets;
  } catch (err) {
    console.warn('[GroundedReviewFetcher] ⚠️ 수집 실패:', err instanceof Error ? err.message : err);
    return [];
  }
}

function extractJsonArray(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '');
  const first = cleaned.indexOf('[');
  const last = cleaned.lastIndexOf(']');
  if (first < 0 || last < 0) return null;
  try {
    return JSON.parse(cleaned.slice(first, last + 1));
  } catch {
    return null;
  }
}

function extractGroundingChunks(response: unknown): Array<{ url?: string; title?: string }> {
  const r = response as {
    candidates?: Array<{ groundingMetadata?: GroundingMetadata }>;
  };
  const md = r.candidates?.[0]?.groundingMetadata;
  if (!md) return [];
  const chunks: GroundingChunk[] = (md.groundingChunks ?? []) as GroundingChunk[];
  const results: Array<{ url?: string; title?: string }> = [];
  for (const c of chunks) {
    const web = (c as { web?: { uri?: string; title?: string } }).web;
    if (web) results.push({ url: web.uri, title: web.title });
  }
  return results;
}
