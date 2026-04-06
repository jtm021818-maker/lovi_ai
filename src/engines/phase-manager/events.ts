/**
 * 🆕 v8: Phase Events — 7종 이벤트 데이터 생성기
 * 
 * 각 구간에서 표시할 이벤트의 데이터를 생성
 * v14: SCALING_QUESTION → PATTERN_MIRROR 교체
 */

import {
  PhaseEvent,
  PhaseEventType,
  EmotionThermometerData,
  InsightCardData,
  EmotionMirrorData,
  PatternMirrorData,
  SolutionPreviewData,
  SolutionCardData,
  MessageDraftData,
  GrowthReportData,
  SessionSummaryData,
  HomeworkCardData,
  TarotDrawData,
  TarotAxisCollectData,
  TarotInsightData,
  StateResult,
  RelationshipScenario,
} from '@/types/engine.types';
import { drawCards, getSingleSpread, getThreeCardSpread, getLoveSpread, getUnrequitedSpread, getReconnectionSpread, getPaceSpread, getAvoidantSpread, getYesNoSpread } from '@/engines/tarot';
// spread-recommender는 pipeline에서 자동 선택용으로 사용
import { SolutionMatch } from '@/engines/solution-dictionary/types';
import {
  detectPatterns,
  detectCycle,
  selectResearchBasis,
  getDefaultPatterns,
} from './pattern-detector';
import type { DiagnosisResult } from '@/engines/relationship-diagnosis/types';

// ============================================
// 이벤트 데이터 생성기
// ============================================

/**
 * 🌡️ 감정 온도계 이벤트 생성 (HOOK 구간)
 * 
 * 🆕 v10: AI가 대화를 분석하여 먼저 감정 점수를 판단하고,
 * 유저가 틀린 부분을 조정하는 전문 상담 방식
 * 
 * 🆕 v10.2: emotionReason — AI의 실제 분석 근거를 동적으로 표시
 */
export function createEmotionThermometer(emotionScore: number = 0, emotionReason?: string): PhaseEvent {
  // emotionScore는 -5 ~ +5 범위 그대로 사용
  const aiScore = Math.round(Math.max(-5, Math.min(5, emotionScore)));
  
  // 감정 라벨 결정 (-5 ~ 5 기준)
  const emotionLabel = 
    aiScore <= -3 ? '많이 힘들고 불안한 상태' :
    aiScore <= -1 ? '서운하고 답답한 마음' :
    aiScore <= 1 ? '복잡하고 혼란스러운 감정' :
    aiScore <= 3 ? '조금 불편하지만 괜찮은 편' :
    '비교적 안정된 상태';
  
  // 🆕 v10.2: AI 실제 분석 근거 우선, 없으면 점수 기반 기본값
  const basis = emotionReason ?? (
    aiScore <= -3 ? '대화에서 강한 부정적 감정과 고통이 느껴졌어요' :
    aiScore <= -1 ? '서운함과 답답함이 대화에서 느껴졌어요' :
    aiScore <= 1 ? '여러 감정이 섞여 있는 것 같아요' :
    aiScore <= 3 ? '약간의 걱정이 있지만 전반적으로 괜찮아 보여요' :
    '현재 비교적 안정적인 상태로 보여요'
  );
  
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
  diagnosisResult?: { summary: string; keyFindings: { icon: string; label: string; description: string }[]; universal: any; diagnosisQuality: string } | null,
): PhaseEvent {
  // 감정 점수를 기반으로 감정 키워드 추출
  const emotionLabel = stateResult.emotionScore <= -3
    ? '많이 힘들고 불안한 상태'
    : stateResult.emotionScore <= -1
    ? '서운하고 답답한 마음'
    : '복잡한 감정';
    
  // 🆕 v17: 시나리오별 인사이트 — 질문형 + 개인화 (루나 톤)
  const scenarioInsight: Record<string, string> = {
    [RelationshipScenario.READ_AND_IGNORED]: '혹시... 답장 자체보다 "나를 어떻게 생각하는지"가 더 신경 쓰이는 거 아닐까? 🦊',
    [RelationshipScenario.GHOSTING]: '갑자기 사라진 거... 네 잘못이 아닐 수 있어. 혹시 "뭘 잘못했나" 자꾸 생각하고 있지 않아?',
    [RelationshipScenario.JEALOUSY]: '루나가 궁금한 건... 이게 진짜 걔한테 화난 건지, 아니면 "나를 떠날까봐" 불안한 건지? 🦊',
    [RelationshipScenario.LONG_DISTANCE]: '못 만나면 불안해지는 게 당연한 건데... 혹시 "만나면 괜찮은데 안 만나면 흔들리는" 패턴이 있어?',
    [RelationshipScenario.INFIDELITY]: '배신감이 클 텐데... 지금 가장 큰 감정이 분노인지, 슬픔인지, 아니면 "왜 나한테 이래" 그 의문인지 궁금해',
    [RelationshipScenario.BREAKUP_CONTEMPLATION]: '떠나고 싶은 마음이랑 남고 싶은 마음... 둘 다 진짜잖아. 어떤 쪽이 더 클 때가 많아?',
    [RelationshipScenario.BOREDOM]: '설렘이 줄어든 게... "걔가 싫어진 건지" 아니면 "그냥 익숙해진 건지" 어떤 것 같아?',
    [RelationshipScenario.GENERAL]: '루나가 느끼기에 네 마음속에 여러 감정이 섞여있는 것 같아 🦊',
  };

  // 🆕 v12: 진단 결과 기반 동적 데이터 (하드코딩 제거)
  let patternText = '관계 패턴 분석 중';
  let durationText = '최근 대화 기반';
  let insightText = scenarioInsight[scenario ?? RelationshipScenario.GENERAL] ?? scenarioInsight[RelationshipScenario.GENERAL];

  if (diagnosisResult && diagnosisResult.diagnosisQuality !== 'insufficient') {
    // 진단 요약 → insight로 활용
    if (diagnosisResult.summary) {
      durationText = diagnosisResult.summary;
    }
    // keyFindings → pattern으로 활용
    if (diagnosisResult.keyFindings.length > 0) {
      patternText = diagnosisResult.keyFindings.map(f => `${f.icon} ${f.label}`).join(' · ');
    }
    // Gottman 4기수 감지 시 해독제 힌트
    if (stateResult.horsemenDetected?.length) {
      patternText = `가트맨 패턴: ${stateResult.horsemenDetected.join(', ')}`;
    }
  }
  
  // 🆕 v17: 감정 강도에 따른 choices 개인화
  const emotionIntensity = Math.abs(stateResult.emotionScore);
  const choices = emotionIntensity >= 3
    ? [
        { label: '잠깐, 좀 더 얘기할래', value: 'tell_more' },
        { label: '맞아 그래서 어떡해?', value: 'show_solution' },
      ]
    : [
        { label: '흥미롭다 더 알려줘', value: 'tell_more' },
        { label: '그래 맞아! 다음은?', value: 'show_solution' },
      ];

  const data: InsightCardData = {
    title: '루나의 발견 노트 📝',
    situation: userMessage.length > 40 ? userMessage.substring(0, 40) + '...' : userMessage,
    emotion: emotionLabel,
    pattern: patternText,
    scenario: scenario ?? RelationshipScenario.GENERAL,
    duration: durationText,
    emotions: [emotionLabel, ...(stateResult.horsemenDetected || [])],
    insight: insightText,
    choices,
  };
  
  return {
    type: 'INSIGHT_CARD',
    phase: 'MIRROR',
    data: data as unknown as Record<string, unknown>,
  };
}

/**
 * 🆕 v17: 루나의 마음 거울 이벤트 생성 (MIRROR 구간)
 * EFT Stage 1 Step 3: 표면 감정 → 1차 감정(진짜 감정) 탐색
 * 연구: 감정 세밀도가 높을수록 정신건강 지표 향상 (2024 EMNLP)
 */
export function createEmotionMirror(
  stateResult: StateResult,
  scenario?: RelationshipScenario,
  dynamicMirrorData?: EmotionMirrorData | null,
): PhaseEvent {
  // 🆕 v19: 동적 데이터가 있으면 바로 사용 (LLM 기반 증거 거울)
  if (dynamicMirrorData) {
    return {
      type: 'EMOTION_MIRROR',
      phase: 'MIRROR',
      data: dynamicMirrorData as unknown as Record<string, unknown>,
    };
  }

  // 폴백: 기존 하드코딩 시나리오 매핑
  // 감정 점수 기반 표면/깊은 감정 매핑
  const score = stateResult.emotionScore;

  // 시나리오별 표면→깊은 감정 매핑 (EFT 기반)
  type EmotionPair = { surfaceEmoji: string; surface: string; deepEmoji: string; deep: string };
  const scenarioEmotions: Record<string, EmotionPair> = {
    [RelationshipScenario.READ_AND_IGNORED]: {
      surfaceEmoji: '😤', surface: '답답하고 짜증나는 상태',
      deepEmoji: '💔', deep: '무시당한 것 같아서 서운하고, 나한테 관심 없는 건 아닌지 불안한 마음',
    },
    [RelationshipScenario.GHOSTING]: {
      surfaceEmoji: '😠', surface: '화나고 억울한 상태',
      deepEmoji: '😢', deep: '내가 뭘 잘못한 건지 모르겠어서 혼란스럽고, 버려진 것 같은 두려움',
    },
    [RelationshipScenario.JEALOUSY]: {
      surfaceEmoji: '😡', surface: '질투나고 의심되는 상태',
      deepEmoji: '😰', deep: '나를 떠날까봐 불안하고, 내가 충분하지 않은 건 아닌지 걱정되는 마음',
    },
    [RelationshipScenario.LONG_DISTANCE]: {
      surfaceEmoji: '😔', surface: '외롭고 답답한 상태',
      deepEmoji: '💜', deep: '보고 싶은데 못 봐서 힘들고, 마음이 멀어질까봐 불안한 마음',
    },
    [RelationshipScenario.INFIDELITY]: {
      surfaceEmoji: '🤬', surface: '분노와 배신감 상태',
      deepEmoji: '💔', deep: '내가 부족해서 그런 건지 자책하고, 앞으로 어떡해야 할지 두려운 마음',
    },
    [RelationshipScenario.BREAKUP_CONTEMPLATION]: {
      surfaceEmoji: '😐', surface: '지치고 무기력한 상태',
      deepEmoji: '😢', deep: '떠나고 싶으면서도 남고 싶은 마음, 둘 다 있어서 혼란스러운 마음',
    },
    [RelationshipScenario.BOREDOM]: {
      surfaceEmoji: '😑', surface: '지루하고 무감각한 상태',
      deepEmoji: '😟', deep: '이게 맞나 싶은 불안, 예전 같은 설렘이 돌아올 수 있을지 걱정되는 마음',
    },
  };

  // 기본 감정 매핑 (시나리오 없거나 GENERAL)
  const defaultPair: EmotionPair = score <= -3
    ? { surfaceEmoji: '😢', surface: '많이 힘들고 지친 상태', deepEmoji: '💔', deep: '상처받고 불안한 마음' }
    : score <= -1
    ? { surfaceEmoji: '😔', surface: '답답하고 복잡한 상태', deepEmoji: '😢', deep: '서운하고 걱정되는 마음' }
    : { surfaceEmoji: '😐', surface: '복잡한 감정 상태', deepEmoji: '💭', deep: '정리되지 않는 여러 감정이 섞인 마음' };

  const pair = (scenario && scenarioEmotions[scenario]) ?? defaultPair;

  const data: EmotionMirrorData = {
    surfaceEmotion: pair.surface,
    surfaceEmoji: pair.surfaceEmoji,
    deepEmotion: pair.deep,
    deepEmoji: pair.deepEmoji,
    lunaMessage: '이거 맞아? 아니면 다른 느낌이야? 🦊',
    choices: [
      { label: '맞아 그런 것 같아', value: 'confirm' },
      { label: '음 좀 다른데', value: 'different' },
    ],
  };

  return {
    type: 'EMOTION_MIRROR',
    phase: 'MIRROR',
    data: data as unknown as Record<string, unknown>,
  };
}

/**
 * 🪞 반복 패턴 거울 이벤트 생성 (BRIDGE 구간)
 * 
 * 🆕 v14: SCALING_QUESTION 대체
 * 
 * 축 데이터 기반 패턴 감지 → 시각화 → 해결책 전환의 다리
 * 
 * 학술 근거:
 * - Gottman: 반복 패턴 인식 = 관계 회복의 1단계
 * - EFT: 부정적 사이클 외재화(externalize) → 공동 대처
 * - AI 패턴 감지 (2024-2025): 핵심 차별화 기능
 */
export function createPatternMirror(
  diagnosisResult: DiagnosisResult | null | undefined,
  scenario: RelationshipScenario,
  dynamicPatternData?: PatternMirrorData | null,
): PhaseEvent {
  // 🆕 v20: 동적 패턴 데이터가 있으면 바로 사용
  if (dynamicPatternData) {
    return {
      type: 'PATTERN_MIRROR',
      phase: 'BRIDGE',
      data: dynamicPatternData as unknown as Record<string, unknown>,
    };
  }

  // 폴백: 기존 하드코딩 패턴 감지
  // 축 데이터 추출
  const universal = diagnosisResult?.universal ?? {};
  const scenarioAxes = diagnosisResult?.scenario ?? {};

  // 패턴 감지 엔진 실행
  const patterns = detectPatterns(universal, scenarioAxes, scenario);
  
  // 사이클 감지 (EFT)
  const cycle = detectCycle(universal);
  
  // 패턴이 없으면 시나리오 기본값
  const finalPatterns = patterns.length > 0 ? patterns : getDefaultPatterns(scenario);

  // 학술 인용 선택
  const researchBasis = selectResearchBasis(finalPatterns, cycle);

  // 인사이트 메시지
  const insight = cycle 
    ? `이 사이클이 반복되고 있어. 패턴을 인식하는 것만으로도 변화가 시작돼.`
    : finalPatterns.length >= 2
    ? '여러 패턴이 겹치고 있어. 하나씩 풀어가는 방법이 있어.'
    : '같은 패턴이 반복되면 같은 결과가 나와. 다르게 해보는 방법을 알려줄까?';

  const data: PatternMirrorData = {
    title: '네 관계 패턴이 보여',
    patterns: finalPatterns,
    cycle,
    insight,
    researchBasis,
    choices: [
      { label: '맞아! 놀라워', value: 'pattern_confirmed' },
      { label: '패턴 바꾸는 방법', value: 'break_pattern' },
    ],
  };

  return {
    type: 'PATTERN_MIRROR',
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
export function createSolutionCard(
  match: SolutionMatch,
  /** 🆕 v20: 대화 맥락 기반 동적 프레이밍 (왜 이 솔루션을 추천하는지) */
  dynamicFraming?: { reason?: string; deepEmotion?: string } | null,
): PhaseEvent {
  const { entry } = match;

  // 🆕 v20: 동적 프레이밍 — 사전 솔루션은 그대로, "왜 추천하는지" 연결 멘트만 동적
  let rationale = entry.solution.steps.validation;
  if (dynamicFraming?.reason) {
    rationale = dynamicFraming.reason;
  } else if (dynamicFraming?.deepEmotion) {
    rationale = `"${dynamicFraming.deepEmotion}" 감정에 도움이 될 수 있는 방법이야`;
  }

  const data: SolutionCardData = {
    title: '맞춤형 관계 회복 전략',
    frameworkName: entry.solution.framework,
    rationale,
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
export function createMessageDraft(
  match: SolutionMatch,
  /** 🆕 v20: 시나리오 기반 추가 스크립트 유형 */
  scenario?: RelationshipScenario,
): PhaseEvent {
  const drafts = (match.entry.solution.messageDrafts ?? []).map((content, i) => ({
    intent: `초안 ${String.fromCharCode(65 + i)}`,
    text: content,
  }));

  // I-message 템플릿
  if (match.entry.solution.iMessageTemplate) {
    drafts.push({
      intent: '나 전달법 (I-message)',
      text: match.entry.solution.iMessageTemplate,
    });
  }

  // 🆕 v20: 상황별 추가 스크립트 (갈등 해소, 감정 표현, 경계 설정 등)
  const SCENARIO_SCRIPTS: Record<string, { intent: string; text: string }[]> = {
    READ_AND_IGNORED: [
      { intent: '감정 표현 스크립트', text: '나 요즘 답장 없으면 좀 불안해지더라. 바쁜 거 알지만, 간단하게라도 답 주면 나는 안심이 될 것 같아.' },
      { intent: '경계 설정 스크립트', text: '나한테 연락이 중요한 부분이거든. 바쁘면 바쁘다고만 해줘도 괜찮아.' },
    ],
    GHOSTING: [
      { intent: '마지막 연락 스크립트', text: '연락이 끊겨서 걱정돼. 괜찮은 건지 모르겠어서. 답장 안 해도 괜찮은데, 네가 괜찮은지만 알고 싶어.' },
      { intent: '자기 보호 스크립트', text: '기다리는 게 나한테 힘든 일이라는 걸 알게 됐어. 일단 나한테 집중하려고 해.' },
    ],
    JEALOUSY: [
      { intent: '불안 공유 스크립트', text: '솔직히 말하면, 좀 불안했어. 네가 나를 안 좋아하는 건 아닌데, 가끔 그런 생각이 드는 내 문제인 것 같아.' },
      { intent: '신뢰 표현 스크립트', text: '너를 믿어. 근데 가끔 불안할 때 네가 한마디 해주면 나는 금방 괜찮아져.' },
    ],
    BREAKUP_CONTEMPLATION: [
      { intent: '솔직한 대화 요청', text: '우리 좀 진지하게 얘기해볼 수 있을까? 요즘 관계에 대해 정리가 안 돼서, 네 생각도 듣고 싶어.' },
      { intent: '감정 정리 스크립트', text: '나도 지금 많이 혼란스러워. 당장 결정하자는 게 아니라, 서로 어떻게 느끼는지 나눠보고 싶어.' },
    ],
    BOREDOM: [
      { intent: '변화 제안 스크립트', text: '우리 요즘 좀 패턴화된 것 같아. 이번 주에 뭔가 새로운 거 같이 해볼까? 내가 찾아볼게.' },
      { intent: '감정 체크인 스크립트', text: '요즘 우리 사이 어떤 것 같아? 나는 솔직히 좀 아쉬운 부분이 있어서, 네 생각도 궁금해.' },
    ],
  };

  const extraScripts = scenario ? (SCENARIO_SCRIPTS[scenario] ?? []) : [];
  // 기존 초안에 없는 유형만 추가
  for (const script of extraScripts) {
    if (!drafts.some(d => d.intent === script.intent)) {
      drafts.push(script);
    }
  }

  const data: MessageDraftData = {
    title: '이렇게 카톡을 보내보는 건 어때요?',
    drafts: drafts.slice(0, 4),  // 최대 4개
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

/**
 * 🆕 v20: 세션 요약 이벤트 생성 (EMPOWER 구간)
 *
 * 대화 전체를 3가지 핵심 발견으로 요약
 * 연구 근거: 세션 종료 시 "contained" 느낌이 재방문율에 영향 (2025 digital therapy research)
 */
export function createSessionSummary(
  keyInsights: string[],
  emotionJourney: string,
): PhaseEvent {
  const data: SessionSummaryData = {
    title: '오늘 대화 요약 📋',
    keyInsights: keyInsights.slice(0, 3),
    emotionJourney,
    lunaMessage: '오늘 많은 이야기 나눠줘서 고마워. 네 마음이 조금이라도 가벼워졌으면 좋겠다 🦊',
  };

  return {
    type: 'SESSION_SUMMARY',
    phase: 'EMPOWER',
    data: data as unknown as Record<string, unknown>,
  };
}

/**
 * 🆕 v20: 숙제 카드 이벤트 생성 (EMPOWER 구간)
 *
 * 시나리오 + 진단 결과 기반 실행 가능한 과제 1~2개
 * 연구 근거: Plan-Execute-Review 3단계, 행동 실험, 저널링 (2025 dating counseling best practices)
 */
export function createHomeworkCard(
  scenario: RelationshipScenario,
  primaryEmotion?: string,
): PhaseEvent {
  // 시나리오별 기본 숙제 매핑
  const SCENARIO_HOMEWORKS: Record<string, HomeworkCardData['homeworks']> = {
    READ_AND_IGNORED: [
      { type: 'behavior', emoji: '💬', task: '상대에게 I-message로 감정 전달해보기', detail: '"답장 없으면 나는 ○○한 느낌이 들어"라고 한 번 말해보기' },
      { type: 'selfcare', emoji: '🧘', task: '읽씹 확인 충동이 올 때 3분 호흡하기', detail: '카톡 열기 전에 심호흡 3번 → 정말 지금 확인해야 하는지 스스로에게 물어보기' },
    ],
    GHOSTING: [
      { type: 'selfcare', emoji: '💜', task: '나를 위한 시간 30분 만들기', detail: '상대 생각 없이 오직 나만을 위한 활동 하나 해보기' },
    ],
    JEALOUSY: [
      { type: 'observe', emoji: '👀', task: '질투 느낄 때 몸의 반응 관찰하기', detail: '질투가 올 때 심장 박동, 손, 목 → 어디서 느껴지는지 기록해보기' },
      { type: 'behavior', emoji: '💬', task: '불안할 때 확인 대신 감정 표현해보기', detail: '"어디야?" 대신 "오늘 좀 불안해서 네 목소리 듣고 싶었어"' },
    ],
    BREAKUP_CONTEMPLATION: [
      { type: 'observe', emoji: '👀', task: '이번 주 상대와의 상호작용 관찰하기', detail: '좋은 순간과 안 좋은 순간 각각 몇 번인지 세어보기' },
    ],
  };

  const defaultHomeworks: HomeworkCardData['homeworks'] = [
    { type: 'selfcare', emoji: '💜', task: '나를 위한 시간 30분 만들기', detail: '연애 생각 없이 오직 나만을 위한 활동 하나' },
  ];

  const homeworks = SCENARIO_HOMEWORKS[scenario] ?? defaultHomeworks;

  const data: HomeworkCardData = {
    title: '이번 주 미니 과제 📝',
    homeworks,
    encouragement: primaryEmotion
      ? `오늘 "${primaryEmotion}" 감정을 잘 들여다봤어. 이번 주에 작은 실험 하나 해볼까? 🦊`
      : '작은 변화가 큰 차이를 만들어. 하나만 해봐도 충분해! 🦊',
  };

  return {
    type: 'HOMEWORK_CARD',
    phase: 'EMPOWER',
    data: data as unknown as Record<string, unknown>,
  };
}

/**
 * 🔮 타로냥 스프레드 축 수집 이벤트 생성 (MIRROR 구간)
 *
 * 유저가 어떤 스프레드로 볼지 선택 → BRIDGE에서 TAROT_DRAW 발동
 */
/**
 * 🔮 v24: "끌리는 카드 1장 선택" — Pick-a-Card 에너지 리딩
 *
 * TikTok Pick-a-Card 트렌드 + 전문 타로 리더 원카드 해석법 (2025-2026)
 * 뒤집힌 3장 중 끌리는 1장 선택 → 오늘의 에너지 + 고민 연결 해석
 *
 * 해석 공식 (프로 타로 리더):
 * 1. 카드의 풍경 묘사 — "이 카드에 보이는 건..."
 * 2. 고민과의 연결 — "네 상황에서 이 카드가 말하는 건..."
 * 3. 카드가 건네는 허락 — "이 카드가 허락하는 건..."
 */
export function createTarotAxisCollect(
  scenario?: RelationshipScenario,
  emotionScore?: number,
  userMessage?: string,
): PhaseEvent {
  // 3장 뽑기 (유저가 1장 선택)
  const drawn = drawCards(3, emotionScore ?? 0, scenario);
  const backEmojis = ['🌙', '⭐', '🔥'];
  const labels = ['첫 번째 카드', '두 번째 카드', '세 번째 카드'];

  const pickCards = drawn.map((dc, i) => ({
    id: dc.card.id,
    backEmoji: backEmojis[i],
    label: labels[i],
    cardName: `${dc.card.name} (${dc.card.nameEn})`,
    cardEmoji: dc.card.emoji,
    isReversed: dc.isReversed,
    keywords: dc.card.keywords,
    energyMessage: dc.isReversed ? dc.card.loveReversed : dc.card.loveUpright,
  }));

  const data: TarotAxisCollectData = {
    question: '세 장의 카드 중 끌리는 카드를 골라봐 🔮',
    tarotNyangMessage: '냥~ 네 이야기를 들었어. 카드 세 장을 펼쳐놨어. 직감으로 끌리는 카드 하나를 골라봐 🐱✨',
    pickCards,
    choices: [], // 하위 호환
  };

  return {
    type: 'TAROT_AXIS_COLLECT',
    phase: 'HOOK',
    data: data as unknown as Record<string, unknown>,
  };
}

/**
 * 🔮 타로냥 카드 인사이트 이벤트 생성 (SOLVE 구간)
 *
 * TAROT_DRAW 완료 후 카드 조합 심층 해석 + 구체적 행동 조언
 */
export function createTarotInsight(
  drawnCards: { position: string; cardName: string; cardEmoji: string; isReversed: boolean }[],
  insight: string,
  advice: string,
  actionItems: string[],
): PhaseEvent {
  const data: TarotInsightData = {
    cards: drawnCards,
    insight,
    advice,
    actionItems: actionItems.slice(0, 3),
    tarotNyangMessage: '냥~ 카드들이 말하는 걸 좀 더 깊이 읽어볼게 🐱✨',
  };

  return {
    type: 'TAROT_INSIGHT',
    phase: 'SOLVE',
    data: data as unknown as Record<string, unknown>,
  };
}

/**
 * 🔮 v23: 타로냥 전용 세션 요약 (EMPOWER 구간)
 * 핵심 카드 3장 + 인사이트 + 감정 여정을 타로냥 톤으로 요약
 */
export function createTarotSessionSummary(
  keyInsights: string[],
  emotionJourney: string,
  drawnCards?: any[],
): PhaseEvent {
  // 핵심 카드 최대 3장 시각 요약
  const highlightCards = (drawnCards ?? []).slice(0, 3).map((c: any) => ({
    cardEmoji: c.cardEmoji ?? '🃏',
    cardName: c.cardName ?? c.card?.name ?? '카드',
    keyMessage: (c.interpretation ?? '').slice(0, 40),
  }));

  const data: SessionSummaryData = {
    title: '오늘의 타로 리딩 요약 🔮',
    keyInsights: keyInsights.slice(0, 3),
    emotionJourney,
    lunaMessage: highlightCards.length > 0
      ? `${highlightCards.map((c: any) => `${c.cardEmoji} ${c.cardName}`).join(' · ')} — 이 카드들이 오늘 네게 말한 것들, 기억해둬 냥~ 🐱✨`
      : '오늘 카드가 네게 말한 것들, 마음에 담아둬 냥~ 🐱✨',
  };

  return {
    type: 'SESSION_SUMMARY',
    phase: 'EMPOWER',
    data: data as unknown as Record<string, unknown>,
  };
}

/**
 * 🔮 v23: 타로냥 전용 숙제 카드 (EMPOWER 구간)
 * 뽑힌 카드의 에너지를 활용한 미니 과제
 */
export function createTarotHomework(
  scenario: RelationshipScenario,
  primaryEmotion?: string,
  keyCard?: any,
): PhaseEvent {
  // 카드 기반 숙제 매핑
  const cardId = keyCard?.card?.id ?? keyCard?.cardId ?? '';
  const cardName = keyCard?.card?.name ?? keyCard?.cardName ?? '카드';

  const TAROT_HOMEWORKS: Record<string, HomeworkCardData['homeworks']> = {
    // The Moon → 불안 관찰
    'major_18': [
      { type: 'observe', emoji: '🌙', task: '불안할 때 3분간 달 보기', detail: '달 카드처럼, 불안은 밀물과 썰물이야. 지켜보면 지나가.' },
      { type: 'selfcare', emoji: '📝', task: '불안 일기 적기', detail: '불안이 올 때 "지금 뭐가 두려워?" 한 줄만 적어봐.' },
    ],
    // The Lovers → 관계 표현
    'major_6': [
      { type: 'behavior', emoji: '💕', task: '상대에게 솔직한 감정 한 마디', detail: '연인 카드가 말해. 지금이 마음을 표현할 때야.' },
    ],
    // 3 of Swords → 치유
    'minor_swords_3': [
      { type: 'selfcare', emoji: '💔', task: '아픈 감정을 일기로 써보기', detail: '세 개의 검이 말해. 적어야 빠져나갈 수 있어.' },
    ],
    // The Tower → 변화 수용
    'major_16': [
      { type: 'observe', emoji: '⚡', task: '무너진 것 목록 적기', detail: '탑 카드처럼, 무너진 자리에 뭘 세울지 생각해봐.' },
    ],
    // The Star → 희망 연결
    'major_17': [
      { type: 'selfcare', emoji: '⭐', task: '오늘 감사한 것 3가지 적기', detail: '별 카드의 에너지를 받아서, 작은 빛을 찾아봐.' },
    ],
    // The Fool → 새로운 시도
    'major_0': [
      { type: 'behavior', emoji: '🃏', task: '이번 주 새로운 것 하나 시도하기', detail: '바보 카드가 말해. 완벽할 필요 없어, 일단 해봐.' },
    ],
    // 2 of Cups → 파트너십
    'minor_cups_2': [
      { type: 'behavior', emoji: '💜', task: '상대에게 "고마워" 한마디 전하기', detail: '컵 2 카드의 에너지. 작은 감사가 관계를 바꿔.' },
    ],
    // The Hermit → 내면 탐색
    'major_9': [
      { type: 'selfcare', emoji: '🏔️', task: '혼자만의 시간 30분 만들기', detail: '은둔자 카드처럼, 고요한 속에서 답이 보여.' },
    ],
  };

  const homeworks = TAROT_HOMEWORKS[cardId] ?? [
    { type: 'selfcare' as const, emoji: '🔮', task: '오늘 카드 메시지를 일기에 적기', detail: '카드가 전한 메시지를 내 것으로 만들어봐.' },
    { type: 'observe' as const, emoji: '🐱', task: '이번 주 감정 변화 관찰하기', detail: '타로냥이 말해. 관찰하면 패턴이 보여 냥~' },
  ];

  const data: HomeworkCardData = {
    title: '타로 미니 과제 🔮📝',
    homeworks,
    encouragement: primaryEmotion
      ? `"${primaryEmotion}" 감정과 "${cardName}" 카드의 에너지를 이번 주에 가져가봐 냥~ 🐱`
      : `"${cardName}" 카드의 에너지를 이번 주에 가져가봐 냥~ 🐱`,
  };

  return {
    type: 'HOMEWORK_CARD',
    phase: 'EMPOWER',
    data: data as unknown as Record<string, unknown>,
  };
}

/**
 * 🔮 타로카드 뽑기 이벤트 생성 (BRIDGE 구간)
 */
export function createTarotDraw(
  spreadType: 'single' | 'three' | 'love' | 'unrequited' | 'reconnection' | 'pace' | 'avoidant' | 'yesno',
  emotionScore?: number,
  scenario?: RelationshipScenario,
): PhaseEvent {
  const spreadFn: Record<string, () => { card: any; isReversed: boolean; position?: string; interpretation?: string }[]> = {
    single: () => [getSingleSpread(emotionScore, scenario)],
    three: () => getThreeCardSpread(emotionScore, scenario),
    love: () => getLoveSpread(emotionScore, scenario),
    unrequited: () => getUnrequitedSpread(emotionScore, scenario),
    reconnection: () => getReconnectionSpread(emotionScore, scenario),
    pace: () => getPaceSpread(emotionScore, scenario),
    avoidant: () => getAvoidantSpread(emotionScore, scenario),
    yesno: () => getYesNoSpread(emotionScore, scenario),
  };
  const cards = (spreadFn[spreadType] ?? spreadFn.three)();

  const positionLabels = cards.map(c => c.position || '');

  const cardData = cards.map((dc, i) => ({
    position: dc.position || positionLabels[i] || '',
    cardId: dc.card.id,
    cardName: `${dc.card.name} (${dc.card.nameEn})`,
    cardEmoji: dc.card.emoji,
    keywords: dc.card.keywords,
    isReversed: dc.isReversed,
    interpretation: dc.interpretation || (dc.isReversed ? dc.card.loveReversed : dc.card.loveUpright),
  }));

  const overallMessages: Record<string, string> = {
    single: `오늘의 카드는 "${cards[0].card.name}"... ${cards[0].card.advice}`,
    three: '세 장의 카드가 너의 이야기를 들려주고 있어... 🔮',
    love: '다섯 장의 연애 카드가 너와 상대의 마음을 비추고 있어... 💕🔮',
    unrequited: '여섯 장의 카드가 짝사랑의 에너지를 읽고 있어... 💘🔮',
    reconnection: '여섯 장의 카드가 재회의 가능성을 비추고 있어... 🔁🔮',
    pace: '다섯 장의 카드가 너희 사이의 흐름을 읽고 있어... ✨🔮',
    avoidant: '여섯 장의 카드가 회피 뒤의 진짜 마음을 비추고 있어... 🚪🔮',
    yesno: `카드의 답이 나왔어... ${cards[0].position} 🔮`,
  };

  const nyangMessages: Record<string, string> = {
    single: '냥~ 카드 한 장을 뽑았어. 이 카드가 지금 네 마음을 비추고 있어 🐱',
    three: '세 장의 카드로 과거, 현재, 미래를 읽어볼게... 🐱',
    love: '다섯 장의 연애 카드를 뽑았어. 너와 상대의 마음이 보이는 것 같아 💕🐱',
    unrequited: '냥~ 짝사랑 전용 카드를 펼쳤어. 상대의 마음이 보일지도... 💘🐱',
    reconnection: '냥~ 재회의 카드를 뽑았어. 다시 만남의 에너지가 어떤지 볼게... 🐱',
    pace: '냥~ 너희 사이의 흐름을 카드로 읽어볼게. 설레는 에너지가 느껴져... 🐱',
    avoidant: '냥~ 회피 뒤에 숨겨진 마음을 카드가 비춰줄 거야... 🐱',
    yesno: '냥~ 카드가 답을 줬어. 자세히 봐봐... 🐱',
  };

  // 카드 조합 기반 간단한 조언 생성
  const adviceCard = cards[cards.length - 1]; // 마지막 카드 (조언/결과 포지션)
  const advice = adviceCard?.card?.advice ?? '카드의 메시지를 마음에 담아봐 냥~ 🐱';

  const data: TarotDrawData = {
    spreadType,
    cards: cardData,
    overallMessage: overallMessages[spreadType] ?? overallMessages.three,
    overallReading: overallMessages[spreadType] ?? overallMessages.three,
    advice,
    tarotNyangMessage: nyangMessages[spreadType] ?? nyangMessages.three,
    followUpQuestions: [
      '이 카드에 대해 더 알고 싶어',
      '구체적인 조언이 궁금해',
      '다른 카드를 뽑아볼래',
    ],
    choices: [
      { label: '더 알려줘', value: 'tell_more' },
      { label: cards.length >= 5 ? '자세히 해석해줘' : spreadType === 'single' || spreadType === 'yesno' ? '다음으로' : '카드 해석 들을래', value: 'next' },
    ],
  };

  return {
    type: 'TAROT_DRAW',
    phase: spreadType === 'single' ? 'HOOK' : 'BRIDGE',
    data: data as unknown as Record<string, unknown>,
  };
}
