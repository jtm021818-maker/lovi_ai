/**
 * GET /api/xray/v2/[id]
 *
 * Plan: docs/xray-v2-pro-plan.md §7.2
 *
 * RLS 가 본인 row 만 보이도록 보호.
 * 결과 페이지가 새로고침/공유 시 fetch.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('xray_analyses')
    .select('id, created_at, image_width, image_height, result, model_used, latency_ms, schema_version')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    createdAt: data.created_at,
    imageWidth: data.image_width,
    imageHeight: data.image_height,
    result: data.result,
    modelUsed: data.model_used,
    latencyMs: data.latency_ms,
    schemaVersion: data.schema_version,
  });
}
