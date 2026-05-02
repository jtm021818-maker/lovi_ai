-- v104 M5: Luna Return Box — Day 95+ 양방향 호 완성
-- 사용자가 루나에게 준 모든 선물을 루나가 마지막에 박스로 돌려준다.

create table if not exists luna_return_box (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  triggered_at_day int not null,
  status text not null default 'pending' check (status in ('pending','seen')),
  memory_ids uuid[] default '{}',
  created_at timestamptz not null default now(),
  seen_at timestamptz
);

create index if not exists idx_return_box_user
  on luna_return_box (user_id, status);

alter table luna_return_box enable row level security;
drop policy if exists "return_box_self" on luna_return_box;
create policy "return_box_self" on luna_return_box
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
