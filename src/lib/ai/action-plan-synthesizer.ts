/**
 * 🎯 v87: ActionPlanSynthesizer — LLM 이 [ACTION_PLAN] 태그 빠뜨렸을 때 자동 합성 폴백
 *
 * 사용 시나리오:
 *  - SOLVE 진입했는데 2턴 넘게 [ACTION_PLAN] 태그 안 찍힘
 *  - EMPOWER 진입 직전인데 ACTION_PLAN 이벤트가 아직 completedEvents 에 없음
 *
 * Gemini Flash-Lite 로 저비용 합성 (~₩3/호출). 실패 시 하드 폴백.
 */

import { GoogleGenAI } from '@google/genai';
import { LUNA_SYNTHESIS_PREAMBLE } from './luna-tone';

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface ActionPlanSynthesisParams {
  /** 최근 대화 (user/assistant 페어, 최대 10~12턴) */
  recentTurns: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** 결정된 외부 선택 힌트 (데이트 장소/선물/활동명) — 있으면 앞단에 섞어서 힌트 */
  confirmedChoice?: {
    kind: 'date_spot' | 'gift' | 'activity' | 'anniversary' | 'movie' | 'song' | 'other';
    name: string;
    detail?: string;
  } | null;
  /** 시나리오 (READ_AND_IGNORED 등) — 없으면 general */
  scenario?: string;
}

export interface SynthesizedActionPlan {
  planType: 'kakao_draft' | 'roleplay' | 'panel' | 'custom';
  lunaIntro: string;
  title: string;
  coreAction: string;
  sharedResult: string;
  planB: string;
  timingHint: string;
  lunaJoke: string;
  lunaCheer: string;
}

function buildTurnsText(turns: ActionPlanSynthesisParams['recentTurns']): string {
  return turns
    .slice(-12)
    .map((t) => `${t.role === 'user' ? '[동생]' : '[루나]'} ${t.content.slice(0, 280)}`)
    .join('\n');
}

function buildPrompt(p: ActionPlanSynthesisParams): string {
  const turnsText = buildTurnsText(p.recentTurns);
  const choiceText = p.confirmedChoice
    ? `\n[이미 결정된 것]\n- ${p.confirmedChoice.kind}: "${p.confirmedChoice.name}"${p.confirmedChoice.detail ? ` — ${p.confirmedChoice.detail}` : ''}\n`
    : '';

  return `${LUNA_SYNTHESIS_PREAMBLE}

[상황]
동생이랑 여태 얘기 나눴고, 지금 "실행 계획" 단계야.
루나(언니)가 동생한테 "자, 오늘의 작전 정리해줄게" 카드를 건네야 해.
학술 요약 아님. 언니가 노트에 정리해서 쥐어주는 느낌.
${choiceText}
[최근 대화]
${turnsText}

[출력 규칙 — JSON 만, 코드블록/설명 금지]
{
  "planType": "custom | kakao_draft | roleplay | panel",
  "lunaIntro": "자 여태 얘기 정리해줄게. '처음엔 ~ 고민이었잖아, 근데 얘기하다 보니까 ~ 부분이 진짜였고, 그래서 우리가 ~ 로 가기로 한 거지' 톤 2~3문장. 한 호흡.",
  "title": "작전 이름 ~15자 (짧고 강렬)",
  "coreAction": "언제/어디서/어떻게가 한 줄에 박히게 ~35자",
  "sharedResult": "같이 만든 실제 내용 (카톡 초안이면 따옴표로 실제 문구, 장소면 디테일 1~2줄)",
  "planB": "안 먹힐 때 대안 ~30자 — 없으면 빈 문자열",
  "timingHint": "실행 타이밍 ~15자 — 없으면 빈 문자열",
  "lunaJoke": "긴장 풀어주는 언니 농담 1줄 ~30자 — 왠만하면 꼭 넣기",
  "lunaCheer": "진심 응원 한 마디 ~25자"
}

⚠️ 규칙
- 반말, 언니 톤.
- planType 선택 기준:
  - 카톡 초안이 대화에 있으면 → kakao_draft
  - 롤플레이/시뮬레이션 했으면 → roleplay
  - 연참/피드백 정리 했으면 → panel
  - 그 외 (데이트/선물/행동 등) → custom
- lunaIntro 는 반드시 "대화 종합" — 처음 고민 → 중간 발견 → 결정 흐름.
- sharedResult 에는 실제 결정한 구체물 (장소명, 초안 문장, 선물명 등)을 꼭 담아.
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

function hardFallback(p: ActionPlanSynthesisParams): SynthesizedActionPlan {
  const choice = p.confirmedChoice;
  const title = choice ? `${choice.name} 작전` : '오늘의 작전';
  const coreAction = choice
    ? `${choice.name}${choice.detail ? ` — ${choice.detail}` : ''} 실행`
    : '지금까지 얘기한 대로 행동으로 옮기기';
  return {
    planType: 'custom',
    lunaIntro: '여태 얘기한 거 정리하자면, 네가 충분히 고민한 끝에 결정한 거야. 이제 실행만 남았어.',
    title,
    coreAction,
    sharedResult: choice?.detail ?? '같이 짠 대로 천천히 해봐',
    planB: '안 되면 편하게 다시 얘기하자',
    timingHint: '준비되는 대로',
    lunaJoke: '솔직히 여기까지 온 것만도 대단해 진짜 ㅋㅋ',
    lunaCheer: '해보고 어땠는지 꼭 알려줘 💜',
  };
}

function clampStr(v: unknown, max: number, fallback = ''): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return fallback;
  return s.length > max ? s.slice(0, max) : s;
}

export async function synthesizeActionPlan(
  params: ActionPlanSynthesisParams,
): Promise<SynthesizedActionPlan> {
  try {
    const prompt = buildPrompt(params);
    const response = await gemini.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      config: { maxOutputTokens: 900, temperature: 0.7 },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const raw = (response.text ?? '').trim();
    const parsed = extractJson(raw);
    if (!parsed) {
      console.warn(`[ActionPlanSynth] ⚠️ JSON 파싱 실패 — raw(앞 200): ${raw.slice(0, 200)}`);
      return hardFallback(params);
    }

    const planType = ['custom', 'kakao_draft', 'roleplay', 'panel'].includes(parsed.planType)
      ? (parsed.planType as SynthesizedActionPlan['planType'])
      : 'custom';

    return {
      planType,
      lunaIntro: clampStr(parsed.lunaIntro, 300, hardFallback(params).lunaIntro),
      title: clampStr(parsed.title, 30, '오늘의 작전'),
      coreAction: clampStr(parsed.coreAction, 80, hardFallback(params).coreAction),
      sharedResult: clampStr(parsed.sharedResult, 200, ''),
      planB: clampStr(parsed.planB, 80, ''),
      timingHint: clampStr(parsed.timingHint, 30, ''),
      lunaJoke: clampStr(parsed.lunaJoke, 80, ''),
      lunaCheer: clampStr(parsed.lunaCheer, 60, '해보고 어땠는지 꼭 알려줘 💜'),
    };
  } catch (err) {
    console.error('[ActionPlanSynth] ❌ 합성 실패, 하드 폴백:', err);
    return hardFallback(params);
  }
}
