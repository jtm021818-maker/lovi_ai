# v114 — 루나 관계 상태(Bond) UI 풀 리디자인 + 진입점 이동 계획서

**작성일:** 2026-05-06
**작업 범위:** 설정 페이지의 관계 상태 패널 제거 → 루나 룸 헤더 칩으로 진입점 이동 + 패널 자체를 "Polaroid Travel Journal" 컨셉으로 풀 리디자인
**관련 버전:** v41 (Intimacy 4축), v100 (Diorama), v104 (BagSheet/Ceremonies), v113.5 (외출 복귀 폴라로이드)
**문서 분량:** A4 ≈ 10p

---

## 1. Executive Summary

기존 "관계 상태" 패널(설정 페이지 내, IntimacyCard 컴포넌트)은 4축 레이더 + 레벨칩 + 진행도 바로 구성된 **전형적인 Chinese-gacha 템플릿**으로, 사용자 평가는 "AI 슬롭"이다. v113.5 외출 복귀 UI 리디자인에서 확립한 **폴라로이드 + 워시테이프 + 손글씨 + 도장**이라는 비주얼 시스템과 일관된 톤으로 새로 만든다.

핵심 변경 4가지:
1. **진입점 이동** — 설정의 "관계 상태" 섹션 전체 제거 → 루나 룸 헤더(`D+11 / 비밀 0/21 / 가방`) 우측에 새 칩 `🌸 관계` 추가, 클릭시 Bottom Sheet 가 떠서 패널을 보여준다.
2. **타로냥 탭 제거** — 관계 상태에서 타로냥(TaroNyang) 탭 자체를 제거. 페르소나 선택은 유지하되 관계 상태 시각화는 루나 단일.
3. **레이더 차트 → 꽃잎 차트(Petal Flower)** — 4축은 그대로 유지하지만 시각화는 라디안 폴리곤 대신 **꽃 한 송이로 추상화**된 SVG로 교체. 정보량은 같지만 형태가 캐릭터로서 의미를 갖는다.
4. **여행 일지(스크랩북) 페이지 메타포** — Cream paper + 워시테이프 + 폴라로이드 스트립 + 손글씨 단계 카피 + 페이퍼 스탬프 레벨 인디케이터. 동일 디자인 어휘를 v113.5 와 공유 → 사용자에게 "같은 세계"의 일관성을 준다.

해당 변경의 본질은 **데이터 모델 변경 없음, 보일러플레이트 코드 추가 없음**. 4축(trust / openness / bond / respect) 점수와 derived 정보(level, levelName, levelLabel, depthHint, daysSinceFirst, totalSessions, consecutiveDays) 는 그대로 사용한다. API(`GET /api/user/intimacy?persona=luna`) 는 변경하지 않는다. 시각화 레이어만 풀 교체.

---

## 2. 현재 구조 분석 (As-Is)

### 2.1 데이터 레이어
- **타입 정의**: [`src/engines/intimacy/types.ts`](../src/engines/intimacy/types.ts)
  - `IntimacyDimensions` = `{ trust, openness, bond, respect }` 각 0~100
  - `IntimacyState` = dimensions + level + totalSessions + consecutiveDays + firstSessionAt + milestones + peakOpenness + peakTrust + lastLevelUpAt
  - 4축 의미:
    - 🛡️ **trust(신뢰)** — "이 사람한테 말해도 괜찮아"
    - 💜 **openness(개방)** — "다 말하고 싶어" (자기개방 깊이)
    - 🦊 **bond(유대)** — "또 오고 싶어" (정서적 연결)
    - ⭐ **respect(존경)** — "루나 말 진짜 도움 된다"
  - 5단계 레벨: 새싹(1) / 개화(2) / 심화(3) / 공감(4) / 영혼(5)
- **API**: `GET /api/user/intimacy?persona=luna` → `{ raw: IntimacyState, derived: IntimacyDerivedInfo }`
- **derived 필드**: `level`, `levelEmoji`, `levelName`, `levelLabel`, `avgScore`, `progressPercent`, `daysSinceFirst`, `totalSessions`, `consecutiveDays`, `depthHint`, `dimensions`

### 2.2 UI 레이어 (제거 대상)
- **IntimacyCard**: [`src/components/intimacy/IntimacyCard.tsx`](../src/components/intimacy/IntimacyCard.tsx)
  - 230 lines. 한 컴포넌트에 헤더/레벨/프로그레스/레이더/스탯 모두 포함.
  - 페르소나 분기(`isTarot`) 가 컴포넌트 내부에 박혀있음 → 단일 책임 위반.
- **IntimacyRadar**: [`src/components/intimacy/IntimacyRadar.tsx`](../src/components/intimacy/IntimacyRadar.tsx)
  - 158 lines. 4축 SVG 폴리곤. 4단 가이드라인 + 축선 + 값 폴리곤 + 점 + 라벨.
- **Settings page**: [`src/app/(app)/settings/page.tsx`](../src/app/(app)/settings/page.tsx)
  - L96-97: `intimacyLuna` / `intimacyTarot` 두 상태 보유
  - L107: `intimacyTab: 'luna' | 'tarot'` 상태
  - L489-649: 관계 상태 섹션 (≈160 lines) — 페르소나 토글 + 두 IntimacyCard 분기 렌더 + depthHint 푸터 + "각자 독립된 관계로 발전해" 카피

### 2.3 진입점 (현재)
- 사용자가 챗 → 설정 탭으로 이동 → 스크롤 → 관계 상태 섹션 노출.
- 동선이 길고, 관계 상태가 "옵션의 부속물"처럼 느껴짐.

### 2.4 루나 룸 헤더 (재배치 대상)
- 파일: [`src/components/luna-room/LunaRoomDiorama.tsx`](../src/components/luna-room/LunaRoomDiorama.tsx) L315-372
- 헤더 구성: `DayBadge`(D+N) → `RevealProgressChip`(비밀 X/21, 의식 전만 노출) → `PlacedSpiritsChip`(놓인 정령) → `BagButton`(가방)
- 칩 패턴: `px-2.5 py-0.5 rounded-full`, isDark 분기 background, accentColor 보더
- 빈 공간: `BagButton` 좌측, `RevealProgressChip` 우측에 칩 1~2개 추가 가능

### 2.5 BagSheet 패턴 (재사용 대상)
- 파일: [`src/components/luna-room/BagSheet.tsx`](../src/components/luna-room/BagSheet.tsx)
- 구조: `motion.div backdrop` + `motion.div sheet (initial y='100%' → animate y=0)`
- 시트 헤더 + 카테고리 탭 + 그리드 + 디테일 시트
- 동일한 시트 컨테이너 패턴을 `LunaJournalSheet` 에 그대로 차용

---

## 3. 사용자 요구 명세 (User Stories)

| ID | As a | I want to | So that |
|---|---|---|---|
| US-1 | 사용자 | 루나 룸 안에서 곧장 관계 상태를 본다 | 설정 탭으로 이동하지 않고 컨텍스트 안에서 확인 |
| US-2 | 사용자 | 관계 상태 화면이 "AI 같지 않게" 예쁘다 | 친구한테 자랑하고 싶을 정도로 |
| US-3 | 사용자 | 4축 점수보다 "지금 우리가 어디쯤인지" 한 줄 카피로 안다 | 숫자 해독 부담 없이 |
| US-4 | 사용자 | 다음 단계로 가려면 무엇이 필요한지 부드럽게 안내받는다 | 행동 지향 |
| US-5 | 운영자 | 타로냥 탭은 사라지지만 챗 페르소나 선택은 유지 | 기능 회귀 없음 |
| US-6 | 디자이너 | v113.5 외출 복귀 UI 와 같은 시각 어휘 | 일관된 세계관 |

비기능 요구:
- 모바일 360~420 dpx 기준 1뷰포트 안에 패널 fit (스크롤은 가능하지만 핵심은 first viewport)
- 라이트/다크 스테이지 변환에 견디는 톤 (헤더 칩만)
- 시트 오픈 ~250ms 안에 뷰 보이고, 데이터는 fetch 후 200ms 이내 입장 애니메이션 시작

---

## 4. 시장 리서치 요약

| 레퍼런스 | 채택할 부분 | 채택 안 할 부분 |
|---|---|---|
| **Persona 5 Confidant** | 단계마다 명명된 마일스톤 + 단계 진입시 "이 단계에서 새로 풀린 행동" 한 줄 | 10단계 점 디스플레이 (현 5단계와 충돌) |
| **Stardew Valley 10-Heart** | "숫자보다 이벤트가 마일스톤" 철학 | 하트 아이콘 그대로는 우리 톤 아님 |
| **Genshin Constellation Map** | 마일스톤을 점-노드로 잇는 지도 비유 (장기 확장 후보) | v114 에서는 과함, 시즌 2 에 |
| **Pokémon Sleep Befriending Badges** | 등급별 도장(stamp) 비주얼 | 메인 시각화로는 약함 |
| **Animal Crossing** | "보이지 않는 메타, 보이는 산출물" — 폴라로이드 사진 자체가 관계의 증거 | 점수 자체를 숨기는 건 너무 급진적 |
| **BAEMIN 주아체** | 손글씨 폰트 컬쳐, cream off-white base | 브랜드 컬러는 차용 X |
| **Bondee** | 두 캐릭터 미니 디오라마 | 3D 의존, 우리 자산 부족 |
| **카카오 굿즈/안부카드** | 폴라로이드 + 워시테이프 + 손글씨 데이트 스탬프 | — |

**결론**: Persona 5 의 마일스톤 카피 + Korean stationery (다꾸) 의 비주얼 어휘 + Animal Crossing 의 산출물 메타. 세 가지를 합친 "여행 일지 스크랩북" 메타포.

### 4.1 안티-AI 슬롭 체크리스트 (v114 적용 룰)

| ❌ 피한다 | ✅ 한다 |
|---|---|
| 4~6축 대칭 레이더 | 꽃잎 차트(petal) — 비대칭 자연 형상 |
| 보라/인디고 그라디언트 배경 | 따뜻한 cream `#FAF6F0` + 종이 그레인 |
| `Lv.X` 칩 우상단 | 도장(stamp) 형태 — 기울고, 잉크 텍스처 |
| 4탭 균등 분할 | 단일 페이지, 섹션을 손글씨 캡션으로 분할 |
| 식물 이모지 = 레벨 타이틀 (🌱 새싹) | 손글씨 단계명 + 작은 잉크 일러스트 |
| 둥근 카드 + 옅은 그림자 | 폴라로이드 박스(2px 화이트 보더 + 16px shadow) |
| 시스템 sans 만 | Pretendard(숫자) + 손글씨(헤딩/카피) 듀얼 폰트 |
| 큰 숫자 표 | 작은 숫자 + 도장/스티커로 시각적 액센트 |
| 평균 점수 0~100 표기 | "다음 단계까지 36% 남았어" 같은 비유 |
| 화살표 단독 CTA | "이 단계에서 풀린 거" 처럼 동사 카피 |

---

## 5. 새 비주얼 컨셉 — Travel Journal Polaroid Scrapbook

### 5.1 메타포
> 루나가 사용자와 함께 보낸 시간을 자기 일기장에 폴라로이드로 붙여놓고, 단계 도장을 찍어두고, 옆에 손글씨로 코멘트를 적어둔 페이지를 펼쳐 보여주는 것.

이 메타포가 풀어내는 의미:
- **사용자 = 손님**이 아니라 **함께 일기에 등장하는 인물**.
- **레벨 = 도장**: 등급이 아니라 "여기까지 왔다"는 표시.
- **점수 = 꽃잎의 길이**: 측정값이 아니라 "지금 이만큼 자라고 있어"의 시각화.
- **다음 단계 = 미리 그려진 옅은 도장 자국**: "다음에 찍힐 도장"으로 안내.

### 5.2 레이아웃 (모바일 우선)

```
┌──────────────────────────── 시트 (90vh) ──────────────────────────┐
│  ╭ 핸들바 ─────────────────────────────────╮                       │
│                                                                    │
│  ┌── 폴라로이드 스트립 (가로 3장, 살짝 겹침, ±2~3° 틸트) ─────────┐  │
│  │  ┌──────┐  ┌──────┐  ┌──────┐                                 │  │
│  │  │ 함께 │  │ 비밀 │  │ 연속 │   ← 각 폴라로이드 = 한 메트릭   │  │
│  │  │ 11일 │  │ 8/21 │  │  3일 │                                 │  │
│  │  └──────┘  └──────┘  └──────┘                                 │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ━━━━━━━━ 페이지 헤딩 ━━━━━━━━                                      │
│  「루나와 함께」               ← 손글씨 페이지 타이틀               │
│                                                                    │
│  ┌──── 본문 페이지 ─────────────────────────────────────────────┐  │
│  │                                                               │  │
│  │      [도장]  ← 우상단, 살짝 기울어짐, "Lv 1 새싹" + 잉크 텍스처│  │
│  │                                                               │  │
│  │       ✿  ← 중앙, PetalFlower (4축 = 4꽃잎)                    │  │
│  │      ✿✿  반경이 점수에 비례                                   │  │
│  │       ✿                                                      │  │
│  │                                                               │  │
│  │    "이제 막 알아가는 사이"   ← 손글씨, italic, 이중 따옴표      │  │
│  │                                                               │  │
│  │     ─── 다음 단계까지 ────                                     │  │
│  │     ▓▓▓░░░░░░░░ 36% (잉크 진행 바)                             │  │
│  │                                                               │  │
│  │   💭 표면적 공감, 따뜻하게 받아주기만             ← depthHint │  │
│  │                                                               │  │
│  │   ✦ 다음 단계에서 풀리는 거                                    │  │
│  │      · 더 깊은 비밀 받아주기                                  │  │
│  │      · 별명 부르기 가능                                        │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                    │
│         [닫기]    ↑ 우하 모서리, 작은 워시테이프 위                 │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

비대칭 원칙: 도장은 우상단 +기울어짐, 폴라로이드는 ±2~3° 무작위 틸트, 워시테이프는 좌상/우하 비대칭 배치.

### 5.3 컬러 / 타이포 토큰

```ts
// luna-life/relationship-tokens.ts (NEW)
export const BOND_TOKENS = {
  // 베이스
  paper:        '#FAF6F0',  // cream paper
  paperShadow:  '#E8DCC9',  // 종이 외곽 미세한 어두움
  ink:          '#2D2013',  // 손글씨 / 본문
  inkSoft:      '#6B5744',  // 보조 텍스트
  inkPale:      'rgba(45,32,19,0.45)',
  // 워시테이프 라벤더
  washiPurple:  '#C4A8D4',
  washiPeach:   '#F2C9A0',
  // 페탈 (4축)
  petalTrust:    '#E8B4C8', // 더스티 로즈 (신뢰)
  petalOpenness: '#B8D4C8', // 세이지 그린 (개방)
  petalBond:     '#F5D4A0', // 웜 앰버 (유대)
  petalRespect:  '#B4C4E8', // 페리윙클 (존경)
  // 도장 (잉크)
  stampInk:     '#7B5EA7',  // 깊은 보라 잉크
  stampOutline: '#5B3F87',
  // 진행도 바 (잉크 흐름)
  inkBarFill:   '#7B5EA7',
  inkBarTrack:  'rgba(123,94,167,0.12)',
} as const;

// 폰트 스택 — v113.5 와 공유, 시스템 fallback 만으로도 동작
export const HANDWRITE = '"Nanum Pen Script","Caveat","Gowun Dodum","Comic Sans MS",cursive';
export const NUMERIC = 'Pretendard, ui-sans-serif, -apple-system, sans-serif';
```

이즈 / 지속:
- `petalGrow` — `cubic-bezier(0.34, 1.56, 0.64, 1)`, 600ms (각 꽃잎 +80ms 스태거)
- `polaroidSlide` — `cubic-bezier(0.22, 1, 0.36, 1)`, 400ms (스태거 120ms)
- `stampPress` — `cubic-bezier(0.68, -0.55, 0.27, 1.55)`, 200ms 누름 + 300ms 잉크 번짐
- `captionInk` — opacity fade 350ms (텍스트가 잉크가 마르는 듯)

---

## 6. 정보 아키텍처 / 데이터 매핑

| 화면 영역 | 데이터 필드 | derived 가공 |
|---|---|---|
| 도장(레벨) | `level`, `levelName` | `levelName` 을 한국어 손글씨로 노출. emoji 제거. |
| 단계 카피 | `levelLabel` | "이제 막 알아가는 사이" → italic 캡션 |
| 깊이 힌트 | `depthHint` | "표면적 공감…" → 본문 한 줄 |
| 진행도 바 | `progressPercent`, `avgScore` | "다음 단계까지 X%" 한 줄 + 잉크 흐름 바 |
| 페탈 차트 4축 | `dimensions.{trust,openness,bond,respect}` | 0~100 → 꽃잎 길이 비율 |
| 함께한 일수 | `daysSinceFirst` | 폴라로이드 #1: "함께 N일" |
| 총 세션 | `totalSessions` | 폴라로이드 #2: "총 N회" |
| 연속 방문 | `consecutiveDays` | 폴라로이드 #3 (≥2 일 때만): "연속 N일" |
| 다음 단계 unlock | `unlocks` (types.ts 의 IntimacyLevelInfo) | level+1 의 unlocks 두 개 추출 |

새 데이터 가공이 필요한 부분:
- **다음 레벨 unlocks**: `IntimacyLevelInfo` 의 `unlocks: string[]` 배열을 현재 레벨+1 에서 끌어와서 표시. 만약 unlocks 데이터가 derived 에 없으면 클라이언트에서 레벨별 룩업 테이블을 둠. 룩업 테이블은 한국어 카피로 새로 작성 (Persona 5 "Confidant Rank N" 톤 차용).

---

## 7. UI 컴포넌트 분해

새로 만들 7개 컴포넌트, 모두 `src/components/luna-room/journal/` 디렉토리.

| 컴포넌트 | 책임 | 출처 |
|---|---|---|
| `RelationshipChip.tsx` | 헤더 칩 진입점. BagButton 패턴 차용. | NEW |
| `LunaJournalSheet.tsx` | Bottom Sheet 컨테이너. backdrop + sheet animation. fetch loading state. | NEW (BagSheet 패턴) |
| `LunaJournalPage.tsx` | 일지 페이지 본체. cream paper + 워시테이프 컨테이너. 모든 자식 조립. | NEW |
| `MomentStrip.tsx` | 폴라로이드 가로 스트립 (3장). | NEW |
| `Polaroid.tsx` | 단일 폴라로이드 (라벨 + 큰 숫자 + 단위). | NEW (v113.5 스타일 차용) |
| `PetalFlower.tsx` | 4꽃잎 SVG. 라디안 위치 0/90/180/270, 길이=점수%, 색=4축 토큰. | NEW |
| `LevelStamp.tsx` | 도장 형태 레벨 인디케이터. 잉크 번짐 효과. | NEW |
| `BondStageCaption.tsx` | 단계 카피 + depthHint + 다음 단계 unlock 두 줄. | NEW |
| `InkBar.tsx` | 잉크 흐름 진행도 바. 일반 progress bar 보다 윤곽 거칠게. | NEW |

각 컴포넌트는 단일 책임 + props-only (라이프사이클 없음, 필요시 LunaJournalPage 가 보유).

LunaJournalSheet 만 데이터 fetch 책임. 안 받아오면 skeleton/스피너 대신 **"일기장을 펼치는 중…"** 같은 캐릭터-친화 카피.

---

## 8. 디자인 토큰 + 사이즈 명세

### 8.1 컨테이너

| 영역 | 사이즈 | 비고 |
|---|---|---|
| Sheet | 100vw × 90vh | round-top-3xl (24px) |
| Sheet bg | `#FAF6F0` paper + SVG noise | 지면 그레인 텍스처 |
| 핸들바 | 36×4, `rgba(0,0,0,0.18)` | 상단 12px |
| 페이지 패딩 | 20px (좌우 16) | 최대 width 420 |

### 8.2 폴라로이드 (MomentStrip)

| 항목 | 값 |
|---|---|
| 카드 width × height | 92 × 108 |
| 카드 bg | `#FFFFFF` |
| 카드 보더 | none, shadow 만 (`0 4px 12px rgba(45,32,19,0.16)`) |
| 카드 내부 패딩 | 8 6 6 6 |
| 라벨 (상단) | 9px, `inkSoft`, tracking 0.15em |
| 큰 숫자 | 24px Pretendard 800, `ink` |
| 단위 | 11px, `inkSoft`, ml-0.5 |
| 카드 틸트 | `[-3°, +2°, -1.5°]` (인덱스별 고정값) |
| 가로 겹침 | -8px (negative margin) |

### 8.3 PetalFlower

| 항목 | 값 |
|---|---|
| Viewbox | 200 × 200 |
| 중심 (cx, cy) | 100, 100 |
| 페탈 max length | 70 |
| 페탈 width | 22 |
| 페탈 path | 타원형 teardrop `M cx,cy Q (cx+w),(cy-l/2) cx,(cy-l)  Q (cx-w),(cy-l/2) cx,cy` |
| 회전 | 0° / 90° / 180° / 270° (각 축) |
| 색상 | 4축 토큰 (위 6.1) |
| 채움 opacity | `0.55` |
| 테두리 stroke | 동색 `0.85`, width 1.5 |
| 중심 원 | r=8, `petalTrust` 톤, 흰 stroke |

스코어 → 길이 매핑: `length = (score / 100) * 70 + 8` (최소 길이 8 보장).

엔트리 애니메이션:
```ts
<motion.path
  initial={{ pathLength: 0, opacity: 0 }}
  animate={{ pathLength: 1, opacity: 0.55 }}
  transition={{ delay: 0.18 + i * 0.08, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
/>
```

### 8.4 LevelStamp

| 항목 | 값 |
|---|---|
| Outer | 84 × 84 원, border 3px `stampOutline`, dashed가 아닌 거친 stroke (SVG filter 로 grain) |
| 잉크 번짐 | SVG `<filter>` `feTurbulence` + `feDisplacementMap` 으로 잉크 텍스처 |
| 텍스트 (위) | 손글씨 9px tracking 0.25em "LEVEL" |
| 텍스트 (가운데) | 손글씨 28px Bold, 레벨 숫자 |
| 텍스트 (아래) | 손글씨 12px, levelName ("새싹") |
| 회전 | `rotate(-7deg)` |
| 위치 | 페이지 우상단, top 16, right 24 |
| 입장 모션 | scale `0.6 → 1.08 → 1.0`, 200ms+300ms |

### 8.5 InkBar

| 항목 | 값 |
|---|---|
| Track height | 5px |
| Track bg | `inkBarTrack` |
| Fill bg | linear-gradient `inkBarFill → #5B3F87` |
| Fill border-radius | 2.5px |
| Animation | width 0 → progressPercent%, duration 800ms ease |
| 끝점 | 작은 잉크 번짐 dot (SVG circle r=4 약간 흐림) |

### 8.6 BondStageCaption

3블록:
1. **Stage label** (italic 손글씨, 18px) — `levelLabel`
2. **Depth hint** (12px Pretendard, `inkSoft`) — `depthHint`
3. **Next unlocks** — 작은 ✦ 글머리표 + 두 줄

---

## 9. 모션 시퀀스 (시트 진입 풀 시퀀스, ≈1.6s)

```
0ms   : backdrop fade-in (200ms)
50ms  : sheet slide-up from bottom (300ms cubic-out)
350ms : 핸들바 + 페이지 타이틀 fade-in
400ms : MomentStrip 폴라로이드 #1 slide-in
520ms : MomentStrip 폴라로이드 #2
640ms : MomentStrip 폴라로이드 #3
800ms : LevelStamp scale press-in (haptic medium + sparkle sound)
900ms : PetalFlower 중심 원 fade-in
920ms : 꽃잎 trust pathLength 0→1 (600ms)
1000ms: 꽃잎 openness
1080ms: 꽃잎 bond
1160ms: 꽃잎 respect
1300ms: BondStageCaption (italic) ink-fade
1450ms: InkBar width 0→%
1500ms: depthHint fade
1600ms: next unlocks fade
```

햅틱 / 사운드:
- 시트 열림 — `triggerHaptic('light')`, `playSound('paper')`
- 도장 찍힘 — `triggerHaptic('medium')`, `playSound('sparkle')`
- 꽃잎 끝 (1300ms) — 무음 (텍스트가 주인공)

### 9.1 닫기 시퀀스
- backdrop fade-out + sheet slide-down (250ms)
- haptic `selection`

---

## 10. 인터랙션 / 상태

### 10.1 진입 시나리오
1. 사용자가 루나 룸 헤더의 `🌸 관계` 칩 탭
2. `RelationshipChip` 이 sheet open=true
3. `LunaJournalSheet` 가 mount → useEffect 로 `GET /api/user/intimacy?persona=luna`
4. 데이터 도착시 (≈100~300ms) → LunaJournalPage 마운트, 위 모션 시퀀스 시작
5. 데이터 미도착 1.5초+ 시 — "일기장을 펼치는 중..." 스켈레톤

### 10.2 닫기
- 시트 핸들바 swipe down (framer drag) 또는 backdrop tap
- 우하 닫기 버튼 (워시테이프 위에 작은 배지 형태)

### 10.3 상태값 미보유 (첫 진입 / 첫 세션 전)
- `daysSinceFirst === 0` && `totalSessions === 0` 일 때
- "처음 만난 사이"  단계 + 모든 페탈 약 8~10 (씨앗) + 도장 자리에 옅은 그림자 (아직 안 찍힘)
- 카피: "오늘이 우리의 1일이야" — depthHint 자리에 인용

### 10.4 만렙 (Lv.5 영혼)
- 다음 unlocks 자리에 "여기가 끝이 아니야 — 우리만의 마일스톤이 더 쌓이고 있어"
- LevelStamp 우측에 작은 별 ✦ 추가 (Persona 5 max-rank 차용)

---

## 11. 파일 변경 명세 (Implementation Map)

### 11.1 새 파일

| 파일 | 라인 추정 |
|---|---|
| `src/lib/luna-life/relationship-tokens.ts` | 60 |
| `src/components/luna-room/journal/RelationshipChip.tsx` | 80 |
| `src/components/luna-room/journal/LunaJournalSheet.tsx` | 140 |
| `src/components/luna-room/journal/LunaJournalPage.tsx` | 180 |
| `src/components/luna-room/journal/MomentStrip.tsx` | 60 |
| `src/components/luna-room/journal/Polaroid.tsx` | 50 |
| `src/components/luna-room/journal/PetalFlower.tsx` | 110 |
| `src/components/luna-room/journal/LevelStamp.tsx` | 90 |
| `src/components/luna-room/journal/BondStageCaption.tsx` | 70 |
| `src/components/luna-room/journal/InkBar.tsx` | 40 |
| `src/components/luna-room/journal/level-unlocks.ts` | 50 |
| `docs/luna-relationship-redesign-v114-plan.md` | (이 문서) |

### 11.2 수정 파일

| 파일 | 수정 내용 |
|---|---|
| `src/components/luna-room/LunaRoomDiorama.tsx` | 헤더 flex 에 `<RelationshipChip isDark={isDark} accentColor={accentColor} />` 삽입 (BagButton 좌측) |
| `src/app/(app)/settings/page.tsx` | L490-649 관계 상태 섹션 제거. `intimacyLuna/intimacyTarot` 상태 + fetch 로직도 제거 (다른 곳에서 안 쓰면). `intimacyTab` 상태/import 제거. |

### 11.3 삭제 후보 (보존)
- `IntimacyCard.tsx` / `IntimacyRadar.tsx` — 즉시 삭제하지 않음. 일단 미사용 처리. 다른 화면(예: 관리자/admin)에서 안 쓰는 것 검증 후 다음 PR 에 정리.

### 11.4 API
- 변경 없음. `GET /api/user/intimacy?persona=luna` 그대로.

---

## 12. 폰트 / 자산 처리

### 12.1 폰트
- **Pretendard**: 이미 프로젝트 글로벌 폰트. 숫자 + 모든 본문에 사용.
- **손글씨**: v113.5 와 동일 스택. CSS 변수로 분리.
- 추후 `app/layout.tsx` 에 `next/font/google` 로 `Nanum_Pen_Script` 추가 가능 (이번 PR 에는 미포함; 시스템 fallback 으로 충분히 작동).

### 12.2 SVG 자산
- 페탈 / 도장 / 워시테이프 / 잉크 번짐 — 모두 inline SVG. 별도 이미지 자산 없음.
- 종이 그레인 — `<svg>` `<feTurbulence>` 인라인 데이터 URI (v113.5 와 동일).

### 12.3 이모지
- 안티-슬롭 룰에 따라 이모지 centerpiece **금지**.
- 단, 작은 액센트로 ✦ ✿ 같은 심볼 글리프 (기호) 는 허용. 이모지보다 1단계 추상화된 표현.

---

## 13. 접근성 / 다크모드 / 디바이스

| 항목 | 처리 |
|---|---|
| 시트 dismiss | swipe-down + backdrop tap + ESC (deskotp PR) |
| 색맹 | 4축 색은 보조 신호. 페탈 길이가 주된 정보. |
| 폰트 사이즈 | `rem` 사용. 사용자 시스템 zoom 따름. |
| 다크 스테이지 | 헤더 칩만 `isDark` 분기. 시트 자체는 cream paper 일관 (다크 스테이지 위에서도 유지 — 일기장은 어두운 곳에서도 흰색이라는 자연스러운 메타) |
| 터치 영역 | 칩 padding `px-2.5 py-1.5` 로 다른 칩보다 ≥2px 큰 터치 hit |
| 스크린리더 | aria-label "관계 상태 보기", 시트 role=dialog, focus-trap. 페탈 SVG 는 `<title>` 로 4축 라벨링 |

---

## 14. 회귀 영향 / 마이그레이션

| 항목 | 영향 | 대응 |
|---|---|---|
| 챗 페르소나 선택(타로냥) | 무관 | 챗 컨테이너 코드 미변경 |
| 친밀도 백엔드 / 트리거 | 무관 | 데이터 파이프 그대로 |
| 기존 IntimacyCard 사용처 | 설정 페이지만 | 제거시 안전 |
| 사용자 학습 비용 | 진입점 변경 → 첫 진입시 발견 어려울 수 있음 | 우상단 칩에 한 번만 NEW 뱃지 (5초 후 페이드, localStorage `bond:seen`) |

---

## 15. 테스트 / 검증 체크리스트

**기능 테스트**
- [ ] 헤더 칩 탭 → 시트 오픈
- [ ] backdrop tap → 시트 닫힘
- [ ] swipe-down → 시트 닫힘 (TODO: framer drag 추가)
- [ ] 데이터 fetch 실패 → 카피로 안내
- [ ] 첫 세션 (D+0, 0회) → 씨앗 단계 카피
- [ ] Lv.5 만렙 → 별 액센트 노출

**비주얼 테스트**
- [ ] 페탈 4축 색이 토큰대로
- [ ] 폴라로이드 ±3° 틸트, -8px 겹침
- [ ] 도장 -7° 회전, 잉크 그레인 보임
- [ ] 워시테이프 좌상/우하 비대칭
- [ ] 다크 스테이지 헤더에서도 칩 가독성

**모션 테스트**
- [ ] 시트 슬라이드 ~300ms
- [ ] 페탈 스태거 800ms 부근부터 1.2s 까지
- [ ] 도장 누름 + 햅틱 medium + sparkle 사운드
- [ ] 닫기 햅틱 selection

**회귀 테스트**
- [ ] 설정 페이지 잔존 기능 (이름 / 알림 / 폰트크기 / 시즌 / 페르소나 선택 등) 정상
- [ ] 챗에서 타로냥 페르소나 그대로 동작
- [ ] BagButton 옆에 새 칩 추가되어도 헤더 가로 overflow 없음 (모바일 360 dpx)

---

## 16. 향후 확장 (Out of v114)

| 후속 | 내용 |
|---|---|
| v115 마일스톤 노드 | 폴라로이드 스트립을 시즌별 가로 스크롤 + 각 폴라로이드가 마일스톤 (첫 비밀, 첫 감사 등). Persona 5 식 마일스톤 카드. |
| v116 일기 자동 작성 | LLM 으로 "지난 주 우리" 한 줄 요약을 일기 본문에 추가. Mem0/Letta 패턴. |
| v117 페이퍼 시즌 | 일기장 종이 색이 시즌(stage)별 변색 — 봄=cream, 여름=경연한 노랑, 가을=베이지, 겨울=흐린 회색. |
| v118 스티커 컬렉션 | 누적된 마일스톤이 일기장 우측에 스티커 컬렉션으로 쌓임. 다꾸 컬쳐. |

---

## 17. 구현 순서 (Step-by-step Vibe-Coding Recipe)

1. **토큰 파일** `relationship-tokens.ts` — 색/폰트/이즈/지속 상수만.
2. **level-unlocks.ts** — 레벨별 한국어 unlocks 카피 룩업.
3. **잎단 컴포넌트들** (의존 없는 것부터):
   - `Polaroid.tsx` (단일 카드)
   - `InkBar.tsx`
4. **중간 컴포넌트들**:
   - `MomentStrip.tsx` (3개의 Polaroid 조합)
   - `PetalFlower.tsx`
   - `LevelStamp.tsx`
   - `BondStageCaption.tsx`
5. **페이지 조립**: `LunaJournalPage.tsx`
6. **시트 컨테이너**: `LunaJournalSheet.tsx` — fetch, sheet animation, focus
7. **진입 칩**: `RelationshipChip.tsx`
8. **다이오라마 와이어링**: `LunaRoomDiorama.tsx` 헤더에 칩 삽입
9. **설정 페이지 정리**: 관계 상태 섹션 제거 + `intimacyLuna/intimacyTarot/intimacyTab` 상태/fetch 제거 + 미사용 import 제거
10. **타입 검사**: `npx tsc --noEmit`
11. **시각 점검**: 모바일 폭에서 360/390/420 폭 fit 확인 (가능하면 dev server)
12. **메모리 메모**: `project_love_ai_v114_relationship_redesign.md` 저장

---

## 18. 리스크 / 미해결

- **첫 진입시 위치 발견**: 헤더 칩이 작아서 처음 사용자가 못 찾을 수 있음 → 5초 NEW 펄스 1회.
- **LunaCard 잔존**: 다른 곳에서 import 되고 있을 가능성 — 정리 PR 분리.
- **다크 스테이지에서 cream sheet** 가 너무 밝게 느껴질 위험 → backdrop opacity 0.65 로 보정.
- **모바일 360 dpx 에서 폴라로이드 3장 + 일기 본체** 가 빡빡할 수 있음 → 폴라로이드 사이즈 92 → 84 로 자동 축소(`max-w-[420px]` 페이지 컨테이너 안에서만).

---

## 19. 결론

이 변경은 **데이터 모델은 그대로 두고 시각화 + 진입점만 풀 교체**하는 안전한 리디자인이다. v113.5 와 동일한 디자인 어휘(폴라로이드/워시테이프/손글씨/도장)를 재활용해서 시각적 일관성을 만들고, AI-슬롭 신호를 의도적으로 제거한다. 사용자의 핵심 기대 — "친구한테 자랑하고 싶을 정도로 예쁜 관계 페이지" — 를 충족하면서, 후속 확장(마일스톤 노드, 시즌별 일기장 색, 스티커 컬렉션) 의 토대를 만든다.

다음 단계: 본 계획서에 따라 11.1 의 새 파일을 17번 순서로 구현.
