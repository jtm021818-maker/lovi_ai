/**
 * v117: GET /api/relationship/daily-log/range?persona=luna&days=60
 *
 * 데일리 일기 N일치 일괄 조회 — 캘린더/히스토리 뷰용.
 * 응답: { logs: Array<{ log_date, content }> } (날짜 내림차순)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const personaParam = url.searchParams.get('persona');
  const persona = personaParam === 'tarot' ? 'tarot' : 'luna';
  const daysParam = Number(url.searchParams.get('days') ?? '60');
  const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), 365) : 60;

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sinceDate = since.toISOString().slice(0, 10);

  try {
    const { data, error } = await supabase
      .from('relationship_daily_logs')
      .select('log_date, content')
      .eq('user_id', user.id)
      .eq('persona', persona)
      .gte('log_date', sinceDate)
      .order('log_date', { ascending: false });

    if (error) {
      console.warn('[daily-log/range] DB error (graceful):', error.message);
      return NextResponse.json({ logs: [] });
    }

    return NextResponse.json({ logs: data ?? [] });
  } catch (e) {
    return NextResponse.json({ logs: [], error: (e as Error).message }, { status: 200 });
  }
}
