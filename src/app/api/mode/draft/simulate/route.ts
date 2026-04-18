/**
 * ✏️ v81: Draft — 상대방 반응 시뮬레이션 API
 *
 * 유저가 확정하려는 초안에 대해 상대방이 보낼 3가지 반응 예측.
 *
 * POST /api/mode/draft/simulate
 * Body: { draft: string, context?: string }
 * Response: {
 *   reactions: [
 *     { type: 'positive' | 'neutral' | 'negative', reaction: string, likelihood: number }
 *   ]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateWithCascade, GEMINI_MODELS } from '@/lib/ai/provider-registry';
import { safeParseLLMJson } from '@/lib/utils/safe-json';

const SIMULATE_SYSTEM = `너는 심리학 + 연애 경험 풍부한 언니 "루나". 유저가 보낼 카톡 초안을 보고 **상대가 보낼 3가지 예상 반응** 을 현실적으로 그려.

## 3가지 반응
- **positive**: 상대가 긍정적으로 받음 (사과 수용, 부드러운 답 등)
- **neutral**: 중립 (보기만, 짧은 답, 애매한 반응)
- **negative**: 부정적 (더 화남, 무시, 반박)

## 원칙
- 한국 20-30대 연애 현실. 과장 X.
- 각 반응 20-60자 카톡 톤.
- likelihood: 이 반응이 나올 확률 (0~100). 3개 합 ≈ 100.
- 상대 성향 추정 가능하면 반영 (문맥에서 읽어).

## 출력 (순수 JSON)
{
  "reactions": [
    { "type": "positive", "reaction": "...", "likelihood": 45 },
    { "type": "neutral",  "reaction": "...", "likelihood": 35 },
    { "type": "negative", "reaction": "...", "likelihood": 20 }
  ]
}

## 예시
초안: "어제 갑자기 정색한 거 미안해. 네 장난 안 챙긴 내 잘못이야"
맥락: 여친이 어제 장난친 거에 유저가 정색해서 서운해함

출력:
{
  "reactions": [
    { "type": "positive", "reaction": "...알았어. 나도 너무 장난 많이 친 건지 생각해봤어", "likelihood": 40 },
    { "type": "neutral",  "reaction": "응. 알았어", "likelihood": 35 },
    { "type": "negative", "reaction": "진짜 미안한 거야? 말로만 그러면 모르지", "likelihood": 25 }
  ]
}`;

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  let body: { draft?: string; context?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }); }

  const draft = (body.draft ?? '').trim();
  const context = (body.context ?? '').trim();
  if (!draft) return NextResponse.json({ error: 'draft 필요' }, { status: 400 });

  try {
    const userMsg = context
      ? `맥락: ${context}\n\n초안: "${draft}"\n\n상대 반응 3가지 예상해줘.`
      : `초안: "${draft}"\n\n상대 반응 3가지 예상해줘.`;

    const result = await generateWithCascade(
      [{ provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_25 }],
      SIMULATE_SYSTEM,
      [{ role: 'user', content: userMsg }],
      500,
    );

    const parsed = safeParseLLMJson(result.text, null as any);
    if (!parsed?.reactions || !Array.isArray(parsed.reactions)) {
      return NextResponse.json({ reactions: fallback() });
    }

    const reactions = parsed.reactions.slice(0, 3).map((r: any, idx: number) => ({
      type: ['positive', 'neutral', 'negative'][idx] as 'positive' | 'neutral' | 'negative',
      reaction: typeof r.reaction === 'string' ? r.reaction.slice(0, 200) : '',
      likelihood: Math.min(100, Math.max(0, Number(r.likelihood) || [40, 35, 25][idx])),
    }));

    return NextResponse.json({ reactions });
  } catch (err: any) {
    console.error('[DraftSim] 실패:', err);
    return NextResponse.json({ reactions: fallback() });
  }
}

function fallback() {
  return [
    { type: 'positive' as const, reaction: '...알았어 고마워', likelihood: 40 },
    { type: 'neutral' as const,  reaction: '응. 알았어', likelihood: 35 },
    { type: 'negative' as const, reaction: '흠... 더 얘기해봐야겠다', likelihood: 25 },
  ];
}
