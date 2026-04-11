/**
 * 🆕 v40: DeepResearch — 루나가 "진짜 생각하는" 순간
 *
 * 핵심 철학:
 *   - 하드코딩된 "숨은 도구상자" 없음 (ACE v4 철학)
 *   - 매 상황마다 Gemini Grounding (Google Search)으로 실시간 2025~2026 최신 연구 검색
 *   - 결과는 "루나가 방금 떠올린 것"처럼 응답에 녹임
 *   - 유저 눈엔 이론/학자/논문 이름 0%
 *
 * 사용 시점:
 *   1. SOLVE Phase 진입 시 자동 (실전 참여형 코칭 시작 직전)
 *   2. 루나가 `[THINKING_DEEP:키워드]` 태그 출력 시 AI 자율 트리거
 *
 * 무료 티어:
 *   - Gemini 2.5 Flash: 500 RPD 무료
 *   - Gemini 2.5 Pro: 1,500 RPD 무료
 *   - 초과 시 $14/1000 (Flash) 또는 $35/1000 (Pro)
 *
 * 실패 시:
 *   - 빈 결과 반환 → 루나는 자기 지식으로 응답 (앱 계속 동작)
 */

import { GoogleGenAI } from '@google/genai';

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

/** 검색 결과 — 루나 프롬프트에 주입될 내부 참고 자료 */
export interface DeepResearchResult {
  /** Gemini가 찾아낸 실전 기법/팁 (내부 전용, 루나가 번역 후 출력) */
  insight: string;
  /** 실제 사용된 검색어들 (디버깅/로그용) */
  searchQueries: string[];
  /** 참고 URL들 (향후 확장용, 지금은 저장만) */
  sources: string[];
  /** 캐시 히트 여부 */
  fromCache: boolean;
  /** 총 소요 시간 (ms) — UI 로딩 동기화 용 */
  durationMs: number;
}

/** 검색 요청 파라미터 */
export interface DeepResearchParams {
  /** 유저 상황 한 줄 요약 ("3일 째 카톡 읽씹 당해서 불안해 하는 중") */
  userSituation: string;
  /** 시나리오 타입 (있으면 검색 정확도 ↑) */
  scenario?: string;
  /** 최근 유저 메시지 (맥락 반영, 최대 3개) */
  recentMessages?: string[];
  /** 검색 초점 — 어떤 종류의 조언이 필요한가 */
  focusArea: 'action_plan' | 'emotional_support' | 'conversation_strategy' | 'situation_analysis';
  /** 키워드 힌트 (AI가 [THINKING_DEEP:키워드]에 넣은 값) */
  keywordHint?: string;
}

// ============================================================
// 단순 in-memory 캐시 (같은 상황 반복 검색 방지)
// ============================================================

interface CacheEntry {
  result: DeepResearchResult;
  expiresAt: number;
}

const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10분

function buildCacheKey(params: DeepResearchParams): string {
  return `${params.focusArea}:${params.scenario ?? 'general'}:${params.userSituation.slice(0, 60)}`;
}

function getCached(key: string): DeepResearchResult | null {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    CACHE.delete(key);
    return null;
  }
  return { ...entry.result, fromCache: true };
}

function setCached(key: string, result: DeepResearchResult): void {
  CACHE.set(key, {
    result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  // 간단한 크기 제한
  if (CACHE.size > 100) {
    const firstKey = CACHE.keys().next().value;
    if (firstKey) CACHE.delete(firstKey);
  }
}

// ============================================================
// 검색 프롬프트 빌더 — focusArea 별로 다른 질문
// ============================================================

function buildResearchPrompt(params: DeepResearchParams): string {
  const contextLines: string[] = [];
  contextLines.push(`[유저 상황]\n${params.userSituation}`);

  if (params.scenario) {
    contextLines.push(`[시나리오]\n${params.scenario}`);
  }

  if (params.recentMessages && params.recentMessages.length > 0) {
    contextLines.push(
      `[유저 최근 말]\n${params.recentMessages.slice(-3).map((m, i) => `${i + 1}. "${m}"`).join('\n')}`,
    );
  }

  if (params.keywordHint) {
    contextLines.push(`[핵심 키워드]\n${params.keywordHint}`);
  }

  const focusGuide: Record<DeepResearchParams['focusArea'], string> = {
    action_plan: `
이 유저에게 실전에서 **바로 해볼 수 있는 구체적 행동/카톡 멘트/대화 전략**을 찾아줘.
- 너무 큰 조언 말고, 작은 한 걸음부터
- 카톡 예시 문장이 있으면 좋음
- 2024~2026년 관계 심리학/연애 코칭 최신 기법 활용`,

    emotional_support: `
이 유저의 감정 상태에 가장 효과적인 **정서 안정 기법 + 공감 접근법**을 찾아줘.
- 호흡/마음챙김/자기진정 기법 중 실전에서 먹히는 것
- 2024~2026년 감정 조절/불안 관리 최신 연구`,

    conversation_strategy: `
이 유저의 갈등/오해 상황을 풀 수 있는 **대화 전략/커뮤니케이션 기법**을 찾아줘.
- 상대방이 방어하지 않고 듣게 하는 방법
- I-message/부드러운 시작/갈등 해결 2024~2026 최신 기법`,

    situation_analysis: `
이 유저의 상황을 객관적으로 이해할 수 있는 **관점/프레임/해석**을 찾아줘.
- 심리학 기반 관계 패턴 분석
- 2024~2026년 애착 이론/관계 역학 최신 연구`,
  };

  return `당신은 2026년 4월 기준 연애/관계 심리학 최신 연구를 아는 연구원입니다.
아래 상황에 대한 **실전에서 바로 써먹을 수 있는 최신 기법**을 Google Search로 찾아 정리해주세요.

${contextLines.join('\n\n')}

[검색 초점]${focusGuide[params.focusArea]}

[출력 형식 — 이건 루나(AI 캐릭터) 내부 참고 자료임, 유저에게 직접 전달 아님]

🎯 핵심 기법 (1~2개, 학자/이론 이름 포함 가능 — 내부 참고용):
<기법 1 이름>: <왜 효과 있는지 한 줄>
- 실전 적용: <구체적 행동 or 카톡 예시>

<기법 2 이름 (선택)>: <왜 효과 있는지 한 줄>
- 실전 적용: <구체적 행동 or 카톡 예시>

📌 루나가 알아야 할 핵심 포인트 (1~3줄):
<이 상황에서 진짜 중요한 insight>

⚠️ 주의:
- 300자 이내로 간결하게
- 이건 내부 참고용이므로 학자/논문 이름 OK (루나가 다시 누나 말투로 번역할 것)
- 루나는 이걸 "방금 떠올린 내 경험/내 생각"처럼 출력할 예정`;
}

// ============================================================
// 메인 함수 — Gemini Grounding 호출
// ============================================================

/**
 * 루나가 "진짜 생각하는" 순간 — Google Search grounding으로 최신 연구 검색
 *
 * @param params 검색 파라미터
 * @returns DeepResearchResult (실패 시 빈 insight)
 */
export async function runDeepResearch(
  params: DeepResearchParams,
): Promise<DeepResearchResult> {
  const startedAt = Date.now();

  // 1. 캐시 체크
  const cacheKey = buildCacheKey(params);
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[DeepResearch] 💾 캐시 히트: "${params.userSituation.slice(0, 40)}..."`);
    return cached;
  }

  // 2. Gemini Grounding 호출
  try {
    const prompt = buildResearchPrompt(params);

    const response = await gemini.models.generateContent({
      model: 'gemini-2.5-flash', // Grounding 지원 + Flash 500 RPD 무료
      config: {
        tools: [{ googleSearch: {} }], // 🔍 Google Search grounding 활성화
        maxOutputTokens: 600,
        temperature: 0.4,
      },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const insight = (response.text ?? '').trim();

    // Grounding metadata에서 검색어 + 출처 추출
    const groundingMetadata = (response.candidates?.[0] as any)?.groundingMetadata;
    const searchQueries: string[] = groundingMetadata?.webSearchQueries ?? [];
    const sources: string[] = [];
    if (groundingMetadata?.groundingChunks) {
      for (const chunk of groundingMetadata.groundingChunks) {
        const uri = chunk?.web?.uri;
        if (uri && typeof uri === 'string') sources.push(uri);
      }
    }

    const durationMs = Date.now() - startedAt;
    const result: DeepResearchResult = {
      insight,
      searchQueries,
      sources,
      fromCache: false,
      durationMs,
    };

    // 3. 캐시 저장
    setCached(cacheKey, result);

    console.log(
      `[DeepResearch] 🔍 완료: ${durationMs}ms | 검색어 ${searchQueries.length}개 | 출처 ${sources.length}개 | insight ${insight.length}자`,
    );
    if (searchQueries.length > 0) {
      console.log(`[DeepResearch] 검색어: ${searchQueries.slice(0, 3).join(' | ')}`);
    }

    return result;
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.warn(`[DeepResearch] ⚠️ 실패 (${durationMs}ms):`, (error as Error).message);
    // 실패해도 앱은 계속 돌아가야 함 — 빈 결과 반환
    return {
      insight: '',
      searchQueries: [],
      sources: [],
      fromCache: false,
      durationMs,
    };
  }
}

// ============================================================
// 고민 UI 문구 생성 — 유저 키워드 기반 맞춤 문구
// ============================================================

const THINKING_PHRASE_TEMPLATES = [
  `잠깐만, [K] 얘기 다시 생각해볼게`,
  `음... [K] 이거 비슷한 거 어디서 봤는데`,
  `아 [K] 관련해서 최근에 본 게 있어`,
  `너 얘기 들으면서 떠오른 건데...`,
  `[K] 이거 진짜 중요한 거라...`,
  `잠깐만 — 나 좀 정리하고 말해줄게`,
  `[K] 이런 경우엔... 아 맞다`,
  `야 나 갑자기 생각난 거 있어`,
  `[K] 관련해서 좀 더 생각해볼게`,
  `내가 아는 거 다 떠올려볼게`,
  `[K] 얘기 듣고 있으니까 뭔가 보여`,
  `잠깐 — [K] 이거 맞는 건지 다시 볼게`,
  `어 잠깐, 나 방금 생각난 게 있어`,
  `[K] 이게... 맞다 그거였어`,
  `음 내가 본 거 중에 [K] 비슷한 게...`,
  `잠깐 머릿속 정리 좀 할게`,
];

/**
 * "루나가 고민 중" UI에 순차 표시할 문구 생성
 *
 * @param userKeyword 유저 메시지에서 추출한 키워드 (없으면 "너 얘기")
 * @param count 생성할 문구 수 (기본 3개)
 * @returns 랜덤 섞인 문구 배열
 */
export function generateThinkingPhrases(
  userKeyword: string = '',
  count: number = 3,
): string[] {
  const keyword = userKeyword.trim() || '너 얘기';

  // [K] 치환 + 중복 제거
  const pool = Array.from(
    new Set(THINKING_PHRASE_TEMPLATES.map((t) => t.replace(/\[K\]/g, keyword))),
  );

  // Fisher-Yates shuffle
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

/**
 * 유저 메시지에서 핵심 키워드 추출 (간단한 휴리스틱)
 * 실제로는 AI가 파싱하는 게 정확하지만, UI 로딩 문구용은 이 정도면 충분
 */
export function extractKeyword(userMessage: string): string {
  if (!userMessage) return '';

  // 1. 감정 키워드 우선
  const emotionKeywords = ['읽씹', '잠수', '권태', '이별', '질투', '외도', '불안', '답답', '막막', '짝사랑', '재회', '썸', '고백', '싸움', '다툼', '오해'];
  for (const kw of emotionKeywords) {
    if (userMessage.includes(kw)) return kw;
  }

  // 2. 관계 키워드
  const relationKeywords = ['남친', '여친', '남자친구', '여자친구', '걔', '그 사람', '전남친', '전여친'];
  for (const kw of relationKeywords) {
    if (userMessage.includes(kw)) return `${kw} 얘기`;
  }

  // 3. 기본값
  return '네 상황';
}
