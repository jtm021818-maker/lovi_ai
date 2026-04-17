/**
 * 💾 Session Threads DB 저장소
 */

import type {
  SessionThread,
  CreateThreadInput,
  UpdateThreadInput,
  ThreadsForLeftBrain,
} from './types';

interface SupabaseLike {
  from(table: string): any;
}

const TABLE = 'session_threads';

// ============================================================
// 조회: 유저의 활성 스레드 (새 세션 시작 시 로드)
// ============================================================

export async function fetchActiveThreads(
  supabase: SupabaseLike,
  userId: string,
  options: { limit?: number; maxDaysSinceLastMention?: number } = {},
): Promise<SessionThread[]> {
  if (!supabase) return [];

  const limit = options.limit ?? 5;
  const maxDays = options.maxDaysSinceLastMention ?? 14;
  const sinceIso = new Date(Date.now() - maxDays * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .in('status', ['open', 'dormant'])
      .gte('last_mentioned_at', sinceIso)
      .order('importance', { ascending: false })
      .order('last_mentioned_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map(rowToThread);
  } catch {
    return [];
  }
}

// ============================================================
// 좌뇌 주입용 포맷
// ============================================================

export function threadsToLeftBrainFormat(threads: SessionThread[]): ThreadsForLeftBrain[] {
  const now = Date.now();
  return threads.map(t => ({
    theme: t.theme,
    status: t.status,
    days_ago: Math.floor(
      (now - new Date(t.started_at).getTime()) / (1000 * 60 * 60 * 24)
    ),
  }));
}

// ============================================================
// 생성
// ============================================================

export async function createThread(
  supabase: SupabaseLike,
  input: CreateThreadInput,
): Promise<{ success: boolean; thread_id?: string; error?: string }> {
  if (!supabase) return { success: false, error: 'no_supabase' };

  try {
    const payload = {
      user_id: input.user_id,
      theme: input.theme,
      summary: input.summary ?? null,
      importance: input.importance ?? 0.5,
      characters: input.characters ?? [],
      status: 'open',
      started_at: new Date().toISOString(),
      last_mentioned_at: new Date().toISOString(),
      session_mention_count: 1,
    };

    const { data, error } = await supabase
      .from(TABLE)
      .insert(payload)
      .select('id')
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, thread_id: data?.id };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'unknown' };
  }
}

// ============================================================
// 업데이트 (언급 시 last_mentioned_at 갱신, status 변경)
// ============================================================

export async function updateThread(
  supabase: SupabaseLike,
  input: UpdateThreadInput,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'no_supabase' };

  try {
    const patch: any = {};
    if (input.last_mentioned_at) patch.last_mentioned_at = input.last_mentioned_at;
    if (input.status) patch.status = input.status;
    if (input.summary !== undefined) patch.summary = input.summary;
    if (input.importance !== undefined) patch.importance = input.importance;

    if (input.increment_mention_count) {
      // RPC 대신 직접 fetch + update (단순화)
      const { data: current } = await supabase
        .from(TABLE)
        .select('session_mention_count')
        .eq('id', input.id)
        .single();

      if (current) {
        patch.session_mention_count = (Number(current.session_mention_count) || 0) + 1;
      }
    }

    const { error } = await supabase.from(TABLE).update(patch).eq('id', input.id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'unknown' };
  }
}

// ============================================================
// 유사 테마 검색 (기존 스레드에 병합할지 결정)
// ============================================================

export async function findSimilarThreads(
  supabase: SupabaseLike,
  userId: string,
  themeQuery: string,
): Promise<SessionThread[]> {
  if (!supabase) return [];

  try {
    // 단순 키워드 매칭 (향후 임베딩 기반으로 확장)
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .ilike('theme', `%${themeQuery.slice(0, 30)}%`)
      .in('status', ['open', 'dormant'])
      .limit(5);

    if (error || !data) return [];
    return data.map(rowToThread);
  } catch {
    return [];
  }
}

// ============================================================
// Dormant 전환 (오래 언급 안 된 스레드 정리)
// ============================================================

export async function markOldThreadsAsDormant(
  supabase: SupabaseLike,
  userId: string,
  inactiveDays = 14,
): Promise<number> {
  if (!supabase) return 0;

  const cutoff = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ status: 'dormant' })
      .eq('user_id', userId)
      .eq('status', 'open')
      .lt('last_mentioned_at', cutoff)
      .select('id');

    if (error || !data) return 0;
    return data.length;
  } catch {
    return 0;
  }
}

// ============================================================
// 헬퍼
// ============================================================

function rowToThread(row: any): SessionThread {
  return {
    id: row.id,
    user_id: row.user_id,
    theme: row.theme,
    summary: row.summary ?? undefined,
    started_at: row.started_at,
    last_mentioned_at: row.last_mentioned_at,
    status: row.status,
    importance: Number(row.importance ?? 0.5),
    characters: Array.isArray(row.characters) ? row.characters : [],
    session_mention_count: Number(row.session_mention_count ?? 1),
    embedding: row.embedding ?? undefined,
  };
}
