/**
 * 🧚 v104: Spirit Event Gate
 *
 * 활성 정령 풀 산출 → 6단 게이트 → LLM 태그 매칭 → 휴리스틱 폴백.
 * Pipeline 에서 매 응답 후 1회 호출.
 *
 * 6단 검사 순서:
 *   0) Risk (CRITICAL/HIGH 차단, MEDIUM_HIGH 부분차단)
 *   1) 세션 상한 (SESSION_CAP=2)
 *   2) 활성 정령 풀 (Lv3+ 방배치)
 *   3) Phase 화이트리스트
 *   4) 세션 내 중복 금지
 *   5) 정령별 쿨타임 (turns/hours/days/monthly)
 *   6) 시나리오/턴/시간 등 컨텍스트 게이트 (정령마다)
 */

import type { SpiritId } from '@/types/spirit.types';
import { getActiveSpirits, type ActiveSpirit } from './spirit-abilities';
import {
  SPIRIT_TO_EVENT,
  SPIRIT_COOLDOWN,
  SESSION_CAP,
  SPIRIT_BLOCKED_AT_HIGH_RISK,
  isPhaseAllowed,
} from './spirit-event-config';
import {
  fetchLastFiresBulk,
  hasUsedMonthlyWish,
} from './spirit-event-repo';
import type {
  SpiritEventGateContext,
  SpiritEventGateResult,
  SpiritEventType,
} from './spirit-event-types';

// ────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────
export async function selectSpiritEvent(
  ctx: SpiritEventGateContext,
): Promise<SpiritEventGateResult> {
  // 0) Risk 차단
  if (ctx.riskLevel === 'CRITICAL' || ctx.riskLevel === 'HIGH') {
    return { ok: false, rejectReason: 'risk_block' };
  }

  // 1) 세션 상한
  if (ctx.firedThisSession.length >= SESSION_CAP) {
    return { ok: false, rejectReason: 'session_cap' };
  }

  // 2) 활성 정령 풀
  const active = ctx.preloadedActiveSpirits ?? (await getActiveSpirits(ctx.userId));
  if (active.length === 0) {
    return { ok: false, rejectReason: 'no_active_spirit' };
  }

  // 2-1) MEDIUM_HIGH 시 일부 정령 차단
  const riskFiltered = active.filter((s) => {
    if (ctx.riskLevel === 'MEDIUM_HIGH' && SPIRIT_BLOCKED_AT_HIGH_RISK.has(s.spiritId)) {
      return false;
    }
    return true;
  });
  if (riskFiltered.length === 0) {
    return { ok: false, rejectReason: 'risk_block' };
  }

  // 3) Phase + 4) 중복 + 5) 쿨타임 + 6) 컨텍스트 게이트
  const lastFires = await fetchLastFiresBulk(
    ctx.userId,
    riskFiltered.map((s) => s.spiritId),
  );
  const wishUsed = riskFiltered.some((s) => s.spiritId === 'star_dust')
    ? await hasUsedMonthlyWish(ctx.userId, ctx.now)
    : false;

  const eligible: ActiveSpirit[] = [];
  for (const s of riskFiltered) {
    const evt = SPIRIT_TO_EVENT[s.spiritId];
    if (!evt) continue;

    // Phase 검사
    if (!isPhaseAllowed(s.spiritId, ctx.phase)) continue;

    // 세션 중복 검사
    if (ctx.firedThisSession.includes(evt)) continue;

    // 쿨타임 검사
    const last = lastFires.get(s.spiritId);
    if (!isCooldownExpired(s.spiritId, last, ctx.now, wishUsed)) continue;

    // 컨텍스트 게이트
    if (!isContextAllowed(s.spiritId, ctx)) continue;

    eligible.push(s);
  }

  if (eligible.length === 0) {
    return { ok: false, rejectReason: 'no_active_spirit' };
  }

  // ── LLM 태그 우선 매칭 ──
  for (const tag of ctx.parsedTags) {
    const match = eligible.find((s) => SPIRIT_TO_EVENT[s.spiritId] === tag.eventType);
    if (match) {
      return {
        ok: true,
        spiritId: match.spiritId,
        eventType: tag.eventType,
        source: 'llm_tag',
      };
    }
  }

  // ── 휴리스틱 폴백 ──
  const fallback = heuristicFallback(eligible, ctx);
  if (fallback) {
    return { ok: true, ...fallback, source: 'heuristic' };
  }

  return { ok: false, rejectReason: 'no_active_spirit' };
}

// ────────────────────────────────────────────────────────────
// 쿨타임 검사
// ────────────────────────────────────────────────────────────
function isCooldownExpired(
  spiritId: SpiritId,
  lastFire: Date | undefined,
  now: Date,
  wishUsedMonthly: boolean,
): boolean {
  const policy = SPIRIT_COOLDOWN[spiritId];
  if (!policy) return true;

  // 별똥이는 월간 사용 여부 우선
  if (spiritId === 'star_dust') {
    return !wishUsedMonthly;
  }

  if (!lastFire) return true;
  const elapsedMs = now.getTime() - lastFire.getTime();
  if (policy.hours && elapsedMs / 36e5 < policy.hours) return false;
  if (policy.days && elapsedMs / 864e5 < policy.days) return false;
  // turns 정책은 같은 세션에서만 의미 → fired_this_session 으로 이미 가드됨
  return true;
}

// ────────────────────────────────────────────────────────────
// 컨텍스트 게이트 (정령마다 특수 조건)
// ────────────────────────────────────────────────────────────
function isContextAllowed(spiritId: SpiritId, ctx: SpiritEventGateContext): boolean {
  switch (spiritId) {
    case 'seed_spirit':
      return ctx.turn === 1;
    case 'forest_mom':
      return ctx.turn >= 10;
    case 'moon_rabbit': {
      const h = ctx.now.getHours();
      // KST 가정 (서버 tz=KST 또는 클라이언트 hour 주입)
      return h >= 0 && h <= 5;
    }
    case 'wind_sprite':
      return ctx.consecutiveLowMoodTurns >= 5;
    case 'butterfly_meta':
    case 'book_keeper':
      return ctx.userAgeDays >= 30;
    case 'cloud_bunny':
      // 농담은 LOW 위험에서만
      return ctx.riskLevel === 'LOW';
    case 'cherry_leaf':
      // 이별 결정 시나리오 + EMPOWER (Phase 는 이미 확인됨)
      return ctx.scenario === 'BREAKUP_CONTEMPLATION';
    case 'star_dust':
      return ctx.phase === 'EMPOWER';
    default:
      return true;
  }
}

// ────────────────────────────────────────────────────────────
// 휴리스틱 폴백 (LLM 태그 없을 때)
// ────────────────────────────────────────────────────────────
function heuristicFallback(
  eligible: ActiveSpirit[],
  ctx: SpiritEventGateContext,
): { spiritId: SpiritId; eventType: SpiritEventType } | null {
  const has = (id: SpiritId) => eligible.find((s) => s.spiritId === id);

  // 1순위 — 시간/턴 특화 (moon_rabbit, seed_spirit)
  const m = has('moon_rabbit');
  if (m && ctx.turn === 1) {
    return { spiritId: 'moon_rabbit', eventType: 'SPIRIT_NIGHT_CONFESSION' };
  }
  const s = has('seed_spirit');
  if (s && ctx.turn === 1) {
    return { spiritId: 'seed_spirit', eventType: 'SPIRIT_FIRST_BREATH' };
  }

  // 2순위 — 분노 (fire_goblin)
  const f = has('fire_goblin');
  if (f && ctx.emotionScore <= -3 && (ctx.intent === 'VENTING' || ctx.intent === 'STORYTELLING')) {
    return { spiritId: 'fire_goblin', eventType: 'SPIRIT_RAGE_LETTER' };
  }

  // 3순위 — 깊은 슬픔 (tear_drop)
  const t = has('tear_drop');
  if (t && ctx.emotionScore <= -5) {
    return { spiritId: 'tear_drop', eventType: 'SPIRIT_CRY_TOGETHER' };
  }

  // 4순위 — 인지왜곡 (book_worm)
  const b = has('book_worm');
  if (b && ctx.cognitiveDistortions.length >= 1) {
    return { spiritId: 'book_worm', eventType: 'SPIRIT_THINK_FRAME' };
  }

  // 5순위 — 무거움 5턴+ (wind_sprite)
  const w = has('wind_sprite');
  if (w && ctx.consecutiveLowMoodTurns >= 5) {
    return { spiritId: 'wind_sprite', eventType: 'SPIRIT_WINDOW_OPEN' };
  }

  // 6순위 — 그라운딩 (forest_mom, 10턴+)
  const fm = has('forest_mom');
  if (fm && ctx.turn >= 10) {
    return { spiritId: 'forest_mom', eventType: 'SPIRIT_ROOTED_HUG' };
  }

  // 7순위 — 자기비하 (queen_elena, EMPOWER)
  const q = has('queen_elena');
  if (q && ctx.phase === 'EMPOWER' && ctx.emotionScore <= -2) {
    return { spiritId: 'queen_elena', eventType: 'SPIRIT_CROWN_RECLAIM' };
  }

  // 8순위 — 변화 거울 (butterfly_meta, EMPOWER + 30일+)
  const bm = has('butterfly_meta');
  if (bm && ctx.phase === 'EMPOWER' && ctx.userAgeDays >= 30) {
    return { spiritId: 'butterfly_meta', eventType: 'SPIRIT_METAMORPHOSIS' };
  }

  // 9순위 — 패턴 (book_keeper, BRIDGE)
  const bk = has('book_keeper');
  if (bk && ctx.phase === 'BRIDGE' && ctx.userAgeDays >= 30) {
    return { spiritId: 'book_keeper', eventType: 'SPIRIT_MEMORY_KEY' };
  }

  // 10순위 — 화해 시나리오 (peace_dove, SOLVE)
  const pd = has('peace_dove');
  if (pd && (ctx.scenario === 'GHOSTING' || ctx.scenario === 'RECONNECTION')) {
    return { spiritId: 'peace_dove', eventType: 'SPIRIT_OLIVE_BRANCH' };
  }

  // 11순위 — 이별 의식 (cherry_leaf, EMPOWER + BREAKUP)
  const cl = has('cherry_leaf');
  if (cl && ctx.phase === 'EMPOWER' && ctx.scenario === 'BREAKUP_CONTEMPLATION') {
    return { spiritId: 'cherry_leaf', eventType: 'SPIRIT_FALLEN_PETALS' };
  }

  // 12순위 — 일일 1회 surprise (lightning_bird) — 가장 약한 폴백
  const l = has('lightning_bird');
  if (l) {
    // 50% 확률 발동 (BoltCard 자체가 이미 일일 1회 쿨타임 가드)
    if (Math.random() < 0.5) {
      return { spiritId: 'lightning_bird', eventType: 'SPIRIT_BOLT_CARD' };
    }
  }

  return null;
}
