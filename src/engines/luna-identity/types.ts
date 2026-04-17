/**
 * 🦊 Luna Identity Drift — 유저별 루나 페르소나 진화
 *
 * 같은 루나가 유저마다 다른 모습으로 발현.
 * 시간이 지나면서 드러난 특성이 누적 → 그 유저만의 루나.
 */

export type RelationshipPhase = 'new' | 'bonding' | 'deep' | 'veteran';

export interface InsideJoke {
  trigger: string;         // 농담의 씨앗
  callback: string;        // 루나가 다시 꺼낼 표현
  first_used_at: string;
  use_count: number;
}

export interface LunaPerception {
  /** 루나가 이 유저를 어떻게 보는지 한 줄 */
  sees_user_as?: string;
  /** 걱정되는 지점들 */
  worries_about?: string[];
  /** 뿌듯해하는 지점들 */
  proud_of?: string[];
}

export interface LunaIdentityWithUser {
  user_id: string;

  /** 루나가 이 유저에게 발현한 특성 누적
   *  { "직설성": 0.7, "유머": 0.4, "자기개방": 0.3, ... }
   */
  expressed_traits: Record<string, number>;

  /** 공유 농담 */
  shared_jokes: InsideJoke[];

  /** 피하는/공명 화제 */
  avoided_topics: string[];
  resonant_topics: string[];

  /** 관계 단계 */
  relationship_phase: RelationshipPhase;

  /** 루나의 이 유저에 대한 인식 */
  luna_perception: LunaPerception;

  /** 공유 경험 누적 수 */
  shared_experience_count: number;

  /** 첫 만남 */
  first_meeting_at: string;

  /** 마지막 업데이트 */
  updated_at?: string;
}

/** 업데이트 입력 */
export interface IdentityUpdateInput {
  user_id: string;
  /** 특성 변화 — "유머 +0.05" 같은 증분 */
  trait_deltas?: Record<string, number>;
  /** 새 농담 추가 */
  add_joke?: Omit<InsideJoke, 'first_used_at' | 'use_count'>;
  /** 농담 사용 (use_count 증가) */
  use_joke?: string;  // trigger 로 식별
  /** 관계 단계 전환 */
  set_phase?: RelationshipPhase;
  /** perception 업데이트 */
  update_perception?: Partial<LunaPerception>;
  /** 화제 추가 */
  add_avoided?: string;
  add_resonant?: string;
  /** 공유 경험 카운트 증가 */
  increment_shared?: boolean;
}

/** 좌뇌/우뇌에 주입할 자연어 요약 */
export interface IdentityHandoff {
  /** 관계 단계 한 줄 */
  phase_summary: string;
  /** 발현 특성 상위 3 (자연어) */
  top_traits: string[];
  /** 공유 농담 (최근 3개) */
  available_jokes: Array<{ trigger: string; callback: string }>;
  /** 피하는 화제들 */
  avoid: string[];
  /** 루나 시선 (한 줄) */
  luna_view: string;
}
