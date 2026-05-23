-- v115.7 별명 시스템 하드닝 (2026-05-23)
-- 문제: v115 별명이 친밀도/추억 없이 즉시 생성됨 (예: 첫 세션에 "바보탱이")
-- 해결: 4중 게이트 + 추억 앵커 강제 + candidate→trying→accepted/rejected 3단계 상태기계

-- ============================================================
-- 1. 기존 데이터 영구 삭제 (유저 결정 — 게이트 미통과 데이터 전부 폐기)
-- ============================================================
TRUNCATE TABLE public.luna_nickname_state RESTART IDENTITY;

-- ============================================================
-- 2. 상태/앵커 컬럼 추가
-- ============================================================
ALTER TABLE public.luna_nickname_state
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate', 'trying', 'accepted', 'rejected')),
  ADD COLUMN IF NOT EXISTS anchor_episode_id UUID
    REFERENCES public.luna_episodes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS anchor_quote TEXT
    CHECK (anchor_quote IS NULL OR char_length(anchor_quote) <= 80),
  ADD COLUMN IF NOT EXISTS proposed_turn_idx INT,
  ADD COLUMN IF NOT EXISTS reaction_observed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.luna_nickname_state.status IS
  'v115.7: candidate(첫 제안 직후, 본문 미등장) → trying(루나 1회 시험 사용) → accepted(유저 긍정) / rejected(유저 거부 → 영구 봉인)';
COMMENT ON COLUMN public.luna_nickname_state.anchor_episode_id IS
  'v115.7: 별명 작명의 근거가 된 episode (필수)';
COMMENT ON COLUMN public.luna_nickname_state.anchor_quote IS
  'v115.7: 그 episode 에서 따온 짧은 인용 (~80자)';

-- ============================================================
-- 3. status 인덱스
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_nickname_user_status_recent
  ON public.luna_nickname_state(user_id, status, last_used_at DESC);

-- ============================================================
-- 4. 반응 관찰 RPC — 본문에서 별명이 다시 사용된 후 유저 반응 분석 결과 기록
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_nickname_reaction(
  p_user_id     UUID,
  p_nickname    TEXT,
  p_reaction    TEXT,   -- 'accepted' | 'rejected' | 'neutral'
  p_status      TEXT    -- 'trying' | 'accepted' | 'rejected'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_reaction NOT IN ('accepted', 'rejected', 'neutral') THEN
    RAISE EXCEPTION 'invalid reaction: %', p_reaction;
  END IF;
  IF p_status NOT IN ('candidate', 'trying', 'accepted', 'rejected') THEN
    RAISE EXCEPTION 'invalid status: %', p_status;
  END IF;

  UPDATE public.luna_nickname_state
  SET user_reaction = p_reaction,
      status = p_status,
      reaction_observed_at = NOW()
  WHERE user_id = p_user_id
    AND nickname = p_nickname;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_nickname_reaction(UUID, TEXT, TEXT, TEXT)
  TO authenticated;

-- ============================================================
-- 5. status → 'trying' 승격 RPC (candidate가 본문 첫 등장 시)
-- ============================================================
CREATE OR REPLACE FUNCTION public.promote_nickname_trying(
  p_user_id      UUID,
  p_nickname     TEXT,
  p_turn_idx     INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.luna_nickname_state
  SET status = 'trying',
      proposed_turn_idx = p_turn_idx,
      use_count = use_count + 1,
      last_used_at = NOW()
  WHERE user_id = p_user_id
    AND nickname = p_nickname
    AND status = 'candidate';
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_nickname_trying(UUID, TEXT, INT)
  TO authenticated;
