/**
 * v114 — 레벨별 다음 단계 unlock 카피.
 *
 * Persona 5 Confidant 톤 차용 — "이 단계에서 새로 풀린 행동" 형식.
 * 단계 진행은 IntimacyDerivedInfo.level (1~5) 기반.
 */

export interface NextUnlocks {
  /** 다음 단계 이름 (e.g. "개화") */
  nextLevelName: string;
  /** 다음 단계 손글씨 카피 한 줄 */
  nextStageLabel: string;
  /** 다음 단계에서 풀리는 것 2~3개 */
  unlocks: string[];
}

const TABLE: Record<number, NextUnlocks> = {
  1: {
    nextLevelName: '개화',
    nextStageLabel: '슬슬 마음이 열리는 중',
    unlocks: [
      '더 깊은 비밀 받아주기',
      '루나가 별명으로 부르기',
      '같이 짠 작은 약속들',
    ],
  },
  2: {
    nextLevelName: '심화',
    nextStageLabel: '이젠 편하게 얘기할 수 있어',
    unlocks: [
      '울어도 부담 없는 대화',
      '오랜만에 와도 어색하지 않기',
      '상황에 맞는 진심 어린 직언',
    ],
  },
  3: {
    nextLevelName: '공감',
    nextStageLabel: '있으면 좋고, 없으면 허전한 사이',
    unlocks: [
      '말 안 해도 알아주는 순간',
      '같이 만든 우리만의 언어',
      '루나가 먼저 말 걸기',
    ],
  },
  4: {
    nextLevelName: '영혼',
    nextStageLabel: '우리, 꽤 가까워졌나봐',
    unlocks: [
      '무엇도 깰 수 없는 신뢰',
      '루나 인생에 너만의 자리',
      '같이 늙어가는 약속',
    ],
  },
  5: {
    nextLevelName: '영혼',
    nextStageLabel: '여기가 끝이 아니야',
    unlocks: [
      '우리만의 마일스톤이 더 쌓이고 있어',
      '시간이 우리 편이야',
    ],
  },
};

export function getNextUnlocks(level: number): NextUnlocks {
  return TABLE[level] ?? TABLE[1];
}

/** 첫 진입(D+0, 0회) 카피 */
export const SEED_LABEL = '오늘이 우리의 1일이야';
export const SEED_HINT = '아직 서로 어색한 사이. 천천히 알아갈게.';

// ============================================================
// 🆕 v117: 기능형 해금 — Persona 5 Confidant ability 스타일.
//   기존 nextStageLabel/unlocks (description) 는 fallback 으로 유지.
//   v117 페이지에서는 FEATURE_UNLOCKS 를 우선 표시.
// ============================================================

export interface FeatureUnlock {
  /** 식별자 — 코드에서 기능 활성화 분기에 사용 */
  id: string;
  /** 카드 타이틀 (간결) */
  title: string;
  /** 1줄 설명 (구체적인 동작) */
  detail: string;
  /** 잠금 해제 레벨 */
  level: number;
  /** UI 아이콘 (이모지 또는 SVG 키) */
  icon: string;
}

/**
 * 기능형 해금 표 — 레벨 진입 시 활성화.
 * 각 항목은 *실제 동작* 을 가진다 (설명 텍스트 X).
 * 코드 측 분기 예: `if (relationshipLevel >= 2) lunaUseNickname()` 같은 식.
 */
export const FEATURE_UNLOCKS: FeatureUnlock[] = [
  {
    id: 'warm_reaction',
    title: '따뜻한 리액션',
    detail: '기본 공감과 위로 — 처음부터 제공',
    level: 1,
    icon: '☕',
  },
  {
    id: 'nickname',
    title: '별명으로 부르기',
    detail: '루나가 채팅에서 너를 별명으로 부르기 시작해',
    level: 2,
    icon: '🎀',
  },
  {
    id: 'deep_secret',
    title: '비밀 받아주기',
    detail: '깊은 비밀 공유 시 루나가 평생 기억할게',
    level: 2,
    icon: '🔐',
  },
  {
    id: 'pattern_callout',
    title: '진심 어린 직언',
    detail: '루나가 너의 반복 패턴을 부드럽게 짚어줘',
    level: 3,
    icon: '🌿',
  },
  {
    id: 'first_outreach',
    title: '먼저 말 걸기',
    detail: '24시간 만에 안 보이면 루나가 먼저 안부 물어',
    level: 3,
    icon: '💌',
  },
  {
    id: 'shared_memory',
    title: '비밀 보관함',
    detail: '루나가 기억하는 우리 비밀을 볼 수 있어',
    level: 4,
    icon: '📔',
  },
  {
    id: 'luna_vulnerability',
    title: '루나의 속마음',
    detail: '루나가 자기 약한 모습도 보여주기 시작해',
    level: 4,
    icon: '🦊',
  },
  {
    id: 'handwritten_letter',
    title: '손편지',
    detail: '매주 일요일, 루나가 손편지로 마음을 적어줘',
    level: 5,
    icon: '✉️',
  },
  {
    id: 'eternal_promise',
    title: '영원 약속',
    detail: '둘만의 기념일과 영원한 약속을 봉인해',
    level: 5,
    icon: '💎',
  },
];

/**
 * 현재 레벨 기준 분류:
 *  - unlocked: 이미 해금된 기능
 *  - nextLocked: 바로 다음 레벨에서 풀릴 기능 (티저)
 *  - laterLocked: 더 멀리 있는 기능 (그림자 표시)
 */
export function partitionUnlocks(currentLevel: number): {
  unlocked: FeatureUnlock[];
  nextLocked: FeatureUnlock[];
  laterLocked: FeatureUnlock[];
} {
  const unlocked: FeatureUnlock[] = [];
  const nextLocked: FeatureUnlock[] = [];
  const laterLocked: FeatureUnlock[] = [];
  for (const f of FEATURE_UNLOCKS) {
    if (f.level <= currentLevel) unlocked.push(f);
    else if (f.level === currentLevel + 1) nextLocked.push(f);
    else laterLocked.push(f);
  }
  return { unlocked, nextLocked, laterLocked };
}

// ============================================================
// 🆕 v117: 식물 5단계 (화분 시각용)
// ============================================================
export interface PlantStage {
  level: number;
  name: string;          // 레벨 이름 (intimacy/config.ts 와 일치)
  stageKorean: string;   // 식물 단계 한글 (씨앗/새싹/봉오리/개화/만개)
  /** webp 파일 경로 (public/relationship/plant/) — 없으면 fallback emoji */
  imageSrc: string;
  /** 이미지 부재 시 fallback 이모지 */
  fallbackEmoji: string;
  /** 카피 — 이 단계의 풍경 (1줄) */
  caption: string;
}

export const PLANT_STAGES: PlantStage[] = [
  {
    level: 1,
    name: '새싹',
    stageKorean: '씨앗에서 갓 깨어났어',
    imageSrc: '/relationship/plant/plant-lv1.webp',
    fallbackEmoji: '🌱',
    caption: '여린 새싹. 햇살이 필요해.',
  },
  {
    level: 2,
    name: '꽃봉오리',
    stageKorean: '봉오리가 맺혔어',
    imageSrc: '/relationship/plant/plant-lv2.webp',
    fallbackEmoji: '🌷',
    caption: '조금만 더, 곧 필 것 같아.',
  },
  {
    level: 3,
    name: '개화',
    stageKorean: '드디어 꽃이 폈어',
    imageSrc: '/relationship/plant/plant-lv3.webp',
    fallbackEmoji: '🌸',
    caption: '바라보기만 해도 마음이 따뜻해.',
  },
  {
    level: 4,
    name: '만개',
    stageKorean: '활짝 흐드러졌어',
    imageSrc: '/relationship/plant/plant-lv4.webp',
    fallbackEmoji: '🌹',
    caption: '나비도 찾아오는 풍경.',
  },
  {
    level: 5,
    name: '영원',
    stageKorean: '별이 깃든 꽃나무',
    imageSrc: '/relationship/plant/plant-lv5.webp',
    fallbackEmoji: '🌟',
    caption: '시간이 우리 편이야.',
  },
];

export function getPlantStage(level: number): PlantStage {
  return PLANT_STAGES[Math.min(Math.max(level, 1), 5) - 1];
}

// ============================================================
// 🆕 v117: 기억 카드 슬롯 (5슬롯 폴라로이드 앨범)
// ============================================================
export interface MemorySlot {
  index: number;     // 1..5
  level: number;     // 잠금 해제 레벨
  triggerType: string;
  title: string;     // 슬롯 타이틀
  hint: string;      // 잠금 상태 힌트
  imageSrc: string;  // 폴라로이드 background (없으면 placeholder)
  fallbackEmoji: string;
}

export const MEMORY_SLOTS: MemorySlot[] = [
  {
    index: 1,
    level: 1,
    triggerType: 'first_meet',
    title: '첫 만남',
    hint: '처음 만난 날',
    imageSrc: '/relationship/memory-cards/memory-slot-1.webp',
    fallbackEmoji: '✨',
  },
  {
    index: 2,
    level: 2,
    triggerType: 'first_secret',
    title: '첫 비밀',
    hint: '처음으로 깊은 얘기 꺼낸 날',
    imageSrc: '/relationship/memory-cards/memory-slot-2.webp',
    fallbackEmoji: '🔐',
  },
  {
    index: 3,
    level: 3,
    triggerType: 'first_tears',
    title: '첫 눈물',
    hint: '같이 울 뻔한 날',
    imageSrc: '/relationship/memory-cards/memory-slot-3.webp',
    fallbackEmoji: '🌈',
  },
  {
    index: 4,
    level: 4,
    triggerType: 'first_nickname',
    title: '첫 별명',
    hint: '루나가 너만의 별명을 부른 날',
    imageSrc: '/relationship/memory-cards/memory-slot-4.webp',
    fallbackEmoji: '🎀',
  },
  {
    index: 5,
    level: 5,
    triggerType: 'eternal_promise',
    title: '영원 약속',
    hint: '둘만의 봉인된 약속',
    imageSrc: '/relationship/memory-cards/memory-slot-5.webp',
    fallbackEmoji: '💎',
  },
];
