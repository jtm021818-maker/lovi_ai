/**
 * v104: POST /api/luna-room/inventory/[id]/seen
 *
 * 디테일 시트 첫 오픈 시 NEW 뱃지 클리어.
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

  await supabase
    .from('user_inventory_items')
    .update({ is_new: false })
    .eq('id', id)
    .eq('user_id', user.id);

  return NextResponse.json({ ok: true });
}
