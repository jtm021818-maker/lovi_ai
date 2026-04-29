-- ============================================================
-- v101: Natural Letter & Memory — 자율 작성 + 비동기 전달 + 추억 이미지
-- ============================================================
-- - LLM이 세션 후 "쓰고 싶은지" 판단 (luna-letter-judge)
-- - 작성 시점 ≠ 도착 시점 (scheduled_for)
-- - 추억은 무료 이미지(Pollinations 등) + 회상용 luna_thought 동반

-- ── luna_memories: 이미지 + 회상 컨텍스트 + 비동기 전달 ────────────────
ALTER TABLE luna_memories
  ADD COLUMN IF NOT EXISTS image_url     TEXT,
  ADD COLUMN IF NOT EXISTS image_prompt  TEXT,
  ADD COLUMN IF NOT EXISTS luna_thought  TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source        TEXT NOT NULL DEFAULT 'auto';
  -- 'auto' (legacy v90 extract), 'judge' (v101 LLM judge), 'manual' (system)

-- ── luna_gifts: 비동기 전달 + 자율 작성 메타 ──────────────────────────
ALTER TABLE luna_gifts
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source        TEXT NOT NULL DEFAULT 'scheduled',
  -- 'scheduled' (GIFT_SCHEDULE 정해진 일자), 'judge' (LLM 자율 작성)
  ADD COLUMN IF NOT EXISTS judge_reason  TEXT;

-- ── 인덱스: pending 도착 콘텐츠 빠르게 조회 ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_luna_memories_delivery
  ON luna_memories(user_id, scheduled_for)
  WHERE delivered_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_luna_gifts_delivery
  ON luna_gifts(user_id, scheduled_for)
  WHERE delivered_at IS NULL;

-- ── 백필: 기존 데이터는 즉시 도착 처리 (호환성) ────────────────────────
UPDATE luna_memories
   SET delivered_at = COALESCE(delivered_at, created_at)
 WHERE delivered_at IS NULL AND scheduled_for IS NULL;

UPDATE luna_gifts
   SET delivered_at = COALESCE(delivered_at, created_at)
 WHERE delivered_at IS NULL AND scheduled_for IS NULL;

-- ── RPC: 도착할 시각이 된 콘텐츠를 일괄 마킹 (status 호출 시) ────────────
CREATE OR REPLACE FUNCTION luna_mark_delivered(p_user UUID, p_now TIMESTAMPTZ)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n_mem INT;
  n_gift INT;
BEGIN
  WITH upd AS (
    UPDATE luna_memories
       SET delivered_at = p_now
     WHERE user_id = p_user
       AND delivered_at IS NULL
       AND (scheduled_for IS NULL OR scheduled_for <= p_now)
     RETURNING 1
  )
  SELECT COUNT(*) INTO n_mem FROM upd;

  WITH upd AS (
    UPDATE luna_gifts
       SET delivered_at = p_now
     WHERE user_id = p_user
       AND delivered_at IS NULL
       AND (scheduled_for IS NULL OR scheduled_for <= p_now)
     RETURNING 1
  )
  SELECT COUNT(*) INTO n_gift FROM upd;

  RETURN COALESCE(n_mem, 0) + COALESCE(n_gift, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION luna_mark_delivered(UUID, TIMESTAMPTZ) TO authenticated, service_role;

-- ── 추억 이미지 캐시 버킷 (storage — Cloudflare/Gemini 폴백 시 업로드용) ─
-- (생성은 Supabase Storage UI 또는 별도 SQL 필요. 여기선 메모만)
-- bucket: luna-memory-images (public read)
