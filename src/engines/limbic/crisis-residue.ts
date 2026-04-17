/**
 * 🆕 v57: 위기 신호 여운 시뮬레이션
 *
 * 위기 신호는 단순 호르몬 반감기로 부족.
 * 진짜 인간은 며칠~몇 주 영향 받음.
 *
 * 전략:
 *   - session_threads 테이블에 위기 이벤트를 status='open' 으로 저장
 *   - 다음 세션들에서 fetchActiveThreads 로 자동 로드
 *   - 좌뇌 personalProfile.ongoing_themes 에 자동 주입
 *   - Limbic 도 세션 시작 시 잔여 worried 감정 자동 주입
 */

import type { ActiveEmotion, LimbicState } from './types';
import { addEmotion } from './emotion-decay';

interface SupabaseLike {
  from(table: string): any;
}

const THREADS_TABLE = 'session_threads';

// ============================================================
// 위기 이벤트 영구 기록 (session_threads 활용)
// ============================================================

export async function recordCrisisResidue(
  supabase: SupabaseLike,
  userId: string,
  context: string,
): Promise<{ success: boolean; thread_id?: string; error?: string }> {
  if (!supabase || !userId) return { success: false, error: 'invalid_input' };

  try {
    const now = new Date().toISOString();
    const payload = {
      user_id: userId,
      theme: '위기 신호 여운',
      summary: context.slice(0, 200),
      importance: 0.95,        // 매우 높은 중요도
      characters: ['본인'],
      status: 'open',
      started_at: now,
      last_mentioned_at: now,
      session_mention_count: 1,
    };

    const { data, error } = await supabase
      .from(THREADS_TABLE)
      .insert(payload)
      .select('id')
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, thread_id: data?.id };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'unknown' };
  }
}

// ============================================================
// 미해결 위기 여운 조회 (지난 14일)
// ============================================================

export async function fetchUnresolvedCrisisResidue(
  supabase: SupabaseLike,
  userId: string,
  withinDays = 14,
): Promise<Array<{ days_ago: number; summary: string; thread_id: string }>> {
  if (!supabase) return [];

  const sinceIso = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { data, error } = await supabase
      .from(THREADS_TABLE)
      .select('id, summary, started_at')
      .eq('user_id', userId)
      .eq('theme', '위기 신호 여운')
      .in('status', ['open', 'dormant'])
      .gte('started_at', sinceIso)
      .order('started_at', { ascending: false })
      .limit(3);

    if (error || !data) return [];

    const now = Date.now();
    return data.map((row: any) => ({
      thread_id: row.id,
      summary: row.summary ?? '',
      days_ago: Math.floor((now - new Date(row.started_at).getTime()) / (1000 * 60 * 60 * 24)),
    }));
  } catch {
    return [];
  }
}

// ============================================================
// 위기 여운을 Limbic 상태에 반영 (세션 시작 시)
// ============================================================

export function injectCrisisResidueToLimbic(
  state: LimbicState,
  residues: Array<{ days_ago: number; summary: string }>,
): LimbicState {
  if (residues.length === 0) return state;

  let newState = state;

  for (const residue of residues) {
    // 며칠 지났는지에 따라 강도 약화 (지수적)
    const decayFactor = Math.pow(0.7, residue.days_ago);
    const intensity = 0.5 * decayFactor;

    if (intensity < 0.05) continue;  // 너무 약하면 스킵

    const worried: ActiveEmotion = {
      type: 'worried',
      intensity,
      half_life_hours: 12,         // 세션 동안 유지
      triggered_at: new Date().toISOString(),
      triggered_by: `위기 여운 ${residue.days_ago}일 전: ${residue.summary.slice(0, 60)}`,
    };

    newState = addEmotion(newState, worried);
  }

  return newState;
}

// ============================================================
// 위기 해결 마킹 (유저가 회복 신호 보일 때)
// ============================================================

export async function markCrisisResolved(
  supabase: SupabaseLike,
  threadId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !threadId) return { success: false, error: 'invalid_input' };

  try {
    const { error } = await supabase
      .from(THREADS_TABLE)
      .update({
        status: 'resolved',
        last_mentioned_at: new Date().toISOString(),
      })
      .eq('id', threadId)
      .eq('theme', '위기 신호 여운');

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'unknown' };
  }
}
