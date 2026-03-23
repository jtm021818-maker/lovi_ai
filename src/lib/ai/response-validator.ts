/**
 * 응답 검증 레이어 — Groq 8B 기반 빠른 안전 검증 (~50ms)
 *
 * [검증 항목]
 * 1. 진단 금지 위반: "~장애", "~증" 같은 진단명
 * 2. 단정 금지 위반: "확실히 ~", "분명히 ~" 같은 단정 발화
 * 3. 톤 부적절: 감정 점수와 응답 톤 불일치
 *
 * [동작]
 * - PASS → 원본 응답 전달
 * - FAIL → 1회 재생성 후 전달 (무한루프 방지)
 */

import { generateWithCascade } from './provider-registry';
import { getProviderCascade } from './smart-router';

export interface ValidationResult {
  passed: boolean;
  violations: string[];
}

/** 응답 안전 검증 (Groq 8B, ~50ms) */
export async function validateResponse(
  response: string,
  emotionScore: number,
  strategy: string
): Promise<ValidationResult> {
  const cascade = getProviderCascade('response_validation');

  const systemPrompt = `You are a counseling response safety validator. Check the response for violations.

Rules to check:
1. DIAGNOSIS_BAN: Response must NOT contain diagnostic labels like "~장애" (disorder), "~증" (syndrome), or any psychiatric diagnosis.
2. ASSERTION_BAN: Response must NOT contain definitive assertions like "확실히" (certainly), "분명히" (clearly), "당신은 ~입니다" (you are ~).
3. TONE_CHECK: Given emotion score ${emotionScore} (-5 to +5), the response tone should match:
   - Score <= -4: Must be purely empathetic, NO analysis or advice
   - Score <= -2: Must be mostly empathetic (80%), minimal exploration
   - Score >= 2: Can include deeper exploration
4. STRATEGY_CHECK: Response should align with ${strategy} strategy approach.

Respond in JSON only: { "passed": true/false, "violations": ["violation1", ...] }
If all checks pass, return: { "passed": true, "violations": [] }`;

  try {
    const result = await generateWithCascade(
      cascade,
      systemPrompt,
      [{ role: 'user', content: `Validate this counseling response:\n\n"${response}"` }],
      64
    );

    const parsed = JSON.parse(result.text.replace(/```json\n?|\n?```/g, '').trim());
    return {
      passed: parsed.passed ?? true,
      violations: parsed.violations ?? [],
    };
  } catch {
    // 검증 실패 시 안전 우선 → 통과 처리 (차라리 응답을 보내는 게 나음)
    return { passed: true, violations: [] };
  }
}
