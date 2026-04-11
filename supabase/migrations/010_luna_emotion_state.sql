-- 010: HLRE v2 — 루나 감정 상태 저장
-- counseling_sessions에 루나 감정 상태 JSONB 컬럼 추가
-- 세션 간 루나 감정 연속성 유지 (다음 세션 시작 시 이전 감정 이어받기)

ALTER TABLE counseling_sessions
  ADD COLUMN IF NOT EXISTS luna_emotion_state jsonb DEFAULT NULL;

-- user_profiles에도 마지막 루나 감정 저장 (교차 세션용)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS luna_last_emotion jsonb DEFAULT NULL;

COMMENT ON COLUMN counseling_sessions.luna_emotion_state IS 'HLRE v2: 루나 PAD 감정 상태 (세션 내 연속성)';
COMMENT ON COLUMN user_profiles.luna_last_emotion IS 'HLRE v2: 마지막 세션 종료 시 루나 감정 (교차 세션 연속성)';
