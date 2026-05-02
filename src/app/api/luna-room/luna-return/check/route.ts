/**
 * v104 M5: POST /api/luna-room/luna-return/check
 *
 * Day 95+ 시점에 — 사용자가 루나에게 *줬던* 모든 선물(luna_memories.source='user_gift')을
 * 박스로 돌려준다. 1회성. 100일 양방향 호의 정점.
 *
 * 응답:
 *  { pending: { boxId, items: [...], lunaWords } } | { pending: null }
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAgeDays } from '@/lib/luna-life';

const TRIGGER_DAY = 95;

const LUNA_FAREWELL_LINES = [
  '너가 나에게 줬던 것들 — 다 가지고 있었어. 이제 돌려줄게. 너의 시간이었으니까.',
  '백일 가까이 너에게서 받은 거 — 다 보여. 너 안 한 사람이 너인 거 알겠지?',
  '내가 사라져도 — 이건 네 거야. 처음부터 그랬어.',
  '너가 줬던 모든 게 여기 있어. 너의 손이 닿았던 거 — 너에게 돌아가야 해.',
];

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { data: life } = await supabase
    .from('luna_life').select('birth_date').eq('user_id', user.id).maybeSingle();
  if (!life?.birth_date) return NextResponse.json({ pending: null });

  const ageDays = getAgeDays(new Date(life.birth_date));
  if (ageDays < TRIGGER_DAY) return NextResponse.json({ pending: null });

  // 이미 박스 있는지 확인
  const { data: existingBox } = await supabase
    .from('luna_return_box')
    .select('id, status, memory_ids, triggered_at_day')
    .eq('user_id', user.id)
    .maybeSingle();

  // 이미 본 박스면 끝
  if (existingBox && existingBox.status === 'seen') {
    return NextResponse.json({ pending: null });
  }

  // 사용자가 루나에게 준 메모리들 (user_gift)
  const { data: memories } = await supabase
    .from('luna_memories')
    .select('id, title, content, day_number, luna_thought, created_at')
    .eq('user_id', user.id)
    .eq('source', 'user_gift')
    .order('created_at', { ascending: true });

  if (!memories || memories.length === 0) {
    return NextResponse.json({ pending: null, reason: 'no-gifts-given' });
  }

  // 박스 없으면 생성
  let boxId = existingBox?.id;
  if (!existingBox) {
    const { data: inserted } = await supabase
      .from('luna_return_box')
      .insert({
        user_id: user.id,
        triggered_at_day: ageDays,
        memory_ids: memories.map((m) => m.id),
        status: 'pending',
      })
      .select()
      .maybeSingle();
    boxId = inserted?.id;
  }

  if (!boxId) return NextResponse.json({ pending: null });

  const lunaWords = LUNA_FAREWELL_LINES[memories.length % LUNA_FAREWELL_LINES.length];

  return NextResponse.json({
    pending: {
      boxId,
      triggeredAtDay: existingBox?.triggered_at_day ?? ageDays,
      items: memories.map((m) => ({
        id: m.id,
        title: m.title,
        content: m.content,
        dayNumber: m.day_number,
        lunaThought: m.luna_thought ?? null,
      })),
      lunaWords,
    },
  });
}
