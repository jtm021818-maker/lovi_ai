/**
 * 🆕 v14: 반복 패턴 감지 엔진 (Pattern Detector)
 * 
 * 축 데이터 조합 분석 → 반복 패턴/사이클 감지 → PatternMirrorData 생성
 * 
 * 학술 근거:
 * - Gottman (40년, 3000+ 커플): 반복 갈등 69%가 "영속적 문제" → 패턴 인식이 관리의 1단계
 * - EFT Infinity Loop (Sue Johnson): 추구-회피 사이클 시각화 → 외재화(externalize) → 공동 대처
 * - AI 패턴 감지 (MIT 2024): 텍스트 분석 79% 정확도로 장기 호환성 예측
 * 
 * 설계 원칙:
 * 1. 기존 10축(universal) + 시나리오축(scenario) 조합만으로 감지 — 새 축 불필요
 * 2. 패턴 최대 3개 (강도 내림차순) — 과부하 방지
 * 3. 사이클은 conflictStyle + attachmentClue 조합으로 EFT 기반 감지
 * 4. 시나리오별 특화 패턴 매핑 — 맥락에 맞는 메시지
 */

import type { PatternItem, PatternCycle, RelationshipScenario } from '@/types/engine.types';
import { HorsemenType } from '@/types/engine.types';
import type {
  UniversalAxes,
  ScenarioAxes,
  FrequencyPattern,
  ConflictStyle,
  AttachmentClue,
} from '@/engines/relationship-diagnosis/types';

// ============================================
// 상수
// ============================================

/** 빈도 텍스트 매핑 */
const FREQUENCY_TEXT: Record<string, string> = {
  FIRST_TIME: '처음',
  OCCASIONAL: '가끔',
  FREQUENT: '자주 반복',
  ALWAYS: '항상',
  WORSENING: '점점 심해짐',
};

/** 4기수 해독제 매핑 (Gottman) */
const HORSEMEN_ANTIDOTES: Record<string, string> = {
  CRITICISM: '비난 → "나는 ~할 때 ~하게 느껴" (I-message)',
  CONTEMPT: '경멸 → 감사와 존중의 문화 만들기',
  DEFENSIVENESS: '방어 → 상대 말의 일부라도 인정하기',
  STONEWALLING: '담쌓기 → "잠깐 쉬고 다시 이야기하자" (자기진정)',
};

/** Gottman 연구 인용문 — UI에 표시 */
const RESEARCH_CITATIONS: Record<string, string> = {
  gottman_pattern: 'Gottman 연구(40년, 3,000+ 커플) — 갈등의 69%가 반복되는 \'영속적 문제\'. 패턴 인식이 관계 회복의 첫걸음.',
  eft_cycle: 'EFT 정서중심치료(Sue Johnson) — 부정적 사이클을 인식하고 \'적\'으로 외재화하면, 둘이 함께 패턴과 싸울 수 있어.',
  horsemen: 'Gottman 4기수 연구 — 비난·경멸·방어·담쌓기 패턴이 관계 파탄의 93.6% 예측.',
  attachment_loop: '애착이론(Bowlby, Hazan) — 불안형 확인 루프는 안전기지 부재에서 발생. 인식 자체가 변화의 시작.',
  repetition: 'SFBT 연구(2024) — 반복 패턴 인식 후 \'1단계만 다르게\' 접근이 가장 효과적.',
  ai_pattern: 'MIT 실험(2024) — AI 대화 패턴 분석으로 장기 관계 호환성 79% 예측 성공.',
};

// ============================================
// 핵심 감지 함수
// ============================================

/**
 * 메인 패턴 감지 — 축 데이터 조합을 분석하여 반복 패턴 추출
 * 
 * @returns PatternItem[] — 최대 3개, 강도 내림차순
 */
export function detectPatterns(
  universal: Partial<UniversalAxes>,
  scenario: Partial<ScenarioAxes>,
  currentScenario: RelationshipScenario,
): PatternItem[] {
  const patterns: PatternItem[] = [];

  // ── 규칙 1: 반복 빈도 패턴 (FrequencyPattern) ──
  if (universal.pattern) {
    const freq = universal.pattern;
    if (freq === 'FREQUENT' || freq === 'ALWAYS' || freq === 'WORSENING') {
      patterns.push({
        icon: freq === 'WORSENING' ? '📈' : '🔄',
        label: freq === 'WORSENING' ? '악화 패턴' : '반복 패턴',
        description: getFrequencyDescription(freq, currentScenario),
        intensity: freq === 'WORSENING' ? 5 : freq === 'ALWAYS' ? 4 : 3,
        basedOn: '반복 빈도',
        frequency: FREQUENCY_TEXT[freq],
      });
    }
  }

  // ── 규칙 2: 추구-회피 사이클 (ConflictStyle) ──
  if (universal.conflictStyle) {
    const cs = universal.conflictStyle;
    if (cs === 'PURSUE' || cs === 'WITHDRAW') {
      patterns.push({
        icon: '♾️',
        label: cs === 'PURSUE' ? '추구-회피 사이클' : '회피-추구 사이클',
        description: cs === 'PURSUE'
          ? '다가갈수록 → 상대가 멀어지고 → 더 다가가는 악순환'
          : '부담느끼면 → 거리두기 → 상대가 더 다가오는 악순환',
        intensity: 4,
        basedOn: '갈등 스타일',
      });
    }
    if (cs === 'CONFRONT') {
      patterns.push({
        icon: '🔥',
        label: '충돌 패턴',
        description: '직면 → 갈등 격화 → 감정 폭발 → 후회',
        intensity: 3,
        basedOn: '갈등 스타일',
      });
    }
    if (cs === 'AVOID') {
      patterns.push({
        icon: '🧊',
        label: '회피 패턴',
        description: '문제 발생 → 아예 안 꺼냄 → 쌓임 → 폭발',
        intensity: 3,
        basedOn: '갈등 스타일',
      });
    }
  }

  // ── 규칙 3: 불안형 확인 루프 (AttachmentClue) ──
  if (universal.attachmentClue) {
    const ac = universal.attachmentClue;
    if (ac === 'ANXIOUS_CHECKING') {
      patterns.push({
        icon: '📱',
        label: '확인 충동 루프',
        description: '불안 → 확인 연락 → 상대 부담 → 짧은 답 → 더 불안',
        intensity: 4,
        basedOn: '애착 행동',
      });
    }
    if (ac === 'ANXIOUS_SELF_BLAME') {
      patterns.push({
        icon: '💭',
        label: '자책 루프',
        description: '"내가 뭘 잘못했나..." → 자존감 하락 → 매달림 → 자책',
        intensity: 3,
        basedOn: '애착 행동',
      });
    }
    if (ac === 'FEARFUL_SPIRAL') {
      patterns.push({
        icon: '🌀',
        label: '파국적 시나리오 루프',
        description: '불안 → 최악 상상 → 확신처럼 느껴짐 → 과잉 반응',
        intensity: 5,
        basedOn: '애착 행동',
      });
    }
    if (ac === 'AVOIDANT_MIRRORING') {
      patterns.push({
        icon: '🪞',
        label: '보복 패턴',
        description: '"나도 읽씹해야지" → 소통 단절 → 관계 악화',
        intensity: 3,
        basedOn: '애착 행동',
      });
    }
  }

  // ── 규칙 4: Gottman 4기수 ──
  if (universal.horsemenDetected && universal.horsemenDetected.length > 0) {
    const horsemen = universal.horsemenDetected;
    const antidoteHints = horsemen
      .map(h => HORSEMEN_ANTIDOTES[h])
      .filter(Boolean)
      .slice(0, 2);

    patterns.push({
      icon: '⚠️',
      label: `위험 신호: ${horsemen.map(h => horsemenLabel(h)).join(' · ')}`,
      description: antidoteHints[0] || '대화에서 관계를 해치는 패턴이 감지됐어',
      intensity: Math.min(5, 3 + horsemen.length),
      basedOn: 'Gottman 4기수',
    });
  }

  // ── 규칙 5: 이전 시도 패턴 ──
  if (universal.previousAttempts) {
    const pa = universal.previousAttempts;
    if (pa === 'SENT_MORE') {
      patterns.push({
        icon: '🔁',
        label: '추가 연락 반복',
        description: '또 연락을 보냈지만 상황이 나아지지 않은 패턴',
        intensity: 3,
        basedOn: '이전 시도',
      });
    }
    if (pa === 'CHECKED_SNS') {
      patterns.push({
        icon: '👁️',
        label: 'SNS 확인 루프',
        description: 'SNS 확인 → 불안 해소 or 증폭 → 다시 확인',
        intensity: 3,
        basedOn: '이전 시도',
      });
    }
    if (pa === 'NOTHING') {
      patterns.push({
        icon: '⏸️',
        label: '무행동 패턴',
        description: '아무것도 안 하면서 상황이 나아지길 기다리는 패턴',
        intensity: 2,
        basedOn: '이전 시도',
      });
    }
  }

  // ── 시나리오 특화 패턴 ──
  const scenarioPatterns = getScenarioSpecificPatterns(scenario, currentScenario, universal);
  patterns.push(...scenarioPatterns);

  // 강도 순 정렬 → 최대 3개
  return patterns
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 3);
}

/**
 * EFT 기반 사이클 감지
 * 
 * conflictStyle + attachmentClue 조합 → 관계 사이클 시각화
 */
export function detectCycle(
  universal: Partial<UniversalAxes>,
): PatternCycle | undefined {
  const cs = universal.conflictStyle;
  const ac = universal.attachmentClue;

  // 추구-회피 (가장 흔한 커플 사이클 — EFT 핵심)
  if (cs === 'PURSUE') {
    return {
      name: '추구-회피 사이클',
      myRole: '추구자 (다가가는 쪽)',
      partnerRole: '회피자 (멀어지는 쪽)',
      description: '내가 다가감 → 상대가 부담 → 거리두기 → 나 더 불안 → 더 다가감',
    };
  }
  if (cs === 'WITHDRAW') {
    return {
      name: '회피-추구 사이클',
      myRole: '회피자 (거리두는 쪽)',
      partnerRole: '추구자 (다가오는 쪽)',
      description: '상대가 다가옴 → 부담 → 거리두기 → 상대 더 불안 → 더 다가옴',
    };
  }

  // 불안 확인 루프
  if (ac === 'ANXIOUS_CHECKING' || ac === 'FEARFUL_SPIRAL') {
    return {
      name: '불안-확인 루프',
      myRole: '확인자',
      partnerRole: '(부담느낌)',
      description: '불안 → 확인 연락 → 상대 부담 → 짧은 답 or 읽씹 → 더 불안',
    };
  }

  // 비난-방어 사이클 (Gottman)
  if (universal.horsemenDetected?.includes('CRITICISM' as any) &&
      universal.horsemenDetected?.includes('DEFENSIVENESS' as any)) {
    return {
      name: '비난-방어 사이클',
      myRole: '비난자 or 방어자',
      partnerRole: '방어자 or 비난자',
      description: '한쪽이 비난 → 다른쪽 방어 → "내 말 안 듣잖아" → 더 세게 비난',
    };
  }

  return undefined;
}

/**
 * 학술 인용문 선택 — 감지된 패턴 기반
 */
export function selectResearchBasis(
  patterns: PatternItem[],
  cycle?: PatternCycle,
): string {
  // 사이클이 감지되면 EFT 인용
  if (cycle) {
    return RESEARCH_CITATIONS.eft_cycle;
  }

  // 4기수가 감지되면 Gottman 4기수 인용
  if (patterns.some(p => p.basedOn === 'Gottman 4기수')) {
    return RESEARCH_CITATIONS.horsemen;
  }

  // 확인 루프면 애착 이론 인용
  if (patterns.some(p => p.basedOn === '애착 행동')) {
    return RESEARCH_CITATIONS.attachment_loop;
  }

  // 빈도 패턴이면 반복 패턴 인용
  if (patterns.some(p => p.basedOn === '반복 빈도')) {
    return RESEARCH_CITATIONS.repetition;
  }

  // 기본: Gottman 패턴 연구
  return RESEARCH_CITATIONS.gottman_pattern;
}

// ============================================
// 내부 헬퍼
// ============================================

/** 빈도 + 시나리오 맞춤 설명 */
function getFrequencyDescription(
  freq: string,
  scenario: RelationshipScenario,
): string {
  const scenarioLabels: Partial<Record<string, Record<string, string>>> = {
    READ_AND_IGNORED: {
      WORSENING: '읽씹이 점점 길어지고, 불안도 점점 커지고 있어',
      ALWAYS: '읽씹→불안→확인의 루프가 일상이 됐어',
      FREQUENT: '읽씹 상황이 자주 반복되고 있어',
    },
    GHOSTING: {
      WORSENING: '잠수 기간이 점점 길어지고 있어',
      ALWAYS: '잠수가 상대의 습관 패턴이 된 것 같아',
      FREQUENT: '잠수와 복귀가 반복되고 있어',
    },
    JEALOUSY: {
      WORSENING: '질투와 불안이 점점 심해지고 있어',
      ALWAYS: '질투가 관계의 일상이 됐어',
      FREQUENT: '질투→확인→갈등이 자주 반복돼',
    },
    INFIDELITY: {
      WORSENING: '신뢰 문제가 시간이 지날수록 더 커지고 있어',
      FREQUENT: '의심→확인→갈등이 반복되고 있어',
    },
    BREAKUP_CONTEMPLATION: {
      WORSENING: '떠나고 싶은 마음이 점점 강해지고 있어',
      FREQUENT: '이별 고민이 반복적으로 찾아오고 있어',
    },
    BOREDOM: {
      WORSENING: '권태감이 점점 깊어지고 있어',
      ALWAYS: '설렘이 사라진 게 오래됐어',
      FREQUENT: '지루함을 자주 느끼고 있어',
    },
    LONG_DISTANCE: {
      WORSENING: '거리로 인한 불안이 점점 커지고 있어',
      FREQUENT: '연락/만남 부족 → 불안 → 갈등이 반복돼',
    },
  };

  return scenarioLabels[scenario]?.[freq]
    ?? (freq === 'WORSENING' ? '이 문제가 점점 심해지고 있어'
      : freq === 'ALWAYS' ? '이 패턴이 일상이 된 것 같아'
      : '이 상황이 자주 반복되고 있어');
}

/** 시나리오 특화 패턴 */
function getScenarioSpecificPatterns(
  scenario: Partial<ScenarioAxes>,
  currentScenario: RelationshipScenario,
  universal: Partial<UniversalAxes>,
): PatternItem[] {
  const items: PatternItem[] = [];

  // 읽씹: readType + 빈도 조합
  if (currentScenario === 'READ_AND_IGNORED' as RelationshipScenario) {
    if (universal.pattern === 'WORSENING' && universal.attachmentClue === 'ANXIOUS_CHECKING') {
      items.push({
        icon: '📵',
        label: '읽씹-확인 악순환',
        description: '읽씹 → 불안 → 추가 연락 → 상대 더 멀어짐',
        intensity: 5,
        basedOn: '읽씹 + 확인',
      });
    }
  }

  // 잠수: 복귀 후 재잠수 패턴
  if (currentScenario === 'GHOSTING' as RelationshipScenario) {
    if (universal.pattern === 'FREQUENT' || universal.pattern === 'ALWAYS') {
      items.push({
        icon: '👻',
        label: '잠수-복귀 루프',
        description: '잠수 → 복귀 → "달라질 거야" → 다시 잠수',
        intensity: 4,
        basedOn: '잠수 반복',
      });
    }
  }

  // 질투: 감시 루프
  if (currentScenario === 'JEALOUSY' as RelationshipScenario) {
    if (universal.attachmentClue === 'ANXIOUS_CHECKING') {
      items.push({
        icon: '🔍',
        label: '감시 루프',
        description: '불안 → SNS 확인/폰 확인 → 의심 증거 발견 → 더 불안',
        intensity: 4,
        basedOn: '질투 + 확인',
      });
    }
  }

  // 이별 고민: 결정 회피 루프
  if (currentScenario === 'BREAKUP_CONTEMPLATION' as RelationshipScenario) {
    if (universal.conflictStyle === 'AVOID') {
      items.push({
        icon: '⏸️',
        label: '결정 회피 루프',
        description: '떠나야 할까 → 결정 못함 → 시간만 지남 → 더 힘들어짐',
        intensity: 4,
        basedOn: '결정 회피',
      });
    }
  }

  return items;
}

/** Gottman 4기수 한국어 라벨 */
function horsemenLabel(horseman: string): string {
  const labels: Record<string, string> = {
    CRITICISM: '비난',
    CONTEMPT: '경멸',
    DEFENSIVENESS: '방어',
    STONEWALLING: '담쌓기',
  };
  return labels[horseman] ?? horseman;
}

/**
 * 축 데이터가 패턴 감지에 충분한지 확인
 * 
 * @returns true면 PATTERN_MIRROR 이벤트 발동 가능
 */
export function hasEnoughDataForPatterns(
  universal: Partial<UniversalAxes>,
): boolean {
  let filledCount = 0;
  if (universal.pattern) filledCount++;
  if (universal.conflictStyle) filledCount++;
  if (universal.attachmentClue) filledCount++;
  if (universal.horsemenDetected?.length) filledCount++;
  if (universal.previousAttempts) filledCount++;
  if (universal.duration) filledCount++;
  if (universal.stage) filledCount++;

  // 최소 2축 이상이면 패턴 감지 가치 있음
  return filledCount >= 2;
}

/**
 * 축 데이터 부족 시 시나리오 기반 기본 패턴
 */
export function getDefaultPatterns(
  scenario: RelationshipScenario,
): PatternItem[] {
  const defaults: Partial<Record<string, PatternItem[]>> = {
    READ_AND_IGNORED: [{
      icon: '📱', label: '읽씹 → 확인 욕구', 
      description: '읽씹을 볼 때 확인 연락을 보내고 싶은 충동',
      intensity: 3, basedOn: '시나리오 기본',
    }],
    GHOSTING: [{
      icon: '👻', label: '잠수 → 자책 패턴',
      description: '"내가 뭘 잘못했나" 하고 자신을 탓하는 패턴',
      intensity: 3, basedOn: '시나리오 기본',
    }],
    JEALOUSY: [{
      icon: '💚', label: '질투 → 확인 패턴',
      description: '불안 → 상대 확인 → 잠깐 안심 → 다시 불안',
      intensity: 3, basedOn: '시나리오 기본',
    }],
  };

  return defaults[scenario] ?? [{
    icon: '🔄', label: '같은 고민 반복',
    description: '이 고민이 처음이 아닌 것 같아',
    intensity: 2, basedOn: '시나리오 기본',
  }];
}
