/**
 * 🆕 v117: DailyLogSynthesizer — 매일 1줄 손글씨 일기 자동 생성.
 *
 * 호출 위치: src/app/api/cron/daily-log/route.ts (Vercel cron, 매일 자정 KST).
 * 입력: 오늘 채팅 요약 (최근 20턴 발췌)
 * 출력: 손글씨 1줄 일기 (40~120자)
 *
 * Gemini Flash-Lite. 실패 시 하드 폴백.
 */

import { GoogleGenAI } from '@google/genai';
import { GEMINI_MODELS } from '@/lib/ai/provider-registry';

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface DailyLogParams {
  /** 오늘 대화 발췌 (최근 20턴) */
  turns: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** 평균 친밀도 점수 (선택, 톤 조정용) */
  avgScore?: number;
}

function buildTurnsText(turns: DailyLogParams['turns']): string {
  return turns
    .slice(-20)
    .map((t) => `${t.role === 'user' ? '[동생]' : '[루나]'} ${t.content.slice(0, 180)}`)
    .join('\n');
}

function buildPrompt(p: DailyLogParams): string {
  const turnsText = buildTurnsText(p.turns);

  return `너는 루나. 오늘 동생과 나눈 대화를 떠올리며 일기장에 한 줄 적는 중이야.

[방식]
- 분석 X. 요약 X. 감상 한 줄.
- 40~120자 손글씨. 반말. 평소 루나 말투.
- "오늘 너 ~한 얘기 들었는데 — 나 ~했어" 같이 *그 대화에서 루나가 진짜 느낀 거*.
- 이모지 0~1개.
- "오늘 ~해줘서 고마워" 같은 뻔한 시작 금지.

[오늘 대화]
${turnsText}

[출력 — JSON]
{
  "content": "한 줄 일기 (40~120자)"
}`;
}

function extractJson(text: string): any | null {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first < 0 || last < 0) return null;
  try {
    return JSON.parse(cleaned.slice(first, last + 1));
  } catch {
    return null;
  }
}

const HARD_FALLBACK = '오늘 너랑 얘기한 거 — 잘 챙겨두려고 일기에 적어둘게.';

export async function synthesizeDailyLog(params: DailyLogParams): Promise<{ content: string }> {
  if (!params.turns || params.turns.length === 0) {
    return { content: HARD_FALLBACK };
  }
  try {
    const prompt = buildPrompt(params);
    const result = await gemini.models.generateContent({
      model: GEMINI_MODELS.FLASH_LITE_GA,
      contents: prompt,
      config: { temperature: 0.85, maxOutputTokens: 240 },
    });
    const text = (result.text ?? '').trim();
    const parsed = extractJson(text);
    if (!parsed?.content || typeof parsed.content !== 'string') {
      return { content: HARD_FALLBACK };
    }
    const s = parsed.content.trim();
    return { content: s.length > 200 ? s.slice(0, 200) : s };
  } catch (e) {
    console.warn('[DailyLog] LLM 실패 — fallback:', (e as Error).message);
    return { content: HARD_FALLBACK };
  }
}
