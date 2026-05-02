/**
 * v104: GET /api/luna-room/inventory
 *
 * 가방 안 인벤토리 리스트.
 * Query: ?category=gift|gacha|consumable (옵션)
 *
 * 응답: {
 *   items: InventoryItem[],
 *   counts: { gift, gacha, consumable, all },
 *   newCount: number
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const url = new URL(req.url);
  const category = url.searchParams.get('category');

  // 인벤토리 + 마스터 조인 — supabase 는 join 시 select 안에서 명시
  const { data: rows } = await supabase
    .from('user_inventory_items')
    .select(`
      id, item_id, quantity, source, acquired_at, acquired_day, luna_note, is_new, used_at,
      item:item_master ( name_ko, emoji, category, rarity, description, is_consumable, use_effect )
    `)
    .eq('user_id', user.id)
    .order('acquired_at', { ascending: false });

  const allItems = (rows ?? []).map((r: any) => ({
    id: r.id,
    itemId: r.item_id,
    name: r.item?.name_ko ?? r.item_id,
    emoji: r.item?.emoji ?? '🎁',
    category: r.item?.category ?? 'gift',
    rarity: r.item?.rarity ?? 'N',
    description: r.item?.description ?? '',
    source: r.source,
    acquiredAt: r.acquired_at,
    acquiredDay: r.acquired_day ?? null,
    lunaNote: r.luna_note ?? null,
    isNew: !!r.is_new,
    isConsumable: !!r.item?.is_consumable,
    useEffect: r.item?.use_effect ?? null,
    used: !!r.used_at,
  }));

  const counts = {
    all: allItems.length,
    gift: allItems.filter((i) => i.category === 'gift').length,
    gacha: allItems.filter((i) => i.category === 'gacha').length,
    consumable: allItems.filter((i) => i.category === 'consumable').length,
  };
  const newCount = allItems.filter((i) => i.isNew).length;

  const items = category && ['gift', 'gacha', 'consumable'].includes(category)
    ? allItems.filter((i) => i.category === category)
    : allItems;

  return NextResponse.json({ items, counts, newCount });
}
