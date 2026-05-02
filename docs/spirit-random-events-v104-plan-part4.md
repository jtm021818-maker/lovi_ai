# 🧚‍♀️ Spirit Random Events — Master Plan v104 (Part 4/4)

**연결**: Part 3 (SR5 + UR2) ← 이 문서 (구현 가이드 끝)
**범위**: 타입/DB/Pipeline/UI/프롬프트/마이그레이션/구현 로드맵/검증

> **중요 사전 안내**: 본 프로젝트는 `AGENTS.md` 의 "This is NOT the Next.js you know" 룰을 따른다. 어떤 SDK/프레임워크 코드를 쓰기 전에 `node_modules/next/dist/docs/` 의 관련 가이드를 먼저 읽고, deprecation 안내를 따라야 한다. 본 계획서의 코드 스니펫은 *의도/시그니처* 의 표현이지 정답 import 경로가 아니다.

---

## 9. 타입 정의 — 전체 (`src/engines/spirits/spirit-event-types.ts` 신규)

```typescript
/**
 * 🧚 v104: Spirit Random Events — Type Definitions
 *
 * 20개 정령 시그니처 이벤트 데이터 + 공통 게이트 타입.
 */

import type { SpiritId } from '@/types/spirit.types';
import type { ConversationPhaseV2, RiskLevel, RelationshipScenario } from '@/types/engine.types';

// ============================================
// 1) Event Type 열거 (PhaseEventType 에 union 으로 추가)
// ============================================
export type SpiritEventType =
  // N (6)
  | 'SPIRIT_RAGE_LETTER'
  | 'SPIRIT_THINK_FRAME'
  | 'SPIRIT_CRY_TOGETHER'
  | 'SPIRIT_FIRST_BREATH'
  | 'SPIRIT_RHYTHM_CHECK'
  | 'SPIRIT_OLIVE_BRANCH'
  // R (7)
  | 'SPIRIT_CLOUD_REFRAME'
  | 'SPIRIT_LETTER_BRIDGE'
  | 'SPIRIT_WINDOW_OPEN'
  | 'SPIRIT_NIGHT_CONFESSION'
  | 'SPIRIT_REVERSE_ROLE'
  | 'SPIRIT_BUTTERFLY_DIARY'
  | 'SPIRIT_ROOTED_HUG'
  // SR (5)
  | 'SPIRIT_FALLEN_PETALS'
  | 'SPIRIT_FREEZE_FRAME'
  | 'SPIRIT_BOLT_CARD'
  | 'SPIRIT_METAMORPHOSIS'
  | 'SPIRIT_MEMORY_KEY'
  // UR (2)
  | 'SPIRIT_CROWN_RECLAIM'
  | 'SPIRIT_WISH_GRANT';

// ============================================
// 2) 게이트 컨텍스트
// ============================================
export interface SpiritEventGateContext {
  userId: string;
  sessionId: string;
  phase: ConversationPhaseV2;
  turn: number;
  riskLevel: RiskLevel;
  scenario?: RelationshipScenario;
  emotionScore: number;
  cognitiveDistortions: string[];
  intent?: string;
  now: Date;                              // 시계 시각 (KST)
  parsedTags: string[];                   // LLM 본문에서 추출된 [SPIRIT_*] 태그들
  firedThisSession: SpiritEventType[];    // 이번 세션 이미 발동된 정령 이벤트
  consecutiveLowMoodTurns: number;        // wind_sprite 용
  monthlyWishUsedAt?: string | null;      // star_dust 용
  userAgeDays: number;                    // butterfly/book_keeper 용
  scenarioRepeatCount: Record<RelationshipScenario, number>;
}

export interface SpiritEventGateResult {
  ok: boolean;
  spiritId?: SpiritId;
  eventType?: SpiritEventType;
  rejectReason?:
    | 'no_active_spirit'
    | 'wrong_phase'
    | 'cooldown'
    | 'session_cap'
    | 'duplicate'
    | 'risk_block'
    | 'scenario_mismatch';
}

// ============================================
// 3) 카드 공통 옵션
// ============================================
export interface SpiritEventOption<V extends string = string> {
  value: V;
  label: string;
  emoji: string;
  style?: 'primary' | 'neutral' | 'soft' | 'danger';
}

// ============================================
// 4) 20개 카드 데이터 인터페이스 (Part 1~3 에서 정의된 것 모음)
// ============================================
// (Part 1) RageLetterData, ThinkFrameData, CryTogetherData,
//          FirstBreathData, RhythmCheckData, OliveBranchData
// (Part 2) CloudReframeData, LetterBridgeData, WindowOpenData,
//          NightConfessionData, ReverseRoleData, ButterflyDiaryData, RootedHugData
// (Part 3) FallenPetalsData, FreezeFrameData, BoltCardData,
//          MetamorphosisData, MemoryKeyData, CrownReclaimData, WishGrantData

// 통합 union (편의)
export type SpiritEventData =
  | RageLetterData
  | ThinkFrameData
  | CryTogetherData
  | FirstBreathData
  | RhythmCheckData
  | OliveBranchData
  | CloudReframeData
  | LetterBridgeData
  | WindowOpenData
  | NightConfessionData
  | ReverseRoleData
  | ButterflyDiaryData
  | RootedHugData
  | FallenPetalsData
  | FreezeFrameData
  | BoltCardData
  | MetamorphosisData
  | MemoryKeyData
  | CrownReclaimData
  | WishGrantData;
```

### 9.1 `engine.types.ts` 수정 (PhaseEventType 확장)

```typescript
// (기존 union 끝에)
| 'SPIRIT_RAGE_LETTER' | 'SPIRIT_THINK_FRAME' | 'SPIRIT_CRY_TOGETHER'
| 'SPIRIT_FIRST_BREATH' | 'SPIRIT_RHYTHM_CHECK' | 'SPIRIT_OLIVE_BRANCH'
| 'SPIRIT_CLOUD_REFRAME' | 'SPIRIT_LETTER_BRIDGE' | 'SPIRIT_WINDOW_OPEN'
| 'SPIRIT_NIGHT_CONFESSION' | 'SPIRIT_REVERSE_ROLE' | 'SPIRIT_BUTTERFLY_DIARY'
| 'SPIRIT_ROOTED_HUG' | 'SPIRIT_FALLEN_PETALS' | 'SPIRIT_FREEZE_FRAME'
| 'SPIRIT_BOLT_CARD' | 'SPIRIT_METAMORPHOSIS' | 'SPIRIT_MEMORY_KEY'
| 'SPIRIT_CROWN_RECLAIM' | 'SPIRIT_WISH_GRANT';
```

`SuggestionMeta.source` union 에도 `'spirit_event'` 추가.

---

## 10. DB 마이그레이션 — `20260503_v104_spirit_random_events.sql`

```sql
-- ============================================================
-- v104: Spirit Random Events
-- ============================================================

-- (a) 정령 이벤트 발동 로그 (쿨타임/세션 상한 계산용)
create table if not exists spirit_event_fires (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid,                              -- nullable: monthly star_dust는 session 외
  spirit_id text not null,
  event_type text not null,
  fired_at timestamptz not null default now(),
  result jsonb,                                 -- 카드 데이터 스냅샷
  user_choice text,                             -- 'commit'|'skip'|...
  user_input jsonb                              -- 자유 입력 (편지/소원/가치 etc.)
);
create index idx_spirit_fires_user_recent on spirit_event_fires(user_id, fired_at desc);
create index idx_spirit_fires_session on spirit_event_fires(session_id);
create index idx_spirit_fires_user_spirit on spirit_event_fires(user_id, spirit_id, fired_at desc);

-- (b) 별똥이 월간 소원 약속 (push 알림 + 다음 달 회상용)
create table if not exists spirit_wishes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_wish text not null,
  if_phrase text not null,
  then_phrase text not null,
  committed_at timestamptz not null default now(),
  trigger_at timestamptz,                       -- if 시간 (옵트인 시)
  fulfilled boolean default null,               -- null=대기, true/false=결과
  fulfilled_at timestamptz
);
create index idx_wishes_user on spirit_wishes(user_id, committed_at desc);

-- (c) 마음의 편지 보관함 (letter_fairy + cherry_leaf + queen_elena 공통)
create table if not exists spirit_keepsakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  spirit_id text not null,                      -- 'letter_fairy'|'cherry_leaf'|'queen_elena'
  kind text not null,                           -- 'letter'|'release'|'value'|'confession'
  body text not null,
  meta jsonb,                                   -- {recipient, action: 'archive'|'burn'|'release'}
  created_at timestamptz not null default now()
);
create index idx_keepsakes_user_spirit on spirit_keepsakes(user_id, spirit_id, created_at desc);

-- (d) RLS
alter table spirit_event_fires enable row level security;
alter table spirit_wishes enable row level security;
alter table spirit_keepsakes enable row level security;

create policy "own_fires_r" on spirit_event_fires for select using (user_id = auth.uid());
create policy "own_fires_w" on spirit_event_fires for insert with check (user_id = auth.uid());

create policy "own_wishes" on spirit_wishes for all using (user_id = auth.uid());
create policy "own_keepsakes" on spirit_keepsakes for all using (user_id = auth.uid());

-- (e) 헬퍼 뷰: 유저별 정령 이벤트 마지막 발동 시각
create or replace view spirit_event_last_fire_v as
select user_id, spirit_id, event_type, max(fired_at) as last_fire_at
from spirit_event_fires
group by user_id, spirit_id, event_type;
```

### 10.1 마이그레이션 적용 절차

1. **dev**: `supabase db reset` 후 `npx supabase migration up` (또는 dashboard)
2. **prod**: 새벽 00~04 KST 윈도우에서 `migration up`. 트래픽 임팩트 0 (테이블 신규).
3. RLS 검증: 다른 user_id 데이터 조회 시 0 row 반환 확인.

---

## 11. Pipeline 통합 (`src/engines/pipeline/index.ts`)

기존 SESSION_SUMMARY 블록과 v85 검색 이벤트 yield 패턴을 그대로 따른다.

### 11.1 호출 위치

```typescript
// pipeline/index.ts (의사코드)
async function* runPipeline(input: PipelineInput): AsyncGenerator<PipelineYield> {
  // ... 기존 1~5 단계 (state-analysis, strategy-select, ACE-v5 본문 stream) ...
  
  const aceResult = await runACEv5({ ...activeSpirits });   // ⭐ 활성 정령 가이드 주입
  yield { type: 'message', text: aceResult.text };
  
  // ── ⭐ NEW v104: Spirit Event Gate ───────────────────────
  const parsedTags = parseSpiritTags(aceResult.text);
  const gate = await selectSpiritEvent({
    userId: input.userId,
    sessionId: input.sessionId,
    phase: phaseManager.currentPhase,
    turn: input.turn,
    riskLevel: stateResult.riskLevel,
    scenario: stateResult.scenario,
    emotionScore: stateResult.emotionScore,
    cognitiveDistortions: stateResult.cognitiveDistortions,
    intent: stateResult.intent?.primaryIntent,
    now: new Date(),
    parsedTags,
    firedThisSession: input.firedSpiritEventsThisSession ?? [],
    consecutiveLowMoodTurns: input.consecutiveLowMoodTurns ?? 0,
    monthlyWishUsedAt: input.monthlyWishUsedAt ?? null,
    userAgeDays: input.userAgeDays,
    scenarioRepeatCount: input.scenarioRepeatCount ?? {},
  });
  
  if (gate.ok && gate.spiritId && gate.eventType) {
    try {
      const data = await synthesizeSpiritEvent(gate.spiritId, gate.eventType, {
        userId: input.userId,
        recentTurns: input.recentTurns,
        stateResult,
      });
      yield { 
        type: 'event', 
        event: { 
          type: gate.eventType, 
          phase: phaseManager.currentPhase, 
          data 
        } 
      };
      // log to spirit_event_fires
      await logSpiritFire(input.userId, input.sessionId, gate.spiritId, gate.eventType, data);
    } catch (err) {
      console.error('[spirit-event] synth failed', err);
      // 실패는 silent — 본문은 이미 yield 됨
    }
  }
  
  // ... 기존 SESSION_SUMMARY 블록, ACTION_PLAN 합성 폴백 등 ...
}
```

### 11.2 동시성 안전

- `selectSpiritEvent` 와 `synthesizeSpiritEvent` 는 *같은 응답 사이클* 안에서만 동작.
- DB write는 `logSpiritFire` 가 `await` 으로 finalize. 만약 client 가 disconnect 해도 fire 기록은 남음 → 다음 요청 쿨타임 일관.
- *경합 조건*: 같은 user 가 빠르게 두 메시지 보낼 때 같은 정령 이벤트 두 번 발동 가능성 → DB unique constraint 추가로 방어:

```sql
create unique index uniq_spirit_fire_dedup
  on spirit_event_fires(user_id, session_id, event_type)
  where session_id is not null;
```

세션당 같은 event_type 중복 insert 시 conflict → catch 후 silent skip.

---

## 12. ACE-v5 시스템 프롬프트 강화

### 12.1 정령 가이드 섹션 (신규)

`src/engines/ace-v5/ace-system-prompt.ts` 의 시스템 프롬프트 끝에 다음 추가:

```
## 🧚 활성 정령 이벤트 가이드 (v104)

지금 너 옆에 깨어 있는 정령들 (Lv3+ 방 배치):
{activeSpiritList}

상황 정말 잘 어울리는 정령이 있다고 *자연스럽게* 느껴지면, 본문 마지막 줄에 한 번만 박자:

[SPIRIT_<EVENT_TYPE>:신호=값]

예:
- 유저가 분노 폭발 + 🔥 활성 → [SPIRIT_RAGE_LETTER:rage=상사_갑질]
- 인지 왜곡 + 📖 활성 → [SPIRIT_THINK_FRAME:distortion=mind_reading]
- 새벽 첫 턴 + 🌙 활성 → [SPIRIT_NIGHT_CONFESSION:hour=2]
- 격앙 + 행동 즉시성 + ❄️ → [SPIRIT_FREEZE_FRAME:trigger=즉시카톡_의도]
- 깊은 슬픔 + 💧 → [SPIRIT_CRY_TOGETHER]
- 자기비하 + 👑 → [SPIRIT_CROWN_RECLAIM:reason=가치상실]
- 이별 결정 직후 + 🌸 → [SPIRIT_FALLEN_PETALS:closure=이름]

엄격 규칙:
1. 한 응답에 SPIRIT_ 태그는 0~1개만. 절대 2개 이상 X.
2. 위기 신호(자해/자살/폭력 정황) 시 SPIRIT_ 태그 절대 금지.
3. 같은 세션 정령 카드 이미 2개 떴으면 더 박지 마.
4. 어색하다 싶으면 안 박는 게 정답. 정령 카드는 *권유*지 *강제* 가 절대 X.
5. 박을 땐 본문 끝 줄에만. 줄바꿈 1개로 분리.
6. 태그 파라미터는 한국어 키워드 OK. 10자 이내.
```

### 12.2 활성 정령 리스트 동적 주입 (`handoff-builder.ts`)

```typescript
async function buildActiveSpiritList(userId: string): Promise<string> {
  const active = await getActiveSpirits(userId);  // Lv3+ 방배치
  if (active.length === 0) return '(현재 활성 정령 없음 — 정령 카드 발동 X)';
  
  return active.map(s => {
    const m = SPIRITS.find(sp => sp.id === s.spiritId)!;
    const event = SPIRIT_TO_EVENT[s.spiritId];
    const phases = SPIRIT_PHASE_WHITELIST[s.spiritId].join('/');
    return `- ${m.emoji} ${m.name} → ${event} (${phases})`;
  }).join('\n');
}
```

### 12.3 Tag 파싱 — `spirit-event-signal.ts` (신규)

```typescript
const SPIRIT_TAG_REGEX = /\[SPIRIT_([A-Z_]+)(?::([^\]]*))?\]/g;

export function parseSpiritTags(text: string): Array<{
  eventType: SpiritEventType;
  params: Record<string, string>;
  rawSpan: { start: number; end: number };
}> {
  const tags: ReturnType<typeof parseSpiritTags> = [];
  let match: RegExpExecArray | null;
  while ((match = SPIRIT_TAG_REGEX.exec(text)) !== null) {
    const eventType = `SPIRIT_${match[1]}` as SpiritEventType;
    const params: Record<string, string> = {};
    if (match[2]) {
      for (const part of match[2].split(',')) {
        const [k, v] = part.split('=').map(s => s.trim());
        if (k && v) params[k] = v;
      }
    }
    tags.push({ 
      eventType, 
      params, 
      rawSpan: { start: match.index, end: match.index + match[0].length } 
    });
  }
  return tags;
}

export function stripSpiritTags(text: string): string {
  return text.replace(SPIRIT_TAG_REGEX, '').replace(/\n{3,}/g, '\n\n').trim();
}
```

---

## 13. Spirit Event Gate (`src/engines/spirits/spirit-event-gate.ts`)

```typescript
import { getActiveSpirits } from './spirit-abilities';
import { SPIRIT_TO_EVENT, SPIRIT_PHASE_WHITELIST, SPIRIT_COOLDOWN } from '@/data/spirit-event-config';
import type { SpiritEventGateContext, SpiritEventGateResult, SpiritEventType } from './spirit-event-types';
import { fetchLastFire, fetchMonthlyWish } from './spirit-event-repo';

const SESSION_CAP = 2;

export async function selectSpiritEvent(
  ctx: SpiritEventGateContext
): Promise<SpiritEventGateResult> {
  // 0) Risk gate (모든 정령 우선 차단)
  if (ctx.riskLevel === 'CRITICAL' || ctx.riskLevel === 'HIGH') {
    return { ok: false, rejectReason: 'risk_block' };
  }
  // 1) Session cap
  if (ctx.firedThisSession.length >= SESSION_CAP) {
    return { ok: false, rejectReason: 'session_cap' };
  }
  // 2) 활성 정령 풀
  const active = await getActiveSpirits(ctx.userId);
  const eligible: typeof active = [];
  for (const s of active) {
    const evt = SPIRIT_TO_EVENT[s.spiritId];
    if (!evt) continue;
    if (!isPhaseAllowed(s.spiritId, ctx.phase)) continue;
    if (ctx.firedThisSession.includes(evt)) continue;
    if (!(await isCooldownExpired(ctx, s.spiritId))) continue;
    if (!isContextAllowed(s.spiritId, ctx)) continue;     // 시나리오/턴/시간 게이트
    eligible.push(s);
  }
  if (eligible.length === 0) {
    return { ok: false, rejectReason: 'no_active_spirit' };
  }

  // 3) LLM 태그 우선 매칭
  for (const tag of ctx.parsedTags) {
    const match = eligible.find(s => SPIRIT_TO_EVENT[s.spiritId] === tag);
    if (match) {
      return { ok: true, spiritId: match.spiritId, eventType: tag as SpiritEventType };
    }
  }
  // 4) 휴리스틱 폴백 (정해진 우선순위)
  const fallback = heuristicFallback(eligible, ctx);
  if (fallback) return { ok: true, ...fallback };

  return { ok: false, rejectReason: 'no_active_spirit' };
}

function isPhaseAllowed(spiritId: string, phase: ConversationPhaseV2): boolean {
  return SPIRIT_PHASE_WHITELIST[spiritId]?.includes(phase) ?? false;
}

async function isCooldownExpired(ctx: SpiritEventGateContext, spiritId: string): Promise<boolean> {
  const policy = SPIRIT_COOLDOWN[spiritId];
  if (!policy) return true;
  if (policy.monthly) {
    if (spiritId === 'star_dust') {
      const used = await fetchMonthlyWish(ctx.userId, ctx.now);
      return !used;
    }
  }
  const last = await fetchLastFire(ctx.userId, spiritId);
  if (!last) return true;
  if (policy.hours && (ctx.now.getTime() - last.getTime()) / 36e5 < policy.hours) return false;
  if (policy.days && (ctx.now.getTime() - last.getTime()) / 864e5 < policy.days) return false;
  if (policy.turns && ctx.firedThisSession.length /* 같은 세션 카운트로 대용 */) {
    // turn-based 쿨타임은 세션 내에서만 의미
    // (실제 로직은 last fire turn 추적 필요 — 단순화 위해 session 외엔 항상 통과)
  }
  return true;
}

function isContextAllowed(spiritId: string, ctx: SpiritEventGateContext): boolean {
  switch (spiritId) {
    case 'seed_spirit': return ctx.turn === 1;
    case 'forest_mom': return ctx.turn >= 10;
    case 'moon_rabbit': {
      const h = ctx.now.getHours(); // KST 가정 (server tz=KST)
      return h >= 0 && h <= 5;
    }
    case 'wind_sprite': return ctx.consecutiveLowMoodTurns >= 5;
    case 'butterfly_meta':
    case 'book_keeper': return ctx.userAgeDays >= 30;
    case 'cloud_bunny': return ctx.riskLevel === 'LOW';
    default: return true;
  }
}

function heuristicFallback(
  eligible: ActiveSpirit[],
  ctx: SpiritEventGateContext
): { spiritId: string; eventType: SpiritEventType } | null {
  // 우선순위: 위급도 → 시간 → 시나리오 → Phase → 분노/슬픔 → 기본
  const has = (id: string) => eligible.find(s => s.spiritId === id);

  // moon_rabbit (시간 특화) 우선
  const m = has('moon_rabbit');
  if (m && ctx.turn === 1) return { spiritId: 'moon_rabbit', eventType: 'SPIRIT_NIGHT_CONFESSION' };

  // seed_spirit 첫 턴
  const s = has('seed_spirit');
  if (s && ctx.turn === 1) return { spiritId: 'seed_spirit', eventType: 'SPIRIT_FIRST_BREATH' };

  // 분노 → fire_goblin
  const f = has('fire_goblin');
  if (f && ctx.emotionScore <= 3 && (ctx.intent === 'VENTING')) {
    return { spiritId: 'fire_goblin', eventType: 'SPIRIT_RAGE_LETTER' };
  }

  // 슬픔 → tear_drop
  const t = has('tear_drop');
  if (t && ctx.emotionScore <= 2) {
    return { spiritId: 'tear_drop', eventType: 'SPIRIT_CRY_TOGETHER' };
  }

  // 인지왜곡 → book_worm
  const b = has('book_worm');
  if (b && ctx.cognitiveDistortions.length >= 1) {
    return { spiritId: 'book_worm', eventType: 'SPIRIT_THINK_FRAME' };
  }

  // 무거움 5턴+ → wind_sprite
  const w = has('wind_sprite');
  if (w && ctx.consecutiveLowMoodTurns >= 5) {
    return { spiritId: 'wind_sprite', eventType: 'SPIRIT_WINDOW_OPEN' };
  }

  // 그라운딩 (10턴+)
  const fm = has('forest_mom');
  if (fm && ctx.turn >= 10) {
    return { spiritId: 'forest_mom', eventType: 'SPIRIT_ROOTED_HUG' };
  }

  // lightning_bird 일일 1회 surprise (가장 약한 폴백)
  const l = has('lightning_bird');
  if (l && Math.random() < 0.5) {
    return { spiritId: 'lightning_bird', eventType: 'SPIRIT_BOLT_CARD' };
  }

  return null;
}
```

---

## 14. 합성기 — `src/engines/spirits/spirit-event-synthesizer.ts`

```typescript
import { GoogleGenAI } from '@google/genai';
import { SPIRIT_EVENT_PROMPTS } from './spirit-event-prompts';
import { SPIRIT_EVENT_FALLBACKS } from '@/data/spirit-event-fallbacks';
import { synthesizeBoltCard } from './bolt-card';

const STATIC_TYPE_A = new Set([
  'SPIRIT_CRY_TOGETHER', 'SPIRIT_FIRST_BREATH', 'SPIRIT_WINDOW_OPEN',
  'SPIRIT_FREEZE_FRAME', 'SPIRIT_ROOTED_HUG', 'SPIRIT_BOLT_CARD',
  'SPIRIT_FALLEN_PETALS' /* 정적 + LLM 1줄 시 */
]);

export async function synthesizeSpiritEvent(
  spiritId: string,
  eventType: SpiritEventType,
  ctx: SynthCtx
): Promise<SpiritEventData> {
  // BOLT_CARD: 메타 — 다른 정령 픽
  if (eventType === 'SPIRIT_BOLT_CARD') {
    return synthesizeBoltCard(ctx);
  }

  // Type A: 정적 풀 픽
  if (STATIC_TYPE_A.has(eventType)) {
    return pickFromStaticPool(eventType, ctx);
  }

  // Type B: Flash-Lite 합성
  try {
    const prompt = SPIRIT_EVENT_PROMPTS[eventType](ctx);
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const resp = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const json = JSON.parse(resp.text!);
    return validateAndCoerce(eventType, json, spiritId);
  } catch (e) {
    console.warn(`[spirit-event] synth fail ${eventType}, fallback`, e);
    return pickFromFallbacks(eventType, ctx);
  }
}
```

### 14.1 프롬프트 모듈 (`spirit-event-prompts.ts`) — 일부 발췌

```typescript
export const SPIRIT_EVENT_PROMPTS: Record<SpiritEventType, (ctx: SynthCtx) => string> = {
  SPIRIT_RAGE_LETTER: (ctx) => `
역할: 도깨비 불꽃. 분노 정령. 반말 격함, 유저 편 100%.
규칙:
- 욕은 "ㅅㅂ" "X발" 정도까지. 인신공격 X.
- "근데 그 사람도 사정이…" 류 절대 금지.
- 3개 초안 (intensity: fire/honest/cool).

입력:
- 유저 최근 5턴: ${ctx.recentTurns}
- 분노 대상: ${ctx.target ?? '걔'}
- 핵심 트리거: ${ctx.trigger ?? '여러 번 약속 깸'}

출력 JSON 구조:
{
  "openerMsg": "...",
  "context": "...",
  "drafts": [
    {"intensity":"fire","label":"다 태우기","text":"..."},
    {"intensity":"honest","label":"진심","text":"..."},
    {"intensity":"cool","label":"차가운 분노","text":"..."}
  ],
  "lunaCutIn": "..."
}
`,
  // ... 나머지 18개 (THINK_FRAME, OLIVE_BRANCH, …)
  // 각 프롬프트 작성 가이드는 Part 1~3 의 풀스펙 4.X.3/5.X.3/6.X.3/7.X.3 참조
};
```

### 14.2 검증 + 안전 가드 (`validateAndCoerce`)

```typescript
function validateAndCoerce(
  type: SpiritEventType,
  raw: any,
  spiritId: string
): SpiritEventData {
  // 1) 필수 필드 검사 (zod 스키마 권장)
  // 2) 안전 가드: 가스라이팅·자기비하·위협 단어 탐지
  if (containsUnsafePattern(raw)) {
    throw new Error(`unsafe_pattern_in_${type}`);
  }
  // 3) 한국어 길이/문장수 클램핑
  return {
    spiritId,
    ...raw,
    options: raw.options ?? STANDARD_OPTIONS[type],
  };
}

const UNSAFE_PATTERNS = [
  /네 잘못/, /참을 만한/, /너무 예민/,
  /죽어버리/, /다 끝내/, /의미 없/,    // 자/타해
];
function containsUnsafePattern(raw: any): boolean {
  const flat = JSON.stringify(raw);
  return UNSAFE_PATTERNS.some(p => p.test(flat));
}
```

---

## 15. UI — 카드 라우팅 + 컴포넌트

### 15.1 `ChatContainer.tsx` 추가 case

기존 v85 검색 이벤트 case 블록 아래에 v104 정령 이벤트 case 20개 추가:

```tsx
// (생략된 imports)
import RageLetter from './events/spirits/RageLetter';
import ThinkFrame from './events/spirits/ThinkFrame';
import CryTogether from './events/spirits/CryTogether';
import FirstBreath from './events/spirits/FirstBreath';
import RhythmCheck from './events/spirits/RhythmCheck';
import OliveBranch from './events/spirits/OliveBranch';
import CloudReframe from './events/spirits/CloudReframe';
import LetterBridge from './events/spirits/LetterBridge';
import WindowOpen from './events/spirits/WindowOpen';
import NightConfession from './events/spirits/NightConfession';
import ReverseRole from './events/spirits/ReverseRole';
import ButterflyDiary from './events/spirits/ButterflyDiary';
import RootedHug from './events/spirits/RootedHug';
import FallenPetals from './events/spirits/FallenPetals';
import FreezeFrame from './events/spirits/FreezeFrame';
import BoltCard from './events/spirits/BoltCard';
import Metamorphosis from './events/spirits/Metamorphosis';
import MemoryKey from './events/spirits/MemoryKey';
import CrownReclaim from './events/spirits/CrownReclaim';
import WishGrant from './events/spirits/WishGrant';

// (renderEvent 함수 내 switch case 끝부분)
case 'SPIRIT_RAGE_LETTER': return <RageLetter key={`event-${idx}`} event={event} onChoose={handleSpiritChoose} disabled={isLoading} />;
case 'SPIRIT_THINK_FRAME': return <ThinkFrame key={`event-${idx}`} event={event} onChoose={handleSpiritChoose} disabled={isLoading} />;
case 'SPIRIT_CRY_TOGETHER': return <CryTogether key={`event-${idx}`} event={event} onChoose={handleSpiritChoose} disabled={isLoading} />;
case 'SPIRIT_FIRST_BREATH': return <FirstBreath key={`event-${idx}`} event={event} onChoose={handleSpiritChoose} disabled={isLoading} />;
case 'SPIRIT_RHYTHM_CHECK': return <RhythmCheck key={`event-${idx}`} event={event} onChoose={handleSpiritChoose} disabled={isLoading} />;
case 'SPIRIT_OLIVE_BRANCH': return <OliveBranch key={`event-${idx}`} event={event} onChoose={handleSpiritChoose} disabled={isLoading} />;
case 'SPIRIT_CLOUD_REFRAME': return <CloudReframe key={`event-${idx}`} event={event} onChoose={handleSpiritChoose} disabled={isLoading} />;
case 'SPIRIT_LETTER_BRIDGE': return <LetterBridge key={`event-${idx}`} event={event} onChoose={handleSpiritChoose} disabled={isLoading} />;
case 'SPIRIT_WINDOW_OPEN': return <WindowOpen key={`event-${idx}`} event={event} onChoose={handleSpiritChoose} disabled={isLoading} />;
case 'SPIRIT_NIGHT_CONFESSION': return <NightConfession key={`event-${idx}`} event={event} onChoose={handleSpiritChoose} disabled={isLoading} />;
case 'SPIRIT_REVERSE_ROLE': return <ReverseRole key={`event-${idx}`} event={event} onChoose={handleSpiritChoose} disabled={isLoading} />;
case 'SPIRIT_BUTTERFLY_DIARY': return <ButterflyDiary key={`event-${idx}`} event={event} onChoose={handleSpiritChoose} disabled={isLoading} />;
case 'SPIRIT_ROOTED_HUG': return <RootedHug key={`event-${idx}`} event={event} onChoose={handleSpiritChoose} disabled={isLoading} />;
case 'SPIRIT_FALLEN_PETALS': return <FallenPetals key={`event-${idx}`} event={event} onChoose={handleSpiritChoose} disabled={isLoading} />;
case 'SPIRIT_FREEZE_FRAME': return <FreezeFrame key={`event-${idx}`} event={event} onChoose={handleSpiritChoose} disabled={isLoading} />;
case 'SPIRIT_BOLT_CARD': return <BoltCard key={`event-${idx}`} event={event} onChoose={handleSpiritChoose} disabled={isLoading} />;
case 'SPIRIT_METAMORPHOSIS': return <Metamorphosis key={`event-${idx}`} event={event} onChoose={handleSpiritChoose} disabled={isLoading} />;
case 'SPIRIT_MEMORY_KEY': return <MemoryKey key={`event-${idx}`} event={event} onChoose={handleSpiritChoose} disabled={isLoading} />;
case 'SPIRIT_CROWN_RECLAIM': return <CrownReclaim key={`event-${idx}`} event={event} onChoose={handleSpiritChoose} disabled={isLoading} />;
case 'SPIRIT_WISH_GRANT': return <WishGrant key={`event-${idx}`} event={event} onChoose={handleSpiritChoose} disabled={isLoading} />;
```

### 15.2 공통 셸 — `SpiritEventCard.tsx`

20개 카드가 공유하는 외곽:

```tsx
// src/components/chat/events/spirits/SpiritEventCard.tsx
import { motion } from 'framer-motion';
import { getSpirit } from '@/data/spirits';

interface Props {
  spiritId: string;
  themeColor?: string;
  children: React.ReactNode;
  onSkip: () => void;
  showSkip?: boolean;
  className?: string;
}

export function SpiritEventCard({
  spiritId,
  themeColor,
  children,
  onSkip,
  showSkip = true,
  className = '',
}: Props) {
  const master = getSpirit(spiritId);
  const color = themeColor ?? master?.themeColor ?? '#A78BFA';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`spirit-card relative rounded-2xl border-2 p-5 ${className}`}
      style={{ borderColor: color, background: `linear-gradient(135deg, ${color}10, ${color}05)` }}
    >
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{master?.emoji}</span>
        <span className="text-sm font-semibold" style={{ color }}>{master?.name}</span>
      </div>
      
      {/* 본문 */}
      <div className="spirit-card-body">
        {children}
      </div>
      
      {/* 스킵 (모든 카드 공통, 단 freeze_frame은 60초 강제 잠금) */}
      {showSkip && (
        <button
          onClick={onSkip}
          className="absolute top-3 right-3 text-xs text-gray-400 hover:text-gray-600"
          aria-label="이 카드 스킵"
        >
          ⏭️ 다음에
        </button>
      )}
    </motion.div>
  );
}
```

### 15.3 카드 컴포넌트 작성 패턴 (예: `RageLetter.tsx`)

```tsx
// src/components/chat/events/spirits/RageLetter.tsx
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent } from '@/types/engine.types';
import type { RageLetterData } from '@/engines/spirits/spirit-event-types';
import { motion } from 'framer-motion';

interface Props {
  event: PhaseEvent;
  onChoose: (value: string, data?: any) => void;
  disabled?: boolean;
}

export default function RageLetter({ event, onChoose, disabled }: Props) {
  const data = event.data as RageLetterData;
  
  return (
    <SpiritEventCard 
      spiritId="fire_goblin"
      onSkip={() => onChoose('skip')}
    >
      <p className="font-semibold mb-2">{data.openerMsg}</p>
      <p className="text-sm text-gray-600 mb-4">{data.context}</p>
      
      <div className="space-y-2">
        {data.drafts.map((d, i) => (
          <motion.button
            key={d.intensity}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 }}
            disabled={disabled}
            onClick={() => onChoose('burn', { selectedIntensity: d.intensity })}
            className="w-full text-left p-3 rounded-lg border border-red-300 hover:bg-red-50 transition"
          >
            <div className="text-xs font-bold text-red-600 mb-1">{d.label}</div>
            <div className="text-sm whitespace-pre-wrap">{d.text}</div>
          </motion.button>
        ))}
      </div>
      
      <p className="text-xs italic text-gray-500 mt-3">{data.lunaCutIn}</p>
      
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onChoose('rewrite')}
          className="flex-1 py-2 rounded-lg bg-amber-100 text-amber-700"
        >
          ✏️ 직접 써볼게
        </button>
      </div>
    </SpiritEventCard>
  );
}
```

나머지 19개 카드도 같은 패턴. 각 카드의 *고유 애니/색* 만 차이.

### 15.4 useChat 후처리

`src/hooks/useChat.ts` 의 `firedEventTypesRef` 에 `SPIRIT_*` 20개 추가하여 같은 세션 중복 발동 방지. `handleSpiritChoose` 콜백에서:

```typescript
const handleSpiritChoose = (value: string, meta?: any) => {
  const event = currentSpiritEvent;
  if (!event) return;
  // 1) DB 업데이트 (user_choice + user_input)
  fetch('/api/spirits/event/choose', {
    method: 'POST',
    body: JSON.stringify({ eventType: event.type, value, meta }),
  });
  // 2) 다음 턴 LLM 컨텍스트로 SuggestionMeta 전달
  handleSuggestionSelect(value, {
    source: 'spirit_event',
    context: { spiritId: event.data.spiritId, eventType: event.type, ...meta },
  });
};
```

---

## 16. 다른 정령 능력 (passive) 와의 공존

기존 v83 `spirit-abilities.ts` 의 passive buff (예: `analysisBoost`, `comfortBoost`) 는 **그대로 유지**. v104 랜덤 이벤트는 *새 레이어*. 즉:

- `book_worm` Lv 3 시: `analysisBoost: true` (기존) **+** `SPIRIT_THINK_FRAME` 카드 풀 활성화 (신규).
- `tear_drop` Lv 5 시: `comfortBoost + TTS 무료화` (기존) **+** `SPIRIT_CRY_TOGETHER` 카드.

두 레이어가 충돌하지 않게:

- passive는 *지속* (모든 턴), 랜덤이벤트는 *순간* (1턴 카드).
- passive는 LLM 응답 *톤* 에 영향 (느린 말풍선 등), 랜덤이벤트는 *카드 UI*.
- 같은 정령의 passive와 카드가 동시에 활성될 수 있음 (예: 슬픔 세션에서 슬프니 passive 작동 + 깊은 슬픔 순간 CRY_TOGETHER 카드 1번).

---

## 17. 비용 분석 — 자세히

| 이벤트 | Type | 호출당 비용 | 일일 평균 발동 (Lv3+ 활성 유저 기준) | 일일 비용 |
|---|---|---|---|---|
| SPIRIT_RAGE_LETTER | B | ₩3 | 0.4회 | ₩1.2 |
| SPIRIT_THINK_FRAME | B | ₩3 | 0.6회 | ₩1.8 |
| SPIRIT_CRY_TOGETHER | A | ₩0 | 0.2회 | ₩0 |
| SPIRIT_FIRST_BREATH | A | ₩0 | 0.7회 | ₩0 |
| SPIRIT_RHYTHM_CHECK | B | ₩3 | 0.1회 | ₩0.3 |
| SPIRIT_OLIVE_BRANCH | B | ₩3 | 0.2회 | ₩0.6 |
| SPIRIT_CLOUD_REFRAME | B | ₩3 | 0.3회 | ₩0.9 |
| SPIRIT_LETTER_BRIDGE | B | ₩3 | 0.1회 | ₩0.3 |
| SPIRIT_WINDOW_OPEN | A | ₩0 | 0.4회 | ₩0 |
| SPIRIT_NIGHT_CONFESSION | B | ₩3 | 0.15회 | ₩0.45 |
| SPIRIT_REVERSE_ROLE | B | ₩3 | 0.1회 | ₩0.3 |
| SPIRIT_BUTTERFLY_DIARY | B | ₩3 | 0.3회 | ₩0.9 |
| SPIRIT_ROOTED_HUG | A | ₩0 | 0.2회 | ₩0 |
| SPIRIT_FALLEN_PETALS | B (시 한줄만) | ₩2 | 0.05회 | ₩0.1 |
| SPIRIT_FREEZE_FRAME | A | ₩0 | 0.05회 | ₩0 |
| SPIRIT_BOLT_CARD | A+B | ₩2 | 0.5회 | ₩1 |
| SPIRIT_METAMORPHOSIS | B (DB쿼리 + 시 한줄) | ₩2 | 0.05회 | ₩0.1 |
| SPIRIT_MEMORY_KEY | B (DB쿼리 + 한줄) | ₩2 | 0.05회 | ₩0.1 |
| SPIRIT_CROWN_RECLAIM | B | ₩3 | 0.1회 | ₩0.3 |
| SPIRIT_WISH_GRANT | B | ₩3 | 0.03회 | ₩0.1 |
| **합계** | | | **~4.13회/일** | **~₩8.4/일** |

월간: 유저당 약 ₩252. 활성 유저 1만명 가정 시 월 ₩252만 (≒ $1,860).

**비용 절감 옵션** (Phase 12 이후 필요 시):
- 합성기 캐싱 (같은 컨텍스트 → 5분 TTL)
- A/B 비율 조정 (Type A 폴백 풀 확장)
- Brave Search 무료 1K 호출 활용 (book_keeper 패턴 분석에 재활용)

---

## 18. 구현 로드맵 — 4 Sprint

### Sprint 1 — Foundation (Day 1~3)

**목표**: 타입/DB/게이트/공통 셸까지.

- [ ] D1: `spirit-event-types.ts` 작성 + `engine.types.ts` PhaseEventType 확장
- [ ] D1: `20260503_v104_spirit_random_events.sql` 마이그레이션 (dev 적용)
- [ ] D2: `spirit-event-config.ts` (PHASE_WHITELIST, COOLDOWN, SPIRIT_TO_EVENT)
- [ ] D2: `spirit-event-gate.ts` 6단 게이트 + `isContextAllowed` + `heuristicFallback`
- [ ] D2: `spirit-event-repo.ts` (fetchLastFire, fetchMonthlyWish, logSpiritFire)
- [ ] D3: `spirit-event-signal.ts` 태그 파싱
- [ ] D3: `SpiritEventCard.tsx` 공통 셸
- [ ] D3: 단위 테스트 — gate, parser, cooldown 계산

### Sprint 2 — Type A (정적) 7개 + 합성기 골격 (Day 4~6)

**목표**: LLM 호출 없이 즉시 동작하는 7개 카드 완성.

- [ ] D4: `spirit-event-fallbacks.ts` 정적 풀 작성 (20개 fallback 5세트씩)
- [ ] D4: `spirit-event-synthesizer.ts` 골격 (Type A 분기 완비)
- [ ] D5: `CryTogether.tsx`, `FirstBreath.tsx`, `WindowOpen.tsx`
- [ ] D5: `FreezeFrame.tsx`, `RootedHug.tsx`
- [ ] D6: `BoltCard.tsx` (메타 — pickFromOthers 로직 + 0.8s 입장 애니)
- [ ] D6: ChatContainer 라우팅 7 case 추가
- [ ] D6: useChat firedEventTypesRef + handleSpiritChoose + DB write

### Sprint 3 — Type B (LLM 합성) 13개 (Day 7~12)

**목표**: 13개 정령별 프롬프트 + 카드 UI 전부.

- [ ] D7: `spirit-event-prompts.ts` 13개 프롬프트
- [ ] D7: ACE-v5 시스템 프롬프트 정령 가이드 섹션 + handoff-builder activeSpiritList
- [ ] D8: `RageLetter`, `ThinkFrame`, `OliveBranch`
- [ ] D9: `CloudReframe`, `LetterBridge`, `NightConfession`
- [ ] D10: `ReverseRole`, `ButterflyDiary`, `RhythmCheck`
- [ ] D11: `FallenPetals` (꽃잎 흩날리기 애니), `Metamorphosis` (DB쿼리), `MemoryKey` (n-gram)
- [ ] D12: `CrownReclaim` (왕관 의식 애니), `WishGrant` (별똥이 + push 알림 등록)

### Sprint 4 — 통합 + QA (Day 13~16)

- [ ] D13: pipeline 통합 — selectSpiritEvent + yield + log
- [ ] D13: 안전 가드 (`validateAndCoerce`, UNSAFE_PATTERNS)
- [ ] D14: E2E 시나리오 테스트 (10개 정령 × 시나리오 매트릭스 절반)
- [ ] D14: 모바일 사파리/크롬 애니 성능 60fps 확인
- [ ] D15: 비용 추적 대시보드 (spirit_event_fires 집계 쿼리)
- [ ] D15: 푸시 알림 등록 (별똥이 if 시간 도달 시)
- [ ] D16: 출시 준비 — feature flag (`OMC_FEATURE_SPIRIT_EVENTS_V104=true`) 로 점진 롤아웃

---

## 19. 검증 체크리스트

### 19.1 단위 테스트

- [ ] **gate**: 모든 정령 × 모든 Phase × 모든 risk × 쿨타임 매트릭스 (~20×5×5 = 500 케이스)
- [ ] **parser**: 정상 태그 / 다중 태그 (1개만 채택) / 잘못된 태그 / 빈 파라미터
- [ ] **cooldown**: turns / hours / days / monthly 4종 모두
- [ ] **synthesizer**: Type A 풀 픽 균등 / Type B fallback 트리거
- [ ] **safety**: UNSAFE_PATTERNS 12종 검출
- [ ] **bolt_card**: 같은 세션 발동된 정령 제외 검증

### 19.2 수동 시나리오 테스트

| # | 시나리오 | 정령 배치 | 기대 결과 |
|---|---|---|---|
| 1 | 분노 발화 + 🔥 Lv3 배치 | fire_goblin only | RageLetter 카드 발동 |
| 2 | 새벽 0:30 첫 세션 + 🌙 Lv3 | moon_rabbit | NightConfession 카드 |
| 3 | 위기 키워드 + 🔥 Lv3 | fire_goblin | 카드 차단, 위기 모듈 |
| 4 | 같은 세션 분노 2회 | fire_goblin | 1회만 카드, 2회는 차단 |
| 5 | 이별 EMPOWER + 🌸 Lv3 | cherry_leaf | FallenPetals + 꽃잎 애니 |
| 6 | 일일 첫 세션 + ⚡ Lv3 | lightning_bird + fire_goblin | 50% BoltCard, 그 안에 fire_goblin pick 가능 |
| 7 | 가입 5일차 + 🦋 Lv3 | butterfly_meta | 차단 (30일 미만) |
| 8 | turn=1 + 🌱 Lv3 | seed_spirit | FirstBreath |
| 9 | turn=12 + 🌳 Lv3 | forest_mom | RootedHug |
| 10 | 자기비하 + 👑 Lv3 | queen_elena | CrownReclaim, 7일 쿨타임 후 재발동 OK |
| 11 | 별똥이 월 사용 후 재발동 시도 | star_dust | 차단 (monthly) |
| 12 | 농담 적정 분위기 + ☁️ Lv3 | cloud_bunny | CloudReframe, *but* riskLevel=MEDIUM이면 차단 |
| 13 | 카드 skip 후 다음 턴 | — | 다음 턴 루나 톤이 *카드 거절 인지* |
| 14 | 답장 리듬 발화 + 🥁 Lv3 | drum_imp | RhythmCheck, 7일 쿨타임 |
| 15 | 5턴 무거움 + 🍃 Lv3 | wind_sprite | WindowOpen, 5분 타이머 |

### 19.3 데이터 검증 SQL

```sql
-- 세션당 정령 카드 발동 횟수 분포 (2 이하여야 함)
select session_id, count(*) as fires
from spirit_event_fires
group by session_id
having count(*) > 2;
-- 결과: 0 row

-- 정령별 평균 일일 발동 (예상치와 비교)
select spirit_id, count(*)::float / 7 as avg_daily
from spirit_event_fires
where fired_at > now() - interval '7 days'
group by spirit_id
order by avg_daily desc;

-- 같은 정령 쿨타임 위반 검출 (있으면 안 됨)
select user_id, spirit_id, fired_at,
  lag(fired_at) over (partition by user_id, spirit_id order by fired_at) as prev_fire
from spirit_event_fires
where fired_at - lag(fired_at) over (partition by user_id, spirit_id order by fired_at) 
      < interval '24 hours'  -- 정령별 정책 다르지만 최저값
  and spirit_id in ('fire_goblin','tear_drop','seed_spirit','rose_fairy','forest_mom',
                    'moon_rabbit','ice_prince','lightning_bird');
-- 결과: 0 row
```

### 19.4 성능 / UX

- [ ] 카드 등장 60fps (Chrome devtools Performance)
- [ ] 모바일 LCP 영향 < 50ms (카드 미발동 세션)
- [ ] 카드 발동 시 LLM 응답 streaming 인터럽트 X (카드는 본문 끝난 후만 yield)
- [ ] 카드 닫힘 후 입력창 포커스 복원

### 19.5 안전 (가장 중요)

- [ ] 모든 카드의 *세션당 정령 합산 ≤ 2* 시각적 확인 (10세션 무작위 검토)
- [ ] HIGH/CRITICAL risk 발화 시 *정령 카드 0개* (50 케이스 검토)
- [ ] 가스라이팅성 ThinkFrame 출력 차단 (50 LLM 호출 검토)
- [ ] 자기비하 강화 CrownReclaim 차단 (실제 가치 호명만)
- [ ] 별똥이 if-then 의 then 이 위험 행동 X (술/충동 거래 등) — 룰 가드 통과율 100%

---

## 20. 리스크 & 완화

| 리스크 | 영향 | 완화 |
|---|---|---|
| 정령 카드가 너무 자주 떠서 *상담 게임화* | 신뢰 하락 | 세션 상한 2회 + 유저 설정 토글 (`상담 중 정령 카드 ON/OFF`) |
| LLM 합성이 가스라이팅성 출력 | 안전 위협 | UNSAFE_PATTERNS + reroll + 가드 로직 |
| 위기 상황에 카드 잘못 발동 | 치명 | risk 게이트 0순위 + LLM 프롬프트 명시 차단 |
| 60초 freeze_frame 이 통제 트리거 | 트라우마 자극 | 24h 쿨타임 + 유저 설정에서 freeze_frame 단독 OFF 가능 |
| 별똥이 푸시 알림 스팸 인식 | 앱 삭제 | 옵트인 + 1회만 + 미응답 누적 시 비활성 |
| 마이그레이션 시 RLS 누락 | 정보 유출 | RLS 정책 마이그레이션과 동시 + 자동화 테스트 |
| Type B 합성 비용 폭증 | 운영비 | 일일 비용 모니터링 + 5분 TTL 캐시 + Type A 풀 확장 |
| 정령 일러스트 부재 | UX 저하 | 1차는 emoji + 색상 + 폰트 디자인 토큰만으로 충분, 일러스트는 v105 |
| 한국 외 timezone 유저 | moon_rabbit 오발동 | server 시계 KST 고정 + future: 유저 timezone profile |
| 같은 정령 카드 반복으로 *진부* | 흥미 저하 | reroll 기능 + Type A 풀 매주 확장 추가 |

---

## 21. 향후 확장 (v105+)

### 21.1 정령 일러스트 + 보이스
- 20마리 sprite 4 frame 표정 (idle/happy/sad/wink)
- 정령별 보이스 (TTS, 별똥이 한정 무료, 그 외 별빛 ⭐ 결제)

### 21.2 정령 콜라보 카드 (Lv 5 둘 이상 활성)
- 🌹 + 💌 → "쟁쟁한 첫 카톡 합주" (drafted by 둘이)
- 👑 + 🦋 → "다시 일어난 너 90일 비교 스토리"
- 🔥 + ❄️ → "활활 + 찬물" 폭풍 진정 콤보
- 🌙 + 🌟 → "새벽 별 약속" (월 1회 고밀도 의식)

### 21.3 유저 별 정령 추천
- 사용 패턴 분석 → 추천 정령 (예: 분노 자주 → 🔥 추천 배너)
- 정령 카드 선호도 학습 → BoltCard 가중치 개인화

### 21.4 정령 카드 이력 메뉴
- 마음의 방 우편함에 *카드 이력* 새 탭
- 회고: "지난 주 너의 카드들" 5개 + 통계 (가장 많이 본 정령)

### 21.5 다음 정령 (가챠 22번째~)
- 🦊 여우 — 직감 정령
- 🐢 거북이 — 천천히 결정 정령
- 🐉 용 — 큰 결심 정령 (UR)

---

## 22. 마무리 — 한 문단으로

> v104 Spirit Random Events 는 *정령 시스템의 두 번째 얼굴* 이다. 첫 얼굴(v83)이 "수집과 꾸미기"였다면, 두 번째 얼굴은 "**상담실 안에서 같이 일하는 작은 도구들**"이다. 20마리 정령은 각자 1개의 시그니처 카드를 들고, 어떤 Phase 어떤 시나리오에서도 *그 정령다운 결*로 1턴짜리 인터벤션을 추가한다. 분노 폭발 편지, 3프레임 재해석, 침묵 1분, 새벽 고백실, 입장 바꿔 5턴, 떨어진 꽃잎, 60초 멈춤, 변태 거울, 왕좌 회복, 한 가지 소원 — 이 20개는 심리치료에서 검증된 마이크로 인터벤션을 한국 정 정서로 옮긴 것이다. 유저는 정령을 키울수록 자기 상담의 도구함이 *눈에 보이게 늘어나는 경험*을 한다. 코드는 Sprint 4개 (16일) 안에 완성 가능하다. 비용은 유저당 월 ₩252, 활성 1만명 기준 월 약 ₩2.5M. 위기 안전, 자기비하 비강화, 가스라이팅 차단의 3중 가드가 전 카드에 들어간다. 이 계획서가 바이브 코딩으로 옮겨질 때, 자기완결적 Sprint 단위 (Foundation → Type A → Type B → Integration) 로 나눠 작업하면 LLM 컨텍스트 안에서도 한 Sprint 씩 깔끔히 닫힌다.

---

## 23. 빠른 시작 (바이브 코딩 첫날 명령)

```bash
# 1. 신규 폴더 생성
mkdir -p src/engines/spirits/{events}
mkdir -p src/components/chat/events/spirits
mkdir -p supabase/migrations
mkdir -p src/data

# 2. 마이그레이션 파일 작성
# (Part 4 §10 SQL 그대로 → supabase/migrations/20260503_v104_spirit_random_events.sql)

# 3. 타입/게이트/설정 파일 (Sprint 1)
touch src/engines/spirits/spirit-event-types.ts        # §9
touch src/engines/spirits/spirit-event-gate.ts         # §13
touch src/engines/spirits/spirit-event-signal.ts       # §12.3
touch src/engines/spirits/spirit-event-repo.ts         # DB CRUD
touch src/engines/spirits/spirit-event-synthesizer.ts  # §14
touch src/engines/spirits/spirit-event-prompts.ts      # §14.1
touch src/engines/spirits/spirit-event-cooldowns.ts    # SPIRIT_COOLDOWN 상수
touch src/data/spirit-event-config.ts                  # PHASE_WHITELIST, MAPPING
touch src/data/spirit-event-fallbacks.ts               # 정적 풀

# 4. 카드 컴포넌트 셸 + 20개 (Sprint 2~3)
touch src/components/chat/events/spirits/SpiritEventCard.tsx
for evt in RageLetter ThinkFrame CryTogether FirstBreath RhythmCheck OliveBranch \
  CloudReframe LetterBridge WindowOpen NightConfession ReverseRole ButterflyDiary RootedHug \
  FallenPetals FreezeFrame BoltCard Metamorphosis MemoryKey CrownReclaim WishGrant; do
  touch "src/components/chat/events/spirits/${evt}.tsx"
done

# 5. 마이그레이션 적용
npx supabase migration up

# 6. 타입 체크
npx tsc --noEmit
```

---

## 24. 최종 체크 — 출시 직전

- [ ] 모든 단위 테스트 통과 (jest)
- [ ] §19.2 수동 시나리오 15개 모두 통과
- [ ] §19.3 SQL 검증 모두 0 row 또는 정상 분포
- [ ] feature flag `OMC_FEATURE_SPIRIT_EVENTS_V104` OFF 시 v103 동일 동작 (회귀 0)
- [ ] 모바일 iOS Safari + Android Chrome 60fps 확인
- [ ] 비용 대시보드 1주일 운영 후 예상 범위 ±20% 내
- [ ] CS 매뉴얼 추가 (정령 카드 안 보임 / 너무 자주 / 끄고 싶음 → 응답 가이드)
- [ ] 변경 로그 / 출시 노트 작성
- [ ] AGENTS.md 룰 준수: Next.js 변경된 부분이 있으면 `node_modules/next/dist/docs/` 확인

---

**END OF PLAN**

총 분량 (4 part 합산): A4 약 50장.
- Part 1: 비전 + 아키텍처 + N6 정령 → 13장
- Part 2: R7 정령 → 13장
- Part 3: SR5 + UR2 정령 + 매트릭스 → 12장
- Part 4: 구현 가이드 (타입/DB/Pipeline/UI/프롬프트/로드맵/검증) → 12장

이 4부 계획서는 *바이브 코딩 1Sprint 단위* 로 분할 가능하게 설계되었다. AI 코딩 에이전트가 한 번에 한 Part 만 컨텍스트에 올려도 자기완결적으로 작업 가능하다.

🦊 — *루나가 너 옆에 있는 동안, 20마리 작은 친구들이 옆에서 옆에서 같이 거든다.*
