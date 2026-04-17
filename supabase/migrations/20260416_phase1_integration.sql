-- ============================================================
-- Phase 1 통합: 4개 새 테이블
--   1. session_threads      — 세션 간 연결
--   2. response_feedback    — 응답 효과 학습
--   3. luna_identity_with_user — 루나 정체성 drift (유저별)
--   4. left_brain_future_hints — 우뇌 → 좌뇌 (다음 턴용) 힌트
-- ============================================================

-- ──────────────────────────────────────────
-- 1. 세션 간 스레드 (장기 테마 연결)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 테마 (자연어)
  theme TEXT NOT NULL,                    -- 예: "남친 연락 이슈"
  summary TEXT,                           -- 주요 전개 요약

  -- 시간 추적
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_mentioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 상태
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved', 'dormant', 'abandoned')),

  -- 중요도 (0~1)
  importance NUMERIC(3,2) NOT NULL DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),

  -- 관련 인물 (배열)
  characters TEXT[],

  -- 등장한 세션 수
  session_mention_count INT NOT NULL DEFAULT 1,

  -- 임베딩 (의미 검색용)
  embedding VECTOR(768),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE session_threads IS '세션을 넘나드는 장기 테마. 새 세션 시작 시 자동 로드.';

-- 인덱스: 유저별 활성 스레드 빠른 조회
CREATE INDEX IF NOT EXISTS session_threads_user_status_idx
  ON session_threads(user_id, status, last_mentioned_at DESC);

-- 임베딩 유사도 검색
CREATE INDEX IF NOT EXISTS session_threads_embedding_idx
  ON session_threads USING hnsw (embedding vector_cosine_ops);

-- ──────────────────────────────────────────
-- 2. 응답 효과 학습 (도파민 학습 기반)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS response_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID,
  turn_idx INT NOT NULL,

  -- 루나의 응답 요약
  luna_response_summary TEXT NOT NULL,       -- 50자 이내
  luna_strategy TEXT NOT NULL,               -- 'empathy', 'questioning', 'confrontation', 'reassurance', 'explore', 'pace_back'
  luna_tone TEXT,                            -- '따뜻함', '분노공감' 등

  -- 유저 반응 (다음 턴의 감정 변화로 측정)
  user_next_emotion_shift NUMERIC,           -- valence 변화 (-2~+2)
  user_next_engagement TEXT,                 -- 'withdrew', 'neutral', 'deepened', 'recovered'

  -- 효과 판정
  effective BOOLEAN,                          -- true: 긍정 변화, false: 부정 or 효과 없음
  effectiveness_score NUMERIC(3,2),          -- 0~1

  -- 메타
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE response_feedback IS '루나 응답 패턴 → 유저 반응 학습. 다음 유사 상황에서 참조.';

-- 인덱스: 전략별 효과 집계
CREATE INDEX IF NOT EXISTS response_feedback_user_strategy_idx
  ON response_feedback(user_id, luna_strategy, created_at DESC);

-- ──────────────────────────────────────────
-- 3. 루나 정체성 drift (유저별)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS luna_identity_with_user (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 루나가 이 유저에게 보인 특성 (누적)
  -- {"직설성": 0.7, "유머": 0.4, "자기개방": 0.3, ...}
  expressed_traits JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- 공유된 농담 (inside jokes)
  -- [{ trigger: "...", callback: "...", first_used_at: "..." }]
  shared_jokes JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- 피하는 화제
  avoided_topics TEXT[],

  -- 공명 화제
  resonant_topics TEXT[],

  -- 관계 단계
  relationship_phase TEXT NOT NULL DEFAULT 'new'
    CHECK (relationship_phase IN ('new', 'bonding', 'deep', 'veteran')),

  -- 루나가 이 유저를 어떻게 보는지 (자연어)
  -- { sees_user_as: "...", worries_about: [...], proud_of: [...] }
  luna_perception JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- 누적 공유 경험 수
  shared_experience_count INT NOT NULL DEFAULT 0,

  -- 첫 만남
  first_meeting_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE luna_identity_with_user IS '유저별 루나 페르소나. 시간이 지나며 서로 다른 루나가 됨.';

-- ──────────────────────────────────────────
-- 4. 좌뇌용 future hints (우뇌 → 다음 턴 좌뇌)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS left_brain_future_hints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID,

  -- 힌트 내용 (자연어)
  hint TEXT NOT NULL,

  -- 어느 턴에 생성됐는가
  created_at_turn INT NOT NULL,

  -- 소비 (다음 좌뇌 호출이 반영)
  consumed BOOLEAN NOT NULL DEFAULT FALSE,
  consumed_at TIMESTAMPTZ,

  -- 우선순위 (0~1)
  priority NUMERIC(3,2) NOT NULL DEFAULT 0.5,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE left_brain_future_hints IS '우뇌가 다음 턴 좌뇌에 남기는 힌트. "다음엔 더 깊이 가라" 등.';

CREATE INDEX IF NOT EXISTS lb_hints_user_unconsumed_idx
  ON left_brain_future_hints(user_id, consumed, priority DESC);

-- ──────────────────────────────────────────
-- 5. 트리거: updated_at 자동 갱신
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_phase1_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS session_threads_updated ON session_threads;
CREATE TRIGGER session_threads_updated
  BEFORE UPDATE ON session_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_phase1_updated_at();

DROP TRIGGER IF EXISTS luna_identity_updated ON luna_identity_with_user;
CREATE TRIGGER luna_identity_updated
  BEFORE UPDATE ON luna_identity_with_user
  FOR EACH ROW
  EXECUTE FUNCTION update_phase1_updated_at();

-- ──────────────────────────────────────────
-- 6. RLS (Row Level Security)
-- ──────────────────────────────────────────
ALTER TABLE session_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE luna_identity_with_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE left_brain_future_hints ENABLE ROW LEVEL SECURITY;

-- 사용자는 자기 데이터만
CREATE POLICY "users_own_session_threads"
  ON session_threads FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "users_own_response_feedback"
  ON response_feedback FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "users_own_luna_identity"
  ON luna_identity_with_user FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "users_own_lb_hints"
  ON left_brain_future_hints FOR ALL
  USING (auth.uid() = user_id);

-- 서비스 롤 전체 접근
CREATE POLICY "service_role_session_threads"
  ON session_threads FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "service_role_response_feedback"
  ON response_feedback FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "service_role_luna_identity"
  ON luna_identity_with_user FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "service_role_lb_hints"
  ON left_brain_future_hints FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ──────────────────────────────────────────
-- 7. 통계 뷰
-- ──────────────────────────────────────────
CREATE OR REPLACE VIEW v_phase1_stats AS
SELECT
  (SELECT COUNT(*) FROM session_threads WHERE status = 'open') AS open_threads,
  (SELECT COUNT(*) FROM session_threads WHERE status = 'resolved') AS resolved_threads,
  (SELECT COUNT(*) FROM response_feedback WHERE effective = true) AS effective_responses,
  (SELECT COUNT(*) FROM response_feedback WHERE effective = false) AS ineffective_responses,
  (SELECT COUNT(*) FROM luna_identity_with_user) AS tracked_users,
  (SELECT COUNT(*) FROM left_brain_future_hints WHERE consumed = false) AS pending_hints;

-- ──────────────────────────────────────────
-- 8. 유틸: 오래된 consumed 힌트 정리 (30일 이상)
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION cleanup_consumed_hints() RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  WITH deleted AS (
    DELETE FROM left_brain_future_hints
    WHERE consumed = true
      AND consumed_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
