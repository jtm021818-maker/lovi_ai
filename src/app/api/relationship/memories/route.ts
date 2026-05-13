/**
 * v117: GET /api/relationship/memories?persona=luna
 *
 * 기억 카드 5슬롯 조회. 잠금 해제된 카드만 반환.
 * 응답: { memories: Array<{ slot_index, level, trigger_type, llm_caption, source_summary, unlocked_at }> }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const personaParam = url.searchParams.get('persona');
  const persona = personaParam === 'tarot' ? 'tarot' : 'luna';

  try {
    const { data, error } = await supabase
      .from('relationship_memories')
      .select('slot_index, level, trigger_type, llm_caption, source_summary, unlocked_at')
      .eq('user_id', user.id)
      .eq('persona', persona)
      .order('slot_index', { ascending: true });

    if (error) {
      // 테이블 미존재 (마이그레이션 전) 도 빈 배열로 graceful 처리
      console.warn('[memories API] DB error (graceful):', error.message);
      return NextResponse.json({ memories: [] });
    }

    return NextResponse.json({ memories: data ?? [] });
  } catch (e) {
    return NextResponse.json({ memories: [], error: (e as Error).message }, { status: 200 });
  }
}
