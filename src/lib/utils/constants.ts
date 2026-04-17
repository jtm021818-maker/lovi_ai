/**
 * 앱 전체에서 사용하는 공통 상수
 */

import { StrategyType, DistortionType } from '@/types/engine.types';

// ============================================================
// 위기 상담 전화번호
// ============================================================
export const CRISIS_HOTLINES = {
  /** 자살예방상담전화 (24시간) */
  SUICIDE_PREVENTION: '1393',
  /** 정신건강위기상담전화 */
  MENTAL_HEALTH_CRISIS: '1577-0199',
  /** 생명의전화 */
  LIFELINE: '1588-9191',
  /** 청소년 전화 */
  YOUTH: '1388',
} as const;

// ============================================================
// 감정 이모지 매핑 (-5 ~ +5)
// ============================================================
export const EMOTION_EMOJI_MAP: Record<number, string> = {
  [-5]: '😭',
  [-4]: '😢',
  [-3]: '😟',
  [-2]: '😕',
  [-1]: '😐',
  [0]: '😶',
  [1]: '🙂',
  [2]: '😊',
  [3]: '😄',
  [4]: '😁',
  [5]: '🥰',
};

/**
 * 감정 점수에 해당하는 이모지 반환
 * @param score -5 ~ +5
 */
export function getEmotionEmoji(score: number): string {
  const clamped = Math.max(-5, Math.min(5, Math.round(score)));
  return EMOTION_EMOJI_MAP[clamped] ?? '😶';
}

// ============================================================
// 전략 한국어 이름 매핑
// ============================================================
export const STRATEGY_KOREAN_NAMES: Record<StrategyType, string> = {
  [StrategyType.CRISIS_SUPPORT]: '위기 지원',
  [StrategyType.CALMING]: '진정 & 안정화',
  [StrategyType.CBT]: '인지행동 재구성',
  [StrategyType.ACT]: '수용전념치료',
  [StrategyType.MI]: '동기부여면담',
  [StrategyType.SUPPORT]: '공감 & 지지',
};

/** 전략 설명 (사용자에게 보여주는 짧은 설명) */
export const STRATEGY_DESCRIPTIONS: Record<StrategyType, string> = {
  [StrategyType.CRISIS_SUPPORT]: '지금 많이 힘드시죠. 충분히 들을게요.',
  [StrategyType.CALMING]: '지금은 잠시 마음을 가라앉히는 시간이 필요해요.',
  [StrategyType.CBT]: '생각의 패턴을 함께 살펴볼게요.',
  [StrategyType.ACT]: '감정을 있는 그대로 받아들여 보아요.',
  [StrategyType.MI]: '변화에 대한 마음을 함께 탐색해요.',
  [StrategyType.SUPPORT]: '편하게 이야기해 주세요, 함께 들을게요.',
};

// ============================================================
// 인지 왜곡 한국어 이름 매핑
// ============================================================
export const DISTORTION_KOREAN_NAMES: Record<DistortionType, string> = {
  [DistortionType.MIND_READING]: '마음 읽기',
  [DistortionType.CATASTROPHIZING]: '파국화',
  [DistortionType.PERSONALIZATION]: '자기화',
  [DistortionType.ALL_OR_NOTHING]: '흑백 사고',
  [DistortionType.OVERGENERALIZATION]: '과잉 일반화',
  [DistortionType.EMOTIONAL_REASONING]: '감정적 추론',
  [DistortionType.SHOULD_STATEMENTS]: '당위적 사고',
  [DistortionType.LABELING]: '딱지 붙이기',
};

// ============================================================
// 메시지 길이 제한
// ============================================================
/** 사용자 메시지 최대 길이 */
export const MAX_USER_MESSAGE_LENGTH = 2000;

/** AI 응답 최대 토큰 수 */
export const MAX_AI_RESPONSE_TOKENS = 1024;

/** 채팅 히스토리 유지 턴 수 */
export const MAX_CHAT_HISTORY_TURNS = 20;

/** RAG 임베딩 최소 텍스트 길이 */
export const MIN_EMBEDDING_TEXT_LENGTH = 10;

// ============================================================
// 임베딩 & RAG 설정
// ============================================================
/**
 * Gemini 임베딩 모델
 * - v62: text-embedding-004 deprecated → gemini-embedding-001 으로 교체
 * - 기본 3072차원이지만 outputDimensionality 옵션으로 768로 축소 (DB pgvector 호환)
 */
export const EMBEDDING_MODEL = 'gemini-embedding-001';

/** 임베딩 벡터 차원 (DB schema = 768, gemini-embedding-001 은 outputDimensionality 로 축소) */
export const EMBEDDING_DIMENSIONS = 768;

/** RAG 유사도 임계값 */
export const RAG_SIMILARITY_THRESHOLD = 0.5;

/** RAG 최대 결과 수 */
export const RAG_TOP_K = 5;

// ============================================================
// 세션 상태
// ============================================================
export const SESSION_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CRISIS: 'crisis',
} as const;

export type SessionStatus = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

// ============================================================
// 정서적 통장 (가트맨 Magic Ratio)
// ============================================================
/** 긍정:부정 이상적 비율 (5:1) */
export const GOTTMAN_MAGIC_RATIO = 5;

/** 통장 잔고 최솟값 (위험 구간) */
export const BANK_BALANCE_DANGER_THRESHOLD = 1.0;

/** 통장 잔고 건강 구간 */
export const BANK_BALANCE_HEALTHY_THRESHOLD = 5.0;
