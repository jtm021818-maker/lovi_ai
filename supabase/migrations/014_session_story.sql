-- 🆕 v30: 세션 스토리 컬럼 추가
-- 대화 흐름 비트를 턴 간 누적 저장하여 AI가 이전 턴 맥락을 유지
ALTER TABLE counseling_sessions
  ADD COLUMN IF NOT EXISTS session_story jsonb DEFAULT NULL;

COMMENT ON COLUMN counseling_sessions.session_story IS '세션 스토리 상태 (대화 흐름 비트 누적, HLRE SessionStoryState)';
