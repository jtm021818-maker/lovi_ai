/**
 * Turn 10: CLOSING_RITUAL — 감정 정리 + 여운 + 재방문 유도
 *
 * 목표:
 * - 세션의 감정적 완결
 * - 카드 메시지 핵심 요약
 * - 떡밥(cliffhanger)으로 여운 남기기
 * - 일일 카드 / 저널링 연결
 * - 재방문 동기 부여
 */

import type { SessionSummary, SessionMood } from './turn-orchestrator';

// ─── Types ──────────────────────────────────────────────

export interface ClosingConfig {
  sessionMood: SessionMood;
  coreInsight: string;
  keyTakeaway: string;
  tarotNyangMessage: string;
  scenario: string;
  includeCliffhanger: boolean;
  includeDailyCard: boolean;
  needsLunaReferral: boolean;
}

export interface ClosingResult {
  emotionCheck: string;
  summary: string;
  cliffhanger?: string;
  dailyCardInvite?: string;
  farewell: string;
  lunaReferral?: string;
}

// ─── 감정 체크 멘트 ─────────────────────────────────────

const EMOTION_CHECKS: string[] = [
  '오늘 카드가 많은 이야기를 했어 🔮\n잠깐, 지금 마음이 어때?\n처음 왔을 때랑 비교하면... 좀 달라졌어?',
  '긴 여정이었어\n지금 기분이 어때? 한 단어로 말해봐',
  '카드가 많이 말했지? 🔮\n지금 마음이 좀 가벼워졌어? 아니면 아직 무거워?\n솔직하게',
];

// ─── 핵심 요약 템플릿 ───────────────────────────────────

function buildSummary(config: ClosingConfig): string {
  return `오늘 카드가 너한테 전한 메시지를 정리하면

🔮 핵심: ${config.coreInsight}
💫 기억할 것: ${config.keyTakeaway}
타로냥이 전하는 말: ${config.tarotNyangMessage}`;
}

// ─── 떡밥(Cliffhanger) ──────────────────────────────────

const CLIFFHANGERS: Record<string, string[]> = {
  UNREQUITED_LOVE: [
    '근데 카드가 한 가지 더 말하고 싶었는데...\n"그 사람의 숨겨진 신호"에 대해서야.\n다음에 오면 그 이야기도 해줄게 🔮',
    '아, 그리고... 카드가 마지막에 보여준 에너지가 있는데\n이건 시간이 좀 지나야 선명해져.\n미니 실험 해보고 나서 오면 더 정확하게 읽을 수 있을 거야 🔮',
  ],
  RECONNECTION: [
    '근데 재회 카드에서 하나 더 읽힌 게 있어\n"타이밍"에 대한 거야.\n다음에 오면 더 깊이 봐줄게 🔮',
    '카드가 마지막에 뭔가를 속삭였는데...\n그 사람 쪽 에너지에 변화가 올 수 있어.\n다음에 확인해볼까? 🔮',
  ],
  BREAKUP_CONTEMPLATION: [
    '근데 카드가 하나 더 보여주고 싶었어\n"이 결정 후에 올 변화"에 대해서.\n마음 정리되면 다시 와 🔮',
  ],
  GENERAL: [
    '근데 카드가 한 가지 더 말하고 싶었는데 시간이...\n다음에 오면 그 이야기도 해줄게.\n미니 실험 해보고 나서 오면 카드가 더 정확하게 읽을 수 있을 거야 🔮',
    '아 참, 카드가 마지막에 하나 더 보여줬는데...\n이건 좀 더 시간이 필요한 메시지야.\n다음에 올 때 더 선명해져 있을 거야 🔮',
  ],
};

// ─── 일일 카드 초대 ─────────────────────────────────────

const DAILY_CARD_INVITES: string[] = [
  '아 참! 내일 아침에 오늘의 카드 한 장 뽑아봐\n매일 카드와 대화하면, 카드가 너를 더 잘 알게 돼\n나도 기다리고 있을게~ 🔮',
  '하나 더!\n내일부터 매일 아침 카드 한 장씩 뽑아보는 거 어때?\n하루의 에너지를 미리 읽을 수 있어\n카드가 점점 너한테 맞는 메시지를 줄 거야 🔮',
  'TMI인데\n매일 카드 뽑는 사람들은 직감이 더 강해져.\n내일 아침에 한 장 뽑아봐!이 해석해줄게🔮',
];

// ─── 작별 인사 ──────────────────────────────────────────

const FAREWELLS: Record<SessionMood, string[]> = {
  light: [
    '오늘 좋은 에너지였어\n카드가 너한테 기대하고 있나봐 🔮\n이 에너지 유지하면서 이번 주 보내봐!\n또 놀러와',
    '오늘 재밌었어\n카드가 웃고 있어. 좋은 신호야 🔮\n또 보자',
  ],
  medium: [
    '오늘 용기 내서 찾아와줘서 고마워\n카드가 너의 편이야. 나도.\n또 보자🌙',
    '오늘 이야기 잘 들었어\n카드가 전한 메시지, 마음에 담아둬\n힘들면 언제든 와',
  ],
  heavy: [
    '오늘 무거운 이야기 많이 했지\n근데... 이렇게 말할 수 있다는 것 자체가 용기야.\n카드도, 나도 너 편이야.\n힘들면 언제든 와✨',
    '오늘 정말 고생했어...\n네 마음이 좀이라도 가벼워졌으면 좋겠어.\n카드가 항상 너를 기다리고 있을게 🔮\n또 보자',
  ],
};

// ─── 루나 연결 안내 ─────────────────────────────────────

const LUNA_REFERRAL = '...아, 근데 정말 많이 힘들면\n루나 언니한테도 이야기해봐. 더 깊이 들어줄 수 있거든 💜\n타로내가 소개해줄게';

// ─── Public API ─────────────────────────────────────────

/** 클로징 리추얼 전체 생성 */
export function generateClosingRitual(config: ClosingConfig): ClosingResult {
  // 1. 감정 체크
  const emotionCheck = EMOTION_CHECKS[Math.floor(Math.random() * EMOTION_CHECKS.length)];

  // 2. 핵심 요약
  const summary = buildSummary(config);

  // 3. 떡밥
  let cliffhanger: string | undefined;
  if (config.includeCliffhanger) {
    const pool = CLIFFHANGERS[config.scenario] ?? CLIFFHANGERS.GENERAL;
    cliffhanger = pool[Math.floor(Math.random() * pool.length)];
  }

  // 4. 일일 카드 초대
  let dailyCardInvite: string | undefined;
  if (config.includeDailyCard) {
    dailyCardInvite = DAILY_CARD_INVITES[Math.floor(Math.random() * DAILY_CARD_INVITES.length)];
  }

  // 5. 작별 인사
  const farewellPool = FAREWELLS[config.sessionMood];
  const farewell = farewellPool[Math.floor(Math.random() * farewellPool.length)];

  // 6. 루나 연결 (무거운 세션에서만)
  const lunaReferral = config.needsLunaReferral ? LUNA_REFERRAL : undefined;

  return {
    emotionCheck,
    summary,
    cliffhanger,
    dailyCardInvite,
    farewell,
    lunaReferral,
  };
}

/** 클로징 메시지 조합 */
export function composeClosingMessage(result: ClosingResult): string {
  const parts = [result.emotionCheck, '', result.summary];

  if (result.cliffhanger) parts.push('', result.cliffhanger);
  if (result.dailyCardInvite) parts.push('', result.dailyCardInvite);
  if (result.lunaReferral) parts.push('', result.lunaReferral);
  parts.push('', result.farewell);

  return parts.join('\n');
}

/** 세션 요약으로부터 클로징 설정 빌드 */
export function buildClosingConfigFromSummary(
  summary: SessionSummary,
  coreInsight: string,
  keyTakeaway: string,
  tarotNyangMessage: string,
): ClosingConfig {
  const needsLunaReferral =
    summary.sessionMood === 'heavy' &&
    summary.emotionJourney.temperature >= 8;

  return {
    sessionMood: summary.sessionMood,
    coreInsight,
    keyTakeaway,
    tarotNyangMessage,
    scenario: summary.scenario as string,
    includeCliffhanger: true,
    includeDailyCard: true,
    needsLunaReferral,
  };
}
