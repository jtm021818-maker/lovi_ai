-- 🆕 v9: 시나리오 고정 (Sticky Scenario)
-- 
-- 세션에서 처음 감지된 시나리오를 잠금하여,
-- 이후 턴에서 LLM이 다른 시나리오로 재감지해도 무시하고 고정.
-- 사용자가 UI에서 직접 변경할 때만 업데이트.

ALTER TABLE counseling_sessions
  ADD COLUMN IF NOT EXISTS locked_scenario TEXT DEFAULT NULL;

COMMENT ON COLUMN counseling_sessions.locked_scenario IS '세션 최초 감지 시나리오 잠금. GENERAL 외 시나리오가 처음 감지되면 저장, 이후 변경 불가 (사용자 수동 변경만 허용)';
