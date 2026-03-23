-- ============================================================
-- 임베딩 차원 변경: 1536 → 768 (OpenAI → Gemini Embedding)
-- ============================================================
-- 주의: 기존 임베딩 데이터는 차원이 다르므로 삭제 후 재생성 필요
-- 실행 전 반드시 백업하세요!

-- 1. 기존 임베딩 데이터 삭제 (차원 불일치)
UPDATE message_memories SET embedding = NULL;

-- 2. 임베딩 컬럼 차원 변경 (1536 → 768)
ALTER TABLE message_memories
  ALTER COLUMN embedding TYPE vector(768);

-- 3. HNSW 인덱스 재생성 (768 차원)
DROP INDEX IF EXISTS idx_message_memories_embedding;
CREATE INDEX idx_message_memories_embedding
  ON message_memories
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 4. match_past_memories 함수 업데이트 (768 차원)
CREATE OR REPLACE FUNCTION match_past_memories(
  query_embedding vector(768),
  p_user_id uuid,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float,
  emotion_score int,
  strategy_used text,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mm.id,
    mm.content,
    1 - (mm.embedding <=> query_embedding) AS similarity,
    mm.emotion_score,
    mm.strategy_used,
    mm.created_at
  FROM message_memories mm
  WHERE mm.user_id = p_user_id
    AND mm.embedding IS NOT NULL
    AND 1 - (mm.embedding <=> query_embedding) > match_threshold
  ORDER BY mm.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
