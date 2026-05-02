/**
 * v104 M5: POST /api/luna-room/luna-return/[id]/seen
 *
 * Return Box ceremony 닫기 시 호출.
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
    .from('luna_return_box')
    .update({ status: 'seen', seen_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'pending');

  return NextResponse.json({ ok: true });
}
