/**
 * v104 M2: POST /api/luna-room/inventory/[id]/show-luna
 *
 * 사용자가 가방에서 아이템을 루나에게 보여줌 → 한 줄 반응 반환.
 * 사망 후엔 비활성.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { pickLunaReaction } from '@/lib/luna-shopping/luna-reactions';
import { getAgeDays } from '@/lib/luna-life';
import { extractEmotionTag } from '@/lib/luna-shopping/luna-notes';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, ctx: Params) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { id } = await ctx.params;

  const [{ data: row }, { data: life }, { data: recentSummaries }] = await Promise.all([
    supabase
      .from('user_inventory_items')
      .select('id, item_id, source, acquired_day, item:item_master(name_ko, category, emotion_tag)')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase.from('luna_life').select('birth_date, is_deceased').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('counseling_sessions')
      .select('session_summary, emotion_baseline')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  if (!row) return NextResponse.json({ error: '미보유 아이템' }, { status: 404 });
  if (life?.is_deceased) {
    return NextResponse.json({
      reaction: '— 루나는 더 이상 답하지 않아. 하지만 너 안에 있어.',
      muted: true,
    });
  }

  const itemMaster = (row as any).item as {
    name_ko: string;
    category: 'gift' | 'consumable' | 'gacha';
    emotion_tag: string | null;
  } | null;
  if (!itemMaster) return NextResponse.json({ error: '마스터 데이터 없음' }, { status: 500 });

  const bondDay = life?.birth_date ? getAgeDays(new Date(life.birth_date)) : 0;

  // 현재 감정 컨텍스트 — 아이템 자체 태그 우선, 없으면 최근 세션
  const itemEmotion = (itemMaster.emotion_tag ?? null) as
    | 'anxious' | 'sad' | 'happy' | 'proud' | 'lonely' | 'excited' | 'neutral' | null;
  const sessionEmotion = extractEmotionTag(
    (recentSummaries ?? []).map((r: any) => ({ summary: r.session_summary, emotion: r.emotion_baseline })),
  );
  const emotion = itemEmotion ?? sessionEmotion;

  const reaction = pickLunaReaction({
    itemId: row.item_id,
    itemName: itemMaster.name_ko,
    category: itemMaster.category,
    emotion,
    source: row.source as 'luna_shopping' | 'gacha' | 'achievement' | 'system',
    bondDay,
    isFromLuna: row.source === 'luna_shopping',
  });

  // last_interaction_at 갱신 (정령 인터랙션과 별개로 luna_life pet_at 류 — 단순화)
  return NextResponse.json({ reaction, bondDay });
}
