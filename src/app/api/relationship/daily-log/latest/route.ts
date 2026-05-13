/**
 * v117: GET /api/relationship/daily-log/latest?persona=luna
 *
 * 가장 최근 데일리 일기 1장 조회 (오늘 자정 cron이 채우는 자동 생성 1줄 일기).
 * 응답: { log: { log_date, content } | null }
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

  try {
    const { data, error } = await supabase
      .from('relationship_daily_logs')
      .select('log_date, content')
      .eq('user_id', user.id)
      .eq('persona', persona)
      .order('log_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[daily-log API] DB error (graceful):', error.message);
      return NextResponse.json({ log: null });
    }

    return NextResponse.json({ log: data ?? null });
  } catch (e) {
    return NextResponse.json({ log: null, error: (e as Error).message }, { status: 200 });
  }
}
