/**
 * 🎭 v81: BRIDGE 몰입 모드 — 타입 정의
 *
 * 5개 모드: roleplay, draft, panel, tone, idea
 * 각 모드는 독립된 상태 스키마 + 공용 제어 신호.
 */

export type ModeId = 'roleplay' | 'draft' | 'panel' | 'tone' | 'idea';

// ─── 공용 제어 ───────────────────────────────────────

export interface ModeCompletion {
  /** 어떤 모드가 완료됐는가 */
  mode: ModeId;
  /** Luna 가 내린 한 줄 요약 */
  summary: string;
  /** 다음 단계 힌트 */
  nextStep?: string;
  /** 완료 시각 */
  completedAt: string;
}

// ─── 🎭 Roleplay State ───────────────────────────────

export interface RoleplayScenarioData {
  title: string;                         // "카페에서 사과하기"
  situation: string;                     // 한 줄 상황 묘사
  role: {
    name: string;                        // "루나(여친)"
    archetype: string;                   // 'girlfriend' | 'ex' | 'crush' | 'friend'
    tone: string;                        // '시크', '다정' 등
    emoji?: string;
  };
  opening: {
    narration?: string | null;
    dialogue: string;
    spriteFrame: number;
  };
  /** 🆕 v81: Imagen 배경 이미지 base64 (실패 시 undefined — gradient fallback) */
  backgroundImageBase64?: string;
}

export interface RoleplayState {
  context: string;                       // 원본 유저 상황
  scenario: RoleplayScenarioData;
  history: Array<{
    role: 'user' | 'npc';
    content: string;
    spriteFrame?: number;
    narration?: string | null;
  }>;
}

// ─── ✏️ Draft Workshop State ────────────────────────

export interface DraftOption {
  id: string;                 // 'A' | 'B' | 'C'
  tone: 'soft' | 'honest' | 'firm';
  label: string;              // "부드럽게"
  content: string;
  intensity: number;          // 0-100
}

export interface DraftState {
  context: string;            // "어제 장난친 거 사과"
  intent: string;             // 'apology' | 'invite' | 'decline' | ...
  drafts: DraftOption[];
  selectedId: string | null;
  edits: Array<{ sentenceIdx: number; from: string; to: string }>;
  simulatedReactions?: Array<{ tone: string; reaction: string }>;
  savedDraftId?: string;      // message_drafts 테이블 FK
}

// ─── 👥 Panel Report State ──────────────────────────

export interface PanelPersona {
  id: 'sister' | 'friend' | 'senior';
  name: string;
  emoji: string;
  opinion: string;
  userReaction: 'resonate' | 'listen' | 'dismiss' | null;
}

export interface PanelState {
  context: string;
  personas: PanelPersona[];
  chosenPersonaId: PanelPersona['id'] | null;
  deepenTurns: Array<{ role: 'user' | 'luna'; content: string }>;
}

// ─── 🎨 Tone Select State ───────────────────────────

export interface ToneOption {
  id: string;                 // 'soft' | 'honest' | 'firm'
  label: string;
  emoji: string;
  content: string;
  intensity: number;          // 0-100 (온도계)
}

export interface ToneState {
  context: string;
  options: ToneOption[];
  selectedId: string | null;
}

// ─── 💡 Idea Refine State ───────────────────────────

export interface IdeaState {
  original: string;
  refined: string | null;
  reasons: string[];
  merged?: string;
}

// ─── Union ──────────────────────────────────────────

export type AnyModeState =
  | ({ modeId: 'roleplay' } & RoleplayState)
  | ({ modeId: 'draft' } & DraftState)
  | ({ modeId: 'panel' } & PanelState)
  | ({ modeId: 'tone' } & ToneState)
  | ({ modeId: 'idea' } & IdeaState);

// ─── Mode 메타 ──────────────────────────────────────

export interface ModeMeta {
  id: ModeId;
  label: string;
  emoji: string;
  tagline: string;
  description: string;
  estimatedTurns: string;     // "5~10턴" 같은 안내용
}

export const MODE_CATALOG: Record<ModeId, ModeMeta> = {
  roleplay: {
    id: 'roleplay',
    label: '롤플레이로 연습',
    emoji: '🎭',
    tagline: '상대 역할을 내가 해볼게',
    description: '실제 상황 그려놓고 대화 연습',
    estimatedTurns: '10~20턴',
  },
  draft: {
    id: 'draft',
    label: '메시지 초안 짜기',
    emoji: '✏️',
    tagline: '뭐라고 보낼지 3가지 버전',
    description: '톤 다르게 3개 만들어서 골라',
    estimatedTurns: '3~5턴',
  },
  panel: {
    id: 'panel',
    label: '다른 시선에서 보기',
    emoji: '👥',
    tagline: '언니/친구/선배 각자 한마디',
    description: '3명 관점 비교해보고 고르기',
    estimatedTurns: '4~7턴',
  },
  tone: {
    id: 'tone',
    label: '톤 정하기',
    emoji: '🎨',
    tagline: '부드럽게? 솔직하게? 단호하게?',
    description: '같은 말 3톤으로 미리보기',
    estimatedTurns: '1~2턴',
  },
  idea: {
    id: 'idea',
    label: '아이디어 다듬기',
    emoji: '💡',
    tagline: '네 생각 내가 한 번 다듬어볼게',
    description: '원본 vs 다듬음 비교',
    estimatedTurns: '2~3턴',
  },
};
