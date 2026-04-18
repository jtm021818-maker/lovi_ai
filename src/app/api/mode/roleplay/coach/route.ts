/**
 * 🦊 v81: Roleplay Mode — 코치 피드백 API
 *
 * 매 3-4턴마다 호출되어 유저의 최근 응답에 대해 Luna 코치 모드 피드백 제공.
 *
 * POST /api/mode/roleplay/coach
 * Body: { scenario, history }
 * Response: { feedback: string, tone: 'positive' | 'caution' | 'neutral' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateWithCascade, GEMINI_MODELS } from '@/lib/ai/provider-registry';
import { safeParseLLMJson } from '@/lib/utils/safe-json';

const COACH_SYSTEM = `너는 "루나" (코치 모드). 유저가 방금 롤플레이에서 어떤 선택을 했는지 보고 **짧은 피드백** 주는 친한 언니.

## 원칙
- 상담사 말투 X. 친구/언니 톤.
- 20~50자 피드백. 길면 피로.
- 칭찬할 만하면 구체적으로 칭찬. 조심할 부분 있으면 살짝 경고.
- "방금 그 말 ~한 느낌이라 ~할 듯" 식 구체 근거.

## 출력 (순수 JSON)
{
  "feedback": "피드백 한 줄",
  "tone": "positive" | "caution" | "neutral"
}

## 예시

유저 방금 한 말: "미안... 내가 선 넘었어"
여친 반응: "그래서 뭘 잘못한 건데?"
→ 유저가 다음에 "장난으로 멍청하다고 한 거" 라고 구체적으로 말함

출력:
{
  "feedback": "방금 그 말 진짜 좋았어. 구체적으로 짚으니까 진심 느껴졌을 거야",
  "tone": "positive"
}

유저 방금 한 말: "장난이었잖아 뭐 그렇게 민감해"

출력:
{
  "feedback": "음...방금 그건 좀 셌어. '너 탓' 이 아니라 '내가 보기엔' 으로 돌려보면 어때?",
  "tone": "caution"
}`;

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }); }

  const { scenario, history } = body;
  if (!scenario || !history) {
    return NextResponse.json({ error: 'scenario/history 필요' }, { status: 400 });
  }

  try {
    const historyStr = (history as any[]).slice(-6).map((h) =>
      `[${h.role === 'user' ? '유저' : scenario.role.name}] ${h.content}`
    ).join('\n');

    const userMsg = `## 시나리오
제목: ${scenario.title}
역할: ${scenario.role.name} (${scenario.role.tone})

## 최근 대화 (6줄)
${historyStr}

→ 유저 마지막 발화에 대한 코치 피드백 한 줄.`;

    const result = await generateWithCascade(
      [{ provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_25 }],
      COACH_SYSTEM,
      [{ role: 'user', content: userMsg }],
      300,
    );

    const parsed = safeParseLLMJson(result.text, null as any);
    if (!parsed?.feedback) {
      return NextResponse.json({ feedback: '방금 그 시도 좋아 — 계속 가봐', tone: 'neutral' });
    }

    return NextResponse.json({
      feedback: String(parsed.feedback).slice(0, 200),
      tone: ['positive', 'caution', 'neutral'].includes(parsed.tone) ? parsed.tone : 'neutral',
    });
  } catch (err: any) {
    console.error('[Coach] 실패:', err);
    return NextResponse.json({ feedback: '좋아 계속 가봐', tone: 'neutral' });
  }
}
