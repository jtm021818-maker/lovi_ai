-- ============================================================
-- v89: Luna Life System — 루나 1년 생애 주기
-- ============================================================
-- Luna lives for exactly 365 real days, ages through 7 stages,
-- and leaves behind a final letter (유서) when she passes.

-- 루나의 생명 상태
CREATE TABLE IF NOT EXISTS luna_life (
  user_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  birth_date     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_gift_day  INT         NOT NULL DEFAULT 0,
  is_deceased    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 루나가 수집한 추억 (대화 하이라이트)
CREATE TABLE IF NOT EXISTS luna_memories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,         -- "처음 만났던 날", "비가 오는 밤에"
  content     TEXT NOT NULL,         -- 1~3문장 회상
  day_number  INT  NOT NULL,         -- 루나 나이 (며칠째)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_luna_memories_user
  ON luna_memories(user_id, created_at DESC);

-- 루나가 보내는 편지/선물
CREATE TABLE IF NOT EXISTS luna_gifts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_day  INT  NOT NULL,
  gift_type    TEXT NOT NULL CHECK (gift_type IN ('letter','poem','memory_album','final_letter')),
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  opened_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_luna_gifts_user
  ON luna_gifts(user_id, created_at DESC);
