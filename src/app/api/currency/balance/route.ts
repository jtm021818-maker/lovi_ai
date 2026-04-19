/**
 * 💎 v83: GET /api/currency/balance
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getBalance } from '@/lib/server/currency-ops';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  try {
    const balance = await getBalance(user.id);
    return NextResponse.json(balance);
  } catch (err: any) {
    console.error('[currency/balance]', err);
    return NextResponse.json({ error: err.message ?? 'unknown' }, { status: 500 });
  }
}
