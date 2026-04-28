/**
 * LLM 기반 풍부한 session_summary 생성 (v90)
 *
 * 기존 문제: complete/route.ts:generateSummary() 가 60자 단문 ("읽씹에 대해 12턴…")
 *           → 다음 세션에서 루나가 활용할 정보 없음
 *
 * 해결: Gemini Flash Lite 로 200~400자 풍부한 요약 (무료)
 *       실패 시 Groq llama → 그것도 실패 시 기존 규칙 기반 fallback
 *
 * 출력 형식: 1인칭 ("동생이…") 시점, 다음 세션에서 루나가 자연스럽게 회상하기 좋게.
 */

import { GoogleGenAI } from '@google/genai';

interface GenerateParams {
  scenario: string;          // 한국어 라벨 (예: "읽씹 상황")
  phase: string;             // 한국어 라벨 (예: "패턴 분석 중")
  turnCount: number;
  emotionStart?: number | null;
  emotionEnd: number;
  messages: Array<{ role: string; content: string }>;
}

const SUMMARY_SYSTEM = `너는 연애상담 AI "루나"의 기억 정리 도우미야.
방금 끝난 상담을 한 단락으로 요약해.

규칙:
- 200~400자 (너무 짧지도 길지도 X)
- 1인칭 시점: "동생이 ~", "내가 보기엔 ~"
- 포함할 것 (있을 때):
  · 동생이 가져온 핵심 고민 (구체적 인물/사건 이름까지)
  · 세션 중 가장 큰 감정 전환점
  · 동생이 도달한 인사이트나 결심 (있다면)
  · 다음 세션에서 자연스럽게 물어볼 거리 1개
- 진단 용어/번호("Phase 2") 같은 시스템 언어 X
- 결말은 "다음에 ___ 어떻게 됐는지 물어봐야겠어" 같은 상기 hook 으로 끝내기`;

export async function generateLLMSummary(params: GenerateParams): Promise<string | null> {
  const { scenario, phase, turnCount, emotionStart, emotionEnd, messages } = params;

  // 메시지가 너무 적으면 LLM 가치 없음
  if (messages.length < 4) return null;

  // 최근 30턴 (앞부분 잘라냄, 핵심은 후반부에 있음)
  const recent = messages.slice(-30);
  const dialogue = recent
    .map((m) => `${m.role === 'user' || m.role === 'human' ? '동생' : '나'}: ${m.content.slice(0, 280)}`)
    .join('\n');

  const emotionDelta =
    emotionStart != null ? (emotionEnd - emotionStart).toFixed(1) : '?';

  const userMsg = `[세션 메타]
주제: ${scenario}
진행: ${phase}
${turnCount}턴, 감정 ${emotionStart ?? '?'}→${emotionEnd} (Δ${emotionDelta})

[대화]
${dialogue}

위 상담을 요약해.`;

  // 1순위: Gemini Flash Lite (무료, 빠름)
  if (process.env.GEMINI_API_KEY) {
    try {
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const result = await client.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: [{ role: 'user', parts: [{ text: userMsg }] }],
        config: {
          systemInstruction: SUMMARY_SYSTEM,
          temperature: 0.7,
          maxOutputTokens: 600,
        },
      });
      const text = result.text?.trim();
      if (text && text.length >= 80) return text;
    } catch (err) {
      console.warn('[generateLLMSummary] Gemini 실패 → Groq:', err);
    }
  }

  // 2순위: Groq llama (무료)
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
            { role: 'system', content: SUMMARY_SYSTEM },
            { role: 'user', content: userMsg },
          ],
          max_tokens: 600,
          temperature: 0.7,
        }),
      });
      const data = await res.json();
      const text: string | undefined = data.choices?.[0]?.message?.content?.trim();
      if (text && text.length >= 80) return text;
    } catch (err) {
      console.warn('[generateLLMSummary] Groq 실패:', err);
    }
  }

  return null; // 호출자가 fallback 처리
}
