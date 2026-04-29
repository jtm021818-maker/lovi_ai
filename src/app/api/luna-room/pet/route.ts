/**
 * POST /api/luna-room/pet
 *
 * "쓰담쓰담" — 4시간 쿨타임. 성공 시 last_petted_at 갱신 + 새 whisper 풀에서 픽.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  computeLiveStateLocal,
  pickWhisperLocal,
  getAgeDays,
  getLifeStageInfo,
} from '@/lib/luna-life';

const COOLDOWN_MS = 4 * 60 * 60 * 1000;

export async function POST(_req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { data: life } = await supabase
    .from('luna_life')
    .select('birth_date, last_petted_at, is_deceased')
    .eq('user_id', user.id)
    .single();

  if (!life) return NextResponse.json({ error: '루나가 아직 깨어나지 않았어' }, { status: 400 });

  const now = Date.now();
  const last = life.last_petted_at ? new Date(life.last_petted_at).getTime() : 0;
  const remaining = COOLDOWN_MS - (now - last);
  if (remaining > 0) {
    return NextResponse.json({
      ok: false,
      cooldownSeconds: Math.ceil(remaining / 1000),
    });
  }

  const ageDays = getAgeDays(new Date(life.birth_date));
  const info = getLifeStageInfo(ageDays);
  const isDeceased = ageDays >= 100;
  if (isDeceased) {
    return NextResponse.json({ ok: false, cooldownSeconds: 0, deceased: true });
  }

  const liveState = computeLiveStateLocal({
    ageDays,
    stage: info.stage,
    serverNowMs: now,
    recentSessionWithin24h: true,
    recentMessageCount24h: 1,
    isDeceased: false,
  });

  // 새 whisper — 시드를 now 기반으로 (직전과 다른 카피 보장)
  const whisper = pickWhisperLocal(liveState.mood, Math.floor(now / 1000));

  await supabase
    .from('luna_life')
    .update({
      last_petted_at: new Date(now).toISOString(),
      cached_whisper: whisper,
      cached_whisper_until: new Date(now + 60 * 60 * 1000).toISOString(),
    })
    .eq('user_id', user.id);

  return NextResponse.json({ ok: true, whisper });
}
