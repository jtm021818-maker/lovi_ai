-- ============================================
-- 선택지 피드백 루프 — 선택 패턴 추적
-- ============================================

-- messages 테이블에 선택지 메타 컬럼 추가
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS is_from_suggestion BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suggestion_category TEXT,
  ADD COLUMN IF NOT EXISTS suggestion_strategy_hint TEXT;

-- 선택 패턴 분석용 인덱스
CREATE INDEX IF NOT EXISTS idx_messages_suggestion
  ON messages (user_id, is_from_suggestion)
  WHERE is_from_suggestion = TRUE;

-- 선택 패턴 집계 뷰 (분석용)
CREATE OR REPLACE VIEW suggestion_patterns AS
SELECT
  user_id,
  suggestion_category,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY user_id) as percentage
FROM messages
WHERE is_from_suggestion = TRUE
  AND suggestion_category IS NOT NULL
GROUP BY user_id, suggestion_category;
