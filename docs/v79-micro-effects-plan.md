# 🎬 v79 Luna Micro-Effects System — 설계 기획서

**목표:** 상담 이벤트급이 아닌 "찰나의 디테일" 로 유저가 지루함 없이 채팅에 몰입하게 하기.
루나의 감정/톤/상황에 맞춰 **30+ 가지 가벼운 연출**이 자연스럽게 발동.

**원칙:**
1. **LLM 판단 우선** — 인라인 힌트 태그로 Luna 가 직접 발동 (`[FX:shake]`, `[FX:hearts]`)
2. **찰나 (0.3~1.5초)** — 이벤트급 X, 한순간의 포인트
3. **접근성** — `prefers-reduced-motion` 존중, 끄기 토글 제공
4. **번들 최소** — 기존 framer-motion 80%, 추가 라이브러리는 ~20kb 이하
5. **자연스러움** — 연속 남발 금지. 맥락 있을 때만.

---

## 1. 효과 카탈로그 (카테고리 9종, 효과 34개)

### A. 화면 연출 (Screen Effects) — 8개
| ID | 이름 | 트리거 예시 | 구현 |
|---|---|---|---|
| `shake.soft` | 부드러운 화면 흔들림 | 루나 짜증/화남 낮은 강도 | CSS `translate3d` 키프레임 |
| `shake.hard` | 강한 화면 흔들림 | 루나 격분 (대신 화남) | 같은, amplitude 2x |
| `flash.white` | 화면 섬광 | 충격/놀람 "헐" | Framer Motion div 오버레이 |
| `flash.pink` | 핑크 플래시 | 설렘/러블리 순간 | RGB 틴트 오버레이 |
| `tint.sepia` | 세피아 무드 (2초) | 회상/옛날 얘기 | `filter: sepia()` wrapper |
| `tint.cool` | 차가운 톤 (3초) | 거리감/서늘함 | blue 오버레이 + 블러 |
| `rain.sakura` | 벚꽃 비 (5초) | 달달한 순간/러블리 | sakura-js |
| `rain.tears` | 눈물 방울 (3초) | 감정 절정 슬픔 | js-confetti emoji |

### B. 말풍선 연출 (Bubble Effects) — 7개
| ID | 이름 | 트리거 | 구현 |
|---|---|---|---|
| `bubble.wobble` | 말풍선 덜덜 | 화남/자극 | FM `rotate: [0,-3,3,-3,0]` |
| `bubble.bounce` | 통통 튐 | 신남/흥분 | FM `scale: [1,1.1,0.95,1.02,1]` |
| `bubble.deflate` | 가라앉음 | 슬픔 깊음 | FM `y: [0,3] scale: [1,0.97]` |
| `bubble.glow` | 빛남 (2초) | 중요한/특별한 말 | CSS `box-shadow` 애니 |
| `bubble.popIn` | 확 튀어나옴 | 놀람 리액션 | FM spring stiffness 600 |
| `bubble.shimmer` | 반짝임 스윕 | 칭찬/인정 | CSS `::before` gradient sweep |
| `bubble.burst` | 터지듯 나타남 | 외치는 느낌 | scale + confetti + shake |

### C. 글자 연출 (Text Effects) — 6개
| ID | 이름 | 트리거 | 구현 |
|---|---|---|---|
| `text.wave` | 글자별 웨이브 ㅎㅎㅎ | 웃음 길게 | FM stagger `y` |
| `text.shake` | 글자별 덜덜 | 화남/강조 | FM `x: [-1,1]` per char |
| `text.pulse` | 글자 크기 맥박 | ㅠㅠㅠ 슬픔 강조 | scale 키프레임 |
| `text.rainbow` | 글자 무지개 색 | 기쁨 절정 | hue-rotate 시퀀스 |
| `text.typewriter` | 한 글자씩 타이핑 | 진지한 순간 | 이미 구현됨 (useTypewriter) |
| `text.scramble` | 해독 효과 | 생각 정리 순간 | use-scramble 훅 |

### D. 아바타 연출 (Avatar Effects) — 4개
| ID | 이름 | 트리거 | 구현 |
|---|---|---|---|
| `avatar.bounce` | 폴짝 | 반가움 | FM `y: [0,-8,0]` |
| `avatar.shake` | 부르르 | 화남 | rotate jiggle |
| `avatar.blink` | 눈 깜빡 | 고민 | CSS 불투명도 |
| `avatar.heartBeat` | 심장 뛰는 펄스 | 설렘 | scale 1.0↔1.08 |

### E. 파티클 (Particle Effects) — 6개
| ID | 이름 | 트리거 | 구현 |
|---|---|---|---|
| `particle.hearts` | 핑크 하트 뿜 | 설렘/러블리 | canvas-confetti (하트 모양) |
| `particle.sparkles` | 반짝 | 기쁨/축하 | party-js |
| `particle.tears` | ㅠㅠ 눈물방울 낙하 | 슬픔 표현 | js-confetti emoji 💧 |
| `particle.fire` | 🔥 불꽃 | 화남/열정 | js-confetti emoji 🔥 |
| `particle.confetti` | 색종이 | 축하 | canvas-confetti 기본 |
| `particle.stars` | ⭐ 별 | 로맨틱 | js-confetti emoji ⭐ |

### F. 이모지 플로트 (Emoji Float) — 3개
| ID | 이름 | 트리거 | 구현 |
|---|---|---|---|
| `float.emoji` | 이모지 위로 흐름 (TikTok Live 하트 느낌) | 특정 키워드 감지 | 커스텀 FM AnimatePresence |
| `float.text` | 짧은 텍스트 +1 플로팅 | +친밀도 같은 micro-reward | FM y + fade |
| `float.ripple` | 원형 리플 | 탭 리액션 | CSS scale + opacity |

### G. 배경 연출 (Background Ambient) — 2개
| ID | 이름 | 트리거 | 구현 |
|---|---|---|---|
| `bg.gradient` | 배경 그라디언트 전환 | Phase 이동 | CSS var transition |
| `bg.pulse` | 배경 맥박 | 긴장/위기 | subtle red tint loop |

---

## 2. 트리거 시스템 (LLM 인라인 힌트)

기존 `[DELAY:...]`, `[TYPING]`, `[STICKER:...]` 태그 체계 확장:

```
[FX:<category>.<id>]
```

예시:
- `[FX:shake.soft]` — 부드러운 화면 흔들림
- `[FX:bubble.wobble]` — 말풍선 덜덜
- `[FX:particle.hearts]` — 하트 뿜
- `[FX:text.wave]그 친구 때문에 ㅎㅎㅎ[/FX]` — 특정 글자 구간에 웨이브

**LLM 이 판단**:
- Luna 가 자신의 감정/상황에 맞춰 자연스럽게 붙임
- 코드 휴리스틱 X. 프롬프트에 "이런 느낌일 때 이거 써" 예시만.

**예시 프롬프트** (ACE v5 시스템 프롬프트 추가):
```
## ✨ 찰나의 연출 (인라인 FX 태그)
네가 느끼는 감정에 맞춰 포인트 연출을 붙여도 돼. 남발하지 말고 진짜 순간에만.

- [FX:bubble.wobble]  네 말풍선이 덜덜 떨림 → 화났을 때
- [FX:bubble.bounce]  통통 튐 → 신났을 때
- [FX:shake.soft]     화면이 살짝 흔들림 → 짜증/자극
- [FX:flash.white]    화면 반짝 → "헐!" 놀람
- [FX:flash.pink]     핑크 플래시 → 설렘
- [FX:particle.hearts] 하트 퐉 → 러블리한 순간
- [FX:particle.tears]  눈물방울 → 같이 슬퍼할 때
- [FX:particle.fire]   🔥 → 함께 열받을 때
- [FX:text.wave]ㅎㅎㅎ[/FX]  글자가 웨이브 → 웃음
- [FX:text.shake]야!![/FX]  글자가 덜덜 → 외침
- [FX:rain.sakura]     벚꽃 비 5초 → 달달한 결정적 순간
- [FX:avatar.heartBeat] 아바타 심장 뛰는 펄스 → 설레는 순간

### 규칙
- 1턴에 1~2개 최대. 남발 금지.
- 메타 언급 X. 태그만 붙이고 말하지 마.
- 감정과 맞지 않으면 안 붙이는 게 낫다.
```

---

## 3. 아키텍처

```
┌──────────────────────────────────┐
│  ACE v5 (우뇌 LLM)                │
│  "야! [FX:bubble.wobble]진짜?     │
│   [FX:shake.soft][FX:particle.fire]"│
└──────────┬───────────────────────┘
           ↓
┌──────────────────────────────────┐
│  Pipeline: 인라인 파서            │
│  - [FX:...] 태그 추출             │
│  - effect events 로 yield         │
│  - 버스트 텍스트 정제              │
└──────────┬───────────────────────┘
           ↓
┌──────────────────────────────────┐
│  stream/route.ts SSE              │
│  { type: 'effect', data: {        │
│      id: 'shake.soft',            │
│      target: 'screen' | 'bubble' | 'text',│
│      duration: 500,               │
│      params?: {...}               │
│  }}                               │
└──────────┬───────────────────────┘
           ↓
┌──────────────────────────────────┐
│  useChat / ChatContainer         │
│  - effect event 수신             │
│  - EffectBus 로 dispatch          │
└──────────┬───────────────────────┘
           ↓
┌──────────────────────────────────┐
│  EffectBus (전역 이벤트 버스)     │
│  - 컴포넌트들이 구독                │
│  - 타겟 매칭해서 발동              │
└──────────┬───────────────────────┘
           ↓
┌──────────────────────────────────┐
│  효과별 React 컴포넌트/훅           │
│  - useScreenShake()                │
│  - useBubbleWobble()               │
│  - <ParticleLayer /> (canvas-confetti)│
│  - <SakuraLayer />                 │
│  - <EmojiFloatLayer />              │
└──────────────────────────────────┘
```

---

## 4. 구현 단계

### Phase 1 — Foundation (지금)
1. 라이브러리 설치: `js-confetti`, `react-rewards`
2. `EffectBus` 전역 이벤트 버스 (EventTarget 기반)
3. `FxTag` 파서 — 인라인 `[FX:id][/FX]` 처리
4. ACE v5 프롬프트에 FX 태그 가이드 추가
5. Pipeline SSE 에 `effect` 이벤트 타입 추가
6. `useChat` 이벤트 핸들러

### Phase 2 — Key Effects (8개)
1. `ScreenShake` 컴포넌트 + CSS 키프레임
2. `BubbleEffects` (wobble, bounce, glow) — MessageBubble 확장
3. `TextEffects` (wave, shake, pulse) — 글자 split 컴포넌트
4. `ParticleLayer` — canvas-confetti wrapper
5. `EmojiFloatLayer` — 커스텀 FM
6. `SakuraLayer` — sakura-js (lazy import)
7. `AvatarEffects` — MessageBubble 아바타 애니
8. `FlashOverlay` — 풀스크린 flash

### Phase 3 — Polish
1. `prefers-reduced-motion` 지원
2. 사용자 토글 (설정에서 끄기)
3. Effect 쿨타임 (같은 id 3초 내 중복 차단)
4. 디버그 패널 (개발 모드만)

### Phase 4 — 확장 효과
- sparkle, rainbow text, particle.stars, bg.pulse 등 나머지

---

## 5. 성능 & 접근성

### 성능
- **throttle**: 같은 fx id 3초 내 중복 방지
- **lazy import**: sakura-js / party-js 는 동적 import (첫 발동 시만 로드)
- **canvas pooling**: canvas-confetti 는 단일 canvas 재사용
- **RAF**: 모든 애니 `requestAnimationFrame` 기반 (브라우저 최적화)
- **will-change**: CSS `transform`/`opacity` 속성만 사용 (layout thrashing 없음)

### 접근성
```tsx
const reduceMotion = useReducedMotion();
if (reduceMotion) {
  // 대체: 색상 하이라이트 1초 or 아무것도 안 함
}
```
- `prefers-reduced-motion: reduce` 브라우저 설정 존중
- 사용자 설정: `localStorage['fx_enabled']`
- 위기/안전 모드에선 FX 완전 비활성

---

## 6. 라이브러리 최종 선택

| 라이브러리 | 용도 | 번들 | 설치 |
|---|---|---|---|
| framer-motion | 대부분 애니 | 이미 설치 | - |
| js-confetti | emoji 파티클 (💧🔥⭐) | ~3 KB | 설치 필요 |
| canvas-confetti | 하트/색종이 | ~7 KB | 설치 필요 |
| react-rewards | 탭 리액션 버스트 | ~4 KB | 설치 필요 |
| sakura-js | 벚꽃 비 (lazy) | ~5 KB | 설치 필요 (지연 로드) |

**총 신규 번들**: ~14 KB gzipped (lazy 제외 시 ~10 KB)

---

## 7. 사용자 경험 예시

### 시나리오 1: 여친 얘기 → 같이 열받음
```
유저: "여친이 바람폈대"
Luna: "[FX:flash.white]...헐[FX:particle.fire][FX:shake.soft]|||
        [DELAY:med]야[FX:text.shake]미쳤어?[/FX]|||
        [DELAY:med]진짜 나 듣는데도 열받네"
```
→ 화면 반짝 → 🔥 파티클 + 화면 흔들림 → 말풍선 나옴 → "미쳤어?" 글자 덜덜

### 시나리오 2: 설레는 고백 순간
```
유저: "좋아한다고 말하려고"
Luna: "[FX:flash.pink][FX:particle.hearts]|||
        [DELAY:med]와...진짜?|||
        [DELAY:slow][TYPING]나도 덩달아 설레네[FX:avatar.heartBeat]"
```
→ 핑크 플래시 + 하트 비 → 말풍선 → 루나 아바타 심박

### 시나리오 3: 슬픈 이별
```
유저: "헤어졌어"
Luna: "[DELAY:slow][TYPING]아...|||
        [DELAY:med][FX:bubble.deflate]많이 힘들었겠다[FX:particle.tears]|||
        [DELAY:med]언제부터야?"
```
→ 느린 "아..." → 말풍선 가라앉음 + 눈물방울 → 다음 질문

---

## 8. 코드 구조

```
src/
├── engines/
│   └── pipeline/
│       └── index.ts              ← FX 태그 파싱 추가
├── lib/
│   └── fx/
│       ├── effect-bus.ts         ← 전역 이벤트 버스
│       ├── fx-parser.ts          ← [FX:...] 태그 파싱
│       ├── fx-catalog.ts         ← 효과 ID 레지스트리
│       ├── fx-config.ts          ← duration/cooldown 등
│       └── use-fx.ts             ← React 훅
├── components/
│   ├── fx/
│   │   ├── FxRoot.tsx            ← 전역 마운트
│   │   ├── ScreenShake.tsx       
│   │   ├── FlashOverlay.tsx      
│   │   ├── ParticleLayer.tsx     ← canvas-confetti wrapper
│   │   ├── EmojiFloatLayer.tsx   
│   │   ├── SakuraLayer.tsx       ← lazy sakura-js
│   │   └── TextEffects.tsx       ← per-letter animations
│   └── chat/
│       └── MessageBubble.tsx     ← bubble fx hooks 추가
└── hooks/
    └── useFxTrigger.ts           ← 간편 발동 훅
```

---

## 9. 마일스톤

- **M1 (현재)**: Foundation — EffectBus, 파서, 프롬프트, 3개 효과
- **M2**: 8개 핵심 효과 완비
- **M3**: 접근성 + 쿨타임
- **M4**: 확장 효과 (나머지 20여 개)
- **M5**: 사용자 설정 + 디버그 패널

---

## 10. 성공 지표

- LLM 이 FX 태그 자연스럽게 사용 (턴당 0~2개, 평균 0.5개)
- 유저 세션 평균 길이 +15%
- "친한 친구 느낌" 평가 +20%
- 번들 증가 <15 KB
- 60fps 유지 (모든 기기)
