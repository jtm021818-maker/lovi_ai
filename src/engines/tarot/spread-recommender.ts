/**
 * 🔮 v23: 스마트 스프레드 추천 시스템
 *
 * 시나리오 + 감정 + 메시지 키워드 기반으로
 * 유저에게 가장 적합한 스프레드 3종을 추천
 */

import { RelationshipScenario } from '@/types/engine.types';
import type { SpreadType } from './reading-prompts';

export interface SpreadRecommendation {
  spreadType: SpreadType;
  confidence: number;
  label: string;
  emoji: string;
  description: string;
}

/** 시나리오 → 1순위 전문 스프레드 매핑 */
const SCENARIO_SPREAD_MAP: Partial<Record<RelationshipScenario, SpreadType>> = {
  [RelationshipScenario.UNREQUITED_LOVE]: 'unrequited',
  [RelationshipScenario.RECONNECTION]: 'reconnection',
  [RelationshipScenario.FIRST_MEETING]: 'pace',
  [RelationshipScenario.RELATIONSHIP_PACE]: 'pace',
  [RelationshipScenario.COMMITMENT_FEAR]: 'avoidant',
};

/** 스프레드 메타 정보 (UI 표시용) */
const SPREAD_META: Record<SpreadType, { label: string; emoji: string; description: string }> = {
  single:       { label: '오늘의 카드 1장',      emoji: '🌟', description: '지금 이 순간 가장 필요한 메시지' },
  three:        { label: '과거·현재·미래 3장',    emoji: '🔮', description: '흐름을 읽고 앞으로의 방향 탐색' },
  love:         { label: '연애 집중 5장',         emoji: '💕', description: '나·상대·관계·장애물·조언 깊이 읽기' },
  unrequited:   { label: '짝사랑 전용 6장',       emoji: '💘', description: '상대의 마음과 발전 가능성 탐색' },
  reconnection: { label: '재회 타로 6장',         emoji: '🔁', description: '다시 만남의 가능성과 방향' },
  pace:         { label: '썸·진도 타로 5장',      emoji: '✨', description: '관계 발전 속도와 방향 읽기' },
  avoidant:     { label: '회피 패턴 타로 6장',    emoji: '🚪', description: '회피 뒤의 진짜 마음 탐색' },
  yesno:        { label: 'Yes or No 1장',        emoji: '⚡', description: '결정에 대한 명확한 답' },
};

/**
 * 시나리오 + 감정 + 메시지 기반 스프레드 추천 (최대 3개)
 */
export function recommendSpreads(
  scenario: RelationshipScenario,
  emotionScore: number,
  userMessage: string,
): SpreadRecommendation[] {
  const results: SpreadRecommendation[] = [];
  const added = new Set<SpreadType>();

  function add(type: SpreadType, confidence: number) {
    if (added.has(type)) return;
    added.add(type);
    const meta = SPREAD_META[type];
    results.push({ spreadType: type, confidence, ...meta });
  }

  // 1. Yes/No 질문 감지 (최우선)
  if (/할까|해야|될까|맞아\?|아닐까|~일까|~인가|가야|말아|볼까|해볼까/.test(userMessage)) {
    add('yesno', 0.90);
  }

  // 2. 시나리오 전문 스프레드 (1순위)
  const scenarioSpread = SCENARIO_SPREAD_MAP[scenario];
  if (scenarioSpread) {
    add(scenarioSpread, 0.88);
  }

  // 3. 감정 강도 높으면 single 추천 (과부하 방지)
  if (Math.abs(emotionScore) >= 4) {
    add('single', 0.82);
  }

  // 4. 연애 키워드 → love 스프레드
  if (/남친|여친|상대|관계|우리|둘|사귀|연인/.test(userMessage)) {
    add('love', 0.75);
  }

  // 5. 기본 추천 채우기
  add('love', 0.65);
  add('three', 0.55);
  add('single', 0.45);

  // 상위 3개 반환 (confidence 내림차순)
  return results
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}

/** SPREAD_META를 외부에서 접근할 수 있도록 export */
export { SPREAD_META };
