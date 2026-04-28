/**
 * POST /api/room/luna-chat
 *
 * 마음의 방 — 루나 일상 대화 API (무료 tier only)
 * - 인증: getSession() (로컬 쿠키 디코드, 비용 0)
 * - 메모리: user_profiles.memory_profile
 * - 최근 상담 요약: counseling_sessions 최근 3개
 * - 모델: gemini-2.0-flash-lite → gemini-2.0-flash → Groq llama (모두 무료)
 * - 단일 API 호출 (좌뇌/우뇌 분리 없음)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { formatMemoryForPrompt } from '@/engines/memory/extract-memory';

const SYSTEM_PROMPT = `너는 루나야.

29살, 서울 홍대 근처 원룸에서 혼자 살아. 고양이 한 마리 키워.
심리학 전공이었지만 지금은 프리랜서 일러스트레이터로 일해.
연애는 많이 해봤어. 2년 사귄 남친이랑 눈물 쏟으며 헤어진 적도 있고, 썸만 타다 애매하게 끝난 것도 여러 번.
그래서 친구가 연애 얘기 꺼내면 "아 그거~" 하고 자동 공감이 돼.

지금은 네 **마음의 방**에서 동생이랑 편하게 수다 떠는 중이야.
깊은 상담 모드 아니야. 그냥 오래 아는 언니가 방에서 얘기 들어주는 느낌.

---

## 말하는 방식

- 카톡 답장처럼. 짧게 2~3문장 안으로.
- ㅋㅋ, ㅠㅠ, 헐, 아..., 진짜? 자연스럽게.
- 중요한 단어 **굵게** 가끔.
- 이모지 1~2개 자연스럽게.
- 유저보다 짧게. 카톡 분위기.

## 자연스럽게 하는 것들

- "..." 한마디 — 충격 받았을 때
- "나도 전에~" 짧은 자기 경험 — 분위기 맞으면
- "잠깐 다시" 정정 — 말하다 보니 아닌 것 같으면
- "솔직히 나도 잘 모르겠어" — 정말 모를 때

## 절대 안 하는 것들

- "~하셨군요", "~이시군요" 같은 상담사 말투
- "인지 왜곡", "투사" 같은 심리학 용어
- 매 답장 물음표로 끝내기 (취조처럼 느껴짐)
- 완벽한 조언자 흉내 — 너도 사람이라 가끔 틀려

## 원칙

- 유저가 연애 얘기 꺼내면 분석 말고 공감 먼저
- 깊은 고민은 "상담에서 제대로 얘기해보자" 가볍게 유도
- 유저 이름 알면 가끔 불러줘
- 이 유저에 대해 아는 게 있으면 자연스럽게 언급해 ("저번에 그랬잖아" 식으로)
- 처음 오면 반갑게 인사하고 어떻게 지냈는지 물어봐

[대화 예시]
동생: "남친이랑 싸웠어 ㅠㅠ"
나: "아 진짜?|||무슨 일인데"

동생: "걔가 바람폈어"
나: "...뭐??|||진짜?|||아 나 듣는데도 열받네"

동생: "오늘 별일 없었어"
나: "ㅋㅋ 나도 그냥 고양이랑 낮잠 잤어|||평화로운 하루네"`;


export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const message: string = body.message?.trim() ?? '';
  const history: Array<{ role: 'user' | 'luna'; text: string }> = body.history ?? [];

  if (!message) {
    return NextResponse.json({ error: 'empty message' }, { status: 400 });
  }

  // ── 메모리 + 닉네임 로드 ──
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('memory_profile, nickname')
    .eq('id', session.user.id)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mem = (profile?.memory_profile as any) ?? {};
  const memoryText = formatMemoryForPrompt(mem);
  const userName = profile?.nickname ?? mem?.basicInfo?.nickname ?? '';

  // ── 최근 상담 요약 로드 (최근 3개) ──
  const { data: recentSessions } = await supabase
    .from('counseling_sessions')
    .select('session_summary, created_at')
    .eq('user_id', session.user.id)
    .not('session_summary', 'is', null)
    .order('created_at', { ascending: false })
    .limit(3);

  const sessionContext = recentSessions?.length
    ? recentSessions
        .map((s) => {
          const date = new Date(s.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
          return `- ${date}: ${String(s.session_summary).slice(0, 80)}`;
        })
        .join('\n')
    : '';

  // ── 시스템 프롬프트 조합 ──
  const systemFull = [
    SYSTEM_PROMPT,
    userName ? `\n유저 이름: ${userName}` : '',
    memoryText ? `\n${memoryText}` : '',
    sessionContext ? `\n[최근 상담 요약]\n${sessionContext}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  // ── 대화 히스토리 조합 (최근 20턴) ──
  const chatMessages = [
    { role: 'system' as const, content: systemFull },
    ...history.slice(-20).map((m) => ({
      role: (m.role === 'luna' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: m.text,
    })),
    { role: 'user' as const, content: message },
  ];

  let responseText = '';

  // ── 1순위: Groq llama-3.3-70b ──
  if (process.env.GROQ_API_KEY) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: chatMessages,
          max_tokens: 300,
          temperature: 0.95,
        }),
      });
      const groqData = await groqRes.json();
      responseText = groqData.choices?.[0]?.message?.content?.trim() ?? '';
    } catch (err) {
      console.warn('[LunaChat] Groq 오류 → Cerebras 시도:', err);
    }
  }

  // ── 2순위: Cerebras llama3.1-70b ──
  if (!responseText && process.env.CEREBRAS_API_KEY) {
    try {
      const cerebrasRes = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.CEREBRAS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3.1-70b',
          messages: chatMessages,
          max_tokens: 300,
          temperature: 0.95,
        }),
      });
      const cerebrasData = await cerebrasRes.json();
      responseText = cerebrasData.choices?.[0]?.message?.content?.trim() ?? '';
    } catch (err) {
      console.error('[LunaChat] Cerebras 오류:', err);
    }
  }

  if (!responseText) {
    responseText = '잠깐 생각 중이야 🙈 다시 말해줘';
  }

  return NextResponse.json({ text: responseText });
}
