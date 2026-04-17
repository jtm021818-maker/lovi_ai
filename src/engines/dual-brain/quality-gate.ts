/**
 * ✅ 품질 게이트 — 응답 자동 검증
 *
 * Gemini 또는 Claude의 출력을 받아서:
 * - 필수 요소가 있는가
 * - 금지어가 없는가
 * - 길이/포맷이 맞는가
 * - 폴백이 필요한가
 *
 * 실패 시 더 비싼 모델로 강제 재시도.
 */

import type { QualityCheckResult } from './types';

/** 응답에 절대 들어가면 안 되는 문구 (상담사 말투, 분석 보고 문체 등) */
const FORBIDDEN_PHRASES = [
  /하셨군요/,
  /하셨겠어요/,
  /느끼시는\s*건/,
  /충분히\s*그러/,
  /구체적으로\s*말/,
  /어떤\s*감정이\s*드/,
  /인지\s*왜곡/,
  /투사하/,
  /방어기제/,
  /감정\s*조절/,
  /라고\s*분석/,
  /로\s*판단됩니/,
  /상담\s*센터/,
];

/** 응답에 자주 나오는 AI 클리셰 (루나스럽지 않음) */
const AI_CLICHE_PATTERNS = [
  /언제든\s*편하게/,
  /도움이\s*되었으면/,
  /함께\s*이야기/,
  /더\s*자세히\s*알려/,
];

interface ValidationParams {
  /** 검증할 응답 텍스트 (말풍선만, 태그는 따로) */
  text: string;

  /** 어디서 온 응답인지 */
  source: 'gemini_only' | 'claude_rephrase';

  /** 단순 턴 여부 (단순 턴은 기준 완화) */
  isSimpleTurn: boolean;
}

/**
 * 응답 검증.
 * - passed: false 면 반드시 폴백
 * - shouldFallback: true 면 더 비싼 모델로 재시도
 */
export function validateResponse(params: ValidationParams): QualityCheckResult {
  const { text, source, isSimpleTurn } = params;
  const issues: string[] = [];
  const trimmed = text.trim();

  // 1. 비어있음
  if (!trimmed) {
    return {
      passed: false,
      issues: ['빈 응답'],
      shouldFallback: true,
    };
  }

  // 2. 너무 짧음 (한마디 응답은 OK, 그 외엔 의심)
  if (!isSimpleTurn && trimmed.length < 5) {
    issues.push(`너무 짧음 (${trimmed.length}자)`);
  }

  // 3. 너무 김 (300자 초과 → 카톡스럽지 않음)
  if (trimmed.length > 300) {
    issues.push(`너무 김 (${trimmed.length}자)`);
  }

  // 4. ||| 구분자 — 한마디 응답이면 없어도 OK
  const hasDelimiter = trimmed.includes('|||');
  if (!isSimpleTurn && !hasDelimiter && trimmed.length > 30) {
    issues.push('말풍선 구분자(|||) 누락');
  }

  // 5. 금지어 검사 (상담사 말투)
  const forbiddenHits: string[] = [];
  for (const pattern of FORBIDDEN_PHRASES) {
    const match = trimmed.match(pattern);
    if (match) forbiddenHits.push(match[0]);
  }
  if (forbiddenHits.length > 0) {
    issues.push(`상담사 말투: ${forbiddenHits.join(', ')}`);
  }

  // 6. AI 클리셰
  const clicheHits: string[] = [];
  for (const pattern of AI_CLICHE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) clicheHits.push(match[0]);
  }
  if (clicheHits.length > 0) {
    issues.push(`AI 클리셰: ${clicheHits.join(', ')}`);
  }

  // 7. 존댓말 과다 (~습니다 형 어미 3회 이상)
  const formalEndings = trimmed.match(/습니다|십니다|세요/g);
  if (formalEndings && formalEndings.length >= 2) {
    issues.push(`존댓말 과다 (${formalEndings.length}회)`);
  }

  // 8. JSON 누출 (Gemini가 JSON 형태 그대로 뱉은 경우)
  if (/^\s*[{[]/.test(trimmed) || /^"[a-z_]+":\s*"/.test(trimmed)) {
    return {
      passed: false,
      issues: ['JSON 응답 누출 — 파싱 실패'],
      shouldFallback: true,
    };
  }

  // 9. 메타 발화 ("저는", "AI로서", "도와드릴게요" 등)
  if (/저는\s*(AI|인공지능|어시스턴트)/.test(trimmed)) {
    return {
      passed: false,
      issues: ['AI 메타 발화 — 페르소나 깨짐'],
      shouldFallback: true,
    };
  }

  // 결과 결정
  // - 치명적 (금지어/JSON누출/메타발화) → 폴백
  // - 경미 (너무 짧음/구분자 누락) → 통과하되 경고
  const fatalIssue =
    forbiddenHits.length > 0 ||
    issues.some((i) => i.includes('JSON') || i.includes('메타'));

  // Gemini-only가 실패하면 무조건 Claude 재시도
  // Claude도 실패하면 그냥 통과 (더 이상 폴백 안 함)
  const shouldFallback = fatalIssue && source === 'gemini_only';

  return {
    passed: issues.length === 0 || !fatalIssue,
    issues,
    shouldFallback,
  };
}

/**
 * 두 응답을 비교 (모니터링/A/B 테스트용)
 * Gemini 응답과 Claude 응답이 의미적으로 비슷한지 체크
 */
export function compareResponseSimilarity(
  geminiText: string,
  claudeText: string,
): { similar: boolean; reason: string } {
  // 길이 차이가 너무 크면 다른 응답
  const lenRatio =
    Math.min(geminiText.length, claudeText.length) /
    Math.max(geminiText.length, claudeText.length);
  if (lenRatio < 0.3) {
    return { similar: false, reason: `길이 차이 큼 (비율 ${lenRatio.toFixed(2)})` };
  }

  // 첫 단어/감탄사 비교
  const firstWordG = geminiText.match(/^[가-힣ㄱ-ㅎ]+/)?.[0] ?? '';
  const firstWordC = claudeText.match(/^[가-힣ㄱ-ㅎ]+/)?.[0] ?? '';
  if (firstWordG && firstWordC && firstWordG !== firstWordC) {
    // 감정 톤이 다를 수 있음 — 경고만
    return {
      similar: false,
      reason: `시작어 다름: "${firstWordG}" vs "${firstWordC}"`,
    };
  }

  return { similar: true, reason: 'OK' };
}
