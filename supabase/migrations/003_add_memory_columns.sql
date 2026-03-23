-- ============================================================
-- message_memories에 emotion_score, strategy_used 컬럼 추가
-- ingestor.ts와 match_past_memories RPC가 참조하는 필드
-- ============================================================

ALTER TABLE message_memories
  ADD COLUMN IF NOT EXISTS emotion_score INTEGER,
  ADD COLUMN IF NOT EXISTS strategy_used TEXT;
