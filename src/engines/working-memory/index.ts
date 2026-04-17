/**
 * 🧠 Working Memory — 외부 API (v70 Phase A)
 *
 * 세션 단위 작업 기억 관리.
 *
 * 사용 흐름:
 *   // 턴 시작 시
 *   const wm = await loadScratchpad(supabase, sessionId, userId);
 *
 *   // 좌뇌 호출 시 wm.recent_turns / wm.state_trajectory / wm.filled_cards 활용
 *
 *   // 턴 종료 시
 *   const updated = updateFromTurn(wm, {
 *     userMessage, lunaResponse, leftBrainAnalysis, turnIdx, emotionScore,
 *   });
 *   await saveScratchpad(supabase, sessionId, updated);
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkingMemoryScratchpad, RecentTurn, EmotionTrajectoryPoint } from './types';
import { createEmptyScratchpad } from './types';
import type { LeftBrainAnalysis, FilledCard } from '@/engines/left-brain/types';

export type { WorkingMemoryScratchpad, RecentTurn, EmotionTrajectoryPoint, SessionScratchpad, ActiveThreadCandidate } from './types';
export { createEmptyScratchpad } from './types';

const MAX_RECENT_TURNS = 10;
const MAX_STATE_TRAJECTORY = 5;
const MAX_EMOTION_TRAJECTORY = 20;

const V70_ENABLED = process.env.LUNA_WM_V70 !== '0';   // 기본 ON

// ============================================================
// 로드 — counseling_sessions.session_metadata.working_memory 에서
// ============================================================

export async function loadScratchpad(
  supabase: SupabaseClient | null,
  sessionId: string,
  userId: string,
): Promise<WorkingMemoryScratchpad> {
  if (!V70_ENABLED || !supabase) {
    console.log('[Memory:WM] 🧠 loadScratchpad 스킵 (disabled or no supabase)');
    return createEmptyScratchpad(sessionId, userId);
  }

  try {
    const { data, error } = await supabase
      .from('counseling_sessions')
      .select('session_metadata')
      .eq('id', sessionId)
      .maybeSingle();

    if (error || !data) {
      console.log(`[Memory:WM] 🧠 loadScratchpad 세션 없음 → 빈 scratchpad (sid=${sessionId.slice(0,8)})`);
      return createEmptyScratchpad(sessionId, userId);
    }

    const meta = data.session_metadata as any;
    const stored = meta?.working_memory;
    if (stored && typeof stored === 'object' && stored.session_id === sessionId) {
      console.log(`[Memory:WM] ✅ loadScratchpad 복원: sid=${sessionId.slice(0,8)}, turn=${stored.turn_idx ?? '?'}, recent=${stored.recent_turns?.length ?? 0}턴, cards=${Object.keys(stored.filled_cards ?? {}).length}개, state_traj=${stored.state_trajectory?.length ?? 0}`);
      return {
        ...createEmptyScratchpad(sessionId, userId),
        ...stored,
        session_id: sessionId,
        user_id: userId,
      };
    }
    console.log(`[Memory:WM] 🧠 loadScratchpad 빈 시작: sid=${sessionId.slice(0,8)} (첫 턴)`);
    return createEmptyScratchpad(sessionId, userId);
  } catch (e: any) {
    console.warn('[Memory:WM] ❌ loadScratchpad 실패, 빈 값으로 시작:', e?.message);
    return createEmptyScratchpad(sessionId, userId);
  }
}

// ============================================================
// 저장 — session_metadata.working_memory 에 merge 저장
// ============================================================

export async function saveScratchpad(
  supabase: SupabaseClient | null,
  sessionId: string,
  scratchpad: WorkingMemoryScratchpad,
): Promise<{ success: boolean; error?: string }> {
  if (!V70_ENABLED || !supabase) return { success: false, error: 'disabled' };

  try {
    // 기존 session_metadata 로드 후 merge (다른 필드 덮어쓰지 않기)
    const { data: existing } = await supabase
      .from('counseling_sessions')
      .select('session_metadata')
      .eq('id', sessionId)
      .maybeSingle();

    const existingMeta = (existing?.session_metadata as any) ?? {};
    const merged = {
      ...existingMeta,
      working_memory: { ...scratchpad, updated_at: new Date().toISOString() },
    };

    const { error } = await supabase
      .from('counseling_sessions')
      .update({ session_metadata: merged })
      .eq('id', sessionId);

    if (error) {
      console.warn(`[Memory:WM] ❌ saveScratchpad 실패: ${error.message}`);
      return { success: false, error: error.message };
    }
    console.log(`[Memory:WM] 💾 saveScratchpad 완료: sid=${sessionId.slice(0,8)}, turn=${scratchpad.turn_idx}, recent=${scratchpad.recent_turns.length}턴, cards=${Object.keys(scratchpad.filled_cards).length}개, emotion_traj=${scratchpad.emotion_trajectory.length}, threads=${scratchpad.active_threads.length}, short_replies=${scratchpad.consecutive_short_replies}, frustrated=${scratchpad.consecutive_frustrated_turns}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message };
  }
}

// ============================================================
// 턴 종료 후 업데이트
// ============================================================

interface TurnUpdateInput {
  turnIdx: number;
  userMessage: string;
  lunaResponse?: string;
  leftBrainAnalysis?: LeftBrainAnalysis | null;
  emotionScore?: number;
}

export function updateFromTurn(
  current: WorkingMemoryScratchpad,
  input: TurnUpdateInput,
): WorkingMemoryScratchpad {
  const { turnIdx, userMessage, lunaResponse, leftBrainAnalysis, emotionScore } = input;

  // 1. recent_turns 추가 (user + luna)
  const newUserTurn: RecentTurn = {
    role: 'user',
    content: userMessage,
    turn_idx: turnIdx,
    emotion_score: emotionScore,
    timestamp: new Date().toISOString(),
  };
  const recentTurns: RecentTurn[] = [...current.recent_turns, newUserTurn];
  if (lunaResponse) {
    recentTurns.push({
      role: 'luna',
      content: lunaResponse,
      turn_idx: turnIdx,
      timestamp: new Date().toISOString(),
    });
  }

  // 10턴 초과 시 오래된 것 떼어내서 rolling_summary 후보로 (축약은 reflection 에서)
  let rollingSummary = current.rolling_summary;
  let keptTurns = recentTurns;
  if (recentTurns.length > MAX_RECENT_TURNS * 2) {
    const toSummarize = recentTurns.slice(0, recentTurns.length - MAX_RECENT_TURNS * 2);
    keptTurns = recentTurns.slice(-MAX_RECENT_TURNS * 2);
    // 단순 결합 요약 (나중에 reflection 으로 LLM 업그레이드)
    const basicSummary = toSummarize
      .map(t => `[T${t.turn_idx} ${t.role}] ${t.content.slice(0, 60)}`)
      .join(' | ');
    rollingSummary = rollingSummary
      ? `${rollingSummary} | ${basicSummary}`.slice(0, 1000)
      : basicSummary.slice(0, 1000);
  }

  // 2. emotion_trajectory
  const emotionTrajectory = [...current.emotion_trajectory];
  if (typeof emotionScore === 'number') {
    const prev = emotionTrajectory[emotionTrajectory.length - 1];
    emotionTrajectory.push({
      turn: turnIdx,
      score: emotionScore,
      primary_emotion: leftBrainAnalysis?.perceived_emotion,
      delta: prev ? Math.round((emotionScore - prev.score) * 10) / 10 : 0,
    });
    if (emotionTrajectory.length > MAX_EMOTION_TRAJECTORY) {
      emotionTrajectory.splice(0, emotionTrajectory.length - MAX_EMOTION_TRAJECTORY);
    }
  }

  // 3. state_trajectory (7D)
  const stateTrajectory = [...current.state_trajectory];
  if (leftBrainAnalysis?.state_vector) {
    stateTrajectory.push(leftBrainAnalysis.state_vector);
    if (stateTrajectory.length > MAX_STATE_TRAJECTORY) {
      stateTrajectory.splice(0, stateTrajectory.length - MAX_STATE_TRAJECTORY);
    }
  }

  // 4. 직전 턴 메타
  const previousPacingState = leftBrainAnalysis?.pacing_meta?.pacing_state ?? current.previous_pacing_state;
  const previousLunaThought = leftBrainAnalysis?.pacing_meta?.luna_meta_thought ?? current.previous_luna_thought;
  const previousTone = leftBrainAnalysis?.tone_to_use ?? current.previous_tone;

  // 5. filled_cards 누적
  const filledCards = { ...current.filled_cards };
  if (leftBrainAnalysis?.cards_filled_this_turn) {
    for (const card of leftBrainAnalysis.cards_filled_this_turn) {
      filledCards[card.key] = {
        key: card.key,
        value: card.value,
        confidence: card.confidence,
        source_quote: card.source_quote,
      } as FilledCard;
    }
  }

  // 6. 연속 카운트 갱신
  const isShortReply = userMessage.trim().length < 15;
  const consecutiveShortReplies = isShortReply
    ? current.consecutive_short_replies + 1
    : 0;

  const isFrustrated = leftBrainAnalysis?.pacing_meta?.pacing_state === 'FRUSTRATED';
  const consecutiveFrustratedTurns = isFrustrated
    ? current.consecutive_frustrated_turns + 1
    : 0;

  // 7. session_scratchpad 기본 유지 (reflection 에서 LLM 이 덮어씀)
  const sessionScratchpad = {
    ...current.session_scratchpad,
    updated_at_turn: turnIdx,
  };

  const newCards = Object.keys(filledCards).filter(k => !Object.prototype.hasOwnProperty.call(current.filled_cards, k));
  console.log(`[Memory:WM] 🔄 updateFromTurn: turn=${turnIdx}, +${newCards.length}개 카드 추가 (${newCards.join(',') || '없음'}), recent=${keptTurns.length}턴, emotion=${emotionScore ?? 'N/A'}, pacing=${previousPacingState ?? 'N/A'}, short_streak=${consecutiveShortReplies}${rollingSummary && !current.rolling_summary ? ', rolling_summary 생성' : ''}`);

  return {
    ...current,
    turn_idx: turnIdx,
    recent_turns: keptTurns,
    rolling_summary: rollingSummary,
    emotion_trajectory: emotionTrajectory,
    state_trajectory: stateTrajectory,
    previous_pacing_state: previousPacingState,
    previous_luna_thought: previousLunaThought,
    previous_tone: previousTone,
    filled_cards: filledCards,
    consecutive_short_replies: consecutiveShortReplies,
    consecutive_frustrated_turns: consecutiveFrustratedTurns,
    session_scratchpad: sessionScratchpad,
    updated_at: new Date().toISOString(),
  };
}

// ============================================================
// 좌뇌 컨텍스트용 헬퍼
// ============================================================

/**
 * 좌뇌 pacing_context 로 변환
 */
export function toPacingContext(
  wm: WorkingMemoryScratchpad,
  currentPhase: 'HOOK' | 'MIRROR' | 'BRIDGE' | 'SOLVE' | 'EMPOWER',
  requiredCardKeys: string[],
  phaseStartTurn: number,
) {
  const filledCardEntries = Object.values(wm.filled_cards).map(c => ({
    key: c.key,
    value: c.value,
  }));

  return {
    current_phase: currentPhase,
    turns_in_phase: Math.max(0, wm.turn_idx - phaseStartTurn),
    filled_cards: filledCardEntries,
    required_card_keys: requiredCardKeys,
    previous_pacing_state: wm.previous_pacing_state ?? null,
    consecutive_short_replies: wm.consecutive_short_replies,
    consecutive_frustrated_turns: wm.consecutive_frustrated_turns,
  };
}

/**
 * 좌뇌 프롬프트용 대화 컨텍스트 텍스트
 * systemPrompt 에 주입
 */
export function formatWorkingMemoryForPrompt(wm: WorkingMemoryScratchpad): string {
  if (!wm || wm.recent_turns.length === 0) return '';

  const lines: string[] = ['## 🧠 현재 세션 작업 기억 (v70)'];

  if (wm.session_scratchpad.main_topic) {
    lines.push(`**주제**: ${wm.session_scratchpad.main_topic}`);
  }
  if (wm.session_scratchpad.situation_summary) {
    lines.push(`**상황 요약**: ${wm.session_scratchpad.situation_summary}`);
  }
  if (wm.session_scratchpad.user_primary_stance) {
    lines.push(`**유저 핵심 상태**: ${wm.session_scratchpad.user_primary_stance}`);
  }
  if (wm.session_scratchpad.unresolved_points && wm.session_scratchpad.unresolved_points.length > 0) {
    lines.push(`**미해결 포인트**: ${wm.session_scratchpad.unresolved_points.join(', ')}`);
  }

  if (wm.rolling_summary) {
    lines.push(`\n**이전 대화 요약**: ${wm.rolling_summary.slice(0, 400)}`);
  }

  // 최근 5턴만 노출 (토큰 절감)
  const recentShow = wm.recent_turns.slice(-10);
  if (recentShow.length > 0) {
    lines.push('\n**최근 대화**:');
    for (const t of recentShow) {
      const prefix = t.role === 'user' ? '🧑' : '🦊';
      const shortContent = t.content.slice(0, 100);
      lines.push(`  ${prefix} T${t.turn_idx}: ${shortContent}`);
    }
  }

  if (wm.emotion_trajectory.length > 0) {
    const last3 = wm.emotion_trajectory.slice(-3);
    lines.push(`\n**감정 궤적**: ${last3.map(e => `T${e.turn}=${e.score}${e.primary_emotion ? `(${e.primary_emotion})` : ''}`).join(' → ')}`);
  }

  const filledKeys = Object.keys(wm.filled_cards);
  if (filledKeys.length > 0) {
    lines.push(`\n**이미 파악된 카드**: ${filledKeys.join(', ')}`);
    for (const k of filledKeys) {
      const c = wm.filled_cards[k];
      lines.push(`  - ${k}: "${c.value}"`);
    }
  }

  if (wm.previous_pacing_state) {
    lines.push(`\n**직전 페이싱**: ${wm.previous_pacing_state}${wm.previous_tone ? ` (톤: ${wm.previous_tone})` : ''}`);
  }
  if (wm.previous_luna_thought) {
    lines.push(`**직전 루나 생각**: "${wm.previous_luna_thought}"`);
  }

  return lines.join('\n');
}
