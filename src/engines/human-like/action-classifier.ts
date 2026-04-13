/**
 * 🆕 루나 행동 분류기 (Action Classifier)
 *
 * 루나의 응답을 분석하여 행동 유형을 분류한다.
 * 용도:
 *   1. AI에게 "직전에 뭘 했는지" 정확히 알려줌 (자기 인식)
 *   2. 연속 패턴 감지 → 경고 힌트 생성 (가드레일)
 *   3. turnArc에 정확한 turnType 전달 (EMPATHY 하드코딩 대체)
 *
 * 철학: 코드가 "뭘 해라"고 지시하지 않음.
 *        코드는 "네가 뭘 했는지" 알려주고, AI가 자각해서 변화.
 */

// ============================================
// 행동 유형 정의
// ============================================

export type LunaActionType =
  | 'empathy'         // 공감/감정 반영 ("속상했겠다", "힘들지")
  | 'question'        // 질문으로 끝남 ("그래서 어떻게 됐어?")
  | 'opinion'         // 의견 제시 ("야 근데 나는 그건 좀 아닌 것 같아")
  | 'side_take'       // 편들기 ("걔가 잘못한 거지 이건")
  | 'experience'      // 경험 한 줄 ("나도 비슷한 거 있었는데")
  | 'relief'          // 릴리프/농담 ("야 근데 밥은 먹었어?")
  | 'reaction_only'   // 맞장구/짧은 리액션만 ("헐" "진짜?" "대박")
  | 'normalization'   // 보편화 ("누구라도 그러지")
  | 'thinking_aloud'  // 생각 흘리기 ("근데... 이거 왜 이런 건지...")
  | 'meta_comment'    // 메타 코멘트 ("야 우리 얘기 깊어지는데 ㅋㅋ")
  ;

// ============================================
// 행동 유형 한글 라벨
// ============================================

const ACTION_LABELS: Record<LunaActionType, string> = {
  empathy: '공감',
  question: '질문',
  opinion: '의견',
  side_take: '편들기',
  experience: '경험공유',
  relief: '릴리프',
  reaction_only: '맞장구',
  normalization: '보편화',
  thinking_aloud: '생각흘리기',
  meta_comment: '메타코멘트',
};

// ============================================
// TurnType 호환 매핑 (buildArcPrompt용)
// ============================================

const ACTION_TO_TURN_TYPE: Record<LunaActionType, string> = {
  empathy: 'EMPATHY',
  question: 'GENTLE_QUESTION',
  opinion: 'REFLECT',
  side_take: 'SIDE_TAKE',
  experience: 'EMPATHY',
  relief: 'REACTION',
  reaction_only: 'REACTION',
  normalization: 'EMPATHY',
  thinking_aloud: 'REFLECT',
  meta_comment: 'REACTION',
};

// ============================================
// 행동 분류 — 응답 텍스트로부터 유형 판별
// ============================================

/**
 * 루나의 응답 텍스트를 분석하여 행동 유형을 분류한다.
 * 우선순위: 가장 구체적인 유형부터 체크.
 */
export function classifyLunaAction(response: string): LunaActionType {
  const text = response.replace(/\[.*?\]/g, '').trim(); // 태그 제거
  const bubbles = text.split('|||').map(b => b.trim()).filter(Boolean);
  const lastBubble = bubbles[bubbles.length - 1] ?? '';
  const fullText = bubbles.join(' ');

  // 1. 질문으로 끝나는지 (가장 중요 — 질문봇 감지)
  if (/\?|[야냐지거든까래]?\s*$/.test(lastBubble) && /어떻게|뭐가|왜|어때|있어\?|거야\?|줄래\?|해봐\?|싶어\?|같아\?/.test(lastBubble)) {
    return 'question';
  }

  // 2. 메타 코멘트
  if (/우리 얘기|깊어지|중요한 거|많이 해서|이거 중요한데/.test(fullText)) {
    return 'meta_comment';
  }

  // 3. 릴리프/농담
  if (/밥은 먹|자야 되|자야되|배터리|파이널 보스|한 대 때려|때려줄까|ㅋㅋㅋ/.test(fullText) && fullText.length < 150) {
    return 'relief';
  }

  // 4. 경험 공유
  if (/나도 비슷|나도 그때|나도 그랬|내가 그때|나도 알아 그|나도 겪/.test(fullText)) {
    return 'experience';
  }

  // 5. 의견 제시
  if (/솔직히|나는 이거|내 생각|내가 보기|근데 있잖아|아닌 것 같|좀 그런 거 아|내가 느끼기엔/.test(fullText)) {
    return 'opinion';
  }

  // 6. 편들기
  if (/걔가 잘못|너무하[다네]|걔 진짜|걔가 좀|때려줄까|걔 미쳤|그건 걔가|확실히 걔/.test(fullText)) {
    return 'side_take';
  }

  // 7. 보편화
  if (/누구라도|다 그래|너만 그런|당연한 거|아무나|보통 그래/.test(fullText)) {
    return 'normalization';
  }

  // 8. 생각 흘리기
  if (/근데\.\.\.|왜 이런 건지|잠깐만.*생각|음\.\.\.|아\.\.\.\s|이거 왜/.test(fullText)) {
    return 'thinking_aloud';
  }

  // 9. 맞장구/짧은 리액션 (전체 응답이 짧을 때)
  if (fullText.length < 40) {
    return 'reaction_only';
  }

  // 10. 기본: 공감
  return 'empathy';
}

// ============================================
// 패턴 힌트 생성 — AI 자기 인식 맥락
// ============================================

/**
 * 최근 행동 유형을 기반으로 AI에게 전달할 패턴 인식 맥락을 생성한다.
 *
 * 두 가지 수준:
 * - [참고] 수준: 패턴 알림만 (AI 자율 판단)
 * - [⚠️] 수준: 3턴 연속 동일 시 강제 경고 (유일한 가드레일)
 */
export function buildActionPatternHint(recentTypes: LunaActionType[]): string | null {
  if (recentTypes.length < 2) return null;

  const last3 = recentTypes.slice(-3);
  const last2 = recentTypes.slice(-2);
  const hints: string[] = [];

  // === 가드레일: 3턴 연속 동일 행동 === (유일한 강제)
  if (last3.length >= 3 && last3.every(t => t === last3[0])) {
    const label = ACTION_LABELS[last3[0]] ?? last3[0];
    hints.push(`⚠️ ${label} 3턴 연속! 이번 턴은 반드시 다른 반응을 해. 공감/의견/편들기/릴리프/경험/맞장구 등 아무거나.`);
    return `[자기 인식 — 필수]\n${hints.join('\n')}`;
  }

  // === 참고 수준: 2턴 연속 동일 ===
  if (last2.length >= 2 && last2[0] === last2[1]) {
    const label = ACTION_LABELS[last2[0]] ?? last2[0];
    hints.push(`${label}이 2턴 연속이야. 이번엔 다른 것도 생각해봐.`);
  }

  // 공감 연속 특별 경고
  const empathyCount = last3.filter(t => t === 'empathy').length;
  if (empathyCount >= 2 && !hints.length) {
    hints.push('공감 위주로 왔어. 이번엔 의견/편들기/릴리프/경험 중 하나가 자연스러울 수 있어.');
  }

  // 질문 연속 특별 경고
  const questionCount = last3.filter(t => t === 'question').length;
  if (questionCount >= 2) {
    hints.push('질문이 반복됐어. 이번엔 질문 없이 리액션이나 의견만.');
  }

  if (hints.length === 0) return null;
  return `[자기 인식 — 참고]\n${hints.join('\n')}`;
}

// ============================================
// 행동 유형 → 맥락 포맷팅
// ============================================

/**
 * 최근 행동 유형을 AI에게 전달할 포맷으로 변환.
 * "내용 요약" 대신 "행동 유형"을 명시적으로 보여줌.
 */
export function formatRecentActions(
  recentTypes: LunaActionType[],
  recentSummaries: string[],
): string {
  if (recentTypes.length === 0) return '';

  const lines = recentTypes.map((type, i) => {
    const label = ACTION_LABELS[type] ?? type;
    const summary = recentSummaries[recentSummaries.length - recentTypes.length + i] ?? '';
    const turnAgo = recentTypes.length - i;
    return `- ${turnAgo}턴 전: ${label} (${summary})`;
  });

  return `[루나의 최근 행동 패턴]\n${lines.join('\n')}`;
}

// ============================================
// TurnType 변환 (buildArcPrompt 호환)
// ============================================

/**
 * LunaActionType → TurnType 문자열 변환.
 * index.ts의 turnType 'EMPATHY' 하드코딩을 대체.
 */
export function actionToTurnType(action: LunaActionType): string {
  return ACTION_TO_TURN_TYPE[action] ?? 'EMPATHY';
}
