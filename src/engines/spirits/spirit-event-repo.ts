/**
 * 🧚 v104: Spirit Event Repository
 *
 * spirit_event_fires / spirit_wishes / spirit_keepsakes 테이블 CRUD.
 * Pipeline (server) + API route 양쪽에서 호출.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { SpiritId } from '@/types/spirit.types';
import type { ConversationPhaseV2 } from '@/types/engine.types';
import type { SpiritEventType, SpiritEventDataAny } from './spirit-event-types';

// ────────────────────────────────────────────────────────────
// 1) 마지막 발동 시각 (시계 기반 쿨타임 계산용)
// ────────────────────────────────────────────────────────────
export async function fetchLastFire(
  userId: string,
  spiritId: SpiritId,
): Promise<Date | null> {
  const sb = await createServerSupabaseClient();
  const { data, error } = await sb
    .from('spirit_event_fires')
    .select('fired_at')
    .eq('user_id', userId)
    .eq('spirit_id', spiritId)
    .order('fired_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return new Date((data as any).fired_at);
}

/** 한번에 여러 정령의 마지막 발동 시각 조회 (게이트 성능 최적화) */
export async function fetchLastFiresBulk(
  userId: string,
  spiritIds: SpiritId[],
): Promise<Map<SpiritId, Date>> {
  const out = new Map<SpiritId, Date>();
  if (spiritIds.length === 0) return out;
  const sb = await createServerSupabaseClient();
  const { data, error } = await sb
    .from('spirit_event_last_fire_v')
    .select('spirit_id,last_fire_at')
    .eq('user_id', userId)
    .in('spirit_id', spiritIds);
  if (error || !data) return out;
  for (const row of data as Array<{ spirit_id: string; last_fire_at: string }>) {
    out.set(row.spirit_id as SpiritId, new Date(row.last_fire_at));
  }
  return out;
}

// ────────────────────────────────────────────────────────────
// 2) 별똥이 월간 사용 여부
// ────────────────────────────────────────────────────────────
/** 이번 달(KST 1일 자정 기준) 안에 사용한 소원이 있는지 */
export async function hasUsedMonthlyWish(userId: string, now: Date): Promise<boolean> {
  const monthStartKst = startOfKstMonth(now);
  const sb = await createServerSupabaseClient();
  const { count, error } = await sb
    .from('spirit_wishes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('committed_at', monthStartKst.toISOString());
  if (error) return false;
  return (count ?? 0) > 0;
}

/** KST 기준 이번 달 1일 00:00 (UTC Date 객체) */
function startOfKstMonth(now: Date): Date {
  // KST = UTC+9
  const kstNow = new Date(now.getTime() + 9 * 3600_000);
  const y = kstNow.getUTCFullYear();
  const m = kstNow.getUTCMonth();
  // KST 1일 00:00 = UTC 전날 15:00
  return new Date(Date.UTC(y, m, 1, 0, 0, 0) - 9 * 3600_000);
}

// ────────────────────────────────────────────────────────────
// 3) 세션 내 이미 발동된 정령 이벤트 조회
// ────────────────────────────────────────────────────────────
export async function fetchFiredThisSession(
  userId: string,
  sessionId: string,
): Promise<SpiritEventType[]> {
  const sb = await createServerSupabaseClient();
  const { data, error } = await sb
    .from('spirit_event_fires')
    .select('event_type')
    .eq('user_id', userId)
    .eq('session_id', sessionId);
  if (error || !data) return [];
  return (data as Array<{ event_type: string }>).map(r => r.event_type as SpiritEventType);
}

// ────────────────────────────────────────────────────────────
// 4) 발동 로그
// ────────────────────────────────────────────────────────────
export interface LogSpiritFireInput {
  userId: string;
  sessionId: string | null;
  spiritId: SpiritId;
  eventType: SpiritEventType;
  phase: ConversationPhaseV2;
  turnNo: number;
  result: SpiritEventDataAny;
}

export async function logSpiritFire(input: LogSpiritFireInput): Promise<void> {
  const sb = await createServerSupabaseClient();
  const { error } = await sb.from('spirit_event_fires').insert({
    user_id: input.userId,
    session_id: input.sessionId,
    spirit_id: input.spiritId,
    event_type: input.eventType,
    phase: input.phase,
    turn_no: input.turnNo,
    result: input.result as unknown as Record<string, unknown>,
  });
  // unique constraint conflict (같은 세션 같은 event_type) → silent skip
  if (error && !(error.message ?? '').includes('duplicate key')) {
    console.error('[spirit-event-repo] logSpiritFire failed:', error);
  }
}

// ────────────────────────────────────────────────────────────
// 5) 유저 선택 업데이트 (POST /api/spirits/event/choose)
// ────────────────────────────────────────────────────────────
export async function updateUserChoice(input: {
  userId: string;
  sessionId: string | null;
  eventType: SpiritEventType;
  userChoice: string;
  userInput?: Record<string, unknown> | null;
}): Promise<{ ok: boolean }> {
  const sb = await createServerSupabaseClient();
  // 가장 최근 fire 1건의 user_choice/user_input 갱신
  const { data: latest } = await sb
    .from('spirit_event_fires')
    .select('id')
    .eq('user_id', input.userId)
    .eq('event_type', input.eventType)
    .order('fired_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest) return { ok: false };
  const { error } = await sb
    .from('spirit_event_fires')
    .update({
      user_choice: input.userChoice,
      user_input: input.userInput ?? null,
    })
    .eq('id', (latest as any).id);
  if (error) {
    console.error('[spirit-event-repo] updateUserChoice failed:', error);
    return { ok: false };
  }
  return { ok: true };
}

// ────────────────────────────────────────────────────────────
// 6) 별똥이 월간 소원 약속
// ────────────────────────────────────────────────────────────
export interface CommitWishInput {
  userId: string;
  originalWish: string;
  ifPhrase: string;
  thenPhrase: string;
  triggerAt?: Date | null;
}

export async function commitWish(input: CommitWishInput): Promise<{ id: string } | null> {
  const sb = await createServerSupabaseClient();
  const { data, error } = await sb
    .from('spirit_wishes')
    .insert({
      user_id: input.userId,
      original_wish: input.originalWish,
      if_phrase: input.ifPhrase,
      then_phrase: input.thenPhrase,
      trigger_at: input.triggerAt ? input.triggerAt.toISOString() : null,
    })
    .select('id')
    .single();
  if (error || !data) {
    console.error('[spirit-event-repo] commitWish failed:', error);
    return null;
  }
  return { id: (data as any).id };
}

/** 지난 달 약속이 이행됐는지 판정용 — 다음 달 별똥이 카드 회상 */
export async function fetchLastWish(userId: string, _now?: Date): Promise<{
  fulfilled: boolean | null;
  thenPhrase: string;
  committedAt: string;
} | null> {
  const sb = await createServerSupabaseClient();
  const { data } = await sb
    .from('spirit_wishes')
    .select('fulfilled,then_phrase,committed_at')
    .eq('user_id', userId)
    .order('committed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    fulfilled: (data as any).fulfilled ?? null,
    thenPhrase: (data as any).then_phrase ?? '',
    committedAt: (data as any).committed_at ?? '',
  };
}

// ────────────────────────────────────────────────────────────
// 7) 보관함 (편지/꽃잎/가치/고백 공통)
// ────────────────────────────────────────────────────────────
export type KeepsakeKind = 'letter' | 'release' | 'value' | 'confession';

export interface SaveKeepsakeInput {
  userId: string;
  spiritId: SpiritId;
  kind: KeepsakeKind;
  body: string;
  meta?: Record<string, unknown>;
}

export async function saveKeepsake(input: SaveKeepsakeInput): Promise<{ id: string } | null> {
  const sb = await createServerSupabaseClient();
  const { data, error } = await sb
    .from('spirit_keepsakes')
    .insert({
      user_id: input.userId,
      spirit_id: input.spiritId,
      kind: input.kind,
      body: input.body,
      meta: input.meta ?? null,
    })
    .select('id')
    .single();
  if (error || !data) {
    console.error('[spirit-event-repo] saveKeepsake failed:', error);
    return null;
  }
  return { id: (data as any).id };
}

export async function deleteKeepsake(userId: string, id: string): Promise<{ ok: boolean }> {
  const sb = await createServerSupabaseClient();
  const { error } = await sb.from('spirit_keepsakes').delete().eq('user_id', userId).eq('id', id);
  return { ok: !error };
}

// ────────────────────────────────────────────────────────────
// 8) 사용자 가입 일자 (butterfly_meta / book_keeper 게이트용)
// ────────────────────────────────────────────────────────────
export async function getUserAgeDays(userId: string, now: Date): Promise<number> {
  const sb = await createServerSupabaseClient();
  // auth.users 는 직접 조회 어려움. profile 또는 user_currency 의 created_at 사용.
  // 1차: user_currency.updated_at 가장 오래된 것
  const { data } = await sb
    .from('user_currency')
    .select('updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (data && (data as any).updated_at) {
    const created = new Date((data as any).updated_at);
    return Math.max(0, Math.floor((now.getTime() - created.getTime()) / 864e5));
  }
  // fallback: 0
  return 0;
}

// ────────────────────────────────────────────────────────────
// 9) book_keeper / butterfly_meta — 과거 세션 통계
// ────────────────────────────────────────────────────────────
export async function fetchRecentUserMessages(
  userId: string,
  sessionLimit: number,
): Promise<string[]> {
  const sb = await createServerSupabaseClient();
  // chat_sessions → messages join 단순화: 직접 messages 에 user_id 있다고 가정 (서비스마다 다름)
  // 안전 폴백: 빈 배열.
  try {
    const { data: sessions } = await sb
      .from('chat_sessions')
      .select('id')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(sessionLimit);
    if (!sessions || sessions.length === 0) return [];
    const ids = (sessions as Array<{ id: string }>).map(s => s.id);
    const { data: msgs } = await sb
      .from('messages')
      .select('content')
      .in('session_id', ids)
      .eq('role', 'user')
      .limit(500);
    if (!msgs) return [];
    return (msgs as Array<{ content: string }>).map(m => m.content).filter(Boolean);
  } catch (e) {
    console.warn('[spirit-event-repo] fetchRecentUserMessages fallback', e);
    return [];
  }
}

export interface SessionStat {
  avgEmotionScore: number;
  topWords: string[];
  signature: string;
}

export async function fetchSessionsStat(
  userId: string,
  fromIso: string | null,
  toIso: string | null,
  limit = 10,
): Promise<SessionStat | null> {
  const sb = await createServerSupabaseClient();
  let q = sb.from('chat_sessions').select('id,started_at').eq('user_id', userId);
  if (fromIso) q = q.gte('started_at', fromIso);
  if (toIso) q = q.lt('started_at', toIso);
  q = q.order('started_at', { ascending: false }).limit(limit);
  const { data: sessions } = await q;
  if (!sessions || sessions.length === 0) return null;
  const ids = (sessions as Array<{ id: string }>).map(s => s.id);

  // 감정 점수 평균: messages.metadata.emotion_score 등 service 마다 다름. fallback 평균 0.
  const { data: msgs } = await sb
    .from('messages')
    .select('content')
    .in('session_id', ids)
    .eq('role', 'user')
    .limit(1000);

  const contents = (msgs as Array<{ content: string }> | null)?.map(m => m.content) ?? [];
  const topWords = computeTopWords(contents, 3);
  return {
    avgEmotionScore: 0,           // pipeline 에서 추가 주입 가능
    topWords,
    signature: ids.length >= 3 ? '자주 도달한 곳' : '시작점',
  };
}

// ────────────────────────────────────────────────────────────
// 10) 단어 빈도 추출 (book_keeper / butterfly_meta 보조)
// ────────────────────────────────────────────────────────────
const STOPWORDS = new Set([
  '그', '이', '저', '나', '너', '걔', '그리고', '근데', '그런데', '뭐', '뭘',
  '왜', '어떻게', '진짜', '정말', '아', '음', '응', '네', '예', '뭐야',
  '그래', '그게', '그건', '나는', '내가', '나도', '너는', '너도', '이거',
  '저거', '그거', '이런', '저런', '그런', '같아', '같은', '있어', '없어',
  '하는', '해서', '했어', '했는데', '하고', '했', '되', '돼', '될',
]);

export function computeTopWords(contents: string[], limit = 3): string[] {
  const freq = new Map<string, number>();
  for (const c of contents) {
    const tokens = c.split(/[\s,.!?…ㅋㅎㅠㅜ~"'()\[\]{}]+/).filter(Boolean);
    for (const t of tokens) {
      if (t.length < 2 || t.length > 6) continue;
      if (STOPWORDS.has(t)) continue;
      if (/^\d+$/.test(t)) continue;
      freq.set(t, (freq.get(t) ?? 0) + 1);
    }
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

/** N-gram 반복 추출 (book_keeper) — minN..maxN, minCount 이상만 */
export function extractRepeatedNgrams(
  contents: string[],
  opts: { minN: number; maxN: number; minCount: number; limit?: number },
): Array<{ text: string; count: number }> {
  const freq = new Map<string, number>();
  for (const c of contents) {
    const tokens = c.split(/[\s,.!?…ㅋㅎㅠㅜ~"'()\[\]{}]+/).filter(Boolean);
    for (let n = opts.minN; n <= opts.maxN; n++) {
      for (let i = 0; i + n <= tokens.length; i++) {
        const gram = tokens.slice(i, i + n).join(' ');
        // 의미 있는 길이 + stopword 시작 X
        if (gram.length < 3) continue;
        const head = tokens[i];
        if (STOPWORDS.has(head)) continue;
        freq.set(gram, (freq.get(gram) ?? 0) + 1);
      }
    }
  }
  return Array.from(freq.entries())
    .filter(([_, c]) => c >= opts.minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, opts.limit ?? 5)
    .map(([text, count]) => ({ text, count }));
}
