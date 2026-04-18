/**
 * 💡 v81: Idea Refine Mode — 유저 원본 아이디어 다듬기 API
 *
 * POST /api/mode/idea/refine
 *
 * Body:
 *   { original: string, context?: string }
 *
 * Response:
 *   { refined: string, reasons: string[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateWithCascade, GEMINI_MODELS } from '@/lib/ai/provider-registry';
import { safeParseLLMJson } from '@/lib/utils/safe-json';

const IDEA_SYSTEM = `너는 친한 언니 "루나". 유저가 제안한 아이디어(데이트 제안/사과 타이밍/대화 주제 등)를 **실전 감각으로 다듬어** 줘.

## 원칙
- 유저 핵심 의도 **절대 바꾸지 마**. 톤/구체성/타이밍만 개선.
- 한국 20-30대 연애 현실 감각 반영.
- 카톡/문자 톤에 맞춤 (너무 격식 X).

## 출력 (순수 JSON)
{
  "refined": "다듬은 버전 (~100자 이내)",
  "reasons": ["왜 이렇게 다듬었는지 한 줄 1", "한 줄 2", "한 줄 3"]
}

reasons 는 2~3개. 각 한 줄 (~25자). "구체 제안 + 선택 여지 줬어" 같은 설명.

## 예시
원본: "이번 주말에 같이 영화보자고 카톡 보낼까 그냥 전화할까?"
{
  "refined": "요즘 그 영화 재밌는 거 있지. 토요일 어때? 시간 되면 같이 볼래?",
  "reasons": [
    "구체 제안 + 선택 여지 줬어",
    "전화/카톡은 분리 이슈라 뺌",
    "부담 없는 톤으로 바꿈"
  ]
}

원본: "사귀자고 말해볼까?"
{
  "refined": "근데 너 진심인 거 같아서 — 우리 이제 좀 더 진지하게 만나보면 어떨까?",
  "reasons": [
    "직설 → 감정 연결로 완화",
    "명령형 → 제안형으로",
    "상대 선택권 배려"
  ]
}`;

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  let body: { original?: string; context?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }); }

  const original = (body.original ?? '').trim();
  const context = (body.context ?? '').trim();
  if (!original) {
    return NextResponse.json({ error: 'original 이 필요합니다' }, { status: 400 });
  }

  try {
    const userMsg = context
      ? `상황: ${context}\n\n유저 원본 아이디어: "${original}"\n\n위 아이디어를 실전 감각으로 다듬어줘.`
      : `유저 원본 아이디어: "${original}"\n\n실전 감각으로 다듬어줘.`;

    const result = await generateWithCascade(
      [
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_25 },
        { provider: 'gemini', tier: 'opus',   modelOverride: GEMINI_MODELS.FLASH_25 },
      ],
      IDEA_SYSTEM,
      [{ role: 'user', content: userMsg }],
      500,
    );

    const parsed = safeParseLLMJson(result.text, null as any);
    if (!parsed?.refined || !Array.isArray(parsed.reasons)) {
      console.warn('[IdeaRefine] 파싱 실패:', (result.text ?? '').slice(0, 200));
      return NextResponse.json({
        refined: original,
        reasons: ['(다듬기 실패 — 원본 유지)'],
      });
    }

    return NextResponse.json({
      refined: String(parsed.refined).slice(0, 300),
      reasons: parsed.reasons.slice(0, 4).map((r: any) => String(r).slice(0, 60)),
    });
  } catch (err: any) {
    console.error('[IdeaRefine] 생성 실패:', err);
    return NextResponse.json({
      refined: original,
      reasons: ['(에러 — 원본 유지)'],
    });
  }
}
