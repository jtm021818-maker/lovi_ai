/**
 * 응답 검증 레이어 — v33: 규칙 기반 동기 검증 (0ms)
 *
 * [변경 사유] LLM 호출(~200-500ms)을 제거하고 정규식 기반으로 전환
 * - catch에서 { passed: true } 반환하던 기존 방식 = 검증 실패해도 통과 = 무의미
 * - 규칙 기반이 더 일관적이고 빠르며 비용 0
 *
 * [검증 항목]
 * 1. 진단 금지 위반: "~장애", "~증", "~증후군" 같은 진단명
 * 2. 단정 금지 위반: "확실히", "분명히", "당신은 ~입니다" 같은 단정 발화
 * 3. 톤 부적절: 감정 점수 -4 이하일 때 조언/분석 키워드 포함
 *
 * [동작]
 * - PASS → 원본 응답 전달
 * - FAIL → violations 배열 반환 (호출자가 재생성 결정)
 */

export interface ValidationResult {
  passed: boolean;
  violations: string[];
}

// 진단 라벨 패턴 (한국어 정신건강 진단명)
const DIAGNOSIS_PATTERNS = /(?:우울증|불안장애|공황장애|강박증|조현병|양극성장애|경계성 인격|자폐|ADHD|PTSD|범불안장애|분리불안|적응장애|해리장애|신체화장애|섭식장애|인격장애|편집증|조울증|[가-힣]{2,6}(?:장애|증후군))/g;

// 단정 발화 패턴
const ASSERTION_PATTERNS = /(?:확실히|분명히|틀림없이|반드시|당신은\s+[가-힣]+입니다|넌\s+[가-힣]+야|당신이\s+[가-힣]+한\s+건)/g;

// 감정 점수 -4 이하일 때 부적절한 조언/분석 패턴
const ADVICE_PATTERNS = /(?:해봐|해보세요|시도해\s?보|방법은|이렇게|해결책|조언을|드리자면|~하면\s?돼|제안드|추천드|tip|팁)/gi;

/**
 * 규칙 기반 응답 안전 검증 (동기, 0ms)
 * - LLM 호출 제거 → 프로바이더 RPD 한도 절약
 * - 일관적이고 예측 가능한 검증
 */
export function validateResponseSync(
  response: string,
  emotionScore: number,
): ValidationResult {
  const violations: string[] = [];

  // 1. 진단 금지 위반
  const diagnosisMatch = response.match(DIAGNOSIS_PATTERNS);
  if (diagnosisMatch) {
    violations.push(`DIAGNOSIS_BAN: ${diagnosisMatch.slice(0, 3).join(', ')}`);
  }

  // 2. 단정 금지 위반
  const assertionMatch = response.match(ASSERTION_PATTERNS);
  if (assertionMatch) {
    violations.push(`ASSERTION_BAN: ${assertionMatch.slice(0, 3).join(', ')}`);
  }

  // 3. 톤 체크 — 극도로 부정적인 감정일 때 조언/분석 금지
  if (emotionScore <= -4) {
    const adviceMatch = response.match(ADVICE_PATTERNS);
    if (adviceMatch && adviceMatch.length >= 2) {
      violations.push(`TONE_MISMATCH: ${adviceMatch.slice(0, 3).join(', ')} (감정 ${emotionScore}점에서 조언 부적절)`);
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * 하위 호환용 async wrapper (기존 호출 시그니처 유지)
 * - 기존: await validateResponse(response, score, strategy)
 * - 신규: validateResponseSync(response, score) 직접 사용 권장
 */
export async function validateResponse(
  response: string,
  emotionScore: number,
  _strategy?: string
): Promise<ValidationResult> {
  return validateResponseSync(response, emotionScore);
}
