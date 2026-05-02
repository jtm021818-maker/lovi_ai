/**
 * v103: Spirit Mind Map API
 *
 * GET  /api/spirits/[id]/mind-map → { nodes: [...] }
 * POST /api/spirits/[id]/mind-map → 사용자 메모 노드 추가 (Lv3+, 최대 3개)
 *
 * 노드 종류: first_meet | bond_up | secret_unlock | room_session | user_note
 * 자동 노드는 가챠/본드/비밀 라우트에서 INSERT — 여기서는 조회 + 사용자 메모만.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface Params {
  params: Promise<{ id: string }>;
}

const MAX_USER_NOTES = 3;
const MIN_BOND_FOR_NOTE = 3;
const NODE_LIMIT = 12;

export async function GET(_req: NextRequest, ctx: Params) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { id: spiritId } = await ctx.params;

  const { data: nodes } = await supabase
    .from('spirit_mind_map_nodes')
    .select('*')
    .eq('user_id', user.id)
    .eq('spirit_id', spiritId)
    .order('created_at', { ascending: true })
    .limit(NODE_LIMIT);

  return NextResponse.json({
    nodes: (nodes ?? []).map((n: any) => ({
      id: n.id,
      type: n.node_type,
      label: n.label,
      detail: n.detail ?? null,
      createdAt: n.created_at,
    })),
  });
}

export async function POST(req: NextRequest, ctx: Params) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { id: spiritId } = await ctx.params;

  let body: { label?: string; detail?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }); }

  const label = (body.label ?? '').trim().slice(0, 60);
  const detail = body.detail?.trim().slice(0, 200) ?? null;
  if (!label) return NextResponse.json({ error: 'label 필수' }, { status: 400 });

  // Bond Lv 게이트
  const { data: row } = await supabase
    .from('user_spirits')
    .select('bond_lv')
    .eq('user_id', user.id)
    .eq('spirit_id', spiritId)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: '미보유 정령' }, { status: 404 });
  if ((row.bond_lv ?? 1) < MIN_BOND_FOR_NOTE) {
    return NextResponse.json(
      { error: `Bond Lv.${MIN_BOND_FOR_NOTE} 부터 메모 추가 가능` },
      { status: 403 },
    );
  }

  // 사용자 메모 개수 게이트
  const { count } = await supabase
    .from('spirit_mind_map_nodes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('spirit_id', spiritId)
    .eq('node_type', 'user_note');
  if ((count ?? 0) >= MAX_USER_NOTES) {
    return NextResponse.json(
      { error: `사용자 메모는 최대 ${MAX_USER_NOTES}개` },
      { status: 403 },
    );
  }

  const { data: inserted } = await supabase
    .from('spirit_mind_map_nodes')
    .insert({
      user_id: user.id,
      spirit_id: spiritId,
      node_type: 'user_note',
      label,
      detail,
    })
    .select()
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    node: inserted ? {
      id: inserted.id,
      type: inserted.node_type,
      label: inserted.label,
      detail: inserted.detail,
      createdAt: inserted.created_at,
    } : null,
  });
}
