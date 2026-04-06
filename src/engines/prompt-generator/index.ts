/**
 * 프롬프트 생성기 v4 — 연애 특화 3단계 프로세스 + 심리학 기반 응답 매핑
 *
 * v3 유지: 의도→모드 매핑, 12가지 모드 프롬프트, 전략 힌트
 * v4 추가: Gottman 해독제, SFBT 기법, 허락 질문, 단계별 구체적 지시
 */

import { StateResult, StrategyResult, StrategyType, ResponseMode, ClientIntent, HorsemenType, AttachmentType, RelationshipScenario, DistortionType } from '@/types/engine.types';
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

const STRATEGY_HINTS_LUNA: Record<StrategyType, string> = {
  [StrategyType.CRISIS_SUPPORT]: `🚨 분석/조언/질문 하지 마. 그냥 옆에 있어줘.
📞 자살예방상담전화 1393, 정신건강위기상담전화 1577-0199
2-3줄 이내.`,
  [StrategyType.CALMING]: `감정이 격해진 상태. 감정 반영 먼저 해주고 안정화 제안 할 수 있어.`,
  [StrategyType.CBT]: `극단적 사고 감지 — 감정 반영 후, 부드럽게 다른 시각 제시. 전문용어 금지.`,
  [StrategyType.ACT]: `감정 억압 감지 — 감정을 느끼는 것 자체가 괜찮다는 수용 메시지.`,
  [StrategyType.MI]: `양가감정 — 양면 반영 중심. 한쪽 편만 들지 마.`,
  [StrategyType.SUPPORT]: `기본 공감. 반영 중심. 단, ACTION 단계라면 구체적 해결책도 제안해!`,
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

const GUARDRAILS_LUNA = `[안전 규칙]
- 진단/라벨링 금지 ("가스라이팅" ❌)
- 단정/판단 금지 ("걔가 널 안 사랑해" ❌)
- 상대방 악마화 금지
- 의학적/법적 조언 금지
- 단, 해결책 단계에서는 "이렇게 해보는 건 어때?" 식 제안 OK!`;

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
    /** 🆕 v16: 유저 메시지 길이 (응답 길이 적응용) */
    userMessageLength: number = 50,
    /** 🆕 v22: 마지막 스티커 사용 턴 (빈도 제어) */
    lastStickerTurn: number = -99,
  ): string {
    // 패널 모드
    if (persona === 'panel') {
      return this.buildPanelPrompt(state, strategy, ragContext);
    }

    const role = getPersonaRole(persona);
    const isFriend = persona === 'friend';
    const isLuna = persona === 'luna';

    // 대화 단계: v4에서는 파이프라인이 결정, fallback은 턴 기반
    const currentPhase: ConversationPhase = phase ?? (turnCount <= 3 ? 'EXPLORATION' : turnCount <= 6 ? 'COMFORTING' : 'ACTION');
    const phasePrompt = getPhasePrompt(currentPhase, persona);
    const emotionTone = getEmotionTonePrompt(state.emotionScore, persona, currentPhase);
    const stateContext = this.buildStateContext(state, ragContext);
    const strategyHints = isLuna ? STRATEGY_HINTS_LUNA : isFriend ? STRATEGY_HINTS_FRIEND : STRATEGY_HINTS_COUNSELOR;
    const instructions = strategyHints[strategy.strategyType];
    const guardrails = isLuna ? GUARDRAILS_LUNA : isFriend ? GUARDRAILS_FRIEND : GUARDRAILS_COUNSELOR;

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

    // 🆕 v22: 스티커 빈도 제어 (3턴 간격, 루나 전용, 연속 중복 방지)
    const stickerAllowed = isLuna && (turnCount - lastStickerTurn >= 3);
    const lastUsedStickerId: string | undefined = (state as any)?.lastStickerId;
    const stickerPromptSection = isLuna
      ? stickerAllowed
        ? `\n\n## 🎨 스티커 사용 가능\n이번 턴에서는 루나 캐릭터 스티커를 사용할 수 있어. 적절한 순간이면 응답 맨 끝에 [STICKER:id] 1개만 넣어. 사용하지 않아도 돼 — 자연스러운 순간에만.${lastUsedStickerId ? `\n⚠️ 직전에 "${lastUsedStickerId}" 스티커를 사용했으니 이번에는 다른 스티커를 골라.` : ''}`
        : '\n\n## 🎨 스티커 사용 불가\n이번 턴에서는 [STICKER:] 태그를 절대 사용하지 마.'
      : '';

    // 감정 메모리
    const memorySection = emotionalMemory
      ? `\n## 지금까지의 대화 흐름\n${emotionalMemory}`
      : '';

    // 🆕 v20: 응답 길이 적응 시스템 (연구 기반: BetterMood — 짧은 응답이 더 대화적이고 인간적)
    const isEarlyPhase = currentPhase === 'EXPLORATION';
    const lengthGuide = isLuna || isFriend
      ? userMessageLength <= 20
        ? '\n\n## 📏 응답 길이\n유저가 아주 짧게 말했어 → 너도 1~2문장만. "아... 그거 진짜 서운했겠다" 수준. 장문 절대 금지!'
        : userMessageLength <= 50
        ? `\n\n## 📏 응답 길이\n유저가 짧게 말했어 → 최대 2~3문장.${isEarlyPhase ? ' 반영 1문장 + 질문 1개만.' : ''}`
        : userMessageLength <= 100
        ? `\n\n## 📏 응답 길이\n유저가 중간 길이로 말했어 → 최대 3~4문장. 핵심 감정 1개만 깊이.${isEarlyPhase ? ' 분석/해석 금지.' : ''}`
        : `\n\n## 📏 응답 길이\n유저가 많이 말했어 → 최대 4~5문장. 하지만 유저보다 항상 짧게! 핵심만.`
      : '';

    // 🆕 v20: 부드러운 도전 시스템 (Anti-Sycophancy)
    // 연구 근거: 아첨형 AI는 사용자가 전문 도움을 구하지 못하게 만듦 (2025 AI counseling critique)
    // MIRROR 이후 + 인지 왜곡 2개+ 또는 양가감정 시 활성화
    let gentleChallengePrompt = '';
    const distortions = state.cognitiveDistortions ?? [];
    const isPostHook = currentPhase !== 'EXPLORATION';
    if (isPostHook && distortions.length >= 2) {
      gentleChallengePrompt = `\n\n## 🪞 부드러운 도전 (Anti-Sycophancy)
인지 왜곡이 감지됐어: [${distortions.join(', ')}]
무조건 동의하지 마. 먼저 충분히 공감한 뒤, 아래 기법 중 1개만 자연스럽게 사용해:
- 소크라테스 질문: "혹시 다른 가능성은 없을까?" / "그렇게 확신하는 근거가 있어?"
- 패턴 반영: "이런 패턴이 반복되는 것 같은데, 어떻게 생각해?"
- 관점 전환: "상대 입장에서 보면 어떤 상황이었을 수도 있을까?"
- IFS 파츠: "한쪽에서는 ~하고 싶은데, 다른 한쪽에서는 ~인 것 같아. 둘 다 네 마음이야."
⚠️ 공감 70% + 도전 30% 비율. 도전이 먼저 나오면 안 돼!`;
    }

    // 🆕 v20: 소크라테스 질문 엔진 (인지 왜곡별 맞춤 질문)
    // 연구 근거: 직접 지적보다 자기 발견이 변화 지속성 3배 (CBT 핵심 기법)
    let socraticPrompt = '';
    if (isPostHook && distortions.length > 0) {
      const socraticQuestions: string[] = [];
      if (distortions.includes(DistortionType.MIND_READING)) socraticQuestions.push('"상대가 정말 그렇게 생각하는 건지 직접 확인해봤어?"');
      if (distortions.includes(DistortionType.ALL_OR_NOTHING)) socraticQuestions.push('"중간 지점은 없을까? 0 아니면 100인 건 아닐 수도 있어"');
      if (distortions.includes(DistortionType.OVERGENERALIZATION)) socraticQuestions.push('"정말 맨날 그런 건지, 최근에 특히 그런 건지 구분해볼까?"');
      if (distortions.includes(DistortionType.CATASTROPHIZING)) socraticQuestions.push('"최악의 시나리오가 실제로 일어날 확률은 어떤 것 같아?"');
      if (distortions.includes(DistortionType.PERSONALIZATION)) socraticQuestions.push('"혹시 그게 전부 네 탓은 아닐 수도 있지 않을까?"');
      if (distortions.includes(DistortionType.EMOTIONAL_REASONING)) socraticQuestions.push('"지금 느끼는 감정이 사실과 같다고 할 수 있을까?"');
      if (distortions.includes(DistortionType.SHOULD_STATEMENTS)) socraticQuestions.push('"꼭 그래야만 하는 건지, 네가 그러길 바라는 건지 구분해볼까?"');
      if (socraticQuestions.length > 0) {
        socraticPrompt = `\n\n## 💭 소크라테스 질문 (자연스럽게 1개만 사용)
공감 반영 후, 이 중 상황에 맞는 질문 1개를 자연스럽게 던져봐:
${socraticQuestions.join('\n')}
⚠️ 직접 지적하지 마. 유저가 스스로 깨달을 수 있게 질문해.`;
      }
    }

    // 🆕 v20: 감정 강도 (여러 섹션에서 사용)
    const emotionalIntensity = state.intent?.emotionalIntensity ?? 'medium';

    // 🆕 v20: Narrative/Schema/Polyvagal 치료 기법 통합
    // 연구 근거: Schema Therapy > ACT at reconnection (2025), IFS scoping review (2025), Polyvagal (Porges)
    let advancedTherapyPrompt = '';
    if (isPostHook) {
      const parts: string[] = [];

      // Narrative Therapy — 반복 스토리텔링 감지 시
      if (state.intent?.primaryIntent === ClientIntent.STORYTELLING && turnCount >= 4) {
        parts.push(`🔖 **내러티브 기법**: 유저가 같은 이야기를 반복하고 있어. "그 이야기에서 네가 원하는 건 뭐였어?" 같은 질문으로 스토리를 재구성하도록 도와줘. 문제를 외재화해: "그 패턴이 너를 지배하는 것 같아" (유저 탓이 아님).`);
      }

      // Schema Therapy — 반복 패턴 + 높은 감정 강도
      if (distortions.length >= 1 && (emotionalIntensity === 'high' || turnCount >= 6)) {
        parts.push(`🧩 **스키마 인식**: 반복되는 패턴이 보여. "혹시 이런 느낌이 예전에도 있었어?" "이 반응이 익숙한 느낌이야?" 같은 질문으로 패턴의 뿌리를 탐색해. 단, 진단하지 마. 유저가 스스로 연결짓도록.`);
      }

      // Polyvagal Theory — 신체 반응 언급 시 또는 flooding 시
      if (state.isFlooding || (state.linguisticProfile?.isSuppressive && emotionalIntensity !== 'low')) {
        parts.push(`🫀 **신경계 반응 인식**: 유저가 감정적으로 압도되거나 억압 중이야. "지금 몸에서 어떤 느낌이 들어? 가슴이 답답하거나 손이 차갑거나?" 같은 질문으로 신체 감각을 인식하도록 도와줘. "그건 네 신경계가 위험 신호를 보내는 거야. 정상적인 반응이야."`);
      }

      if (parts.length > 0) {
        advancedTherapyPrompt = `\n\n## 🧠 심화 치료 기법 (상황에 맞는 것 1개만 자연스럽게 사용)\n${parts.join('\n\n')}
⚠️ 전문 용어 쓰지 마. 자연스러운 대화체로. 여러 기법 동시 사용 금지.`;
      }
    }

    // 🆕 v20: 유머 & 루나 캐릭터 강화
    // 연구 근거: SLAP 기법 (Surprise, Light-heartedness, Absurdity, Perspective). 유머는 신뢰와 라포 형성에 핵심.
    let humorPrompt = '';
    if ((isLuna || isFriend) && (emotionalIntensity === 'low' || emotionalIntensity === 'medium') && strategy.strategyType !== StrategyType.CRISIS_SUPPORT) {
      humorPrompt = `\n\n## 😂 유머 허용
감정 강도가 낮거나 중간이야. 적절한 유머를 가끔 사용해:
- 비유: "그거 완전 넷플릭스 드라마 전개인데 ㅋㅋ"
- 관점 전환: "근데 생각해보면 읽씹도 일종의 대답이긴 해... '지금은 아니야'라는 😂"
- 가벼운 공감: "ㅋㅋㅋ 그건 진짜 화날 만하다"
⚠️ 절대 유저를 놀리는 유머 금지. 상황을 가볍게 보는 유머만. 매번 쓰지 마, 가끔만.`;
    }

    // 루나/친구모드 리마인더
    const personaReminder = isLuna
      ? `\n\n## ⚠️ 절대 규칙\n루나의 해요체 하이브리드 말투를 유지해. 완전 존댓말(하셨군요, 해볼까요?) 금지. 완전 반말(야! 뛰야) 과도 사용 금지. 언니한테 카톡 보내는 느낌으로. 🦊`
      : isFriend
      ? `\n\n## ⚠️ 절대 규칙\n반드시 반말로. 존댓말 사용 절대 금지. 카톡 친구한테 말하듯 짧게.`
      : '';

    return `${role}
${personaReminder}
${lengthGuide}
${humorPrompt}

${modeInstruction}
${gentleChallengePrompt}
${socraticPrompt}
${advancedTherapyPrompt}

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
${suggestions}
${stickerPromptSection}`;
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
