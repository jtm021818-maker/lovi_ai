/**
 * POST /api/gacha/pull
 * Body: { bannerId, count: 1 | 10 }
 *
 * 병렬 처리:
 *  - 재화 차감 + 가챠 상태 + 보유 정령 → 동시
 *  - 중복 정령 교감 읽기 → 동시
 *  - 모든 쓰기(insert/update/grant) → 동시
 *  - gacha_draws 개별 N번 → 일괄 insert 1번
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

  const cost = count === 10 ? banner.costTen : banner.costSingle;
  const amount = cost.heartStone ?? 0;

  // ── 1단계: 재화 차감 + 가챠 상태 + 보유 정령 동시 조회 ──
  const [spendResult, { data: gachaRow }, { data: ownedRows }] = await Promise.all([
    amount > 0
      ? spendCurrency(user.id, 'heart_stone', amount, 'gacha_cost', { bannerId, count })
      : Promise.resolve({ ok: true }),
    supabase.from('user_gacha_state').select('*').eq('user_id', user.id).eq('banner_id', bannerId).maybeSingle(),
    supabase.from('user_spirits').select('spirit_id').eq('user_id', user.id),
  ]);

  if (!spendResult.ok) return NextResponse.json({ error: '재화 부족' }, { status: 402 });

  const state: GachaState = gachaRow
    ? { bannerId, pityCounter: gachaRow.pity_counter, isPickupGuaranteed: gachaRow.is_pickup_guaranteed, totalPulls: gachaRow.total_pulls, lastPullAt: gachaRow.last_pull_at }
    : { bannerId, pityCounter: 0, isPickupGuaranteed: false, totalPulls: 0, lastPullAt: null };

  const ownedSet = new Set((ownedRows ?? []).map((r) => r.spirit_id));
  const isOwned = (id: SpiritId) => ownedSet.has(id);

  // ── 2단계: 뽑기 계산 (순수 함수, DB 없음) ──
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

  const newSpirits = results.filter((r) => r.isNew);
  const duplicates = results.filter((r) => !r.isNew);

  // ── 3단계: 중복 정령 교감 데이터 동시 읽기 ──
  const dupBondRows = duplicates.length > 0
    ? await Promise.all(
        duplicates.map((r) =>
          supabase.from('user_spirits')
            .select('count, bond_xp, bond_lv')
            .eq('user_id', user.id)
            .eq('spirit_id', r.spiritId)
            .maybeSingle()
        )
      )
    : [];

  // 교감 계산 (순수 연산)
  type DupWork = { r: PullResult; update: Record<string, unknown>; refundHearts: number; overflowHearts: number };
  const dupWork: DupWork[] = [];

  for (let i = 0; i < duplicates.length; i++) {
    const r = duplicates[i];
    const row = dupBondRows[i]?.data;
    if (!row) continue;

    const xpBefore = row.bond_xp ?? 0;
    const lvBefore = (row.bond_lv ?? 1) as 1 | 2 | 3 | 4 | 5;
    const bonusXp = r.duplicateRefund?.bondXp ?? 0;
    const isMaxBond = xpBefore >= 1500;
    const update: Record<string, unknown> = { count: (row.count ?? 1) + 1 };
    let xpGained = 0;
    let lvAfter = lvBefore;
    let overflowHearts = 0;

    if (isMaxBond) {
      overflowHearts = DUPLICATE_OVERFLOW_HEARTS[r.rarity];
    } else {
      const newXp = Math.min(1500, xpBefore + bonusXp);
      xpGained = newXp - xpBefore;
      lvAfter = calcBondLv(newXp);
      update.bond_xp = newXp;
      update.bond_lv = lvAfter;
    }

    r.bondBonus = { xpGained, lvBefore, lvAfter, ...(overflowHearts > 0 ? { overflowHearts } : {}) };
    dupWork.push({ r, update, refundHearts: r.duplicateRefund?.heartStone ?? 0, overflowHearts });
  }

  const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

  // ── 4단계: 모든 쓰기 동시 실행 ──
  await Promise.all([
    // 신규 정령 일괄 insert
    newSpirits.length > 0 &&
      supabase.from('user_spirits').insert(
        newSpirits.map((r) => ({ user_id: user.id, spirit_id: r.spiritId, count: 1, bond_xp: 0, bond_lv: 1 }))
      ),
    // 첫 만남 노드 일괄 insert
    newSpirits.length > 0 &&
      supabase.from('spirit_mind_map_nodes').insert(
        newSpirits.map((r) => ({
          user_id: user.id,
          spirit_id: r.spiritId,
          node_type: 'first_meet',
          label: '처음 만남',
          detail: `${today} — 처음 손이 닿은 날.`,
        }))
      ),
    // 중복 교감 업데이트 (병렬)
    ...dupWork.map(({ r, update }) =>
      supabase.from('user_spirits').update(update).eq('user_id', user.id).eq('spirit_id', r.spiritId)
    ),
    // 중복 환전 하트스톤 (병렬)
    ...dupWork
      .filter(({ refundHearts }) => refundHearts > 0)
      .map(({ r, refundHearts }) =>
        grantCurrency(user.id, 'heart_stone', refundHearts, 'gacha_duplicate', { spiritId: r.spiritId })
      ),
    // Lv5 오버플로우 하트스톤 (병렬)
    ...dupWork
      .filter(({ overflowHearts }) => overflowHearts > 0)
      .map(({ r, overflowHearts }) =>
        grantCurrency(user.id, 'heart_stone', overflowHearts, 'gacha_overflow', { spiritId: r.spiritId })
      ),
    // 뽑기 이력 일괄 insert (N번 → 1번)
    supabase.from('gacha_draws').insert(
      results.map((r) => ({
        user_id: user.id,
        banner_id: bannerId,
        spirit_id: r.spiritId,
        rarity: r.rarity,
        is_new: r.isNew,
        pity_at_draw: r.pityAtDraw,
      }))
    ),
    // 가챠 상태 저장
    supabase.from('user_gacha_state').upsert({
      user_id: user.id,
      banner_id: bannerId,
      pity_counter: finalState.pityCounter,
      is_pickup_guaranteed: finalState.isPickupGuaranteed,
      total_pulls: finalState.totalPulls,
      last_pull_at: finalState.lastPullAt,
    }),
    // 10연차 부산물 (실패해도 무시)
    count === 10 &&
      supabase.from('user_inventory_items')
        .insert({ user_id: user.id, item_id: 'gacha_dust', quantity: 1, source: 'gacha', luna_note: null, is_new: true })
        .then(() => {}, () => {}),
  ]);

  const newBalance = await getBalance(user.id);
  return NextResponse.json({ results, newBalance, newGachaState: finalState });
}
