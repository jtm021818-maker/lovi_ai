/**
 * v110 Persona Distiller — 세션 → 사용자에 대한 사실(persona facts) 추출 + bi-temporal 갱신.
 *
 * 추출된 사실은 luna_persona_facts 에 INSERT.
 * 같은 (category, key) 의 활성 사실(valid_until IS NULL)이 있고 value 가 다르면:
 *   - 이전 row.valid_until = now()
 *   - 이전 row.superseded_by = 새 row.id
 *   - 새 row INSERT
 *
 * confidence 는 LLM 이 0~1 로 판단 (애매한 추론은 낮게).
 */

import { GoogleGenAI } from '@google/genai';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PersonaCategory } from './types';

interface DistillParams {
  supabase: SupabaseClient;
  userId: string;
  sourceEpisodeId: string;
  summary: string;
  scenario?: string;
}

interface ExtractedFact {
  category: PersonaCategory;
  key: string;
  value: string;
  confidence: number;
}

const SYSTEM = `너는 연애상담 AI "루나"의 기억 정리 도우미야.
이번 세션 요약에서 "다음 세션에 기억하면 좋을 사실(facts)" 만 뽑아.

추출 기준:
- 사실/관계/성격/선호/패턴만. 그 자리 감정 X, 일회성 사건 X.
- 농담/가정/추측은 제외 (또는 confidence ≤ 0.5).
- 애매하면 confidence 낮춰 (보수적).

category:
- identity: 이름/나이/직업 등 자기 식별
- relationship: 연인/가족/친구 (이름, 만난 기간 등)
- personality: 성격 특성 (예: "회피형 애착")
- preference: 좋아함/싫어함
- pattern: 반복되는 정서/행동 패턴 (예: "남친이 답 늦으면 불안 폭발")

key 는 영문 snake_case (예: partner_name, comm_style, trigger_when_cold).
value 는 짧은 한국어 자연 문장.
confidence 는 0~1 (확실=1, 추측=0.4).

출력 JSON:
{ "facts": [ { "category": "...", "key": "...", "value": "...", "confidence": 0~1 }, ... ] }
사실 없으면 { "facts": [] }.`;

export async function distillPersona(params: DistillParams): Promise<{ inserted: number; superseded: number }> {
  const { supabase, userId, sourceEpisodeId, summary, scenario } = params;
  if (!summary || summary.trim().length < 20) return { inserted: 0, superseded: 0 };

  const facts = await extract(summary, scenario);
  if (facts.length === 0) return { inserted: 0, superseded: 0 };

  let inserted = 0;
  let superseded = 0;

  for (const f of facts) {
    if (f.confidence < 0.4) continue;

    // 동일 key 의 활성 row 가 있는지
    const { data: existing } = await supabase
      .from('luna_persona_facts')
      .select('id, value')
      .eq('user_id', userId)
      .eq('category', f.category)
      .eq('key', f.key)
      .is('valid_until', null)
      .limit(1)
      .maybeSingle();

    if (existing && existing.value === f.value) {
      // 같은 사실 재확인 → confidence bump (간단히 update)
      await supabase
        .from('luna_persona_facts')
        .update({ confidence: Math.min(1, (existing as { confidence?: number }).confidence ?? 0.7 + 0.1) })
        .eq('id', existing.id);
      continue;
    }

    // 새 row INSERT
    const { data: newRow, error: insErr } = await supabase
      .from('luna_persona_facts')
      .insert({
        user_id: userId,
        category: f.category,
        key: f.key,
        value: f.value,
        confidence: f.confidence,
        source_episode_id: sourceEpisodeId,
      })
      .select('id')
      .single();

    if (insErr || !newRow) {
      console.warn('[memory-v2/persona] INSERT 실패:', insErr);
      continue;
    }
    inserted++;

    // 이전 사실 supersede
    if (existing) {
      const { error: supErr } = await supabase
        .from('luna_persona_facts')
        .update({ valid_until: new Date().toISOString(), superseded_by: newRow.id })
        .eq('id', existing.id);
      if (!supErr) superseded++;
    }
  }

  return { inserted, superseded };
}

async function extract(summary: string, scenario?: string): Promise<ExtractedFact[]> {
  const userMsg = `[상담 주제] ${scenario ?? '일반 연애 고민'}

[세션 요약]
${summary}

위에서 다음 세션에도 기억할 가치가 있는 사실들을 JSON 으로 추출.`;

  if (process.env.GEMINI_API_KEY) {
    try {
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const result = await client.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: [{ role: 'user', parts: [{ text: userMsg }] }],
        config: {
          systemInstruction: SYSTEM,
          temperature: 0.3,
          maxOutputTokens: 600,
        },
      });
      const parsed = parseFacts(result.text ?? '');
      if (parsed) return parsed;
    } catch (err) {
      console.warn('[memory-v2/persona] Gemini 실패:', err);
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
          temperature: 0.3,
          max_tokens: 600,
          response_format: { type: 'json_object' },
        }),
      });
      const data = await res.json();
      const parsed = parseFacts(data.choices?.[0]?.message?.content ?? '');
      if (parsed) return parsed;
    } catch (err) {
      console.warn('[memory-v2/persona] Groq 실패:', err);
    }
  }

  return [];
}

function parseFacts(text: string): ExtractedFact[] | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const p = JSON.parse(m[0]);
    if (!Array.isArray(p.facts)) return [];
    return (p.facts as Array<Record<string, unknown>>).map((x) => ({
      category: String(x.category ?? 'pattern') as PersonaCategory,
      key: String(x.key ?? '').trim().slice(0, 64),
      value: String(x.value ?? '').trim().slice(0, 240),
      confidence: Math.max(0, Math.min(1, Number(x.confidence) || 0.6)),
    })).filter((f) => f.key && f.value);
  } catch {
    return null;
  }
}
