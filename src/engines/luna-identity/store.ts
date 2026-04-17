/**
 * 💾 Luna Identity DB 저장소 + 핸드오프 빌더
 */

import type {
  LunaIdentityWithUser,
  IdentityUpdateInput,
  IdentityHandoff,
  RelationshipPhase,
  LunaPerception,
} from './types';

interface SupabaseLike {
  from(table: string): any;
}

const TABLE = 'luna_identity_with_user';

// ============================================================
// 로드 (없으면 초기 상태)
// ============================================================

export async function loadLunaIdentity(
  supabase: SupabaseLike,
  userId: string,
): Promise<LunaIdentityWithUser> {
  if (!supabase || !userId) {
    return createInitialIdentity(userId);
  }

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      return createInitialIdentity(userId);
    }

    return {
      user_id: data.user_id,
      expressed_traits: (data.expressed_traits ?? {}) as Record<string, number>,
      shared_jokes: Array.isArray(data.shared_jokes) ? data.shared_jokes : [],
      avoided_topics: Array.isArray(data.avoided_topics) ? data.avoided_topics : [],
      resonant_topics: Array.isArray(data.resonant_topics) ? data.resonant_topics : [],
      relationship_phase: (data.relationship_phase ?? 'new') as RelationshipPhase,
      luna_perception: (data.luna_perception ?? {}) as LunaPerception,
      shared_experience_count: Number(data.shared_experience_count ?? 0),
      first_meeting_at: data.first_meeting_at ?? new Date().toISOString(),
      updated_at: data.updated_at,
    };
  } catch {
    return createInitialIdentity(userId);
  }
}

function createInitialIdentity(userId: string): LunaIdentityWithUser {
  const now = new Date().toISOString();
  return {
    user_id: userId,
    expressed_traits: {},
    shared_jokes: [],
    avoided_topics: [],
    resonant_topics: [],
    relationship_phase: 'new',
    luna_perception: {},
    shared_experience_count: 0,
    first_meeting_at: now,
  };
}

// ============================================================
// 저장 (upsert)
// ============================================================

export async function saveLunaIdentity(
  supabase: SupabaseLike,
  identity: LunaIdentityWithUser,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'no_supabase' };

  try {
    const payload = {
      user_id: identity.user_id,
      expressed_traits: identity.expressed_traits,
      shared_jokes: identity.shared_jokes,
      avoided_topics: identity.avoided_topics,
      resonant_topics: identity.resonant_topics,
      relationship_phase: identity.relationship_phase,
      luna_perception: identity.luna_perception,
      shared_experience_count: identity.shared_experience_count,
      first_meeting_at: identity.first_meeting_at,
    };

    const { error } = await supabase
      .from(TABLE)
      .upsert(payload, { onConflict: 'user_id' });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'unknown' };
  }
}

// ============================================================
// 증분 업데이트 (메모리 내)
// ============================================================

export function applyIdentityUpdate(
  identity: LunaIdentityWithUser,
  update: IdentityUpdateInput,
): LunaIdentityWithUser {
  const next = { ...identity };

  // 특성 증분
  if (update.trait_deltas) {
    next.expressed_traits = { ...next.expressed_traits };
    for (const [trait, delta] of Object.entries(update.trait_deltas)) {
      const current = next.expressed_traits[trait] ?? 0;
      next.expressed_traits[trait] = Math.max(0, Math.min(1, current + delta));
    }
  }

  // 농담 추가
  if (update.add_joke) {
    const exists = next.shared_jokes.find(j => j.trigger === update.add_joke!.trigger);
    if (!exists) {
      next.shared_jokes = [
        ...next.shared_jokes,
        {
          ...update.add_joke,
          first_used_at: new Date().toISOString(),
          use_count: 1,
        },
      ];
    }
  }

  // 농담 사용 카운트
  if (update.use_joke) {
    next.shared_jokes = next.shared_jokes.map(j =>
      j.trigger === update.use_joke ? { ...j, use_count: j.use_count + 1 } : j
    );
  }

  // 관계 단계
  if (update.set_phase) {
    next.relationship_phase = update.set_phase;
  }

  // 인식 업데이트
  if (update.update_perception) {
    next.luna_perception = { ...next.luna_perception, ...update.update_perception };
  }

  // 화제
  if (update.add_avoided && !next.avoided_topics.includes(update.add_avoided)) {
    next.avoided_topics = [...next.avoided_topics, update.add_avoided];
  }
  if (update.add_resonant && !next.resonant_topics.includes(update.add_resonant)) {
    next.resonant_topics = [...next.resonant_topics, update.add_resonant];
  }

  // 공유 경험 카운트
  if (update.increment_shared) {
    next.shared_experience_count += 1;
  }

  // 관계 단계 자동 진화 체크
  next.relationship_phase = autoEvolvePhase(next);

  return next;
}

/** 공유 경험 수 + 첫 만남 경과일 기준 자동 단계 전환 */
function autoEvolvePhase(identity: LunaIdentityWithUser): RelationshipPhase {
  const days = (Date.now() - new Date(identity.first_meeting_at).getTime()) / (1000 * 60 * 60 * 24);
  const n = identity.shared_experience_count;

  // veteran: 90일+ 또는 경험 50+
  if (days > 90 || n > 50) return 'veteran';
  // deep: 30일+ 또는 경험 20+
  if (days > 30 || n > 20) return 'deep';
  // bonding: 7일+ 또는 경험 5+
  if (days > 7 || n > 5) return 'bonding';
  return 'new';
}

// ============================================================
// 핸드오프 빌드 (자연어 요약)
// ============================================================

export function buildIdentityHandoff(identity: LunaIdentityWithUser): IdentityHandoff {
  // 상위 3 특성
  const topTraits = Object.entries(identity.expressed_traits)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([trait, value]) => `${trait} ${(value * 100).toFixed(0)}%`);

  // 최근 농담 3개 (use_count 높은 순)
  const availableJokes = [...identity.shared_jokes]
    .sort((a, b) => b.use_count - a.use_count)
    .slice(0, 3)
    .map(j => ({ trigger: j.trigger, callback: j.callback }));

  return {
    phase_summary: phaseDescription(identity),
    top_traits: topTraits,
    available_jokes: availableJokes,
    avoid: identity.avoided_topics.slice(0, 5),
    luna_view: identity.luna_perception.sees_user_as ?? '아직 탐색 중',
  };
}

function phaseDescription(identity: LunaIdentityWithUser): string {
  const daysSince = Math.floor(
    (Date.now() - new Date(identity.first_meeting_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  const phaseMap: Record<RelationshipPhase, string> = {
    new: '새로 만난 사이',
    bonding: '친해지는 중',
    deep: '꽤 친한 사이',
    veteran: '오래된 친구',
  };

  return `${phaseMap[identity.relationship_phase]} (${daysSince}일 전 첫 만남, ${identity.shared_experience_count}회 공유 경험)`;
}

// ============================================================
// 좌뇌 personalProfile 에 주입할 요약
// ============================================================

export function identityToPersonalProfileAdditions(
  identity: LunaIdentityWithUser,
): { effective_strategies: string[]; avoid_approaches: string[] } {
  const strategies: string[] = [];
  const avoids: string[] = [];

  // 발현 특성에서 유추
  const traits = identity.expressed_traits;

  if ((traits['직설성'] ?? 0) > 0.6) {
    strategies.push('직설적인 피드백 선호');
  }
  if ((traits['유머'] ?? 0) > 0.5) {
    strategies.push('가벼운 농담 섞기 OK');
  }
  if ((traits['자기개방'] ?? 0) > 0.4) {
    strategies.push('루나 자기 경험 공유 허용');
  }
  if ((traits['공감강도'] ?? 0) > 0.7) {
    strategies.push('깊은 감정 공명 가능');
  }

  // 피하는 화제
  identity.avoided_topics.forEach(topic => {
    avoids.push(`화제: ${topic}`);
  });

  // Luna perception 기반
  if (identity.luna_perception.worries_about && identity.luna_perception.worries_about.length > 0) {
    strategies.push(`걱정되는 점 인지: ${identity.luna_perception.worries_about.slice(0, 2).join(', ')}`);
  }

  return { effective_strategies: strategies, avoid_approaches: avoids };
}
