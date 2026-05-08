/**
 * v115 Nickname State — 루나가 유저에게 시도한 애칭 이력.
 *
 * 핵심 원칙:
 *   - 코드는 저장/조회만. 어떤 애칭을 만들지/쓸지는 LLM이 결정.
 *   - 사전 정의된 애칭 풀 없음. LLM이 매번 컨텍스트 보고 자율 작명.
 *   - 친밀도 조건문 없음. 컨텍스트로 친밀도만 전달.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface NicknameRecord {
  nickname: string;
  useCount: number;
  lastUsedAt: string;
  /** 'accepted' | 'neutral' | 'rejected' | null */
  userReaction: NicknameReaction;
  /** LLM이 작명 시 남긴 맥락 메모 */
  originContext?: string;
  daysSinceFirstUse: number;
}

export type NicknameReaction = 'accepted' | 'neutral' | 'rejected' | null;

export interface NicknameSnapshot {
  /** 사용 빈도 / 최신 순으로 정렬된 이력 (최대 8개) */
  history: NicknameRecord[];
  /** 마지막으로 실제 본문에서 사용한 애칭 (있으면) */
  mostRecentNickname?: string;
  /** 누적 시도된 고유 애칭 수 */
  totalUniqueAttempts: number;
}

/**
 * 컨텍스트 조립용 스냅샷 조회.
 */
export async function loadNicknameSnapshot(
  supabase: SupabaseClient,
  userId: string,
): Promise<NicknameSnapshot> {
  const { data, error } = await supabase
    .from('luna_nickname_state')
    .select('nickname, use_count, last_used_at, user_reaction, origin_context, created_at')
    .eq('user_id', userId)
    .order('last_used_at', { ascending: false })
    .limit(8);

  if (error || !data) {
    return { history: [], totalUniqueAttempts: 0 };
  }

  const now = Date.now();
  const history: NicknameRecord[] = data.map((row) => ({
    nickname: row.nickname,
    useCount: row.use_count ?? 1,
    lastUsedAt: row.last_used_at,
    userReaction: (row.user_reaction ?? null) as NicknameReaction,
    originContext: row.origin_context ?? undefined,
    daysSinceFirstUse: Math.max(
      0,
      Math.round((now - new Date(row.created_at).getTime()) / (24 * 60 * 60 * 1000)),
    ),
  }));

  return {
    history,
    mostRecentNickname: history[0]?.nickname,
    totalUniqueAttempts: history.length,
  };
}

/**
 * 새 애칭 첫 등장 (LLM이 [NICKNAME_PROPOSE] 태그 출력 시 호출).
 */
export async function proposeNickname(
  supabase: SupabaseClient,
  params: {
    userId: string;
    sessionId?: string | null;
    nickname: string;
    originContext?: string;
  },
): Promise<{ ok: boolean; isNew: boolean }> {
  const trimmed = params.nickname.trim();
  if (!trimmed || trimmed.length > 30) return { ok: false, isNew: false };

  // upsert: 이미 존재하면 use_count++, 없으면 새 row
  const { data: existing } = await supabase
    .from('luna_nickname_state')
    .select('id, use_count')
    .eq('user_id', params.userId)
    .eq('nickname', trimmed)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('luna_nickname_state')
      .update({ use_count: (existing.use_count ?? 1) + 1, last_used_at: new Date().toISOString() })
      .eq('id', existing.id);
    return { ok: true, isNew: false };
  }

  const { error } = await supabase.from('luna_nickname_state').insert({
    user_id: params.userId,
    nickname: trimmed,
    origin_session_id: params.sessionId ?? null,
    origin_context: params.originContext ?? null,
    use_count: 1,
    last_used_at: new Date().toISOString(),
  });

  return { ok: !error, isNew: true };
}

/**
 * 본문에서 애칭이 자연스럽게 쓰였을 때 카운트 업데이트.
 * (LLM 태그 없이 그냥 본문에 등장한 경우 — 사후 분석으로 호출)
 */
export async function bumpNicknameUsage(
  supabase: SupabaseClient,
  params: { userId: string; nickname: string },
): Promise<void> {
  const trimmed = params.nickname.trim();
  if (!trimmed) return;

  await supabase.rpc('bump_nickname_usage', {
    p_user_id: params.userId,
    p_nickname: trimmed,
  });
  // RPC 없을 때 fallback:
  // await supabase.from('luna_nickname_state').update({ ... }).eq(...)
}

/**
 * 컨텍스트 블록 포맷팅 (LLM 입력용).
 *
 * 출력 예시:
 *   [루나가 너를 부른 방식]
 *   - "쭉이" (12회, 어제, 받아들임)
 *   - "자기" (3회, 5일 전, 미반응)
 *   - 통산 시도 5종, 가장 최근 호칭은 '쭉이'.
 *   ※ 새 애칭 만들지, 기존 걸 쓸지, 그냥 이름 부를지는 너 자유.
 */
export function formatNicknameBlock(snap: NicknameSnapshot): string {
  if (snap.history.length === 0) return '';

  const lines: string[] = ['[루나가 너를 부른 방식]'];
  for (const r of snap.history.slice(0, 6)) {
    const ago = formatAgo(r.lastUsedAt);
    const react = r.userReaction === 'accepted' ? '받아들임'
      : r.userReaction === 'rejected' ? '거부 분위기'
      : r.userReaction === 'neutral' ? '미반응'
      : '관찰 중';
    lines.push(`- "${r.nickname}" (${r.useCount}회, ${ago}, ${react})`);
  }

  return lines.join('\n');
}

function formatAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 60) return '방금 전';
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.round(hr / 24);
  if (day === 1) return '어제';
  if (day < 7) return `${day}일 전`;
  if (day < 30) return `${Math.round(day / 7)}주 전`;
  return `${Math.round(day / 30)}달 전`;
}
