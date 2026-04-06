/**
 * 🆕 v12: 관계진단 엔진 타입 정의
 *
 * 범용 10축 + 시나리오 전용 축 구조
 * 해결책 분기를 세밀하게 나누기 위한 진단 데이터
 *
 * 근거: Gottman Relationship Checkup (2025), EFT De-escalation,
 *        Professional Counselor Intake Assessment (headway.co),
 *        AI Chatbot Solution Branching (scale.com), MZ세대 연애 보고서
 */

import type { HorsemenType, AttachmentType } from '@/types/engine.types';

// ============================================================
// 범용 축 (모든 시나리오 공통) — 10개
// ============================================================

// --- 기존 4축 (이름은 범용으로 재정의) ---

/** 축 1: 문제 지속 기간 */
export enum IssueDuration {
  /** ~6시간 — 과해석 위험 */
  HOURS = 'HOURS',
  /** 6~24시간 — 미묘한 신호 */
  SAME_DAY = 'SAME_DAY',
  /** 2~3일 — 의도적 가능성 */
  DAYS_2_3 = 'DAYS_2_3',
  /** 4일~1주 — 위기 신호 */
  DAYS_4_7 = 'DAYS_4_7',
  /** 1주 이상 — 심각 */
  OVER_WEEK = 'OVER_WEEK',
}

/** 축 2: 관계 단계 */
export enum RelationshipStage {
  /** 썸/소개팅 */
  SOME = 'SOME',
  /** 연애 초기 (1~3개월) */
  EARLY_DATING = 'EARLY_DATING',
  /** 안정기 (3개월+) */
  ESTABLISHED = 'ESTABLISHED',
  /** 이별 후 */
  POST_BREAKUP = 'POST_BREAKUP',
  /** 재회 시도 중 */
  RECONCILIATION = 'RECONCILIATION',
}

/** 축 3: 반복 패턴 (빈도) */
export enum FrequencyPattern {
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

/** 축 4: 애착 행동 단서 */
export enum AttachmentClue {
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

// --- 신규 6축 ---

/** 축 5: 갈등 반응 스타일
 * 근거: EFT 추구-철수 연구 (Psychology Today), Gottman 갈등관리
 */
export enum ConflictStyle {
  /** 매달림 — "왜 답 안해?!" 연달아 보냄 */
  PURSUE = 'PURSUE',
  /** 움츠림 — 자기도 안 보내고 기다림 */
  WITHDRAW = 'WITHDRAW',
  /** 직면 — "우리 얘기 좀 하자" */
  CONFRONT = 'CONFRONT',
  /** 회피 — 아예 안 꺼냄, 다른 화제 */
  AVOID = 'AVOID',
}

/** 축 6: 관계 강도 (평상시 기준)
 * 근거: Gottman Friendship & Intimacy 차원
 */
export enum RelationshipStrength {
  /** 평소 관계 좋음. 이번이 예외적 */
  STRONG = 'STRONG',
  /** 보통. 좋을 때도 나쁠 때도 */
  MODERATE = 'MODERATE',
  /** 이미 관계 흔들리는 중 */
  WEAK = 'WEAK',
  /** 모르겠음/파악 불가 */
  UNCERTAIN = 'UNCERTAIN',
}

/** 축 7: 변화 준비도
 * 근거: MI(동기강화상담) Stages of Change, SFBT Goal Setting
 */
export enum ChangeReadiness {
  /** 바로 행동하고 싶음 — "뭐라고 보내?" */
  READY_TO_ACT = 'READY_TO_ACT',
  /** 아직 감정 정리 중 — "왜 이러는지 모르겠어" */
  NEEDS_PROCESSING = 'NEEDS_PROCESSING',
  /** 내가 맞는지 확인하고 싶음 — "이게 정상이야?" */
  WANTS_VALIDATION = 'WANTS_VALIDATION',
  /** 관계 자체를 고민 중 — "그냥 끝내야 하나" */
  CONSIDERING_EXIT = 'CONSIDERING_EXIT',
}

/** 축 8: 상대방 반응 맥락 추정
 * 근거: Professional Intake Assessment (headway.co)
 */
export enum PartnerContext {
  /** 바쁜 것 같음 — 시험/출장/일 등 단서 */
  LIKELY_BUSY = 'LIKELY_BUSY',
  /** 화난 것 같음 — 전에 싸운 후 */
  LIKELY_UPSET = 'LIKELY_UPSET',
  /** 의도적 거리두기 */
  LIKELY_DISTANCING = 'LIKELY_DISTANCING',
  /** 상대 상황 모르겠음 */
  UNKNOWN = 'UNKNOWN',
}

/** 축 9: 이미 시도한 것
 * 근거: AI Chatbot Solution Branching (같은 조언 반복 방지)
 */
export enum PreviousAttempt {
  /** 추가 연락 보냄 */
  SENT_MORE = 'SENT_MORE',
  /** 기다리고 있음 */
  WAITED = 'WAITED',
  /** SNS 확인함 (인스타 등) */
  CHECKED_SNS = 'CHECKED_SNS',
  /** 주변에 물어봄 */
  ASKED_FRIENDS = 'ASKED_FRIENDS',
  /** 아무것도 안 함 */
  NOTHING = 'NOTHING',
}

// 축 10: horsemenDetected — 기존 HorsemenType[] 그대로 사용 (engine.types.ts)

// ============================================================
// 시나리오 전용 축 (시나리오별 다름)
// ============================================================

/** 읽씹 전용: 읽씹 유형 */
export enum ReadType {
  /** 읽고 답 안 함 (1 사라짐) */
  READ_NO_REPLY = 'READ_NO_REPLY',
  /** 안읽씹 (1 유지) */
  UNREAD_IGNORED = 'UNREAD_IGNORED',
  /** 짧은/성의없는 답 */
  PARTIAL_REPLY = 'PARTIAL_REPLY',
  /** 특정 내용만 무시 */
  SELECTIVE = 'SELECTIVE',
  /** 매우 늦게 읽음 */
  DELAYED_READ = 'DELAYED_READ',
}

/** 잠수 전용: 잠수 유형
 * 근거: Psychology Today 2025 체계적 리뷰, WikiHow 고스팅 분류
 */
export enum GhostType {
  /** 완전 연락 두절 — "마지막 메시지 1통 + 기한 설정" */
  CLASSIC = 'CLASSIC',
  /** 점진적 연락 감소 (Caspering) — "패턴 인지 + 직접 대화" */
  SLOW_FADE = 'SLOW_FADE',
  /** 간헐적 비커밋 메시지 (낚시) — "의도 파악 + 경계 설정" */
  BREADCRUMBING = 'BREADCRUMBING',
  /** 오랜 잠수 후 재등장 — "경계 재설정 + I-message" */
  ZOMBIEING = 'ZOMBIEING',
  /** SNS만 감시 (직접 연락 X) — "디지털 경계 + 자기보호" */
  ORBITING = 'ORBITING',
}

/** 장거리 전용: 장거리 종료 전망
 * 근거: SFBT 목표설정 기법, NIH 2025 LDR 종단 연구
 */
export enum LDREndpoint {
  /** 종료 시점 확정 — "기대 관리 + 만남 질 높이기" */
  DEFINITE = 'DEFINITE',
  /** 대략적 계획만 — "구체화 촉진" */
  VAGUE_PLAN = 'VAGUE_PLAN',
  /** 무기한 — "끝점 설정 대화 유도" */
  NO_PLAN = 'NO_PLAN',
  /** 더 멀어질 예정 — "관계 존속 재평가" */
  GETTING_WORSE = 'GETTING_WORSE',
  /** 군대/복무 — "제한된 소통 최적화" */
  MILITARY = 'MILITARY',
}

/** 질투 전용: 질투 유형 (MJS 3차원 확장)
 * 근거: Multidimensional Jealousy Scale (MJS), PsyPost 2026
 */
export enum JealousyType {
  /** 인지적: 의심/반추/시나리오 생성 → CBT 인지교정 */
  COGNITIVE = 'COGNITIVE',
  /** 정서적: 즉각 감정반응/화 → EFT 감정조절 */
  EMOTIONAL = 'EMOTIONAL',
  /** 행동적: 확인/감시/통제 → 행동 수정 + 경계 */
  BEHAVIORAL = 'BEHAVIORAL',
  /** 과거지향: 전 연인/과거 경험 집착 → 트라우마 처리 */
  RETROACTIVE = 'RETROACTIVE',
  /** 예방적: 미리 상대 행동 제한 → 신뢰 구축 */
  PREVENTIVE = 'PREVENTIVE',
}

/** 외도 전용: 내담자 역할
 * 근거: Gottman Trust Revival RCT, EFT 외도 회복 연구
 */
export enum InfidelityRole {
  /** 배신당한 쪽 → 트라우마 케어 + 신뢰 회복 */
  BETRAYED = 'BETRAYED',
  /** 외도한 쪽 → 책임 인정 + 동기 탐색 */
  UNFAITHFUL = 'UNFAITHFUL',
  /** 의심 단계 → 증거 vs 추측 분리 (CBT) */
  SUSPECTED = 'SUSPECTED',
  /** 상대 외도 발견 직후 → 위기 안정화 */
  DISCOVERED_PARTNER = 'DISCOVERED_PARTNER',
  /** 본인이 외도 고민 → MI 양가감정 탐색 */
  CONSIDERING = 'CONSIDERING',
}

/** 이별고민 전용: 양가감정 수준
 * 근거: Surjadi et al. 2023, Semanko & Hinsz 2025 이별 통합 프레임
 */
export enum BreakupAmbivalence {
  /** 남고 싶은 쪽 → 관계 개선 방법 모색 */
  LEANING_STAY = 'LEANING_STAY',
  /** 완전 양가 → MI 양면반영 + 가치관 정리 */
  COMPLETELY_TORN = 'COMPLETELY_TORN',
  /** 떠나고 싶은 쪽 → 이별 준비 + 자기보호 */
  LEANING_LEAVE = 'LEANING_LEAVE',
  /** 결심함 → 이별 전달법 + 사후 관리 */
  DECIDED_LEAVE = 'DECIDED_LEAVE',
  /** 죄책감에 못 떠남 → 매몰비용 교정 */
  GUILT_TRAPPED = 'GUILT_TRAPPED',
}

/** 권태기 전용: 권태 유형
 * 근거: 쾌락적 적응 방지 모델(HAP), 자기확장이론 2025
 */
export enum BoredomType {
  /** 감정적 무관심 → EFT 감정 재연결 */
  EMOTIONAL = 'EMOTIONAL',
  /** 대화 고갈 → Gottman 소통 패턴 리셋 */
  CONVERSATIONAL = 'CONVERSATIONAL',
  /** 일상 루틴 피로 → 자기확장 활동 (HAP 모델) */
  ROUTINE = 'ROUTINE',
  /** 성적 권태 → 친밀감 단계적 재구축 */
  SEXUAL = 'SEXUAL',
  /** 성장 속도 차이 → 공동 목표 설정 (SFBT) */
  GROWTH_GAP = 'GROWTH_GAP',
}

/** 일반 고민 전용: 고민 유형
 * 근거: 한국 MZ세대 연애 보고서 2025, 가치관 매칭 트렌드
 */
export enum GeneralConcernType {
  /** 소통/대화 문제 → Gottman 4기수 대응 */
  COMMUNICATION = 'COMMUNICATION',
  /** 미래 계획 불일치 → 가치관 정렬 */
  FUTURE_PLANS = 'FUTURE_PLANS',
  /** 관계 속 자존감 → 자기가치 회복 */
  SELF_WORTH = 'SELF_WORTH',
  /** 가족/주변 갈등 → 경계 설정 */
  FAMILY_ISSUES = 'FAMILY_ISSUES',
  /** 연애 기술 부족 → 스킬 빌딩 */
  DATING_SKILLS = 'DATING_SKILLS',
}

// ============================================================
// 시나리오 전용 축 인터페이스
// ============================================================

/** 시나리오 전용 축 (시나리오별 핵심 1개) */
export interface ScenarioAxes {
  // 📱 읽씹
  readType?: ReadType;
  // 👻 잠수
  ghostType?: GhostType;
  // ✈️ 장거리
  ldrEndpoint?: LDREndpoint;
  // 💚 질투
  jealousyType?: JealousyType;
  // 💔 외도
  infidelityRole?: InfidelityRole;
  // 🤔 이별 고민
  breakupAmbivalence?: BreakupAmbivalence;
  // 😴 권태기
  boredomType?: BoredomType;
  // 🌐 일반
  generalConcernType?: GeneralConcernType;
}

// ============================================================
// 진단 결과 (DiagnosisResult)
// ============================================================

/** 범용 10축 진단 데이터 */
export interface UniversalAxes {
  // 기존 4축
  duration?: IssueDuration;
  stage?: RelationshipStage;
  pattern?: FrequencyPattern;
  attachmentClue?: AttachmentClue;

  // 신규 6축
  conflictStyle?: ConflictStyle;
  relationshipStrength?: RelationshipStrength;
  changeReadiness?: ChangeReadiness;
  partnerContext?: PartnerContext;
  previousAttempts?: PreviousAttempt;
  horsemenDetected?: HorsemenType[];
}

/** 관계진단 결과 (범용 + 시나리오별) */

export interface DiagnosisResult {
  /** 범용 10축 */
  universal: UniversalAxes;
  /** 시나리오 전용 축 */
  scenario: ScenarioAxes;

  /** 채워진 범용 축 개수 (0~10) */
  filledUniversalCount: number;
  /** 채워진 시나리오 축 개수 */
  filledScenarioCount: number;
  /** 총 채워진 축 개수 */
  totalFilledCount: number;

  /** 진단 품질 — 해결책 매칭에 충분한 데이터가 있는지 */
  diagnosisQuality: 'insufficient' | 'basic' | 'good' | 'excellent';

  /** 진단 요약 (한국어, 2~3줄) — InsightCard/DiagnosisCard에 표시 */
  summary: string;

  /** 핵심 발견 사항 (최대 3개) — UI에 하이라이트 */
  keyFindings: DiagnosisKeyFinding[];
}

/** 핵심 발견 사항 */
export interface DiagnosisKeyFinding {
  /** 아이콘 이모지 */
  icon: string;
  /** 짧은 라벨 (예: "매달림 경향") */
  label: string;
  /** 상세 설명 (1줄) */
  description: string;
  /** 근거가 된 축 */
  basedOn: string;
}

// ============================================================
// 진단 축 수집 상태 (세션 누적)
// ============================================================

/** 세션에 쌓이는 진단 축 상태 */
export interface DiagnosisAxesState {
  /** 범용 축 */
  universal: UniversalAxes;
  /** 시나리오 전용 축 */
  scenario: ScenarioAxes;
  /** AI가 이미 질문한 축 목록 (재질문 방지) */
  askedAxes: string[];
}

/** 축 수집 메타 (진단 질문 필요 여부 판단) */
export interface DiagnosisCollectionMeta {
  /** 전체 수집 상태 */
  state: DiagnosisAxesState;
  /** 채워진 총 축 개수 */
  filledCount: number;
  /** 다음에 물어볼 축 (null이면 충분) */
  nextAxis: string | null;
  /** 진단 질문이 필요한지 */
  needsDiagnostic: boolean;
  /** 선택지 폴백 필요 (질문했는데 못 감지) */
  shouldShowChoices: boolean;
  /** 선택지를 보여줄 축 */
  choicesAxis: string | null;
}
