/**
 * v115.7 Nickname Reaction Detector — 유저의 다음 턴 응답에서 별명 반응 분류.
 *
 * 흐름:
 *   1. 루나가 본문에서 별명 X (status='trying' 으로 승격)
 *   2. 다음 유저 메시지 도착
 *   3. 이 detector 로 accepted / rejected / neutral 분류
 *   4. status 전이:
 *      - accepted → 'accepted' (정착)
 *      - rejected → 'rejected' (영구 봉인)
 *      - neutral → 'trying' 유지 (다음 시도 기회)
 *
 * 휴리스틱 (LLM 호출 X, 저비용):
 *   - reject signals: "그렇게 부르지마", "별명 이상해", "그 이름 싫어"
 *   - accept signals: 유저가 자기 자신을 그 별명으로 지칭 / 긍정 이모티콘 직후
 *   - default: neutral
 */

import type { NicknameReaction } from './nickname-state';

const REJECT_PATTERNS: RegExp[] = [
  /(?:그렇게|그거|그 이름|별명)\s*(?:부르지|쓰지|하지)\s*(?:마|말아|마라)/,
  /(?:별명|이름|호칭)\s*(?:이상|싫|어색|어울리지|아닌)/,
  /(?:나)\s*(?:그게|그거|그렇게)\s*(?:아닌|아니)/,
  /(?:다시는|이제|앞으로)\s*(?:그렇게|그거|그 이름)\s*(?:부르지|쓰지)/,
  /^(?:아니|에이|야).*(?:이상|싫|어색|별로)/,
];

const ACCEPT_HINT_PATTERNS: RegExp[] = [
  /ㅋ{2,}|ㅎ{2,}/, // 가벼운 웃음
  /(?:귀엽|좋[아네]|마음에 들|예쁘|이쁘)/,
  /(?:그거 좋|그게 좋|괜찮네|괜찮은데)/,
];

export interface ReactionDetectionInput {
  /** 직전 루나 응답 (별명이 포함된 본문) */
  lunaTurnText: string;
  /** 이번 유저 메시지 */
  userMessage: string;
  /** 검증 대상 별명 */
  nickname: string;
}

export interface ReactionDetectionResult {
  reaction: NicknameReaction;
  /** 다음 상태로 전이할 status (record_nickname_reaction RPC 에 넘김) */
  nextStatus: 'trying' | 'accepted' | 'rejected';
  /** 디버그용 매칭 근거 */
  matchedRule?: string;
}

/**
 * 휴리스틱 1회 평가. LLM 호출 없음.
 *
 * 보수적 분류 — 명확한 거부 신호가 있어야 'rejected', 명확한 긍정만 'accepted',
 * 그 외 전부 'neutral' (=trying 유지).
 */
export function detectNicknameReaction(
  input: ReactionDetectionInput,
): ReactionDetectionResult {
  const { userMessage, nickname } = input;
  const msg = userMessage.trim();

  // 1) 거부 패턴 — 가장 강한 신호. 별명 언급 + reject pattern
  const mentionsNickname = msg.includes(nickname);
  for (const [i, pat] of REJECT_PATTERNS.entries()) {
    if (pat.test(msg)) {
      return {
        reaction: 'rejected',
        nextStatus: 'rejected',
        matchedRule: `reject_pattern_${i}`,
      };
    }
  }

  // 2) 별명 자체 언급 + 부정 어미 — "쭁이? 좀 그래" 등
  if (mentionsNickname && /(?:좀|약간)\s*(?:이상|싫|별로|어색)/.test(msg)) {
    return {
      reaction: 'rejected',
      nextStatus: 'rejected',
      matchedRule: 'name_then_negative',
    };
  }

  // 3) 긍정 — 가벼운 웃음 + 별명 언급 OR 긍정 표현
  if (mentionsNickname) {
    for (const [i, pat] of ACCEPT_HINT_PATTERNS.entries()) {
      if (pat.test(msg)) {
        return {
          reaction: 'accepted',
          nextStatus: 'accepted',
          matchedRule: `accept_hint_${i}`,
        };
      }
    }
  }

  // 4) 유저가 자기 자신을 그 별명으로 재호명 ("응 그래 쭁이는 ~") — 강한 수락
  const selfRefer = new RegExp(`(?:^|\\s)${escapeRegex(nickname)}(?:는|은|이|가|아|야)?\\s`, 'i');
  if (selfRefer.test(msg)) {
    return {
      reaction: 'accepted',
      nextStatus: 'accepted',
      matchedRule: 'self_refer',
    };
  }

  // 5) default — 더 관찰
  return {
    reaction: 'neutral',
    nextStatus: 'trying',
    matchedRule: 'no_signal',
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
