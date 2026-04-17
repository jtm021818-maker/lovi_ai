-- 🆕 v73: Working Memory atomic patch RPC
-- 세션 session_metadata.working_memory 키만 atomic update (전체 덮어쓰기 경합 방지)
-- 단조성 가드: DB 의 turn_idx 가 더 크면 skip

CREATE OR REPLACE FUNCTION wm_patch_scratchpad(
  p_session_id UUID,
  p_patch JSONB,
  p_min_turn_idx INT DEFAULT 0
) RETURNS BOOLEAN
LANGUAGE plpgsql AS $$
DECLARE
  current_turn INT;
BEGIN
  -- 현재 DB 의 working_memory.turn_idx 조회 (없으면 -1)
  SELECT COALESCE(
    (session_metadata -> 'working_memory' ->> 'turn_idx')::INT,
    -1
  )
  INTO current_turn
  FROM counseling_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  -- 더 최신 WM 이 이미 저장돼 있으면 skip (역행 방지)
  IF current_turn > p_min_turn_idx THEN
    RAISE NOTICE 'wm_patch_scratchpad skip: DB turn=% >= patch turn=%', current_turn, p_min_turn_idx;
    RETURN FALSE;
  END IF;

  -- working_memory 키만 atomic update
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

-- session_metadata 다른 필드 atomic merge (전체 덮어쓰기 대체)
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
