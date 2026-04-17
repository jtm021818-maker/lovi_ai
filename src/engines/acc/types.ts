/**
 * 🧠 ACC (Anterior Cingulate Cortex) — 모순 감지 엔진 타입
 *
 * 인간 뇌의 전대상피질이 하는 일:
 *   - 충돌 감지 (실제 vs 기대 / 과거 vs 현재)
 *   - 오류 신호 (자기 모순)
 *   - 인지 통제
 *
 * 루나에 적용:
 *   - 유저 발화에서 statement 추출 → DB 저장
 *   - 새 발화가 과거 statement와 모순될 때 감지
 *   - 우뇌에 "모순 감지됨" 신호 전달 → 자연스럽게 짚어주기
 */

// ============================================================
// 1. Statement 분류
// ============================================================

export type StatementType =
  | 'fact'         // 객관적 사실 ("남친이 어제 화냈어")
  | 'emotion'      // 감정 표현 ("난 슬퍼")
  | 'decision'     // 결정 ("이제 헤어질래")
  | 'judgment'     // 평가/판단 ("걔 진짜 좋은 사람이야")
  | 'desire'       // 욕구/원함 ("연락 받고싶어")
  | 'plan';        // 계획 ("내일 만나기로 했어")

// ============================================================
// 2. Statement (발화 단위 의미 조각)
// ============================================================

export interface Statement {
  id?: string;
  user_id: string;
  session_id?: string;
  type: StatementType;
  /** 누구/뭐에 관한 statement (예: "남친", "본인", "어머니") */
  subject: string;
  /** 내용 (정규화) */
  content: string;
  /** 원문 발화에서의 출처 */
  source_excerpt: string;
  /** 신뢰도 (0~1, LLM 추출 시 부여) */
  confidence: number;
  /** 임베딩 (semantic 검색용) */
  embedding?: number[];
  /** 발화 시점 */
  stated_at: string;
  /** 이후 모순으로 갱신/대체된 statement ID */
  superseded_by?: string;
}

// ============================================================
// 3. 모순 감지 결과
// ============================================================

export type ConflictType =
  | 'direct_contradiction'   // 직접 부정 ("좋아해" vs "싫어해")
  | 'decision_reversal'      // 결정 번복 ("헤어진다" vs "만났다")
  | 'mood_change'            // 감정 변화 ("괜찮아" vs "힘들어")
  | 'fact_inconsistency'     // 사실 불일치 ("어제 화냈어" vs "어제 안 만났어")
  | 'judgment_shift'         // 평가 변화 ("좋은 사람" vs "이상한 사람")
  | 'plan_change';           // 계획 변경 ("내일 만나" vs "안 만나기로 함")

export interface DetectedConflict {
  /** 과거 statement */
  previous: Statement;
  /** 현재 statement */
  current: Statement;
  /** 모순 유형 */
  conflict_type: ConflictType;
  /** 며칠 사이 차이 */
  days_apart: number;
  /** 모순 강도 (0~1, 1은 명백한 모순) */
  severity: number;
  /** 자연어 설명 (우뇌 컨텍스트용) */
  description: string;
  /** 우뇌가 자연스럽게 짚을 수 있는 힌트 */
  natural_callout_hint: string;
}

// ============================================================
// 4. ACC 분석 결과 (좌뇌 핸드오프에 추가)
// ============================================================

export interface AccAnalysisResult {
  /** 추출된 statement들 */
  extracted_statements: Statement[];
  /** 감지된 모순들 */
  detected_conflicts: DetectedConflict[];
  /** 우뇌에게 전달할 가이드 */
  conflict_hint?: string;
  /** 분석 메타 */
  meta: {
    extraction_latency_ms: number;
    conflict_check_latency_ms: number;
    statements_compared: number;
  };
}

// ============================================================
// 5. 입력 / Statement 추출 요청
// ============================================================

export interface ExtractionInput {
  user_id: string;
  session_id?: string;
  user_utterance: string;
  /** 컨텍스트 (직전 turns 요약) — 정확도 향상용 */
  context?: string;
}

// ============================================================
// 6. 모순 감지 옵션
// ============================================================

export interface ConflictDetectionOptions {
  /** 과거 statement 검색 기간 (일) */
  lookback_days?: number;
  /** 검색 limit */
  max_previous?: number;
  /** 같은 subject만 비교 */
  same_subject_only?: boolean;
  /** 임베딩 유사도 임계값 (있으면 활용) */
  similarity_threshold?: number;
  /** 너무 오래된 모순은 무시 (일) */
  max_age_days?: number;
}
