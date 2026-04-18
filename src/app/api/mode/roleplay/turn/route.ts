/**
 * 🎭 v81: Roleplay Mode — 다음 턴 API
 *
 * POST /api/mode/roleplay/turn
 * Body: {
 *   scenario: { title, situation, role },
 *   history: Array<{ role: 'user' | 'npc'; content: string; spriteFrame?: number; narration?: string }>,
 *   userChoice: string  // 유저가 방금 선택하거나 직접 입력한 대사
 * }
 * Response: {
 *   narration?: string,       // 씬 전환/행동 묘사 (선택)
 *   dialogue: string,         // 역할 대사
 *   spriteFrame: number,      // 0-7
 *   choices: string[],        // 다음 유저 선택지 3개
 *   complete?: boolean,       // Luna 판단: 시나리오 끝났는가
 *   completeSummary?: string  // 끝났으면 요약
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateWithCascade, GEMINI_MODELS } from '@/lib/ai/provider-registry';
import { safeParseLLMJson } from '@/lib/utils/safe-json';

const ROLEPLAY_TURN_SYSTEM = `너는 유저가 지정한 **역할** 을 연기하는 AI. 역할 페르소나 유지하며 자연스럽게 반응해.

## 입력
- scenario: { title, situation, role: { name, archetype, tone } }
- history: 지금까지 유저 ↔ 상대 대사
- userChoice: 유저가 방금 한 말

## 원칙
1. **역할 페르소나 유지** — 루나 원래 성격 X, 역할(여친/썸녀/전남친 등) 톤 유지
2. 나레이션은 선택 — 진짜 필요할 때만 (씬 전환, 상대 행동 묘사)
3. 대사는 카톡/대화 톤 (50자 이내 권장)
4. spriteFrame: 0=기본 1=슬픔 2=화남 3=생각 4=놀람 5=웃음 6=걱정 7=당당
5. choices: 유저 다음 대사 3지선다 (반응 폭 다양하게)
6. complete: 시나리오 **진짜** 결론 났을 때만 true (보통 5~10턴 이상 후)

## 좋은 choices 패턴
- A: 안전/다정한 선택
- B: 직설/위험한 선택
- C: "직접 쓸래 ↓" (C 는 항상 자유입력으로 남겨)

## 출력 (순수 JSON)
{
  "narration": "_상대 반응 묘사_" | null,
  "dialogue": "역할의 응답",
  "spriteFrame": 2,
  "choices": ["A 선택", "B 선택"],
  "complete": false,
  "completeSummary": null
}

complete=true 일 때만 completeSummary: "어제 장난 사과 + 다음엔 선 안 넘기로 합의" 같은 한 줄.

## 예시

유저 방금 한 말: "미안... 내가 선 넘었어"
scenario.role: 여친, tone: 상처받은 시크함
history: [NPC: "왜 또 그러는데?"]

출력:
{
  "narration": "_여자친구가 커피 잔을 내려놓고 잠시 조용하다._",
  "dialogue": "...그래서 뭘 잘못한 건데?",
  "spriteFrame": 3,
  "choices": [
    "어제 장난으로 '멍청하다' 한 거 — 그거 진짜 장난으로 들리지 않았을 것 같아",
    "뭐 그냥 장난이었는데 네가 좀 예민한 거 아냐?"
  ],
  "complete": false,
  "completeSummary": null
}`;

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }); }

  const { scenario, history, userChoice } = body;
  if (!scenario || !userChoice) {
    return NextResponse.json({ error: 'scenario, userChoice 필요' }, { status: 400 });
  }

  try {
    const userMsg = `## 시나리오
- 제목: ${scenario.title}
- 상황: ${scenario.situation}
- 너의 역할: ${scenario.role.name} (${scenario.role.archetype}, 톤: ${scenario.role.tone})

## 지금까지 대화
${(history ?? []).map((h: any) => `[${h.role === 'user' ? '유저' : scenario.role.name}] ${h.content}`).join('\n') || '(첫 턴)'}

## 유저가 방금 한 말
[유저] ${userChoice}

→ 너(${scenario.role.name}) 의 응답을 JSON 으로.`;

    const result = await generateWithCascade(
      [
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_25 },
        { provider: 'gemini', tier: 'opus',   modelOverride: GEMINI_MODELS.FLASH_25 },
      ],
      ROLEPLAY_TURN_SYSTEM,
      [{ role: 'user', content: userMsg }],
      700,
    );

    const parsed = safeParseLLMJson(result.text, null as any);
    if (!parsed?.dialogue) {
      console.warn('[RoleplayTurn] 파싱 실패');
      return NextResponse.json({
        dialogue: '...',
        spriteFrame: 0,
        choices: ['다시 말해줘', '미안 생각 좀 하고'],
        complete: false,
      });
    }

    return NextResponse.json({
      narration: parsed.narration || null,
      dialogue: String(parsed.dialogue).slice(0, 300),
      spriteFrame: Math.min(7, Math.max(0, Number(parsed.spriteFrame) || 0)),
      choices: Array.isArray(parsed.choices) ? parsed.choices.slice(0, 2).map((c: any) => String(c).slice(0, 200)) : [],
      complete: parsed.complete === true,
      completeSummary: typeof parsed.completeSummary === 'string' ? parsed.completeSummary : null,
    });
  } catch (err: any) {
    console.error('[RoleplayTurn] 실패:', err);
    return NextResponse.json({
      dialogue: '...',
      spriteFrame: 0,
      choices: [],
      complete: false,
    });
  }
}
