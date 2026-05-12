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

const CACHE = new Map<string, { mode: 'COUNSELING' | 'CASUAL'; reason?: string; updatedAt: number }>();
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
  | { mode: 'COUNSELING' | 'CASUAL'; reason?: string }
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
  mode: 'COUNSELING' | 'CASUAL' | undefined,
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
