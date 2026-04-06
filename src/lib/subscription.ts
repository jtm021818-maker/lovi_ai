/**
 * 구독 시스템 — 서버 사이드 유틸리티
 * 상수/타입은 subscription-plans.ts에서 re-export
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { FREE_DAILY_XRAY_LIMIT } from './subscription-plans';

// 클라이언트에서도 쓸 수 있도록 re-export
export type { SubscriptionTier, PremiumFeature } from './subscription-plans';
export { SUBSCRIPTION_PLANS, PREMIUM_FEATURES, FREE_DAILY_XRAY_LIMIT } from './subscription-plans';

// ============================================================
// 서버 사이드 유틸
// ============================================================

/** 유저의 구독 티어 조회 */
export async function getUserTier(userId: string): Promise<'free' | 'premium'> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('user_profiles')
    .select('is_premium')
    .eq('id', userId)
    .single();

  return data?.is_premium ? 'premium' : 'free';
}

/** 프리미엄 기능 접근 가능 여부 */
export function canAccessFeature(tier: 'free' | 'premium'): boolean {
  return tier === 'premium';
}

/** XRay 일일 사용 횟수 체크 (in-memory) */
const xrayUsageCache = new Map<string, { date: string; count: number }>();

export function checkXrayDailyLimit(userId: string, isPremium: boolean): { allowed: boolean; remaining: number } {
  if (isPremium) return { allowed: true, remaining: Infinity };

  const today = new Date().toISOString().slice(0, 10);
  const cached = xrayUsageCache.get(userId);

  if (!cached || cached.date !== today) {
    return { allowed: true, remaining: FREE_DAILY_XRAY_LIMIT };
  }

  const remaining = FREE_DAILY_XRAY_LIMIT - cached.count;
  return { allowed: remaining > 0, remaining: Math.max(0, remaining) };
}

export function recordXrayUsage(userId: string): void {
  const today = new Date().toISOString().slice(0, 10);
  const cached = xrayUsageCache.get(userId);

  if (!cached || cached.date !== today) {
    xrayUsageCache.set(userId, { date: today, count: 1 });
  } else {
    cached.count++;
  }
}
