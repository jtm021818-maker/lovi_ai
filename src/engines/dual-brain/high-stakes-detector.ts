/**
 * 🚨 고위험 신호 감지기 (이중뇌 안전망 #2)
 *
 * Gemini 분석이 시작되기 전에 유저 원문을 regex로 스캔.
 * 감지되면 복잡도를 강제로 5로 승격 → Claude 강제 호출.
 *
 * 이유: Gemini가 사르카즘/배신/위기를 오판하면
 *       Claude가 "고급진 헛소리"를 만들어낼 위험이 있음.
 */

export type HighStakesType =
  | 'crisis'        // 자살/자해/극단적 위기
  | 'betrayal'      // 배신/바람/양다리
  | 'rage'          // 극도의 분노/욕설
  | 'selfblame'     // 자책/자기혐오
  | 'sarcasm'       // 반어법/비꼼 (오해하기 쉬움)
  | 'ambivalence'   // 양가감정 (기쁨+슬픔 등 섞임)
  | null;

export interface HighStakesResult {
  type: HighStakesType;
  matched: string[];   // 매칭된 키워드 (디버깅용)
  confidence: 'high' | 'medium';
}

/** 위기 신호 — 가장 높은 우선순위. 감지되면 반드시 Claude + 안전 모드 */
const CRISIS_PATTERNS = [
  /죽고\s*싶/,
  /자살/,
  /자해/,
  /없어지[고싶]/,
  /끝내버리[고싶]/,
  /살기\s*싫/,
  /사라지[고싶]/,
  /더는\s*못\s*살/,
];

/** 배신 신호 — 유저가 원하는 건 "같이 분노"지 "위로"가 아님 */
const BETRAYAL_PATTERNS = [
  /바람\s*폈?/,
  /바람\s*피/,
  /양다리/,
  /몰래\s*만/,
  /다른\s*(여자|남자|사람)/,
  /배신/,
  /숨기고\s*있/,
  /거짓말/,
  /속였/,
  /뒤통수/,
];

/** 극도의 분노 — 같은 분노로 공명해야 함 */
const RAGE_PATTERNS = [
  /존나/,
  /시발/,
  /씨발/,
  /개새[끼기]/,
  /좆/,
  /미친놈/,
  /미친년/,
  /죽여버리/,
  /패버리/,
  /쌍년/,
  /새끼/,
];

/** 자책 — "괜찮아"가 아니라 "아니야 네 잘못 아냐" 필요 */
const SELFBLAME_PATTERNS = [
  /내\s*탓/,
  /내가\s*잘못/,
  /내가\s*문제/,
  /나\s*때문에/,
  /내\s*잘못/,
  /나\s*진짜\s*(병신|바보|멍청)/,
  /나는\s*왜\s*이러/,
  /내가\s*못\s*나서/,
];

/** 사르카즘/반어법 — Gemini가 가장 많이 오판하는 영역 */
const SARCASM_PATTERNS = [
  /ㅋㅋㅋ+\s*(진짜|개|존나|어이없|대단|웃기)/,
  /ㅎㅎ+\s*(그래|대단|진짜)/,
  /아\s*ㅋ/,
  /어이\s*없/,
  /진짜\s*ㅋ/,
  /웃기네/,
  /참\s*(대단|웃기)/,
];

/** 양가감정 — 두 감정이 충돌. Claude 판단 필요 */
const AMBIVALENCE_PATTERNS = [
  /좋[으은으]면서도\s*(싫|괴|힘)/,
  /행복하[면서긴]+\s*(슬|외|공허)/,
  /사랑하[면는]+\s*(미|싫)/,
  /그리[우운웠]+\s*(밉|싫)/,
  /보고싶[은으]면서도/,
  /모르겠[어다고]/,   // "내 마음을 모르겠어" 류
];

/**
 * 유저 원문을 스캔해서 고위험 신호 반환.
 * 위험도 우선순위: crisis > betrayal > rage > selfblame > sarcasm > ambivalence
 */
export function detectHighStakes(userInput: string): HighStakesResult {
  const input = userInput.trim();
  if (!input) return { type: null, matched: [], confidence: 'high' };

  // 1. 위기 (최우선)
  const crisisMatches = CRISIS_PATTERNS
    .map(p => input.match(p)?.[0])
    .filter(Boolean) as string[];
  if (crisisMatches.length > 0) {
    return { type: 'crisis', matched: crisisMatches, confidence: 'high' };
  }

  // 2. 배신
  const betrayalMatches = BETRAYAL_PATTERNS
    .map(p => input.match(p)?.[0])
    .filter(Boolean) as string[];
  if (betrayalMatches.length > 0) {
    return { type: 'betrayal', matched: betrayalMatches, confidence: 'high' };
  }

  // 3. 극도 분노
  const rageMatches = RAGE_PATTERNS
    .map(p => input.match(p)?.[0])
    .filter(Boolean) as string[];
  if (rageMatches.length > 0) {
    return { type: 'rage', matched: rageMatches, confidence: 'high' };
  }

  // 4. 자책
  const selfblameMatches = SELFBLAME_PATTERNS
    .map(p => input.match(p)?.[0])
    .filter(Boolean) as string[];
  if (selfblameMatches.length > 0) {
    return { type: 'selfblame', matched: selfblameMatches, confidence: 'medium' };
  }

  // 5. 사르카즘
  const sarcasmMatches = SARCASM_PATTERNS
    .map(p => input.match(p)?.[0])
    .filter(Boolean) as string[];
  if (sarcasmMatches.length > 0) {
    return { type: 'sarcasm', matched: sarcasmMatches, confidence: 'medium' };
  }

  // 6. 양가감정
  const ambivalenceMatches = AMBIVALENCE_PATTERNS
    .map(p => input.match(p)?.[0])
    .filter(Boolean) as string[];
  if (ambivalenceMatches.length > 0) {
    return { type: 'ambivalence', matched: ambivalenceMatches, confidence: 'medium' };
  }

  return { type: null, matched: [], confidence: 'high' };
}

/** 고위험 타입별 Claude에게 전달할 힌트 메시지 */
export function getStakeHint(type: HighStakesType): string {
  switch (type) {
    case 'crisis':
      return '⚠️ 위기 신호 감지: 안전 최우선. 전문 상담 번호(1393) 안내 가능. 편들기보다 걱정 중심.';
    case 'betrayal':
      return '⚠️ 배신 상황: 유저는 "위로"보다 "같이 분노"를 원함. 편들어주되 욕설은 피하기.';
    case 'rage':
      return '⚠️ 극도의 분노: 같은 톤으로 공명. "야 진짜 너무한데" 식으로.';
    case 'selfblame':
      return '⚠️ 자책 모드: "괜찮아"가 아니라 "아니야 네 잘못 아냐"가 필요.';
    case 'sarcasm':
      return '⚠️ 사르카즘 가능성: 유저가 반어법/비꼼일 수 있음. 액면 그대로 해석 금지.';
    case 'ambivalence':
      return '⚠️ 양가감정: 두 감정 모두 인정. 한쪽만 편들면 안 됨.';
    default:
      return '';
  }
}
