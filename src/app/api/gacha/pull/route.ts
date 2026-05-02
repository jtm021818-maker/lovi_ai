/**
 * 🎰 v83: POST /api/gacha/pull
 *
 * Body: { bannerId, count: 1 | 10 }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getBanner } from '@/engines/gacha/banner-config';
import { pullSinglePure, pullTenPure, DUPLICATE_OVERFLOW_HEARTS } from '@/engines/gacha/gacha-engine';
import { getBalance, spendCurrency, grantCurrency } from '@/lib/server/currency-ops';
import { calcBondLv } from '@/engines/spirits/bond-engine';
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
      // v103: first_meet 노드 자동 기록
      await supabase.from('spirit_mind_map_nodes').insert({
        user_id: user.id,
        spirit_id: r.spiritId,
        node_type: 'first_meet',
        label: '처음 만남',
        detail: `${new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} — 처음 손이 닿은 날.`,
      });
    } else {
      // 카운트 증가 + 교감 XP 직접 부여
      const { data: row } = await supabase
        .from('user_spirits')
        .select('count, bond_xp, bond_lv')
        .eq('user_id', user.id)
        .eq('spirit_id', r.spiritId)
        .maybeSingle();

      if (row) {
        const xpBefore = row.bond_xp ?? 0;
        const lvBefore = (row.bond_lv ?? 1) as 1 | 2 | 3 | 4 | 5;
        const bonusXp = r.duplicateRefund?.bondXp ?? 0;
        const isMaxBond = xpBefore >= 1500;

        let xpGained = 0;
        let lvAfter = lvBefore;
        let overflowHearts = 0;

        const update: Record<string, unknown> = { count: (row.count ?? 1) + 1 };

        if (isMaxBond) {
          // Lv5 상태: XP 대신 하트스톤 오버플로우
          overflowHearts = DUPLICATE_OVERFLOW_HEARTS[r.rarity];
        } else {
          const newXp = Math.min(1500, xpBefore + bonusXp);
          xpGained = newXp - xpBefore;
          lvAfter = calcBondLv(newXp);
          update.bond_xp = newXp;
          update.bond_lv = lvAfter;
        }

        await supabase
          .from('user_spirits')
          .update(update)
          .eq('user_id', user.id)
          .eq('spirit_id', r.spiritId);

        // 하트스톤 환전 (중복 기본 보상)
        if (r.duplicateRefund?.heartStone) {
          await grantCurrency(user.id, 'heart_stone', r.duplicateRefund.heartStone, 'gacha_duplicate', { spiritId: r.spiritId });
        }
        // Lv5 오버플로우 하트스톤
        if (overflowHearts > 0) {
          await grantCurrency(user.id, 'heart_stone', overflowHearts, 'gacha_overflow', { spiritId: r.spiritId });
        }

        // UI 표시용 교감 정보 첨부
        r.bondBonus = {
          xpGained,
          lvBefore,
          lvAfter,
          ...(overflowHearts > 0 ? { overflowHearts } : {}),
        };
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

  // v104 M2: 10연차 시 가챠 부산물 1개 보너스 (gacha_dust)
  if (count === 10) {
    const { data: master } = await supabase
      .from('item_master')
      .select('id')
      .eq('id', 'gacha_dust')
      .maybeSingle();
    if (master) {
      await supabase.from('user_inventory_items').insert({
        user_id: user.id,
        item_id: 'gacha_dust',
        quantity: 1,
        source: 'gacha',
        luna_note: null,
        is_new: true,
      });
    }
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
