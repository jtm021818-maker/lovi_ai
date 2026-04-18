# 💬 v82 Chat-Native Modes — 설계 기획서

> "거부감 없이, Luna 랑 같이 짠다는 느낌으로" — 오버레이 제거하고 채팅 흐름 안에서 모드 경험

**총 분량:** A4 10장 / ~5,500 words
**기반 버전:** v81 (5개 모드 구조 유지, UI 전면 리디자인)

---

## Part 1 — 문제 진단

### 1.1 v81 의 거부감 원인

**증상**: 모드 선택 시 풀스크린 오버레이 (Portal) 로 전환 → 유저가 "앱이 다른 화면으로 튕김" 느낌 → 몰입 끊김 + 작위적.

**구체적 문제**:
1. **공간 단절** — 채팅은 친근한 카톡인데 모드는 앱 안의 또 다른 앱
2. **Luna 가 사라짐** — 모드 화면에선 Luna 가 "보조 UI" 일 뿐, 대화 상대가 아님
3. **X 버튼 논란** — 나가는 건지 완료하는 건지 불명확, 종료 시 Phase 가 어디로 가는지 예측 불가
4. **동의 없는 모달** — 갑자기 화면 전체가 덮이면 "명령받은 느낌"

### 1.2 유저 요구 (원문 정제)

> "채팅느낌으로 최대한 메시지 초안 짜기면 문자를 보낸것처럼 3개 보낸느낌인데 여기서 괜찮은거 선택을 뭔가 할수있는 느낌이거나 대화하듯 자연스럽게 전환되게하자. 롤플레이모드는 루나(여친) 등 이름이 바뀌고 채팅에서 지금 롤플레이모드처럼 좀 되는정도. 채팅에서 좀더 진화한 느낌으로. 루나랑 대화하면서 같이 전략짜는느낌이었으면좋겠어. 언니,누나 냄새나고 얘기하면서도 즐겁게..! 루나와 함께한다는 느낌."

### 1.3 재해석된 설계 원칙

**원칙 1 — 모드는 채팅의 "대화 전환" 이지 화면 전환 아님**
Luna 가 "야 내가 3개 써봤어" 라고 카톡 보낸 것처럼. 유저는 그냥 답장하거나 고르면 됨.

**원칙 2 — Luna 는 항상 대화 주체**
모드 UI 가 아닌 Luna 의 메시지/행동으로 프레임.

**원칙 3 — 진화하지만 다른 공간으로 가지 않음**
배경 살짝 틴트, Luna 이름 변경, 타이핑 인디케이터 변화 — 시각적 진화는 OK. 완전 전환 X.

**원칙 4 — "같이" 의 느낌**
각 선택/수정이 Luna 가 "오 그거 좋지!" 반응하는 형태로.

**원칙 5 — 경량 FX 로 재미 증폭**
햅틱, ripple, stagger — 진지함보다 놀이 느낌.

---

## Part 2 — 아키텍처 변경

### 2.1 v81 (Before)

```
ChatContainer
  ├── Chat messages (normal flow)
  ├── ModeSelector (inline card on LUNA_STRATEGY event)
  └── [Portal Overlay] ModeFrame > ToneMode/DraftMode/etc
       ├── 풀스크린 backdrop blur
       ├── X 버튼
       └── Mode-specific UI
```

### 2.2 v82 (After)

```
ChatContainer
  ├── Chat messages
  │    ├── Luna 일반 말풍선
  │    ├── Luna 모드 말풍선 (특수 타입)
  │    │    ├── "야 3개 써봤어" 오프닝 멘트
  │    │    ├── Draft bubble A 💐
  │    │    ├── Draft bubble B 🔍
  │    │    ├── Draft bubble C 🔥
  │    │    └── Luna 클로징 멘트 (선택 후)
  │    └── Role 전환: Luna 이름 → "루나(여친)"
  └── 없음 (포털 오버레이 전부 제거)
```

**핵심 변화**:
- ModeFrame → 제거. 전부 인라인.
- 각 모드는 채팅 안에서 Luna 가 "보낸" 메시지로 렌더.
- ChatContainer 의 채팅 영역에 **ambient background tint** 만 조건부로 추가 (롤플레이 시 rose).

### 2.3 데이터 흐름 (유지)

Mode Store (Zustand) + API 엔드포인트는 그대로:
- 유저가 `ModeSelector` 에서 선택 → `modeStore.enter()` → 해당 모드 API 호출 → 응답을 modeState 에 저장
- 렌더링만 **Inline** 으로 변경
- 완료 액션 → `onComplete` → `bridgeCompleted: true` 로 채팅 전송 → Pipeline 이 SOLVE 강제 전환

### 2.4 컴포넌트 재설계

**기존**:
```
ModeFrame (Portal + backdrop)
└── ToneMode / DraftMode / PanelMode / IdeaMode / RoleplayMode
    (각자 ModeFrame 을 자식으로 포함)
```

**신규**:
```
<ChatInlineMode>
  (ChatContainer 가 활성 모드 있을 때 채팅 스크롤 영역의 마지막 위치에 렌더)
  └── 해당 모드 컴포넌트 (ToneMode/DraftMode/etc)
      └── 각자 Luna 말풍선 + 인터랙티브 버블로 조립
```

---

## Part 3 — 각 모드 재디자인

### 3.1 🎨 TONE SELECT (톤 정하기)

**기존**: 풀스크린 모달 + 3 카드 + 확정 버튼

**신규 (채팅 네이티브)**:
```
[Luna] 💬  야 같은 말 톤별로 3개 써봤어
[Luna] 💐  "어제 내가 좀 심했지 ㅠㅠ..." (intensity bar)
              [이걸로] [음...좀 다르게]
[Luna] 🔍  "솔직히 내가 찔려서 그랬어..."
              [이걸로] [음...좀 다르게]
[Luna] 🔥  "어제 내 반응 잘못했어..."
              [이걸로] [음...좀 다르게]

(유저 선택 후)
[Luna]     오 💐 부드러운 거로 갈까 — 어떻게 생각해?
```

**FX**:
- 각 톤 버블 등장 시 0.2초 stagger (AutoAnimate)
- 버튼 탭 시 ripple + 햅틱 `success` (Android)
- 선택 시 해당 버블 glow (box-shadow), 나머지 opacity 0.4

### 3.2 ✏️ DRAFT WORKSHOP (메시지 초안)

**신규**:
```
[Luna]     야 내가 3개 써봤어 ㅎㅎ
           어떤 게 제일 맘에 와?
[Luna 💐]  (부드럽게 버블) — 내용
             [이걸로 보낼게] [조금 고칠래]
[Luna 🔍]  (솔직하게 버블) — 내용
             [이걸로] [고칠래]
[Luna 🔥]  (단호하게 버블) — 내용
             [이걸로] [고칠래]

(선택 후)
[Luna]     오 그거 좋지 🔥  (canvas-confetti micro-burst)
           초안함에 저장해뒀어
```

**편집 모드**:
- "조금 고칠래" 클릭 → 해당 버블이 textarea 로 morphing (Framer Motion `layoutId`)
- 저장 → 다시 버블로 돌아감
- 저장 시 Luna "오 이쪽이 더 낫네!" 멘트

**반응 시뮬**:
- 선택 버블 아래에 "👀 상대 반응 예상" 버튼
- 클릭 시 상대 아바타 + 말풍선 3개 예상 반응 (positive/neutral/negative) — 3개 stagger 등장

**FX**:
- 톤별 색조 유지 (soft: 블루 / honest: 앰버 / firm: 레드)
- 편집 저장 시 shimmer 효과
- 완료 시 canvas-confetti (20개, 아래에서 위로)

### 3.3 👥 PANEL REPORT (다른 시선)

**신규**:
```
[Luna]     야 이건 나 혼자 말고 다른 시선도 있어야겠다
           3명한테 물어봤어 ㅎㅎ

[👩 언니]  (언니 아바타 + 언니 톤) — 의견
             [공감💙] [들어볼래🤔] [아니야🙅]
[🧑‍💼 친구]   (친구 아바타) — 의견
             [공감] [들어볼래] [아니야]
[😎 선배]  (선배 아바타) — 의견
             [공감] [들어볼래] [아니야]

(공감 선택 후)
[Luna]     오 언니 말이 와닿았구나
           언니한테 더 물어볼 거 있어?

(선택 페르소나로 2-3턴 대화 — 기존 deepen 흐름 인라인화)

[Luna]     자 이제 다시 나랑 전략 짤 준비 됐지?
             [응, 가자] 
```

**핵심**: 3 페르소나가 **각자 다른 Luna** 처럼 채팅에 말풍선. 아바타/이름 다름.

**FX**:
- 각 페르소나 아바타 bounce-in
- 반응 버튼 tap 시 아바타 반응 (공감→hearted glow, 거부→grey out)
- 공감 선택된 페르소나의 말풍선 계속 "말하는 중" 상태 유지

### 3.4 💡 IDEA REFINE (아이디어 다듬기)

**신규**:
```
[Luna]     네 아이디어 들어볼게 — 뭐든 써봐
[User]     (입력) "이번 주말에 같이 영화보자고 카톡 보낼까?"
[Luna]     오케이 내가 한번 다듬어볼게 (typing...)
[Luna]     💭  "요즘 그 영화 재밌는 거 있지. 토요일 어때?"
            
            (diff 인라인 하이라이트)
            💡 이유: 구체 제안 + 선택 여지
            💡 이유: 전화 여부는 분리 이슈

            [네 원본 유지] [내꺼로] [섞어서 편집]

(선택 후)
[Luna]     💗 이걸로 가자
```

**FX**:
- 다듬은 버블 등장 시 "pulse" 애니 (Luna 가 "생각해냈다" 느낌)
- diff highlight 는 이미 jsdiff 기반으로 녹색/빨강 인라인
- 편집 모드 전환 시 layoutId morph

### 3.5 🎭 ROLEPLAY (역할극) — 가장 큰 변화

**기존**: 풀스크린 VN, 배경/스프라이트 

**신규 (채팅 진화)**:
```
[Luna]     🎬  자, 내가 여친 역할 해볼게
           준비됐어?  [준비됐어]

(준비됐어 선택 → 채팅 배경 rose tint + Luna 이름 morph)

[루나(여친)]  ...  (typing: 1초 지연)
[루나(여친)]  왔네... (시크)
              [아바타에 작은 뱃지 "여친"]

(Luna 이름 태그 위에 narration 등장)
_카페 안. 여친이 팔짱끼고 앉아있다._

[Quick Replies (아래에 노출)]:
    [A "미안 내가 선 넘었어"]
    [B "뭘 그렇게 예민해"]
    [C 직접 쓰기]

[User]     미안 내가 선 넘었어
[루나(여친)]  그래서 뭘 잘못한 건데?
            _커피잔을 내려놓으며_

...

(3턴마다 Luna 코치 바닥 팝업)
┌─ 🦊 루나 코치 ─────────────┐
│ 방금 그 말 진짜 좋았어!    │
│ 구체적으로 짚으니까...    │
└──────────────────────────┘

(마무리)
[루나(여친)]  ...그래, 너도 그렇게 느꼈구나
[Luna]     (원래 이름으로 복귀, rose tint 사라짐)
           야 잘했어! 이 느낌으로 진짜 여친한테 가봐
           [완료] → SOLVE 로
```

**핵심 변화**:
- **이름 morph**: "루나" → "루나(여친)" → "루나" — Framer `layoutId` 로 부드럽게
- **배경 ambient tint**: 채팅 전체 배경에 `rose-50/30 mix-blend-multiply` 500ms fade in/out
- **아바타 뱃지**: Luna 아바타 우하단에 작은 원형 뱃지 ("여친", "전 남친" 등)
- **Narration 인라인**: Luna 말풍선 위/아래에 italic 회색 텍스트 (`_커피잔 만지며_`)
- **Quick replies**: 말풍선 아래에 chip 형태로 노출 (A/B/C)
- **코치 팝업**: 하단에서 슬라이드업, 5초 후 자동 사라짐

**FX**:
- 이름 morph 시 tiny shimmer
- NPC 말풍선 등장 시 spriteFrame 감정 따라:
  - 화남 → shake.soft (bubble wobble)
  - 놀람 → flash.white
  - 슬픔 → particle.tears
- BGM 유지 (howler.js, 시나리오 기반)

---

## Part 4 — 공통 UI 재설계

### 4.1 ModeSelector (인라인 카드)

**유지**. 채팅 안에 BRIDGE 진입 시 카드로 표시.

개선:
- 모드 버튼 클릭 시 `ripple` (react-ripples 또는 CSS pseudo-element)
- 햅틱 `success` 패턴 (Android)
- 선택 순간 카드 collapse 애니 + Luna "오케이 그걸로 가자" 멘트

### 4.2 Luna 말풍선 모드 확장

기존 `MessageBubble` 을 확장 — **모드 관련 props** 허용:

```tsx
<MessageBubble
  message={msg}
  roleOverride="루나(여친)"  // 롤플레이 중
  avatarBadge="여친"         // 우하단 미니 뱃지
  narration="_커피잔 만지며_" // italic before/after
/>
```

### 4.3 Quick Replies (새 컴포넌트)

Luna 의 말풍선 바로 아래에 작은 chip 형태 버튼 3개:
```
[A "미안..."] [B "뭘..."] [C 직접쓰기]
```

- 탭 → 자동으로 chat input 에 꽂힘 (또는 바로 전송)
- hover 시 살짝 확대 (spring)
- 직접쓰기 → 일반 input 으로 돌아감

### 4.4 Background Ambient Tint

ChatContainer 최상위에 조건부 `mix-blend-multiply` 레이어:

```tsx
{activeMode === 'roleplay' && (
  <div
    className="fixed inset-0 bg-rose-50/30 mix-blend-multiply pointer-events-none transition-all duration-500"
    style={{ zIndex: 0 }}
  />
)}
```

- 모드별 색상:
  - roleplay (여친) → rose
  - roleplay (전 남친) → gray
  - panel (집중 페르소나별) → 언니=warm / 친구=blue / 선배=violet
  - 그 외 → 없음

### 4.5 Luna Typing 진화

기존 3-dot bounce → **하트비트 펄스** (롤플레이 시) / **무지개 펄스** (아이디어 다듬는 중) / **타자 소리 햅틱** (draft 생성 중)

---

## Part 5 — FX / 라이브러리

### 5.1 신규 의존성 (총 ~7KB 신규)

| 라이브러리 | 역할 | 번들 |
|---|---|---|
| `@formkit/auto-animate` | list reorder / add/remove 자동 FLIP | 2.3KB |
| `web-haptics` (또는 인라인 rewrite) | Android 햅틱 (`navigator.vibrate` 래퍼) | ~4KB |
| (기존) framer-motion | `layoutId` 이름 morph | 0KB |
| (기존) canvas-confetti | 완료 micro-burst | 0KB |
| (기존) howler | BGM | 0KB |

### 5.2 핵심 FX 패턴

**패턴 A — Stagger Entry**
```tsx
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.2 * idx, type: 'spring' }}
>
```

**패턴 B — Name Morph**
```tsx
<motion.span layoutId="luna-name-tag">
  {isRoleplay ? '루나(여친)' : '루나'}
</motion.span>
```

**패턴 C — Ripple On Tap**
```tsx
<button onClick={(e) => {
  const ripple = createRipple(e);
  navigator.vibrate?.(5);
  onClick();
}}>
```

**패턴 D — Ambient Tint Fade**
CSS `transition-colors duration-500` + 조건 클래스

**패턴 E — Completion Celebration**
```ts
confetti({ particleCount: 18, spread: 55, origin: { y: 0.85 } });
navigator.vibrate?.([10, 50, 10]);
```

---

## Part 6 — 구현 단계

### M1: Foundation (반나절)
- [ ] ModeFrame 제거 → 인라인 렌더로 전환
- [ ] ChatContainer 에 active 모드 조건부 인라인 영역 추가
- [ ] AutoAnimate 설치 + 기본 적용
- [ ] Background tint 레이어

### M2: Draft 리디자인 (반나절)
- [x] Luna 오프닝 멘트 + 3 버블
- [x] 톤별 색상 구분
- [x] 선택/편집 기능
- [ ] 완료 confetti + 햅틱
- [ ] 반응 시뮬 인라인화

### M3: Tone 리디자인 (2시간)
- [ ] 동일 패턴 적용 (3 버블 + 선택)
- [ ] intensity bar 유지

### M4: Idea 리디자인 (2시간)
- [ ] 유저 입력 → Luna 답장 → diff 인라인
- [ ] 3선택 유지

### M5: Panel 리디자인 (3시간)
- [ ] 3 페르소나 각자 말풍선
- [ ] 반응 버튼 (공감/들어볼래/아니야)
- [ ] 깊이 파고들기는 인라인 대화로 유지

### M6: Roleplay 리디자인 (4시간)
- [ ] Luna 이름 morph
- [ ] 아바타 뱃지
- [ ] Quick replies chip
- [ ] Narration italic
- [ ] Background tint rose
- [ ] 코치 팝업 재디자인 (하단 슬라이드업)

### M7: Polish (2시간)
- [ ] 햅틱 테스트
- [ ] 완료 celebration
- [ ] 전환 타이밍 튜닝

**총 예상: 2-3일 (~20시간)**

---

## Part 7 — 상태 & 데이터

### 7.1 Mode Store 유지
Zustand modeStore 는 그대로. activeMode + modeState 저장.

### 7.2 렌더 결정
ChatContainer:
```tsx
{activeMode === 'draft' && modeState?.modeId === 'draft' && (
  <div className="px-4">
    <DraftMode initial={modeState} onComplete={...} />
  </div>
)}
```
→ 이 영역은 chat scroll 안에 포함, 최하단 고정 메시지처럼.

### 7.3 Persona Override for Roleplay
```tsx
const personaOverride = activeMode === 'roleplay' 
  ? modeState?.scenario.role
  : null;

// MessageBubble 에 전달
<MessageBubble persona={personaOverride} ... />
```

---

## Part 8 — 접근성 & 성능

### 8.1 Reduced Motion
`prefers-reduced-motion: reduce` 존중:
- Framer Motion `useReducedMotion()` 훅
- 모든 애니 duration → 0ms (FX 끔)
- confetti / particle → 정적 이모지로 대체

### 8.2 iOS 햅틱 Fallback
iOS 는 `navigator.vibrate` 지원 X. 대신 3ms CSS scale-bounce 로 시각적 피드백.

### 8.3 번들 최적화
- AutoAnimate lazy import X (어차피 모든 모드에서 사용)
- tsParticles 쓴다면 lazy
- howler 는 이미 lazy load 중

### 8.4 성능 목표
- 모드 첫 진입 → 100ms 내 첫 페인트
- 스트림 애니메이션 유지 60fps
- 폰트/이미지 preload

---

## Part 9 — 에지 케이스

### 9.1 유저가 모드 중간에 일반 메시지 보냄
→ 허용. Luna 가 "아 그거 좋은 질문인데 지금 일단 이거 끝내고 얘기하자!" 류로 부드럽게 유도.

### 9.2 네트워크 실패
→ 폴백 UI: "잠깐 인터넷이... 다시 시도" 버튼.

### 9.3 모드 재진입
→ modeStore persist 이미 있음. 새로고침해도 복구.

### 9.4 스크롤
모드가 길어지면 채팅이 길어지는데, 자동 스크롤 유지.

---

## Part 10 — 성공 기준

### 10.1 정성 지표
- "모드 진입이 불편하다" 피드백 **사라짐**
- "Luna 와 진짜 같이 짜는 느낌" 긍정 피드백
- 모드 중도 이탈률 < 10%

### 10.2 정량 지표
- 모드 완료율 > 85%
- 모드 당 평균 시간 2-5분
- 모드 후 ACTION_PLAN 발동 성공률 > 90%
- 번들 증가 < 10KB (목표 7KB)

### 10.3 기술
- 모든 모드 60fps
- 햅틱 Android 동작 확인
- reduced-motion 존중
- TSC pass

---

## 결론

v81 의 오버레이 모드는 **기능적으론 완성됐지만 UX 가 작위적**. v82 는 Phase/모드/API 아키텍처는 유지하면서 **렌더링 레이어만 전면 인라인화** — Luna 가 진짜로 카톡 보내는 느낌, 같이 놀며 전략 짜는 누나 같은 UX.

핵심 변경 7개:
1. Portal/Overlay 제거 → 전부 채팅 inline
2. Luna 이름 morph (roleplay)
3. Background ambient tint
4. Quick reply chips
5. Haptic + ripple + stagger FX
6. Luna 멘트로 모드 감싸기 (오프닝/클로징)
7. 완료 시 micro-confetti celebration

2-3일 구현. 번들 +7KB. 기존 모드/API/store 유지 (UI 만 교체).
