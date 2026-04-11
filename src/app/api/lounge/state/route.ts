import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getDailyState, type CharacterDailyState, type CounselingSessionSummary } from '@/engines/lounge/daily-state-engine';
import type { UserMemoryProfile } from '@/engines/memory/extract-memory';

/**
 * GET /api/lounge/state
 * 🆕 v42: 배치 메시지 포함 — 상담기억 + 친밀도 주입
 *
 * - 같은 날이면 캐시 리턴 (LLM 0회)
 * - 새 날이면 LLM 1회 호출로 30~50개 배치 메시지 생성
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // memory_profile + user_model 로드
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('memory_profile, persona_mode, nickname, user_model')
    .eq('id', user.id)
    .single();

  const memoryProfile: UserMemoryProfile = (profile?.memory_profile as any) ?? {
    basicInfo: {}, relationshipContext: { mainIssues: [] },
    emotionPatterns: { dominantEmotions: [], triggers: [] },
    sessionHighlights: [], communicationPrefs: { whatWorks: [], whatDoesnt: [] },
    tarotMemory: { frequentCards: [], significantReadings: [] },
    lastUpdated: '', totalSessions: 0,
  };

  // DB의 nickname을 memory_profile에 반영
  if (profile?.nickname && memoryProfile.basicInfo) {
    memoryProfile.basicInfo.nickname = profile.nickname;
  }

  const existingState = (memoryProfile as any).todayState as CharacterDailyState | undefined;

  // 닉네임이 캐시와 다르면 재생성 강제
  const cachedName = JSON.stringify(existingState ?? '');
  const nameChanged = profile?.nickname && existingState && !cachedName.includes(profile.nickname);
  const validCache = nameChanged ? null : existingState ?? null;

  // 🆕 v42: 최근 상담 세션 요약 추출
  const recentSessions = extractRecentSessions(memoryProfile);

  // 🆕 v42: 어제 라운지 대화 하이라이트 추출
  const yesterdayHighlights = extractYesterdayHighlights(memoryProfile);

  // 🆕 v42: 친밀도 상태 추출
  const userModel = (profile?.user_model ?? {}) as any;
  const persona = (profile?.persona_mode ?? 'luna') as 'luna' | 'tarot';
  const intimacyState = userModel?.intimacy?.[persona] ?? null;

  // Daily State + 배치 메시지 생성 또는 캐시 리턴
  const { state, fromCache } = await getDailyState(memoryProfile, validCache, {
    userId: user.id,
    recentSessions,
    yesterdayHighlights,
    intimacyState,
  });

  // 새로 생성했으면 DB에 저장
  if (!fromCache) {
    const updated = { ...memoryProfile, todayState: state } as any;
    await supabase
      .from('user_profiles')
      .update({ memory_profile: updated })
      .eq('id', user.id);
    console.log(`[Lounge] ✨ Daily State 새로 생성 (배치 ${state.batchMessages?.messages?.length ?? 0}개)`);
  } else {
    console.log(`[Lounge] 📦 Daily State 캐시 리턴 (배치 ${state.batchMessages?.messages?.length ?? 0}개)`);
  }

  // 체크인 상태
  const today = new Date().toISOString().slice(0, 10);
  const checkins = (memoryProfile as any).dailyCheckins ?? [];
  const todayCheckedIn = checkins.some((c: any) => c.date === today);

  // 톡방 히스토리
  const loungeHistory = (memoryProfile as any).loungeHistory ?? { date: '', messages: [] };
  const todayHistory = loungeHistory.messages ?? [];
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
    // 🆕 v42: 배치 메시지 직접 전달 (편의)
    batchMessages: state.batchMessages ?? null,
    intimacyLevel: intimacyState?.level ?? 1,
    intimacyLevelName: intimacyState?.levelName ?? '새싹',
  });
}

// ─── 헬퍼: 최근 상담 세션 요약 추출 ────────────────────

function extractRecentSessions(memory: UserMemoryProfile): CounselingSessionSummary[] {
  const highlights = memory.sessionHighlights ?? [];
  return highlights.slice(-3).map((h: any) => ({
    date: h.date ?? '최근',
    keyTopic: h.keyTopic ?? '고민 상담',
    insight: h.insight ?? '',
    mood: h.emotionScore != null
      ? (h.emotionScore >= 3 ? '좋음' : h.emotionScore >= 2 ? '보통' : '힘듦')
      : '알 수 없음',
    actionTaken: h.actionTaken ?? '',
  }));
}

// ─── 헬퍼: 어제 라운지 대화 하이라이트 ─────────────────

function extractYesterdayHighlights(memory: UserMemoryProfile): string[] {
  const history = (memory as any).loungeHistory;
  if (!history?.messages?.length) return [];

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const yesterdayMsgs = (history.messages as any[]).filter((m: any) => m.date === yesterday);

  if (yesterdayMsgs.length === 0) return [];

  // 유저 발화 + 캐릭터 중요 발화만 추출
  return yesterdayMsgs
    .filter((m: any) => m.type === 'user' || (m.type === 'character' && m.text?.length > 10))
    .slice(-8)
    .map((m: any) => {
      const speaker = m.type === 'user' ? '유저' : (m.speaker === 'luna' ? '루나' : '타로냥');
      return `${speaker}: ${m.text}`;
    });
}
