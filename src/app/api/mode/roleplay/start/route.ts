/**
 * 🎭 v81: Roleplay Mode — 시나리오 시작 API
 *
 * POST /api/mode/roleplay/start
 * Body: { context: string }
 * Response: { scenario: { title, situation, role, opening: { narration, dialogue, spriteFrame } } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateWithCascade, GEMINI_MODELS } from '@/lib/ai/provider-registry';
import { safeParseLLMJson } from '@/lib/utils/safe-json';

const ROLEPLAY_START_SYSTEM = `너는 연애 상담 AI "루나". 유저가 연습하고 싶은 상황을 읽고 **롤플레이 시나리오** 를 설정해.

## 네 임무
1. 상황 분석 → 루나가 연기할 역할 결정 (여친/남친/썸남/썸녀/친구/전애인 등)
2. 시나리오 제목 (10자 이내, 흥미롭게)
3. 현재 상황 묘사 (1줄, 20~40자)
4. 오프닝: 나레이션 + 역할 대사 + 표정

## 출력 (순수 JSON)
{
  "title": "...",
  "situation": "...",
  "role": {
    "name": "루나(여친)",
    "archetype": "girlfriend",
    "tone": "시크",
    "emoji": "😒"
  },
  "opening": {
    "narration": "_카페 안. 여자친구가 팔짱 끼고 앉아있다._",
    "dialogue": "...왜 또 그러는데?",
    "spriteFrame": 2
  }
}

spriteFrame: 0=기본 1=슬픔 2=화남 3=생각 4=놀람 5=웃음 6=걱정 7=당당

## 예시
입력: "어제 장난친 거로 여친이 화났어. 사과하고 싶어"
출력:
{
  "title": "카페에서 사과하기",
  "situation": "어제 장난으로 상처 준 여친과 카페에서 만남",
  "role": { "name": "루나(여친)", "archetype": "girlfriend", "tone": "상처받은 시크함", "emoji": "😒" },
  "opening": {
    "narration": "_카페에 먼저 와서 앉아있는 여친. 커피 잔을 만지며 너를 보지 않는다._",
    "dialogue": "왔네...",
    "spriteFrame": 1
  }
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
      ROLEPLAY_START_SYSTEM,
      [{ role: 'user', content: `상황: ${context}\n\n롤플레이 시나리오 만들어줘.` }],
      700,
    );

    const parsed = safeParseLLMJson(result.text, null as any);
    if (!parsed?.title || !parsed?.role || !parsed?.opening) {
      console.warn('[RoleplayStart] 파싱 실패:', (result.text ?? '').slice(0, 300));
      return NextResponse.json({
        scenario: fallbackScenario(context),
      });
    }

    // 🆕 v81: 배경 이미지 생성 (실패 허용, 없으면 gradient fallback)
    let backgroundImageBase64: string | undefined;
    try {
      const { generateSceneBackground } = await import('@/lib/ai/imagen');
      const { RelationshipScenario } = await import('@/types/engine.types');
      // archetype → scenario 매핑 (대략)
      const scenarioMap: Record<string, any> = {
        girlfriend: RelationshipScenario.JEALOUSY,
        boyfriend: RelationshipScenario.JEALOUSY,
        ex: RelationshipScenario.RECONNECTION,
        crush: RelationshipScenario.FIRST_MEETING,
        friend: RelationshipScenario.GENERAL,
      };
      const scenarioEnum = scenarioMap[parsed.role?.archetype?.toLowerCase()] ?? RelationshipScenario.GENERAL;
      const bg = await generateSceneBackground(scenarioEnum, parsed.title);
      if (bg) backgroundImageBase64 = bg;
    } catch (e: any) {
      console.warn('[RoleplayStart] 배경 이미지 실패 (무시):', e?.message?.slice(0, 80));
    }

    return NextResponse.json({
      scenario: { ...parsed, backgroundImageBase64 },
    });
  } catch (err: any) {
    console.error('[RoleplayStart] 실패:', err);
    return NextResponse.json({ scenario: fallbackScenario(context) });
  }
}

function fallbackScenario(context: string) {
  return {
    title: '연습 시나리오',
    situation: context.slice(0, 50),
    role: { name: '루나(상대)', archetype: 'partner', tone: '중립', emoji: '🦊' },
    opening: {
      narration: '_그 상대가 앞에 있다._',
      dialogue: '...무슨 일인데?',
      spriteFrame: 0,
    },
  };
}
