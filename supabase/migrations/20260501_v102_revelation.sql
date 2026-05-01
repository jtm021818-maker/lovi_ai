-- v102: 100일 점진적 비밀 해금 + 솔(루나의 딸) 계승
-- 모두 idempotent.

-- 1) 정령 비밀 단계별 잠금 + 일기 페이지 진척
alter table user_spirits
  add column if not exists lore_unlocked boolean default false;
alter table user_spirits
  add column if not exists lore_unlocked_at timestamptz;
alter table user_spirits
  add column if not exists day_revealed_at int;

create index if not exists idx_user_spirits_lore_unlocked
  on user_spirits (user_id, lore_unlocked);

-- 2) 어머니 일기 (사용자별 페이지 진척)
create table if not exists luna_mother_lore_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  page int not null check (page between 1 and 21),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, page)
);

create index if not exists idx_mother_lore_user
  on luna_mother_lore_progress (user_id, unlocked_at);

-- 3) 100일째 천도 의식 + 솔 계승 상태
alter table luna_life
  add column if not exists ritual_completed_at timestamptz;
alter table luna_life
  add column if not exists pages_unlocked_at_death int default 0;
alter table luna_life
  add column if not exists generation int default 1;

-- 4) 솔(루나의 딸)
create table if not exists luna_descendant (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '솔',
  birth_date timestamptz not null default now(),
  inherited_pages int not null default 0,
  inherited_spirits int not null default 0,
  is_active boolean not null default false
);

-- 5) 슬픔 빌드업 이벤트 시청 기록 (90~100일)
create table if not exists luna_sorrow_event_seen (
  user_id uuid not null references auth.users(id) on delete cascade,
  day int not null check (day between 86 and 100),
  kind text not null,
  seen_at timestamptz not null default now(),
  primary key (user_id, day, kind)
);

-- 6) 정령 fragment 캐시 (rev2: user-centric 동적 페이지)
create table if not exists spirit_fragment_cache (
  user_id uuid not null references auth.users(id) on delete cascade,
  spirit_id text not null,
  resolved_body text,
  source_label text,
  bridge_one_liner text,
  matched boolean default false,
  cached_at timestamptz not null default now(),
  primary key (user_id, spirit_id)
);
