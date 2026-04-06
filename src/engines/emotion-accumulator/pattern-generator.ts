/**
 * 🆕 v20: 동적 패턴 분석 생성기
 *
 * 대화 내용 + 누적 감정 신호 + 진단 데이터를 기반으로
 * LLM이 사용자의 관계 패턴을 동적으로 분석.
 *
 * 기존 하드코딩 패턴 감지(pattern-detector.ts)는 폴백으로 유지.
 */

import type { EmotionAccumulatorState, PatternMirrorData } from '@/types/engine.types';
import type { RelationshipScenario } from '@/types/engine.types';
import type { DiagnosisResult } from '@/engines/relationship-diagnosis/types';
import { generateWithCascade } from '@/lib/ai/provider-registry';
import { getProviderCascade } from '@/lib/ai/smart-router';
import { safeParseLLMJson } from '@/lib/utils/safe-json';

/**
 * LLM 기반 동적 패턴 분석
 */
export async function generateDynamicPatterns(
  accState: EmotionAccumulatorState,
  diagnosisResult: DiagnosisResult | null | undefined,
  scenario: RelationshipScenario,
  chatHistory: { role: 'user' | 'ai'; content: string }[],
): Promise<PatternMirrorData | null> {
  // 최근 사용자 메시지 5개
  const recentUserMessages = chatHistory
    .filter((m) => m.role === 'user')
    .slice(-5)
    .map((m) => m.content);

  if (recentUserMessages.length < 2) return null;

  // 누적 감정 증거 요약
  const emotionSummary = accState.signals
    .filter((s) => s.primaryEmotion)
    .map((s) => `턴${s.turn}: ${s.detectedEmotions.join(',')} (깊은감정: ${s.primaryEmotion}, 애착: ${s.attachmentFear ?? '없음'})`)
    .join('\n');

  // 진단 데이터 요약
  const diagSummary = diagnosisResult ? JSON.stringify({
    conflictStyle: diagnosisResult.universal?.conflictStyle,
    attachmentClue: diagnosisResult.universal?.attachmentClue,
    pattern: diagnosisResult.universal?.pattern,
    horsemen: diagnosisResult.universal?.horsemenDetected,
  }) : '없음';

  const systemPrompt = `너는 EFT/Gottman 기반 관계 패턴 분석 전문가야.
사용자의 대화 내용과 감정 데이터를 분석해서 반복되는 관계 패턴 2~3개를 찾아줘.

## 패턴 감지 기준
- Gottman 4기수 (비난, 경멸, 방어, 담쌓기)
- EFT 추구-회피 사이클
- 불안형/회피형 애착 행동 패턴
- 인지 왜곡 반복 패턴 (흑백논리, 독심술 등)
- 대화에서 반복되는 핵심 키워드/감정

## 출력 형식 (JSON만, 코드블록 없이)
{
  "patterns": [
    {"icon": "🔄", "name": "패턴 이름 (5자 이내)", "description": "패턴 설명 (20~30자)", "intensity": 3}
  ],
  "cycle": {"name": "사이클 이름", "myRole": "내 역할 (예: 추구자)", "partnerRole": "상대 역할 (예: 회피자)", "description": "사이클 설명 (20~30자)"} 또는 null,
  "insight": "핵심 인사이트 1문장 (30~50자). 패턴을 인식하는 것의 의미 + 희망 메시지",
  "researchBasis": "근거 논문/이론 1줄 (예: Gottman 40년 연구 기반)"
}

## 규칙
- patterns는 2~3개 (1개는 너무 적고, 4개 이상은 과부하)
- intensity는 1~5 (1=약함, 5=강함)
- 대화 내용에서 직접 근거를 찾아야 함 (추측 최소화)
- insight는 잠정적 표현으로 ("~인 것 같아", "~일 수 있어")`;

  const userPrompt = `## 시나리오: ${scenario}

## 턴별 감정 분석
${emotionSummary || '(데이터 부족)'}

## 진단 축 데이터
${diagSummary}

## 최근 대화
${recentUserMessages.map((m, i) => `[유저 ${i + 1}] ${m}`).join('\n')}

위 데이터에서 반복되는 관계 패턴을 찾아 JSON으로 분석해.`;

  try {
    const cascade = getProviderCascade('event_generation');
    const result = await generateWithCascade(cascade, systemPrompt, [{ role: 'user', content: userPrompt }], 400);

    const parsed = safeParseLLMJson(result.text, null as any);
    if (!parsed || !Array.isArray(parsed.patterns) || parsed.patterns.length === 0) {
      console.warn('[PatternGenerator] LLM 패턴 파싱 실패');
      return null;
    }

    console.log(`[PatternGenerator] 🔄 동적 패턴 ${parsed.patterns.length}개 생성`);

    return {
      title: '네 관계 패턴이 보여',
      patterns: parsed.patterns.slice(0, 3).map((p: any) => ({
        icon: p.icon || '🔄',
        name: p.name || '패턴',
        description: p.description || '',
        intensity: Math.max(1, Math.min(5, p.intensity ?? 3)),
      })),
      cycle: parsed.cycle ? {
        name: parsed.cycle.name || '추구-회피 사이클',
        myRole: parsed.cycle.myRole || '추구자',
        partnerRole: parsed.cycle.partnerRole || '회피자',
        description: parsed.cycle.description || '',
      } : undefined,
      insight: parsed.insight || '패턴을 인식하는 것만으로도 변화가 시작돼.',
      researchBasis: parsed.researchBasis || 'Gottman 40년 커플 연구 + EFT 기반',
      choices: [
        { label: '맞아! 놀라워', value: 'pattern_confirmed' },
        { label: '패턴 바꾸는 방법', value: 'break_pattern' },
      ],
    };
  } catch (err) {
    console.error('[PatternGenerator] 동적 패턴 생성 실패:', err);
    return null;
  }
}
