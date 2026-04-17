/**
 * 💾 Response Learning DB + 효과 분석
 */

import type { ResponseFeedbackEntry, LunaStrategy, LearnedStrategies, EngagementShift } from './types';

interface SupabaseLike {
  from(table: string): any;
}

const TABLE = 'response_feedback';

// ============================================================
// 응답 기록 (매 턴 끝나면)
// ============================================================

export async function recordResponseFeedback(
  supabase: SupabaseLike,
  entry: ResponseFeedbackEntry,
): Promise<{ success: boolean; entry_id?: string; error?: string }> {
  if (!supabase) return { success: false, error: 'no_supabase' };

  try {
    const payload = {
      user_id: entry.user_id,
      session_id: entry.session_id ?? null,
      turn_idx: entry.turn_idx,
      luna_response_summary: entry.luna_response_summary.slice(0, 100),
      luna_strategy: entry.luna_strategy,
      luna_tone: entry.luna_tone ?? null,
      user_next_emotion_shift: entry.user_next_emotion_shift ?? null,
      user_next_engagement: entry.user_next_engagement ?? null,
      effective: entry.effective ?? null,
      effectiveness_score: entry.effectiveness_score ?? null,
    };

    const { data, error } = await supabase
      .from(TABLE)
      .insert(payload)
      .select('id')
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, entry_id: data?.id };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'unknown' };
  }
}

// ============================================================
// 다음 턴 유저 반응 측정 → 효과 업데이트
// ============================================================

export async function updateFeedbackEffectiveness(
  supabase: SupabaseLike,
  entryId: string,
  userValenceShift: number,
  engagement: EngagementShift,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !entryId) return { success: false, error: 'invalid_input' };

  // 효과 점수 계산
  const effectivenessScore = calculateEffectiveness(userValenceShift, engagement);
  const effective = effectivenessScore > 0.5;

  try {
    const { error } = await supabase
      .from(TABLE)
      .update({
        user_next_emotion_shift: userValenceShift,
        user_next_engagement: engagement,
        effective,
        effectiveness_score: effectivenessScore,
      })
      .eq('id', entryId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'unknown' };
  }
}

function calculateEffectiveness(
  valenceShift: number,
  engagement: EngagementShift,
): number {
  // valence 회복 (-에서 +로) 가장 효과적
  let score = 0.5;

  // valence 변화 ±2 → 정규화
  score += Math.max(-0.4, Math.min(0.4, valenceShift * 0.2));

  // engagement 가중치
  switch (engagement) {
    case 'recovered': score += 0.3; break;
    case 'deepened': score += 0.2; break;
    case 'neutral': score += 0; break;
    case 'withdrew': score -= 0.3; break;
  }

  return Math.max(0, Math.min(1, score));
}

// ============================================================
// 학습된 전략 분석 (유저별)
// ============================================================

export async function getLearnedStrategies(
  supabase: SupabaseLike,
  userId: string,
  minSampleSize = 3,
): Promise<LearnedStrategies> {
  if (!supabase) return { effective: [], avoid: [] };

  try {
    // 최근 30일 데이터
    const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from(TABLE)
      .select('luna_strategy, luna_tone, effective, effectiveness_score')
      .eq('user_id', userId)
      .gte('created_at', sinceIso)
      .not('effective', 'is', null);

    if (error || !data || data.length === 0) {
      return { effective: [], avoid: [] };
    }

    return analyzeStrategyEffectiveness(data, minSampleSize);
  } catch {
    return { effective: [], avoid: [] };
  }
}

function analyzeStrategyEffectiveness(
  rows: Array<{ luna_strategy: string; luna_tone: string | null; effective: boolean; effectiveness_score: number | null }>,
  minSampleSize: number,
): LearnedStrategies {
  // 전략별 통계
  const stats = new Map<string, { total: number; effective: number; avgScore: number }>();

  for (const row of rows) {
    const key = row.luna_strategy;
    const cur = stats.get(key) ?? { total: 0, effective: 0, avgScore: 0 };
    cur.total++;
    if (row.effective) cur.effective++;
    cur.avgScore = (cur.avgScore * (cur.total - 1) + (row.effectiveness_score ?? 0.5)) / cur.total;
    stats.set(key, cur);
  }

  const effective: string[] = [];
  const avoid: string[] = [];

  for (const [strategy, s] of stats) {
    if (s.total < minSampleSize) continue;     // 표본 부족

    const effectiveRate = s.effective / s.total;
    const label = strategyKr(strategy as LunaStrategy);

    if (effectiveRate >= 0.65 && s.avgScore >= 0.6) {
      effective.push(`"${label}" 전략 효과 좋음 (${Math.round(effectiveRate * 100)}% 성공)`);
    } else if (effectiveRate <= 0.35 && s.avgScore <= 0.4) {
      avoid.push(`"${label}" 전략 효과 낮음 (${Math.round((1 - effectiveRate) * 100)}% 실패)`);
    }
  }

  return { effective, avoid };
}

function strategyKr(s: LunaStrategy): string {
  const map: Record<LunaStrategy, string> = {
    empathy: '공감',
    questioning: '의문 제기',
    confrontation: '직면',
    reassurance: '안심',
    explore: '탐색',
    pace_back: '한발 물러서기',
  };
  return map[s] ?? s;
}

// ============================================================
// 유저 valence 변화 측정 (다음 턴 분석 시 사용)
// ============================================================

export function deriveEngagement(
  prevTurnLength: number,
  currentTurnLength: number,
  prevValence: number,
  currentValence: number,
): EngagementShift {
  // 회복 (- → +)
  if (prevValence < -0.3 && currentValence > 0) return 'recovered';

  // 깊어짐 (길이 증가 + 감정 강화)
  if (currentTurnLength > prevTurnLength * 1.5 && Math.abs(currentValence) > Math.abs(prevValence)) {
    return 'deepened';
  }

  // 위축 (길이 급감)
  if (currentTurnLength < prevTurnLength * 0.4) return 'withdrew';

  return 'neutral';
}
