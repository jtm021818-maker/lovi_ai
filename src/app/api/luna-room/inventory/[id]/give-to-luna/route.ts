/**
 * v104 M4: POST /api/luna-room/inventory/[id]/give-to-luna
 *
 * 사용자가 가방 아이템을 루나에게 *준다*.
 * - 인벤토리 used_at 마킹 (사라짐)
 * - luna_memories 에 special memory 추가 (Day 100 작별 때 회고용)
 * - 한 줄 답례 반응 반환
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { pickLunaReceiveReaction } from '@/lib/luna-shopping/luna-receive-reactions';
import { getAgeDays } from '@/lib/luna-life';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, ctx: Params) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { id } = await ctx.params;

  const [{ data: row }, { data: life }] = await Promise.all([
    supabase
      .from('user_inventory_items')
      .select('id, item_id, source, used_at, item:item_master(name_ko, emoji, category)')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase.from('luna_life').select('birth_date, is_deceased').eq('user_id', user.id).maybeSingle(),
  ]);

  if (!row) return NextResponse.json({ error: '미보유 아이템' }, { status: 404 });
  if (row.used_at) return NextResponse.json({ error: '이미 사용함' }, { status: 400 });
  if (life?.is_deceased) {
    return NextResponse.json({
      error: '루나는 더 이상 받을 수 없어',
      muted: true,
    }, { status: 410 });
  }

  const itemMaster = (row as any).item as {
    name_ko: string;
    emoji: string;
    category: 'gift' | 'consumable' | 'gacha';
  } | null;
  if (!itemMaster) return NextResponse.json({ error: '마스터 데이터 없음' }, { status: 500 });

  const bondDay = life?.birth_date ? getAgeDays(new Date(life.birth_date)) : 0;
  const isLunasOwn = row.source === 'luna_shopping';

  const reaction = pickLunaReceiveReaction({
    category: itemMaster.category,
    bondDay,
    isLunasOwn,
  });

  // 인벤토리 마킹
  await supabase
    .from('user_inventory_items')
    .update({ used_at: new Date().toISOString() })
    .eq('id', row.id)
    .eq('user_id', user.id);

  // luna_memories 에 special memory 추가 (Day 100 회고에 활용 가능)
  const memoryTitle = `${itemMaster.emoji} ${itemMaster.name_ko}`;
  const memoryContent = `너가 ${memoryTitle} 을(를) 나에게 줬어. ${isLunasOwn ? '내가 사다 준 걸 다시 받았네 — 의미 있어.' : '받기만 하다가 받은 날.'}`;
  await supabase.from('luna_memories').insert({
    user_id: user.id,
    day_number: bondDay,
    title: `너에게 받은 ${itemMaster.name_ko}`,
    content: memoryContent,
    luna_thought: reaction,
    frame_style: 'gold',
    source: 'user_gift',
    is_pinned: false,
  });

  return NextResponse.json({
    ok: true,
    reaction,
    bondDay,
    isLunasOwn,
    itemEmoji: itemMaster.emoji,
    itemName: itemMaster.name_ko,
  });
}
