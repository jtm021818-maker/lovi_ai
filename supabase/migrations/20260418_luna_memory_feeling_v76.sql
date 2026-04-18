-- 🆕 v76: 루나의 감정 결 (luna_feeling) + 인상 (luna_impression) 컬럼 추가
-- 목적: user_memories 가 "사실" 뿐 아니라 "루나가 그때 어떻게 느꼈는지" 도 저장.
--      → 다음 세션에 "떠올린 기억" 으로 주입 시 감정 결 포함된 1인칭 독백.

ALTER TABLE user_memories
  ADD COLUMN IF NOT EXISTS luna_feeling TEXT,
  ADD COLUMN IF NOT EXISTS luna_impression TEXT;

COMMENT ON COLUMN user_memories.luna_feeling
  IS '루나가 그 순간 느낀 감정 결 (예: "좀 안쓰러웠어, 얘 솔직한 건 장점인데")';

COMMENT ON COLUMN user_memories.luna_impression
  IS '루나가 유저에 대해 형성한 인상 한 줄 (예: "얘는 자책 강한 타입")';

-- 🆕 v76: 세션 내 실시간 친밀도 누적을 위한 컬럼
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS luna_intimacy_score INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS luna_intimacy_last_update TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN user_profiles.luna_intimacy_score
  IS '누적 친밀도 점수 (0-100). 세션당/턴당 증감. 50+ 면 Lv.3, 75+ 면 Lv.4.';
