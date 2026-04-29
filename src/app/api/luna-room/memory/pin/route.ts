/**
 * POST /api/luna-room/memory/pin
 *
 * 추억 갤러리에서 "고정" 토글 + 액자 스타일 변경.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const VALID_FRAMES = ['wood', 'gold', 'pastel', 'film'] as const;
type FrameStyle = (typeof VALID_FRAMES)[number];

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  let body: { memoryId?: string; pinned?: boolean; frameStyle?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
  }

  if (!body.memoryId || typeof body.pinned !== 'boolean') {
    return NextResponse.json({ error: 'memoryId, pinned 필요' }, { status: 400 });
  }

  const update: { is_pinned: boolean; frame_style?: FrameStyle } = {
    is_pinned: body.pinned,
  };
  if (body.frameStyle && (VALID_FRAMES as readonly string[]).includes(body.frameStyle)) {
    update.frame_style = body.frameStyle as FrameStyle;
  }

  const { error } = await supabase
    .from('luna_memories')
    .update(update)
    .eq('id', body.memoryId)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: '업데이트 실패' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
