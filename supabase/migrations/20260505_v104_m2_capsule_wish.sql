-- v104 M2: Time Capsule + Wish Paper + 가챠 부산물 + 마일스톤 아이템

-- ── (a) 타임캡슐 ───────────────────────────────────────────────────────────
create table if not exists user_time_capsules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  inventory_item_id uuid references user_inventory_items(id) on delete set null,
  message text not null,
  sealed_at timestamptz not null default now(),
  unlocks_at timestamptz not null,
  unlocked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_time_capsules_user_unlock
  on user_time_capsules (user_id, unlocks_at);

-- ── (b) 소원 종이학 ────────────────────────────────────────────────────────
create table if not exists user_wishes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  inventory_item_id uuid references user_inventory_items(id) on delete set null,
  wish_text text not null,
  fulfilled boolean default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_user_wishes_user
  on user_wishes (user_id, created_at desc);

-- ── (c) 마일스톤 보상 추적 (중복 지급 방지) ────────────────────────────────
create table if not exists luna_milestone_rewards (
  user_id uuid not null references auth.users(id) on delete cascade,
  milestone_key text not null,
  granted_at timestamptz not null default now(),
  primary key (user_id, milestone_key)
);

-- ── (d) RLS ────────────────────────────────────────────────────────────────
alter table user_time_capsules enable row level security;
drop policy if exists "capsules_self" on user_time_capsules;
create policy "capsules_self" on user_time_capsules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table user_wishes enable row level security;
drop policy if exists "wishes_self" on user_wishes;
create policy "wishes_self" on user_wishes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table luna_milestone_rewards enable row level security;
drop policy if exists "milestone_self" on luna_milestone_rewards;
create policy "milestone_self" on luna_milestone_rewards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── (e) 가챠 부산물 + 마일스톤 아이템 시드 ────────────────────────────────
insert into item_master (id, name_ko, emoji, category, rarity, description, bond_tier, emotion_tag, is_consumable, use_effect, base_weight) values
  -- 가챠 부산물 (N) — 10연차 보너스 등에 들어감
  ('gacha_dust',          '가챠 잔물결',     '✨', 'gacha',      'N', '뽑기 후 남은 작은 빛 한 조각.',   1, null,       false, null,         1.0),
  ('luck_charm',          '행운의 부적',     '🍀', 'gacha',      'R', '다음 뽑기에 살짝의 행운.',       1, null,       true,  'gacha_luck', 0.8),
  ('rainbow_ticket',      '무지개 티켓',     '🎟️', 'gacha',      'SR','가챠 한 번 무료권 (장식용).',     2, null,       false, null,         0.5),
  -- 마일스톤 한정
  ('milestone_day50_box', 'Day 50 기념 상자', '📦', 'gift',       'SR','함께 50일을 보낸 기념.',          2, 'proud',    false, null,         1.0),
  ('milestone_day100_letter','Day 100 마지막 편지','💌','gift',   'L', '백일을 다 살아낸 너에게.',        3, 'proud',    false, null,         1.0)
on conflict (id) do nothing;
