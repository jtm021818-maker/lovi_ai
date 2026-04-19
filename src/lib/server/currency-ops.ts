/**
 * 💎 v83: Currency Operations (server-side)
 *
 * 서버 사이드에서 재화 조작하는 핵심 함수들.
 * API 에서 import 해서 사용.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { UserCurrency, CurrencyType, CurrencyGrantReason } from '@/types/currency.types';

export async function getBalance(userId: string): Promise<UserCurrency> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('user_currency')
    .select('heart_stone, starlight, bond_shards')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    // 레코드 없으면 생성 (트리거가 작동 안 한 경우)
    const { error: insertErr } = await supabase
      .from('user_currency')
      .insert({ user_id: userId, heart_stone: 500, starlight: 50, bond_shards: 0 });
    if (insertErr) throw insertErr;
    return { heartStone: 500, starlight: 50, bondShards: 0 };
  }
  return {
    heartStone: data.heart_stone,
    starlight: data.starlight,
    bondShards: data.bond_shards,
  };
}

export async function grantCurrency(
  userId: string,
  type: CurrencyType,
  amount: number,
  reason: CurrencyGrantReason,
  meta?: Record<string, unknown>,
): Promise<UserCurrency> {
  const supabase = await createServerSupabaseClient();

  // 현재 잔액
  const current = await getBalance(userId);
  const col = type === 'heart_stone' ? 'heartStone' : type === 'starlight' ? 'starlight' : 'bondShards';
  const dbCol = type;

  const newBalance = Math.max(0, (current[col] as number) + amount);

  // 업데이트
  const { error: updateErr } = await supabase
    .from('user_currency')
    .update({ [dbCol]: newBalance, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (updateErr) throw updateErr;

  // 트랜잭션 로그
  await supabase.from('currency_transactions').insert({
    user_id: userId,
    currency_type: type,
    amount,
    reason,
    balance_after: newBalance,
    meta: meta ?? null,
  });

  return { ...current, [col]: newBalance };
}

/** 재화 차감 (뽑기 비용 등). 부족하면 false 반환 */
export async function spendCurrency(
  userId: string,
  type: CurrencyType,
  amount: number,
  reason: CurrencyGrantReason,
  meta?: Record<string, unknown>,
): Promise<{ ok: boolean; newBalance?: UserCurrency }> {
  if (amount <= 0) return { ok: false };
  const current = await getBalance(userId);
  const col = type === 'heart_stone' ? 'heartStone' : type === 'starlight' ? 'starlight' : 'bondShards';
  if ((current[col] as number) < amount) return { ok: false };
  const newBalance = await grantCurrency(userId, type, -amount, reason, meta);
  return { ok: true, newBalance };
}
