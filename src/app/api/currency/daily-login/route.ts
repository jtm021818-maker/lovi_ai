/**
 * 💎 v83: POST /api/currency/daily-login
 * 일일 첫 로그인 보상 + 연속 스트릭
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { grantCurrency } from '@/lib/server/currency-ops';

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const today = new Date().toISOString().slice(0, 10);

  const { data: row } = await supabase
    .from('user_currency')
    .select('last_daily_login_date, streak_days')
    .eq('user_id', user.id)
    .maybeSingle();

  if (row?.last_daily_login_date === today) {
    return NextResponse.json({ alreadyClaimed: true });
  }

  // 스트릭 계산
  let newStreak = 1;
  if (row?.last_daily_login_date) {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    newStreak = row.last_daily_login_date === yesterday ? (row.streak_days ?? 0) + 1 : 1;
  }

  // 보상
  let reward = 10;
  let bonus = 0;
  if (newStreak === 3) bonus = 20;
  else if (newStreak === 7) bonus = 50;
  else if (newStreak === 14) bonus = 100;
  else if (newStreak === 30) bonus = 300;

  const total = reward + bonus;

  await grantCurrency(user.id, 'heart_stone', total, bonus > 0 ? 'streak_bonus' : 'daily_login', { streak: newStreak });

  await supabase
    .from('user_currency')
    .update({ last_daily_login_date: today, streak_days: newStreak })
    .eq('user_id', user.id);

  return NextResponse.json({ reward, bonus, streak: newStreak, totalGranted: total });
}
