/**
 * 📝 Statement 추출기
 *
 * 유저 발화 → 의미 단위 statement 배열
 * Gemini Flash Lite (저비용) 사용
 */

import { generateWithProvider, GEMINI_MODELS } from '@/lib/ai/provider-registry';
import type { Statement, StatementType, ExtractionInput } from './types';

// ============================================================
// 추출 프롬프트 (캐시됨)
// ============================================================

const EXTRACTOR_SYSTEM_PROMPT = `너는 유저 발화에서 "의미 단위 statement"를 추출하는 엔진이야.

## 출력
JSON 배열로 출력. 각 statement는:
{
  "type": "fact|emotion|decision|judgment|desire|plan",
  "subject": "누구/뭐에 관한 것 (예: '남친', '본인', '엄마', '회사')",
  "content": "정규화된 내용 (객관적 사실 한 줄)",
  "source_excerpt": "원문에서 발췌 (15자 이내)",
  "confidence": 0~1
}

## type 정의
- fact: 객관적 사실 ("남친이 어제 화냈어")
- emotion: 감정 표현 ("난 슬퍼")
- decision: 결정/선택 ("이제 헤어질래")
- judgment: 평가/판단 ("걔 진짜 좋은 사람이야")
- desire: 욕구/원함 ("연락 받고싶어")
- plan: 계획 ("내일 만나기로 했어")

## subject 정규화 규칙
- "걔", "그 사람", "남친" → 일관되게 "남친"으로 (전문 자체에서 누군지 명확하면)
- "나", "내가" → "본인"
- 모르겠으면 발화 그대로 사용

## confidence
- 1.0: 명확한 statement
- 0.7: 약간 애매
- 0.5 이하: 거의 추출 안 됨 (이런 건 빼는 게 나음)

## 주의
- 한 발화에 여러 statement 가능 (보통 1~3개)
- 단순 감탄사/리액션은 추출 X (예: "헐", "ㅋㅋ")
- 질문은 추출 X (예: "어떻게 해?")
- 출력은 순수 JSON 배열만. 마크다운 X.

## 예시 1
유저: "남친이 어제 또 답장 안 했어. 진짜 짜증나"
출력:
[
  {"type": "fact", "subject": "남친", "content": "남친이 어제 답장 안 함", "source_excerpt": "남친이 어제 또 답장 안 했어", "confidence": 0.95},
  {"type": "emotion", "subject": "본인", "content": "짜증 느낌", "source_excerpt": "진짜 짜증나", "confidence": 0.9}
]

## 예시 2
유저: "이제 헤어질래. 더는 못 참겠어"
출력:
[
  {"type": "decision", "subject": "본인", "content": "이별 결정", "source_excerpt": "이제 헤어질래", "confidence": 0.95},
  {"type": "emotion", "subject": "본인", "content": "한계 도달", "source_excerpt": "더는 못 참겠어", "confidence": 0.9}
]

## 예시 3 (추출 적은 경우)
유저: "헐 진짜?"
출력: []

## 예시 4
유저: "내일 만나기로 했어. 근데 좀 떨려"
출력:
[
  {"type": "plan", "subject": "본인", "content": "남친(추정)과 내일 만남 예정", "source_excerpt": "내일 만나기로 했어", "confidence": 0.85},
  {"type": "emotion", "subject": "본인", "content": "긴장", "source_excerpt": "좀 떨려", "confidence": 0.9}
]
`;

// ============================================================
// 메인 추출 함수
// ============================================================

export async function extractStatements(
  input: ExtractionInput,
): Promise<{ statements: Statement[]; latencyMs: number; error?: string }> {
  const t0 = Date.now();

  // 빈 발화는 스킵
  if (!input.user_utterance.trim() || input.user_utterance.trim().length < 3) {
    return { statements: [], latencyMs: Date.now() - t0 };
  }

  try {
    const userMessage = input.context
      ? `[직전 컨텍스트]\n${input.context}\n\n[현재 유저 발화]\n"${input.user_utterance}"\n\n위 발화에서 statement 추출:`
      : `유저: "${input.user_utterance}"\n\nStatement 추출:`;

    const raw = await Promise.race([
      generateWithProvider(
        'gemini',
        EXTRACTOR_SYSTEM_PROMPT,
        [{ role: 'user' as const, content: userMessage }],
        'haiku',
        500,
        GEMINI_MODELS.FLASH_LITE_25,
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('extractor_timeout')), 4000),
      ),
    ]);

    const statements = parseStatementJSON(raw, input);
    return { statements, latencyMs: Date.now() - t0 };
  } catch (err: any) {
    return {
      statements: [],
      latencyMs: Date.now() - t0,
      error: err?.message ?? 'unknown',
    };
  }
}

// ============================================================
// JSON 파싱 + 정규화
// ============================================================

function parseStatementJSON(raw: string, input: ExtractionInput): Statement[] {
  if (!raw) return [];

  // 코드블록 제거
  let text = raw.trim();
  text = text.replace(/^```json\s*/i, '').replace(/\s*```\s*$/i, '');
  text = text.replace(/^```\s*/, '').replace(/\s*```\s*$/, '');

  // 첫 [ ~ 마지막 ] 추출
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  if (firstBracket === -1 || lastBracket === -1) return [];
  const jsonStr = text.slice(firstBracket, lastBracket + 1);

  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];

    const now = new Date().toISOString();

    return parsed
      .filter(p => p && typeof p === 'object')
      .map(p => normalizeStatement(p, input, now))
      .filter(s => s !== null) as Statement[];
  } catch {
    return [];
  }
}

function normalizeStatement(
  p: any,
  input: ExtractionInput,
  now: string,
): Statement | null {
  const validTypes: StatementType[] = ['fact', 'emotion', 'decision', 'judgment', 'desire', 'plan'];
  const type = validTypes.includes(p.type) ? p.type : null;
  if (!type) return null;

  const subject = String(p.subject ?? '').trim();
  const content = String(p.content ?? '').trim();
  if (!subject || !content) return null;

  const confidence = Math.min(1, Math.max(0, Number(p.confidence ?? 0.5)));
  if (confidence < 0.5) return null; // 너무 약한 추출은 무시

  return {
    user_id: input.user_id,
    session_id: input.session_id,
    type,
    subject: subject.slice(0, 50),
    content: content.slice(0, 200),
    source_excerpt: String(p.source_excerpt ?? '').trim().slice(0, 50),
    confidence,
    stated_at: now,
  };
}
