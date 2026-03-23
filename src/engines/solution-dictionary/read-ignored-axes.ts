/**
 * 🆕 v7: 읽씹 진단 5축 시스템
 * 
 * 기존 키워드 스코어링 → 대화형 진단 기반 정밀 매칭
 * 
 * 축:
 * 1. Duration (기간): 몇시간 ~ 1주+
 * 2. Stage (관계 단계): 썸 ~ 재회
 * 3. ReadType (유형): 읽씹 vs 안읽씹 vs 부분답장
 * 4. AttachmentClue (애착 단서): 불안-확인 / 불안-자책 / 회피-보복 등
 * 5. Pattern (반복성): 처음 ~ 악화
 * 
 * 근거: Computers in Human Behavior (2025), Gottman Stonewalling,
 *        EFT 애착 이론, MZ세대 연애 보고서 (2025)
 */

// ============================================================
// 5축 Enum
// ============================================================

/** 축 1: 읽씹 기간 */
export enum ReadIgnoredDuration {
  /** ~6시간 — 바쁠 수 있음, 과해석 위험 */
  HOURS = 'HOURS',
  /** 6~24시간 — 미묘한 신호 */
  SAME_DAY = 'SAME_DAY',
  /** 2~3일 — 의도적 회피 가능성 */
  DAYS_2_3 = 'DAYS_2_3',
  /** 4일~1주 — 관계 위기 신호 */
  DAYS_4_7 = 'DAYS_4_7',
  /** 1주 이상 — 잠수/고스팅 영역 */
  OVER_WEEK = 'OVER_WEEK',
}

/** 축 2: 관계 단계 */
export enum ReadIgnoredStage {
  /** 썸/소개팅 — 밀당·관심 테스트 */
  SOME = 'SOME',
  /** 연애 초기 (1~3개월) — 불안 높음 */
  EARLY_DATING = 'EARLY_DATING',
  /** 안정기 연인 (3개월+) — 습관 vs 무시 구분 */
  ESTABLISHED = 'ESTABLISHED',
  /** 이별 후 — 감정 회피·방패 */
  POST_BREAKUP = 'POST_BREAKUP',
  /** 재회 시도 중 — 경계·트라우마 */
  RECONCILIATION = 'RECONCILIATION',
}

/** 축 3: 읽씹 유형 */
export enum ReadIgnoredReadType {
  /** 읽고 답 안 함 (1 사라짐) */
  READ_NO_REPLY = 'READ_NO_REPLY',
  /** 안읽씹 (1 유지) — 더 강한 단절 */
  UNREAD_IGNORED = 'UNREAD_IGNORED',
  /** 짧은/성의없는 답 — 관심 하락 초기 */
  PARTIAL_REPLY = 'PARTIAL_REPLY',
  /** 특정 내용만 무시 — 갈등 회피 */
  SELECTIVE = 'SELECTIVE',
  /** 매우 늦게 읽음 */
  DELAYED_READ = 'DELAYED_READ',
}

/** 축 4: 애착유형 단서 (행동 기반) */
export enum ReadIgnoredAttachmentClue {
  /** 반복 확인, 추가 연락 충동 */
  ANXIOUS_CHECKING = 'ANXIOUS_CHECKING',
  /** "내가 뭘 잘못했나" 자책 */
  ANXIOUS_SELF_BLAME = 'ANXIOUS_SELF_BLAME',
  /** "나도 읽씹해야지" 보복 심리 */
  AVOIDANT_MIRRORING = 'AVOIDANT_MIRRORING',
  /** "무슨 일 있나?" 차분한 걱정 */
  SECURE_CONCERN = 'SECURE_CONCERN',
  /** 극단적 시나리오 상상 */
  FEARFUL_SPIRAL = 'FEARFUL_SPIRAL',
}

/** 축 5: 패턴 반복성 */
export enum ReadIgnoredPattern {
  /** 처음 경험 */
  FIRST_TIME = 'FIRST_TIME',
  /** 가끔 */
  OCCASIONAL = 'OCCASIONAL',
  /** 자주 반복 */
  FREQUENT = 'FREQUENT',
  /** 항상 이럼 */
  ALWAYS = 'ALWAYS',
  /** 점점 심해짐 */
  WORSENING = 'WORSENING',
}

// ============================================================
// 축 수집 상태
// ============================================================

/** 읽씹 진단 축 상태 (세션에 누적 저장) */
export interface ReadIgnoredAxes {
  duration?: ReadIgnoredDuration;
  stage?: ReadIgnoredStage;
  readType?: ReadIgnoredReadType;
  attachmentClue?: ReadIgnoredAttachmentClue;
  pattern?: ReadIgnoredPattern;
  /** 🆕 v7.1: AI가 이미 질문한 축 목록 (재질문 방지 + 선택지 폴백 트리거) */
  askedAxes?: string[];
}

/** 축 수집 상태 메타 */
export interface AxesCollectionState {
  axes: ReadIgnoredAxes;
  /** 채워진 축 개수 */
  filledCount: number;
  /** 진단 질문이 필요한지 */
  needsDiagnostic: boolean;
  /** 다음에 물어볼 축 (null이면 충분) */
  nextAxis: keyof ReadIgnoredAxes | null;
  /** 🆕 v7.1: 이 축은 질문했는데 응답에서 감지 못 함 → 선택지 폴백 필요 */
  shouldShowChoices: boolean;
  /** 선택지를 보여줄 축 (duration/stage만) */
  choicesAxis: 'duration' | 'stage' | null;
}

// ============================================================
// 축 자동 파서 — 키워드 기반
// ============================================================

/** 기간 감지 키워드 */
const DURATION_PATTERNS: { keywords: string[]; value: ReadIgnoredDuration }[] = [
  { keywords: ['방금', '아까', '몇시간', '몇 시간', '오늘 보낸', '1시간', '2시간', '3시간', '4시간', '5시간', '6시간', '7시간', '8시간', '9시간', '10시간', '한시간', '두시간', '세시간', '네시간', '다섯시간', '여섯시간', '일곱시간', '시간 전', '시간전', '30분', '분 전', '분전'], value: ReadIgnoredDuration.HOURS },
  { keywords: ['오늘', '하루', '아침에', '점심에', '어제 저녁', '반나절', '어제', '어젯밤', '어제저녁', '24시간'], value: ReadIgnoredDuration.SAME_DAY },
  { keywords: ['이틀', '2일', '3일', '사흘', '그제', '엊그제', '2~3일', '3일째', '삼일', '이틀째'], value: ReadIgnoredDuration.DAYS_2_3 },
  { keywords: ['4일', '5일', '6일', '닷새', '나흘', '거의 일주일', '5일째', '6일째', '4일째', '사일', '오일', '육일'], value: ReadIgnoredDuration.DAYS_4_7 },
  { keywords: ['일주일', '1주일', '열흘', '2주', '보름', '일주일 넘', '1주 넘', '몇주', '한달', '이주일', '삼주', '주일', '한 달'], value: ReadIgnoredDuration.OVER_WEEK },
];

/** 관계 단계 감지 키워드 */
const STAGE_PATTERNS: { keywords: string[]; value: ReadIgnoredStage }[] = [
  { keywords: ['썸', '소개팅', '매칭', '앱에서', '좋아하는 사람', '아직 사귀는건 아닌'], value: ReadIgnoredStage.SOME },
  { keywords: ['사귄지 얼마 안', '사귄지 한달', '사귄지 두달', '만난지 얼마', '사귀기 시작'], value: ReadIgnoredStage.EARLY_DATING },
  { keywords: ['사귀는', '남자친구', '여자친구', '남친', '여친', '애인', '연인', '사귄지 오래'], value: ReadIgnoredStage.ESTABLISHED },
  { keywords: ['전 남친', '전 여친', '전남친', '전여친', '헤어진', '이별', '전 애인', '엑스'], value: ReadIgnoredStage.POST_BREAKUP },
  { keywords: ['다시 만나', '재회', '다시 연락', '돌아오', '다시 사귀'], value: ReadIgnoredStage.RECONCILIATION },
];

/** 유형 감지 키워드 */
const READ_TYPE_PATTERNS: { keywords: string[]; value: ReadIgnoredReadType }[] = [
  { keywords: ['읽고', '읽었는데', '확인했는데', '읽기는', '1 사라졌', '읽씹'], value: ReadIgnoredReadType.READ_NO_REPLY },
  { keywords: ['안읽', '안 읽', '1 그대로', '읽지도 않', '확인도 안', '안읽씹'], value: ReadIgnoredReadType.UNREAD_IGNORED },
  { keywords: ['ㅇㅇ만', '응 만', '짧게', '성의없', '대충', '한글자', '한 글자'], value: ReadIgnoredReadType.PARTIAL_REPLY },
  { keywords: ['그 얘기만', '그것만 무시', '특정', '그 주제'], value: ReadIgnoredReadType.SELECTIVE },
  { keywords: ['한참 뒤에', '늦게 읽', '몇시간 뒤에 읽'], value: ReadIgnoredReadType.DELAYED_READ },
];

/** 패턴 감지 키워드 */
const PATTERN_PATTERNS: { keywords: string[]; value: ReadIgnoredPattern }[] = [
  { keywords: ['처음', '이번이 첫', '원래 안 이랬', '갑자기 이래'], value: ReadIgnoredPattern.FIRST_TIME },
  { keywords: ['가끔', '가끔씩', '때때로', '어쩔 때'], value: ReadIgnoredPattern.OCCASIONAL },
  { keywords: ['자주', '종종', '꽤 자주', '여러 번'], value: ReadIgnoredPattern.FREQUENT },
  { keywords: ['맨날', '항상', '늘', '매번', '만날', '원래 이래'], value: ReadIgnoredPattern.ALWAYS },
  { keywords: ['점점', '갈수록', '더 심해', '심해지', '악화', '나빠지'], value: ReadIgnoredPattern.WORSENING },
];

/** 애착 단서 감지 키워드 */
const ATTACHMENT_PATTERNS: { keywords: string[]; value: ReadIgnoredAttachmentClue }[] = [
  { keywords: ['계속 확인', '또 보내', '추가 연락', '한번 더', '또 카톡', '폰 확인'], value: ReadIgnoredAttachmentClue.ANXIOUS_CHECKING },
  { keywords: ['내가 뭘', '내 잘못', '내가 잘못', '뭘 잘못', '내 탓', '자책'], value: ReadIgnoredAttachmentClue.ANXIOUS_SELF_BLAME },
  { keywords: ['나도 읽씹', '나도 안 읽', '똑같이', '보복', '나도 무시'], value: ReadIgnoredAttachmentClue.AVOIDANT_MIRRORING },
  { keywords: ['무슨 일', '걱정되', '괜찮은지', '사고났나'], value: ReadIgnoredAttachmentClue.SECURE_CONCERN },
  { keywords: ['바람', '다른 사람', '싫어져', '끝난건', '차이려고', '최악'], value: ReadIgnoredAttachmentClue.FEARFUL_SPIRAL },
];

/**
 * 사용자 메시지에서 축 자동 파싱
 * 
 * 기존 축에 새로운 정보를 병합 (기존 축은 덮어쓰지 않음)
 */
export function parseAxesFromMessage(
  message: string,
  existingAxes: ReadIgnoredAxes = {},
): ReadIgnoredAxes {
  const msgLower = message.toLowerCase();
  const updated = { ...existingAxes };

  // Duration
  if (!updated.duration) {
    for (const p of DURATION_PATTERNS) {
      if (p.keywords.some(kw => msgLower.includes(kw))) {
        updated.duration = p.value;
        break;
      }
    }
    // 정규식 폴백: "7시간", "12시간 전" 등 숫자+시간 패턴
    if (!updated.duration) {
      const hourMatch = msgLower.match(/(\d+)\s*시간/);
      if (hourMatch) {
        const hours = parseInt(hourMatch[1]);
        if (hours <= 12) updated.duration = ReadIgnoredDuration.HOURS;
        else updated.duration = ReadIgnoredDuration.SAME_DAY;
      }
      const dayMatch = msgLower.match(/(\d+)\s*일/);
      if (!updated.duration && dayMatch) {
        const days = parseInt(dayMatch[1]);
        if (days <= 1) updated.duration = ReadIgnoredDuration.SAME_DAY;
        else if (days <= 3) updated.duration = ReadIgnoredDuration.DAYS_2_3;
        else if (days <= 7) updated.duration = ReadIgnoredDuration.DAYS_4_7;
        else updated.duration = ReadIgnoredDuration.OVER_WEEK;
      }
    }
  }

  // Stage
  if (!updated.stage) {
    for (const p of STAGE_PATTERNS) {
      if (p.keywords.some(kw => msgLower.includes(kw))) {
        updated.stage = p.value;
        break;
      }
    }
  }

  // ReadType
  if (!updated.readType) {
    for (const p of READ_TYPE_PATTERNS) {
      if (p.keywords.some(kw => msgLower.includes(kw))) {
        updated.readType = p.value;
        break;
      }
    }
  }

  // Pattern
  if (!updated.pattern) {
    for (const p of PATTERN_PATTERNS) {
      if (p.keywords.some(kw => msgLower.includes(kw))) {
        updated.pattern = p.value;
        break;
      }
    }
  }

  // AttachmentClue
  if (!updated.attachmentClue) {
    for (const p of ATTACHMENT_PATTERNS) {
      if (p.keywords.some(kw => msgLower.includes(kw))) {
        updated.attachmentClue = p.value;
        break;
      }
    }
  }

  return updated;
}

/**
 * 축 수집 상태 분석
 * 
 * 채워진 축 개수, 다음 질문할 축, 진단 필요 여부 판단
 */
export function analyzeAxesState(axes: ReadIgnoredAxes): AxesCollectionState {
  const filled: (keyof ReadIgnoredAxes)[] = [];
  const missing: (keyof ReadIgnoredAxes)[] = [];
  const asked = axes.askedAxes ?? [];

  // 축 1~2 (duration, stage) — 핵심. 질문+선택지 폴백 대상
  // 축 3~4 (readType, pattern) — 질문은 하되 선택지 폴백 없음 (자동감지 의존)
  // 축 5 (attachmentClue) — 자동감지만, 질문 안 함
  const axisOrder: (keyof ReadIgnoredAxes)[] = [
    'duration', 'stage', 'readType', 'pattern',
    // attachmentClue는 자동감지만 → missing에서 제외
  ];

  for (const axis of axisOrder) {
    if (axes[axis]) {
      filled.push(axis);
    } else {
      missing.push(axis);
    }
  }
  // attachmentClue는 채워진 경우만 카운트 (질문 대상 아님)
  if (axes.attachmentClue) filled.push('attachmentClue');

  const filledCount = filled.length;

  // 핵심 3축(duration, stage, readType) 모두 있어야 진단 완료
  const needsDiagnostic = !axes.duration || !axes.stage || !axes.readType;

  // 🆕 v7.1: 선택지 폴백 — 이미 질문했는데 아직 빈 축
  let shouldShowChoices = false;
  let choicesAxis: 'duration' | 'stage' | null = null;

  if (!axes.duration && asked.includes('duration')) {
    shouldShowChoices = true;
    choicesAxis = 'duration';
  } else if (!axes.stage && asked.includes('stage')) {
    shouldShowChoices = true;
    choicesAxis = 'stage';
  }

  return {
    axes,
    filledCount,
    needsDiagnostic,
    nextAxis: missing.length > 0 ? missing[0] : null,
    shouldShowChoices,
    choicesAxis,
  };
}

// ============================================================
// 진단 질문 생성기
// ============================================================

interface DiagnosticQuestionSet {
  counselor: string;
  friend: string;
}

const DIAGNOSTIC_QUESTIONS: Record<Exclude<keyof ReadIgnoredAxes, 'askedAxes'>, DiagnosticQuestionSet> = {
  duration: {
    counselor: '읽씹이 된 지 대략 얼마나 됐는지 알 수 있을까요? 몇 시간, 며칠 정도인지 궁금해요.',
    friend: '몇 시간 전이야? 아니면 며칠째?',
  },
  stage: {
    counselor: '두 분의 현재 관계는 어떤 단계인지 궁금해요. 사귀시는 건가요, 아니면 아직 썸 단계인가요?',
    friend: '걔랑 사귀는 사이야? 아니면 썸?',
  },
  readType: {
    counselor: '혹시 메시지를 읽기는 하셨는지, 아니면 아예 확인도 안 한 건지 알 수 있을까요?',
    friend: '읽기는 한 거야? 아니면 아예 안 읽은 거야?',
  },
  pattern: {
    counselor: '이런 일이 이전에도 있었나요? 처음인지, 반복되는 건지 궁금해요.',
    friend: '이번이 처음이야? 아니면 맨날 이래?',
  },
  attachmentClue: {
    counselor: '지금 어떤 마음이 드시나요? 계속 확인하고 싶으신지, 아니면 다른 감정이 드시는지 궁금해요.',
    friend: '지금 어때? 폰 계속 들여다보게 돼?',
  },
};

/**
 * 진단 질문 프롬프트 생성
 * 
 * AI 응답에 "공감 + 질문 1개"로 자연스럽게 녹이기 위한 프롬프트 지시 반환
 */
export function generateDiagnosticPrompt(
  missingAxis: keyof ReadIgnoredAxes,
  persona: 'counselor' | 'friend' | 'panel',
): string {
  if (persona === 'panel') return '';
  if (missingAxis === 'askedAxes') return ''; // 메타 필드 무시

  const question = DIAGNOSTIC_QUESTIONS[missingAxis as Exclude<keyof ReadIgnoredAxes, 'askedAxes'>];
  if (!question) return '';
  const q = persona === 'friend' ? question.friend : question.counselor;

  return `\n## 🔍 진단 질문 (자연스럽게 녹여주세요)
이 사용자의 읽씹 상황을 더 정확히 이해하기 위해 아래 질문을 응답 끝에 자연스럽게 포함해주세요.
단, 차갑거나 기계적이면 안 됩니다. 공감 후 궁금한 척 물어보세요.

질문 의도: ${missingAxis}
참고 문장: "${q}"

⚠️ 위 문장을 그대로 쓰지 말고, 대화 흐름에 맞게 자연스럽게 변형하세요.
⚠️ 공감이 먼저! 질문은 마지막 1줄에 짧게.`;
}

// ============================================================
// 🆕 v7.1: 선택지 폴백 생성 (키워드+LLM 둘 다 실패 시)
// ============================================================

/** Duration 선택지 */
const DURATION_CHOICES = [
  { text: '⏰ 몇 시간 전', value: ReadIgnoredDuration.HOURS },
  { text: '📅 오늘 하루 정도', value: ReadIgnoredDuration.SAME_DAY },
  { text: '📅 2~3일째', value: ReadIgnoredDuration.DAYS_2_3 },
  { text: '📅 4일~일주일', value: ReadIgnoredDuration.DAYS_4_7 },
  { text: '📅 일주일 넘었어', value: ReadIgnoredDuration.OVER_WEEK },
];

/** Stage 선택지 */
const STAGE_CHOICES = [
  { text: '💕 썸/소개팅', value: ReadIgnoredStage.SOME },
  { text: '🌱 사귄지 얼마 안 됨', value: ReadIgnoredStage.EARLY_DATING },
  { text: '💑 사귀는 사이', value: ReadIgnoredStage.ESTABLISHED },
  { text: '💔 이별 후', value: ReadIgnoredStage.POST_BREAKUP },
  { text: '🔄 재회 시도 중', value: ReadIgnoredStage.RECONCILIATION },
];

export interface AxisChoice {
  text: string;
  value: string;
}

/**
 * 선택지 폴백 생성 — 질문했는데 키워드+LLM 둘 다 못 잡았을 때
 */
export function generateAxisChoices(axis: 'duration' | 'stage'): AxisChoice[] {
  return axis === 'duration' ? DURATION_CHOICES : STAGE_CHOICES;
}

/**
 * 선택지 클릭 시 축 값 설정
 */
export function setAxisFromChoice(
  axes: ReadIgnoredAxes,
  axis: 'duration' | 'stage',
  value: string,
): ReadIgnoredAxes {
  const updated = { ...axes };
  if (axis === 'duration') {
    updated.duration = value as ReadIgnoredDuration;
  } else if (axis === 'stage') {
    updated.stage = value as ReadIgnoredStage;
  }
  return updated;
}

/**
 * 🆕 v7.1: LLM 추출 축을 기존 축에 머지 (기존 값 보존)
 */
export function mergeLLMAxes(
  existing: ReadIgnoredAxes,
  llmAxes: Partial<ReadIgnoredAxes>,
): ReadIgnoredAxes {
  return {
    ...existing,
    duration: existing.duration ?? llmAxes.duration,
    stage: existing.stage ?? llmAxes.stage,
    readType: existing.readType ?? llmAxes.readType,
    pattern: existing.pattern ?? llmAxes.pattern,
    attachmentClue: existing.attachmentClue ?? llmAxes.attachmentClue,
  };
}

/**
 * askedAxes에 축 추가 (이미 있으면 추가 안 함)
 */
export function markAxisAsked(
  axes: ReadIgnoredAxes,
  axis: string,
): ReadIgnoredAxes {
  const asked = axes.askedAxes ?? [];
  if (asked.includes(axis)) return axes;
  return { ...axes, askedAxes: [...asked, axis] };
}
