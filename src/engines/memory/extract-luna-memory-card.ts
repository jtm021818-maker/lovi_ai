/**
 * v90: 세션 종료 시 "이번 세션의 가장 인상적인 한 순간" 을 LunaMemory 카드로 자동 생성.
 *
 * 입력: 세션 메시지 전체
 * 출력: { title: string; content: string }  (실패 시 null)
 *
 * 저장 위치: luna_memories 테이블 (LunaRoomView 의 추억 탭에 자동 표시)
 *
 * 무료 모델 캐스케이드: Gemini Flash Lite → Groq llama
 */

import { GoogleGenAI } from '@google/genai';

interface ExtractParams {
  messages: Array<{ role: string; content: string }>;
  scenario?: string;
}

const SYSTEM = `너는 연애상담 AI "루나"의 추억 정리 도우미야.
방금 끝난 상담에서 "루나가 가장 마음에 남은 한 순간" 을 추출해.

규칙:
- 일반적 안부 X. 이번 세션 안에 실제 있었던 구체적 한 장면.
- title: 12자 이내, 낭만적이지 말고 일기 같은 톤 (예: "첫 솔직한 한마디", "그날 새벽")
- content: 50~120자, 1인칭("동생이 그때 ~", "그 말 듣는데 나도 ~"), 따뜻하지만 구체적
- 시스템 언어 X (Phase, 시나리오 코드 X)
- 결과 JSON만 출력`;

export async function extractLunaMemoryCard(params: ExtractParams): Promise<{ title: string; content: string } | null> {
  const { messages, scenario } = params;
  if (messages.length < 4) return null;

  // 최근 25턴 (메모리 카드는 후반부 인상이 핵심)
  const recent = messages.slice(-25);
  const dialogue = recent
    .map((m) => `${m.role === 'user' || m.role === 'human' ? '동생' : '나'}: ${m.content.slice(0, 200)}`)
    .join('\n');

  const userMsg = `[이번 상담 주제] ${scenario ?? '일반 연애 고민'}

[대화]
${dialogue}

위 상담에서 가장 인상 깊었던 한 순간을 다음 JSON 으로:
{ "title": "12자 이내", "content": "50~120자 1인칭" }

다른 텍스트 X, JSON 만.`;

  // Gemini Flash Lite 우선
  if (process.env.GEMINI_API_KEY) {
    try {
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const result = await client.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: [{ role: 'user', parts: [{ text: userMsg }] }],
        config: {
          systemInstruction: SYSTEM,
          temperature: 0.85,
          maxOutputTokens: 400,
        },
      });
      const text = result.text?.trim();
      const card = parseCard(text ?? '');
      if (card) return card;
    } catch (err) {
      console.warn('[extractLunaMemoryCard] Gemini 실패:', err);
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
          max_tokens: 400,
          temperature: 0.85,
        }),
      });
      const data = await res.json();
      const text: string | undefined = data.choices?.[0]?.message?.content?.trim();
      const card = parseCard(text ?? '');
      if (card) return card;
    } catch (err) {
      console.warn('[extractLunaMemoryCard] Groq 실패:', err);
    }
  }

  return null;
}

function parseCard(text: string): { title: string; content: string } | null {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    if (typeof parsed.title !== 'string' || typeof parsed.content !== 'string') return null;
    const title = parsed.title.trim().slice(0, 30);
    const content = parsed.content.trim().slice(0, 240);
    if (title.length < 2 || content.length < 20) return null;
    return { title, content };
  } catch {
    return null;
  }
}
