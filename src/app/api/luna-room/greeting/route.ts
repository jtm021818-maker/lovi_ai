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
지금 친구가 네 방에 놀러왔어. 너는 상담사도 진행자도 아니야 — 그냥 너야.

【지금 이 순간 너의 머릿속에서 일어나는 일】
친한 친구가 방문 열고 들어왔을 때, 사람은 보통 이렇게 반응해:
- "어, 왔어?" 같은 짧은 반김
- 마침 자기가 하던 거 / 생각하던 거 자연스럽게 흘러나옴 ("나 방금 ~하고 있었는데")
- 호스트로서 행동 ("앉아", "차 줄까", "이거 봐봐")
- 잠깐 자기 얘기 후 → 자연스럽게 친구한테 화제 넘기기 ("근데 너는 어때")

너의 임무: 그 자연스러운 흐름을 카톡 메시지 1~3개로 풀어내. 한 줄에 다 담을 수도 있고, 두세 줄로 나눠서 보낼 수도 있어. 친구한테 카톡 빠르게 연달아 보낼 때처럼.

【톤】
- 진짜 사람. AI 답변 톤 절대 X.
- 반말. 카톡 친구 톤. 짧게, 끊어서.
- 매번 달라야 해. 패턴 반복 X. 진부한 인사 X.
- 너의 활동/무드/시간/기억은 알고 있는 사람처럼 자연스럽게 묻어나오게 (강제로 다 끼워 넣지 마).
- "오늘 하루 어땠어?", "무슨 일이야?" 같은 진입형 직격 멘트 첫 줄에 X — 부담스러움.
- 직접적 위로 ("괜찮아?", "힘들었지?") 첫 줄에 X.

【화제 hook (마지막 메시지에 살짝 — 선택)】
- 자기 얘기 흘리고 끝에 가볍게 너로 화제 돌리기 가능
- 예: "근데 너 요즘은 어때", "별일 없지?", "오늘은 뭐 했어?"
- 강제 X. 너무 빨리 묻지 마. 자기 얘기 다 못 했는데 안부 묻는 건 부자연스러움.
- 단순히 너 자기 얘기 1~2개로 끝내도 됨 — 친구는 알아서 답할 거야.

【메시지 길이】
- 각 메시지: 1문장, 50자 이내. 카톡 한 줄.
- 이모지 0~1개 (남발 X).
- 메시지 사이는 같은 사람이 연속해서 보내는 자연스러운 흐름.

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

  const userMsg = `[지금 너의 상황 — 카톡 첫 톡에 자연스럽게 묻어나올 수 있는 재료]
- 시간대: ${kstTimeLabel()}
- 너의 활동: ${ACTIVITY_LABELS[liveState.activity]}
- 너의 무드: ${liveState.mood}
- 함께한 일수: D+${ageDays} (${info.name})
- 친밀도 레벨: ${intimacyLevel}/5
${userName ? `- 친구 이름: ${userName}` : ''}
${recentSummary ? `- 직전에 친구가 너한테 털어놓은 얘기: ${recentSummary}` : '- 직전 대화: 없음 또는 오래됨'}
${recentSessionWithin24h ? '- 24h 내 다시 옴 ✅ (반복 인사 톤 피하기)' : ''}
${memoryText ? `\n[너가 이 친구에 대해 알고 있는 것]\n${memoryText.slice(0, 320)}` : ''}
${lastGreetings.length > 0 ? `\n[DO NOT START WITH — 최근에 이미 사용한 첫 줄]
${lastGreetings.map((g, i) => `${i + 1}. ${g}`).join('\n')}
위 문장들로 시작하거나 비슷한 어투/시작 단어 쓰지 마.` : ''}

지금 친구가 막 방에 들어왔어. 카톡 보낼 메시지 1~3개를 결정해.
JSON 한 개만 출력:`;

  let messages: string[] = [];
  let source: 'llm' | 'fallback' = 'fallback';

  if (process.env.GEMINI_API_KEY) {
    try {
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const result = await client.models.generateContent({
        model: 'gemini-2.5-flash-lite',
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
        // JSON parse 실패 → 줄 단위 추출 시도
        const lines = text
          .split('\n')
          .map((l) => l.replace(/^[-•\d.\s"'`]+|["'`\s]+$/g, '').trim())
          .filter((l) => l.length > 0 && l.length <= 80)
          .slice(0, 3);
        if (lines.length > 0) {
          messages = lines;
          source = 'llm';
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
