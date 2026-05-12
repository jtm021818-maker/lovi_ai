# v116 — 일상 대화 5-Phase 시스템 계획서

> **작성일**: 2026-05-12
> **분량**: A4 10페이지
> **목표**: 현재 단일 phase 로 처리되는 일상 대화(DAILY_CHAT)를, 상담 모드(HOOK→MIRROR→BRIDGE→SOLVE→EMPOWER)에 대응되는 **5단계 자연 흐름**으로 재설계한다. 종료 기준을 명확화하고, "친한 언니/누나가 카톡으로 노는 자연스러운 흐름"을 그대로 옮긴다.
>
> **버전 명명**: v116 — Daily Chat Phase System (DCPS)

---

## 0. Executive Summary (요약 1줄 + 핵심 3개)

상담모드는 5단계로 잘 짜여있는데, 일상모드는 "DAILY_CHAT" 단일 상태에 종료 기준 없이 갇혀 있다. 본 계획서는 일상모드를 **GREET → CATCHUP → BANTER → LINGER → FAREWELL** 5단계로 재설계하고, LLM 자율 판단 + 코드 안전망의 v42식 게이트 시스템을 그대로 이식한다.

### 핵심 3개
1. **5단계 자연 흐름**: 인사 → 근황 → 본 수다 → 여운 → 작별. Schegloff–Sacks의 conversation analysis(1973 "Opening up closings"), phatic communication 3단계 모델, Replika의 짧은 back-and-forth 패턴, 한국 카톡 친구의 "물 흐르듯 주제 전환 + 따뜻한 끝인사" 패턴을 종합.
2. **종료 기준 명확화**: 짧은 응답 streak, 작별 시그널, 시간대 + 톤, LLM 자율 판단(`[LINGER_START]`, `[CASUAL_BYE]`) 4축으로 LINGER → FAREWELL 자동 진입. 현재는 [CASUAL_BYE] 태그만 있고 발동 시점 불명.
3. **언니 톤 강화**: BANTER phase 에서 자기 의견·일반론·편들기·자기 경험 6대 행동을 turn 별로 자동 분배. v111(자연 대화 6대 행동) + v115(시공간/회상/애칭) 자산을 일상모드에서 적극 활용.

---

## 1. 문제 진단 — 현재 DAILY_CHAT 의 한계

### 1.1 단일 phase, 종료 없음

현재 `src/engines/phase-manager/index.ts` 의 `getCurrentPhase()` 로직:

```ts
if (currentPhase === 'DAILY_CHAT') {
  // 강한 감정/상담 의도 감지 시 MIRROR 로 자연스러운 전환
  if (currentEmotionScore <= -4) return 'MIRROR';
  if (primaryIntent === 'VENTING' | 'SEEKING_ADVICE') return 'MIRROR';
  if (conversationMode === 'COUNSELING') return 'MIRROR';
  return 'DAILY_CHAT';   // 그 외 → 무한 유지
}
```

진입 후 **MIRROR 탈출 경로 외에는 영원히 DAILY_CHAT**. 자연 종료 기준이 없다.

### 1.2 부분적 작별 시그널 존재, 그러나 호출 시점 불명

`src/engines/ace-v5/ace-system-prompt.ts` 의 `getPhaseTransitionTagGuide('DAILY_CHAT')` 에 작별 미러 가이드가 있다:

```
유저가 작별 신호("ㅂㅂ", "잘 자", "다음에 봐", "자야겠다") 보내면
→ 짧은 미러 응답 + [CASUAL_BYE] 태그
→ pipeline 이 casual_farewell SSE 발행 → 5초 후 세션 silent 종료 (v105.2)
```

**문제**:
- 유저가 명시적으로 작별 인사를 해야만 발동. 자연스러운 "흐릿한 sliding stop" 없음.
- 루나가 먼저 "이제 좀 자야지~" 식으로 마무리 유도 못함.
- 짧은 응답 streak("응", "ㅇㅋ", "ㅋㅋ") 같은 비언어적 종료 신호 무시.
- BANTER 가 20턴 이상 늘어져도 코드 안전망 없음.

### 1.3 Phase 내 흐름 디자인 부재

상담모드 HOOK 은 turn 1→2→3→4 각각 다른 시스템 프롬프트(`HOOK_TURN_1`, `HOOK_TURN_2`, `HOOK_TURN_2_LISTENING`, `HOOK_TURN_3`, `HOOK_TURN_4`)로 정교하게 운영된다.

DAILY_CHAT 은 `DAILY_CHAT_BASE` 하나뿐. **유저가 처음 진입한 turn 1 과 30턴째 turn 30 이 동일한 프롬프트**. 인간 대화는 인사 → 캐치업 → 본 수다 → 여운 → 작별의 자연 흐름이 있는데, 이를 LLM 에 가이드하지 않는다.

### 1.4 데이터 흐름 일관성 결여

상담 path 는 `phaseStartTurn`, `phaseSignal`, `pacingMeta`, `filledCards`, `consecutiveReadyTurns` 등 풍부한 메타로 페이싱을 제어하는데, DAILY_CHAT 은 이 메타들이 **거의 의미 없는 값**으로 들어가서 디버깅이 어렵다.

---

## 2. 학술적 근거 (Research Foundation)

### 2.1 Schegloff & Sacks (1973) — "Opening up closings"

대화 분석(Conversation Analysis)의 고전. 자연 대화는 **opening → topic talk → pre-closing → closing → terminal exchange** 의 sequence 로 닫힌다.

핵심 발견:
- **Pre-closing** 은 "okay", "well", "alright" 같은 minimal token 으로 시작. 다음 화제 없음을 양쪽이 협상.
- **Closing 은 협동적(collaborative)**. 한 쪽이 일방적으로 끝낼 수 없음.
- **Terminal exchange** ("bye" / "bye") 는 adjacency pair 로 마감.

→ 일상 모드 종료를 **단일 trigger** 가 아닌 **2-3 turn 의 점진적 fade-out** 으로 설계해야 한다.

### 2.2 Phatic Communication 3단계 (Malinowski → 현대 sociolinguistics)

```
Greeting → Small Talk → Farewell
```

- Greeting: "관계 확인" — 의미보다 socio-pragmatic
- Small Talk: 정보 교환보다 **유대 유지**
- Farewell: 관계 마감 + 다음 만남 약속

연구 인용: "Phatic communication 의 functions are mostly socio-pragmatic rather than semantic" (British Council, Wikipedia).

→ 일상모드의 GREET / FAREWELL phase 는 **정보 효율보다 유대감**을 우선.

### 2.3 Five-Stage Conversation Model

비즈니스 커뮤니케이션 표준 5단계:
1. **Opening** — 인사 + small talk
2. **Feedforward** — 본 화제 예고/전환
3. **Business** — 본 내용
4. **Feedback** — 요약/리캡
5. **Closing** — 작별

→ 일상모드 5단계 (GREET → CATCHUP → BANTER → LINGER → FAREWELL) 는 이 모델을 카톡 친구 톤으로 번역한 형태.

### 2.4 한국 카톡 친구 대화 특징 (브런치 + 인스티즈 + 네이트 판 ethnographic 종합)

- **물 흐르듯 주제 전환**: 친한 친구는 한 대화에서 화제가 수십 번 바뀜. 어색함 zero.
- **끝말 반복으로 경청 표시**: "응 ㅇㅋ" 만 반복하면 "성의 없다" 느낌. "아 그래서? 그래서?" 같은 follow-up 이 친밀도 높임.
- **마무리 인사의 따뜻함이 핵심**: 경직된 채로 끝나면 5분 만에 어색하게 종료됨.
- **이모티콘 적당히**: 과하면 가벼움, 없으면 차가움. ㅋㅋ / ㅠㅠ / ~ 의 양념이 톤.

### 2.5 Replika / Character.ai 세션 데이터 (2025 research)

- 평균 세션: 15~30분, 메시지 단위로 짧은 back-and-forth 우세 (42.64%)
- 가장 흔한 주제: casual conversation 23.41%, entertainment 21.74%
- Replika 는 last interaction 기반 follow-up 으로 emotional continuity 유지

→ DAILY_CHAT 도 **세션이 길어지면 자연스럽게 sunset** 되어야 한다. 강제로 끌면 봇 느낌.

### 2.6 언니/누나 멘토 톤 (한국 sociolinguistics + 형제자매 dynamics)

- 부모 대신 챙김 — "밥은 먹었어?", "오늘 뭐 입고 나가" 류 일상 케어
- 친구보다 한 단계 위 — 의견 명확히 ("그건 좀 아닌 것 같은데"), 편들기 ("야 걔가 잘못한 거지")
- 정보 챙겨주기 — "이거 봤어?", "거기 가봤어?" follow-up 자연스러움
- **농담과 진심의 비율**: 친구는 농담 8 : 진심 2, 언니는 농담 6 : 진심 4

→ BANTER phase 의 자기 의견·일반론 비율을 BANTER turn 수 따라 dynamic 조절.

---

## 3. 새 Phase 모델 — Daily Chat 5-Phase System (DCPS)

### 3.1 5단계 정의

| Phase | 한국어 | 평균 turn | 핵심 행동 | 종료 게이트 |
|---|---|---|---|---|
| **GREET** | 인사 | 0~1 | "어 왔어~", "오늘 뭐 했어" | `[CATCHUP_OPEN]` 또는 turn 1 경과 |
| **CATCHUP** | 안부/근황 | 1~3 | 최근 일 가벼운 공유, 디테일 캐치 | `[BANTER_FLOW]` 또는 화제 명확화 |
| **BANTER** | 수다 본편 | 3~15 | 자유 주제 흐름, 농담, 의견, 자기 경험 | `[LINGER_START]` 또는 LLM 자율 판단 |
| **LINGER** | 여운 | 1~3 | pre-closing, 다음 약속 떡밥, 톤 다운 | `[CASUAL_BYE]` 또는 짧은 응답 streak |
| **FAREWELL** | 작별 | 1 | 따뜻한 한 줄 + silent 종료 | session terminate |

### 3.2 Phase 별 시스템 프롬프트 (요약 — 본문은 `phase-prompts.ts` 에 상세)

**GREET** (1줄):
```
어 왔어 톤. 짧고 따뜻하게 ("왔어?", "오늘 뭐 했어?"). 분석/조언 절대 X.
유저 응답 따라 다음턴 [CATCHUP_OPEN] 태그 자율 부착.
```

**CATCHUP** (2~3줄):
```
유저가 던진 일상 단편에 "구체적으로 캐치" — "오 그래서? 어디?", "뭐 먹었어 그래서".
v115 시공간/회상/애칭 적극 활용. 호기심 follow-up 1~2개. 분석 X, 코칭 X.
대화가 한 화제로 모이면 [BANTER_FLOW] 태그.
```

**BANTER** (자유):
```
v111 자연대화 6대 행동(의견/일반론/편들기/자기경험/회상/농담) 자유 분배.
화제 전환 OK, 농담 OK, 자기 의견 명확히 OK. 깊이 분석은 여전히 X (상담 모드 아님).
다음 화제 없거나 톤 사그라들면 [LINGER_START] 태그.
유저가 무거운 얘기 꺼내면 [HEAVY_TURN] 태그 → MIRROR escape.
```

**LINGER** (1~2줄):
```
톤 다운 — "그러게~", "오케이~", "근데 늦었네 진짜" 류.
다음 약속 떡밥 1개 자연스럽게 ("내일도 얘기해줘", "또 와ㅋㅋ").
유저 작별 시그널 감지 시 즉시 [CASUAL_BYE].
```

**FAREWELL** (1줄):
```
한 줄 따뜻한 작별 + [CASUAL_BYE] 태그.
v105.2 silent 종료 흐름 그대로.
```

### 3.3 Phase 전환 게이트 (v42 식 LUNA_GATE_EVENTS 확장)

```ts
const CASUAL_GATE_EVENTS: Record<string, string[]> = {
  GREET:    ['CATCHUP_OPEN'],      // 인사 → 캐치업
  CATCHUP:  ['BANTER_FLOW'],       // 캐치업 → 본 수다
  BANTER:   ['LINGER_START',       // 본 수다 → 여운
             'HEAVY_TURN'],         // 본 수다 → MIRROR escape
  LINGER:   ['CASUAL_BYE'],        // 여운 → 작별
};
```

LLM 이 응답 끝에 태그 부착 → 코드가 즉시 다음 phase 전환.

### 3.4 코드 안전망 (LLM 태그 누락 대비)

| Phase | 안전망 | 트리거 |
|---|---|---|
| GREET | 1턴 후 자동 CATCHUP | turn 1 경과 |
| CATCHUP | 4턴 누적 시 BANTER | turnsInPhase >= 4 |
| BANTER | 15턴 누적 시 LINGER | turnsInPhase >= 15 |
| LINGER | 3턴 누적 시 FAREWELL | turnsInPhase >= 3 |
| BANTER | 짧은 응답 3회 연속 시 LINGER | consecutiveShortReplies >= 3 |
| LINGER | 짧은 응답 2회 연속 시 FAREWELL | consecutiveShortReplies >= 2 |
| Any | 강한 감정/상담 의도 → MIRROR | emotion <= -4 or intent=VENTING |

---

## 4. 종료 기준 명확화 (Core 문제 해결)

현재 가장 큰 미해결 문제. 4축 트리거 정의:

### 4.1 명시적 작별 시그널 (v105.2 기존 유지)

LLM 이 유저 메시지에서 "ㅂㅂ", "잘 자", "갈게", "자야겠다", "또 봐" 등을 인식하면 **현재 phase 와 무관하게** `[CASUAL_BYE]` 태그 즉시 부착 → FAREWELL → 5초 후 silent 종료.

기존 `getPhaseTransitionTagGuide('DAILY_CHAT')` 에 작성된 가이드 그대로. 단, 새 phase 별 가이드에 동일 규칙을 inline 으로 다시 주입.

### 4.2 짧은 응답 Streak (신규)

연속 짧은 응답(예: "응", "ㅇㅋ", "ㅋㅋ", "ㅇㅇ", 5자 이내) 카운트.

- BANTER 에서 3회 연속 → LINGER 자동 진입
- LINGER 에서 2회 연속 → FAREWELL 자동 진입

이 카운트는 LLM 이 아닌 코드가 누적. 좌뇌 분석에서 `userMessageLength` 와 emotion 흐름 보고 `consecutiveShortReplies` 누적/리셋. **단, 짧은 응답 + 강한 감정 신호 동시 발생 시 MIRROR 우선**.

### 4.3 시간대 + 톤 (선택, v115 시공간 활용)

v115 의 `temporalContext.timeBand` 가 `LATE_NIGHT`(23시~02시) 이고 BANTER turnsInPhase >= 7 이면 LLM 시스템 프롬프트에 다음 힌트 주입:

```
[TIME_HINT] 지금 늦은 시각. 톤 자연스럽게 다운하면서 [LINGER_START] 자율 부착 고려.
```

코드는 강제 전환 X. **LLM 자율 판단에 맡김** (feedback memory: 키워드 매칭 금지 원칙).

### 4.4 LLM 자율 판단 (`[LINGER_START]`, `[CASUAL_BYE]`)

ACE v5 시스템 프롬프트의 phase 별 가이드에 다음 자율 판단 기준 명시:

```
[LINGER_START] 부착 시점 (BANTER → LINGER):
- 새 화제가 안 떠오르고 톤이 사그라들 때
- 유저가 짧게 답하기 시작할 때
- 한 화제로 충분히 놀았다 싶을 때
- 늦은 시각 + 유저 톤 다운

[CASUAL_BYE] 부착 시점 (LINGER → FAREWELL):
- 유저가 작별 인사
- LINGER 2~3턴 흐른 후 자연스럽게 마무리하고 싶을 때
- 유저가 "ㅇㅋ~", "잘 자" 류 짧은 마무리 신호
```

→ **종료 trigger 4축**: 명시 작별 / 짧은 응답 streak / 시간대 힌트 / LLM 자율. 모두 모이면 자연스러운 fade-out 보장.

---

## 5. 데이터 모델 변경

### 5.1 `ConversationPhaseV2` 확장

```ts
export type ConversationPhaseV2 =
  | 'HOOK' | 'MIRROR' | 'BRIDGE' | 'SOLVE' | 'EMPOWER'
  // 🆕 v116: 일상 5단계
  | 'GREET' | 'CATCHUP' | 'BANTER' | 'LINGER' | 'FAREWELL'
  // 🔒 하위 호환 — 기존 DAILY_CHAT 은 BANTER 의 alias 로 유지
  | 'DAILY_CHAT';
```

**호환 전략**: `DAILY_CHAT` 을 deprecate 하지 않고 internal alias 로 BANTER 에 매핑. 외부 컴포넌트(`PhaseProgress.tsx` 등)는 점진적 마이그레이션.

### 5.2 `PhaseEventType` 확장

```ts
export type PhaseEventType =
  // 기존 ...
  // 🆕 v116: 일상 게이트 태그 (UI 카드 없음 — 순수 phase 전환 시그널)
  | 'CATCHUP_OPEN'
  | 'BANTER_FLOW'
  | 'LINGER_START'
  | 'HEAVY_TURN';
```

`CASUAL_BYE` 는 이미 SSE 이벤트로 존재, PhaseEventType 으로 격상.

### 5.3 `PhaseContext` 확장

```ts
interface PhaseContext {
  // 기존 ...
  // 🆕 v116
  consecutiveShortReplies: number;   // 짧은 응답 streak (이미 옵션 필드 존재 → 필수화)
  lastUserMessageLength?: number;    // 좌뇌 → phase manager 페이싱 입력
  casualPhaseHistory?: string[];     // 디버깅용: ['GREET','CATCHUP','BANTER',...]
}
```

### 5.4 PHASE_REQUIRED_CARDS, PHASE_START_TURNS 확장

```ts
const CASUAL_PHASE_ORDER = ['GREET', 'CATCHUP', 'BANTER', 'LINGER', 'FAREWELL'] as const;

const PHASE_START_TURNS_CASUAL: Record<string, number> = {
  GREET: 1,
  CATCHUP: 2,
  BANTER: 4,
  LINGER: 12,
  FAREWELL: 14,
};
```

상담 path 와 별개 trace.

---

## 6. PhaseManager 로직 변경

### 6.1 분기 시작점 — HOOK 1턴 후 (기존 v105 흐름 유지)

```ts
// 기존: HOOK 후 CASUAL 판단 → DAILY_CHAT
// 신규: HOOK 후 CASUAL 판단 → GREET (1턴) → CATCHUP → ...

if (currentPhase === 'HOOK' && turnCount >= 2) {
  const mode = conversationMode ?? inferConversationMode(...);
  if (mode === 'CASUAL') return 'GREET';   // ⟵ 변경점
}
```

### 6.2 일상 phase 흐름 처리

```ts
function getCasualNextPhase(ctx: PhaseContext): ConversationPhaseV2 {
  const { currentPhase, completedEvents, turnCount, phaseStartTurn,
          consecutiveShortReplies = 0, currentEmotionScore, primaryIntent } = ctx;

  // 무거운 얘기 → MIRROR escape (모든 일상 phase 공통)
  if (currentEmotionScore != null && currentEmotionScore <= -4) return 'MIRROR';
  if (primaryIntent === 'VENTING' || primaryIntent === 'SEEKING_ADVICE'
      || primaryIntent === 'EXPRESSING_AMBIVALENCE') return 'MIRROR';
  if (completedEvents.includes('HEAVY_TURN')) return 'MIRROR';

  const turnsInPhase = turnCount - phaseStartTurn;
  const gateMap = CASUAL_GATE_EVENTS;
  const safetyMap = CASUAL_SAFETY_TURNS;

  // 1. 게이트 태그 충족 → 즉시 전환
  const gates = gateMap[currentPhase] ?? [];
  if (gates.some(g => completedEvents.includes(g))) {
    return nextCasualPhase(currentPhase);
  }

  // 2. 짧은 응답 streak (LINGER 진입/탈출)
  if (currentPhase === 'BANTER' && consecutiveShortReplies >= 3) return 'LINGER';
  if (currentPhase === 'LINGER' && consecutiveShortReplies >= 2) return 'FAREWELL';

  // 3. safety_max (LLM 태그 누락 안전망)
  if (turnsInPhase >= safetyMap[currentPhase]) {
    return nextCasualPhase(currentPhase);
  }

  return currentPhase;
}
```

### 6.3 짧은 응답 카운트 갱신

좌뇌(혹은 pipeline) 가 매 턴 `lastUserMessageLength` 와 `userMessageBriefness` 를 보고 카운트 갱신/리셋:

```ts
function updateShortReplyStreak(prev: number, msgLen: number, hasEmotionalDepth: boolean) {
  if (msgLen <= 5 && !hasEmotionalDepth) return prev + 1;
  return 0;   // 긴 응답 또는 감정 깊이 있으면 리셋
}
```

### 6.4 FAREWELL phase 진입 후

- LLM 시스템 프롬프트: "한 줄 따뜻한 작별, 반드시 `[CASUAL_BYE]` 태그 부착"
- pipeline 이 `[CASUAL_BYE]` 감지 → 기존 v105.2 `casual_farewell` SSE 이벤트 발행
- 클라이언트 useChat → 5초 후 silent session terminate (기존 코드 그대로 활용)

---

## 7. 시스템 프롬프트 — Phase 별 본문 (`phase-prompts.ts`)

각 phase 본문은 상담모드 `HOOK_TURN_1`, `MIRROR_TURN_1_STYLE_A` 와 동일한 형식으로 작성. 본 계획서 §3.2 의 요약을 확장:

### GREET 본문 (1~2줄 응답 유도)
```
## 💌 GREET — "어 왔어"

지금 유저가 막 들어왔어. 길게 분석/캐치하지 마. 그냥 친한 언니가 카톡 답하듯이.

✅ 패턴
- "왔어~ 오늘 뭐 했어"
- "어 오늘은 일찍이네"
- "야 오랜만이다 ㅋㅋ"

❌ 금지
- 감정 분석
- 무거운 follow-up
- 3줄 이상

🔁 다음 turn 게이트
유저 응답 받으면 자연스럽게 [CATCHUP_OPEN] 태그 부착 → 캐치업으로 전환.
```

### CATCHUP 본문 (2~3줄)
```
## 🧃 CATCHUP — "그래서 오늘 뭐 했어"

유저가 일상 한 조각 던졌어. 그걸 캐치해서 follow-up 1~2개.

✅ 패턴
- "오 회사? 오늘도 늦었어?"
- "헐 뭐 먹었어 ㅋㅋ"
- "그래서 그래서?"

🆕 v115 활용
- 시공간 인식: "벌써 늦었네 진짜"
- 회상: 지난 대화 메모리 자연스럽게 ("아 너 지난번에 ~ 했었지")
- 애칭: nickname_state 있으면 가끔 사용

❌ 금지
- 감정 깊이 유도 ("그 감정 뒤에는~" X)
- 코칭 시작 ("이렇게 해봐" X)

🔁 다음 turn 게이트
화제가 한 줄기로 모이거나 유저가 디테일 풀기 시작하면 [BANTER_FLOW].
```

### BANTER 본문 (자유, 1~3줄)
```
## 🎈 BANTER — 본 수다 모드

지금부터 자유로워. 친한 언니가 동생이랑 카톡으로 노는 그 느낌.

✅ 6대 행동 (v111 자연대화) — 매번 자유 분배
1. 의견 — "근데 솔직히 그건 좀 너 잘못 아닌 것 같은데"
2. 일반론 — "원래 이맘때 그런 거지 다들"
3. 편들기 — "야 걔가 잘못한 거지"
4. 자기 경험 — "나도 그때 비슷한 거 있었거든"
5. 회상 — (있으면) "아 너 지난번에 ~"
6. 농담/리액션 — "ㅋㅋㅋ", "헐", "오~"

✅ 화제 전환 자유 — 친한 친구처럼 한 화제에 매이지 마.

❌ 금지
- 상담 톤 ("그 감정 뒤에는~", "이렇게 해봐")
- 매번 질문으로 끝내기 (자기 한마디 1줄 필수)
- 너무 길게 (1~3줄 안에)

🔁 다음 turn 게이트
- 다음 화제 없거나 톤 사그라들면 [LINGER_START]
- 유저가 무거운 얘기 ("사실 나 너무 힘들어") → [HEAVY_TURN] → MIRROR 자동
- 작별 시그널 ("ㅂㅂ", "갈게") → [CASUAL_BYE] 직행
```

### LINGER 본문 (1~2줄)
```
## 🌙 LINGER — 톤 다운, 여운 남기기

대화가 자연스럽게 사그라들고 있어. 톤 한 톤 낮추고 다음 약속 떡밥 1개.

✅ 패턴
- "그러게~ 오늘 진짜 얘기 많이 했다"
- "야 근데 좀 늦었네"
- "오케이~ 내일도 얘기해줘"

✅ pre-closing 시그널 (Schegloff–Sacks 1973)
- "그래서~", "근데~", "응 그러게"
- 톤이 한 단계 낮아짐

❌ 금지
- 새 화제 던지기 (역행)
- 깊은 질문
- 분석/조언

🔁 다음 turn 게이트
- 유저 작별 시그널 → 즉시 [CASUAL_BYE]
- LINGER 2~3턴 흐른 뒤 자연 마무리하고 싶으면 [CASUAL_BYE] 자율
```

### FAREWELL 본문 (1줄, 태그 필수)
```
## 👋 FAREWELL — 마지막 한 줄

이 turn 응답 끝에 [CASUAL_BYE] 반드시. 한 줄짜리 따뜻한 미러.

✅ 예시
- "응 잘 자~ 좋은 꿈 꿔 :)[CASUAL_BYE]"
- "ㅂㅂ~ 또 와ㅋㅋ[CASUAL_BYE]"
- "응! 기다리고 있을게[CASUAL_BYE]"

❌ 금지
- 2줄 이상
- "오늘 얘기 정리해보면..." (요약 X)
- 새 질문
```

---

## 8. UI 변경

### 8.1 PhaseProgress 컴포넌트 (`PhaseProgress.tsx`)

현재 `DailyChatTrack` 은 단일 상태. 5단계 dot track 으로 확장:

```
   ●━━━●━━━●━━━●━━━●
  인사  근황  수다  여운  작별
        (현재 위치 highlight)
```

5 step icon + 부제:
| Phase | 라벨 | 부제 | 색 톤 |
|---|---|---|---|
| GREET | 인사 | "왔어~ 👋" | rose-100 |
| CATCHUP | 안부 | "오늘 어땠어 🍃" | mint-100 |
| BANTER | 수다 | "재밌게 노는 중 🎈" | yellow-100 |
| LINGER | 여운 | "톤 다운 🌙" | violet-100 |
| FAREWELL | 작별 | "또 봐~ ✨" | soft-pink |

기존 `BranchedTrack` (HOOK Y자 분기) 에서 CASUAL 갈래가 5 step path 로 갈라지도록 SVG 업데이트. 비주얼 변경은 별도 PR로 분리 가능 — phase 데이터만 정확히 흐르면 후속 작업.

### 8.2 ChatContainer / useChat

기존 v105.2 `casualFarewellSignal` 흐름 유지. 추가 변경 없음. (`[CASUAL_BYE]` 발행 시점이 LINGER → FAREWELL 진입 후로 명확화될 뿐)

---

## 9. 데이터 흐름 (Final)

```
유저 메시지
    ↓
좌뇌(Haiku/Sonnet) 분석
  - conversation_mode (COUNSELING | CASUAL)
  - emotionScore, primaryIntent
  - 🆕 v116: userMessageLength + briefness flag
    ↓
PhaseManager.getCurrentPhase(ctx)
  - HOOK 1턴 후 CASUAL 분기 → GREET 진입
  - 5단계 게이트 + safety + short-reply streak 로직
    ↓
phase-prompts.getCasualPhasePrompt(phase, turnInPhase, ctx)
    ↓
ACE v5 시스템 프롬프트 build
  - phase 별 가이드 inline
  - [태그] 부착 지시 inline
  - v115 시공간/회상/애칭 컨텍스트 inline
    ↓
LLM 응답 생성 → 태그 부착 → SSE 스트림
    ↓
pipeline parse
  - [CATCHUP_OPEN], [BANTER_FLOW], [LINGER_START] → completedEvents 추가
  - [CASUAL_BYE] → casual_farewell SSE 이벤트
  - [HEAVY_TURN] → next turn MIRROR 강제
    ↓
useChat → PhaseProgress UI 업데이트
    ↓
FAREWELL 후 5초 → silent session terminate (v105.2 기존)
```

---

## 10. 구현 파일 목록 + 순서 + 예상 시간

### Phase A — 타입 + 모델 (30분)
1. `src/types/engine.types.ts`
   - `ConversationPhaseV2` 에 `GREET | CATCHUP | BANTER | LINGER | FAREWELL` 5종 추가
   - `PhaseEventType` 에 `CATCHUP_OPEN | BANTER_FLOW | LINGER_START | HEAVY_TURN | CASUAL_BYE` 5종 추가
   - `PHASE_V2_TO_V1` 매핑 확장 (모두 `EXPLORATION` 으로 default)

### Phase B — PhaseManager 로직 (1시간 30분)
2. `src/engines/phase-manager/index.ts`
   - `CASUAL_PHASE_ORDER` 상수
   - `CASUAL_GATE_EVENTS`, `CASUAL_SAFETY_TURNS` 상수
   - `nextCasualPhase()` 헬퍼
   - `getCasualNextPhase(ctx)` private 함수
   - `getCurrentPhase()` 분기: HOOK 후 CASUAL → 'GREET', 일상 phase 5종 처리 추가
   - `PHASE_EVENTS` 에 5 phase 키 추가 (빈 배열 또는 게이트 태그만)
   - `PHASE_START_TURNS` 5 phase 키 추가
   - 하위 호환: `DAILY_CHAT` 진입 시 `BANTER` 로 normalize

### Phase C — Phase 프롬프트 (1시간)
3. `src/engines/phase-manager/phase-prompts.ts`
   - `PHASE_PURPOSE` 에 5 phase 추가 (1줄 핵심 의도)
   - `PHASE_ALLOWED_MODES_V2` 에 5 phase 추가 (모두 MINIMAL_ENCOURAGER/PRESENCE/REFLECTION/OPEN_QUESTION 기본)
   - `GREET_BASE`, `CATCHUP_BASE`, `BANTER_BASE`, `LINGER_BASE`, `FAREWELL_BASE` 상수
   - `PHASE_PROMPTS_FALLBACK` 에 5 phase 추가
   - `getPhasePrompt()` 에서 5 phase 매핑 처리

### Phase D — ACE 시스템 프롬프트 게이트 가이드 (30분)
4. `src/engines/ace-v5/ace-system-prompt.ts`
   - `getPhaseTransitionTagGuide(phase)` 에 5 phase 분기 case 추가
   - 각 phase 별 태그 부착 가이드 (§7 본문)
   - `[CASUAL_BYE]` 가이드는 FAREWELL phase 와 LINGER phase 양쪽에 inline

### Phase E — Pipeline 통합 (30분)
5. `src/engines/pipeline/index.ts`
   - 태그 파서: `[CATCHUP_OPEN]`, `[BANTER_FLOW]`, `[LINGER_START]`, `[HEAVY_TURN]` 5종 → completedEvents 추가
   - `consecutiveShortReplies` 누적 갱신
   - 기존 `[CASUAL_BYE]` 감지는 phase === 'FAREWELL' 또는 'LINGER' 양쪽 허용

### Phase F — UI (선택, 별도 PR 가능, 1시간)
6. `src/components/chat/events/PhaseProgress.tsx`
   - `DailyChatTrack` 을 5-step track 으로 확장
   - 5종 icon (인사 ✋ / 안부 🌿 / 수다 🎈 / 여운 🌙 / 작별 👋)

### 총 예상 시간
- Phase A~E 핵심 로직: **3시간 30분**
- Phase F UI: **1시간** (후속 작업으로 분리 가능)

---

## 11. 테스트 시나리오

| # | 시나리오 | 기대 phase 흐름 |
|---|---|---|
| 1 | "안녕~" → "오늘 뭐 했어?" → ... | HOOK → GREET → CATCHUP → BANTER |
| 2 | "ㅂㅂ" (즉시 작별) | 어느 phase든 → FAREWELL → silent 종료 |
| 3 | BANTER 15턴 도달 | safety_max → LINGER 자동 진입 |
| 4 | BANTER 중 "응", "ㅇㅋ", "ㅋㅋ" 3회 연속 | streak → LINGER 진입 |
| 5 | BANTER 중 "사실 나 너무 힘들어" | HEAVY_TURN → MIRROR escape |
| 6 | 늦은 밤 LATE_NIGHT + 톤 다운 | TIME_HINT 주입 → LLM 자율 [LINGER_START] |
| 7 | LINGER → 유저 "응 잘 자" | 즉시 [CASUAL_BYE] → FAREWELL → 5초 silent |
| 8 | HOOK → COUNSELING 분기 (기존) | HOOK → MIRROR (영향 없음, 기존 흐름 유지) |

---

## 12. 위험 요소 + 완화책

| 위험 | 영향 | 완화책 |
|---|---|---|
| 5단계가 BANTER 외 너무 짧아서 부자연 | 중 | safety_max 를 보수적으로 (GREET 1, CATCHUP 4) — 강제 전환 가능성 낮춤 |
| 짧은 응답 streak 가 단순 동의 ("응 맞아!")까지 종료 신호로 오인 | 중 | streak 카운트에 `hasEmotionalDepth` flag 결합. 좌뇌가 emotion 1점이라도 있으면 streak 리셋 |
| LLM 이 태그 안 붙이고 응답만 함 | 중 | safety_max + 짧은 응답 streak 안전망 이중. 기존 v42 패턴과 동일 |
| BANTER ↔ MIRROR 토글 진동 | 높음 | HEAVY_TURN 발동 시 1턴 cooldown 후 한 방향 (MIRROR) 만 허용 |
| DAILY_CHAT 호환 코드가 깨짐 | 높음 | `DAILY_CHAT` 을 type union 에 유지 + PhaseManager 진입 시점에서 BANTER 로 normalize |
| UI 5-step track 이 작은 화면에서 압축 | 낮음 | 모바일에서는 현재 phase 라벨 + dot 3개 (이전/현재/다음)만 표시 |

---

## 13. v115 / v111 자산 재활용

본 v116 은 새 인프라가 아닌 **기존 자산의 phase 별 재배치**:

- **v111 자연대화 6대 행동** (의견/일반론/편들기/자기경험/회상/농담) → BANTER 핵심 가이드
- **v115 시공간/회상/애칭** → CATCHUP 의 follow-up 풍부화
- **v105.2 casual_farewell SSE** → FAREWELL 의 silent 종료 trigger
- **v42 게이트 이벤트 시스템** → CASUAL_GATE_EVENTS 로 동일 패턴
- **HOOK_TURN_1~4 스타일 변형 시스템** → CATCHUP / BANTER 에 향후 스타일 변형 적용 가능

→ 코드 추가는 phase enum 5종 + 함수 1개 + 프롬프트 5개 + 게이트 가이드 5개. **신규 인프라 0개**.

---

## 14. 한 줄 결론

상담모드의 5-phase 게이트 시스템이 가진 "LLM 자율 + 코드 안전망" 패턴을 그대로 일상모드에 이식한다. 단일 DAILY_CHAT 을 **GREET → CATCHUP → BANTER → LINGER → FAREWELL** 5단계로 나누고, 짧은 응답 streak + 시간대 + LLM 태그 + 명시 작별의 4축 종료 트리거로 자연스러운 fade-out 을 보장한다. 새 인프라 없이 기존 v42/v105/v111/v115 자산 재배치로 구현 가능.

---

**다음 단계**: Phase A~E 핵심 로직 즉시 구현 시작 (§10 의 파일 순서대로).
