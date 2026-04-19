/**
 * 🎰 v83: GET /api/gacha/state
 * 모든 배너의 현재 피티/상태 반환
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { data } = await supabase
    .from('user_gacha_state')
    .select('*')
    .eq('user_id', user.id);

  const states: Record<string, any> = {};
  for (const row of data ?? []) {
    states[row.banner_id] = {
      bannerId: row.banner_id,
      pityCounter: row.pity_counter,
      isPickupGuaranteed: row.is_pickup_guaranteed,
      totalPulls: row.total_pulls,
      lastPullAt: row.last_pull_at,
    };
  }

  return NextResponse.json({ states });
}
