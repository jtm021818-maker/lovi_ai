-- ==========================================================================
-- 🎭 v81: BRIDGE 몰입 모드 시스템
-- ==========================================================================
-- 1. counseling_sessions 확장: 활성 모드 추적
-- 2. message_drafts 신규: DRAFT_WORKSHOP 확정 초안 영구 저장

-- ── Session 모드 상태 필드 ────────────────────────────────────────────
ALTER TABLE counseling_sessions
  ADD COLUMN IF NOT EXISTS active_mode TEXT,
  ADD COLUMN IF NOT EXISTS mode_state JSONB,
  ADD COLUMN IF NOT EXISTS mode_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mode_history JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN counseling_sessions.active_mode IS
  'v81: 활성 BRIDGE 몰입 모드 (roleplay|draft|panel|tone|idea). NULL 이면 일반 채팅';
COMMENT ON COLUMN counseling_sessions.mode_state IS
  'v81: 현재 모드 세부 상태 (Zustand snapshot). 재진입 복구용';
COMMENT ON COLUMN counseling_sessions.mode_started_at IS
  'v81: 모드 진입 시각 — 60분 자동 종료 체크';
COMMENT ON COLUMN counseling_sessions.mode_history IS
  'v81: 완료된 모드 기록 (최근 20개). [{mode, summary, completedAt}, ...]';

CREATE INDEX IF NOT EXISTS idx_sessions_active_mode
  ON counseling_sessions(active_mode)
  WHERE active_mode IS NOT NULL;

-- ── 메시지 초안 보관함 ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES counseling_sessions(id) ON DELETE SET NULL,

  -- 초안 내용
  tone TEXT NOT NULL CHECK (tone IN ('soft', 'honest', 'firm', 'custom')),
  content TEXT NOT NULL,
  context TEXT,                       -- 이 초안이 만들어진 배경 한 줄

  -- 메타
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,                -- 유저가 "실제로 보냈다" 표시하면 채워짐
  metadata JSONB DEFAULT '{}'::jsonb  -- 추가 컨텍스트 (intent, recipient 등)
);

CREATE INDEX IF NOT EXISTS idx_message_drafts_user
  ON message_drafts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_drafts_session
  ON message_drafts(session_id)
  WHERE session_id IS NOT NULL;

-- RLS
ALTER TABLE message_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own drafts"
  ON message_drafts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own drafts"
  ON message_drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own drafts"
  ON message_drafts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users delete own drafts"
  ON message_drafts FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE message_drafts IS
  'v81: DRAFT_WORKSHOP 에서 확정된 초안 영구 저장. "내 초안함" 에서 재열람.';
