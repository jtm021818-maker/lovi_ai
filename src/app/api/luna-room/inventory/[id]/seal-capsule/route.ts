/**
 * v104 M2: POST /api/luna-room/inventory/[id]/seal-capsule
 *
 * 타임캡슐 봉인. 7/14/30일 후 unlocks_at 도달 시 인벤토리에서 자동 알림.
 * Body: { lockDays: 7|14|30, message: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface Params {
  params: Promise<{ id: string }>;
}

const ALLOWED_DAYS = [7, 14, 30];

export async function POST(req: NextRequest, ctx: Params) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { id } = await ctx.params;

  let body: { lockDays?: number; message?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }); }

  const lockDays = body.lockDays ?? 0;
  const message = (body.message ?? '').trim().slice(0, 500);
  if (!ALLOWED_DAYS.includes(lockDays)) {
    return NextResponse.json({ error: '7/14/30일 중 선택' }, { status: 400 });
  }
  if (!message) return NextResponse.json({ error: '한 마디는 적어줘' }, { status: 400 });

  const { data: row } = await supabase
    .from('user_inventory_items')
    .select('id, item_id, used_at, item:item_master(use_effect)')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: '미보유 아이템' }, { status: 404 });
  if (row.used_at) return NextResponse.json({ error: '이미 사용함' }, { status: 400 });

  const itemMaster = (row as any).item as { use_effect: string | null } | null;
  if (itemMaster?.use_effect !== 'time_capsule') {
    return NextResponse.json({ error: '타임캡슐 아님' }, { status: 400 });
  }

  const nowMs = Date.now();
  const unlocksAt = new Date(nowMs + lockDays * 86_400_000).toISOString();

  const { data: capsule } = await supabase
    .from('user_time_capsules')
    .insert({
      user_id: user.id,
      inventory_item_id: row.id,
      message,
      unlocks_at: unlocksAt,
    })
    .select()
    .maybeSingle();

  await supabase
    .from('user_inventory_items')
    .update({ used_at: new Date().toISOString() })
    .eq('id', row.id)
    .eq('user_id', user.id);

  return NextResponse.json({
    ok: true,
    capsuleId: capsule?.id ?? null,
    unlocksAt,
    message: `${lockDays}일 후 — 너에게 다시 도착할 거야.`,
  });
}
