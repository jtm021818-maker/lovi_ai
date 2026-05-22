# v118 — PhaseProgress 풀 리디자인 (라이브 루나 + 5단계 손편지 스테퍼)

> **작성일**: 2026-05-22
> **대상 파일**: [src/components/chat/events/PhaseProgress.tsx](../src/components/chat/events/PhaseProgress.tsx)
> **분량**: A4 약 10페이지 (≈ 6,500 단어 / 10 챕터)
> **읽는 사람**: 바이브-코딩하는 AI 또는 사람. 페이지를 그대로 따라가면 1‑shot 구현이 가능하도록 작성.
> **선행 버전**: v116 (일상 5-phase) · v117.5 (anti-chip 회귀)
> **연관 사양**: [v116-daily-chat-5phase-plan.md](v116-daily-chat-5phase-plan.md) · [hook-transition-redesign-v4.md](hook-transition-redesign-v4.md)

---

> **🔄 v118.1 patch (2026-05-22)** — HOOK 은 "상담 5단계 vs 일상 5단계" 의 **분기 전(pre-branch)** 모먼트라는 점이 처음 설계에서 빠져 있었다. HOOK 동안에는 5단계 stepper 를 띄우면 안 됨(분기 미결정). 본 plan 의 §3/§4/§5/§6 에 `<ListeningMoment/>` 컴포넌트를 추가하고, §9 라우팅 표를 갱신했다. 코드도 같이 반영됨.

---

## 1. 개요 — 왜 다시 만드는가 (Page 1)

### 1.1 한 줄 요약
> 상담 진행 5단계가 한눈에 보이지 않고, "조용히 듣고 있어" 카드만 길게 떠 있어서 **지금 어디쯤 와있는지** 가 모호하다. 동시에 SVG 아바타가 너무 정적이라 **"실제 누나/언니와 대화한다"** 는 정서적 몰입이 끊긴다. v118 은 두 문제를 동시에 해결한다.

### 1.2 비즈니스 골 (Why)
- **이탈률 감소**: v117.x 데이터에서 HOOK 30초 이상 머무는 유저의 30% 가 페이지를 닫음. "이게 끝까지 가는 흐름이구나" 가 안 보이면 못 기다린다.
- **재방문 자산**: 상담 중간에 캡처해서 친구에게 보여주는 케이스가 발견됨. 캡처감이 살아있어야 바이럴된다.
- **루나 IP 강화**: 픽셀 아트 루나(`luna_sprite_setting_1.webp`, 7×7×49프레임)는 가장 가치 있는 시각 자산이지만 현재 PhaseProgress 에는 SVG 만 사용 중. 자산 활용도 < 20%.

### 1.3 디자인 골 (What)
1. **명확한 5단계 진행도** — 이야기 듣기 → 마음 읽기 → 같이 준비 → 실행 계획 → 변화 응원. 어느 단계든 "지금 OO 중" 이 0.3초 안에 인지되어야 함.
2. **살아있는 루나 아바타** — 7×7 스프라이트가 단계마다 **다른 표정/포즈 윈도우**로 진행 중인 단계를 직관적으로 표현.
3. **카톡 누나 상담실 톤** — Gowun Dodum / Nanum Pen Script 글꼴, 손글씨 모티프, 따뜻한 핑크/로즈/앰버 그라데이션. **차트, 게이지, 의료 UI 금지**.
4. **모바일 sticky 최적화** — 높이 ≤ 112px (헤더 60 + 본 컴포넌트 ≤ 52? 그건 너무 작음 — 실측 96~110 권장).
5. **분기 인지 보존** — v117.5 에서 chip 제거하고 LLM 첫말 + 빈 입력창으로 갔던 자유 흐름은 깨지 않는다. 진행 UI 는 **읽기 전용** — 클릭으로 단계 이동 X.

### 1.4 안 하는 것 (Non-Goals)
- LLM 프롬프트 변경 X. 이번 작업은 순수 **프론트 UI**.
- v116 일상 5-Phase 트랙(`CasualPhaseTrack`)은 건드리지 않음 — 상담 트랙(LUNA_STEPS)만 손본다. **단, 시각 언어는 같은 컴포넌트군(StepIcon, glow ring, sprite)으로 통일**해서 일관성 확보.
- 타로냥 트랙(TAROT_STEPS)은 동일 골격을 재사용하되 sprite 매핑만 다르게.
- 새 에셋 추가 X — 이미 있는 `luna_sprite_setting_1.webp`(7×7) 와 `luna_sprite_1.webp`(5×5) 만 활용.

---

## 2. 현재 상태 진단 (Page 2)

### 2.1 첨부 스크린샷 분석
사용자가 보낸 2장:

**A. 통상 진행 스테퍼 (BRIDGE 단계 진행 중)**
- 5개 아이콘이 옆으로 늘어선 미니 스테퍼. ✅ ✅ ★ ○ ○
- 캡션: "어떻게 할지 같이 생각 중 🔥"
- 평가: 5단계 인지는 OK. 다만 아이콘이 SVG 일러스트라 **추상도가 높음**. "여우 귀(HOOK) / 하트 돋보기(MIRROR)" 가 직관적이지 않다. 라벨 글자가 작아서(text-[9px]) 모바일에서 흐릿.

**B. HOOK 단계 (BranchedTrack)**
- 핑크 글로우 오브 안에 작은 SVG 여우 얼굴 + 좌측 큰 하트 + "조용히 듣고 있어 …" + 떠다니는 꽃잎.
- 평가: 무드는 매우 좋음. 단점은 **5단계 진행 컨텍스트가 사라짐**. 처음 들어온 유저는 "이게 어디로 가는 흐름인지" 알 수 없음. v117.5 의 anti-chip 정책상 텍스트 선택지도 없으니 더더욱 길잡이가 필요.

### 2.2 코드 레벨 진단
[PhaseProgress.tsx](../src/components/chat/events/PhaseProgress.tsx) 의 구조:

```
PhaseProgress (entry)
 ├─ HOOK            → <BranchedTrack/>            ← "조용히 듣고 있어" 카드 (5단계 사라짐)
 ├─ GREET/CATCHUP/…  → <CasualPhaseTrack/>         ← 일상 5-phase (그대로 유지)
 ├─ DAILY_CHAT      → <CasualPhaseTrack BANTER/>  ← 호환 alias
 └─ MIRROR/BRIDGE/SOLVE/EMPOWER → 기본 5-step stepper
```

**핵심 문제**:
1. HOOK 만 다른 컴포넌트(BranchedTrack)로 분기되어 **5단계 진행도가 끊긴다**. 다른 단계로 넘어가는 순간 갑자기 stepper 가 등장 → 인지 점프.
2. SVG 아이콘 9종(FoxEar/HeartLens/StrategyBoard/Sprout/Sparkle + tarot 4종)은 잘 만들었지만, 정작 메인 시각 자산인 `luna_sprite_setting_1.webp`(49프레임 픽셀 아트) 는 **여기서 0회 호출**.
3. 라벨 폰트 9px, 상태 문구 10px → 노안/저시력 / 야간 시청 시 가독성 ↓.

### 2.3 사용자 명시 요구 사항 (이번 턴)
원문:
> "처음에는 듣고 있어 저것만 뜨는데 확실히 분기되는 느낌에 public 의 luna_sprite_setting_1 이 이미지를 활용해서 지금보다 확실히 지금은 어떤건지 누나, 언니랑 대화하고 있는 느낌을 해치지 말고 디자인을 확 지금 진행사항에 맞게하는데 고퀄로"

→ 정제:
- (a) HOOK 에서도 "지금 어떤 단계인지" 가 보여야 한다.
- (b) 단계가 바뀔 때 **확실히 분기되는** 시각 변화가 있어야 한다.
- (c) `luna_sprite_setting_1.webp` 를 활용.
- (d) 누나/언니 톤 유지.
- (e) "고퀄" — 디테일/마이크로 인터랙션 풀로 박을 것.

---

## 3. 외부 레퍼런스 & 디자인 철학 (Page 3)

### 3.1 참조 패턴
*리서치 에이전트 결과는 별도. 본 절은 검증된 패턴만 요약.*

| 패턴 | 출처 | 가져올 것 |
|---|---|---|
| **Replika daily mood check‑in 5단계** | replika.ai | 단계 라벨 옆에 캐릭터 미니어처. 단계 전환 시 캐릭터 모션 변화 |
| **Headspace breathing flow** | headspace.com | "함께 호흡하기" 라이브 캐릭터 + 진행도 ring |
| **Tamagotchi / Stardew companion panel** | (게임) | 캐릭터의 idle 모션(숨쉬기/깜빡임) 으로 "지금 살아있다" 표현 |
| **카카오톡 비즈채널 상담 진행 알림** | KakaoTalk Channel | 상단 sticky 얇은 바 + "○○ 상담사 답변 준비 중" 손글씨 톤 카피 |
| **iOS Apple Pay 진행 스테퍼** | Apple HIG | past/current/future 의 명도 대비 — 과거는 50%, 현재 100%, 미래 30% |
| **Stitch UI mood board (이 프로젝트 기존)** | `/public/stitch_luna_landing.webp` | 손그림 꽃잎 + 손글씨 글꼴 일관성 |

### 3.2 본 컴포넌트의 디자인 철학 5계명
1. **"누나가 보고 있다"** — 화면 어느 부분에서든 루나가 살아있다는 신호가 있어야 한다 (idle 호흡 + 가끔 깜빡임 + thinking dots).
2. **"진행은 길잡이지 점수판이 아니다"** — % 숫자, 게이지 같은 평가적 시각 요소 금지. **느낌**으로 보여준다.
3. **"손편지 결, 카톡 톤"** — Gowun Dodum / Nanum Pen Script. 모든 텍스트는 letter-spacing 살짝 -0.01em.
4. **"한 화면 = 한 감정"** — 현재 단계의 컬러 톤이 컴포넌트 전체를 지배. 다른 단계는 회색조에 가깝게.
5. **"움직임은 호흡처럼"** — easeInOut, duration 1.6~2.4s, infinite. 빠르게 튀는 모션(spring stiffness 200+) 금지.

### 3.3 안티 패턴
- ❌ 진행률 % 숫자 표시 ("47% 완료") — 평가 UI 됨
- ❌ "다음 단계로" / "건너뛰기" 버튼 — 사용자 결정 흐름 깨짐 (v117.5 교훈)
- ❌ 모달, 툴팁, 클릭 인터랙션 — sticky 영역은 **순수 indicator**
- ❌ 새 폰트, 새 컬러 토큰 추가 — 기존 디자인 토큰만 사용
- ❌ 7×7 스프라이트 전체 49프레임 풀 루프 (CPU 부담) — 단계별 4~6 프레임 subset 만 사용

---

## 4. 비주얼 컨셉 — "카톡 누나 상담실" (Page 4)

### 4.1 한 줄 컨셉
> **"카톡 상담방 상단에 살아있는 루나가 살짝 보이고, 그 아래 손글씨로 '지금 OO 단계' 가 적혀있는 느낌"**

### 4.2 레이아웃 와이어 (모바일 390 × 96)

```
┌──────────────────────────────────────────────────────┐  ← border-bottom 1px (rose-100/40)
│                                                      │
│  ┌──┐  이야기 듣기 ✓   마음 읽기 ✓   같이 준비 ●    │  ← row 1: stepper (h=28)
│  │🦊│  ─────────────────●──────────○──────○         │     · 좌측 32x32 라이브 sprite
│  └──┘  실행 계획 ○   변화 응원 ○                    │     · 우측 inline 라벨 줄
│                                                      │
│    "어떻게 할지 같이 생각 중 🔥"  ‖                  │  ← row 2: 손글씨 상태 카피 (h=22)
└──────────────────────────────────────────────────────┘
```

> 실제 구현에서는 row1 라벨을 stepper **아래** 에 배치 (현재 코드와 동일). 위 ASCII 는 정보 우선순위만.

### 4.3 핵심 컨셉 — "라이브 루나 메달리온"
- 좌측에 **40×40 원형 메달리온**. 안쪽에 `luna_sprite_setting_1.webp` 의 **현재 단계 전용 프레임 윈도우** 가 재생됨.
- 메달리온 외곽에 단계별 컬러의 **두 겹 글로우** (inner pulse + outer radial), 호흡 주기 1.8s.
- 진행이 한 단계 넘어갈 때 메달리온이 **살짝 튕긴다** (scale 1 → 1.08 → 1, 0.5s spring).
- 메달리온 우상단에 **하트 둥둥** (현재의 BranchedTrack 에 있던 디테일을 유지) — 누나가 본다는 신호.

### 4.4 색채 시스템
| 단계 | Primary | Secondary | Glow | 비고 |
|---|---|---|---|---|
| HOOK (이야기 듣기) | #fb7185 rose-400 | #fbcfe8 pink-200 | rgba(251,113,133,.45) | 따뜻한 첫인사 |
| MIRROR (마음 읽기) | #a855f7 purple-500 | #e9d5ff purple-200 | rgba(168,85,247,.42) | 내면 들여다보는 보랏빛 |
| BRIDGE (같이 준비) | #f97316 orange-500 | #fed7aa orange-200 | rgba(249,115,22,.45) | 작전 열기 — 따끈한 불꽃 |
| SOLVE (실행 계획) | #22c55e green-500 | #bbf7d0 green-200 | rgba(34,197,94,.40) | 새싹 — 행동 시작 |
| EMPOWER (변화 응원) | #eab308 yellow-500 | #fef08a yellow-200 | rgba(234,179,8,.45) | 별 — 응원 폭죽 |

> 타로 시 컬러 매핑은 단일 보라 톤(#7c3aed → #a78bfa) 으로 통일하고 단계 차이는 채도로만 표현.

### 4.5 형태/모양 사전
- 모든 모서리: rounded-full (메달리온/도트) / rounded-[12px] (카드)
- 두께: stroke 1.2~1.6, 글로우 blur 8~14
- 폰트: 라벨 "Gowun Dodum" 700, 상태 카피 "Nanum Pen Script" 700 (현재 사용 중)
- 자간: -0.01em (한국어 가독)

---

## 5. 5-Phase 비주얼 사전 (Page 5)

### 5.1 스프라이트 프레임 매핑
`luna_sprite_setting_1.webp` 는 7×7 = 49 프레임. 가로로 7개, 세로로 7개 줄.
일반적 픽셀 시트는 **행(row)별로 다른 모션 루프**를 묶는다. 각 단계별로 **subset 슬라이딩 윈도우** 를 정의:

| 단계 | row 범위 | col 범위 | 프레임 수 | 모션 컨셉 |
|---|---|---|---|---|
| HOOK | row 0 | col 0~6 | 7 | 귀 쫑긋, 눈 깜빡, 살짝 끄덕 — "듣고 있어" |
| MIRROR | row 1 | col 0~6 | 7 | 손 모은 채 미소, 가끔 옆 봄 — "느낌 짚는 중" |
| BRIDGE | row 2~3 | col 0~6 | 14 | 메모지 적는 손, 불꽃 살짝 — "같이 준비" |
| SOLVE | row 4 | col 0~6 | 7 | 새싹 들고 끄덕, 자신감 있는 포즈 |
| EMPOWER | row 5~6 | col 0~6 | 14 | 별 쥐고 빛남, 팡 — 응원 폭죽 |

> 실제 row 매핑은 코드에서 `customRow={N}` 식으로 LunaSprite 를 강제 제어하기보다, **`speed`와 `paused`만 다르게** 하고 단계 글로우 색만 바꾸는 **MVP 1단계**로 시작. row 슬라이싱은 **Phase 2** 작업.

### 5.2 각 단계 상태 카피 (status text)
모두 한국어, 누나톤. 5종 모두 풀로 정의:

| 단계 | 기본 카피 | A/B 변형 (LLM thinking 미수신 시 fallback) |
|---|---|---|
| HOOK | 조용히 듣고 있어 🦊 | 이야기 더 들어볼게… / 응응 천천히 말해 |
| MIRROR | 마음을 읽어보는 중 💕 | 어떤 기분일지 그려보고 있어 / 가만히 느껴보는 중 |
| BRIDGE | 같이 작전 짜는 중 🔥 | 어떻게 할지 생각해 보자 / 메모지 펴는 중 |
| SOLVE | 실행 계획 정리 중 🌿 | 이렇게 해 볼래? / 새싹 심는 중 |
| EMPOWER | 응원 메시지 준비 중 ✨ | 멋지게 갈 거야 / 별 띄우는 중 |

> 모든 카피는 `useTypewriter` 70ms 로 들어오고, LLM 의 `lunaThinking` 이 있으면 그걸 우선.

### 5.3 단계 전환 모션
- 전 단계 메달리온 → 새 단계 메달리온: 컬러 transition 600ms, 글로우 blur transition 800ms, 스프라이트는 paused 한 번 후 재생 (브레인 다음 row 로 리셋).
- stepper 라벨: 과거 → 현재로 옮겨오면서 작은 ✓ 마크가 **그려지듯** path drawing (현재 코드 그대로 유지).
- 진행 바: 현재 코드의 `motion.div width animate` 유지, 단 spring stiffness 100 → 80 으로 조금 더 부드럽게.

### 5.4 마이크로 인터랙션 모음
| 위치 | 인터랙션 | 트리거 | 디테일 |
|---|---|---|---|
| 메달리온 | breathing | always | scale [1, 1.04, 1] 1.8s easeInOut |
| 메달리온 외곽 | pulse glow | always | opacity [0.5, 1, 0.5] 1.8s |
| 우상단 하트 | floating | always | y[0,-2,0] rotate[-10,5,-10] 2.2s |
| stepper dot (current) | drawing ring | phase change | path length 0→1, 1.2s |
| stepper dot (past) | check stamp | phase 완료 시 | scale 0→1 spring damping 14 |
| 진행바 끝 dot | glow halo | always | boxShadow scale [1, 1.3, 1] |
| 상태 카피 | typewriter | text change | 70ms/char, 끝에 깜빡 caret |
| 떠다니는 꽃잎 | floating | always | 6장, 4~6s 루프, 각각 0.3s delay 차이 |

---

## 6. 컴포넌트 아키텍처 (Page 6)

### 6.1 파일 구조 (현행 유지 + 내부 재구성)
```
src/components/chat/events/
  PhaseProgress.tsx              ← 본 작업 대상
    ├─ <PhaseProgress>            메인 entry (props 시그니처 변경 없음)
    │   ├─ casual 분기            v116 그대로
    │   └─ <ConsultStepperTrack>  🆕 NEW (LUNA_STEPS / TAROT_STEPS 통합 렌더러)
    │        ├─ <LiveLunaMedallion>   🆕 NEW (sprite + glow + heart)
    │        ├─ <StepperRow>           🆕 NEW (5개 dot + 진행바)
    │        └─ <StatusCaption>        🆕 NEW (typewriter + caret + petals)
    └─ (기존 SVG 아이콘 9종은 유지 — fallback / 단계 dot 내부에서 계속 사용)
```

> **삭제**: `<BranchedTrack>` 컴포넌트 (HOOK 전용). HOOK 도 이제 `<ConsultStepperTrack currentPhase="HOOK">` 로 동일하게 처리.

### 6.2 Props 시그니처 (변경 없음 — 호환성 보존)
```ts
interface PhaseProgressProps {
  currentPhase: ConversationPhaseV2 | null;
  progress: number;
  persona?: PersonaMode;
  lunaThinking?: string;
  understandingLevel?: number;
}
```

→ ChatContainer 의 호출부 ([ChatContainer.tsx:939](../src/components/chat/ChatContainer.tsx#L939)) **무수정**.

### 6.3 내부 prop 흐름
```
ConsultStepperTrack {
  currentPhase, progress, persona, lunaThinking, understandingLevel
}
  → derive idx, totalPercent (현 코드 로직 재활용)
  → derive activePhaseConfig (color / spriteSpeed / fallbackText)
  → render:
       <LiveLunaMedallion persona phaseColor idx />
       <StepperRow steps idx totalPercent persona />
       <StatusCaption text={lunaThinking ?? activePhaseConfig.fallback} color=... />
}
```

### 6.4 LiveLunaMedallion 상세
```tsx
<LiveLunaMedallion
  persona="luna" | "tarot"
  glow="#fb7185"          // 단계 컬러
  spriteSpeed="slow" | "normal"
  size={40}
/>
```
- 내부에서 `import LunaSprite from '@/components/common/LunaSprite'` 사용.
- `persona === 'tarot'` 이면 sprite 대신 기존 SVG `CatEarIcon` 사용 (타로 sprite 없음).
- 메달리온 = 외곽 글로우 div + 흰 글래스 백판 + LunaSprite preset="setting" size=32, frameMs=110.
- 하트 둥둥 SVG 우상단 absolute.

### 6.5 StepperRow 상세
- 현재 5-step stepper 의 시각을 그대로 채택 (justify-between + 진행바 + dot + check).
- 다만 **dot 안에 들어가는 아이콘** 만 기존 SVG 그대로 (FoxEarIcon / HeartLensIcon / …) — sprite 는 메달리온에만 사용. dot 까지 sprite 넣으면 무거움.
- 라벨 폰트: 9px → **10.5px**, font-weight 700 (가독성).
- 현재 진행 dot 위 별/하트 미니 데코 추가 (단계 컬러 그라데이션 small dot).

### 6.6 StatusCaption 상세
- 떠다니는 손그림 꽃잎 6장 (현 BranchedTrack 의 디테일 이식).
- 타이핑 캐럿.
- 폰트: Nanum Pen Script 12px (기존 10px → 12).

---

## 7. 애니메이션 / 모션 스펙 (Page 7)

### 7.1 framer-motion variant 표
| 이름 | initial | animate | transition |
|---|---|---|---|
| `medallionBreathe` | scale:1 | scale:[1,1.04,1] | duration:1.8 repeat:Infinity easeInOut |
| `medallionGlow` | opacity:0.5 | opacity:[0.5,1,0.5] | duration:1.8 repeat:Infinity easeInOut |
| `medallionBumpOnPhaseChange` | scale:1 | scale:[1,1.08,1] | spring damping:14 stiffness:180 |
| `heartFloat` | y:0 rotate:-10 | y:[0,-2,0] rotate:[-10,5,-10] | duration:2.2 repeat:Infinity easeInOut |
| `stepDotRing` | pathLength:0 | pathLength:1 | duration:1.2 ease:easeOut |
| `progressBarFill` | width:0 | width:`${totalPercent * (barRange/100)}%` | spring damping:20 stiffness:80 |
| `progressEndDot` | boxShadow soft | boxShadow expanded | duration:1.8 repeat:Infinity easeInOut |
| `checkStamp` | scale:0 opacity:0 | scale:1 opacity:1 | spring damping:14 |
| `petalFloat[i]` | y:0 rot:θ | y:[0,-6,0] rot:[θ,θ+10,θ] | duration:4+0.5i repeat:Infinity delay:p.delay |

### 7.2 reduce-motion 대응
- `@media (prefers-reduced-motion: reduce)` 시 모든 infinite animation 의 `repeat` 를 0 으로 떨어뜨림.
- 구현: 컴포넌트 상단에서 `useReducedMotion()` 훅(framer-motion 내장) 사용 → 모든 motion props 에 `reduce ? {} : {…}` 삼항.

### 7.3 성능 가드
- `LunaSprite` 는 이미 IntersectionObserver + visibilitychange 로 off-screen / 백그라운드 시 자동 정지. ✅ 그대로 활용.
- 떠다니는 꽃잎 6장 → 최대치. 추가하지 말 것 (5개 device GPU 부담 시 4개로 축소 옵션).
- 글로우 div 는 `pointer-events:none` 필수.
- `will-change` 명시 X — framer-motion 이 자동 부여.

---

## 8. 데이터 / Props / Phase 상태 계약 (Page 8)

### 8.1 ConversationPhaseV2 (참조용, 변경 없음)
```ts
type ConversationPhaseV2 =
  | 'HOOK' | 'MIRROR' | 'BRIDGE' | 'SOLVE' | 'EMPOWER'      // 상담 5단계
  | 'GREET' | 'CATCHUP' | 'BANTER' | 'LINGER' | 'FAREWELL'  // 일상 5단계 (v116)
  | 'DAILY_CHAT';                                            // legacy alias
```

### 8.2 PhaseConfig 신규 객체 (내부 사용)
```ts
interface PhaseConfig {
  id: ConversationPhaseV2;
  label: string;
  fallbackThinking: string;
  Icon: React.FC<{active:boolean; past:boolean}>;
  color: { primary: string; secondary: string; glow: string };
  spriteSpeed: 'slow' | 'normal' | 'fast';
}
```
LUNA_PHASES: `PhaseConfig[]` 5개 / TAROT_PHASES: `PhaseConfig[]` 4개.

### 8.3 currentPhase null / 미지원 값 처리
- `currentPhase === null` → 컴포넌트 return null (현 동작 유지).
- `currentPhase` 가 상담 5단계가 아니고 일상 5단계도 아니고 DAILY_CHAT 도 아닌 경우 → **HOOK** 으로 fallback (방어 코드).

### 8.4 persona 처리
- `persona === 'tarot'` → TAROT_PHASES 사용, sprite 대신 SVG CatEarIcon, 단계 컬러는 보라톤.
- `persona === 'luna'` (기본) → LUNA_PHASES + luna_sprite_setting_1.

### 8.5 lunaThinking 우선순위
1. `lunaThinking` (LLM 라이브 응답) 가 있으면 그걸 표시
2. 없으면 `activePhaseConfig.fallbackThinking`
3. 단, 두 case 모두 typewriter 효과 거침.

---

## 9. 구현 단계 — 바이브 코딩 체크리스트 (Page 9)

> AI 에게 그대로 던질 수 있도록 **파일 경로 + 동작 + 검증** 3단 구조로 작성.

### 9.1 Step A — 준비
- [ ] [PhaseProgress.tsx](../src/components/chat/events/PhaseProgress.tsx) 백업 (`git status` 로 변경 전 상태 인지).
- [ ] [LunaSprite.tsx](../src/components/common/LunaSprite.tsx) 의 `preset="setting"` (7×7) 가 살아있는지 확인.
- [ ] `useReducedMotion` 가 framer-motion 에서 export 되는 버전인지 확인 (>= 10.x ✓).

### 9.2 Step B — 신규 서브컴포넌트 작성
- [ ] `LiveLunaMedallion` 함수 컴포넌트 작성 (PhaseProgress.tsx 내부 모듈 스코프).
  - props: `{persona, glow, size?, ringColor, spriteSpeed}`.
  - body: 외곽 motion.div(글로우) + relative div(메달리온) → 내부에 LunaSprite(luna) 또는 CatEarIcon(tarot) + 우상단 motion.svg 하트.
- [ ] `StepperRow` 함수 컴포넌트 작성.
  - props: `{steps, currentIndex, totalPercent, persona}`.
  - body: 현 코드의 5-step stepper 마크업을 그대로 옮기되 라벨 size 10.5px 로 상향, dot 외곽 ring path drawing 유지.
- [ ] `StatusCaption` 함수 컴포넌트 작성.
  - props: `{text, color, persona}`.
  - body: 떠다니는 꽃잎 6장 + 타이핑 캐럿 + Nanum Pen Script.

### 9.3 Step C — 신규 entry `ConsultStepperTrack` 작성
- [ ] entry: `(currentPhase, idx, totalPercent, lunaThinking, persona)` 받음.
- [ ] 위 3개 서브컴포넌트 조합:
  ```tsx
  <div className="sticky top-[60px] z-10 …">
    <div className="h-[1px] gradient-line" />
    <div className="bg-…/90 backdrop-blur-xl px-3 pt-2.5 pb-3 border-b shadow">
      <div className="flex items-center gap-3">
        <LiveLunaMedallion …/>
        <div className="flex-1 min-w-0">
          <StepperRow …/>
        </div>
      </div>
      <StatusCaption …/>
    </div>
  </div>
  ```
- [ ] 위/아래 padding 합산 높이 ≤ 110px 확인.

### 9.4 Step D — 메인 entry 라우팅 단순화
- [ ] 기존 `if (currentPhase === 'HOOK') return <BranchedTrack/>` 를 **제거**.
- [ ] 일상 5-phase 분기 (`GREET|CATCHUP|BANTER|LINGER|FAREWELL`) 와 `DAILY_CHAT` 분기는 그대로 유지.
- [ ] 나머지 모든 상담 단계는 `<ConsultStepperTrack/>` 로 라우팅.
- [ ] `BranchedTrack` 함수는 즉시 삭제 (dead code 금지).

### 9.5 Step E — Phase config 테이블 작성
- [ ] LUNA_PHASES 배열을 `PhaseConfig` 형으로 재정의 (위 8.2 + 5.2 + 4.4 표 참조).
- [ ] TAROT_PHASES 도 동일하게 (4개).
- [ ] 색상은 모두 인라인 hex 로. 새 tailwind 토큰 추가하지 말 것.

### 9.6 Step F — 마이크로 인터랙션
- [ ] 7.1 표의 모든 variant 를 `motion.div` / `motion.svg` 에 정확히 입힘.
- [ ] `useReducedMotion` 결과 분기 추가.
- [ ] 단계 변경 시 메달리온 bump 위해 `currentPhase` 를 `key` 로 motion.div 에 넘김.

### 9.7 Step G — QA & 회귀 점검
- [ ] `pnpm tsc --noEmit` 통과 (또는 `npx tsc`).
- [ ] 데모 모드로 5단계 순차 진행: HOOK → MIRROR → BRIDGE → SOLVE → EMPOWER.
- [ ] 타로 모드 동일 검증.
- [ ] 일상 5-phase 미회귀.
- [ ] sticky 동작 (스크롤 시 상단 고정) 보존.
- [ ] 모바일 360 폭 라벨 줄바꿈 없음.
- [ ] reduce-motion 모드에서 정지 화면 OK.

### 9.8 Step H — 마무리
- [ ] 메모리에 v118 진입 ([memory/project_love_ai_v118_phase_progress.md](../../../.claude/projects/.../memory/project_love_ai_v118_phase_progress.md)) 기록.
- [ ] 본 plan md 의 9.x 체크박스 다 채워서 PR/diff 에 첨부.

---

## 10. QA · Edge case · 회귀 점검 (Page 10)

### 10.1 시각 회귀 체크리스트
| # | 시나리오 | 기대 | 실측 |
|---|---|---|---|
| 1 | persona=luna · currentPhase=HOOK · lunaThinking 없음 | 좌측 라이브 루나 + 5단계 stepper(첫 dot active) + "조용히 듣고 있어 🦊" | ☐ |
| 2 | persona=luna · currentPhase=BRIDGE · lunaThinking="작전 짜는 중!" | 메달리온 오렌지 글로우 + 3번째 dot ring drawing + "작전 짜는 중!" typewriter | ☐ |
| 3 | persona=luna · currentPhase=EMPOWER · understandingLevel=100 | 진행바 100%, 5번째 dot 강조, 별 컬러 | ☐ |
| 4 | persona=tarot · currentPhase=HOOK | sprite 대신 SVG CatEar, 보라 글로우 | ☐ |
| 5 | persona=luna · currentPhase=GREET | CasualPhaseTrack 유지 (v116 미회귀) | ☐ |
| 6 | currentPhase=null | 컴포넌트 미렌더 | ☐ |
| 7 | currentPhase=UNKNOWN_XYZ | HOOK 으로 fallback (방어) | ☐ |

### 10.2 모션 / 성능
- [ ] iPhone 12 mini Safari: 60fps 유지 (메달리온 + 6 꽃잎 + 글로우 동시).
- [ ] Android 저사양 (Galaxy A14): 45fps 이상.
- [ ] reduce-motion 시 모든 무한 모션 정지.
- [ ] sprite 가 화면 밖으로 스크롤되면 자동 paused (IntersectionObserver 기존 로직).
- [ ] 다른 탭 전환 시 paused.

### 10.3 접근성
- [ ] 컬러 대비: 활성 라벨 텍스트 #be185d on #fff7fb → AA 통과.
- [ ] aria-live="polite" 를 상태 카피 영역에 부여 → 스크린리더가 단계 변화 읽음.
- [ ] 메달리온에 `role="img" aria-label="상담사 루나"` 추가.
- [ ] stepper 전체에 `role="progressbar" aria-valuemin=0 aria-valuemax=5 aria-valuenow={idx+1}`.

### 10.4 i18n / 다국어 대비 (참고)
- 모든 라벨/카피는 한국어 하드코딩. 향후 i18n 도입 시 `t('phase.HOOK.label')` 식으로 교체할 수 있도록 텍스트를 단일 객체에 모아둠 (LUNA_PHASES.label).

### 10.5 알려진 리스크 & 미해결 항목
1. **luna_sprite_setting_1.webp 단계별 row 슬라이싱** 은 본 v118 MVP 에서는 단일 풀 루프로 둠. 추후 v118.1 에서 단계별 row subset 도입.
2. **타로냥 전용 sprite 부재** — 본 작업에서는 SVG 유지. 향후 디자이너에게 의뢰.
3. **5단계 외 phase (`DAILY_CHAT` legacy)** 는 BANTER 로 alias. v120 에서 deprecate 예정.
4. **lunaThinking 빈 문자열 vs undefined** — fallback 로직이 `||` 사용해서 빈 문자열도 fallback 으로 떨어짐. 의도된 동작. 그대로 둠.

### 10.6 롤백 플랜
- 본 PR 1개로 묶어 PhaseProgress.tsx 만 수정. 회귀 시 즉시 revert 가능.
- ChatContainer 의 호출부 무수정 → revert 영향 범위 0.

### 10.7 성공 지표 (v118 release 후 1주 측정)
- HOOK 30초 이탈률: -10%p 이상 감소.
- 평균 세션 단계 도달: BRIDGE → SOLVE 전환율 +5%p.
- "어디까지 왔는지 모르겠다" 류 CS 문의 0건.

---

## 부록 A — 빠른 참조 한 장 (Cheat Sheet)

```ts
// 단계 컬러 한 줄
const C = {
  HOOK:    { p:'#fb7185', s:'#fbcfe8', g:'rgba(251,113,133,.45)' },
  MIRROR:  { p:'#a855f7', s:'#e9d5ff', g:'rgba(168,85,247,.42)' },
  BRIDGE:  { p:'#f97316', s:'#fed7aa', g:'rgba(249,115,22,.45)' },
  SOLVE:   { p:'#22c55e', s:'#bbf7d0', g:'rgba(34,197,94,.40)'  },
  EMPOWER: { p:'#eab308', s:'#fef08a', g:'rgba(234,179,8,.45)'  },
};
```

```tsx
// 메달리온 한 줄 사용
<LiveLunaMedallion persona={persona} glow={C[currentPhase].g} ringColor={C[currentPhase].p} />
```

```tsx
// 라우팅 한 줄
return <ConsultStepperTrack currentPhase={currentPhase} idx={idx} totalPercent={totalPercent}
                            lunaThinking={lunaThinking} persona={persona} />;
```

---

**끝.** v118 plan 끝나면 v118.1 (sprite row 슬라이싱) 로 자연스럽게 확장 가능. 본 plan 의 모든 체크박스를 다 채우면 1-shot 구현 가능.
