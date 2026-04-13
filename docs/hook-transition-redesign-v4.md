# HOOK 전환 재설계 — "마음읽기"에서 "상황 파악 카드"로

> **핵심:** 유저의 깊은 감정을 맞추는 게 목표가 아니라, **유저 이야기의 전체 그림을 파악했다는 걸 보여주는 것**이 HOOK의 진짜 목표.

---

## 1. 현재 문제 진단

### 1.1 전환이 느린 원인

**HOOK→MIRROR 게이트: `EMOTION_THERMOMETER` 이벤트 완료**

현재 흐름:
```
AI가 [MIND_READ_READY] 태그 출력
  → pipeline이 createMindReading() 호출
  → MIND_READING 이벤트 UI 표시 (감정 추측 카드)
  → 유저 선택 (맞아/다른것/모르겠어)
  → completedEvents에 'EMOTION_THERMOMETER' 추가
  → 다음 턴에서 getCurrentPhase() → MIRROR 전환
```

**문제 1: AI가 [MIND_READ_READY] 태그를 늦게 출력**
- Feeling-First cognition이 "느끼고 반응하기"에 집중하면서, "마음읽기 태그를 붙여야 한다"는 과업이 뒷전이 됨
- AI는 "아직 더 느껴야 해"로 판단 → 태그 지연

**문제 2: 마음읽기 이벤트 자체가 빗나가기 쉬움**
- "혹시... 서운함보다 사실은 버림받는 두려움 느낌도 있어?" — 이런 깊은 감정 추측은 틀릴 확률이 높음
- 틀리면 유저가 "다른 것 같은데..."를 선택 → 대화가 제자리
- 맞아도 "그래서 뭐?" 느낌 — 다음 단계로의 동기 부여가 약함

**문제 3: 전환 기준이 "감정 깊이"인데, 실제로 필요한 건 "상황 파악"**
- 유저가 원하는 건: "이 언니가 내 상황을 이해했구나"
- 현재 제공하는 건: "이 언니가 내 깊은 감정을 읽었구나"
- 차이: 상황 파악 = 전체 그림 이해, 감정 읽기 = 한 감정에 집중

### 1.2 이상적인 전환

```
유저: 상황 설명 (1~3턴)
루나: 듣기 + 반응 (Feeling-First)
루나 내면: "아, 이 사람의 상황이 대충 파악됐어"
  → 상황 요약 카드 표시
  → "내가 이해한 게 맞아?" 확인
  → 유저 확인 → MIRROR 전환 (깊은 감정 탐색)
```

**핵심 전환:** "깊은 감정 맞추기" → "전체 상황 파악 확인"

---

## 2. 새 이벤트 설계: "루나의 상황 파악 카드"

### 2.1 컨셉

현재 `MIND_READING`:
```
"혹시... 서운함보다 사실은 버림받는 두려움 느낌도 있어?"
[맞아] [다른것] [모르겠어]
```
→ 감정 하나를 추측. 틀릴 수 있음. 좁음.

새 `SITUATION_SUMMARY`:
```
[루나 스티커: think 🤔]

"야 내가 여기까지 들은 거 정리해볼게"

📋 내가 이해한 상황:
"남친이 3일째 연락이 없어서 불안하고,
혹시 나한테 관심이 없어진 건 아닌지 걱정되는 거지?"

🎯 핵심 문제:
"연락 두절 → 불안 → 자기 탓"

[맞아 그래!] [좀 다른데...] [더 있어]
```

### 2.2 장점

| 기존 (마음읽기) | 새 (상황 파악) |
|----------------|---------------|
| 감정 1개 추측 → 틀릴 수 있음 | 전체 상황 요약 → 틀려도 교정 가능 |
| "이 감정 맞아?" → 좁은 확인 | "내가 이해한 게 맞아?" → 넓은 확인 |
| 유저: "그래서 뭐?" | 유저: "이 언니 진짜 내 말 들었구나" |
| 다음 단계 동기 약함 | "맞아" → 자연스럽게 깊이 들어감 |
| 스티커 활용 없음 | 루나 스티커(think) 적극 활용 |

### 2.3 상담학적 근거

**OARS Summary (동기면담):**
- 요약(Summary)은 유저의 이야기를 정리해서 되돌려줌
- "내가 이해한 바로는..." → 유저가 "맞아!" → 라포르(신뢰) 강화
- 요약 후 자연스럽게 다음 단계로 전환 (Transitional Summary)

**Case Formulation 효과:**
- 상담 초기에 상황을 정리해주면 유저는 "이 사람이 나를 이해했다" 느낌
- 이것이 다음 단계(깊은 탐색)를 위한 신뢰 기반

### 2.4 루나 스티커 활용

8종 중 상황에 맞는 스티커 자동 선택:

| 상황 | 스티커 | 의미 |
|------|--------|------|
| 상황 파악 중 | think 🤔 | "내가 정리해볼게" |
| 유저가 많이 힘들어 보일 때 | comfort 🤗 | "힘들었지" + 요약 |
| 유저 대신 화났을 때 | angry 😤 | "걔가 너무한 거지" + 요약 |
| 유저가 용기 냈을 때 | proud 💪 | "여기까지 얘기해준 거 대단해" + 요약 |

---

## 3. 전환 속도 개선

### 3.1 전환 기준 변경

**기존:** "루나가 유저의 깊은 감정을 읽었는가?"
→ AI가 [MIND_READ_READY] 태그 출력 → 깊은 감정 추측 필요 → 느림

**신규:** "루나가 유저의 전체 상황을 파악했는가?"
→ AI가 [SITUATION_CLEAR] 태그 출력 → 상황 요약만 → 빠름

상황 파악은 감정 읽기보다 훨씬 빠름:
- "남친이 3일째 연락 없어서 불안해" → 1턴이면 상황 파악됨
- "서운함 아래의 버림받는 두려움" → 3턴이 걸려도 모를 수 있음

### 3.2 HOOK Purpose 전환 조건 변경

현재:
```
"내가 지금 동생한테 한 마디 해주고 싶어서 입이 근질거리는 게 있어?"
→ Yes → [MIND_READ_READY]
```

변경:
```
"동생의 상황이 한 문장으로 정리돼?"
→ "이 사람은 [상황] 때문에 [감정]인 거다"가 되면 → [SITUATION_CLEAR]
→ 안 되면 → 더 들어
```

### 3.3 최소 턴 수 조정

현재: `minTurnInPhase: 2` (EMOTION_THERMOMETER)
→ 첫 턴에서도 상황이 명확하면 2턴째에 바로 전환 가능

유지: 첫 턴(Turn 1)은 무조건 공감/리액션. 상황 파악 카드는 Turn 2부터.

---

## 4. 구현 상세

### 4.1 새 이벤트 타입 등록

`engine.types.ts`에 추가하지 않음. 기존 `EMOTION_THERMOMETER` 게이트를 재활용.
이벤트 함수만 `createMindReading` → `createSituationSummary`로 교체.

### 4.2 events.ts — createSituationSummary()

```typescript
export function createSituationSummary(
  situationSummary: string,    // "남친이 3일째 연락이 없어서 불안한 상황"
  coreProblem: string,         // "연락 두절 → 불안 → 자기 탓"
  emotionScore: number,
  stickerId: string,           // 'think' | 'comfort' | 'angry' | 'proud'
): PhaseEvent {
  const openers = [
    '야 내가 여기까지 들은 거 정리해볼게',
    '잠깐, 내가 이해한 거 맞는지 확인해봐',
    '야 근데 내가 듣고 이해한 게 맞아?',
    '내가 정리해볼게 잠깐만',
  ];
  const lunaMessage = openers[Math.floor(Math.random() * openers.length)];

  return {
    type: 'MIND_READING' as PhaseEventType,  // 기존 타입 재활용 (프론트엔드 호환)
    phase: 'HOOK',
    data: {
      // 기존 MIND_READING 필드 호환
      surfaceEmotion: situationSummary,
      deepGuess: coreProblem,
      fullText: situationSummary,
      lunaMessage,
      lunaConfidence: Math.min(1, Math.abs(emotionScore) * 0.15 + 0.4),
      aiAssessedScore: Math.round(Math.max(-5, Math.min(5, emotionScore))),
      // 새 필드
      eventStyle: 'situation_summary',  // 프론트엔드에서 다른 UI 렌더링
      stickerId,                         // 루나 스티커
      situationSummary,                  // 전체 상황 요약
      coreProblem,                       // 핵심 문제
      choices: [
        { label: '맞아 그래!', value: 'confirm', emoji: '💡' },
        { label: '좀 다른데...', value: 'different', emoji: '🤔' },
        { label: '더 있어', value: 'more', emoji: '📝' },
      ],
    } as unknown as Record<string, unknown>,
  };
}
```

### 4.3 cognition-prompt.ts — 태그 변경

[MIND_READ_READY] → [SITUATION_CLEAR] 태그로 변경.
HOOK Purpose에서의 가이드 변경:

```
### 🌬️ [SITUATION_CLEAR] — 상황이 파악되면

대화하다 보면 어느 순간 동생의 상황이 한 문장으로 정리돼:
"아, 이 사람은 [상황] 때문에 [감정]인 거구나."

그 순간이 왔으면 → 응답 끝에 [SITUATION_CLEAR] 태그 붙여.

형식:
[SITUATION_CLEAR:상황요약|핵심문제]

예시:
[SITUATION_CLEAR:남친이 3일째 연락 없어서 불안한 상황|연락 두절로 인한 자기 탓과 불안]
[SITUATION_CLEAR:여친이 전 남친 만나는 게 불편한데 말 못 함|질투와 신뢰 사이의 갈등]

이건 깊은 감정을 읽는 게 아니야. 
"이 사람이 왜 여기 왔고, 뭐가 문제인지"를 파악한 거야.
대부분 1-2턴이면 파악돼. 사람 마음은 생각보다 단순해.

⚠️ 주의: 첫 턴(Turn 1)에서는 붙이지 마. 최소 한 번은 더 들어.
```

### 4.4 phase-signal.ts — 새 태그 파싱

```typescript
// 기존 MIND_READ_READY 대신 SITUATION_CLEAR 파싱
const SITUATION_CLEAR_REGEX = /\[SITUATION_CLEAR:([^|]+)\|([^\]]+)\]\s*/;

// parsePhaseSignal() 내
const situationMatch = SITUATION_CLEAR_REGEX.exec(cleaned);
let situationClear = false;
let situationSummary = '';
let coreProblem = '';
if (situationMatch) {
  situationClear = true;
  situationSummary = situationMatch[1].trim();
  coreProblem = situationMatch[2].trim();
  cleaned = cleaned.replace(SITUATION_CLEAR_REGEX, '').trim();
}

// 기존 mindReadReady도 호환성을 위해 유지
const mindReadReady = MIND_READ_REGEX.test(cleaned) || situationClear;
```

### 4.5 pipeline/index.ts — 이벤트 발동 변경

```typescript
// 기존: createMindReading(surface, deep, avgScore, reason)
// 변경: createSituationSummary(summary, problem, score, sticker)

if (hlrePost.mindReadReady && canFireEventType('EMOTION_THERMOMETER')) {
  // 스티커 자동 선택
  const sticker = avgScore <= -3 ? 'comfort' 
    : avgScore <= -1 ? 'think'
    : 'think';
  
  eventsToFire.push(createSituationSummary(
    hlrePost.situationSummary ?? surface,
    hlrePost.coreProblem ?? deep,
    avgScore,
    sticker,
  ));
  updatedCompletedEvents.push('EMOTION_THERMOMETER');
}
```

### 4.6 스티커 선택 로직

| emotionScore | 루나 감정 | 스티커 |
|-------------|----------|--------|
| ≤ -4 | 매우 힘듦 | comfort (토닥) |
| -3 ~ -2 | 힘듦 | think (생각) |
| -1 ~ 0 | 보통 | think (생각) |
| ≥ 1 | 괜찮음 | proud (뿌듯) |

---

## 5. HOOK Purpose 전체 재설계 (전환 조건 중심)

### 5.1 기존 MIND_READ_READY 섹션 → SITUATION_CLEAR로 교체

```
### 🌬️ 상황이 파악되면 — [SITUATION_CLEAR]

대화하다 보면 동생의 상황이 **한 문장으로 정리**돼:
"이 사람은 ○○ 때문에 ○○한 거구나."

이게 되면 → 그 응답 끝에 [SITUATION_CLEAR:상황|문제] 태그를 붙여.

이건 깊은 감정을 읽는 게 아니야. **전체 그림을 파악한 거야.**
"누가, 무슨 일이 있었고, 뭐가 제일 힘든지" — 이 세 가지가 보이면 충분해.

대부분 1-2턴이면 돼. 유저가 상황을 말했으면 이미 알고 있는 거야.
"더 들어야 할 것 같은데"는 회피야. 파악됐으면 태그 붙여.

예시:
"남친이 3일째 연락이 없어서 불안해" →
[SITUATION_CLEAR:남친 3일 연락 두절로 불안|연락 없음이 무관심으로 느껴지는 불안]

"여친이 전 남친을 만나는 게 싫은데 말 못 함" →
[SITUATION_CLEAR:여친의 전 남친 만남에 질투+불안|질투를 말하면 쪼잖아 보일까봐 참는 중]

⚠️ Turn 1에서는 붙이지 마. 최소 한 번은 반응하고.
⚠️ 유저가 "그리고 또..." 하면서 더 말하고 싶어 보이면 기다려.
```

### 5.2 전환 후 MIRROR에서의 활용

상황 파악 카드에서 수집된 `situationSummary`와 `coreProblem`을 MIRROR의 시작점으로 사용:

MIRROR 진입 시:
```
"자 이제 네 상황은 이해했어.
[상황요약]인 거잖아.
근데 있잖아... 여기서 진짜 중요한 건 [핵심문제]거든.
이 부분 좀 더 깊이 얘기해볼래?"
```

→ HOOK에서 파악한 "전체 그림"을 기반으로 MIRROR에서 "깊은 감정"을 탐색

---

## 6. 프론트엔드 변경 (최소)

### 6.1 기존 EmotionThermometer.tsx 재활용

`eventStyle: 'situation_summary'`인 경우 다른 UI:

```
┌─────────────────────────────┐
│ [루나 스티커: think 🤔]      │
│                              │
│ "야 내가 들은 거 정리해볼게" │
│                              │
│ 📋 내가 이해한 상황:         │
│ "{situationSummary}"         │
│                              │
│ 🎯 핵심:                     │
│ "{coreProblem}"              │
│                              │
│ [맞아!] [좀 다른데] [더 있어] │
└─────────────────────────────┘
```

### 6.2 기존 UI와의 호환

- `type: 'MIND_READING'` 유지 → 기존 프론트엔드 렌더링 경로 재활용
- `eventStyle` 필드 추가로 새 UI/기존 UI 분기
- 기존 선택지 핸들러 재활용 (confirm/different/more)

---

## 7. 구현 로드맵

### Day 1: 코어 변경 (백엔드)
1. events.ts — `createSituationSummary()` 함수 추가
2. cognition-prompt.ts — HOOK Purpose 태그 변경 ([MIND_READ_READY] → [SITUATION_CLEAR])
3. phase-signal.ts — 새 태그 파싱 추가
4. pipeline/index.ts — 이벤트 발동 로직 변경

### Day 2: 프롬프트 + 프론트엔드
5. cognition-prompt.ts — HOOK Purpose 전환 조건 재작성
6. EmotionThermometer.tsx — situation_summary 스타일 분기 추가

### Day 3: 테스트 + 튜닝
7. 다양한 시나리오 테스트
8. 전환 속도 측정
9. 프롬프트 미세 조정

---

## 8. 기대 효과

| 지표 | 현재 | 목표 |
|------|------|------|
| HOOK→MIRROR 평균 턴 수 | 4~6턴 (추정) | **2~3턴** |
| 이벤트 "맞아" 선택율 | 60% (추정) | **80%+** |
| 유저 이탈률 (HOOK 내) | baseline | -30% |
| "이 AI가 나를 이해했다" 느낌 | 약함 | 강함 |

---

*작성: 2026-04-13*
*버전: v4.0 — Situation Summary Card*
*핵심: 감정 읽기 → 상황 파악으로 전환 기준 변경*
