-- ============================================================
-- 012_fix_schema_gaps.sql
-- 코드-DB 스키마 불일치 통합 수정 (C1, H1, H3, M4)
-- ============================================================

-- =============================================
-- C1: sender_type CHECK 수정 — 'event' 허용
-- =============================================
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_sender_type_check 
  CHECK (sender_type IN ('user', 'ai', 'event'));

-- =============================================
-- H1: counseling_sessions 누락 컬럼 추가
-- =============================================
ALTER TABLE counseling_sessions ADD COLUMN IF NOT EXISTS session_metadata JSONB DEFAULT '{}';
ALTER TABLE counseling_sessions ADD COLUMN IF NOT EXISTS turn_count INTEGER DEFAULT 0;
ALTER TABLE counseling_sessions ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;
ALTER TABLE counseling_sessions ADD COLUMN IF NOT EXISTS last_message_preview TEXT;
ALTER TABLE counseling_sessions ADD COLUMN IF NOT EXISTS homework_data JSONB;
ALTER TABLE counseling_sessions ADD COLUMN IF NOT EXISTS emotion_start REAL;
ALTER TABLE counseling_sessions ADD COLUMN IF NOT EXISTS emotion_end REAL;
ALTER TABLE counseling_sessions ADD COLUMN IF NOT EXISTS last_prompt_style TEXT;
ALTER TABLE counseling_sessions ADD COLUMN IF NOT EXISTS emotion_history JSONB DEFAULT '[]';
ALTER TABLE counseling_sessions ADD COLUMN IF NOT EXISTS emotion_accumulator JSONB;
ALTER TABLE counseling_sessions ADD COLUMN IF NOT EXISTS confirmed_emotion_score REAL;
ALTER TABLE counseling_sessions ADD COLUMN IF NOT EXISTS diagnostic_axes JSONB DEFAULT '{}';
ALTER TABLE counseling_sessions ADD COLUMN IF NOT EXISTS last_event_turn INTEGER DEFAULT 0;
ALTER TABLE counseling_sessions ADD COLUMN IF NOT EXISTS phase_start_turn INTEGER DEFAULT 0;
ALTER TABLE counseling_sessions ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- =============================================
-- H3: strategy_logs에 response_type 컬럼 추가
-- =============================================
ALTER TABLE strategy_logs ADD COLUMN IF NOT EXISTS response_type TEXT;

-- =============================================
-- M4: rag_chunks emotion_score 타입 수정 (테이블 존재 시에만)
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rag_chunks') THEN
    ALTER TABLE rag_chunks ALTER COLUMN emotion_score TYPE REAL USING emotion_score::REAL;
  END IF;
END $$;

-- =============================================
-- H2: reinforceMemory Race Condition 방지 RPC
-- =============================================
CREATE OR REPLACE FUNCTION reinforce_memory(
  p_memory_id UUID,
  p_retention_boost REAL DEFAULT 0.1
)
RETURNS VOID AS $$
BEGIN
  UPDATE user_memories
  SET 
    access_count = access_count + 1,
    retention_score = LEAST(1.0, retention_score + p_retention_boost),
    last_accessed = NOW()
  WHERE id = p_memory_id;
END;
$$ LANGUAGE plpgsql;
