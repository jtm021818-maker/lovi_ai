/**
 * 🆕 v8: Phase Events — 7종 이벤트 데이터 생성기
 * 
 * 각 구간에서 표시할 이벤트의 데이터를 생성
 */

import {
  PhaseEvent,
  PhaseEventType,
  EmotionThermometerData,
  InsightCardData,
  ScalingQuestionData,
  SolutionPreviewData,
  SolutionCardData,
  MessageDraftData,
  GrowthReportData,
  StateResult,
  RelationshipScenario,
} from '@/types/engine.types';
import { SolutionMatch } from '@/engines/solution-dictionary/types';

// ============================================
// 이벤트 데이터 생성기
// ============================================

/**
 * 🌡️ 감정 온도계 이벤트 생성 (HOOK 구간)
 * 
 * 🆕 v10: AI가 대화를 분석하여 먼저 감정 점수를 판단하고,
 * 유저가 틀린 부분을 조정하는 전문 상담 방식
 */
export function createEmotionThermometer(emotionScore: number = 0): PhaseEvent {
  // emotionScore는 -5 ~ +5 범위 → 0~10 스케일로 변환
  const aiScore = Math.round(Math.max(0, Math.min(10, (emotionScore + 5))));
  
  // 감정 라벨 결정
  const emotionLabel = 
    aiScore <= 2 ? '많이 힘들고 불안한 상태' :
    aiScore <= 4 ? '서운하고 답답한 마음' :
    aiScore <= 6 ? '복잡하고 혼란스러운 감정' :
    aiScore <= 8 ? '조금 불편하지만 괜찮은 편' :
    '비교적 안정된 상태';
  
  // 판단 근거
  const basis = 
    aiScore <= 2 ? '대화에서 강한 부정적 감정과 고통이 느껴졌어요' :
    aiScore <= 4 ? '서운함과 답답함이 대화에서 느껴졌어요' :
    aiScore <= 6 ? '여러 감정이 섞여 있는 것 같아요' :
    aiScore <= 8 ? '약간의 걱정이 있지만 전반적으로 괜찮아 보여요' :
    '현재 비교적 안정적인 상태로 보여요';
  
  const data: EmotionThermometerData = {
    question: '대화를 들으면서 네 감정을 이렇게 느꼈는데, 맞아?',
    minLabel: '😰 최악',
    maxLabel: '😊 괜찮아',
    currentValue: undefined,
    aiAssessedScore: aiScore,
    aiEmotionLabel: emotionLabel,
    assessmentBasis: basis,
  };
  
  return {
    type: 'EMOTION_THERMOMETER',
    phase: 'HOOK',
    data: data as unknown as Record<string, unknown>,
  };
}

/**
 * 💡 인사이트 카드 이벤트 생성 (MIRROR 구간)
 */
export function createInsightCard(
  stateResult: StateResult,
  userMessage: string,
  scenario?: RelationshipScenario,
): PhaseEvent {
  // 감정 점수를 기반으로 감정 키워드 추출
  const emotionLabel = stateResult.emotionScore <= -3
    ? '많이 힘들고 불안한 상태'
    : stateResult.emotionScore <= -1
    ? '서운하고 답답한 마음'
    : '복잡한 감정';
    
  // 시나리오별 인사이트
  const scenarioInsight: Record<string, string> = {
    [RelationshipScenario.READ_AND_IGNORED]: '소통 기대치가 서로 다를 수 있어',
    [RelationshipScenario.GHOSTING]: '상대의 잠수는 네 잘못이 아닐 수 있어',
    [RelationshipScenario.JEALOUSY]: '불안이 질투로 표현되고 있는 것 같아',
    [RelationshipScenario.LONG_DISTANCE]: '거리가 만드는 불안은 자연스러운 거야',
    [RelationshipScenario.INFIDELITY]: '신뢰가 깨진 상처는 정말 크지',
    [RelationshipScenario.BREAKUP_CONTEMPLATION]: '떠나고 싶은 마음과 남고 싶은 마음이 동시에 있을 수 있어',
    [RelationshipScenario.BOREDOM]: '권태기는 관계의 자연스러운 단계야',
    [RelationshipScenario.GENERAL]: '네 마음에 귀 기울이고 있어',
  };
  
  const data: InsightCardData = {
    title: '관계 패턴 분석',
    situation: userMessage.length > 40 ? userMessage.substring(0, 40) + '...' : userMessage,
    emotion: emotionLabel,
    pattern: stateResult.horsemenDetected?.length
      ? `가트맨 패턴 감지: ${stateResult.horsemenDetected.join(', ')}`
      : '관계 패턴 분석 중',
    scenario: scenario ?? RelationshipScenario.GENERAL,
    duration: '최근 대화 기반',
    emotions: [emotionLabel, ...(stateResult.horsemenDetected || [])],
    insight: scenarioInsight[scenario ?? RelationshipScenario.GENERAL] ?? scenarioInsight[RelationshipScenario.GENERAL],
    choices: [
      { label: '더 자세히 들려줘', value: 'tell_more' },
      { label: '맞아! 그래서...', value: 'agree' },
    ],
  };
  
  return {
    type: 'INSIGHT_CARD',
    phase: 'MIRROR',
    data: data as unknown as Record<string, unknown>,
  };
}

/**
 * 📊 스케일링 질문 이벤트 생성 (BRIDGE 구간)
 */
export function createScalingQuestion(scenario?: RelationshipScenario): PhaseEvent {
  const scenarios: Record<string, string> = {
    [RelationshipScenario.READ_AND_IGNORED]: '이 읽씹 상황의 스트레스가',
    [RelationshipScenario.GHOSTING]: '잠수로 인한 스트레스가',
    [RelationshipScenario.JEALOUSY]: '질투로 인한 스트레스가',
    default: '이 상황의 스트레스가',
  };
  
  const data: ScalingQuestionData = {
    question: `${scenarios[scenario ?? 'default'] ?? scenarios.default} 1~10 중 몇 점이야?`,
    minLabel: '😰 1점 (견디기 힘들어)',
    maxLabel: '😊 10점 (완전 괜찮아)',
    currentScore: undefined,
    followUpQuestion: '1점 줄이려면 뭘 해볼 수 있을까?',
    options: ['메시지 보내기', '기다려보기', '직접 만나기', '모르겠어'],
  };
  
  return {
    type: 'SCALING_QUESTION',
    phase: 'BRIDGE',
    data: data as unknown as Record<string, unknown>,
  };
}

/**
 * 🔮 솔루션 프리뷰 이벤트 생성 (BRIDGE 구간)
 */
export function createSolutionPreview(
  solutionCount: number,
  diagnosisComplete: boolean,
  axisFilledCount: number,
): PhaseEvent {
  const completedSteps: string[] = ['상황 분석 완료'];
  if (axisFilledCount >= 2) completedSteps.push('핵심 패턴 파악');
  if (diagnosisComplete) completedSteps.push('심리학 프레임워크 매칭');
  
  const data: SolutionPreviewData = {
    title: '해결책 준비 완료',
    completedSteps,
    strategyCount: solutionCount,
    teaser: '도움이 될 방법을 알려줄까?',
    choices: [
      { label: '응 궁금해!', value: 'yes_curious' },
      { label: '좀 더 얘기하고', value: 'talk_more' },
    ],
  };
  
  return {
    type: 'SOLUTION_PREVIEW',
    phase: 'BRIDGE',
    data: data as unknown as Record<string, unknown>,
  };
}

/**
 * 🎯 솔루션 카드 이벤트 생성 (SOLVE 구간)
 */
export function createSolutionCard(match: SolutionMatch): PhaseEvent {
  const { entry } = match;
  
  const data: SolutionCardData = {
    title: '맞춤형 관계 회복 전략',
    frameworkName: entry.solution.framework,
    rationale: entry.solution.steps.validation,
    hasDraft: !!entry.solution.messageDrafts?.length || !!entry.solution.iMessageTemplate,
    steps: [
      { name: '1단계: 통찰', description: entry.solution.steps.insight },
      { name: '2단계: 행동', description: '구체적인 액션 플랜', action: entry.solution.steps.action },
    ],
    choices: [
      { label: '카톡 초안 보기', value: 'view_drafts' },
      { label: '다른 방법도', value: 'other_solutions' },
    ],
  };
  
  return {
    type: 'SOLUTION_CARD',
    phase: 'SOLVE',
    data: data as unknown as Record<string, unknown>,
  };
}

/**
 * 💬 메시지 초안 이벤트 생성 (SOLVE 구간)
 */
export function createMessageDraft(match: SolutionMatch): PhaseEvent {
  const drafts = (match.entry.solution.messageDrafts ?? []).map((content, i) => ({
    intent: `초안 ${String.fromCharCode(65 + i)}`,
    text: content,
  }));
  
  // I-message 템플릿도 추가
  if (match.entry.solution.iMessageTemplate) {
    drafts.push({
      intent: '나 전달법 (I-message) 템플릿',
      text: match.entry.solution.iMessageTemplate,
    });
  }
  
  const data: MessageDraftData = { 
    title: '이렇게 카톡을 보내보는 건 어때요?',
    drafts 
  };
  
  return {
    type: 'MESSAGE_DRAFT',
    phase: 'SOLVE',
    data: data as unknown as Record<string, unknown>,
  };
}

/**
 * 📈 성장 리포트 이벤트 생성 (EMPOWER 구간)
 */
export function createGrowthReport(
  emotionBefore: number,
  emotionAfter: number,
  discoveries: string[],
  actionPlan: string[],
): PhaseEvent {
  const data: GrowthReportData = {
    title: '대화가 마무리되었어요',
    beforeScore: emotionBefore,
    afterScore: emotionAfter,
    pointDifference: emotionAfter - emotionBefore,
    keyDiscoveries: discoveries,
    actionPlan,
  };
  
  return {
    type: 'GROWTH_REPORT',
    phase: 'EMPOWER',
    data: data as unknown as Record<string, unknown>,
  };
}
