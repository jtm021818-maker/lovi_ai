/**
 * 프롬프트 생성기 v4 — 연애 특화 3단계 프로세스 + 심리학 기반 응답 매핑
 *
 * v3 유지: 의도→모드 매핑, 12가지 모드 프롬프트, 전략 힌트
 * v4 추가: Gottman 해독제, SFBT 기법, 허락 질문, 단계별 구체적 지시
 */

import { StateResult, StrategyResult, StrategyType, ResponseMode, ClientIntent, HorsemenType, AttachmentType, RelationshipScenario } from '@/types/engine.types';
import type { PersonaMode } from '@/types/persona.types';
import {
  getPersonaRole,
  getModePrompt,
  getAmbivalencePrompt,
  getPhasePrompt,
  getEmotionTonePrompt,
  getSuggestionPrompt,
  getTurnPhasePrompt,
  getGottmanAntidotePrompt,
  getSFBTPrompt,
  getPermissionPrompt,
  getAttachmentPrompt,
  getScenarioPrompt,
  getDraftMessagePrompt,
} from './persona-prompts';
import type { ConversationPhase } from '@/types/engine.types';

// ── 전략별 지침 (v3: "명령"이 아닌 "힌트") ──

const STRATEGY_HINTS_COUNSELOR: Record<StrategyType, string> = {
  [StrategyType.CRISIS_SUPPORT]: `🚨 분석/조언/질문 완전 금지. 순수 공감만.
📞 자살예방상담전화 1393, 정신건강위기상담전화 1577-0199
2-3줄 이내.`,
  [StrategyType.CALMING]: `감정이 격앙된 상태. 먼저 감정 반영, 안정화 제안 가능.`,
  [StrategyType.CBT]: `극단적 사고 감지 — 먼저 감정 반영 후, 부드럽게 다른 시각 제시 가능. 전문용어 금지.`,
  [StrategyType.ACT]: `감정 억압 감지 — 감정을 느끼는 것 자체가 괜찮다는 수용 메시지.`,
  [StrategyType.MI]: `양가감정 — 양면 반영 중심. 한쪽 편만 들지 마세요.`,
  [StrategyType.SUPPORT]: `기본 공감. 반영 중심. 단, ACTION 단계라면 구체적 해결책도 제안하세요!`,
};

const STRATEGY_HINTS_FRIEND: Record<StrategyType, string> = {
  [StrategyType.CRISIS_SUPPORT]: `🚨 분석/조언/질문 하지 마. 그냥 옆에 있어줘.
📞 1393 전화하면 24시간 상담 가능해. 2-3줄.`,
  [StrategyType.CALMING]: `진짜 격해져 있어. 감정 반영 먼저. 짧게.`,
  [StrategyType.CBT]: `좀 안 좋은 쪽으로만 생각하는 것 같아. 반영 먼저 → 부드럽게.`,
  [StrategyType.ACT]: `감정을 억누르는 것 같아. "느끼는 거 괜찮아" 메시지.`,
  [StrategyType.MI]: `마음이 왔다갔다. 양면 반영!`,
  [StrategyType.SUPPORT]: `기본 공감. 반영 위주. 단, 해결책 단계면 구체적 제안도 해줘!`,
};

// ── 안전 가이드라인 ──

const GUARDRAILS_COUNSELOR = `[안전 규칙]
- 진단/라벨링 금지
- 단정/판단 금지 ("걔 안 사랑해" ❌)
- 상대방 악마화 금지
- 의학적/법적 조언 금지
- 단, 해결책 단계에서는 구체적 행동 제안 허용! ("이렇게 말해보시는 건 어떨까요?")`;

const GUARDRAILS_FRIEND = `[안전 규칙]
- 진단 금지 ("가스라이팅 피해자" ❌)
- 단정 금지 ("걔가 널 안 사랑해" ❌)
- 상대방 나쁜 놈 만들지 마
- 의학/법적 조언 금지
- 단, 해결책 단계면 "이렇게 해봐" 식 제안 OK!`;

// ── PromptGenerator v3 ──

export class PromptGenerator {
  private static instance: PromptGenerator;

  static getInstance(): PromptGenerator {
    if (!PromptGenerator.instance) {
      PromptGenerator.instance = new PromptGenerator();
    }
    return PromptGenerator.instance;
  }

  generate(
    state: StateResult,
    strategy: StrategyResult,
    ragContext: string = '',
    persona: PersonaMode = 'counselor',
    turnCount: number = 0,
    showSuggestions: boolean = true,
    /** v3: 심리학 기반 응답 모드 */
    responseMode?: ResponseMode,
    /** 감정 메모리 요약 */
    emotionalMemory?: string,
    /** 🆕 v4: 대화 단계 (파이프라인에서 결정) */
    phase?: ConversationPhase,
    /** 🆕 v4: 허락 질문 삽입할지 */
    askPermission: boolean = false,
    /** 🆕 v6: 해결책 사전 프롬프트 */
    solutionPrompt: string = '',
  ): string {
    // 패널 모드
    if (persona === 'panel') {
      return this.buildPanelPrompt(state, strategy, ragContext);
    }

    const role = getPersonaRole(persona);
    const isFriend = persona === 'friend';

    // 대화 단계: v4에서는 파이프라인이 결정, fallback은 턴 기반
    const currentPhase: ConversationPhase = phase ?? (turnCount <= 3 ? 'EXPLORATION' : turnCount <= 6 ? 'COMFORTING' : 'ACTION');
    const phasePrompt = getPhasePrompt(currentPhase, persona);
    const emotionTone = getEmotionTonePrompt(state.emotionScore, persona, currentPhase);
    const stateContext = this.buildStateContext(state, ragContext);
    const strategyHints = isFriend ? STRATEGY_HINTS_FRIEND : STRATEGY_HINTS_COUNSELOR;
    const instructions = strategyHints[strategy.strategyType];
    const guardrails = isFriend ? GUARDRAILS_FRIEND : GUARDRAILS_COUNSELOR;

    // v3: 심리학 기반 모드 프롬프트 (유지)
    let modeInstruction = '';
    if (responseMode) {
      modeInstruction = getModePrompt(responseMode, persona);

      // 양가감정 특수 처리
      if (state.intent?.primaryIntent === ClientIntent.EXPRESSING_AMBIVALENCE) {
        modeInstruction += getAmbivalencePrompt(ClientIntent.EXPRESSING_AMBIVALENCE, persona);
      }
    }

    // 🆕 v4: Gottman 해독제
    const gottmanPrompt = getGottmanAntidotePrompt(
      state.horsemenDetected ?? [],
      persona
    );

    // 🆕 v4: SFBT 기법 (해결책 단계에서만)
    const sfbtPrompt = getSFBTPrompt(currentPhase, persona);

    // 🆕 v4: 허락 질문
    const permissionPrompt = askPermission ? getPermissionPrompt(persona) : '';

    // 🆕 v5: 애착유형별 응답 톤
    const attachmentPrompt = getAttachmentPrompt(
      state.attachmentType ?? AttachmentType.UNKNOWN,
      persona
    );

    // 🆕 v5: 연애 시나리오별 개입
    const scenarioPrompt = getScenarioPrompt(
      state.scenario ?? RelationshipScenario.GENERAL,
      persona
    );

    // 🆕 v5: 메시지 초안 (ACTION 단계에서만)
    const draftPrompt = currentPhase === 'ACTION'
      ? getDraftMessagePrompt(persona)
      : '';

    // 선택지
    const suggestions = showSuggestions
      ? getSuggestionPrompt(persona, strategy.strategyType)
      : '\n\n이번 턴에서는 [SUGGESTIONS] 선택지를 생성하지 마세요.';

    // 감정 메모리
    const memorySection = emotionalMemory
      ? `\n## 지금까지의 대화 흐름\n${emotionalMemory}`
      : '';

    // 친구모드 리마인더
    const friendReminder = isFriend
      ? `\n\n## ⚠️ 절대 규칙\n반드시 반말로. 존댓말 사용 절대 금지. 카톡 친구한테 말하듯 짧게.`
      : '';

    return `${role}
${friendReminder}

${modeInstruction}

${phasePrompt}
${emotionTone}
${attachmentPrompt}
${scenarioPrompt}
${solutionPrompt}
${gottmanPrompt}
${sfbtPrompt}
${permissionPrompt}
${draftPrompt}

## 현재 사용자 상태
${stateContext}
${memorySection}

## 상담 방향 (참고)
${instructions}

${guardrails}
${suggestions}`;
  }

  private buildPanelPrompt(
    state: StateResult,
    strategy: StrategyResult,
    ragContext: string
  ): string {
    const role = getPersonaRole('panel');
    const stateContext = this.buildStateContext(state, ragContext);

    return `${role}

## 현재 사용자 상태
${stateContext}

## 상담 전략: ${strategy.strategyType}

${GUARDRAILS_COUNSELOR}

반드시 아래 JSON 형식으로만 응답하세요:
{
  "counselor": { "message": "감정 반영 + 위로 (1-3줄)" },
  "analyst": { "message": "패턴 관찰 (1-3줄)" },
  "coach": { "message": "행동 제안 1가지 (1-2줄)" },
  "suggestions": ["선택지1", "선택지2", "선택지3"]
}`;
  }

  private buildStateContext(state: StateResult, ragContext: string): string {
    const parts = [
      `- 감정 점수: ${state.emotionScore}/5`,
      `- 애착 유형: ${state.attachmentType}`,
      `- 플러딩: ${state.isFlooding ? '예 (긴급)' : '아니오'}`,
    ];

    if (state.intent) {
      parts.push(`- 사용자 의도: ${state.intent.primaryIntent}${state.intent.secondaryIntent ? ` + ${state.intent.secondaryIntent}` : ''}`);
      parts.push(`- 감정 강도: ${state.intent.emotionalIntensity}`);
    }
    if (state.scenario && state.scenario !== RelationshipScenario.GENERAL) {
      parts.push(`- 🆕 연애 시나리오: ${state.scenario}`);
    }
    if (state.cognitiveDistortions.length > 0) {
      parts.push(`- 인지 왜곡: ${state.cognitiveDistortions.join(', ')}`);
    }
    if (state.horsemenDetected && state.horsemenDetected.length > 0) {
      parts.push(`- Gottman 4기수: ${state.horsemenDetected.join(', ')}`);
    }
    if (ragContext) {
      parts.push(`\n## 과거 상담 기억\n${ragContext}`);
    }

    return parts.join('\n');
  }
}
