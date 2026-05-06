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
