-- v117 관계 시스템 풀 리디자인 — 신규 3개 테이블
-- 2026-05-13
--
-- 계획서: docs/v117-relationship-redesign-plan.md
-- 원칙: 기존 user_profiles.user_model.intimacy JSON 은 그대로. 엔진도 그대로.
--       이 마이그레이션은 "기억 카드 / 데일리 일기 / 소프트 게이트" 3개 신규 테이블만 추가.

-- ============================================================
-- 1. relationship_memories — 마일스톤 기억 카드 (폴라로이드 앨범)
--    5슬롯. 레벨업 시 1슬롯씩 잠금 해제.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.relationship_memories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona       TEXT NOT NULL DEFAULT 'luna' CHECK (persona IN ('luna', 'tarot')),
  slot_index    INT  NOT NULL CHECK (slot_index BETWEEN 1 AND 5),
  level         INT  NOT NULL CHECK (level BETWEEN 1 AND 5),
  trigger_type  TEXT NOT NULL,            -- 'first_meet' | 'first_secret' | 'first_tears' | 'first_nickname' | 'eternal_promise'
  llm_caption   TEXT NOT NULL,            -- LLM 생성 손글씨 1~2줄 캡션
  source_summary TEXT,                    -- 그 시점 채팅 요약 (옵션)
  unlocked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_persona_slot UNIQUE (user_id, persona, slot_index)
);

CREATE INDEX IF NOT EXISTS idx_relmem_user
  ON public.relationship_memories(user_id, persona, slot_index);

ALTER TABLE public.relationship_memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS relmem_select_own ON public.relationship_memories;
CREATE POLICY relmem_select_own ON public.relationship_memories
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS relmem_insert_own ON public.relationship_memories;
CREATE POLICY relmem_insert_own ON public.relationship_memories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS relmem_update_own ON public.relationship_memories;
CREATE POLICY relmem_update_own ON public.relationship_memories
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS relmem_delete_own ON public.relationship_memories;
CREATE POLICY relmem_delete_own ON public.relationship_memories
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 2. relationship_daily_logs — 매일 자정 자동 생성 1줄 일기
-- ============================================================
CREATE TABLE IF NOT EXISTS public.relationship_daily_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona       TEXT NOT NULL DEFAULT 'luna' CHECK (persona IN ('luna', 'tarot')),
  log_date      DATE NOT NULL,
  content       TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_persona_date UNIQUE (user_id, persona, log_date)
);

CREATE INDEX IF NOT EXISTS idx_reldaily_user_date
  ON public.relationship_daily_logs(user_id, persona, log_date DESC);

ALTER TABLE public.relationship_daily_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reldaily_select_own ON public.relationship_daily_logs;
CREATE POLICY reldaily_select_own ON public.relationship_daily_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS reldaily_insert_own ON public.relationship_daily_logs;
CREATE POLICY reldaily_insert_own ON public.relationship_daily_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. relationship_gate_state — 소프트 게이트 (Stardew bouquet 메커닉)
--    Lv3 -> Lv4 진입 전 "마음 더 열기" 의식적 탭 필요.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.relationship_gate_state (
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona          TEXT NOT NULL DEFAULT 'luna' CHECK (persona IN ('luna', 'tarot')),
  gate_level       INT  NOT NULL CHECK (gate_level BETWEEN 2 AND 5),
  opened_at        TIMESTAMPTZ,
  last_offered_at  TIMESTAMPTZ,
  PRIMARY KEY (user_id, persona, gate_level)
);

ALTER TABLE public.relationship_gate_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS relgate_select_own ON public.relationship_gate_state;
CREATE POLICY relgate_select_own ON public.relationship_gate_state
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS relgate_insert_own ON public.relationship_gate_state;
CREATE POLICY relgate_insert_own ON public.relationship_gate_state
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS relgate_update_own ON public.relationship_gate_state;
CREATE POLICY relgate_update_own ON public.relationship_gate_state
  FOR UPDATE USING (auth.uid() = user_id);
