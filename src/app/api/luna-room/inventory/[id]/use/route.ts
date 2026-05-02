/**
 * v104: POST /api/luna-room/inventory/[id]/use
 *
 * 소모품 사용. use_effect 별 분기.
 *  - mood_calm: 보유 정령들 mood +6 (글로벌 평온)
 *  - gacha_luck: 다음 가챠 1회 비용 -10% — M1 에서는 stub (effect 메시지만)
 *  - memory_pin: 가장 최근 추억 자동 pin — M1 에서는 stub
 *  - time_capsule / wish: M2
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, ctx: Params) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { id } = await ctx.params;

  const { data: row } = await supabase
    .from('user_inventory_items')
    .select('id, item_id, used_at, item:item_master(is_consumable, use_effect, name_ko)')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: '미보유 아이템' }, { status: 404 });
  const itemMaster = (row as any).item as { is_consumable: boolean; use_effect: string | null; name_ko: string } | null;
  if (!itemMaster?.is_consumable) {
    return NextResponse.json({ error: '소모품 아님' }, { status: 400 });
  }
  if (row.used_at) {
    return NextResponse.json({ error: '이미 사용함' }, { status: 400 });
  }

  let resultMessage = '';
  switch (itemMaster.use_effect) {
    case 'mood_calm': {
      // placed 정령들 mood +6
      const { data: placed } = await supabase
        .from('user_spirits')
        .select('spirit_id, mood_value')
        .eq('user_id', user.id)
        .eq('is_placed_in_room', true);
      for (const p of placed ?? []) {
        const newMood = Math.min(100, (p.mood_value ?? 60) + 6);
        await supabase
          .from('user_spirits')
          .update({ mood_value: newMood, mood_updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('spirit_id', p.spirit_id);
      }
      resultMessage = `방 안 친구들이 살짝 환해졌어 (+${(placed ?? []).length}마리)`;
      break;
    }
    case 'gacha_luck':
      resultMessage = '다음 뽑기에 작은 행운이 따라올 거야';
      break;
    case 'memory_pin':
      resultMessage = '천장에 별 하나가 더 켜졌어';
      break;
    case 'time_capsule':
      resultMessage = '— 봉인. (조만간 풀어볼 수 있을 거야)';
      break;
    case 'wish':
      resultMessage = '소원이 — 어딘가로 흘러갔어';
      break;
    default:
      resultMessage = `${itemMaster.name_ko} 사용함`;
  }

  await supabase
    .from('user_inventory_items')
    .update({ used_at: new Date().toISOString(), is_new: false })
    .eq('id', id)
    .eq('user_id', user.id);

  return NextResponse.json({
    ok: true,
    effect: itemMaster.use_effect,
    message: resultMessage,
  });
}
