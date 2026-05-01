-- v102 (rev2) RLS 정책 — 본인(user_id = auth.uid()) 행만 읽/쓰기 허용.
-- 모두 idempotent. 같은 이름의 정책이 이미 있으면 drop 후 재생성.

-- ── luna_mother_lore_progress ────────────────────────────────────────────────
alter table if exists luna_mother_lore_progress enable row level security;

drop policy if exists "lore_progress_select_own"  on luna_mother_lore_progress;
drop policy if exists "lore_progress_insert_own"  on luna_mother_lore_progress;
drop policy if exists "lore_progress_update_own"  on luna_mother_lore_progress;
drop policy if exists "lore_progress_delete_own"  on luna_mother_lore_progress;

create policy "lore_progress_select_own" on luna_mother_lore_progress
  for select using (auth.uid() = user_id);
create policy "lore_progress_insert_own" on luna_mother_lore_progress
  for insert with check (auth.uid() = user_id);
create policy "lore_progress_update_own" on luna_mother_lore_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "lore_progress_delete_own" on luna_mother_lore_progress
  for delete using (auth.uid() = user_id);

-- ── luna_descendant ──────────────────────────────────────────────────────────
alter table if exists luna_descendant enable row level security;

drop policy if exists "descendant_select_own" on luna_descendant;
drop policy if exists "descendant_insert_own" on luna_descendant;
drop policy if exists "descendant_update_own" on luna_descendant;
drop policy if exists "descendant_delete_own" on luna_descendant;

create policy "descendant_select_own" on luna_descendant
  for select using (auth.uid() = user_id);
create policy "descendant_insert_own" on luna_descendant
  for insert with check (auth.uid() = user_id);
create policy "descendant_update_own" on luna_descendant
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "descendant_delete_own" on luna_descendant
  for delete using (auth.uid() = user_id);

-- ── luna_sorrow_event_seen ───────────────────────────────────────────────────
alter table if exists luna_sorrow_event_seen enable row level security;

drop policy if exists "sorrow_seen_select_own" on luna_sorrow_event_seen;
drop policy if exists "sorrow_seen_insert_own" on luna_sorrow_event_seen;
drop policy if exists "sorrow_seen_update_own" on luna_sorrow_event_seen;
drop policy if exists "sorrow_seen_delete_own" on luna_sorrow_event_seen;

create policy "sorrow_seen_select_own" on luna_sorrow_event_seen
  for select using (auth.uid() = user_id);
create policy "sorrow_seen_insert_own" on luna_sorrow_event_seen
  for insert with check (auth.uid() = user_id);
create policy "sorrow_seen_update_own" on luna_sorrow_event_seen
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sorrow_seen_delete_own" on luna_sorrow_event_seen
  for delete using (auth.uid() = user_id);

-- ── spirit_fragment_cache ────────────────────────────────────────────────────
alter table if exists spirit_fragment_cache enable row level security;

drop policy if exists "fragment_cache_select_own" on spirit_fragment_cache;
drop policy if exists "fragment_cache_insert_own" on spirit_fragment_cache;
drop policy if exists "fragment_cache_update_own" on spirit_fragment_cache;
drop policy if exists "fragment_cache_delete_own" on spirit_fragment_cache;

create policy "fragment_cache_select_own" on spirit_fragment_cache
  for select using (auth.uid() = user_id);
create policy "fragment_cache_insert_own" on spirit_fragment_cache
  for insert with check (auth.uid() = user_id);
create policy "fragment_cache_update_own" on spirit_fragment_cache
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "fragment_cache_delete_own" on spirit_fragment_cache
  for delete using (auth.uid() = user_id);
