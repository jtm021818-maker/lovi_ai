/**
 * 🌉 변연계 → 좌뇌/우뇌 핸드오프 인젝터
 *
 * LimbicState (수치 기반) → LimbicHandoff (자연어)
 *
 * 핵심 원칙:
 *   - 숫자(0.7) → 단어("강함")
 *   - 추상 호르몬 → 직관적 묘사
 *   - 감정 우선순위 (강도 순 정렬)
 *   - "지금 이 정보를 우뇌가 알면 어떻게 다르게 말할까" 관점
 */

import type { LimbicState, LimbicHandoff, ActiveEmotion, EmotionType } from './types';

// ============================================================
// 메인: LimbicState → LimbicHandoff
// ============================================================

export function buildLimbicHandoff(state: LimbicState): LimbicHandoff {
  // 활성 감정 정렬 (강도 큰 순)
  const sorted = [...state.active_emotions].sort((a, b) => b.intensity - a.intensity);

  return {
    current_mood_description: describeMood(state),
    dominant_emotions: sorted.slice(0, 3).map(toEmotionDescriptor),
    lingering_concerns: extractLingeringConcerns(state),
    energy_level: calculateEnergyLevel(state),
    suggested_pacing: suggestPacing(state),
    hormonal_summary: {
      stress_level: levelLabel(state.cortisol),
      bond_strength: bondLabel(state.oxytocin),
      recent_reward: state.dopamine > 0.4,
    },
    baseline_trend: deriveBaselineTrend(state),  // 🆕 v58
  };
}

// 🆕 v58: 베이스라인 추세 계산
function deriveBaselineTrend(state: LimbicState): import('./types').LimbicHandoff['baseline_trend'] {
  const history = state.baseline_history ?? [];
  if (history.length < 2) return undefined;   // 데이터 부족

  const recent = history.slice(-7);   // 최근 7일치
  const days = recent.length;

  // 첫 값 vs 마지막 값
  const first = recent[0].mood;
  const last = recent[recent.length - 1].mood;
  const delta = last - first;

  // 변동성 (표준편차)
  const mean = recent.reduce((s, p) => s + p.mood, 0) / days;
  const variance = recent.reduce((s, p) => s + Math.pow(p.mood - mean, 2), 0) / days;
  const stdDev = Math.sqrt(variance);

  let direction: 'rising' | 'falling' | 'stable' | 'oscillating';
  if (stdDev > 0.25) direction = 'oscillating';
  else if (delta > 0.15) direction = 'rising';
  else if (delta < -0.15) direction = 'falling';
  else direction = 'stable';

  // 자연어 묘사
  let nat = `최근 ${days}일 무드: ${first.toFixed(2)} → ${last.toFixed(2)}`;
  if (direction === 'rising') nat += ' (회복 중)';
  else if (direction === 'falling') nat += ' (하락 중)';
  else if (direction === 'oscillating') nat += ' (요동침)';
  else nat += ' (안정)';

  // 우뇌가 가끔 언급할만한 자기 인지
  let remark: string | undefined;
  if (direction === 'falling' && delta < -0.3) {
    remark = '"요즘 좀 처지는 것 같다" 같은 자기 인지 자연스러움';
  } else if (direction === 'rising' && delta > 0.3) {
    remark = '"요즘 기분 좀 나아진 듯" 가능';
  } else if (direction === 'oscillating' && stdDev > 0.4) {
    remark = '"요즘 마음이 들쭉날쭉" 가능';
  }

  return { direction, days_observed: days, natural_description: nat, self_aware_remark: remark };
}

// ============================================================
// 무드 묘사
// ============================================================

function describeMood(state: LimbicState): string {
  const totalIntensity = state.active_emotions.reduce((s, e) => s + e.intensity, 0);

  // 활성 감정 거의 없음 → 베이스라인 묘사
  if (totalIntensity < 0.3) {
    if (state.baseline_mood > 0.3) return '편안한 상태';
    if (state.baseline_mood < -0.3) return '약간 무거운 편';
    return '평이한 상태';
  }

  // 위기 우선
  if (state.threat_arousal > 0.6) {
    return '경계 상태 (위기 신호 잔여)';
  }

  // 가장 강한 감정 + 강도
  const dominant = [...state.active_emotions].sort((a, b) => b.intensity - a.intensity)[0];
  if (!dominant) return '평이한 상태';

  const moodMap: Record<EmotionType, string> = {
    sad: '약간 슬픔이 남아있음',
    angry: '약간의 분노 잔여',
    worried: '걱정이 좀 남음',
    joyful: '기분이 좋은 편',
    calm: '차분함',
    tense: '약간 긴장된 상태',
    tender: '다정한 상태',
    frustrated: '약간 답답함',
    curious: '호기심 있는 상태',
    protective: '보호하고 싶은 마음',
  };

  const intensityLabel = dominant.intensity > 0.7 ? '강한 ' : dominant.intensity > 0.4 ? '' : '약한 ';
  return intensityLabel + (moodMap[dominant.type] ?? '복잡한 감정');
}

// ============================================================
// 활성 감정 → 자연어 묘사
// ============================================================

function toEmotionDescriptor(emotion: ActiveEmotion): LimbicHandoff['dominant_emotions'][0] {
  const intensityLabel: '약함' | '보통' | '강함' =
    emotion.intensity > 0.7 ? '강함' : emotion.intensity > 0.4 ? '보통' : '약함';

  const descMap: Record<EmotionType, string> = {
    sad: '슬픔',
    angry: '분노',
    worried: '걱정',
    joyful: '기쁨',
    calm: '평온',
    tense: '긴장',
    tender: '다정함',
    frustrated: '답답함',
    curious: '호기심',
    protective: '보호욕',
  };

  // 시간 지난 감정은 "잔여" 표현
  const hoursOld = (Date.now() - new Date(emotion.triggered_at).getTime()) / (1000 * 60 * 60);
  const lingering = hoursOld > 3 ? ' (잔여)' : '';

  return {
    type: emotion.type,
    description: `${descMap[emotion.type]}${lingering} — ${emotion.triggered_by}`,
    intensity_label: intensityLabel,
  };
}

// ============================================================
// 잔여 우려 (24시간 내 강한 위기성 감정)
// ============================================================

function extractLingeringConcerns(state: LimbicState): string[] {
  const concerns: string[] = [];
  const now = Date.now();

  for (const e of state.active_emotions) {
    const hoursOld = (now - new Date(e.triggered_at).getTime()) / (1000 * 60 * 60);
    if (hoursOld < 24 && e.intensity > 0.4) {
      if (e.type === 'worried' && e.triggered_by.includes('crisis')) {
        concerns.push(`이전 세션 위기 신호 (${Math.round(hoursOld)}시간 전)`);
      } else if (e.type === 'sad' && e.intensity > 0.6) {
        concerns.push(`강한 슬픔 잔여 (${Math.round(hoursOld)}시간 전)`);
      } else if (e.type === 'protective' && e.intensity > 0.5) {
        concerns.push(`보호 모드 잔여 (${e.triggered_by})`);
      }
    }
  }

  // 위협 각성도 높음
  if (state.threat_arousal > 0.5) {
    concerns.push(`위협 각성도 ${(state.threat_arousal * 100).toFixed(0)}%`);
  }

  return concerns.slice(0, 3); // 최대 3개
}

// ============================================================
// 에너지 레벨 (0~1)
// ============================================================

function calculateEnergyLevel(state: LimbicState): number {
  // 베이스라인 + 도파민 + (옥시토신 절반) - 코르티솔 - 위협
  const energy =
    0.5 +
    state.baseline_mood * 0.3 +
    state.dopamine * 0.4 +
    state.oxytocin * 0.2 -
    state.cortisol * 0.4 -
    state.threat_arousal * 0.3;

  return Math.max(0, Math.min(1, energy));
}

// ============================================================
// 페이싱 추천
// ============================================================

function suggestPacing(state: LimbicState): string {
  // 위기/스트레스 높음 → 차분
  if (state.threat_arousal > 0.5 || state.cortisol > 0.6) {
    return '평소보다 차분하게, 단단하게';
  }

  // 활성 감정 많음 → 절제
  const totalIntensity = state.active_emotions.reduce((s, e) => s + e.intensity, 0);
  if (totalIntensity > 1.5) {
    return '감정 정돈된 상태로, 한템포 천천히';
  }

  // 도파민 높음 → 가볍게
  if (state.dopamine > 0.5) {
    return '평소보다 가볍고 따뜻하게';
  }

  // 옥시토신 높음 → 친밀하게
  if (state.oxytocin > 0.6) {
    return '평소보다 친밀하게, 속마음 노출 가능';
  }

  // 베이스라인 무거움
  if (state.baseline_mood < -0.3) {
    return '기본 톤이 약간 무거움, 억지 명랑 X';
  }

  return '평소 톤';
}

// ============================================================
// 호르몬 레벨 라벨
// ============================================================

function levelLabel(value: number): '낮음' | '보통' | '높음' {
  if (value < 0.3) return '낮음';
  if (value < 0.6) return '보통';
  return '높음';
}

function bondLabel(value: number): '약함' | '보통' | '강함' {
  if (value < 0.3) return '약함';
  if (value < 0.6) return '보통';
  return '강함';
}

// ============================================================
// 우뇌 프롬프트에 삽입할 텍스트
// ============================================================

export function formatLimbicForPrompt(handoff: LimbicHandoff): string {
  const lines: string[] = [];

  // 🆕 v57: 루나 vs 유저 감정 명시적 분리
  lines.push(`### 🫀 **루나**의 현재 무드 (너 자신의 내면 상태)`);
  lines.push(`⚠️ 이건 "루나 본인"의 감정 — 유저 감정이 아님. state_vector 가 유저 감정.`);
  lines.push(`- 전반: ${handoff.current_mood_description}`);
  lines.push(`- 에너지: ${(handoff.energy_level * 100).toFixed(0)}%`);
  lines.push(`- 페이싱 추천: ${handoff.suggested_pacing}`);

  if (handoff.dominant_emotions.length > 0) {
    lines.push('');
    lines.push('주요 잔여 감정:');
    for (const e of handoff.dominant_emotions) {
      lines.push(`  - ${e.description} (${e.intensity_label})`);
    }
  }

  if (handoff.lingering_concerns.length > 0) {
    lines.push('');
    lines.push('마음에 걸리는 것:');
    for (const c of handoff.lingering_concerns) {
      lines.push(`  - ${c}`);
    }
  }

  // 호르몬 요약 (이상치만 언급)
  const h = handoff.hormonal_summary;
  const hormoneFlags: string[] = [];
  if (h.stress_level === '높음') hormoneFlags.push('스트레스 높음');
  if (h.bond_strength === '강함') hormoneFlags.push('친밀감 강함');
  if (h.recent_reward) hormoneFlags.push('최근 보상 경험');

  if (hormoneFlags.length > 0) {
    lines.push('');
    lines.push(`호르몬 상태: ${hormoneFlags.join(', ')}`);
  }

  // 🆕 v58: 베이스라인 추세 (메타인지)
  if (handoff.baseline_trend && handoff.baseline_trend.days_observed >= 2) {
    lines.push('');
    lines.push(`📊 베이스라인 추세: ${handoff.baseline_trend.natural_description}`);
    if (handoff.baseline_trend.self_aware_remark) {
      lines.push(`   ↳ ${handoff.baseline_trend.self_aware_remark}`);
    }
  }

  lines.push('');
  lines.push('→ 이 무드를 자연스럽게 응답에 반영. 직접 언급 금지 (예: "내 cortisol이..." X).');

  return lines.join('\n');
}
