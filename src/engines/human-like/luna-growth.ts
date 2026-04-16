/**
 * 🆕 v31 Phase 3: Luna Growth — 패턴 인식 + 우리만의 언어 + 캐릭터 깊이
 *
 * 루나가 세션이 쌓일수록 "성장"하는 시스템.
 * - 유저 반복 패턴 감지 → "야 근데 네 그 패턴 또 나왔다?"
 * - 우리만의 언어 → "읽씹남 또 그래?"
 * - 루나의 취약함 → "솔직히 나도 이건 잘 모르겠어"
 *
 * API 호출: 0
 */

// ============================================
// Phase 3-10: 패턴 인식
// ============================================

export interface UserPattern {
  name: string;
  description: string;
  occurrences: number;
  confidence: number;  // 0-1
}

/**
 * 유저 메시지 히스토리에서 반복 패턴 감지 (코드 레벨)
 */
export function detectPatterns(
  allSessionThemes: string[],       // 모든 세션의 주제
  emotionalTriggers: string[],      // 자주 감정적인 주제
  userMessages: string[],           // 이번 세션 메시지들
): UserPattern[] {
  const patterns: UserPattern[] = [];

  // 갈등 회피 패턴 ("괜찮아" 반복)
  const suppressCount = userMessages.filter(m => /괜찮|별거.*아닌|그냥.*됐|뭐/.test(m)).length;
  if (suppressCount >= 3) {
    patterns.push({
      name: '감정 억압',
      description: '"괜찮아"로 자주 덮음',
      occurrences: suppressCount,
      confidence: Math.min(1, suppressCount * 0.2),
    });
  }

  // 같은 주제 반복 (3회+)
  const themeCounts: Record<string, number> = {};
  for (const theme of allSessionThemes) {
    themeCounts[theme] = (themeCounts[theme] ?? 0) + 1;
  }
  for (const [theme, count] of Object.entries(themeCounts)) {
    if (count >= 3) {
      patterns.push({
        name: `${theme} 반복`,
        description: `"${theme}" 주제가 ${count}번 반복`,
        occurrences: count,
        confidence: Math.min(1, count * 0.15),
      });
    }
  }

  // 양보 패턴 ("내가 잘못" "내가 먼저")
  const yieldCount = userMessages.filter(m => /내가.*잘못|내.*탓|먼저.*양보|내가.*참/.test(m)).length;
  if (yieldCount >= 2) {
    patterns.push({
      name: '과도한 양보',
      description: '항상 자기 탓으로 돌림',
      occurrences: yieldCount,
      confidence: Math.min(1, yieldCount * 0.25),
    });
  }

  return patterns;
}

/**
 * 패턴 → 프롬프트 힌트
 */
export function buildPatternPrompt(patterns: UserPattern[]): string {
  const strong = patterns.filter(p => p.confidence >= 0.5);
  if (strong.length === 0) return '';
  const hints = strong.slice(0, 2).map(p => `"${p.name}" (${p.occurrences}회)`);
  return `[감지된 패턴] ${hints.join(', ')} — 적절한 타이밍에 부드럽게 짚어줄 수 있어.`;
}

// ============================================
// Phase 3-11: "우리만의 언어"
// ============================================

export interface SharedTerm {
  term: string;     // "읽씹남"
  meaning: string;  // 유저의 현재 남친
  createdBy: 'user' | 'luna';
}

/**
 * 유저 메시지에서 별명/특수 표현 감지
 */
export function detectSharedLanguage(
  userMessages: string[],
  existing: SharedTerm[],
): SharedTerm[] {
  const terms = [...existing];
  const allText = userMessages.join(' ');

  // 유저가 만든 별명 감지 ("읽씹남", "그놈", "바람둥이" 등)
  const nicknames = allText.match(/[가-힣]{2,4}(?:남|녀|놈|이|씨|쟁이)/g) ?? [];
  for (const nick of nicknames) {
    if (!terms.find(t => t.term === nick) && !/남친|여친|남편|와이프/.test(nick)) {
      terms.push({ term: nick, meaning: '유저가 부르는 별명', createdBy: 'user' });
    }
  }

  // 유저가 비유적 표현 사용 ("전쟁", "지옥", "드라마" 등)
  const metaphors = allText.match(/연애.*(?:전쟁|지옥|드라마|롤러코스터|시즌)/g) ?? [];
  for (const met of metaphors) {
    if (!terms.find(t => t.term === met)) {
      terms.push({ term: met.slice(0, 10), meaning: '유저의 비유 표현', createdBy: 'user' });
    }
  }

  return terms.slice(0, 5); // 최대 5개
}

/**
 * 우리만의 언어 → 프롬프트 힌트
 */
export function buildSharedLanguagePrompt(terms: SharedTerm[]): string {
  if (!terms || terms.length === 0) return '';
  const list = terms
    .filter(t => t && t.term)
    .map(t => `"${t.term}"=${t.meaning || '의미 미지정'}`)
    .join(', ');
  if (!list) return '';
  return `[우리만의 표현] ${list} — 자연스럽게 써도 돼.`;
}

// ============================================
// Phase 3-12: 연속 친밀도 (0-100)
// ============================================

/**
 * 친밀도 점수 → 행동 가이드 (연속 스펙트럼)
 */
export function getIntimacyBehavior(score: number): string {
  if (score >= 70) return '[친밀도 높음] 완전 편한 사이. 농담, 놀리기, 솔직한 의견 OK. "ㅋㅋ 또?" "야 진짜" 느낌.';
  if (score >= 45) return '[친밀도 중간] 꽤 편해진 사이. 약간의 장난, 솔직함 OK. 하지만 선 넘지 마.';
  if (score >= 20) return '[친밀도 낮음] 아직 알아가는 중. 따뜻하지만 조심스럽게.';
  return ''; // 처음이면 기본 페르소나대로
}

// ============================================
// Phase 3-13: 루나 캐릭터 깊이 (취약함, 실수)
// ============================================

/**
 * 루나가 "완벽한 공감 로봇"이 아닌 "사람"으로 느껴지게 하는 힌트
 * 확률적으로 주입 — 매번 하면 역효과
 */
export function getLunaVulnerabilityHint(
  turnInSession: number,
  intimacyScore: number,
): string | null {
  // 세션 초반엔 안 함
  if (turnInSession < 4) return null;
  // 친밀도 낮으면 안 함
  if (intimacyScore < 25) return null;

  const roll = Math.random();

  // 8% 확률: 루나도 비슷한 경험
  if (roll < 0.08) {
    return '[루나 취약함] 이번 턴에서 루나도 비슷한 경험이 있다고 짧게(1문장) 언급해. "나도 비슷한 적 있거든..." 느낌. 길게 X.';
  }

  // 5% 확률: 루나도 확신 없음
  if (roll < 0.13) {
    return '[루나 취약함] "솔직히 나도 이건 잘 모르겠어" 느낌을 짧게 표현해. 완벽한 척 하지 마.';
  }

  // 3% 확률: 루나가 감정적
  if (roll < 0.16) {
    return '[루나 감정] 이번 턴에서 루나 자신의 감정을 짧게 표현. "아 나도 좀 마음이 아프다" 느낌.';
  }

  return null;
}
