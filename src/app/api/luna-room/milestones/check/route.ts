/**
 * v104 M2: POST /api/luna-room/milestones/check
 *
 * 본드 day 마일스톤 도달 시 한정 아이템 자동 지급.
 * 멱등 — 이미 지급된 마일스톤은 다시 안 줌.
 *
 * 응답: { granted: [{ key, item }] | [] }
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAgeDays } from '@/lib/luna-life';

interface Milestone {
  key: string;
  thresholdDay: number;
  itemId: string;
  lunaNote: string;
}

const MILESTONES: Milestone[] = [
  {
    key: 'day50',
    thresholdDay: 50,
    itemId: 'milestone_day50_box',
    lunaNote: '벌써 50일이네. 절반 — 너랑 같이 채웠어.',
  },
  {
    key: 'day100',
    thresholdDay: 100,
    itemId: 'milestone_day100_letter',
    lunaNote: '백일을 다 살아낸 너에게. 이건 — 나의 마지막 한 통.',
  },
];

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { data: life } = await supabase
    .from('luna_life')
    .select('birth_date')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!life?.birth_date) return NextResponse.json({ granted: [] });

  const ageDays = getAgeDays(new Date(life.birth_date));

  // 이미 지급된 마일스톤 조회
  const { data: alreadyGranted } = await supabase
    .from('luna_milestone_rewards')
    .select('milestone_key')
    .eq('user_id', user.id);
  const grantedKeys = new Set((alreadyGranted ?? []).map((r) => r.milestone_key));

  const granted: Array<{ key: string; itemId: string; itemName: string; emoji: string }> = [];

  for (const m of MILESTONES) {
    if (ageDays < m.thresholdDay) continue;
    if (grantedKeys.has(m.key)) continue;

    const { data: master } = await supabase
      .from('item_master')
      .select('id, name_ko, emoji')
      .eq('id', m.itemId)
      .maybeSingle();
    if (!master) continue;

    await supabase.from('user_inventory_items').insert({
      user_id: user.id,
      item_id: m.itemId,
      quantity: 1,
      source: 'achievement',
      acquired_day: ageDays,
      luna_note: m.lunaNote,
      is_new: true,
    });

    await supabase.from('luna_milestone_rewards').insert({
      user_id: user.id,
      milestone_key: m.key,
    });

    granted.push({
      key: m.key,
      itemId: master.id,
      itemName: master.name_ko,
      emoji: master.emoji,
    });
  }

  return NextResponse.json({ granted });
}
