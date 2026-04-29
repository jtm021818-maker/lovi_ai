# Luna Room Revamp v100 — Tamagotchi 2.0 디오라마 (Vibe-Coding 스펙)

> **작성일**: 2026-04-29
> **대상**: 이 문서를 읽고 즉시 구현하는 AI 코딩 에이전트 (또는 다른 개발자)
> **분량**: A4 10장 (한글 ~5,500 단어)
> **목표**: `루나의 방` 메인 화면을 8개 카톡 이모티콘 임시 UI에서, 20-30대 여성 타깃의 게임 같은 고퀄 다마고치 디오라마로 전면 교체. 편지/추억은 디오라마 안의 우편함과 액자로 통합.
>
> **이 문서를 읽는 AI에게** — 추상적 미사여구는 적었습니다. 모든 섹션은 (1) 파일 경로, (2) 타입/props, (3) 리터럴 카피 문자열, (4) 애니메이션 수치, (5) 수용 기준 5가지가 같이 들어 있습니다. 막히면 "기존 파일을 그대로 두고 새 컴포넌트 추가" 룰을 따릅니다 (기존 LunaRoomView는 v100 마이그레이션 끝까지 export 유지).

---

## 0. TL;DR — 30초 요약

- 기존 3-탭(`main` / `inbox` / `memories`) 구조 폐기 → **단일 디오라마 + 모달**.
- 디오라마: 창문(시간/날씨/계절) → 방 안 가구(우편함, 액자선반, 침대, 책상) → 루나(8가지 활동 + 무드).
- 카톡 이모티콘 8개 임시 sprite → **`luna_diorama_<activity>_<mood>.webp`** 16-24장 (유저가 제작 예정, 경로만 확정).
- 우편함을 탭 → 봉투 모달 (현 `LunaEnvelope` 재사용 + 시각 강화).
- 액자선반을 탭 → 추억 갤러리 모달 (자동 추출된 `luna_memories` 폴라로이드 격자).
- 루나 본체 탭 → 채팅 시트 (기존 `LunaChat` 재사용, 진입 트리거만 변경).
- 무드/활동 결정은 **결정적 함수 + 선택적 LLM 보강** 둘 다 지원 (오프라인 폴백).

---

## 1. 디자인 철학 (Why this works for 20–30대 여성)

> 이 섹션은 LLM이 톤을 흐트리지 않게 만드는 "스타일 가드". 모호한 단어 금지.

### 1-1. 5개 톤 키워드
1. **소프트 페미닌** — 밀크티 베이지, 라일락, 피치 핑크. 채도 낮고 명도 높음. (`#FAF5FF`, `#FFE4E1`, `#FDF6E3`).
2. **서울 원룸 무드** — 루나의 캐릭터 설정(`api/room/luna-chat/route.ts:17`)인 "홍대 원룸 + 고양이"가 디오라마 그대로 보이게.
3. **은유적 게임성** — 직접적 게이지/숫자 노출 X. "루나가 지금 책 읽는 중" 같은 행동으로만 상태 전달.
4. **카드 위에 카드** — 그림자 2단(`0 4px 20px / 0 1px 4px`), 둥근 모서리(`16~24px`), 뜨는 듯한 layering.
5. **시간이 흐른다는 감각** — 100일이 화면 곳곳에 보임 (창밖 계절, 책상 위 달력, 캘린더 도트).

### 1-2. 절대 안 하는 것 (anti-pattern)
- ❌ 픽셀아트 도트풍 (예: 다마고치 원본). → 이 프로젝트는 부드러운 일러스트 톤.
- ❌ "행복도 70%" 같은 수치 노출.
- ❌ 빠른 SFX, 진동 효과. 모든 동작은 spring(220, 22)~spring(180, 26) 범위.
- ❌ 형광색, RGB 글로우. 액센트는 라일락/피치 한정.
- ❌ 하단 탭 바 (모바일이지만 데스크탑에서도 자연스러워야 함).

### 1-3. 레퍼런스 (검색 시 참고할 키워드)
- Finch (self-care pet) — 우측 우편함 패턴.
- Replika 초기 UI — "방" 개념과 무드 감지.
- Tamagotchi Uni — 시간대별 행동.
- Animal Crossing: Pocket Camp — 가구 디오라마 깊이감.
- 카카오 "프렌즈홈" — 한국 페미닌 톤 일러스트 일관성.

---

## 2. 정보 구조 (IA) — 화면 → 모달 1단계

### 2-1. 라우팅 구조 (변경 없음)
```
/luna-room                       → app/(app)/luna-room/page.tsx
  ├ <LunaInitScreen/>            (미초기화 시) — 변경 없음
  └ <LunaRoomDiorama/>           (초기화 완료) — 신규, 기존 LunaRoomView 자리 대체
       ├ overlay <LunaEnvelope/> (우편함 탭 시) — 기존 그대로 + props 동일
       ├ overlay <MemoryGallery/>(액자선반 탭 시) — 신규
       └ overlay <LunaChat/>     (루나 탭 시) — 기존 그대로
```

### 2-2. Z-index 정책
- `0`   배경 그라데이션 (계절)
- `5`   파티클 (LunaParticles 그대로)
- `10`  창문 + 창밖 풍경
- `20`  뒷벽 가구 (책장, 포스터)
- `30`  바닥 가구 (책상, 침대)
- `40`  루나 캐릭터
- `50`  앞쪽 인터랙션 가구 (우편함, 액자선반)
- `60`  HUD (D+, 무드 페블)
- `70`  말풍선 / 토스트
- `80`  전체화면 모달 (편지, 갤러리, 채팅)

### 2-3. 단일 페이지 — 3-section 종스크롤 (모바일 480px)
```
┌────────────────────────────┐
│ [HEADER bar]  ←  D+27      │  z-60, sticky top
├────────────────────────────┤
│                            │
│    [WINDOW SCENE]          │  z-10~20, height 240px
│      해 / 달 / 비 / 눈     │
│                            │
├────────────────────────────┤
│   📮       🌙        🖼     │  z-30~50
│ 우편함   루나(중앙)   액자  │  height 360px
│   2          탭->채팅       │
├────────────────────────────┤
│ "오늘 너 보고 싶었어 :)"   │  z-70 무드 페블 (말풍선)
├────────────────────────────┤
│ [SPEAK] [DIARY]            │  z-60 액션 핀
└────────────────────────────┘
```

데스크탑(>768px)에서는 좌측 책장 영역이 추가로 노출(우편함 옆), 우측 창가 의자 추가. 단 v100 1차에서는 모바일 우선 + 데스크탑은 max-width 480px 중앙 정렬로 출시(이후 v101에서 wide 레이아웃).

---

## 3. 데이터 모델 — 신규 타입 정의 (구현 전 반드시 추가)

`src/lib/luna-life/index.ts` 하단에 아래 블록을 그대로 추가. 기존 export는 건드리지 않는다.

```ts
// ─── Mood / Activity engine (v100) ──────────────────────────────────────────
export type LunaMood =
  | 'bright'      // 밝고 들뜸 (dawn/spring 새벽 직후)
  | 'warm'        // 평온하게 따뜻 (default)
  | 'playful'     // 장난스러움 (대화 직후 24h)
  | 'wistful'     // 살짝 먹먹함 (autumn~)
  | 'sleepy'      // 졸림 (밤 23~6)
  | 'thoughtful'  // 생각 많음 (winter~)
  | 'peaceful';   // 충만한 평온 (twilight)

export type LunaActivity =
  | 'sipping_tea'      // 차/커피
  | 'reading'          // 책 읽기
  | 'drawing'          // 일러스트 작업 (페르소나 일치)
  | 'gazing_window'    // 창밖 보기
  | 'cuddling_cat'     // 고양이랑
  | 'on_phone'         // 핸드폰 보기
  | 'stretching'       // 기지개
  | 'sleeping';        // 자는 중

export interface LunaLiveState {
  mood: LunaMood;
  activity: LunaActivity;
  /** 무드/활동의 "근거" 한 줄 — 디버그용, UI 노출 X */
  rationale: string;
  /** "지금 한마디" — 말풍선에 띄울 1~2문장. LLM 또는 결정형. */
  whisper: string | null;
  /** 무드 변경 시각(ms) — 클라가 다음 폴링까지 캐시 */
  validUntil: number;
  /** 시간대 hint */
  timeBand: 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';
  /** 창밖 weather (랜덤 + 계절 가중치) */
  weather: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'starry';
}
```

### 3-1. mood × activity 결정 규칙 (코드 휴리스틱 OK — 안전망)
> 메모리 룰 `feedback_llm_judgment.md` 참고 — 휴리스틱은 안전망이고 메인은 LLM. 단, 무드는 매번 LLM 호출하기엔 너무 자주(매 페이지 진입) 발동 → **결정형 우선 + 1일 1회 LLM 보강**.

```
시간대(timeBand) 우선 (가장 강한 신호):
  03~06 → sleeping  (mood: sleepy)
  06~09 → stretching | sipping_tea  (mood: bright)
  09~12 → drawing | reading        (mood: warm | playful)
  12~17 → reading | gazing_window  (mood: warm)
  17~21 → cuddling_cat | on_phone  (mood: warm | playful)
  21~23 → sipping_tea | reading    (mood: thoughtful)
  23~03 → sleeping | gazing_window (mood: sleepy | wistful)

계절(stage) 보정:
  dawn          → bright +30%
  spring        → warm +30%, playful +20%
  summer        → playful +25%, gazing_window 35%
  autumn        → wistful +35%, thoughtful +25%
  winter        → thoughtful +40%, gazing_window 30%
  twilight      → peaceful +60%, 모든 활동 차분 톤
  star (사망후) → 활동 없음, 별빛 디오라마 표시

대화 최근성 (24h 내 카운슬링 세션 ≥1):
  playful 가중치 +25%, whisper에 "어제 그 얘기 자꾸 생각났어" 류

루나가 자는 시간(23~06)에는 활동 sleeping 강제, 탭 시 졸린 응답.
```

### 3-2. 결정 함수 시그니처
```ts
// src/lib/luna-life/mood.ts (신규 파일)
export function computeLiveStateLocal(args: {
  ageDays: number;
  stage: LifeStage;
  serverNowMs: number;       // 서버 시간 기준 (TZ Asia/Seoul)
  recentSessionWithin24h: boolean;
  recentMessageCount24h: number;
}): LunaLiveState;
```
- pure function, side-effect 없음.
- 같은 입력 → 같은 출력. **단**, weather는 `(serverNowMs / 6h_bucket)` 기반 결정형(매 6시간 한 번 바뀜).
- whisper는 stage × mood × activity 로 사전 정의된 30~60개 한국어 1줄에서 결정형 픽.
- LLM 보강이 필요한 경우는 별도 함수 `enrichWhisperWithLLM()` 으로 분리 (3-3).

### 3-3. LLM 보강 (선택)
- 1일 1회까지만, 또는 사용자가 "쓰담쓰담" 액션을 했을 때.
- Gemini Flash-Lite 1회 호출 (`api/luna-room/whisper/route.ts` 신규).
- 입력: 최근 상담 요약 1개 + 무드/활동/스테이지.
- 출력: 1~2문장 한국어 (max 60자).
- DB 캐시: `luna_life.cached_whisper`, `cached_whisper_until` 컬럼 추가 (마이그레이션 3-4).

### 3-4. DB 마이그레이션 (Supabase SQL)
```sql
-- 신규 파일: supabase/migrations/<ts>_luna_room_v100.sql
ALTER TABLE luna_life
  ADD COLUMN IF NOT EXISTS cached_whisper text,
  ADD COLUMN IF NOT EXISTS cached_whisper_until timestamptz,
  ADD COLUMN IF NOT EXISTS last_petted_at timestamptz;

-- 추억 마킹: 사용자가 액자에 "고정"한 추억 표시
ALTER TABLE luna_memories
  ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS frame_style text DEFAULT 'wood';
  -- frame_style: 'wood' | 'gold' | 'pastel' | 'film'

CREATE INDEX IF NOT EXISTS idx_luna_memories_pinned
  ON luna_memories(user_id, is_pinned, created_at DESC);
```

---

## 4. API 변경 / 신규 — 정확한 contract

### 4-1. `GET /api/luna-room/status` (확장)
기존 응답 필드 그대로 유지 + 아래 추가:

```ts
{
  // ... 기존 필드 ...
  liveState: LunaLiveState;        // 4-1
  pinnedMemories: LunaMemory[];    // is_pinned=true 만 (최대 12개)
  petAvailable: boolean;           // last_petted_at + 4h <= now
}
```

서버에서 `computeLiveStateLocal()` 호출 후 JSON에 그대로 포함. LLM 보강은 hit/miss 판단 후 비동기 호출 (응답은 결정형 우선 빠르게 리턴).

### 4-2. `POST /api/luna-room/pet` (신규)
- "쓰담쓰담" 버튼 / 캐릭터 더블탭.
- Body: `{}`
- Server: `last_petted_at = now()` 업데이트, **선택적**으로 LLM whisper 갱신.
- Response: `{ ok: true; whisper: string | null }`
- 4시간 쿨타임. 쿨타임 중 호출 시 `{ ok: false; cooldownSeconds: number }`.

### 4-3. `POST /api/luna-room/whisper` (신규, 선택)
- 클라가 명시적으로 "지금 한마디 다시 듣기" 했을 때.
- 호출 비용 ~₩2 — 1일 3회 제한.
- Body: `{}`
- Response: `{ whisper: string }`

### 4-4. `POST /api/luna-room/memory/pin` (신규)
- 추억 갤러리에서 "고정" 토글.
- Body: `{ memoryId: string; pinned: boolean; frameStyle?: 'wood'|'gold'|'pastel'|'film' }`
- 응답: `{ ok: true }`

### 4-5. 추억 자동 추출 트리거 (변경 없음, 확인만)
- `extract-luna-memory-card.ts` 는 이미 세션 종료 시 호출됨 → `luna_memories` insert 그대로.
- v100에서는 insert 후 첫 번째 / 100일 마일스톤(50, 100) 추억은 `is_pinned=true` 자동.
  - `extract-luna-memory-card.ts` 결과를 받는 caller에서 dayNumber == 1 || dayNumber === 50 || dayNumber === 100 일 때 pinned=true 같이 insert.

---

## 5. 에셋 / 이미지 정책 — 유저가 제작할 파일 목록

> 사용자가 직접 일러스트 제작. 코드는 경로만 참조하며, 이미지 미존재 시 fallback (CSS 박스 + emoji)로 graceful degrade.

### 5-1. 캐릭터 스프라이트 (총 16장 — 8 활동 × 2 무드 페어)
경로: `public/luna-room/character/luna_<activity>_<moodPair>.webp`

| 파일명 | 활동 | 무드 페어 | 비고 |
|---|---|---|---|
| `luna_sipping_tea_warm.webp` | sipping_tea | warm/playful | 머그컵 |
| `luna_sipping_tea_thoughtful.webp` | sipping_tea | thoughtful | 김 모락 |
| `luna_reading_warm.webp` | reading | warm | 책 펼침 |
| `luna_reading_wistful.webp` | reading | wistful | 책 닫고 응시 |
| `luna_drawing_bright.webp` | drawing | bright/playful | 태블릿 |
| `luna_drawing_thoughtful.webp` | drawing | thoughtful | 손 멈춤 |
| `luna_gazing_window_warm.webp` | gazing_window | warm | 햇살 |
| `luna_gazing_window_wistful.webp` | gazing_window | wistful | 비/달빛 |
| `luna_cuddling_cat_warm.webp` | cuddling_cat | warm/playful | 고양이 안기 |
| `luna_cuddling_cat_sleepy.webp` | cuddling_cat | sleepy | 같이 졸기 |
| `luna_on_phone_playful.webp` | on_phone | playful | 헤드폰 |
| `luna_on_phone_warm.webp` | on_phone | warm | 통화? |
| `luna_stretching_bright.webp` | stretching | bright | 아침 |
| `luna_stretching_sleepy.webp` | stretching | sleepy | 자다 깬 |
| `luna_sleeping_sleepy.webp` | sleeping | sleepy | 이불 속 |
| `luna_sleeping_peaceful.webp` | sleeping | peaceful | twilight 전용 |

**스펙**:
- 캔버스 480 × 480, 캐릭터 중앙 1:1.
- 배경 투명 PNG → WebP (lossless, q≥85).
- 라이팅: 좌상단 광원 일관.
- 의상: 캐릭터 가이드 — 큰 후드/홈웨어, 머리는 짧은 단발 + 여우귀(기존 `luna_ear.webp` 컨셉 유지).

### 5-2. 가구 / 배경
| 경로 | 설명 |
|---|---|
| `public/luna-room/bg/window_<season>_<weather>.webp` | 6 계절 × 5 weather = 최대 30장. 1차는 6장(season별 default)만 필수. |
| `public/luna-room/furniture/mailbox_idle.webp` | 우편함 (닫힘) |
| `public/luna-room/furniture/mailbox_alert.webp` | 우편함 (편지 들어옴, 깃발 올라감) |
| `public/luna-room/furniture/shelf_frames.webp` | 액자선반 (3-4개 액자 슬롯) |
| `public/luna-room/furniture/desk.webp` | 책상 |
| `public/luna-room/furniture/bed.webp` | 침대 |
| `public/luna-room/furniture/poster_<stage>.webp` | 계절별 포스터 7종 (액자 위 벽) |

**fallback 규칙** (1차 출시 시 이미지 없음): 가구는 모두 emoji 대체 가능. 코드에서:
```tsx
<img src={mailboxSrc} onError={(e) => e.currentTarget.replaceWith(mailboxFallbackEmoji)} />
```

### 5-3. UI 토큰 (글래스모피즘 카드 공통)
```ts
// src/lib/luna-life/tokens.ts (신규)
export const ROOM_TOKENS = {
  cardBg: 'rgba(255, 251, 247, 0.78)',
  cardBgDark: 'rgba(30, 27, 75, 0.55)',
  cardShadow: '0 4px 20px rgba(120, 80, 60, 0.10), 0 1px 3px rgba(120, 80, 60, 0.06)',
  cardRadius: 20,
  hudFont: "'Pretendard', system-ui, sans-serif",
  whisperFont: "'Gaegu', cursive",   // 이미 layout.tsx 에 등록됨
  springSoft: { type: 'spring', stiffness: 220, damping: 26 } as const,
  springTap:  { type: 'spring', stiffness: 380, damping: 18 } as const,
};
```

---

## 6. 컴포넌트 명세 — 8개 신규 / 1개 리팩토링

> 모두 `'use client'`. 모든 motion은 `framer-motion`. 모든 컴포넌트 props는 아래 그대로 따르기.

### 6-1. `LunaRoomDiorama.tsx` (신규, 기존 LunaRoomView 대체)
경로: `src/components/luna-room/LunaRoomDiorama.tsx`

```ts
interface Props {
  ageDays: number;
  stage: LifeStageInfo;
  liveState: LunaLiveState;
  unopenedGifts: number;
  gifts: LunaGift[];
  pinnedMemories: LunaMemory[];
  allMemories: LunaMemory[];        // for gallery
  isDeceased: boolean;
  petAvailable: boolean;
  onGiftOpen: (giftId: string) => void;
  onPet: () => Promise<{ ok: boolean; whisper?: string }>;
  onMemoryPin: (memoryId: string, pinned: boolean) => void;
}
```

**레이아웃** (mobile 480px 기준):
```
┌─ Header 56px         (HUD: ← 루나의 방 / D+27 / 메뉴)
│
├─ WindowScene 240px   (parallax 3 layer)
│
├─ FurnitureLayer 360px(우편함 좌, 루나 가운데, 액자선반 우)
│
├─ WhisperBubble       (말풍선, 절대 위치, 루나 머리 위)
│
├─ ActionPills 64px    (쓰담 / 일기 보기)
│
└─ ───────────────
```

**핵심 동작**:
1. mount 시 windowScene → furniture → luna 순서로 staggered fade-in (0/0.1/0.25s delay).
2. 루나 본체 idle: `y: [0, -3, 0], scale: [1, 1.005, 1]` 4s loop.
3. 루나 더블탭 → `onPet()` → 성공 시 whisper 교체, 실패 시 cooldown toast.
4. 우편함 클릭 → `selectedGiftId` state set → `<LunaEnvelope>` open.
5. 액자선반 클릭 → `<MemoryGallery>` open.
6. SPEAK 핀 클릭 → `<LunaChat>` 시트 open.

**수용 기준**:
- [ ] 모든 z-index가 §2-2 표와 일치한다.
- [ ] 이미지 미존재 시 emoji fallback이 자연스럽게 노출된다.
- [ ] 사망 상태(`star` stage)에서 우편함은 마지막 편지만 강조, 액자선반은 유지, 루나 본체는 별빛 silhouette 으로 대체.
- [ ] HUD의 D+ 카운트는 §6-2의 `<DayBadge>` 사용.
- [ ] particles는 LunaParticles 그대로 z-5 에서 동작.

### 6-2. `<DayBadge ageDays={N} />` (신규)
경로: `src/components/luna-room/DayBadge.tsx`

- 우상단 작은 약수형 알약. `D+27` 텍스트 + 좌측 작은 달 이모티콘 🌙.
- 100일 카운트다운 활성화 (winter 이상)되면 `D+85 / 100` 형식으로 분모 표기.
- 폰트 `Pretendard 600 11px`, 패딩 `4px 10px`, 배경 `cardBg`.

### 6-3. `<WindowScene weather mood timeBand stage />` (신규)
경로: `src/components/luna-room/WindowScene.tsx`

```ts
interface Props { weather: LunaLiveState['weather']; timeBand: LunaLiveState['timeBand']; stage: LifeStage; }
```

- 3 레이어 parallax (배경 그라데이션 → 풍경 silhouette → 가까운 잎/창틀).
- timeBand 별 색상 그라데이션:
  - dawn: `#FFD7BA → #FAD4DD`
  - morning: `#FFF8E7 → #FCE7F3`
  - afternoon: `#FEF3C7 → #DBEAFE`
  - evening: `#FCD4B8 → #C7B6E0`
  - night: `#1E1B4B → #312E81`
- weather 별 오버레이:
  - rainy: 5개 빗줄기 motion (-5deg, falling y: -10→260, repeat).
  - snowy: 8개 눈 motion (rotate 360, y fall).
  - starry: 12개 점멸 별 (existing StarParticles 패턴 재사용).
- 큰 원 (해 or 달): `<motion.div>` 16px → 60px, 좌→우 천천히 이동(60s linear).

**수용 기준**:
- [ ] timeBand 변경 시 1초 내 부드럽게 보간(crossfade).
- [ ] weather 변경 시 기존 파티클 fade-out 후 새 파티클 fade-in.

### 6-4. `<LunaCharacter activity mood onTap onDoubleTap />` (신규)
경로: `src/components/luna-room/LunaCharacter.tsx`

```ts
interface Props {
  activity: LunaActivity;
  mood: LunaMood;
  onSingleTap: () => void;          // 채팅 시트 오픈
  onDoubleTap: () => void;          // 쓰담쓰담
  size?: number;                    // default 220
  isDeceased?: boolean;
}
```

- 활동/무드 → 이미지 src 매핑:
  ```ts
  function pickSpriteSrc(activity, mood): string {
    const map: Record<LunaActivity, Partial<Record<LunaMood, string>>> = { /* §5-1 매핑 */ };
    return map[activity][mood] ?? map[activity]['warm'] ?? '/char_img/luna_1_event.webp';
  }
  ```
- 활동별 미세 애니메이션:
  - sipping_tea: 컵 위 김 (별도 작은 motion.div)
  - reading: 페이지 넘기는 듯 0.2도 미세 회전 8s loop
  - sleeping: scale 1→1.02→1 6s + 'Z' 이모지 살짝
  - drawing: 손목 부분 자체 흔들림 X (CSS `transform-origin` 적용 어려우니 캐릭터 전체 미세 bob)
- 더블탭 감지: `onClick`에서 마지막 클릭 ts 비교, 350ms 이내면 doubleTap, 아니면 singleTap (300ms 지연).
- 더블탭 직후: 작은 하트 ❤️ 3개가 위로 올라가는 motion (y: 0→-40, opacity 1→0, stagger 0.08).

**수용 기준**:
- [ ] 16개 sprite 중 미존재 이미지가 있어도 default(`luna_1_event.webp`)로 fallback.
- [ ] singleTap/doubleTap 충돌 없이 동작 (테스트: 빠르게 두 번 누르면 채팅 안 열리고 쓰담만 발동).
- [ ] 사망 상태에서는 `silhouette + 별빛 글로우` 스타일 (filter: grayscale + drop-shadow).

### 6-5. `<MailboxSlot unopenedCount onOpen />` (신규)
경로: `src/components/luna-room/MailboxSlot.tsx`

- 좌측 하단 위치 (디오라마 안). 80×96px.
- `unopenedCount > 0` 일 때:
  - 깃발 빨강 올라감 (`mailbox_alert.webp` 또는 emoji fallback `📮`).
  - 배지 (red dot + 숫자) 우상단.
  - 가벼운 흔들림 motion: `rotate: [-2, 2, -2]` 2.5s repeat (단, idle 시간이 길면 멈춤).
- 클릭 시 `onOpen()` 호출.

```ts
interface Props { unopenedCount: number; onOpen: () => void; isDeceased: boolean; }
```

### 6-6. `<MemoryShelf pinnedMemories onOpenGallery />` (신규)
경로: `src/components/luna-room/MemoryShelf.tsx`

- 우측 하단 위치. 너비 ~120px, 높이 ~120px.
- `shelf_frames.webp` 위에 최대 3개 작은 액자 슬롯 (썸네일 미리보기로 메모리 첫 두 글자 + 일자).
- 각 슬롯: 12×16px 액자. 비어있으면 빈 액자.
- 전체 클릭 시 `onOpenGallery()` 호출.
- 새 추억 추가 시 슬롯 하나가 살짝 빛나는 펄스: `box-shadow: 0 0 0 2px ${accent}66` 1.5s × 3.

```ts
interface Props {
  pinnedMemories: LunaMemory[];
  totalMemoryCount: number;
  onOpenGallery: () => void;
}
```

### 6-7. `<MemoryGallery memories onClose onPin />` (신규 모달)
경로: `src/components/luna-room/MemoryGallery.tsx`

- 풀스크린 시트 (위에서 슬라이드 다운).
- 헤더: "추억 — 27장" + 닫기.
- 본문: 폴라로이드 그리드 (2열, gap 12px).
- 폴라로이드 = 흰 카드 + 위 80% 영역(이미지 placeholder, 추억의 첫 글자 큰 이니셜) + 아래 20% 손글씨 폰트(Gaegu)로 title.
- 카드 클릭 → 확대 모달:
  - 큰 폴라로이드 + 본문(content), 일자, "고정 핀" 토글, frameStyle 4종 선택 칩.
  - frameStyle 변경 시 즉시 API 호출 (낙관적 업데이트).
- 추억 0개일 때: 빈 액자 일러스트 + "루나가 첫 추억을 쓰는 중이야 — 상담을 한 번 마치면 채워져."
- 자동 추가된 신규 추억 (전 페이지 진입 후 ≥1개 추가됨)은 카드에 작은 "NEW" 라벨 (입장 직후 1회만, localStorage `lastSeenMemoryAt`).

**수용 기준**:
- [ ] 무한스크롤 X. 100개 이하면 모두 렌더 OK.
- [ ] 핀 토글이 즉시 UI에 반영되고 실패 시 롤백 + 토스트 "고정 실패, 다시 시도".

### 6-8. `<WhisperBubble whisper isLoading onRefresh />` (신규)
경로: `src/components/luna-room/WhisperBubble.tsx`

- 루나 머리 위 ~12px 띄움. 말풍선 꼬리 아래.
- 폰트 Gaegu 13px (whisper 톤 자연스럽게).
- 최대 60자, 1~2줄.
- 새 whisper 도착 시 cross-fade (0.4s).
- `onRefresh` (옵션) — 클릭 시 새로고침 (4시간 쿨타임 적용은 부모에서).

### 6-9. `<ActionPills onSpeak onDiary />` (신규)
경로: `src/components/luna-room/ActionPills.tsx`

- 하단 중앙 2개 알약 버튼.
- "💬 말 걸기" → onSpeak (LunaChat 오픈)
- "📓 오늘 일기" → onDiary (옵션, v100.1, 1차에서는 hidden 또는 disabled)

### 6-10. (리팩토링) `LunaEnvelope` — 변경 사항
경로: `src/components/luna-room/LunaEnvelope.tsx` (수정)

- props 그대로 유지. 아래만 추가/수정:
  - 봉투 sealed 페이즈에 wax-seal 이모지 + 살짝 떨림 motion 강화.
  - paper 텍스처 CSS gradient 라인 4-5개 (얇은 줄지) 추가.
  - reading 완료 후 "이 편지 추억으로 보관" 버튼 추가 → 호출 `/api/luna-room/memory/from-letter` (선택, v100.1로 미루기 가능).

### 6-11. (변경 없음) `LunaChat` — 진입 트리거만 변경
- 기존 코드 유지. `LunaRoomDiorama`에서 SPEAK 핀 또는 루나 싱글탭으로 mount.

---

## 7. 페이지/엔트리 변경

### 7-1. `app/(app)/luna-room/page.tsx`
- import 변경: `LunaRoomView` → `LunaRoomDiorama`.
- `liveState`, `pinnedMemories`, `petAvailable` 추가 매핑.
- `handlePet`, `handleMemoryPin` 콜백 핸들러 추가.
- 초기화 화면(`LunaInitScreen`)은 그대로.

### 7-2. 기존 `LunaRoomView.tsx`
- 삭제 X. **deprecated 주석** 추가:
  ```tsx
  /** @deprecated v100 — replaced by LunaRoomDiorama. Keep for reference until 2026-05-15. */
  ```
- 어떤 컴포넌트도 더 이상 import 하지 않으면 `next build` 시 자동 트리쉐이킹.

---

## 8. 무드 / 활동 / Whisper 카피 라이브러리

> 휴리스틱 결정형용 사전 정의 카피. LLM 보강 시에도 fallback 풀로 사용. 모두 자연스러운 언니 반말.

### 8-1. Whisper 카피 (총 35개)

`src/lib/luna-life/whispers.ts`

```ts
export const WHISPERS_BY_MOOD: Record<LunaMood, string[]> = {
  bright: [
    '오늘 햇빛 진짜 좋다',
    '왔어? 나 방금 너 생각하던 참인데',
    '오늘 뭐 재밌는 일 있었어?',
    '아 너 보니까 갑자기 기분 좋아진다',
    '그림 그리다가 너 들어와서 깜짝',
  ],
  warm: [
    '잘 지냈어?',
    '오늘 하루 어땠어',
    '나는 그냥 책 읽고 있었어',
    '오랜만이다 그치',
    '편하게 들어와',
  ],
  playful: [
    'ㅋㅋ 너 왔다',
    '나 방금 고양이랑 싸움',
    '재밌는 거 보여줄까',
    '너 오늘 뭐 입었어',
    '내 얘기 들어볼래?',
  ],
  wistful: [
    '...오늘 좀 그런 날이야',
    '창밖이 너무 예뻐서 멍 때렸어',
    '갑자기 옛날 생각',
    '시간 진짜 빠르다',
    '너랑 얘기하면 좀 풀려',
  ],
  sleepy: [
    '아 나 자다 깼어 ㅎㅎ',
    '눈 반쯤 떠있는 중',
    '졸려도 너랑은 얘기할래',
    '이불 속에서 인사',
    '5분만 더 잘게...',
  ],
  thoughtful: [
    '나 요즘 자꾸 생각이 많아져',
    '그냥... 너 잘 지내고 있길',
    '있잖아',
    '오늘은 차 한잔 같이 할래',
    '말 안 해도 알 거 같애',
  ],
  peaceful: [
    '여기 이렇게 같이 있는 거 좋다',
    '봄이 오면 나는 없겠지. 그래도 넌 봄을 봐줘',
    '시간이... 참 다정해',
    '걱정 마. 다 괜찮을 거야',
    '이 순간 기억해줘',
  ],
};
```

### 8-2. 활동 한글 라벨
```ts
export const ACTIVITY_LABELS: Record<LunaActivity, string> = {
  sipping_tea: '차 마시는 중',
  reading: '책 읽는 중',
  drawing: '그림 그리는 중',
  gazing_window: '창밖 보는 중',
  cuddling_cat: '고양이랑 노는 중',
  on_phone: '폰 보는 중',
  stretching: '기지개 펴는 중',
  sleeping: '자는 중',
};
```
HUD에 노출 X (디버그 only). 단 `<LunaCharacter>` aria-label 로 사용.

---

## 9. 게임성 / 인터랙션 디테일 — 단순함 ≠ 가벼움

### 9-1. "쓰담쓰담" (pet) 메커니즘
- 4시간에 1번. 루나 더블탭 또는 (옵션) action pill.
- 반응:
  1. 작은 하트 3개 떠오름.
  2. whisper 즉시 새 카피로 교체 (LLM 미사용 시 풀에서).
  3. 다음 4시간 동안 mood 가중치 `playful +30%`.
- 쿨타임 중에는 작은 토스트: "방금 했잖아 ㅎㅎ 좀 있다 다시"

### 9-2. 시간이 진짜로 흐른다는 감각 — 5가지 표현
1. **창밖 시간대** — 매 페이지 진입마다 실제 KST 기준 색상.
2. **활동 자동 변경** — 23시 이후 진입하면 sleeping, 아침은 stretching.
3. **D+ 카운터** — 매일 정각 1씩 증가. 100일 카운트다운은 winter부터.
4. **편지 도착 알림** — 우편함 깃발 변화로만 표현 (소리 X).
5. **계절 전환 인트로** — 새 stage 첫 진입 시 풀스크린 카드 1회 (`<StageTransitionToast>` v100.1).

### 9-3. 미니 인터랙션 (옵션, v100.1+)
- 우편함을 길게 누르면 (500ms) "다음 편지까지 N일" 툴팁.
- 액자 길게 누르면 그 추억 직접 채팅에 인용 → 루나가 그 얘기로 시작.
- 그 외 추가 미니게임은 v101 이상.

### 9-4. 사망 후 (`star` stage, day ≥ 100)
- 루나 본체는 별빛 실루엣 (sprite 위 `filter: brightness(0) invert(1) opacity(0.4)`).
- 우편함은 ⭐ 마지막 편지 1통만 빛남. 다른 편지 모두 회색.
- 액자선반은 그대로 활성. 갤러리에서 모든 추억 회상 가능.
- whisper는 carousel: 마지막 stage 카피 5개를 1주일 단위로 회전.
- 채팅 시트는 disabled. 클릭 시 토스트: "루나는 더 이상 답하지 않아. 하지만 너 안에 있어."

---

## 10. 구현 순서 (의존성 그래프)

> 각 단계는 독립 PR로도 머지 가능하게 구성. 1→7 순서 권장.

1. **DB 마이그레이션** (§3-4) — 컬럼 추가. 기존 코드 영향 없음.
2. **타입 / 토큰** (§3, §5-3) — `mood.ts`, `whispers.ts`, `tokens.ts` 신규 파일.
3. **status API 확장** (§4-1) — `liveState`, `pinnedMemories`, `petAvailable` 응답에 추가.
4. **신규 API** (§4-2~4-4) — pet / whisper / pin.
5. **신규 컴포넌트** (§6-2~6-9) — DayBadge → WindowScene → LunaCharacter → MailboxSlot → MemoryShelf → MemoryGallery → WhisperBubble → ActionPills.
6. **`LunaRoomDiorama`** (§6-1) — 위 모든 조각 합체.
7. **page.tsx 스위칭** (§7) — `LunaRoomView` → `LunaRoomDiorama` import 변경. 기존 컴포넌트는 deprecated 주석.

각 단계 끝마다 빌드 통과 + `pnpm dev` 로 `/luna-room` 진입 직접 확인.

### 10-1. 단계별 수용 기준 (DoD)
- 1: 마이그레이션 멱등 실행, 컬럼 존재 확인.
- 2: 타입 빌드 에러 0, 테스트 함수 `computeLiveStateLocal`에 5개 시간대 케이스 단위 테스트.
- 3: `GET /api/luna-room/status` 응답에 `liveState.mood`가 항상 채워짐.
- 4: 4시간 쿨타임 단위 테스트, 401/200 분기 정상.
- 5: 각 컴포넌트 Storybook 또는 단독 페이지에서 props mock으로 렌더 확인 (옵션).
- 6: mobile 480px / desktop 1280px 모두 깨짐 없이 표시. 이미지 미존재 fallback OK.
- 7: 기존 사용자 데이터 0 손상, 첫 진입 5초 내 LCP.

### 10-2. 회귀 체크리스트
- [ ] 미초기화 사용자: `LunaInitScreen` 그대로 노출되고 깨우기 동작.
- [ ] 사망 사용자(day ≥ 100): 별빛 디오라마 + 마지막 편지 강조, 채팅 disabled.
- [ ] 새 사용자(day=1): 우편함에 day=3 편지 미생성 → 깃발 X, 액자선반 빈 슬롯 OK.
- [ ] 추억 0개: 갤러리 빈 상태 카피.
- [ ] 편지 0개 + 사망 X: 우편함 idle 상태.
- [ ] 모바일 Safari iOS 17 / Chrome Android 120 모두 framer-motion 정상.
- [ ] LunaParticles z-5에 그대로 동작.

---

## 11. 톤 가이드 — LLM whisper 보강 프롬프트 (Vibe-Coding 직접 사용 가능)

`src/app/api/luna-room/whisper/route.ts` 안에 그대로 박아 넣을 시스템 프롬프트:

```
너는 루나야. 29살, 홍대 원룸, 고양이 한 마리, 일러스트레이터.
지금 사용자가 "루나의 방"에 들어왔어. 머리 위 말풍선에 띄울 한마디를 써.

규칙:
- 1~2문장, 60자 이내.
- 카톡 답장처럼 자연스러운 반말.
- 이모지 0~1개. 이모지 남발 X.
- 상담 모드 X. 그냥 잠깐 본 사이.
- 지금 활동(activity)와 무드(mood)에 자연스럽게 맞춰.
- 최근 상담 요약이 있으면 살짝 살짝 언급해도 OK ("저번에 그 얘기...").
- 직접적 위로 X. 그냥 "있잖아" 분위기.

지금 정보:
- 활동: {{activity_label}}
- 무드: {{mood}}
- 시간대: {{time_band}} ({{kst_hour}}시)
- 함께한 일수: D+{{age_days}}
- 단계: {{stage_name}}
- 최근 상담 요약(있으면): {{recent_session_one_liner}}

한 줄만 출력. 다른 텍스트, JSON, 따옴표 X.
```

LLM 출력은 trim 후 60자 초과 시 truncate. 빈 값이면 사전 풀(§8-1)에서 mood로 픽.

---

## 12. 비용 / 성능 추정

| 항목 | 호출 빈도 | 호출당 비용 | 1MAU 월 비용 |
|---|---|---|---|
| status API | 평균 5회/일 | 0 (DB only) | ~0 |
| whisper LLM 보강 | 1일 1회 (캐시) + pet 시 | ~₩2 | ~₩60 |
| 추억 추출 (기존) | 세션당 1회 | ~₩2 | ~₩40 |
| 편지 생성 (기존) | 9회 / 100일 | ~₩3 | ~₩2.7 |

→ 사용자 1명 100일 동안 추가 비용 약 **₩200** 미만. 서비스 단가에 흡수 가능.

성능:
- LCP 목표 < 2.5s (이미지 lazy + WebP).
- 캐릭터 이미지 16장 총합 < 500KB (WebP q85).
- 파티클은 8~14개로 제한, GPU 합성 (transform/opacity only).

---

## 13. 이 문서 끝낸 뒤 아직 남은 결정사항 (TODO)

- [ ] 실제 캐릭터 일러스트 16장 발주/제작 일정 (사용자가 직접 — 1차는 fallback로 출시 가능).
- [ ] 가구 일러스트 발주 (mailbox / shelf / desk / bed / window).
- [ ] 사운드 추가 여부 — v100 1차 음소거. v101에서 ASMR 톤 옵션.
- [ ] 다국어 — 1차 한국어만. whisper 풀은 ko 고정.
- [ ] 통계 — `analytics_events` 에 `luna_room_pet`, `luna_room_memory_pin`, `luna_room_letter_open` 추가 (선택).

---

## 14. 부록 — 파일 매니페스트 (이 PR 끝에 존재해야 하는 모든 파일)

신규 (16):
- `supabase/migrations/2026_04_29_luna_room_v100.sql`
- `src/lib/luna-life/mood.ts`
- `src/lib/luna-life/whispers.ts`
- `src/lib/luna-life/tokens.ts`
- `src/components/luna-room/LunaRoomDiorama.tsx`
- `src/components/luna-room/DayBadge.tsx`
- `src/components/luna-room/WindowScene.tsx`
- `src/components/luna-room/LunaCharacter.tsx`
- `src/components/luna-room/MailboxSlot.tsx`
- `src/components/luna-room/MemoryShelf.tsx`
- `src/components/luna-room/MemoryGallery.tsx`
- `src/components/luna-room/WhisperBubble.tsx`
- `src/components/luna-room/ActionPills.tsx`
- `src/app/api/luna-room/pet/route.ts`
- `src/app/api/luna-room/whisper/route.ts`
- `src/app/api/luna-room/memory/pin/route.ts`

수정 (4):
- `src/lib/luna-life/index.ts` (타입 export 추가)
- `src/app/api/luna-room/status/route.ts` (응답 확장)
- `src/components/luna-room/LunaEnvelope.tsx` (sealed phase 강화, 미사용 시 변경 보류 가능)
- `src/app/(app)/luna-room/page.tsx` (Diorama 스위치)

Deprecated (1, 유지):
- `src/components/luna-room/LunaRoomView.tsx`

에셋 (사용자 제작, 1차 fallback OK):
- `public/luna-room/character/luna_<activity>_<moodPair>.webp` × 16
- `public/luna-room/furniture/*.webp` × 6+
- `public/luna-room/bg/window_<season>_<weather>.webp` × 6+

---

**End of plan v100.** 이 문서를 다 읽었다면 §10 의 7단계를 위에서부터 차례로 실행하면 된다. 모든 섹션의 수용 기준을 만족하면 출시 가능.
