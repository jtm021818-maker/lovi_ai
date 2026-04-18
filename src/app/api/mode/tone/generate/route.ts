/**
 * 🎨 v81: Tone Mode — 3톤 초안 생성 API
 *
 * POST /api/mode/tone/generate
 *
 * Body:
 *   { context: string }  — "어제 장난친 거 사과하고 싶어" 류 상황 요약
 *
 * Response:
 *   { options: [{ id, label, emoji, content, intensity }, ...] }
 *
 * LLM: Gemini Flash Lite (빠르고 저렴)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateWithCascade, GEMINI_MODELS } from '@/lib/ai/provider-registry';
import { safeParseLLMJson } from '@/lib/utils/safe-json';

const TONE_SYSTEM = `너는 친한 언니 "루나". 유저가 상대에게 보낼 메시지를 3가지 톤으로 제시해.

## 3톤
1. **부드럽게 (soft)** — 감정 배려 중심, "~지", "~것 같아" 조심스러운 어미. intensity 20~35.
2. **솔직하게 (honest)** — 있는 그대로 표현, 감정 인정 + 명확한 전달. intensity 45~65.
3. **단호하게 (firm)** — 할 말 확실히 하되 비난 X, "~했어", "~할게" 강단 있는 어미. intensity 75~90.

## 원칙
- 같은 핵심 메시지를 3톤으로 변주. 내용이 완전히 달라지면 X.
- 카톡 스타일 (50자 이내 권장, 100자 넘지 말기).
- 상담사 말투 금지. 친구처럼.
- 이모지 1-2개까지 OK (과하면 X).

## 출력 (순수 JSON, 마크다운 코드블록 X)
{
  "options": [
    { "id": "soft",   "label": "부드럽게", "emoji": "💐", "content": "...", "intensity": 28 },
    { "id": "honest", "label": "솔직하게", "emoji": "🔍", "content": "...", "intensity": 55 },
    { "id": "firm",   "label": "단호하게", "emoji": "🔥", "content": "...", "intensity": 82 }
  ]
}

## 예시

입력: "여친이 취업 얘기해서 짜증났는데, 미안하다고 보내고 싶어"
출력:
{
  "options": [
    { "id": "soft",   "label": "부드럽게", "emoji": "💐", "content": "어제 내가 예민했지 ㅠㅠ 네 걱정 다 알면서 짜증낸 거 미안해", "intensity": 28 },
    { "id": "honest", "label": "솔직하게", "emoji": "🔍", "content": "어제 솔직히 내가 좀 찔려서 짜증냈어. 네 말 맞았고, 그게 속상하게 했다면 미안", "intensity": 58 },
    { "id": "firm",   "label": "단호하게", "emoji": "🔥", "content": "어제 내 반응은 잘못했어. 미안. 네 응원 진지하게 받을게", "intensity": 82 }
  ]
}`;

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  let body: { context?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }); }

  const context = (body.context ?? '').trim();
  if (!context) {
    return NextResponse.json({ error: 'context 가 필요합니다' }, { status: 400 });
  }

  try {
    const result = await generateWithCascade(
      [
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_25 },
        { provider: 'gemini', tier: 'opus',   modelOverride: GEMINI_MODELS.FLASH_25 },
      ],
      TONE_SYSTEM,
      [{ role: 'user', content: `상황: ${context}\n\n이 상황에서 보낼 메시지를 3톤으로 만들어줘.` }],
      600,
    );

    const parsed = safeParseLLMJson(result.text, null as any);
    if (!parsed?.options || !Array.isArray(parsed.options) || parsed.options.length < 3) {
      console.warn('[ToneGen] 파싱 실패, 폴백 사용:', (result.text ?? '').slice(0, 200));
      return NextResponse.json({ options: fallbackOptions(context) });
    }

    // 정규화
    const options = parsed.options.slice(0, 3).map((o: any, idx: number) => ({
      id: ['soft', 'honest', 'firm'][idx] as 'soft' | 'honest' | 'firm',
      label: typeof o.label === 'string' ? o.label : ['부드럽게', '솔직하게', '단호하게'][idx],
      emoji: typeof o.emoji === 'string' ? o.emoji : ['💐', '🔍', '🔥'][idx],
      content: typeof o.content === 'string' ? o.content.slice(0, 200) : '',
      intensity: Math.min(100, Math.max(0, Number(o.intensity) || [25, 55, 85][idx])),
    }));

    return NextResponse.json({ options });
  } catch (err: any) {
    console.error('[ToneGen] 생성 실패:', err);
    return NextResponse.json({ options: fallbackOptions(context) });
  }
}

function fallbackOptions(context: string) {
  return [
    { id: 'soft',   label: '부드럽게', emoji: '💐', content: `${context.slice(0, 20)}... 내 마음 먼저 말해볼게`, intensity: 28 },
    { id: 'honest', label: '솔직하게', emoji: '🔍', content: `${context.slice(0, 20)}... 솔직히 얘기해볼게`, intensity: 55 },
    { id: 'firm',   label: '단호하게', emoji: '🔥', content: `${context.slice(0, 20)}... 이건 확실히 말해`, intensity: 82 },
  ];
}
