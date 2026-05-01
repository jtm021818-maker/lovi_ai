/**
 * v102 (rev2) DEV ONLY — 루나 100일 시뮬레이션 디버그 API
 *
 * 보안:
 *  - process.env.NODE_ENV === 'production' 이고 ALLOW_DEBUG !== 'true' 면 404 차단.
 *  - 로그인한 본인 행만 변경 가능.
 *
 * 기능:
 *  POST /api/_debug/luna-time
 *  body: {
 *    day?: number;       // 0~120 — luna_life.birth_date 를 (now - day*86400000) 으로 세팅
 *    unlocks?: number;   // 0~21 — revealDay 오름차순으로 N개 user_spirits 행에 backstory_unlocked + lore_unlocked = true
 *    bondMax?: boolean;  // true 면 같은 N개 행을 bond_lv=5, bond_xp=1500 로 보정
 *    resetDeath?: boolean; // true 면 ritual_completed_at 초기화 + luna_descendant 비활성
 *  }
 *  GET /api/_debug/luna-time → 현재 상태 요약
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SPIRIT_REVEAL_SCHEDULE } from '@/data/spirit-reveal-schedule';

function isAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEBUG === 'true';
}

export async function GET() {
  if (!isAllowed()) return NextResponse.json({ error: 'disabled' }, { status: 404 });
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const [{ data: life }, { data: room }, { data: descendant }, { count: loreCount }] = await Promise.all([
    supabase.from('luna_life').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('luna_life').select('ritual_completed_at,pages_unlocked_at_death,generation').eq('user_id', user.id).maybeSingle(),
    supabase.from('luna_descendant').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('user_spirits').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('lore_unlocked', true),
  ]);

  let ageDays = 0;
  if (life?.birth_date) {
    ageDays = Math.floor((Date.now() - new Date(life.birth_date).getTime()) / 86400000);
  }
  return NextResponse.json({
    initialized: !!life,
    ageDays,
    isDeceased: !!life?.is_deceased,
    ritualCompleted: !!room?.ritual_completed_at,
    descendantActive: !!descendant?.is_active,
    loreFragmentsUnlocked: loreCount ?? 0,
    totalSpirits: SPIRIT_REVEAL_SCHEDULE.length,
  });
}

export async function POST(req: NextRequest) {
  if (!isAllowed()) return NextResponse.json({ error: 'disabled' }, { status: 404 });
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  let body: { day?: number; unlocks?: number; bondMax?: boolean; resetDeath?: boolean };
  try { body = await req.json(); } catch { body = {}; }

  const day = typeof body.day === 'number' ? Math.max(0, Math.min(120, body.day)) : null;
  const unlocks = typeof body.unlocks === 'number' ? Math.max(0, Math.min(21, body.unlocks)) : null;
  const bondMax = !!body.bondMax;
  const resetDeath = !!body.resetDeath;

  // 1) day 조정
  if (day !== null) {
    const newBirth = new Date(Date.now() - day * 86400000).toISOString();
    const { data: existing } = await supabase
      .from('luna_life').select('user_id').eq('user_id', user.id).maybeSingle();
    if (existing) {
      await supabase.from('luna_life').update({
        birth_date: newBirth,
        is_deceased: day >= 100 && !resetDeath,
        last_gift_day: 0, // 재진입 시 누락된 선물 재생성 유도
      }).eq('user_id', user.id);
    } else {
      await supabase.from('luna_life').insert({
        user_id: user.id,
        birth_date: newBirth,
        is_deceased: day >= 100 && !resetDeath,
        last_gift_day: 0,
      });
    }
  }

  // 2) unlock 조정 — revealDay 오름차순 N개 정령 강제 해금
  if (unlocks !== null) {
    const targets = SPIRIT_REVEAL_SCHEDULE
      .slice().sort((a, b) => a.revealDay - b.revealDay).slice(0, unlocks);

    // 우선 모든 정령에 user_spirits 행 보장 + 해당 N개를 강제 해금
    for (const entry of targets) {
      const update: Record<string, unknown> = {
        user_id: user.id,
        spirit_id: entry.spiritId,
        backstory_unlocked: true,
        lore_unlocked: true,
        lore_unlocked_at: new Date().toISOString(),
        last_interaction_at: new Date().toISOString(),
      };
      if (bondMax) {
        update.bond_lv = 5;
        update.bond_xp = 1500;
      }
      // upsert (count default 1 같은 NOT NULL 컬럼이 있으면 insert 가 깨질 수 있어 update-then-insert 패턴)
      const { data: existing } = await supabase
        .from('user_spirits').select('user_id')
        .eq('user_id', user.id).eq('spirit_id', entry.spiritId).maybeSingle();
      if (existing) {
        await supabase.from('user_spirits').update(update)
          .eq('user_id', user.id).eq('spirit_id', entry.spiritId);
      } else {
        await supabase.from('user_spirits').insert({
          ...update,
          count: 1,
          bond_lv: bondMax ? 5 : 5,
          bond_xp: bondMax ? 1500 : 1500,
          first_obtained_at: new Date().toISOString(),
        });
      }
    }

    // 잉여(unlocks 보다 뒤 순번) 정령 해금 해제 — depth 시뮬레이션 정확도 위해
    const restIds = SPIRIT_REVEAL_SCHEDULE
      .slice().sort((a, b) => a.revealDay - b.revealDay).slice(unlocks)
      .map((e) => e.spiritId);
    if (restIds.length > 0) {
      await supabase.from('user_spirits')
        .update({ backstory_unlocked: false, lore_unlocked: false })
        .eq('user_id', user.id)
        .in('spirit_id', restIds);
    }
  }

  // 3) 의식/솔 초기화
  if (resetDeath) {
    await supabase.from('luna_life').update({
      ritual_completed_at: null,
      pages_unlocked_at_death: 0,
      generation: 1,
    }).eq('user_id', user.id);
    await supabase.from('luna_descendant').update({ is_active: false }).eq('user_id', user.id);
    await supabase.from('luna_sorrow_event_seen').delete().eq('user_id', user.id);
    // fragment 캐시 무효화
    await supabase.from('spirit_fragment_cache').delete().eq('user_id', user.id);
  }

  return NextResponse.json({ ok: true });
}
