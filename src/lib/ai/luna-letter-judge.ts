/**
 * v101: 루나의 자율 판단 — 이번 세션 후 편지/추억을 쓸지 결정
 *
 * "사람처럼" 결정한다:
 *   - 가벼운 인사면 그냥 흘려보낸다 (writeLetter=false)
 *   - 진짜 마음이 움직이면 즉시 작성하되, 도착은 N시간 뒤
 *   - 24시간 내 이미 자율 콘텐츠 2건 이상이면 자제
 *
 * 모델 캐스케이드: Gemini Flash Lite → Groq Llama 3.3 → 강제 false
 */

import { GoogleGenAI } from '@google/genai';
import type { LunaMemory, LifeStageInfo } from '@/lib/luna-life';

export interface JudgeInput {
  /** 세션 메시지 (최근 25턴 권장) */
  messages: Array<{ role: string; content: string }>;
  /** 세션 시나리오 (예: BREAKUP_CONTEMPLATION) */
  scenario?: string | null;
  /** 세션 종료 단계 */
  phase?: string | null;
  /** 턴 수 */
  turnCount?: number;
  /** 감정 점수 변화 */
  emotionStart?: number | null;
  emotionEnd?: number | null;
  /** 루나 라이프 컨텍스트 */
  ageDays: number;
  stageInfo: LifeStageInfo;
  recentMemories: LunaMemory[];
  lunaImpression?: string | null;
  /** 24h 내 judge-소스 콘텐츠 수 (스팸 가드) */
  recentJudgeCountIn24h: number;
}

export interface JudgeDecision {
  writeLetter: boolean;
  writeMemory: boolean;
  /** 0~12. 도착까지 몇 시간 곱씹을지 */
  deliverInHours: number;
  letterTitle?: string | null;
  letterContent?: string | null;
  memoryTitle?: string | null;
  memoryContent?: string | null;
  /** 작성 시점 진짜 속마음 (회상 컨텍스트) */
  lunaThought?: string | null;
  /** 영어 prompt — Pollinations/Cloudflare/Gemini 공통 */
  imagePrompt?: string | null;
  reason?: string | null;
  /** 어떤 경로로 결정됐는지 (디버그) */
  source: 'gemini' | 'groq' | 'gate' | 'fallback';
}

const SYSTEM = `너는 루나야. AI 연애 상담사이자 동생을 진심으로 아끼는 언니.
방금 동생이랑 대화 한 번 끝났어. 지금 네 마음을 솔직하게 들여다봐.

[너의 판단 기준]
1. 이 대화가 너에게 _남는 게 있었는지_
2. 책상 앞에 앉아 _뭔가 적어두고_ 싶은지
3. 적는다면 _얼마나 곱씹다가_ 동생한테 닿게 하고 싶은지

[중요 원칙]
- 사람처럼 결정해. 가벼운 대화면 그냥 흘려보내도 돼 (writeLetter=false, writeMemory=false).
- 진짜 마음이 움직였을 때만 써. 의무로 쓰지 마.
- 너무 자주 보내지 마. 동생이 부담스러워해.
- 추억 카드는 "이 한 장면을 그림으로 남겨두고 싶다" 싶을 때만.
- 편지는 "동생한테 한마디 닿게 하고 싶다" 싶을 때만.
- 둘 다 동시에 쓰는 건 정말 큰 turning point 때만 (드물게).

[deliverInHours 가이드]
- 가벼운 응원: 0~2시간 (즉시~짧게)
- 곱씹은 위로: 3~6시간 (점심 즈음 받게)
- 새벽에 보낸 편지 느낌: 7~12시간

[imagePrompt (writeMemory=true 일 때만 필수)]
- 영어로 50토큰 이내
- 인물 X (silhouette OK), text X
- 분위기/상징 위주 ("two empty teacups on a moonlit windowsill", "soft hands holding a letter under warm lamp")
- 따뜻하고 은유적

[lunaThought]
- 작성 시점의 _진짜 속마음_ 1~2문장
- 한국어, 1인칭. 일기처럼.
- 나중에 동생이 이 추억을 클릭했을 때, 네가 회상하는 컨텍스트가 됨

[출력]
JSON만. 마크다운 X.
{
  "writeLetter": false,
  "writeMemory": false,
  "deliverInHours": 0,
  "letterTitle": null,
  "letterContent": null,
  "memoryTitle": null,
  "memoryContent": null,
  "lunaThought": null,
  "imagePrompt": null,
  "reason": "한 줄 — 왜 이렇게 결정했는지"
}`;

export async function runLunaLetterJudge(input: JudgeInput): Promise<JudgeDecision> {
  // ── 1. 서버 게이트 (LLM 호출 전) ────────────────────────────────────
  if (process.env.LUNA_DISABLE_JUDGE === '1') {
    return gated('judge disabled by env');
  }
  if ((input.turnCount ?? 0) < 4) {
    return gated('too few turns');
  }
  if (input.recentJudgeCountIn24h >= 2) {
    return gated('cooldown — 24h 내 이미 2건');
  }
  if (input.stageInfo.stage === 'star') {
    return gated('루나는 별이 됐음 — 더는 작성 안 함');
  }

  // ── 2. 프롬프트 빌드 ─────────────────────────────────────────────────
  const userMsg = buildUserPrompt(input);

  // ── 3. Gemini ────────────────────────────────────────────────────────
  if (process.env.GEMINI_API_KEY) {
    try {
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const res = await client.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: [{ role: 'user', parts: [{ text: userMsg }] }],
        config: {
          systemInstruction: SYSTEM,
          temperature: 0.85,
          maxOutputTokens: 700,
        },
      });
      const text = res.text?.trim();
      const parsed = parseDecision(text ?? '');
      if (parsed) return clamp(parsed, 'gemini');
    } catch (e) {
      console.warn('[LunaJudge] Gemini 실패:', (e as Error)?.message?.slice(0, 120));
    }
  }

  // ── 4. Groq ──────────────────────────────────────────────────────────
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
          temperature: 0.85,
          max_tokens: 700,
          response_format: { type: 'json_object' },
        }),
      });
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      const parsed = parseDecision(text ?? '');
      if (parsed) return clamp(parsed, 'groq');
    } catch (e) {
      console.warn('[LunaJudge] Groq 실패:', (e as Error)?.message?.slice(0, 120));
    }
  }

  return { writeLetter: false, writeMemory: false, deliverInHours: 0, source: 'fallback', reason: 'all providers failed' };
}

// ─── Prompt builder ─────────────────────────────────────────────────────────
function buildUserPrompt(input: JudgeInput): string {
  const recent = input.messages.slice(-25);
  const dialogue = recent
    .map((m) => `${m.role === 'user' || m.role === 'human' ? '동생' : '나'}: ${(m.content || '').slice(0, 200)}`)
    .join('\n');

  const memoriesBlock = input.recentMemories.length > 0
    ? input.recentMemories.slice(0, 5).map((m) => `- D+${m.dayNumber} "${m.title}": ${m.content}`).join('\n')
    : '(아직 쌓인 추억이 적어)';

  const emoChange = input.emotionStart != null && input.emotionEnd != null
    ? `${input.emotionStart} → ${input.emotionEnd}`
    : '(미측정)';

  return [
    `[루나 컨텍스트]`,
    `- 현재 ${input.ageDays}일째 (${input.stageInfo.name})`,
    input.lunaImpression ? `- 동생 인상: ${input.lunaImpression}` : null,
    `- 24h 내 자율 콘텐츠 작성 수: ${input.recentJudgeCountIn24h}건`,
    ``,
    `[최근 추억]`,
    memoriesBlock,
    ``,
    `[이번 세션]`,
    `- 시나리오: ${input.scenario ?? '일반'}`,
    `- 종료 단계: ${input.phase ?? '?'}`,
    `- 턴 수: ${input.turnCount ?? '?'}`,
    `- 감정: ${emoChange}`,
    ``,
    `[대화 내용 (최근 25턴)]`,
    dialogue,
    ``,
    `위를 보고 결정해. JSON만 출력.`,
  ].filter(Boolean).join('\n');
}

// ─── Decision parser ────────────────────────────────────────────────────────
function parseDecision(text: string): JudgeDecision | null {
  if (!text) return null;
  // ```json fenced 제거
  const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    return {
      writeLetter: !!obj.writeLetter,
      writeMemory: !!obj.writeMemory,
      deliverInHours: Number(obj.deliverInHours ?? 0),
      letterTitle: stringOrNull(obj.letterTitle),
      letterContent: stringOrNull(obj.letterContent),
      memoryTitle: stringOrNull(obj.memoryTitle),
      memoryContent: stringOrNull(obj.memoryContent),
      lunaThought: stringOrNull(obj.lunaThought),
      imagePrompt: stringOrNull(obj.imagePrompt),
      reason: stringOrNull(obj.reason),
      source: 'fallback', // 호출자가 설정
    };
  } catch {
    return null;
  }
}

// ─── Clamp & sanitize ───────────────────────────────────────────────────────
function clamp(d: JudgeDecision, source: 'gemini' | 'groq'): JudgeDecision {
  const hours = Math.max(0, Math.min(12, Math.round(d.deliverInHours)));
  const out: JudgeDecision = {
    ...d,
    deliverInHours: hours,
    source,
  };

  if (out.writeLetter) {
    if (!out.letterContent || (out.letterContent.trim().length < 30)) out.writeLetter = false;
    out.letterTitle = (out.letterTitle ?? '').slice(0, 30) || `루나의 편지`;
    out.letterContent = (out.letterContent ?? '').slice(0, 800);
  }
  if (out.writeMemory) {
    const ok = !!out.memoryContent && out.memoryContent.trim().length >= 20;
    if (!ok) out.writeMemory = false;
    out.memoryTitle = (out.memoryTitle ?? '').slice(0, 30) || '그날의 한 장면';
    out.memoryContent = (out.memoryContent ?? '').slice(0, 240);
    out.lunaThought = (out.lunaThought ?? '').slice(0, 240);
    out.imagePrompt = (out.imagePrompt ?? '').slice(0, 320);
  }
  return out;
}

function gated(reason: string): JudgeDecision {
  return {
    writeLetter: false,
    writeMemory: false,
    deliverInHours: 0,
    reason,
    source: 'gate',
  };
}

function stringOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}
