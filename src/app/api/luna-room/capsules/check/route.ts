/**
 * v104 M3: POST /api/luna-room/capsules/check
 *
 * 만기 도달한 타임캡슐 (unlocks_at <= now AND unlocked_at IS NULL) 반환.
 * 한 번에 1개만 (가장 오래된 것 우선) — 한꺼번에 풀면 감정 폭주.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const nowISO = new Date().toISOString();

  const { data: capsules } = await supabase
    .from('user_time_capsules')
    .select('id, message, sealed_at, unlocks_at')
    .eq('user_id', user.id)
    .lte('unlocks_at', nowISO)
    .is('unlocked_at', null)
    .order('unlocks_at', { ascending: true })
    .limit(1);

  if (!capsules || capsules.length === 0) {
    return NextResponse.json({ pending: null });
  }

  const c = capsules[0];
  const sealedDate = new Date(c.sealed_at);
  const daysSealed = Math.round((Date.now() - sealedDate.getTime()) / 86_400_000);

  return NextResponse.json({
    pending: {
      id: c.id,
      message: c.message,
      sealedAt: c.sealed_at,
      unlocksAt: c.unlocks_at,
      daysSealed,
    },
  });
}
