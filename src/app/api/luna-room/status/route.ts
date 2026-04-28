/**
 * GET /api/luna-room/status
 *
 * 루나의 현재 상태 + 미열람 선물 수 + 최근 추억 반환.
 * 방문할 때마다 호출 — 선물 자동 생성 side-effect 포함.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAgeDays, getLifeStageInfo, pendingGiftDay, getGiftPrompt, GIFT_SCHEDULE } from '@/lib/luna-life';
import { generateWithCascade, GEMINI_MODELS } from '@/lib/ai/provider-registry';

export async function GET(_req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  // Fetch Luna's life record
  const { data: life } = await supabase
    .from('luna_life')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!life) {
    return NextResponse.json({ initialized: false });
  }

  const ageDays = getAgeDays(new Date(life.birth_date));
  const info = getLifeStageInfo(ageDays);

  // Auto-generate pending gift (fire-and-forget style, awaited for correctness)
  const pendingDay = pendingGiftDay(ageDays, life.last_gift_day);
  if (pendingDay !== null) {
    await generateAndStoreGift(supabase, user.id, pendingDay, info);
    await supabase
      .from('luna_life')
      .update({ last_gift_day: pendingDay, is_deceased: ageDays >= 100 })
      .eq('user_id', user.id);
  } else if (ageDays >= 100 && !life.is_deceased) {
    await supabase
      .from('luna_life')
      .update({ is_deceased: true })
      .eq('user_id', user.id);
  }

  // Fetch gifts + memories
  const [{ data: gifts }, { data: memories }] = await Promise.all([
    supabase.from('luna_gifts').select('*').eq('user_id', user.id).order('trigger_day', { ascending: true }),
    supabase.from('luna_memories').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
  ]);

  const unopened = (gifts ?? []).filter((g: any) => !g.opened_at).length;

  return NextResponse.json({
    initialized: true,
    ageDays,
    birthDate: life.birth_date,
    isDeceased: ageDays >= 100,
    stage: info,
    unopenedGifts: unopened,
    gifts: (gifts ?? []).map((g: any) => ({
      id: g.id,
      triggerDay: g.trigger_day,
      giftType: g.gift_type,
      title: g.title,
      content: g.content,
      openedAt: g.opened_at,
      createdAt: g.created_at,
    })),
    recentMemories: (memories ?? []).map((m: any) => ({
      id: m.id,
      title: m.title,
      content: m.content,
      dayNumber: m.day_number,
      createdAt: m.created_at,
    })),
  });
}

async function generateAndStoreGift(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  triggerDay: number,
  info: ReturnType<typeof getLifeStageInfo>,
) {
  // 🆕 v90: 추억 + 실제 상담 데이터 병렬 로드 → 편지에 진짜 사연 녹이기
  const [
    { data: memoriesRaw },
    { data: profile },
    { data: recentSessions },
    { data: topMemories },
  ] = await Promise.all([
    supabase
      .from('luna_memories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('user_profiles')
      .select('memory_profile, nickname')
      .eq('id', userId)
      .single(),
    supabase
      .from('counseling_sessions')
      .select('session_summary, created_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .not('session_summary', 'is', null)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('user_memories')
      .select('luna_feeling')
      .eq('user_id', userId)
      .not('luna_feeling', 'is', null)
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  const memories = (memoriesRaw ?? []).map((m: any) => ({
    id: m.id, title: m.title, content: m.content, dayNumber: m.day_number, createdAt: m.created_at,
  }));

  // memory_profile JSONB → GiftUserContext 빌드
  const mp = (profile?.memory_profile as any) ?? {};
  const userContext = {
    nickname: profile?.nickname ?? mp?.basicInfo?.nickname ?? null,
    mainIssues: mp?.relationshipContext?.mainIssues ?? [],
    dominantEmotions: mp?.emotionPatterns?.dominantEmotions ?? [],
    lunaImpression: mp?.lunaImpression ?? undefined,
    recentSessionSummaries: (recentSessions ?? []).map((s: any) => ({
      date: s.created_at,
      summary: s.session_summary,
    })),
    topLunaFeelings: (topMemories ?? [])
      .map((m: any) => m.luna_feeling)
      .filter(Boolean) as string[],
  };

  const scheduleEntry = GIFT_SCHEDULE.find((g: { day: number }) => g.day === triggerDay);
  const { system, user: userPrompt } = getGiftPrompt(triggerDay, info, memories, userContext);

  try {
    const result = await generateWithCascade(
      [
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_25 },
        { provider: 'gemini', tier: 'opus',   modelOverride: GEMINI_MODELS.FLASH_25 },
      ],
      system,
      [{ role: 'user', content: userPrompt }],
      600,
    );

    const content = result.text?.trim() ?? '';
    if (!content) return;

    await supabase.from('luna_gifts').insert({
      user_id: userId,
      trigger_day: triggerDay,
      gift_type: scheduleEntry?.type ?? 'letter',
      title: scheduleEntry?.titleHint ?? `${triggerDay}일째 편지`,
      content,
    });
  } catch (err) {
    console.error('[LunaGift] 생성 실패:', err);
  }
}
