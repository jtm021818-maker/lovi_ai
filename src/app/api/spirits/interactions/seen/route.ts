/**
 * v103: POST /api/spirits/interactions/seen
 *
 * 클라이언트가 페어 다이얼로그를 화면에 띄운 직후 호출 — 본 것 기록.
 * Body: { pairKey: string, dialogueIndex: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  let body: { pairKey?: string; dialogueIndex?: number };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }); }

  const pairKey = (body.pairKey ?? '').trim();
  const dialogueIndex = Number.isInteger(body.dialogueIndex) ? body.dialogueIndex! : -1;
  if (!pairKey || dialogueIndex < 0) {
    return NextResponse.json({ error: 'pairKey/dialogueIndex 필수' }, { status: 400 });
  }

  await supabase.from('spirit_pair_interactions').insert({
    user_id: user.id,
    pair_key: pairKey,
    dialogue_index: dialogueIndex,
  });

  return NextResponse.json({ ok: true });
}
