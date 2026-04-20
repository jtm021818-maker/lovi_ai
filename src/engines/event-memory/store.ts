/**
 * 💾 Event Memory 저장 + 자발 참조 빌더
 */

import type { EventMemory, EventKind, RecentEventForLeftBrain } from './types';

interface SupabaseLike {
  from(table: string): any;
}

const TABLE = 'event_triggers';   // 기존 KBE 가 만든 테이블 재사용

// ============================================================
// 이벤트 기록 (발동 시)
// ============================================================

export async function recordEvent(
  supabase: SupabaseLike,
  event: EventMemory,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'no_supabase' };

  try {
    const payload = {
      user_id: event.user_id,
      session_id: event.session_id ?? null,
      event_type: event.event_type,
      triggered_at: event.triggered_at,
      // event_triggers 테이블의 fit_score 컬럼에 임시로 user_accepted를 0/1 매핑
      fit_score: event.user_accepted ? 0.9 : 0.5,
      user_accepted: event.user_accepted ?? null,
    };

    const { error } = await supabase.from(TABLE).insert(payload);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'unknown' };
  }
}

// ============================================================
// 최근 이벤트 조회 (좌뇌 컨텍스트 주입용)
// ============================================================

export async function fetchRecentEvents(
  supabase: SupabaseLike,
  userId: string,
  withinDays = 14,
  limit = 5,
): Promise<RecentEventForLeftBrain[]> {
  if (!supabase) return [];

  const sinceIso = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .gte('triggered_at', sinceIso)
      .order('triggered_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    const now = Date.now();
    return data.map((row: any) => ({
      type: friendlyEventName(row.event_type as EventKind),
      days_ago: Math.floor((now - new Date(row.triggered_at).getTime()) / (1000 * 60 * 60 * 24)),
      user_accepted: row.user_accepted ?? undefined,
    }));
  } catch {
    return [];
  }
}

function friendlyEventName(kind: EventKind): string {
  const map: Record<EventKind, string> = {
    VN_THEATER: 'VN 극장 (감정 거울)',
    LUNA_STORY: '루나 자기 이야기',
    TAROT: '타로 카드 뽑기',
    ACTION_PLAN: '구체적 행동 계획',
    WARM_WRAP: '따뜻한 마무리',
    EMOTION_MIRROR: '감정 거울 카드',
    PATTERN_MIRROR: '반복 패턴 짚기',
    // 🆕 v84
    SONG_RECOMMENDATION: '노래 추천',
    DATE_SPOT_RECOMMENDATION: '데이트 장소 추천',
  };
  return map[kind] ?? String(kind);
}

// ============================================================
// 좌뇌 컨텍스트 텍스트 생성
// ============================================================

export function formatRecentEventsForContext(events: RecentEventForLeftBrain[]): string {
  if (events.length === 0) return '';

  const lines: string[] = ['## 🎬 최근 이벤트 메모리 (자발 참조 가능)'];
  for (const e of events) {
    const accepted = e.user_accepted === true ? '✓ 유저 수용' :
                     e.user_accepted === false ? '✗ 유저 거부' : '(반응 미확인)';
    lines.push(`- ${e.days_ago}일 전: ${e.type} ${accepted}`);
  }
  lines.push('→ 자연스러운 시점이면 "그때 그거" 식으로 자발적 회상 가능.');

  return lines.join('\n');
}

// ============================================================
// 유저 반응 업데이트 (이벤트 발동 후 다음 턴 분석)
// ============================================================

export async function updateUserReaction(
  supabase: SupabaseLike,
  eventId: string,
  reaction: 'positive' | 'neutral' | 'negative',
): Promise<boolean> {
  if (!supabase || !eventId) return false;

  try {
    const { error } = await supabase
      .from(TABLE)
      .update({
        user_accepted: reaction === 'positive',
      })
      .eq('id', eventId);

    return !error;
  } catch {
    return false;
  }
}
