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
