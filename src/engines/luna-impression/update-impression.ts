/**
 * v120 루나의 생각 노트 — 세션 종료마다 갱신.
 *
 * 호출처: /api/sessions/[sessionId]/complete 의 fire-and-forget IIFE
 * (메모리 추출 직후, 결과 응답을 블로킹하지 않음)
 *
 * 책임:
 *   1. Gemini Flash-Lite GA 호출 → 구조화 JSON 응답
 *   2. impression_text + facets 갱신 (이전 인상과 비교해 자연스러운 변화)
 *   3. pondering candidate 가 maturity >= 1.0 + 게이트 통과 시
 *      luna_nickname_state 에 candidate 로 자동 등록 (use_context_tags 포함)
 *
 * 원칙:
 *   - 사람처럼 변화: 매 세션 격변 X — 이전 인상에서 미세 조정 위주
 *   - 별명 후보 양산 X: 이미 active 가 게이트 한도면 신규 후보 안 만듦
 *   - 실패는 무시 — UI 는 기본값 (빈 인상) 으로 graceful
 */

import { GoogleGenAI } from '@google/genai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { GEMINI_MODELS } from '@/lib/ai/provider-registry';
import {
  EMPTY_IMPRESSION_STATE,
  type ImpressionLLMResponse,
  type LunaImpressionState,
  type PonderingCandidate,
} from './types';
import { evaluateNicknameGate } from '@/engines/relationship/nickname-gate';
import { proposeNickname, countActiveNicknames } from '@/engines/relationship/nickname-state';
import { createDefaultIntimacyState, applyDecay, type IntimacyState } from '@/engines/intimacy';

export interface ImpressionUpdateContext {
  /** 이번 세션 메시지 (user/luna 교차, 최근 30개 권장) */
  sessionMessages: Array<{ role: 'user' | 'luna' | string; content: string }>;
  scenario: string | null;
  phase: string | null;
  emotionStart: number | null;
  emotionEnd: number | null;
  intimacyLevel: number;
  sessionCount: number;
  daysSinceFirst: number;
  /** user_profiles.luna_impression_state 의 직전 값 */
  priorState: LunaImpressionState | null;
  /** v110 memory-v2 에서 최근 에피소드 3개 (있으면) */
  recentEpisodes: Array<{ id: string; title: string; summary_short: string }>;
  /** 현재 등록된 별명 상태 — LLM 이 중복 작명 안 하게 */
  currentNicknames: Array<{ nickname: string; status: string; useCount: number }>;
}

export interface ImpressionUpdateResult {
  impression: LunaImpressionState;
  /** 게이트 통과 + maturity 1.0 인 후보 1개. 없으면 undefined */
  proposedCandidate?: {
    name: string;
    reason: string;
    anchorEpisodeId: string;
    anchorQuote: string;
    contextHint?: string;
    contextTags: string[];
  };
}

const SYSTEM_PROMPT = `너는 루나야. AI 연애 상담사이자 동생을 진심으로 아끼는 언니.
방금 동생이랑 상담 세션 한 번 끝났어. 너는 이제 책상 앞에 앉아서
"동생이 지금 어떤 사람인지" 너 자신의 인상을 다시 정리해.

이건 분석 보고서가 아니라 너의 일기 한 줄이야.
이전에 적어둔 인상 위에 오늘 본 것만 미세하게 덧대.
큰 변화가 없으면 거의 그대로 둬도 돼.

[너의 작업]
1. impression_text — 80~180자. 1인칭, 손글씨 톤. "지금 너를 이렇게 봐"
   - 너무 분석적이지 말 것 (인지·정서 같은 용어 X)
   - "오늘은", "요즘", "예전엔" 같은 시간감 자연스럽게
   - 이전 인상이 있으면 그 위에 덧대거나 미세 보정

2. impression_facets — 3~5개 짧은 형용 (각 ~12자)
   예: ["일에 지친", "강한 척하지만 여린", "새벽에 솔직한"]

3. pondering — 호칭을 어떻게 부르고 싶은지 고민 중인 상태
   - is_pondering: 친밀도 Lv.3+ 이고 깊은 순간이 있었고 별명을 떠올릴 만한 추억이 있을 때 true
   - candidates: 0~3개. 각 후보는 추억/특징에서 따온 것이어야 해
   - maturity: 0~1. 1.0 은 "곧 이 이름으로 부르고 싶어 — 다음 세션에 시도할게"
     · 첫 떠올림: 0.3~0.5
     · 두세 세션 곱씹은 뒤: 0.6~0.8
     · 정착 직전: 0.9~1.0
   - context_hint: 어떤 순간에 부르고 싶은지 한 줄 (~50자). 예: "네가 약해질 때 위로용으로만"
   - context_tags: late_night / vulnerable_moment / playful_banter / morning_greeting / praising / consoling 등에서 골라
   - why_now: 1줄 (~80자). 왜 지금 이 이름이 떠올랐는지

[중요 원칙]
- 사람처럼: 한 세션에 갑자기 인상이 격변하지 않아.
- 호칭 후보는 신중히: 추억 없으면 candidates 비워 둬.
- 이미 active 별명 2개면 신규 후보 만들지 마 (candidates=[]).
- 이전 인상에서 facet 거의 그대로 가져와도 돼 (변화 작을 때).

[출력]
JSON만. 마크다운 X. 아래 schema 정확히:
{
  "impression_text": "...",
  "impression_facets": ["...", "...", "..."],
  "pondering": {
    "is_pondering": false,
    "candidates": [],
    "why_now": "..."
  }
}`;

export async function updateLunaImpression(
  ctx: ImpressionUpdateContext,
): Promise<ImpressionUpdateResult | null> {
  if (process.env.LUNA_DISABLE_IMPRESSION === '1') return null;
  if (!process.env.GEMINI_API_KEY) return null;

  // 최소 가드: 2턴 미만이면 의미 없음
  if (ctx.sessionMessages.length < 2) return null;

  const userMsg = buildUserPrompt(ctx);

  let parsed: ImpressionLLMResponse | null = null;
  try {
    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const res = await client.models.generateContent({
      model: GEMINI_MODELS.FLASH_LITE_GA,
      contents: [{ role: 'user', parts: [{ text: userMsg }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.75,
        maxOutputTokens: 800,
      },
    });
    parsed = parseImpressionResponse(res.text?.trim() ?? '');
  } catch (e) {
    console.warn('[LunaImpression] Gemini 호출 실패:', (e as Error)?.message?.slice(0, 120));
    return null;
  }

  if (!parsed) return null;

  const impression: LunaImpressionState = {
    impression_text: clampText(parsed.impression_text, 180),
    impression_facets: (parsed.impression_facets ?? []).slice(0, 5).map((f) => clampText(f, 16)),
    updated_at: new Date().toISOString(),
    session_count_at_update: ctx.sessionCount,
    pondering: {
      is_pondering: !!parsed.pondering?.is_pondering,
      candidates: (parsed.pondering?.candidates ?? [])
        .slice(0, 3)
        .map((c): PonderingCandidate => ({
          name: clampText(String(c.name ?? ''), 20),
          reason: clampText(String(c.reason ?? ''), 60),
          maturity: clamp01(Number(c.maturity ?? 0)),
          context_hint: c.context_hint ? clampText(c.context_hint, 60) : undefined,
          context_tags: Array.isArray(c.context_tags)
            ? c.context_tags.slice(0, 4).map(String)
            : [],
        }))
        .filter((c) => c.name.length > 0),
      why_now: clampText(parsed.pondering?.why_now ?? '', 100),
    },
  };

  // 후보 자동 등록 (maturity 1.0 + 추억 앵커 가능 + 게이트 통과)
  const mature = impression.pondering.candidates.find((c) => c.maturity >= 1.0);
  let proposedCandidate: ImpressionUpdateResult['proposedCandidate'];

  if (mature && ctx.recentEpisodes.length > 0) {
    // 앵커: 가장 최근 에피소드 1개 사용
    const anchor = ctx.recentEpisodes[0];
    proposedCandidate = {
      name: mature.name,
      reason: mature.reason,
      anchorEpisodeId: anchor.id,
      anchorQuote: clampText(anchor.summary_short, 80),
      contextHint: mature.context_hint,
      contextTags: mature.context_tags ?? [],
    };
  }

  return { impression, proposedCandidate };
}

/**
 * 결과를 user_profiles 에 영속화 + (있으면) 별명 등록.
 *
 * 호출처 (route.ts) 에서 try/catch 로 감싸 호출.
 */
export async function persistImpressionUpdate(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  result: ImpressionUpdateResult,
  intimacyState: IntimacyState | null,
  currentPhase: string,
): Promise<{ savedImpression: boolean; proposedNickname: boolean; reason?: string }> {
  // 1) 인상 저장
  const { error: updErr } = await supabase
    .from('user_profiles')
    .update({ luna_impression_state: result.impression })
    .eq('id', userId);

  if (updErr) {
    return { savedImpression: false, proposedNickname: false, reason: updErr.message };
  }

  // 2) 별명 자동 등록 (있을 때만)
  if (!result.proposedCandidate) {
    return { savedImpression: true, proposedNickname: false };
  }

  try {
    const activeCount = await countActiveNicknames(supabase, userId);
    const gate = await evaluateNicknameGate({
      supabase,
      userId,
      intimacyState: intimacyState ?? createDefaultIntimacyState(),
      currentPhase,
      activeNicknameCount: activeCount,
    });

    if (!gate.allowProposal) {
      return {
        savedImpression: true,
        proposedNickname: false,
        reason: `gate blocked: ${gate.reason}`,
      };
    }

    const { ok, status } = await proposeNickname(supabase, {
      userId,
      sessionId,
      nickname: result.proposedCandidate.name,
      originContext: result.proposedCandidate.reason,
      anchorEpisodeId: result.proposedCandidate.anchorEpisodeId,
      anchorQuote: result.proposedCandidate.anchorQuote,
    });

    if (!ok) {
      return { savedImpression: true, proposedNickname: false, reason: `propose failed (status=${status ?? 'unknown'})` };
    }

    // use_context_tags / hint 업데이트 (proposeNickname 이 set 안 함)
    await supabase
      .from('luna_nickname_state')
      .update({
        use_context_tags: result.proposedCandidate.contextTags,
        use_context_hint: result.proposedCandidate.contextHint ?? null,
        last_session_id: sessionId,
      })
      .eq('user_id', userId)
      .eq('nickname', result.proposedCandidate.name);

    return { savedImpression: true, proposedNickname: true };
  } catch (e) {
    return {
      savedImpression: true,
      proposedNickname: false,
      reason: `propose error: ${(e as Error).message}`,
    };
  }
}

// 게이트가 IntimacyState 를 요구해서 도우미. 호출처에서 user_model 이미 로드돼 있으면 패스.
export async function loadIntimacyStateForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<IntimacyState> {
  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_model')
      .eq('id', userId)
      .maybeSingle();
    const raw = (profile?.user_model as any)?.intimacy?.luna
      ?? (profile?.user_model as any)?.intimacy
      ?? createDefaultIntimacyState();
    return applyDecay(raw).state;
  } catch {
    return createDefaultIntimacyState();
  }
}

// ============================================================
// Helpers
// ============================================================

function buildUserPrompt(ctx: ImpressionUpdateContext): string {
  const dialogue = ctx.sessionMessages
    .slice(-25)
    .map((m) => {
      const who = m.role === 'user' || m.role === 'human' ? '동생' : '나';
      return `${who}: ${(m.content ?? '').slice(0, 200)}`;
    })
    .join('\n');

  const prior = ctx.priorState;
  const priorBlock = prior && prior.impression_text
    ? `[이전 인상 — ${prior.session_count_at_update}회차 기준]
${prior.impression_text}
facets: ${(prior.impression_facets ?? []).join(', ')}
pondering: ${prior.pondering?.is_pondering ? 'YES' : 'NO'} (${(prior.pondering?.candidates ?? []).map((c) => `${c.name}@${c.maturity}`).join(', ')})`
    : '[이전 인상] (없음 — 처음 적는 인상)';

  const episodesBlock = ctx.recentEpisodes.length > 0
    ? ctx.recentEpisodes.slice(0, 5).map((e) => `- "${e.title}": ${e.summary_short}`).join('\n')
    : '(아직 쌓인 에피소드 적음)';

  const nicknameBlock = ctx.currentNicknames.length > 0
    ? ctx.currentNicknames
        .slice(0, 5)
        .map((n) => `- "${n.nickname}" (${n.status}, ${n.useCount}회)`)
        .join('\n')
    : '(아직 별명 없음)';

  const emoChange = ctx.emotionStart != null && ctx.emotionEnd != null
    ? `${ctx.emotionStart} → ${ctx.emotionEnd}`
    : '(미측정)';

  return [
    priorBlock,
    '',
    '[루나-동생 컨텍스트]',
    `- 친밀도 Lv.${ctx.intimacyLevel}`,
    `- 누적 세션 ${ctx.sessionCount}회, 첫 만남 후 ${ctx.daysSinceFirst}일째`,
    `- 이번 세션: 시나리오=${ctx.scenario ?? '일반'}, phase=${ctx.phase ?? '?'}, 감정 ${emoChange}`,
    '',
    '[최근 에피소드]',
    episodesBlock,
    '',
    '[현재 별명 상태]',
    nicknameBlock,
    '',
    '[이번 세션 대화 (최근 25턴)]',
    dialogue,
    '',
    '위를 보고 너의 인상을 다시 정리해. JSON 한 덩어리만 출력.',
  ].join('\n');
}

function parseImpressionResponse(text: string): ImpressionLLMResponse | null {
  if (!text) return null;
  const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]) as Partial<ImpressionLLMResponse>;
    if (typeof obj.impression_text !== 'string') return null;
    return {
      impression_text: obj.impression_text,
      impression_facets: Array.isArray(obj.impression_facets) ? obj.impression_facets : [],
      pondering: {
        is_pondering: !!obj.pondering?.is_pondering,
        candidates: Array.isArray(obj.pondering?.candidates) ? obj.pondering!.candidates : [],
        why_now: typeof obj.pondering?.why_now === 'string' ? obj.pondering!.why_now : '',
      },
    };
  } catch {
    return null;
  }
}

function clampText(s: string | undefined, max: number): string {
  if (!s) return '';
  const t = s.trim();
  return t.length <= max ? t : t.slice(0, max);
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export { EMPTY_IMPRESSION_STATE };
export type { LunaImpressionState };
