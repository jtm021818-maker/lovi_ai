/**
 * 🎰 v83: POST /api/gacha/pull
 *
 * Body: { bannerId, count: 1 | 10 }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getBanner } from '@/engines/gacha/banner-config';
import { pullSinglePure, pullTenPure } from '@/engines/gacha/gacha-engine';
import { getBalance, spendCurrency, grantCurrency } from '@/lib/server/currency-ops';
import type { GachaState, PullResult } from '@/types/gacha.types';
import type { SpiritId } from '@/types/spirit.types';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  let body: { bannerId?: string; count?: number };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }); }

  const bannerId = (body.bannerId ?? 'standard') as import('@/types/gacha.types').BannerId;
  const count = body.count === 10 ? 10 : 1;

  const banner = getBanner(bannerId);
  if (!banner) return NextResponse.json({ error: '배너 없음' }, { status: 404 });

  // 비용 차감
  const cost = count === 10 ? banner.costTen : banner.costSingle;
  // 기본은 heart_stone 사용
  const amount = cost.heartStone ?? 0;
  if (amount > 0) {
    const spent = await spendCurrency(user.id, 'heart_stone', amount, 'gacha_cost', { bannerId, count });
    if (!spent.ok) return NextResponse.json({ error: '재화 부족' }, { status: 402 });
  }

  // 현재 gacha state 로드
  const { data: gachaRow } = await supabase
    .from('user_gacha_state')
    .select('*')
    .eq('user_id', user.id)
    .eq('banner_id', bannerId)
    .maybeSingle();

  const state: GachaState = gachaRow
    ? {
        bannerId,
        pityCounter: gachaRow.pity_counter,
        isPickupGuaranteed: gachaRow.is_pickup_guaranteed,
        totalPulls: gachaRow.total_pulls,
        lastPullAt: gachaRow.last_pull_at,
      }
    : { bannerId, pityCounter: 0, isPickupGuaranteed: false, totalPulls: 0, lastPullAt: null };

  // 유저 보유 정령 조회
  const { data: ownedRows } = await supabase
    .from('user_spirits')
    .select('spirit_id')
    .eq('user_id', user.id);
  const ownedSet = new Set((ownedRows ?? []).map((r) => r.spirit_id));
  const isOwned = (id: SpiritId) => ownedSet.has(id);

  // 뽑기 계산
  let results: PullResult[];
  let finalState: GachaState;
  if (count === 10) {
    const ten = pullTenPure(banner, state, () => (id) => ownedSet.has(id));
    results = ten.results;
    finalState = ten.finalState;
  } else {
    const single = pullSinglePure(banner, state, isOwned);
    results = [single.result];
    finalState = single.newState;
  }

  // DB 반영 — 정령 저장 + 중복 환전 + 이력
  for (const r of results) {
    if (r.isNew) {
      await supabase.from('user_spirits').insert({
        user_id: user.id,
        spirit_id: r.spiritId,
        count: 1,
        bond_xp: 0,
        bond_lv: 1,
      });
      ownedSet.add(r.spiritId);
    } else {
      // 카운트 증가 — fallback: 단순 update (RPC 없어도 동작)
      const { data: row } = await supabase
        .from('user_spirits')
        .select('count')
        .eq('user_id', user.id)
        .eq('spirit_id', r.spiritId)
        .maybeSingle();
      if (row) {
        await supabase
          .from('user_spirits')
          .update({ count: (row.count ?? 1) + 1 })
          .eq('user_id', user.id)
          .eq('spirit_id', r.spiritId);
      }
      // 환전
      if (r.duplicateRefund?.heartStone) {
        await grantCurrency(user.id, 'heart_stone', r.duplicateRefund.heartStone, 'gacha_duplicate', { spiritId: r.spiritId });
      }
      if (r.duplicateRefund?.bondShards) {
        await grantCurrency(user.id, 'bond_shards', r.duplicateRefund.bondShards, 'gacha_duplicate', { spiritId: r.spiritId });
      }
    }

    // 이력
    await supabase.from('gacha_draws').insert({
      user_id: user.id,
      banner_id: bannerId,
      spirit_id: r.spiritId,
      rarity: r.rarity,
      is_new: r.isNew,
      pity_at_draw: r.pityAtDraw,
    });
  }

  // gacha state 저장
  await supabase.from('user_gacha_state').upsert({
    user_id: user.id,
    banner_id: bannerId,
    pity_counter: finalState.pityCounter,
    is_pickup_guaranteed: finalState.isPickupGuaranteed,
    total_pulls: finalState.totalPulls,
    last_pull_at: finalState.lastPullAt,
  });

  const newBalance = await getBalance(user.id);

  return NextResponse.json({
    results,
    newBalance,
    newGachaState: finalState,
  });
}
