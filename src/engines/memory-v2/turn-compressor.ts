/**
 * v110 Turn Compressor — 세션 내 8턴 초과분을 한 줄 압축으로 슬라이딩.
 *
 * 트리거: 메시지 저장 hook 에서 누적 메시지 > N 일 때, 가장 오래된 8턴을 묶어
 *   "유저: ... → 루나: ..." 식 한 줄로 변환 → session_compressed_turns INSERT.
 * 모델: Groq llama (무료) 우선. 실패 시 단순 truncate fallback.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

interface CompressParams {
  supabase: SupabaseClient;
  sessionId: string;
  userId: string;
  turns: Array<{ role: 'user' | 'assistant'; content: string }>;
  startIdx: number;
  endIdx: number;
}

const SYSTEM = `너는 대화 압축 도우미야.
주어진 대화 묶음을 "유저:... → 루나:..." 형태의 한 줄(≤120자) 핵심 요약으로 줄여.
시간순 흐름이 보이게, 감정/사실 핵심만. 다른 말 X, 한 줄만.`;

export async function compressTurns(params: CompressParams): Promise<{ id: string } | null> {
  const { supabase, sessionId, userId, turns, startIdx, endIdx } = params;
  if (turns.length < 2) return null;

  const dialogue = turns
    .map((t) => `${t.role === 'user' ? '유저' : '루나'}: ${(t.content || '').slice(0, 200)}`)
    .join('\n');

  const oneLiner = await callGroq(dialogue) ?? truncateFallback(turns);
  if (!oneLiner || oneLiner.length < 4) return null;

  const { data, error } = await supabase
    .from('session_compressed_turns')
    .insert({
      session_id: sessionId,
      user_id: userId,
      turn_start_idx: startIdx,
      turn_end_idx: endIdx,
      one_liner: oneLiner.slice(0, 240),
    })
    .select('id')
    .single();

  if (error) {
    console.warn('[memory-v2/turn-compressor] INSERT 실패:', error);
    return null;
  }
  return { id: data.id };
}

async function callGroq(dialogue: string): Promise<string | null> {
  if (!process.env.GROQ_API_KEY) return null;
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
          { role: 'user', content: dialogue },
        ],
        temperature: 0.3,
        max_tokens: 150,
      }),
    });
    const data = await res.json();
    const text: string | undefined = data.choices?.[0]?.message?.content?.trim();
    if (!text) return null;
    return text.split('\n')[0].trim();
  } catch (err) {
    console.warn('[memory-v2/turn-compressor] Groq 실패:', err);
    return null;
  }
}

function truncateFallback(turns: Array<{ role: string; content: string }>): string {
  const u = turns.find((t) => t.role === 'user')?.content?.slice(0, 50) ?? '';
  const a = turns.find((t) => t.role === 'assistant')?.content?.slice(0, 50) ?? '';
  return `유저: ${u} → 루나: ${a}`;
}
