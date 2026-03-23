import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * PATCH /api/sessions/[sessionId]/archive
 * 
 * 세션 소프트 딜리트 (is_archived = true)
 */
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId } = await params;

  const { error } = await supabase
    .from('counseling_sessions')
    .update({ is_archived: true })
    .eq('id', sessionId)
    .eq('user_id', user.id);

  if (error) {
    console.error('[Archive] 실패:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[Archive] 🗄️ 세션 보관: ${sessionId}`);
  return NextResponse.json({ ok: true });
}
