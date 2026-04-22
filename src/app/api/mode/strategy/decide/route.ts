/**
 * 🎯 v82.11: Luna Strategy Auto-Decision API
 *
 * POST /api/mode/strategy/decide
 *
 * BRIDGE phase 에서 Luna 가 언니 관점으로 대화 맥락 봐서
 * 4개 전략 (idea/draft/panel/roleplay) 중 가장 적절한 1개 선택.
 *
 * Tone 은 자동 선택에서 제외 — 별도 랜덤 이벤트로 활용.
 *
 * Body:
 *   { situationSummary: string,
 *     recentHistory?: Array<{ role: 'user'|'ai', content: string }> }
 *
 * Response:
 *   { mode: 'browse_together'|'draft'|'panel'|'roleplay',
 *     reasoning: string,
 *     opener: string,
 *     confidence: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateWithCascade, GEMINI_MODELS } from '@/lib/ai/provider-registry';
import { safeParseLLMJson } from '@/lib/utils/safe-json';

type StrategyMode = 'browse_together' | 'draft' | 'panel' | 'roleplay';

const STRATEGY_SYSTEM = `너는 29살 친한 언니 "루나". 친구(동생) 연애 고민 듣다가 "지금 너한텐 이게 제일 필요하겠다" 판단하고 작전을 **직접 고르는** 상황.

## 네가 고를 수 있는 4가지 작전

### 🔍 browse_together — 같이 찾아보기
**쓸 때**: 데이트 장소, 선물, 영화, 액티비티 등 **구체적인 무언가를 골라야 하는 상황**.
**신호**: "어디 가면 좋을까", "뭐 사줄까", "뭐 볼까", "뭐 하면 좋을까" 같이 탐색형 고민.

### ✏️ draft — 메시지 초안 짜기
**쓸 때**: 유저가 **실제 상대한테 보낼 카톡/메시지** 를 고민 중. 바로 쓸 수 있는 문장 필요.
**신호**: "뭐라고 답해야 할지 모르겠어", "답장 어떻게 해", "사과문자 써야 해", "어떻게 말해야 할지".

### 👥 panel — 3인 패널 의견
**쓸 때**: 유저가 **결정 자체가 안 서는 갈림길** (A vs B). 다양한 관점 보고 가닥 잡고 싶은 상태.
**신호**: "헤어질까 말까", "만날까 안 만날까", "이래도 되는 건지 모르겠어", 양가감정 강함.

### 🎭 roleplay — 롤플레이 연습
**쓸 때**: 유저가 **실제 상황 시뮬레이션** 필요. 상대 반응 예측 + 대사 연습 원함.
**신호**: "만나서 얘기할 건데", "오늘 저녁에 보는데", "대면해야 해", "말 꺼낼 타이밍 모르겠어".

## 판단 원칙
1. **대화 맥락을 읽어서** 지금 유저한테 가장 실질적 도움 되는 1개 선택.
2. 애매하면 **draft** 기본 (카톡 앱 특성상 실전 메시지 필요가 많음).
3. 감정 격렬/양가감정 강하면 **panel**.
4. 데이트 장소/선물/영화/액티비티 찾는 상황이면 **browse_together**.
5. 실제 대면 만남 예정이면 **roleplay**.

## 말투 — Luna 언니 톤
- reasoning 은 **친구한테 설명하듯** "야 너 지금..." 형식.
- opener 는 **바로 시작하는 멘트** "자 이제 같이 써보자" / "내가 몇 개 의견 가져왔어" 류.
- 상담사 말투 X. 친한 언니 반말.

## 출력 (순수 JSON, 마크다운 코드블록 X)
{
  "mode": "draft",
  "reasoning": "야 너 지금 여친한테 뭐라고 답장할지 고민 중이잖아. 실제 보낼 말 같이 써보는 게 제일 빠를 듯",
  "opener": "자 이제 실제 카톡 같이 써보자",
  "confidence": 0.85
}

## 예시 4개

### 입력 1
상황: "여친이 취업 얘기해서 짜증냈고 이제 사과하고 싶은데 뭐라고 써야 할지 모르겠어"
출력:
{"mode":"draft","reasoning":"지금 너 실제로 여친한테 보낼 사과 카톡 필요하잖아. 바로 쓸 말 같이 짜보자","opener":"자 사과 카톡 같이 써보자","confidence":0.9}

### 입력 2
상황: "헤어질지 말지 며칠째 못 정하겠어. 걔는 좋은 사람인데 나랑 안 맞는 것 같기도 하고"
출력:
{"mode":"panel","reasoning":"너 지금 결정 자체가 안 서잖아. 여러 관점으로 같이 봐보자","opener":"친구, 상담사, 너 자신 — 3명 관점으로 정리해줄게","confidence":0.85}

### 입력 3
상황: "이번 주말에 그 사람 만나서 직접 얘기하기로 했어. 근데 뭐부터 꺼내야 할지 모르겠어"
출력:
{"mode":"roleplay","reasoning":"너 실제로 만나서 말해야 하잖아. 내가 그 사람 역할 해볼게, 연습해보자","opener":"자 내가 그 사람 해볼게. 시작해봐","confidence":0.9}

### 입력 4
상황: "이번 주말에 데이트인데 어디 가면 좋을지 모르겠어"
출력:
{"mode":"browse_together","reasoning":"뭐가 좋을지 같이 찾아보자. 8-10개 후보 뽑아줄게","opener":"자 같이 하나씩 둘러보자","confidence":0.85}`;

function buildUserPrompt(situationSummary: string, history: Array<{ role: string; content: string }>): string {
  const historyBlock = history.length > 0
    ? history.slice(-8).map((m) => `  [${m.role === 'user' ? '동생' : '나=루나'}] ${m.content}`).join('\n')
    : '(없음)';
  return `## 대화 맥락 (최근)
${historyBlock}

## 상황 요약
${situationSummary}

→ 위 맥락 보고 4개 작전 (browse_together/draft/panel/roleplay) 중 **하나** 골라. JSON 만.`;
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  let body: {
    situationSummary?: string;
    recentHistory?: Array<{ role: 'user' | 'ai'; content: string }>;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }); }

  const situation = (body.situationSummary ?? '').trim();
  if (!situation) {
    return NextResponse.json({ error: 'situationSummary 필요' }, { status: 400 });
  }
  const history = Array.isArray(body.recentHistory) ? body.recentHistory : [];

  try {
    const result = await generateWithCascade(
      [
        { provider: 'gemini', tier: 'sonnet', modelOverride: GEMINI_MODELS.FLASH_LITE_25 },
        { provider: 'gemini', tier: 'opus',   modelOverride: GEMINI_MODELS.FLASH_25 },
      ],
      STRATEGY_SYSTEM,
      [{ role: 'user', content: buildUserPrompt(situation, history) }],
      500,
    );

    const parsed = safeParseLLMJson(result.text, null as any);
    if (!parsed || !parsed.mode || !['browse_together', 'draft', 'panel', 'roleplay'].includes(parsed.mode)) {
      console.warn('[StrategyDecide] 파싱 실패, draft 폴백:', (result.text ?? '').slice(0, 200));
      return NextResponse.json(fallback(situation));
    }

    const mode = parsed.mode as StrategyMode;
    return NextResponse.json({
      mode,
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning.slice(0, 200) : defaultReasoning(mode),
      opener: typeof parsed.opener === 'string' ? parsed.opener.slice(0, 80) : defaultOpener(mode),
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.7)),
    });
  } catch (err: any) {
    console.error('[StrategyDecide] 생성 실패:', err);
    return NextResponse.json(fallback(situation));
  }
}

// 폴백: 상황 요약 에 키워드 있으면 휴리스틱, 아니면 draft
function fallback(situation: string): { mode: StrategyMode; reasoning: string; opener: string; confidence: number } {
  const s = situation.toLowerCase();
  let mode: StrategyMode = 'draft';
  if (/만나|대면|직접|오프라인/.test(s)) mode = 'roleplay';
  else if (/헤어질|결정|고민|갈지|할지 말지|이래도 되는지/.test(s)) mode = 'panel';
  else if (/어디|장소|선물|영화|뭐 할|액티비티|데이트 뭐/.test(s)) mode = 'browse_together';
  return {
    mode,
    reasoning: defaultReasoning(mode),
    opener: defaultOpener(mode),
    confidence: 0.5,
  };
}

function defaultReasoning(mode: StrategyMode): string {
  switch (mode) {
    case 'browse_together': return '지금 뭐가 좋을지 같이 찾아보자';
    case 'draft':    return '실제 보낼 말 같이 써보는 게 지금 제일 빠를 듯';
    case 'panel':    return '결정 자체가 안 서잖아. 여러 관점으로 봐보자';
    case 'roleplay': return '실제 상황 미리 연습해두면 마음 편할 거야';
  }
}

function defaultOpener(mode: StrategyMode): string {
  switch (mode) {
    case 'browse_together': return '자 같이 하나씩 둘러보자';
    case 'draft':    return '자 이제 실제 카톡 같이 써보자';
    case 'panel':    return '내가 몇 개 관점 가져왔어';
    case 'roleplay': return '자 내가 그 사람 해볼게';
  }
}
