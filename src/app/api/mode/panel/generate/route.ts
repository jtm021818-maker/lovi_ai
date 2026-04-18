/**
 * 👥 v81: Panel Report Mode — 3 페르소나 관점 생성 API
 *
 * POST /api/mode/panel/generate
 *
 * 3명이 각자 다른 톤으로 같은 상황에 대한 의견:
 *   - 👩 친한 언니 (공감/위로)
 *   - 🧑‍💼 냉철한 친구 (분석/객관)
 *   - 😎 시크한 선배 (직설/도전)
 *
 * Body: { context: string }
 * Response: { personas: PanelPersona[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateWithCascade, GEMINI_MODELS } from '@/lib/ai/provider-registry';
import { safeParseLLMJson } from '@/lib/utils/safe-json';

const PANEL_SYSTEM = `너는 3명의 페르소나를 동시에 연기해. 같은 연애 상황에 대해 각자 다른 관점으로 짧게 의견을 제시해.

## 3명 페르소나

### 👩 친한 언니 (id=sister)
- 톤: 공감 우선, 위로, "야 그건 진짜 서운하지"
- 관심: 유저 감정 먼저, 상황 판단은 후순위
- 어미: "~지", "~그치?", "~했겠다 ㅠㅠ"

### 🧑‍💼 냉철한 친구 (id=friend)
- 톤: 객관적, 분석적, 사실 확인 중심
- 관심: "상대 의도", "팩트", "패턴 확인"
- 어미: "~인 것 같은데?", "~인지 확인해봤어?", "~면 어떡해?"

### 😎 시크한 선배 (id=senior)
- 톤: 직설, 도전, 살짝 차가움 (악의 X)
- 관심: 유저가 의존/매달림 중인지, 자존감 이슈
- 어미: "~면 어때", "~해야지", "~너답지 않아"

## 원칙
- 각 의견 80~150자. 너무 짧으면 빈약, 길면 피로.
- 세 관점이 서로 **분명히 달라야** 함. 비슷하면 의미 X.
- 유저 비난/무시 금지. 3명 다 유저 편.
- 같은 단서/상황만 사용. 상상 점프 X.

## 출력 (순수 JSON)
{
  "personas": [
    { "id": "sister", "name": "친한 언니", "emoji": "👩", "opinion": "..." },
    { "id": "friend", "name": "냉철한 친구", "emoji": "🧑‍💼", "opinion": "..." },
    { "id": "senior", "name": "시크한 선배", "emoji": "😎", "opinion": "..." }
  ]
}

## 예시

입력: "남친이 자꾸 딴 여자 SNS 좋아요 누르는데"
출력:
{
  "personas": [
    { "id": "sister", "name": "친한 언니", "emoji": "👩",
      "opinion": "야 그거 진짜 서운하지ㅠㅠ 넌 괜찮은 척 하는데 속으론 계속 신경 쓰이는 거잖아. 네 기분이 중요해." },
    { "id": "friend", "name": "냉철한 친구", "emoji": "🧑‍💼",
      "opinion": "누군지, 얼마나 자주, 뭐에 누르는지 확인 필요해. 단순 지인 근황 체크면 괜찮지만 특정 사람한테만 반복이면 얘기해봐야 해." },
    { "id": "senior", "name": "시크한 선배", "emoji": "😎",
      "opinion": "너 지금 걔 SNS 체크하면서 네 마음 소모 중이야. 걔가 문제가 아니라, 네가 이걸 왜 신경 쓰는지가 핵심이지." }
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
  if (!context) return NextResponse.json({ error: 'context 필요' }, { status: 400 });

  try {
    const result = await generateWithCascade(
      [
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_25 },
        { provider: 'gemini', tier: 'opus',   modelOverride: GEMINI_MODELS.FLASH_25 },
      ],
      PANEL_SYSTEM,
      [{ role: 'user', content: `상황: ${context}\n\n3명 페르소나로 각자 의견 달아줘.` }],
      800,
    );

    const parsed = safeParseLLMJson(result.text, null as any);
    if (!parsed?.personas || !Array.isArray(parsed.personas) || parsed.personas.length < 3) {
      console.warn('[PanelGen] 파싱 실패');
      return NextResponse.json({ personas: fallback(context) });
    }

    const personas = parsed.personas.slice(0, 3).map((p: any, idx: number) => ({
      id: (['sister', 'friend', 'senior'] as const)[idx],
      name: typeof p.name === 'string' ? p.name : ['친한 언니', '냉철한 친구', '시크한 선배'][idx],
      emoji: typeof p.emoji === 'string' ? p.emoji : ['👩', '🧑‍💼', '😎'][idx],
      opinion: typeof p.opinion === 'string' ? p.opinion.slice(0, 300) : '',
      userReaction: null,
    }));

    return NextResponse.json({ personas });
  } catch (err: any) {
    console.error('[PanelGen] 실패:', err);
    return NextResponse.json({ personas: fallback(context) });
  }
}

function fallback(context: string) {
  const s = context.slice(0, 40);
  return [
    { id: 'sister', name: '친한 언니', emoji: '👩', opinion: `${s}... 많이 속상했겠다 ㅠㅠ`, userReaction: null },
    { id: 'friend', name: '냉철한 친구', emoji: '🧑‍💼', opinion: `${s}... 상황 좀 더 파악해봐야겠는데?`, userReaction: null },
    { id: 'senior', name: '시크한 선배', emoji: '😎', opinion: `${s}... 네 마음 먼저 챙겨`, userReaction: null },
  ];
}
