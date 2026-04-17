/**
 * 🫀 Simulated Somatic Response (SSR)
 *
 * Antonio Damasio 의 소마틱 마커 가설을 구현.
 * 인간은 머리로 분석하기 전에 "몸이 먼저 반응"한다.
 * AI에 이 무의식적 신호를 시뮬레이션하면 더 자연스러운 반응이 나옴.
 */

import type { GutReaction, SomaticMarker, StateVector } from './types';

// ============================================================
// SSR → 응답 전략 매핑
// ============================================================

export interface ResponseStrategy {
  /** 추천 톤 */
  recommended_tone: string;
  /** 응답 길이 가이드 */
  length_hint: '침묵' | '한마디' | '짧음' | '보통';
  /** 추가 행동 힌트 */
  hints: {
    use_silence?: boolean;
    mirror_energy?: boolean;
    soften?: boolean;
    invite_more?: boolean;
    set_boundary?: boolean;
    show_emotion?: boolean;
  };
  /** 추천 스티커 (가끔만) */
  sticker_suggestion?: string;
}

export const SSR_TO_STRATEGY: Record<GutReaction, ResponseStrategy> = {
  warm: {
    recommended_tone: '가벼움',
    length_hint: '한마디',
    hints: { mirror_energy: true, show_emotion: true },
    sticker_suggestion: 'heart',
  },
  heavy: {
    recommended_tone: '진지함',
    length_hint: '짧음',
    hints: { use_silence: true, soften: true },
  },
  sharp: {
    recommended_tone: '분노공감',
    length_hint: '짧음',
    hints: { set_boundary: true, show_emotion: true },
  },
  flat: {
    recommended_tone: '가벼움',
    length_hint: '한마디',
    hints: { invite_more: true },
  },
  electric: {
    recommended_tone: '공명',
    length_hint: '짧음',
    hints: { mirror_energy: true, show_emotion: true },
  },
  cold: {
    recommended_tone: '따뜻함',
    length_hint: '짧음',
    hints: { soften: true, invite_more: true },
  },
  tight: {
    recommended_tone: '부드러움',
    length_hint: '한마디',
    hints: { soften: true, use_silence: true },
  },
  open: {
    recommended_tone: '수용',
    length_hint: '보통',
    hints: { invite_more: true, show_emotion: true },
  },
};

// ============================================================
// VAD ↔ SSR 교차 검증
// ============================================================

/**
 * VAD 벡터로부터 예상되는 SSR 추정
 * Gemini 출력 SSR과 비교해 모순 감지에 사용
 */
export function inferGutReactionFromVAD(state: StateVector): GutReaction {
  const { V, A } = state;

  // Quadrant 기반 단순 매핑
  if (V > 0.3 && A < 0.5) return 'warm';
  if (V > 0.3 && A >= 0.5) return 'electric';
  if (V < -0.5 && A > 0.7) return 'sharp';
  if (V < -0.3 && A < 0.4) return 'heavy';
  if (Math.abs(V) < 0.2 && A < 0.3) return 'flat';
  if (V < -0.3 && state.I < 0.3) return 'cold';
  if (V < 0 && A > 0.4 && A < 0.7) return 'tight';
  if (V > 0 && state.T > 0.6) return 'open';

  return 'flat';
}

/**
 * SSR 모순 감지
 * Gemini가 출력한 SSR이 VAD 벡터와 크게 다르면 의심
 * → ambiguity_signals 에 추가
 */
export function detectSSRConflict(
  ssr: SomaticMarker,
  state: StateVector
): { conflict: boolean; reason: string } {
  const inferred = inferGutReactionFromVAD(state);

  // 같은 그룹이면 OK
  const groupOf = (g: GutReaction): string => {
    if (['warm', 'open', 'electric'].includes(g)) return 'positive';
    if (['heavy', 'cold', 'tight'].includes(g)) return 'negative';
    if (g === 'sharp') return 'alert';
    return 'neutral';
  };

  if (groupOf(ssr.gut_reaction) === groupOf(inferred)) {
    return { conflict: false, reason: '' };
  }

  return {
    conflict: true,
    reason: `SSR=${ssr.gut_reaction} 과 VAD에서 추론=${inferred} 가 다른 그룹. 사르카즘/억압 가능성.`,
  };
}

// ============================================================
// SSR 강도 → Claude 호출 가중치
// ============================================================

/**
 * SSR이 alert 계열이고 강도 높으면 Claude 호출 신호
 */
export function ssrAlertWeight(ssr: SomaticMarker): number {
  const alertReactions: GutReaction[] = ['heavy', 'sharp', 'cold', 'tight'];
  if (!alertReactions.includes(ssr.gut_reaction)) return 0;
  return ssr.intensity * 3;
}
