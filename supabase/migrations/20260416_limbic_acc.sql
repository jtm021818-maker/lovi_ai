-- ============================================================
-- 변연계 (Limbic System) + ACC (Anterior Cingulate Cortex)
-- 인간 뇌 모사: 감정 지속 + 모순 감지
-- ============================================================

-- ──────────────────────────────────────────
-- 1. 변연계 상태 (유저별 1행)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS luna_limbic_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 베이스라인 무드 (-1 ~ +1)
  baseline_mood NUMERIC(4,3) NOT NULL DEFAULT 0,
  baseline_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 활성 감정들 (배열, 각자 반감기로 감쇠)
  -- [{ type, intensity, half_life_hours, triggered_at, triggered_by }]
  active_emotions JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- 호르몬 시뮬레이션 (모두 0~1)
  cortisol NUMERIC(4,3) NOT NULL DEFAULT 0 CHECK (cortisol >= 0 AND cortisol <= 1),
  oxytocin NUMERIC(4,3) NOT NULL DEFAULT 0 CHECK (oxytocin >= 0 AND oxytocin <= 1),
  dopamine NUMERIC(4,3) NOT NULL DEFAULT 0 CHECK (dopamine >= 0 AND dopamine <= 1),
  threat_arousal NUMERIC(4,3) NOT NULL DEFAULT 0 CHECK (threat_arousal >= 0 AND threat_arousal <= 1),

  -- 마지막 감쇠 계산 시각
  last_decayed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE luna_limbic_state IS '변연계: 루나의 시간적 감정 지속 상태 (반감기 기반)';
COMMENT ON COLUMN luna_limbic_state.baseline_mood IS '며칠 단위로 천천히 변하는 베이스 무드';
COMMENT ON COLUMN luna_limbic_state.active_emotions IS '활성 감정 배열, 각자 다른 반감기';
COMMENT ON COLUMN luna_limbic_state.cortisol IS '스트레스 호르몬, 6시간 반감기';
COMMENT ON COLUMN luna_limbic_state.oxytocin IS '친밀감 호르몬, 12시간 반감기';
COMMENT ON COLUMN luna_limbic_state.dopamine IS '보상 호르몬, 4시간 반감기';
COMMENT ON COLUMN luna_limbic_state.threat_arousal IS '위협 각성도, 8시간 반감기';

-- ──────────────────────────────────────────
-- 2. 유저 statement (모순 감지용)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID,

  -- statement 분류
  type TEXT NOT NULL CHECK (type IN ('fact', 'emotion', 'decision', 'judgment', 'desire', 'plan')),

  -- 누구/뭐에 관한 것 (정규화: '남친', '본인', '엄마' 등)
  subject TEXT NOT NULL,

  -- 정규화된 내용
  content TEXT NOT NULL,

  -- 원문 발췌
  source_excerpt TEXT NOT NULL,

  -- 추출 신뢰도
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),

  -- 임베딩 (semantic 검색용, optional)
  embedding VECTOR(768),

  stated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 모순으로 대체된 statement ID (대체된 후엔 검색에서 제외)
  superseded_by UUID REFERENCES user_statements(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_statements IS 'ACC: 유저 발화에서 추출한 의미 단위 statement (모순 감지용)';

-- 인덱스: 유저 + subject (모순 감지 핵심 쿼리)
CREATE INDEX IF NOT EXISTS user_statements_user_subject_idx
  ON user_statements(user_id, subject)
  WHERE superseded_by IS NULL;

-- 인덱스: 시간순 정렬
CREATE INDEX IF NOT EXISTS user_statements_user_stated_at_idx
  ON user_statements(user_id, stated_at DESC)
  WHERE superseded_by IS NULL;

-- 임베딩 유사도 검색 (HNSW)
CREATE INDEX IF NOT EXISTS user_statements_embedding_idx
  ON user_statements USING hnsw (embedding vector_cosine_ops);

-- ──────────────────────────────────────────
-- 3. updated_at 자동 갱신 트리거
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_limbic_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS limbic_updated_at_trigger ON luna_limbic_state;
CREATE TRIGGER limbic_updated_at_trigger
  BEFORE UPDATE ON luna_limbic_state
  FOR EACH ROW
  EXECUTE FUNCTION update_limbic_updated_at();

-- ──────────────────────────────────────────
-- 4. RLS (Row Level Security)
-- ──────────────────────────────────────────
ALTER TABLE luna_limbic_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_statements ENABLE ROW LEVEL SECURITY;

-- 사용자는 자기 데이터만
CREATE POLICY "Users can view own limbic state"
  ON luna_limbic_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own limbic state"
  ON luna_limbic_state FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own statements"
  ON user_statements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own statements"
  ON user_statements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own statements"
  ON user_statements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own statements"
  ON user_statements FOR DELETE
  USING (auth.uid() = user_id);

-- 서비스 롤은 모두 접근
CREATE POLICY "Service role full access limbic"
  ON luna_limbic_state FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access statements"
  ON user_statements FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ──────────────────────────────────────────
-- 5. 유틸리티 함수: 오래된 statement archive
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION archive_old_statements(
  p_user_id UUID,
  p_older_than_days INT DEFAULT 90
) RETURNS INT AS $$
DECLARE
  archived_count INT;
BEGIN
  WITH deleted AS (
    DELETE FROM user_statements
    WHERE user_id = p_user_id
      AND superseded_by IS NOT NULL
      AND stated_at < NOW() - (p_older_than_days || ' days')::INTERVAL
    RETURNING id
  )
  SELECT COUNT(*) INTO archived_count FROM deleted;

  RETURN archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────
-- 6. 통계 뷰 (모니터링용)
-- ──────────────────────────────────────────
CREATE OR REPLACE VIEW v_limbic_stats AS
SELECT
  user_id,
  baseline_mood,
  jsonb_array_length(active_emotions) AS active_emotion_count,
  cortisol,
  oxytocin,
  dopamine,
  threat_arousal,
  EXTRACT(EPOCH FROM (NOW() - last_decayed_at)) / 3600 AS hours_since_decay,
  updated_at
FROM luna_limbic_state;

CREATE OR REPLACE VIEW v_acc_stats AS
SELECT
  user_id,
  COUNT(*) AS total_statements,
  COUNT(*) FILTER (WHERE superseded_by IS NULL) AS active_statements,
  COUNT(*) FILTER (WHERE superseded_by IS NOT NULL) AS superseded_statements,
  COUNT(DISTINCT subject) AS unique_subjects,
  MAX(stated_at) AS last_statement_at
FROM user_statements
GROUP BY user_id;
