/**
 * POST /api/admin/backfill-embeddings
 *
 * v90: message_memories.embedding 이 NULL 인 row 들을 배치로 백필.
 * - 본인 user_id 의 row 만 처리 (RLS 자연 보호)
 * - 한 번에 ?limit (기본 100) 처리
 * - Gemini Embedding 무료 티어 분당 ~1500 요청 → 100개씩 안전
 * - body: { limit?: number, dryRun?: boolean }
 *
 * 사용:
 *   curl -X POST /api/admin/backfill-embeddings -H "Content-Type: application/json" -d '{"limit":100}'
 *
 * 진행 상황은 응답 JSON 으로 즉시 반환. 더 백필할 게 있으면 다시 호출하면 됨.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { embedText, shouldEmbed } from '@/lib/rag/ingestor';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const limit: number = Math.min(Math.max(Number(body.limit ?? 100), 1), 300);
  const dryRun: boolean = body.dryRun === true;

  // NULL embedding row 가져오기 (본인 데이터만)
  const { data: rows, error: fetchErr } = await supabase
    .from('message_memories')
    .select('id, content')
    .eq('user_id', user.id)
    .is('embedding', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, skipped: 0, remaining: 0 });
  }

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const content = (row.content as string) ?? '';
    if (!shouldEmbed(content)) {
      skipped++;
      continue;
    }
    if (dryRun) {
      processed++;
      continue;
    }
    try {
      const result = await embedText(content);
      if (!result) {
        skipped++;
        continue;
      }
      const { error: updateErr } = await supabase
        .from('message_memories')
        .update({ embedding: result.embedding })
        .eq('id', row.id);
      if (updateErr) {
        console.warn(`[backfill] ${row.id} update 실패:`, updateErr.message);
        failed++;
      } else {
        processed++;
      }
    } catch (err) {
      console.warn(`[backfill] ${row.id} embed 실패:`, err);
      failed++;
    }
    // rate limit 보호: 100ms 간격
    await new Promise((r) => setTimeout(r, 100));
  }

  // 남은 row 수 확인
  const { count: remaining } = await supabase
    .from('message_memories')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('embedding', null);

  return NextResponse.json({
    ok: true,
    processed,
    skipped,
    failed,
    remaining: remaining ?? 0,
    dryRun,
  });
}
