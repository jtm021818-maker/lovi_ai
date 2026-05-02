/**
 * v104: POST /api/luna-room/shopping/[tripId]/seen
 *
 * 사용자가 ReturnCeremony 모달 닫음 → trip.status = 'seen'.
 * (가방의 NEW 뱃지는 별도로 inventory/[id]/seen 으로 클리어)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface Params {
  params: Promise<{ tripId: string }>;
}

export async function POST(_req: NextRequest, ctx: Params) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { tripId } = await ctx.params;

  await supabase
    .from('luna_shopping_trips')
    .update({ status: 'seen' })
    .eq('id', tripId)
    .eq('user_id', user.id)
    .eq('status', 'returned');

  return NextResponse.json({ ok: true });
}
