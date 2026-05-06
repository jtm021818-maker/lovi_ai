/**
 * POST /api/luna-room/greeting
 *
 * v113: 채팅 진입 시 LLM 생성 인사 — 매번 다른 자연스러운 1~2 문장.
 *
 * 설계 메모:
 * - whisper route 패턴 재사용 (Gemini 2.5 Flash-Lite, ~400-800ms 평균)
 * - 클라가 보낸 lastGreetings 를 "이런 말로 시작하지 마" 리스트로 주입
 * - JSON { greeting, followup } 한 번에 생성 (2회 호출 X)
 * - 실패/타임아웃 → 결정형 폴백 (whispers.ts pickGreeting/pickFollowup)
 * - 캐시 안 함 (사용자 요구: 매번 달라야 함)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { GoogleGenAI } from '@google/genai';
import {
  computeLiveStateLocal,
  getAgeDays,
  getLifeStageInfo,
  ACTIVITY_LABELS,
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

const SYSTEM = `너는 루나야. 29살, 홍대 원룸에 사는 일러스트레이터. 고양이 한 마리.
지금 사용자가 너의 상담실/방에 막 들어왔어. 너는 친구 같은 언니야.

너의 임무: "친한 친구가 방에 들어왔을 때 진짜로 하고 싶은 첫 한마디"를 자연스럽게 던져.
사용자에 대한 기억, 너의 지금 무드/시간/활동을 모두 알고 있는 인간처럼 말해.

매우 중요한 규칙:
- 진짜 사람처럼 자연스럽게. AI 답변 톤 절대 X.
- 매번 달라야 해. 같은 패턴 반복 X. 진부한 인사 X.
- 반말. 카톡 친구 톤.
- 첫 메시지(greeting): 1~2문장, 60자 이내. 이모지 0~1개 (남발 X).
- 두번째 메시지(followup): 짧은 한 줄, 30자 이내. 톤 이어가기. 어색하면 "" 가능.
- 첫 줄에 직접적 위로 ("괜찮아?", "힘들었지?") X — 부담스러움. 자연스럽게 말 걸기.
- 너의 활동/무드/시간대를 살짝 녹이거나 안 녹이거나 자유.
- 기억 있으면 자연스럽게 활용 (단, 캐묻듯/티내듯 X). 없으면 그냥 지금 분위기로.
- "DO NOT START WITH" 리스트의 문장들로 시작하지 마. 비슷한 어투/시작 단어도 피해.

반드시 아래 JSON 한 개만 출력 (설명/주석/마크다운 X):
{"greeting":"...","followup":"..."}`;

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
      greeting: pickGreeting({ mood: 'peaceful', recentSessionCount24h: 0, seed }),
      followup: '',
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

  const userMsg = `[지금 상황]
- 시간대: ${kstTimeLabel()}
- 너의 활동: ${ACTIVITY_LABELS[liveState.activity]}
- 너의 무드: ${liveState.mood}
- 함께한 일수: D+${ageDays} (${info.name})
- 친밀도 레벨: ${intimacyLevel}/5
${userName ? `- 사용자 이름: ${userName}` : ''}
${recentSummary ? `- 직전 상담 요약: ${recentSummary}` : '- 직전 상담: 없음 또는 오래됨'}
${recentSessionWithin24h ? '- 24h 내 재방문 ✅ (반복 인사 톤 피하기)' : ''}
${memoryText ? `\n[기억 — 이 사용자에 대해 알고 있는 것]\n${memoryText.slice(0, 320)}` : ''}
${lastGreetings.length > 0 ? `\n[DO NOT START WITH — 최근에 이미 사용한 문장]
${lastGreetings.map((g, i) => `${i + 1}. ${g}`).join('\n')}
위 문장들로 시작하거나 비슷한 어투/시작 단어 쓰지 마.` : ''}

JSON 한 개만 출력:`;

  let greeting: string | null = null;
  let followup = '';
  let source: 'llm' | 'fallback' = 'fallback';

  if (process.env.GEMINI_API_KEY) {
    try {
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const result = await client.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: [{ role: 'user', parts: [{ text: userMsg }] }],
        config: {
          systemInstruction: SYSTEM,
          temperature: 0.95,
          maxOutputTokens: 200,
          responseMimeType: 'application/json',
        },
      });
      const text = (result.text ?? '').trim();
      try {
        const parsed = JSON.parse(text);
        const g = String(parsed?.greeting ?? '').trim();
        const f = String(parsed?.followup ?? '').trim();
        if (g && g.length <= 80) {
          greeting = g;
          source = 'llm';
        }
        if (f && f.length <= 50) followup = f;
      } catch {
        // JSON parse 실패 → 첫 줄만 추출 시도
        const cleaned = text.replace(/^[`"'\s]+|[`"'\s]+$/g, '').split('\n')[0].trim();
        if (cleaned && cleaned.length <= 80) {
          greeting = cleaned;
          source = 'llm';
        }
      }
    } catch (err) {
      console.warn('[LunaGreeting] Gemini 실패:', err);
    }
  }

  if (!greeting) {
    const seed = Math.floor(Date.now() / (60 * 1000));
    greeting = pickGreeting({
      mood: liveState.mood,
      recentSessionCount24h: recentCount,
      seed,
    });
    if (!followup) {
      followup = pickFollowup({
        mood: liveState.mood,
        recentSessionCount24h: recentCount,
        intimacyLevel,
        seed: seed + 3,
      });
    }
  }

  return NextResponse.json({
    greeting,
    followup,
    mood: liveState.mood,
    source,
  });
}
