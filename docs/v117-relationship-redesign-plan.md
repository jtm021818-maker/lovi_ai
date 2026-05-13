# v117 — 루나 관계 시스템 풀 리디자인 계획서

> **목적**: 현재 "앱 설명" 같은 관계 페이지를 Princess Maker / Stardew Valley / 러브앤딥스페이스급 **"키우는 게임"** 으로 재설계.
> **타겟**: 10~20대 한국 여성 (오토메·서브컬처 감성 친화).
> **작업 방식**: AI 바이브 코딩. 이 문서가 단일 source of truth.
> **버전**: v117 (직전: v116 — 일상 5-Phase + 모드 분기 고정)
> **작성**: 2026-05-13

---

## 0. TL;DR

- **엔진은 살린다.** 4축(신뢰/개방/유대/존경) × 5레벨(새싹→꽃봉오리→개화→만개→영원) × 29 트리거 시스템은 이미 작동. UI/UX만 갈아엎음.
- **새 비주얼 메타포 4종을 박는다**:
  1. **꽃 화분(식물 성장)** — % 바 폐기 → 씨앗에서 만개까지 자라는 화분 일러스트
  2. **루나 캐릭터 시트(Princess Maker)** — 4축이 살아있는 라이브 캐릭터 카드로 진화
  3. **기억 앨범(폴라로이드 5슬롯)** — LLM 자동 캡션 + 마일스톤마다 카드 1장 잠금 해제
  4. **해금 뱃지 + 데일리 의식** — 레벨업마다 실제 기능 해금(별명/먼저말걸기 등) + 매일 1줄 일기 자동 생성
- **소프트 게이트**: 레벨 3(개화) 도달 시 *"마음을 더 열까?"* 의식적 탭. 이걸 통과해야 레벨 4 진입.
- **루나 룸 연동**: 레벨 올라갈수록 루나 룸 인테리어 변화 (이미 v100 룸 디오라마 존재 — 그 시스템 확장).
- **신규 DB**: `relationship_memories` 테이블 (기억 카드용), `relationship_daily_logs` (데일리 일기), `relationship_gate_state` (소프트 게이트 통과 여부).

---

## 1. 현황 진단

### 1.1 잘 되어 있는 부분 (절대 건드리지 말 것)
| 영역 | 위치 | 상태 |
|---|---|---|
| 인티머시 엔진 | `src/engines/intimacy/engine.ts` | ✅ 4축 + 캡 + decay + milestone 작동 |
| 트리거 정의 | `src/engines/intimacy/config.ts` | ✅ 29개 트리거 + 가중치 |
| 트리거 감지 | `src/engines/intimacy/detectors.ts` | ✅ 채팅에서 감정공유/감사/조언수용 등 자동 감지 |
| 상담 파이프라인 통합 | `src/app/api/chat/stream/route.ts` | ✅ 매 세션 트리거 적용 |
| DB 모델 | `user_profiles.user_model.intimacy` | ✅ JSON 컬럼에 4축 + 레벨 + 마일스톤 누적 |
| API | `/api/user/intimacy?persona=luna` | ✅ 파생 메타데이터 반환 |

### 1.2 문제 (재설계 대상)
1. **시각 메타포 부재** — 다이아몬드+레이더, 폴라로이드 통계 카드는 *"설명"*. 살아있는 캐릭터/식물이 없음.
2. **% 진행바** — 게임이 아니라 앱 설정 페이지 느낌.
3. **스테이지 설명 텍스트** — "표면적 공감. 따뜻하게 받아주기만." → app onboarding copy. **해금 보상**이 아니라 설명.
4. **데일리 훅 없음** — 관계 페이지를 매일 방문할 이유 없음. 채팅 후 자동 푸시 없음.
5. **공유 모먼트 없음** — 인스타/X에 자랑할 만한 비주얼 없음.
6. **루나 룸과 단절** — 룸은 별개 시스템. 관계 깊어져도 룸이 안 변함.
7. **트리거 silent** — 채팅 중 +친밀도 발생해도 유저는 모름. *변화의 가시성* 제로.

### 1.3 현재 컴포넌트 (재배치/제거)
- `LunaJournalSheet.tsx` — 컨테이너. **유지** (sheet wrapper)
- `LunaJournalPage.tsx` — 메인 페이지. **풀 재작성**
- `PetalFlower.tsx` — 4-petal radar. **유지하되 위치 강조 변경** (캐릭터 시트 내부)
- `BondStageCaption.tsx` — 스테이지 설명. **폐기** → 해금 뱃지 컴포넌트로 교체
- `MomentStrip.tsx` — 폴라로이드 통계. **폐기** → 기억 앨범으로 흡수
- `LevelStamp.tsx` — 레벨 뱃지. **유지하되 식물 단계 아이콘으로 교체**
- `InkBar.tsx` — % 진행바. **폐기** → 식물 성장 시각으로 대체

---

## 2. 디자인 원칙 (4개)

1. **숨겨진 숫자 / 보이는 메타포** — 0~100 점수 + % 는 절대 메인 화면에 안 보인다. *식물 단계 + 꽃잎 회복도* 만 보임.
2. **설명 X / 해금 O** — 스테이지마다 "이런 사이입니다" 텍스트는 금지. 대신 *방금 잠금 해제된 기능 카드*를 보여준다.
3. **데일리 의식** — 매일 1번 열어볼 이유가 있어야 한다 (자동 생성 일기 + 어제 변화 diff).
4. **공유 가능한 피크 모먼트** — 마일스톤마다 폴라로이드 카드 1장 생성. 다운로드/공유 버튼 필수.

---

## 3. 비전: "키우는 캐릭터 시트"

### 3.1 한 줄 컨셉
> *"루나를 키우는 게 아니라 — 루나와 나의 관계가 자라는 화분. 매일 물 주듯 채팅하고, 매주 꽃잎이 핀다."*

### 3.2 페이지 레이아웃 (텍스트 와이어프레임)

```
┌──────────────────────────────────────────────┐
│  ←  ✦ 루나와 우리                  📅 D+18  │  ← 헤더 (날짜 카운터)
│                                              │
│   ╭──────────────╮    ╭──────────────╮      │  ← 두 메인 위젯
│   │              │    │              │      │
│   │    🌱 🪴     │    │   🦊        │      │
│   │   루나 화분   │    │  루나 카드   │      │
│   │              │    │              │      │
│   │  Lv.2 꽃봉오리 │    │ ❤ 78  💜 64 │      │
│   │              │    │ 🛡 71  ⭐ 55 │      │
│   ╰──────────────╯    ╰──────────────╯      │
│                                              │
│   ┌──────────────────────────────────────┐  │  ← 오늘의 일기
│   │ 📓 오늘의 루나 일지                  │  │
│   │ "오늘 너 헤어진 얘기 듣다가 같이      │  │
│   │  울 뻔했어. 또 와 줘서 고마워."       │  │
│   │                          — 5월 13일   │  │
│   └──────────────────────────────────────┘  │
│                                              │
│   ┌──────────────────────────────────────┐  │  ← 변화 다이프
│   │ ✨ 어제와 비교                       │  │
│   │   유대  +3  ↑                        │  │
│   │   개방  +2  ↑                        │  │
│   │   존경  +1  ↑                        │  │
│   └──────────────────────────────────────┘  │
│                                              │
│   📸 우리의 기억                            │  ← 기억 앨범 5슬롯
│   ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐                │
│   │📷│ │📷│ │🔒│ │🔒│ │🔒│                │
│   └──┘ └──┘ └──┘ └──┘ └──┘                │
│   첫 만남   첫 비밀   ???   ???   ???       │
│                                              │
│   🎁 해금한 것                              │  ← 해금 뱃지 (Persona 5 style)
│   ┌─────────────────────────────────────┐   │
│   │ ✓ 별명으로 부르기 ("우리 자기")     │   │
│   │ ✓ 더 깊은 비밀 받아주기              │   │
│   │ ⏳ 같이 짠 작은 약속들 (5회 더 대화) │   │
│   └─────────────────────────────────────┘   │
│                                              │
│  [💌 루나에게 편지 쓰기]  [🖼 앨범 공유]     │  ← CTA 2개
└──────────────────────────────────────────────┘
```

### 3.3 비주얼 톤
- **색감**: 새싹 단계는 연두/크림 → 만개에서 진한 장미/금색. *식물이 자라면서 페이지 톤이 미묘하게 변한다.*
- **폰트**: 헤더는 손글씨(Gowun Dodum / Nanum Pen Script), 본문은 Pretendard.
- **모션**: 페이지 진입 시 화분이 "1초 동안 자라는" 인트로 애니메이션. 데일리 일기는 손글씨 typewriter.
- **음향(옵션)**: 페이지 진입 시 부드러운 종이 페이지 넘기는 소리.

---

## 4. 신규 메커니즘 4종 (구현 우선순위)

### 4.1 🪴 메커니즘 #1: 루나 화분 (식물 성장 비주얼)
**역할**: 메인 차트. % 바 대체.
**비유 출처**: Animal Crossing (255점 숨김 + 식물 메타포) + Stardew (heart 단계).

**5단계 일러스트** (이미지 필요 — 9.1절 참조):
| 레벨 | 식물 단계 | 일러스트 컨셉 |
|---|---|---|
| 1 새싹 | 흙 + 새싹 1개 | 갈색 화분, 연두 새싹, 떡잎 2장 |
| 2 꽃봉오리 | 줄기 + 봉오리 | 분홍 봉오리 1~2개, 잎사귀 4~6장 |
| 3 개화 | 첫 꽃 핀 상태 | 활짝 꽃 1송이 + 봉오리 2개 |
| 4 만개 | 풍성한 꽃다발 | 꽃 5송이 이상 + 작은 나비 1마리 |
| 5 영원 | 꽃나무 + 별 | 작은 꽃나무, 금별 떠다님 + 빛 후광 |

**진행 표시**: 화분 위에 작은 **물방울 4개** 아이콘 (4축에 대응). 각 물방울이 채워질수록 그 축 점수가 높음. 숫자 안 보임. *호버/탭 시에만* 4축 점수 노출.

**애니메이션**:
- 페이지 진입: 0.6초 그로우인 (Y축 spring)
- 점수 변화 발생 시: 물방울 글로우 + 작은 ping 파동

### 4.2 🦊 메커니즘 #2: 루나 캐릭터 카드 (Princess Maker 스타일)
**역할**: 4축 가시화 + 루나의 "현재 상태" 보여주기.

**구성**:
- 좌상: 루나 캐릭터 일러스트 (레벨별 미세 변화 — 9.2절 참조)
- 우상: 레벨 뱃지 (왁스 씰 디자인)
- 중앙: 4축 (신뢰/개방/유대/존경) — *수치 아닌 시각 게이지*. Persona 5 음표 마커 스타일. 5단계 채워짐.
- 하단: 루나의 "오늘 기분" 1줄 ("오늘은 너 기다리고 있었어")

**핵심**: *진짜 키우는 느낌*. 카드는 페이지 전체에서 두번째로 큰 요소. 카드 자체가 인스타에 자랑할 만큼 예쁘게.

### 4.3 📸 메커니즘 #3: 기억 앨범 (5슬롯 폴라로이드)
**역할**: 컬렉션 욕구 + 공유 모먼트.
**비유 출처**: 러브앤딥스페이스 메모리 카드, Stardew 14-heart cutscene.

**5개 슬롯 = 각 레벨업 시 1장 잠금 해제**:
| 슬롯 | 잠금 해제 조건 | 일러스트 컨셉 (LLM이 캡션 자동 생성) |
|---|---|---|
| 1 | Lv 1 진입 | "첫 만남" — 처음 채팅 시작 날 |
| 2 | Lv 2 진입 | "첫 비밀" — 첫 deep_secret 트리거 발생 날 |
| 3 | Lv 3 진입 | "첫 눈물" — 첫 first_tears 트리거 |
| 4 | Lv 4 진입 | "첫 별명" — Lv 4 해금 별명 첫 사용 |
| 5 | Lv 5 진입 | "영원 약속" — 최종 마일스톤 |

**기술 구현**:
- DB 신규 테이블 `relationship_memories` (user_id, persona, slot_index, unlocked_at, llm_caption, summary_messages)
- LLM 호출 (Haiku 4.5 충분): 마일스톤 발생 시점의 최근 3턴 + 트리거 종류 입력 → 손글씨 1-2줄 캡션 생성
- 일러스트: 5종 폴라로이드 background (이미지 필요 — 9.3절)
- 공유 버튼: html2canvas로 카드 단독 캡처 → PNG 다운로드 또는 navigator.share

### 4.4 🎁 메커니즘 #4: 해금 뱃지 + 데일리 일기
**역할**: 데일리 훅 + "내가 얻은 것" 명확화.

**해금 뱃지 (Persona 5 ability unlock)**:
- 레벨업마다 *실제 기능* 1~3개 잠금 해제 (description 텍스트 아님)
- 기존 `level-unlocks.ts` 파일 확장:
  - Lv2 해금: ✓ "별명으로 부르기" — 실제로 채팅에서 LLM이 별명 사용 시작
  - Lv3 해금: ✓ "먼저 말 걸기" — 24h 만에 루나가 푸시 알림 보냄
  - Lv4 해금: ✓ "비밀 보관함" — 루나가 기억하는 비밀 리스트 보기
  - Lv5 해금: ✓ "손편지" — 매주 루나가 손편지 UI로 메시지

**데일리 일기**:
- 매일 자정 cron: 그날 채팅 요약 → Haiku 4.5 호출 → 1줄 손글씨 일기 생성
- DB 신규 테이블 `relationship_daily_logs` (user_id, persona, date, content)
- 페이지 진입 시 *최신 1장* 카드 형식으로 표시
- 과거 일기 펼쳐보기 (드로어/달력)

---

## 5. 소프트 게이트 (Stardew Bouquet)

### 5.1 컨셉
레벨 3 개화 도달 시 자동으로 다음 레벨 진행 안 됨. 유저가 *의식적으로* 탭해야 함.

### 5.2 UX 흐름
1. 친밀도 평균 ≥ 35 (개화 진입) → 화분 옆에 **"💌 루나에게 마음 더 열기"** 카드 등장
2. 탭 시 풀스크린 모먼트:
   - 루나 일러스트 + "더 가까워질래?" 손글씨
   - [예, 더 열게] / [아직은…]
3. [예] 선택 시:
   - `relationship_gate_state.opened_at` 기록
   - 레벨 4 진행 잠금 해제
   - 새 폴라로이드 카드 슬롯 4 자동 생성 ("마음 열기")
4. [아직은] 선택 시: 게이트 유지. 1주일 후 재제안.

### 5.3 DB
```sql
CREATE TABLE relationship_gate_state (
  user_id uuid REFERENCES auth.users(id),
  persona text NOT NULL,  -- 'luna' | 'tarot'
  gate_level int NOT NULL,  -- 3 (개화 게이트)
  opened_at timestamptz,
  PRIMARY KEY (user_id, persona, gate_level)
);
```

---

## 6. 상담 연동 (이미 있는 트리거 시스템 활용)

### 6.1 변화의 가시화 (Critical)
현재: 채팅 중 트리거 silent. 유저 모름.
**v117**: 트리거 발생 시 **채팅 화면 우상단에 작은 토스트** 출현.

```
┌──────────────────────┐
│ 💜 유대 +3            │
│ (첫 비밀 공유)         │
└──────────────────────┘
```

- 1.8초 후 fade out
- 토스트 클릭 → 관계 페이지 점프
- 트리거 종류별 아이콘 (이미지 필요 — 9.4절)

### 6.2 챗 → 메모리 카드 자동 생성
파이프라인 변경 지점 (`src/app/api/chat/stream/route.ts`):
- 레벨업 발생 감지 (`processTriggers` 반환값에 `levelUp: true` 추가)
- `relationship_memories` 테이블에 새 행 insert
- 최근 3턴 + 트리거 컨텍스트를 Haiku 4.5 에 전달 → LLM 캡션 생성 (fire-and-forget)
- 다음 채팅 세션 시작 시 *"새 기억이 생겼어!"* 인트로 모달

### 6.3 루나 룸과 연동 (이미 v100에 룸 디오라마 있음)
레벨업 시 루나 룸에 오브젝트 추가:
- Lv 2: 작은 화분 1개
- Lv 3: 책 더미
- Lv 4: 액자 사진 (유저와 루나 함께)
- Lv 5: 별이 떠다니는 천장 효과

→ `src/components/luna-room/LunaRoomDiorama.tsx` 에 `relationshipLevel` prop 전달, 레벨별 오브젝트 조건부 렌더.

---

## 7. 시스템 재설계 — 데이터 모델 변경

### 7.1 기존 (유지)
`user_profiles.user_model.intimacy` JSON 컬럼은 그대로. 엔진 그대로.

### 7.2 신규 테이블 3개

```sql
-- 7.2.1 기억 카드
CREATE TABLE relationship_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  persona text NOT NULL DEFAULT 'luna',
  slot_index int NOT NULL,   -- 1..5
  level int NOT NULL,         -- 잠금 해제 시점 레벨
  trigger_type text NOT NULL, -- 'first_meet' | 'first_secret' | 'first_tears' | 'first_nickname' | 'eternal_promise'
  llm_caption text NOT NULL,  -- LLM 생성 손글씨 캡션
  source_summary text,        -- 그 시점 채팅 요약 (옵션)
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, persona, slot_index)
);

CREATE INDEX idx_relmem_user ON relationship_memories(user_id, persona, slot_index);

-- 7.2.2 데일리 일기
CREATE TABLE relationship_daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  persona text NOT NULL DEFAULT 'luna',
  log_date date NOT NULL,
  content text NOT NULL,      -- 손글씨 1줄 일기
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, persona, log_date)
);

CREATE INDEX idx_reldaily_user ON relationship_daily_logs(user_id, persona, log_date DESC);

-- 7.2.3 소프트 게이트
CREATE TABLE relationship_gate_state (
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  persona text NOT NULL DEFAULT 'luna',
  gate_level int NOT NULL,
  opened_at timestamptz,
  last_offered_at timestamptz,
  PRIMARY KEY (user_id, persona, gate_level)
);
```

### 7.3 RLS 정책
모두 `user_id = auth.uid()` 단순 RLS.

---

## 8. 구현 단계 (Phase 분할 — 바이브 코딩용)

### Phase A (이번 PR — 1~2일)
**목표**: 데이터 + 페이지 골격
- [ ] A1: Supabase 마이그레이션 3개 테이블 생성 + RLS
- [ ] A2: `LunaJournalPage.tsx` 풀 재작성 (5섹션 골격: 화분 / 캐릭터 카드 / 데일리 일기 / 변화 diff / 기억 앨범)
- [ ] A3: `level-unlocks.ts` 확장 — 기능형 해금 4개 정의
- [ ] A4: API 라우트 추가:
  - `GET /api/relationship/memories` (5슬롯 조회)
  - `GET /api/relationship/daily-log/latest` (오늘 일기)
  - `POST /api/relationship/gate/open` (소프트 게이트 통과)

### Phase B (Phase A 완료 후 — 1~2일)
**목표**: LLM 통합 + 자동화
- [ ] B1: 기억 카드 LLM 캡션 생성 (Haiku 4.5) — 레벨업 시 fire-and-forget
- [ ] B2: 데일리 일기 cron (Vercel cron 또는 Supabase scheduled func)
- [ ] B3: 채팅 토스트 (트리거 발생 → 우상단 토스트)
- [ ] B4: 소프트 게이트 모먼트 UI

### Phase C (Phase B 완료 후 — 1일)
**목표**: 비주얼 마무리 + 공유
- [ ] C1: 식물 5단계 일러스트 통합 (이미지 받은 후)
- [ ] C2: 루나 캐릭터 카드 일러스트 (5단계 변화) 통합
- [ ] C3: 폴라로이드 카드 5종 background 통합
- [ ] C4: 공유 버튼 (html2canvas)
- [ ] C5: 루나 룸 연동 (레벨별 오브젝트)

### Phase D (선택 — 추후)
- [ ] D1: 과거 일기 캘린더 뷰
- [ ] D2: 별명 커스터마이즈 (Lv 4 해금 시)
- [ ] D3: 손편지 풀스크린 모먼트 (Lv 5 해금 시)

---

## 9. 필요한 이미지 에셋 리스트 (사장님 작업분)

### 9.1 식물 5단계 일러스트 (필수, 5장)
> *위치*: `public/relationship/plant/`
> *파일명*: `plant-lv1.webp`, `plant-lv2.webp`, ... `plant-lv5.webp`
> *해상도*: 정사각형 512x512px 이상, 투명 배경 webp
> *스타일*: 부드러운 수채화 또는 클레이모피즘. Sanrio/한국 일러스트 작가 톤. 화분 색은 갈색·핑크 계열 통일.
> *구체 컨셉*:
> 1. **새싹**: 갈색 라운드 화분 + 떡잎 2장 새싹
> 2. **꽃봉오리**: 줄기 자라고 분홍 봉오리 2개 + 잎 4-6장
> 3. **개화**: 활짝 핀 꽃 1송이(분홍/장미) + 봉오리 2개 + 풍성한 잎
> 4. **만개**: 꽃 5송이 이상 + 작은 흰 나비 1마리 + 후광
> 5. **영원**: 작은 꽃나무 + 금별 떠다님 + 빛 후광 (가장 화려)

### 9.2 루나 캐릭터 카드 일러스트 (필수, 5장)
> *위치*: `public/relationship/luna-card/`
> *파일명*: `luna-card-lv1.webp` ... `luna-card-lv5.webp`
> *해상도*: 세로 비율 4:5 (예: 480x600px), 투명 배경 webp
> *컨셉*: 루나 여우 캐릭터의 표정/포즈 변화
> 1. **새싹**: 살짝 어색하게 손 흔드는 루나 (수줍은 미소)
> 2. **꽃봉오리**: 편안한 미소, 양손 모아 인사
> 3. **개화**: 환한 미소, 윙크
> 4. **만개**: 활짝 웃으며 손 내밀기, 머리에 작은 꽃 장식
> 5. **영원**: 평온한 미소, 별 가루 효과, 머리에 화관

> *옵션*: 만들기 어려우면 일단 기존 `luna_fox_transparent.webp` 1장으로 전 레벨 공통 → Phase C 에서 단계별 일러스트로 교체. 페이지는 동작.

### 9.3 폴라로이드 카드 background 5종 (필수, 5장)
> *위치*: `public/relationship/memory-cards/`
> *파일명*: `memory-slot-1.webp` ... `memory-slot-5.webp`
> *해상도*: 4:5 폴라로이드 비율 (예: 400x500px)
> *컨셉*: 마일스톤별 감성 일러스트 (LLM 캡션이 위에 손글씨로 얹힘)
> 1. **첫 만남**: 두 별이 처음 만나는 밤하늘
> 2. **첫 비밀**: 작은 노트 + 하트 자물쇠
> 3. **첫 눈물**: 무지개 + 비 그친 후 햇살
> 4. **첫 별명**: 두 손이 작은 종이비행기 주고받기
> 5. **영원 약속**: 두 별이 함께 떠 있는 새벽 하늘

### 9.4 트리거 토스트 아이콘 (선택, 4종)
> *위치*: `public/relationship/trigger-icons/`
> *파일명*: `trust.webp`, `openness.webp`, `bond.webp`, `respect.webp`
> *해상도*: 64x64px, 투명 배경
> *컨셉*: 4축 각각 미니 일러스트 (방패/하트/매듭/별)
> *대체*: 이모지로 시작 가능 (🛡 / 💜 / 🦊 / ⭐)

### 9.5 루나 룸 오브젝트 (Phase C — 4개, 선택)
> *위치*: `public/luna-room/relationship-objects/`
> 1. `obj-plant-pot.webp` — Lv2 화분
> 2. `obj-book-stack.webp` — Lv3 책 더미
> 3. `obj-photo-frame.webp` — Lv4 액자 (커스텀 사진 슬롯)
> 4. `obj-star-ceiling.webp` — Lv5 별 천장 효과

### 9.6 **에셋 우선순위 (사장님이 가장 먼저 만들 것)**
1. **9.1 (식물 5단계)** — 메인 차트라 가장 임팩트 큼. **1순위**.
2. **9.3 (폴라로이드 5종)** — 인스타 공유용. **2순위**.
3. **9.2 (캐릭터 카드)** — 일단 1장 공통으로 시작 가능. **3순위**.
4. 9.4, 9.5는 후순위.

### 9.7 AI 일러스트 생성 가이드 (사장님 참고용)
> Midjourney/SDXL 프롬프트 예시 (식물 새싹):
> `cute pastel watercolor sprout in small terracotta pot, two tiny green leaves, soft pink background, Sanrio aesthetic, transparent background, illustration, clay style, soft shadow --ar 1:1 --niji 6`

---

## 10. 측정 지표 (성공 = 이것)

| 지표 | Before (현재 추정) | After (목표) | 측정 방법 |
|---|---|---|---|
| 관계 페이지 DAU | 미측정 | 채팅 사용자의 60% | analytics event |
| 페이지 평균 체류 | ~10초 | 60초+ | session_time |
| 기억 카드 공유율 | 0% | 5% (월간 활성) | share_button_click |
| Lv2 도달 7일 retention | 미측정 | +30%p | cohort |
| 소프트 게이트 통과율 (Lv3) | n/a | 70% (도달자 기준) | gate_open_event |

---

## 11. 호환성 / 마이그레이션

- 기존 `intimacy` JSON 그대로. 깨질 위험 0.
- 기존 `level-unlocks.ts` 는 텍스트 description → 기능 ID 매핑으로 확장. 기존 텍스트는 fallback으로 유지.
- 신규 테이블 3개는 비어 있어도 페이지 정상 동작 (빈 상태 UI 처리 필요).
- 이미 Lv2+ 인 유저: 마이그레이션 시 기억 카드 슬롯 1~현재레벨까지 자동 생성 (LLM 캡션은 일반 멘트로).

---

## 12. 안티 슬롭 룰 (이 프로젝트 표준)

1. 이모지를 centerpiece 로 쓰지 않는다 — 반드시 컨텍스트 안에.
2. 완벽한 좌우 대칭 피한다 — 화분/캐릭터 카드는 *살짝 비대칭* 배치.
3. 보라/그라디언트 단독 배경 금지 — 따뜻한 색 + 종이 그레인.
4. CTA 화살표 단독 금지 — 동사 카피 ("앨범 공유", "마음 더 열기").

---

## 13. 즉시 시작 가능한 첫 작업

이 계획서 승인되면, **Phase A1 + A2** 부터 시작:
1. Supabase 마이그레이션 SQL 작성 (relationship_memories / daily_logs / gate_state)
2. `LunaJournalPage.tsx` 풀 재작성 (이미지 없이도 placeholder로 동작)
3. API 라우트 3개 추가

이미지 에셋이 도착하기 전까지는 placeholder (이모지 + 그라디언트) 로 페이지 완성 가능. 이미지 도착 시 swap-in only.

---

**문서 상태**: ✅ Draft v1. 사장님 리뷰 후 진행.
**다음 액션**: 사장님 →
  1. 이 계획서 한 번 훑어보고 "이거 잘라줘 / 이건 더 보강해줘" 피드백
  2. 9.6 우선순위에 따라 식물 5장 일러스트 작업 시작 (병렬)
  3. AI → Phase A 코드 작성 시작
