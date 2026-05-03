/**
 * v110 임베더 — 기존 lib/rag/ingestor.ts:embedText 의 thin wrapper.
 * - 768d (gemini-embedding-001) 유지
 * - 차원 검증 + null 안전 + 짧은 입력 보호
 * - v111 에서 KURE-v1 (1024d) 검토 시 이 모듈만 교체
 */

import { embedText } from '@/lib/rag/ingestor';

export const EMBEDDING_DIM = 768 as const;

export interface EmbedResult {
  embedding: number[];
  text: string;
  dim: number;
}

/**
 * 텍스트를 768d 벡터로 변환. 실패 시 null.
 * 빈/너무 짧은 입력은 즉시 null (임베딩 호출 비용 절약).
 */
export async function embed(text: string): Promise<EmbedResult | null> {
  const cleaned = (text || '').trim();
  if (cleaned.length < 4) return null;

  const result = await embedText(cleaned);
  if (!result) return null;

  if (result.embedding.length !== EMBEDDING_DIM) {
    console.warn(
      `[memory-v2/embedder] dim mismatch: got ${result.embedding.length}, expected ${EMBEDDING_DIM}`
    );
    return null;
  }

  return {
    embedding: result.embedding,
    text: result.text,
    dim: EMBEDDING_DIM,
  };
}

/** 배치 임베딩 — 직렬 (Gemini 무료 티어 RPM 보호) */
export async function embedMany(texts: string[]): Promise<(EmbedResult | null)[]> {
  const out: (EmbedResult | null)[] = [];
  for (const t of texts) {
    out.push(await embed(t));
  }
  return out;
}
