/**
 * 🧠 메모리 추출 엔진
 *
 * 세션 종료 시 대화 내용에서 유저에 대한 새로운 정보를 추출하여
 * user_profiles.memory_profile에 축적
 *
 * 사용: 세션 complete API에서 호출
 */

import { generateWithCascade } from '@/lib/ai/provider-registry';

// ─── Types ──────────────────────────────────────────────

export interface UserMemoryProfile {
  basicInfo: {
    nickname?: string;
    age?: string;
    gender?: string;
    occupation?: string;
  };
  relationshipContext: {
    status?: string;
    partnerDescription?: string;
    duration?: string;
    mainIssues: string[];
  };
  emotionPatterns: {
    dominantEmotions: string[];
    triggers: string[];
    copingStyle?: string;
    emotionTrend?: string;
  };
  sessionHighlights: {
    date: string;
    keyTopic: string;
    insight: string;
    actionTaken?: string;
  }[];
  communicationPrefs: {
    preferredTone?: string;
    responseLength?: string;
    whatWorks: string[];
    whatDoesnt: string[];
  };
  tarotMemory: {
    frequentCards: string[];
    significantReadings: {
      date: string;
      cards: string;
      insight: string;
    }[];
  };
  // 라운지 데이터
  dailyCheckins?: { date: string; mood: string; score: number }[];
  streakDays?: number;
  lastVisitDate?: string;
  badges?: { id: string; earnedAt: string }[];

  lastUpdated: string;
  totalSessions: number;
}

export interface MemoryExtraction {
  newFacts: string[];
  emotionUpdate: {
    dominant?: string;
    trigger?: string;
    trend?: string;
  };
  whatWorked: string[];
  whatDidnt: string[];
  nextSessionHook?: string;
  keyTopic?: string;
  keyInsight?: string;
  /**
   * 🆕 v76: 루나의 감정 결 — 이번 세션에서 루나가 느낀 핵심 감정
   * 예: "좀 안쓰러웠어, 얘 솔직한 건 장점인데 자책이 심함"
   * 다음 세션에 "문득 떠오른 기억" 으로 주입될 때 1인칭 독백 재료.
   */
  lunaFeeling?: string;
  /**
   * 🆕 v76: 루나가 이 유저에 대해 형성한 인상 한 줄
   * 예: "자책 강한 타입. 직설 힘들어함. 솔직한 표현은 강점"
   */
  lunaImpression?: string;
}

// ─── 메모리 추출 프롬프트 ────────────────────────────────

function buildExtractionPrompt(
  existingMemory: UserMemoryProfile,
  sessionMessages: { role: string; content: string }[],
  sessionScenario?: string,
): string {
  const conversation = sessionMessages
    .map((m) => `${m.role === 'user' ? '유저' : 'AI'}: ${m.content}`)
    .join('\n');

  const existingStr = JSON.stringify(existingMemory, null, 2);

  return `다음 대화에서 유저에 대해 새로 알게 된 정보를 JSON으로 추출해.
기존에 이미 알고 있는 정보와 겹치는 것은 제외하고, 새로운 것만.

[기존 메모리]
${existingStr}

[이번 세션 시나리오]
${sessionScenario ?? 'GENERAL'}

[이번 세션 대화]
${conversation}

다음 JSON 형식으로만 답해 (다른 텍스트 없이):
{
  "newFacts": ["새로 알게 된 사실 1", "사실 2"],
  "emotionUpdate": {
    "dominant": "이번 세션의 주요 감정 (한 단어)",
    "trigger": "감정의 원인/트리거",
    "trend": "improving | declining | stable"
  },
  "whatWorked": ["이번 세션에서 효과적이었던 상담 접근"],
  "whatDidnt": ["효과적이지 않았던 것"],
  "nextSessionHook": "다음 세션에서 자연스럽게 물어볼 것 (한 문장)",
  "keyTopic": "이번 세션의 핵심 주제 (한 줄)",
  "keyInsight": "이번 세션의 핵심 인사이트 (한 줄)",
  "lunaFeeling": "루나(AI) 가 이번 세션에서 실제로 느낀 감정 결 1인칭 (예: '좀 안쓰러웠어, 얘 솔직한 건 장점인데 자책이 심함')",
  "lunaImpression": "루나가 이 유저에 대해 형성한 인상 한 줄 (예: '자책 강한 타입. 직설 힘들어함. 솔직한 표현은 강점')"
}

⚠️ lunaFeeling / lunaImpression 은 "AI 관점 분석" X. 루나가 친한 언니로서 "얘랑 얘기하면서 내가 느낀 것" 을 1인칭 자연어로.`;
}

// ─── 메모리 추출 실행 ────────────────────────────────────

export async function extractSessionMemory(
  sessionMessages: { role: string; content: string }[],
  sessionScenario?: string,
  existingMemory?: UserMemoryProfile,
): Promise<MemoryExtraction | null> {
  const memory = existingMemory ?? createEmptyProfile();

  // 메시지가 너무 적으면 스킵
  if (sessionMessages.length < 4) return null;

  const prompt = buildExtractionPrompt(memory, sessionMessages, sessionScenario);

  try {
    const result = await generateWithCascade(
      [{ provider: 'gemini' as const, tier: 'haiku' as const }],
      'You extract structured memory data from conversations. Respond only with valid JSON.',
      [{ role: 'user', content: prompt }],
      1024,
    );

    const text = result.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]) as MemoryExtraction;
  } catch (e) {
    console.error('[Memory] 메모리 추출 실패:', e);
    return null;
  }
}

// ─── 기존 메모리에 새 추출 결과 머지 ─────────────────────

export function mergeMemory(
  existing: UserMemoryProfile,
  extraction: MemoryExtraction,
  sessionDate: string,
): UserMemoryProfile {
  const merged = structuredClone(existing);

  // 감정 패턴 업데이트
  if (extraction.emotionUpdate.dominant) {
    if (!merged.emotionPatterns.dominantEmotions.includes(extraction.emotionUpdate.dominant)) {
      merged.emotionPatterns.dominantEmotions.push(extraction.emotionUpdate.dominant);
      // 최근 5개만 유지
      if (merged.emotionPatterns.dominantEmotions.length > 5) {
        merged.emotionPatterns.dominantEmotions = merged.emotionPatterns.dominantEmotions.slice(-5);
      }
    }
  }
  if (extraction.emotionUpdate.trigger) {
    if (!merged.emotionPatterns.triggers.includes(extraction.emotionUpdate.trigger)) {
      merged.emotionPatterns.triggers.push(extraction.emotionUpdate.trigger);
      if (merged.emotionPatterns.triggers.length > 5) {
        merged.emotionPatterns.triggers = merged.emotionPatterns.triggers.slice(-5);
      }
    }
  }
  if (extraction.emotionUpdate.trend) {
    merged.emotionPatterns.emotionTrend = extraction.emotionUpdate.trend;
  }

  // 세션 하이라이트 추가 (최근 10개만)
  if (extraction.keyTopic) {
    merged.sessionHighlights.push({
      date: sessionDate,
      keyTopic: extraction.keyTopic,
      insight: extraction.keyInsight ?? '',
      actionTaken: undefined,
    });
    if (merged.sessionHighlights.length > 10) {
      merged.sessionHighlights = merged.sessionHighlights.slice(-10);
    }
  }

  // 소통 선호 업데이트
  for (const w of extraction.whatWorked) {
    if (!merged.communicationPrefs.whatWorks.includes(w)) {
      merged.communicationPrefs.whatWorks.push(w);
      if (merged.communicationPrefs.whatWorks.length > 5) {
        merged.communicationPrefs.whatWorks = merged.communicationPrefs.whatWorks.slice(-5);
      }
    }
  }
  for (const d of extraction.whatDidnt) {
    if (!merged.communicationPrefs.whatDoesnt.includes(d)) {
      merged.communicationPrefs.whatDoesnt.push(d);
      if (merged.communicationPrefs.whatDoesnt.length > 5) {
        merged.communicationPrefs.whatDoesnt = merged.communicationPrefs.whatDoesnt.slice(-5);
      }
    }
  }

  // 연애 상황에 새 이슈 추가
  for (const fact of extraction.newFacts) {
    // 연애 관련 키워드가 있으면 mainIssues에 추가
    if (/바람|읽씹|권태|이별|재회|짝사랑|고스팅|질투/.test(fact)) {
      const issue = fact.slice(0, 30);
      if (!merged.relationshipContext.mainIssues.includes(issue)) {
        merged.relationshipContext.mainIssues.push(issue);
        if (merged.relationshipContext.mainIssues.length > 5) {
          merged.relationshipContext.mainIssues = merged.relationshipContext.mainIssues.slice(-5);
        }
      }
    }
  }

  // 메타 업데이트
  merged.lastUpdated = new Date().toISOString();
  merged.totalSessions = (merged.totalSessions ?? 0) + 1;

  return merged;
}

// ─── 빈 프로필 생성 ─────────────────────────────────────

export function createEmptyProfile(): UserMemoryProfile {
  return {
    basicInfo: {},
    relationshipContext: { mainIssues: [] },
    emotionPatterns: { dominantEmotions: [], triggers: [] },
    sessionHighlights: [],
    communicationPrefs: { whatWorks: [], whatDoesnt: [] },
    tarotMemory: { frequentCards: [], significantReadings: [] },
    lastUpdated: new Date().toISOString(),
    totalSessions: 0,
  };
}

// ─── 메모리 프로필 → 프롬프트 텍스트 변환 ────────────────

export function formatMemoryForPrompt(memory: UserMemoryProfile): string {
  if (!memory || !memory.totalSessions) return '';

  const parts: string[] = ['[이 유저에 대해 알고 있는 것]'];

  // 기본 정보 — 안전한 접근 (빈 객체 방어)
  const info: string[] = [];
  if (memory.basicInfo?.age) info.push(memory.basicInfo.age);
  if (memory.basicInfo?.occupation) info.push(memory.basicInfo.occupation);
  if (memory.relationshipContext?.status) info.push(memory.relationshipContext.status);
  if (memory.relationshipContext?.duration) info.push(`사귄 지 ${memory.relationshipContext.duration}`);
  if (info.length > 0) parts.push(`- 기본: ${info.join(', ')}`);

  // 주요 고민
  if (memory.relationshipContext?.mainIssues?.length > 0) {
    parts.push(`- 주요 고민: ${memory.relationshipContext.mainIssues.join(', ')}`);
  }

  // 감정 패턴
  if (memory.emotionPatterns?.dominantEmotions?.length > 0) {
    parts.push(`- 감정 패턴: ${memory.emotionPatterns.dominantEmotions.join(', ')}`);
  }
  if (memory.emotionPatterns?.triggers?.length > 0) {
    parts.push(`- 감정 트리거: ${memory.emotionPatterns.triggers.join(', ')}`);
  }
  if (memory.emotionPatterns?.emotionTrend) {
    const trendLabel = memory.emotionPatterns.emotionTrend === 'improving' ? '개선 추세'
      : memory.emotionPatterns.emotionTrend === 'declining' ? '악화 추세 (주의)'
      : '안정적';
    parts.push(`- 감정 추이: ${trendLabel}`);
  }

  // 소통 선호
  if (memory.communicationPrefs?.whatWorks?.length > 0) {
    parts.push(`- 효과적인 접근: ${memory.communicationPrefs.whatWorks.join(', ')}`);
  }
  if (memory.communicationPrefs?.whatDoesnt?.length > 0) {
    parts.push(`- 피해야 할 것: ${memory.communicationPrefs.whatDoesnt.join(', ')}`);
  }

  // 최근 세션 (최근 3개만 프롬프트에)
  const recentHighlights = memory.sessionHighlights?.slice(-3) ?? [];
  if (recentHighlights.length > 0) {
    parts.push('- 최근 상담:');
    for (const h of recentHighlights) {
      const line = `  ${h.date.slice(5, 10)}: ${h.keyTopic}${h.insight ? ` → ${h.insight}` : ''}${h.actionTaken ? ` (숙제: ${h.actionTaken})` : ''}`;
      parts.push(line);
    }
  }

  // 총 세션 수
  parts.push(`- 총 ${memory.totalSessions}번째 상담`);

  parts.push('');
  parts.push('→ 이 정보를 자연스럽게 대화에 녹여. 데이터 나열하지 말고 "저번에 그랬잖아" 식으로.');

  return parts.join('\n');
}
