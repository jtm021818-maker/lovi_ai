/**
 * v117: POST /api/relationship/gate/open
 *
 * 소프트 게이트 통과 — "마음 더 열기" 의식적 탭.
 * Stardew Valley bouquet 메커닉.
 *
 * 요청 바디: { persona?: 'luna' | 'tarot', gate_level: number }  (gate_level 보통 3 — 개화→만개)
 * 응답: { ok: true, opened_at: ISO } | { error }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { persona?: string; gate_level?: number } = {};
  try {
    body = await req.json();
  } catch {
    /* 빈 바디 허용 */
  }

  const persona = body.persona === 'tarot' ? 'tarot' : 'luna';
  const gateLevel = Number(body.gate_level);

  if (!Number.isInteger(gateLevel) || gateLevel < 2 || gateLevel > 5) {
    return NextResponse.json(
      { error: 'gate_level must be integer in [2, 5]' },
      { status: 400 },
    );
  }

  const openedAt = new Date().toISOString();

  try {
    // Upsert — 이미 열려있으면 opened_at 유지, last_offered_at 만 갱신해도 OK
    // 여기서는 단순히 opened_at 을 현재 시각으로 기록 (의식적 통과 모먼트).
    const { error } = await supabase
      .from('relationship_gate_state')
      .upsert(
        {
          user_id: user.id,
          persona,
          gate_level: gateLevel,
          opened_at: openedAt,
          last_offered_at: openedAt,
        },
        { onConflict: 'user_id,persona,gate_level' },
      );

    if (error) {
      console.warn('[gate/open API] DB error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, opened_at: openedAt });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || 'Unknown error' },
      { status: 500 },
    );
  }
}

/**
 * GET — 현재 게이트 상태 조회 (페이지 진입 시 어느 게이트가 열려있는지 확인용)
 * 응답: { gates: Array<{ gate_level, opened_at, last_offered_at }> }
 */
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
      .from('relationship_gate_state')
      .select('gate_level, opened_at, last_offered_at')
      .eq('user_id', user.id)
      .eq('persona', persona);

    if (error) {
      console.warn('[gate GET API] DB error (graceful):', error.message);
      return NextResponse.json({ gates: [] });
    }

    return NextResponse.json({ gates: data ?? [] });
  } catch (e) {
    return NextResponse.json({ gates: [], error: (e as Error).message }, { status: 200 });
  }
}
