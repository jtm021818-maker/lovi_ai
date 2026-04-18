/**
 * 🆕 v77: 친밀도 실시간 누적 시스템 (핵심 모듈)
 *
 * 설계 원칙:
 *   - Level 은 LLM 이 직접 판단하지 않고, Score 누적 결과.
 *   - Delta 는 좌뇌 LLM 이 매턴 intimacy_signals 로 출력 → 여기서 합산.
 *   - 시간 감쇠만 명확한 수학 (LLM 판단 불필요).
 *   - 행동 변화는 우뇌 프롬프트의 "현재 Lv + 해제 행동" 맥락 힌트로 유도.
 *
 * 연구 근거:
 *   - Social Penetration Theory (Altman & Taylor, 1973)
 *   - Knapp's Relational Development Model (1984)
 *   - Trust Formation Research (Fikrlová et al., 2025)
 */

// ============================================================
// 타입
// ============================================================

export type IntimacyLevel = 1 | 2 | 3 | 4 | 5;

export interface IntimacyState {
  level: IntimacyLevel;
  score: number;
  lastInteractionAt: Date;
  history: IntimacyEvent[];
}

export interface IntimacyEvent {
  t: string;
  delta: number;
  reason: string;
}

/**
 * 좌뇌 LLM 이 매턴 출력하는 친밀도 신호.
 * 매턴 delta 계산에 사용.
 */
export interface IntimacySignals {
  /** 유저 자기개방 수준 0~3 */
  self_disclosure_delta: number;
  /** 유저가 루나 말에 공명 0~2 */
  reciprocity_delta: number;
  /** 농담 주고받음 0~2 */
  humor_delta: number;
  /** 취약성 공유 0~3 */
  trust_investment_delta: number;
  /** 이 턴이 관계 결정적 순간인가 */
  significant_moment: boolean;
  significant_moment_reason: string | null;
  /** 부정 신호 0~3 (차가움/회피/거부) */
  negative_signal: number;
  /** 참고용 총합 — 실제 계산은 computeDelta 가 함 */
  total_delta_hint: number;
  /** 이 delta 의 이유 (history 에 기록) */
  reasoning: string;
}

// ============================================================
// 레벨 정의
// ============================================================

export const INTIMACY_LEVELS: Record<IntimacyLevel, {
  name: string;
  scoreMin: number;
  scoreMax: number;
  description: string;
  unlockedBehaviors: string[];
  lockedBehaviors: string[];
}> = {
  1: {
    name: '아는 사이',
    scoreMin: 0,
    scoreMax: 15,
    description: '첫만남~몇 번 본 사이. 반말 쓰지만 예의 거리. 언니 포지션.',
    unlockedBehaviors: ['일반적 공감', '가벼운 반말'],
    lockedBehaviors: ['자기 경험 공유', '직설 조언', '농담'],
  },
  2: {
    name: '편해진 사이',
    scoreMin: 16,
    scoreMax: 35,
    description: '농담 주고받음. 가벼운 속얘기.',
    unlockedBehaviors: ['가벼운 장난(ㅋㅋ)', '가끔 "아 나도 전에~" 짧은 자기개방(세션당 1회)'],
    lockedBehaviors: ['깊은 자기개방', '패턴 직면', '가혹한 진실'],
  },
  3: {
    name: '친한 친구',
    scoreMin: 36,
    scoreMax: 60,
    description: '자기개방 자연. 직설 OK.',
    unlockedBehaviors: ['자연스러운 자기개방(세션당 2~3회)', '직설 조언', '패턴 짚기', '적극 유머'],
    lockedBehaviors: ['침묵만으로 대화', '가혹한 진실 직면'],
  },
  4: {
    name: '속 깊은 사이',
    scoreMin: 61,
    scoreMax: 85,
    description: '침묵도 편함. 패턴 짚어줄 수 있음.',
    unlockedBehaviors: ['"..." 한마디 가능', '깊은 공감', '가혹한 진실', '루나 자신 약점 공개'],
    lockedBehaviors: [],
  },
  5: {
    name: '가족 같은 사이',
    scoreMin: 86,
    scoreMax: 100,
    description: '혼잣말 수준. 뭐든 함께.',
    unlockedBehaviors: ['과거 이야기 자연 소환', '"우리" 주어 자연', '꼼꼼한 돌봄 모드'],
    lockedBehaviors: [],
  },
};

// ============================================================
// Level ↔ Score 변환
// ============================================================

/** 숫자 Lv → TEXT (기존 DB 호환용) */
export function levelToText(lv: IntimacyLevel): string {
  const map: Record<IntimacyLevel, string> = {
    1: 'low', 2: 'mid', 3: 'high', 4: 'deep', 5: 'bonded',
  };
  return map[lv];
}

/** TEXT (DB 기존) → 숫자 Lv */
export function textToLevel(text: string | null | undefined): IntimacyLevel {
  switch (text) {
    case 'low': return 1;
    case 'mid': return 2;
    case 'high': return 3;
    case 'deep': return 4;
    case 'bonded': return 5;
    default: return 1;
  }
}

/** Score → Level (hysteresis 고려) */
export function scoreToLevel(score: number, currentLevel: IntimacyLevel = 1): IntimacyLevel {
  // 승급 threshold (score >= 이 값 이면 그 Lv 진입)
  const up: Record<IntimacyLevel, number> = { 1: 0, 2: 16, 3: 36, 4: 61, 5: 86 };
  // 하락 threshold (score <= 이 값 이면 그 Lv 하락)
  const down: Record<IntimacyLevel, number> = { 1: -1, 2: 10, 3: 25, 4: 50, 5: 75 };

  // 현재 Lv 유지가 우선 (hysteresis)
  if (score >= up[currentLevel] && (currentLevel === 5 || score < up[(currentLevel + 1) as IntimacyLevel])) {
    // 현재 Lv 범위에 있음
    return currentLevel;
  }

  // 승급
  for (let lv = 5; lv >= 1; lv--) {
    if (score >= up[lv as IntimacyLevel]) return lv as IntimacyLevel;
  }

  // 하락
  if (score <= down[currentLevel]) {
    return Math.max(1, currentLevel - 1) as IntimacyLevel;
  }

  return currentLevel;
}

// ============================================================
// Delta 계산
// ============================================================

/**
 * 좌뇌 intimacy_signals → 최종 delta
 */
export function computeDelta(signals: IntimacySignals): number {
  const base =
    clamp(signals.self_disclosure_delta, 0, 3) +
    clamp(signals.reciprocity_delta, 0, 2) +
    clamp(signals.humor_delta, 0, 2) +
    clamp(signals.trust_investment_delta, 0, 3);
  const bonus = signals.significant_moment ? 5 : 0;
  const penalty = clamp(signals.negative_signal, 0, 3);
  return base + bonus - penalty;
}

function clamp(n: number, min: number, max: number): number {
  if (typeof n !== 'number' || Number.isNaN(n)) return 0;
  return Math.max(min, Math.min(max, n));
}

// ============================================================
// 시간 감쇠
// ============================================================

/**
 * 재방문 간격(일) → 감쇠 점수
 */
export function computeDecay(daysSinceLastInteraction: number): number {
  if (daysSinceLastInteraction < 2) return 0;
  if (daysSinceLastInteraction < 4) return 1;
  if (daysSinceLastInteraction < 8) return 3;
  if (daysSinceLastInteraction < 15) return 5;
  if (daysSinceLastInteraction < 31) return 8;
  return 12;
}

/**
 * 7일+ 후 재방문이면 재회 보너스 +5
 */
export function reunionBonus(daysSince: number): number {
  return daysSince >= 7 ? 5 : 0;
}

// ============================================================
// DB I/O
// ============================================================

const MIN_SCORE = 5;
const MAX_SCORE = 100;

export async function loadIntimacy(supabase: any, userId: string): Promise<IntimacyState> {
  try {
    const { data } = await supabase
      .from('user_profiles')
      .select('luna_intimacy_score, luna_intimacy_level, luna_last_interaction_at, luna_intimacy_history')
      .eq('id', userId)
      .single();

    const score = typeof data?.luna_intimacy_score === 'number' ? data.luna_intimacy_score : 8;
    const currentLv = textToLevel(data?.luna_intimacy_level);
    const level = scoreToLevel(score, currentLv);
    const lastInteractionAt = data?.luna_last_interaction_at ? new Date(data.luna_last_interaction_at) : new Date();
    const history = Array.isArray(data?.luna_intimacy_history) ? data.luna_intimacy_history : [];

    return { level, score, lastInteractionAt, history };
  } catch {
    return { level: 1, score: 8, lastInteractionAt: new Date(), history: [] };
  }
}

/**
 * 세션 시작 시 감쇠/재회 보너스 적용.
 * returns { state, reunion, decayApplied }
 */
export async function applyDecayAtSessionStart(
  supabase: any,
  userId: string,
): Promise<{ state: IntimacyState; reunion: boolean; decayApplied: number }> {
  const state = await loadIntimacy(supabase, userId);
  const daysSince = (Date.now() - state.lastInteractionAt.getTime()) / 86400000;

  if (daysSince < 1) {
    // 같은 날 재방문 → 감쇠 없음
    return { state, reunion: false, decayApplied: 0 };
  }

  const decay = computeDecay(daysSince);
  const reunion = daysSince >= 7;
  const bonus = reunionBonus(daysSince);
  const newScore = clamp(state.score - decay + bonus, MIN_SCORE, MAX_SCORE);
  const newLevel = scoreToLevel(newScore, state.level);

  // 감쇠도 history 에 기록
  const newHistory = [
    ...state.history.slice(-49),
    ...(decay > 0 ? [{
      t: new Date().toISOString(),
      delta: -decay + bonus,
      reason: `${Math.round(daysSince)}일 부재 (감쇠 -${decay}${bonus ? ` + 재회 +${bonus}` : ''})`,
    }] : []),
  ];

  await supabase
    .from('user_profiles')
    .update({
      luna_intimacy_score: newScore,
      luna_intimacy_level: levelToText(newLevel),
      luna_intimacy_history: newHistory,
    })
    .eq('id', userId);

  return {
    state: { level: newLevel, score: newScore, lastInteractionAt: state.lastInteractionAt, history: newHistory },
    reunion,
    decayApplied: decay,
  };
}

/**
 * 매턴 끝에 호출. LLM signals → score 갱신.
 */
export async function applyIntimacyDeltaFromSignals(
  supabase: any,
  userId: string,
  signals: IntimacySignals,
  previousState?: IntimacyState,
): Promise<{ state: IntimacyState; levelUp: boolean; levelDown: boolean; delta: number }> {
  const current = previousState ?? (await loadIntimacy(supabase, userId));
  const delta = computeDelta(signals);
  const newScore = clamp(current.score + delta, MIN_SCORE, MAX_SCORE);
  const newLevel = scoreToLevel(newScore, current.level);
  const levelUp = newLevel > current.level;
  const levelDown = newLevel < current.level;

  const newHistory = [
    ...current.history.slice(-49),
    {
      t: new Date().toISOString(),
      delta,
      reason: signals.reasoning ?? '',
    },
  ];

  await supabase
    .from('user_profiles')
    .update({
      luna_intimacy_score: newScore,
      luna_intimacy_level: levelToText(newLevel),
      luna_last_interaction_at: new Date().toISOString(),
      luna_intimacy_history: newHistory,
    })
    .eq('id', userId);

  return {
    state: { level: newLevel, score: newScore, lastInteractionAt: new Date(), history: newHistory },
    levelUp,
    levelDown,
    delta,
  };
}
