/**
 * RAG 리트리버
 * 현재 메시지와 유사한 과거 상담 기억을 Supabase에서 검색
 * - match_past_memories RPC 함수 사용 (pgvector cosine similarity)
 * - 유사도 threshold: 0.5 (Architect 피드백 반영)
 * - top-5 결과 반환
 */

import { embedText } from './ingestor';
import { RAG_SIMILARITY_THRESHOLD, RAG_TOP_K } from '@/lib/utils/constants';
import type { SupabaseClient } from '@supabase/supabase-js';

/** RAG 검색 결과 항목 */
export interface MemoryMatch {
  /** 메모리 ID */
  id: string;
  /** 저장된 메시지 내용 */
  content: string;
  /** 코사인 유사도 (0 ~ 1) */
  similarity: number;
  /** 감정 점수 */
  emotion_score: number | null;
  /** 사용된 전략 */
  strategy_used: string | null;
  /** 생성 시각 */
  created_at: string;
}

/** 리트리버 옵션 */
export interface RetrieverOptions {
  /** 유사도 임계값 (기본: 0.5) */
  threshold?: number;
  /** 반환할 최대 결과 수 (기본: 5) */
  topK?: number;
  /** 🆕 ACE v4: 짧은 쿼리 보강용 세션 주제 */
  sessionTheme?: string;
}

/**
 * 현재 메시지와 유사한 과거 상담 기억 검색
 * @param supabase Supabase 클라이언트
 * @param userId 사용자 ID
 * @param query 검색할 텍스트 (현재 메시지)
 * @param options 검색 옵션
 * @returns 유사한 과거 기억 목록 (유사도 내림차순)
 */
export async function retrieveMemories(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  options: RetrieverOptions = {}
): Promise<MemoryMatch[]> {
  const threshold = options.threshold ?? RAG_SIMILARITY_THRESHOLD;
  const topK = options.topK ?? RAG_TOP_K;

  // 🆕 ACE v4: 짧은 쿼리 보강 — 세션 주제와 합쳐서 검색
  let enrichedQuery = query;
  if (query.trim().length < 15 && options.sessionTheme) {
    enrichedQuery = `${options.sessionTheme} ${query}`;
  }

  // 쿼리 텍스트 임베딩 생성
  const embeddingResult = await embedText(enrichedQuery);
  if (!embeddingResult) {
    // 10자 미만 쿼리 → 빈 결과 반환
    return [];
  }

  // Supabase RPC 호출: match_past_memories
  // SQL 함수 시그니처:
  //   match_past_memories(query_embedding vector, user_id uuid, match_threshold float, match_count int)
  const { data, error } = await supabase.rpc('match_past_memories', {
    query_embedding: embeddingResult.embedding,
    p_user_id: userId,
    match_threshold: threshold,
    match_count: topK,
  });

  if (error) {
    console.error('[Memory:RAG] ❌ match_past_memories RPC 실패:', error.message);
    return [];
  }

  const results = (data as MemoryMatch[]) ?? [];
  if (results.length > 0) {
    console.log(`[Memory:RAG] 🔍 회상 ${results.length}건 (threshold=${threshold}, topK=${topK}): ${results.map(r => `"${r.content.slice(0, 30)}"(${r.similarity.toFixed(2)})`).join(' | ')}`);
  } else {
    console.log(`[Memory:RAG] 🔍 회상 0건 (threshold=${threshold}, query="${enrichedQuery.slice(0, 30)}")`);
  }
  return results;
}

/**
 * RAG 검색 결과를 프롬프트용 텍스트로 포맷팅
 * @param memories 검색된 기억 목록
 * @returns 프롬프트에 삽입할 컨텍스트 문자열
 */
export function formatMemoriesAsContext(memories: MemoryMatch[]): string {
  if (!memories || memories.length === 0) {
    return '';
  }

  const lines = memories.map((m, idx) => {
    const emotionInfo = m.emotion_score !== null
      ? ` (감정점수: ${m.emotion_score})`
      : '';
    const strategyInfo = m.strategy_used
      ? ` [${m.strategy_used}]`
      : '';
    return `${idx + 1}. ${m.content}${emotionInfo}${strategyInfo}`;
  });

  return lines.join('\n');
}
