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
- emotionReason: A brief Korean sentence explaining why this emotion score was given, based on the user's words. Example: "읽씹당한 후 불안과 서운함이 강하게 느껴졌어요" (MUST be in Korean, 1 sentence, max 30 chars)
- cognitiveDistortions: array. Use ONLY: "MIND_READING", "CATASTROPHIZING", "PERSONALIZATION", "ALL_OR_NOTHING", "OVERGENERALIZATION", "EMOTIONAL_REASONING", "SHOULD_STATEMENTS", "LABELING" (empty array if none)
- attachmentType: Use ONLY: "ANXIOUS", "AVOIDANT", "SECURE", "UNKNOWN"
- horsemenDetected: array. Use ONLY: "CRITICISM", "CONTEMPT", "DEFENSIVENESS", "STONEWALLING" (empty array if none)
- isAmbivalent: true or false
- isSuppressive: true or false
- primaryIntent: The user's primary communicative intent. Use ONLY: "VENTING" (emotional outpouring, ㅠㅠ, 미칠것같아), "STORYTELLING" (describing situation/events), "SEEKING_VALIDATION" (asking for confirmation: 맞지?, 정상이지?), "SEEKING_ADVICE" (asking what to do: 어떻게 해?), "EXPRESSING_AMBIVALENCE" (mixed feelings: ~인데 ~도), "INSIGHT_EXPRESSION" (realization: 아..., 그러네, 사실은), "RESISTANCE" (minimizing/deflecting: 별거 아닌데, 그건 아니고), "MINIMAL_RESPONSE" (very short: 응, 몰라, 그래)
- secondaryIntent: Optional second intent, same values as primaryIntent. null if not applicable.
- emotionalIntensity: How intense the emotion is. Use ONLY: "low", "medium", "high", "crisis"
- relationshipScenario: The specific dating/relationship scenario. Use ONLY:
  "READ_AND_IGNORED" — 읽씹/안읽씹/톡씹/문자씹/카톡씹/씹혔/씹힘/답장없음/답안옴/답안와/확인만하고/읽고무시/봤는데답없/1안사라짐/1그대로/단답/대충답/보냈는데답없/DM씹/메시지무시. 핵심: 메시지를 보냈는데 상대가 읽고 답하지 않거나 아예 안 읽는 상황.
  "GHOSTING" — 잠수/잠수타다/고스팅/연락두절/연락끊김/사라짐/증발/잠적/행방불명/차단/블락/친삭/감감무소식/며칠째연락없/소식끊김. 핵심: 상대가 갑자기 장기간 완전히 연락이 끊긴 상황 (읽씹보다 더 긴 기간, 완전 소멸).
  "LONG_DISTANCE" — 장거리연애/해외연애/군대연애/유학/워홀/파견/다른도시/다른나라/시차/자주못만남/한달에한번/군인남친/군인여친/입대/면회/위문편지. 핵심: 물리적 거리로 인한 고충.
  "JEALOUSY" — 질투/집착/의심/의처증/의부증/여사친/남사친/이성친구/다른여자/다른남자/좋아요감시/인스타감시/팔로우감시/폰검사/카톡검사/핸드폰확인/통화기록확인/소유욕/독점욕/통제/간섭/위치추적. 핵심: 상대에 대한 질투심이나 집착/통제 행동.
  "INFIDELITY" — 바람/바람피다/외도/불륜/양다리/투타임/이중연애/몰래만남/비밀연락/다른사람만남/배신/속임/내연녀/내연남/바람증거/어장관리. 핵심: 상대 또는 본인의 외도/바람 상황.
  "BREAKUP_CONTEMPLATION" — 이별/이별고민/이별통보/헤어지자/헤어질까/헤어지고싶/끝내고싶/끝내야하나/관계정리/더이상못하겠/그만하고싶/차였/차버리/쿨이별/합의이별/미련/복합/재회/전남친/전여친. 핵심: 이별을 고민하거나 이별 직후 상황.
  "BOREDOM" — 권태기/매너리즘/설레지않음/설렘없음/감정식음/정만남음/사랑인지정인지/지루/심드렁/시큰둥/무미건조/친구같은/가족같은/변화없음/항상똑같/스킨십줄음/스킨십없음/끌리지않음/매력없음. 핵심: 관계의 열정이 식고 권태로운 상황.
  "GENERAL" — none of the above specific scenarios

**🆕 READ_AND_IGNORED 진단 축 (relationshipScenario가 READ_AND_IGNORED일 때만 추출, 아니면 null):**
- readIgnoredDuration: How long since the message was ignored. Use ONLY: "HOURS" (<6h), "SAME_DAY" (6-24h), "DAYS_2_3" (2-3 days), "DAYS_4_7" (4 days to 1 week), "OVER_WEEK" (more than 1 week). null if unknown. (예: "금요일에 보냈는데" → calculate days from conversation context)
- readIgnoredStage: Relationship stage. Use ONLY: "SOME" (썸/소개팅), "EARLY_DATING" (1-3 months), "ESTABLISHED" (3+ months), "POST_BREAKUP" (after breakup), "RECONCILIATION" (trying to get back). null if unknown.
- readIgnoredReadType: Type of being ignored. Use ONLY: "READ_NO_REPLY" (read but no reply), "UNREAD_IGNORED" (not even read), "PARTIAL_REPLY" (short/dismissive reply), "SELECTIVE" (ignores specific topics), "DELAYED_READ" (read very late). null if unknown.
- readIgnoredPattern: Frequency pattern. Use ONLY: "FIRST_TIME", "OCCASIONAL", "FREQUENT", "ALWAYS", "WORSENING". null if unknown.

**🆕 v12: 관계진단 범용 축 (ALL scenarios, not just READ_AND_IGNORED):**
- conflictStyle: How the user typically reacts in this conflict. Use ONLY: "PURSUE" (keeps reaching out, sends more messages, 또 보냈어/연달아), "WITHDRAW" (pulls back, waits silently, 나도 안 보냄/기다려), "CONFRONT" (wants to talk directly, 얘기하자/만나서), "AVOID" (ignores the issue, 모른 척/안 꺼냄). null if unknown.
- relationshipStrength: How strong the relationship is normally (not during this crisis). Use ONLY: "STRONG" (normally great, this is unusual), "MODERATE" (up and down), "WEAK" (already struggling), "UNCERTAIN" (can't tell). null if unknown.
- changeReadiness: What the user wants RIGHT NOW. Use ONLY: "READY_TO_ACT" (wants specific action: 뭐라고 보내?/어떻게 해?), "NEEDS_PROCESSING" (still confused: 왜 이러는지 모르겠어), "WANTS_VALIDATION" (wants reassurance: 내가 이상한거야?/이게 정상이야?), "CONSIDERING_EXIT" (thinking of ending: 끝내야하나/헤어질까). null if unknown.
- partnerContext: Why is the partner behaving this way? Use ONLY: "LIKELY_BUSY" (partner seems busy: 시험/출장/야근), "LIKELY_UPSET" (partner seems upset: after a fight), "LIKELY_DISTANCING" (partner is deliberately distancing), "UNKNOWN" (no clue why). null if unknown.
- previousAttempts: What has the user already tried? Use ONLY: "SENT_MORE" (sent additional messages), "WAITED" (been waiting), "CHECKED_SNS" (checked their SNS/인스타), "ASKED_FRIENDS" (asked friends), "NOTHING" (hasn't done anything yet). null if unknown.

**🆕 v19: 감정 신호 추출 (EFT 기반 — 매 턴 필수 추출)**
- detectedEmotions: array of Korean emotion words/phrases detected in the message. Examples: ["서운함", "불안", "화남", "외로움", "두려움", "수치심", "죄책감", "답답함"]. Extract 1-3 core emotions. Empty array if purely factual.
- eftLayer: The EFT emotion layer. Use ONLY: "primary_adaptive" (healthy direct response — genuine sadness, appropriate anger), "primary_maladaptive" (old trauma-based — core shame, abandonment fear, worthlessness), "secondary_reactive" (emotion about emotion — anger covering hurt, guilt about anger), "instrumental" (strategic display — tears to control, anger to intimidate)
- primaryDeepEmotion: The PRIMARY emotion beneath the surface, in Korean, 1 phrase max 15 chars. What the user REALLY feels underneath. Examples: "버림받을까 봐 두려움", "무시당한 서운함", "내가 부족한 건 아닌지 불안", "관계가 끝날까 봐 공포". null if unclear.
- suppressionSignals: array of Korean phrases in the message that indicate emotion suppression/minimization. Examples: ["괜찮아", "별거 아닌데", "상관없어", "그냥", "뭐 어쩔 수 없지", "신경 안 써"]. Empty array if none.
- attachmentFear: The core attachment fear driving this message. Use ONLY: "abandonment" (fear of being left/ignored), "rejection" (fear of not being accepted), "inadequacy" (fear of not being enough), "loss_of_control" (fear of losing autonomy). null if not applicable.
- emotionEvidence: array of 1-2 SHORT direct quotes from the user's message (in Korean) that are the strongest evidence for the detected deep emotion. Max 20 chars each. Example: ["읽씹당하니까 너무 서운해", "나한테 관심 없는 거 같아"]. Empty array if no clear evidence.

**🆕 v20: 해결책 준비도 (5A Framework — Ask→Advise→Assess→Assist→Arrange)**
- solutionReadiness: How ready the user is for advice/solutions RIGHT NOW. Use ONLY:
  "NOT_READY" — Still venting, telling story, processing emotions. Needs empathy, not advice. Signs: long emotional outpouring, no questions about what to do, "ㅠㅠ", just started talking.
  "EXPLORING" — Starting to recognize patterns, showing some insight. Signs: "왜 이러는 걸까", "나도 문제가 있나", self-reflection, noticing patterns.
  "READY" — Explicitly asking for advice or showing action-readiness. Signs: "어떻게 해?", "뭐라고 보내?", "이제 좀 알겠어, 근데 어떻게", clear desire for next steps.

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
