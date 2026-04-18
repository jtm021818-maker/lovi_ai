/**
 * ✏️ v81: Draft Workshop Mode — 3가지 초안 생성 API
 *
 * POST /api/mode/draft/generate
 *
 * Body:
 *   { context: string, intent?: string }
 *
 * Response:
 *   { drafts: [{ id, tone, label, content, intensity }, ...] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateWithCascade, GEMINI_MODELS } from '@/lib/ai/provider-registry';
import { safeParseLLMJson } from '@/lib/utils/safe-json';

const DRAFT_SYSTEM = `너는 친한 언니 "루나". 유저가 상대에게 보낼 메시지 초안을 **3가지 버전** 으로 만들어.

## 3가지 버전
- **A 부드럽게 (soft)**: 감정 배려 우선. 조심스럽고 따뜻한 어미. intensity 20~35.
- **B 솔직하게 (honest)**: 있는 그대로 표현. 감정 인정 + 명확 전달. intensity 45~65.
- **C 단호하게 (firm)**: 할 말 확실히. 비난 X, 담담하고 강단 있는 톤. intensity 75~90.

## 원칙
- 같은 **핵심 의도** 를 3가지 톤으로 변주. 의도 자체가 달라지면 X.
- 카톡/문자 스타일 (각 60자~150자).
- 상대 페르소나 (여친/남친/썸녀/친구) 고려해서 호칭/존댓말 여부 자연스럽게.
- 이모지 사용 OK 단, 과하지 않게 (0~2개).

## 출력 (순수 JSON)
{
  "drafts": [
    { "id": "A", "tone": "soft",   "label": "부드럽게", "content": "...", "intensity": 28 },
    { "id": "B", "tone": "honest", "label": "솔직하게", "content": "...", "intensity": 55 },
    { "id": "C", "tone": "firm",   "label": "단호하게", "content": "...", "intensity": 82 }
  ]
}

## 예시

입력: "어제 여친 장난 정색한 거에 사과하고 싶어"
출력:
{
  "drafts": [
    {
      "id": "A", "tone": "soft", "label": "부드럽게",
      "content": "어제 갑자기 정색해서 미안 ㅠㅠ 그 순간 내가 좀 예민했던 것 같아. 네가 장난친 거 안 챙긴 거 미안해 🥺",
      "intensity": 28
    },
    {
      "id": "B", "tone": "honest", "label": "솔직하게",
      "content": "어제 정색한 거 솔직히 내가 과했어. 너 장난이었던 거 아는데 그때 다른 일로 스트레스 받고 있어서 그 말이 더 세게 들렸어. 미안",
      "intensity": 55
    },
    {
      "id": "C", "tone": "firm", "label": "단호하게",
      "content": "어제 내 반응은 잘못했어. 장난에 정색한 거 사과할게. 앞으론 그 순간 컨디션 때문에 과민반응 안 할게.",
      "intensity": 82
    }
  ]
}`;

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  let body: { context?: string; intent?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }); }

  const context = (body.context ?? '').trim();
  const intent = (body.intent ?? '').trim();
  if (!context) return NextResponse.json({ error: 'context 필요' }, { status: 400 });

  try {
    const userMsg = intent
      ? `상황: ${context}\n의도: ${intent}\n\n3가지 초안 만들어줘.`
      : `상황: ${context}\n\n3가지 초안 만들어줘.`;

    const result = await generateWithCascade(
      [
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_25 },
        { provider: 'gemini', tier: 'opus',   modelOverride: GEMINI_MODELS.FLASH_25 },
      ],
      DRAFT_SYSTEM,
      [{ role: 'user', content: userMsg }],
      900,
    );

    const parsed = safeParseLLMJson(result.text, null as any);
    if (!parsed?.drafts || !Array.isArray(parsed.drafts) || parsed.drafts.length < 3) {
      console.warn('[DraftGen] 파싱 실패:', (result.text ?? '').slice(0, 200));
      return NextResponse.json({ drafts: fallbackDrafts(context) });
    }

    const drafts = parsed.drafts.slice(0, 3).map((d: any, idx: number) => ({
      id: (['A', 'B', 'C'] as const)[idx],
      tone: (['soft', 'honest', 'firm'] as const)[idx],
      label: typeof d.label === 'string' ? d.label : ['부드럽게', '솔직하게', '단호하게'][idx],
      content: typeof d.content === 'string' ? d.content.slice(0, 400) : '',
      intensity: Math.min(100, Math.max(0, Number(d.intensity) || [28, 55, 82][idx])),
    }));

    return NextResponse.json({ drafts });
  } catch (err: any) {
    console.error('[DraftGen] 실패:', err);
    return NextResponse.json({ drafts: fallbackDrafts(context) });
  }
}

function fallbackDrafts(context: string) {
  const slice = context.slice(0, 40);
  return [
    { id: 'A', tone: 'soft',   label: '부드럽게', content: `${slice}... 네 마음 먼저 들어볼게 ㅠㅠ`, intensity: 28 },
    { id: 'B', tone: 'honest', label: '솔직하게', content: `${slice}... 솔직히 얘기해볼게`, intensity: 55 },
    { id: 'C', tone: 'firm',   label: '단호하게', content: `${slice}... 이건 확실히 말할게`, intensity: 82 },
  ];
}
