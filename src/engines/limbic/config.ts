/**
 * 🎛️ 변연계 설정
 */

export const LIMBIC_CONFIG = {
  /** 마스터 스위치 */
  enabled: process.env.LIMBIC_ENABLED !== 'false',

  /** 세션 시작 시 자동 트리거 활성 (관계 신호) */
  sessionStartTriggers: process.env.LIMBIC_SESSION_TRIGGERS !== 'false',

  /** 세션 종료 시 자동 트리거 활성 */
  sessionEndTriggers: process.env.LIMBIC_END_TRIGGERS !== 'false',

  /** 호르몬 시뮬레이션 (false면 활성 감정만) */
  useHormones: process.env.LIMBIC_HORMONES !== 'false',

  /** 베이스라인 무드 진화 */
  evolveBaseline: process.env.LIMBIC_BASELINE_EVOLUTION !== 'false',

  /** 캐시 TTL (ms) */
  cacheTtlMs: Number(process.env.LIMBIC_CACHE_TTL_MS ?? 60_000),

  /** 상세 로깅 */
  verboseLogging: process.env.LIMBIC_VERBOSE === 'true' || process.env.NODE_ENV !== 'production',
} as const;
