-- v118: 소모품 시스템 v2 — 21종 카탈로그 + 친밀도 4축 선물 + Hook 통합
-- 모든 변경은 멱등 (idempotent). 재실행 안전.
-- 관련 plan: ~/.claude/plans/swirling-dancing-breeze.md
--
-- 핵심 변경:
--   1. item_master.category 체크 제약 확장 ('gift','gacha','consumable' → +'charm','sealed','decor')
--   2. user_inventory_items 컬럼 추가 (equipped_at, favorite_at)
--   3. 신설 테이블: user_active_equipment, user_consumable_active, user_dex_fragments, gift_log
--   4. room_state 컬럼 추가 (선물 일일 캡/streak, 잔물결 안내 플래그, smart_luna 일일 카운터)
--   5. RPC 함수 2개: consume_consumables, refund_consumable
--   6. 잔물결류(gacha_dust, rainbow_ticket, luck_charm) 보유분 일괄 삭제 + 안내 플래그
--   7. deprecated 소모품 자동 변환 (lavender_candle/sandalwood_incense → spirit_mood_revival, star_sticker_glow → memory_pin_star)
--   8. 신규 19종 카탈로그 INSERT (time_capsule/wish_paper 제외)

-- ============================================================
-- (1) item_master.category 체크 확장
-- ============================================================
alter table item_master drop constraint if exists item_master_category_check;
alter table item_master
  add constraint item_master_category_check
  check (category in ('gift','gacha','consumable','charm','sealed','decor'));

-- ============================================================
-- (2) user_inventory_items 컬럼 추가
-- ============================================================
alter table user_inventory_items
  add column if not exists equipped_at timestamptz,
  add column if not exists favorite_at timestamptz;

create index if not exists idx_user_inv_equipped
  on user_inventory_items (user_id, equipped_at)
  where equipped_at is not null;

create index if not exists idx_user_inv_favorite
  on user_inventory_items (user_id, favorite_at)
  where favorite_at is not null;

-- ============================================================
-- (3) user_active_equipment — 장착 슬롯 (charm 1슬롯만 현재)
-- ============================================================
create table if not exists user_active_equipment (
  user_id uuid not null references auth.users(id) on delete cascade,
  slot text not null check (slot in ('charm')),
  inventory_item_id uuid not null references user_inventory_items(id) on delete cascade,
  equipped_at timestamptz not null default now(),
  primary key (user_id, slot)
);
create index if not exists idx_active_equipment_user on user_active_equipment(user_id);

alter table user_active_equipment enable row level security;
drop policy if exists "active_eq_self" on user_active_equipment;
create policy "active_eq_self" on user_active_equipment
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- (4) user_consumable_active — 활성 부스터 (TTL 추적)
-- ============================================================
create table if not exists user_consumable_active (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null references item_master(id),
  use_effect text not null,
  -- duration_kind: 'turns' | 'session' | 'time' | 'next_gacha' | 'permanent'
  duration_kind text not null check (duration_kind in ('turns','session','time','next_gacha','permanent')),
  remaining_turns int,             -- duration_kind='turns' 일 때
  session_id uuid,                 -- duration_kind='session' 일 때
  expires_at timestamptz,          -- duration_kind='time' 일 때
  payload jsonb,                   -- 자유 필드 (선택 axis, target spirit 등)
  applied_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_consumable_active_user_session
  on user_consumable_active(user_id, session_id);
create index if not exists idx_consumable_active_user_time
  on user_consumable_active(user_id, expires_at)
  where expires_at is not null;
create index if not exists idx_consumable_active_user_effect
  on user_consumable_active(user_id, use_effect);

alter table user_consumable_active enable row level security;
drop policy if exists "uca_self_all" on user_consumable_active;
create policy "uca_self_all" on user_consumable_active
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- (5) user_dex_fragments — 도감 조각 적립 (10개 = 도감 페이지 1개 unlock)
-- ============================================================
create table if not exists user_dex_fragments (
  user_id uuid primary key references auth.users(id) on delete cascade,
  fragment_count int not null default 0,
  total_collected int not null default 0,
  updated_at timestamptz not null default now()
);

alter table user_dex_fragments enable row level security;
drop policy if exists "dex_frag_self" on user_dex_fragments;
create policy "dex_frag_self" on user_dex_fragments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- (6) gift_log — 선물 이력 (분석/abuse 감지용)
-- ============================================================
create table if not exists gift_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  category text not null,
  emotion_tag text,
  rarity text,
  axis_delta jsonb not null,         -- {trust:0.4, openness:..., bond:..., respect:...}
  streak_count int not null default 0,
  streak_bonus jsonb,                -- {trust:1.5, bond:3.0} 등
  daily_capped boolean not null default false,  -- true 면 4축 델타 0 (캡 초과)
  given_at timestamptz not null default now()
);
create index if not exists idx_gift_log_user_day on gift_log(user_id, given_at desc);
create index if not exists idx_gift_log_user_item on gift_log(user_id, item_id);

alter table gift_log enable row level security;
drop policy if exists "gift_log_self_select" on gift_log;
drop policy if exists "gift_log_self_insert" on gift_log;
create policy "gift_log_self_select" on gift_log for select using (auth.uid() = user_id);
create policy "gift_log_self_insert" on gift_log for insert with check (auth.uid() = user_id);

-- ============================================================
-- (7) room_state 컬럼 추가 (선물 streak, daily cap, smart_luna 카운터, 잔물결 안내)
-- ============================================================
alter table room_state
  add column if not exists gift_streak_count int not null default 0,
  add column if not exists gift_streak_last_at timestamptz,
  add column if not exists daily_gift_count int not null default 0,
  add column if not exists daily_gift_reset_at date,
  add column if not exists smart_luna_daily_used int not null default 0,
  add column if not exists smart_luna_daily_reset_at date,
  add column if not exists dust_purge_announced_at timestamptz;

-- ============================================================
-- (8) 잔물결류 보유분 일괄 삭제 (gacha_dust, rainbow_ticket, luck_charm)
--    실제 row 삭제 — 사용자에게는 room 진입 시 1회 안내 모달로 통지
-- ============================================================
delete from user_inventory_items
  where item_id in ('gacha_dust','rainbow_ticket','luck_charm');

-- (8b) 신규 발급 차단 — 가챠/드롭 풀에서 제외 (row 자체는 유지: 외래키 보존)
update item_master
  set base_weight = 0
  where id in ('gacha_dust','rainbow_ticket','luck_charm');

-- ============================================================
-- (9) deprecated 소모품 → 신규 강화판 자동 변환
--    UPDATE 이므로 quantity/source/luna_note 유지
-- ============================================================
-- 신규 row 가 먼저 INSERT 되어야 FK 안전 (섹션 10에서 INSERT 후 다시 UPDATE)

-- ============================================================
-- (10) 신규 19종 카탈로그 INSERT (멱등)
-- ============================================================
insert into item_master (id, name_ko, emoji, category, rarity, description, bond_tier, emotion_tag, is_consumable, use_effect, base_weight) values

  -- A. 대화 품질 부스터 (7종) — pre-message-modifier
  ('smart_luna_potion',           '똑똑한 루나 포션',     '🧠', 'consumable', 'SR',
   '다음 1턴, 더 깊이 사고하는 모드로 응답해.',  3, 'proud',   true, 'model_upgrade_smart',         0.3),
  ('deep_analysis_lens',          '심층 분석 렌즈',       '🔍', 'consumable', 'SR',
   '이번 세션 동안 매턴 풀-진단 모드.',           3, 'neutral', true, 'pipeline_full_diagnostic',    0.4),
  ('honest_luna_chip',            '솔직한 루나 칩',       '🗯️', 'consumable', 'R',
   '다음 1턴, 베테랑처럼 직설적으로.',            2, 'neutral', true, 'tone_blunt_oneturn',          0.9),
  ('comfort_mode_token',          '위로 모드 토큰',       '🫂', 'consumable', 'R',
   '이번 세션은 위로 톤만 — 직면/팩폭 회피.',     2, 'sad',     true, 'tone_soothing_session',       0.9),
  ('deep_empathy_lens',           '깊은 공감 렌즈',       '💞', 'consumable', 'R',
   '다음 3턴, 길고 풍부한 감정 표현.',            2, 'lonely',  true, 'right_brain_boost',           0.9),
  ('relationship_diagnosis_ticket','관계 진단권',          '📋', 'consumable', 'SR',
   '다음 세션 종료 시 4축 진단 리포트 카드.',     3, 'neutral', true, 'diagnosis_full_report',       0.4),
  ('unlimited_chat_pass',         '무제한 24h 패스',      '♾️', 'consumable', 'UR',
   '24시간 메시지 캡 해제. 우선순위 큐.',         3, 'proud',   true, 'rate_limit_bypass_24h',       0.2),

  -- B. 컨텐츠 언락 (5종) — instant-effect
  ('tarot_extra_draw',            '타로 추가 카드',       '🃏', 'consumable', 'R',
   '다음 타로 스프레드에 +1장 추가.',             2, 'neutral', true, 'tarot_card_bonus',            1.0),
  ('signature_preview_ticket',    '시그니처 미리보기권',  '🎬', 'consumable', 'SR',
   '미해금 정령의 시그니처 무브 1회 재생.',       3, 'excited', true, 'signature_preview_unlock',    0.5),
  ('dex_fragment_card',           '도감 조각',            '🧩', 'consumable', 'N',
   '도감 조각 +1. 10개 모이면 페이지 영구 언락.', 1, 'neutral', true, 'dex_fragment_add',            1.4),
  ('memory_pin_star',             '추억의 별',            '⭐', 'consumable', 'R',
   '직전 7일 내 최고 감정 카드 자동 고정.',       2, 'happy',   true, 'memory_pin',                  1.0),
  ('scenario_reroll_token',       '시나리오 재배정권',    '🎲', 'consumable', 'SR',
   '현재 세션의 시나리오 다시 선택 (첫 턴 전).',  3, 'neutral', true, 'scenario_reroll',             0.5),

  -- C. 친밀도/정령 부스터 (4종)
  ('spirit_affection_treat',      '정령 호감도 간식',     '🍪', 'consumable', 'N',
   '선택한 정령 1마리의 mood + bond 증가.',       1, 'happy',   true, 'spirit_mood_boost',           1.5),
  ('intimacy_boost_token',        '친밀도 부스터',        '💗', 'consumable', 'SR',
   '4축 중 1축 +5 (세션 캡 무시).',               3, 'proud',   true, 'intimacy_axis_plus',          0.4),
  ('spirit_mood_revival',         '정령 안식의 향초',     '🕯️', 'consumable', 'R',
   '룸 안 모든 정령 mood +15, 1시간 decay 정지.', 2, 'anxious', true, 'room_mood_calm_strong',       1.0),
  ('room_renewal_coupon',         '가구 리뉴얼 쿠폰',     '🛋️', 'consumable', 'UR',
   '가구 슬롯 1개 즉시 재추첨.',                  3, 'excited', true, 'room_slot_reroll',            0.2),

  -- D. 유틸리티 (3종) — 기존 time_capsule, wish_paper 유지
  ('gacha_luck_charm',            '가챠 행운 부적',       '🍀', 'charm',      'R',
   '다음 가챠 1회 SR+ 확률 1.5배.',               2, 'proud',   true, 'gacha_luck',                  1.1),
  ('gacha_pity_guarantee',        '10연 SR 보장권',       '🎰', 'charm',      'SR',
   '다음 10연 가챠에서 SR+ 1매 보장.',            3, 'excited', true, 'gacha_pity_force',            0.4),
  ('daily_mission_reset',         '일일 미션 리셋',       '🔄', 'consumable', 'R',
   '완료한 일일 미션 3건 즉시 리셋.',             2, 'neutral', true, 'mission_reset',               1.0)

on conflict (id) do nothing;

-- ============================================================
-- (11) 기존 milestone/capsule/wish 아이템 카테고리 'sealed' 로 이동
-- ============================================================
update item_master set category = 'sealed'
  where id in ('time_capsule','wish_paper','milestone_day50_box','milestone_day100_letter');

-- ============================================================
-- (12) deprecated 소모품 자동 변환 (보유 row 의 item_id 갱신)
-- ============================================================
update user_inventory_items
   set item_id = case item_id
       when 'lavender_candle'    then 'spirit_mood_revival'
       when 'sandalwood_incense' then 'spirit_mood_revival'
       when 'star_sticker_glow'  then 'memory_pin_star'
       else item_id end
 where item_id in ('lavender_candle','sandalwood_incense','star_sticker_glow');

-- 변환된 deprecated row 는 신규 발급 차단
update item_master
  set base_weight = 0
  where id in ('lavender_candle','sandalwood_incense','star_sticker_glow');

-- ============================================================
-- (13) RPC: consume_consumables (트랜잭션 + SELECT FOR UPDATE)
-- ============================================================
create or replace function consume_consumables(
  p_user_id uuid,
  p_inv_ids uuid[],
  p_session_id uuid
) returns jsonb
language plpgsql security definer as $$
declare
  v_inv record;
  v_applied jsonb := '[]'::jsonb;
  v_dur_kind text;
  v_remaining_turns int;
  v_expires_at timestamptz;
  v_session_id uuid;
begin
  -- 빈 배열 가드
  if p_inv_ids is null or array_length(p_inv_ids, 1) is null then
    return jsonb_build_object('applied', '[]'::jsonb);
  end if;

  for v_inv in
    select uii.id, uii.item_id, uii.quantity, im.use_effect, im.is_consumable
      from user_inventory_items uii
      join item_master im on im.id = uii.item_id
     where uii.id = any(p_inv_ids)
       and uii.user_id = p_user_id
       and uii.used_at is null
       and uii.quantity > 0
     for update
  loop
    if not v_inv.is_consumable then
      raise exception 'NOT_CONSUMABLE: %', v_inv.item_id;
    end if;

    -- decrement
    if v_inv.quantity > 1 then
      update user_inventory_items
         set quantity = quantity - 1,
             is_new = false
       where id = v_inv.id;
    else
      delete from user_inventory_items where id = v_inv.id;
    end if;

    -- duration_kind 매핑
    v_remaining_turns := null;
    v_expires_at := null;
    v_session_id := null;
    case v_inv.use_effect
      when 'model_upgrade_smart'        then v_dur_kind := 'turns';   v_remaining_turns := 1;
      when 'tone_blunt_oneturn'         then v_dur_kind := 'turns';   v_remaining_turns := 1;
      when 'right_brain_boost'          then v_dur_kind := 'turns';   v_remaining_turns := 3;
      when 'tone_soothing_session'      then v_dur_kind := 'session'; v_session_id := p_session_id;
      when 'pipeline_full_diagnostic'   then v_dur_kind := 'session'; v_session_id := p_session_id;
      when 'diagnosis_full_report'      then v_dur_kind := 'session'; v_session_id := p_session_id;
      when 'scenario_reroll'            then v_dur_kind := 'session'; v_session_id := p_session_id;
      when 'tarot_card_bonus'           then v_dur_kind := 'session'; v_session_id := p_session_id;
      when 'rate_limit_bypass_24h'      then v_dur_kind := 'time';    v_expires_at := now() + interval '24 hours';
      when 'gacha_luck'                 then v_dur_kind := 'next_gacha';
      when 'gacha_pity_force'           then v_dur_kind := 'next_gacha';
      else                                   v_dur_kind := 'permanent';
    end case;

    insert into user_consumable_active(
      user_id, item_id, use_effect, duration_kind, remaining_turns, session_id, expires_at
    ) values (
      p_user_id, v_inv.item_id, v_inv.use_effect, v_dur_kind, v_remaining_turns, v_session_id, v_expires_at
    );

    v_applied := v_applied || jsonb_build_object(
      'inventory_id', v_inv.id,
      'item_id', v_inv.item_id,
      'effect', v_inv.use_effect,
      'duration_kind', v_dur_kind,
      'remaining_turns', v_remaining_turns,
      'expires_at', v_expires_at
    );
  end loop;

  return jsonb_build_object('applied', v_applied);
end;
$$;

-- ============================================================
-- (14) RPC: refund_consumable (실패 시 환불)
-- ============================================================
create or replace function refund_consumable(
  p_user_id uuid,
  p_active_id uuid
) returns void
language plpgsql security definer as $$
declare
  v_item_id text;
begin
  delete from user_consumable_active
    where id = p_active_id and user_id = p_user_id
    returning item_id into v_item_id;

  if v_item_id is null then
    return;
  end if;

  -- 동일 item 보유 중이면 quantity++, 없으면 INSERT
  update user_inventory_items
     set quantity = quantity + 1
   where user_id = p_user_id
     and item_id = v_item_id
     and used_at is null;

  if not found then
    insert into user_inventory_items(user_id, item_id, source, quantity, luna_note)
      values (p_user_id, v_item_id, 'system', 1, '환불');
  end if;
end;
$$;

-- ============================================================
-- (15) RPC 권한 (authenticated)
-- ============================================================
grant execute on function consume_consumables(uuid, uuid[], uuid) to authenticated;
grant execute on function refund_consumable(uuid, uuid) to authenticated;
