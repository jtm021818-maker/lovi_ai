/**
 * v118: POST /api/luna-room/inventory/[id]/favorite
 *
 * 즐겨찾기 토글. favorite_at 컬럼이 NULL 이면 now() 로 세팅, 아니면 NULL 로.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, ctx: Params) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { id } = await ctx.params;

  const { data: row } = await supabase
    .from('user_inventory_items')
    .select('favorite_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: '미보유 아이템' }, { status: 404 });

  const newValue = row.favorite_at ? null : new Date().toISOString();
  await supabase
    .from('user_inventory_items')
    .update({ favorite_at: newValue })
    .eq('id', id)
    .eq('user_id', user.id);

  return NextResponse.json({ ok: true, favorite: !!newValue });
}
