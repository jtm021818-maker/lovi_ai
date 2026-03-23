import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * PATCH /api/sessions/[sessionId]/scenario
 * 
 * 사용자가 UI에서 시나리오를 수동 변경할 때 locked_scenario를 업데이트
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId } = await params;
  const { scenario } = await request.json();

  const { error } = await supabase
    .from('counseling_sessions')
    .update({ locked_scenario: scenario || null })
    .eq('id', sessionId)
    .eq('user_id', user.id);

  if (error) {
    console.error('[Scenario PATCH] 업데이트 실패:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[Scenario PATCH] 🔓 시나리오 변경: ${scenario ?? 'GENERAL (잠금 해제)'}`);
  return NextResponse.json({ ok: true });
}
