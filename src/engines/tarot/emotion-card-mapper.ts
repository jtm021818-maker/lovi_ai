/**
 * 🔮 v23: 감정 누적기 → 카드 에너지 매핑
 *
 * EmotionAccumulatorState의 깊은 감정/애착 두려움/EFT 층위를
 * 타로 카드 수트 가중치 조정 + 공명 카드 추천에 활용
 *
 * 결과: buildWeights()에 추가 보정값을 제공하여
 * 유저의 감정 상태에 공명하는 카드가 더 자주 뽑히게 함
 */

import type { EmotionAccumulatorState } from '@/types/engine.types';

export interface CardEnergyMapping {
  /** 수트별 가중치 보정값 (기존 buildWeights에 더함) */
  suitBoost: {
    cups: number;
    swords: number;
    wands: number;
    pentacles: number;
    major: number;
  };
  /** 이 감정 상태에서 가장 공명하는 카드 ID 목록 */
  resonanceCards: string[];
  /** 에너지 흐름 상태 */
  energyFlow: 'flowing' | 'blocked' | 'transforming' | 'dormant';
  /** 프롬프트 힌트 (AI에게 전달) */
  promptHint: string;
}

/**
 * 감정 누적기 상태 → 카드 에너지 매핑 변환
 */
export function mapEmotionToCardEnergy(
  accumulator: EmotionAccumulatorState,
): CardEnergyMapping {
  const boost = { cups: 0, swords: 0, wands: 0, pentacles: 0, major: 0 };
  const resonanceCards: string[] = [];
  let energyFlow: CardEnergyMapping['energyFlow'] = 'flowing';
  const hints: string[] = [];

  const hypothesis = accumulator.deepEmotionHypothesis;
  const surface = accumulator.surfaceEmotion;
  const signals = accumulator.signals;

  // 1. 깊은 감정 가설 기반 매핑
  if (hypothesis) {
    const { primaryEmotion, eftLayer } = hypothesis;

    // EFT 층위별 수트 보정
    switch (eftLayer) {
      case 'primary_adaptive':
        // 자연스러운 감정 → cups 약간 증가
        boost.cups += 0.5;
        energyFlow = 'flowing';
        break;
      case 'primary_maladaptive':
        // 오래된 상처 기반 → major + swords 증가
        boost.major += 0.8;
        boost.swords += 0.5;
        energyFlow = 'blocked';
        resonanceCards.push('major_18'); // The Moon
        break;
      case 'secondary_reactive':
        // 2차 반응 (화, 짜증) → swords 증가
        boost.swords += 0.7;
        boost.wands += 0.3;
        energyFlow = 'transforming';
        resonanceCards.push('minor_swords_3'); // 3 of Swords
        break;
      case 'instrumental':
        // 도구적 감정 → pentacles
        boost.pentacles += 0.5;
        energyFlow = 'dormant';
        break;
    }

    // 핵심 감정 키워드별 카드 공명
    if (primaryEmotion) {
      const emotionMap: Record<string, { cards: string[]; boost: Partial<typeof boost> }> = {
        '두려움': { cards: ['major_18', 'minor_swords_8'], boost: { major: 0.5, swords: 0.3 } },
        '불안': { cards: ['major_18', 'major_15'], boost: { swords: 0.5, major: 0.3 } },
        '서운함': { cards: ['minor_cups_3', 'minor_swords_3'], boost: { cups: 0.5, swords: 0.3 } },
        '분노': { cards: ['major_16', 'minor_wands_5'], boost: { wands: 0.5, swords: 0.3 } },
        '슬픔': { cards: ['minor_swords_3', 'minor_cups_5'], boost: { cups: 0.5 } },
        '외로움': { cards: ['major_9', 'minor_cups_4'], boost: { cups: 0.5, major: 0.3 } },
        '혼란': { cards: ['major_18', 'major_12'], boost: { major: 0.7 } },
        '수치심': { cards: ['major_15', 'minor_swords_8'], boost: { swords: 0.5, major: 0.3 } },
        '희망': { cards: ['major_17', 'minor_cups_1'], boost: { cups: 0.5, wands: 0.3 } },
        '설렘': { cards: ['major_0', 'minor_cups_2'], boost: { cups: 0.5, wands: 0.5 } },
      };

      for (const [keyword, mapping] of Object.entries(emotionMap)) {
        if (primaryEmotion.includes(keyword)) {
          resonanceCards.push(...mapping.cards);
          for (const [suit, value] of Object.entries(mapping.boost)) {
            (boost as any)[suit] += value;
          }
          hints.push(`핵심 감정 "${primaryEmotion}" → ${mapping.cards.map(c => c.replace('major_', 'M').replace('minor_', 'm')).join(', ')} 공명`);
          break;
        }
      }
    }
  }

  // 2. 애착 두려움 기반 매핑
  const latestSignal = signals[signals.length - 1];
  if (latestSignal?.attachmentFear) {
    switch (latestSignal.attachmentFear) {
      case 'abandonment':
        boost.cups += 0.3;
        boost.major += 0.3;
        resonanceCards.push('major_18'); // Moon — 불안
        hints.push('버림받을 두려움 → 달 카드 공명');
        break;
      case 'rejection':
        boost.swords += 0.3;
        resonanceCards.push('minor_swords_3'); // 3 of Swords
        hints.push('거절 두려움 → 검 3 공명');
        break;
      case 'inadequacy':
        boost.major += 0.3;
        resonanceCards.push('major_15'); // Devil — 자기 제한
        hints.push('부족함 두려움 → 악마 카드 공명');
        break;
      case 'loss_of_control':
        boost.swords += 0.3;
        boost.wands += 0.2;
        resonanceCards.push('major_16'); // Tower — 통제 상실
        hints.push('통제 상실 두려움 → 탑 카드 공명');
        break;
    }
  }

  // 3. 감정 억압 신호 → 에너지 차단
  const suppressionCount = signals.reduce((acc, s) => acc + s.suppressionSignals.length, 0);
  if (suppressionCount >= 2) {
    energyFlow = 'blocked';
    boost.swords += 0.3;
    resonanceCards.push('minor_swords_8'); // 8 of Swords — 갇힘
    hints.push('감정 억압 감지 → 에너지 차단 상태');
  }

  // 4. 겉감정 ↔ 속감정 괴리 → major 증가
  if (surface && hypothesis) {
    const surfaceScore = surface.score;
    const deepConfidence = hypothesis.confidence;
    if (deepConfidence > 0.6 && Math.abs(surfaceScore) <= 1) {
      // 겉은 괜찮다고 하지만 속은 아닌 상태
      boost.major += 0.5;
      hints.push('겉↔속 감정 괴리 → major 카드 증가');
    }
  }

  // 5. 감정 변동성 → major 증가 (양가감정)
  if (signals.length >= 3) {
    const scores = signals.map(s => s.confidence);
    const variance = calculateVariance(scores);
    if (variance > 0.15) {
      boost.major += 0.3;
      hints.push('감정 변동성 높음 → 양가감정 상태');
    }
  }

  // 중복 카드 제거
  const uniqueResonance = [...new Set(resonanceCards)];

  return {
    suitBoost: boost,
    resonanceCards: uniqueResonance.slice(0, 5),
    energyFlow,
    promptHint: hints.length > 0
      ? `[감정-카드 에너지] ${hints.join(' | ')} | 흐름: ${energyFlow}`
      : '',
  };
}

/**
 * 감정 에너지 매핑을 프롬프트 텍스트로 변환
 */
export function getEnergyPromptHint(mapping: CardEnergyMapping): string {
  if (!mapping.promptHint) return '';
  const flowLabel: Record<string, string> = {
    flowing: '에너지가 자연스럽게 흐르는 상태',
    blocked: '에너지가 막혀있는 상태 — 부드러운 해방 필요',
    transforming: '에너지가 변환 중 — 격한 감정이 정리되는 과정',
    dormant: '에너지가 잠들어 있는 상태 — 깨우기 필요',
  };
  return `\n\n${mapping.promptHint}\n감정 에너지 상태: ${flowLabel[mapping.energyFlow]}`;
}

function calculateVariance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
}
