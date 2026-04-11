/**
 * 🆕 v41: 친밀도 시스템 v2 — 다차원 관계 모델
 *
 * 기존 1차원 intimacyScore (0~100)을 4축 독립 시스템으로 확장.
 * 사회침투이론(Altman & Taylor, 1973) + 애착이론 기반.
 *
 * 핵심 철학:
 *  - 말투는 Lv.1부터 동일 (편한 언니체 유지)
 *  - 변하는 것은 "감정 깊이, 솔직함, 자기개방"
 *  - 현실시간(1개월 ≈ Lv.3) 속도로 성장
 *  - 미방문 시 자연 감쇠 (현실 관계처럼)
 */

/** 4차원 관계 축 */
export interface IntimacyDimensions {
  /** 🛡️ 신뢰 (0~100): "이 사람한테 말해도 괜찮아" */
  trust: number;
  /** 💜 개방 (0~100): "다 말하고 싶어" (자기개방 깊이) */
  openness: number;
  /** 🦊 유대 (0~100): "또 오고 싶어" (정서적 연결) */
  bond: number;
  /** ⭐ 존경 (0~100): "루나 말 진짜 도움 된다" (전문성 인정) */
  respect: number;
}

/** 5단계 친밀도 레벨 */
export type IntimacyLevelId = 1 | 2 | 3 | 4 | 5;

/** 레벨 정보 */
export interface IntimacyLevelInfo {
  level: IntimacyLevelId;
  /** 내부 이름 */
  name: string;
  /** 이모지 */
  emoji: string;
  /** 최소 평균 점수 (4축 평균) */
  minAvg: number;
  /** 다음 레벨까지 필요 점수 */
  nextAvg: number;
  /** 유저에게 보이는 관계 라벨 */
  label: string;
  /** 감정 깊이 설명 */
  depthHint: string;
  /** 해금되는 행동들 */
  unlocks: string[];
}

/** 전체 친밀도 상태 (DB 저장 단위) */
export interface IntimacyState {
  /** 4축 점수 */
  dimensions: IntimacyDimensions;
  /** 현재 레벨 (계산값, 편의용) */
  level: IntimacyLevelId;
  /** 레벨 이름 (편의용) */
  levelName: string;
  /** 총 세션 수 */
  totalSessions: number;
  /** 연속 방문 일수 */
  consecutiveDays: number;
  /** 첫 상담 일시 (ISO) */
  firstSessionAt: string | null;
  /** 마지막 상담 일시 (ISO) */
  lastSessionAt: string | null;
  /** 달성한 마일스톤 */
  milestones: string[];
  /** 역대 최고 개방 점수 (감쇠 영향 안 받음, 기억용) */
  peakOpenness: number;
  /** 역대 최고 신뢰 점수 */
  peakTrust: number;
  /** 마지막 레벨업 시각 */
  lastLevelUpAt: string | null;
}

/** 트리거 종류 (28가지 + 확장 가능) */
export type IntimacyTriggerType =
  // 증가 트리거
  | 'emotion_share'        // 1. 감정 표현
  | 'deep_secret'          // 2. 깊은 비밀 공유
  | 'session_complete'     // 3. 세션 완주 (EMPOWER 도달)
  | 'advice_accepted'      // 4. 루나 조언 수용
  | 'revisit_quick'        // 5. 3일 내 재방문
  | 'emotion_shift_ack'    // 6. 감정 변화 인정
  | 'gratitude'            // 7. 루나에게 감사
  | 'humor_laugh'          // 8. 유머에 ㅋㅋㅋ 반응
  | 'long_share'           // 9. 100자+ 장문 공유
  | 'relationship_detail'  // 10. 관계 세부사항 공유
  | 'homework_report'      // 11. 숙제 이행 보고
  | 'nickname_given'       // 12. 루나 별명 부여
  | 'consecutive_visit'    // 13. 연속 방문 (일당)
  | 'mind_read_accepted'   // 14. 마음읽기 수용

  // 감소 트리거
  | 'long_absence'         // 15. 7일+ 미방문
  | 'early_exit'           // 16. HOOK에서 종료
  | 'short_repeat'         // 17. 단답 3회 연속
  | 'advice_rejected'      // 18. 조언 거부
  | 'negative_feedback'    // 19. 부정적 피드백

  // 특수 이벤트
  | 'first_tears'          // 20. 첫 감정 폭발
  | 'first_secret'         // 21. 첫 비밀
  | 'first_gratitude'      // 22. 첫 감사
  | 'crisis_request'       // 23. 위기 의뢰
  | 'milestone_100'        // 24. 100세션 달성
  | 'consecutive_week'     // 25. 7일 연속
  | 'luna_mistake_forgive' // 26. 루나 실수 용서
  | 'relationship_update'  // 27. 관계 변화 긍정 보고
  | 'anniversary_visit';   // 28. 기념일 방문

/** 개별 트리거 이벤트 */
export interface IntimacyTrigger {
  type: IntimacyTriggerType;
  /** 각 축별 델타 (양수/음수) */
  trust?: number;
  openness?: number;
  bond?: number;
  respect?: number;
  /** 디버그용 컨텍스트 */
  context?: string;
}

/** 트리거 처리 결과 */
export interface IntimacyUpdateResult {
  before: IntimacyState;
  after: IntimacyState;
  triggers: IntimacyTrigger[];
  /** 각 축별 총 변화량 */
  totalDelta: {
    trust: number;
    openness: number;
    bond: number;
    respect: number;
  };
  /** 레벨 변경 여부 */
  levelChanged: boolean;
  /** 새 마일스톤 달성 목록 */
  newMilestones: string[];
}

/** 페르소나별 가중치 (루나 vs 타로냥 차별화) */
export interface PersonaIntimacyWeights {
  trust: number;
  openness: number;
  bond: number;
  respect: number;
}

/** 기본 상태 생성 */
export function createDefaultIntimacyState(): IntimacyState {
  return {
    dimensions: {
      trust: 10,
      openness: 5,
      bond: 8,
      respect: 5,
    },
    level: 1,
    levelName: '새싹',
    totalSessions: 0,
    consecutiveDays: 0,
    firstSessionAt: null,
    lastSessionAt: null,
    milestones: [],
    peakOpenness: 5,
    peakTrust: 10,
    lastLevelUpAt: null,
  };
}
