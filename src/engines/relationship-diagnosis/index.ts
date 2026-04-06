/**
 * 🆕 v12: 관계진단 엔진 (Relationship Diagnosis Engine)
 *
 * 역할: MIRROR 단계에서 해결책 분기를 세밀하게 나누기 위한
 *       핵심 데이터를 수집하고 분석하는 엔진
 *
 * - LLM 상태 분석 결과(StateResult)에서 자동 추출
 * - 대화 텍스트에서 키워드 파싱
 * - 범용 10축 + 시나리오 전용 축 통합
 * - 솔루션 매칭에 직접 연동
 */

import type { StateResult, HorsemenType } from '@/types/engine.types';
import {
  type UniversalAxes,
  type ScenarioAxes,
  type DiagnosisResult,
  type DiagnosisKeyFinding,
  type DiagnosisAxesState,
  type DiagnosisCollectionMeta,
  IssueDuration,
  RelationshipStage,
  FrequencyPattern,
  AttachmentClue,
  ConflictStyle,
  RelationshipStrength,
  ChangeReadiness,
  PartnerContext,
  PreviousAttempt,
  ReadType,
} from './types';

// ============================================================
// 키워드 기반 파서 — 신규 6축
// ============================================================

/** 갈등 반응 스타일 키워드 */
const CONFLICT_STYLE_PATTERNS: { keywords: string[]; value: ConflictStyle }[] = [
  { keywords: ['또 보냈', '연달아', '폭탄', '다시 보냄', '또 카톡', '연락했는데', '또 연락', '카톡 폭탄', '3번', '4번', '여러번 보냈', '연속으로'], value: ConflictStyle.PURSUE },
  { keywords: ['나도 안 보냄', '기다리는 중', '나도 무시', '그냥 내버려', '기다리고', '참고 있', '나도 연락 안'], value: ConflictStyle.WITHDRAW },
  { keywords: ['얘기하자', '대화하자', '물어봤', '직접 물어', '만나서 얘기', '통화하자', '카톡 말고 만나'], value: ConflictStyle.CONFRONT },
  { keywords: ['모른 척', '안 꺼냄', '넘어감', '그냥 넘기', '다른 얘기', '아예 안 물어'], value: ConflictStyle.AVOID },
];

/** 관계 강도 키워드 */
const RELATIONSHIP_STRENGTH_PATTERNS: { keywords: string[]; value: RelationshipStrength }[] = [
  { keywords: ['원래 잘 지냈', '평소엔 좋', '그동안 잘', '원래는 잘', '보통은 좋', '맨날 좋았는데', '항상 잘했는데', '진짜 좋았는데'], value: RelationshipStrength.STRONG },
  { keywords: ['좋을 때도', '그냥 그래', '보통', '들쑥날쑥', '어떨 때는 좋은데', '왔다갔다'], value: RelationshipStrength.MODERATE },
  { keywords: ['요즘 안 좋', '맨날 싸', '계속 안 좋', '이미 사이가', '원래 좀 안 좋', '자주 싸우', '계속 삐'], value: RelationshipStrength.WEAK },
  { keywords: ['모르겠', '잘 모르', '애매', '뭔지 모르겠'], value: RelationshipStrength.UNCERTAIN },
];

/** 변화 준비도 키워드 */
const CHANGE_READINESS_PATTERNS: { keywords: string[]; value: ChangeReadiness }[] = [
  { keywords: ['뭐라고 보내', '어떻게 보내', '뭐라 해', '답장 어떻게', '연락 어떻게', '해결하고 싶', '어떻게 하면', '뭐 해야', '카톡 뭐라고'], value: ChangeReadiness.READY_TO_ACT },
  { keywords: ['왜 이러는지', '이해가 안', '모르겠어', '혼란', '뭔지 모르겠', '왜 이러지', '뭐가 문제'], value: ChangeReadiness.NEEDS_PROCESSING },
  { keywords: ['이게 정상', '맞지?', '내가 예민', '이상한 건 아니지', '당연한 거지', '오버인가', '너무 예민한 건가'], value: ChangeReadiness.WANTS_VALIDATION },
  { keywords: ['끝내야 하나', '헤어질까', '관두', '포기', '놓아줘야', '그만해야', '안 사귀는 게', '이별', '정리해야'], value: ChangeReadiness.CONSIDERING_EXIT },
];

/** 상대방 맥락 키워드 */
const PARTNER_CONTEXT_PATTERNS: { keywords: string[]; value: PartnerContext }[] = [
  { keywords: ['시험', '바쁜', '출장', '야근', '일 때문', '회사', '바빠서', '시험기간', '프로젝트', '일이 많', '바쁘다고'], value: PartnerContext.LIKELY_BUSY },
  { keywords: ['싸운 후', '싸우고', '화나서', '말다툼', '다투고', '삐졌', '기분 나빠', '서운해하', '화가 났'], value: PartnerContext.LIKELY_UPSET },
  { keywords: ['일부러', '의도적', '고의', '일부러 안', '일부러 무시', '거리두기', '멀어지', '피하는'], value: PartnerContext.LIKELY_DISTANCING },
  { keywords: ['모르겠', '왜 그러는지', '뭔지 모르', '이유를 모르', '갑자기', '느닷없이'], value: PartnerContext.UNKNOWN },
];

/** 이미 시도한 것 키워드 */
const PREVIOUS_ATTEMPT_PATTERNS: { keywords: string[]; value: PreviousAttempt }[] = [
  { keywords: ['또 보냈', '다시 보냈', '추가로 보냈', '한번 더 보냈', '연락 또 했', '카톡 또', '다시 연락'], value: PreviousAttempt.SENT_MORE },
  { keywords: ['기다리고', '기다리는 중', '참고 기다', '기다렸는데', '기다려봤'], value: PreviousAttempt.WAITED },
  { keywords: ['인스타 확인', 'SNS 봤', '인스타 접속', '카스 확인', '프로필 확인', '접속 시간', '온라인', '인스타 올'], value: PreviousAttempt.CHECKED_SNS },
  { keywords: ['친구한테', '주변에', '물어봤', '상담', '얘기했', '친구가 그러는데', '언니한테', '형한테'], value: PreviousAttempt.ASKED_FRIENDS },
  { keywords: ['아무것도 안', '그냥 있', '가만히', '손 놓고'], value: PreviousAttempt.NOTHING },
];

/** 읽씹 전용: 읽씹 유형 키워드 */
const READ_TYPE_PATTERNS: { keywords: string[]; value: ReadType }[] = [
  { keywords: ['읽고', '읽었는데', '확인했는데', '읽기는', '1 사라졌', '읽씹'], value: ReadType.READ_NO_REPLY },
  { keywords: ['안읽', '안 읽', '1 그대로', '읽지도 않', '확인도 안', '안읽씹'], value: ReadType.UNREAD_IGNORED },
  { keywords: ['ㅇㅇ만', '응 만', '짧게', '성의없', '대충', '한글자', '한 글자'], value: ReadType.PARTIAL_REPLY },
  { keywords: ['그 얘기만', '그것만 무시', '특정', '그 주제'], value: ReadType.SELECTIVE },
  { keywords: ['한참 뒤에', '늦게 읽', '몇시간 뒤에 읽'], value: ReadType.DELAYED_READ },
];

// ============================================================
// 기존 4축 키워드 (read-ignored-axes.ts에서 이관)
// ============================================================

const DURATION_PATTERNS: { keywords: string[]; value: IssueDuration }[] = [
  { keywords: ['방금', '아까', '몇시간', '몇 시간', '오늘 보낸', '한시간', '두시간', '세시간', '시간 전', '시간전', '30분', '분 전', '분전'], value: IssueDuration.HOURS },
  { keywords: ['오늘', '하루', '아침에', '점심에', '어제', '어젯밤', '반나절', '24시간'], value: IssueDuration.SAME_DAY },
  { keywords: ['이틀', '2일', '3일', '사흘', '그제', '엊그제', '2~3일', '3일째', '이틀째'], value: IssueDuration.DAYS_2_3 },
  { keywords: ['4일', '5일', '6일', '닷새', '나흘', '거의 일주일', '5일째', '6일째', '4일째'], value: IssueDuration.DAYS_4_7 },
  { keywords: ['일주일', '1주일', '열흘', '2주', '보름', '일주일 넘', '몇주', '한달', '한 달'], value: IssueDuration.OVER_WEEK },
];

const STAGE_PATTERNS: { keywords: string[]; value: RelationshipStage }[] = [
  { keywords: ['썸', '소개팅', '매칭', '앱에서', '좋아하는 사람', '아직 사귀는건 아닌'], value: RelationshipStage.SOME },
  { keywords: ['사귄지 얼마 안', '사귄지 한달', '사귄지 두달', '만난지 얼마', '사귀기 시작'], value: RelationshipStage.EARLY_DATING },
  { keywords: ['사귀는', '남자친구', '여자친구', '남친', '여친', '애인', '연인', '사귄지 오래'], value: RelationshipStage.ESTABLISHED },
  { keywords: ['전 남친', '전 여친', '전남친', '전여친', '헤어진', '이별', '전 애인', '엑스'], value: RelationshipStage.POST_BREAKUP },
  { keywords: ['다시 만나', '재회', '다시 연락', '돌아오', '다시 사귀'], value: RelationshipStage.RECONCILIATION },
];

const FREQUENCY_PATTERNS: { keywords: string[]; value: FrequencyPattern }[] = [
  { keywords: ['처음', '이번이 첫', '원래 안 이랬', '갑자기 이래'], value: FrequencyPattern.FIRST_TIME },
  { keywords: ['가끔', '가끔씩', '때때로', '어쩔 때'], value: FrequencyPattern.OCCASIONAL },
  { keywords: ['자주', '종종', '꽤 자주', '여러 번'], value: FrequencyPattern.FREQUENT },
  { keywords: ['맨날', '항상', '늘', '매번', '만날', '원래 이래'], value: FrequencyPattern.ALWAYS },
  { keywords: ['점점', '갈수록', '더 심해', '심해지', '악화', '나빠지'], value: FrequencyPattern.WORSENING },
];

const ATTACHMENT_CLUE_PATTERNS: { keywords: string[]; value: AttachmentClue }[] = [
  { keywords: ['계속 확인', '또 보내', '추가 연락', '한번 더', '또 카톡', '폰 확인'], value: AttachmentClue.ANXIOUS_CHECKING },
  { keywords: ['내가 뭘', '내 잘못', '내가 잘못', '뭘 잘못', '내 탓', '자책'], value: AttachmentClue.ANXIOUS_SELF_BLAME },
  { keywords: ['나도 읽씹', '나도 안 읽', '똑같이', '보복', '나도 무시'], value: AttachmentClue.AVOIDANT_MIRRORING },
  { keywords: ['무슨 일', '걱정되', '괜찮은지', '사고났나'], value: AttachmentClue.SECURE_CONCERN },
  { keywords: ['바람', '다른 사람', '싫어져', '끝난건', '차이려고', '최악'], value: AttachmentClue.FEARFUL_SPIRAL },
];

// ============================================================
// 관계진단 엔진
// ============================================================

export class RelationshipDiagnosisEngine {
  /**
   * 메시지에서 범용 축 + 시나리오 축 자동 파싱
   *
   * 기존 값은 보존 (새로 발견한 것만 머지)
   */
  static parseFromMessage(
    message: string,
    existingState: DiagnosisAxesState,
    scenarioType?: string,
  ): DiagnosisAxesState {
    const msgLower = message.toLowerCase();
    const universal = { ...existingState.universal };
    const scenario = { ...existingState.scenario };

    // --- 기존 4축 파싱 ---
    if (!universal.duration) {
      for (const p of DURATION_PATTERNS) {
        if (p.keywords.some(kw => msgLower.includes(kw))) {
          universal.duration = p.value; break;
        }
      }
      // 숫자+시간 정규식 폴백
      if (!universal.duration) {
        const hourMatch = msgLower.match(/(\d+)\s*시간/);
        if (hourMatch) {
          const hours = parseInt(hourMatch[1]);
          universal.duration = hours <= 12 ? IssueDuration.HOURS : IssueDuration.SAME_DAY;
        }
        const dayMatch = msgLower.match(/(\d+)\s*일/);
        if (!universal.duration && dayMatch) {
          const days = parseInt(dayMatch[1]);
          if (days <= 1) universal.duration = IssueDuration.SAME_DAY;
          else if (days <= 3) universal.duration = IssueDuration.DAYS_2_3;
          else if (days <= 7) universal.duration = IssueDuration.DAYS_4_7;
          else universal.duration = IssueDuration.OVER_WEEK;
        }
      }
    }

    if (!universal.stage) {
      for (const p of STAGE_PATTERNS) {
        if (p.keywords.some(kw => msgLower.includes(kw))) {
          universal.stage = p.value; break;
        }
      }
    }

    if (!universal.pattern) {
      for (const p of FREQUENCY_PATTERNS) {
        if (p.keywords.some(kw => msgLower.includes(kw))) {
          universal.pattern = p.value; break;
        }
      }
    }

    if (!universal.attachmentClue) {
      for (const p of ATTACHMENT_CLUE_PATTERNS) {
        if (p.keywords.some(kw => msgLower.includes(kw))) {
          universal.attachmentClue = p.value; break;
        }
      }
    }

    // --- 신규 6축 파싱 ---
    if (!universal.conflictStyle) {
      for (const p of CONFLICT_STYLE_PATTERNS) {
        if (p.keywords.some(kw => msgLower.includes(kw))) {
          universal.conflictStyle = p.value; break;
        }
      }
    }

    if (!universal.relationshipStrength) {
      for (const p of RELATIONSHIP_STRENGTH_PATTERNS) {
        if (p.keywords.some(kw => msgLower.includes(kw))) {
          universal.relationshipStrength = p.value; break;
        }
      }
    }

    if (!universal.changeReadiness) {
      for (const p of CHANGE_READINESS_PATTERNS) {
        if (p.keywords.some(kw => msgLower.includes(kw))) {
          universal.changeReadiness = p.value; break;
        }
      }
    }

    if (!universal.partnerContext) {
      for (const p of PARTNER_CONTEXT_PATTERNS) {
        if (p.keywords.some(kw => msgLower.includes(kw))) {
          universal.partnerContext = p.value; break;
        }
      }
    }

    if (!universal.previousAttempts) {
      for (const p of PREVIOUS_ATTEMPT_PATTERNS) {
        if (p.keywords.some(kw => msgLower.includes(kw))) {
          universal.previousAttempts = p.value; break;
        }
      }
    }

    // --- 시나리오 전용 축 ---
    if (scenarioType === 'READ_AND_IGNORED' && !scenario.readType) {
      for (const p of READ_TYPE_PATTERNS) {
        if (p.keywords.some(kw => msgLower.includes(kw))) {
          scenario.readType = p.value; break;
        }
      }
    }

    return {
      universal,
      scenario,
      askedAxes: existingState.askedAxes,
    };
  }

  /**
   * LLM 분석 결과(StateResult)에서 축 데이터 머지
   */
  static mergeFromStateResult(
    existingState: DiagnosisAxesState,
    stateResult: StateResult,
  ): DiagnosisAxesState {
    const universal = { ...existingState.universal };
    const scenario = { ...existingState.scenario };

    // horsemenDetected 머지
    if (stateResult.horsemenDetected && stateResult.horsemenDetected.length > 0) {
      universal.horsemenDetected = stateResult.horsemenDetected;
    }

    // LLM이 추출한 읽씹 축 머지
    if (stateResult.llmReadIgnoredAxes) {
      const llm = stateResult.llmReadIgnoredAxes;
      if (!universal.duration && llm.duration) {
        universal.duration = llm.duration as IssueDuration;
      }
      if (!universal.stage && llm.stage) {
        universal.stage = llm.stage as RelationshipStage;
      }
      if (!universal.pattern && llm.pattern) {
        universal.pattern = llm.pattern as FrequencyPattern;
      }
      if (!scenario.readType && llm.readType) {
        scenario.readType = llm.readType as ReadType;
      }
    }

    // LLM 신규 축 머지 (Phase 2에서 StateResult에 추가될 필드)
    const sr = stateResult as StateResult & {
      conflictStyle?: string;
      relationshipStrength?: string;
      changeReadiness?: string;
      partnerContext?: string;
      previousAttempts?: string;
    };

    if (!universal.conflictStyle && sr.conflictStyle) {
      universal.conflictStyle = sr.conflictStyle as ConflictStyle;
    }
    if (!universal.relationshipStrength && sr.relationshipStrength) {
      universal.relationshipStrength = sr.relationshipStrength as RelationshipStrength;
    }
    if (!universal.changeReadiness && sr.changeReadiness) {
      universal.changeReadiness = sr.changeReadiness as ChangeReadiness;
    }
    if (!universal.partnerContext && sr.partnerContext) {
      universal.partnerContext = sr.partnerContext as PartnerContext;
    }
    if (!universal.previousAttempts && sr.previousAttempts) {
      universal.previousAttempts = sr.previousAttempts as PreviousAttempt;
    }

    // 애착 단서: LLM attachmentType → attachmentClue 변환
    if (!universal.attachmentClue && stateResult.attachmentType) {
      switch (stateResult.attachmentType) {
        case 'ANXIOUS': universal.attachmentClue = AttachmentClue.ANXIOUS_CHECKING; break;
        case 'AVOIDANT': universal.attachmentClue = AttachmentClue.AVOIDANT_MIRRORING; break;
        case 'SECURE': universal.attachmentClue = AttachmentClue.SECURE_CONCERN; break;
      }
    }

    return {
      universal,
      scenario,
      askedAxes: existingState.askedAxes,
    };
  }

  /**
   * 진단 축 수집 메타 분석
   */
  static analyzeCollection(state: DiagnosisAxesState): DiagnosisCollectionMeta {
    const asked = state.askedAxes ?? [];
    const universalKeys: (keyof UniversalAxes)[] = [
      'duration', 'stage', 'pattern', 'attachmentClue',
      'conflictStyle', 'relationshipStrength', 'changeReadiness',
      'partnerContext', 'previousAttempts',
    ];

    // horsemenDetected는 LLM 자동 → 수집 대상 제외
    const filledUniversal = universalKeys.filter(k => state.universal[k] !== undefined);
    const missingUniversal = universalKeys.filter(k => state.universal[k] === undefined);
    if (state.universal.horsemenDetected?.length) {
      filledUniversal.push('horsemenDetected' as keyof UniversalAxes);
    }

    const filledScenario = Object.keys(state.scenario).filter(
      k => (state.scenario as Record<string, unknown>)[k] !== undefined
    );

    const filledCount = filledUniversal.length + filledScenario.length;

    // 핵심 축: duration + stage + changeReadiness → 최소 이 3개 있어야 기본 매칭 가능
    const needsDiagnostic = !state.universal.duration || !state.universal.stage || !state.universal.changeReadiness;

    // 질문 우선순위: duration → stage → changeReadiness → conflictStyle → pattern
    const axisQuestionPriority: (keyof UniversalAxes)[] = [
      'duration', 'stage', 'changeReadiness', 'conflictStyle', 'pattern',
    ];
    let nextAxis: string | null = null;
    for (const axis of axisQuestionPriority) {
      if (!state.universal[axis] && !asked.includes(axis)) {
        nextAxis = axis;
        break;
      }
    }

    // 선택지 폴백
    let shouldShowChoices = false;
    let choicesAxis: string | null = null;
    if (!state.universal.duration && asked.includes('duration')) {
      shouldShowChoices = true;
      choicesAxis = 'duration';
    } else if (!state.universal.stage && asked.includes('stage')) {
      shouldShowChoices = true;
      choicesAxis = 'stage';
    }

    return {
      state,
      filledCount,
      nextAxis,
      needsDiagnostic,
      shouldShowChoices,
      choicesAxis,
    };
  }

  /**
   * 최종 진단 결과 생성
   */
  static generateDiagnosis(state: DiagnosisAxesState): DiagnosisResult {
    const u = state.universal;
    const s = state.scenario;

    // 채워진 축 카운트
    const universalKeys: (keyof UniversalAxes)[] = [
      'duration', 'stage', 'pattern', 'attachmentClue',
      'conflictStyle', 'relationshipStrength', 'changeReadiness',
      'partnerContext', 'previousAttempts',
    ];
    const filledUniversalCount = universalKeys.filter(k => u[k] !== undefined).length
      + (u.horsemenDetected?.length ? 1 : 0);

    const filledScenarioCount = Object.values(s).filter(v => v !== undefined).length;
    const totalFilledCount = filledUniversalCount + filledScenarioCount;

    // 진단 품질
    let diagnosisQuality: DiagnosisResult['diagnosisQuality'] = 'insufficient';
    if (totalFilledCount >= 8) diagnosisQuality = 'excellent';
    else if (totalFilledCount >= 5) diagnosisQuality = 'good';
    else if (totalFilledCount >= 3) diagnosisQuality = 'basic';

    // 핵심 발견 사항
    const keyFindings: DiagnosisKeyFinding[] = [];

    if (u.conflictStyle) {
      const labels: Record<ConflictStyle, string> = {
        PURSUE: '매달리는 경향',
        WITHDRAW: '움츠리는 경향',
        CONFRONT: '직면하는 스타일',
        AVOID: '회피하는 경향',
      };
      const descs: Record<ConflictStyle, string> = {
        PURSUE: '상대에게 먼저 다가가려는 행동이 보여요',
        WITHDRAW: '혼자 기다리며 참고 있는 편이에요',
        CONFRONT: '직접 대화로 해결하려는 편이에요',
        AVOID: '갈등을 피하고 넘어가려는 편이에요',
      };
      keyFindings.push({
        icon: '⚡', label: labels[u.conflictStyle],
        description: descs[u.conflictStyle], basedOn: 'conflictStyle',
      });
    }

    if (u.changeReadiness) {
      const labels: Record<ChangeReadiness, string> = {
        READY_TO_ACT: '행동 준비 완료',
        NEEDS_PROCESSING: '감정 정리 중',
        WANTS_VALIDATION: '확인이 필요한 상태',
        CONSIDERING_EXIT: '관계 고민 중',
      };
      const descs: Record<ChangeReadiness, string> = {
        READY_TO_ACT: '구체적인 행동 방법을 원하고 있어요',
        NEEDS_PROCESSING: '아직 마음을 정리하는 단계에요',
        WANTS_VALIDATION: '자신의 감정이 정상인지 확인받고 싶어해요',
        CONSIDERING_EXIT: '이 관계를 계속할지 고민 중이에요',
      };
      keyFindings.push({
        icon: '🎯', label: labels[u.changeReadiness],
        description: descs[u.changeReadiness], basedOn: 'changeReadiness',
      });
    }

    if (u.horsemenDetected && u.horsemenDetected.length > 0) {
      const horsemenLabels: Record<string, string> = {
        CRITICISM: '비판 패턴', CONTEMPT: '경멸 패턴',
        DEFENSIVENESS: '방어 패턴', STONEWALLING: '담쌓기 패턴',
      };
      keyFindings.push({
        icon: '🛡️',
        label: `Gottman: ${u.horsemenDetected.map(h => horsemenLabels[h] || h).join(', ')}`,
        description: '소통 방식에서 주의가 필요한 패턴이 감지됐어요',
        basedOn: 'horsemenDetected',
      });
    }

    if (u.previousAttempts) {
      const labels: Record<PreviousAttempt, string> = {
        SENT_MORE: '추가 연락 시도함',
        WAITED: '기다리는 중',
        CHECKED_SNS: 'SNS 확인함',
        ASKED_FRIENDS: '주변에 물어봄',
        NOTHING: '아직 아무것도 안 함',
      };
      keyFindings.push({
        icon: '📱', label: labels[u.previousAttempts],
        description: '이미 시도한 것을 고려해서 조언할게요',
        basedOn: 'previousAttempts',
      });
    }

    // 요약 생성
    const summary = this.generateSummary(u, s);

    return {
      universal: u,
      scenario: s,
      filledUniversalCount,
      filledScenarioCount,
      totalFilledCount,
      diagnosisQuality,
      summary,
      keyFindings: keyFindings.slice(0, 3), // 최대 3개
    };
  }

  /**
   * 진단 요약 한국어 생성
   */
  private static generateSummary(u: UniversalAxes, s: ScenarioAxes): string {
    const parts: string[] = [];

    if (u.duration) {
      const durationLabels: Record<IssueDuration, string> = {
        HOURS: '몇 시간 전부터', SAME_DAY: '오늘 하루 정도',
        DAYS_2_3: '2~3일째', DAYS_4_7: '4일~일주일째',
        OVER_WEEK: '일주일 넘게',
      };
      parts.push(durationLabels[u.duration]);
    }

    if (u.pattern) {
      const patternLabels: Record<FrequencyPattern, string> = {
        FIRST_TIME: '처음 겪는 상황', OCCASIONAL: '가끔 반복되는 상황',
        FREQUENT: '자주 겪는 상황', ALWAYS: '늘 반복되는 패턴',
        WORSENING: '점점 악화되는 추세',
      };
      parts.push(patternLabels[u.pattern]);
    }

    if (u.relationshipStrength) {
      const strengthLabels: Record<RelationshipStrength, string> = {
        STRONG: '평소 관계는 좋은 편', MODERATE: '관계가 보통인 편',
        WEAK: '이미 관계가 흔들리는 상태', UNCERTAIN: '관계 상태 파악 중',
      };
      parts.push(strengthLabels[u.relationshipStrength]);
    }

    return parts.length > 0
      ? parts.join(', ') + '이에요.'
      : '대화를 더 나누면 더 정확한 분석이 가능해요.';
  }

  /**
   * 빈 진단 상태 생성
   */
  static createEmptyState(): DiagnosisAxesState {
    return {
      universal: {},
      scenario: {},
      askedAxes: [],
    };
  }

  /**
   * askedAxes에 축 추가 (중복 방지)
   */
  static markAxisAsked(state: DiagnosisAxesState, axis: string): DiagnosisAxesState {
    const asked = state.askedAxes ?? [];
    if (asked.includes(axis)) return state;
    return { ...state, askedAxes: [...asked, axis] };
  }
}
