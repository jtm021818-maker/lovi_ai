/**
 * v115.7 Nickname State — 루나가 유저에게 시도한 애칭 이력.
 *
 * 핵심 원칙:
 *   - 코드는 저장/조회만. 어떤 애칭을 만들지/쓸지는 LLM이 결정.
 *   - 사전 정의된 애칭 풀 없음. LLM이 매번 컨텍스트 보고 자율 작명.
 *   - 친밀도 조건문 없음. 컨텍스트로 친밀도만 전달.
 *
 * v115.7 추가:
 *   - status: candidate → trying → accepted/rejected 3단계 상태기계
 *   - 추억 앵커 필수 (anchor_episode_id, anchor_quote)
 *   - 게이트 모듈은 nickname-gate.ts 참조
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type NicknameStatus = 'candidate' | 'trying' | 'accepted' | 'rejected';

export interface NicknameRecord {
  nickname: string;
  status: NicknameStatus;
  useCount: number;
  lastUsedAt: string;
  /** 'accepted' | 'neutral' | 'rejected' | null — 마지막 관찰된 유저 반응 */
  userReaction: NicknameReaction;
  /** LLM이 작명 시 남긴 맥락 메모 */
  originContext?: string;
  /** v115.7: 별명의 추억 앵커 episode id */
  anchorEpisodeId?: string | null;
  /** v115.7: 그 episode 에서 따온 인용 */
  anchorQuote?: string | null;
  daysSinceFirstUse: number;
}

export type NicknameReaction = 'accepted' | 'neutral' | 'rejected' | null;

export interface NicknameSnapshot {
  /** 사용 빈도 / 최신 순으로 정렬된 이력 (최대 8개) — rejected 제외 */
  history: NicknameRecord[];
  /** 마지막으로 실제 본문에서 사용한 애칭 (있으면) */
  mostRecentNickname?: string;
  /** 누적 시도된 고유 애칭 수 (rejected 포함) */
  totalUniqueAttempts: number;
  /** v115.7: 활성 (candidate + trying + accepted) 개수 — 게이트가 이걸 봄 */
  activeCount: number;
  /** v115.7: 영구 봉인된 별명 목록 (LLM에 "이건 절대 X" 로 주입) */
  rejectedNames: string[];
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
    .select('nickname, status, use_count, last_used_at, user_reaction, origin_context, anchor_episode_id, anchor_quote, created_at')
    .eq('user_id', userId)
    .order('last_used_at', { ascending: false })
    .limit(20);

  if (error || !data) {
    return { history: [], totalUniqueAttempts: 0, activeCount: 0, rejectedNames: [] };
  }

  const now = Date.now();
  const rejectedNames: string[] = [];
  const activeRecords: NicknameRecord[] = [];

  for (const row of data) {
    const status = (row.status ?? 'candidate') as NicknameStatus;
    if (status === 'rejected') {
      rejectedNames.push(row.nickname);
      continue;
    }
    activeRecords.push({
      nickname: row.nickname,
      status,
      useCount: row.use_count ?? 1,
      lastUsedAt: row.last_used_at,
      userReaction: (row.user_reaction ?? null) as NicknameReaction,
      originContext: row.origin_context ?? undefined,
      anchorEpisodeId: row.anchor_episode_id ?? null,
      anchorQuote: row.anchor_quote ?? null,
      daysSinceFirstUse: Math.max(
        0,
        Math.round((now - new Date(row.created_at).getTime()) / (24 * 60 * 60 * 1000)),
      ),
    });
  }

  // history 는 active 8개만
  const history = activeRecords.slice(0, 8);

  return {
    history,
    mostRecentNickname: history[0]?.nickname,
    totalUniqueAttempts: data.length,
    activeCount: activeRecords.length,
    rejectedNames,
  };
}

/**
 * 새 애칭 첫 등장 (LLM이 [NICKNAME_PROPOSE] 태그 출력 시 호출).
 *
 * v115.7: anchor 필수. 상태는 'candidate' 로 시작.
 * 게이트 (nickname-gate.ts) 는 호출 전에 통과 확인된 상태여야 함.
 */
export async function proposeNickname(
  supabase: SupabaseClient,
  params: {
    userId: string;
    sessionId?: string | null;
    nickname: string;
    originContext?: string;
    anchorEpisodeId: string;
    anchorQuote: string;
  },
): Promise<{ ok: boolean; isNew: boolean; status?: NicknameStatus }> {
  const trimmed = params.nickname.trim();
  if (!trimmed || trimmed.length > 30) return { ok: false, isNew: false };
  if (!params.anchorEpisodeId || !params.anchorQuote) return { ok: false, isNew: false };

  // upsert: 이미 존재하면 use_count++ + 'trying' 승격, 없으면 새 'candidate' row
  const { data: existing } = await supabase
    .from('luna_nickname_state')
    .select('id, use_count, status')
    .eq('user_id', params.userId)
    .eq('nickname', trimmed)
    .maybeSingle();

  if (existing) {
    // 봉인된 (rejected) 별명은 재시도 자체를 차단
    if (existing.status === 'rejected') {
      return { ok: false, isNew: false, status: 'rejected' };
    }
    const newStatus: NicknameStatus = existing.status === 'candidate' ? 'trying' : existing.status;
    await supabase
      .from('luna_nickname_state')
      .update({
        use_count: (existing.use_count ?? 1) + 1,
        last_used_at: new Date().toISOString(),
        status: newStatus,
      })
      .eq('id', existing.id);
    return { ok: true, isNew: false, status: newStatus };
  }

  const { error } = await supabase.from('luna_nickname_state').insert({
    user_id: params.userId,
    nickname: trimmed,
    origin_session_id: params.sessionId ?? null,
    origin_context: params.originContext ?? null,
    anchor_episode_id: params.anchorEpisodeId,
    anchor_quote: params.anchorQuote,
    status: 'candidate',
    use_count: 1,
    last_used_at: new Date().toISOString(),
  });

  return { ok: !error, isNew: true, status: 'candidate' };
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
}

/**
 * v115.7: candidate → trying 승격 (루나가 본문에서 별명을 처음 시험 사용).
 */
export async function promoteToTrying(
  supabase: SupabaseClient,
  params: { userId: string; nickname: string; turnIdx: number },
): Promise<void> {
  await supabase.rpc('promote_nickname_trying', {
    p_user_id: params.userId,
    p_nickname: params.nickname.trim(),
    p_turn_idx: params.turnIdx,
  });
}

/**
 * v115.7: 유저 반응 관찰 결과 기록.
 */
export async function recordReaction(
  supabase: SupabaseClient,
  params: {
    userId: string;
    nickname: string;
    reaction: 'accepted' | 'rejected' | 'neutral';
    status: NicknameStatus;
  },
): Promise<void> {
  await supabase.rpc('record_nickname_reaction', {
    p_user_id: params.userId,
    p_nickname: params.nickname.trim(),
    p_reaction: params.reaction,
    p_status: params.status,
  });
}

/**
 * 유저가 UI 에서 직접 별명 거부 → 영구 봉인.
 */
export async function rejectNickname(
  supabase: SupabaseClient,
  params: { userId: string; nickname: string },
): Promise<void> {
  await supabase
    .from('luna_nickname_state')
    .update({
      status: 'rejected',
      user_reaction: 'rejected',
      reaction_observed_at: new Date().toISOString(),
    })
    .eq('user_id', params.userId)
    .eq('nickname', params.nickname.trim());
}

/**
 * 활성 (candidate + trying + accepted) 별명 개수만 빠르게 조회 — 게이트용.
 */
export async function countActiveNicknames(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count } = await supabase
    .from('luna_nickname_state')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .neq('status', 'rejected');
  return count ?? 0;
}

/**
 * 컨텍스트 블록 포맷팅 (LLM 입력용).
 *
 * 출력 예시:
 *   [루나가 너를 부른 방식]
 *   - "쭉이" (12회, 어제, accepted ✓)
 *   - "자기" (3회, 5일 전, trying — 반응 관찰 중)
 *   ⚠️ 절대 다시 시도 금지: "바보탱이", "찐따냥"
 */
export function formatNicknameBlock(snap: NicknameSnapshot): string {
  if (snap.history.length === 0 && snap.rejectedNames.length === 0) return '';

  const lines: string[] = ['[루나가 너를 부른 방식]'];

  for (const r of snap.history.slice(0, 6)) {
    const ago = formatAgo(r.lastUsedAt);
    const statusLabel = formatStatusLabel(r.status, r.userReaction);
    lines.push(`- "${r.nickname}" (${r.useCount}회, ${ago}, ${statusLabel})`);
    if (r.anchorQuote) {
      lines.push(`    └ 추억: "${r.anchorQuote}"`);
    }
  }

  if (snap.rejectedNames.length > 0) {
    lines.push(
      `⚠️ 절대 다시 쓰지 마 (유저가 거부함): ${snap.rejectedNames.map((n) => `"${n}"`).join(', ')}`,
    );
  }

  return lines.join('\n');
}

function formatStatusLabel(status: NicknameStatus, reaction: NicknameReaction): string {
  if (status === 'accepted') return '받아들임 ✓';
  if (status === 'rejected') return '거부됨 ✗';
  if (status === 'trying') {
    if (reaction === 'accepted') return '시험 사용 → 긍정';
    if (reaction === 'rejected') return '시험 사용 → 거부 분위기';
    return '시험 사용 중 (반응 관찰)';
  }
  return '제안 직후 (아직 본문 미사용)';
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
