/**
 * v104 M2: POST /api/luna-room/inventory/[id]/make-wish
 *
 * 소원 종이학에 한 줄 소원을 빈다. 결과는 영구 기록.
 * Body: { wishText: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: Params) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { id } = await ctx.params;

  let body: { wishText?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }); }

  const wishText = (body.wishText ?? '').trim().slice(0, 200);
  if (!wishText) return NextResponse.json({ error: '소원을 적어줘' }, { status: 400 });

  const { data: row } = await supabase
    .from('user_inventory_items')
    .select('id, quantity, used_at, item:item_master(use_effect)')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: '미보유 아이템' }, { status: 404 });
  if (row.used_at) return NextResponse.json({ error: '이미 사용함' }, { status: 400 });

  const itemMaster = (row as any).item as { use_effect: string | null } | null;
  if (itemMaster?.use_effect !== 'wish') {
    return NextResponse.json({ error: '소원 아이템 아님' }, { status: 400 });
  }
  const currentQty = (row as any).quantity ?? 1;

  const { data: wish } = await supabase
    .from('user_wishes')
    .insert({
      user_id: user.id,
      inventory_item_id: row.id,
      wish_text: wishText,
    })
    .select()
    .maybeSingle();

  // 🆕 v116.4: quantity > 1 이면 1개 차감, 1개 이하면 row 삭제 (FK ON DELETE SET NULL 로 소원 기록 안전)
  if (currentQty > 1) {
    await supabase
      .from('user_inventory_items')
      .update({ quantity: currentQty - 1, is_new: false })
      .eq('id', row.id)
      .eq('user_id', user.id);
  } else {
    await supabase
      .from('user_inventory_items')
      .delete()
      .eq('id', row.id)
      .eq('user_id', user.id);
  }

  return NextResponse.json({
    ok: true,
    wishId: wish?.id ?? null,
    message: '— 소원이 어딘가로 흘러갔어.',
  });
}
