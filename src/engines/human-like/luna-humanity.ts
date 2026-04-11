/**
 * 🆕 v31 Phase 2: Luna Humanity — 감정 불확실성 + 솔직함 + 마음 추론
 *
 * 루나를 "완벽한 공감 로봇"이 아닌 "진짜 사람"으로 만드는 모듈.
 * - 감정 해석이 확실하지 않을 때 → "슬픈 거야 화난 거야?"
 * - 패턴 반복 감지 → "나 솔직히 말해도 돼?"
 * - 유저가 말 안 한 것 추론 → "근데 사실 좀 후회도 되지 않아?"
 *
 * API 호출: 0 (프롬프트 힌트 주입)
 */

// ACE: luna-decision 의존성 제거 — LunaDecision 타입을 인라인으로 정의
type LunaDecision = string;

// ============================================
// 감정 해석 불확실성 (Phase 2-6)
// ============================================

/**
 * 감정이 애매할 때 루나가 확정하지 않고 물어보는 힌트
 */
export function getEmotionUncertaintyHint(
  emotionScore: number,
  userMessage: string,
): string | null {
  // 감정 점수가 애매한 영역 (-2 ~ +1)
  const isAmbiguous = emotionScore >= -2 && emotionScore <= 1;

  // 유저가 모호하게 표현 ("힘들어" "모르겠어" "그냥")
  const isVague = /힘들|모르겠|그냥|좀|뭔가|약간/.test(userMessage);

  // 복합 감정 신호 (화남+슬픔 동시)
  const hasConflict = /화[가나].*슬[퍼프]|슬[퍼프].*화[가나]|모르겠.*뭔지|복잡/.test(userMessage);

  if (hasConflict) {
    return '[감정 불확실] 유저 감정이 복잡해 보여. "화가 나는 건지 슬픈 건지... 아님 둘 다?" 느낌으로 물어봐. 확정하지 마.';
  }
  if (isAmbiguous && isVague) {
    return '[감정 불확실] 감정이 애매해. "지금 어떤 느낌이야? 좀 더 말해줘" 느낌으로. 네가 먼저 이름 붙이지 마.';
  }
  return null;
}

// ============================================
// "솔직히 말해도 돼?" 시스템 (Phase 2-7)
// ============================================

interface HonestyContext {
  repeatedPatternCount: number;  // 같은 패턴 반복 횟수
  intimacyScore: number;
  turnInSession: number;
  recentDecisions: LunaDecision[];
}

/**
 * 루나가 솔직한 의견을 말해야 할 때 판단
 * 허락을 구하는 것 자체가 유저에게 자율성을 줌
 */
export function shouldBeHonest(ctx: HonestyContext): { should: boolean; hint: string } | null {
  // 패턴 반복 3회+ && 친밀도 30+
  if (ctx.repeatedPatternCount >= 3 && ctx.intimacyScore >= 30) {
    return {
      should: true,
      hint: '[솔직함] 비슷한 상황이 반복되고 있어. "나 근데... 솔직하게 말해도 돼?|||매번 비슷한 것 같아서" 느낌으로 허락 구하고 의견 줘.',
    };
  }

  // 최근 5턴 모두 EMPATHIZE → 공감만 하다간 도움 안 됨
  if (ctx.recentDecisions.length >= 5 && ctx.recentDecisions.every(d => d === 'EMPATHIZE')) {
    return {
      should: true,
      hint: '[솔직함] 공감만 계속했어. "나 한 가지 말해도 돼?" 느낌으로 관점 전환 시도.',
    };
  }

  // 세션 후반 (8턴+) + 아직 진전 없음
  if (ctx.turnInSession >= 8 && ctx.intimacyScore >= 40) {
    return {
      should: true,
      hint: '[솔직함] 대화가 꽤 됐는데 같은 자리야. 부드럽게 "근데 있잖아..." 하고 다른 시각 제시.',
    };
  }

  return null;
}

// ============================================
// Theory of Mind — 유저 마음 추론 (Phase 2-8)
// ============================================

interface MindModelContext {
  userMessage: string;
  sessionStoryTheme: string | null;
  recentUserMessages: string[];
  formulationFears: string;
  formulationWants: string;
}

/**
 * 유저가 말하지 않은 것을 추론하여 프롬프트 힌트 생성
 * "유저가 '편하다'고 했지만 전체 맥락에서 그건 아닌 것 같음"
 */
export function inferUnspoken(ctx: MindModelContext): string | null {
  const msg = ctx.userMessage;

  // "괜찮아" / "편해" 뒤에 숨은 감정
  if (/괜찮|편[하해]|별거.*아닌|그냥|뭐/.test(msg) && ctx.formulationFears) {
    return `[마음 추론] 유저가 "${msg.slice(0, 10)}..."라고 했지만, 이전 맥락에서 "${ctx.formulationFears}" 두려움이 있었어. "진짜 괜찮아?" 또는 "음... 솔직히 좀 복잡하지 않아?" 느낌으로 한 겹 더 들어가봐.`;
  }

  // 갑자기 주제 바꿈 → 회피 신호
  if (ctx.recentUserMessages.length >= 2) {
    const prev = ctx.recentUserMessages[ctx.recentUserMessages.length - 2];
    const prevHadEmotion = /힘[들드]|슬[퍼프]|화[가나]|무서|불안/.test(prev);
    const currentAvoids = /그건.*그렇고|다른.*얘기|아 근데|ㅋㅋ/.test(msg) && !(/힘|슬|화|무서/).test(msg);
    if (prevHadEmotion && currentAvoids) {
      return '[마음 추론] 유저가 방금 감정적인 얘기하다가 갑자기 주제를 바꿨어. 회피일 수 있어. "아 잠깐, 아까 그 얘기..." 느낌으로 부드럽게 돌아가봐.';
    }
  }

  // "어떡해" = 도움 요청이지만 실제로는 공감이 필요할 수도
  if (/어떡|어떻게/.test(msg) && ctx.formulationWants) {
    return `[마음 추론] "어떡해"라고 했지만, 아직 해결책보다 "${ctx.formulationWants}"이 더 필요할 수 있어. 바로 조언하지 말고 "지금 뭐가 제일 필요해?" 느낌으로 확인.`;
  }

  return null;
}
