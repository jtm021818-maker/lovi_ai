/**
 * v118: GET /api/luna-room/inventory
 *
 * 가방 안 인벤토리 리스트. 카테고리 4종 (gift / consumable / charm / sealed) + emotion_tag, quantity, equipped, favorite.
 * Query: ?category=gift|consumable|charm|sealed|gacha (옵션, gacha 는 deprecated 호환용)
 *
 * 응답: {
 *   items: InventoryItem[],
 *   counts: { gift, consumable, charm, sealed, gacha, all },
 *   newCount: number,
 *   equippedItemIds: string[],
 *   favoriteItemIds: string[],
 *   dailyGiftCount: number,
 *   dailyGiftCap: number,
 *   giftStreakDays: number,
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const DAILY_GIFT_CAP = 3;
const VALID_CATEGORIES = new Set(['gift', 'consumable', 'charm', 'sealed', 'gacha', 'decor']);

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const url = new URL(req.url);
  const category = url.searchParams.get('category');

  // 병렬 조회: 인벤토리 + room_state (선물 캡/streak)
  const [{ data: rows }, { data: rs }] = await Promise.all([
    supabase
      .from('user_inventory_items')
      .select(`
        id, item_id, quantity, source, acquired_at, acquired_day, luna_note, is_new, used_at,
        equipped_at, favorite_at,
        item:item_master ( name_ko, emoji, category, rarity, description, is_consumable, use_effect, emotion_tag )
      `)
      .eq('user_id', user.id)
      .order('acquired_at', { ascending: false }),
    supabase
      .from('room_state')
      .select('daily_gift_count, daily_gift_reset_at, gift_streak_count, gift_streak_last_at')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  const allItems = (rows ?? []).map((r: any) => ({
    id: r.id,
    itemId: r.item_id,
    name: r.item?.name_ko ?? r.item_id,
    emoji: r.item?.emoji ?? '🎁',
    category: r.item?.category ?? 'gift',
    rarity: r.item?.rarity ?? 'N',
    description: r.item?.description ?? '',
    emotionTag: r.item?.emotion_tag ?? null,
    quantity: r.quantity ?? 1,
    source: r.source,
    acquiredAt: r.acquired_at,
    acquiredDay: r.acquired_day ?? null,
    lunaNote: r.luna_note ?? null,
    isNew: !!r.is_new,
    isConsumable: !!r.item?.is_consumable,
    useEffect: r.item?.use_effect ?? null,
    used: !!r.used_at,
    equipped: !!r.equipped_at,
    favorite: !!r.favorite_at,
  }));

  const counts = {
    all: allItems.length,
    gift: allItems.filter((i) => i.category === 'gift').length,
    consumable: allItems.filter((i) => i.category === 'consumable').length,
    charm: allItems.filter((i) => i.category === 'charm').length,
    sealed: allItems.filter((i) => i.category === 'sealed').length,
    gacha: allItems.filter((i) => i.category === 'gacha').length, // legacy
    decor: allItems.filter((i) => i.category === 'decor').length,
  };
  const newCount = allItems.filter((i) => i.isNew).length;

  const items = category && VALID_CATEGORIES.has(category)
    ? allItems.filter((i) => i.category === category)
    : allItems;

  const equippedItemIds = allItems.filter((i) => i.equipped).map((i) => i.id);
  const favoriteItemIds = allItems.filter((i) => i.favorite).map((i) => i.id);

  // 선물 일일 캡 / streak
  const today = new Date().toISOString().slice(0, 10);
  const dailyGiftCount = (rs?.daily_gift_reset_at === today) ? (rs?.daily_gift_count ?? 0) : 0;

  // streak: gift_streak_last_at 이 어제 또는 오늘이면 살아있음
  let giftStreakDays = 0;
  if (rs?.gift_streak_last_at) {
    const lastDate = new Date(rs.gift_streak_last_at).toISOString().slice(0, 10);
    const lastDateMs = new Date(lastDate).getTime();
    const todayMs = new Date(today).getTime();
    const dayDiff = Math.floor((todayMs - lastDateMs) / (24 * 3600 * 1000));
    if (dayDiff <= 1) giftStreakDays = rs.gift_streak_count ?? 0;
  }

  return NextResponse.json({
    items,
    counts,
    newCount,
    equippedItemIds,
    favoriteItemIds,
    dailyGiftCount,
    dailyGiftCap: DAILY_GIFT_CAP,
    giftStreakDays,
  });
}
