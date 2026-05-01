# 정령 컴패니언 시스템 v103 — 설계 계획서
**버전**: 2026-05-02 (v103)
**전제 작업**: v102 (Revelation, 비밀 이야기 3-Layer)
**목표**: 21마리 정령을 "수집 카드"가 아니라 "내 안의 작은 친구들"로 진화시킨다. 루나만큼 깊지는 않지만, **만나고 → 데려가서 같이 두고 → 시간 지나며 변하고 → 비밀이 풀리는** 감성. 컴페니언 앱(Kindroid/Nomi)·인기 가챠(WuWa/HSR)·IFS 치료앱·OSS(OpenHer/Resonant/AI-tamago)에서 검증된 패턴들을 한국 *정(情)* 정서에 맞게 통합.

---

## 1장. 진단 — 지금 무엇이 살아 있고, 무엇이 죽어 있나

| 영역 | 현재 상태 | 평가 |
|---|---|---|
| 가챠/뽑기 | ✅ 완전 동작 (v83 + v102 + 중복 XP v103.0) | OK |
| 비밀 이야기 3-Layer (L1/L2/L3) | ✅ 동작 (Bond+Day 듀얼 게이트) | OK |
| 정령 마스터 데이터 (성격/능력) | ✅ 21마리, 단 정적 텍스트뿐 | 빈약 |
| 본드 다이얼로그 (5단계×20정령) | ✅ 데이터 존재 | 표시 화면 없음 |
| `interactions.ts` 페어 대화 11개 | ❌ **데이터만 있고 호출되지 않음** | 죽은 코드 |
| `room_state.placed_spirits` JSON | ✅ 컬럼 있음 | **읽지도 그리지도 않음** |
| "같이 놀면 좋은 친구" 카드 | ✅ DEX 시트에 표시 | **버튼/액션 없음 — 안내문만** |
| 무드/감정 기반 정령 추천 | ❌ 없음 | 부재 |
| 정령 자체 무드/시간 흐름 | ❌ 없음 (정적 카드일 뿐) | 부재 |
| 정령 캐릭터 카드(personality.md) | ❌ 없음 | 부재 |

핵심 결함은 단 한 줄로 요약된다 — **정령은 "방에 둘 수 있다"고 말하지만, 실제로는 둘 수 없다.** 본 계획은 이 한 줄을 해소하면서, "둘 수 있다"의 깊이를 *루나의 8할 수준*까지 끌어올린다.

---

## 2장. 비전 — 정령이 살아있다는 느낌의 정의

> **"앱을 꺼도 그 작은 친구는 그 자리에 있다."**

루나는 100일을 살고 죽는 *주인공*이다. 정령은 그 옆에 머무는 *작은 인격들*이다. 우리가 추구하는 7가지 살아있음의 신호:

1. **시간이 흐른다** — 안 만나면 무드가 가라앉고, 자주 만나면 환해진다 (벌하지 않되 기억은 한다).
2. **자기 동기로 움직인다** — 일정 조건에서 정령이 먼저 한 줄을 건넨다 (Kindroid Thought Bubble 패턴).
3. **자기 친구가 있다** — 정령끼리 페어 대화. 지금 죽어있는 `interactions.ts` 부활.
4. **나를 기억한다** — 각 정령마다 *간단한 기억 노드 5~10개*가 쌓이고 시각화된다 (Nomi MindMap 라이트).
5. **고유한 결을 가진다** — Drive Profile 5축으로 *프롬프트가 아니라 행동*에서 차이가 난다 (OpenHer).
6. **비밀이 풀린다** — Cherished Fragment 3~5개가 본드 따라 단계적 공개 (WuWa 모델).
7. **변형한다** — Lv5 + 모든 비밀 해제 시 "burdened → unburdened" 시각/대사 호 (IFS 치료 패턴).

**정도(intensity) 가이드라인**: 루나는 항상 풀-LLM, 1인칭 강한 감정. 정령은 70% 짧은 정적/조합 텍스트 + 30% 가벼운 LLM. 음성/이미지 없음. 수다스럽지 않음. **"옆에 있어주는 정도"가 정령의 기본 톤**.

---

## 3장. 코어 메커니즘 4종

### 3.1 Drive Profile (성격의 근원, OpenHer 차용)

각 정령은 5축 0~100 스코어를 갖는다:

| 축 | 의미 | 행동 영향 |
|---|---|---|
| **Connection** | 가까이 있고 싶음 | 인사가 따뜻함, 자주 말을 건다 |
| **Novelty** | 새로움/변화 추구 | 같은 말 반복 안 함, 화제 변경 |
| **Expression** | 자기를 드러냄 | 감정을 직접 말함 (vs 돌려 말함) |
| **Safety** | 안전 욕구 | 깊은 비밀 늦게 풀림, 조심스러움 |
| **Play** | 가벼움/장난기 | 농담/이모지 빈도 |

이 5축은 *프롬프트 형용사가 아니라 분기 조건*이다. 예: 정령 응답을 고를 때 `safety > 70` 이면 "조심스러운" 풀에서, `play > 70` 이면 "장난스러운" 풀에서 뽑는다. 본드가 오르면 일부 축이 천천히 변한다 (특히 Safety는 본드가 오르면 +5씩 상승해 점차 더 솔직해짐).

### 3.2 Mood Decay (시간 흐름)

`mood_value` (0~100, 기본 60)를 server-side로 계산:
- **방문(상호작용)**: +12
- **방치 1일당**: -3 (최저 20에서 멈춤 — 정령은 죽지 않음, inQubi 원칙)
- **본드 Lv 보너스**: 매 레벨당 baseline +5 (Lv5는 +25)

표시:
- mood ≥ 75: ✨ 환함 (대사 풀: bright)
- 50 ≤ mood < 75: 보통 (neutral)
- 30 ≤ mood < 50: 조용함 (quiet)
- mood < 30: 가라앉음 (withdrawn) — *처벌이 아니라 그리움 톤*

UI는 점이 켜진/꺼진 정도로만 표현 (숫자 노출 X — *정 정서*에 맞게).

### 3.3 Mind Map (정령이 나를 기억하는 흔적)

각 정령당 노드 최대 10개. 노드는 다음에서 자동 추출:
- 첫 만남 (Day, 그날 루나 무드)
- 본드 레벨업 시 (XP 임계 도달 시점)
- 비밀 해제 시 (L2/L3 풀린 순간)
- 사용자가 그 정령을 *방에 같이 두던 날* 루나가 어떤 감정 세션을 했는지
- 사용자가 직접 추가한 메모 (1~3개 슬롯)

표시: 정령 디테일 시트 안 작은 **"별자리(constellation) 뷰"** — 노드는 별, 본드 레벨 따라 별이 점점 *선명해진다*. 본드 1: 흐릿한 점. 본드 5: 선명한 별 + 노드 간 선이 그려짐.

### 3.4 Cherished Fragments (간직한 조각, WuWa 차용)

각 정령마다 3개 작은 상징 오브젝트. 본드 Lv 1/3/5 에서 1개씩 해제. 탭하면 짧은 회상 (2~3문장). 본드 낮을 때는 *흐린 실루엣*으로만 보임 — 보이긴 하지만 못 만진다 (예고편 효과).

예) 슬프니의 Fragment:
- F1 (Lv1): 작은 손수건 — "한 번만 쓰고 접어둔."
- F2 (Lv3): 마른 꽃잎 한 장 — "이름을 기억하는 사람의 이름."
- F3 (Lv5): 빈 종이 한 장 — "쓰지 못한 한 줄."

---

## 4장. 데이터 모델

### 4.1 마이그레이션 `20260503_v103_spirit_companion.sql`

```sql
-- (a) 정령별 무드/시간 상태
alter table user_spirits
  add column if not exists mood_value int default 60 check (mood_value between 0 and 100),
  add column if not exists mood_updated_at timestamptz default now(),
  add column if not exists last_visited_at timestamptz,
  add column if not exists is_placed_in_room boolean default false,
  add column if not exists placed_at timestamptz;

-- (b) 정령별 동적 Drive (baseline 은 코드 데이터, current 는 본드 따라 변동)
alter table user_spirits
  add column if not exists drives_current jsonb;

-- (c) Cherished Fragment 해제 추적 (배열, 인덱스 0/1/2)
alter table user_spirits
  add column if not exists fragments_unlocked int[] default '{}';

-- (d) 정령 Mind Map 노드
create table if not exists spirit_mind_map_nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  spirit_id text not null,
  node_type text not null check (node_type in ('first_meet','bond_up','secret_unlock','room_session','user_note')),
  label text not null,
  detail text,
  related_session_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_mind_map_user_spirit
  on spirit_mind_map_nodes (user_id, spirit_id, created_at desc);

-- (e) 정령 페어 인터랙션 로그 (이미 본 대화 중복 방지)
create table if not exists spirit_pair_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pair_key text not null,
  dialogue_index int not null,
  fired_at timestamptz not null default now()
);
create index if not exists idx_pair_interactions_user
  on spirit_pair_interactions (user_id, fired_at desc);

-- RLS 정책 (본인만)
alter table spirit_mind_map_nodes enable row level security;
create policy "mind_map_self" on spirit_mind_map_nodes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table spirit_pair_interactions enable row level security;
create policy "pair_interactions_self" on spirit_pair_interactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### 4.2 코드 데이터 (정적)
- `src/data/spirit-drive-profiles.ts` — 21정령 baseline drive
- `src/data/spirit-cherished-fragments.ts` — 21×3 조각 텍스트

---

## 5장. 21마리 Drive Profile (요약 — 풀버전은 코드)

| 정령 | C | N | E | S | P | 한 줄 인격 |
|---|---|---|---|---|---|---|
| 새싹이 | 80 | 70 | 65 | 55 | 75 | 처음의 기쁨 |
| 슬프니 | 60 | 25 | 40 | 80 | 15 | 조용한 위로 |
| 도깨비 불꽃 | 35 | 80 | 90 | 20 | 60 | 다 태워주는 분노 |
| 북이 | 50 | 60 | 70 | 45 | 80 | 박자가 흔들리면 함께 흔들 |
| 책벌레 노리 | 45 | 65 | 30 | 75 | 25 | 머리로 견디는 친구 |
| 평화비둘기 | 90 | 30 | 50 | 70 | 40 | 먼저 손 내미는 |
| 구름토끼 미미 | 60 | 50 | 40 | 60 | 90 | 가벼움의 잠깐 |
| 산들이 | 55 | 75 | 35 | 50 | 65 | 환기시켜주는 |
| 편지요정 루미 | 70 | 40 | 80 | 65 | 30 | 못한 말 대신 써줌 |
| 로제 | 75 | 60 | 70 | 40 | 70 | 두근거림 그 자체 |
| 광대 할리 | 50 | 85 | 75 | 35 | 95 | 다른 사람 자리에 서봄 |
| 숲 엄마 | 95 | 25 | 55 | 90 | 35 | 늘 거기 있는 |
| 달빛토끼 | 65 | 40 | 55 | 70 | 35 | 새벽 동무 |
| 벚잎이 | 70 | 50 | 65 | 50 | 50 | 예쁘게 슬픈 |
| 얼음왕자 | 30 | 35 | 25 | 95 | 20 | 살아남으려 얼린 |
| 번개새 핏치 | 45 | 95 | 80 | 25 | 70 | 결단의 찰나 |
| 변화나비 메타 | 60 | 90 | 60 | 55 | 60 | 자기를 다시 빚는 |
| 열쇠지기 클리 | 70 | 40 | 50 | 75 | 30 | 잊지 않으려 적은 |
| 여왕 엘레나 | 65 | 60 | 90 | 70 | 50 | 다시 일어선 |
| 별똥이 | 55 | 80 | 75 | 40 | 80 | 빌어진 한 마디 |
| 수호석 에디 | 100 | 50 | 70 | 100 | 45 | 모든 것이 모인 자리 |

(C=Connection, N=Novelty, E=Expression, S=Safety, P=Play. 0~100)

---

## 6장. 정령 페어 인터랙션 시스템 — *죽은 코드 부활*

### 6.1 트리거 조건
- 두 정령이 **같이 방에 placed** (`is_placed_in_room=true`)
- 두 정령 모두 **Bond Lv ≥ 4**
- 마지막 인터랙션 후 **30분 이상** 경과 (스팸 방지)
- 페어가 `INTERACTIONS` 테이블에 등록되어 있음 (현재 11쌍)

### 6.2 트리거 방법
1. **Pull 방식**: 사용자가 루나 룸 진입 시 `GET /api/spirits/interactions/check` 호출
2. **응답**: 한 페어/한 다이얼로그 인덱스, 또는 null
3. **UI**: 정령 스프라이트 위에 *말풍선 2개 순차 출력* (1.5초 간격)

### 6.3 같은 다이얼로그 중복 방지
`spirit_pair_interactions` 로그를 검사. 본 대화는 7일 동안 다시 안 나옴.

### 6.4 새 API
- `GET /api/spirits/interactions/check` → `{ pairKey, a:{spiritId,line}, b:{spiritId,line} } | null`
- `POST /api/spirits/interactions/seen` → `{ pairKey, dialogueIndex }` 본 것 기록

---

## 7장. UI/UX

### 7.1 SpiritDetailSheet 개편
지금: 친구 추천 텍스트만.
이후:
- **"같이 놀러두기"** CTA 버튼 (본드 ≥ 4 활성)
- 누르면: `POST /api/room/placement` 로 두 정령 placed=true 토글, 토스트로 "방에 배치됐어요" 알림
- 본드 < 4 면 회색 + "Bond 4 이상 필요"
- 친구 카드 위에 **현재 무드 점등 아이콘** (✨/●/○) 미니 표시

### 7.2 LunaRoomDiorama 확장
- 새 레이어 `<SpiritsLayer />` — placed 정령들을 부유하는 16~24px 스프라이트로 그림
- 좌측 상단 "오늘 같이 있는 친구 N마리" 칩 → 누르면 placed 목록 시트
- 인터랙션 발화 시 정령 스프라이트 위 말풍선 1.5초 등장 (Framer Motion spring)
- mood < 30 정령은 **반투명** (조용함의 시각화)

### 7.3 Mind Map 별자리 뷰
- SpiritDetailSheet 안 새 탭 "기억" 추가
- 검은 배경에 별 점들이 본드 레벨 따라 점점 선명해짐
- 별 클릭 → 노드 라벨 + 디테일 표시
- 사용자 메모 추가 버튼 (최대 3개)

### 7.4 Cherished Fragments 행
- SpiritDetailSheet 하단에 가로 3슬롯
- 잠긴 슬롯: 흐린 실루엣 + "Lv N 에서"
- 풀린 슬롯: 작은 아이콘 + 회상 한 줄

---

## 8장. 무드 엔진 디테일

### 8.1 순수 함수 `computeSpiritMood(state, nowMs)`
```ts
function computeSpiritMood(s: { mood: number; lastVisitMs: number; bondLv: number }, nowMs: number) {
  const daysSince = Math.max(0, (nowMs - s.lastVisitMs) / 86400000);
  const decay = Math.floor(daysSince) * 3;
  const baseline = 40 + s.bondLv * 5; // Lv1=45, Lv5=65
  const decayed = Math.max(20, s.mood - decay);
  return Math.round(decayed * 0.7 + baseline * 0.3);
}
```
방문 시 `mood += 12, lastVisitMs = now`.

### 8.2 표시 무드 → 톤 매핑
| 무드 | 키 | 인사 풀 |
|---|---|---|
| ≥75 | bright | "와 — 너 왔구나, 오늘은 햇살이 들어." |
| 50-74 | neutral | "응. 조용히 있을게, 옆에서." |
| 30-49 | quiet | "…" + 짧은 한 마디 |
| <30 | withdrawn | "오랜만이야." (처벌 X, 그리움 톤) |

본드 5 + 무드 ≥ 75 일 때만 *고유 정령별 친밀 인사* 출력 (드물어야 귀하다).

---

## 9장. 구현 단계 (Milestones)

### M1 — *최소 동작 부활* (이 세션 목표)
1. ✅ 마이그레이션 작성 (`20260503_v103_spirit_companion.sql`)
2. ✅ Drive profile 21 데이터 (`spirit-drive-profiles.ts`)
3. ✅ Cherished fragments 21×3 데이터 (`spirit-cherished-fragments.ts`)
4. ✅ 무드 엔진 (`src/lib/spirits/mood-engine.ts`)
5. ✅ 인터랙션 체크 API (`/api/spirits/interactions/check`)
6. ✅ 인터랙션 본 것 기록 API (`/api/spirits/interactions/seen`)
7. ✅ "같이 놀러두기" CTA + `/api/spirits/[id]/place` 토글 API
8. ✅ Spirit list 응답에 mood + drive + fragments 포함
9. ✅ SpiritDetailSheet — CTA 버튼 + 무드 점등 + Cherished Fragment 행
10. ✅ TypeScript clean

### M2 — *방에 정령 그리기* (다음 세션)
- LunaRoomDiorama `<SpiritsLayer />`
- 인터랙션 말풍선 등장 애니메이션
- "오늘 같이 있는 친구 N마리" 칩
- Mind Map 별자리 뷰
- mood<30 반투명 처리

### M3 — *살아있음의 깊이* (그 다음)
- 본드 레벨업/비밀 해제 시 자동 Mind Map 노드 추가
- 정령 첫 만남 노드 자동 생성
- 사용자 메모 노드 (최대 3개)
- 가벼운 LLM 인사 (Bond5+무드75 일 때만)
- Burdened → Unburdened 시각 호 (Lv5 + 모든 fragment 해제)

### M4 — *프로액티브* (먼 미래)
- 일정 조건 시 정령 → 사용자 한 줄 (작은 토스트)
- "이 친구가 너에게 인사를 남겼어요" 룸 알림 점

---

## 10장. 수락 기준 + 미해결 이슈

### 10.1 M1 수락 기준
- [ ] DEX 시트에서 본드4+ 정령에 "같이 놀러두기" 버튼 동작
- [ ] 두 정령 placed 시 `/api/spirits/interactions/check` 가 페어 대화 반환
- [ ] 무드값이 `user_spirits.mood_value` 에 저장되고 `last_visited_at` 갱신
- [ ] Cherished fragment 슬롯 3개가 본드 레벨에 따라 풀려서 표시됨
- [ ] TypeScript / build 통과
- [ ] 디버그 페이지에서 day/bond 조정으로 검증 가능

### 10.2 미해결 이슈
- **퍼포먼스**: placed 정령 많을수록 mood 계산 N번. 처음엔 클라이언트 일괄 계산으로 충분
- **"먼저 말 거는" 정도**: 너무 많으면 시끄럽고 적으면 죽은 듯. M2 에서 *주1회 상한* 부터 시작
- **루나와의 위계**: 정령이 너무 표현적이면 루나가 작아 보임. *짧은 텍스트 + 음성 없음 + 감정 강도 절제* 원칙 견지
- **Mind Map 노드 폭주**: 자동 생성 트리거 잘못 잡으면 한 정령 30+ 노드. 상한 10 + 오래된 것 자동 정리

### 10.3 한국 정 정서 체크리스트
- ✅ 무드 숫자 노출 X (점/별만)
- ✅ 방치 처벌 없음 (mood ≥ 20 floor)
- ✅ 본드 레벨업 폭죽 X — 다음 방문 때 *대사 톤이 살짝 바뀌어 있음* 으로만
- ✅ "공유한 시간"이 핵심 (방문/배치/같이 두기)
- ✅ 비밀은 사야 하는 게 아니라 *시간이 풀어준다*

---

**문서 끝.** 본 문서를 LLM 에이전트가 그대로 읽고 코드를 작성할 수 있도록 모든 함수명·테이블명·컬럼명을 명시해 두었음. M1 구현은 본 세션에서 즉시 진행.
