/**
 * 🆕 v29: Memory Engine — "아 맞다!" 인간형 기억 시스템
 *
 * 인간처럼 기억: 현재 대화 = 항상, 옛 기억 = 트리거 시에만.
 * - 키워드 매칭: "읽씹" → 이전 읽씹 기억 트리거
 * - 감정 유사: 비슷한 감정 → 과거 순간 트리거
 * - 자발적 회상: 4% 확률 "아 맞다!"
 * - 8턴 쿨다운: 기억 남발 방지
 *
 * API 호출: 0 (DB 쿼리만, <50ms)
 */

// ============================================
// 타입
// ============================================

export interface MemoryRow {
  id: string;
  content: string;
  summary: string | null;
  memory_type: 'episodic' | 'semantic' | 'fact';
  category: string | null;
  source: 'counseling' | 'lounge' | 'onboarding';
  keyword_tags: string[];
  emotion_tag: string | null;
  emotional_weight: number;
  access_count: number;
  retention_score: number;
  is_pinned: boolean;
  created_at: string;
  last_accessed_at: string;
  session_id: string | null;
  salience?: number;
}

export interface MemoryTriggerResult {
  memory: MemoryRow;
  triggerType: 'keyword' | 'emotion' | 'spontaneous' | 'lounge' | 'time';
  prefix: string;
  injection: string;
}

// ============================================
// 키워드 분류 체계 (한국 연애 상담 도메인)
// ============================================

const KEYWORD_TAXONOMY: Record<string, string[]> = {
  '읽씹': ['읽씹', '읽고', '안읽', '씹'],
  '연락': ['연락', '문자', '전화', '카톡', '답장', '톡'],
  '잠수': ['잠수', '사라', '연락두절', '안보'],
  '싸움': ['싸움', '싸웠', '다퉜', '다툼', '갈등'],
  '화': ['화났', '화가', '열받', '짜증', '빡'],
  '이별': ['이별', '헤어', '끝', '그만'],
  '바람': ['바람', '외도', '양다리', '다른여자', '다른남자'],
  '불안': ['불안', '걱정', '무서', '두려'],
  '외로움': ['외로', '혼자', '쓸쓸', '곁에'],
  '데이트': ['데이트', '만남', '약속'],
  '질투': ['질투', '집착', '의심', 'sns', '인스타'],
  '권태기': ['권태', '지겹', '지루', '설레지'],
  '결혼': ['결혼', '약혼', '동거', '미래'],
  '장거리': ['장거리', '군대', '해외'],
  '첫사랑': ['첫사랑', '첫연애', '처음'],
};

/**
 * 유저 메시지에서 키워드 추출 (API 0)
 */
export function extractKeywordsForMemory(message: string): string[] {
  const found = new Set<string>();
  const m = message.toLowerCase();

  for (const [canonical, variants] of Object.entries(KEYWORD_TAXONOMY)) {
    for (const v of variants) {
      if (m.includes(v)) {
        found.add(canonical);
        break;
      }
    }
  }
  return [...found];
}

// ============================================
// 기억 트리거 엔진
// ============================================

const COOLDOWN_TURNS = 8;
const KEYWORD_THRESHOLD = 0.35;
const EMOTION_THRESHOLD = 0.30;
const SPONTANEOUS_PROB = 0.04;

export class MemoryTriggerEngine {
  private lastMemoryTurn = -99;
  private turnCount = 0;

  /**
   * 매 턴 실행 — 기억을 표면화할지 판단
   *
   * @param supabase Supabase 클라이언트
   * @param userId 유저 ID
   * @param userMessage 유저 메시지
   * @param currentEmotion 현재 감정 태그
   * @returns 트리거된 기억 or null (대부분 null)
   */
  async processTurn(
    supabase: any,
    userId: string,
    userMessage: string,
    currentEmotion: string | null,
  ): Promise<MemoryTriggerResult | null> {
    this.turnCount++;

    // 쿨다운 체크
    if (this.turnCount - this.lastMemoryTurn < COOLDOWN_TURNS) {
      return null;
    }

    // 키워드 추출
    const keywords = extractKeywordsForMemory(userMessage);

    // DB에서 후보 기억 검색
    const candidates = await this.searchMemories(supabase, userId, keywords, currentEmotion);
    if (!candidates || candidates.length === 0) return null;

    const best = candidates[0];
    const bestSalience = best.salience ?? 0;

    // 트리거 판단
    const hasKeywordMatch = keywords.length > 0 && bestSalience > KEYWORD_THRESHOLD;
    const hasEmotionMatch = currentEmotion && best.emotion_tag === currentEmotion && bestSalience > EMOTION_THRESHOLD;
    const isSpontaneous = Math.random() < SPONTANEOUS_PROB && bestSalience > 0.25;

    // 라운지 소스 보너스
    const isLoungeMemory = best.source === 'lounge';

    let triggerType: MemoryTriggerResult['triggerType'] | null = null;

    if (hasKeywordMatch) triggerType = isLoungeMemory ? 'lounge' : 'keyword';
    else if (hasEmotionMatch) triggerType = 'emotion';
    else if (isSpontaneous) triggerType = 'spontaneous';

    if (!triggerType) return null;

    // 트리거 성공 — 기록
    this.lastMemoryTurn = this.turnCount;

    // 기억 강화 (access_count + 1, last_accessed_at 갱신)
    await reinforceMemory(supabase, best.id);

    // 프롬프트 주입 텍스트 생성
    const prefix = pickPrefix(triggerType);
    const injection = buildMemoryInjection(best, triggerType, prefix);

    return { memory: best, triggerType, prefix, injection };
  }

  /**
   * DB에서 관련 기억 검색 (SQL, <50ms)
   */
  private async searchMemories(
    supabase: any,
    userId: string,
    keywords: string[],
    currentEmotion: string | null,
  ): Promise<(MemoryRow & { salience: number })[]> {
    try {
      // 키워드 OR 감정 OR pinned 매칭
      let query = supabase
        .from('user_memories')
        .select('*')
        .eq('user_id', userId)
        .gt('retention_score', 0.05)
        .order('last_accessed_at', { ascending: false })
        .limit(10);

      const { data, error } = await query;
      if (error || !data) return [];

      // 코드 레벨 살리언스 계산 + 필터링
      const now = Date.now();
      const scored = data
        .map((m: any) => {
          // 키워드 겹침
          const keywordHits = keywords.filter(k => (m.keyword_tags || []).includes(k)).length;

          // recency (14일 반감기)
          const lastAccess = new Date(m.last_accessed_at).getTime();
          const daysSince = (now - lastAccess) / (1000 * 60 * 60 * 24);
          const recency = Math.exp(-0.693 * daysSince / 14);

          // 감정 매칭 보너스
          const emotionBoost = (currentEmotion && m.emotion_tag === currentEmotion) ? 1.4 : 1.0;

          // 복합 점수
          const salience = (
            0.40 * recency +
            0.30 * (m.emotional_weight || 0.3) +
            0.20 * Math.min((m.access_count || 0) / 10, 1) +
            0.10 * Math.min(keywordHits / 3, 1)
          ) * emotionBoost;

          return { ...m, salience, keywordHits };
        })
        .filter((m: any) => m.keywordHits > 0 || (currentEmotion && m.emotion_tag === currentEmotion) || m.is_pinned)
        .sort((a: any, b: any) => b.salience - a.salience);

      return scored.slice(0, 3);
    } catch (e) {
      console.warn('[MemoryEngine] 검색 실패:', e);
      return [];
    }
  }
}

// ============================================
// 기억 강화
// ============================================

async function reinforceMemory(supabase: any, memoryId: string) {
  try {
    // 🆕 v32: RPC로 원자적 증가 (H2 race condition 수정)
    const { error: rpcError } = await supabase.rpc('reinforce_memory', {
      p_memory_id: memoryId,
      p_retention_boost: 0.1,
    });
    if (rpcError) {
      // RPC 미존재 시 폴백 (기존 로직)
      console.warn('[MemoryEngine] RPC 폴백:', rpcError.message);
      const { data: current } = await supabase
        .from('user_memories')
        .select('access_count')
        .eq('id', memoryId)
        .single();
      await supabase
        .from('user_memories')
        .update({
          access_count: (current?.access_count ?? 0) + 1,
          last_accessed_at: new Date().toISOString(),
          retention_score: 1.0,
        })
        .eq('id', memoryId);
    }
  } catch {
    // 실패해도 무시
  }
}

// ============================================
// 기억 감쇠 (세션 종료 시 호출)
// ============================================

export async function decayMemories(supabase: any, userId: string) {
  try {
    // 모든 기억의 retention_score 업데이트
    const { data: memories } = await supabase
      .from('user_memories')
      .select('id, last_accessed_at, access_count, is_pinned, memory_type')
      .eq('user_id', userId);

    if (!memories) return;

    const now = Date.now();
    for (const m of memories) {
      if (m.is_pinned || m.memory_type === 'fact') continue; // 팩트는 감쇠 안 함

      const daysSince = (now - new Date(m.last_accessed_at).getTime()) / (1000 * 60 * 60 * 24);
      const stability = 7 * Math.pow(2, Math.min(m.access_count, 5)); // 강화될수록 안정
      const retention = Math.exp(-0.693 * daysSince / stability);

      if (retention < 0.05) {
        // 잊어진 기억 삭제
        await supabase.from('user_memories').delete().eq('id', m.id);
      } else {
        await supabase.from('user_memories').update({ retention_score: retention }).eq('id', m.id);
      }
    }
  } catch (e) {
    console.warn('[MemoryEngine] 감쇠 실패:', e);
  }
}

// ============================================
// 기억 저장 (세션 종료 시 or 실시간)
// ============================================

export async function saveMemory(
  supabase: any,
  userId: string,
  memory: {
    content: string;
    summary?: string;
    memoryType?: 'episodic' | 'semantic' | 'fact';
    category?: string;
    source?: 'counseling' | 'lounge' | 'onboarding';
    keywordTags?: string[];
    emotionTag?: string;
    emotionalWeight?: number;
    isPinned?: boolean;
    sessionId?: string;
    partnerName?: string;
  },
) {
  try {
    await supabase.from('user_memories').insert({
      user_id: userId,
      content: memory.content,
      summary: memory.summary ?? memory.content.slice(0, 50),
      memory_type: memory.memoryType ?? 'episodic',
      category: memory.category,
      source: memory.source ?? 'counseling',
      keyword_tags: memory.keywordTags ?? extractKeywordsForMemory(memory.content),
      emotion_tag: memory.emotionTag,
      emotional_weight: memory.emotionalWeight ?? 0.3,
      is_pinned: memory.isPinned ?? false,
      session_id: memory.sessionId,
      partner_name: memory.partnerName,
    });
  } catch (e) {
    console.warn('[MemoryEngine] 저장 실패:', e);
  }
}

// ============================================
// Working Memory 로드 (세션 시작 시)
// ============================================

export async function loadWorkingMemory(
  supabase: any,
  userId: string,
): Promise<{ facts: MemoryRow[]; recent: MemoryRow[]; topSalient: MemoryRow[] }> {
  try {
    // 🆕 v32: 3개 독립 쿼리 병렬 실행 (-100ms)
    const [factsResult, recentResult, salientResult] = await Promise.all([
      // 1. pinned 팩트 (이름, 나이 등 — 항상)
      supabase
        .from('user_memories')
        .select('*')
        .eq('user_id', userId)
        .eq('is_pinned', true)
        .limit(10),
      // 2. 최근 기억 (최신 3개)
      supabase
        .from('user_memories')
        .select('*')
        .eq('user_id', userId)
        .eq('is_pinned', false)
        .order('created_at', { ascending: false })
        .limit(3),
      // 3. 가장 중요한 기억 (emotional_weight 높은 3개)
      supabase
        .from('user_memories')
        .select('*')
        .eq('user_id', userId)
        .gt('retention_score', 0.3)
        .order('emotional_weight', { ascending: false })
        .limit(3),
    ]);

    return {
      facts: factsResult.data ?? [],
      recent: recentResult.data ?? [],
      topSalient: salientResult.data ?? [],
    };
  } catch {
    return { facts: [], recent: [], topSalient: [] };
  }
}

/**
 * Working Memory → 프롬프트 텍스트 (~100토큰)
 */
export function formatWorkingMemoryPrompt(
  wm: { facts: MemoryRow[]; recent: MemoryRow[]; topSalient: MemoryRow[] },
  userName?: string,
): string {
  const parts: string[] = [];

  // 유저 이름
  if (userName) parts.push(`유저: ${userName}`);

  // 팩트
  if (wm.facts.length > 0) {
    const factStr = wm.facts
      .map(f => f.summary ?? f.content)
      .slice(0, 5)
      .join(', ');
    parts.push(factStr);
  }

  // 최근 세션 요약
  if (wm.recent.length > 0) {
    const recentStr = wm.recent[0].summary ?? wm.recent[0].content;
    parts.push(`최근 상담: ${recentStr.slice(0, 40)}`);
  }

  if (parts.length === 0) return '';
  return `[기억] ${parts.join(' | ')}`;
}

// ============================================
// 프롬프트 주입 (트리거된 기억)
// ============================================

function buildMemoryInjection(
  memory: MemoryRow,
  triggerType: string,
  prefix: string,
): string {
  const summary = memory.summary ?? memory.content.slice(0, 40);
  return `[기억 트리거됨 — 이번 턴에서 자연스럽게 1문장만 언급해]
"${prefix} ${summary}"
→ 유저가 말한 내용과 연결해서 자연스럽게. 뜬금없으면 안 됨.
→ 기억은 1문장만. 길게 설명하지 마. 대화 흐름을 끊지 마.`;
}

// ============================================
// 한국어 기억 프레임
// ============================================

const PREFIXES: Record<string, string[]> = {
  keyword:     ['아 맞다, 전에도', '생각해보니까 그때도', '근데 그때도'],
  emotion:     ['그때랑 비슷한 느낌인데...', '왠지 그때 생각나는데'],
  spontaneous: ['갑자기 생각났는데', '아 참'],
  lounge:      ['아 맞다 라운지에서', '라운지에서 그 얘기 했잖아'],
  time:        ['벌써 지난번 얘기한 지', '저번에 왔을 때'],
};

function pickPrefix(triggerType: string): string {
  const pool = PREFIXES[triggerType] ?? PREFIXES.keyword;
  return pool[Math.floor(Math.random() * pool.length)];
}
