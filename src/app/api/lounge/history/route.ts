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

  // 오늘치만 저장 (최대 50개 메시지)
  profile.loungeHistory = {
    date: today,
    messages: (messages ?? []).slice(-50),
    crossTalkPlayed: crossTalkPlayed ?? false,
  };

  await supabase
    .from('user_profiles')
    .update({ memory_profile: profile })
    .eq('id', user.id);

  return NextResponse.json({ ok: true });
}
