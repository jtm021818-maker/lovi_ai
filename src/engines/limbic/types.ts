/**
 * 🧠 변연계(Limbic System) 엔진 — 타입 정의
 *
 * 인간 뇌의 감정 화학 시뮬레이션:
 *   - 감정의 시간적 지속 (반감기)
 *   - 호르몬 동역학 (코르티솔/옥시토신/도파민)
 *   - 베이스라인 무드 (며칠 단위로 변함)
 *   - 위협 각성도 (위기 신호 누적)
 */

// ============================================================
// 1. 감정 종류
// ============================================================

export type EmotionType =
  | 'sad'         // 슬픔
  | 'angry'       // 분노
  | 'worried'     // 걱정
  | 'joyful'      // 기쁨
  | 'calm'        // 평온
  | 'tense'       // 긴장
  | 'tender'      // 다정
  | 'frustrated'  // 답답
  | 'curious'     // 호기심
  | 'protective'; // 보호욕

// ============================================================
// 2. 활성 감정 (반감기 기반)
// ============================================================

export interface ActiveEmotion {
  type: EmotionType;
  /** 0~1 강도. 0.05 미만이면 자동 소멸 */
  intensity: number;
  /** 반감기 (시간 단위). 짧을수록 빨리 사라짐 */
  half_life_hours: number;
  /** 발생 시각 */
  triggered_at: string;  // ISO timestamp
  /** 발생 원인 (디버깅/우뇌 컨텍스트용) */
  triggered_by: string;
}

// ============================================================
// 3. 변연계 전체 상태
// ============================================================

export interface LimbicState {
  user_id: string;

  /** 베이스라인 무드 (-1 ~ +1). 며칠 단위로 천천히 변함 */
  baseline_mood: number;
  baseline_updated_at: string;

  /** 🆕 v58: 베이스라인 무드 히스토리 (메타인지용)
   *  최근 7일치 일별 평균. [{ date: ISO, mood: -1~+1 }]
   *  앞이 옛날, 뒤가 최근.
   */
  baseline_history?: Array<{ date: string; mood: number }>;

  /** 활성 감정들 (반감기 적용) */
  active_emotions: ActiveEmotion[];

  /** 호르몬 시뮬레이션 (모두 0~1) */
  cortisol: number;    // 스트레스 호르몬. 위기 시 상승
  oxytocin: number;    // 친밀감/유대 호르몬. 좋은 대화 후 상승
  dopamine: number;    // 보상 호르몬. 성공/돌파구 시 상승

  /** 위협 각성도 (0~1). 위기 신호 누적 */
  threat_arousal: number;

  /** 마지막 감쇠 계산 시각 */
  last_decayed_at: string;
}

// ============================================================
// 4. 감정 트리거 (외부 → 변연계)
// ============================================================

export type LimbicTrigger =
  // 위기 신호
  | 'user_crisis'              // 자살/자해 언급
  | 'user_severe_distress'     // 극심한 고통
  // 부정 감정
  | 'user_crying'              // 울음
  | 'user_anger'               // 분노 폭발
  | 'partner_betrayal'         // 배신
  | 'user_self_blame'          // 자책 심함
  // 긍정 감정
  | 'user_breakthrough'        // 통찰의 순간
  | 'user_recovery'            // 회복 신호
  | 'shared_joy'               // 함께 기쁨
  | 'deep_disclosure'          // 깊은 자기 공개
  | 'pattern_break'            // 패턴 탈출
  // 관계 신호
  | 'first_meeting'            // 첫 만남
  | 'long_absence_return'      // 오랜만에 돌아옴
  | 'consistent_visits'        // 꾸준히 옴
  | 'goodbye_warm';            // 따뜻한 마무리

// ============================================================
// 5. 트리거 → 감정 매핑 정의
// ============================================================

export interface TriggerEffect {
  /** 어떤 감정이 추가되는가 */
  emotion: EmotionType;
  /** 강도 (0~1) */
  intensity: number;
  /** 반감기 */
  half_life_hours: number;
  /** 호르몬 변화 (있을 때) */
  hormone_changes?: {
    cortisol?: number;
    oxytocin?: number;
    dopamine?: number;
    threat_arousal?: number;
  };
}

// ============================================================
// 6. 우뇌에 전달할 변연계 컨텍스트 (자연어)
// ============================================================

export interface LimbicHandoff {
  /** 현재 무드 한 줄 묘사 */
  current_mood_description: string;

  /** 주요 활성 감정들 (강한 순) */
  dominant_emotions: Array<{
    type: EmotionType;
    description: string;     // "걱정이 좀 남아있음"
    intensity_label: '약함' | '보통' | '강함';
  }>;

  /** 잔여 우려 (예: 어제 위기 신호) */
  lingering_concerns: string[];

  /** 에너지 레벨 (0~1) */
  energy_level: number;

  /** 톤 추천 (자연어) */
  suggested_pacing: string;   // "평소보다 차분하게" 등

  /** 호르몬 상태 요약 */
  hormonal_summary: {
    stress_level: '낮음' | '보통' | '높음';        // cortisol
    bond_strength: '약함' | '보통' | '강함';       // oxytocin
    recent_reward: boolean;                          // dopamine 상승 직후?
  };

  // 🆕 v58: 베이스라인 추세 메타인지
  /** 최근 며칠간 무드 추세 (자기 메타인지) */
  baseline_trend?: {
    direction: 'rising' | 'falling' | 'stable' | 'oscillating';
    days_observed: number;
    /** 자연어 묘사 — "최근 3일 무드 -0.3 → -0.5 하락" */
    natural_description: string;
    /** 우뇌가 언급할만한 자기 인지 멘트 (있으면) */
    self_aware_remark?: string;
  };
}

// ============================================================
// 7. 신호 → 트리거 매핑 (좌뇌 신호에서 자동 변환)
// ============================================================

/**
 * 좌뇌 derived_signals + high_stakes 감지 결과를 받아
 * 발생할 LimbicTrigger 들을 결정.
 */
export interface SignalToTriggerInput {
  derived_signals: {
    crisis_risk: boolean;
    escalating: boolean;
    helplessness: boolean;
    insight_moment: boolean;
    trust_gain: boolean;
    [key: string]: boolean;
  };
  high_stakes_type: string | null;
  user_input_excerpt: string;
}
