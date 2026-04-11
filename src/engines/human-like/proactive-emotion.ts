/**
 * 🆕 v31 Phase 2: Proactive Emotion — 루나가 먼저 감정 표현
 *
 * 현재: 유저 메시지 → 루나 반응 (반응적)
 * 신규: 루나가 먼저 걱정/안부/궁금함을 표현 (자발적)
 *
 * 트리거:
 *  - 유저가 며칠 안 옴 → "야 요즘 안 오길래 좀 걱정했어"
 *  - 이전 세션이 위기였음 → "지난번에 진짜 힘들어보였는데 좀 어때?"
 *  - 이전에 결정을 내림 → "아 맞다 그거 어떻게 됐어?"
 *  - 반복 패턴 감지 → "나 솔직하게 말해도 돼?"
 *
 * API 호출: 0 (코드 레벨 조건 판단)
 * 프롬프트에 세션 오프닝 멘트로 주입 (~30토큰)
 */

import type { MemoryRow } from './memory-engine';

// ============================================
// 자발적 행동 타입
// ============================================

interface ProactiveAction {
  id: string;
  condition: (ctx: ProactiveContext) => boolean;
  promptHint: string;  // AI에게 주입 (멘트를 직접 강제하지 않고 힌트만)
  priority: number;    // 높을수록 우선
}

export interface ProactiveContext {
  daysSinceLastSession: number;
  lastSessionEmotion: string | null;      // 마지막 세션 감정 (sad, angry 등)
  lastSessionWasCrisis: boolean;           // 위기 상황이었는지
  lastSessionUnresolved: string | null;    // 미해결 주제
  sessionCount: number;
  recentMemories: MemoryRow[];
  intimacyScore: number;
}

// ============================================
// 자발적 행동 풀
// ============================================

const PROACTIVE_ACTIONS: ProactiveAction[] = [
  {
    id: 'worry_absence',
    condition: (ctx) => ctx.daysSinceLastSession >= 3 && ctx.intimacyScore >= 20,
    promptHint: '유저가 며칠 안 왔어. 세션 시작할 때 "야 요즘 안 오길래 좀 걱정했어|||괜찮아?" 느낌으로 먼저 안부 물어봐.',
    priority: 8,
  },
  {
    id: 'followup_crisis',
    condition: (ctx) => ctx.lastSessionWasCrisis && ctx.daysSinceLastSession <= 7,
    promptHint: '지난번에 진짜 힘든 상황이었어. "지난번에 많이 힘들어보였는데|||그 후에 좀 어때?" 느낌으로 안부 확인.',
    priority: 10,
  },
  {
    id: 'followup_decision',
    condition: (ctx) => !!ctx.lastSessionUnresolved && ctx.daysSinceLastSession <= 14,
    promptHint: `지난번에 미해결 주제가 있었어. "아 맞다 그거 어떻게 됐어?" 느낌으로 자연스럽게 물어봐.`,
    priority: 7,
  },
  {
    id: 'emotional_checkin',
    condition: (ctx) => ctx.lastSessionEmotion === 'sad' || ctx.lastSessionEmotion === 'angry',
    promptHint: '지난번에 감정이 힘들었어. "지난번에 좀 속상해보였는데 좀 나아졌어?" 느낌.',
    priority: 6,
  },
  {
    id: 'warm_return',
    condition: (ctx) => ctx.sessionCount >= 3 && ctx.daysSinceLastSession >= 7,
    promptHint: '오랜만에 왔어. "오 오랜만이다!|||잘 지냈어?" 느낌으로 반갑게.',
    priority: 5,
  },
  {
    id: 'growing_closeness',
    condition: (ctx) => ctx.intimacyScore >= 50 && ctx.sessionCount >= 5,
    promptHint: '꽤 친해진 사이야. 편하게 시작해. "왔어?ㅋㅋ 오늘은 뭐야" 느낌.',
    priority: 4,
  },
];

// ============================================
// 자발적 행동 결정
// ============================================

/**
 * 세션 시작 시 루나가 먼저 할 행동 결정
 * @returns 프롬프트 힌트 or null (할 게 없으면)
 */
export function getProactiveAction(ctx: ProactiveContext): { id: string; promptHint: string } | null {
  const matched = PROACTIVE_ACTIONS
    .filter(a => a.condition(ctx))
    .sort((a, b) => b.priority - a.priority);

  if (matched.length === 0) return null;

  const chosen = matched[0];
  console.log(`[Proactive] 🫶 자발적 행동: ${chosen.id}`);
  return { id: chosen.id, promptHint: chosen.promptHint };
}

/**
 * ProactiveContext 빌더
 */
export function buildProactiveContext(
  lastSessionDate: string | null,
  lastSessionEmotion: string | null,
  lastSessionWasCrisis: boolean,
  lastSessionUnresolved: string | null,
  sessionCount: number,
  recentMemories: MemoryRow[],
  intimacyScore: number,
): ProactiveContext {
  const daysSince = lastSessionDate
    ? Math.floor((Date.now() - new Date(lastSessionDate).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  return {
    daysSinceLastSession: daysSince,
    lastSessionEmotion,
    lastSessionWasCrisis,
    lastSessionUnresolved,
    sessionCount,
    recentMemories,
    intimacyScore,
  };
}
