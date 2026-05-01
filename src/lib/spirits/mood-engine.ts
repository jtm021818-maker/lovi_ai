/**
 * v103: Spirit Mood Engine
 *
 * 정령 무드는 server-side 시간 흐름으로 계산.
 * 방치 = 가라앉음, 방문 = 회복. 단 정령은 죽지 않음 (mood ≥ 20 floor).
 *
 * - 방문 +12
 * - 방치 1일당 -3
 * - 본드 레벨당 baseline +5 (Lv1=45, Lv5=65)
 *
 * inQubi "never dies" + AI-Tamago "lives between sessions" 패턴.
 */

export interface MoodInputs {
  /** 마지막 저장된 무드 값 0..100 */
  storedMood: number;
  /** 마지막 무드 갱신 시각 */
  moodUpdatedAtMs: number;
  /** 마지막 방문/터치 시각 (없으면 0) */
  lastVisitedAtMs: number;
  /** 본드 레벨 1..5 */
  bondLv: number;
  /** 현재 시각 ms */
  nowMs: number;
}

export type MoodTone = 'bright' | 'neutral' | 'quiet' | 'withdrawn';

const FLOOR = 20;
const CEIL = 100;
const DECAY_PER_DAY = 3;
const VISIT_GAIN = 12;
const BOND_BASELINE_PER_LV = 5;
const BASELINE_BIAS = 0.3; // 30% baseline pull, 70% decay
const DAY_MS = 86_400_000;

/**
 * 시간 경과 무드 계산.
 * baseline 으로 천천히 회귀하되 decay 가 우세.
 */
export function computeSpiritMood(s: MoodInputs): number {
  const daysSinceUpdate = Math.max(0, (s.nowMs - s.moodUpdatedAtMs) / DAY_MS);
  const decay = Math.floor(daysSinceUpdate) * DECAY_PER_DAY;
  const baseline = 40 + Math.max(1, Math.min(5, s.bondLv)) * BOND_BASELINE_PER_LV;
  const decayed = Math.max(FLOOR, s.storedMood - decay);
  const blended = Math.round(decayed * (1 - BASELINE_BIAS) + baseline * BASELINE_BIAS);
  return Math.max(FLOOR, Math.min(CEIL, blended));
}

/** 방문(터치/배치/대화) 직후 새 무드 값 */
export function applyVisit(currentMood: number): number {
  return Math.max(FLOOR, Math.min(CEIL, currentMood + VISIT_GAIN));
}

/** 무드 → 표시 톤 */
export function moodToTone(mood: number): MoodTone {
  if (mood >= 75) return 'bright';
  if (mood >= 50) return 'neutral';
  if (mood >= 30) return 'quiet';
  return 'withdrawn';
}

/** 톤 → 5점 점등(✨/●/○) UI 라벨 */
export function moodToDots(mood: number): string {
  const tone = moodToTone(mood);
  switch (tone) {
    case 'bright':     return '✨';
    case 'neutral':    return '●';
    case 'quiet':      return '◐';
    case 'withdrawn':  return '○';
  }
}

/** 톤 → 한 줄 라벨 (한국어) */
export function moodToLabel(mood: number): string {
  const tone = moodToTone(mood);
  switch (tone) {
    case 'bright':     return '환한 날';
    case 'neutral':    return '평온한 날';
    case 'quiet':      return '조용한 날';
    case 'withdrawn':  return '오랜만이야';
  }
}

/** 정령 응답 풀 인덱스 — 다이얼로그 분기에 사용 */
export function moodToDialoguePool(mood: number): 'bright' | 'neutral' | 'quiet' | 'withdrawn' {
  return moodToTone(mood);
}
