-- 🧠 Luna Memory System v70 — Brain-inspired Memory Architecture
-- 2026-04-17
-- HippoRAG + Working Memory + 4-graph Agentic Memory

-- ============================================================
-- 1. message_memories 확장 (에피소드 그룹화 + AI 응답 지원)
-- ============================================================

ALTER TABLE message_memories
  ADD COLUMN IF NOT EXISTS episode_id UUID,
  ADD COLUMN IF NOT EXISTS importance_score REAL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS arousal_score REAL DEFAULT 0.3,
  ADD COLUMN IF NOT EXISTS sender_type TEXT DEFAULT 'user' CHECK (sender_type IN ('user','ai'));

CREATE INDEX IF NOT EXISTS idx_message_memories_episode ON message_memories(episode_id);
CREATE INDEX IF NOT EXISTS idx_message_memories_sender ON message_memories(sender_type);
CREATE INDEX IF NOT EXISTS idx_message_memories_user_session ON message_memories(user_id, session_id);

-- ============================================================
-- 2. session_threads 확장 (참조 빈도 추적)
-- ============================================================

ALTER TABLE session_threads
  ADD COLUMN IF NOT EXISTS last_referenced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reference_count INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_session_threads_user_status ON session_threads(user_id, status, last_referenced_at DESC NULLS LAST);

-- ============================================================
-- 3. 메모리 그래프 — 노드 (HippoRAG-style)
-- ============================================================

CREATE TABLE IF NOT EXISTS memory_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  concept TEXT NOT NULL,
  node_type TEXT NOT NULL CHECK (node_type IN ('person','event','emotion','place','object','theme','action')),
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  access_count INT DEFAULT 1,
  importance REAL DEFAULT 0.5,
  retention_score REAL DEFAULT 1.0,
  embedding vector(768),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, concept, node_type)
);

CREATE INDEX IF NOT EXISTS idx_memory_nodes_user_concept ON memory_nodes(user_id, concept);
CREATE INDEX IF NOT EXISTS idx_memory_nodes_user_type ON memory_nodes(user_id, node_type);
CREATE INDEX IF NOT EXISTS idx_memory_nodes_embedding ON memory_nodes
  USING hnsw (embedding vector_cosine_ops);

ALTER TABLE memory_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "memory_nodes_owner_all" ON memory_nodes;
CREATE POLICY "memory_nodes_owner_all" ON memory_nodes
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 4. 메모리 그래프 — 엣지 (연상)
-- ============================================================

CREATE TABLE IF NOT EXISTS memory_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  source_node UUID NOT NULL REFERENCES memory_nodes ON DELETE CASCADE,
  target_node UUID NOT NULL REFERENCES memory_nodes ON DELETE CASCADE,
  relation_type TEXT NOT NULL,
  weight REAL DEFAULT 0.5,
  strengthened_at TIMESTAMPTZ DEFAULT NOW(),
  strengthen_count INT DEFAULT 1,
  UNIQUE(source_node, target_node, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_memory_edges_user ON memory_edges(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_edges_source ON memory_edges(source_node);
CREATE INDEX IF NOT EXISTS idx_memory_edges_target ON memory_edges(target_node);

ALTER TABLE memory_edges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "memory_edges_owner_all" ON memory_edges;
CREATE POLICY "memory_edges_owner_all" ON memory_edges
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 5. RPC — RIF (Recency × Importance × Frequency) 기반 에피소드 회상
-- ============================================================

CREATE OR REPLACE FUNCTION recall_episodes_rif(
  query_embedding vector(768),
  p_user_id UUID,
  match_count INT DEFAULT 5,
  recency_weight REAL DEFAULT 0.4,
  importance_weight REAL DEFAULT 0.35,
  frequency_weight REAL DEFAULT 0.15,
  decay_days REAL DEFAULT 14.0
) RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity REAL,
  importance REAL,
  access_estimate INT,
  days_ago REAL,
  rif_score REAL,
  sender_type TEXT
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    mm.id,
    mm.content,
    (1 - (mm.embedding <=> query_embedding))::REAL AS similarity,
    COALESCE(mm.importance_score, 0.5)::REAL AS importance,
    1::INT AS access_estimate,
    EXTRACT(EPOCH FROM (NOW() - mm.created_at)) / 86400.0 AS days_ago,
    (
      recency_weight * EXP(-EXTRACT(EPOCH FROM (NOW() - mm.created_at)) / (86400.0 * decay_days)) +
      importance_weight * COALESCE(mm.importance_score, 0.5) +
      frequency_weight * (1 - (mm.embedding <=> query_embedding))
    )::REAL AS rif_score,
    COALESCE(mm.sender_type, 'user') AS sender_type
  FROM message_memories mm
  WHERE mm.user_id = p_user_id
    AND mm.embedding IS NOT NULL
    AND (1 - (mm.embedding <=> query_embedding)) > 0.3
  ORDER BY rif_score DESC
  LIMIT match_count;
END;
$$;

-- ============================================================
-- 6. RPC — 메모리 그래프 회상 (시드 + 1-hop 확장)
-- ============================================================

CREATE OR REPLACE FUNCTION recall_memory_graph(
  query_embedding vector(768),
  p_user_id UUID,
  top_k INT DEFAULT 10,
  seed_k INT DEFAULT 3
) RETURNS TABLE (
  node_id UUID,
  concept TEXT,
  node_type TEXT,
  score REAL,
  hop INT
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  WITH seeds AS (
    SELECT mn.id, mn.concept, mn.node_type,
           (1 - (mn.embedding <=> query_embedding))::REAL AS sim,
           mn.importance, mn.retention_score
    FROM memory_nodes mn
    WHERE mn.user_id = p_user_id
      AND mn.embedding IS NOT NULL
    ORDER BY mn.embedding <=> query_embedding
    LIMIT seed_k
  ),
  hop1 AS (
    SELECT DISTINCT ON (mn.id)
      mn.id, mn.concept, mn.node_type,
      (me.weight * 0.5)::REAL AS edge_score,
      mn.importance, mn.retention_score
    FROM seeds s
    JOIN memory_edges me ON me.source_node = s.id AND me.user_id = p_user_id
    JOIN memory_nodes mn ON mn.id = me.target_node
    WHERE mn.id NOT IN (SELECT id FROM seeds)
  )
  SELECT id AS node_id, concept, node_type,
         (sim * importance * retention_score)::REAL AS score,
         0 AS hop
  FROM seeds
  UNION ALL
  SELECT id, concept, node_type,
         (edge_score * importance * retention_score)::REAL AS score,
         1 AS hop
  FROM hop1
  ORDER BY score DESC
  LIMIT top_k;
END;
$$;

-- ============================================================
-- 7. 주기적 감쇠 — retention_score 업데이트 (cron 으로 호출 예정)
-- ============================================================

CREATE OR REPLACE FUNCTION decay_memory_retention()
RETURNS INT
LANGUAGE plpgsql AS $$
DECLARE
  affected INT;
BEGIN
  UPDATE memory_nodes
  SET retention_score = GREATEST(
    0.05,
    retention_score * 0.98 +
    LEAST(0.5, access_count::REAL / 100.0) * 0.02
  )
  WHERE last_accessed_at < NOW() - INTERVAL '3 days';

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- ============================================================
-- 8. 편의 뷰 — v70 메모리 통계
-- ============================================================

CREATE OR REPLACE VIEW v_memory_v70_stats AS
SELECT
  u.id AS user_id,
  (SELECT COUNT(*) FROM memory_nodes mn WHERE mn.user_id = u.id) AS node_count,
  (SELECT COUNT(*) FROM memory_edges me WHERE me.user_id = u.id) AS edge_count,
  (SELECT COUNT(*) FROM message_memories mm WHERE mm.user_id = u.id AND mm.sender_type = 'ai') AS luna_memory_count,
  (SELECT COUNT(*) FROM message_memories mm WHERE mm.user_id = u.id AND mm.sender_type = 'user') AS user_memory_count,
  (SELECT COUNT(*) FROM session_threads st WHERE st.user_id = u.id AND st.status = 'open') AS open_threads
FROM auth.users u;
