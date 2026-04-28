/**
 * POST /api/sessions/salvage-stale
 *
 * v90: 오래 방치된 active 세션을 자동 회수.
 *
 * 문제: useSessionAutoComplete 가 도입되기 전에 끝난 세션들은 status='active' 로 남아있음
 *       → memory_profile / session_summary / user_memories 가 비어있어서
 *       → 다음 세션 루나가 "처음 보는 사람" 모드.
 *
 * 해결: 마지막 메시지가 30분 이상 지난 active 세션들을 찾아서 모두 complete API 호출.
 *       fire-and-forget — 최대 3개까지만 (한 번에 너무 많이 호출하면 무료 LLM rate limit).
 *
 * 호출처: 채팅 페이지 mount 시 useSessionAutoComplete 가 1번 호출.
 *
 * Body: 없음. 응답: { salvaged: string[], skipped: number }
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const STALE_AFTER_MIN = 30;
const MAX_SALVAGE_PER_CALL = 3;

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 30분 이상 방치된 active 세션 탐색 (turn_count >= 2 인 것만 — 빈 세션 무시)
  const cutoff = new Date(Date.now() - STALE_AFTER_MIN * 60 * 1000).toISOString();

  const { data: stale } = await supabase
    .from('counseling_sessions')
    .select('id, updated_at, turn_count')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .gte('turn_count', 2)
    .lt('updated_at', cutoff)
    .order('updated_at', { ascending: false })
    .limit(MAX_SALVAGE_PER_CALL);

  if (!stale || stale.length === 0) {
    return NextResponse.json({ salvaged: [], skipped: 0 });
  }

  // 각 세션의 complete API 를 순차 호출 (fire-and-forget — req URL 기준 self-call)
  const origin = new URL(req.url).origin;
  const cookie = req.headers.get('cookie') ?? '';
  const salvaged: string[] = [];
  let skipped = 0;

  for (const s of stale) {
    try {
      const res = await fetch(`${origin}/api/sessions/${s.id}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          cookie, // RLS 인증 위해 같은 세션 쿠키 전달
        },
        body: JSON.stringify({ reason: 'salvage' }),
      });
      if (res.ok) {
        salvaged.push(s.id);
        console.log(`[Salvage] ✅ ${s.id} (${s.turn_count}턴)`);
      } else {
        skipped++;
        console.warn(`[Salvage] 실패 ${s.id}:`, res.status);
      }
    } catch (err) {
      skipped++;
      console.warn(`[Salvage] 에러 ${s.id}:`, err);
    }
  }

  return NextResponse.json({ salvaged, skipped });
}
