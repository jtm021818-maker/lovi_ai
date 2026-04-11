/**
 * 🆕 v41: 친밀도 트리거 감지 — 대화에서 자동 감지
 *
 * LLM 추가 호출 없이 순수 휴리스틱으로 감지.
 * 1세션 1유형 원칙 → Set으로 중복 제거.
 *
 * 사용처:
 *   - pipeline/index.ts: 매 턴 detectTriggers() 호출
 *   - complete/route.ts: 세션 완료 시 detectSessionTriggers() 호출
 */

import type { IntimacyTriggerType, IntimacyState } from './types';

// ============================================================
// 1. 감정 표현 감지
// ============================================================
const EMOTION_REGEX = /ㅠ{2,}|ㅜ{2,}|힘[들드]|속상|화[가나]|슬[퍼프]|답답|불안|무섭|외롭|서운|미치|죽겠|싫[어다]|아파/;

export function detectEmotionShare(msg: string): boolean {
  return EMOTION_REGEX.test(msg);
}

// ============================================================
// 2. 깊은 비밀 / 첫 비밀
// ============================================================
const SECRET_REGEX = /비밀인데|처음.*말|아무한테도.*안|아무도.*몰라|누구.*말.*안|솔직히 처음/;

export function detectSecret(msg: string): boolean {
  return SECRET_REGEX.test(msg);
}

// ============================================================
// 3. 조언 수용 / 거부
// ============================================================
const ADVICE_ACCEPT_REGEX = /해볼게|알겠어|그래.*해볼|그럼.*해볼|좋은.*생각|맞네|네.*말.*맞|해봐야겠/;
const ADVICE_REJECT_REGEX = /그건.*아닌.*같|아닌데|좀.*아닌|별로|그건.*좀|다른.*방법|모르겠어/;

export function detectAdviceAccepted(msg: string): boolean {
  return ADVICE_ACCEPT_REGEX.test(msg);
}

export function detectAdviceRejected(msg: string): boolean {
  return ADVICE_REJECT_REGEX.test(msg);
}

// ============================================================
// 4. 감사 표현
// ============================================================
const GRATITUDE_REGEX = /고마[워운]|땡큐|감사|도움.*[됐되]|ㄱㅅ|thx|thanks/i;

export function detectGratitude(msg: string): boolean {
  return GRATITUDE_REGEX.test(msg);
}

// ============================================================
// 5. 유머 반응 (웃음)
// ============================================================
const LAUGH_REGEX = /ㅋ{3,}|ㅎ{3,}|웃겨|재밌|😂|🤣|lol|LOL/;

export function detectLaugh(msg: string): boolean {
  return LAUGH_REGEX.test(msg);
}

// ============================================================
// 6. 장문 공유 (100자+)
// ============================================================
export function detectLongShare(msg: string): boolean {
  return msg.length >= 100;
}

// ============================================================
// 7. 관계 세부사항 (파트너 이름, 구체적 디테일)
// ============================================================
const DETAIL_REGEX = /남친|여친|남자친구|여자친구|전남친|전여친|썸|고백|사귀|만난.*지|사귄.*지|(\d+)년.*(만|사귀)|엄마|아빠|가족/;

export function detectRelationshipDetail(msg: string): boolean {
  return DETAIL_REGEX.test(msg);
}

// ============================================================
// 8. 숙제 이행 보고
// ============================================================
const HOMEWORK_REPORT_REGEX = /해봤어|해봤는데|보냈어|보냈는데|말했어|만났어|시도해|저번에.*얘기한|알려준.*대로/;

export function detectHomeworkReport(msg: string, sessionNumber: number): boolean {
  // 2번째 세션부터 가능
  return sessionNumber >= 2 && HOMEWORK_REPORT_REGEX.test(msg);
}

// ============================================================
// 9. 루나 별명 부여
// ============================================================
const NICKNAME_REGEX = /루니|언니야|누나야|우리.*루나|루나야/;

export function detectNickname(msg: string): boolean {
  return NICKNAME_REGEX.test(msg);
}

// ============================================================
// 10. 단답 반복
// ============================================================
const SHORT_ANSWER_REGEX = /^(ㅇㅇ|ㄴㄴ|응|아니|그래|맞아|몰라|글쎄)[\s.!?]*$/;

export function detectShortRepeat(recentMessages: string[]): boolean {
  const last3 = recentMessages.slice(-3);
  if (last3.length < 3) return false;
  return last3.every((m) => SHORT_ANSWER_REGEX.test(m.trim()));
}

// ============================================================
// 11. 부정적 피드백
// ============================================================
const NEGATIVE_FEEDBACK_REGEX = /도움.*안.*[돼되]|별로|쓸모없|의미없|그런.*식|말.*좀|이상해|짜증/;

export function detectNegativeFeedback(msg: string): boolean {
  return NEGATIVE_FEEDBACK_REGEX.test(msg);
}

// ============================================================
// 12. 위기 요청
// ============================================================
const CRISIS_REGEX = /죽고.*싶|자살|사라지고.*싶|끝내고.*싶|너무.*힘들어서.*진짜/;

export function detectCrisisRequest(msg: string): boolean {
  return CRISIS_REGEX.test(msg);
}

// ============================================================
// 13. 감정 변화 인정
// ============================================================
const EMOTION_SHIFT_REGEX = /좀.*[나풀]아진|덜.*힘들|조금.*편해|가벼워졌|숨.*쉬어/;

export function detectEmotionShiftAck(msg: string): boolean {
  return EMOTION_SHIFT_REGEX.test(msg);
}

// ============================================================
// 14. 관계 변화 긍정 보고
// ============================================================
const RELATIONSHIP_UPDATE_REGEX = /잘.*[됐됬]|화해|답장.*왔|만나기로|좋아졌|풀렸|해결/;

export function detectRelationshipUpdate(msg: string): boolean {
  return RELATIONSHIP_UPDATE_REGEX.test(msg);
}

// ============================================================
// 15. 마음읽기 수용 (이벤트에서 "맞아" 선택 시)
//   → 이 트리거는 이벤트 시스템에서 명시적으로 트리거됨
// ============================================================

// ============================================================
// 통합 감지 — 턴별
// ============================================================

export interface TurnDetectionContext {
  userMessage: string;
  recentUserMessages: string[];
  sessionNumber: number;
  currentState: IntimacyState;
}

/**
 * 한 턴의 유저 메시지에서 감지 가능한 모든 트리거를 반환
 * (중복 제거는 호출자에서 처리)
 */
export function detectTurnTriggers(ctx: TurnDetectionContext): IntimacyTriggerType[] {
  const triggers: IntimacyTriggerType[] = [];
  const msg = ctx.userMessage;
  if (!msg || msg.trim().length === 0) return triggers;

  // 위기 — 최우선
  if (detectCrisisRequest(msg)) {
    triggers.push('crisis_request');
  }

  // 깊은 비밀 → 첫 비밀인지 체크
  if (detectSecret(msg)) {
    const isFirst = !ctx.currentState.milestones.includes('first_secret_given');
    triggers.push(isFirst ? 'first_secret' : 'deep_secret');
  }

  // 감정 표현 → 첫 눈물인지
  if (detectEmotionShare(msg)) {
    const isFirst =
      !ctx.currentState.milestones.includes('first_tears_given') &&
      /ㅠ{2,}|ㅜ{2,}|죽겠|미치/.test(msg);
    triggers.push(isFirst ? 'first_tears' : 'emotion_share');
  }

  // 감사 → 첫 감사인지
  if (detectGratitude(msg)) {
    const isFirst = !ctx.currentState.milestones.includes('first_gratitude_given');
    triggers.push(isFirst ? 'first_gratitude' : 'gratitude');
  }

  // 유머
  if (detectLaugh(msg)) {
    triggers.push('humor_laugh');
  }

  // 장문
  if (detectLongShare(msg)) {
    triggers.push('long_share');
  }

  // 관계 디테일
  if (detectRelationshipDetail(msg)) {
    triggers.push('relationship_detail');
  }

  // 숙제 이행
  if (detectHomeworkReport(msg, ctx.sessionNumber)) {
    triggers.push('homework_report');
  }

  // 별명
  if (detectNickname(msg)) {
    triggers.push('nickname_given');
  }

  // 조언 수용
  if (detectAdviceAccepted(msg)) {
    triggers.push('advice_accepted');
  }

  // 조언 거부
  if (detectAdviceRejected(msg)) {
    triggers.push('advice_rejected');
  }

  // 감정 변화 인정
  if (detectEmotionShiftAck(msg)) {
    triggers.push('emotion_shift_ack');
  }

  // 관계 긍정 보고
  if (detectRelationshipUpdate(msg)) {
    triggers.push('relationship_update');
  }

  // 부정 피드백
  if (detectNegativeFeedback(msg)) {
    triggers.push('negative_feedback');
  }

  // 단답 반복 — 최근 메시지 3개 연속
  if (detectShortRepeat(ctx.recentUserMessages)) {
    triggers.push('short_repeat');
  }

  return triggers;
}

// ============================================================
// 세션 완료 시 트리거 감지
// ============================================================

export interface SessionCompletionContext {
  reachedPhase: 'HOOK' | 'MIRROR' | 'BRIDGE' | 'SOLVE' | 'EMPOWER';
  totalUserMessages: number;
  currentState: IntimacyState;
}

/**
 * 세션 완료 시 얻는 트리거 (EMPOWER 도달 = 완주)
 */
export function detectSessionTriggers(ctx: SessionCompletionContext): IntimacyTriggerType[] {
  const triggers: IntimacyTriggerType[] = [];

  // EMPOWER 도달 = 세션 완주
  if (ctx.reachedPhase === 'EMPOWER') {
    triggers.push('session_complete');
  }

  // HOOK에서 바로 끝남 = 조기 종료
  if (ctx.reachedPhase === 'HOOK' && ctx.totalUserMessages < 3) {
    triggers.push('early_exit');
  }

  // 100세션 마일스톤
  const nextSessionCount = ctx.currentState.totalSessions + 1;
  if (nextSessionCount === 100) {
    triggers.push('milestone_100');
  }

  return triggers;
}
