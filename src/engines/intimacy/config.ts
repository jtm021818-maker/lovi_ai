/**
 * 🆕 v41: 친밀도 시스템 설정 — 현실시간 튜닝
 *
 * 핵심 설계 원칙:
 *  - 평균 유저(주 2~3회 상담)가 1개월 후 Lv.3 도달하도록 튜닝
 *  - 초반은 조금 빠르게 (경험 보장), 후반은 매우 천천히 (현실감)
 *  - 미방문 시 자연 감쇠 (bond 주로, trust 소량)
 *  - 세션당 max +5 캡 (폭증 방지)
 *  - 특수 이벤트만 예외적으로 큰 점수
 *
 * 목표 타임라인:
 *   Day 0    → Lv.1 (10점)
 *   Week 1   → Lv.1 후반 (15점)      — "아직 탐색 중"
 *   Week 2   → Lv.2 진입 (20~25점)   — "좀 알아가는 중"
 *   Week 4   → Lv.3 진입 (35~40점)   — "같이 고민 나누는 사이" 🎯
 *   Month 3  → Lv.4 진입 (60~65점)   — "진심 걱정하는 사이"
 *   Month 6+ → Lv.5 진입 (85~90점)   — "완전한 솔직함"
 */

import type {
  IntimacyLevelInfo,
  IntimacyTriggerType,
  IntimacyTrigger,
  PersonaIntimacyWeights,
} from './types';

// ============================================================
// 5단계 레벨 정의
// ============================================================

export const INTIMACY_LEVELS: IntimacyLevelInfo[] = [
  {
    level: 1,
    name: '새싹',
    emoji: '🌱',
    minAvg: 0,
    nextAvg: 15,
    label: '이제 막 알아가는 사이',
    depthHint: '표면적 공감. 따뜻하게 받아주기만.',
    unlocks: ['기본 상담', '따뜻한 리액션'],
  },
  {
    level: 2,
    name: '꽃봉오리',
    emoji: '🌸',
    minAvg: 15,
    nextAvg: 35,
    label: '좀 알아가는 중',
    depthHint: '속감정 짚기 시작. "진짜 힘든 건 이거 아냐?"',
    unlocks: ['루나 프로필 열람', '가벼운 자기개방', '속감정 탐색'],
  },
  {
    level: 3,
    name: '개화',
    emoji: '🌺',
    minAvg: 35,
    nextAvg: 60,
    label: '같이 고민 나누는 사이',
    depthHint: '패턴 짚기 + 솔직한 의견 가능.',
    unlocks: ['패턴 지적', '루나 경험담', '좀 더 직설적 조언'],
  },
  {
    level: 4,
    name: '만개',
    emoji: '🌹',
    minAvg: 60,
    nextAvg: 85,
    label: '진심으로 걱정하는 사이',
    depthHint: '루나도 감정 공유 + 직설 가능.',
    unlocks: ['루나의 감정 공유', '직설적 진심', '기억 인용'],
  },
  {
    level: 5,
    name: '영원',
    emoji: '💎',
    minAvg: 85,
    nextAvg: 101, // 최종
    label: '모든 걸 아는 사이',
    depthHint: '완전한 솔직함 + 함께 고민하는 사이.',
    unlocks: ['루나의 취약함 공유', '기념일 이벤트', '완전한 솔직함'],
  },
];

/** 평균 점수 → 레벨 계산 */
export function calculateLevel(avgScore: number): IntimacyLevelInfo {
  // 뒤에서부터 탐색 (높은 레벨부터)
  for (let i = INTIMACY_LEVELS.length - 1; i >= 0; i--) {
    if (avgScore >= INTIMACY_LEVELS[i].minAvg) return INTIMACY_LEVELS[i];
  }
  return INTIMACY_LEVELS[0];
}

// ============================================================
// 트리거 가중치 — "현실시간" 튜닝 (기존 문서 값의 ~40%)
// ============================================================

/**
 * 🎯 설계 원칙:
 *  - 일반 트리거는 세션당 평균 +2~4점 올라가게
 *  - 세션 완주(기본): +1.5 (bond + trust)
 *  - 감정 표현: +2.5 (개방이 핵심)
 *  - 조언 수용: +2 (존경)
 *  - 감사: +3 (bond 강함)
 *  - 특수 이벤트(첫 비밀, 위기 등)는 큰 점수
 *  - 1세션 1트리거 원칙 (같은 유형 중복 방지)
 */
export const TRIGGER_WEIGHTS: Record<IntimacyTriggerType, Omit<IntimacyTrigger, 'type' | 'context'>> = {
  // 🟢 증가 트리거 (일반)
  emotion_share:       { trust: 0.8, openness: 1.5 },      // 총 ~2.3
  deep_secret:         { trust: 1.5, openness: 3.5 },      // 총 ~5.0 (큰 신호)
  session_complete:    { trust: 0.5, bond: 1.0 },          // 총 ~1.5
  advice_accepted:     { respect: 1.5, bond: 0.5 },        // 총 ~2.0
  revisit_quick:       { bond: 1.5, trust: 0.5 },          // 총 ~2.0
  emotion_shift_ack:   { openness: 1.0, respect: 0.5 },    // 총 ~1.5
  gratitude:           { bond: 2.0, respect: 1.0 },        // 총 ~3.0
  humor_laugh:         { bond: 0.5 },                      // 총 ~0.5
  long_share:          { openness: 1.0 },                  // 총 ~1.0
  relationship_detail: { trust: 1.0, openness: 1.0 },      // 총 ~2.0
  homework_report:     { respect: 2.0, bond: 1.0 },        // 총 ~3.0
  nickname_given:      { bond: 2.0 },                      // 총 ~2.0
  consecutive_visit:   { bond: 0.5 },                      // 일당 0.5 (주 최대 3.5)
  mind_read_accepted:  { trust: 1.2, respect: 0.8 },       // 총 ~2.0

  // 🔴 감소 트리거
  long_absence:        { bond: -2.0, trust: -1.0 },        // 주당 감쇠
  early_exit:          { bond: -1.0 },                     // 총 -1.0
  short_repeat:        { openness: -1.0 },                 // 총 -1.0
  advice_rejected:     { respect: -1.0 },                  // 총 -1.0
  negative_feedback:   { respect: -2.5, bond: -1.5 },      // 총 -4.0

  // ⚡ 특수 이벤트 (큰 점수)
  first_tears:         { trust: 4.0, openness: 3.5 },      // 총 ~7.5
  first_secret:        { openness: 5.0, trust: 2.0 },      // 총 ~7.0
  first_gratitude:     { bond: 3.5, respect: 2.0 },        // 총 ~5.5
  crisis_request:      { trust: 6.0 },                     // 총 ~6.0 (최강 신뢰)
  milestone_100:       { trust: 4.0, openness: 4.0, bond: 4.0, respect: 4.0 }, // 총 +16
  consecutive_week:    { bond: 3.5 },                      // 총 ~3.5
  luna_mistake_forgive:{ trust: 4.0 },                     // 총 ~4.0
  relationship_update: { bond: 4.0, respect: 2.0 },        // 총 ~6.0
  anniversary_visit:   { bond: 2.5 },                      // 총 ~2.5

  // 🌱 기본 턴 증가 (매 채팅마다 미세 누적)
  chat_turn:           { bond: 0.08, trust: 0.05, openness: 0.05, respect: 0.02 }, // 총 ~0.2
};

// ============================================================
// 세션별 캡 (폭증 방지)
// ============================================================

/** 세션 1회당 각 축 최대 증가량 */
export const PER_SESSION_AXIS_CAP = 5;

/** 세션 1회당 총합 최대 증가량 (4축 합계) */
export const PER_SESSION_TOTAL_CAP = 15;

/** 하루 최대 증가량 (연속 세션 방지) */
export const PER_DAY_AXIS_CAP = 7;

// ============================================================
// 시간 감쇠 정책
// ============================================================

/** 감쇠 시작일 (며칠 이상 미방문 시) */
export const DECAY_START_DAYS = 7;

/** 주당 감쇠량 (7일 초과마다) */
export const DECAY_PER_WEEK = {
  bond: -2.0,
  trust: -0.8,
  openness: 0,
  respect: 0,
};

/** 30일+ 미방문 시 추가 감쇠 */
export const DECAY_MONTH_EXTRA = {
  bond: -4.0,
  trust: -2.0,
  openness: -1.0,
  respect: 0,
};

/** 감쇠 하한선 (이 아래로는 안 내려감 — 완전 리셋 방지) */
export const DECAY_FLOOR = {
  trust: 5,
  openness: 2,
  bond: 3,
  respect: 3,
};

// ============================================================
// 페르소나별 가중치
// ============================================================

export const PERSONA_WEIGHTS: Record<'luna' | 'tarot', PersonaIntimacyWeights> = {
  luna: {
    trust: 1.2,     // 루나는 신뢰 기반 상담
    openness: 1.2,  // 유저 자기개방 유도
    bond: 1.0,
    respect: 1.0,
  },
  tarot: {
    trust: 1.0,
    openness: 0.8,  // 카드로 읽으니 개방 덜 필요
    bond: 1.3,      // "또 카드 뽑고 싶어" 유대
    respect: 1.2,   // 타로 정확도
  },
};

/** 페르소나 가중치 적용 */
export function applyPersonaWeights(
  trigger: Omit<IntimacyTrigger, 'type' | 'context'>,
  persona: 'luna' | 'tarot',
): Omit<IntimacyTrigger, 'type' | 'context'> {
  const w = PERSONA_WEIGHTS[persona];
  return {
    trust: trigger.trust ? trigger.trust * w.trust : undefined,
    openness: trigger.openness ? trigger.openness * w.openness : undefined,
    bond: trigger.bond ? trigger.bond * w.bond : undefined,
    respect: trigger.respect ? trigger.respect * w.respect : undefined,
  };
}

// ============================================================
// 마일스톤 정의
// ============================================================

export const MILESTONES: Array<{
  id: string;
  condition: (state: { totalSessions: number; level: number; daysSinceFirst: number; consecutiveDays: number }) => boolean;
  message: string;
}> = [
  {
    id: 'first_session',
    condition: (s) => s.totalSessions >= 1 && s.totalSessions < 2,
    message: '첫 상담 완료! 💜',
  },
  {
    id: 'five_sessions',
    condition: (s) => s.totalSessions >= 5,
    message: '벌써 5번째 상담이야 ☺️',
  },
  {
    id: 'ten_sessions',
    condition: (s) => s.totalSessions >= 10,
    message: '10번째! 이제 좀 친해진 것 같아 🦊',
  },
  {
    id: 'level_2_bloom',
    condition: (s) => s.level >= 2,
    message: '🌸 꽃봉오리 — 속감정 얘기도 나눌 수 있게 됐어',
  },
  {
    id: 'level_3_bloom',
    condition: (s) => s.level >= 3,
    message: '🌺 개화 — 이제 같이 고민 나누는 사이!',
  },
  {
    id: 'level_4_bloom',
    condition: (s) => s.level >= 4,
    message: '🌹 만개 — 진심으로 걱정하는 사이가 됐어',
  },
  {
    id: 'level_5_bloom',
    condition: (s) => s.level >= 5,
    message: '💎 영원 — 서로 완전히 아는 사이야',
  },
  {
    id: 'seven_day_streak',
    condition: (s) => s.consecutiveDays >= 7,
    message: '🔥 7일 연속 방문! 완전 단골이네',
  },
  {
    id: 'thirty_days',
    condition: (s) => s.daysSinceFirst >= 30,
    message: '🎉 우리 만난 지 30일! 한 달이야',
  },
  {
    id: 'hundred_days',
    condition: (s) => s.daysSinceFirst >= 100,
    message: '✨ D+100 — 100일 기념',
  },
  {
    id: 'one_year',
    condition: (s) => s.daysSinceFirst >= 365,
    message: '🎊 1주년! 함께한 지 1년이 됐어',
  },
];
