/**
 * ✏️ v81: Draft Workshop — 확정 초안 저장 API
 *
 * POST /api/mode/draft/save
 * Body: { tone: string, content: string, context?: string }
 * Response: { id: string, createdAt: string }
 *
 * GET /api/mode/draft/save → 유저의 저장된 초안 목록
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  let body: { tone?: string; content?: string; context?: string; sessionId?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }); }

  const tone = (body.tone ?? '').trim();
  const content = (body.content ?? '').trim();
  if (!tone || !content) {
    return NextResponse.json({ error: 'tone/content 필요' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('message_drafts')
    .insert({
      user_id: user.id,
      session_id: body.sessionId ?? null,
      tone,
      content: content.slice(0, 1000),
      context: (body.context ?? '').slice(0, 500),
    })
    .select('id, created_at')
    .single();

  if (error) {
    console.error('[DraftSave] 저장 실패:', error);
    // 테이블 없으면 graceful fallback (migration 필요)
    if (error.code === '42P01') {
      return NextResponse.json({
        id: 'ephemeral_' + Date.now(),
        createdAt: new Date().toISOString(),
        warning: 'message_drafts 테이블 없음 — migration 필요',
      });
    }
    return NextResponse.json({ error: '저장 실패' }, { status: 500 });
  }

  return NextResponse.json({ id: data!.id, createdAt: data!.created_at });
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 20));

  const { data, error } = await supabase
    .from('message_drafts')
    .select('id, tone, content, context, created_at, sent_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ drafts: [], warning: 'message_drafts 테이블 없음' });
    }
    console.error('[DraftList] 실패:', error);
    return NextResponse.json({ drafts: [] });
  }

  return NextResponse.json({ drafts: data ?? [] });
}
