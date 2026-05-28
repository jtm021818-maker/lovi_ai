-- v120 루나의 생각 노트 (2026-05-28)
--
-- 배경:
--   v117/v119 의 "우리 사이 도감 (RelationshipDex)" 가 v110 추억 시스템과
--   기능·시각 중복 → 도감 UI 제거하고, 그 자리에 "루나가 너를 어떻게
--   생각하는지 + 어떤 별명을 고민 중인지" 가 매 세션 종료마다 갱신되는
--   "생각 노트" 패널을 둔다.
--
-- 변경:
--   1. user_profiles 에 luna_impression_state JSONB 컬럼 추가
--   2. luna_nickname_state 에 use_context_tags TEXT[] + use_context_hint TEXT 추가
--      (별명 사용 맥락 — 어떤 순간에만 부르고 싶은지)
--   3. luna_nickname_state 에 last_session_id UUID 추가
--      (최근 사용된 세션 추적 — 사용 빈도 분석용)
--
-- 안전성:
--   - ADD COLUMN IF NOT EXISTS 만 — 기존 데이터 무손실
--   - 기본값 '{}' / '{}' / NULL — UI 가 빈 상태 처리
--   - 롤백: DROP COLUMN luna_impression_state, use_context_tags, use_context_hint

-- ============================================================
-- 1. user_profiles.luna_impression_state
-- ============================================================
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS luna_impression_state JSONB
    NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.user_profiles.luna_impression_state IS
  'v120 루나의 생각 노트 — 매 세션 종료마다 갱신되는 인지 상태.
   shape: {
     impression_text: string,         -- 80~180자, "지금 너를 이렇게 봐"
     impression_facets: string[],     -- ["일에 지친", "강한 척하지만 여린"], UI 칩
     updated_at: ISO timestamp,
     session_count_at_update: number,
     pondering: {
       is_pondering: boolean,
       candidates: [{ name: string, reason: string, maturity: 0~1 }],
       why_now: string                -- "최근 새벽 대화에서..."
     }
   }';

-- ============================================================
-- 2. luna_nickname_state 확장 — 사용 맥락 가이드
-- ============================================================
ALTER TABLE public.luna_nickname_state
  ADD COLUMN IF NOT EXISTS use_context_tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS use_context_hint TEXT,
  ADD COLUMN IF NOT EXISTS last_session_id UUID;

COMMENT ON COLUMN public.luna_nickname_state.use_context_tags IS
  'v120 별명을 부르고 싶은 맥락 태그. 예: ["late_night", "vulnerable_moment", "playful_banter"]';
COMMENT ON COLUMN public.luna_nickname_state.use_context_hint IS
  'v120 LLM 프롬프트에 그대로 주입할 한 줄 가이드. 예: "네가 약해질 때 위로용으로만"';
COMMENT ON COLUMN public.luna_nickname_state.last_session_id IS
  'v120 가장 최근에 이 별명이 사용된 세션 (빈도 분석용)';

-- ============================================================
-- 3. 사용 빈도 카운트 RPC — 매 응답마다 호출
-- ============================================================
CREATE OR REPLACE FUNCTION public.bump_nickname_usage(
  p_user_id    UUID,
  p_nickname   TEXT
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
    AND nickname = p_nickname
    AND status <> 'rejected';
END;
$$;

GRANT EXECUTE ON FUNCTION public.bump_nickname_usage(UUID, TEXT)
  TO authenticated;
