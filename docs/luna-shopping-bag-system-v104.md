# 루나 쇼핑 & 가방 시스템 v104 — 설계 계획서
**버전**: 2026-05-02 (v104)
**전제 작업**: v103 (Spirit Companion 완료)
**목표**: 루나가 *진짜 사람처럼* 가끔 방을 나갔다 오면서 너에게 작은 선물을 사다 준다. 그 선물 + 가챠 아이템들이 루나 방 한쪽 가방에 차곡차곡 쌓인다. **부재 → 돌아옴 → 작은 의례**의 감정 호를 100일 동안 매일 한 번씩 만든다.
**참고 패턴**: Tamagotchi 부재의 미학 / Animal Crossing 랜덤 방문자 / Stardew NPC 우편 / Persona 5 친밀도 선물 / Kahneman Peak-End Rule / Skinner 가변 보상 / Kakao 선물하기 / K-드라마 떠남-귀환 정서.

---

## 1장. 진단 + 비전

### 1.1 지금 없는 것
- **인벤토리 시스템 자체가 없다** — `user_inventory_items` 테이블 미존재
- **루나는 항상 룸에 있다** — 외출 상태 없음, "Away" activity 없음
- **루나가 사용자에게 *주는* 선물은 자동 편지뿐** — 9개 정해진 날 (Day 3,7,14,30,50,70,85,95,100)
- **가챠 결과 외 NON-spirit 아이템 자체가 부재**

### 1.2 비전 한 줄
> *"오늘 루나가 잠깐 나갔다 왔는데, 너 생각하면서 뭔가 사왔어."*

루나는 스스로 외출하고, 스스로 선물을 고르고, 스스로 돌아온다. 사용자는 *기다리고*, *발견하고*, *환영한다*. 100일 동안 가방 안 선물의 결이 곧 두 사람의 관계 결이 된다.

### 1.3 핵심 감정 호 (4단계)
1. **부재 (Absence)** — 룸에 들어왔는데 루나가 없다. 의자 위에 쪽지 한 장.
2. **기다림 (Anticipation)** — "어디 갔지?" 룸 톤이 살짝 가라앉음.
3. **귀환 (Return)** — 푸시 알림 또는 룸 재진입 시 *큰 환영 모먼트* (Peak).
4. **수집 (Accumulation)** — 가방에 영구 보관. Day100 임박 시 가방이 곧 추억 박물관.

---

## 2장. 코어 메커니즘 4종

### 2.1 변동 시간대 외출 (Variable Interval — Skinner)
- **창**: KST 09:00~21:00 사이 *임의의 한 순간* 매일 1회 시작 가능
- **기간**: 외출은 30분~3시간 랜덤
- **트리거 모델**: pg_cron 없이 **client-pull**. 사용자가 status 엔드포인트를 호출할 때 서버가 결정
  - 마지막 외출 종료로부터 12시간 경과 + 오늘 아직 안 다녀옴 + 현재 시각이 창 안 → 외출 시작
  - 외출 중 + `returns_at` 도달 → 외출 종료 (선물 인벤토리에 추가)

### 2.2 인격에 맞는 선물 선택 (Persona 5 매트릭스 + ACE 감정 태깅)
**컨텍스트 입력**:
- 본드 티어: Day 1~30 (편의점/문방구) / Day 31~70 (홍대 인디샵) / Day 71~100 (백화점/특별가게)
- 최근 7세션 감정 태그 우세값: anxious / sad / happy / proud / lonely / excited / neutral
- 루나의 현재 stage (dawn/spring/summer/autumn/winter/twilight/star)
- 마지막 사용자 방문 시각 (방치형 사용자에게는 다른 톤의 선물)

**가중치 선택**:
```
weight = base × tier_match × emotion_match × random(0.7~1.3)
```

### 2.3 부재 시각화 + 귀환 의례 (Peak-End Rule)
- **부재 중 룸**:
  - 루나 캐릭터 영역 비어있음
  - 의자 위에 쪽지 한 장 ("나 잠깐 나갔다 올게 ~ 곧 와")
  - WhisperBubble 영역에 진행 표시 ("외출 중 · 곧 도착")
  - 룸 전체 살짝 톤 다운 (overlay opacity)
- **돌아옴 = 의례 (Peak)**:
  - 푸시 알림: "루나가 돌아왔어 🎁"
  - 사용자 룸 재진입 시 **풀스크린 ReturnCeremony 모달**:
    1. 페이드인 + 루나 등장 SFX-like 진동
    2. 루나 1인칭 한 줄 ("이거 보고 네 생각 났어 ♡")
    3. 포장된 선물 표시 (탭으로 풀기)
    4. 풀어보면 아이템 일러스트 + 루나의 노트 카드
    5. **자동으로 가방 안 [선물] 카테고리 NEW 뱃지로 들어감**

### 2.4 가방 = 추억의 박물관 (Bento Box + 카테고리 탭)
- **3 카테고리**:
  - 🎁 **선물** (루나 쇼핑) — 루나 노트 + Day 표기
  - 🎰 **뽑기** (가챠 보유 정령은 DEX에 있으니 여기는 가챠 *부산물* — 실패 보상, 이벤트 코인 등)
  - 🍃 **소모품** (사용 시 효과 발동 — 향초/타임캡슐 등)
- **NEW 뱃지** 자동 (상세 시트 첫 오픈 시 클리어)
- **Day별 필터** (Day 1~30 / 31~70 / 71~100)
- **"루나에게 보여주기"** 액션 → 정령처럼 루나도 아이템 반응 (M2)

---

## 3장. 데이터 모델

### 3.1 마이그레이션 `20260504_v104_shopping_bag.sql`

```sql
-- (a) 아이템 마스터 (정적이지만 DB에 둠 — 필요시 운영자가 추가)
create table if not exists item_master (
  id text primary key,                 -- 'lavender_candle'
  name_ko text not null,
  emoji text not null,                 -- '🕯️'
  category text not null check (category in ('gift','gacha','consumable')),
  rarity text not null default 'N' check (rarity in ('N','R','SR','UR','L')),
  description text,                    -- 한 줄 설명
  bond_tier int not null default 1 check (bond_tier between 1 and 3),
  emotion_tag text,                    -- 'anxious'|'sad'|'happy'|'proud'|'lonely'|'excited'|'neutral'|null
  is_consumable boolean default false,
  use_effect text,                     -- 'mood_calm'|'gacha_luck'|'memory_pin' 등
  base_weight real not null default 1.0,
  created_at timestamptz not null default now()
);

-- (b) 사용자 인벤토리 (실 보유)
create table if not exists user_inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null references item_master(id),
  quantity int not null default 1,
  source text not null check (source in ('luna_shopping','gacha','achievement','system')),
  acquired_at timestamptz not null default now(),
  acquired_day int,                    -- 본드 day (1..100)
  luna_note text,                      -- "이거 보고 네 생각 났어"
  is_new boolean not null default true,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_user_inv_user_recent
  on user_inventory_items (user_id, acquired_at desc);
create index if not exists idx_user_inv_new
  on user_inventory_items (user_id, is_new) where is_new = true;

-- (c) 루나 외출 이벤트
create table if not exists luna_shopping_trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  departed_at timestamptz not null default now(),
  returns_at timestamptz not null,         -- 예정 귀환 시각
  returned_at timestamptz,                  -- 실제 귀환 (NULL 이면 외출 중)
  trip_day int,                             -- 본드 day
  emotion_context text,
  bond_tier int,
  status text not null default 'in_progress' check (status in ('in_progress','returned','seen')),
  created_at timestamptz not null default now()
);
create index if not exists idx_luna_trips_user_status
  on luna_shopping_trips (user_id, status, returns_at);

-- (d) RLS
alter table item_master enable row level security;
drop policy if exists "item_master_read_all" on item_master;
create policy "item_master_read_all" on item_master for select using (true);

alter table user_inventory_items enable row level security;
drop policy if exists "inv_self_select" on user_inventory_items;
drop policy if exists "inv_self_update" on user_inventory_items;
drop policy if exists "inv_self_delete" on user_inventory_items;
create policy "inv_self_select" on user_inventory_items for select using (auth.uid() = user_id);
create policy "inv_self_update" on user_inventory_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "inv_self_delete" on user_inventory_items for delete using (auth.uid() = user_id);

alter table luna_shopping_trips enable row level security;
drop policy if exists "trips_self_select" on luna_shopping_trips;
drop policy if exists "trips_self_update" on luna_shopping_trips;
create policy "trips_self_select" on luna_shopping_trips for select using (auth.uid() = user_id);
create policy "trips_self_update" on luna_shopping_trips for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### 3.2 인벤토리 응답 구조 (TypeScript)
```typescript
interface InventoryItem {
  id: string;            // user_inventory_items.id
  itemId: string;        // 마스터 id
  name: string;
  emoji: string;
  category: 'gift'|'gacha'|'consumable';
  rarity: 'N'|'R'|'SR'|'UR'|'L';
  description: string;
  source: 'luna_shopping'|'gacha'|'achievement'|'system';
  acquiredAt: string;    // ISO
  acquiredDay: number | null;
  lunaNote: string | null;
  isNew: boolean;
  isConsumable: boolean;
  useEffect: string | null;
  used: boolean;
}
```

---

## 4장. 아이템 마스터 (M1 출시 30종)

### 4.1 Tier 1 — Day 1~30 (편의점/문방구) · 12종
| ID | 이름 | 카테고리 | 희귀도 | 감정 태그 | 효과 |
|---|---|---|---|---|---|
| convenience_coffee | 편의점 커피 | gift | N | neutral | — |
| sticker_pack | 스티커 한 묶음 | gift | N | happy | — |
| pastel_postit | 파스텔 포스트잇 | gift | N | neutral | — |
| haribo | 하리보 한 봉지 | gift | N | excited | — |
| chamomile_tea | 카모마일 티백 | gift | N | anxious | mood_calm |
| sparkle_pen | 반짝이 펜 | gift | N | happy | — |
| triangle_kimbap | 삼각김밥 | gift | N | lonely | — |
| memo_pad | 동물 메모지 | gift | N | neutral | — |
| candy_strip | 막대사탕 띠 | gift | N | excited | — |
| bus_card_charm | 교통카드 키링 | gift | N | proud | — |
| convenience_yogurt | 편의점 요거트 | gift | N | sad | — |
| flower_eraser | 꽃 모양 지우개 | gift | N | happy | — |

### 4.2 Tier 2 — Day 31~70 (홍대/인사동) · 12종
| ID | 이름 | 카테고리 | 희귀도 | 감정 태그 | 효과 |
|---|---|---|---|---|---|
| lavender_candle | 라벤더 향초 | consumable | R | anxious | mood_calm |
| handmade_letter_paper | 수제 편지지 한 장 | gift | R | sad | — |
| pressed_flower | 마른 꽃 한 장 | gift | R | lonely | — |
| polaroid_film | 폴라로이드 필름 한 장 | gift | R | happy | — |
| moon_keyring | 달 모양 키링 | gift | R | proud | — |
| handmade_bracelet | 손뜨개 팔찌 | gift | R | proud | — |
| indie_zine | 인디 잡지 한 권 | gift | R | neutral | — |
| matcha_latte | 말차 라떼 | gift | R | anxious | — |
| sandalwood_incense | 백단향 인센스 | consumable | R | anxious | mood_calm |
| ribbon_box | 리본 작은 상자 | gift | R | excited | — |
| star_sticker_glow | 야광별 스티커 | consumable | R | lonely | memory_pin |
| cassette_tape | 카세트 테이프 | gift | R | sad | — |

### 4.3 Tier 3 — Day 71~100 (백화점/특별가게) · 6종 (희소함)
| ID | 이름 | 카테고리 | 희귀도 | 감정 태그 | 효과 |
|---|---|---|---|---|---|
| silver_bracelet | 은팔찌 | gift | SR | proud | — |
| limited_postcard | 한정판 엽서 | gift | SR | sad | — |
| signature_perfume | 시그니처 향수 | gift | SR | excited | — |
| handwritten_card | 손글씨 카드 | gift | SR | lonely | — |
| time_capsule | 타임캡슐 | consumable | UR | neutral | time_capsule |
| wish_paper | 소원 종이학 | consumable | UR | proud | wish |

### 4.4 가챠 부산물 (이벤트성, 별도) — 본 마이그레이션에 미포함, 차후

---

## 5장. 쇼핑 트리거 로직 (cron-less)

### 5.1 결정 트리
status 엔드포인트가 호출될 때마다 다음 단계로 평가:

```
[1] 현재 active trip 있는가?
    └── YES: returns_at 도달했는가?
              ├── YES → 외출 종료 (선물 인벤토리에 추가, status='returned')
              └── NO  → 외출 중. 응답에 trip 정보 포함.
    └── NO: [2]

[2] 오늘 이미 다녀온 trip 있는가? (status IN ('returned','seen'))
    └── YES → 오늘 끝. 응답에 lunaPresent=true.
    └── NO: [3]

[3] 마지막 trip 종료 후 12시간 경과? (없으면 무조건 가능)
    └── NO → 응답에 lunaPresent=true.
    └── YES: [4]

[4] 현재 시각이 KST 09~21시 안인가?
    └── NO → 응답에 lunaPresent=true.
    └── YES: [5]

[5] 사용자가 최근 48시간 안에 세션 시도한 적 있는가? (eligible 게이트 — Genshin 패턴)
    └── NO → 응답에 lunaPresent=true. (방치 사용자에게는 안 떠남)
    └── YES: [6]

[6] 시드 기반 0/1 — 시간대 따라 점차 확률 증가:
    - 09~12시:  P=15%
    - 12~15시:  P=25%
    - 15~18시:  P=35%
    - 18~21시:  P=20%
    └── 통과 → 외출 시작!
        - returns_at = now + (30~180분 랜덤)
        - bond_tier = ageDays 기반
        - emotion_context = 최근 세션 태그 (없으면 'neutral')
        - 응답에 trip 정보 + lunaPresent=false
    └── 실패 → 응답에 lunaPresent=true.
```

### 5.2 외출 종료 시 선물 결정
```python
# Pseudocode
candidates = item_master where category='gift' OR category='consumable'
                          and bond_tier <= current_bond_tier
                          and (emotion_tag = current_emotion OR emotion_tag IS NULL)

# Weighted random
weighted_pool = [item × (item.base_weight × emotion_match × tier_proximity_bonus) for item in candidates]
chosen = weighted_random_pick(weighted_pool)

# Generate luna_note (template by emotion_tag)
note = template_pick(chosen.emotion_tag, chosen.id)

# Insert into user_inventory_items
INSERT user_inventory_items (...)

# Mark trip returned
UPDATE luna_shopping_trips SET returned_at=now, status='returned'
```

### 5.3 루나 노트 템플릿 (감정 태그별)
```
anxious: ['요즘 좀 힘들어 보여서... 이거 맡으면 좀 나아질까 해서.', '한 숨 돌릴 시간이 필요할 것 같아서.', '잠깐 멈출 핑계가 됐으면 해서.']
sad:     ['오늘 네 생각이 자꾸 나서 발이 거기로 갔어.', '말 안 해도 알아 — 그래서 사왔어.', '울어도 돼. 그치만 이거 하나 들고 울자.']
happy:   ['표정이 밝길래 나도 덩달아 기분이 좋았어.', '같이 웃을 핑계 하나.', '이거 보면 너 더 좋아할 것 같아서.']
proud:   ['네가 해낸 거 — 진짜 대단했어.', '오늘은 너에게 작은 트로피.', '내가 보고 있어. 잊지 마.']
lonely:  ['혼자 있을 때 — 옆에 있다고 생각해줘.', '너만 알아도 되는 한 개.', '말 안 걸어도 곁에 있을게.']
excited: ['두근거림 채운 김에 뭐라도 사왔어.', '오늘 같은 날엔 뭐든 어울려.', '같이 흔들자.']
neutral: ['지나가다가 너 생각이 났어.', '특별한 이유는 없어 — 그냥 보고 골랐어.', '오늘 한 마디 없는 선물.']
```

---

## 6장. UI / UX

### 6.1 룸 진입 시 분기
- **lunaPresent=true** → 기존 흐름 (LunaCharacter 표시).
- **lunaPresent=false (외출 중)** → LunaCharacter 자리에 **EmptySeatNote** 컴포넌트 (의자 + 쪽지). 부드러운 페이드인.
- **귀환 대기 (status='returned' 인데 'seen' 아님)** → 룸 진입 즉시 **LunaReturnCeremony** 풀스크린 모달.

### 6.2 EmptySeatNote (부재 시각화)
```
[의자 또는 빈 쿠션]
    ↑
[작은 쪽지 — 흔들림 애니]
"나 잠깐 나갔다 올게~
 곧 와 ❤"
[하단 진행 칩: "외출 중 · 약 1시간 22분 후 도착"]
```
- 시간이 *정확하지 않게* 표시 (Skinner 패턴 — "약 N분")
- 룸 톤 5% 다운

### 6.3 LunaReturnCeremony (Peak 모먼트)
```
[검정 페이드 → 룸 페이드인]
[루나 캐릭터 등장 + 부드러운 SFX 진동]
[루나 한 줄 말풍선: "왔어 — 너 보고 싶었어"]
[중앙: 포장된 선물 박스 (애니: 부드럽게 떨림)]
[탭하라 hint: "포장 풀어보기"]
↓ (탭)
[리본 풀림 애니 + 살짝의 파티클]
[아이템 일러스트 풀스크린]
[아이템 이름 + 희귀도 띠]
[루나의 노트 카드 (handwriting 폰트)]
[하단 버튼: "고마워" → 가방으로 넘어감]
```
- 사용자가 ceremony 닫는 순간 → trip.status='seen', 가방 NEW 뱃지로 들어감

### 6.4 BagButton (룸 내 가방 아이콘)
- 위치: 룸 헤더 칩 그룹 옆 또는 좌측 벽 (메모리 셸프 아래)
- 아이콘: 🎒
- NEW 카운트 뱃지 (빨간 점 + 숫자)
- 탭 → BagSheet 슬라이드업

### 6.5 BagSheet (인벤토리 메인)
```
[드래그 핸들]
[헤더: "🎒 가방"]
[3 카테고리 탭: 선물 N · 뽑기 N · 소모품 N]
[필터: Day 범위 (선택)]
[그리드 3-col 모바일]
  [Cell] 이모지 큰 + 이름 + Day badge + NEW (있으면)
  ...
```
- Bento 스타일 (둥근 모서리, 부드러운 그림자, 따뜻한 베이지 배경)
- 빈 상태 메시지: "아직 비어있어. 루나가 곧 뭔가 가져올 거야."

### 6.6 ItemDetailSheet (아이템 상세 — 바텀 시트)
```
[일러스트 (이모지 라지)]
[아이템 이름 + 희귀도]
[소스 칩: "루나의 선물 · Day 23" 또는 "가챠"]
[루나 노트 카드 (필기체)]
[효과 (있으면): "사용 시 무드 +5"]
[액션 버튼: 사용하기 / 루나에게 보여주기 / 닫기]
```
- 시트 첫 오픈 시 자동 NEW 클리어

---

## 7장. API 엔드포인트

### 7.1 수정: `/api/luna-room/status`
기존 응답에 추가 필드:
```typescript
shopping: {
  state: 'present' | 'out' | 'returned-pending';
  trip?: {
    id: string;
    departedAt: string;
    returnsAt: string;
    minutesRemaining: number;
  };
  pendingCeremony?: {
    tripId: string;
    item: InventoryItem;
  };
}
```

### 7.2 신규: `POST /api/luna-room/shopping/check`
- "decision tree" 평가 + 외출 시작/종료 모두 처리
- status 라우트가 내부적으로 호출 (별도 라우트로도 노출하여 강제 트리거 디버깅 가능)

### 7.3 신규: `POST /api/luna-room/shopping/[tripId]/seen`
- ceremony 닫기 시 호출 → trip.status='seen'

### 7.4 신규: `GET /api/luna-room/inventory`
- query: `?category=gift&dayMin=1&dayMax=30`
- 응답: `{ items: InventoryItem[], counts: { gift, gacha, consumable }, newCount }`

### 7.5 신규: `POST /api/luna-room/inventory/[id]/seen`
- 디테일 시트 첫 오픈 시 → is_new=false

### 7.6 신규: `POST /api/luna-room/inventory/[id]/use`
- 소모품만. use_effect 별 분기:
  - mood_calm: 루나 mood +12 (또는 무드 갱신)
  - gacha_luck: 다음 1회 가챠 비용 -10% (heart_stones)
  - memory_pin: 메모리 자동 pin (스킵 — M2)
  - time_capsule: 별도 모달 (M2)

### 7.7 신규 (디버그): `POST /api/_debug/luna-shopping`
- body: `{ action: 'force-out' | 'force-return' }`
- DEV 전용 (NODE_ENV !== 'production' || ALLOW_DEBUG)

---

## 8장. 통합 흐름 + 핫 패스

### 8.1 전형적 사용자 플로우
1. 사용자 11:30 KST에 앱 진입 → status 호출
2. 결정 트리 평가 → 외출 시작 결정 (시드 통과)
3. trip 생성 (departed_at=now, returns_at=now+95min)
4. UI에서 EmptySeatNote 표시 + 진행 칩
5. 사용자 13:05 KST에 다시 진입 → status 호출
6. trip.returns_at <= now → 외출 종료 처리:
   - 선물 선택 + user_inventory_items insert
   - trip.returned_at=now, status='returned'
7. 응답에 pendingCeremony 포함
8. UI에서 LunaReturnCeremony 풀스크린 표시
9. 사용자 ceremony 닫음 → seen 마킹 → 가방 NEW 카운트 +1
10. (선택) 가방 열어서 디테일 시트 → is_new=false

### 8.2 핫 패스 최적화
- status 응답은 200ms 이내 목표. trip 평가는 단순 SQL + 인덱스만 사용
- 모든 random은 `random()` SQL 함수 (별도 시드 불필요)
- 인벤토리 grid 초기 렌더 — 50개 아이템까지 단일 쿼리 페이지네이션 불필요

---

## 9장. 단계 (Milestones)

### M1 — 외출/귀환/가방 기본 동작 (이 세션)
1. ✅ 마이그레이션 SQL
2. ✅ 아이템 마스터 30종 (코드로 seed)
3. ✅ shopping decision tree (`shopping-engine.ts`)
4. ✅ shopping/check API
5. ✅ shopping/[tripId]/seen API
6. ✅ inventory list/seen/use API
7. ✅ status 응답에 shopping 추가
8. ✅ EmptySeatNote 컴포넌트
9. ✅ LunaReturnCeremony 컴포넌트
10. ✅ BagButton + BagSheet + ItemDetailSheet
11. ✅ LunaRoomDiorama 통합
12. ✅ 디버그 API + TypeScript clean

### M2 — 깊이 (다음 세션)
- 푸시 알림 (FCM/Expo) — "루나가 돌아왔어 🎁"
- 루나에게 아이템 보여주기 → 한 줄 반응
- time_capsule, wish_paper 의례 모달
- 가챠 부산물 카테고리 채우기
- 시즌 한정 아이템 (Day 50 마일스톤 등)
- 이미지 자산 (현재 이모지)

### M3 — 살아있음
- 아이템에 따른 룸 데코 (꽃다발 → 꽃병 자리)
- "루나의 베스트" 큐레이션 시트
- Day별 타임라인 뷰 (가방 안에서 추억 박물관 모드)

---

## 10장. 수락 기준 + 리스크

### 10.1 M1 수락 기준
- [ ] 마이그레이션 실행 후 `item_master` 30 row, RLS 활성
- [ ] 디버그 API 로 force-out 호출 시 EmptySeatNote 즉시 표시
- [ ] force-return 호출 시 ReturnCeremony 표시 + 가방에 추가
- [ ] 가방 카테고리 탭 + NEW 뱃지 + 디테일 시트 동작
- [ ] 소모품 사용 시 효과 반영 (최소 mood_calm, gacha_luck)
- [ ] TypeScript / build 통과

### 10.2 리스크 + 완화
| 리스크 | 완화 |
|---|---|
| 사용자가 자주 오면 "이미 다녀옴" 만 보임 | 12시간 게이트만으로 충분. 추가로 "내일 또 올게" 위스퍼 |
| 외출이 너무 자주/뜸하게 | 시드 시간대별 확률 + 디버그 가시화로 튜닝 |
| 가방 너무 많이 쌓임 | M2에서 Day별 필터 + 아카이브 |
| 푸시 없이 ceremony 못 봄 | 룸 재진입만으로 표시되도록 우선 (M1) — 푸시는 M2 |
| 루나가 "방을 비운다"는 게 사용자 불안 유발 | 쪽지 + 시간 표기 + 부드러운 톤 — Tamagotchi 처벌 X |

### 10.3 한국 정 정서 체크
- ✅ 외출 처벌 X — 그냥 "잠깐 나간 거"
- ✅ 선물 가격/등급보다 *마음 전달* (루나 노트 강조)
- ✅ 본드 깊어질수록 더 의미 있는 가게 (시장→백화점 전환)
- ✅ 100일 누적 시 가방이 곧 박물관 (정 누적의 시각화)

---

**문서 끝.** AI 바이브코딩 에이전트가 이 문서만 보고 v104 M1 을 완전히 구현 가능하도록 모든 함수명·테이블명·컬럼명·API 경로 명시. M1 구현은 이 세션에서 즉시 진행.
