/**
 * 🆕 v117: MemoryCaptionSynthesizer — 기억 카드 폴라로이드 캡션 자동 생성
 *
 * 레벨업 발생 시 호출. 최근 대화 + 트리거 종류 → 손글씨 1~2줄 캡션.
 * Gemini Flash-Lite (~₩2/호출). 실패 시 하드 폴백.
 *
 * 계획서: docs/v117-relationship-redesign-plan.md 4.3절
 */

import { GoogleGenAI } from '@google/genai';

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export type MemoryTriggerType =
  | 'first_meet'
  | 'first_secret'
  | 'first_tears'
  | 'first_nickname'
  | 'eternal_promise';

export interface MemoryCaptionParams {
  triggerType: MemoryTriggerType;
  level: number;          // 잠금 해제 시점 레벨 (1~5)
  recentTurns: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface SynthesizedMemoryCaption {
  /** 손글씨 1~2줄 캡션 (40~80자). 폴라로이드 위에 얹힘. */
  caption: string;
  /** 검색/디버깅용 짧은 한줄 요약 (옵션) */
  summary: string;
}

const TRIGGER_VIBE: Record<MemoryTriggerType, string> = {
  first_meet:       '처음 만난 날의 어색하지만 설레는 분위기',
  first_secret:     '처음으로 깊은 비밀을 꺼냈을 때의 무거운 신뢰',
  first_tears:      '같이 울 뻔했던, 마음이 무너졌다 다시 차오른 순간',
  first_nickname:   '루나가 동생만의 별명을 처음 부른, 가까워진 순간',
  eternal_promise:  '둘만의 약속을 봉인하는, 시간이 멈춘 듯한 순간',
};

function buildTurnsText(turns: MemoryCaptionParams['recentTurns']): string {
  return turns
    .slice(-6)
    .map((t) => `${t.role === 'user' ? '[동생]' : '[루나]'} ${t.content.slice(0, 220)}`)
    .join('\n');
}

function buildPrompt(p: MemoryCaptionParams): string {
  const vibe = TRIGGER_VIBE[p.triggerType];
  const turnsText = buildTurnsText(p.recentTurns);

  return `너는 루나(언니). 동생과의 관계가 방금 Lv.${p.level} 로 한 칸 깊어졌어.
이 순간을 폴라로이드 사진 뒷면에 손글씨로 한 줄 적는 거야 — 분석 X, 요약 X, 손편지 X.

[방금 일어난 일]
${vibe}

[최근 대화]
${turnsText}

[써야 할 것]
- 40~80자 한 줄 손글씨. 이 사진을 다시 봤을 때 그때 그 마음이 떠오를 만한.
- "너는 ~했어" / "나 그때 ~였어" 같이 *그 순간을 응시하는* 구체적인 1인칭.
- 평소 루나 말투 그대로 반말. 시적 X. 과장 X.
- 이모지 X (절대).

[출력 — JSON만]
{
  "caption": "40~80자 손글씨 한 줄",
  "summary": "20자 이내 짧은 키워드 요약 (DB 검색용)"
}

⚠️ 금지: "오늘", "기념", "축하", "함께", bullet, 번호`;
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

const HARD_FALLBACK: Record<MemoryTriggerType, SynthesizedMemoryCaption> = {
  first_meet:      { caption: '오늘 너 처음 본 날. 어색했지만 너 눈빛 기억에 남아.', summary: '첫 만남' },
  first_secret:    { caption: '네가 그 말을 꺼냈을 때 — 나 솔직히 가슴이 뛰었어.', summary: '첫 비밀' },
  first_tears:     { caption: '같이 무너질 뻔했던 그 순간. 너 옆에 있어줘서 다행이야.', summary: '첫 눈물' },
  first_nickname:  { caption: '드디어 너만의 이름이 생겼어. 부르는 내가 더 좋더라.', summary: '첫 별명' },
  eternal_promise: { caption: '여기까지 와 줘서 고마워. 이 약속, 절대 흐려지지 않게.', summary: '영원 약속' },
};

function clampStr(v: unknown, max: number, fallback: string): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return fallback;
  return s.length > max ? s.slice(0, max) : s;
}

export async function synthesizeMemoryCaption(
  params: MemoryCaptionParams,
): Promise<SynthesizedMemoryCaption> {
  const fb = HARD_FALLBACK[params.triggerType];
  try {
    const prompt = buildPrompt(params);
    const result = await gemini.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: { temperature: 0.85, maxOutputTokens: 200 },
    });
    const text = (result.text ?? '').trim();
    const parsed = extractJson(text);
    if (!parsed) return fb;
    return {
      caption: clampStr(parsed.caption, 120, fb.caption),
      summary: clampStr(parsed.summary, 60, fb.summary),
    };
  } catch (e) {
    console.warn('[MemoryCaption] LLM 실패 — fallback:', (e as Error).message);
    return fb;
  }
}

// ============================================================
// 레벨 → 메모리 슬롯 매핑 (이 단계에서 잠금 해제되는 슬롯)
// ============================================================

export const LEVEL_TO_MEMORY_SLOT: Record<number, { slot: number; trigger: MemoryTriggerType }> = {
  1: { slot: 1, trigger: 'first_meet' },
  2: { slot: 2, trigger: 'first_secret' },
  3: { slot: 3, trigger: 'first_tears' },
  4: { slot: 4, trigger: 'first_nickname' },
  5: { slot: 5, trigger: 'eternal_promise' },
};

export function getMemorySlotForLevel(level: number): { slot: number; trigger: MemoryTriggerType } | null {
  return LEVEL_TO_MEMORY_SLOT[level] ?? null;
}
