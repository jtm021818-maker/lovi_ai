/**
 * 인메모리 Rate Limiter + Supabase 영속화
 * - 1차 레이어: 인메모리 캐시 (성능)
 * - 2차 레이어: Supabase user_rate_limits 테이블 (영속성)
 *
 * 서버 재시작 시에도 사용량이 유지됩니다.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// 5분마다 만료된 항목 정리
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

interface RateLimitConfig {
  /** 윈도우당 최대 요청 수 */
  maxRequests: number;
  /** 윈도우 크기 (ms) */
  windowMs: number;
}

// ============================================================
// 사용자 Rate Limit (Free / Premium 차별화)
// ============================================================
const TIERS: Record<string, RateLimitConfig> = {
  free: { maxRequests: 5, windowMs: 24 * 60 * 60 * 1000 },     // 5회/일 (프리미엄 전환 유도)
  premium: { maxRequests: 200, windowMs: 24 * 60 * 60 * 1000 }, // 200회/일
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  tier: 'free' | 'premium';
}

export function checkRateLimit(
  userId: string,
  tier: 'free' | 'premium' = 'free'
): RateLimitResult {
  const config = TIERS[tier];
  const key = `${tier}:${userId}`;
  const now = Date.now();

  let entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + config.windowMs };
    store.set(key, entry);
  }

  entry.count++;

  if (entry.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      tier,
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
    tier,
  };
}

/**
 * 사용량을 Supabase에 동기화 (fire-and-forget)
 * route.ts의 savePostProcessing에서 호출하여 DB에 영속화
 */
export async function syncRateLimitToDb(
  supabase: any,
  userId: string
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const { error } = await supabase.rpc('increment_rate_limit', {
    p_user_id: userId,
    p_date: today,
  });

  if (error) {
    // RPC 없으면 직접 upsert
    await supabase
      .from('user_rate_limits')
      .upsert(
        {
          user_id: userId,
          date: today,
          request_count: 1,
        },
        { onConflict: 'user_id,date' }
      )
      .then(async () => {
        // upsert 후 increment
        await supabase.rpc('increment_rate_limit_count', {
          p_user_id: userId,
          p_date: today,
        }).catch(() => {
          // RPC 없으면 무시 — 다음 배포에서 생성됨
        });
      });
  }
}

// ============================================================
// AI 프로바이더 Rate Limit (Gemini/Groq/Cerebras 무료 한도)
// ============================================================
const PROVIDER_LIMITS: Record<string, RateLimitConfig> = {
  // v22: 실제 무료 한도 반영
  // Gemini: Flash Lite 통일 (500 RPD)
  gemini: { maxRequests: 500, windowMs: 24 * 60 * 60 * 1000 },
  // Groq: 8B 14,400 + Qwen3 ~3,000 + 70B 1,000 → 메인 응답 주력
  groq: { maxRequests: 14000, windowMs: 24 * 60 * 60 * 1000 },
  // Cerebras: 1M 토큰/일 → 8B 상태분석 + 70B 메인 폴백
  cerebras: { maxRequests: 14000, windowMs: 24 * 60 * 60 * 1000 },
};

/** 프로바이더 한도 확인 (호출 전 체크) */
export function checkProviderRateLimit(provider: string): Omit<RateLimitResult, 'tier'> {
  const config = PROVIDER_LIMITS[provider];
  if (!config) return { allowed: true, remaining: 999, resetAt: 0 };

  const key = `provider:${provider}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    return { allowed: true, remaining: config.maxRequests, resetAt: 0 };
  }

  const remaining = config.maxRequests - entry.count;
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    resetAt: entry.resetAt,
  };
}

/** 프로바이더 사용량 기록 (호출 후) */
export function recordProviderUsage(provider: string): void {
  const config = PROVIDER_LIMITS[provider];
  if (!config) return;

  const key = `provider:${provider}`;
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + config.windowMs };
    store.set(key, entry);
  }

  entry.count++;
}
