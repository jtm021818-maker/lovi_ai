/**
 * AI 프로바이더 (v22 — 무료 100명/일 설계)
 *
 * 개편: provider-registry.ts + smart-router.ts에 위임
 * 이 파일은 기존 export 시그니처를 유지하는 호환 레이어
 *
 * [라우팅 전략]
 * - 매 턴 대화: Qwen3-32B → Cerebras 70B (한도 큰 모델)
 * - 이벤트:     Gemini 3.1 Flash Lite (500/일, 임팩트 순간 전용)
 * - 위기:       Gemini 3.1 Flash Lite → Qwen3 → Cerebras 70B
 * - 상태분석:   Cerebras 8B → Groq 8B
 * - 검증/요약:  Cerebras 8B / Groq 8B
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
 * 기존: Gemini 3.1 Flash Lite → Groq 2단계
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

/** 구조화된 상태 분석 — v33 (H2): 프롬프트 조건부 분리로 입력 토큰 ~40-60% 절감 */
export async function analyzeStateWithHaiku(
  userMessage: string,
  recentMessages: string[],
  context: string,
  /** 🆕 v33: 시나리오 힌트 — 해당 시나리오 전용 필드만 포함 */
  scenarioHint?: string
): Promise<string> {
  // ===== 기본 프롬프트 (~1,200 토큰, 항상 포함) =====
  let systemPrompt = `You are a Korean relationship counseling state analysis expert. Analyze the user's message and respond ONLY in JSON.

**Required fields (always include):**
- emotionScore: integer -5 to +5
- emotionReason: Korean 1 sentence max 30 chars explaining the score
- cognitiveDistortions: array. Values: "MIND_READING","CATASTROPHIZING","PERSONALIZATION","ALL_OR_NOTHING","OVERGENERALIZATION","EMOTIONAL_REASONING","SHOULD_STATEMENTS","LABELING" (empty if none)
- attachmentType: "ANXIOUS","AVOIDANT","SECURE","UNKNOWN"
- horsemenDetected: array. Values: "CRITICISM","CONTEMPT","DEFENSIVENESS","STONEWALLING" (empty if none)
- isAmbivalent: boolean
- isSuppressive: boolean
- primaryIntent: "VENTING","STORYTELLING","SEEKING_VALIDATION","SEEKING_ADVICE","EXPRESSING_AMBIVALENCE","INSIGHT_EXPRESSION","RESISTANCE","MINIMAL_RESPONSE"
- secondaryIntent: same as primaryIntent or null
- emotionalIntensity: "low","medium","high","crisis"
- relationshipScenario: "READ_AND_IGNORED","GHOSTING","LONG_DISTANCE","JEALOUSY","INFIDELITY","BREAKUP_CONTEMPLATION","BOREDOM","GENERAL"
  Scenario detection hints:
  READ_AND_IGNORED: 읽씹/안읽씹/톡씹/답장없/답안옴/확인만/읽고무시/단답/대충답
  GHOSTING: 잠수/고스팅/연락두절/차단/블락/사라짐/감감무소식
  LONG_DISTANCE: 장거리/해외연애/군대연애/유학
  JEALOUSY: 질투/집착/의심/여사친/남사친/폰검사/통제
  INFIDELITY: 바람/외도/불륜/양다리/배신
  BREAKUP_CONTEMPLATION: 이별/헤어지자/끝내고싶/전남친/전여친
  BOREDOM: 권태기/설레지않음/감정식음/친구같은
- detectedEmotions: array of 1-3 Korean emotion words. e.g. ["서운함","불안","화남"]
- eftLayer: "primary_adaptive","primary_maladaptive","secondary_reactive","instrumental"
- primaryDeepEmotion: Korean 1 phrase max 15 chars. What the user REALLY feels underneath. null if unclear.
- suppressionSignals: array of Korean phrases indicating suppression. e.g. ["괜찮아","별거 아닌데"]. Empty if none.
- attachmentFear: "abandonment","rejection","inadequacy","loss_of_control" or null
- emotionEvidence: array of 1-2 SHORT Korean quotes (max 20 chars each) as evidence.
- solutionReadiness: "NOT_READY"(venting/processing),"EXPLORING"(recognizing patterns),"READY"(asking for advice)`;

  // ===== READ_AND_IGNORED 전용 필드 (~400 토큰, 조건부) =====
  if (scenarioHint === 'READ_AND_IGNORED') {
    systemPrompt += `

**READ_AND_IGNORED extra fields (only when scenario=READ_AND_IGNORED):**
- readIgnoredDuration: "HOURS"(<6h),"SAME_DAY"(6-24h),"DAYS_2_3","DAYS_4_7","OVER_WEEK". null if unknown.
- readIgnoredStage: "SOME","EARLY_DATING"(1-3mo),"ESTABLISHED"(3+mo),"POST_BREAKUP","RECONCILIATION". null if unknown.
- readIgnoredReadType: "READ_NO_REPLY","UNREAD_IGNORED","PARTIAL_REPLY","SELECTIVE","DELAYED_READ". null if unknown.
- readIgnoredPattern: "FIRST_TIME","OCCASIONAL","FREQUENT","ALWAYS","WORSENING". null if unknown.`;
  }

  // ===== 관계진단 범용 축 (~300 토큰, 항상 포함) =====
  systemPrompt += `

**Relationship diagnosis fields (all scenarios):**
- conflictStyle: "PURSUE"(keeps reaching out),"WITHDRAW"(pulls back),"CONFRONT"(wants to talk),"AVOID"(ignores). null if unknown.
- relationshipStrength: "STRONG","MODERATE","WEAK","UNCERTAIN". null if unknown.
- changeReadiness: "READY_TO_ACT","NEEDS_PROCESSING","WANTS_VALIDATION","CONSIDERING_EXIT". null if unknown.
- partnerContext: "LIKELY_BUSY","LIKELY_UPSET","LIKELY_DISTANCING","UNKNOWN". null if unknown.
- previousAttempts: "SENT_MORE","WAITED","CHECKED_SNS","ASKED_FRIENDS","NOTHING". null if unknown.

Return pure JSON only, no code blocks.`;

  const userPrompt = `Recent conversation context:
${recentMessages.map((m, i) => `[${i + 1}] ${m}`).join('\n')}

${context ? `Additional context: ${context}\n` : ''}Current message: "${userMessage}"

Analyze the above message and respond in JSON.`;

  // 상태 분석 전용 캐스케이드: Groq 8B → Cerebras 8B → Gemini 3.1 Flash Lite
  const cascade = getProviderCascade('state_analysis');
  const result = await generateWithCascade(cascade, systemPrompt, [{ role: 'user', content: userPrompt }], 512);
  return result.text;
}
