/**
 * v102: GET /api/luna-room/sorrow/check
 *
 * 86~100일 슬픔 빌드업 이벤트 중 사용자가 아직 보지 못한 가장 큰 day 1건 반환.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAgeDays } from '@/lib/luna-life';
import { eventsForDay, pickDueSorrowDay } from '@/lib/luna-life/sorrow-events';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { data: life } = await supabase
    .from('luna_life').select('birth_date').eq('user_id', user.id).single();

  if (!life?.birth_date) return NextResponse.json({ kind: 'none' });

  const ageDays = getAgeDays(new Date(life.birth_date));
  if (ageDays < 86) return NextResponse.json({ kind: 'none' });

  // 사용자가 본 마지막 sorrow day
  const { data: seenRows } = await supabase
    .from('luna_sorrow_event_seen')
    .select('day')
    .eq('user_id', user.id)
    .order('day', { ascending: false })
    .limit(1);

  const lastSeenDay = seenRows?.[0]?.day ?? 85;
  const due = pickDueSorrowDay(ageDays, lastSeenDay);
  if (due === null) return NextResponse.json({ kind: 'none' });

  const events = eventsForDay(due);

  // 이 day 의 이벤트들을 일괄 seen 처리 (멱등)
  await supabase
    .from('luna_sorrow_event_seen')
    .upsert(
      events.map((e) => ({ user_id: user.id, day: due, kind: e.kind })),
      { onConflict: 'user_id,day,kind', ignoreDuplicates: true },
    );

  return NextResponse.json({
    day: due,
    ageDays,
    events,
  });
}
