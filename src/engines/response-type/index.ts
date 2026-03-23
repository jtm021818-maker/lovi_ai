/**
 * 연애 특화 심리학 기반 응답 매핑 엔진 v4
 *
 * Hill HCVRMCS + SFBT + Gottman Method 융합
 *
 * ❌ v3: 의도→모드 매핑만 (공감 무한 반복)
 * ✅ v4: 탐색→분석→해결책 3단계 프로세스 + 단계별 응답 모드 필터링
 *
 * "연애 상담 앱이니까 해결책까지 줘야 의미가 있다"
 */

import {
  ClientIntent,
  ResponseMode,
  IntentResult,
  type ConversationPhase,
  StrategyType,
  HorsemenType,
} from '@/types/engine.types';

// ── 의도 → 응답 모드 기본 매핑 ─────────────────────

interface ResponseMapping {
  primary: ResponseMode;
  secondary: ResponseMode;
  forbidden: ResponseMode[];
}

const INTENT_RESPONSE_MAP: Record<ClientIntent, ResponseMapping> = {
  [ClientIntent.VENTING]: {
    primary: ResponseMode.REFLECTION,
    secondary: ResponseMode.PRESENCE,
    forbidden: [ResponseMode.OPEN_QUESTION, ResponseMode.CHALLENGE, ResponseMode.DIRECT_GUIDANCE],
  },
  [ClientIntent.STORYTELLING]: {
    primary: ResponseMode.RESTATEMENT,
    secondary: ResponseMode.MINIMAL_ENCOURAGER,
    forbidden: [ResponseMode.CHALLENGE, ResponseMode.INTERPRETATION],
  },
  [ClientIntent.SEEKING_VALIDATION]: {
    primary: ResponseMode.APPROVAL,
    secondary: ResponseMode.REFLECTION,
    forbidden: [ResponseMode.CHALLENGE, ResponseMode.OPEN_QUESTION],
  },
  [ClientIntent.SEEKING_ADVICE]: {
    primary: ResponseMode.REFLECTION,
    secondary: ResponseMode.INFORMATION,
    forbidden: [ResponseMode.PRESENCE, ResponseMode.MINIMAL_ENCOURAGER],
  },
  [ClientIntent.EXPRESSING_AMBIVALENCE]: {
    primary: ResponseMode.REFLECTION,
    secondary: ResponseMode.CHALLENGE,
    forbidden: [ResponseMode.DIRECT_GUIDANCE],
  },
  [ClientIntent.INSIGHT_EXPRESSION]: {
    primary: ResponseMode.APPROVAL,
    secondary: ResponseMode.INTERPRETATION,
    forbidden: [ResponseMode.OPEN_QUESTION],
  },
  [ClientIntent.RESISTANCE]: {
    primary: ResponseMode.MINIMAL_ENCOURAGER,
    secondary: ResponseMode.RESTATEMENT,
    forbidden: [ResponseMode.CHALLENGE, ResponseMode.DIRECT_GUIDANCE, ResponseMode.INTERPRETATION],
  },
  [ClientIntent.MINIMAL_RESPONSE]: {
    primary: ResponseMode.OPEN_QUESTION,
    secondary: ResponseMode.SELF_DISCLOSURE,
    forbidden: [ResponseMode.REFLECTION],
  },
};

// ── 🆕 단계별 허용/금지 응답 모드 ─────────────────

/**
 * EXPLORATION (탐색 1~3턴): 반영 위주. 분석/제안 금지!
 * COMFORTING  (분석 4~6턴): 패턴 지적 + 허락 질문. 직접 제안은 아직 금지
 * ACTION     (해결 7턴~): 구체적 행동 제안 가능!
 */
const PHASE_ALLOWED_MODES: Record<ConversationPhase, {
  allowed: ResponseMode[];
  forbidden: ResponseMode[];
}> = {
  EXPLORATION: {
    allowed: [
      ResponseMode.REFLECTION,
      ResponseMode.RESTATEMENT,
      ResponseMode.MINIMAL_ENCOURAGER,
      ResponseMode.OPEN_QUESTION,
      ResponseMode.APPROVAL,
      ResponseMode.PRESENCE,
    ],
    forbidden: [
      ResponseMode.CHALLENGE,
      ResponseMode.INTERPRETATION,
      ResponseMode.DIRECT_GUIDANCE,
      ResponseMode.INFORMATION,
    ],
  },
  COMFORTING: {
    allowed: [
      ResponseMode.REFLECTION,
      ResponseMode.RESTATEMENT,
      ResponseMode.OPEN_QUESTION,
      ResponseMode.CHALLENGE,        // 부드러운 도전 가능
      ResponseMode.INTERPRETATION,   // 패턴 분석 가능
      ResponseMode.APPROVAL,
      ResponseMode.SELF_DISCLOSURE,
      ResponseMode.IMMEDIACY,
    ],
    forbidden: [
      ResponseMode.DIRECT_GUIDANCE, // 아직 직접 제안은 금지!
    ],
  },
  ACTION: {
    allowed: [
      // 전부 허용!
      ResponseMode.REFLECTION,
      ResponseMode.RESTATEMENT,
      ResponseMode.OPEN_QUESTION,
      ResponseMode.APPROVAL,
      ResponseMode.SELF_DISCLOSURE,
      ResponseMode.CHALLENGE,
      ResponseMode.INTERPRETATION,
      ResponseMode.IMMEDIACY,
      ResponseMode.INFORMATION,
      ResponseMode.DIRECT_GUIDANCE,  // ✅ 이제 해결책 가능!
      ResponseMode.PRESENCE,
      ResponseMode.MINIMAL_ENCOURAGER,
    ],
    forbidden: [],
  },
};

// ── 🆕 연애 특화 단계 자동 전이 ─────────────────

export interface PhaseContext {
  turnCount: number;
  intent: ClientIntent;
  /** 같은 감정 2회 반복됐는지 */
  sameEmotionRepeated: boolean;
  /** 사용자가 조언을 요청했는지 ("어떻게 해?") */
  hasAskedForAdvice: boolean;
  /** 사용자가 허락했는지 ("응 해봐") */
  hasGivenPermission: boolean;
  /** 인사이트를 표현했는지 ("아 맞다...") */
  hasExpressedInsight: boolean;
  /** 감정 점수 */
  emotionScore: number;
  /** 🆕 v6: readiness 점수 (0~100) — 해결책 사전 기반 */
  readinessScore?: number;
}

/**
 * 연애 특화 대화 단계 결정
 *
 * 일반 상담 = 10회기에 걸쳐 서서히 진행
 * 연애 앱 = 1세션(10-15턴) 내에 완결!
 */
export function determineRelationshipPhase(ctx: PhaseContext): ConversationPhase {
  const readiness = ctx.readinessScore ?? 0;

  // ── 위기 상황 — 조언 요청이 없으면 EXPLORATION 유지 ──
  if (ctx.emotionScore <= -4) {
    // 🆕 v6: 위기여도 readiness 높으면 ACTION (공감+해결 동시)
    if (readiness >= 70 && ctx.turnCount >= 2) return 'ACTION';
    if (ctx.hasAskedForAdvice && ctx.turnCount >= 2) return 'ACTION';
    if (ctx.turnCount >= 7) return 'ACTION';
    return 'EXPLORATION';
  }

  // 🆕 v6: 콘텐츠 기반 전이 — readiness 높으면 즉시 ACTION!
  if (readiness >= 70 && ctx.turnCount >= 2) return 'ACTION';
  if (readiness >= 40) return 'COMFORTING';

  // ── 즉시 ACTION: 명시적 조언 요청 + 최소 2턴 경과 ──
  if (ctx.hasAskedForAdvice && ctx.turnCount >= 2) return 'ACTION';

  // ── ACTION (해결책 단계) ──
  if (ctx.turnCount >= 7) return 'ACTION';
  if (ctx.hasGivenPermission) return 'ACTION';
  if (ctx.hasExpressedInsight && ctx.turnCount >= 5) return 'ACTION';

  // ── COMFORTING (분석 단계) ──
  if (ctx.turnCount >= 3) return 'COMFORTING';
  if (ctx.sameEmotionRepeated) return 'COMFORTING';

  // ── EXPLORATION (탐색 단계) ──
  return 'EXPLORATION';
}

// 이전 함수명 호환
export function determineConversationPhase(
  turnCount: number,
  emotionScore: number,
  hasInsightOccurred: boolean,
): ConversationPhase {
  return determineRelationshipPhase({
    turnCount,
    emotionScore,
    intent: ClientIntent.VENTING,
    sameEmotionRepeated: false,
    hasAskedForAdvice: false,
    hasGivenPermission: false,
    hasExpressedInsight: hasInsightOccurred,
  });
}

// ── 🆕 허락 질문 필요 여부 ─────────────────

/**
 * 분석(COMFORTING) 단계에서 2턴 이상 → 허락 질문 삽입
 * "도움이 될 만한 방법 하나 이야기해봐도 될까?"
 */
export function shouldAskPermission(
  phase: ConversationPhase,
  turnCount: number,
  hasAlreadyAsked: boolean,
): boolean {
  if (hasAlreadyAsked) return false;
  if (phase !== 'COMFORTING') return false;
  return turnCount >= 5; // 분석 단계(3~) 진입 후 2턴(5~)
}

// ── 메인 매핑 함수 (v4) ─────────────────

export interface TherapeuticResponse {
  mode: ResponseMode;
  phase: ConversationPhase;
  reason: string;
  fallbackMode?: ResponseMode;
  /** 허락 질문 삽입할지 */
  shouldAskPermission: boolean;
}

/**
 * 심리학 기반 응답 매핑 v4 — 연애 특화 3단계 프로세스
 */
export function mapTherapeuticResponse(
  intent: IntentResult,
  phase: ConversationPhase,
  strategy: StrategyType,
  emotionScore: number,
  lastMode?: ResponseMode,
  horsemen: HorsemenType[] = [],
): TherapeuticResponse {
  // ── 1. 위기 → PRESENCE ──
  if (intent.emotionalIntensity === 'crisis') {
    return {
      mode: ResponseMode.PRESENCE,
      phase,
      reason: '감정 위기 — 순수 존재/공감만',
      shouldAskPermission: false,
    };
  }

  // ── 2. 기본 매핑 ──
  const mapping = INTENT_RESPONSE_MAP[intent.primaryIntent];
  let selectedMode = mapping.primary;

  // ── 3. 🆕 단계별 조절 (연애 특화) ──
  if (phase === 'EXPLORATION') {
    // 탐색 단계: 반영 위주, 분석/제안 완전 금지
    if (intent.primaryIntent === ClientIntent.SEEKING_ADVICE) {
      selectedMode = ResponseMode.REFLECTION; // 조언 요청에도 먼저 공감
    }
    // Guidance/Challenge/Interpretation → 반영으로 강제 다운그레이드
    if ([ResponseMode.DIRECT_GUIDANCE, ResponseMode.CHALLENGE,
         ResponseMode.INTERPRETATION, ResponseMode.INFORMATION].includes(selectedMode)) {
      selectedMode = ResponseMode.REFLECTION;
    }
  }

  if (phase === 'COMFORTING') {
    // 분석 단계: 패턴 지적 + 부드러운 도전 + 열린 질문
    if (intent.primaryIntent === ClientIntent.SEEKING_ADVICE) {
      selectedMode = ResponseMode.INTERPRETATION; // 분석 먼저!
    }
    if (intent.primaryIntent === ClientIntent.STORYTELLING) {
      selectedMode = ResponseMode.INTERPRETATION; // 상황→패턴 분석
    }
    // 직접 제안은 아직 금지
    if (selectedMode === ResponseMode.DIRECT_GUIDANCE) {
      selectedMode = ResponseMode.INTERPRETATION;
    }
  }

  if (phase === 'ACTION') {
    // 해결책 단계: 구체적 행동 제안!
    if (intent.primaryIntent === ClientIntent.SEEKING_ADVICE) {
      selectedMode = ResponseMode.DIRECT_GUIDANCE; // 직접 제안!
    }
    if (intent.primaryIntent === ClientIntent.INSIGHT_EXPRESSION) {
      selectedMode = ResponseMode.DIRECT_GUIDANCE; // 깨달음 → 행동 연결
    }
    if (intent.primaryIntent === ClientIntent.VENTING) {
      selectedMode = ResponseMode.INFORMATION; // 감정 토로에도 부드러운 제안 가능
    }
  }

  // ── 4. 전략 오버라이드 ──
  if (strategy === StrategyType.CRISIS_SUPPORT) {
    selectedMode = ResponseMode.PRESENCE;
  }
  if (strategy === StrategyType.CALMING && intent.emotionalIntensity === 'high') {
    selectedMode = ResponseMode.PRESENCE;
  }

  // ── 5. 양가감정 처리 ──
  if (intent.primaryIntent === ClientIntent.EXPRESSING_AMBIVALENCE) {
    selectedMode = ResponseMode.REFLECTION;
  }

  // ── 6. 🆕 Gottman 해독제 오버라이드 ──
  if (horsemen.length > 0 && phase !== 'EXPLORATION') {
    // Gottman 4 Horsemen 감지 시 해결책 단계로 기울이기
    if (horsemen.includes(HorsemenType.CRITICISM)) {
      selectedMode = ResponseMode.DIRECT_GUIDANCE; // "부드러운 시작" 제안
    }
    if (horsemen.includes(HorsemenType.CONTEMPT)) {
      selectedMode = ResponseMode.INFORMATION; // 감사 표현 가이드
    }
    if (horsemen.includes(HorsemenType.STONEWALLING)) {
      selectedMode = ResponseMode.INFORMATION; // 자기 진정 기법
    }
  }

  // ── 7. 연속 방지 ──
  if (lastMode && selectedMode === lastMode) {
    selectedMode = mapping.secondary;
  }

  // ── 8. 🆕 단계별 금지 모드 체크 (최종 안전장치) ──
  const phaseRules = PHASE_ALLOWED_MODES[phase];
  if (phaseRules.forbidden.includes(selectedMode)) {
    // 금지된 모드면 → 해당 단계 첫 번째 허용 모드로 폴백
    selectedMode = phaseRules.allowed[0];
  }

  // 의도별 금지도 체크
  if (mapping.forbidden.includes(selectedMode)) {
    selectedMode = mapping.primary;
    // 그래도 단계 금지면 → 안전한 기본값
    if (phaseRules.forbidden.includes(selectedMode)) {
      selectedMode = ResponseMode.REFLECTION;
    }
  }

  return {
    mode: selectedMode,
    phase,
    reason: `의도:${intent.primaryIntent} 단계:${phase} → ${selectedMode}`,
    fallbackMode: mapping.secondary,
    shouldAskPermission: false, // pipeline에서 별도 체크
  };
}

// ── export ──

export { INTENT_RESPONSE_MAP, PHASE_ALLOWED_MODES };
export type { ResponseMapping };
