/**
 * POST /api/luna-room/whisper
 *
 * "지금 한마디 다시 듣기" — LLM 보강 1회 (Gemini Flash-Lite).
 * 1일 3회 호출 제한 (cached_whisper_until 로 묵시적 통제 + 클라 쿨다운).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { GoogleGenAI } from '@google/genai';
import {
  computeLiveStateLocal,
  pickWhisperLocal,
  getAgeDays,
  getLifeStageInfo,
  ACTIVITY_LABELS,
} from '@/lib/luna-life';
import { formatMemoryForPrompt } from '@/engines/memory/extract-memory';

const SYSTEM = `너는 루나야. 29살, 홍대 원룸, 고양이 한 마리, 일러스트레이터.
지금 사용자가 "루나의 방"에 들어왔어. 머리 위 말풍선에 띄울 한마디를 써.

규칙:
- 1~2문장, 60자 이내.
- 카톡 답장처럼 자연스러운 반말.
- 이모지 0~1개. 이모지 남발 X.
- 상담 모드 X. 그냥 잠깐 본 사이.
- 지금 활동(activity)와 무드(mood)에 자연스럽게 맞춰.
- 최근 상담 요약이 있으면 살짝 살짝 언급해도 OK.
- 직접적 위로 X. 그냥 "있잖아" 분위기.
- 한 줄만 출력. 다른 텍스트, JSON, 따옴표 X.`;

export async function POST(_req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

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
      .select('session_summary')
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

  const liveState = computeLiveStateLocal({
    ageDays,
    stage: info.stage,
    serverNowMs: Date.now(),
    recentSessionWithin24h: !!recentSession,
    recentMessageCount24h: recentSession ? 1 : 0,
    isDeceased,
  });

  if (isDeceased) {
    const fallback = pickWhisperLocal('peaceful', ageDays);
    return NextResponse.json({ whisper: fallback, deceased: true });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mp = (profile?.memory_profile as any) ?? {};
  const userName = profile?.nickname ?? mp?.basicInfo?.nickname ?? '';
  const memoryText = formatMemoryForPrompt(mp);
  const recentSummary = recentSession?.session_summary
    ? String(recentSession.session_summary).slice(0, 120)
    : '';

  const userMsg = `[지금 정보]
- 활동: ${ACTIVITY_LABELS[liveState.activity]}
- 무드: ${liveState.mood}
- 시간대: ${liveState.timeBand}
- 함께한 일수: D+${ageDays}
- 단계: ${info.name}
${userName ? `- 이름: ${userName}` : ''}
${recentSummary ? `- 최근 상담 한줄: ${recentSummary}` : ''}
${memoryText ? `\n[기억]\n${memoryText.slice(0, 240)}` : ''}

말풍선 한 줄만:`;

  let whisper: string | null = null;

  if (process.env.GEMINI_API_KEY) {
    try {
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const result = await client.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: [{ role: 'user', parts: [{ text: userMsg }] }],
        config: {
          systemInstruction: SYSTEM,
          temperature: 0.95,
          maxOutputTokens: 80,
        },
      });
      const text = result.text?.trim().replace(/^["'`]|["'`]$/g, '') ?? '';
      if (text && text.length <= 80) whisper = text;
    } catch (err) {
      console.warn('[LunaWhisper] Gemini 실패:', err);
    }
  }

  if (!whisper) {
    whisper = pickWhisperLocal(liveState.mood, Math.floor(Date.now() / 1000));
  }

  await supabase
    .from('luna_life')
    .update({
      cached_whisper: whisper,
      cached_whisper_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    })
    .eq('user_id', user.id);

  return NextResponse.json({ whisper });
}
