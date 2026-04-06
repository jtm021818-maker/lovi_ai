/**
 * 🆕 v19: 동적 감정 거울 생성기
 *
 * 누적된 감정 신호와 온도계 결과를 기반으로 LLM이
 * 겉감정(사용자 보고)과 속마음(대화 증거 기반)을 동적으로 생성.
 *
 * 학술 근거:
 * - EFT 공감적 추측 (empathic conjecture) — 88.6%가 잠정적 표현일 때 효과적
 * - Validation-First Protocol — 분석 전 먼저 공감
 * - 한국 문화: 체면, 한(恨), 눈치 고려
 */

import type { EmotionAccumulatorState, EmotionMirrorData } from '@/types/engine.types';
import type { RelationshipScenario } from '@/types/engine.types';
import { generateWithCascade } from '@/lib/ai/provider-registry';
import { getProviderCascade } from '@/lib/ai/smart-router';
import { safeParseLLMJson } from '@/lib/utils/safe-json';

/**
 * LLM을 사용하여 동적 감정 거울 데이터 생성
 */
export async function generateDynamicMirror(
  accState: EmotionAccumulatorState,
  scenario: RelationshipScenario,
  chatHistory: { role: 'user' | 'ai'; content: string }[],
): Promise<EmotionMirrorData | null> {
  const { signals, deepEmotionHypothesis, surfaceEmotion } = accState;

  if (!surfaceEmotion || !deepEmotionHypothesis) return null;

  // 최근 사용자 메시지 3개 추출
  const recentUserMessages = chatHistory
    .filter((m) => m.role === 'user')
    .slice(-3)
    .map((m) => m.content);

  // 신호 요약 (LLM에 전달할 형태)
  const signalSummary = signals
    .filter((s) => s.primaryEmotion)
    .map((s) => ({
      turn: s.turn,
      emotions: s.detectedEmotions,
      deepEmotion: s.primaryEmotion,
      eftLayer: s.eftLayer,
      suppressions: s.suppressionSignals,
      attachmentFear: s.attachmentFear,
      evidence: s.evidence,
    }));

  const systemPrompt = `너는 EFT(감정중심치료) 전문가이자 한국어 연애 상담사야.
수집된 감정 증거를 바탕으로 사용자의 겉감정(의식적으로 보고한 감정)과 속마음(대화에서 감지된 깊은 감정)을 분석해.

## 핵심 규칙
1. surfaceEmotion: 온도계에서 사용자가 직접 선택한 감정을 자연스럽게 1줄 한국어로 표현 ("${surfaceEmotion.label}" 기반, 15~25자)
2. deepEmotion: 증거 기반 속마음 추측. 반드시 잠정형으로 ("~인 것 같아", "~일 수도 있어"). 사용자의 실제 말에서 근거를 1개 이상 반영. 20~40자.
3. surfaceEmoji: 겉감정에 맞는 이모지 1개
4. deepEmoji: 속마음에 맞는 이모지 1개
5. lunaMessage: "이거 맞아? 아니면 다른 느낌이야? 🦊" (고정)

## EFT 감정 분석 가이드
- 2차 감정(분노, 짜증, 무관심)은 주로 1차 감정(두려움, 서운함, 수치심, 외로움)을 가림
- "괜찮아", "상관없어" = 감정 억압 신호 → 실제로는 괜찮지 않을 가능성 높음
- 한국 문화에서 체면(체면) 때문에 진짜 감정을 숨기는 경향이 강함
- 절대 단정하지 마. 추측형으로만 표현.

## 출력 형식 (JSON만, 코드블록 없이)
{"surfaceEmotion":"...","surfaceEmoji":"...","deepEmotion":"...","deepEmoji":"...","lunaMessage":"이거 맞아? 아니면 다른 느낌이야? 🦊"}`;

  const userPrompt = `## 턴별 감정 신호
${JSON.stringify(signalSummary, null, 2)}

## 온도계 결과 (겉감정)
사용자가 직접 선택: "${surfaceEmotion.label}" (${surfaceEmotion.score}점, ${surfaceEmotion.emoji})

## AI 분석 가설 (속마음)
핵심 감정: ${deepEmotionHypothesis.primaryEmotion}
확신도: ${deepEmotionHypothesis.confidence}
EFT 층위: ${deepEmotionHypothesis.eftLayer}
근거 발화: ${deepEmotionHypothesis.supportingEvidence.map((e) => `"${e}"`).join(', ')}

## 시나리오
${scenario}

## 최근 사용자 메시지
${recentUserMessages.map((m, i) => `[${i + 1}] ${m}`).join('\n')}

위 증거를 종합하여 겉감정과 속마음을 JSON으로 분석해.`;

  try {
    const cascade = getProviderCascade('event_generation');
    const result = await generateWithCascade(
      cascade,
      systemPrompt,
      [{ role: 'user', content: userPrompt }],
      256,
    );

    const parsed = safeParseLLMJson(result.text, null as any);
    if (!parsed || !parsed.surfaceEmotion || !parsed.deepEmotion) {
      console.warn('[MirrorGenerator] LLM 응답 파싱 실패');
      return null;
    }

    console.log(`[MirrorGenerator] 🪞 동적 거울 생성 완료: 겉="${parsed.surfaceEmotion}" / 속="${parsed.deepEmotion}"`);

    return {
      surfaceEmotion: parsed.surfaceEmotion,
      surfaceEmoji: parsed.surfaceEmoji || surfaceEmotion.emoji,
      deepEmotion: parsed.deepEmotion,
      deepEmoji: parsed.deepEmoji || '💜',
      lunaMessage: parsed.lunaMessage || '이거 맞아? 아니면 다른 느낌이야? 🦊',
      choices: [
        { label: '맞아 그런 것 같아', value: 'confirm' },
        { label: '음 좀 다른데', value: 'different' },
      ],
    };
  } catch (err) {
    console.error('[MirrorGenerator] 동적 거울 생성 실패:', err);
    return null;
  }
}
