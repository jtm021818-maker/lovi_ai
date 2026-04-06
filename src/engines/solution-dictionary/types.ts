/**
 * 🆕 v6: 해결책 사전(Solution Dictionary) 타입 정의
 * 
 * 시나리오별 검증된 해결책 데이터 구조 + 매칭 결과 + ReadinessScore
 */

import { RelationshipScenario, AttachmentType } from '@/types/engine.types';

// ============================================================
// 해결책 엔트리
// ============================================================

/** 해결책 사전 엔트리 */
export interface SolutionEntry {
  id: string;                        // 'READ_IGNORED_01'
  scenario: RelationshipScenario;

  // ── 매칭 조건 ──
  trigger: {
    keywords: string[];              // ['읽씹', '답장없음', '읽고도']
    attachmentStyles?: AttachmentType[]; // 특정 애착유형에 더 적합
    emotionRange?: [number, number]; // [-5, -1] = 감정이 나쁠 때
    minConfidence: number;           // 시나리오 감지 최소 확신도 (0~1)
  };

  // ── 해결책 ──
  solution: {
    framework: string;               // 'Gottman' | 'SFBT' | 'EFT' | 'CBT' | 'MI'
    technique: string;               // '부드러운 시작(Gentle Start-Up)'
    principle: string;               // 원칙 설명

    /** 공감→인사이트→행동 (확장형) */
    steps: {
      validation: string;            // 공감 2~3줄
      insight: string;               // 인사이트 3~4줄
      action: string;                // 구체적 행동 3~5줄
    };

    /** 카톡 메시지 초안 */
    messageDrafts?: string[];
    /** I-message 템플릿 */
    iMessageTemplate?: string;
    /** 근거 출처 */
    source?: string;

    // 🆕 v11: 전문성 강화 필드
    /** 연구 근거 상세 설명 (2~3줄) */
    researchNote?: string;
    /** 전문가 인용 (예: "Gottman 박사는...") */
    expertQuote?: string;
    /** 과학적 원리 (예: "편도체 위협 반응 시스템") */
    scientificBasis?: string;
    /** 한국 MZ세대 맥락 (예: "카톡 1 확인 문화") */
    koreanContext?: string;
    /** 감정 구간: crisis(-5~-3), distressed(-3~-1), confused(-2~0), mixed(양가), stable(1~5), mild(경미), anxious(불안), sad(슬픔) */
    emotionTier?: 'crisis' | 'distressed' | 'confused' | 'mixed' | 'stable' | 'mild' | 'anxious' | 'sad';
    /** 확장된 카톡 초안 (상황별 3종) */
    additionalDrafts?: {
      formal: string;                // 정중한 버전
      casual: string;                // 캐주얼 버전
      minimal: string;               // 최소한 버전
    };
  };

  // ── 메타 ──
  priority: number;                  // 1=최우선, 5=보조
  persona: {
    counselor: string;               // 상담사 톤 힌트
    friend: string;                  // 친구 톤 힌트
  };
  source?: string;                   // 근거 출처 (optional, solution.source 사용 가능)
}

// ============================================================
// 매칭 결과
// ============================================================

/** 해결책 매칭 결과 */
export interface SolutionMatch {
  entry: SolutionEntry;
  matchScore: number;     // 0~1
  reason: string;         // 매칭 이유 설명
}

// ============================================================
// Readiness (분석 완료도)
// ============================================================

/** 단계전이 판단을 위한 Readiness 컨텍스트 */
export interface ReadinessContext {
  // 수집된 정보
  hasScenario: boolean;
  hasSolutionMatch: boolean;
  matchScore: number;
  
  // 사용자 상태
  hasAskedForAdvice: boolean;
  turnCount: number;
  
  // 대화 품질 (과거 턴 누적)
  hasSharedSituation: boolean;   // STORYTELLING 있었는지
  hasExpressedEmotion: boolean;  // VENTING 있었는지

  /** 🆕 v7: 읽씹 5축 진단 채워진 개수 (0~5) */
  axisFilledCount?: number;

  /** 🆕 v7.2: 핵심 3축 진단 완료 여부 (duration + stage + readType) */
  diagnosisComplete?: boolean;
}
