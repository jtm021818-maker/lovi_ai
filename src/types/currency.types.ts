/**
 * 💎 v83: Currency System Types
 */

export type CurrencyType = 'heart_stone' | 'starlight' | 'bond_shards';

export interface UserCurrency {
  heartStone: number;
  starlight: number;
  bondShards: number;
}

export type CurrencyGrantReason =
  | 'daily_login'
  | 'streak_bonus'
  | 'first_message'
  | 'session_complete'
  | 'intimacy_up'
  | 'crisis_overcome'
  | 'achievement'
  | 'gacha_duplicate'
  | 'purchase'
  | 'subscription'
  | 'admin_grant'
  | 'gacha_cost';

export interface CurrencyTransaction {
  id: string;
  userId: string;
  currencyType: CurrencyType;
  amount: number; // 양수 = 획득, 음수 = 소비
  reason: CurrencyGrantReason;
  balanceAfter: number;
  createdAt: string;
}
