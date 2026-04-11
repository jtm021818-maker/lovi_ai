import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * POST /api/lounge/history
 * 톡방 메시지 히스토리 저장 (오늘 하루치만, 다음날 리셋)
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { messages, crossTalkPlayed } = await req.json() as {
    messages: any[];
    crossTalkPlayed?: boolean;
  };

  const today = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from('user_profiles')
    .select('memory_profile')
    .eq('id', user.id)
    .single();

  const profile = (data?.memory_profile ?? {}) as any;

  // 🆕 v27: 7일간 누적 저장 (카톡 백업 기준 참고), 최대 150개
  // 각 메시지에 날짜 태그가 있으면 7일 지난 건 자동 정리
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const filtered = (messages ?? []).filter((m: any) => {
    if (!m.date) return true; // 날짜 없으면 유지
    return m.date >= sevenDaysAgo;
  });
  profile.loungeHistory = {
    date: today,
    messages: filtered.slice(-150),
    crossTalkPlayed: crossTalkPlayed ?? false,
  };

  await supabase
    .from('user_profiles')
    .update({ memory_profile: profile })
    .eq('id', user.id);

  return NextResponse.json({ ok: true });
}
