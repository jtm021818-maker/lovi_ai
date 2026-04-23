/**
 * 💜 v87: WarmWrapSynthesizer — LLM 이 [WARM_WRAP] 태그 빠뜨렸을 때 자동 합성 폴백
 *
 * EMPOWER 진입 후 AI 가 태그 안 찍고 자연스럽게 흘려보내면,
 * SessionSummary "보고서" 만 덜렁 뜨는 버그 → 이걸 방지.
 *
 * Gemini Flash-Lite 합성 (~₩2). 실패 시 하드 폴백.
 */

import { GoogleGenAI } from '@google/genai';
import { LUNA_SYNTHESIS_PREAMBLE } from './luna-tone';

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface WarmWrapSynthesisParams {
  recentTurns: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** 감정 변화 힌트 — emotionBaseline → currentEmotionScore */
  emotionShiftHint?: { before: number; after: number } | null;
  /** ACTION_PLAN 의 제목/핵심 액션 (연결감용) */
  actionPlanTitle?: string;
}

export interface SynthesizedWarmWrap {
  strengthFound: string;
  emotionShift: string;
  nextStep: string;
  lunaMessage: string;
}

function buildTurnsText(turns: WarmWrapSynthesisParams['recentTurns']): string {
  return turns
    .slice(-14)
    .map((t) => `${t.role === 'user' ? '[동생]' : '[루나]'} ${t.content.slice(0, 240)}`)
    .join('\n');
}

function buildPrompt(p: WarmWrapSynthesisParams): string {
  const turnsText = buildTurnsText(p.recentTurns);
  const shiftHint = p.emotionShiftHint
    ? `감정 대략 ${p.emotionShiftHint.before > 0 ? '+' : ''}${p.emotionShiftHint.before} → ${p.emotionShiftHint.after > 0 ? '+' : ''}${p.emotionShiftHint.after}`
    : '';
  const planHint = p.actionPlanTitle ? `\n작전명: "${p.actionPlanTitle}"` : '';

  return `${LUNA_SYNTHESIS_PREAMBLE}

[상황]
동생이랑 대화 거의 끝났어. 마지막으로 언니가 쪽지 하나 쥐어주는 타이밍.
"야 오늘 진짜 잘했어" 톤. 보고서 금지. 카톡 답장 치는 언니 느낌.
${shiftHint ? `감정 변화 힌트: ${shiftHint}\n` : ''}${planHint}

[최근 대화]
${turnsText}

[출력 규칙 — JSON 만]
{
  "strengthFound": "오늘 발견한 동생 강점 한 줄 ~30자 (형용사+명사 조합, '~점' 으로 끝나게)",
  "emotionShift": "처음이랑 지금 감정 비교 한 줄 ~30자 ('처음엔 ~했는데 지금은 ~' 톤)",
  "nextStep": "부드러운 다음 한 걸음 ~30자 (숙제 금지, 부드러운 권유)",
  "lunaMessage": "루나의 진심 한 마디 ~25자 (💜 넣어도 됨)"
}

⚠️ 규칙
- 전부 반말, 언니 톤.
- "세션" / "종료" / "상담" / "오늘 상담" 금지.
- 각 필드 짧고 임팩트 있게.
- 설명 없이 JSON 만.`;
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

function hardFallback(): SynthesizedWarmWrap {
  return {
    strengthFound: '끝까지 마음 들여다본 그 솔직함',
    emotionShift: '처음엔 답답했는데 지금은 좀 숨 쉬어지지?',
    nextStep: '해보고 어땠는지 꼭 알려줘 — 진짜 궁금해',
    lunaMessage: '네 편이야, 잊지 마 💜',
  };
}

function clampStr(v: unknown, max: number, fallback: string): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return fallback;
  return s.length > max ? s.slice(0, max) : s;
}

export async function synthesizeWarmWrap(
  params: WarmWrapSynthesisParams,
): Promise<SynthesizedWarmWrap> {
  try {
    const prompt = buildPrompt(params);
    const response = await gemini.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      config: { maxOutputTokens: 500, temperature: 0.75 },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const raw = (response.text ?? '').trim();
    const parsed = extractJson(raw);
    if (!parsed) return hardFallback();
    const fb = hardFallback();
    return {
      strengthFound: clampStr(parsed.strengthFound, 80, fb.strengthFound),
      emotionShift: clampStr(parsed.emotionShift, 80, fb.emotionShift),
      nextStep: clampStr(parsed.nextStep, 80, fb.nextStep),
      lunaMessage: clampStr(parsed.lunaMessage, 80, fb.lunaMessage),
    };
  } catch (err) {
    console.error('[WarmWrapSynth] ❌ 합성 실패:', err);
    return hardFallback();
  }
}
