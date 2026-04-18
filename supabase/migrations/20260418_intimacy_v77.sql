-- 🆕 v77: 친밀도 실시간 누적 시스템
-- 목적: 단순 세션카운트 기반 → 매턴 LLM 판단 기반 누적 + 시간 감쇠
-- 연구 근거: Social Penetration Theory, Knapp Relational Model, Trust Formation Research

-- 1) user_profiles 확장
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS luna_intimacy_score INT DEFAULT 8,
  ADD COLUMN IF NOT EXISTS luna_last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS luna_intimacy_history JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN user_profiles.luna_intimacy_score
  IS '누적 친밀도 점수 0-100. 매턴 좌뇌 LLM 이 판단한 delta 누적. 시간 감쇠 적용.';

COMMENT ON COLUMN user_profiles.luna_last_interaction_at
  IS '가장 최근 루나와 상호작용 시점. 재방문 시 감쇠/재회보너스 계산에 사용.';

COMMENT ON COLUMN user_profiles.luna_intimacy_history
  IS 'JSONB 배열. 매턴 intimacy delta 기록. 최근 50개 유지. 예: [{"t":"2026-04-18T12:00:00Z","delta":3,"reason":"첫 자기개방"}]';

-- 2) luna_intimacy_level 은 기존 TEXT('low'/'mid'/...) 이지만
--    v77 부터는 숫자 Lv (1~5) 와 연결된 라벨로 다시 해석.
-- 기존 row 호환: 이전 'low' 은 "아는 사이" = Lv.1 로 매핑. 코드에서 재계산 시 자동 갱신됨.

-- 3) 인덱스 (선택)
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_interaction
  ON user_profiles(luna_last_interaction_at DESC);
