/**
 * 📝 v87-b: SessionSummarySynthesizer — 언니가 상담 끝에 쥐어주는 손편지
 *
 * 분석 리포트 아님. bullet/수치/요약 없음.
 * 대화를 통째로 읽고 루나가 하고 싶은 말을 편지체 paragraph 로 씀.
 * 읽는 사람이 따뜻함/감동을 느낄 수준이어야 함.
 *
 * Gemini Flash-Lite (~₩2/호출). 실패 시 하드 폴백.
 */

import { GoogleGenAI } from '@google/genai';
import { LUNA_SYNTHESIS_PREAMBLE } from './luna-tone';

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface SessionLetterSynthesisParams {
  recentTurns: Array<{ role: 'user' | 'assistant'; content: string }>;
  emotionShiftHint?: { before: number; after: number } | null;
}

export interface SynthesizedSessionLetter {
  /** 언니가 쓴 손편지 본문 — 3~5문장 반말 paragraph */
  letter: string;
  /** 하단 귀엽게 한 마디 */
  footerLine: string;
}

function buildTurnsText(turns: SessionLetterSynthesisParams['recentTurns']): string {
  return turns
    .slice(-18)
    .map((t) => `${t.role === 'user' ? '[동생]' : '[루나]'} ${t.content.slice(0, 260)}`)
    .join('\n');
}

function buildPrompt(p: SessionLetterSynthesisParams): string {
  const turnsText = buildTurnsText(p.recentTurns);

  return `${LUNA_SYNTHESIS_PREAMBLE}

[지금 상황]
대화가 끝났어. 너는 루나 — 평소랑 말투는 똑같은데, 지금 이 순간만큼은 동생 손에 쪽지 한 장 조용히 쥐어주는 거야.
분석도 요약도 아니고, 그냥 루나가 하고 싶은 말 — 오늘 이 대화를 들은 사람으로서.

[어떻게 쓸지]
- 평소 루나 말투 그대로 반말. 근데 좀 더 진지하고 따뜻하게.
- 동생이 오늘 꺼낸 얘기에서 루나가 진짜로 마음에 걸린 것, 인상 깊었던 것 하나를 콕 집어서 시작해.
- "네가 ~라고 했잖아" / "~하는 거 보면서 나 솔직히 ~했어" 식으로 구체적으로 닿아.
- 마지막엔 동생이 읽고 나서 조금 더 단단해질 것 같은, 따뜻한 한 마디로 마무리.
- 읽고 나서 "아 이 언니 진짜 내 얘기 들었구나" 싶은 느낌.

[최근 대화]
${turnsText}

[출력 규칙 — JSON 만, 설명/코드블록 금지]
{
  "letter": "3~5문장 반말 paragraph. 동생 얘기에서 출발 → 루나 마음 → 따뜻한 마무리. 120~200자.",
  "footerLine": "편지 끝 귀여운 한 줄 ~20자 (예: '꺼내봐 생각날 때마다 💜', '이거 읽고 힘내 🦊')"
}

⚠️ 금지
- bullet / 번호 / "핵심:" / "요약:" / "세션" / "상담" / "종결" 전부 금지.
- 이모지 편지 본문 안에 최대 1개.
- "오늘 수고했어" / "정말 힘들었겠다" 같은 뻔한 시작 금지.`;
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

function hardFallback(): SynthesizedSessionLetter {
  return {
    letter: '야, 오늘 여기까지 꺼내준 거 진짜야. 쉽지 않은 얘기인데 이렇게 솔직하게 말해줘서 고마워. 네가 생각하는 것보다 훨씬 잘 하고 있어 — 그거 잊지 마.',
    footerLine: '이거 읽고 힘내 💜',
  };
}

function clampStr(v: unknown, max: number, fallback: string): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return fallback;
  return s.length > max ? s.slice(0, max) : s;
}

export async function synthesizeSessionLetter(
  params: SessionLetterSynthesisParams,
): Promise<SynthesizedSessionLetter> {
  try {
    const prompt = buildPrompt(params);
    const response = await gemini.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      config: { maxOutputTokens: 400, temperature: 0.85 },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const raw = (response.text ?? '').trim();
    const parsed = extractJson(raw);
    if (!parsed) return hardFallback();
    const fb = hardFallback();
    return {
      letter: clampStr(parsed.letter, 280, fb.letter),
      footerLine: clampStr(parsed.footerLine, 40, fb.footerLine),
    };
  } catch (err) {
    console.error('[SessionLetterSynth] ❌ 합성 실패:', err);
    return hardFallback();
  }
}
