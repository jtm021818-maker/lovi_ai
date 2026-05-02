/**
 * 🧚 v104: Spirit Event Config
 *
 * - SPIRIT_TO_EVENT: 정령 ↔ 이벤트 1:1 매핑
 * - SPIRIT_PHASE_WHITELIST: 어느 Phase 에서 발동 허용
 * - SPIRIT_COOLDOWN: 정령별 쿨타임 정책
 * - SESSION_CAP: 세션당 정령 카드 최대 발동 수
 * - SPIRIT_TYPE_A: LLM 호출 없이 정적으로 합성되는 이벤트
 */

import type { SpiritId } from '@/types/spirit.types';
import type { ConversationPhaseV2 } from '@/types/engine.types';
import type { SpiritEventType } from './spirit-event-types';

// ────────────────────────────────────────────────────────────
// 1) Spirit ↔ Event 매핑 (1:1)
// ────────────────────────────────────────────────────────────
export const SPIRIT_TO_EVENT: Record<SpiritId, SpiritEventType | null> = {
  // N (6)
  fire_goblin: 'SPIRIT_RAGE_LETTER',
  book_worm: 'SPIRIT_THINK_FRAME',
  tear_drop: 'SPIRIT_CRY_TOGETHER',
  seed_spirit: 'SPIRIT_FIRST_BREATH',
  drum_imp: 'SPIRIT_RHYTHM_CHECK',
  peace_dove: 'SPIRIT_OLIVE_BRANCH',
  // R (7)
  cloud_bunny: 'SPIRIT_CLOUD_REFRAME',
  letter_fairy: 'SPIRIT_LETTER_BRIDGE',
  wind_sprite: 'SPIRIT_WINDOW_OPEN',
  moon_rabbit: 'SPIRIT_NIGHT_CONFESSION',
  clown_harley: 'SPIRIT_REVERSE_ROLE',
  rose_fairy: 'SPIRIT_BUTTERFLY_DIARY',
  forest_mom: 'SPIRIT_ROOTED_HUG',
  // SR (5)
  cherry_leaf: 'SPIRIT_FALLEN_PETALS',
  ice_prince: 'SPIRIT_FREEZE_FRAME',
  lightning_bird: 'SPIRIT_BOLT_CARD',
  butterfly_meta: 'SPIRIT_METAMORPHOSIS',
  book_keeper: 'SPIRIT_MEMORY_KEY',
  // UR (2)
  queen_elena: 'SPIRIT_CROWN_RECLAIM',
  star_dust: 'SPIRIT_WISH_GRANT',
  // L — 향후 (현재는 BoltCard 메타로 fallback)
  guardian_eddy: 'SPIRIT_BOLT_CARD',
};

// 역매핑
export const EVENT_TO_SPIRIT: Record<SpiritEventType, SpiritId> = (() => {
  const out: Partial<Record<SpiritEventType, SpiritId>> = {};
  for (const [sid, evt] of Object.entries(SPIRIT_TO_EVENT)) {
    if (evt && !out[evt]) out[evt] = sid as SpiritId;
  }
  return out as Record<SpiritEventType, SpiritId>;
})();

// ────────────────────────────────────────────────────────────
// 2) Phase 화이트리스트
// ────────────────────────────────────────────────────────────
export const SPIRIT_PHASE_WHITELIST: Record<SpiritId, ConversationPhaseV2[]> = {
  // N
  fire_goblin: ['HOOK', 'MIRROR'],
  book_worm: ['MIRROR', 'BRIDGE'],
  tear_drop: ['HOOK', 'MIRROR'],
  seed_spirit: ['HOOK'],
  drum_imp: ['BRIDGE', 'SOLVE'],
  peace_dove: ['SOLVE'],
  // R
  cloud_bunny: ['MIRROR', 'BRIDGE'],
  letter_fairy: ['MIRROR', 'BRIDGE'],
  wind_sprite: ['MIRROR', 'BRIDGE'],
  moon_rabbit: ['HOOK'],
  clown_harley: ['BRIDGE', 'SOLVE'],
  rose_fairy: ['HOOK', 'EMPOWER'],
  forest_mom: ['MIRROR', 'BRIDGE', 'SOLVE', 'EMPOWER'],
  // SR
  cherry_leaf: ['EMPOWER'],
  ice_prince: ['MIRROR', 'BRIDGE'],
  lightning_bird: ['HOOK', 'MIRROR', 'BRIDGE', 'SOLVE', 'EMPOWER'],
  butterfly_meta: ['EMPOWER'],
  book_keeper: ['BRIDGE'],
  // UR
  queen_elena: ['EMPOWER'],
  star_dust: ['EMPOWER'],
  // L
  guardian_eddy: ['HOOK', 'MIRROR', 'BRIDGE', 'SOLVE', 'EMPOWER'],
};

// ────────────────────────────────────────────────────────────
// 3) 쿨타임 정책
// ────────────────────────────────────────────────────────────
export interface SpiritCooldownPolicy {
  /** 같은 세션 내 N턴 안 재발동 X (단일 정령 기준) */
  turns?: number;
  /** 시계 기준 N시간 */
  hours?: number;
  /** 시계 기준 N일 */
  days?: number;
  /** 매월 1일 KST 자정 리셋 */
  monthly?: boolean;
}

export const SPIRIT_COOLDOWN: Record<SpiritId, SpiritCooldownPolicy> = {
  // N
  fire_goblin: { turns: 3, hours: 24 },
  book_worm: { turns: 5 },
  tear_drop: { hours: 24 },
  seed_spirit: { hours: 24 },
  drum_imp: { days: 7 },
  peace_dove: { days: 3 },
  // R
  cloud_bunny: { turns: 5 },
  letter_fairy: { days: 7 },
  wind_sprite: { turns: 5 },
  moon_rabbit: { hours: 24 },
  clown_harley: { days: 3 },
  rose_fairy: { hours: 24 },
  forest_mom: { hours: 24 },
  // SR
  cherry_leaf: { days: 7 },
  ice_prince: { hours: 24 },
  lightning_bird: { hours: 24 },
  butterfly_meta: { days: 7 },
  book_keeper: { days: 7 },
  // UR
  queen_elena: { days: 7 },
  star_dust: { monthly: true },
  // L
  guardian_eddy: { days: 7 },
};

// ────────────────────────────────────────────────────────────
// 4) 세션당 발동 상한
// ────────────────────────────────────────────────────────────
/** 세션당 정령 카드 최대 발동 수 (모든 정령 합산) */
export const SESSION_CAP = 2;

// ────────────────────────────────────────────────────────────
// 5) Type A (정적 합성, LLM 호출 0)
// ────────────────────────────────────────────────────────────
export const SPIRIT_TYPE_A: ReadonlySet<SpiritEventType> = new Set<SpiritEventType>([
  'SPIRIT_CRY_TOGETHER',
  'SPIRIT_FIRST_BREATH',
  'SPIRIT_WINDOW_OPEN',
  'SPIRIT_FREEZE_FRAME',
  'SPIRIT_ROOTED_HUG',
  'SPIRIT_BOLT_CARD',  // 메타 — 자체는 정적, 픽한 정령은 정상 합성
]);

// ────────────────────────────────────────────────────────────
// 6) 위험 수준 차단 매트릭스
//    risk >= MEDIUM_HIGH 시 차단되는 정령 (위로/안정 정령은 허용)
// ────────────────────────────────────────────────────────────
export const SPIRIT_BLOCKED_AT_HIGH_RISK: ReadonlySet<SpiritId> = new Set<SpiritId>([
  // 농담/설렘/메타 — 위기 시 위험
  'cloud_bunny',
  'rose_fairy',
  'lightning_bird',
  'clown_harley',
  // 분노 부추김 — 격앙 시 위험
  'fire_goblin',
  // 강제 멈춤 — 통제 위험
  'ice_prince',
]);

// HIGH/CRITICAL 시 모든 정령 차단 (위기 모듈 우선)
// MEDIUM_HIGH 시 위 셋만 차단

// ────────────────────────────────────────────────────────────
// 7) 시나리오 → 정령 추천 매트릭스 (휴리스틱 폴백 보조)
// ────────────────────────────────────────────────────────────
export const SCENARIO_SPIRIT_PRIORITY: Partial<Record<string, SpiritId[]>> = {
  READ_AND_IGNORED: ['drum_imp', 'ice_prince', 'wind_sprite'],
  GHOSTING: ['peace_dove', 'cherry_leaf', 'letter_fairy'],
  LONG_DISTANCE: ['forest_mom', 'rose_fairy', 'letter_fairy'],
  JEALOUSY: ['book_worm', 'fire_goblin', 'ice_prince'],
  INFIDELITY: ['fire_goblin', 'queen_elena', 'forest_mom'],
  BREAKUP_CONTEMPLATION: ['book_worm', 'cherry_leaf', 'queen_elena'],
  BOREDOM: ['cloud_bunny', 'wind_sprite', 'rose_fairy'],
  UNREQUITED_LOVE: ['rose_fairy', 'letter_fairy', 'moon_rabbit'],
  RECONNECTION: ['peace_dove', 'butterfly_meta', 'drum_imp'],
  FIRST_MEETING: ['rose_fairy', 'seed_spirit', 'cloud_bunny'],
  COMMITMENT_FEAR: ['book_worm', 'butterfly_meta', 'star_dust'],
  RELATIONSHIP_PACE: ['drum_imp', 'book_worm', 'forest_mom'],
};

// ────────────────────────────────────────────────────────────
// 8) 헬퍼
// ────────────────────────────────────────────────────────────
export function isPhaseAllowed(spiritId: SpiritId, phase: ConversationPhaseV2): boolean {
  const list = SPIRIT_PHASE_WHITELIST[spiritId];
  if (!list) return false;
  return list.includes(phase);
}

export function mapSpiritToEvent(spiritId: SpiritId): SpiritEventType | null {
  return SPIRIT_TO_EVENT[spiritId] ?? null;
}

export function mapEventToSpirit(eventType: SpiritEventType): SpiritId | null {
  return EVENT_TO_SPIRIT[eventType] ?? null;
}
