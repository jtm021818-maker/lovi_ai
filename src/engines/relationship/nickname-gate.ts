/**
 * v115.7 Nickname Gate — 별명 자율 작명 허용 여부 판정.
 *
 * 문제 배경: v115 에서 별명 작명에 어떤 조건도 없어 첫 세션에 "바보탱이" 같은
 * 놀림형 별명이 등장. 사람 관계에서 별명은 추억과 시간 위에 쌓이는 것.
 *
 * 4중 게이트 (모두 AND):
 *   1. 친밀도 Lv.3+ (개화, avg ~35점) — "같이 고민 나누는 사이"
 *   2. 총 세션 15+ OR 첫 세션 후 14일+
 *   3. 깊은 순간 1회 이상 (first_tears / first_secret / crisis_request 등)
 *   4. 활성 별명 수 < MAX_ACTIVE (=2) — 시그니처 수렴
 *
 * 추가 차단:
 *   - HEAVY/MIRROR/HOOK 등 무거운 phase 에서는 별명 안 만듦
 *   - 부정 어근 (놀림 톤) 차단 — Lv.4 미만에서
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { IntimacyState } from '../intimacy/types';

/** 게이트 통과 시 LLM 에 주입할 컨텍스트 */
export interface NicknameGateContext {
  /** 별명 작명/사용 가이드 주입해도 되는가 */
  allowProposal: boolean;
  /** 통과/실패 사유 (디버그/UI) */
  reason: string;
  /** 진단용 — 현재 충족 상태 */
  diagnostics: {
    intimacyLevel: number;
    totalSessions: number;
    daysSinceFirst: number;
    hasDeepMoment: boolean;
    activeCount: number;
    phaseOk: boolean;
  };
}

/** 깊은 순간으로 인정하는 마일스톤 id (intimacy_milestones 테이블 기준) */
const DEEP_MOMENT_MILESTONES = new Set([
  'first_tears',
  'first_secret',
  'first_gratitude',
  'crisis_request',
  'luna_mistake_forgive',
]);

/** 별명 안 만드는 phase — 무거운 톤이라 별명 부르면 진심 안 보임 */
const HEAVY_PHASES = new Set(['HOOK', 'MIRROR', 'HEAVY']);

/** 활성 (candidate + trying + accepted) 별명 최대 개수 */
export const MAX_ACTIVE_NICKNAMES = 2;

/** 최소 친밀도 레벨 */
export const MIN_INTIMACY_LEVEL = 3;

/** 최소 누적 세션 수 (또는 일수) */
export const MIN_TOTAL_SESSIONS = 15;

/** 최소 첫 세션 후 일수 */
export const MIN_DAYS_SINCE_FIRST = 14;

/**
 * 부정 어근 (놀림형) — Lv.4 미만에서는 별명에 포함 금지.
 * Lv.4+ 면 깊은 친밀이므로 애정 표현으로 통과.
 */
const TEASING_ROOTS = [
  '바보', '멍청', '한심', '돼지', '뚱뚱', '못생', '구질', '찌질',
  '병신', '쪼다', '찐따', '루저', '망나니', '실패', '한심이',
];

/** 별명에 부정 어근 포함 여부 */
export function containsTeasingRoot(nickname: string): boolean {
  const normalized = nickname.replace(/\s+/g, '').toLowerCase();
  return TEASING_ROOTS.some((root) => normalized.includes(root));
}

/**
 * 메인 게이트 — 모든 조건 검사.
 *
 * 호출처: pipeline 에서 nickname snapshot 로드 시 같이 계산해서
 * dual-brain → ACE 로 전파. ACE 프롬프트 빌더가 이 결과 보고 가이드 주입 결정.
 */
export async function evaluateNicknameGate(params: {
  supabase: SupabaseClient;
  userId: string;
  intimacyState: IntimacyState | null;
  currentPhase: string;
  activeNicknameCount: number;
}): Promise<NicknameGateContext> {
  const { supabase, userId, intimacyState, currentPhase, activeNicknameCount } = params;

  const diagnostics = {
    intimacyLevel: intimacyState?.level ?? 1,
    totalSessions: intimacyState?.totalSessions ?? 0,
    daysSinceFirst: computeDaysSinceFirst(intimacyState?.firstSessionAt),
    hasDeepMoment: hasDeepMoment(intimacyState?.milestones ?? []),
    activeCount: activeNicknameCount,
    phaseOk: !HEAVY_PHASES.has(currentPhase),
  };

  // 친밀도
  if (diagnostics.intimacyLevel < MIN_INTIMACY_LEVEL) {
    return {
      allowProposal: false,
      reason: `친밀도 Lv.${diagnostics.intimacyLevel} (필요: Lv.${MIN_INTIMACY_LEVEL}+)`,
      diagnostics,
    };
  }

  // 세션수 OR 일수
  const enoughTime =
    diagnostics.totalSessions >= MIN_TOTAL_SESSIONS ||
    diagnostics.daysSinceFirst >= MIN_DAYS_SINCE_FIRST;
  if (!enoughTime) {
    return {
      allowProposal: false,
      reason: `세션 ${diagnostics.totalSessions}회 / ${diagnostics.daysSinceFirst}일 (필요: 15회 또는 14일+)`,
      diagnostics,
    };
  }

  // 깊은 순간
  if (!diagnostics.hasDeepMoment) {
    return {
      allowProposal: false,
      reason: '아직 함께한 깊은 순간이 부족 (눈물·비밀·위기 중 1회 이상 필요)',
      diagnostics,
    };
  }

  // active 개수
  if (diagnostics.activeCount >= MAX_ACTIVE_NICKNAMES) {
    return {
      allowProposal: false,
      reason: `이미 활성 별명 ${diagnostics.activeCount}개 (최대 ${MAX_ACTIVE_NICKNAMES}개)`,
      diagnostics,
    };
  }

  // phase
  if (!diagnostics.phaseOk) {
    return {
      allowProposal: false,
      reason: `${currentPhase} phase — 무거운 톤이라 별명 보류`,
      diagnostics,
    };
  }

  // 모든 게이트 통과 — 추가로 supabase ping 으로 episode 1개 이상 존재 여부 검증
  // (anchor 강제이므로 episode 없으면 의미 없음)
  const { count } = await supabase
    .from('luna_episodes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if ((count ?? 0) === 0) {
    return {
      allowProposal: false,
      reason: 'episode 0개 — 추억 앵커할 거리 없음',
      diagnostics,
    };
  }

  return {
    allowProposal: true,
    reason: '게이트 통과',
    diagnostics,
  };
}

function computeDaysSinceFirst(firstSessionAt: string | null | undefined): number {
  if (!firstSessionAt) return 0;
  const ms = Date.now() - new Date(firstSessionAt).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

function hasDeepMoment(milestones: string[]): boolean {
  return milestones.some((m) => DEEP_MOMENT_MILESTONES.has(m));
}
