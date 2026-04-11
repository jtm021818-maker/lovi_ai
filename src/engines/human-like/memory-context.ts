/**
 * 🆕 v28: Memory Context — 실시간 기억 추출 + 프롬프트 빌드
 *
 * 세션 내 키 팩트를 코드 레벨에서 추출 (API 0).
 * 과거 세션 메모리와 합쳐서 프롬프트에 주입.
 *
 * API 호출: 0 (정규식 기반 추출 + 메모리 프로필 로드)
 */

// ============================================
// 키 팩트 추출 (정규식 기반)
// ============================================

export interface MemoryFact {
  key: string;
  value: string;
  confidence: number;  // 0~1
  turnExtracted: number;
}

const FACT_PATTERNS: Array<{ pattern: RegExp; key: string; extract: (match: RegExpMatchArray) => string }> = [
  {
    pattern: /사귄\s*(?:지\s*)?(\d+)\s*([년개월일주])/,
    key: 'relationship_duration',
    extract: (m) => `${m[1]}${m[2]}`,
  },
  {
    pattern: /(?:남|여)(?:자)?친(?:구)?\s*(?:이름|은|이|는)\s*(\S{1,5})/,
    key: 'partner_name',
    extract: (m) => m[1],
  },
  {
    pattern: /(?:나이|나)\s*(?:는|가)?\s*(\d{2})\s*(?:살|세)/,
    key: 'user_age',
    extract: (m) => `${m[1]}세`,
  },
  {
    pattern: /(?:대학|학교|직장|회사)\s*(?:에서|을|를)?\s*(?:다니|근무)/,
    key: 'occupation_hint',
    extract: () => '학생/직장인',
  },
  {
    pattern: /(?:결혼|약혼|동거)/,
    key: 'relationship_stage',
    extract: (m) => m[0],
  },
  {
    pattern: /(?:장거리|군대|해외)/,
    key: 'relationship_type',
    extract: (m) => m[0],
  },
  {
    pattern: /(?:첫\s*연애|처음\s*사귀)/,
    key: 'first_relationship',
    extract: () => '첫 연애',
  },
];

/**
 * 유저 메시지에서 팩트 추출 (코드 레벨, API 0)
 */
export function extractFacts(message: string, turnNumber: number): MemoryFact[] {
  const facts: MemoryFact[] = [];

  for (const { pattern, key, extract } of FACT_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      facts.push({
        key,
        value: extract(match),
        confidence: 1.0,
        turnExtracted: turnNumber,
      });
    }
  }

  return facts;
}

// ============================================
// 세션 내 Working Memory
// ============================================

export class WorkingMemory {
  private facts: Map<string, MemoryFact> = new Map();
  private emotionArc: Array<{ emotion: string; score: number; turn: number }> = [];

  /**
   * 팩트 추가/업데이트
   */
  upsertFact(fact: MemoryFact) {
    this.facts.set(fact.key, fact);
  }

  /**
   * 감정 아크 기록
   */
  recordEmotion(emotion: string, score: number, turn: number) {
    this.emotionArc.push({ emotion, score, turn });
    // 최근 10개만 유지
    if (this.emotionArc.length > 10) {
      this.emotionArc = this.emotionArc.slice(-10);
    }
  }

  /**
   * 모든 팩트 반환
   */
  getFacts(): MemoryFact[] {
    return Array.from(this.facts.values());
  }

  /**
   * 감정 아크 요약
   */
  getEmotionArcSummary(): string {
    if (this.emotionArc.length < 2) return '';
    const first = this.emotionArc[0];
    const last = this.emotionArc[this.emotionArc.length - 1];
    return `${first.emotion}(${first.score}) → ${last.emotion}(${last.score})`;
  }
}

// ============================================
// 프롬프트용 메모리 컨텍스트 빌드
// ============================================

export interface MemoryProfile {
  basicInfo?: Record<string, string>;
  relationshipContext?: string;
  sessionHighlights?: string[];
  emotionPatterns?: string[];
}

/**
 * Working Memory + Long-term Memory → 프롬프트 주입 텍스트
 * 목표: ~50토큰 이내
 */
export function buildMemoryPrompt(
  working: WorkingMemory,
  longTerm?: MemoryProfile | null,
  userName?: string,
): string {
  const parts: string[] = [];

  // 유저 이름
  if (userName) parts.push(`유저: ${userName}`);

  // Working Memory 팩트
  const facts = working.getFacts();
  if (facts.length > 0) {
    const factStr = facts
      .slice(0, 5)  // 최대 5개
      .map(f => `${f.key}: ${f.value}`)
      .join(', ');
    parts.push(factStr);
  }

  // Long-term Memory 핵심
  if (longTerm) {
    if (longTerm.basicInfo) {
      const infoStr = Object.entries(longTerm.basicInfo)
        .slice(0, 3)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      if (infoStr) parts.push(infoStr);
    }
    if (longTerm.sessionHighlights && longTerm.sessionHighlights.length > 0) {
      parts.push(`지난 상담: ${longTerm.sessionHighlights[longTerm.sessionHighlights.length - 1]}`);
    }
  }

  // 감정 아크
  const arc = working.getEmotionArcSummary();
  if (arc) parts.push(`감정 흐름: ${arc}`);

  if (parts.length === 0) return '';
  return `[기억] ${parts.join(' | ')}`;
}
