-- 011: 살아있는 기억 엔진 — user_memories 테이블
-- "아 맞다!" 인간형 기억 시스템

-- 1. 기억 테이블
CREATE TABLE IF NOT EXISTS user_memories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 기억 내용
  content         TEXT NOT NULL,
  summary         TEXT,

  -- 분류
  memory_type     TEXT NOT NULL DEFAULT 'episodic',
  category        TEXT,
  source          TEXT NOT NULL DEFAULT 'counseling',

  -- 키워드 (검색용)
  keyword_tags    TEXT[] DEFAULT '{}',
  emotion_tag     TEXT,

  -- 살리언스
  emotional_weight  FLOAT DEFAULT 0.3,
  access_count      INT DEFAULT 0,
  retention_score   FLOAT DEFAULT 1.0,
  is_pinned         BOOLEAN DEFAULT FALSE,

  -- 시간
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at  TIMESTAMPTZ DEFAULT NOW(),
  session_id        UUID,

  -- 관계
  related_memory_id UUID REFERENCES user_memories(id),
  partner_name      TEXT
);

-- 2. 인덱스
CREATE INDEX IF NOT EXISTS idx_memories_user_recency ON user_memories(user_id, last_accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_keywords ON user_memories USING GIN(keyword_tags);
CREATE INDEX IF NOT EXISTS idx_memories_emotion ON user_memories(user_id, emotion_tag);
CREATE INDEX IF NOT EXISTS idx_memories_source ON user_memories(user_id, source);
CREATE INDEX IF NOT EXISTS idx_memories_pinned ON user_memories(user_id) WHERE is_pinned = TRUE;

-- 3. user_profiles에 친밀도 + 세션 카운트 추가
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS luna_session_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS luna_intimacy_level TEXT DEFAULT 'low';

-- 4. RLS 정책
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own memories"
  ON user_memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memories"
  ON user_memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories"
  ON user_memories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories"
  ON user_memories FOR DELETE
  USING (auth.uid() = user_id);

-- 5. 서비스 롤 전체 접근 (API에서 사용)
CREATE POLICY "Service role full access"
  ON user_memories FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE user_memories IS '살아있는 기억 엔진 — 인간형 기억 시스템';
COMMENT ON COLUMN user_memories.memory_type IS 'episodic(일화)|semantic(패턴)|fact(사실)';
COMMENT ON COLUMN user_memories.source IS 'counseling|lounge|onboarding';
COMMENT ON COLUMN user_memories.retention_score IS '에빙하우스 망각곡선 기반 기억 유지 점수 (0=잊음, 1=선명)';
COMMENT ON COLUMN user_memories.is_pinned IS 'TRUE면 절대 잊지 않는 기억 (이름, 나이 등 팩트)';
