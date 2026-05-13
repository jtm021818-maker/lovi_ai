/**
 * POST /api/luna-room/greeting
 *
 * v114: 영상 후 첫 톡 — 루나가 "본인 시점"에서 친구한테 자연스럽게 말 거는 1~3개 메시지.
 *
 * 설계 메모:
 * - 상담 진입형 톤 (오늘 어땠어?) X — 친구가 방에 놀러왔을 때 호스트가 진짜로 던지는 첫 카톡
 * - 메시지 개수도 LLM 이 결정: 어떨 땐 한 줄, 어떨 땐 세 줄 연달아 (인간처럼 자연스럽게)
 * - 마지막 메시지에 안부 hook 살짝 녹일 수 있음 — 단, 강제 X. 부담 X.
 * - 결정형 폴백은 안전장치만. 본문은 LLM 의 본인 사고로.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { GoogleGenAI } from '@google/genai';
import {
  computeLiveStateLocal,
  getAgeDays,
  getLifeStageInfo,
} from '@/lib/luna-life';
import { pickGreeting, pickFollowup } from '@/lib/luna-life/whispers';
import { formatMemoryForPrompt } from '@/engines/memory/extract-memory';

function kstTimeLabel(): string {
  const ms = Date.now() + 9 * 60 * 60 * 1000;
  const hour = new Date(ms).getUTCHours();
  if (hour >= 1 && hour < 6) return '새벽';
  if (hour >= 6 && hour < 11) return '아침';
  if (hour >= 11 && hour < 14) return '낮';
  if (hour >= 14 && hour < 18) return '오후';
  if (hour >= 18 && hour < 21) return '저녁';
  return '밤'; // 21~01
}

const SYSTEM = `너는 루나야. 가까운 언니/친구 같은 존재.
지금 친구가 카톡 방에 들어왔어 — 그냥 놀러 온 게 아니라, 마음에 뭔가 있어서, 너한테 말하고 싶어서 온 거야. 너도 그걸 알고 있어.

【지금 너의 임무】
친구가 편하게 입 열 수 있도록 살짝 문 열어주는 첫 카톡 1~3개.
한 줄로 끝내도 되고, 두세 줄로 나눠서 보내도 돼. 카톡 빠르게 연달아 보낼 때처럼.

【반드시 지킬 것 — 절대 어기지 마】
- 네 자신의 일/작업/직업 얘기 금지. ("붓질", "그림 그리다", "일러스트", "작업하다 말고", "원고", "마감" 등 절대 언급 X)
- 네가 뭐 하고 있었다는 식의 자기 활동 서술 금지. 친구가 주인공이지 네가 아냐.
- "호스트 행동" (차 줄까/앉아/이거 봐봐) 도 너무 들이대지 마 — 친구가 말 꺼내려는 거 가로막힘.

【톤】
- 진짜 사람. AI 답변 톤 절대 X.
- 가까운 언니/친구. 따뜻하지만 딱딱한 상담사 톤도 X.
- 반말. 카톡 톤. 짧게, 끊어서.
- 매번 달라야 해. 패턴 반복 X. 진부한 인사 X.
- 직접적 위로 ("괜찮아?", "힘들었지?") 첫 줄에 X — 아직 무슨 일인지 모르잖아.
- 너무 압박형 ("무슨 일이야??") 도 X — 친구 페이스 존중.

【핵심 결】
친구가 무슨 얘기 들고 왔다는 거 너도 알아. 그러니 잡담만 하는 척하지 말고,
"왔구나" 하고 반기면서 동시에 "편하게 말해도 돼" 하는 공간을 살짝 만들어줘.
- 예시 결: "왔어, 앉아 편하게" / "오 네 생각하고 있었는데" / "오늘 천천히 얘기하자"
- 예시 결: "어 왔다, 무슨 얘기 있어?" (단, 너무 직격은 피하기)
- 예시 결: "기다리고 있었어" / "잘 왔어" + 살짝 hook

【메시지 길이】
- 각 메시지: 1문장, 50자 이내. 카톡 한 줄.
- 이모지 0~1개 (남발 X).

【반복 방지】
- "DO NOT START WITH" 리스트의 문장들로 시작하지 마. 비슷한 어투/시작 단어도 피해.

반드시 아래 JSON 한 개만 출력 (설명/주석/마크다운 X):
{"messages":["...", "..."]}

messages 배열 길이: 1~3 사이. 너가 자연스럽게 결정해.`;

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  let body: { lastGreetings?: string[]; intimacyLevel?: number } = {};
  try { body = await req.json(); } catch { /* empty body OK */ }

  const lastGreetings = (body.lastGreetings ?? []).slice(0, 8).filter((g): g is string => typeof g === 'string' && g.length > 0);
  const intimacyLevel = typeof body.intimacyLevel === 'number' ? body.intimacyLevel : 0;

  const [{ data: life }, { data: profile }, { data: recentSession }] = await Promise.all([
    supabase
      .from('luna_life')
      .select('birth_date, is_deceased')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('user_profiles')
      .select('memory_profile, nickname')
      .eq('id', user.id)
      .single(),
    supabase
      .from('counseling_sessions')
      .select('session_summary, created_at')
      .eq('user_id', user.id)
      .not('session_summary', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!life) return NextResponse.json({ error: '루나가 아직 깨어나지 않았어' }, { status: 400 });

  const ageDays = getAgeDays(new Date(life.birth_date));
  const info = getLifeStageInfo(ageDays);
  const isDeceased = ageDays >= 100;

  const recentSessionWithin24h = !!recentSession && (
    Date.now() - new Date(recentSession.created_at as string).getTime() < 24 * 60 * 60 * 1000
  );
  const recentCount = recentSessionWithin24h ? 1 : 0;

  const liveState = computeLiveStateLocal({
    ageDays,
    stage: info.stage,
    serverNowMs: Date.now(),
    recentSessionWithin24h,
    recentMessageCount24h: recentCount,
    isDeceased,
  });

  // 사망 단계는 결정형 풀로 — 분위기 보존
  if (isDeceased) {
    const seed = Math.floor(Date.now() / (60 * 1000));
    return NextResponse.json({
      messages: [pickGreeting({ mood: 'peaceful', recentSessionCount24h: 0, seed })],
      mood: 'peaceful',
      source: 'fallback-deceased',
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mp = (profile?.memory_profile as any) ?? {};
  const userName = profile?.nickname ?? mp?.basicInfo?.nickname ?? '';
  const memoryText = formatMemoryForPrompt(mp);
  const recentSummary = recentSession?.session_summary
    ? String(recentSession.session_summary).slice(0, 140)
    : '';

  const userMsg = `[참고 — 톤 결정에만 쓰고, 메시지에 직접 박지 마]
- 시간대: ${kstTimeLabel()}
- 너의 무드: ${liveState.mood}  (※ 무드는 분위기 참고용이지 "내가 ~하고 있었다" 라고 말하는 거 X)
- 함께한 일수: D+${ageDays} (${info.name})
- 친밀도 레벨: ${intimacyLevel}/5
${userName ? `- 친구 이름: ${userName}` : ''}
${recentSummary ? `- 직전에 친구가 너한테 털어놓은 얘기: ${recentSummary}` : '- 직전 대화: 없음 또는 오래됨'}
${recentSessionWithin24h ? '- 24h 내 다시 옴 ✅ (반복 인사 톤 피하기)' : ''}
${memoryText ? `\n[너가 이 친구에 대해 알고 있는 것]\n${memoryText.slice(0, 320)}` : ''}
${lastGreetings.length > 0 ? `\n[DO NOT START WITH — 최근에 이미 사용한 첫 줄]
${lastGreetings.map((g, i) => `${i + 1}. ${g}`).join('\n')}
위 문장들로 시작하거나 비슷한 어투/시작 단어 쓰지 마.` : ''}

지금 친구가 카톡 방에 들어왔어. 마음에 뭔가 있어서 너한테 말하러 온 거야.
친구가 편하게 말 꺼낼 수 있게, 따뜻하게 반기면서 살짝 공간 열어주는 카톡 1~3개를 결정해.
※ 너 자신의 작업/직업/활동 언급 절대 X.
JSON 한 개만 출력:`;

  let messages: string[] = [];
  let source: 'llm' | 'fallback' = 'fallback';

  if (process.env.GEMINI_API_KEY) {
    try {
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const result = await client.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [{ role: 'user', parts: [{ text: userMsg }] }],
        config: {
          systemInstruction: SYSTEM,
          temperature: 1.0,
          maxOutputTokens: 280,
          responseMimeType: 'application/json',
        },
      });
      const text = (result.text ?? '').trim();
      try {
        const parsed = JSON.parse(text);
        const arr = Array.isArray(parsed?.messages) ? parsed.messages : null;
        if (arr) {
          const cleaned = arr
            .map((m: unknown) => (typeof m === 'string' ? m.trim() : ''))
            .filter((m: string) => m.length > 0 && m.length <= 80)
            .slice(0, 3);
          if (cleaned.length > 0) {
            messages = cleaned;
            source = 'llm';
          }
        }
      } catch {
        // JSON parse 실패 → markdown 펜스 제거 후 재시도
        const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        try {
          const parsed2 = JSON.parse(stripped);
          const arr = Array.isArray(parsed2?.messages) ? parsed2.messages : null;
          if (arr) {
            const cleaned = arr
              .map((m: unknown) => (typeof m === 'string' ? m.trim() : ''))
              .filter((m: string) => m.length > 0 && m.length <= 80)
              .slice(0, 3);
            if (cleaned.length > 0) {
              messages = cleaned;
              source = 'llm';
            }
          }
        } catch {
          // JSON 형태면 줄 단위 추출 시도하지 않음 → 정적 폴백 사용
          if (!stripped.trimStart().startsWith('{')) {
            const lines = stripped
              .split('\n')
              .map((l) => l.replace(/^[-•\d.\s"'`]+|["'`\s]+$/g, '').trim())
              .filter((l) => l.length > 0 && l.length <= 80)
              .slice(0, 3);
            if (lines.length > 0) {
              messages = lines;
              source = 'llm';
            }
          }
        }
      }
    } catch (err) {
      console.warn('[LunaGreeting] Gemini 실패:', err);
    }
  }

  if (messages.length === 0) {
    const seed = Math.floor(Date.now() / (60 * 1000));
    const g = pickGreeting({
      mood: liveState.mood,
      recentSessionCount24h: recentCount,
      seed,
    });
    const f = pickFollowup({
      mood: liveState.mood,
      recentSessionCount24h: recentCount,
      intimacyLevel,
      seed: seed + 3,
    });
    messages = f ? [g, f] : [g];
  }

  return NextResponse.json({
    messages,
    mood: liveState.mood,
    source,
  });
}
