/**
 * 🧪 변연계 감쇠 알고리즘
 *
 * 핵심 원리:
 *   - 모든 감정은 반감기 기반으로 감쇠 (지수적)
 *   - 호르몬도 각자의 반감기 (cortisol 6h, oxytocin 12h, dopamine 4h)
 *   - 베이스라인 무드는 천천히 (며칠) 변화
 *   - 위협 각성도는 감정 강도에 따라 영향받음
 *
 * 비용: 0 (순수 JS)
 */

import type { LimbicState, ActiveEmotion } from './types';

// ============================================================
// 호르몬 반감기 상수 (시간 단위)
// ============================================================

const HORMONE_HALF_LIFE = {
  cortisol: 6,    // 스트레스: 6시간 — 잠자고 일어나면 크게 줄음
  oxytocin: 12,   // 친밀감: 12시간 — 하루 정도 유지
  dopamine: 4,    // 보상: 4시간 — 빠르게 사라짐 (재발현 필요)
  threat: 8,      // 위협 각성: 8시간
};

// 베이스라인 무드 변화 속도 (per day)
const BASELINE_DRIFT_RATE = 0.05;   // 하루에 5% 이동

// ============================================================
// 메인 감쇠 함수
// ============================================================

/**
 * 시간 경과에 따라 변연계 상태를 감쇠시킴.
 * 세션 시작 시 1회 호출 (lazy decay).
 */
export function decayLimbicState(
  state: LimbicState,
  now: Date = new Date(),
): LimbicState {
  const lastDecayed = new Date(state.last_decayed_at);
  const hoursSince = (now.getTime() - lastDecayed.getTime()) / (1000 * 60 * 60);

  // 시간 차이가 거의 없으면 그대로
  if (hoursSince < 0.01) {
    return state;
  }

  // 활성 감정 감쇠
  const decayedEmotions = state.active_emotions
    .map(e => decayEmotion(e, hoursSince))
    .filter(e => e.intensity >= 0.05);  // 0.05 미만은 자동 소멸

  // 호르몬 감쇠
  const cortisolMultiplier = Math.pow(0.5, hoursSince / HORMONE_HALF_LIFE.cortisol);
  const oxytocinMultiplier = Math.pow(0.5, hoursSince / HORMONE_HALF_LIFE.oxytocin);
  const dopamineMultiplier = Math.pow(0.5, hoursSince / HORMONE_HALF_LIFE.dopamine);
  const threatMultiplier = Math.pow(0.5, hoursSince / HORMONE_HALF_LIFE.threat);

  // 베이스라인 무드 천천히 0으로 회귀 (정서적 항상성)
  const daysSince = hoursSince / 24;
  const baselineDecayFactor = Math.exp(-BASELINE_DRIFT_RATE * daysSince);
  const newBaseline = state.baseline_mood * baselineDecayFactor;

  return {
    ...state,
    active_emotions: decayedEmotions,
    cortisol: state.cortisol * cortisolMultiplier,
    oxytocin: state.oxytocin * oxytocinMultiplier,
    dopamine: state.dopamine * dopamineMultiplier,
    threat_arousal: state.threat_arousal * threatMultiplier,
    baseline_mood: clamp(newBaseline, -1, 1),
    last_decayed_at: now.toISOString(),
  };
}

/**
 * 단일 감정의 감쇠 계산
 */
function decayEmotion(emotion: ActiveEmotion, hoursSince: number): ActiveEmotion {
  const decayFactor = Math.pow(0.5, hoursSince / emotion.half_life_hours);
  return {
    ...emotion,
    intensity: emotion.intensity * decayFactor,
  };
}

// ============================================================
// 감정 추가 (트리거 발생 시)
// ============================================================

/**
 * 새 감정을 활성 감정 리스트에 추가.
 * 같은 종류 감정이 이미 있으면 합치지 않고 별도 인스턴스로 유지
 * (각자 다른 시점에 발생, 다른 반감기로 감쇠됨)
 *
 * 단, 같은 type 이 5개 이상이면 가장 약한 것 제거 (메모리 보호)
 */
export function addEmotion(
  state: LimbicState,
  newEmotion: ActiveEmotion,
): LimbicState {
  let emotions = [...state.active_emotions, newEmotion];

  // 같은 타입이 5개 넘으면 가장 약한 것 제거
  const sameType = emotions.filter(e => e.type === newEmotion.type);
  if (sameType.length > 5) {
    const weakest = sameType.reduce((a, b) => a.intensity < b.intensity ? a : b);
    emotions = emotions.filter(e => e !== weakest);
  }

  // 전체 감정도 10개 넘으면 가장 약한 것 제거
  if (emotions.length > 10) {
    emotions.sort((a, b) => b.intensity - a.intensity);
    emotions = emotions.slice(0, 10);
  }

  return { ...state, active_emotions: emotions };
}

// ============================================================
// 호르몬 변화 적용
// ============================================================

export function applyHormoneChanges(
  state: LimbicState,
  changes: {
    cortisol?: number;
    oxytocin?: number;
    dopamine?: number;
    threat_arousal?: number;
  },
): LimbicState {
  return {
    ...state,
    cortisol: clamp((state.cortisol + (changes.cortisol ?? 0)), 0, 1),
    oxytocin: clamp((state.oxytocin + (changes.oxytocin ?? 0)), 0, 1),
    dopamine: clamp((state.dopamine + (changes.dopamine ?? 0)), 0, 1),
    threat_arousal: clamp((state.threat_arousal + (changes.threat_arousal ?? 0)), 0, 1),
  };
}

// ============================================================
// 베이스라인 무드 업데이트
// ============================================================

/**
 * 활성 감정의 평균치로 베이스라인을 천천히 끌어당김
 * (반복되는 감정 패턴이 baseline에 영향)
 */
export function updateBaselineMood(state: LimbicState): LimbicState {
  if (state.active_emotions.length === 0) return state;

  // 활성 감정의 valence 가중평균 계산
  let totalWeight = 0;
  let weightedSum = 0;

  for (const e of state.active_emotions) {
    const valence = emotionToValence(e.type);
    weightedSum += valence * e.intensity;
    totalWeight += e.intensity;
  }

  if (totalWeight === 0) return state;
  const currentEmotionalMean = weightedSum / totalWeight;

  // 베이스라인을 그쪽으로 약간 이동 (10% 가중)
  const newBaseline = state.baseline_mood * 0.9 + currentEmotionalMean * 0.1;

  return {
    ...state,
    baseline_mood: clamp(newBaseline, -1, 1),
    baseline_updated_at: new Date().toISOString(),
  };
}

function emotionToValence(type: ActiveEmotion['type']): number {
  switch (type) {
    case 'sad': return -0.6;
    case 'angry': return -0.5;
    case 'worried': return -0.4;
    case 'tense': return -0.3;
    case 'frustrated': return -0.4;
    case 'joyful': return 0.7;
    case 'tender': return 0.5;
    case 'calm': return 0.2;
    case 'curious': return 0.3;
    case 'protective': return 0.0;
    default: return 0;
  }
}

// ============================================================
// 헬퍼
// ============================================================

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

// ============================================================
// 초기 상태 생성 (신규 유저)
// ============================================================

export function createInitialLimbicState(userId: string): LimbicState {
  const now = new Date().toISOString();
  return {
    user_id: userId,
    baseline_mood: 0,
    baseline_updated_at: now,
    baseline_history: [],   // 🆕 v58
    active_emotions: [],
    cortisol: 0,
    oxytocin: 0.1,    // 약간의 친밀감 베이스
    dopamine: 0,
    threat_arousal: 0,
    last_decayed_at: now,
  };
}

// ============================================================
// 🆕 v58: 베이스라인 히스토리 자동 갱신
// 세션 종료 시 호출. 같은 날짜는 평균, 다른 날짜면 새 항목 추가.
// 최근 7일치만 유지.
// ============================================================

export function updateBaselineHistory(state: LimbicState): LimbicState {
  const today = new Date().toISOString().slice(0, 10);   // YYYY-MM-DD
  const history = [...(state.baseline_history ?? [])];

  // 마지막 항목이 오늘 날짜면 평균
  const lastIdx = history.length - 1;
  if (lastIdx >= 0 && history[lastIdx].date === today) {
    history[lastIdx] = {
      date: today,
      mood: (history[lastIdx].mood + state.baseline_mood) / 2,
    };
  } else {
    // 새 날짜
    history.push({ date: today, mood: state.baseline_mood });
  }

  // 최근 7일만 유지
  while (history.length > 7) history.shift();

  return { ...state, baseline_history: history };
}
