/**
 * v102 (rev2): GET /api/spirits/[id]/fragment
 *
 * 풀린 정령 1마리에 대해 유저 데이터 기반의 자기-반영 페이지를 동적으로 반환.
 * 24h 캐시(spirit_fragment_cache) 사용 — 미스 시 새로 만들고 upsert.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { resolveSpiritFragment } from '@/lib/spirit-fragments/resolve';
import { getSpirit } from '@/data/spirits';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const spirit = getSpirit(id);
  if (!spirit) return NextResponse.json({ error: '정령 없음' }, { status: 404 });

  // 게이트 체크 — lore_unlocked 가 true 일 때만 노출
  const { data: row } = await supabase
    .from('user_spirits')
    .select('lore_unlocked')
    .eq('user_id', user.id)
    .eq('spirit_id', id)
    .maybeSingle();

  if (!row?.lore_unlocked) {
    return NextResponse.json({ unlocked: false, resolved: null });
  }

  // 캐시 조회 (24h)
  const dayAgoISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: cached } = await supabase
    .from('spirit_fragment_cache')
    .select('resolved_body, source_label, cached_at, bridge_one_liner, matched')
    .eq('user_id', user.id)
    .eq('spirit_id', id)
    .gte('cached_at', dayAgoISO)
    .maybeSingle();

  if (cached?.resolved_body) {
    return NextResponse.json({
      unlocked: true,
      resolved: {
        spiritId: id,
        title: `내 마음의 페이지 — ${spirit.name}`,
        body: cached.resolved_body,
        sourceLabel: cached.source_label ?? '',
        bridgeOneLiner: cached.bridge_one_liner ?? '',
        matched: !!cached.matched,
      },
    });
  }

  const resolved = await resolveSpiritFragment(supabase as any, user.id, id, spirit.name);

  // upsert (테이블 존재 시)
  try {
    await supabase.from('spirit_fragment_cache').upsert(
      {
        user_id: user.id,
        spirit_id: id,
        resolved_body: resolved.body,
        source_label: resolved.sourceLabel,
        bridge_one_liner: resolved.bridgeOneLiner,
        matched: resolved.matched,
        cached_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,spirit_id' },
    );
  } catch { /* 캐시 실패해도 응답은 정상 */ }

  return NextResponse.json({ unlocked: true, resolved });
}
