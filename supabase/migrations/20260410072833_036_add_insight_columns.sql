-- 🆕 v36: 루나 상태 인식 및 속마음 히스토리 저장 컬럼 추가
ALTER TABLE counseling_sessions
  ADD COLUMN IF NOT EXISTS situation_read text,
  ADD COLUMN IF NOT EXISTS luna_thought_history jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS situation_read_history jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN counseling_sessions.situation_read IS 'AI가 판단한 현재 유저의 상황 핵심 요약';
COMMENT ON COLUMN counseling_sessions.luna_thought_history IS '루나의 속마음 로그 배열 (타임라인 UI용)';
COMMENT ON COLUMN counseling_sessions.situation_read_history IS '루나의 상황 인식 변화 히스토리 (타임라인 UI용)';