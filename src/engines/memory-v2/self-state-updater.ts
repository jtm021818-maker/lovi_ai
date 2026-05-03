/**
 * v110 Luna Self-State Updater — 루나 자신의 톤/적응 상태를 누적 갱신.
 *
 * 이번 세션에서 "루나의 어떤 시도가 유저에게 통했고, 어떤 게 실패했나" 를 LLM 이 판정.
 * what_works / what_fails 배열에 누적 (중복 제거, 최근 N개만 유지).
 * tone_summary 와 current_arc 도 갱신.
 */

import { GoogleGenAI } from '@google/genai';
import type { SupabaseClient } from '@supabase/supabase-js';

interface UpdateParams {
  supabase: SupabaseClient;
  userId: string;
  summary: string;
  dayNumber: number;
  scenario?: string;
}

interface SelfDelta {
  tone_summary: string;
  what_works_add: string[];
  what_fails_add: string[];
  current_arc: string | null;
}

const SYSTEM = `너는 연애상담 AI "루나" 의 자기 성찰 도우미야.
방금 끝난 세션의 요약을 보고 루나 자신의 적응 상태를 갱신해.

판단:
- tone_summary: 이 유저에게 잘 맞는 말투 1~2줄 (예: "반말 + 짧은 문장 + 이모지 1개 좋아함, 길게 설교 X")
- what_works_add: 이번 세션에서 "통한" 시도 1~3개 (예: "구체적 행동 제안", "농담으로 분위기 풀기")
- what_fails_add: 이번 세션에서 "안 통한" 시도 0~2개 (예: "뻔한 위로", "추궁성 질문")
- current_arc: 너희 둘 관계 현재 호 (예: "신뢰 쌓기" | "회복기" | "정착" | "위기" | "재발견")

확실한 게 없으면 빈 배열 / null.

출력 JSON:
{
  "tone_summary": "...",
  "what_works_add": ["..."],
  "what_fails_add": ["..."],
  "current_arc": "..." | null
}`;

const MAX_LIST = 10;

export async function updateSelfState(params: UpdateParams): Promise<void> {
  const { supabase, userId, summary, scenario } = params;
  if (!summary || summary.trim().length < 20) return;

  const delta = await extract(summary, scenario);
  if (!delta) return;

  // 기존 state 로드
  const { data: cur } = await supabase
    .from('luna_self_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const what_works = mergeUnique(cur?.what_works ?? [], delta.what_works_add).slice(-MAX_LIST);
  const what_fails = mergeUnique(cur?.what_fails ?? [], delta.what_fails_add).slice(-MAX_LIST);

  await supabase
    .from('luna_self_state')
    .upsert({
      user_id: userId,
      tone_summary: delta.tone_summary || (cur?.tone_summary ?? ''),
      what_works,
      what_fails,
      current_arc: delta.current_arc ?? cur?.current_arc ?? null,
      updated_at: new Date().toISOString(),
    });
}

function mergeUnique(existing: string[], add: string[]): string[] {
  const seen = new Set(existing.map((s) => s.toLowerCase()));
  const out = [...existing];
  for (const a of add) {
    const k = a.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(a);
    }
  }
  return out;
}

async function extract(summary: string, scenario?: string): Promise<SelfDelta | null> {
  const userMsg = `[상담 주제] ${scenario ?? '일반 연애 고민'}

[세션 요약]
${summary}

루나 자신의 적응 상태 갱신값을 JSON 으로.`;

  if (process.env.GEMINI_API_KEY) {
    try {
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const result = await client.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: [{ role: 'user', parts: [{ text: userMsg }] }],
        config: {
          systemInstruction: SYSTEM,
          temperature: 0.4,
          maxOutputTokens: 400,
        },
      });
      const parsed = parse(result.text ?? '');
      if (parsed) return parsed;
    } catch (err) {
      console.warn('[memory-v2/self-state] Gemini 실패:', err);
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
            { role: 'system', content: SYSTEM },
            { role: 'user', content: userMsg },
          ],
          temperature: 0.4,
          max_tokens: 400,
          response_format: { type: 'json_object' },
        }),
      });
      const data = await res.json();
      const parsed = parse(data.choices?.[0]?.message?.content ?? '');
      if (parsed) return parsed;
    } catch (err) {
      console.warn('[memory-v2/self-state] Groq 실패:', err);
    }
  }
  return null;
}

function parse(text: string): SelfDelta | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const p = JSON.parse(m[0]);
    return {
      tone_summary: String(p.tone_summary ?? '').trim().slice(0, 240),
      what_works_add: Array.isArray(p.what_works_add)
        ? p.what_works_add.map(String).filter(Boolean).slice(0, 5)
        : [],
      what_fails_add: Array.isArray(p.what_fails_add)
        ? p.what_fails_add.map(String).filter(Boolean).slice(0, 5)
        : [],
      current_arc: p.current_arc ? String(p.current_arc).slice(0, 60) : null,
    };
  } catch {
    return null;
  }
}
