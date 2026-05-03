/**
 * v110 Long-term Memory — shared types.
 * See docs/luna-longterm-memory-v110-plan.md §3, §4.
 */

export type EmotionLabel =
  | 'joy' | 'sadness' | 'anger' | 'anxiety' | 'peace'
  | 'longing' | 'guilt' | 'shame' | 'pride' | 'mixed';

export interface LunaEpisode {
  id: string;
  user_id: string;
  session_id: string | null;
  day_number: number;
  title: string;            // ≤12자
  summary_short: string;    // ≤80자
  summary_long: string;     // 200~400자, 1인칭
  emotion_label: EmotionLabel | null;
  emotion_scores: Record<string, number> | null;
  importance: number;       // 1~10
  decay_strength: number;   // 0~1
  last_recalled_at: string | null;
  recall_count: number;
  tags: string[];
  related_people: string[];
  embedding?: number[] | null;
  raw_turns_ref: string[] | null;
  created_at: string;
}

export interface RecallHit extends LunaEpisode {
  similarity?: number;       // dense cosine (RPC: similarity)
  score?: number;            // keyword RPC score, OR final IRR-weighted score
}

export type PersonaCategory =
  | 'identity'      // 이름, 나이 등 자기 식별 정보
  | 'relationship'  // 연인/가족/친구 관계
  | 'personality'   // MBTI/성격 특성
  | 'preference'    // 좋아하는 것/싫어하는 것
  | 'pattern';      // 반복되는 정서/행동 패턴

export interface LunaPersonaFact {
  id: string;
  user_id: string;
  category: PersonaCategory;
  key: string;
  value: string;
  confidence: number;        // 0~1
  source_episode_id: string | null;
  valid_from: string;
  valid_until: string | null;
  superseded_by: string | null;
  created_at: string;
}

export interface LunaSelfState {
  user_id: string;
  tone_summary: string;
  what_works: string[];
  what_fails: string[];
  current_arc: string | null;
  updated_at: string;
}

export interface CompressedTurn {
  id: string;
  session_id: string;
  user_id: string;
  turn_start_idx: number;
  turn_end_idx: number;
  one_liner: string;
  created_at: string;
}

export interface WeeklyDigest {
  id: string;
  user_id: string;
  week_start_day: number;
  digest: string;
  insights: string[];
  created_at: string;
}

/** L0~L3 토큰 예산 (context-assembler) */
export interface MemoryBudget {
  L3_self: number;
  L2_persona: number;
  L1_episodes: number;
  L0_compressed: number;
  L0_recent: number;
  user_msg: number;
}

export const DEFAULT_BUDGET: MemoryBudget = {
  L3_self: 200,
  L2_persona: 800,
  L1_episodes: 1500,
  L0_compressed: 600,
  L0_recent: 2400,
  user_msg: 500,
};

/** Generative Agents IRR 가중치 + decay */
export interface RecallWeights {
  recency: number;
  importance: number;
  relevance: number;
  decay: number;
}

export const DEFAULT_WEIGHTS: RecallWeights = {
  recency: 0.25,
  importance: 0.30,
  relevance: 0.35,
  decay: 0.10,
};
