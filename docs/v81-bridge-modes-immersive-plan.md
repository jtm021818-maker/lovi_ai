# 🎭 v81 BRIDGE Phase Immersive Modes — 설계 기획서

> "같이 준비" Phase 를 턴 단위 대화가 아닌, **작전 단위 몰입 미니게임** 으로 재설계

**총 분량:** A4 50장 / ~25,000 words
**목표 버전:** v81
**의존:** v79 (FX 시스템), v80 (추리 톤 리프레임), v78 (치매 수정)

---

# Part I — 비전 & 철학

## 1. Executive Summary

BRIDGE (같이 준비) Phase 를 **Luna 서비스의 차별화 킬러 경험** 으로 승격.

**현재:** BRIDGE 는 MIRROR 와 SOLVE 사이 이름만 다른 채팅 턴. 5개 서브모드 (TONE_SELECT, DRAFT_WORKSHOP, ROLEPLAY, PANEL_REPORT, IDEA_REFINE) 가 있지만 모두 텍스트 대화 + 단순 카드 UI.

**변화 후:** 각 서브모드가 **독립된 미니게임/시뮬레이션** 으로 작동. 턴 제한 없이 "작전이 완료될 때까지" Luna 판단으로 유지. 각 모드는 고유 UI/사운드/인터랙션 스킴 보유.

**왜 이게 중요한가:**
1. **차별화** — 일반 상담 챗봇 대비 "놀이 같은 실습" 경험
2. **실용성** — 실제 연애 행동으로 이어지는 구체 산출물 (초안, 대화 연습)
3. **리텐션** — 미니게임 요소는 재방문 유인
4. **Gottman 관계 과학 근거** — 행동 연습(Behavioral Rehearsal) 이 통찰보다 변화 유도에 효과적 (Atkinson, 2005)

## 2. 철학

### 2.1 Luna 는 도구가 아닌 캐릭터
유저는 "상담 받기" 가 아니라 "친한 언니랑 같이 연습" 하러 옴. 모드는 Luna 가 제안하고 주도.

### 2.2 LLM 판단 우선 (v80 원칙 연장)
- 모드 진입 / 진행 / 종료는 **Luna 가 LLM 으로 판단**. 턴 수 하드코딩 X.
- 유저가 "다른거 하자" 하면 바로 나올 수 있고, 몰입 중이면 무한히 지속 가능.

### 2.3 카톡 DNA 유지, 영역만 확장
메인은 카톡 대화. 모드는 **오버레이 (drawer / fullscreen modal)** 로 띄우되, **채팅은 계속 뒤에 살아있음**. 유저가 언제든 돌아올 수 있는 안전망.

### 2.4 Single Source of Truth
각 모드의 상태는 **mode 전용 store** 에 저장. 메시지 DB 에는 "모드 시작/종료/산출물" 만 요약으로 남김.

---

# Part II — 현재 상태 분석

## 3. 기존 아키텍처 분석

### 3.1 현재 BRIDGE 서브모드 트리거
- [STRATEGY_READY:opener|situationSummary|draftHook|roleplayHook|panelHook] → 모드 선택 UI 표시
- 유저가 선택 → LunaStrategy 이벤트 → 채팅으로 진행

### 3.2 기존 이벤트 타입 (phase-manager/events.ts)
- `LUNA_STRATEGY` — 작전회의 선택
- `TONE_SELECT` — 톤 3개 선택
- `DRAFT_WORKSHOP` — 3개 초안 카드
- `ROLEPLAY_FEEDBACK` — 롤플레이 결과 피드백
- `PANEL_REPORT` — 3개 관점 리포트
- `IDEA_REFINE` — 원본 vs 다듬은 아이디어

### 3.3 한계
1. **턴 기반**: Phase Manager 가 턴 수 기반 Safety 로직 (`SAFETY_MAX_TURNS: 8`) 적용 → 작전 도중 타임아웃
2. **UI 빈약**: 각 이벤트가 정적 카드. 클릭 외 상호작용 X
3. **내러티브 부재**: "너 상황은 이거야" 알려주고 끝. 몰입 요소 없음
4. **산출물 휘발**: 모드 끝나면 결과가 채팅 메시지로만 남음. 재열람 UX 없음

---

# Part III — 새 아키텍처

## 4. BRIDGE Phase 재정의

### 4.1 Phase Lifecycle 변경

**이전:**
```
BRIDGE → (턴 8 초과 시 자동 SOLVE 전환)
```

**변경 후:**
```
BRIDGE 진입
  → 모드 선택 UI
  → 모드 실행 (무한 턴)
    └ Luna 가 "작전 완료" 판단 시 → [OPERATION_COMPLETE:...] 태그
  → SOLVE 진입
```

### 4.2 턴 기반 Safety 제거

`phase-manager/index.ts` 에서 BRIDGE 의 `SAFETY_MAX_TURNS` 제거 (혹은 모드 활성 시 무시):

```ts
// 🆕 v81: 모드 활성 중이면 Safety 턴 제한 무시
if (session.activeMode && BRIDGE_MODES.includes(session.activeMode)) {
  return false; // 강제 전환 X
}
```

### 4.3 모드 상태 필드 추가

`counseling_sessions` 테이블:
```sql
ALTER TABLE counseling_sessions
  ADD COLUMN active_mode TEXT,          -- 'roleplay' | 'draft' | 'panel' | 'tone' | 'idea'
  ADD COLUMN mode_state JSONB,           -- 모드별 progress / scratchpad
  ADD COLUMN mode_started_at TIMESTAMPTZ;
```

### 4.4 작전 완료 태그

Luna 가 모드 내에서 "충분히 했다" 판단 시 출력:

```
[OPERATION_COMPLETE:roleplay|"여친 시나리오 3번 연습 완료. 자연스러운 답변 3종 확보."|next_step:send_message]
```

- `mode` — 완료된 모드
- `summary` — 한 줄 요약
- `next_step` — SOLVE 단계로 넘길 때의 힌트

파이프라인이 이 태그 보면 `active_mode = null` + SOLVE 로 전환.

---

## 5. 모드 선택 아키텍처

### 5.1 진입 UX

MIRROR → BRIDGE 전환 직후, 채팅 위에 **모드 선택 카드** 표시:

```
┌────────────────────────────────────────┐
│  🔥  자 이제 어떻게 할지 같이 짜보자    │
│  뭐부터 해볼까?                        │
│                                         │
│  🎭 롤플레이로 연습  ─────────────→    │
│  ✏️ 메시지 초안 짜기 ────────────→    │
│  👥 다른 시선에서 보기 ──────────→    │
│  🎨 톤 정하기 ────────────────────→   │
│  💡 아이디어 다듬기 ──────────────→   │
│                                         │
│  (골라주면 모드로 들어갈게)             │
└────────────────────────────────────────┘
```

### 5.2 모드 활성 상태

유저가 선택 → `active_mode = 'roleplay'` 저장 → 해당 모드 UI 오버레이 오픈.

### 5.3 모드 중첩 방지

한 번에 하나만 활성. 다른 모드 전환 시 현재 모드 종료 확인 다이얼로그.

---

# Part IV — 각 모드 상세 설계

## 6. ROLEPLAY MODE — 가장 핵심, 6페이지

### 6.1 개념

**Luna 가 유저의 상대 역할을 연기한다.** 유저가 실제로 상대에게 말할 대사를 연습.

UI 는 **Visual Novel 스타일** — 배경 이미지, Luna 스프라이트, 나레이션 박스, 유저 선택지.

### 6.2 진입 UX

유저: "롤플레이로 연습" 선택
→ 2초 암전 (FX: flash.white + tint.cool)
→ 풀스크린 VN UI 등장
→ 중앙 상단: **시나리오 배너**

```
┌──────────────────────────────────────┐
│ 🎭  롤플레이 모드                    │
│ 📍 상황: 카페에서 여친 만나기         │
│ 👤 상대역: 루나 (여친)                │
│ 🎯 목표: 어제 장난 사과하기           │
└──────────────────────────────────────┘
```

### 6.3 캐릭터 변신

화면 상단 좌측: Luna 아바타 + **역할 태그**
```
[🦊 루나 (여친 역할)]
```

아바타 주변에 rose-50 옅은 glow (역할 중 표시).

기존 "루나" 이름이 **"루나(여친)"** 으로 변경. 말투도 역할에 맞춰 톤 전환 (차갑게/시크하게/다정하게 — 시나리오 설정에 따라).

### 6.4 씬 구조

```
┌────────────────────────────────────────────────┐
│  (상단 배너)                                    │
│                                                 │
│   [배경 이미지 — Imagen 생성 / 시나리오 매치] │
│                                                 │
│      [ Luna 스프라이트 ]                        │
│                                                 │
│   ┌ Narration ─────────────────────────────┐  │
│   │ _"카페 안. 여친이 팔짱 끼고 앉아있다."_ │  │
│   └─────────────────────────────────────────┘  │
│                                                 │
│   ┌ Luna(여친) ─────────────────────────────┐ │
│   │  "...왜 또 그래?"                       │ │
│   └─────────────────────────────────────────┘ │
│                                                 │
│   ┌ 네 응답 (3지선다 or 직접 입력) ─────────┐  │
│   │  [A] "미안... 내가 선 넘었어"            │  │
│   │  [B] "장난이었잖아, 뭘 그렇게"           │  │
│   │  [C] "내가 직접 쓸래 ↓"                  │  │
│   └─────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

### 6.5 턴 흐름

1. **나레이션** (이탤릭 회색) — 현재 상황 묘사 (1-2줄)
2. **Luna(역할) 대사** — 친근 반말 톤, 역할 페르소나 반영
3. **유저 선택지 3개** OR 자유 입력
4. 유저 선택 → Luna 가 역할로 응답 → 다시 선택지
5. Luna 가 씬 전환 필요 판단 시 → **[SCENE_CHANGE:...]** 태그로 배경/상황 변경
6. "작전 완료" 판단 시 → **[OPERATION_COMPLETE:roleplay]**

### 6.6 나레이션 시스템

**3가지 나레이션 타입:**

1. **상황 나레이션** — 씬 전환 / 행동 묘사
   ```
   _산책하는 중이다. 벚꽃이 바람에 날린다._
   ```
   italic, 옅은 색, 타이프라이터 속도 40ms/char

2. **감정 나레이션** — 캐릭터 내면 묘사 (선택적)
   ```
   _(루나의 표정이 굳는다)_
   ```
   괄호로 감싸서 "지문" 느낌

3. **선택지 나레이션** — 유저 선택 직후 결과 묘사
   ```
   _네 말에 루나의 얼굴이 살짝 풀린다._
   ```

LLM 이 판단해서 적절히 섞어 출력.

### 6.7 스프라이트 시스템

Luna 아바타 표정 프레임 시스템 재활용 (기존 VN 극장의 sprite sheet):
- 0=기본, 1=슬픔, 2=화남, 3=생각, 4=놀람, 5=웃음, 6=걱정, 7=당당

LLM 이 각 대사마다 `spriteFrame: 0-7` 지정.

추가로 **역할별 스프라이트 테마**:
- 여친 역 → 기본 Luna 스프라이트 + 옅은 pink tint
- 전 여친 역 → 색조 어둡게 + grayscale 30%
- 썸남/썸녀 역 → warm tint
- 친구 역 → 중성 색

### 6.8 배경 시스템

**4단계 fallback:**
1. Imagen 생성 배경 (시나리오+tagline 기반)
2. Unsplash API (scenario 키워드)
3. Gradient fallback (`SCENARIO_GRADIENTS` 맵)
4. 단색 black-out

배경은 **Ken Burns 효과** (slow pan + zoom) 적용.

### 6.9 BGM 시스템

**시나리오별 분위기 BGM** (lazy load):
- 카페 만남 → lo-fi piano
- 공원 산책 → ambient nature
- 밤 영상통화 → synth pad
- 카톡 영상 → minimal click

howler.js 로 loop + fade in/out.

### 6.10 선택지 시스템

**3가지 선택지 타입:**

1. **LLM 생성 3지선다** — 대부분의 턴
   - A: 안전한 선택 (다정/온건)
   - B: 위험한 선택 (직설/공격)
   - C: 직접 입력 ("내가 직접 쓸래")

2. **감정 강도 슬라이더** — 특정 턴
   ```
   [😌 차분하게 ────●──── 화내면서 😠]
   ```

3. **시간 선택** — 씬 전환 시
   ```
   "언제 말할래?"
   [지금 바로] [한숨 쉬고] [한 박자 뒤]
   ```

### 6.11 직접 입력 모드

유저가 "직접 쓸래" 선택 시:
- 입력창이 VN 스타일로 변신 (베이지색 노트 느낌)
- 유저 타이핑 → Luna(역할) 가 즉시 반응
- "잠깐 다시 쓸게" 버튼으로 되돌리기 가능

### 6.12 피드백 시스템

매 5-10턴마다 또는 씬 종료 시 **코치 Luna** 등장:
- VN 배경 어두워지고
- 원래 Luna (코치 모드) 팝업
- "방금 그 말 진짜 좋았어. 여친이 진심 느꼈을 거야"
- "이 부분은 좀 셌어. 다시 해볼까?"

### 6.13 기술 스택

| 기능 | 라이브러리 | 번들 |
|---|---|---|
| 스크립트 로직 | **inkjs** | ~50KB |
| 씬 프레임워크 | **narraleaf-react** (커스텀 컴포넌트 override) | ~30KB |
| 타이프라이터 | 기존 `useTypewriter` 훅 재활용 | 0 |
| 애니메이션 | framer-motion (이미 설치) | 0 |
| BGM | **howler.js** | ~7KB |
| 상태 | **Zustand** | ~3KB |
| 배경 이미지 | Gemini Imagen (이미 사용) | 0 |

**총 신규 번들: ~90KB gzipped**

### 6.14 Ink 스크립트 예시

```ink
=== 카페_여친_사과 ===
{narration:카페 안이다. 여친이 커피잔을 만지며 조용하다.}

{luna_yeo:"...왜 또 그러는데?"} {frame:2}

* [미안... 내가 선 넘었어] -> response_apology
* [장난이었잖아, 뭘 그렇게] -> response_defensive
* [직접 쓸게] -> custom_input

=== response_apology ===
{narration:여친이 잠시 조용하다. 커피를 한 모금 마신다.}
{luna_yeo:"...그래서 뭘 잘못한 건데?"} {frame:3}
...
```

### 6.15 작전 완료 판단

Luna (코치) 가 5-10턴 관찰 후:
- 유저가 3가지 접근법 다 시도했나?
- 자연스러운 답변 1개 이상 찾았나?
- 유저 스스로 "이제 됐어" 했나?

→ [OPERATION_COMPLETE:roleplay|"카페 만남 시나리오 연습 완료. '진심 사과 + 구체 계획' 조합이 가장 자연스러웠음."]

---

## 7. DRAFT WORKSHOP MODE — 메시지 초안 공방

### 7.1 개념

**실제로 보낼 카톡/문자 메시지** 를 Luna 와 같이 다듬는 모드.

3가지 초안을 A/B/C 카드로 제시 → 유저 선택 → 편집 → 최종 확정.

### 7.2 진입 UX

```
┌────────────────────────────────────────┐
│  ✏️  메시지 초안 공방                  │
│  어제 그 일 때문에 미안하다고 보내고 싶어 │
│                                         │
│  내가 3가지 버전으로 짜봤어 —           │
└────────────────────────────────────────┘

  [A 부드럽게]              [B 솔직하게]             [C 단호하게]
  ╔═════════╗               ╔═════════╗              ╔═════════╗
  ║ "어제 내가  ║               ║ "어제 장난친 거  ║              ║ "내가 잘못했어. ║
  ║  좀 심했지?  ║               ║  진짜 미안. 네  ║              ║  네 마음 상하게  ║
  ║  네 기분..."║               ║  마음..."     ║              ║  한 거..."    ║
  ╚═════════╝               ╚═════════╝              ╚═════════╝
  [편집] [이걸로]            [편집] [이걸로]           [편집] [이걸로]
```

### 7.3 카드 디자인

각 카드:
- **톤 라벨** (A 부드럽게 / B 솔직하게 / C 단호하게)
- **미리보기** (카톡 말풍선 실제 모양으로)
- **전송 시뮬레이션** (상대방 아바타 + 말풍선)
- **편집 / 이걸로** 버튼

### 7.4 편집 모드

**"편집" 클릭 시:**
- 카드가 확대 (modal)
- 문장 단위로 split → 각 문장 옆에 **"💡"** 아이콘
- 💡 클릭 → Luna 가 대안 3개 제시 (드롭다운)
- 실시간 길이 카운터 (카톡 기준 150자 권장)
- 실시간 톤 분석 표시 (progress bar: 부드러움 ━━●━━ 단호함)

### 7.5 전송 시뮬레이션

**"이걸로" 선택 시 확정 전:**
- 가짜 카톡 화면 모킹
- 유저 아바타에서 메시지 버블 전송 애니메이션
- 상대방 "입력 중..." 표시 (가짜)
- Luna 가 상대방 반응 예측 3가지 시뮬레이션:
  - 긍정 반응: "알았어 다음엔 안 그럴게?"
  - 중립 반응: "...응. 고마워"
  - 부정 반응: "말로만 그러지 마라"

### 7.6 저장

확정 시 **"내 카톡 초안함"** 에 저장 (재열람 가능).
채팅으로 돌아가며 Luna: "초안 저장했어! 진짜 보낼 때 되면 알려줘"

### 7.7 기술 스택

- 편집 UI: 기존 Tailwind 컴포넌트 + framer-motion
- 톤 분석: LLM 추가 호출 (빠른 Haiku)
- 전송 시뮬: Gemini Flash 로 상대방 반응 생성

### 7.8 LLM 프롬프트 흐름

```
[1] 초안 3개 생성 프롬프트:
  - 상황 요약
  - 유저 의도 (사과/제안/거절 등)
  - 3가지 톤 (부드럽게/솔직하게/단호하게)
  → JSON 3개 카드

[2] 편집 대안 생성:
  - 선택된 문장
  - 전체 맥락
  - 유저 요청 ("더 짧게", "더 부드럽게")
  → JSON 3개 대안

[3] 상대방 반응 시뮬레이션:
  - 최종 메시지
  - 상대 페르소나 (MIRROR 에서 파악된 정보)
  → JSON 3개 반응 (긍정/중립/부정)
```

### 7.9 작전 완료 판단

유저가 "이걸로" 선택 → 자동 완료.

---

## 8. PANEL REPORT MODE — 다관점 비평

### 8.1 개념

**유저 상황을 3가지 시선으로 동시 분석.** Luna 혼자가 아니라 가상 페르소나 3명.

- 👩 친한 언니 (공감/위로 중심)
- 🧑‍💼 냉철한 친구 (객관적 분석)
- 😎 시크한 선배 (직설/도전)

유저가 각각의 의견을 듣고 "어느 관점이 제일 맞는지" 선택.

### 8.2 UI 디자인

```
┌──────────────────────────────────────────┐
│   👥  관점 패널                           │
│   "내 남친이 자꾸 딴 여자 SNS 좋아요를 누르는데" │
│   3명이 각자 자기 생각 말해줄게            │
└──────────────────────────────────────────┘

  [👩 친한 언니]  [🧑‍💼 냉철한 친구]  [😎 시크한 선배]
  ────────────   ─────────────     ─────────────
  "야 그건 진짜  "Intent 확인이   "넌 지금 상대한테
   서운하지..    필요해. 단순     너무 매여있어.
   너 지금 사랑   호기심인지 딴   나라면 먼저..."
   받고 싶은..."  마음인지..."   

  [내가 공감] [들어볼게] [아니야] [내가 공감] [들어볼게] [아니야] ...
```

### 8.3 인터랙션

1. 3개 카드가 **순차적으로 슬라이드 인** (stagger 0.3s)
2. 유저가 각 카드에 대해 반응 선택
   - "내가 공감" (primary — 이 관점이 맞음)
   - "들어볼게" (neutral — 일리 있음)
   - "아니야" (dismiss — 내 상황과 안 맞음)
3. **한 개만 "내가 공감"** 선택 가능 — 라디오 같음
4. 선택 완료 시 하단에 **"이 관점으로 더 깊게 들어가볼까?"** CTA

### 8.4 깊이 파고들기

"내가 공감" 선택한 페르소나로 **더 깊은 대화** (2-3턴):
- 해당 페르소나 관점으로 Luna 가 2차 분석
- 유저가 "그래서 어떻게 해야돼?" 질문 가능
- 마지막에 [OPERATION_COMPLETE:panel|"시크한 선배 관점에서 '먼저 마음 확인' 전략 수용"]

### 8.5 사이드 뷰

3개 카드 접혀있을 때 상단에 미니 아바타 줄:
```
👩 ──● 🧑‍💼 ─── 😎 ──○
```
● = 공감, ─ = 중립, ○ = 거부

### 8.6 기술 스택

- 3명 페르소나는 **LLM 병렬 호출** (Gemini Flash 3개 동시)
- 각 페르소나 프롬프트 분리 (공감형 / 분석형 / 도전형)
- 카드 UI: framer-motion stagger

### 8.7 작전 완료 판단

- 유저가 공감 페르소나와 2턴 이상 대화했을 때
- 유저가 "이제 알겠어" 뉘앙스 표현 시

---

## 9. TONE SELECT MODE — 톤 정하기

### 9.1 개념

같은 메시지를 3가지 톤으로 보여주고 유저가 선택.

### 9.2 UI

```
┌──────────────────────────────────┐
│  🎨  톤 정하기                    │
│  어떤 느낌으로 가고 싶어?          │
└──────────────────────────────────┘

  [💐 부드럽게]      [🔍 솔직하게]      [🔥 단호하게]
   ┌─────────┐        ┌─────────┐        ┌─────────┐
   │"어제 내가 │        │"내가 장난 │        │"내가 잘못 │
   │ 좀 심했지.│        │ 친 거 정말│        │ 했어. 네  │
   │ 네 맘 편치│        │ 미안. 네 │        │ 기분 상하 │
   │ 않았겠어" │        │ 마음..." │        │ 게 한 거..│
   └─────────┘        └─────────┘        └─────────┘
   온도계: 🌡️ 20%      온도계: 🌡️ 50%      온도계: 🌡️ 85%

  [선택]              [선택]              [선택]
```

### 9.3 특화 요소

- **온도계 시각화** (0-100%) — 단호함 정도 색상으로 표시 (blue→orange→red)
- **단어 하이라이트** — 각 카드에서 특징적 단어 (ex: "진짜 미안") bold glow
- **톤 전환 애니메이션** — 다른 톤 hover 시 현재 카드 텍스트가 천천히 morphing preview

### 9.4 작전 완료

유저가 "선택" 시 → [OPERATION_COMPLETE:tone|"솔직하게 톤 선택"] → DRAFT WORKSHOP 으로 자동 전환 가능.

---

## 10. IDEA REFINE MODE — 아이디어 다듬기

### 10.1 개념

유저가 "이렇게 할까?" 제안 → Luna 가 **다듬어서 제시** → 원본 vs 다듬은 것 비교.

### 10.2 UI

```
┌──────────────────────────────────────┐
│  💡  아이디어 다듬기                  │
│  네 아이디어 들어볼게 —               │
└──────────────────────────────────────┘

[ 아이디어 입력창 — 다중줄 ]
┌─────────────────────────────────┐
│ "이번 주말에 같이 영화보자고    │
│  카톡 보낼까 그냥 전화할까?"     │
└─────────────────────────────────┘
[루나가 다듬기] 버튼

─── 다듬은 후 ───

┌──── 네 원본 ────┐  ┌──── 루나 다듬음 ────┐
│ "이번 주말에 같이│  │ "요즘 그 영화 재밌는│
│  영화보자고..."  │  │  거 있지. 토요일 어│
│                  │  │  때? 시간 괜찮으면  │
│                  │  │  같이 볼래?"       │
└──────────────────┘  └──────────────────────┘

[이유: _구체 제안 + 선택 여지_]
[이유: _전화 여부는 분리 이슈라 뺌_]

[원본 살리기] [루나꺼로] [섞어서]
```

### 10.3 특화 요소

- **diff 하이라이트** — 원본 대비 추가/삭제/변경된 부분 색상
- **루나 이유 말풍선** — 왜 다듬었는지 각 변경점마다 작은 툴팁
- **섞어서 모드** — 원본 일부 + 루나 일부 혼합 편집기

### 10.4 작전 완료

유저가 최종안 확정 → [OPERATION_COMPLETE:idea|"토요일 영화 제안으로 구체화"]

---

# Part V — 공용 UI 프리미티브

## 11. Shared UI Components

### 11.1 ModeFrame 컴포넌트

모든 모드의 공통 외피. 오버레이 역할.

```tsx
<ModeFrame
  modeId="roleplay"
  title="카페 만남 연습"
  subtitle="루나(여친) 과 대화"
  onExit={() => setShowExitConfirm(true)}
>
  {/* 모드 전용 UI */}
</ModeFrame>
```

- 상단: 모드 아이콘 + 제목 + 종료 버튼
- 하단: "채팅으로 돌아가기" 최소화 버튼
- 왼쪽 swipe → 최소화 (mobile)

### 11.2 NarrationBox 컴포넌트

roleplay / panel / idea 에서 공통 사용.

```tsx
<NarrationBox
  type="situation"  // 'situation' | 'action' | 'emotion'
  text="카페 안이다. 여친이 커피잔을 만지며 조용하다."
  typewriterSpeed={40}
/>
```

### 11.3 CharacterBar 컴포넌트

상단에 역할/캐릭터 표시.

```tsx
<CharacterBar
  avatar="/luna_fox.png"
  name="루나"
  role="여친 역할"
  mood="serious"  // 스프라이트 프레임
/>
```

### 11.4 ChoiceList 컴포넌트

3지선다 선택지 + 직접 입력 옵션.

### 11.5 DraftCard 컴포넌트

DRAFT_WORKSHOP 및 TONE_SELECT 공용.

### 11.6 DiffViewer 컴포넌트

IDEA_REFINE 전용 — 원본/다듬은 것 side-by-side.

---

# Part VI — LLM 통합 & 프롬프트 시스템

## 12. Mode-Aware Prompt Engineering

### 12.1 Mode 프롬프트 오버레이

ACE v5 시스템 프롬프트 위에 **모드 오버레이** 주입:

```
### 활성 모드: ROLEPLAY
네가 지금 역할극 중이야. 
- 현재 역할: 루나(여친)
- 상황: 카페에서 만남
- 목표: 유저 사과 연습
- 톤: 시크하지만 진심 듣고싶은 느낌

응답 형식 (JSON):
{
  "narration": "_상황 묘사_" | null,
  "dialogue": "역할 대사",
  "spriteFrame": 0-7,
  "choices": ["A", "B", "C"] | null,
  "sceneChange": { "to": "...", "reason": "..." } | null,
  "complete": false | true
}
```

### 12.2 프롬프트 생성기 구조

```ts
function buildModePrompt(mode: string, state: any): string {
  switch (mode) {
    case 'roleplay': return buildRoleplayPrompt(state);
    case 'draft':    return buildDraftPrompt(state);
    case 'panel':    return buildPanelPrompt(state);
    case 'tone':     return buildTonePrompt(state);
    case 'idea':     return buildIdeaPrompt(state);
  }
}
```

### 12.3 파싱 전용 모드

모드 활성 중엔 일반 채팅 파서 대신 **JSON 파서** 사용.
`[FX:...]` 같은 인라인 힌트는 JSON 필드로 이동.

---

# Part VII — 상태 관리

## 13. State Architecture

### 13.1 Mode Store (Zustand)

```ts
interface ModeStore {
  activeMode: ModeId | null;
  modeState: RoleplayState | DraftState | PanelState | ToneState | IdeaState | null;
  
  enter: (mode: ModeId, init: any) => void;
  update: (patch: any) => void;
  exit: () => void;
  complete: (summary: string) => void;
}
```

### 13.2 Persistence

- Zustand `persist` middleware → localStorage
- 서버에도 `counseling_sessions.mode_state` 로 sync (5초마다 debounced)

### 13.3 Mode Recovery

앱 재시작 시:
- `active_mode` 있으면 자동 복원
- 중단된 상태에서 이어서 진행
- 5분 이상 방치 시 exit 확인 다이얼로그

---

# Part VIII — Phase 전환 로직

## 14. Phase Manager 확장

### 14.1 새 규칙

```
BRIDGE 진입:
  → active_mode = null, 모드 선택 UI 표시

모드 선택:
  → active_mode = <선택>, mode_started_at = now()

모드 진행 중:
  → Phase 재판단 로직 **bypass** (턴 수 제한 무효)

[OPERATION_COMPLETE] 태그 감지:
  → active_mode = null, mode_state 저장
  → SOLVE 전환 가능성 재평가
```

### 14.2 안전망

- 모드 60분 경과 시 자동 종료 확인
- 앱 crash 복구 시 mode_state 로 복원
- 유저가 다른 Phase 얘기 시작하면 (예: "아 우리 이제 계획 짜자") → 모드 종료 제안

---

# Part IX — 성능 & 접근성

## 15. Performance

### 15.1 Lazy Loading

- narraleaf-react, inkjs, howler 모두 **동적 import**
- 모드 첫 진입 시만 로드
- 번들 분할: 각 모드 별 chunk

### 15.2 메모리 관리

- 배경 이미지는 1장씩 교체 (캐시 X)
- BGM 은 모드 종료 시 dispose
- Ink 인스턴스는 모드 당 1개

### 15.3 Prefetch

BRIDGE 진입 감지 시 → 백그라운드로 roleplay/draft 모드 prefetch (idle callback)

## 16. Accessibility

- `prefers-reduced-motion` 존중 (FX 시스템 연장)
- 모든 인터랙션 키보드 접근 가능
- 시각적 애니메이션은 모두 skip 가능
- 큰 폰트 / 고대비 옵션 (설정에서)

---

# Part X — 구현 단계

## 17. Milestone Plan

### M1 — Foundation (1주)
- [x] 기획서 완성 (이 문서)
- [ ] Mode Store (Zustand) 구현
- [ ] DB 스키마 변경
- [ ] `ModeFrame` 공용 컴포넌트
- [ ] Phase Manager 턴 제한 bypass

### M2 — Mode Selector (3일)
- [ ] BRIDGE 진입 시 모드 선택 카드
- [ ] [STRATEGY_READY] 파싱 확장
- [ ] 모드 진입 애니메이션

### M3 — ROLEPLAY Mode (2주)
- [ ] inkjs + narraleaf-react 통합
- [ ] 배경 이미지 생성 파이프라인
- [ ] 스프라이트 시스템 확장 (역할별 테마)
- [ ] NarrationBox, CharacterBar, ChoiceList
- [ ] LLM 프롬프트 + JSON 파싱
- [ ] howler.js BGM
- [ ] 직접 입력 모드
- [ ] 코치 피드백 시스템
- [ ] 작전 완료 판단

### M4 — DRAFT WORKSHOP (1주)
- [ ] 3 카드 UI + 편집 모달
- [ ] 톤 분석 progress bar
- [ ] 상대방 반응 시뮬레이션
- [ ] 저장/재열람 시스템

### M5 — PANEL REPORT (5일)
- [ ] 3 페르소나 병렬 LLM 호출
- [ ] 카드 stagger 애니메이션
- [ ] 깊이 파고들기 서브 대화

### M6 — TONE SELECT (3일)
- [ ] 3 카드 + 온도계 시각화
- [ ] 톤 preview hover 효과

### M7 — IDEA REFINE (5일)
- [ ] Diff viewer
- [ ] 원본/다듬기 비교
- [ ] 섞어서 편집기

### M8 — Polish (1주)
- [ ] Prefetch / lazy load 최적화
- [ ] 접근성 감사
- [ ] 모드 복구 시스템
- [ ] 에러 핸들링 / fallback UI

**총 예상: ~7주 (1.5개월)**

---

# Part XI — 오픈소스 스택 최종 결정

## 18. Technology Decisions

### 18.1 선택된 라이브러리

| 라이브러리 | 용도 | 이유 |
|---|---|---|
| **inkjs** | 롤플레이 스크립트 엔진 | .ink 언어로 브랜칭 관리. TypeScript 타입 내장. 50KB. |
| **narraleaf-react** | VN 씬 관리 | React-native 통합, 커스텀 컴포넌트 override 가능. |
| **howler.js** | BGM/SFX | 7KB, Atrament 에서도 사용, well-tested. |
| **Zustand** | 모드 상태 | 3KB, persist middleware 기본 제공. |
| **framer-motion** | 애니메이션 | 이미 설치. |
| **diff** (jsdiff) | IDEA_REFINE diff | ~12KB, 다양한 diff 알고리즘. |

### 18.2 거부된 라이브러리

| 라이브러리 | 거부 이유 |
|---|---|
| Ren'Py Web | 30-80MB 번들, Python WASM, React 통합 불가 |
| Pixi'VN | PixiJS 500KB 부담 |
| react-visual-novel | 2022 이후 미관리 |
| Twine | React 통합 번거로움 |

### 18.3 디자인 레퍼런스 (라이선스 이슈 없는 영감원)

- Doki Doki Literature Club (UI 레이아웃)
- Monster Prom (캐릭터 표정 시스템)
- Heart's Medicine (미니게임 통합 UX)
- Google Magic Compose (DRAFT 카드 UX)
- ShapeOf.AI Restyle 패턴 (TONE/DRAFT)
- Discord Activities (모드 전환 구조)
- character.ai (역할극 UX)

---

# Part XII — 리스크 & 대응

## 19. Risks

### 19.1 LLM 비용 증가
**리스크**: 모드 활성 중 턴 제한 없음 → LLM 호출 폭증
**대응**:
- Gemini Flash 우선 (cheap)
- 캐싱 적극 활용 (handoff / 스크립트)
- 60분 자동 종료 안전망
- 프리미엄 모델은 유료 티어만

### 19.2 복잡도 증가
**리스크**: 5개 모드 + 각자 UI/로직 → 유지보수 지옥
**대응**:
- 공용 프리미티브 (ModeFrame, NarrationBox) 강제
- 모드 당 단일 파일 원칙
- 통합 테스트 스위트

### 19.3 LLM 일관성 깨짐
**리스크**: 롤플레이 중 갑자기 상담사 모드로 돌아옴
**대응**:
- 모드 프롬프트에 "역할 이탈 금지" 강조
- JSON 스키마 검증
- 역할 이탈 감지 시 자동 재생성

### 19.4 모바일 UX 복잡성
**리스크**: 풀스크린 모드 + 채팅 복귀 전환이 혼란
**대응**:
- BottomSheet 패턴 우선
- 스와이프 제스처 + 명시적 버튼
- 툴팁 / 온보딩 튜토리얼

---

# Part XIII — 성공 지표

## 20. Success Metrics

### 20.1 정량
- BRIDGE Phase 완료율 +30%
- 평균 세션 시간 +40%
- 모드 당 평균 턴 수: 8-15
- 작전 완료 → SOLVE 전환율 >70%
- 7일 재방문율 +25%

### 20.2 정성
- "친구 같아요" NPS 평가 >4.5/5
- 롤플레이 평가: "실제로 말 연습 된 느낌" >60%
- DRAFT 저장 후 실제 발송률 >40%

### 20.3 기술
- 모드 진입 지연 < 500ms
- LLM 응답 P95 < 4s
- 60fps 유지 (모든 연출)
- 번들 증가 < 150KB

---

# Part XIV — 부록

## 21. 파일 구조 (예상)

```
src/
├── engines/
│   └── bridge-modes/
│       ├── mode-manager.ts          ← 모드 오케스트레이션
│       ├── mode-prompts/
│       │   ├── roleplay.ts
│       │   ├── draft.ts
│       │   ├── panel.ts
│       │   ├── tone.ts
│       │   └── idea.ts
│       ├── roleplay/
│       │   ├── ink-scripts/
│       │   ├── sprite-themes.ts
│       │   └── bgm-map.ts
│       └── shared/
│           ├── mode-store.ts         ← Zustand
│           └── types.ts
├── components/
│   └── modes/
│       ├── ModeFrame.tsx
│       ├── NarrationBox.tsx
│       ├── CharacterBar.tsx
│       ├── ChoiceList.tsx
│       ├── roleplay/
│       │   └── RoleplayMode.tsx
│       ├── draft/
│       │   ├── DraftMode.tsx
│       │   └── DraftCard.tsx
│       ├── panel/
│       │   └── PanelMode.tsx
│       ├── tone/
│       │   └── ToneMode.tsx
│       └── idea/
│           └── IdeaMode.tsx
└── docs/
    └── v81-bridge-modes-immersive-plan.md  ← 이 문서
```

## 22. DB 마이그레이션

```sql
-- 🆕 v81: BRIDGE 몰입 모드 상태 추적
ALTER TABLE counseling_sessions
  ADD COLUMN IF NOT EXISTS active_mode TEXT,
  ADD COLUMN IF NOT EXISTS mode_state JSONB,
  ADD COLUMN IF NOT EXISTS mode_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mode_history JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_sessions_active_mode 
  ON counseling_sessions(active_mode) WHERE active_mode IS NOT NULL;

-- 🆕 v81: 저장된 메시지 초안 (DRAFT_WORKSHOP 산출물)
CREATE TABLE IF NOT EXISTS message_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  session_id UUID REFERENCES counseling_sessions(id),
  tone TEXT NOT NULL,  -- 'soft' | 'honest' | 'firm'
  content TEXT NOT NULL,
  context TEXT,        -- 이 초안이 만들어진 배경 한 줄
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,   -- 실제로 보냈다면 유저가 표시
  metadata JSONB
);
```

## 23. 타입 정의 스케치

```ts
// mode-store.ts
export type ModeId = 'roleplay' | 'draft' | 'panel' | 'tone' | 'idea';

export interface RoleplayState {
  scenarioId: string;
  background: string;
  role: { name: string; archetype: string; tone: string };
  currentSceneId: string;
  turnIdx: number;
  userChoices: Array<{ sceneId: string; choiceId: string; rationale?: string }>;
  coachFeedbacks: string[];
  customInputs: string[];
}

export interface DraftState {
  context: string;
  intent: string;   // 'apology' | 'invite' | 'decline' | 'check-in' | ...
  drafts: Array<{ tone: string; content: string; intensity: number }>;
  selectedIdx: number | null;
  edits: Array<{ atSentence: number; from: string; to: string }>;
  simulatedReactions?: Array<{ tone: string; reaction: string }>;
}

export interface PanelState {
  context: string;
  personas: Array<{
    id: string;
    name: string;
    emoji: string;
    opinion: string;
    userReaction: 'resonate' | 'listen' | 'dismiss' | null;
  }>;
  chosenPersonaId: string | null;
  deepenTurns: Array<{ role: 'user' | 'luna'; content: string }>;
}

export interface ToneState {
  context: string;
  options: Array<{ tone: string; intensity: number; content: string; emoji: string }>;
  selectedIdx: number | null;
}

export interface IdeaState {
  original: string;
  refined: string | null;
  reasons: string[];
  merged?: string;
}
```

---

# 결론

BRIDGE Phase 를 **Luna 서비스의 차별화 킬러 경험** 으로 승격.

각 모드는 독립된 미니게임/시뮬레이션이지만 **공통 프리미티브**로 유지보수성 유지.
**LLM 판단 우선** 원칙 연장 — 모드 진입/진행/종료 모두 Luna 가 결정.
**카톡 DNA** 손상 없이 오버레이로 확장.

구현 우선순위:
1. **ROLEPLAY** (가장 몰입감, 차별화 최대)
2. **DRAFT WORKSHOP** (실용성 최대)
3. **PANEL REPORT** (신규 카테고리, 시장 차별화)
4. **TONE SELECT / IDEA REFINE** (보완)

총 7주 로드맵. 번들 증가 ~150KB 이내. 60fps 보장.

이 플랜으로 v81 구현 시작 가능.
