/**
 * v104 M3: GET /api/luna-room/history
 *
 * 사용자 모든 소원 + 타임캡슐 + 만난 적 있는 루나 외출 이력 통합 조회.
 * 가방 안 "📜 기록" 진입점.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const [{ data: wishes }, { data: capsules }, { data: trips }] = await Promise.all([
    supabase
      .from('user_wishes')
      .select('id, wish_text, fulfilled, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('user_time_capsules')
      .select('id, message, sealed_at, unlocks_at, unlocked_at')
      .eq('user_id', user.id)
      .order('sealed_at', { ascending: false })
      .limit(30),
    supabase
      .from('luna_shopping_trips')
      .select('id, departed_at, returned_at, trip_day, emotion_context')
      .eq('user_id', user.id)
      .in('status', ['returned', 'seen'])
      .order('departed_at', { ascending: false })
      .limit(20),
  ]);

  const nowMs = Date.now();

  return NextResponse.json({
    wishes: (wishes ?? []).map((w) => ({
      id: w.id,
      text: w.wish_text,
      fulfilled: w.fulfilled,
      createdAt: w.created_at,
    })),
    capsules: (capsules ?? []).map((c) => {
      const unlocksMs = new Date(c.unlocks_at).getTime();
      const status: 'sealed' | 'ready' | 'opened' =
        c.unlocked_at ? 'opened' : (unlocksMs <= nowMs ? 'ready' : 'sealed');
      const daysUntilUnlock = status === 'sealed'
        ? Math.max(1, Math.ceil((unlocksMs - nowMs) / 86_400_000))
        : 0;
      return {
        id: c.id,
        message: c.message,
        sealedAt: c.sealed_at,
        unlocksAt: c.unlocks_at,
        unlockedAt: c.unlocked_at,
        status,
        daysUntilUnlock,
      };
    }),
    trips: (trips ?? []).map((t) => ({
      id: t.id,
      departedAt: t.departed_at,
      returnedAt: t.returned_at,
      day: t.trip_day,
      emotion: t.emotion_context,
    })),
  });
}
