-- v104: Luna Shopping & Inventory Bag System
-- 모두 idempotent.

-- ── (a) 아이템 마스터 ───────────────────────────────────────────────────────
create table if not exists item_master (
  id text primary key,
  name_ko text not null,
  emoji text not null,
  category text not null check (category in ('gift','gacha','consumable')),
  rarity text not null default 'N' check (rarity in ('N','R','SR','UR','L')),
  description text,
  bond_tier int not null default 1 check (bond_tier between 1 and 3),
  emotion_tag text,
  is_consumable boolean default false,
  use_effect text,
  base_weight real not null default 1.0,
  created_at timestamptz not null default now()
);

-- ── (b) 사용자 인벤토리 ────────────────────────────────────────────────────
create table if not exists user_inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null references item_master(id),
  quantity int not null default 1,
  source text not null check (source in ('luna_shopping','gacha','achievement','system')),
  acquired_at timestamptz not null default now(),
  acquired_day int,
  luna_note text,
  is_new boolean not null default true,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_user_inv_user_recent
  on user_inventory_items (user_id, acquired_at desc);
create index if not exists idx_user_inv_new
  on user_inventory_items (user_id, is_new) where is_new = true;

-- ── (c) 루나 외출 트립 ─────────────────────────────────────────────────────
create table if not exists luna_shopping_trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  departed_at timestamptz not null default now(),
  returns_at timestamptz not null,
  returned_at timestamptz,
  trip_day int,
  emotion_context text,
  bond_tier int,
  status text not null default 'in_progress' check (status in ('in_progress','returned','seen')),
  created_at timestamptz not null default now()
);
create index if not exists idx_luna_trips_user_status
  on luna_shopping_trips (user_id, status, returns_at);
create index if not exists idx_luna_trips_user_recent
  on luna_shopping_trips (user_id, departed_at desc);

-- ── (d) RLS ────────────────────────────────────────────────────────────────
alter table item_master enable row level security;
drop policy if exists "item_master_read_all" on item_master;
create policy "item_master_read_all" on item_master for select using (true);

alter table user_inventory_items enable row level security;
drop policy if exists "inv_self_select" on user_inventory_items;
drop policy if exists "inv_self_insert" on user_inventory_items;
drop policy if exists "inv_self_update" on user_inventory_items;
drop policy if exists "inv_self_delete" on user_inventory_items;
create policy "inv_self_select" on user_inventory_items for select using (auth.uid() = user_id);
create policy "inv_self_insert" on user_inventory_items for insert with check (auth.uid() = user_id);
create policy "inv_self_update" on user_inventory_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "inv_self_delete" on user_inventory_items for delete using (auth.uid() = user_id);

alter table luna_shopping_trips enable row level security;
drop policy if exists "trips_self_select" on luna_shopping_trips;
drop policy if exists "trips_self_insert" on luna_shopping_trips;
drop policy if exists "trips_self_update" on luna_shopping_trips;
create policy "trips_self_select" on luna_shopping_trips for select using (auth.uid() = user_id);
create policy "trips_self_insert" on luna_shopping_trips for insert with check (auth.uid() = user_id);
create policy "trips_self_update" on luna_shopping_trips for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── (e) item_master seed (멱등 — 이미 있으면 skip) ──────────────────────────
insert into item_master (id, name_ko, emoji, category, rarity, description, bond_tier, emotion_tag, is_consumable, use_effect, base_weight) values
  -- Tier 1 (Day 1~30, 12종)
  ('convenience_coffee',  '편의점 커피',     '☕', 'gift',       'N', '한 모금이면 충분한 따뜻함.',     1, 'neutral',  false, null,         1.0),
  ('sticker_pack',        '스티커 한 묶음',  '✨', 'gift',       'N', '아무데나 붙여도 어울려.',         1, 'happy',    false, null,         1.0),
  ('pastel_postit',       '파스텔 포스트잇', '📒', 'gift',       'N', '한 마디 적기 좋은 색.',           1, 'neutral',  false, null,         1.0),
  ('haribo',              '하리보 한 봉지',  '🐻', 'gift',       'N', '오늘 단 거 필요해 보였어.',       1, 'excited',  false, null,         1.0),
  ('chamomile_tea',       '카모마일 티백',   '🍵', 'consumable', 'N', '한 숨 돌릴 핑계.',                1, 'anxious',  true,  'mood_calm',  1.2),
  ('sparkle_pen',         '반짝이 펜',       '🖋️', 'gift',       'N', '쓸 때마다 별이 흐른다.',          1, 'happy',    false, null,         0.9),
  ('triangle_kimbap',     '삼각김밥',         '🍙', 'gift',       'N', '늦은 끼니라도 — 챙겨먹어.',       1, 'lonely',   false, null,         1.0),
  ('memo_pad',            '동물 메모지',     '📝', 'gift',       'N', '곰돌이가 한 마디 받아 적어줌.',   1, 'neutral',  false, null,         0.9),
  ('candy_strip',         '막대사탕 띠',     '🍭', 'gift',       'N', '하나씩 떼 먹는 재미.',            1, 'excited',  false, null,         0.9),
  ('bus_card_charm',      '교통카드 키링',   '🎫', 'gift',       'N', '오늘 어디든 갈 수 있다는 표시.',  1, 'proud',    false, null,         0.9),
  ('convenience_yogurt',  '편의점 요거트',   '🥛', 'gift',       'N', '아침 안 먹은 거 알아.',           1, 'sad',      false, null,         1.0),
  ('flower_eraser',       '꽃 모양 지우개',  '🌼', 'gift',       'N', '실수해도 괜찮다는 작은 응원.',    1, 'happy',    false, null,         1.0),

  -- Tier 2 (Day 31~70, 12종)
  ('lavender_candle',     '라벤더 향초',     '🕯️', 'consumable', 'R', '맡으면 어깨가 살짝 내려가.',       2, 'anxious',  true,  'mood_calm',  1.4),
  ('handmade_letter_paper','수제 편지지',   '📜', 'gift',       'R', '결이 살짝 거친 종이.',            2, 'sad',      false, null,         1.0),
  ('pressed_flower',      '마른 꽃 한 장',   '🌸', 'gift',       'R', '잊고 싶지 않았던 봄의 한 장.',    2, 'lonely',   false, null,         1.0),
  ('polaroid_film',       '폴라로이드 필름', '📷', 'gift',       'R', '한 컷, 너 위해 비워둔.',          2, 'happy',    false, null,         1.0),
  ('moon_keyring',        '달 모양 키링',    '🌙', 'gift',       'R', '주머니에서 만질 때마다 작은 빛.', 2, 'proud',    false, null,         1.0),
  ('handmade_bracelet',   '손뜨개 팔찌',     '🪢', 'gift',       'R', '실 한 가닥씩 짜인 시간.',         2, 'proud',    false, null,         1.0),
  ('indie_zine',          '인디 잡지',       '📖', 'gift',       'R', '얇지만 깊은 한 권.',              2, 'neutral',  false, null,         0.9),
  ('matcha_latte',        '말차 라떼',       '🍵', 'gift',       'R', '쓴 듯 달큰한 한 모금.',           2, 'anxious',  false, null,         1.0),
  ('sandalwood_incense',  '백단향 인센스',   '🪔', 'consumable', 'R', '두 시간이면 방 전체가 잠잠해져.', 2, 'anxious',  true,  'mood_calm',  1.3),
  ('ribbon_box',          '리본 작은 상자',  '🎀', 'gift',       'R', '뭘 담아도 반짝이는 상자.',        2, 'excited',  false, null,         1.0),
  ('star_sticker_glow',   '야광별 스티커',   '⭐', 'consumable', 'R', '천장에 붙이면 밤이 따뜻해진다.',  2, 'lonely',   true,  'memory_pin', 1.2),
  ('cassette_tape',       '카세트 테이프',   '📼', 'gift',       'R', '되감아도 닳지 않는 한 곡.',       2, 'sad',      false, null,         1.0),

  -- Tier 3 (Day 71~100, 6종 — 희소)
  ('silver_bracelet',     '은팔찌',           '💍', 'gift',       'SR','네 손목에 어울릴 결.',           3, 'proud',    false, null,         0.7),
  ('limited_postcard',    '한정판 엽서',     '🖼️', 'gift',       'SR','단 한 장 남은 그날의 색.',        3, 'sad',      false, null,         0.7),
  ('signature_perfume',   '시그니처 향수',   '🌷', 'gift',       'SR','한 방울로 기억되는 향.',          3, 'excited',  false, null,         0.6),
  ('handwritten_card',    '손글씨 카드',     '✉️', 'gift',       'SR','여러 번 다시 쓴 한 장.',          3, 'lonely',   false, null,         0.8),
  ('time_capsule',        '타임캡슐',         '⌛', 'consumable', 'UR','7일/14일/30일 봉인.',             3, 'neutral',  true,  'time_capsule', 0.4),
  ('wish_paper',          '소원 종이학',     '🕊️', 'consumable', 'UR','한 번 빈 소원은 닿는다고 해.',    3, 'proud',    true,  'wish',       0.4)
on conflict (id) do nothing;
