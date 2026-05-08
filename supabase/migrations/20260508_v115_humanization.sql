-- v115 Humanization — 시공간 + 애칭 진화 + 회상 강화
-- 2026-05-08
--
-- 핵심 원칙: 코드는 신호 저장만. LLM이 활용 여부/방식 결정.

-- ============================================================
-- 1. luna_nickname_state — 루나가 유저에게 시도한 애칭 이력
-- ============================================================
CREATE TABLE IF NOT EXISTS public.luna_nickname_state (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname        TEXT NOT NULL CHECK (char_length(nickname) BETWEEN 1 AND 30),
  origin_session_id UUID REFERENCES public.counseling_sessions(id) ON DELETE SET NULL,
  origin_context  TEXT,
  use_count       INT NOT NULL DEFAULT 1 CHECK (use_count >= 0),
  last_used_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_reaction   TEXT CHECK (user_reaction IN ('accepted', 'neutral', 'rejected')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_nickname UNIQUE (user_id, nickname)
);

CREATE INDEX IF NOT EXISTS idx_nickname_user_recent
  ON public.luna_nickname_state(user_id, last_used_at DESC);

-- 사용자별 RLS
ALTER TABLE public.luna_nickname_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nickname_select_own ON public.luna_nickname_state;
CREATE POLICY nickname_select_own ON public.luna_nickname_state
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS nickname_insert_own ON public.luna_nickname_state;
CREATE POLICY nickname_insert_own ON public.luna_nickname_state
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS nickname_update_own ON public.luna_nickname_state;
CREATE POLICY nickname_update_own ON public.luna_nickname_state
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS nickname_delete_own ON public.luna_nickname_state;
CREATE POLICY nickname_delete_own ON public.luna_nickname_state
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 2. counseling_sessions 확장 — 시공간 컨텍스트 기록
-- ============================================================
ALTER TABLE public.counseling_sessions
  ADD COLUMN IF NOT EXISTS time_band TEXT,
  ADD COLUMN IF NOT EXISTS weather_context JSONB;

COMMENT ON COLUMN public.counseling_sessions.time_band IS
  'v115: 세션 시작 시점의 시간대 라벨 (심야/새벽/이른 아침/오전/점심/오후/저녁/밤)';
COMMENT ON COLUMN public.counseling_sessions.weather_context IS
  'v115: { condition, description, tempC, feelsLikeC } — 날씨 스냅샷';

-- ============================================================
-- 3. RPC: bump_nickname_usage — 본문 자연 사용 시 카운트 증가
-- ============================================================
CREATE OR REPLACE FUNCTION public.bump_nickname_usage(
  p_user_id UUID,
  p_nickname TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.luna_nickname_state
  SET use_count = use_count + 1,
      last_used_at = NOW()
  WHERE user_id = p_user_id
    AND nickname = p_nickname;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bump_nickname_usage(UUID, TEXT) TO authenticated;
