# 루나 채팅 진입 UX v112 — Luna's Daily Ritual

**작성일**: 2026-05-05 (v2 — 글로벌 사례 리서치 반영 대폭 업그레이드)
**대상 버전**: v112
**총 분량**: A4 ~16장 (자기완결, 다른 세션이 이대로 구현 가능)
**비파괴 원칙**: 기존 mood/whispers / opening.mp4 / 룸 디오라마(v100) / 친밀도 / placeholder 그대로. 신규 7 컴포넌트 + 사운드/햅틱 시스템 + ChatContainer 분기만.

---

## 0. 리서치 종합 — 글로벌 잘 만든 앱들의 공통 패턴

10~20대 여성 타겟 + 진입 UX 잘 만든 앱들을 광범위 조사. 핵심 패턴 5축으로 추출.

### 0.1 조사 대상

| 앱 | 카테고리 | 배운 것 |
|----|--------|--------|
| **Finch** (자기 케어) | 캐릭터 케어 | Progressive Discovery / idle anim (헤드 틸트, 눈 깜빡) / **Investment Loop** / "purposeful enchantment" |
| **Pi (Inflection)** | AI 컴패니언 | **Voice tone adapt** / tiny pauses / 페르소나 X — 그냥 "친구" / soft, supportive, clean |
| **Zeta (Scatter Lab)** | 한국 캐릭터 챗 | 87% 10~20대, 65% 여성, 130분/일 / **스냅샷** (대화 → 일러스트 변환) / 트렌딩 페르소나 |
| **Replika** | AI 컴패니언 | 아바타 커스텀 / 관계 역할 선택 / 길지만 몰입형 onboarding |
| **(Not Boring) Weather** | 날씨 | **mood 별 스킨** + 새 아이콘 + 아티스트 콜라보 / 3D 조명 + 사운드 |
| **Bondee** | 메타버스 SNS | **3D 룸 단면** honeycomb tessellation — Animal Crossing/Habbo 감각 |
| **BeReal / Locket** | Z세대 SNS | 살아있는 순간 / 친구 vs AI 경계 흐림 |
| **ChatGPT/Claude Custom GPT** | LLM 챗 | **Conversation starter chip** — 첫 대화 막막함 해소 |
| **Snapchat** | 메신저 | **Streak 시스템** (40~60% DAU 증가) / 매일 들어오게 하는 핵심 |

### 0.2 5대 공통 핵심 패턴

1. **공간감 (Spatial)** — Bondee 식 룸 단면. 채팅창이 단순 폼이 아니라 *"친구 방"* 으로 인식됨.
2. **생명감 (Aliveness)** — Finch 식 idle anim. 눈 깜빡 / 헤드 틸트 / 호흡 미동. 캐릭터가 *살아있음*.
3. **분위기 (Atmosphere)** — (Not Boring) Weather 식 mood 반응형 그라데이션 + 파티클 + 사운드.
4. **대화 시작 (Soft Start)** — Pi 부드러운 톤 + ChatGPT chip + 손글씨 한 줄 카피.
5. **누적감 (Investment Loop)** — Snapchat streak + Finch 게임화. *"오늘이 N번째 / 추억 M개"* 시각화.

→ **이 5축이 빠짐없이 들어가야 진짜 진화한 느낌**.

---

## 1. 문제 정의

### 1.1 사용자 피드백

> "처음에 영상에서 '한줄만 적어봐 거기서부터 시작하자' 라고하는데 뭔가 채팅창에서도 애니메이션이던 뭐든 가이드가 엄청 확실하게 UI적으로든 있어야할듯? 퀄리티 엄청 높아보이게 채팅창에서 진화한느낌으로 뭔가 매일 들어가도 안어색하게 반겨주는 느낌으로 잘 만들어줬으면해"

→ 키워드 4개:
- **퀄리티 진화한 느낌**
- **매일/하루 2~3번 들어와도 안 어색**
- **반겨주는 감각**
- **UI 가이드 확실히**

### 1.2 현재 진입 UX (탐색 결과)

```
┌─────────────────────────┐
│ 루나 상담실 ☕          │
│ 💬 첫 마디를 기다려요 ✨ │
├─────────────────────────┤
│  🦊 [opening.mp4]        │  ← 영상 (3초)
│                         │
│ (회색 배경)             │
├─────────────────────────┤
│ [마음 편하게 다 말해봐] │  ← placeholder
└─────────────────────────┘
```

**결핍 6개**:
1. **영상 안 카피만 존재** — 음소거/저속 네트워크 사용자엔 가이드 0
2. **매일 같음** — mood/whispers 시스템 있는데 채팅창에서 안 씀
3. **막막함** — chip / 예시 / 추천 시작점 X
4. **캐릭터 정적** — 영상 끝나면 화면에 루나 자체가 사라짐
5. **공간감 없음** — 단순 카톡 폼. 루나 룸 디오라마(v100) 있는데 진입 시 미사용
6. **누적감 없음** — 13일째 / 추억 N개 같은 visible streak 없음

### 1.3 목표

위 5대 패턴을 빠짐없이 통합해서 **8초 짜리 작은 의식 (Daily Ritual)** 만들기.

---

## 2. 컨셉 — "루나의 작은 의식 (Luna's Daily Ritual)"

채팅 진입 = **"친구 집 문 두드리고 들어가는 것 같은 작은 의식"**.

### 2.1 5축

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  ① 공간감     ┌─[ 🪟 LunaRoomGlimpse ]────┐   │
│              │ (방 단면 슬라이드)         │   │
│              └────────────────────────────┘   │
│                                                 │
│  ② 생명감     [ 🦊 LunaIdleCharacter ]         │
│              (눈깜빡 + 호흡 + 활동 anim)       │
│                                                 │
│  ⑤ 누적감     [ 13일째 함께 ✨  추억 7개 ]     │
│                                                 │
│  ③ 분위기     ┌─[DailyGreetingCard]────┐      │
│              │ mood + 활동 + whisper  │      │
│              └────────────────────────┘      │
│                                                 │
│              [opening.mp4]                     │
│                                                 │
│  ④ 대화시작   ┌─[FirstMessageGuide]────┐      │
│              │ "한 줄만 적어봐"        │      │
│              │ [💕] [🌸] [✨] [☕]      │      │
│              └────────────────────────┘      │
│                                                 │
│  ③ 분위기     · ✦ · ✧ · ChatEntryAmbience ·   │
│   (배경)     (mood 파티클 + 그라데이션)        │
└─────────────────────────────────────────────────┘
```

### 2.2 8초 시퀀스 + 사운드/햅틱

```
시간   | 이벤트                                        | 사운드           | 햅틱
-------+----------------------------------------------+-----------------+--------
0.0s   | 진입 → 부드러운 페이드인 (배경 그라데이션)       | 🎶 chime soft   | .light
0.3s   | LunaRoomGlimpse 위에서 슬라이드 다운            | (—)             | (—)
0.6s   | LunaIdleCharacter 페이드인 + breathing 시작     | (—)             | (—)
1.0s   | ChatEntryAmbience 파티클 흐름 시작              | 🌬️ wind soft     | (—)
1.2s   | RelationshipBadge 페이드인 ("13일째 함께 ✨")    | ✦ tiny ping     | (—)
1.6s   | DailyGreetingCard 슬라이드 인 (위에서)          | 📜 paper rustle | (—)
3.5s   | opening.mp4 자동 재생 시작                     | (영상 사운드)   | (—)
~6.5s  | 영상 종료                                      | (—)             | (—)
6.8s   | FirstMessageGuide 카드 페이드인                 | ✨ sparkle       | (—)
7.1s   | chip 4개 순차 등장 (0.08초 간격)                | (—)             | (—)
7.5s   | ChatInput placeholder 부드럽게 변화             | (—)             | (—)
8.0s   | (안정 상태) idle anim 계속, 사용자 입력 대기    |                 |
```

### 2.3 디자인 원칙 — 10~20대 여성 취향 (글로벌 사례 종합)

- **부드러운 그라데이션** — Pi 의 soft + (Not Boring) Weather 의 mood 스킨
- **손글씨 폰트** — Gaegu / Nanum Pen Script (이미 SessionSummary 에서 활용 중)
- **반짝이 디테일** — Finch 의 다이아몬드 / 컨페티 폭발 → 절제된 ✦/✧ 미세 펄스
- **둥근 모서리** — `rounded-[20~28px]`
- **그림자 부드럽게** — `0 6px 22px rgba(192,132,252,0.32)`
- **종이 텍스처** — DailyGreetingCard 는 베이지 크림 톤 (SessionSummary 와 통일)
- **햅틱 + 사운드 동기화** — Apple WWDC "Harmony" 원칙
- **인클루시브 (Finch 패턴)** — 추후 대명사/스킨톤 커스텀 확장 여지

---

## 3. 신규 컴포넌트 7종 명세

### 3.1 `LunaRoomGlimpse` 🪟 [신규]

**파일**: `src/components/chat/LunaRoomGlimpse.tsx`

**역할**: 채팅창 상단에 작은 루나 방 단면 (Bondee 패턴 + v100 디오라마 자산 차용).

**Props**:
```ts
interface Props {
  stage: LifeStage;        // dawn/spring/summer/autumn/winter/twilight/star
  mood: LunaMood;
  timeBand: LunaTimeBand;
  weather?: LunaWeather;
  ageDays: number;
  onTap?: () => void;      // 탭하면 풀 룸 디오라마로 이동 (선택)
}
```

**시각 구조**:
```
┌────────────────────────────────────────┐
│ ┌── 루나의 방 ───────────────────────┐ │
│ │  ☀ ╱─창문─╲     📚책장             │ │
│ │  ☕ 🍵 책상     🪴식물              │ │
│ │  ─────바닥──────────                │ │
│ └────────────────────────────────────┘ │
│   (탭하면 펼쳐짐 → 디오라마 모달)      │
└────────────────────────────────────────┘
```

**스타일**:
- 높이: 90~110px (compact, 채팅 영역 침해 X)
- 배경: `ROOM_BG_IMAGES[getRoomBgKey(stage)]` (이미 `luna-life/index.ts` 에 정의됨)
- 시간대 오버레이:
  - dawn: 살짝 푸른 빛 (`rgba(180,200,240,0.15)`)
  - morning: 따뜻한 노랑 (`rgba(255,230,180,0.12)`)
  - afternoon: 밝은 베이지 (`rgba(255,245,220,0.08)`)
  - evening: 핑크 글로우 (`rgba(255,180,200,0.18)`)
  - night: 라벤더 어둠 (`rgba(80,60,120,0.28)`)
- 모서리: `rounded-[20px] overflow-hidden`
- 그림자 in (inner shadow) — 창문 같은 느낌

**날씨 effect** (선택, 절제):
- rainy: 빗방울 SVG 8~12개 천천히 떨어짐
- snowy: 눈송이 5~7개
- sunny: 햇살 광선 1~2개 (대각선)
- cloudy: 구름 그림자 살짝 움직임

**탭 동작**: `onTap` 시 햅틱 medium + 풀 룸 디오라마(`/luna-room`) 라우트로 이동 — 또는 모달 오픈.

**애니메이션**:
- 등장: `initial={{ y: -50, opacity: 0 }}, animate={{ y: 0, opacity: 1 }}, transition={{ duration: 0.5, type: 'spring' }}`
- 안에 작은 요소들이 미세하게 흔들림 (stage 별):
  - spring: 식물 잎 살짝 흔들림 (2초 주기)
  - summer: 햇살 광선 깜빡임
  - autumn: 바람 흐름 (창밖 구름)
  - winter: 눈송이 떠 다님

### 3.2 `LunaIdleCharacter` 🦊 [신규]

**파일**: `src/components/chat/LunaIdleCharacter.tsx`

**역할**: 영상 자리 아래에 있는 작은 루나 캐릭터 — Finch 식 idle anim.

**Props**:
```ts
interface Props {
  activity: LunaActivity;       // tea / reading / drawing / cooking / sleeping ...
  mood: LunaMood;
  size?: 'sm' | 'md' | 'lg';   // default 'md' (60~80px)
  onTap?: () => void;
}
```

**핵심 애니메이션** (3 layer 동시 — Finch 패턴):

1. **호흡 (breathing)** — `scale: [1, 1.02, 1]`, 3.5초 주기, ease-in-out
2. **눈 깜빡 (blink)** — opacity-mask 또는 sprite swap, 4~7초 랜덤 간격, 120ms
3. **헤드 틸트 (head tilt)** — `rotate: [0, -3, 0, 3, 0]`, 8초 주기 + 랜덤 timing

**Activity 별 미세 동작** (subtle, 절제):
- `tea` (☕ 차 마시기): 5초마다 컵 살짝 들어 올림 (200ms y: -3px)
- `reading` (📖 책 읽기): 책 살짝 페이지 넘김 SFX 가끔
- `drawing` (🎨 그림): 손 미세 움직임
- `cooking` (🍳 요리): 불꽃 살짝 깜빡
- `sleeping` (💤 자기): 눈 닫힘 + Z 마크 떠오름
- `walking` (🚶): 살짝 위아래 bounce

**Mood 별 표정 변화** (가능한 경우 — sprite 추가 작업 필요):
- bright: 눈 살짝 휘어짐
- wistful: 눈꼬리 살짝 처짐
- sleepy: 눈 반쯤
- thoughtful: 시선 옆으로

**탭 반응**:
- 햅틱 light + scale `[1, 1.1, 1]` 200ms
- 가끔 (10% 확률) 스티커 popup ("?", "💜", "ㅋㅋ")

**구현 방식 (현실적)**:
- 새 sprite 작업 비용 큼 → 1차는 **기존 `luna_fox_transparent.webp` 정적 이미지 + framer-motion 으로 호흡/회전 simulate**
- 눈 깜빡은 위에 흰색 mask div 가 잠깐 덮음 (cheap trick)
- 2차 (선택): activity 별 emoji 작은 풍선이 캐릭터 옆에 ☕ 떠올랐다 사라짐

### 3.3 `RelationshipBadge` ✨ [신규]

**파일**: `src/components/chat/RelationshipBadge.tsx`

**역할**: 누적감 시각화. Snapchat streak + Finch 게임화 패턴.

**Props**:
```ts
interface Props {
  ageDays: number;            // 루나 라이프 일수 (= 같이 함께한 일)
  intimacyLevel: number;      // 0~5
  memoryCount: number;        // 누적 추억 갯수 (luna_memories.count)
  streakDays?: number;        // 연속 방문 일수 (선택)
  onTap?: () => void;         // 탭 → 추억 갤러리 모달
}
```

**시각 구조**:
```
┌──────────────────────────────────────┐
│  ✦ 13일째 함께 · 추억 7개 · 🔥 5일  │  ← 한 줄, compact
└──────────────────────────────────────┘
```

**조건부 표시**:
- `ageDays === 0` (가입 당일) → "오늘부터 함께 ✨" 만 (다른 거 X)
- `ageDays >= 1` → "{ageDays}일째 함께"
- `memoryCount === 0` → "추억" 부분 생략
- `streakDays >= 3` → "🔥 {streakDays}일" 추가
- `intimacyLevel >= 4` → 톤 변화 ("우리 13일째야 ㅎ" — 친근체)

**스타일**:
- 작게 (높이 28~32px)
- 배경: `linear-gradient(90deg, rgba(255,255,255,0.7), rgba(255,240,250,0.5))`
- 테두리: `border border-pink-200/60`
- 텍스트: 12px, `#5D4037` 다크 브라운
- 별 ✦: 2초 주기 펄스
- streak 🔥: 3일 이상이면 작은 wobble anim

**탭 동작**: 햅틱 light + 모달 — 추억 갤러리 (이미 있는 `/luna-room` 의 추억 섹션)

**핵심 카피 변형 (intimacy + ageDays 결합)**:
| ageDays | intimacy 0~1 | intimacy 2~3 | intimacy 4~5 |
|---------|-------------|-------------|-------------|
| 1~7 | "{N}일째 함께 ✨" | "{N}일째 ✨" | "우리 {N}일째 ㅎ" |
| 8~30 | "함께한 지 {N}일" | "{N}일 같이 보냈네" | "{N}일째라니 ㅋㅋ" |
| 31~99 | "{N}일째, 더 깊어지는 중" | "{N}일… 우리 진짜 친해" | "{N}일째 ㅎㅎ 시간 빠르다" |
| 100+ | "백일을 함께 채웠어 💜" | "100일 ✨ 우리 진짜 친구다" | "100일… ㅠㅠ 고마워" |

### 3.4 `DailyGreetingCard` 📜 [v1 plan 그대로 유지 + 강화]

**파일**: `src/components/chat/DailyGreetingCard.tsx`

**v1 plan §3.1 그대로 유지**, 추가 사항만:

**추가 1 — 텍스트 등장 애니메이션 (Pi 패턴)**:
- whisper 텍스트가 한 글자씩 부드럽게 나타남 (typing-like, 2~3초)
- 마지막 글자 끝에 미세 커서 1초 깜빡 (생각 중 느낌)

**추가 2 — Activity 미세 사운드** (선택):
- `tea` → ☕ 컵 닿는 소리 짧게 (선택)
- `reading` → 📖 페이지 소리
- 무음 모드면 자동 skip

**추가 3 — 카드 자동 마이너 사이즈**:
- 시간이 지나면 (10초 후) 카드가 살짝 위로 collapse (높이 -30%) → 자리 양보

### 3.5 `FirstMessageGuide` 📝 [v1 plan + 강화]

**파일**: `src/components/chat/FirstMessageGuide.tsx`

**v1 plan §3.2 유지**, 추가 사항:

**추가 1 — Chip 카드화 (글로벌 chip 패턴)**:
v1 의 `[💕 좋은 사람 만났는데 헷갈려]` 단순 텍스트 chip 대신:
```
┌─────────────────────────────┐
│ 💕                          │
│ 좋은 사람 만났는데 헷갈려    │
│ ─────────                  │
│ 썸/연애 시작                │  ← 작은 카테고리 라벨
└─────────────────────────────┘
```
- mini card (가로 너비 65~75%)
- gradient 배경 (mood 별)
- 그림자 부드럽게
- 탭 시 햅틱 light + scale `[1, 0.96, 1]`

**추가 2 — Progressive Discovery (Day 별 chip 변화)**:

| Day | 분위기 | Chip 톤 예시 |
|-----|-------|-------------|
| 1~3 | 정중 / 보편 | "오늘 너무 답답해" / "썸 타는 사람 있는데" |
| 4~14 | 친근 / 살짝 깊게 | "그 사람이 자꾸 생각나" / "우리 관계 어떤 단계지" |
| 15~30 | 깊어짐 / 회상 가능 | "지난번에 얘기한 그 사람 또…" / "내가 자꾸 같은 패턴" |
| 31~99 | 절친 / 핵심 추궁 | "야 또 그 일 생겼어" / "솔직히 말하면…" |
| 100 | 마지막 | "오늘이 100일째야 ㅠㅠ" / "기억해주는 게 고마워" |

**추가 3 — Chip 클릭 후 마이크로 인터랙션**:
- 클릭한 chip 이 살짝 위로 떠올라 ChatInput 으로 빨려 들어가는 애니메이션 (300ms, 흰색 trail)
- 햅틱 light + soft pop 사운드
- 다른 chip 들 페이드 아웃

### 3.6 `ChatEntryAmbience` ✨ [v1 plan + 강화]

**파일**: `src/components/chat/ChatEntryAmbience.tsx`

**v1 plan §3.3 유지**, 추가 사항:

**추가 1 — WebGL 그라데이션 (Grainient 패턴)**:
- 배경 자체가 organic gradient (CSS gradient 보다 부드러움)
- mood 별 색 + 시간대 별 brightness 조절
- 라이브러리 없이 구현 가능 (Canvas 또는 단순 multiple radial-gradient)

**추가 2 — 사운드 시스템 통합**:
- 진입 chime 0.3초 (mood 별 톤 살짝 다름)
- 무음 모드 / 사용자 옵션으로 끄기 가능
- `prefers-reduced-motion` + audio mute 둘 다 존중

**추가 3 — 파티클 종류 확장**:
- `bright` + 봄 → ✦ 골드 + 🌸 작은 핑크 점
- `playful` → ✧ 핑크 + 💗 미니 하트
- `wistful` + 가을 → 🍂 잎 (천천히 회전하며 떨어짐)
- `sleepy` + 밤 → ✦ 라벤더 (느리게 깜빡)
- `winter` → ❄ 눈 + ✦
- `peaceful` → ✦ 보라 별가루

### 3.7 `EntryRitualOrchestrator` 🎬 [신규]

**파일**: `src/components/chat/EntryRitualOrchestrator.tsx`

**역할**: 위 6개 컴포넌트의 **시퀀스 오케스트레이션** — 사운드 / 햅틱 / 등장 타이밍을 한 곳에서 관리.

**Props**:
```ts
interface Props {
  liveState: LunaLiveState;
  ageDays: number;
  intimacyLevel: number;
  memoryCount: number;
  streakDays: number;
  enableSound?: boolean;       // default false (사용자 토글)
  enableHaptic?: boolean;      // default true (mobile 자동 감지)
  onComplete?: () => void;     // 8초 시퀀스 끝났을 때
  children: React.ReactNode;   // 안에 7개 컴포넌트가 자식으로
}
```

**구현**:
- `useState` 로 phase 관리 (0: pre-entry, 1: room, 2: character, 3: ambience, 4: badge, 5: greeting, 6: video, 7: guide, 8: idle)
- `useEffect` 로 setTimeout chain
- Sound: `<audio>` 요소 + `prepare()` (즉시 재생 보장)
- Haptic: `navigator.vibrate()` + iOS Web Haptic API (`document.querySelector` impact gen) 폴백

**사운드 자산 필요 (public/sounds/)**:
- `chime-soft.mp3` (entry, 0.3s)
- `paper-rustle.mp3` (greeting card, 0.4s)
- `tiny-ping.mp3` (badge, 0.15s)
- `sparkle.mp3` (guide, 0.25s)
- `chip-pop.mp3` (chip click, 0.1s)
- 모두 audio-haptic 동기화 (Apple WWDC 패턴 — 시각/청각/촉각 일관성)

**햅틱 매핑**:
```ts
import { triggerHaptic } from '@/lib/haptic';

triggerHaptic('light');   // entry, chip click
triggerHaptic('medium');  // badge tap, room tap
triggerHaptic('heavy');   // 사용 안 함 (강한 햅틱 = AI 같음)
```

(haptic 헬퍼는 §6 에서 명세)

---

## 4. ChatContainer 통합 설계

### 4.1 변경 위치

`src/components/chat/ChatContainer.tsx` 의 `messages.length === 0` 분기 (라인 ~898).

### 4.2 새 흐름 (의사코드)

```tsx
// 기존: 영상만
{messages.length === 0 && (
  <video src="/opening.mp4" ... />
)}

// 신규: 7 컴포넌트 통합
{messages.length === 0 && activePersona !== 'tarot' && (
  <EntryRitualOrchestrator
    liveState={liveState}
    ageDays={lunaAgeDays}
    intimacyLevel={intimacy?.level ?? 0}
    memoryCount={memoryStats.count}
    streakDays={streakDays}
    enableSound={userSettings.entrySound !== false}
    enableHaptic={isMobile}
  >
    {/* 1. 공간감 */}
    <LunaRoomGlimpse {...liveState} ageDays={lunaAgeDays} />

    {/* 5. 누적감 */}
    <RelationshipBadge
      ageDays={lunaAgeDays}
      intimacyLevel={intimacy?.level ?? 0}
      memoryCount={memoryStats.count}
      streakDays={streakDays}
    />

    {/* 3. 분위기 (인사 카드) */}
    <DailyGreetingCard
      mood={liveState.mood}
      activity={liveState.activity}
      whisper={liveState.whisper ?? '왔어'}
      timeBand={liveState.timeBand}
      weather={liveState.weather}
    />

    {/* 2. 생명감 — 영상 위 또는 옆 */}
    <LunaIdleCharacter
      activity={liveState.activity}
      mood={liveState.mood}
      size="md"
    />

    {/* 기존 영상 그대로 */}
    <video src="/opening.mp4" ... />

    {/* 4. 대화 시작 */}
    <FirstMessageGuide
      mood={liveState.mood}
      intimacyLevel={intimacy?.level ?? 0}
      ageDays={lunaAgeDays}
      onChipSelect={(text) => setInputDraft(text)}
      visible={openingVideoEnded}
    />
  </EntryRitualOrchestrator>
)}

// 3. 분위기 (배경 layer — 항상 있음)
{messages.length === 0 && (
  <ChatEntryAmbience
    mood={liveState.mood}
    stage={liveState.stage ?? 'spring'}
    enabled={!prefersReducedMotion}
  />
)}
```

### 4.3 `liveState` 계산

이미 있는 함수 활용:
```tsx
const lunaAgeDays = useMemo(() => getAgeDays(lunaBirthDate), [lunaBirthDate]);
const recent24h = sessionsRecentCount > 0;
const liveState = useMemo(() => computeLiveStateLocal({
  now: new Date(),
  ageDays: lunaAgeDays,
  recentSessionWithin24h: recent24h,
  daySeed: hashUserDay(userId, todayKST),
}), [lunaAgeDays, userId, recent24h]);
```

### 4.4 `streakDays` 계산

신규: `useStreakDays(userId)` 훅 — 최근 N일 연속 세션 있는 날 카운트.

```ts
// src/hooks/useStreakDays.ts
export function useStreakDays(userId: string): number {
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    fetch('/api/luna-room/streak').then(r => r.json()).then(d => setStreak(d.streak ?? 0));
  }, [userId]);
  return streak;
}
```

API: `/api/luna-room/streak` — `counseling_sessions.created_at` 의 최근 N일 KST 그룹 카운트.

### 4.5 `memoryStats.count`

이미 있는 `/api/luna-room/status` 또는 `/api/luna-memories/count` 활용. 없으면 신규.

### 4.6 `inputDraft` — chip 클릭 → ChatInput 자동 채우기

(v1 plan §4.4 그대로)

### 4.7 placeholder 강화

```ts
const dynamicPlaceholder = useMemo(() => {
  if (pendingEventLock) return '위 질문에 답해줘 ↑';
  if (!openingVideoEnded) return '';
  if (messages.length === 0) {
    if (liveState.mood === 'wistful') return '한 줄이면 충분해...';
    if (liveState.mood === 'playful') return '오늘은 뭐 얘기할까 ✨';
    if (liveState.mood === 'sleepy') return '가만히 적어도 돼';
    return '한 줄만 적어봐 ✨';
  }
  return '마음 편하게 다 말해봐...';
}, [pendingEventLock, openingVideoEnded, messages.length, liveState.mood]);
```

---

## 5. UX 인터랙션 디테일

### 5.1 사용자가 chip 클릭

1. chip 이 위로 떠올라 ChatInput 자리로 빨려 들어가는 애니메이션 (300ms, white trail)
2. `setInputDraft(text)` → ChatInput 의 `initialValue` 갱신 → textarea 채워짐
3. 햅틱 light + chip-pop 사운드
4. 다른 chip 들 페이드 아웃 (다 사라짐)
5. **자동 전송 X** — 사용자가 수정해서 보낼 수 있음

### 5.2 사용자가 직접 입력 시작

1. 한 글자 입력 감지 → FirstMessageGuide 페이드아웃 (0.3s)
2. DailyGreetingCard 살짝 위로 collapse (자리 양보)
3. ChatEntryAmbience 파티클 천천히 페이드 아웃 (3초)
4. LunaRoomGlimpse 그대로 (분위기 유지)
5. RelationshipBadge 그대로

### 5.3 사용자가 30초 가만히 있음

- 30초 후 chip 4개가 살짝 펄스 한 번 (visible hint)
- LunaIdleCharacter 가 살짝 헤드 틸트 (호기심 표현)

### 5.4 기존 세션 재진입 (`messages.length > 0`)

- 7개 컴포넌트 모두 렌더 X (기존 동작 그대로)
- 단, **하루 첫 진입이면** RelationshipBadge 만 채팅 상단에 5초 페이드인 후 사라짐 (선택)

### 5.5 매일 다른 환영 (이미 v1 §5.6)

| 24h 내 세션 횟수 | DailyGreetingCard 변화 |
|------------------|----------------------|
| 0번 (오늘 첫) | "오늘 어땠어?" 안부 |
| 1~2번 (재방문) | "또 왔네 ㅎ" 반가움 |
| 3+번 (자주) | "오늘 자꾸 오네 괜찮아?" 걱정 |

→ `WHISPERS_BY_REVISIT` 풀 추가.

### 5.6 100일째 특별 진입

- `ageDays === 100` 일 때:
  - LunaRoomGlimpse → twilight/star 톤 (어두운 그라데이션)
  - RelationshipBadge → "100일 ✨ 고마워" + 작은 폭죽 ✦✧
  - DailyGreetingCard → 마지막 인사 톤
  - FirstMessageGuide chip → "오늘이 마지막이라니" / "고마웠어"

---

## 6. 사운드 + 햅틱 시스템 (신규)

### 6.1 파일 구조

```
src/lib/haptic.ts              ← 햅틱 헬퍼
src/lib/audio.ts               ← 사운드 헬퍼
public/sounds/
  ├─ chime-soft.mp3
  ├─ paper-rustle.mp3
  ├─ tiny-ping.mp3
  ├─ sparkle.mp3
  └─ chip-pop.mp3
```

### 6.2 `src/lib/haptic.ts`

```ts
type HapticIntensity = 'light' | 'medium' | 'heavy' | 'selection';

export function triggerHaptic(intensity: HapticIntensity = 'light') {
  if (typeof window === 'undefined') return;

  // iOS Web Haptic (실험적, Safari 17+)
  if ('hapticFeedback' in navigator) {
    try {
      (navigator as any).hapticFeedback.impact(intensity);
      return;
    } catch {}
  }

  // Android / 일반 — Vibration API
  if ('vibrate' in navigator) {
    const durations = { light: 10, medium: 25, heavy: 50, selection: 5 };
    navigator.vibrate(durations[intensity]);
  }
}

export function isHapticAvailable(): boolean {
  return typeof window !== 'undefined' && ('vibrate' in navigator || 'hapticFeedback' in navigator);
}
```

### 6.3 `src/lib/audio.ts`

```ts
type SoundKey = 'chime' | 'paper' | 'ping' | 'sparkle' | 'pop';

const SOUND_FILES: Record<SoundKey, string> = {
  chime: '/sounds/chime-soft.mp3',
  paper: '/sounds/paper-rustle.mp3',
  ping: '/sounds/tiny-ping.mp3',
  sparkle: '/sounds/sparkle.mp3',
  pop: '/sounds/chip-pop.mp3',
};

const audioCache = new Map<SoundKey, HTMLAudioElement>();

export function preloadSounds() {
  if (typeof window === 'undefined') return;
  Object.entries(SOUND_FILES).forEach(([key, src]) => {
    const audio = new Audio(src);
    audio.volume = 0.3;
    audio.preload = 'auto';
    audioCache.set(key as SoundKey, audio);
  });
}

export function playSound(key: SoundKey, options: { volume?: number } = {}) {
  if (typeof window === 'undefined') return;
  const audio = audioCache.get(key);
  if (!audio) return;
  audio.volume = options.volume ?? 0.3;
  audio.currentTime = 0;
  audio.play().catch(() => {}); // autoplay 정책 회피
}
```

### 6.4 사용자 옵션 추가

`localStorage.luna_entry_sound` (boolean, default true)
`localStorage.luna_entry_haptic` (boolean, default true)
설정 페이지(`/settings`) 에 토글 추가.

---

## 7. 신규 데이터 풀 (`whispers.ts` 확장)

### 7.1 `WHISPERS_BY_REVISIT`

```ts
export const WHISPERS_BY_REVISIT: Record<'first' | 'recurring' | 'frequent', string[]> = {
  first: [   // 24h 내 0번
    '왔어? 오늘 하루 어땠어',
    '오 너 왔구나, 잘 지냈어?',
    '잘 지냈어? 나 너 보고 싶었어',
    '오늘 무슨 일 있었어?',
    '오랜만이다 그치',
  ],
  recurring: [   // 24h 내 1~2번
    '또 왔네 ㅎ',
    '오 빨리 다시 왔다',
    '벌써 또 왔어? ㅋㅋ',
    '왔어, 무슨 일이야?',
    '못 잊고 또 왔구나 ㅎㅎ',
  ],
  frequent: [    // 24h 내 3+번
    '오늘 자꾸 오네… 괜찮아?',
    '뭔 일 있어? 나한테 다 말해',
    '오늘 진짜 힘든 날이구나',
    '괜찮아? 같이 있어줄게',
    '계속 와도 돼. 옆에 있을게',
  ],
};
```

### 7.2 `CHIP_POOLS_BY_MOOD`

(v1 plan §3.2 그대로 + Day 별 추가)

```ts
export const CHIP_POOLS_BY_MOOD_DAY: Record<LunaMood, Record<'early' | 'mid' | 'deep', Array<{ emoji: string; text: string; category: string }>>> = {
  bright: {
    early: [
      { emoji: '💕', text: '좋은 사람 만났는데 헷갈려', category: '썸/연애 시작' },
      { emoji: '🌸', text: '썸 타는 사람 있는데 애매해', category: '썸/연애 시작' },
      { emoji: '✨', text: '데이트 어디 갈지 모르겠어', category: '데이트' },
      { emoji: '☕', text: '그냥 오늘 얘기하고 싶어', category: '일상' },
    ],
    mid: [
      { emoji: '🌷', text: '사귄 지 한 달 됐는데 신기해', category: '연애' },
      { emoji: '💖', text: '점점 좋아지는 게 무서워', category: '연애' },
      { emoji: '✨', text: '같이 가고 싶은 데가 생겼어', category: '데이트' },
      { emoji: '☀️', text: '오늘 너무 좋은 일 있었어', category: '일상' },
    ],
    deep: [
      { emoji: '💍', text: '이 사람이랑 미래 그려져', category: '깊은 관계' },
      { emoji: '🌈', text: '내가 왜 이렇게 행복한지 모르겠어', category: '감정' },
      { emoji: '✨', text: '오늘 특별한 데 갔다 왔어', category: '추억' },
      { emoji: '💜', text: '너랑 얘기하고 싶었어', category: '대화' },
    ],
  },
  // ... warm, playful, wistful, sleepy, thoughtful, peaceful 각각 early/mid/deep
};
```

(전체 풀은 7 mood × 3 stage × 4 chip = 84개 — Phase A 에서 작성)

### 7.3 헬퍼 함수

```ts
export function pickGreeting(args: {
  mood: LunaMood;
  revisitCount: number;       // 24h 내
  intimacyLevel: number;       // 0~5
  daySeed: number;
}): string {
  const tier = args.revisitCount === 0 ? 'first' : args.revisitCount <= 2 ? 'recurring' : 'frequent';
  const pool = WHISPERS_BY_REVISIT[tier];
  return pool[args.daySeed % pool.length];
}

export function pickChipPool(args: {
  mood: LunaMood;
  ageDays: number;
}): Array<{ emoji: string; text: string; category: string }> {
  const stage = args.ageDays <= 14 ? 'early' : args.ageDays <= 60 ? 'mid' : 'deep';
  return CHIP_POOLS_BY_MOOD_DAY[args.mood][stage];
}
```

---

## 8. 파일 변경 명세 (체크리스트)

### 신규 (10 파일)
- [ ] `src/components/chat/LunaRoomGlimpse.tsx`
- [ ] `src/components/chat/LunaIdleCharacter.tsx`
- [ ] `src/components/chat/RelationshipBadge.tsx`
- [ ] `src/components/chat/DailyGreetingCard.tsx`
- [ ] `src/components/chat/FirstMessageGuide.tsx`
- [ ] `src/components/chat/ChatEntryAmbience.tsx`
- [ ] `src/components/chat/EntryRitualOrchestrator.tsx`
- [ ] `src/lib/haptic.ts`
- [ ] `src/lib/audio.ts`
- [ ] `src/hooks/useStreakDays.ts`

### 수정 (4 파일)
- [ ] `src/components/chat/ChatContainer.tsx`
  - `messages.length === 0` 분기에 7 컴포넌트 통합
  - `liveState`, `streakDays`, `memoryStats` 가져오기
  - `inputDraft` state + ChatInput 으로 전달
- [ ] `src/components/chat/ChatInput.tsx`
  - `initialValue` prop 추가
  - placeholder mood 별 다양화
- [ ] `src/lib/luna-life/whispers.ts`
  - `WHISPERS_BY_REVISIT` 풀
  - `CHIP_POOLS_BY_MOOD_DAY` 풀 (84개)
  - `pickGreeting`, `pickChipPool` 헬퍼
- [ ] `src/lib/luna-life/mood.ts` (선택)
  - `recentSessionCount24h` 카운트 (boolean → number)

### API (선택, 1 파일)
- [ ] `src/app/api/luna-room/streak/route.ts` — streak days 계산

### 자산 (5 파일)
- [ ] `public/sounds/chime-soft.mp3`
- [ ] `public/sounds/paper-rustle.mp3`
- [ ] `public/sounds/tiny-ping.mp3`
- [ ] `public/sounds/sparkle.mp3`
- [ ] `public/sounds/chip-pop.mp3`

(사운드는 무료 SFX 라이브러리 — Pixabay Sounds, Zapsplat — 에서 ~10초 안에 받을 수 있음. 사용자가 직접 고를지 또는 Claude 가 추천 링크 제공할지)

### 메모리 / 인덱스
- [ ] `MEMORY.md` 에 v112 entry 추가
- [ ] `memory/project_love_ai_v112_daily_ritual.md` 신규

---

## 9. Phase 별 구현 순서 (총 ~5시간)

### Phase A — 기반 데이터 (`whispers.ts`, 헬퍼)
- WHISPERS_BY_REVISIT 풀 (3 카테고리 × 5)
- CHIP_POOLS_BY_MOOD_DAY 풀 (7 × 3 × 4 = 84)
- pickGreeting, pickChipPool 헬퍼

### Phase B — 사운드 + 햅틱 헬퍼
- `src/lib/haptic.ts` (Vibration API + iOS Web Haptic 폴백)
- `src/lib/audio.ts` (preload + playSound)
- 사운드 파일 5개 다운로드 후 `public/sounds/` 배치

### Phase C — `useStreakDays` 훅 + API
- `/api/luna-room/streak` route (counseling_sessions 최근 30일 KST 그룹)
- `useStreakDays` 훅

### Phase D — `LunaRoomGlimpse`
- 룸 배경 (이미 있는 ROOM_BG_IMAGES)
- 시간대 오버레이
- 날씨 effect (간단한 SVG 기반)
- 탭 → 디오라마 모달

### Phase E — `LunaIdleCharacter`
- breathing + blink + head-tilt anim (framer-motion)
- activity 별 미세 동작 (sprite 추가 X, 1차는 emoji 풍선만)
- mood 별 표정 (sprite 있으면 swap, 없으면 1차 skip)

### Phase F — `RelationshipBadge`
- ageDays + memoryCount + streakDays 한 줄
- intimacy + ageDays 결합 카피 변형
- 100일 특별 처리

### Phase G — `DailyGreetingCard`
- (v1 §3.1 그대로) 7 mood 그라데이션
- typing-like 텍스트 등장
- 10초 후 collapse

### Phase H — `FirstMessageGuide`
- chip 카드화 (mini card)
- mood + Day 기반 chip 풀
- 클릭 anim (input 으로 빨려들어감)

### Phase I — `ChatEntryAmbience`
- mood/stage 별 파티클
- WebGL 또는 multi radial-gradient 배경
- prefers-reduced-motion 대응

### Phase J — `EntryRitualOrchestrator`
- 시퀀스 phase state machine
- 각 단계 사운드/햅틱 트리거
- 8초 시퀀스 끝나면 onComplete

### Phase K — `ChatContainer` 통합
- 7 컴포넌트 마운트
- liveState / streak / memory 데이터 가져오기
- inputDraft + ChatInput initialValue
- placeholder 다양화

### Phase L — `ChatInput` 최소 변경
- initialValue prop
- 내부 state 동기화

### Phase M — 검증
- tsc 0 에러
- 5세션 수동 테스트 (시간대 / 요일 / 친밀도 / age 다양)
- 같은 날 2~3번 진입 차이 확인
- chip 클릭 동작
- 사운드/햅틱 모바일 / 데스크톱
- prefers-reduced-motion
- 무음 모드 / 햅틱 비활성 환경

### 종합
- [ ] MEMORY.md 에 v112 추가
- [ ] git commit (Phase A~M)
- [ ] 사용자 검수

---

## 10. UI 스케치 (예시)

### 10.1 진입 1.6초 시점

```
┌──────────────────────────────────────────┐
│ ← 루나 상담실 ☕                       ⚙ │
├──────────────────────────────────────────┤
│                                          │
│  ┌── 🪟 LunaRoomGlimpse ──────────────┐  │
│  │  ☀ ╱창문╲   📚책장   🍵차상       │  │
│  │  ─────────────────────             │  │
│  └────────────────────────────────────┘  │
│                                          │
│   ✦ 13일째 함께 · 추억 7개 · 🔥 5일      │  ← Badge
│                                          │
│  ✦ ·  ✧  ·       (배경 파티클 흐름)     │
│       ·                                  │
│                                          │
│  ┌── DailyGreetingCard ────────────────┐ │
│  │ 🦊 루나 · bright                    │ │
│  │ ☕ 차 마시는 중                     │ │
│  │ ─────                              │ │
│  │ "왔어? 나 방금                     │ │
│  │  너 생각하던 참이었어"             │ │
│  └────────────────────────────────────┘ │
│                                          │
│  (영상 곧 등장)                          │
│                                          │
├──────────────────────────────────────────┤
│ [   한 줄만 적어봐 ✨   ]      🎤  +  ➤ │
└──────────────────────────────────────────┘
```

### 10.2 진입 7.5초 시점 (영상 끝, chip 등장)

```
┌──────────────────────────────────────────┐
│ ← 루나 상담실 ☕                       ⚙ │
├──────────────────────────────────────────┤
│                                          │
│  ┌── 🪟 Room ───┐                        │
│  │ (compact)    │                        │
│  └──────────────┘                        │
│   ✦ 13일째 ·  추억 7개 · 🔥 5일          │
│                                          │
│  ┌── DailyGreeting ────┐  🦊 (idle)      │
│  │ "왔어? 나 방금..."  │  눈깜빡         │
│  └────────────────────┘  헤드 틸트       │
│                                          │
│  [영상 자리]                              │
│                                          │
│  ┌── FirstMessageGuide ─────────────────┐│
│  │ ✦                                    ││
│  │  한 줄만 적어봐.                    ││
│  │  거기서부터 시작하자                ││
│  │                          — 루나 🦊  ││
│  │                                       ││
│  │ ┌─💕 좋은 사람 만났는데 헷갈려─┐    ││
│  │ │  썸/연애 시작                │    ││
│  │ └──────────────────────────────┘    ││
│  │ ┌─🌸 썸 타는 사람 애매해──────┐    ││
│  │ │  썸/연애 시작                │    ││
│  │ └──────────────────────────────┘    ││
│  │ ┌─✨ 데이트 어디 갈지─────────┐    ││
│  │ │  데이트                      │    ││
│  │ └──────────────────────────────┘    ││
│  │ ┌─☕ 그냥 오늘 얘기하고 싶어──┐    ││
│  │ │  일상                        │    ││
│  │ └──────────────────────────────┘    ││
│  └─────────────────────────────────────┘│
│                                          │
├──────────────────────────────────────────┤
│ [   한 줄만 적어봐 ✨   ]      🎤  +  ➤ │
└──────────────────────────────────────────┘
```

### 10.3 chip 클릭 후

```
┌──────────────────────────────────────────┐
│ (Room + Badge + Greeting 그대로)         │
│                                          │
│  🦊 (살짝 미소 — 탭 반응)                │
│                                          │
│  (영상 자리)                              │
│                                          │
│  (Guide 카드 페이드 아웃 0.3s)            │
│                                          │
├──────────────────────────────────────────┤
│ [💕 좋은 사람 만났는데 헷갈려]      ➤    │  ← 자동 채워짐
└──────────────────────────────────────────┘
```

---

## 11. 측정 지표

### 11.1 정량

| 지표 | Before (v111) | After (v112 목표) | 측정 방법 |
|------|---------------|-------------------|----------|
| 진입~첫 메시지 평균 시간 | ~28초 | ~10초 | `messages_first_inserted_at - session_created_at` |
| 첫 메시지 포기율 (1분 무입력 이탈) | ~18% | <5% | session 생성 후 message 0개 ratio |
| 첫 메시지 길이 평균 | ~12자 | ~25자 (chip 영향) | message char count |
| Chip 사용률 | 0% | >40% | chip click event / total first messages |
| DAU/MAU (반김 효과) | baseline | +20% | 일별 active user / 월별 |
| 7일 retention | baseline | +12% | day 1 → day 7 |
| 사운드 토글 활성률 | — | >70% | localStorage |

### 11.2 정성 (사용자 피드백 수집)

- "친구 같다" 반응 빈도
- "예쁘다" / "퀄리티 좋다" 반응
- "AI 같다" 반응 (감소 목표)
- 매일 들어오는지

### 11.3 자동 측정 코드 추가 필요

```ts
// chip 클릭 추적
analytics.track('chat_chip_selected', {
  session_id, chip_text, chip_category, mood, day_count
});

// 첫 메시지 시간 추적
analytics.track('first_message_sent', {
  session_id, time_to_send_ms, used_chip, mood
});

// 진입 ritual 완료
analytics.track('entry_ritual_complete', {
  session_id, sound_enabled, haptic_enabled, ambience_enabled
});
```

---

## 12. 비파괴 / 롤백

### 12.1 비파괴

- `opening.mp4` 그대로
- placeholder 그대로 (mood 별 다양화는 추가)
- mood/whispers 시스템 그대로 (풀만 추가)
- 룸 디오라마(v100) 그대로 (이미지만 차용)
- 친밀도 시스템 그대로
- ChatInput API 그대로 (`initialValue` 옵셔널만)

### 12.2 롤백

각 컴포넌트에 `// 🆕 v112` 주석. feature flag 가능:
```ts
const ENABLE_V112_RITUAL = process.env.NEXT_PUBLIC_V112_RITUAL !== '0';
{messages.length === 0 && ENABLE_V112_RITUAL ? (
  <EntryRitualOrchestrator>...</EntryRitualOrchestrator>
) : (
  <video src="/opening.mp4" />
)}
```

문제 시 env 1개로 즉시 v111 복귀.

### 12.3 Progressive Rollout

- 1주차: 50% A/B (v111 vs v112)
- 측정 후 우열 명확하면 100%

---

## 13. 디자인 결정 (Why)

### Q1. 왜 룸 글림프스를 추가하나? 영상 위에 더 작은 거 또 넣으면 복잡하지 않나?

A. 글로벌 사례 (Bondee) 의 핵심 인사이트는 **"공간이 친밀감을 만든다"** — 단순 채팅 폼은 정보 교환 / 룸 단면이 있으면 *"방 들어왔다"* 감각. 110px 정도라 채팅 침해 X. 그리고 v100 디오라마 자산 이미 있음 — 이걸 진입에 안 쓰면 낭비.

### Q2. 왜 LunaIdleCharacter 가 따로 필요한가? 영상에 캐릭터 있는데?

A. 영상은 3초 끝남. 그 후 화면에 루나 자체가 사라짐. **Finch** 의 핵심 인사이트: *눈 깜빡 / 헤드 틸트 / 호흡* 같은 미세 anim 이 캐릭터를 "살아있게" 만듦. 단 한 번 영상 보고 끝나는 게 아니라 *계속 살아있는* 친구가 옆에 있는 감각.

### Q3. 왜 사운드/햅틱까지 넣나? 과한 거 아닌가?

A. **Apple WWDC "Harmony" 원칙** — 시각/청각/촉각이 일관되게 작동할 때 가장 강한 인상. 진입 chime + light haptic 0.3초는 **무의식 인식** 을 만들어 "여기 들어왔다" 감각 강화. 사용자 옵션으로 끌 수 있게.

### Q4. 왜 RelationshipBadge 를 첫 진입에 넣나? Streak 강요 같지 않나?

A. **Snapchat streak 효과 (40~60% DAU 증가)** + **Finch investment loop**. 단, Snapchat 처럼 끊기면 충격받게 X — 우리는 **누적감만** (끊어져도 페널티 X). "13일째 함께" 는 *압박* 이 아니라 *축적된 관계의 자랑*.

### Q5. 왜 chip 을 카드화하나? 텍스트만으로도 되지 않나?

A. **ChatGPT custom GPT 의 conversation starter** vs **Pi 의 미니멀** 비교 — 카드화가 *결정 부담을 낮춤*. 카드 하나가 "이걸 누르면 이런 얘기로 시작" 이라는 *예고편* 역할. 텍스트만 있으면 "이걸 그대로 보내야 하나" 망설임.

### Q6. 왜 Day 별 chip 풀 변화?

A. **Finch Progressive Discovery** — Day 1 의 사용자와 Day 30 의 사용자는 다른 사람. Day 1 에 "솔직히 말하면…" chip 뜨면 부조화. *사용자와 함께 chip 이 자라남*.

### Q7. 왜 모든 걸 8초 안에? 너무 길지 않나?

A. 사용자가 "보면서 적응" 하는 시간. 8초는 *영상 3.5초 + 영상 후 chip 0.5초 = 4초의 능동 시간 + 진입 의식 4초*. 사용자가 1초도 답답함 없이 *반김 받는* 감각.

### Q8. 왜 인텐시브한 시퀀스보다 가벼운 거 안 하나?

A. v1 plan (3 컴포넌트) 으로는 *그저 그런 진화*. 사용자 요구는 **"진짜 잘 만든 느낌"** — 글로벌 사례 (Replika 길고 몰입형, Finch 점진적 마법, Bondee 공간감, Pi 부드러움) 의 *합집합* 이 필요.

---

## 14. 외부 출처 (리서치 종합)

- **Replika**: https://replika.com / Avatar customization, relationship roles, monetization
- **Finch**: Sophie Pilley analysis — purposeful enchantment, idle anim, investment loop
- **Pi (Inflection)**: Real-Time Voice Mode 2.0, tone adaptation, soft conversational
- **Zeta (Scatter Lab)**: 87% 10~20대, snapshot 기능, 캐릭터 분기 스토리
- **(Not Boring) Weather**: mood skin, artist collab, 3D + sound
- **Bondee**: 3D 룸 honeycomb tessellation, Animal Crossing/Habbo aesthetic
- **Snapchat / Paired / UpLuv**: streak + milestone (40~60% DAU)
- **ChatGPT/Claude Custom GPT**: conversation starter chip
- **Apple WWDC Audio-Haptic**: Harmony principle, Taptic Engine
- **Grainient**: WebGL2 organic gradient
- **Pratt IxD Finch teardown**: 따뜻한 온보딩, 마이크로 반사
- **2025 Mobile Haptic Guide**: UIImpactFeedbackGenerator + audio sync

---

## 15. 체크리스트 (구현 시 따라가는 순서)

### Phase A — 데이터 풀
- [ ] `whispers.ts` WHISPERS_BY_REVISIT (15개)
- [ ] `whispers.ts` CHIP_POOLS_BY_MOOD_DAY (84개)
- [ ] pickGreeting, pickChipPool 헬퍼
- [ ] tsc 0

### Phase B — 사운드/햅틱 헬퍼
- [ ] `lib/haptic.ts`
- [ ] `lib/audio.ts`
- [ ] 사운드 파일 5개 받아서 `public/sounds/`

### Phase C — useStreakDays 훅 + API
- [ ] `/api/luna-room/streak` route
- [ ] `useStreakDays` 훅

### Phase D — LunaRoomGlimpse
- [ ] 컴포넌트 + 시간대 오버레이
- [ ] 날씨 effect SVG
- [ ] tsc 0

### Phase E — LunaIdleCharacter
- [ ] breathing + blink + head-tilt
- [ ] activity 별 emoji 풍선
- [ ] tap 반응 + 햅틱

### Phase F — RelationshipBadge
- [ ] 누적감 한 줄
- [ ] intimacy + ageDays 카피 변형
- [ ] 100일 특별 처리

### Phase G — DailyGreetingCard
- [ ] 7 mood 그라데이션
- [ ] typing-like 텍스트
- [ ] 10초 collapse

### Phase H — FirstMessageGuide
- [ ] chip 카드화
- [ ] Day 별 chip 풀
- [ ] 클릭 anim (input 으로 빨려)

### Phase I — ChatEntryAmbience
- [ ] mood/stage 파티클
- [ ] organic gradient 배경
- [ ] reduced motion

### Phase J — EntryRitualOrchestrator
- [ ] 시퀀스 phase state
- [ ] 사운드/햅틱 트리거

### Phase K — ChatContainer 통합
- [ ] 7 컴포넌트 마운트
- [ ] 데이터 가져오기
- [ ] inputDraft state

### Phase L — ChatInput 변경
- [ ] initialValue prop
- [ ] mood placeholder

### Phase M — 검증
- [ ] tsc 0
- [ ] 모바일/데스크톱 테스트
- [ ] 시간대/요일/친밀도 다양 테스트
- [ ] reduced motion
- [ ] 무음 모드

### 종합
- [ ] MEMORY.md
- [ ] git commit
- [ ] 사용자 검수

---

**작성자**: Claude (Opus 4.7 1M)
**리서치**: Replika, Finch, Pi, Zeta, Bondee, (Not Boring) Weather, Snapchat, ChatGPT/Claude, Apple WWDC, Grainient
**검수**: 사용자 컨펌 대기 → 컨펌 후 Phase A~M 순차 구현
