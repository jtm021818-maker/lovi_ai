/**
 * 🔍 v88: BrowseAgent — 루나 "같이 찾자" 스트리밍 에이전트 루프
 *
 * 핵심:
 *   1. 오프닝 멘트 2~3 블록 yield (검색 중 느낌)
 *   2. 쿼리 확장 + Brave 병렬 검색 → 후보 풀 12~20
 *   3. per-candidate loop (최대 `maxShown` 개):
 *      - grounded review 2~3개 수집
 *      - LLM judge: 'show' / 'ask' / 'skip'
 *      - skip: 1줄 멘트 yield, continue
 *      - show/ask: link_card + review_quote×N + verdict + decision_prompt yield
 *      - **decision_prompt 뒤에는 generator가 끝남 (유저 응답 기다림)**
 *   4. resumeAfterDecision: 유저 선택에 따라 다음 후보로 or 세션 종료
 *   5. 마무리: shortlist 기반 closing 블록 + BROWSE_STREAM_END
 *
 * 각 yield 는 `BrowseBlock`. 서버 pipeline 이 이걸 BROWSE_STREAM_BLOCK 이벤트로 감싸서 SSE 로 푸시.
 */

import { GoogleGenAI } from '@google/genai';
import { braveWebSearch, type BraveWebResult } from './brave-search';
import { fetchGroundedReviews, type ReviewSnippet } from './grounded-review-fetcher';
import { LUNA_SYNTHESIS_PREAMBLE, scrubForbiddenPhrasing } from './luna-tone';
import {
  createSession,
  getSession,
  updateSession,
  popNextCandidate,
  markShown,
  markShortlist,
  markRejected,
  nextBlockOrder,
  type BrowseSessionState,
  type BrowseCandidateSeed,
} from './browse-session-store';
import type { BrowseBlock, BrowseSessionMeta } from '@/types/engine.types';

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// ============================================
// 공개 타입
// ============================================

export interface BrowseAgentStartParams {
  sessionId: string;
  topic: BrowseSessionMeta['topic'];
  userAsk: string;
  context?: string;
  budget?: string;
  /** 추가 맥락 태그 (루나가 잡고 있는 메모) */
  constraints?: string[];
}

/** Agent 가 한 번에 쏟아내는 블록들. 각각 별도 BROWSE_STREAM_BLOCK 으로 전송. */
export interface AgentBlockEmit {
  candidateId?: string;
  block: BrowseBlock;
  order: number;
}

export interface AgentRunResult {
  blocks: AgentBlockEmit[];
  /** 세션 종료 여부. 끝나면 BROWSE_STREAM_END 발행. */
  ended: boolean;
  /** 종료 시 최종 요약 페이로드 */
  endPayload?: {
    chosen?: { title: string; url?: string };
    shortlist: Array<{ title: string; url?: string }>;
    lunaFinal: string;
  };
}

// ============================================
// 유틸
// ============================================

function clamp(s: string, max: number): string {
  const t = (s ?? '').toString().trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
}

function extractJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '');
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first < 0 || last < 0) return null;
  try {
    return JSON.parse(cleaned.slice(first, last + 1));
  } catch {
    return null;
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

function siteName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function topicLabelOf(topic: BrowseSessionMeta['topic']): string {
  switch (topic) {
    case 'gift':        return '선물';
    case 'date-spot':   return '데이트 장소';
    case 'activity':    return '체험 데이트';
    case 'movie':       return '영화/드라마';
    case 'anniversary': return '기념일 이벤트';
    case 'general':
    default:            return '추천';
  }
}

// ============================================
// 1. 오프닝 멘트 (Flash-Lite)
// ============================================

async function buildOpenerBlocks(meta: BrowseSessionMeta): Promise<BrowseBlock[]> {
  const prompt = `${LUNA_SYNTHESIS_PREAMBLE}

[상황]
동생(유저) 이 "${meta.userAsk}" 를 같이 찾아달라고 함. 분류: ${topicLabelOf(meta.topic)}.
${meta.budget ? `예산: ${meta.budget}` : ''}
${meta.constraints?.length ? `맥락: ${meta.constraints.join(', ')}` : ''}

[할 일]
루나가 "잠깐만, 좀 볼게" 톤으로 대화 시작 멘트를 **2개 문장** 으로.
각 문장은 짧은 말풍선. 첫 번째는 공감/의도, 두 번째는 "어디 한번 보자" 식.

[출력 JSON]
{ "m1": "첫 말풍선 반말 ~35자", "m2": "두 번째 말풍선 반말 ~35자" }

[규칙]
- 반말, 언니 톤
- "검색해볼게" 같은 기계적 표현 금지. "잠깐 좀 봐야겠다" / "찾아볼게" 정도.
- 이모지 넣지 마.`;

  try {
    const r = await gemini.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      config: { maxOutputTokens: 200, temperature: 0.85 },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const j = extractJson(r.text ?? '') as { m1?: string; m2?: string } | null;
    const m1 = clamp(scrubForbiddenPhrasing(j?.m1 ?? ''), 60) || '어 잠깐, 진짜 같이 골라보자';
    const m2 = clamp(scrubForbiddenPhrasing(j?.m2 ?? ''), 60) || '몇 개 괜찮은 거 있나 훑어볼게';
    return [
      { type: 'luna_text', text: m1 },
      { type: 'luna_text', text: m2 },
    ];
  } catch {
    return [
      { type: 'luna_text', text: '어 잠깐, 진짜 같이 골라보자' },
      { type: 'luna_text', text: '몇 개 괜찮은 거 있나 훑어볼게' },
    ];
  }
}

// ============================================
// 2. 쿼리 확장 (Flash-Lite)
// ============================================

async function expandQueries(meta: BrowseSessionMeta): Promise<string[]> {
  const prompt = `2026년 기준 한국 웹에서 아래 유저 요청에 맞는 좋은 검색 쿼리 2~3개를 뽑아줘.

주제: ${topicLabelOf(meta.topic)}
요청: ${meta.userAsk}
${meta.budget ? `예산: ${meta.budget}` : ''}
${meta.constraints?.length ? `맥락: ${meta.constraints.join(', ')}` : ''}

[출력] 순수 JSON 배열만. 예) ["쿼리1", "쿼리2", "쿼리3"]
- 각 쿼리는 한글, 2026/2025 같은 연도 태그 포함.
- 서로 각도가 다르게 (가격 / 감성 / 후기 등).`;

  try {
    const r = await gemini.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      config: { maxOutputTokens: 250, temperature: 0.6 },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const arr = extractJsonArray(r.text ?? '') as unknown;
    if (!Array.isArray(arr)) throw new Error('invalid');
    const qs = arr
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter((s) => s.length > 0)
      .slice(0, 3);
    if (qs.length === 0) throw new Error('empty');
    return qs;
  } catch {
    const base = `${meta.userAsk} ${topicLabelOf(meta.topic)}`;
    return [
      `${base} 추천 ${meta.budget ?? ''} 2026 후기`.trim().replace(/\s+/g, ' '),
      `${base} 리뷰 2026`.trim().replace(/\s+/g, ' '),
    ];
  }
}

// ============================================
// 3. Brave 병렬 검색 → 후보 풀 구성
// ============================================

async function buildCandidatePool(
  queries: string[],
  limitPerQuery = 10,
): Promise<BrowseCandidateSeed[]> {
  const results = await Promise.all(
    queries.map((q) =>
      braveWebSearch({ q, count: limitPerQuery, freshness: 'year' }).catch((err) => {
        console.warn(`[BrowseAgent] Brave 실패 "${q}":`, err instanceof Error ? err.message : err);
        return [] as BraveWebResult[];
      }),
    ),
  );

  // URL 기준 dedup, 한글 포함 결과 우선
  const seen = new Set<string>();
  const merged: BrowseCandidateSeed[] = [];
  let id = 1;

  for (const batch of results) {
    for (const r of batch) {
      if (!r.url || !r.title) continue;
      if (seen.has(r.url)) continue;
      seen.add(r.url);
      merged.push({
        id: `c${id++}`,
        title: r.title.slice(0, 100),
        url: r.url,
        description: r.description?.slice(0, 300),
        siteName: r.profileName || siteName(r.url),
      });
    }
  }

  // 1차 필터: 너무 generic (도메인 root) 제외
  return merged.filter((c) => {
    try {
      const u = new URL(c.url);
      return u.pathname.length > 1;
    } catch {
      return false;
    }
  });
}

// ============================================
// 4. per-candidate judge (Grounded Flash)
// ============================================

interface JudgeOutput {
  verdict: 'show' | 'ask' | 'skip';
  skipReason?: string;
  intro?: string;
  verdictTake?: string;
  question?: string;
  /** 각 리뷰 사이사이 루나가 얹는 짧은 반응. reviewSnippets 개수-1 또는 같은 개수. */
  reviewCommentary?: string[];
  /** ask/show 일 때 decision 옵션 */
  options?: Array<{ label: string; value: string; emoji?: string; style?: 'primary' | 'neutral' | 'danger' }>;
  /** 추정 가격 힌트 (optional) */
  priceHint?: string;
}

async function judgeCandidate(
  meta: BrowseSessionMeta,
  seed: BrowseCandidateSeed,
  reviews: ReviewSnippet[],
): Promise<JudgeOutput> {
  const reviewBlock = reviews.length === 0
    ? '(수집된 실제 리뷰 없음)'
    : reviews.map((r, i) => `[${i + 1}] "${r.quote}" (${r.sourceLabel}, ${r.stance})`).join('\n');

  const prompt = `${LUNA_SYNTHESIS_PREAMBLE}

[상황]
넌 루나 — 동생이랑 같이 쇼핑/장소 고르는 언니/누나.
지금 후보 하나를 받아서 **동생한테 보여줄 가치가 있는지** 네 감각으로 판단해.
절대 분석/리포트 톤 쓰지 마. 친한 언니가 옆에서 중얼거리는 톤.

[유저가 원하는 거]
- 주제: ${topicLabelOf(meta.topic)}
- 요청: ${meta.userAsk}
- 예산: ${meta.budget ?? '무관'}
- 맥락: ${meta.constraints?.length ? meta.constraints.join(', ') : '없음'}

[이 후보]
- 제목: ${seed.title}
- 출처: ${seed.siteName ?? '웹'}
- URL: ${seed.url}
- 설명: ${seed.description ?? '(없음)'}

[수집된 실제 리뷰]
${reviewBlock}

[지시]
다음 verdict 중 하나 선택:
- "show":  추천할 만해, 동생한테 보여주자.
- "ask":   애매함. 동생 의견 물어보고 싶어 ("나는 별론데 너는 어때?" 느낌).
- "skip":  분명 안 맞음 (예산 초과, 취향 반대, 리뷰 부정 다수). 조용히 다음.

verdict='skip' 일 땐 다른 필드는 비워도 되지만 skipReason 은 반말 1문장 ("이건 가격이 확 튀네, 패스").

verdict='show' 또는 'ask' 일 땐 다음을 채워:
- intro:         루나가 이걸 꺼내는 첫 말풍선 ~30자. "오 이거 괜찮은 거 걸렸어 — ${seed.title}" 같은 톤.
- reviewCommentary: 수집된 리뷰 개수만큼 반응 문장 (각 ~25자, 반말). "이 사람 되게 만족했나봐" / "음 이건 호불호 갈릴 수도" 같은 류.
- verdictTake:   리뷰 다 읽고 나서 루나 종합 판단 2문장 ~80자. 구체적으로 — 어디가 좋고 어디가 걸리는지.
- question:      ask 일 때만, 유저한테 물어볼 한 마디 ~20자.
- options:       버튼 2~3개. value 는 아래 중:
                  - "keep" (👍 좋아 킵)
                  - "skip" (⏭️ 패스)
                  - "next" (💬 다른 거)
                  - "decide" (🏁 이걸로 결정) — shortlist 있을 때만.
- priceHint:     (선택) 리뷰/제목 맥락으로 짐작되는 가격. 모르면 비워.

[출력 JSON — 이것만, 설명 금지]
{
  "verdict": "show|ask|skip",
  "skipReason": "...",
  "intro": "...",
  "reviewCommentary": ["...", "..."],
  "verdictTake": "...",
  "question": "...",
  "options": [{"label":"👍 좋아 킵","value":"keep","style":"primary"}, {"label":"⏭️ 패스","value":"skip"}, {"label":"💬 다른 거","value":"next"}],
  "priceHint": "..."
}

⚠️ 규칙
- 반말 유지.
- 루나 톤 — 언니가 같이 쇼핑하는 느낌.
- 리뷰 원문은 그대로 두고 루나 comment 만 새로 쓰는 거.
- "세션" "추천드립니다" "큐레이션" 금지.`;

  try {
    const r = await gemini.models.generateContent({
      model: 'gemini-2.5-flash',
      config: { maxOutputTokens: 1200, temperature: 0.75 },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const j = extractJson(r.text ?? '') as Partial<JudgeOutput> | null;
    if (!j || typeof j !== 'object') throw new Error('invalid');

    const verdict: JudgeOutput['verdict'] =
      j.verdict === 'show' || j.verdict === 'ask' || j.verdict === 'skip' ? j.verdict : 'ask';

    return {
      verdict,
      skipReason: clamp(scrubForbiddenPhrasing(j.skipReason ?? ''), 60),
      intro: clamp(scrubForbiddenPhrasing(j.intro ?? ''), 70),
      reviewCommentary: Array.isArray(j.reviewCommentary)
        ? j.reviewCommentary.map((c) => clamp(scrubForbiddenPhrasing(String(c ?? '')), 50)).filter(Boolean)
        : [],
      verdictTake: clamp(scrubForbiddenPhrasing(j.verdictTake ?? ''), 160),
      question: clamp(scrubForbiddenPhrasing(j.question ?? ''), 40),
      options: Array.isArray(j.options)
        ? j.options.map((o) => ({
            label: clamp(String((o as any)?.label ?? ''), 20),
            value: String((o as any)?.value ?? 'skip'),
            emoji: typeof (o as any)?.emoji === 'string' ? (o as any).emoji : undefined,
            style: (o as any)?.style === 'primary' || (o as any)?.style === 'danger' ? (o as any).style : 'neutral',
          })).filter((o) => o.label && o.value)
        : undefined,
      priceHint: typeof j.priceHint === 'string' ? j.priceHint.trim().slice(0, 30) : undefined,
    };
  } catch (err) {
    console.warn('[BrowseAgent] judge 실패, show fallback:', err instanceof Error ? err.message : err);
    return {
      verdict: 'show',
      intro: `이거 봐봐 — ${seed.title.slice(0, 40)}`,
      verdictTake: '괜찮아 보이는데, 상세는 링크 눌러서 확인해봐.',
      reviewCommentary: [],
      options: [
        { label: '👍 좋아 킵', value: 'keep', style: 'primary' },
        { label: '⏭️ 패스', value: 'skip' },
        { label: '💬 다른 거', value: 'next' },
      ],
    };
  }
}

// ============================================
// 5. Closing 멘트 (Flash-Lite)
// ============================================

async function buildClosingBlocks(
  state: BrowseSessionState,
): Promise<{ blocks: BrowseBlock[]; lunaFinal: string }> {
  const shortlist = state.shortlist;
  const prompt = `${LUNA_SYNTHESIS_PREAMBLE}

[상황]
같이 찾기 세션 마무리. 동생이 shortlist 에 ${shortlist.length}개 킵해둠:
${shortlist.map((s, i) => `  ${i + 1}. ${s.title}`).join('\n') || '  (없음)'}

원 요청: ${state.meta.userAsk}

[지시]
루나가 건네는 마무리 말풍선 하나. 3문장 이내. 반말.
- shortlist 가 있으면 킵한 거에 대한 코멘트 + 결정 격려 한 마디.
- shortlist 가 없으면 "다른 각도로 다시 볼래?" 느낌.

[출력] { "final": "루나 마무리 한 단락 ~120자" }`;

  try {
    const r = await gemini.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      config: { maxOutputTokens: 300, temperature: 0.85 },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const j = extractJson(r.text ?? '') as { final?: string } | null;
    const final = clamp(scrubForbiddenPhrasing(j?.final ?? ''), 220) ||
      (shortlist.length
        ? `오케이 ${shortlist.length}개 건졌네. 이 중에 진짜 마음 가는 거 하나 정하면 알려줘.`
        : '오늘은 딱 꽂히는 게 없었네. 다른 각도로 다시 찾아볼까?');
    return { blocks: [{ type: 'luna_text', text: final }], lunaFinal: final };
  } catch {
    const final = shortlist.length
      ? `오케이 ${shortlist.length}개 건졌네. 이 중에 진짜 마음 가는 거 하나 정하면 알려줘.`
      : '오늘은 딱 꽂히는 게 없었네. 다른 각도로 다시 찾아볼까?';
    return { blocks: [{ type: 'luna_text', text: final }], lunaFinal: final };
  }
}

// ============================================
// 6. 후보 1개에 대한 블록 시퀀스 조립
// ============================================

async function buildPerCandidateBlocks(
  meta: BrowseSessionMeta,
  seed: BrowseCandidateSeed,
  hasShortlist: boolean,
): Promise<{
  blocks: BrowseBlock[];
  verdict: JudgeOutput['verdict'];
  promptId?: string;
}> {
  // 1) 리뷰 수집 (grounded) — 실패해도 계속 진행
  const reviews = await fetchGroundedReviews({
    title: seed.title,
    context: [meta.userAsk, meta.budget, ...(meta.constraints ?? [])].filter(Boolean).join(' '),
    max: 3,
  });

  // 2) LLM judge
  const judge = await judgeCandidate(meta, seed, reviews);

  if (judge.verdict === 'skip') {
    const reason = judge.skipReason || '이건 좀 아닌 것 같다, 다음 거 볼게';
    return {
      blocks: [{ type: 'luna_text', text: reason }],
      verdict: 'skip',
    };
  }

  const blocks: BrowseBlock[] = [];

  // 2-a. intro 말풍선
  if (judge.intro) blocks.push({ type: 'luna_text', text: judge.intro });

  // 2-b. 링크 카드
  blocks.push({
    type: 'link_card',
    title: seed.title,
    url: seed.url,
    siteName: seed.siteName || siteName(seed.url),
    priceHint: judge.priceHint,
  });

  // 2-c. 리뷰 있으면 "잠깐 후기 볼게" + 리뷰 번갈아 + 루나 코멘터리
  if (reviews.length > 0) {
    blocks.push({ type: 'luna_text', text: '잠깐 후기 좀 볼게...' });
    reviews.forEach((rv, idx) => {
      blocks.push({
        type: 'review_quote',
        quote: rv.quote,
        sourceLabel: rv.sourceLabel,
        sourceUrl: rv.sourceUrl,
        stance: rv.stance,
      });
      const commentary = judge.reviewCommentary?.[idx];
      if (commentary) blocks.push({ type: 'luna_text', text: commentary });
    });
  }

  // 2-d. 종합 판단
  if (judge.verdictTake) blocks.push({ type: 'luna_text', text: judge.verdictTake });

  // 2-e. 질문 (ask 일 때만)
  const question = judge.verdict === 'ask' && judge.question ? judge.question : undefined;

  // 2-f. 선택지 (기본 + shortlist 있을 때 decide 추가)
  const baseOptions = judge.options && judge.options.length > 0
    ? judge.options
    : [
        { label: '👍 좋아 킵', value: 'keep', style: 'primary' as const },
        { label: '⏭️ 패스', value: 'skip', style: 'neutral' as const },
        { label: '💬 다른 거', value: 'next', style: 'neutral' as const },
      ];
  const options = [...baseOptions];
  if (hasShortlist && !options.some((o) => o.value === 'decide')) {
    options.push({ label: '🏁 이걸로 결정', value: 'decide', style: 'neutral' as const });
  }

  const promptId = `${seed.id}-${Date.now().toString(36)}`;
  blocks.push({
    type: 'decision_prompt',
    promptId,
    question,
    options,
  });

  return { blocks, verdict: judge.verdict, promptId };
}

// ============================================
// 7. 공개 API: 세션 시작
// ============================================

export async function startBrowseAgent(
  params: BrowseAgentStartParams,
): Promise<AgentRunResult> {
  const meta: BrowseSessionMeta = {
    sessionId: params.sessionId,
    topic: params.topic,
    topicLabel: `${topicLabelOf(params.topic)} — ${clamp(params.userAsk, 40)}`,
    userAsk: params.userAsk,
    budget: params.budget,
    constraints: params.constraints,
    createdAt: Date.now(),
  };

  const state = createSession(meta, 5);
  const emits: AgentBlockEmit[] = [];

  // 1. 오프닝
  const openers = await buildOpenerBlocks(meta);
  for (const b of openers) {
    emits.push({ block: b, order: nextBlockOrder(meta.sessionId) });
  }

  // 2. 쿼리 확장 + Brave 검색
  updateSession(meta.sessionId, { stage: 'searching' });
  const queries = await expandQueries(meta);
  const pool = await buildCandidatePool(queries, 10);
  updateSession(meta.sessionId, { pool, stage: 'per_candidate' });

  if (pool.length === 0) {
    const fallback = '음 이번엔 깊게 못 찾았어. 조건을 살짝 바꿔볼래?';
    emits.push({
      block: { type: 'luna_text', text: fallback },
      order: nextBlockOrder(meta.sessionId),
    });
    return {
      blocks: emits,
      ended: true,
      endPayload: { shortlist: [], lunaFinal: fallback },
    };
  }

  // 3. 첫 후보 진행
  const more = await emitNextCandidate(meta.sessionId);
  emits.push(...more.blocks);
  return {
    blocks: emits,
    ended: more.ended,
    endPayload: more.endPayload,
  };
}

// ============================================
// 8. 다음 후보 1개 처리 (유저 decision 후 재진입용)
// ============================================

async function emitNextCandidate(sessionId: string): Promise<AgentRunResult> {
  const state = getSession(sessionId);
  if (!state) {
    return { blocks: [], ended: true, endPayload: { shortlist: [], lunaFinal: '' } };
  }

  const emits: AgentBlockEmit[] = [];

  // 상한 도달 or pool 비었으면 종료 흐름
  if (state.shown.length >= state.maxShown || state.pool.length === 0) {
    return finalizeSession(sessionId);
  }

  const seed = popNextCandidate(sessionId);
  if (!seed) return finalizeSession(sessionId);

  const { blocks, verdict, promptId } = await buildPerCandidateBlocks(
    state.meta,
    seed,
    state.shortlist.length > 0,
  );

  // skip 은 그냥 1블록 붙이고 다음 후보 자동 진행 (recursion)
  if (verdict === 'skip') {
    markRejected(sessionId, seed);
    for (const b of blocks) {
      emits.push({ block: b, order: nextBlockOrder(sessionId) });
    }
    // 연쇄 skip 방지: 최대 3 연속까지만 자동 진행
    const chained = await emitNextCandidate(sessionId);
    emits.push(...chained.blocks);
    return {
      blocks: emits,
      ended: chained.ended,
      endPayload: chained.endPayload,
    };
  }

  // show/ask: 블록들 emit + 후보를 shown 에 기록 + awaitingDecision 설정
  markShown(sessionId, seed);
  for (const b of blocks) {
    emits.push({
      candidateId: seed.id,
      block: b,
      order: nextBlockOrder(sessionId),
    });
  }

  if (promptId) {
    updateSession(sessionId, {
      awaitingDecision: { promptId, context: 'per_candidate', candidateId: seed.id },
      stage: 'awaiting_user',
      currentCandidate: seed,
    });
  }

  return { blocks: emits, ended: false };
}

// ============================================
// 9. 유저 decision 후 resume
// ============================================

export async function resumeBrowseAgent(
  sessionId: string,
  decision: { promptId: string; value: string },
): Promise<AgentRunResult> {
  const state = getSession(sessionId);
  if (!state) {
    return {
      blocks: [],
      ended: true,
      endPayload: {
        shortlist: [],
        lunaFinal: '음 세션이 만료됐어. 다시 시작할까?',
      },
    };
  }

  // promptId 불일치 → stale 클릭. 무시하되 세션은 유지.
  if (!state.awaitingDecision || state.awaitingDecision.promptId !== decision.promptId) {
    console.log(`[BrowseAgent] ⏭️ stale decision id=${decision.promptId} (awaiting=${state.awaitingDecision?.promptId})`);
    return { blocks: [], ended: false };
  }

  const emits: AgentBlockEmit[] = [];
  const currentId = state.awaitingDecision.candidateId;
  const current = state.shown.find((s) => s.id === currentId) ?? state.currentCandidate;

  // awaitingDecision 해제
  updateSession(sessionId, { awaitingDecision: undefined, stage: 'per_candidate' });

  const val = decision.value;

  // keep → shortlist 추가
  if (val === 'keep' && current) {
    markShortlist(sessionId, current);
    emits.push({
      block: { type: 'luna_text', text: '오케이, 이건 후보 킵! 📌' },
      order: nextBlockOrder(sessionId),
    });
  } else if (val === 'skip' && current) {
    // 그냥 패스 (루나 짧은 반응 후 다음)
    emits.push({
      block: { type: 'luna_text', text: '오케이, 다음 거 볼게' },
      order: nextBlockOrder(sessionId),
    });
  } else if (val === 'next' && current) {
    markRejected(sessionId, current);
    emits.push({
      block: { type: 'luna_text', text: '음 그래, 좀 다른 각도로 더 볼게' },
      order: nextBlockOrder(sessionId),
    });
  } else if (val === 'decide' && current) {
    // 즉시 결정 — shortlist 에 아직 없으면 추가하고 종료
    if (!state.shortlist.some((s) => s.id === current.id)) {
      markShortlist(sessionId, current);
    }
    // 최종 종료
    const final = await finalizeSession(sessionId, current);
    return { blocks: [...emits, ...final.blocks], ended: true, endPayload: final.endPayload };
  } else if (val === 'more' || val === 'more_shortlist') {
    // 후보 계속
    emits.push({
      block: { type: 'luna_text', text: '좋아, 하나 더 볼게' },
      order: nextBlockOrder(sessionId),
    });
  } else if (val === 'finish') {
    const final = await finalizeSession(sessionId);
    return { blocks: [...emits, ...final.blocks], ended: true, endPayload: final.endPayload };
  }

  // shortlist 2개 도달 → 마무리 갈림길 제안
  if (state.shortlist.length + (val === 'keep' && current ? 0 : 0) >= 2) {
    // 이미 shortlist 에 2개면 묻기
    if (state.shortlist.length >= 2) {
      const promptId = `finish-${Date.now().toString(36)}`;
      emits.push({
        block: {
          type: 'decision_prompt',
          promptId,
          question: `좋아한 거 ${state.shortlist.length}개인데, 이걸로 갈까 하나 더 볼까?`,
          options: [
            { label: '🏁 이걸로 결정', value: 'finish', style: 'primary' },
            { label: '🔄 하나 더 보기', value: 'more_shortlist', style: 'neutral' },
          ],
        },
        order: nextBlockOrder(sessionId),
      });
      updateSession(sessionId, {
        awaitingDecision: { promptId, context: 'closing' },
        stage: 'awaiting_user',
      });
      return { blocks: emits, ended: false };
    }
  }

  // 다음 후보로
  const next = await emitNextCandidate(sessionId);
  return {
    blocks: [...emits, ...next.blocks],
    ended: next.ended,
    endPayload: next.endPayload,
  };
}

// ============================================
// 10. 세션 종료
// ============================================

async function finalizeSession(
  sessionId: string,
  chosenOverride?: BrowseCandidateSeed,
): Promise<AgentRunResult> {
  const state = getSession(sessionId);
  if (!state) {
    return { blocks: [], ended: true, endPayload: { shortlist: [], lunaFinal: '' } };
  }
  updateSession(sessionId, { stage: 'closing' });
  const { blocks, lunaFinal } = await buildClosingBlocks(state);

  const emits: AgentBlockEmit[] = blocks.map((b) => ({
    block: b,
    order: nextBlockOrder(sessionId),
  }));

  const chosen = chosenOverride ?? state.shortlist[state.shortlist.length - 1];

  updateSession(sessionId, { stage: 'ended' });

  return {
    blocks: emits,
    ended: true,
    endPayload: {
      chosen: chosen ? { title: chosen.title, url: chosen.url } : undefined,
      shortlist: state.shortlist.map((s) => ({ title: s.title, url: s.url })),
      lunaFinal,
    },
  };
}
