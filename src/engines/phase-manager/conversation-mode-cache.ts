/**
 * 🆕 v105: Conversation Mode Cache
 *
 * 좌뇌 LLM이 판단한 conversation_mode를 sessionId별로 인메모리 캐시.
 * 다음 턴에서 PhaseContext.conversationMode 의 우선 소스로 활용.
 *
 * 흐름:
 *   턴 N: 휴리스틱으로 1차 결정 → phase 흐름 진행 → 좌뇌 결과 받음 → 캐시에 저장
 *   턴 N+1: 캐시에서 이전 턴 좌뇌 판단을 PhaseContext에 우선 적용
 *           휴리스틱은 캐시 없을 때 fallback
 *
 * TTL: 1시간 (세션 자연 종료 후 자동 정리)
 * 멀티 인스턴스: 인스턴스 간 공유 X. 같은 sessionId가 같은 인스턴스에 stick 가정.
 *                 향후 DB 컬럼 마이그레이션 시 교체 가능.
 */

const CACHE = new Map<string, { mode: 'COUNSELING' | 'CASUAL' | 'ASSIST'; reason?: string; updatedAt: number }>();
const TTL_MS = 60 * 60 * 1000;   // 1시간

/** 만료된 entry 청소 (lazy cleanup). 캐시 사이즈가 너무 커지면 가끔 호출. */
function maybeCleanup() {
  if (CACHE.size < 500) return;
  const now = Date.now();
  for (const [k, v] of CACHE.entries()) {
    if (now - v.updatedAt > TTL_MS) CACHE.delete(k);
  }
}

/** 이전 턴 좌뇌 conversation_mode 조회. 없거나 만료면 undefined. */
export function getLastConversationMode(sessionId: string | undefined | null):
  | { mode: 'COUNSELING' | 'CASUAL' | 'ASSIST'; reason?: string }
  | undefined
{
  if (!sessionId) return undefined;
  const cached = CACHE.get(sessionId);
  if (!cached) return undefined;
  if (Date.now() - cached.updatedAt > TTL_MS) {
    CACHE.delete(sessionId);
    return undefined;
  }
  return { mode: cached.mode, reason: cached.reason };
}

/** 좌뇌 판단 결과 저장. 다음 턴에서 사용. */
export function setLastConversationMode(
  sessionId: string | undefined | null,
  mode: 'COUNSELING' | 'CASUAL' | 'ASSIST' | undefined,
  reason?: string,
): void {
  if (!sessionId || !mode) return;
  CACHE.set(sessionId, { mode, reason, updatedAt: Date.now() });
  maybeCleanup();
}

/** 세션 종료 시 정리 (선택). */
export function clearConversationMode(sessionId: string | undefined | null): void {
  if (!sessionId) return;
  CACHE.delete(sessionId);
}

// ============================================
// 🆕 v116.1: Short-Reply Streak Cache
//
// 일상 phase 자연 fade-out 안전망. 유저가 짧은 응답 ("응", "ㅇㅋ", "ㅋㅋ")만 반복하면
// BANTER → LINGER, LINGER → FAREWELL 로 자동 전환.
//
// 갱신 규칙 (pipeline 에서 매 턴 호출):
//   - userMessageLength <= 5 AND 감정 깊이 없음 → streak++
//   - userMessageLength > 5 OR 감정 1점 이상 → streak = 0 (리셋)
//   - 단순 동의 ("응 맞아!") 는 streak 리셋 (감정 깊이 있으면)
// ============================================
const SHORT_REPLY_CACHE = new Map<string, { count: number; updatedAt: number }>();

/** 짧은 응답 streak 카운트 조회. 없거나 만료면 0. */
export function getShortReplyStreak(sessionId: string | undefined | null): number {
  if (!sessionId) return 0;
  const cached = SHORT_REPLY_CACHE.get(sessionId);
  if (!cached) return 0;
  if (Date.now() - cached.updatedAt > TTL_MS) {
    SHORT_REPLY_CACHE.delete(sessionId);
    return 0;
  }
  return cached.count;
}

/** 짧은 응답 streak 갱신. */
export function updateShortReplyStreak(
  sessionId: string | undefined | null,
  userMessageLength: number,
  hasEmotionalDepth: boolean,
): number {
  if (!sessionId) return 0;
  const SHORT_MSG_THRESHOLD = 5;   // 5자 이하 = 짧은 응답
  const isShort = userMessageLength <= SHORT_MSG_THRESHOLD && !hasEmotionalDepth;
  const prev = getShortReplyStreak(sessionId);
  const next = isShort ? prev + 1 : 0;
  SHORT_REPLY_CACHE.set(sessionId, { count: next, updatedAt: Date.now() });
  // 캐시 사이즈 보호 (lazy cleanup)
  if (SHORT_REPLY_CACHE.size >= 500) {
    const now = Date.now();
    for (const [k, v] of SHORT_REPLY_CACHE.entries()) {
      if (now - v.updatedAt > TTL_MS) SHORT_REPLY_CACHE.delete(k);
    }
  }
  return next;
}

/** 세션 종료 시 정리. */
export function clearShortReplyStreak(sessionId: string | undefined | null): void {
  if (!sessionId) return;
  SHORT_REPLY_CACHE.delete(sessionId);
}

// ============================================
// 🆕 레인 전환 제안 (Lane Switch Suggestion)
//
// 하드 락 정책상 conversation_mode 단발 판단으로 레인을 자동 전환하지 않는다(thrash 방지).
// 대신 잠긴 레인과 좌뇌 판단이 N턴 연속 어긋나면 "루나가 전환 제안" 칩을 띄운다(유저 확인 후에만 전환).
//
// 흐름:
//   매 턴: 잠긴 레인 != 좌뇌 모드 → bumpLaneMismatch(target) (같은 target 연속이면 streak++)
//          일치하거나 HOOK/browse 발동 턴 → clearLaneMismatch (streak 0)
//   streak >= 2 AND 미억제 → lane_switch_hint emit
//   유저가 칩 [아니] → suppressLaneSwitch (일정 시간 재제안 차단)
//   유저가 칩 [응] 또는 레인 전환 → clearLaneMismatch
// ============================================
const LANE_MISMATCH_CACHE = new Map<string, { target: string; count: number; suppressedUntil: number; updatedAt: number }>();
const LANE_SUPPRESS_MS = 5 * 60 * 1000;   // 거절 후 5분간 재제안 차단

/**
 * 잠긴 레인과 어긋난 좌뇌 target 모드 누적. 같은 target 연속이면 streak 증가, 바뀌면 1로 리셋.
 * @returns 현재 연속 streak (제안 발동 판단용)
 */
export function bumpLaneMismatch(
  sessionId: string | undefined | null,
  target: 'COUNSELING' | 'CASUAL' | 'ASSIST',
): number {
  if (!sessionId) return 0;
  const prev = LANE_MISMATCH_CACHE.get(sessionId);
  const suppressedUntil = prev?.suppressedUntil ?? 0;
  const count = prev && prev.target === target ? prev.count + 1 : 1;
  LANE_MISMATCH_CACHE.set(sessionId, { target, count, suppressedUntil, updatedAt: Date.now() });
  return count;
}

/** 일치/HOOK/browse 턴 → streak 리셋 (suppression 은 유지). */
export function clearLaneMismatch(sessionId: string | undefined | null): void {
  if (!sessionId) return;
  const prev = LANE_MISMATCH_CACHE.get(sessionId);
  if (!prev) return;
  LANE_MISMATCH_CACHE.set(sessionId, { ...prev, target: '', count: 0, updatedAt: Date.now() });
}

/** 유저가 제안 거절 → 일정 시간 재제안 차단. */
export function suppressLaneSwitch(sessionId: string | undefined | null): void {
  if (!sessionId) return;
  const prev = LANE_MISMATCH_CACHE.get(sessionId);
  LANE_MISMATCH_CACHE.set(sessionId, {
    target: '', count: 0,
    suppressedUntil: Date.now() + LANE_SUPPRESS_MS,
    updatedAt: Date.now(),
  });
  void prev;
}

/** 현재 재제안 억제 중인지. */
export function isLaneSwitchSuppressed(sessionId: string | undefined | null): boolean {
  if (!sessionId) return false;
  const prev = LANE_MISMATCH_CACHE.get(sessionId);
  return !!prev && Date.now() < prev.suppressedUntil;
}
