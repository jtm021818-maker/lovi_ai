-- ============================================================
-- 013_rate_limit_db_check.sql
-- C1: Rate Limit을 DB 기반으로 전환 (Serverless 환경 호환)
-- 인메모리 Map은 Vercel Serverless에서 요청간 공유 불가
-- ============================================================

-- Atomic check + increment RPC 함수
-- 한 번의 호출로 카운터 증가 + 허용 여부 반환
CREATE OR REPLACE FUNCTION check_and_increment_rate_limit(
  p_user_id UUID,
  p_date DATE,
  p_max_requests INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO user_rate_limits (user_id, date, request_count)
  VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET request_count = user_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN jsonb_build_object(
    'allowed', v_count <= p_max_requests,
    'remaining', GREATEST(0, p_max_requests - v_count),
    'count', v_count
  );
END;
$$;
