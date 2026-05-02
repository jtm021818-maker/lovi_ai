-- ============================================================
-- 🧚 v104: Spirit Random Events
-- 20개 정령 시그니처 카드 발동 로그 + 별똥이 월간 소원 + 정령 보관함
-- ============================================================

-- (a) 정령 이벤트 발동 로그 (쿨타임 / 세션 상한 / 분석 통계)
create table if not exists spirit_event_fires (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid,                              -- nullable: monthly star_dust 는 session 외 가능
  spirit_id text not null,
  event_type text not null,                     -- 'SPIRIT_RAGE_LETTER' 등
  fired_at timestamptz not null default now(),
  phase text,                                   -- HOOK/MIRROR/BRIDGE/SOLVE/EMPOWER
  turn_no int,
  result jsonb,                                 -- 카드 데이터 스냅샷 (디버깅/회상)
  user_choice text,                             -- 'commit'|'skip'|'burn'|...
  user_input jsonb                              -- 자유 입력 (편지 본문, 소원 1줄, 가치 3개 etc.)
);
create index if not exists idx_spirit_fires_user_recent on spirit_event_fires(user_id, fired_at desc);
create index if not exists idx_spirit_fires_session on spirit_event_fires(session_id);
create index if not exists idx_spirit_fires_user_spirit on spirit_event_fires(user_id, spirit_id, fired_at desc);

-- 같은 세션 내 같은 event_type 중복 방지 (경합 안전)
create unique index if not exists uniq_spirit_fire_dedup
  on spirit_event_fires(user_id, session_id, event_type)
  where session_id is not null;

-- (b) 별똥이 월간 소원 약속
create table if not exists spirit_wishes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_wish text not null,
  if_phrase text not null,
  then_phrase text not null,
  committed_at timestamptz not null default now(),
  trigger_at timestamptz,                       -- if 시간 (옵트인 시 push 알림 reservation)
  fulfilled boolean default null,               -- null=대기, true=이행, false=미이행
  fulfilled_at timestamptz,
  notified_at timestamptz                       -- push 발송 시각
);
create index if not exists idx_wishes_user on spirit_wishes(user_id, committed_at desc);
create index if not exists idx_wishes_trigger_pending
  on spirit_wishes(trigger_at)
  where fulfilled is null and trigger_at is not null;

-- (c) 정령 보관함 — 편지/꽃잎 의식/가치 봉인/새벽 고백 공통 저장소
create table if not exists spirit_keepsakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  spirit_id text not null,                      -- 'letter_fairy'|'cherry_leaf'|'queen_elena'|'moon_rabbit'
  kind text not null,                           -- 'letter'|'release'|'value'|'confession'
  body text not null,
  meta jsonb,                                   -- {recipient, action: 'archive'|'burn'|'release'}
  created_at timestamptz not null default now()
);
create index if not exists idx_keepsakes_user_spirit on spirit_keepsakes(user_id, spirit_id, created_at desc);

-- (d) RLS
alter table spirit_event_fires enable row level security;
alter table spirit_wishes enable row level security;
alter table spirit_keepsakes enable row level security;

-- 본인 데이터만
drop policy if exists "spirit_fires_own_select" on spirit_event_fires;
create policy "spirit_fires_own_select" on spirit_event_fires
  for select using (user_id = auth.uid());
drop policy if exists "spirit_fires_own_insert" on spirit_event_fires;
create policy "spirit_fires_own_insert" on spirit_event_fires
  for insert with check (user_id = auth.uid());
drop policy if exists "spirit_fires_own_update" on spirit_event_fires;
create policy "spirit_fires_own_update" on spirit_event_fires
  for update using (user_id = auth.uid());

drop policy if exists "spirit_wishes_own" on spirit_wishes;
create policy "spirit_wishes_own" on spirit_wishes
  for all using (user_id = auth.uid());

drop policy if exists "spirit_keepsakes_own" on spirit_keepsakes;
create policy "spirit_keepsakes_own" on spirit_keepsakes
  for all using (user_id = auth.uid());

-- (e) 헬퍼 뷰: 유저별 정령 이벤트 마지막 발동 시각 (쿨타임 계산 가속)
create or replace view spirit_event_last_fire_v as
select user_id, spirit_id, event_type, max(fired_at) as last_fire_at
from spirit_event_fires
group by user_id, spirit_id, event_type;
