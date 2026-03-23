-- ============================================
-- Love AI - 초기 DB 스키마
-- Architect 피드백 반영: user_id 역정규화, HNSW 인덱스, 전체 RLS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. 사용자 프로필
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL DEFAULT '익명',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_situation TEXT,
  attachment_type TEXT DEFAULT 'UNKNOWN',
  attachment_confidence NUMERIC DEFAULT 0,
  maladaptive_schemas JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 관계
CREATE TABLE relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  partner_alias TEXT,
  relationship_type TEXT,
  commitment_level INTEGER CHECK (commitment_level BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 정서적 통장
CREATE TABLE emotional_bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE,
  positive_count INTEGER DEFAULT 0,
  negative_count INTEGER DEFAULT 0,
  magic_ratio NUMERIC GENERATED ALWAYS AS (
    CASE WHEN negative_count = 0 THEN positive_count::NUMERIC
         ELSE positive_count::NUMERIC / negative_count END
  ) STORED,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 상담 세션
CREATE TABLE counseling_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  relationship_id UUID REFERENCES relationships(id),
  title TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'crisis')),
  session_summary TEXT,
  is_flooding_detected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- 5. 메시지 (user_id 역정규화 - Architect 피드백)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES counseling_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'ai')),
  content TEXT NOT NULL,
  sentiment_score NUMERIC,
  cognitive_distortions TEXT[] DEFAULT '{}',
  horsemen_detected TEXT[] DEFAULT '{}',
  attachment_signal TEXT,
  risk_level TEXT DEFAULT 'LOW',
  is_flooding BOOLEAN DEFAULT FALSE,
  strategy_used TEXT,
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 메시지 벡터 저장소 (RAG)
CREATE TABLE message_memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES counseling_sessions(id),
  content TEXT NOT NULL,
  sentiment_score NUMERIC,
  detected_distortions TEXT[],
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW 인덱스 (Architect 피드백: ivfflat 대신)
CREATE INDEX ON message_memories
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- 7. 전략 로그
CREATE TABLE strategy_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES counseling_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  strategy_type TEXT NOT NULL,
  selection_reason TEXT,
  thinking_budget TEXT,
  model_tier TEXT,
  state_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 전략 효과성 분석
CREATE TABLE strategy_outcome_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strategy_log_id UUID REFERENCES strategy_logs(id),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  pre_emotion_score NUMERIC,
  post_emotion_score NUMERIC,
  emotion_shift NUMERIC GENERATED ALWAYS AS (post_emotion_score - pre_emotion_score) STORED,
  is_successful BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. 감정 로그
CREATE TABLE emotion_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES counseling_sessions(id),
  emotion_score NUMERIC,
  trigger_event TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. 행동 유도 기록
CREATE TABLE behavior_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES counseling_sessions(id),
  task_type TEXT,
  description TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  pre_emotion NUMERIC,
  post_emotion NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 11. 감정 일기
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  emotion_words TEXT[],
  content TEXT,
  gratitude TEXT,
  emotion_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. 위기 로그 (Critic 피드백)
CREATE TABLE safety_crisis_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES counseling_sessions(id),
  trigger_message TEXT,
  risk_level TEXT,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS 정책 (모든 테이블 - Critic 피드백: 생략 없이 명시)
-- ============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotional_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE counseling_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_outcome_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotion_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_crisis_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_data" ON user_profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "own_data" ON relationships FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON emotional_bank_accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON counseling_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON messages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON message_memories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON strategy_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON strategy_outcome_analysis FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON emotion_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON behavior_tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON journal_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON safety_crisis_logs FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- pgvector 유사도 검색 함수
-- ============================================

CREATE OR REPLACE FUNCTION match_past_memories(
  query_embedding vector(768),
  match_user_id UUID,
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  sentiment_score NUMERIC,
  detected_distortions TEXT[],
  similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    mm.id,
    mm.content,
    mm.sentiment_score,
    mm.detected_distortions,
    1 - (mm.embedding <=> query_embedding) AS similarity
  FROM message_memories mm
  WHERE mm.user_id = match_user_id
    AND 1 - (mm.embedding <=> query_embedding) > match_threshold
  ORDER BY mm.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 사용자 프로필 자동 생성 트리거
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, nickname)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', '익명'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
