import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getDailyState, type CharacterDailyState } from '@/engines/lounge/daily-state-engine';
import type { UserMemoryProfile } from '@/engines/memory/extract-memory';

/**
 * GET /api/lounge/state
 * 오늘의 캐릭터 상태 로드/생성
 * - 같은 날이면 캐시 리턴 (LLM 0회)
 * - 새 날이면 LLM 1회 호출 후 저장
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // memory_profile 로드
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('memory_profile, persona_mode, nickname')
    .eq('id', user.id)
    .single();

  const memoryProfile: UserMemoryProfile = (profile?.memory_profile as any) ?? {
    basicInfo: {}, relationshipContext: { mainIssues: [] },
    emotionPatterns: { dominantEmotions: [], triggers: [] },
    sessionHighlights: [], communicationPrefs: { whatWorks: [], whatDoesnt: [] },
    tarotMemory: { frequentCards: [], significantReadings: [] },
    lastUpdated: '', totalSessions: 0,
  };

  // DB의 nickname을 memory_profile에 반영 (이름으로 부르도록)
  if (profile?.nickname && memoryProfile.basicInfo) {
    memoryProfile.basicInfo.nickname = profile.nickname;
  }

  const existingState = (memoryProfile as any).todayState as CharacterDailyState | undefined;

  // 닉네임이 캐시와 다르면 재생성 강제 (이름 변경 반영)
  const cachedName = JSON.stringify(existingState ?? '');
  const nameChanged = profile?.nickname && existingState && !cachedName.includes(profile.nickname);
  const validCache = nameChanged ? null : existingState ?? null;

  // Daily State 생성 또는 캐시 리턴
  const { state, fromCache } = await getDailyState(memoryProfile, validCache);

  // 새로 생성했으면 DB에 저장
  if (!fromCache) {
    const updated = { ...memoryProfile, todayState: state } as any;
    await supabase
      .from('user_profiles')
      .update({ memory_profile: updated })
      .eq('id', user.id);
    console.log(`[Lounge] ✨ Daily State 새로 생성 (LLM 1회)`);
  } else {
    console.log(`[Lounge] 📦 Daily State 캐시 리턴`);
  }

  // 체크인 상태
  const today = new Date().toISOString().slice(0, 10);
  const checkins = (memoryProfile as any).dailyCheckins ?? [];
  const todayCheckedIn = checkins.some((c: any) => c.date === today);

  // 🆕 오늘의 톡방 히스토리 (있으면 반환, 다음날이면 리셋)
  const loungeHistory = (memoryProfile as any).loungeHistory ?? { date: '', messages: [] };
  const todayHistory = loungeHistory.date === today ? loungeHistory.messages : [];
  // crossTalk 이미 재생했는지
  const crossTalkPlayed = loungeHistory.date === today && loungeHistory.crossTalkPlayed === true;

  return NextResponse.json({
    state,
    persona: profile?.persona_mode ?? 'luna',
    todayCheckedIn,
    streakDays: (memoryProfile as any).streakDays ?? 0,
    totalSessions: memoryProfile.totalSessions ?? 0,
    todayHistory,
    crossTalkPlayed,
    nickname: profile?.nickname ?? '나',
  });
}
