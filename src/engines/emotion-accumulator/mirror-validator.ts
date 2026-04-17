/**
 * 🆕 v61: 루나극장 사실 보존 검증
 *
 * LLM 이 facts 추출 → 씬 생성 후, 씬 대사에 facts 의 핵심 키워드가
 * 실제로 녹아들었는지 코드 레벨 검증.
 *
 * 실패하면 generator 가 1회 재시도 프롬프트에 실패 이유 붙여서 재호출.
 */

export interface TheaterFacts {
  who_user?: string | null;
  who_partner?: string | null;
  what_happened?: string | null;
  when?: string | null;
  where?: string | null;
  partner_last_words?: string | null;
  user_last_words_or_action?: string | null;
  emotional_subtext?: string | null;
}

export interface TheaterCharacterSetup {
  mode: 'duo' | 'solo';
  userGender?: 'male' | 'female';
  partnerGender?: 'male' | 'female';
  userLabel?: string;
  partnerLabel?: string;
}

export interface TheaterValidationInput {
  facts: TheaterFacts | null | undefined;
  characterSetup: TheaterCharacterSetup | null | undefined;
  sceneLines: string[];
}

export interface TheaterValidationResult {
  ok: boolean;
  reasons: string[];
}

// 한국어 조사/어미 및 일반어 노이즈 제거
const NOISE_PARTICLES = [
  '을', '를', '이', '가', '은', '는', '에', '에서', '한테', '에게',
  '의', '와', '과', '도', '만', '까지', '부터',
  '좀', '그냥', '진짜', '너무', '막', '아', '어', '음',
];

const STOP_WORDS = new Set([
  '있다', '없다', '하다', '되다', '그렇다', '이렇다',
  '사람', '상황', '문제', '그것', '이것',
]);

/**
 * 문장에서 핵심 명사/동사 토큰 추출 (2글자 이상, stop-word 제외)
 */
function extractKeyTokens(text: string | null | undefined): string[] {
  if (!text) return [];
  // 조사/어미 제거
  let cleaned = text.toLowerCase().trim();
  for (const p of NOISE_PARTICLES) {
    cleaned = cleaned.split(p).join(' ');
  }
  // 특수문자 → 공백
  cleaned = cleaned.replace(/[^\w가-힣]+/g, ' ');
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  return tokens.filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

/**
 * 토큰 중 하나라도 씬 텍스트에 포함되는지
 * (LLM 이 "밥" → "식사" 로 약간 바꿔도 통과 시키려고 loose 매칭)
 */
function anyTokenPresent(tokens: string[], haystack: string): boolean {
  if (tokens.length === 0) return true; // 원문 자체가 비어있으면 검증 스킵
  const lowHay = haystack.toLowerCase();
  return tokens.some((t) => lowHay.includes(t));
}

/**
 * 극장 출력의 사실 보존 검증
 */
export function validateTheaterFacts(input: TheaterValidationInput): TheaterValidationResult {
  const reasons: string[] = [];
  const { facts, characterSetup, sceneLines } = input;

  if (!Array.isArray(sceneLines) || sceneLines.length < 3) {
    reasons.push('sceneLines가 3줄 미만');
    return { ok: false, reasons };
  }

  const allText = sceneLines.join(' ');

  // 1. partner_last_words 키워드 검증 (duo 일 때만)
  if (characterSetup?.mode === 'duo' && facts?.partner_last_words) {
    const tokens = extractKeyTokens(facts.partner_last_words);
    if (!anyTokenPresent(tokens, allText)) {
      reasons.push(`partner_last_words("${facts.partner_last_words}") 키워드가 씬 대사에 없음`);
    }
  }

  // 2. user_last_words_or_action 키워드 검증
  if (facts?.user_last_words_or_action) {
    const tokens = extractKeyTokens(facts.user_last_words_or_action);
    if (!anyTokenPresent(tokens, allText)) {
      reasons.push(`user_last_words_or_action("${facts.user_last_words_or_action}") 키워드가 씬 대사에 없음`);
    }
  }

  // 3. what_happened 핵심 명사 검증 (loose)
  if (facts?.what_happened) {
    const tokens = extractKeyTokens(facts.what_happened);
    // what_happened 는 토큰이 많아서 그중 하나만 있어도 OK
    if (tokens.length > 0 && !anyTokenPresent(tokens, allText)) {
      reasons.push(`what_happened("${facts.what_happened}") 핵심 명사가 씬 대사에 없음`);
    }
  }

  // 4. 라벨 일관성
  const userLabel = characterSetup?.userLabel;
  const partnerLabel = characterSetup?.partnerLabel;
  const expectedLabels = new Set<string>([userLabel, partnerLabel].filter(Boolean) as string[]);

  if (expectedLabels.size > 0) {
    const foundLabels = sceneLines
      .map((line) => line.match(/^\[([^\]]+)\]/)?.[1]?.trim())
      .filter(Boolean) as string[];

    const unexpectedLabels = foundLabels.filter((l) => !expectedLabels.has(l));
    if (unexpectedLabels.length > 0) {
      reasons.push(`예상치 못한 라벨 등장: ${Array.from(new Set(unexpectedLabels)).join(', ')} (기대: ${Array.from(expectedLabels).join(', ')})`);
    }

    // solo 모드인데 partnerLabel 이 등장하면 안 됨
    if (characterSetup?.mode === 'solo' && partnerLabel && foundLabels.includes(partnerLabel)) {
      reasons.push(`solo 모드인데 partnerLabel(${partnerLabel}) 이 등장`);
    }

    // duo 모드인데 userLabel 만 나오면 solo 아니냐
    if (characterSetup?.mode === 'duo' && userLabel && partnerLabel) {
      const hasUser = foundLabels.includes(userLabel);
      const hasPartner = foundLabels.includes(partnerLabel);
      if (!(hasUser && hasPartner)) {
        reasons.push(`duo 모드인데 두 라벨 모두 등장 안 함 (user=${hasUser}, partner=${hasPartner})`);
      }
    }
  }

  return { ok: reasons.length === 0, reasons };
}
