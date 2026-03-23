-- 005: 페르소나 모드
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS persona_mode TEXT DEFAULT 'counselor';

COMMENT ON COLUMN user_profiles.persona_mode IS '대화 페르소나 모드: counselor(상담사), friend(친구), panel(전문가 패널)';
