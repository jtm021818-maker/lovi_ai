/**
 * 🎼 변연계 오케스트레이터
 *
 * 세션 라이프사이클에 변연계를 hook:
 *   1. 세션 시작 시: 상태 로드 + 자동 감쇠 + 세션 시작 트리거
 *   2. 매 턴: 좌뇌 신호 → 트리거 발동 → 상태 갱신
 *   3. 세션 종료 시: 종료 트리거 + 상태 저장
 */

import type { LimbicState, LimbicHandoff, LimbicTrigger, SignalToTriggerInput, ActiveEmotion } from './types';
import { decayLimbicState, updateBaselineMood, applyHormoneChanges, addEmotion } from './emotion-decay';
import {
  inferTriggersFromSignals,
  applyTriggersToState,
  inferSessionStartTriggers,
  inferSessionEndTriggers,
} from './trigger-mapper';
import {
  loadAndDecayLimbicState,
  saveLimbicState,
  getCachedLimbicState,
  updateLimbicCache,
} from './state-loader';
import { buildLimbicHandoff } from './handoff-injector';
import { LIMBIC_CONFIG } from './config';

interface SupabaseLike {
  from(table: string): any;
}

// ============================================================
// 1. 세션 시작
// ============================================================

export interface SessionStartParams {
  supabase: SupabaseLike;
  userId: string;
  isFirstMeeting: boolean;
  daysSinceLastSession: number;
  totalSessions: number;
}

export interface SessionStartResult {
  state: LimbicState;
  handoff: LimbicHandoff;
  triggersFired: LimbicTrigger[];
}

export async function onSessionStart(params: SessionStartParams): Promise<SessionStartResult> {
  if (!LIMBIC_CONFIG.enabled) {
    // 비활성화 — 빈 상태 반환
    const empty = await loadAndDecayLimbicState(params.supabase, params.userId);
    return {
      state: empty,
      handoff: buildLimbicHandoff(empty),
      triggersFired: [],
    };
  }

  // 1. 상태 로드 + 자동 감쇠
  let state = await loadAndDecayLimbicState(params.supabase, params.userId);

  // 2. 세션 시작 트리거 (관계 신호)
  let triggersFired: LimbicTrigger[] = [];
  if (LIMBIC_CONFIG.sessionStartTriggers) {
    triggersFired = inferSessionStartTriggers({
      isFirstMeeting: params.isFirstMeeting,
      daysSinceLastSession: params.daysSinceLastSession,
      totalSessions: params.totalSessions,
    });

    if (triggersFired.length > 0) {
      state = applyTriggersToState(state, triggersFired, '세션 시작');
    }
  }

  // 3. 핸드오프 생성
  const handoff = buildLimbicHandoff(state);

  // 4. 캐시 업데이트
  updateLimbicCache(params.userId, state);

  if (LIMBIC_CONFIG.verboseLogging) {
    console.log(
      `[Limbic] 🫀 세션 시작 | 무드: ${handoff.current_mood_description} | ` +
      `트리거: [${triggersFired.join(',') || '없음'}] | ` +
      `에너지: ${(handoff.energy_level * 100).toFixed(0)}%`,
    );
  }

  return { state, handoff, triggersFired };
}

// ============================================================
// 2. 매 턴 — 좌뇌 신호 → 변연계 갱신
// ============================================================

export interface OnTurnParams {
  state: LimbicState;
  signalInput: SignalToTriggerInput;
  triggerContext: string;     // 트리거 사유 (예: "유저 발화: 죽고싶어")
}

export interface OnTurnResult {
  state: LimbicState;
  handoff: LimbicHandoff;
  triggersFired: LimbicTrigger[];
}

export function onTurn(params: OnTurnParams): OnTurnResult {
  if (!LIMBIC_CONFIG.enabled) {
    return {
      state: params.state,
      handoff: buildLimbicHandoff(params.state),
      triggersFired: [],
    };
  }

  // 좌뇌 신호 → 트리거 추론
  const triggers = inferTriggersFromSignals(params.signalInput);

  // 트리거 적용
  let newState = applyTriggersToState(params.state, triggers, params.triggerContext);

  // 베이스라인 무드 점진적 진화
  if (LIMBIC_CONFIG.evolveBaseline) {
    newState = updateBaselineMood(newState);
  }

  const handoff = buildLimbicHandoff(newState);

  if (LIMBIC_CONFIG.verboseLogging && triggers.length > 0) {
    console.log(`[Limbic] ⚡ 트리거: [${triggers.join(',')}] → ${handoff.current_mood_description}`);
  }

  return { state: newState, handoff, triggersFired: triggers };
}

// ============================================================
// 2.5. 🆕 v56: LLM 판단 기반 호르몬 적용
// ============================================================

export interface OnTurnWithLlmParams {
  state: LimbicState;
  /** 좌뇌가 LLM 판단으로 출력한 호르몬 변화 (하드코딩 대체) */
  hormonal_impact: {
    cortisol_delta: number;
    oxytocin_delta: number;
    dopamine_delta: number;
    threat_delta: number;
    reasoning: string;
  };
  /** 좌뇌가 감지한 주요 감정 (자연어) — 활성 감정으로 추가 */
  perceived_emotion?: string;
  /** 원인 컨텍스트 */
  triggerContext: string;
}

/**
 * 🆕 좌뇌의 LLM 판단 호르몬 변화를 직접 적용.
 * trigger-mapper 의 하드코딩값 우회 — 맥락 이해로 결정된 수치 사용.
 *
 * 사용:
 *   좌뇌 응답에 hormonal_impact 가 있으면 이걸 호출
 *   없으면 기존 onTurn (trigger-mapper 백업)
 */
export function onTurnWithLlmJudgment(params: OnTurnWithLlmParams): OnTurnResult {
  if (!LIMBIC_CONFIG.enabled) {
    return {
      state: params.state,
      handoff: buildLimbicHandoff(params.state),
      triggersFired: [],
    };
  }

  const h = params.hormonal_impact;

  // 1. 호르몬 직접 적용 (LLM 판단 수치)
  let newState = applyHormoneChanges(params.state, {
    cortisol: h.cortisol_delta,
    oxytocin: h.oxytocin_delta,
    dopamine: h.dopamine_delta,
    threat_arousal: h.threat_delta,
  });

  // 2. 감정 활성 추가 (강한 변화면 추가 감정 등록)
  const strongChange = Math.max(
    Math.abs(h.cortisol_delta),
    Math.abs(h.oxytocin_delta),
    Math.abs(h.dopamine_delta),
    Math.abs(h.threat_delta),
  );

  if (strongChange > 0.3) {
    // LLM 이 판단한 감정을 ActiveEmotion 으로 추가
    const emotion = inferEmotionFromHormones(h);
    const intensity = Math.min(1, strongChange * 1.2);
    const halfLife = h.threat_delta > 0.5 ? 24 : h.cortisol_delta > 0.4 ? 8 : 4;

    const active: ActiveEmotion = {
      type: emotion,
      intensity,
      half_life_hours: halfLife,
      triggered_at: new Date().toISOString(),
      triggered_by: params.triggerContext,
    };

    newState = addEmotion(newState, active);
  }

  // 3. 베이스라인 점진적 진화
  if (LIMBIC_CONFIG.evolveBaseline) {
    newState = updateBaselineMood(newState);
  }

  const handoff = buildLimbicHandoff(newState);

  if (LIMBIC_CONFIG.verboseLogging) {
    console.log(
      `[Limbic LLM] 🧠 호르몬 (cort ${h.cortisol_delta >= 0 ? '+' : ''}${h.cortisol_delta.toFixed(2)}, ` +
      `oxy ${h.oxytocin_delta >= 0 ? '+' : ''}${h.oxytocin_delta.toFixed(2)}, ` +
      `dop ${h.dopamine_delta >= 0 ? '+' : ''}${h.dopamine_delta.toFixed(2)}, ` +
      `thr ${h.threat_delta >= 0 ? '+' : ''}${h.threat_delta.toFixed(2)}) ` +
      `→ ${handoff.current_mood_description} | ${h.reasoning}`
    );
  }

  return { state: newState, handoff, triggersFired: [] };
}

/**
 * 호르몬 변화 패턴 → 대표 감정 매핑
 * (하드코딩 트리거 대신 호르몬 델타 자체에서 감정 유도)
 */
function inferEmotionFromHormones(h: OnTurnWithLlmParams['hormonal_impact']): ActiveEmotion['type'] {
  // 위협 > 0.5 → 걱정/경계
  if (h.threat_delta > 0.5) return 'worried';

  // 코르티솔 + 위협 → 긴장
  if (h.cortisol_delta > 0.4 && h.threat_delta > 0.2) return 'tense';

  // 코르티솔 + 낮은 옥시토신 → 답답
  if (h.cortisol_delta > 0.4 && h.oxytocin_delta < 0.1) return 'frustrated';

  // 옥시토신 높음 → 다정
  if (h.oxytocin_delta > 0.4) return 'tender';

  // 도파민 높음 → 기쁨
  if (h.dopamine_delta > 0.4) return 'joyful';

  // 코르티솔 양 + 옥시토신 양 → 보호욕
  if (h.cortisol_delta > 0.2 && h.oxytocin_delta > 0.2) return 'protective';

  // 코르티솔 + 감소 → 슬픔
  if (h.cortisol_delta > 0.2 && h.dopamine_delta < 0) return 'sad';

  // 기본
  return 'calm';
}

// ============================================================
// 2.6. 🆕 v57: ACC 신호 → Limbic 직접 연결
// ============================================================

export interface AccSignalsForLimbic {
  /** 감지된 모순 수 (높을수록 threat_arousal 상승) */
  conflict_count: number;
  /** 가장 심각한 모순 severity (0~1) */
  max_severity: number;
  /** 깊은 자기개방 신호 (deep_disclosure 트리거) */
  deep_disclosure_detected: boolean;
  /** 신뢰 형성 신호 (꾸준한 일관성 등) */
  consistency_pattern: boolean;
}

/**
 * ACC 결과 → Limbic 호르몬 직접 영향.
 * 모순 → 경계심 (threat_arousal +)
 * 일관/개방 → 친밀감 (oxytocin +)
 */
export function applyAccSignalsToLimbic(
  state: LimbicState,
  accSignals: AccSignalsForLimbic,
  context: string,
): LimbicState {
  if (!LIMBIC_CONFIG.enabled) return state;

  const hormonal: { cortisol?: number; oxytocin?: number; dopamine?: number; threat_arousal?: number } = {};

  // 1. 모순 감지 → threat_arousal 상승 (severity * count 비례)
  if (accSignals.conflict_count > 0 && accSignals.max_severity >= 0.5) {
    const threatBoost = Math.min(0.3, accSignals.max_severity * 0.4 * Math.min(accSignals.conflict_count, 3));
    hormonal.threat_arousal = threatBoost;
    // 동시에 cortisol 약간 상승 (긴장)
    hormonal.cortisol = threatBoost * 0.5;
  }

  // 2. 깊은 자기개방 → oxytocin 상승
  if (accSignals.deep_disclosure_detected) {
    hormonal.oxytocin = 0.4;
  }

  // 3. 일관성 패턴 → 약한 oxytocin
  if (accSignals.consistency_pattern) {
    hormonal.oxytocin = (hormonal.oxytocin ?? 0) + 0.15;
  }

  // 변화 없으면 그대로
  if (Object.values(hormonal).every(v => !v)) {
    return state;
  }

  // 적용
  let newState = applyHormoneChanges(state, hormonal);

  // 모순 강함 → tense 감정 추가
  if (accSignals.max_severity >= 0.7) {
    newState = addEmotion(newState, {
      type: 'tense',
      intensity: accSignals.max_severity * 0.8,
      half_life_hours: 4,
      triggered_at: new Date().toISOString(),
      triggered_by: `ACC 고심각도 모순: ${context}`,
    });
  }

  // 깊은 개방 → tender 감정
  if (accSignals.deep_disclosure_detected) {
    newState = addEmotion(newState, {
      type: 'tender',
      intensity: 0.6,
      half_life_hours: 6,
      triggered_at: new Date().toISOString(),
      triggered_by: '유저 자기개방',
    });
  }

  if (LIMBIC_CONFIG.verboseLogging) {
    console.log(
      `[Limbic ↔ ACC] ${accSignals.conflict_count > 0 ? `🔴 모순${accSignals.conflict_count}개 ` : ''}` +
      `${accSignals.deep_disclosure_detected ? '💜 깊은개방 ' : ''}` +
      `${accSignals.consistency_pattern ? '✓ 일관성 ' : ''}` +
      `→ thr ${(hormonal.threat_arousal ?? 0).toFixed(2)}, oxy ${(hormonal.oxytocin ?? 0).toFixed(2)}`
    );
  }

  return newState;
}

// ============================================================
// 3. 세션 종료
// ============================================================

export interface SessionEndParams {
  supabase: SupabaseLike;
  state: LimbicState;
  lastUserMessage: string;
  sessionWasPositive: boolean;
}

export interface SessionEndResult {
  finalState: LimbicState;
  triggersFired: LimbicTrigger[];
  saved: boolean;
  saveError?: string;
}

export async function onSessionEnd(params: SessionEndParams): Promise<SessionEndResult> {
  if (!LIMBIC_CONFIG.enabled) {
    return {
      finalState: params.state,
      triggersFired: [],
      saved: false,
    };
  }

  let finalState = params.state;
  let triggersFired: LimbicTrigger[] = [];

  // 종료 트리거 (따뜻한 마무리 등)
  if (LIMBIC_CONFIG.sessionEndTriggers) {
    triggersFired = inferSessionEndTriggers({
      lastUserMessage: params.lastUserMessage,
      sessionWasPositive: params.sessionWasPositive,
    });

    if (triggersFired.length > 0) {
      finalState = applyTriggersToState(finalState, triggersFired, '세션 종료');
    }
  }

  // 마지막 감쇠 한 번 더 (최신화)
  finalState = decayLimbicState(finalState);

  // 캐시 갱신 + 저장
  updateLimbicCache(params.state.user_id, finalState);
  const saveResult = await saveLimbicState(params.supabase, finalState);

  if (LIMBIC_CONFIG.verboseLogging) {
    console.log(
      `[Limbic] 💤 세션 종료 | 종료 트리거: [${triggersFired.join(',') || '없음'}] | ` +
      `저장: ${saveResult.success ? '✅' : '❌ ' + saveResult.error}`,
    );
  }

  return {
    finalState,
    triggersFired,
    saved: saveResult.success,
    saveError: saveResult.error,
  };
}

// ============================================================
// 4. Lazy 헬퍼 — 캐시된 핸드오프
// ============================================================

export async function getLimbicHandoff(
  supabase: SupabaseLike,
  userId: string,
): Promise<LimbicHandoff> {
  const state = await getCachedLimbicState(supabase, userId);
  return buildLimbicHandoff(state);
}
