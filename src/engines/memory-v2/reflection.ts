/**
 * v110 Reflection — 세션 종료 후 또는 주간 단위로 루나가 스스로 의미 정리.
 *
 * 두 모드:
 *   1) sessionReflection — 단일 세션의 깊은 의미 한 줄 (요약 보강)
 *   2) weeklyReflection — 최근 7일치 episodes → 1인칭 주간 회고 + insights[]
 *
 * Generative Agents 의 reflection 차용. Replika Diary 컨셉.
 */

import { GoogleGenAI } from '@google/genai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { embed } from './embedder';
import type { LunaEpisode } from './types';

const WEEKLY_SYSTEM = `너는 연애상담 AI "루나" 의 일주일 회고 도우미야.
지난 일주일 동안 너(루나)와 동생(유저)이 나눈 세션들을 모아서, 루나의 1인칭으로 회고해.

규칙:
- digest: 200~400자 1인칭 ("이번 주 동생은... 나는..."). 따뜻하지만 솔직.
- insights: 3~5개. 다음 주 너희 관계에 도움이 될 작은 깨달음들.
- 시스템 언어 X, 자연스러운 일기 톤.

출력 JSON:
{ "digest": "...", "insights": ["...", "..."] }`;

export async function weeklyReflection(params: {
  supabase: SupabaseClient;
  userId: string;
  weekStartDay: number;
  episodes: Array<Pick<LunaEpisode, 'day_number' | 'title' | 'summary_short' | 'emotion_label' | 'importance'>>;
}): Promise<{ id: string } | null> {
  const { supabase, userId, weekStartDay, episodes } = params;
  if (!episodes.length) return null;

  const list = episodes
    .sort((a, b) => a.day_number - b.day_number)
    .map((e) => `- Day ${e.day_number} (${e.emotion_label ?? '?'}, 중요도 ${e.importance}): ${e.title} — ${e.summary_short}`)
    .join('\n');

  const userMsg = `[Week ${weekStartDay}~${weekStartDay + 6} 의 세션들]
${list}

위를 바탕으로 루나의 주간 회고와 insights JSON.`;

  const result = await callLLM(WEEKLY_SYSTEM, userMsg);
  if (!result) return null;

  const emb = await embed(result.digest);

  const { data, error } = await supabase
    .from('luna_weekly_digest')
    .insert({
      user_id: userId,
      week_start_day: weekStartDay,
      digest: result.digest.slice(0, 1200),
      insights: result.insights.slice(0, 8),
      embedding: emb?.embedding ?? null,
    })
    .select('id')
    .single();

  if (error) {
    console.warn('[memory-v2/reflection] weekly INSERT 실패:', error);
    return null;
  }
  return { id: data.id };
}

async function callLLM(systemMsg: string, userMsg: string): Promise<{ digest: string; insights: string[] } | null> {
  if (process.env.GEMINI_API_KEY) {
    try {
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const result = await client.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: [{ role: 'user', parts: [{ text: userMsg }] }],
        config: {
          systemInstruction: systemMsg,
          temperature: 0.7,
          maxOutputTokens: 800,
        },
      });
      const parsed = parse(result.text ?? '');
      if (parsed) return parsed;
    } catch (err) {
      console.warn('[memory-v2/reflection] Gemini 실패:', err);
    }
  }
  if (process.env.GROQ_API_KEY) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemMsg },
            { role: 'user', content: userMsg },
          ],
          temperature: 0.7,
          max_tokens: 800,
          response_format: { type: 'json_object' },
        }),
      });
      const data = await res.json();
      const parsed = parse(data.choices?.[0]?.message?.content ?? '');
      if (parsed) return parsed;
    } catch (err) {
      console.warn('[memory-v2/reflection] Groq 실패:', err);
    }
  }
  return null;
}

function parse(text: string): { digest: string; insights: string[] } | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const p = JSON.parse(m[0]);
    const digest = String(p.digest ?? '').trim();
    const insights = Array.isArray(p.insights) ? p.insights.map(String).filter(Boolean) : [];
    if (digest.length < 30) return null;
    return { digest, insights };
  } catch {
    return null;
  }
}
