/**
 * v110 Importance Scorer — 세션 종료 시 에피소드의 중요도(1~10)를 LLM 이 판정.
 *
 * Generative Agents (Park et al., 2023) 의 importance scoring 차용.
 * 키워드 휴리스틱 금지 (feedback_llm_judgment.md). 무료 캐스케이드.
 */

import { GoogleGenAI } from '@google/genai';
import type { EmotionLabel } from './types';

interface ScoreParams {
  summary: string;            // 세션 요약 (200~400자)
  scenario?: string;
}

export interface ImportanceResult {
  importance: number;         // 1~10
  reason: string;             // 짧은 이유 (LLM)
  emotion_label: EmotionLabel;
  emotion_scores: Record<string, number>;
  tags: string[];             // 자유 태그
  related_people: string[];   // 등장 인물
}

const SYSTEM = `너는 연애상담 AI "루나"의 기억 정리 도우미야.
방금 끝난 상담 세션의 요약을 보고 "이 기억이 얼마나 오래/선명히 남길 가치가 있는지"를 판단해.

importance 척도:
- 10: 인생의 변곡점 (이별/재회/고백/큰 깨달음)
- 8~9: 깊은 감정 사건 (큰 갈등, 처음 한 솔직한 말, 중요한 결심)
- 5~7: 일상 속 의미 있는 한 장면 (작은 인사이트, 새로 알게 된 사실)
- 2~4: 평범한 안부 / 가벼운 잡담
- 1: 거의 무의미 (인사만, 테스트 발화)

emotion_label 은 joy|sadness|anger|anxiety|peace|longing|guilt|shame|pride|mixed 중 1개.
emotion_scores 는 각 라벨별 0~1 점수. 합 1.0 근사.
tags 는 자유 태그 3~6개 (한국어 한 단어 또는 짧은 구).
related_people 은 대화에 등장한 사람들 (예: "남친", "엄마", "민준이").

출력은 JSON 만:
{
  "importance": 1~10 정수,
  "reason": "한 문장 이유",
  "emotion_label": "...",
  "emotion_scores": { "joy": 0.0, ... },
  "tags": ["...", "..."],
  "related_people": ["..."]
}`;

const FALLBACK: ImportanceResult = {
  importance: 5,
  reason: 'fallback (LLM 실패)',
  emotion_label: 'mixed',
  emotion_scores: { mixed: 1.0 },
  tags: [],
  related_people: [],
};

export async function scoreImportance(params: ScoreParams): Promise<ImportanceResult> {
  const { summary, scenario } = params;
  if (!summary || summary.trim().length < 20) return FALLBACK;

  const userMsg = `[상담 주제] ${scenario ?? '일반 연애 고민'}

[세션 요약]
${summary}

위 요약을 보고 importance / emotion / tags / related_people 을 JSON 으로.`;

  // Gemini Flash Lite 우선
  if (process.env.GEMINI_API_KEY) {
    try {
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const result = await client.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: [{ role: 'user', parts: [{ text: userMsg }] }],
        config: {
          systemInstruction: SYSTEM,
          temperature: 0.4,
          maxOutputTokens: 500,
        },
      });
      const parsed = parse(result.text ?? '');
      if (parsed) return parsed;
    } catch (err) {
      console.warn('[memory-v2/importance] Gemini 실패:', err);
    }
  }

  // Groq fallback
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
          max_tokens: 500,
          response_format: { type: 'json_object' },
        }),
      });
      const data = await res.json();
      const parsed = parse(data.choices?.[0]?.message?.content ?? '');
      if (parsed) return parsed;
    } catch (err) {
      console.warn('[memory-v2/importance] Groq 실패:', err);
    }
  }

  return FALLBACK;
}

function parse(text: string): ImportanceResult | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const p = JSON.parse(match[0]);
    const importance = Math.max(1, Math.min(10, Math.round(Number(p.importance) || 5)));
    const reason = String(p.reason ?? '').trim().slice(0, 200);
    const emotion_label = String(p.emotion_label ?? 'mixed') as EmotionLabel;
    const emotion_scores: Record<string, number> =
      p.emotion_scores && typeof p.emotion_scores === 'object' ? p.emotion_scores : { mixed: 1.0 };
    const tags = Array.isArray(p.tags) ? p.tags.map(String).filter(Boolean).slice(0, 8) : [];
    const related_people = Array.isArray(p.related_people)
      ? p.related_people.map(String).filter(Boolean).slice(0, 8)
      : [];
    return { importance, reason, emotion_label, emotion_scores, tags, related_people };
  } catch {
    return null;
  }
}
