/**
 * AI 프로바이더 (Gemini + Groq + Cerebras 3사 하이브리드)
 *
 * 개편: provider-registry.ts + smart-router.ts에 위임
 * 이 파일은 기존 export 시그니처를 유지하는 호환 레이어
 *
 * [라우팅 전략]
 * - 상태 분석: Groq 8B → Cerebras 8B → Gemini Lite
 * - CRISIS:    Gemini Pro → Flash → Groq 70B
 * - CBT/ACT/MI: Gemini Flash → Groq 70B → Qwen3
 * - SUPPORT:   Groq Qwen3 → Cerebras 8B → Gemini Lite
 * - 검증/요약:  Groq 8B / Cerebras 8B
 */

import {
  generateWithCascade,
  streamWithCascade,
} from './provider-registry';
import type { ModelTier } from './provider-registry';
import { getProviderCascade } from './smart-router';

// re-export for backward compatibility
export type { ModelTier } from './provider-registry';

// ============================================================
// Public API (기존 시그니처 완전 유지)
// ============================================================

/**
 * 일반 메시지 생성 (3사 캐스케이드 폴백)
 * 기존: Gemini → Groq 2단계
 * 개편: smart-router가 태스크별 최적 체인 결정
 */
export async function generateMessage(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  modelTier: ModelTier = 'sonnet',
  maxTokens: number = 1024
): Promise<string> {
  // 기존 호환: tier로 대략적 태스크 추정
  const task = modelTier === 'haiku' ? 'state_analysis' as const : 'main_response' as const;
  const cascade = getProviderCascade(task);

  const result = await generateWithCascade(cascade, systemPrompt, messages, maxTokens);
  return result.text;
}

/** 스트리밍 메시지 생성 (3사 캐스케이드 폴백) */
export async function* streamMessage(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  modelTier: ModelTier = 'sonnet',
  maxTokens: number = 1024
): AsyncGenerator<string> {
  const task = modelTier === 'haiku' ? 'state_analysis' as const : 'main_response' as const;
  const cascade = getProviderCascade(task);

  yield* streamWithCascade(cascade, systemPrompt, messages, maxTokens);
}

/** 구조화된 상태 분석 — Groq 8B 1순위 (14,400 RPD) */
export async function analyzeStateWithHaiku(
  userMessage: string,
  recentMessages: string[],
  context: string
): Promise<string> {
  const systemPrompt = `You are a Korean relationship counseling state analysis expert. Analyze the user's message and respond ONLY in the JSON format below.

**IMPORTANT: Use ONLY the exact uppercase strings listed below for all values.**

Analysis criteria:
- emotionScore: integer from -5 (very negative) to +5 (very positive)
- cognitiveDistortions: array. Use ONLY: "MIND_READING", "CATASTROPHIZING", "PERSONALIZATION", "ALL_OR_NOTHING", "OVERGENERALIZATION", "EMOTIONAL_REASONING", "SHOULD_STATEMENTS", "LABELING" (empty array if none)
- attachmentType: Use ONLY: "ANXIOUS", "AVOIDANT", "SECURE", "UNKNOWN"
- horsemenDetected: array. Use ONLY: "CRITICISM", "CONTEMPT", "DEFENSIVENESS", "STONEWALLING" (empty array if none)
- isAmbivalent: true or false
- isSuppressive: true or false
- primaryIntent: The user's primary communicative intent. Use ONLY: "VENTING" (emotional outpouring, ㅠㅠ, 미칠것같아), "STORYTELLING" (describing situation/events), "SEEKING_VALIDATION" (asking for confirmation: 맞지?, 정상이지?), "SEEKING_ADVICE" (asking what to do: 어떻게 해?), "EXPRESSING_AMBIVALENCE" (mixed feelings: ~인데 ~도), "INSIGHT_EXPRESSION" (realization: 아..., 그러네, 사실은), "RESISTANCE" (minimizing/deflecting: 별거 아닌데, 그건 아니고), "MINIMAL_RESPONSE" (very short: 응, 몰라, 그래)
- secondaryIntent: Optional second intent, same values as primaryIntent. null if not applicable.
- emotionalIntensity: How intense the emotion is. Use ONLY: "low", "medium", "high", "crisis"
- relationshipScenario: The specific dating/relationship scenario. Use ONLY: "READ_AND_IGNORED" (카톡 읽씹/안읽씹/답장없음/확인만), "GHOSTING" (잠수/연락두절/사라짐/차단), "LONG_DISTANCE" (장거리/먼거리/자주못만남), "JEALOUSY" (질투/집착/의심/다른여자/다른남자), "INFIDELITY" (바람/외도/양다리/불륜), "BREAKUP_CONTEMPLATION" (헤어질까/이별고민/끝내야하나), "BOREDOM" (권태기/설레임없음/지루/매너리즘), "GENERAL" (none of the above specific scenarios)

**🆕 READ_AND_IGNORED 진단 축 (relationshipScenario가 READ_AND_IGNORED일 때만 추출, 아니면 null):**
- readIgnoredDuration: How long since the message was ignored. Use ONLY: "HOURS" (<6h), "SAME_DAY" (6-24h), "DAYS_2_3" (2-3 days), "DAYS_4_7" (4 days to 1 week), "OVER_WEEK" (more than 1 week). null if unknown. (예: "금요일에 보냈는데" → calculate days from conversation context)
- readIgnoredStage: Relationship stage. Use ONLY: "SOME" (썸/소개팅), "EARLY_DATING" (1-3 months), "ESTABLISHED" (3+ months), "POST_BREAKUP" (after breakup), "RECONCILIATION" (trying to get back). null if unknown.
- readIgnoredReadType: Type of being ignored. Use ONLY: "READ_NO_REPLY" (read but no reply), "UNREAD_IGNORED" (not even read), "PARTIAL_REPLY" (short/dismissive reply), "SELECTIVE" (ignores specific topics), "DELAYED_READ" (read very late). null if unknown.
- readIgnoredPattern: Frequency pattern. Use ONLY: "FIRST_TIME", "OCCASIONAL", "FREQUENT", "ALWAYS", "WORSENING". null if unknown.

Return pure JSON only, no code blocks.`;

  const userPrompt = `Recent conversation context:
${recentMessages.map((m, i) => `[${i + 1}] ${m}`).join('\n')}

${context ? `Additional context: ${context}\n` : ''}Current message: "${userMessage}"

Analyze the above message and respond in JSON.`;

  // 상태 분석 전용 캐스케이드: Groq 8B → Cerebras 8B → Gemini Lite
  const cascade = getProviderCascade('state_analysis');
  const result = await generateWithCascade(cascade, systemPrompt, [{ role: 'user', content: userPrompt }], 512);
  return result.text;
}
