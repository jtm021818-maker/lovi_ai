-- v103: Spirit Companion System
-- 정령을 "수집 카드" → "내 안의 작은 친구"로 진화시키는 스키마
-- 모두 idempotent (멱등)

-- ── (a) 정령별 무드 + 시간 흐름 ────────────────────────────────────────────
alter table user_spirits
  add column if not exists mood_value int default 60 check (mood_value between 0 and 100);
alter table user_spirits
  add column if not exists mood_updated_at timestamptz default now();
alter table user_spirits
  add column if not exists last_visited_at timestamptz;

-- ── (b) 방 배치 상태 (placed_in_room) ──────────────────────────────────────
alter table user_spirits
  add column if not exists is_placed_in_room boolean default false;
alter table user_spirits
  add column if not exists placed_at timestamptz;

create index if not exists idx_user_spirits_placed
  on user_spirits (user_id, is_placed_in_room) where is_placed_in_room = true;

-- ── (c) 정령별 동적 Drive (baseline 은 코드, current 은 본드 따라 변동) ───
alter table user_spirits
  add column if not exists drives_current jsonb;

-- ── (d) Cherished Fragment 해제 인덱스 (3슬롯) ─────────────────────────────
alter table user_spirits
  add column if not exists fragments_unlocked int[] default '{}';

-- ── (e) Mind Map 노드 테이블 ───────────────────────────────────────────────
create table if not exists spirit_mind_map_nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  spirit_id text not null,
  node_type text not null check (node_type in (
    'first_meet', 'bond_up', 'secret_unlock', 'room_session', 'user_note'
  )),
  label text not null,
  detail text,
  related_session_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_mind_map_user_spirit
  on spirit_mind_map_nodes (user_id, spirit_id, created_at desc);

-- ── (f) 페어 인터랙션 로그 (중복 방지) ─────────────────────────────────────
create table if not exists spirit_pair_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pair_key text not null,
  dialogue_index int not null,
  fired_at timestamptz not null default now()
);

create index if not exists idx_pair_interactions_user_recent
  on spirit_pair_interactions (user_id, fired_at desc);

-- ── (g) RLS — 본인만 ──────────────────────────────────────────────────────
alter table spirit_mind_map_nodes enable row level security;
drop policy if exists "mind_map_select_own" on spirit_mind_map_nodes;
drop policy if exists "mind_map_insert_own" on spirit_mind_map_nodes;
drop policy if exists "mind_map_update_own" on spirit_mind_map_nodes;
drop policy if exists "mind_map_delete_own" on spirit_mind_map_nodes;

create policy "mind_map_select_own" on spirit_mind_map_nodes
  for select using (auth.uid() = user_id);
create policy "mind_map_insert_own" on spirit_mind_map_nodes
  for insert with check (auth.uid() = user_id);
create policy "mind_map_update_own" on spirit_mind_map_nodes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mind_map_delete_own" on spirit_mind_map_nodes
  for delete using (auth.uid() = user_id);

alter table spirit_pair_interactions enable row level security;
drop policy if exists "pair_interactions_select_own" on spirit_pair_interactions;
drop policy if exists "pair_interactions_insert_own" on spirit_pair_interactions;

create policy "pair_interactions_select_own" on spirit_pair_interactions
  for select using (auth.uid() = user_id);
create policy "pair_interactions_insert_own" on spirit_pair_interactions
  for insert with check (auth.uid() = user_id);
