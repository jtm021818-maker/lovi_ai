-- 🆕 v8: 5구간 이벤트 기반 턴 시스템 지원 컬럼 추가
ALTER TABLE counseling_sessions 
  ADD COLUMN IF NOT EXISTS current_phase_v2 text DEFAULT 'HOOK',
  ADD COLUMN IF NOT EXISTS completed_events jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS emotion_baseline real DEFAULT NULL;

COMMENT ON COLUMN counseling_sessions.current_phase_v2 IS '현재 Phase (HOOK/MIRROR/BRIDGE/SOLVE/EMPOWER)';
COMMENT ON COLUMN counseling_sessions.completed_events IS '완료된 이벤트 목록 (PhaseEventType[])';
COMMENT ON COLUMN counseling_sessions.emotion_baseline IS '감정 기준선 (HOOK 구간에서 설정)';
