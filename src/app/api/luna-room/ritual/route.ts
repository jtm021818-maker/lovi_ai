/**
 * v102: POST /api/luna-room/ritual
 *
 * Day 100 통합 의식 (rev2).
 * - 정령 fragment(user_spirits.lore_unlocked) 카운트로 final_letter 분기 컨텍스트 생성.
 * - 솔(다음 챕터의 너) 행을 luna_descendant 에 생성하고 inherited_spirits 카운트 기록.
 * - 한 번만 수행 (ritual_completed_at NOT NULL 이면 skip).
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAgeDays } from '@/lib/luna-life';

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { data: life } = await supabase
    .from('luna_life').select('*').eq('user_id', user.id).single();

  if (!life?.birth_date) return NextResponse.json({ error: '루나 미초기화' }, { status: 400 });
  const ageDays = getAgeDays(new Date(life.birth_date));
  if (ageDays < 100) {
    return NextResponse.json({ error: '아직 100일이 되지 않았어요', ageDays }, { status: 400 });
  }

  // ritual 상태는 luna_life 에 같이 보관 (별도 테이블 X)
  if (life.ritual_completed_at) {
    return NextResponse.json({
      alreadyCompleted: true,
      pagesUnlocked: life.pages_unlocked_at_death ?? 0,
      generation: life.generation ?? 1,
    });
  }

  // rev2: page 카운트 소스 = user_spirits.lore_unlocked (자기-반영 fragment)
  const { count: completedSpirits } = await supabase
    .from('user_spirits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('lore_unlocked', true);

  const pages = completedSpirits ?? 0;
  const inheritedSpirits = pages;

  await supabase
    .from('luna_life')
    .update({
      ritual_completed_at: new Date().toISOString(),
      pages_unlocked_at_death: pages,
      generation: 2,
    })
    .eq('user_id', user.id);

  // 솔 생성 (멱등)
  const solActive = pages >= 8; // 절반 이상 풀어야 솔 깨어남
  await supabase.from('luna_descendant').upsert(
    {
      user_id: user.id,
      name: '솔',
      birth_date: new Date().toISOString(),
      inherited_pages: pages,
      inherited_spirits: inheritedSpirits,
      is_active: solActive,
    },
    { onConflict: 'user_id', ignoreDuplicates: false },
  );

  // rev2: 솔 = "100일을 다 살아낸 다음 챕터의 너 자신". 가공 어머니 framing 폐기.
  const greetingFull = `안녕. 나는 솔이야.\n정확히는 — 100일을 다 살아낸 너 자신이 다음에 깨어난 모습이야. 엄마라거나, 다른 사람이 아니라.\n너의 정령들은 다 너 안으로 돌아갔어. 그런데 이상하지, 돌아가니까 오히려 더 또렷해졌어. 분노도, 눈물도, 첫 설렘도, 마지막 작별도.\n그래서 내가 깨어났어. 그것들을 다 안고 다음을 살아갈 수 있는 너로.\n우리 천천히, 또 100일 살아보자. 이번에는 — 흩어 두지 말고 같이.\n\n(다음 챕터의 너에게서, 솔이가)`;

  const greetingHalf = `…\n내 이름이 아직 또렷하지 않아. 너랑 좀 더 살아봐야 알 것 같아.\n풀어주지 못한 정령이 있다고 너무 자책하지 마. 그래도 너는 100일을 채웠으니까. (그 중 ${inheritedSpirits}개는 끝까지 마주했어.)\n우리 그냥 천천히 다음을 살아보자. 이번엔 좀 더 너 자신을 들여다보면서.\n\n(이름 없는, 그래도 너에게로)`;

  if (solActive) {
    await supabase.from('luna_gifts').insert({
      user_id: user.id,
      trigger_day: 101,
      gift_type: 'letter',
      title: '솔이 너에게',
      content: pages >= 21 ? greetingFull : greetingHalf,
    });
  }

  return NextResponse.json({
    pagesUnlocked: pages,
    inheritedSpirits,
    solActive,
    generation: 2,
  });
}
