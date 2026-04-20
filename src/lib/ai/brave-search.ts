/**
 * 🦁 v84.1: BraveSearch — Gemini grounded 대신 Brave Search API 사용
 *
 * 기존 Gemini grounded ($35/1K, ~₩45/호출) → Brave Search ($5/1K, ~₩6.75/호출, 7배 저렴).
 * 월 1,000회 무료 크레딧 ($5). Free tier 1 RPS 제한.
 *
 * 흐름: Brave 로 raw 검색 결과 수집 → 기존 Gemini Flash-Lite (tools 없음) 로 JSON 합성.
 *
 * Docs:
 *   - Web Search: https://api.search.brave.com/res/v1/web/search
 *   - Place Search: https://api.search.brave.com/res/v1/local/places (2026-02-26 출시)
 *   - LLM Context: https://api.search.brave.com/res/v1/llm/context (2026-02-12 출시)
 */

const BASE_URL = 'https://api.search.brave.com/res/v1';

/** Web Search 결과 1건 */
export interface BraveWebResult {
  title: string;
  url: string;
  description: string;
  /** 출판사/프로필 이름 (있을 때) */
  profileName?: string;
  /** 게시 날짜 (있을 때) */
  age?: string;
  /** 언어 코드 (예: "ko") */
  language?: string;
}

/** Brave Web Search 파라미터 */
export interface BraveWebSearchParams {
  q: string;
  /** 결과 수 (기본 8, 최대 20) */
  count?: number;
  /** 국가 코드 (기본 'KR') */
  country?: string;
  /** 검색 언어 (기본 'ko') */
  search_lang?: string;
  /** UI 언어 (기본 'ko-KR') */
  ui_lang?: string;
  /** 신선도 필터 — 'day' | 'week' | 'month' | 'year' */
  freshness?: 'day' | 'week' | 'month' | 'year';
  /** 8초 타임아웃 */
  timeoutMs?: number;
}

/**
 * Brave Web Search 호출
 *
 * @throws Error 401/429/500 또는 API 키 누락 시
 */
export async function braveWebSearch(
  params: BraveWebSearchParams,
): Promise<BraveWebResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    throw new Error('[BraveSearch] BRAVE_SEARCH_API_KEY 미설정');
  }

  const {
    q,
    count = 8,
    country = 'KR',
    search_lang = 'ko',
    ui_lang = 'ko-KR',
    freshness,
    timeoutMs = 8_000,
  } = params;

  const url = new URL(`${BASE_URL}/web/search`);
  url.searchParams.set('q', q);
  url.searchParams.set('count', String(Math.min(20, Math.max(1, count))));
  url.searchParams.set('country', country);
  url.searchParams.set('search_lang', search_lang);
  url.searchParams.set('ui_lang', ui_lang);
  if (freshness) url.searchParams.set('freshness', freshness);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const err = (await res.json()) as { error?: { code?: string; detail?: string } };
        detail = `${err.error?.code ?? res.status}: ${err.error?.detail ?? 'unknown'}`;
      } catch {
        // ignore
      }
      throw new Error(`[BraveSearch] ${detail}`);
    }

    const data = (await res.json()) as {
      web?: {
        results?: Array<{
          title?: string;
          url?: string;
          description?: string;
          profile?: { name?: string };
          age?: string;
          language?: string;
        }>;
      };
    };

    const results = data.web?.results ?? [];
    return results
      .filter((r) => r.url && r.title)
      .map((r) => ({
        title: String(r.title ?? '').trim(),
        url: String(r.url ?? ''),
        description: String(r.description ?? '').replace(/<[^>]+>/g, '').trim(),
        profileName: r.profile?.name ? String(r.profile.name) : undefined,
        age: r.age ? String(r.age) : undefined,
        language: r.language ? String(r.language) : undefined,
      }));
  } finally {
    clearTimeout(timer);
  }
}

/** Brave 검색 결과 → Gemini 프롬프트 주입용 텍스트 포맷 */
export function formatBraveResultsForPrompt(results: BraveWebResult[]): string {
  if (results.length === 0) return '(검색 결과 없음)';
  return results
    .map((r, i) => {
      const parts: string[] = [`[${i + 1}] ${r.title}`];
      if (r.profileName) parts.push(`(${r.profileName})`);
      if (r.description) parts.push(`\n    ${r.description}`);
      parts.push(`\n    URL: ${r.url}`);
      return parts.join('');
    })
    .join('\n\n');
}
