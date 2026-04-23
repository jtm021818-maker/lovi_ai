/**
 * 🔍 v88: BrowseSessionStore — "같이 찾기" 스트리밍 세션 상태 저장소
 *
 * in-memory Map. agent 루프가 중간에 일시정지(유저 입력 대기) 했다가
 * 다음 턴에 resume 하기 위해 필요.
 *
 * - 멀티 인스턴스 배포 시 Redis 권장. 현재는 단일 Node 프로세스 기준.
 * - 10분 이상 된 세션은 GC.
 *
 * 설계 포인트:
 * - pool: 아직 후보에게 보여주지 않은 raw 후보들 (Brave 검색 결과 캐시)
 * - shown: 이미 평가/보여준 후보 (중복 방지)
 * - shortlist: 유저가 "좋아" 한 것
 * - awaitingDecision: 현재 유저 응답 대기 중인 promptId (클릭이 이 id 와 맞아야 resume)
 */

import type { BrowseSessionMeta } from '@/types/engine.types';

/** Agent 가 재검색에 활용할 raw 후보 */
export interface BrowseCandidateSeed {
  /** 서버에서 부여하는 식별자 (c1, c2, ...) */
  id: string;
  title: string;
  url: string;
  description?: string;
  siteName?: string;
  /** grounding 전 1차 판정에 썼던 관련성 스코어 (0~1, 디버그용) */
  relevance?: number;
}

export type BrowseSessionStage =
  | 'opening'         // 오프닝 멘트 전송 중
  | 'searching'       // Brave + query expand 중
  | 'per_candidate'   // 후보별 judge 루프 진행 중
  | 'awaiting_user'   // decision_prompt 후 유저 입력 대기
  | 'closing'         // shortlist 기반 마무리 멘트 중
  | 'ended';

export interface BrowseSessionState {
  meta: BrowseSessionMeta;
  pool: BrowseCandidateSeed[];     // 아직 평가 안 한 후보
  shown: BrowseCandidateSeed[];    // 이미 평가 후 유저에게 보여준 것
  shortlist: BrowseCandidateSeed[]; // love 받은 것
  rejected: BrowseCandidateSeed[];  // 'skip' verdict 또는 유저 reject
  currentCandidate?: BrowseCandidateSeed;
  awaitingDecision?: {
    promptId: string;
    /** 어떤 상황에서의 decision 인지 — per_candidate / closing */
    context: 'per_candidate' | 'closing';
    candidateId?: string;
  };
  stage: BrowseSessionStage;
  /** 블록 순번 카운터 — 클라이언트 정렬용 */
  blockOrder: number;
  /** 최대 후보 노출 수 (과도한 탐색 방지) */
  maxShown: number;
  createdAt: number;
  lastTouchedAt: number;
  /** 재검색 여분 쿼리 (유저가 "다른 거 없어?" 여러 번 눌렀을 때) */
  extraQueries?: string[];
}

const sessions = new Map<string, BrowseSessionState>();

const TTL_MS = 10 * 60 * 1000; // 10분
const GC_INTERVAL_MS = 60 * 1000;

let gcTimer: ReturnType<typeof setInterval> | null = null;

function ensureGc() {
  if (gcTimer) return;
  // Node 런타임에서만 타이머 기동 (엣지 런타임 등에서는 setInterval 이 drain 될 수 있음)
  gcTimer = setInterval(() => {
    const now = Date.now();
    for (const [id, s] of sessions) {
      if (now - s.lastTouchedAt > TTL_MS) {
        sessions.delete(id);
        console.log(`[BrowseSessionStore] 🗑️ GC expired ${id}`);
      }
    }
  }, GC_INTERVAL_MS);
  // Node process 종료 시 leak 방지
  if (typeof gcTimer.unref === 'function') gcTimer.unref();
}

export function createSession(meta: BrowseSessionMeta, maxShown = 5): BrowseSessionState {
  ensureGc();
  const now = Date.now();
  const state: BrowseSessionState = {
    meta,
    pool: [],
    shown: [],
    shortlist: [],
    rejected: [],
    stage: 'opening',
    blockOrder: 0,
    maxShown,
    createdAt: now,
    lastTouchedAt: now,
  };
  sessions.set(meta.sessionId, state);
  return state;
}

export function getSession(sessionId: string): BrowseSessionState | undefined {
  const s = sessions.get(sessionId);
  if (s) s.lastTouchedAt = Date.now();
  return s;
}

export function updateSession(
  sessionId: string,
  patch: Partial<BrowseSessionState>,
): BrowseSessionState | undefined {
  const s = sessions.get(sessionId);
  if (!s) return undefined;
  Object.assign(s, patch);
  s.lastTouchedAt = Date.now();
  return s;
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export function nextBlockOrder(sessionId: string): number {
  const s = sessions.get(sessionId);
  if (!s) return 0;
  const o = s.blockOrder;
  s.blockOrder += 1;
  s.lastTouchedAt = Date.now();
  return o;
}

export function popNextCandidate(sessionId: string): BrowseCandidateSeed | undefined {
  const s = sessions.get(sessionId);
  if (!s) return undefined;
  const next = s.pool.shift();
  s.currentCandidate = next;
  s.lastTouchedAt = Date.now();
  return next;
}

export function markShown(sessionId: string, seed: BrowseCandidateSeed): void {
  const s = sessions.get(sessionId);
  if (!s) return;
  s.shown.push(seed);
  s.lastTouchedAt = Date.now();
}

export function markShortlist(sessionId: string, seed: BrowseCandidateSeed): void {
  const s = sessions.get(sessionId);
  if (!s) return;
  s.shortlist.push(seed);
  s.lastTouchedAt = Date.now();
}

export function markRejected(sessionId: string, seed: BrowseCandidateSeed): void {
  const s = sessions.get(sessionId);
  if (!s) return;
  s.rejected.push(seed);
  s.lastTouchedAt = Date.now();
}

export function activeSessionCount(): number {
  return sessions.size;
}
