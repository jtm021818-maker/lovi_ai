/**
 * 🧠 Left-Brain Context Assembler (v70 Phase B)
 *
 * 좌뇌 `LeftBrainInput` 의 풍부한 필드들을 실제로 조립.
 * 기존에 undefined 로 전달되던 personalProfile / relevantEpisodes /
 * pacing_context / timeContext / detected_conflicts / previous_hints 를
 * 실제 데이터로 채워서 좌뇌에 주입.
 *
 * 호출 지점: dual-brain/orchestrator.ts 의 callGeminiBrain 내부,
 *           analyzeLeftBrain 호출 직전.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { LeftBrainInput, PacingState } from './types';
import { deriveTimeContext } from './left-brain-prompt';
import type { WorkingMemoryScratchpad } from '@/engines/working-memory';
import { toPacingContext } from '@/engines/working-memory';

// v70 flags
const PP_ENABLED = process.env.LUNA_PP_V70 !== '0';   // personalProfile 조립 기본 ON

// Phase 별 필수 카드 키 (left-brain-prompt.ts Section 11 과 일치)
const PHASE_REQUIRED_CARDS: Record<string, string[]> = {
  HOOK:    ['W1_who', 'W2_what', 'W3_when', 'W4_surface_emotion'],
  MIRROR:  ['M1_emotion_intensity', 'M2_deep_hypothesis', 'M3_pattern_history', 'M4_acknowledgment'],
  BRIDGE:  ['B1_help_mode', 'B2_decision_point', 'B3_constraints'],
  SOLVE:   ['S1_next_action', 'S2_trigger_time', 'S3_backup'],
  EMPOWER: ['E1_summary_accepted', 'E2_next_meeting'],
};

// ============================================================
// 조립 파라미터
// ============================================================

export interface AssembleContextInput {
  userId: string;
  sessionId: string;
  userMessage: string;
  turnIdx: number;
  currentPhase: 'HOOK' | 'MIRROR' | 'BRIDGE' | 'SOLVE' | 'EMPOWER';
  phaseStartTurn: number;
  intimacyLevel: number;
  userProfile?: {
    attachmentType?: string;
    gender?: 'male' | 'female';
    scenario?: string;
  };
  workingMemory?: WorkingMemoryScratchpad | null;
  supabase?: SupabaseClient | null;
}

// ============================================================
// 메인 조립 함수
// ============================================================

/**
 * LeftBrainInput 의 풍부한 옵셔널 필드들 조립.
 * 실패해도 throw 안 하고 undefined 로 유지 (채팅 안 죽게).
 */
export async function assembleLeftBrainContext(
  input: AssembleContextInput,
): Promise<Partial<LeftBrainInput>> {
  const t0 = Date.now();
  const result: Partial<LeftBrainInput> = {};

  // 1. 시간 컨텍스트 (항상 생성)
  result.timeContext = deriveTimeContext();

  // 2. Working Memory → recentTrajectory + pacing_context
  if (input.workingMemory) {
    const wm = input.workingMemory;
    result.recentTrajectory = wm.state_trajectory ?? [];
    result.pacing_context = toPacingContext(
      wm,
      input.currentPhase,
      PHASE_REQUIRED_CARDS[input.currentPhase] ?? [],
      input.phaseStartTurn,
    );
    console.log(`[Memory:CtxAssembler] 🧠 WM 주입: state_traj=${result.recentTrajectory.length}, filled=${Object.keys(wm.filled_cards).length}, prev_pacing=${wm.previous_pacing_state ?? 'N/A'}`);
  } else {
    result.recentTrajectory = [];
    console.log('[Memory:CtxAssembler] 🧠 WM 없음 (첫 턴 또는 비활성)');
  }

  // 3. userProfile (있으면 pass-through)
  if (input.userProfile) {
    result.userProfile = input.userProfile;
  }

  // 4. personalProfile 조립 (병렬 fetch)
  if (PP_ENABLED && input.supabase) {
    try {
      result.personalProfile = await buildPersonalProfile(input.supabase, input.userId);
      const pp = result.personalProfile!;
      console.log(`[Memory:CtxAssembler] 🧬 PersonalProfile: persona=${pp.core_persona ? '있음' : '없음'}, patterns=${pp.recurring_patterns?.length ?? 0}, effective=${pp.effective_strategies?.length ?? 0}, avoid=${pp.avoid_approaches?.length ?? 0}, threads=${pp.ongoing_themes?.length ?? 0}, hints=${pp.previous_hints?.length ?? 0}`);
    } catch (e: any) {
      console.warn('[Memory:CtxAssembler] ❌ personalProfile 조립 실패 (무시):', e?.message);
    }
  }

  console.log(`[Memory:CtxAssembler] ⏱️ 조립 완료 ${Date.now() - t0}ms`);

  // 5. relevantEpisodes — 기존 RAG 경로는 pipeline 에서 이미 처리.
  //    좌뇌가 직접 받으려면 호출자가 input.relevantEpisodes 를 채워서 넘겨야 함.
  //    여기서는 현재는 비워두고 추후 memory-graph 통합 시 채움.

  return result;
}

// ============================================================
// personalProfile 병렬 조립
// ============================================================

async function buildPersonalProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<LeftBrainInput['personalProfile']> {
  // 병렬 fetch — 각각 실패 허용
  const [memoryProfileRes, threadsRes, identityRes, strategiesRes, hintsRes] = await Promise.allSettled([
    fetchMemoryProfile(supabase, userId),
    fetchActiveThreads(supabase, userId),
    fetchLunaIdentity(supabase, userId),
    fetchEffectiveStrategies(supabase, userId),
    fetchPendingHints(supabase, userId),
  ]);

  const memoryProfile = memoryProfileRes.status === 'fulfilled' ? memoryProfileRes.value : null;
  const threads = threadsRes.status === 'fulfilled' ? threadsRes.value : [];
  const identity = identityRes.status === 'fulfilled' ? identityRes.value : null;
  const strategies = strategiesRes.status === 'fulfilled' ? strategiesRes.value : { effective: [], avoid: [] };
  const hints = hintsRes.status === 'fulfilled' ? hintsRes.value : [];

  const profile: NonNullable<LeftBrainInput['personalProfile']> = {
    core_persona: memoryProfile?.core_persona ?? undefined,
    recurring_patterns: memoryProfile?.recurring_patterns ?? [],
    effective_strategies: strategies.effective ?? [],
    avoid_approaches: strategies.avoid ?? [],
    ongoing_themes: threads,
    previous_hints: hints,
  };

  // 루나 identity 정보가 있으면 core_persona 보강
  if (identity?.relationship_phase && !profile.core_persona) {
    profile.core_persona = `루나 인식: ${identity.relationship_phase} 관계, 신뢰 ${identity.trust_level ?? '보통'}`;
  }

  return profile;
}

// ============================================================
// 개별 fetch 함수들 (safe — throw 없이 기본값)
// ============================================================

async function fetchMemoryProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<any> {
  try {
    const { data } = await supabase
      .from('user_profiles')
      .select('memory_profile')
      .eq('id', userId)
      .maybeSingle();
    const profile = (data?.memory_profile as any) ?? null;
    if (profile) {
      const keys = Object.keys(profile);
      console.log(`[Memory:Profile] 📖 장기 프로필 로드: ${keys.length}개 필드 (${keys.slice(0, 5).join(',')}${keys.length > 5 ? '...' : ''})`);
    } else {
      console.log('[Memory:Profile] 📖 장기 프로필 없음 (신규 유저)');
    }
    return profile;
  } catch (e: any) {
    console.warn('[Memory:Profile] ❌ fetch 실패:', e?.message);
    return null;
  }
}

async function fetchActiveThreads(
  supabase: SupabaseClient,
  userId: string,
): Promise<Array<{ theme: string; status: string; days_ago: number }>> {
  try {
    const { data } = await supabase
      .from('session_threads')
      .select('theme, status, created_at, last_referenced_at')
      .eq('user_id', userId)
      .in('status', ['open', 'dormant'])
      .order('last_referenced_at', { ascending: false, nullsFirst: false })
      .limit(5);

    if (!data || data.length === 0) {
      console.log('[Memory:Threads] 🧵 활성 스레드 없음');
      return [];
    }
    const now = Date.now();
    const threads = data.map((row: any) => {
      const lastTs = row.last_referenced_at ? new Date(row.last_referenced_at).getTime() : new Date(row.created_at).getTime();
      const daysAgo = Math.max(0, Math.round((now - lastTs) / (1000 * 60 * 60 * 24)));
      return {
        theme: String(row.theme ?? '').slice(0, 80),
        status: String(row.status ?? 'open'),
        days_ago: daysAgo,
      };
    });
    console.log(`[Memory:Threads] 🧵 활성 스레드 ${threads.length}개:`, threads.map(t => `"${t.theme}"(${t.status},${t.days_ago}d)`).join(' | '));
    return threads;
  } catch (e: any) {
    console.warn('[Memory:Threads] ❌ fetch 실패:', e?.message);
    return [];
  }
}

async function fetchLunaIdentity(
  supabase: SupabaseClient,
  userId: string,
): Promise<any> {
  try {
    const { data } = await supabase
      .from('luna_identity_with_user')
      .select('expressed_traits, shared_jokes, avoided_topics, resonant_topics, relationship_phase, luna_perception, trust_level')
      .eq('user_id', userId)
      .maybeSingle();
    if (data) {
      console.log(`[Memory:LunaIdentity] 🦊 관계단계=${data.relationship_phase ?? '?'}, 신뢰=${data.trust_level ?? '?'}, 공유농담=${(data.shared_jokes as any[])?.length ?? 0}, 공명주제=${(data.resonant_topics as any[])?.length ?? 0}`);
    } else {
      console.log('[Memory:LunaIdentity] 🦊 루나 정체성 기록 없음 (첫 만남)');
    }
    return data ?? null;
  } catch (e: any) {
    console.warn('[Memory:LunaIdentity] ❌ fetch 실패:', e?.message);
    return null;
  }
}

async function fetchEffectiveStrategies(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ effective: string[]; avoid: string[] }> {
  try {
    const { data } = await supabase
      .from('response_feedback')
      .select('luna_strategy, effective')
      .eq('user_id', userId)
      .not('effective', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30);

    if (!data || data.length === 0) {
      console.log('[Memory:Strategies] 🎯 학습된 전략 데이터 없음');
      return { effective: [], avoid: [] };
    }

    // 전략별 효과 카운트
    const counts = new Map<string, { total: number; effective: number }>();
    for (const row of data as any[]) {
      const strat = row.luna_strategy ?? 'unknown';
      const prev = counts.get(strat) ?? { total: 0, effective: 0 };
      prev.total++;
      if (row.effective) prev.effective++;
      counts.set(strat, prev);
    }

    const effective: string[] = [];
    const avoid: string[] = [];
    for (const [strat, { total, effective: okCount }] of counts.entries()) {
      if (total < 3) continue;
      const rate = okCount / total;
      if (rate >= 0.65) effective.push(strategyKr(strat));
      else if (rate <= 0.35) avoid.push(strategyKr(strat));
    }
    console.log(`[Memory:Strategies] 🎯 ${data.length}건 분석 → effective:[${effective.join(',')}] avoid:[${avoid.join(',')}]`);
    return { effective, avoid };
  } catch (e: any) {
    console.warn('[Memory:Strategies] ❌ fetch 실패:', e?.message);
    return { effective: [], avoid: [] };
  }
}

async function fetchPendingHints(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('left_brain_future_hints')
      .select('id, hint_content')
      .eq('user_id', userId)
      .eq('consumed', false)
      .order('created_at', { ascending: false })
      .limit(3);

    if (!data || data.length === 0) {
      console.log('[Memory:Hints] 💭 대기 중인 미래 힌트 없음');
      return [];
    }

    const hints = data.map((row: any) => String(row.hint_content ?? '').slice(0, 120)).filter(Boolean);
    console.log(`[Memory:Hints] 💭 미래 힌트 ${hints.length}개 소비:`, hints.map(h => `"${h.slice(0, 40)}"`).join(' | '));

    // 소비 표시 (fire-and-forget)
    const ids = (data as any[]).map(r => r.id).filter(Boolean);
    if (ids.length > 0) {
      supabase
        .from('left_brain_future_hints')
        .update({ consumed: true, consumed_at: new Date().toISOString() })
        .in('id', ids)
        .then(({ error }) => {
          if (error) console.warn('[Memory:Hints] ❌ 소비 마킹 실패:', error.message);
          else console.log(`[Memory:Hints] ✓ ${ids.length}개 consumed=true`);
        });
    }

    return hints;
  } catch (e: any) {
    console.warn('[Memory:Hints] ❌ fetch 실패:', e?.message);
    return [];
  }
}

function strategyKr(s: string): string {
  const map: Record<string, string> = {
    empathy: '공감',
    questioning: '의문 제기',
    confrontation: '직면',
    reassurance: '안심',
    explore: '탐색',
    pace_back: '한발 물러서기',
  };
  return map[s] ?? s;
}

// 타입 재노출
export type PacingStateType = PacingState;
