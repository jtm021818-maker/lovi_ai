/**
 * 🎛️ ACC 설정
 */

export const ACC_CONFIG = {
  enabled: process.env.ACC_ENABLED !== 'false',
  extractStatements: process.env.ACC_EXTRACT !== 'false',
  detectConflicts: process.env.ACC_CONFLICT_DETECTION !== 'false',

  /** 신규 statement 저장 비활성 (드라이런) */
  saveStatements: process.env.ACC_SAVE !== 'false',

  /** 기본 lookback 일수 */
  defaultLookbackDays: Number(process.env.ACC_LOOKBACK_DAYS ?? 30),

  /** 모순 검사 최대 비교 수 */
  maxComparisons: Number(process.env.ACC_MAX_COMPARISONS ?? 10),

  /** 상세 로깅 */
  verboseLogging: process.env.ACC_VERBOSE === 'true' || process.env.NODE_ENV !== 'production',
} as const;
