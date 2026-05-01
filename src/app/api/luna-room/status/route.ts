/**
 * GET /api/luna-room/status
 *
 * 루나의 현재 상태 + 미열람 선물 수 + 최근 추억 반환.
 * 방문할 때마다 호출 — 선물 자동 생성 side-effect 포함.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  getAgeDays,
  getLifeStageInfo,
  pendingGiftDay,
  getGiftPrompt,
  GIFT_SCHEDULE,
  computeLiveStateLocal,
  pickWhisperLocal,
} from '@/lib/luna-life';
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
  // v102 (rev2): user_spirits.lore_unlocked 카운트 = 풀린 자기-반영 fragment 수
  const [{ count: loreCount }, { data: descendant }] = await Promise.all([
    supabase
      .from('user_spirits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('lore_unlocked', true),
    supabase.from('luna_descendant').select('*').eq('user_id', user.id).maybeSingle(),
  ]);
  const loreFragmentsUnlocked = loreCount ?? 0;
  // backwards-compat 별명 — 클라이언트가 아직 옛 이름을 쓸 수 있어 두 이름 모두 노출
  const motherLoreUnlockedPages = loreFragmentsUnlocked;
  const isDescendantActive = !!descendant?.is_active;
  // ritual/generation 상태는 life row 자체에서 가져옴
  const ritualCompleted = !!life.ritual_completed_at;
  const generation = life.generation ?? 1;
  const info = getLifeStageInfo(ageDays);

  // Auto-generate pending gift (fire-and-forget style, awaited for correctness)
  const pendingDay = pendingGiftDay(ageDays, life.last_gift_day);
  if (pendingDay !== null) {
    await generateAndStoreGift(supabase, user.id, pendingDay, info, loreFragmentsUnlocked);
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

  // 🆕 v101: 도착 시각이 된 콘텐츠 일괄 마킹 (luna_mark_delivered RPC)
  const nowISO = new Date().toISOString();
  try {
    await supabase.rpc('luna_mark_delivered', { p_user: user.id, p_now: nowISO });
  } catch (e) {
    console.warn('[Status] luna_mark_delivered 실패 (무시):', (e as Error)?.message);
  }

  // Fetch gifts + memories + pinned memories + recent sessions for mood signal
  // 🆕 v101: delivered_at IS NOT NULL 만 노출 (도착한 것만)
  const since24hISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [
    { data: gifts },
    { data: memories },
    { data: pinned },
    { count: recentSessionCount },
  ] = await Promise.all([
    supabase
      .from('luna_gifts')
      .select('*')
      .eq('user_id', user.id)
      .not('delivered_at', 'is', null)
      .order('trigger_day', { ascending: true }),
    supabase
      .from('luna_memories')
      .select('*')
      .eq('user_id', user.id)
      .not('delivered_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('luna_memories')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_pinned', true)
      .not('delivered_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('counseling_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', since24hISO),
  ]);

  const unopened = (gifts ?? []).filter((g: any) => !g.opened_at).length;
  const isDeceased = ageDays >= 100;

  // ── v100: live mood/activity state ───────────────────────────────────────
  const liveState = computeLiveStateLocal({
    ageDays,
    stage: info.stage,
    serverNowMs: Date.now(),
    recentSessionWithin24h: (recentSessionCount ?? 0) > 0,
    recentMessageCount24h: recentSessionCount ?? 0,
    isDeceased,
  });

  // whisper: 캐시된 게 있으면 그것, 없으면 결정형 풀
  const cachedWhisperUntilMs = life.cached_whisper_until
    ? new Date(life.cached_whisper_until).getTime()
    : 0;
  const useCached = life.cached_whisper && cachedWhisperUntilMs > Date.now();
  liveState.whisper = useCached
    ? life.cached_whisper
    : pickWhisperLocal(liveState.mood, ageDays + Math.floor(Date.now() / (60 * 60 * 1000)));

  // ── v100: pet cooldown (4h) ──────────────────────────────────────────────
  const lastPettedMs = life.last_petted_at ? new Date(life.last_petted_at).getTime() : 0;
  const petAvailable = !isDeceased && Date.now() - lastPettedMs > 4 * 60 * 60 * 1000;

  const mapMemory = (m: any) => ({
    id: m.id,
    title: m.title,
    content: m.content,
    dayNumber: m.day_number,
    createdAt: m.created_at,
    isPinned: !!m.is_pinned,
    frameStyle: m.frame_style ?? 'wood',
    // v101
    imageUrl: m.image_url ?? null,
    lunaThought: m.luna_thought ?? null,
    scheduledFor: m.scheduled_for ?? null,
    deliveredAt: m.delivered_at ?? null,
    source: m.source ?? 'auto',
  });

  return NextResponse.json({
    initialized: true,
    ageDays,
    birthDate: life.birth_date,
    isDeceased,
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
      // v101
      scheduledFor: g.scheduled_for ?? null,
      deliveredAt: g.delivered_at ?? null,
      source: g.source ?? 'scheduled',
    })),
    recentMemories: (memories ?? []).slice(0, 5).map(mapMemory),
    allMemories: (memories ?? []).map(mapMemory),
    pinnedMemories: (pinned ?? []).map(mapMemory),
    liveState,
    petAvailable,
    // v102 (rev2)
    loreFragmentsUnlocked,
    motherLoreUnlockedPages, // legacy alias — 동일 값
    isDescendantActive,
    ritualCompleted,
    generation,
    descendantName: descendant?.name ?? null,
  });
}

async function generateAndStoreGift(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  triggerDay: number,
  info: ReturnType<typeof getLifeStageInfo>,
  motherLoreUnlockedPages: number,
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
  const { system, user: userPrompt } = getGiftPrompt(
    triggerDay, info, memories, userContext, motherLoreUnlockedPages,
  );

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
