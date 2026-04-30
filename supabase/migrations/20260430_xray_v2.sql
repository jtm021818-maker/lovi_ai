-- ─────────────────────────────────────────────────────────────────────────
-- xray_analyses (v2): persist 카톡 엑스레이 분석 결과
-- Plan: docs/xray-v2-pro-plan.md §6
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS xray_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 입력
  image_storage_key TEXT,
  image_width INTEGER NOT NULL,
  image_height INTEGER NOT NULL,

  -- 결과 (JSONB) — XRayResultV2 전체
  result JSONB NOT NULL,

  -- 메타
  model_used TEXT NOT NULL,
  latency_ms INTEGER,
  schema_version SMALLINT NOT NULL DEFAULT 2
);

CREATE INDEX IF NOT EXISTS xray_analyses_user_idx
  ON xray_analyses (user_id, created_at DESC);

ALTER TABLE xray_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users see own xray" ON xray_analyses;
CREATE POLICY "users see own xray" ON xray_analyses
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users insert own xray" ON xray_analyses;
CREATE POLICY "users insert own xray" ON xray_analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);
