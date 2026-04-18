/**
 * 👥 v81: Panel — 선택한 페르소나 관점으로 깊이 파고들기 API
 *
 * POST /api/mode/panel/deepen
 * Body: {
 *   context: string,
 *   persona: { id, name, emoji, opinion },
 *   userMessage: string,
 *   history: Array<{ role: 'user' | 'luna'; content: string }>
 * }
 * Response: { reply: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateWithCascade, GEMINI_MODELS } from '@/lib/ai/provider-registry';

const PERSONA_PROMPTS: Record<string, string> = {
  sister: `너는 "친한 언니" 톤. 공감 + 위로 우선. "야 그건 진짜 서운하지 ㅠㅠ" 같은 어미. 분석 X, 마음 먼저.`,
  friend: `너는 "냉철한 친구" 톤. 객관적 분석, 사실 확인. "그거 단순 호기심일 수도 있어. 확인해봤어?" 같은 어미. 감정보단 구조.`,
  senior: `너는 "시크한 선배" 톤. 직설, 살짝 차가움 (악의 X). "넌 지금 의존하고 있어. 너답게 해야지" 같은 어미.`,
};

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }); }

  const { context, persona, userMessage, history } = body;
  if (!persona?.id || !userMessage) {
    return NextResponse.json({ error: 'persona/userMessage 필요' }, { status: 400 });
  }

  const personaPrompt = PERSONA_PROMPTS[persona.id] ?? PERSONA_PROMPTS.sister;
  const system = `${personaPrompt}

## 맥락
상황: ${context ?? ''}
네가 처음 낸 의견: "${persona.opinion}"

## 원칙
- 페르소나 톤 유지. 루나 원래 성격 X.
- 2-4문장 (~200자 이내).
- 유저 질문에 깊게 답해. 분석적이거나 공감적으로 (페르소나 특성 따라).
- 상담사 말투 X. 친구처럼.

## 출력
순수 텍스트. JSON X. 태그 X. 그냥 대사 한 덩어리.`;

  const historyStr = Array.isArray(history)
    ? history.slice(-6).map((h: any) => `[${h.role === 'user' ? '유저' : persona.name}] ${h.content}`).join('\n')
    : '';

  const userMsg = historyStr
    ? `## 대화 기록\n${historyStr}\n\n## 유저가 방금 한 말\n"${userMessage}"\n\n→ ${persona.name} 톤으로 응답.`
    : `## 유저가 방금 한 말\n"${userMessage}"\n\n→ ${persona.name} 톤으로 응답.`;

  try {
    const result = await generateWithCascade(
      [{ provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_25 }],
      system,
      [{ role: 'user', content: userMsg }],
      400,
    );

    return NextResponse.json({
      reply: (result.text ?? '').trim().slice(0, 500) || '...음 좀 더 얘기해봐',
    });
  } catch (err: any) {
    console.error('[PanelDeepen] 실패:', err);
    return NextResponse.json({ reply: '...음 좀 더 얘기해봐' });
  }
}
