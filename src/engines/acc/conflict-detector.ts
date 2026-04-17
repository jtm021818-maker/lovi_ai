/**
 * 🔍 모순 감지기 (ACC 핵심 기능)
 *
 * 새 statement 가 과거 statement 와 충돌하는지 감지.
 *
 * 두 단계 접근:
 *   1. 빠른 휴리스틱 (regex/키워드) — 0 비용
 *   2. LLM 정밀 판정 (의심 케이스만) — Gemini Flash Lite
 */

import { generateWithProvider, GEMINI_MODELS } from '@/lib/ai/provider-registry';
import type {
  Statement,
  DetectedConflict,
  ConflictType,
  ConflictDetectionOptions,
} from './types';
import { fetchStatementsBySubject } from './statement-store';

interface SupabaseLike {
  from(table: string): any;
}

// ============================================================
// 메인 감지 함수
// ============================================================

export async function detectConflicts(
  supabase: SupabaseLike,
  newStatement: Statement,
  options: ConflictDetectionOptions = {},
): Promise<DetectedConflict[]> {
  // 같은 subject 의 과거 statement 검색
  const previous = options.same_subject_only !== false
    ? await fetchStatementsBySubject(
        supabase,
        newStatement.user_id,
        newStatement.subject,
        options,
      )
    : [];

  if (previous.length === 0) return [];

  const conflicts: DetectedConflict[] = [];
  const maxAgeDays = options.max_age_days ?? 30;

  for (const prev of previous) {
    // 자기 자신과 비교 X
    if (prev.id === newStatement.id) continue;

    const daysApart = daysBetween(prev.stated_at, newStatement.stated_at);
    if (daysApart > maxAgeDays) continue;

    // Stage 1: 휴리스틱 (저비용)
    const quickCheck = quickHeuristicConflict(prev, newStatement);
    if (!quickCheck.suspect) continue;

    // Stage 2: 명백한 모순이면 LLM 안 거치고 바로 추가
    if (quickCheck.confidence > 0.85) {
      conflicts.push({
        previous: prev,
        current: newStatement,
        conflict_type: quickCheck.type!,
        days_apart: daysApart,
        severity: quickCheck.confidence,
        description: buildDescription(prev, newStatement, quickCheck.type!, daysApart),
        natural_callout_hint: buildCalloutHint(prev, newStatement, quickCheck.type!, daysApart),
      });
      continue;
    }

    // Stage 3: 의심스럽지만 애매 — LLM 검증
    const llmCheck = await verifyConflictWithLLM(prev, newStatement);
    if (llmCheck.isConflict) {
      conflicts.push({
        previous: prev,
        current: newStatement,
        conflict_type: llmCheck.type ?? quickCheck.type ?? 'mood_change',
        days_apart: daysApart,
        severity: llmCheck.severity,
        description: llmCheck.description ?? buildDescription(prev, newStatement, llmCheck.type ?? 'mood_change', daysApart),
        natural_callout_hint: llmCheck.callout_hint ?? buildCalloutHint(prev, newStatement, llmCheck.type ?? 'mood_change', daysApart),
      });
    }
  }

  // 가장 강한 모순 1-2개만 반환 (압도 방지)
  return conflicts
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 2);
}

// ============================================================
// Stage 1: 휴리스틱 빠른 검사
// ============================================================

interface QuickCheckResult {
  suspect: boolean;
  type?: ConflictType;
  confidence: number; // 0~1
}

function quickHeuristicConflict(
  prev: Statement,
  current: Statement,
): QuickCheckResult {
  // 같은 type 이면 검사 정확도 ↑
  const sameType = prev.type === current.type;

  // 1. 결정 번복 ("헤어진다" → "만났다")
  if (prev.type === 'decision' && current.type === 'fact') {
    if (containsAny(prev.content, ['헤어', '이별', '끝', '안 만나']) &&
        containsAny(current.content, ['만났', '같이', '데이트', '연락'])) {
      return { suspect: true, type: 'decision_reversal', confidence: 0.9 };
    }
  }

  // 2. 직접 부정 (감정 반대)
  if (sameType && prev.type === 'emotion') {
    if ((containsAny(prev.content, ['좋아', '편안', '괜찮']) &&
         containsAny(current.content, ['싫', '힘들', '괴로', '안 좋'])) ||
        (containsAny(prev.content, ['싫', '힘들', '괴로']) &&
         containsAny(current.content, ['좋아', '편안', '괜찮']))) {
      return { suspect: true, type: 'mood_change', confidence: 0.7 };
    }
  }

  // 3. 평가 변경 (judgment)
  if (sameType && prev.type === 'judgment') {
    if (oppositeAdjectives(prev.content, current.content)) {
      return { suspect: true, type: 'judgment_shift', confidence: 0.75 };
    }
  }

  // 4. 계획 변경
  if (sameType && prev.type === 'plan') {
    if (containsAny(prev.content, ['만나', '약속']) &&
        containsAny(current.content, ['취소', '안', '못'])) {
      return { suspect: true, type: 'plan_change', confidence: 0.85 };
    }
  }

  // 5. 사실 불일치 (fact vs fact, 같은 시간 언급)
  if (sameType && prev.type === 'fact') {
    if (mentionsSameTime(prev.content, current.content) &&
        oppositeContent(prev.content, current.content)) {
      return { suspect: true, type: 'fact_inconsistency', confidence: 0.6 };
    }
  }

  // 6. 임베딩 유사도 + 부정어 체크 (대략적)
  if (sameType && containsNegation(current.content) &&
      contentSimilarity(prev.content, current.content) > 0.5) {
    return { suspect: true, type: 'direct_contradiction', confidence: 0.55 };
  }

  return { suspect: false, confidence: 0 };
}

// ============================================================
// Stage 2: LLM 정밀 검증
// ============================================================

interface LLMCheckResult {
  isConflict: boolean;
  type?: ConflictType;
  severity: number;
  description?: string;
  callout_hint?: string;
}

const CONFLICT_VERIFIER_PROMPT = `너는 두 발화 사이의 모순을 판정하는 엔진이야.

## 입력
과거 statement (며칠 전):
- type, subject, content

현재 statement:
- type, subject, content

## 출력 (순수 JSON, 마크다운 X)
{
  "is_conflict": true|false,
  "conflict_type": "direct_contradiction|decision_reversal|mood_change|fact_inconsistency|judgment_shift|plan_change",
  "severity": 0~1,
  "description": "왜 모순인지 자연어 설명 (50자)",
  "callout_hint": "루나가 자연스럽게 짚을 만한 한마디"
}

## 판정 기준
- 사람이 시간이 지나 마음 변하는 건 정상 → 단순 변화는 모순 아님
- 명백한 사실 불일치, 결정 번복, 평가 정반대만 모순으로
- severity 0.6 이상이어야 모순으로 처리할 가치 있음

## 예시
과거: {"type":"decision","subject":"본인","content":"이별 결정"}
현재: {"type":"fact","subject":"남친","content":"남친이랑 영화 봤어"}
출력: {"is_conflict":true,"conflict_type":"decision_reversal","severity":0.85,"description":"이별한다고 했는데 같이 영화 봄","callout_hint":"어? 너 저번에 헤어진다고 했었잖아 ㅋㅋ"}

## 비모순 예시
과거: {"type":"emotion","subject":"본인","content":"슬픔"}
현재: {"type":"emotion","subject":"본인","content":"기쁨"}
출력: {"is_conflict":false,"conflict_type":"mood_change","severity":0.2,"description":"단순 감정 변화"}`;

async function verifyConflictWithLLM(
  prev: Statement,
  current: Statement,
): Promise<LLMCheckResult> {
  try {
    const userMsg = `과거: ${JSON.stringify({ type: prev.type, subject: prev.subject, content: prev.content })}
현재: ${JSON.stringify({ type: current.type, subject: current.subject, content: current.content })}

판정:`;

    const raw = await Promise.race([
      generateWithProvider(
        'gemini',
        CONFLICT_VERIFIER_PROMPT,
        [{ role: 'user' as const, content: userMsg }],
        'haiku',
        300,
        GEMINI_MODELS.FLASH_LITE_25, // 🔁 v63.1: JSON 출력 안정성 우선 → 2.5 Flash Lite ($0.10)
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('verifier_timeout')), 3000),
      ),
    ]);

    return parseLLMVerification(raw);
  } catch {
    return { isConflict: false, severity: 0 };
  }
}

function parseLLMVerification(raw: string): LLMCheckResult {
  if (!raw) return { isConflict: false, severity: 0 };

  let text = raw.trim();
  text = text.replace(/^```json\s*/i, '').replace(/\s*```\s*$/i, '');
  text = text.replace(/^```\s*/, '').replace(/\s*```\s*$/, '');

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) return { isConflict: false, severity: 0 };

  try {
    const p = JSON.parse(text.slice(firstBrace, lastBrace + 1));
    return {
      isConflict: Boolean(p.is_conflict),
      type: p.conflict_type as ConflictType,
      severity: Math.min(1, Math.max(0, Number(p.severity ?? 0))),
      description: p.description,
      callout_hint: p.callout_hint,
    };
  } catch {
    return { isConflict: false, severity: 0 };
  }
}

// ============================================================
// 자연어 설명 + 우뇌 힌트 빌더
// ============================================================

function buildDescription(prev: Statement, current: Statement, type: ConflictType, daysApart: number): string {
  const daysStr = daysApart === 0 ? '오늘 안에' : daysApart === 1 ? '하루 사이' : `${Math.round(daysApart)}일 사이`;
  return `${daysStr}에 "${prev.content}" → "${current.content}" 변화 (${conflictTypeKr(type)})`;
}

function buildCalloutHint(prev: Statement, _current: Statement, type: ConflictType, daysApart: number): string {
  const daysStr = daysApart === 0 ? '아까' : daysApart === 1 ? '어제' : `저번에`;

  switch (type) {
    case 'decision_reversal':
      return `${daysStr} ${prev.content} 했었잖아. 어떻게 된 거야?`;
    case 'mood_change':
      return `${daysStr}랑 마음이 좀 달라진 건가?`;
    case 'judgment_shift':
      return `${daysStr}는 좀 다르게 말했었는데, 새로 보이는 게 있어?`;
    case 'plan_change':
      return `${daysStr} 그 약속 어떻게 됐어?`;
    case 'fact_inconsistency':
      return `잠깐, ${daysStr} 들은 거랑 좀 다른 것 같은데?`;
    case 'direct_contradiction':
      return `어? 정 반대 얘기 같은데?`;
    default:
      return `${daysStr}랑 좀 다른 것 같아`;
  }
}

function conflictTypeKr(type: ConflictType): string {
  const map: Record<ConflictType, string> = {
    direct_contradiction: '직접 모순',
    decision_reversal: '결정 번복',
    mood_change: '감정 변화',
    fact_inconsistency: '사실 불일치',
    judgment_shift: '평가 변경',
    plan_change: '계획 변경',
  };
  return map[type] ?? type;
}

// ============================================================
// 헬퍼
// ============================================================

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some(k => text.includes(k));
}

function containsNegation(text: string): boolean {
  return /안\s|못\s|아니|없|싫|말고/.test(text);
}

function oppositeAdjectives(a: string, b: string): boolean {
  const positivePatterns = ['좋', '착', '훌륭', '멋', '편안'];
  const negativePatterns = ['나쁘', '이상', '별로', '짜증', '싫'];

  const aPositive = positivePatterns.some(p => a.includes(p));
  const aNegative = negativePatterns.some(p => a.includes(p));
  const bPositive = positivePatterns.some(p => b.includes(p));
  const bNegative = negativePatterns.some(p => b.includes(p));

  return (aPositive && bNegative) || (aNegative && bPositive);
}

function mentionsSameTime(a: string, b: string): boolean {
  const timePatterns = ['어제', '오늘', '내일', '이번 주', '저번 주'];
  return timePatterns.some(t => a.includes(t) && b.includes(t));
}

function oppositeContent(a: string, b: string): boolean {
  // 부정어가 한쪽에만 있으면 의심
  return containsNegation(a) !== containsNegation(b);
}

function contentSimilarity(a: string, b: string): number {
  // 간이 자카드 유사도 (단어 단위)
  const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 1));
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 1));
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

function daysBetween(iso1: string, iso2: string): number {
  const t1 = new Date(iso1).getTime();
  const t2 = new Date(iso2).getTime();
  return Math.abs(t2 - t1) / (1000 * 60 * 60 * 24);
}
