/**
 * 🧚 v104: Spirit Random Events — Type Definitions
 *
 * 20개 정령 시그니처 카드 데이터 인터페이스 + 게이트/합성기 컨텍스트.
 * 각 카드는 PhaseEvent.data 로 전달되며 ChatContainer 가 type 으로 라우팅.
 */

import type { SpiritId } from '@/types/spirit.types';
import type {
  ConversationPhaseV2,
  RiskLevel,
  RelationshipScenario,
  ClientIntent,
  PhaseEvent,
} from '@/types/engine.types';

// ============================================================
// 1) Event Type Union (engine.types 의 PhaseEventType 과 동기화)
// ============================================================
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

export const ALL_SPIRIT_EVENT_TYPES: readonly SpiritEventType[] = [
  'SPIRIT_RAGE_LETTER', 'SPIRIT_THINK_FRAME', 'SPIRIT_CRY_TOGETHER',
  'SPIRIT_FIRST_BREATH', 'SPIRIT_RHYTHM_CHECK', 'SPIRIT_OLIVE_BRANCH',
  'SPIRIT_CLOUD_REFRAME', 'SPIRIT_LETTER_BRIDGE', 'SPIRIT_WINDOW_OPEN',
  'SPIRIT_NIGHT_CONFESSION', 'SPIRIT_REVERSE_ROLE', 'SPIRIT_BUTTERFLY_DIARY',
  'SPIRIT_ROOTED_HUG', 'SPIRIT_FALLEN_PETALS', 'SPIRIT_FREEZE_FRAME',
  'SPIRIT_BOLT_CARD', 'SPIRIT_METAMORPHOSIS', 'SPIRIT_MEMORY_KEY',
  'SPIRIT_CROWN_RECLAIM', 'SPIRIT_WISH_GRANT',
] as const;

// ============================================================
// 2) 게이트 컨텍스트 / 결과
// ============================================================
export interface SpiritEventGateContext {
  userId: string;
  sessionId: string;
  phase: ConversationPhaseV2;
  turn: number;
  riskLevel: RiskLevel;
  scenario?: RelationshipScenario;
  emotionScore: number;             // -10 ~ 10 (음수 = 부정)
  cognitiveDistortions: string[];
  intent?: ClientIntent | string;
  now: Date;
  parsedTags: SpiritTag[];          // LLM 본문에서 추출된 태그
  firedThisSession: SpiritEventType[];
  consecutiveLowMoodTurns: number;
  monthlyWishUsedAt?: string | null;
  userAgeDays: number;
  scenarioRepeatCount?: Partial<Record<RelationshipScenario, number>>;
  /** 활성 (Lv3+ 방배치) 정령 — 미리 조회된 경우 주입 */
  preloadedActiveSpirits?: Array<{ spiritId: SpiritId; bondLv: number }>;
}

export interface SpiritEventGateResult {
  ok: boolean;
  spiritId?: SpiritId;
  eventType?: SpiritEventType;
  source?: 'llm_tag' | 'heuristic';
  rejectReason?:
    | 'no_active_spirit'
    | 'wrong_phase'
    | 'cooldown'
    | 'session_cap'
    | 'duplicate'
    | 'risk_block'
    | 'context_mismatch';
}

// ============================================================
// 3) 태그 파싱 결과
// ============================================================
export interface SpiritTag {
  eventType: SpiritEventType;
  params: Record<string, string>;
  rawSpan: { start: number; end: number };
  raw: string;
}

// ============================================================
// 4) 카드 공통 옵션
// ============================================================
export interface SpiritEventOption<V extends string = string> {
  value: V;
  label: string;
  emoji: string;
  style?: 'primary' | 'neutral' | 'soft' | 'danger';
}

interface BaseSpiritEventData<S extends SpiritId> {
  spiritId: S;
  /** 카드 셸 헤더 우측 라벨 (선택) — "✨ 핏치 보너스" 등 */
  headerBadge?: string;
}

// ============================================================
// 5) 20개 카드 데이터 인터페이스
// ============================================================

// ─────────── N6 ───────────

/** 🔥 fire_goblin */
export interface RageLetterDraft {
  intensity: 'fire' | 'honest' | 'cool';
  label: string;
  text: string;
}
export interface RageLetterData extends BaseSpiritEventData<'fire_goblin'> {
  openerMsg: string;
  context: string;
  drafts: RageLetterDraft[];      // 보통 3개
  lunaCutIn: string;
  options: SpiritEventOption<'burn' | 'rewrite' | 'skip'>[];
}

/** 📖 book_worm */
export interface ThinkFrame {
  angle: 'self' | 'other' | 'third';
  icon: string;
  label: string;
  interpretation: string;
}
export interface ThinkFrameData extends BaseSpiritEventData<'book_worm'> {
  openerMsg: string;
  frames: ThinkFrame[];           // 3개
  noriQuiet: string;
  options: SpiritEventOption<'helpful' | 'reroll' | 'skip'>[];
}

/** 💧 tear_drop */
export interface CryTogetherData extends BaseSpiritEventData<'tear_drop'> {
  silenceText: string;
  afterText: string;
  durationSec: number;            // 60
  options: SpiritEventOption<'stay' | 'skip'>[];
}

/** 🌱 seed_spirit */
export interface FirstBreathData extends BaseSpiritEventData<'seed_spirit'> {
  openMsg: string;
  closeMsg: string;
  cycle: { in: number; hold: number; out: number };
  rounds: number;
  options: SpiritEventOption<'done' | 'skip'>[];
}

/** 🥁 drum_imp */
export interface RhythmBar {
  who: 'me' | 'partner';
  length: number;                 // 1-10
}
export interface RhythmCheckData extends BaseSpiritEventData<'drum_imp'> {
  openerMsg: string;
  myAvg: string;
  partnerAvg: string;
  pattern: 'chase' | 'avoid' | 'offbeat' | 'sync';
  patternEmoji: string;
  patternDescription: string;
  drumAdvice: string;
  visualBars: RhythmBar[];        // 8~12개
  options: SpiritEventOption<'tryslow' | 'detail' | 'skip'>[];
}

/** 🕊️ peace_dove */
export interface OliveBranchDraft {
  tone: 'soft' | 'responsibility' | 'humor';
  emoji: string;
  label: string;
  text: string;
  intent: string;
}
export interface OliveBranchData extends BaseSpiritEventData<'peace_dove'> {
  openerMsg: string;
  drafts: OliveBranchDraft[];     // 3개
  doveGuide: string;              // 90초 룰 메시지
  options: SpiritEventOption<'send' | 'tweak' | 'skip'>[];
}

// ─────────── R7 ───────────

/** ☁️ cloud_bunny */
export interface CloudReframeData extends BaseSpiritEventData<'cloud_bunny'> {
  openerMsg: string;
  userQuote: string;
  miMiTranslation: {
    main: string;
    incident: string;
    result: string;
    directorNote: string;
  };
  miMiClosing: string;
  options: SpiritEventOption<'lighter' | 'still_hurt' | 'skip'>[];
}

/** 💌 letter_fairy */
export interface LetterBridgeData extends BaseSpiritEventData<'letter_fairy'> {
  openerMsg: string;
  recipient: string;              // 빈 문자열이면 유저가 직접 입력
  guide: string;
  unblockExample: string;
  options: SpiritEventOption<'archive' | 'burn' | 'continue' | 'skip'>[];
}

/** 🍃 wind_sprite */
export interface WindowOpenData extends BaseSpiritEventData<'wind_sprite'> {
  openerMsg: string;
  durationMin: 3 | 5 | 10;
  tasks: string[];
  closing: string;
  options: SpiritEventOption<'start' | 'skip'>[];
}

/** 🌙 moon_rabbit */
export interface NightConfessionData extends BaseSpiritEventData<'moon_rabbit'> {
  openerMsg: string;
  prompts: string[];              // 3개 시작 가이드
  options: SpiritEventOption<'send_to_moon' | 'bury' | 'skip'>[];
}

/** 🎭 clown_harley */
export interface ReverseRoleData extends BaseSpiritEventData<'clown_harley'> {
  openerMsg: string;
  partnerName: string;
  harleyAsUser: {
    tone: 'anxious' | 'angry' | 'sad' | 'cold' | 'caring';
    openingLine: string;
  };
  rounds: number;                 // default 5
  options: SpiritEventOption<'start' | 'later'>[];
}

/** 🌹 rose_fairy */
export interface ButterflyDiaryData extends BaseSpiritEventData<'rose_fairy'> {
  openerMsg: string;
  exampleHint: string;
  guide: string;
  closingLine: string;
  options: SpiritEventOption<'logged' | 'more' | 'skip'>[];
}

/** 🌳 forest_mom */
export interface RootedHugGroup {
  emoji: string;
  label: string;
  count: number;
}
export interface RootedHugData extends BaseSpiritEventData<'forest_mom'> {
  openerMsg: string;
  groups: RootedHugGroup[];       // 5종 (5/4/3/2/1)
  options: SpiritEventOption<'done' | 'skip'>[];
}

// ─────────── SR5 ───────────

/** 🌸 cherry_leaf */
export interface FallenPetalsData extends BaseSpiritEventData<'cherry_leaf'> {
  openerMsg: string;
  promptHint: string;
  closingPoetry: string;
  options: SpiritEventOption<'release' | 'more' | 'skip'>[];
}

/** ❄️ ice_prince */
export interface FreezeFrameData extends BaseSpiritEventData<'ice_prince'> {
  opener: string;
  prompts: string[];              // 60초 동안 떠올릴 3가지
  durationSec: number;            // 60
  options: SpiritEventOption<'understood' | 'overflow'>[];
}

/** ⚡ lightning_bird (메타 — 다른 정령 픽 래퍼) */
export interface BoltCardData extends BaseSpiritEventData<'lightning_bird'> {
  openerMsg: string;              // "야! 오늘은 X 차례야!"
  pickedSpiritId: SpiritId;
  pickedEventType: SpiritEventType;
  pickedEventData: SpiritEventDataAny;
}

/** 🦋 butterfly_meta */
export interface MetamorphosisStats {
  avgEmotionScore: number;
  topWords: string[];
  signature: string;              // "자주 막힌 곳" / "자주 도달한 곳"
}
export interface MetamorphosisData extends BaseSpiritEventData<'butterfly_meta'> {
  openerMsg: string;
  beforeLabel: string;            // "90일 전 너"
  before: MetamorphosisStats;
  afterLabel: string;             // "오늘 너"
  after: MetamorphosisStats;
  delta: { emotionScore: number; actionPlanCount?: number };
  metaPoetic: string;
  options: SpiritEventOption<'seen' | 'more' | 'skip'>[];
}

/** 🗝️ book_keeper */
export interface RepeatedNgram {
  text: string;
  count: number;
}
export interface SequencePattern {
  pattern: string;
  occurrence: string;
}
export interface MemoryKeyData extends BaseSpiritEventData<'book_keeper'> {
  openerMsg: string;
  sessionsAnalyzed: number;
  topNgrams: RepeatedNgram[];
  sequencePattern?: SequencePattern;
  cliQuiet: string;
  options: SpiritEventOption<'noticed' | 'more' | 'skip'>[];
}

// ─────────── UR2 ───────────

/** 👑 queen_elena */
export interface CrownReclaimSlot {
  label: string;
  hint: string;
}
export interface CrownReclaimData extends BaseSpiritEventData<'queen_elena'> {
  openerMsg: string;
  slots: CrownReclaimSlot[];      // 3개
  closingDecree: string;
  options: SpiritEventOption<'unseal' | 'cant_recall' | 'skip'>[];
}

/** 🌟 star_dust */
export interface WishGrantData extends BaseSpiritEventData<'star_dust'> {
  openerMsg: string;
  /** 유저가 1줄 입력 후 LLM 변환된 if-then. 카드 진입 시점엔 빈 문자열일 수 있음 */
  ifPhrase: string;
  thenPhrase: string;
  starDustComment: string;
  options: SpiritEventOption<'commit' | 'reroll' | 'skip'>[];
}

// ============================================================
// 6) Union (편의)
// ============================================================
export type SpiritEventDataAny =
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

// ============================================================
// 7) 합성기 입력
// ============================================================
export interface SynthesizerCtx {
  userId: string;
  sessionId: string;
  phase: ConversationPhaseV2;
  turn: number;
  recentTurns: string[];          // 최근 5턴 유저 발화
  emotionScore: number;
  scenario?: RelationshipScenario;
  cognitiveDistortions: string[];
  /** LLM 태그 파라미터 (예: { rage: '상사_갑질' }) */
  tagParams?: Record<string, string>;
  now: Date;
  /** 활성 정령 풀 (BoltCard 메타용) */
  activeSpirits?: Array<{ spiritId: SpiritId; bondLv: number }>;
}

// ============================================================
// 8) PhaseEvent 헬퍼
// ============================================================
export function buildSpiritPhaseEvent<D extends SpiritEventDataAny>(
  type: SpiritEventType,
  phase: ConversationPhaseV2,
  data: D,
): PhaseEvent {
  return {
    type: type as PhaseEvent['type'],
    phase,
    data: data as unknown as Record<string, unknown>,
  };
}
