/**
 * GET /api/luna-room/streak
 *
 * 🆕 v112: 진입 컨텍스트 통합 (lightweight)
 *   - streak: 연속 방문 일수
 *   - recentSessionCount24h: 24h 내 세션 수
 *   - birthDate: luna_life.birth_date (ISO) — ageDays 계산용
 *   - memoryCount: luna_memories 누적 (있으면)
 *
 * 정의:
 *   - 같은 KST 일자에 counseling_sessions 가 1개 이상 있으면 = 그날 방문
 *   - 오늘부터 거꾸로 연속해서 방문한 날 수 (오늘 포함)
 *   - 오늘 방문 안 했어도 어제까지 연속이면 어제까지 카운트
 *     (단, 어제 방문 X 이면 streak=0)
 *
 * 응답: { streak, recentSessionCount24h, birthDate?, memoryCount }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// KST = UTC+9
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function toKstDateKey(iso: string): string {
  // ISO → KST 자정 기준 YYYY-MM-DD
  const ms = new Date(iso).getTime() + KST_OFFSET_MS;
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayKstKey(): string {
  return toKstDateKey(new Date().toISOString());
}

function yesterdayKstKey(): string {
  const ms = Date.now() - 24 * 60 * 60 * 1000;
  return toKstDateKey(new Date(ms).toISOString());
}

function dayBefore(key: string): string {
  // YYYY-MM-DD → 하루 전
  const [y, m, d] = key.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d) - 24 * 60 * 60 * 1000;
  const dt = new Date(ms);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export async function GET(_req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  // 최근 30일 세션 + 라이프 + 추억 갯수 병렬
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [sessionsRes, lifeRes, memoryRes] = await Promise.all([
    supabase
      .from('counseling_sessions')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false }),
    supabase
      .from('luna_life')
      .select('birth_date')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('luna_memories')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ]);

  const sessions = sessionsRes.data ?? [];
  const error = sessionsRes.error;
  const birthDate = (lifeRes.data?.birth_date as string | undefined) ?? null;
  const memoryCount = memoryRes.count ?? 0;

  if (error) {
    console.error('[luna-room/streak] DB 에러:', error);
    return NextResponse.json({ streak: 0, recentSessionCount24h: 0, birthDate, memoryCount });
  }

  // 일자별 set
  const visitedDays = new Set<string>();
  const since24hMs = Date.now() - 24 * 60 * 60 * 1000;
  let recentSessionCount24h = 0;

  for (const row of sessions) {
    if (!row?.created_at) continue;
    const ts = new Date(row.created_at).getTime();
    if (Number.isFinite(ts) && ts >= since24hMs) {
      recentSessionCount24h += 1;
    }
    visitedDays.add(toKstDateKey(row.created_at));
  }

  // streak 계산: 오늘부터 거꾸로 연속 일수
  // — 오늘 방문 X 면 어제부터 카운트 (어제 방문 X 면 0)
  let cursor = todayKstKey();
  if (!visitedDays.has(cursor)) {
    const y = yesterdayKstKey();
    if (!visitedDays.has(y)) {
      return NextResponse.json({ streak: 0, recentSessionCount24h, birthDate, memoryCount });
    }
    cursor = y;
  }

  let streak = 0;
  while (visitedDays.has(cursor)) {
    streak += 1;
    cursor = dayBefore(cursor);
    if (streak > 365) break; // 안전 한도
  }

  return NextResponse.json({ streak, recentSessionCount24h, birthDate, memoryCount });
}
