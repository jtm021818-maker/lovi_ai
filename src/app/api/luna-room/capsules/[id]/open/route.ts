/**
 * v104 M3: POST /api/luna-room/capsules/[id]/open
 *
 * 캡슐 ceremony 닫기 시 호출 → unlocked_at 마킹.
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
    .from('user_time_capsules')
    .update({ unlocked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('unlocked_at', null);

  return NextResponse.json({ ok: true });
}
