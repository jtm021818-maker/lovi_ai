/**
 * 💾 Statement DB 저장소 (Supabase)
 */

import type { Statement, ConflictDetectionOptions } from './types';

interface SupabaseLike {
  from(table: string): any;
}

const TABLE = 'user_statements';

// ============================================================
// 저장 (배치)
// ============================================================

export async function saveStatements(
  supabase: SupabaseLike,
  statements: Statement[],
): Promise<{ success: boolean; saved: number; error?: string }> {
  if (!supabase || statements.length === 0) {
    return { success: true, saved: 0 };
  }

  try {
    const payload = statements.map(s => ({
      user_id: s.user_id,
      session_id: s.session_id ?? null,
      type: s.type,
      subject: s.subject,
      content: s.content,
      source_excerpt: s.source_excerpt,
      confidence: s.confidence,
      stated_at: s.stated_at,
      embedding: s.embedding ?? null,
    }));

    const { error } = await supabase.from(TABLE).insert(payload);

    if (error) {
      return { success: false, saved: 0, error: error.message };
    }

    return { success: true, saved: statements.length };
  } catch (err: any) {
    return { success: false, saved: 0, error: err?.message ?? 'unknown' };
  }
}

// ============================================================
// 조회: 같은 subject 의 과거 statement
// ============================================================

export async function fetchStatementsBySubject(
  supabase: SupabaseLike,
  userId: string,
  subject: string,
  options: ConflictDetectionOptions = {},
): Promise<Statement[]> {
  if (!supabase) return [];

  const lookbackDays = options.lookback_days ?? 30;
  const maxPrevious = options.max_previous ?? 10;

  const sinceIso = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('subject', subject)
      .gte('stated_at', sinceIso)
      .is('superseded_by', null)        // 이미 대체된 것은 제외
      .order('stated_at', { ascending: false })
      .limit(maxPrevious);

    if (error || !data) return [];

    return data.map(rowToStatement);
  } catch {
    return [];
  }
}

// ============================================================
// 조회: 최근 N개 (subject 무관)
// ============================================================

export async function fetchRecentStatements(
  supabase: SupabaseLike,
  userId: string,
  limit = 20,
): Promise<Statement[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .is('superseded_by', null)
      .order('stated_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map(rowToStatement);
  } catch {
    return [];
  }
}

// ============================================================
// 갱신: statement 가 모순으로 대체됨 표시
// ============================================================

export async function markSuperseded(
  supabase: SupabaseLike,
  oldStatementId: string,
  newStatementId: string,
): Promise<boolean> {
  if (!supabase || !oldStatementId || !newStatementId) return false;

  try {
    const { error } = await supabase
      .from(TABLE)
      .update({ superseded_by: newStatementId })
      .eq('id', oldStatementId);

    return !error;
  } catch {
    return false;
  }
}

// ============================================================
// 정리: 오래된 superseded statement archive
// ============================================================

export async function archiveOldStatements(
  supabase: SupabaseLike,
  userId: string,
  olderThanDays = 90,
): Promise<{ archived: number }> {
  if (!supabase) return { archived: 0 };

  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .delete()
      .eq('user_id', userId)
      .not('superseded_by', 'is', null)
      .lt('stated_at', cutoff)
      .select('id');

    if (error || !data) return { archived: 0 };
    return { archived: data.length };
  } catch {
    return { archived: 0 };
  }
}

// ============================================================
// 헬퍼
// ============================================================

function rowToStatement(row: any): Statement {
  return {
    id: row.id,
    user_id: row.user_id,
    session_id: row.session_id ?? undefined,
    type: row.type,
    subject: row.subject,
    content: row.content,
    source_excerpt: row.source_excerpt,
    confidence: Number(row.confidence ?? 0.5),
    embedding: row.embedding ?? undefined,
    stated_at: row.stated_at,
    superseded_by: row.superseded_by ?? undefined,
  };
}
