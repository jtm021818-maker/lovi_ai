-- ============================================================
-- MEDIUM 이슈 DB 마이그레이션
-- 1) user_profiles에 is_premium 컬럼 추가
-- 2) user_rate_limits 테이블 생성 (Rate Limit 영속화)
-- 3) 카운터 증가 RPC 함수
-- ============================================================

-- 1. Premium 여부 컬럼
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;

-- 2. Rate Limit 영속화 테이블
CREATE TABLE IF NOT EXISTS user_rate_limits (
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  request_count INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

ALTER TABLE user_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_data" ON user_rate_limits FOR ALL USING (auth.uid() = user_id);

-- 3. 카운터 증가 RPC 함수
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_user_id UUID,
  p_date DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_rate_limits (user_id, date, request_count)
  VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET request_count = user_rate_limits.request_count + 1;
END;
$$;
