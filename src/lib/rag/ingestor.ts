/**
 * RAG 인제스터
 * 사용자 메시지를 임베딩으로 변환하여 message_memories 테이블에 저장
 * - v62: gemini-embedding-001 사용 (outputDimensionality=768 로 DB 호환)
 * - text-embedding-004 deprecated 처리됨 (404 NOT_FOUND)
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
 * 🆕 v25: 선택적 임베딩 — 실질적 내용이 있는 메시지만 임베딩
 * 잡음("ㅇㅇ", "ㅋㅋ", "next" 등)을 걸러서 RAG 품질 향상
 */
export function shouldEmbed(content: string): boolean {
  const trimmed = content.trim();
  // 20자 미만은 대부분 잡음
  if (trimmed.length < 20) return false;
  // 단순 반응/이모지만 있으면 스킵
  if (/^[ㅋㅎㅠㅜㅇㄴㄱㄷ\s.!?~]+$/.test(trimmed)) return false;
  if (/^(ㅇㅇ|ㄴㄴ|ㅋㅋ|ㅎㅎ|ㅠㅠ|next|네|응|아니|몰라|그래|ok|ㄱㄱ)$/i.test(trimmed)) return false;
  // 감정/상황 키워드가 있으면 우선 임베딩
  const hasSubstance = /힘들|좋아|싫어|고민|걱정|무서|슬프|화나|불안|서운|외로|재회|이별|바람|읽씹|짝사랑|여친|남친|상대|관계|사랑|그리워|보고싶/.test(trimmed);
  if (hasSubstance) return true;
  // 나머지는 30자 이상이면 임베딩
  return trimmed.length >= 30;
}

/**
 * 메시지를 임베딩으로 변환 후 message_memories에 저장
 * fire-and-forget 패턴으로 사용 권장 (await 없이 호출)
 */
export async function ingestMessage(params: IngestMessageParams): Promise<void> {
  const { supabase, userId, sessionId, content, emotionScore, strategyUsed } = params;

  // 🆕 v25: 선택적 임베딩 필터
  if (!shouldEmbed(content)) {
    return;
  }

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
    console.error('[Memory:UserEmbed] ❌ message_memories 저장 실패:', error.message);
  } else {
    console.log(`[Memory:UserEmbed] 💾 유저 메시지 저장 (${result.text.length}자, emotion=${emotionScore ?? 'N/A'})`);
  }
}

/**
 * 🆕 v70: AI 응답 임베딩 — 루나가 자기 말 기억할 수 있게
 * 유저 메시지와 동일하게 message_memories 에 저장 (sender_type='ai')
 * 기본 OFF (LUNA_AI_EMBED_V70=0 으로 끌 수 있음, 기본 1)
 */
export async function ingestAiResponse(params: {
  supabase: SupabaseClient;
  userId: string;
  sessionId: string;
  content: string;
  strategyUsed?: string;
}): Promise<void> {
  if (process.env.LUNA_AI_EMBED_V70 === '0') {
    console.log('[Memory:AIEmbed] ⏸️ 비활성 (LUNA_AI_EMBED_V70=0)');
    return;
  }

  const { supabase, userId, sessionId, content, strategyUsed } = params;

  // 필터: 최소 길이 + 의미 있는 내용
  const cleaned = content
    .replace(/\[SITUATION_READ:[^\]]*\]/gi, '')
    .replace(/\[LUNA_THOUGHT:[^\]]*\]/gi, '')
    .replace(/\[PHASE_SIGNAL:[^\]]*\]/gi, '')
    .replace(/\[SITUATION_CLEAR:[^\]]*\]/gi, '')
    .replace(/\[LEFT_BRAIN_HINT:[^\]]*\]/gi, '')
    .replace(/\[STICKER:[^\]]*\]/gi, '')
    .replace(/\|\|\|/g, ' ')
    .trim();

  if (!shouldEmbed(cleaned)) {
    console.log(`[Memory:AIEmbed] 🚫 임베딩 스킵 (${cleaned.length}자, 잡음)`);
    return;
  }

  const result = await embedText(cleaned);
  if (!result) {
    console.log('[Memory:AIEmbed] 🚫 embedText null');
    return;
  }

  // 🆕 v70: sender_type='ai' 로 저장. 컬럼이 없으면 무시 (fallback).
  //        마이그레이션 적용 전이어도 깨지지 않게 try/catch.
  try {
    const { error } = await supabase.from('message_memories').insert({
      user_id: userId,
      session_id: sessionId,
      content: result.text,
      embedding: result.embedding,
      strategy_used: strategyUsed ?? null,
      sender_type: 'ai',
    } as any);

    if (error) {
      // sender_type 컬럼 없으면 한 번 더 시도 (마이그레이션 아직 안 됐을 때)
      if (error.message?.includes('sender_type')) {
        console.warn('[Memory:AIEmbed] ⚠️ sender_type 컬럼 없음 → 마이그레이션 필요. fallback insert.');
        const { error: fallbackErr } = await supabase.from('message_memories').insert({
          user_id: userId,
          session_id: sessionId,
          content: result.text,
          embedding: result.embedding,
          strategy_used: strategyUsed ?? null,
        });
        if (fallbackErr) {
          console.warn('[Memory:AIEmbed] ❌ fallback 저장도 실패:', fallbackErr.message);
        } else {
          console.log(`[Memory:AIEmbed] 💾 fallback 저장 (${result.text.length}자, sender_type 없이)`);
        }
      } else {
        console.warn('[Memory:AIEmbed] ❌ 저장 실패:', error.message);
      }
    } else {
      console.log(`[Memory:AIEmbed] 💾 루나 응답 저장 (${result.text.length}자): "${result.text.slice(0, 60)}..."`);
    }
  } catch (e: any) {
    console.warn('[Memory:AIEmbed] ❌ 예외:', e?.message);
  }
}
