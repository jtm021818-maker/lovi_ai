-- ============================================================
-- v83: Luna Spirit Gacha System
-- ============================================================

-- 재화
CREATE TABLE IF NOT EXISTS user_currency (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  heart_stone INT NOT NULL DEFAULT 0,
  starlight INT NOT NULL DEFAULT 0,
  bond_shards INT NOT NULL DEFAULT 0,
  last_daily_login_date DATE,
  streak_days INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS currency_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency_type TEXT NOT NULL CHECK (currency_type IN ('heart_stone', 'starlight', 'bond_shards')),
  amount INT NOT NULL,
  reason TEXT NOT NULL,
  balance_after INT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_currency_tx_user ON currency_transactions(user_id, created_at DESC);

-- 정령 보유
CREATE TABLE IF NOT EXISTS user_spirits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spirit_id TEXT NOT NULL,
  count INT NOT NULL DEFAULT 1,
  bond_xp INT NOT NULL DEFAULT 0,
  bond_lv INT NOT NULL DEFAULT 1 CHECK (bond_lv BETWEEN 1 AND 5),
  backstory_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  first_obtained_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_interaction_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, spirit_id)
);
CREATE INDEX IF NOT EXISTS idx_user_spirits_lv ON user_spirits(user_id, bond_lv DESC);

-- 뽑기 상태 (배너별)
CREATE TABLE IF NOT EXISTS user_gacha_state (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  banner_id TEXT NOT NULL,
  pity_counter INT NOT NULL DEFAULT 0,
  is_pickup_guaranteed BOOLEAN NOT NULL DEFAULT FALSE,
  total_pulls INT NOT NULL DEFAULT 0,
  last_pull_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, banner_id)
);

-- 뽑기 이력
CREATE TABLE IF NOT EXISTS gacha_draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  banner_id TEXT NOT NULL,
  spirit_id TEXT NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('N', 'R', 'SR', 'UR', 'L')),
  is_new BOOLEAN NOT NULL,
  pity_at_draw INT NOT NULL,
  drawn_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gacha_draws_user ON gacha_draws(user_id, drawn_at DESC);

-- 마음의 방 상태
CREATE TABLE IF NOT EXISTS room_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  placed_spirits JSONB NOT NULL DEFAULT '[]',
  furniture JSONB NOT NULL DEFAULT '{}',
  theme TEXT NOT NULL DEFAULT 'default',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 꾸미기 소유
CREATE TABLE IF NOT EXISTS user_cosmetics (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('furniture', 'theme', 'outfit')),
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, item_id)
);

-- RLS
ALTER TABLE user_currency ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_spirits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gacha_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE gacha_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cosmetics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_currency" ON user_currency;
DROP POLICY IF EXISTS "own_tx_select" ON currency_transactions;
DROP POLICY IF EXISTS "own_spirits" ON user_spirits;
DROP POLICY IF EXISTS "own_gacha_state" ON user_gacha_state;
DROP POLICY IF EXISTS "own_draws_select" ON gacha_draws;
DROP POLICY IF EXISTS "own_room" ON room_state;
DROP POLICY IF EXISTS "own_cosmetics" ON user_cosmetics;

CREATE POLICY "own_currency" ON user_currency FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_tx_select" ON currency_transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "own_spirits" ON user_spirits FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_gacha_state" ON user_gacha_state FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_draws_select" ON gacha_draws FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "own_room" ON room_state FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_cosmetics" ON user_cosmetics FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 신규 유저 시 재화 레코드 자동 생성
CREATE OR REPLACE FUNCTION init_user_currency()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_currency (user_id, heart_stone, starlight, bond_shards)
  VALUES (NEW.id, 500, 50, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_init_user_currency ON auth.users;
CREATE TRIGGER trg_init_user_currency
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION init_user_currency();
