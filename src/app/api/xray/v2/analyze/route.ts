/**
 * POST /api/xray/v2/analyze
 *
 * Plan: docs/xray-v2-pro-plan.md §7.1
 *
 * 흐름:
 *  1. supabase auth + 일일 한도 체크
 *  2. data uri 파싱
 *  3. Gemini Vision 캐스케이드 (Pro → Flash → Lite → 2.0)
 *  4. JSON 파싱 + 검증 (실패 시 1회 재시도 with stricter prompt)
 *  5. xray_analyses INSERT
 *  6. recordXrayUsage
 *  7. 200 with { id, result, modelUsed, latencyMs, imageWidth, imageHeight }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserTier, checkXrayDailyLimit, recordXrayUsage } from '@/lib/subscription';
import { XRAY_PROMPT_V2 } from '@/lib/xray/prompt-v2';
import {
  geminiVisionCascade,
  parseDataUri,
  stripJsonFence,
  GeminiCascadeError,
} from '@/lib/xray/gemini-client';
import { isValidResultV2 } from '@/lib/xray/types-v2';
import type { XRayResultV2 } from '@/lib/xray/types-v2';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface AnalyzeBody {
  imageBase64: string;
  imageWidth: number;
  imageHeight: number;
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();

  // 1. 인증
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. 한도 체크
  const tier = await getUserTier(user.id);
  const isPremium = tier === 'premium';
  const limit = checkXrayDailyLimit(user.id, isPremium);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'XRay 일일 무료 한도를 초과했어요', upgrade: true, remaining: 0 },
      { status: 429 },
    );
  }

  // 3. 입력 파싱
  let body: AnalyzeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식' }, { status: 400 });
  }
  const { imageBase64, imageWidth, imageHeight } = body;
  if (!imageBase64 || !imageWidth || !imageHeight) {
    return NextResponse.json(
      { error: 'imageBase64 / imageWidth / imageHeight 필수' },
      { status: 400 },
    );
  }

  const { mimeType, data } = parseDataUri(imageBase64);

  // 4. Gemini cascade
  let visionRaw: string;
  let modelUsed: string;
  try {
    const v = await geminiVisionCascade({
      prompt: XRAY_PROMPT_V2,
      imageBase64: data,
      mimeType,
      temperature: 0.2,
      topP: 0.9,
    });
    visionRaw = v.text;
    modelUsed = v.modelUsed;
  } catch (err) {
    if (err instanceof GeminiCascadeError) {
      console.error('[XRayV2] cascade failed:', err.attempts);
      return NextResponse.json(
        { error: '지금 루나가 잠깐 멈춰있어. 다시 시도해줘' },
        { status: 503 },
      );
    }
    throw err;
  }

  // 5. JSON 파싱 + 검증 (1회 재시도)
  let result: XRayResultV2 | null = null;
  let parseAttempts = 0;
  let lastJsonText = visionRaw;

  while (parseAttempts < 2 && !result) {
    parseAttempts++;
    try {
      const jsonStr = stripJsonFence(lastJsonText);
      const parsed = JSON.parse(jsonStr) as unknown;
      if (isValidResultV2(parsed)) {
        result = parsed;
        break;
      }
      console.warn('[XRayV2] schema mismatch, attempt', parseAttempts);
    } catch (err) {
      console.warn('[XRayV2] JSON parse fail, attempt', parseAttempts, (err as Error).message);
    }

    if (parseAttempts < 2) {
      // 한 번 더, stricter 지시
      try {
        const retry = await geminiVisionCascade({
          prompt: XRAY_PROMPT_V2 + '\n\n반드시 단일 JSON 객체. 코드블록 금지. 한 글자도 넘지 마.',
          imageBase64: data,
          mimeType,
          temperature: 0.1,
          topP: 0.85,
        });
        lastJsonText = retry.text;
        modelUsed = retry.modelUsed;
      } catch {
        break;
      }
    }
  }

  if (!result) {
    return NextResponse.json(
      { error: '분석 결과 형식이 올바르지 않아 다시 시도해줘' },
      { status: 502 },
    );
  }

  // 메시지 0개 가드
  if (!Array.isArray(result.messages) || result.messages.length === 0) {
    return NextResponse.json(
      { error: '캡처에서 메시지를 찾지 못했어요. 또렷한지 확인해줘' },
      { status: 422 },
    );
  }

  const latencyMs = Date.now() - t0;

  // 6. DB 저장
  const { data: inserted, error: dbErr } = await supabase
    .from('xray_analyses')
    .insert({
      user_id: user.id,
      image_width: imageWidth,
      image_height: imageHeight,
      result,
      model_used: modelUsed,
      latency_ms: latencyMs,
      schema_version: 2,
    })
    .select('id')
    .single();

  if (dbErr || !inserted) {
    console.error('[XRayV2] DB insert failed:', dbErr?.message);
    // DB 실패해도 결과는 반환 (id 없이)
    return NextResponse.json({
      id: null,
      result,
      modelUsed,
      latencyMs,
      imageWidth,
      imageHeight,
    });
  }

  // 7. 한도 차감
  recordXrayUsage(user.id);

  console.log(`[XRayV2] ✅ id=${inserted.id} model=${modelUsed} latency=${latencyMs}ms`);

  return NextResponse.json({
    id: inserted.id,
    result,
    modelUsed,
    latencyMs,
    imageWidth,
    imageHeight,
  });
}
