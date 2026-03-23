/**
 * RAG 인제스터
 * 사용자 메시지를 임베딩으로 변환하여 message_memories 테이블에 저장
 * - Google Gemini text-embedding-004 사용 (768 차원, 무료)
 * - 10자 미만 메시지는 임베딩 스킵
 */

import { GoogleGenAI } from '@google/genai';
import {
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
  MIN_EMBEDDING_TEXT_LENGTH,
} from '@/lib/utils/constants';
import type { SupabaseClient } from '@supabase/supabase-js';

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

/** 임베딩 결과 */
export interface EmbeddingResult {
  /** 임베딩 벡터 */
  embedding: number[];
  /** 원본 텍스트 */
  text: string;
}

/**
 * 텍스트를 임베딩 벡터로 변환 (Gemini Embedding API)
 * @param text 임베딩할 텍스트
 * @returns 임베딩 결과 또는 null (필터링된 경우)
 */
export async function embedText(text: string): Promise<EmbeddingResult | null> {
  // 10자 미만 메시지 스킵
  if (!text || text.trim().length < MIN_EMBEDDING_TEXT_LENGTH) {
    return null;
  }

  const response = await gemini.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text.trim(),
    config: {
      outputDimensionality: EMBEDDING_DIMENSIONS,
    },
  });

  const embedding = response.embeddings?.[0]?.values;
  if (!embedding) {
    throw new Error('Gemini 임베딩 응답에 벡터가 없습니다');
  }

  return { embedding, text: text.trim() };
}

/** 메모리 저장 파라미터 */
export interface IngestMessageParams {
  /** Supabase 클라이언트 */
  supabase: SupabaseClient;
  /** 사용자 ID */
  userId: string;
  /** 세션 ID */
  sessionId: string;
  /** 메시지 내용 */
  content: string;
  /** 감정 점수 (-5 ~ +5) */
  emotionScore?: number;
  /** 전략 유형 */
  strategyUsed?: string;
}

/**
 * 메시지를 임베딩으로 변환 후 message_memories에 저장
 * fire-and-forget 패턴으로 사용 권장 (await 없이 호출)
 */
export async function ingestMessage(params: IngestMessageParams): Promise<void> {
  const { supabase, userId, sessionId, content, emotionScore, strategyUsed } = params;

  // 텍스트 필터링 및 임베딩 생성
  const result = await embedText(content);
  if (!result) {
    return;
  }

  // message_memories 테이블에 저장
  const { error } = await supabase.from('message_memories').insert({
    user_id: userId,
    session_id: sessionId,
    content: result.text,
    embedding: result.embedding,
    emotion_score: emotionScore ?? null,
    strategy_used: strategyUsed ?? null,
  });

  if (error) {
    console.error('[RAG Ingestor] message_memories 저장 실패:', error.message);
  }
}
