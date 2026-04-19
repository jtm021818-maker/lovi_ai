/**
 * 💎 v83: POST /api/currency/session-reward
 *
 * Body: { type: 'session_complete' | 'intimacy_up' | 'crisis_overcome',
 *         meta?: { ... } }
 *
 * 클라이언트에서 이벤트 감지 시 호출. 서버는 중복/남용 방지 검증.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { grantCurrency } from '@/lib/server/currency-ops';
import { getUserBuffs } from '@/engines/spirits/spirit-abilities';

type RewardType = 'session_complete' | 'intimacy_up' | 'crisis_overcome' | 'first_message';

const BASE_REWARDS: Record<RewardType, number> = {
  first_message: 3,
  session_complete: 30,
  intimacy_up: 50,
  crisis_overcome: 100,
};

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  let body: { type?: RewardType; meta?: Record<string, unknown>; sessionId?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }); }

  const type = body.type;
  if (!type || !(type in BASE_REWARDS)) {
    return NextResponse.json({ error: 'invalid type' }, { status: 400 });
  }

  // 중복 방지: session_complete 는 sessionId 당 1번만
  if (type === 'session_complete' && body.sessionId) {
    const { data: existing } = await supabase
      .from('currency_transactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('reason', 'session_complete')
      .contains('meta', { sessionId: body.sessionId })
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ alreadyClaimed: true });
    }
  }

  // 정령 버프 적용
  const buffs = await getUserBuffs(user.id);
  const base = BASE_REWARDS[type];
  let amount = Math.floor(base * buffs.rewardMultiplier * (1 + buffs.heartStoneGainBonus));

  const newBalance = await grantCurrency(
    user.id,
    'heart_stone',
    amount,
    type,
    { ...body.meta, buffs: { mult: buffs.rewardMultiplier, gain: buffs.heartStoneGainBonus } },
  );

  return NextResponse.json({ granted: amount, newBalance });
}
