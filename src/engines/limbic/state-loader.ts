/**
 * 💾 변연계 상태 로더 (Supabase)
 *
 * 책임:
 *   - 세션 시작 시 상태 로드 + 자동 감쇠 적용
 *   - 세션 종료 시 상태 저장
 *   - 신규 유저 자동 초기화
 */

import type { LimbicState } from './types';
import { decayLimbicState, createInitialLimbicState } from './emotion-decay';

// Supabase 클라이언트 타입 (실제 구현은 호출자가 전달)
interface SupabaseLike {
  from(table: string): any;
}

// ============================================================
// 로드: 세션 시작 시
// ============================================================

/**
 * 변연계 상태 로드 + 자동 감쇠 적용.
 * 신규 유저면 초기 상태 생성.
 */
export async function loadAndDecayLimbicState(
  supabase: SupabaseLike,
  userId: string,
): Promise<LimbicState> {
  if (!supabase || !userId) {
    return createInitialLimbicState(userId);
  }

  try {
    const { data, error } = await supabase
      .from('luna_limbic_state')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      return createInitialLimbicState(userId);
    }

    // DB 형식 → LimbicState
    const state: LimbicState = {
      user_id: data.user_id,
      baseline_mood: Number(data.baseline_mood) || 0,
      baseline_updated_at: data.baseline_updated_at ?? new Date().toISOString(),
      active_emotions: Array.isArray(data.active_emotions) ? data.active_emotions : [],
      cortisol: Number(data.cortisol) || 0,
      oxytocin: Number(data.oxytocin) || 0,
      dopamine: Number(data.dopamine) || 0,
      threat_arousal: Number(data.threat_arousal) || 0,
      last_decayed_at: data.last_decayed_at ?? new Date().toISOString(),
    };

    // 자동 감쇠 (시간 경과 반영)
    return decayLimbicState(state);
  } catch (err) {
    console.warn('[Limbic] 상태 로드 실패, 초기 상태 사용:', (err as Error).message);
    return createInitialLimbicState(userId);
  }
}

// ============================================================
// 저장: 세션 종료 시 (또는 중간 자동 저장)
// ============================================================

/**
 * 변연계 상태 저장 (upsert).
 * fire-and-forget 으로 호출 권장 (메인 흐름 블록 X).
 */
export async function saveLimbicState(
  supabase: SupabaseLike,
  state: LimbicState,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !state.user_id) {
    return { success: false, error: 'invalid_input' };
  }

  try {
    const payload = {
      user_id: state.user_id,
      baseline_mood: state.baseline_mood,
      baseline_updated_at: state.baseline_updated_at,
      active_emotions: state.active_emotions,
      cortisol: state.cortisol,
      oxytocin: state.oxytocin,
      dopamine: state.dopamine,
      threat_arousal: state.threat_arousal,
      last_decayed_at: state.last_decayed_at,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('luna_limbic_state')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ============================================================
// 메모리 캐시 (세션 내 반복 로드 방지)
// ============================================================

const _sessionCache = new Map<string, { state: LimbicState; cachedAt: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1분

export async function getCachedLimbicState(
  supabase: SupabaseLike,
  userId: string,
): Promise<LimbicState> {
  const cached = _sessionCache.get(userId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.state;
  }

  const state = await loadAndDecayLimbicState(supabase, userId);
  _sessionCache.set(userId, { state, cachedAt: Date.now() });
  return state;
}

export function invalidateLimbicCache(userId: string): void {
  _sessionCache.delete(userId);
}

export function updateLimbicCache(userId: string, state: LimbicState): void {
  _sessionCache.set(userId, { state, cachedAt: Date.now() });
}
