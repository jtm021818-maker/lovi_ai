-- v110: Luna Long-term Memory System
-- 4-layer architecture: Working / Episodic / Semantic / Procedural
-- Non-destructive: existing luna_memories / message_memories preserved.
-- See docs/luna-longterm-memory-v110-plan.md

-- ============================================================
-- L1 Episodic: one row per finished session
-- ============================================================
CREATE TABLE IF NOT EXISTS luna_episodes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id        uuid REFERENCES counseling_sessions(id) ON DELETE SET NULL,
  day_number        int NOT NULL,
  title             text NOT NULL,
  summary_short     text NOT NULL,
  summary_long      text NOT NULL,
  emotion_label     text,
  emotion_scores    jsonb,
  importance        smallint NOT NULL CHECK (importance BETWEEN 1 AND 10),
  decay_strength    real NOT NULL DEFAULT 1.0 CHECK (decay_strength BETWEEN 0 AND 1),
  last_recalled_at  timestamptz,
  recall_count      int NOT NULL DEFAULT 0,
  tags              text[] NOT NULL DEFAULT '{}',
  related_people    text[] NOT NULL DEFAULT '{}',
  embedding         vector(768),
  raw_turns_ref     uuid[],
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_episodes_user_day
  ON luna_episodes(user_id, day_number DESC);
CREATE INDEX IF NOT EXISTS idx_episodes_user_imp
  ON luna_episodes(user_id, importance DESC, decay_strength DESC);
CREATE INDEX IF NOT EXISTS idx_episodes_emb_hnsw
  ON luna_episodes USING hnsw (embedding vector_cosine_ops)
  WITH (m=16, ef_construction=64);
ALTER TABLE luna_episodes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_episodes" ON luna_episodes;
CREATE POLICY "own_episodes" ON luna_episodes
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- L2 Semantic: bi-temporal user persona facts
-- ============================================================
CREATE TABLE IF NOT EXISTS luna_persona_facts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category            text NOT NULL,
  key                 text NOT NULL,
  value               text NOT NULL,
  confidence          real NOT NULL DEFAULT 0.7 CHECK (confidence BETWEEN 0 AND 1),
  source_episode_id   uuid REFERENCES luna_episodes(id) ON DELETE SET NULL,
  valid_from          timestamptz NOT NULL DEFAULT now(),
  valid_until         timestamptz,
  superseded_by       uuid REFERENCES luna_persona_facts(id),
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_facts_user_cat
  ON luna_persona_facts(user_id, category, valid_until NULLS FIRST);
CREATE INDEX IF NOT EXISTS idx_facts_user_active
  ON luna_persona_facts(user_id) WHERE valid_until IS NULL;
ALTER TABLE luna_persona_facts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_facts" ON luna_persona_facts;
CREATE POLICY "own_facts" ON luna_persona_facts
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- L3 Procedural: Luna's own tone state per user
-- ============================================================
CREATE TABLE IF NOT EXISTS luna_self_state (
  user_id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tone_summary      text NOT NULL DEFAULT '',
  what_works        text[] NOT NULL DEFAULT '{}',
  what_fails        text[] NOT NULL DEFAULT '{}',
  current_arc       text,
  updated_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE luna_self_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_self_state" ON luna_self_state;
CREATE POLICY "own_self_state" ON luna_self_state
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- L0 Working aux: compressed sliding-window turns
-- ============================================================
CREATE TABLE IF NOT EXISTS session_compressed_turns (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        uuid NOT NULL REFERENCES counseling_sessions(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  turn_start_idx    int NOT NULL,
  turn_end_idx      int NOT NULL,
  one_liner         text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comp_session
  ON session_compressed_turns(session_id, turn_start_idx);
ALTER TABLE session_compressed_turns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_compressed_turns" ON session_compressed_turns;
CREATE POLICY "own_compressed_turns" ON session_compressed_turns
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- Reflection output: weekly digest
-- ============================================================
CREATE TABLE IF NOT EXISTS luna_weekly_digest (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_day    int NOT NULL,
  digest            text NOT NULL,
  insights          text[] NOT NULL DEFAULT '{}',
  embedding         vector(768),
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_digest_user_week
  ON luna_weekly_digest(user_id, week_start_day DESC);
ALTER TABLE luna_weekly_digest ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_digest" ON luna_weekly_digest;
CREATE POLICY "own_digest" ON luna_weekly_digest
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- RPC: hybrid recall (dense vector cosine, BM25 done in code via pg_trgm)
-- ============================================================
CREATE OR REPLACE FUNCTION match_luna_episodes(
  query_embedding   vector(768),
  p_user_id         uuid,
  match_threshold   float DEFAULT 0.3,
  match_count       int DEFAULT 20
)
RETURNS TABLE (
  id                uuid,
  session_id        uuid,
  day_number        int,
  title             text,
  summary_short     text,
  summary_long      text,
  emotion_label     text,
  importance        smallint,
  decay_strength    real,
  last_recalled_at  timestamptz,
  recall_count      int,
  tags              text[],
  related_people    text[],
  created_at        timestamptz,
  similarity        float
)
LANGUAGE sql STABLE AS $$
  SELECT
    e.id, e.session_id, e.day_number, e.title,
    e.summary_short, e.summary_long, e.emotion_label,
    e.importance, e.decay_strength, e.last_recalled_at, e.recall_count,
    e.tags, e.related_people, e.created_at,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM luna_episodes e
  WHERE e.user_id = p_user_id
    AND e.embedding IS NOT NULL
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ============================================================
-- RPC: keyword search (BM25 surrogate via pg_trgm + tag overlap)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_episodes_summary_trgm
  ON luna_episodes USING gin (summary_long gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_episodes_title_trgm
  ON luna_episodes USING gin (title gin_trgm_ops);

CREATE OR REPLACE FUNCTION search_luna_episodes_keyword(
  p_user_id     uuid,
  p_keywords    text,
  match_count   int DEFAULT 20
)
RETURNS TABLE (
  id                uuid,
  session_id        uuid,
  day_number        int,
  title             text,
  summary_short     text,
  summary_long      text,
  emotion_label     text,
  importance        smallint,
  decay_strength    real,
  last_recalled_at  timestamptz,
  recall_count      int,
  tags              text[],
  related_people    text[],
  created_at        timestamptz,
  score             float
)
LANGUAGE sql STABLE AS $$
  SELECT
    e.id, e.session_id, e.day_number, e.title,
    e.summary_short, e.summary_long, e.emotion_label,
    e.importance, e.decay_strength, e.last_recalled_at, e.recall_count,
    e.tags, e.related_people, e.created_at,
    GREATEST(
      similarity(e.summary_long, p_keywords),
      similarity(e.title, p_keywords) * 1.5
    ) AS score
  FROM luna_episodes e
  WHERE e.user_id = p_user_id
    AND (
      e.summary_long ILIKE '%' || p_keywords || '%'
      OR e.title ILIKE '%' || p_keywords || '%'
      OR similarity(e.summary_long, p_keywords) > 0.1
    )
  ORDER BY score DESC
  LIMIT match_count;
$$;

-- ============================================================
-- Reinforcement: bump decay_strength + recall_count when retrieved
-- ============================================================
CREATE OR REPLACE FUNCTION reinforce_episodes(
  p_user_id     uuid,
  p_ids         uuid[],
  p_bump        real DEFAULT 0.1
)
RETURNS void
LANGUAGE sql AS $$
  UPDATE luna_episodes
     SET decay_strength = LEAST(1.0, decay_strength + p_bump),
         last_recalled_at = now(),
         recall_count = recall_count + 1
   WHERE user_id = p_user_id AND id = ANY(p_ids);
$$;

-- ============================================================
-- Decay batch (call from pg_cron or app cron)
--   R(t) = exp(-t / S),  S = 7 + importance + 14 * recall_count   (days)
-- ============================================================
CREATE OR REPLACE FUNCTION run_episode_decay()
RETURNS int
LANGUAGE plpgsql AS $$
DECLARE
  affected int;
BEGIN
  UPDATE luna_episodes
     SET decay_strength = GREATEST(
           0.0,
           LEAST(1.0,
             exp(
               - extract(epoch FROM (now() - COALESCE(last_recalled_at, created_at))) / 86400.0
               / (7.0 + importance + 14.0 * recall_count)
             )
           )
         );
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;
