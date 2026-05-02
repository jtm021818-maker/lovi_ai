/**
 * 🧚 v104: Spirit Event Synthesizer
 *
 * 게이트 통과 후 카드 데이터 합성:
 *   - Type A (정적 풀): pickStaticData
 *   - Type B (LLM 합성): Gemini Flash-Lite + JSON 파싱 + safety guard
 *   - 특수: BOLT_CARD 메타 (다른 정령 픽), METAMORPHOSIS / MEMORY_KEY (DB 통계 enrichment)
 *
 * 실패 시 모든 경로는 fallback static 으로 graceful degrade.
 */

import { GoogleGenAI } from '@google/genai';
import type { SpiritId } from '@/types/spirit.types';
import {
  SPIRIT_TYPE_A,
  SPIRIT_TO_EVENT,
  SPIRIT_PHASE_WHITELIST,
  isPhaseAllowed,
} from './spirit-event-config';
import {
  pickStaticData,
  pickFallbackData,
  pickRageLetterFallback,
  pickThinkFrameFallback,
} from './spirit-event-fallbacks';
import { SPIRIT_EVENT_PROMPTS, containsUnsafePatternInJson } from './spirit-event-prompts';
import {
  fetchRecentUserMessages,
  fetchSessionsStat,
  extractRepeatedNgrams,
  computeTopWords,
} from './spirit-event-repo';
import type {
  SpiritEventDataAny,
  SpiritEventType,
  SynthesizerCtx,
  SpiritEventOption,
  RageLetterData,
  ThinkFrameData,
  RhythmCheckData,
  OliveBranchData,
  CloudReframeData,
  LetterBridgeData,
  NightConfessionData,
  ReverseRoleData,
  ButterflyDiaryData,
  FallenPetalsData,
  MetamorphosisData,
  MemoryKeyData,
  CrownReclaimData,
  WishGrantData,
  BoltCardData,
} from './spirit-event-types';

// ────────────────────────────────────────────────────────────
// Gemini 클라이언트 (모듈 단일 인스턴스)
// ────────────────────────────────────────────────────────────
let _gemini: GoogleGenAI | null = null;
function gemini(): GoogleGenAI {
  if (!_gemini) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('[spirit-event-synth] GEMINI_API_KEY missing');
    _gemini = new GoogleGenAI({ apiKey });
  }
  return _gemini;
}

const MODEL = 'gemini-2.5-flash-lite';
const TIMEOUT_MS = 9000;

// ────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────
export async function synthesizeSpiritEvent(
  spiritId: SpiritId,
  eventType: SpiritEventType,
  ctx: SynthesizerCtx,
): Promise<SpiritEventDataAny> {
  // 1) BOLT_CARD 메타 — 다른 정령 픽
  if (eventType === 'SPIRIT_BOLT_CARD') {
    return synthesizeBoltCard(ctx);
  }

  // 2) Type A — 정적 풀
  if (SPIRIT_TYPE_A.has(eventType)) {
    const data = pickStaticData(eventType);
    if (data) return data;
    return pickFallbackData(eventType);
  }

  // 3) Type B — LLM 합성
  try {
    const result = await synthesizeWithLLM(spiritId, eventType, ctx);
    if (result) return result;
  } catch (err) {
    console.warn(`[spirit-event-synth] LLM fail ${eventType}:`, (err as Error)?.message);
  }
  return pickFallbackData(eventType);
}

// ────────────────────────────────────────────────────────────
// LLM 합성 (Type B)
// ────────────────────────────────────────────────────────────
async function synthesizeWithLLM(
  spiritId: SpiritId,
  eventType: SpiritEventType,
  ctx: SynthesizerCtx,
): Promise<SpiritEventDataAny | null> {
  const promptFn = SPIRIT_EVENT_PROMPTS[eventType];
  if (!promptFn) return null;

  // METAMORPHOSIS / MEMORY_KEY 는 DB 통계 enrichment 후 시 한 줄만 LLM
  if (eventType === 'SPIRIT_METAMORPHOSIS') {
    return synthesizeMetamorphosis(ctx);
  }
  if (eventType === 'SPIRIT_MEMORY_KEY') {
    return synthesizeMemoryKey(ctx);
  }

  const prompt = promptFn(ctx);
  const json = await callGeminiJson(prompt);
  if (!json) return null;
  if (containsUnsafePatternInJson(json)) {
    console.warn(`[spirit-event-synth] unsafe pattern in ${eventType}, fallback`);
    return null;
  }
  return validateAndCoerce(spiritId, eventType, json);
}

// ────────────────────────────────────────────────────────────
// Gemini Flash-Lite 호출 + JSON 파싱
// ────────────────────────────────────────────────────────────
async function callGeminiJson(prompt: string): Promise<unknown | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await gemini().models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const text = (resp as { text?: string }).text;
    if (!text) return null;
    return safeJsonParse(text);
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') {
      console.warn('[spirit-event-synth] gemini timeout');
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

function safeJsonParse(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    // 일부 케이스: 코드블록 감싸짐
    const stripped = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();
    try {
      return JSON.parse(stripped);
    } catch {
      return null;
    }
  }
}

// ────────────────────────────────────────────────────────────
// 데이터 검증 + 옵션 주입 (Coerce)
// ────────────────────────────────────────────────────────────
function STD_OPT<V extends string>(
  value: V,
  label: string,
  emoji: string,
  style?: SpiritEventOption['style'],
): SpiritEventOption<V> {
  return { value, label, emoji, style };
}

function validateAndCoerce(
  _spiritId: SpiritId,
  eventType: SpiritEventType,
  raw: unknown,
): SpiritEventDataAny | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  switch (eventType) {
    case 'SPIRIT_RAGE_LETTER': {
      if (!Array.isArray(r.drafts) || r.drafts.length < 3) {
        return pickRageLetterFallback();
      }
      const data: RageLetterData = {
        spiritId: 'fire_goblin',
        openerMsg: String(r.openerMsg ?? '아 진짜 뭐 이런 X가 다 있냐?'),
        context: String(r.context ?? '같이 활활 태워보자.'),
        drafts: (r.drafts as Array<Record<string, unknown>>).slice(0, 3).map((d) => ({
          intensity: ((d.intensity as string) ?? 'fire') as 'fire' | 'honest' | 'cool',
          label: String(d.label ?? ''),
          text: String(d.text ?? ''),
        })),
        lunaCutIn: String(r.lunaCutIn ?? '근데 저거 진짜 보내진 말자 ㅎㅎ'),
        options: [
          STD_OPT('burn', '다 태워버려', '💥', 'primary'),
          STD_OPT('rewrite', '직접 써볼게', '✏️'),
          STD_OPT('skip', '다음에', '⏭️'),
        ],
      };
      return data;
    }
    case 'SPIRIT_THINK_FRAME': {
      if (!Array.isArray(r.frames) || r.frames.length < 3) {
        return pickThinkFrameFallback();
      }
      const data: ThinkFrameData = {
        spiritId: 'book_worm',
        openerMsg: String(r.openerMsg ?? '잠깐, 같은 장면 세 번 다르게 읽어볼까요?'),
        frames: (r.frames as Array<Record<string, unknown>>).slice(0, 3).map((f) => ({
          angle: ((f.angle as string) ?? 'self') as 'self' | 'other' | 'third',
          icon: String(f.icon ?? '🔍'),
          label: String(f.label ?? ''),
          interpretation: String(f.interpretation ?? ''),
        })),
        noriQuiet: String(r.noriQuiet ?? '...어느 프레임이 가장 와닿아요?'),
        options: [
          STD_OPT('helpful', '이거 도움됐어', '🎯', 'primary'),
          STD_OPT('reroll', '다른 프레임도', '🔄'),
          STD_OPT('skip', '다음에', '⏭️'),
        ],
      };
      return data;
    }
    case 'SPIRIT_RHYTHM_CHECK': {
      const data: RhythmCheckData = {
        spiritId: 'drum_imp',
        openerMsg: String(r.openerMsg ?? '둥-둥-쿵! 박자 한 번 보자.'),
        myAvg: String(r.myAvg ?? '체감상 빠름'),
        partnerAvg: String(r.partnerAvg ?? '체감상 느림'),
        pattern: ((r.pattern as string) ?? 'chase') as RhythmCheckData['pattern'],
        patternEmoji: String(r.patternEmoji ?? '🏃'),
        patternDescription: String(r.patternDescription ?? ''),
        drumAdvice: String(r.drumAdvice ?? ''),
        visualBars: Array.isArray(r.visualBars)
          ? (r.visualBars as Array<Record<string, unknown>>)
              .slice(0, 12)
              .map((b) => ({
                who: ((b.who as string) ?? 'me') as 'me' | 'partner',
                length: Math.max(1, Math.min(10, Number(b.length ?? 5))),
              }))
          : [],
        options: [
          STD_OPT('tryslow', '두 박자 늦춰볼게', '⏱️', 'primary'),
          STD_OPT('detail', '더 자세히', '📊'),
          STD_OPT('skip', 'skip', '⏭️'),
        ],
      };
      if (data.visualBars.length < 4) {
        // 시각 바 보강
        data.visualBars = [
          { who: 'me', length: 7 }, { who: 'partner', length: 2 },
          { who: 'me', length: 8 }, { who: 'partner', length: 1 },
          { who: 'me', length: 6 }, { who: 'partner', length: 3 },
          { who: 'me', length: 7 }, { who: 'partner', length: 2 },
        ];
      }
      return data;
    }
    case 'SPIRIT_OLIVE_BRANCH': {
      if (!Array.isArray(r.drafts) || r.drafts.length < 3) {
        return pickFallbackData(eventType);
      }
      const data: OliveBranchData = {
        spiritId: 'peace_dove',
        openerMsg: String(r.openerMsg ?? '먼저 손 내미는 사람이 약한 게 아니에요.'),
        drafts: (r.drafts as Array<Record<string, unknown>>).slice(0, 3).map((d) => ({
          tone: ((d.tone as string) ?? 'soft') as 'soft' | 'responsibility' | 'humor',
          emoji: String(d.emoji ?? '🌷'),
          label: String(d.label ?? ''),
          text: String(d.text ?? ''),
          intent: String(d.intent ?? ''),
        })),
        doveGuide: String(r.doveGuide ?? '셋 다 시작 90초 안에 답 안 오면 기다려요. 한 번만 보내요.'),
        options: [
          STD_OPT('send', '이거 보내볼래', '✉️', 'primary'),
          STD_OPT('tweak', '다듬을래', '✏️'),
          STD_OPT('skip', 'skip', '⏭️'),
        ],
      };
      // 카운터어택 검출
      const cAttack = /근데\s*너|그치만\s*너|하지만\s*너/;
      if (data.drafts.some((d) => cAttack.test(d.text))) {
        return pickFallbackData(eventType);
      }
      return data;
    }
    case 'SPIRIT_CLOUD_REFRAME': {
      if (!r.miMiTranslation) return pickFallbackData(eventType);
      const t = r.miMiTranslation as Record<string, unknown>;
      const data: CloudReframeData = {
        spiritId: 'cloud_bunny',
        openerMsg: String(r.openerMsg ?? '에이~ 잠깐만, 이거 좀 다르게 봐 봐~'),
        userQuote: String(r.userQuote ?? ''),
        miMiTranslation: {
          main: String(t.main ?? ''),
          incident: String(t.incident ?? ''),
          result: String(t.result ?? ''),
          directorNote: String(t.directorNote ?? ''),
        },
        miMiClosing: String(r.miMiClosing ?? '이거 5년 후에 보면 졸귀 짤 같지 않아? ㅋㅋ'),
        options: [
          STD_OPT('lighter', 'ㅋㅋㅋ 좀 가벼워졌어', '😂', 'primary'),
          STD_OPT('still_hurt', '그래도 진짜 힘들어', '🥺'),
          STD_OPT('skip', 'skip', '⏭️'),
        ],
      };
      return data;
    }
    case 'SPIRIT_LETTER_BRIDGE': {
      const data: LetterBridgeData = {
        spiritId: 'letter_fairy',
        openerMsg: String(r.openerMsg ?? '이건 부치지 않을 거예요. 약속해요.'),
        recipient: String(r.recipient ?? ''),
        guide: String(r.guide ?? '지금 가장 하고 싶은 한 마디부터 시작해 봐요.'),
        unblockExample: String(r.unblockExample ?? '한 번도 말 못 한 건 ~ 이에요'),
        options: [
          STD_OPT('archive', '보관함에 넣기', '📦', 'primary'),
          STD_OPT('burn', '태우기', '🔥'),
          STD_OPT('continue', '더 쓸래요', '✏️'),
          STD_OPT('skip', 'skip', '⏭️'),
        ],
      };
      return data;
    }
    case 'SPIRIT_NIGHT_CONFESSION': {
      const prompts = Array.isArray(r.prompts) ? (r.prompts as unknown[]).slice(0, 3).map(String) : [];
      while (prompts.length < 3) {
        prompts.push(['사실은 ~', '한 번도 말 못 한 건 ~', '내가 가장 두려운 건 ~'][prompts.length]);
      }
      const data: NightConfessionData = {
        spiritId: 'moon_rabbit',
        openerMsg: String(r.openerMsg ?? '이 시간엔… 평소엔 못한 한 줄도 적어도 돼.'),
        prompts,
        options: [
          STD_OPT('send_to_moon', '달에 띄워 보낼래', '🌙', 'primary'),
          STD_OPT('bury', '그냥 묻을래', '🔒'),
          STD_OPT('skip', 'skip', '⏭️'),
        ],
      };
      return data;
    }
    case 'SPIRIT_REVERSE_ROLE': {
      const h = (r.harleyAsUser ?? {}) as Record<string, unknown>;
      const data: ReverseRoleData = {
        spiritId: 'clown_harley',
        openerMsg: String(r.openerMsg ?? '히히, 우리 한 번 배역 바꿔볼까~?'),
        partnerName: String(r.partnerName ?? '걔'),
        harleyAsUser: {
          tone: ((h.tone as string) ?? 'anxious') as ReverseRoleData['harleyAsUser']['tone'],
          openingLine: String(h.openingLine ?? '야 너 어제 왜 답장 안 했어?'),
        },
        rounds: Number(r.rounds ?? 5) || 5,
        options: [STD_OPT('start', '시작', '▶️', 'primary'), STD_OPT('later', '다음에', '⏭️')],
      };
      return data;
    }
    case 'SPIRIT_BUTTERFLY_DIARY': {
      const data: ButterflyDiaryData = {
        spiritId: 'rose_fairy',
        openerMsg: String(r.openerMsg ?? '오늘 그 사람의 어떤 게~~ 설렜어~? 흐응~?'),
        exampleHint: String(r.exampleHint ?? '예: 내 이름 부르는 톤'),
        guide: String(r.guide ?? '보낸 카톡 한 줄, 눈빛, 톤, 목소리, 손짓 — 다 OK 야~'),
        closingLine: String(r.closingLine ?? '작은 떨림이 큰 사랑의 시작이래~'),
        options: [
          STD_OPT('logged', '적었어', '🌹', 'primary'),
          STD_OPT('more', '더 떠올릴래', '✏️'),
          STD_OPT('skip', 'skip', '⏭️'),
        ],
      };
      return data;
    }
    case 'SPIRIT_FALLEN_PETALS': {
      const data: FallenPetalsData = {
        spiritId: 'cherry_leaf',
        openerMsg: String(r.openerMsg ?? '이제…흩어보낼 시간이야.'),
        promptHint: String(r.promptHint ?? '예: 걔 이름, 그날 카페'),
        closingPoetry: String(r.closingPoetry ?? '보낸다고 사라지는 건 아냐.'),
        options: [
          STD_OPT('release', '흩날리자', '🌸', 'primary'),
          STD_OPT('more', '더 쓰고 싶어', '✏️'),
          STD_OPT('skip', '다음에', '⏭️'),
        ],
      };
      return data;
    }
    case 'SPIRIT_CROWN_RECLAIM': {
      const slots = Array.isArray(r.slots) ? r.slots as Array<Record<string, unknown>> : [];
      while (slots.length < 3) {
        const defaults = [
          { label: '눈에 보이는 것', hint: "예: '정성'" },
          { label: '잘 해온 것', hint: '예: 끝까지 답 찾는 자세' },
          { label: '너만의 결', hint: '예: 너만의 한 가지 결' },
        ];
        slots.push(defaults[slots.length]);
      }
      const data: CrownReclaimData = {
        spiritId: 'queen_elena',
        openerMsg: String(r.openerMsg ?? '주춤하지 마라. 너의 왕관, 내가 다시 씌워주마.'),
        slots: slots.slice(0, 3).map((s) => ({
          label: String(s.label ?? ''),
          hint: String(s.hint ?? ''),
        })),
        closingDecree: String(r.closingDecree ?? '주인이여, 너의 이름은 흔들리지 않는다.'),
        options: [
          STD_OPT('unseal', '봉인 해제', '👑', 'primary'),
          STD_OPT('cant_recall', '못 떠올라', '✏️'),
          STD_OPT('skip', 'skip', '⏭️'),
        ],
      };
      return data;
    }
    case 'SPIRIT_WISH_GRANT': {
      const data: WishGrantData = {
        spiritId: 'star_dust',
        openerMsg: '오늘 1번. 너의 소원, 들어줄게~ 응?',
        ifPhrase: String(r.ifPhrase ?? ''),
        thenPhrase: String(r.thenPhrase ?? ''),
        starDustComment: String(r.starDustComment ?? '약속 ✨'),
        options: [
          STD_OPT('commit', '약속할게', '✨', 'primary'),
          STD_OPT('reroll', '다른 걸로', '✏️'),
          STD_OPT('skip', 'skip', '⏭️'),
        ],
      };
      // 위험 행동 then 검사
      const risky = /(술|소주|맥주|와인|자해|보복|때리|약\s*먹|차단)/;
      if (risky.test(data.thenPhrase)) {
        data.thenPhrase = '잠깐 산책 5분 다녀오기';
        data.starDustComment = '음... 더 안전한 한 걸음으로 빌었어 ㅎ';
      }
      return data;
    }
    default:
      return null;
  }
}

// ────────────────────────────────────────────────────────────
// METAMORPHOSIS — DB 통계 + 시 한 줄
// ────────────────────────────────────────────────────────────
async function synthesizeMetamorphosis(ctx: SynthesizerCtx): Promise<MetamorphosisData> {
  const fallback = pickFallbackData('SPIRIT_METAMORPHOSIS') as MetamorphosisData;

  try {
    const ninetyDaysAgo = new Date(ctx.now.getTime() - 90 * 864e5).toISOString();
    const fourteenDaysAgo = new Date(ctx.now.getTime() - 14 * 864e5).toISOString();

    const before = await fetchSessionsStat(ctx.userId, null, ninetyDaysAgo, 5);
    const after = await fetchSessionsStat(ctx.userId, fourteenDaysAgo, null, 10);
    if (!before || !after) return fallback;

    // 시 한 줄만 LLM
    const promptFn = SPIRIT_EVENT_PROMPTS.SPIRIT_METAMORPHOSIS!;
    const prompt = promptFn(ctx);
    let metaPoetic = fallback.metaPoetic;
    try {
      const json = (await callGeminiJson(prompt)) as Record<string, unknown> | null;
      if (json && typeof json.metaPoetic === 'string') {
        if (!containsUnsafePatternInJson(json)) {
          metaPoetic = json.metaPoetic;
        }
      }
    } catch {/* fallback 시 사용 */}

    const data: MetamorphosisData = {
      ...fallback,
      before: { ...before, avgEmotionScore: before.avgEmotionScore ?? 0 },
      after: { ...after, avgEmotionScore: after.avgEmotionScore ?? 0 },
      delta: {
        emotionScore: (after.avgEmotionScore ?? 0) - (before.avgEmotionScore ?? 0),
      },
      metaPoetic,
    };
    return data;
  } catch (e) {
    console.warn('[spirit-event-synth] metamorphosis fail', e);
    return fallback;
  }
}

// ────────────────────────────────────────────────────────────
// MEMORY_KEY — 과거 6세션 N-gram + 시 한 줄
// ────────────────────────────────────────────────────────────
async function synthesizeMemoryKey(ctx: SynthesizerCtx): Promise<MemoryKeyData> {
  const fallback = pickFallbackData('SPIRIT_MEMORY_KEY') as MemoryKeyData;

  try {
    const messages = await fetchRecentUserMessages(ctx.userId, 6);
    if (messages.length < 5) return fallback;

    const ngrams = extractRepeatedNgrams(messages, {
      minN: 1,
      maxN: 3,
      minCount: 3,
      limit: 4,
    });

    // 위기/위험 키워드 반복 검출 시 차단
    const dangerNg = ngrams.find((n) => /(죽고\s*싶|자해|끝낼래)/.test(n.text));
    if (dangerNg) {
      // 카드 띄우지 말고 fallback (실제로는 게이트에서 더 일찍 차단되지만 이중 가드)
      return fallback;
    }

    // 시퀀스 패턴 (단순화 — '괜찮아 → 근데' 류 1개)
    const sequencePattern = detectSequencePattern(messages);

    // LLM 한 줄 관찰
    const promptFn = SPIRIT_EVENT_PROMPTS.SPIRIT_MEMORY_KEY!;
    const enrichedCtx: SynthesizerCtx = {
      ...ctx,
      tagParams: { ...(ctx.tagParams ?? {}), pattern: ngrams.map((n) => n.text).join(', ') },
    };
    let cliQuiet = '...너가 자주 쓰는 단어 한 번 봐요.';
    try {
      const json = (await callGeminiJson(promptFn(enrichedCtx))) as Record<string, unknown> | null;
      if (json && typeof json.cliQuiet === 'string') {
        if (!containsUnsafePatternInJson(json)) cliQuiet = json.cliQuiet;
      }
    } catch {/* fallback */}

    const data: MemoryKeyData = {
      spiritId: 'book_keeper',
      openerMsg: '...너가 자주 쓰는 단어, 보여줄까.',
      sessionsAnalyzed: 6,
      topNgrams: ngrams,
      sequencePattern,
      cliQuiet,
      options: fallback.options,
    };
    // 단어가 너무 적으면 topWords 보강
    if (data.topNgrams.length === 0) {
      data.topNgrams = computeTopWords(messages, 3).map((w) => ({ text: w, count: 0 }));
    }
    return data;
  } catch (e) {
    console.warn('[spirit-event-synth] memory_key fail', e);
    return fallback;
  }
}

function detectSequencePattern(messages: string[]): MemoryKeyData['sequencePattern'] | undefined {
  // 단순: "괜찮아"로 시작 → "근데" 시퀀스 빈도
  let total = 0;
  let hit = 0;
  for (const m of messages) {
    const startsOK = /^\s*괜찮아/.test(m);
    if (startsOK) {
      total++;
      if (/\b근데\b|\b근데요\b|\b그런데\b/.test(m)) hit++;
    }
  }
  if (total >= 2 && hit >= total - 1) {
    return {
      pattern: "'괜찮아'로 시작 → '근데'로 진심",
      occurrence: `${total}번 중 ${hit}번`,
    };
  }
  return undefined;
}

// ────────────────────────────────────────────────────────────
// ⚡ BOLT_CARD — 다른 정령 무작위 픽 (래퍼)
// ────────────────────────────────────────────────────────────
async function synthesizeBoltCard(ctx: SynthesizerCtx): Promise<BoltCardData> {
  const active = ctx.activeSpirits ?? [];

  // 핏치 자신 제외 + Phase 허용 + Lv3+ 만
  const candidates = active
    .filter((s) => s.spiritId !== 'lightning_bird' && s.bondLv >= 3)
    .filter((s) => isPhaseAllowed(s.spiritId, ctx.phase));

  // Phase 미허용이면 fallback — 핏치 자체 정적 카드
  if (candidates.length === 0) {
    return makeBoltFallback(ctx);
  }

  // 가중치 무작위 (UR 비중 ↑)
  const rarityWeight: Record<string, number> = { N: 1, R: 1.5, SR: 2, UR: 3, L: 1 };
  // 가중치는 spirits.ts 의 rarity 알아야 정확. 여기서는 간단히 spiritId prefix 매칭
  // (외부에서 SPIRITS 임포트해도 되지만 cyclic 회피)
  const URS = new Set(['queen_elena', 'star_dust']);
  const SRS = new Set(['cherry_leaf', 'ice_prince', 'butterfly_meta', 'book_keeper']);
  const RS = new Set(['cloud_bunny', 'letter_fairy', 'wind_sprite', 'moon_rabbit', 'clown_harley', 'rose_fairy', 'forest_mom', 'peace_dove']);

  const weighted: Array<{ s: typeof candidates[number]; w: number }> = candidates.map((s) => {
    let r: 'N' | 'R' | 'SR' | 'UR' | 'L' = 'N';
    if (URS.has(s.spiritId)) r = 'UR';
    else if (SRS.has(s.spiritId)) r = 'SR';
    else if (RS.has(s.spiritId)) r = 'R';
    return { s, w: rarityWeight[r] ?? 1 };
  });

  const total = weighted.reduce((sum, x) => sum + x.w, 0);
  let pick = Math.random() * total;
  let chosen = weighted[0];
  for (const wx of weighted) {
    pick -= wx.w;
    if (pick <= 0) { chosen = wx; break; }
  }

  const pickedSpiritId = chosen.s.spiritId;
  const pickedEventType = SPIRIT_TO_EVENT[pickedSpiritId];
  if (!pickedEventType) return makeBoltFallback(ctx);

  // 픽한 정령의 카드 데이터 정상 합성 (재귀 1회)
  const inner = await synthesizeSpiritEvent(pickedSpiritId, pickedEventType, ctx);

  return {
    spiritId: 'lightning_bird',
    headerBadge: '⚡ 핏치 보너스',
    openerMsg: `야! 오늘은 ${displayName(pickedSpiritId)} 차례야!`,
    pickedSpiritId,
    pickedEventType,
    pickedEventData: inner,
  };
}

function makeBoltFallback(_ctx: SynthesizerCtx): BoltCardData {
  // 핏치만 있는 경우: SeedSpirit 정적 카드 안고 메타로 — 어색하지 않은 가벼운 카드
  return {
    spiritId: 'lightning_bird',
    openerMsg: '오늘은 패스! 다음에 만나자~',
    pickedSpiritId: 'lightning_bird',
    pickedEventType: 'SPIRIT_FIRST_BREATH',
    pickedEventData: pickStaticData('SPIRIT_FIRST_BREATH')!,
  };
}

function displayName(id: SpiritId): string {
  const map: Record<string, string> = {
    fire_goblin: '도깨비 불꽃',
    book_worm: '책벌레 노리',
    tear_drop: '슬프니',
    seed_spirit: '새싹이',
    drum_imp: '북이',
    peace_dove: '평화비둘기',
    cloud_bunny: '구름토끼 미미',
    letter_fairy: '편지요정 루미',
    wind_sprite: '산들이',
    moon_rabbit: '달빛토끼',
    clown_harley: '광대 할리',
    rose_fairy: '로제',
    forest_mom: '숲 엄마',
    cherry_leaf: '벚잎이',
    ice_prince: '얼음왕자',
    butterfly_meta: '변화나비 메타',
    book_keeper: '열쇠지기 클리',
    queen_elena: '여왕 엘레나',
    star_dust: '별똥이',
  };
  return map[id] ?? id;
}

// ────────────────────────────────────────────────────────────
// 헬퍼 — Phase 화이트리스트 export (외부 사용 시)
// ────────────────────────────────────────────────────────────
export { SPIRIT_PHASE_WHITELIST };
