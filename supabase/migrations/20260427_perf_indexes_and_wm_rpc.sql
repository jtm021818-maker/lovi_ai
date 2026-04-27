-- 🆕 v90 Perf: DB 인덱스 + WM atomic RPC 재보장
-- 1) messages / strategy_logs 핫패스 인덱스 추가 — 매 턴 SELECT 가속
-- 2) 20260417_wm_atomic_v73.sql 의 RPC 가 일부 환경에 미배포 → 재실행 (idempotent)

-- ============================================================
-- 1. 핫패스 인덱스
-- ============================================================

-- messages: session 별 최신 N개 (route.ts msgsDbPromise)
CREATE INDEX IF NOT EXISTS idx_messages_session_created
  ON messages (session_id, created_at DESC);

-- messages: user_id + sender_type 필터 (RAG / context)
CREATE INDEX IF NOT EXISTS idx_messages_session_sender
  ON messages (session_id, sender_type, created_at DESC);

-- strategy_logs: session 별 최신 N개 (route.ts strategyDbPromise)
CREATE INDEX IF NOT EXISTS idx_strategy_logs_session_created
  ON strategy_logs (session_id, created_at DESC);

-- emotion_logs: session 별 (post-processing)
-- 주의: 이 테이블은 `created_at` 이 아닌 `logged_at` 컬럼을 사용 (001_initial_schema.sql 참조)
CREATE INDEX IF NOT EXISTS idx_emotion_logs_session_logged
  ON emotion_logs (session_id, logged_at DESC);

-- ============================================================
-- 2. Working Memory atomic RPC 재보장
--    20260417_wm_atomic_v73.sql 가 일부 환경에 미적용된 케이스 방어.
--    CREATE OR REPLACE 라 안전하게 재실행 가능.
-- ============================================================

CREATE OR REPLACE FUNCTION wm_patch_scratchpad(
  p_session_id UUID,
  p_patch JSONB,
  p_min_turn_idx INT DEFAULT 0
) RETURNS BOOLEAN
LANGUAGE plpgsql AS $$
DECLARE
  current_turn INT;
BEGIN
  SELECT COALESCE(
    (session_metadata -> 'working_memory' ->> 'turn_idx')::INT,
    -1
  )
  INTO current_turn
  FROM counseling_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF current_turn > p_min_turn_idx THEN
    RAISE NOTICE 'wm_patch_scratchpad skip: DB turn=% >= patch turn=%', current_turn, p_min_turn_idx;
    RETURN FALSE;
  END IF;

  UPDATE counseling_sessions
  SET session_metadata = jsonb_set(
    COALESCE(session_metadata, '{}'::jsonb),
    '{working_memory}',
    p_patch,
    true
  )
  WHERE id = p_session_id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION session_meta_merge(
  p_session_id UUID,
  p_patch JSONB
) RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE counseling_sessions
  SET session_metadata = COALESCE(session_metadata, '{}'::jsonb) || p_patch
  WHERE id = p_session_id;
END;
$$;
