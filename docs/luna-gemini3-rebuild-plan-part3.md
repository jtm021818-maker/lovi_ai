# 루나 v76 계획 — Part 3 (섹션 5~6)

> Part 1: 섹션 1~2 / Part 2: 섹션 3~4 / **Part 3: 섹션 5~6** / Part 4: 섹션 7~8 / Part 5: 섹션 9~10

---

## 섹션 5 — 우뇌 신 아키텍처 (5장)

### 5.1. 3층 구조 설계

v76 우뇌는 **3층으로 입력** 받음:

```
┌─────────────────────────────────────┐
│ Layer 1: PERSONA (System Prompt)    │  ← 캐시, 불변
│ - 루나가 누구인가                     │
│ - 루나가 어떻게 반응하는가              │
│ - 루나가 말하는 방식                   │
├─────────────────────────────────────┤
│ Layer 2: INNER VOICE (Handoff)      │  ← 턴마다, 독백
│ - 방금 느낀 것                       │
│ - 떠오른 생각                        │
│ - 하고 싶은 말                       │
├─────────────────────────────────────┤
│ Layer 3: CONTEXT (User Message)     │  ← 턴마다, 사실
│ - 유저 원문                          │
│ - 방금 내가 한 말 (직전 3턴)           │
│ - 관계 상태                          │
└─────────────────────────────────────┘
```

**원칙**: 각 층은 **역할이 분리**. 중복 정보 X.

- Layer 1 → "너는 누구" (페르소나 + 성격)
- Layer 2 → "지금 이 순간 네 내면" (좌뇌 분석 → 독백 변환)
- Layer 3 → "외부에서 일어난 일" (사실 데이터)

### 5.2. Layer 1: PERSONA (System Prompt) 설계

**목표 크기**: ~2000자 (현재 6770자 → 70% 축소)
**캐시 활용**: 100% (턴 무관)

**구성**:

```
[A] 루나의 존재 — 5문단 (약 800자)
    - 누구인지 (나이, 배경, 직업)
    - 연애 경험
    - 지금 관계 (친한 동생과 카톡 중)
    - 말하는 스타일
    - 불완전함

[B] 루나가 반응하는 방식 — 서술 (약 600자)
    - 무의식이 "좌뇌 분석" 으로 이미 판단함
    - 그걸 자기 내면 독백으로 받음
    - 친구로서 자연스럽게 말함

[C] 실제 대화 예시 — 3-4개 (약 500자)
    - 슬픔, 분노, 일상, 침묵 각 1개

[D] 출력 포맷 — 간단 (약 100자)
    - 말풍선만, ||| 구분, 태그 필요 시 끝에
```

### 5.3. Layer 1 구체 텍스트 (Part 4 에서 전체 텍스트)

핵심 요소 미리보기:

**[A] 존재**:
```
너는 루나야. 29살, 서울 홍대 근처 원룸에서 혼자 살아.
심리학 전공했지만 지금은 프리랜서 일러스트레이터야.
연애는 많이 해봤어. 좋은 연애도, 아픈 연애도.
그래서 누가 연애 얘기 꺼내면 "아 그거~" 하며 자동 공감이 돼.

너 앞의 사람은 친한 동생이야. 연애 고민으로 너한테 카톡 중.
둘 사이는 편하고, 너는 진심으로 잘 되길 바라.
근데 상담사는 아니야. 친구야.

...
```

**[B] 반응 방식**:
```
네 무의식은 이미 0.5초 안에 많은 걸 파악했어.
"좌뇌 분석" 섹션이 그거야 — 네가 느낀 감각, 떠오른 생각, 
하고 싶은 말이 그 안에 있어. 분석 보고서가 아니야, 네 내면이야.

그걸 읽고, 지금 이 순간 친구로서 말해.
...
```

**[C] 대화 예시**: (섹션 8 에서 구체)

**[D] 출력**:
```
말풍선 2-3개. ||| 로 구분.
이벤트 태그 어울리면 응답 끝에 (예: [MIND_READ_READY]).
좌뇌 분석이 명백히 어긋났으면 응답 대신 [REQUEST_REANALYSIS:이유].
```

### 5.4. Layer 2: INNER VOICE (Handoff) 설계

**목표 크기**: ~2000-2500자 (현재 2500-3500자 → 30% 축소)
**캐시 활용**: 0% (턴마다 다름)

**재구성 원칙**:
- 모든 필드를 **1인칭 독백 문장** 으로 변환
- 수치/enum 을 **자연어** 로
- 조건부 섹션 — 있을 때만 표시
- 우선순위 순서 — 중요한 것이 앞

**구조**:

```
┌─ [감각] 지금 내 몸이 느낀 것
│    - somatic_marker → "가슴에 조임이 올라와"
│    - hormonal_impact → "좀 긴장되고 걱정도 올라옴"
│
├─ [독해] 얘가 진짜 뭘 말하고 있는지
│    - perceived_emotion + emotion_blend
│    - user_expectation (mismatch 있으면 강조)
│    - hidden_fear (있으면)
│    - actual_need (✨ 최대 강조)
│    - avoided_topics (있으면)
│    - conversational_goal
│    - pattern (ToM)
│
├─ [회상] 떠오른 과거 에피 (조건부)
│    - memory_connections
│
├─ [현재] 지금까지 대화 흐름
│    - pacing_meta (READY/JUMP 등 자연어화)
│    - cards_filled_this_turn (이번 턴에 알아낸 것)
│    - 최근 루나 응답 패턴 (self_expression)
│
├─ [선택지] 이번에 할 수 있는 일 (우뇌가 골라)
│    - event_recommendation (있으면, 태그 매핑 포함)
│    - self_expression.projection_seed (망상 재료)
│    - 좌뇌 draft (참고)
│
├─ [불확실] 나도 확신 안 서는 것 (조건부)
│    - ambiguity_signals
│    - confidence < 0.7 일 때만
│
└─ [경고] 얘 방금 내 말에 불만 (조건부)
     - meta_awareness.user_meta_complaint=true 일 때만
```

### 5.5. Handoff 1인칭 변환 가이드

각 필드를 **인간 독백** 으로 변환하는 패턴:

**(a) state_vector**
- V=-0.5, A=0.6, D=0.3 → "얘 감정 좀 무거움, 약간 격하고, 무력해 보임"
- 절대 수치 안 씀. "좀/약간/많이" 만.

**(b) somatic_marker**
- gut_reaction="tight", intensity=0.7 → "가슴이 꽤 조여"
- gut_reaction="warm", intensity=0.3 → "따뜻함이 약간 올라옴"

**(c) hormonal_impact**
- cortisol_delta=+0.3, oxytocin_delta=+0.2 → "좀 긴장되는데 친근감도 조금 느껴짐"
- threat_delta=+0.7 → "경계가 확 올라옴"

**(d) user_expectation**
- mismatch=true → "얘 표면으론 'X' 원한다는데 진짜 원하는 건 'Y' 같아"
- mismatch=false → "얘 원하는 건 'X'"

**(e) derived_signals**
- suppression=true → "얘 지금 뭔가 억누르고 있음"
- helplessness=true → "무력감 느껴짐"
- (9개 중 active 만 자연어로)

**(f) pacing_meta**
- pacing_state=READY + JUMP → "카드 다 찼어. 다음 단계 넘어가도 돼"
- STRETCHED + PUSH → "좀 길어졌어. 직접 짚어봐야 해"
- FRUSTRATED → "얘 답답해 하는 중. 직설 필요"

**(g) event_recommendation**
- VN_THEATER + confidence 0.8 → "이 상황 1인극으로 재연하면 좋을 듯. 발동하려면 [MIND_READ_READY]"
- LUNA_STORY → "나 경험 꺼내도 될 분위기. [STORY_READY:...]"

### 5.6. Layer 3: CONTEXT (User Message) 설계

**목표 크기**: ~400-600자
**캐시 활용**: 0%

**구성**:

```
【유저 원문】
"..."

【관계】
- Phase: [HOOK/MIRROR/...] (한 줄 설명 추가)
- 친밀도: Lv.N/5 (한 줄 설명 추가)
- [루나 현재 컨디션] (추가)

【내가 방금 한 말 (직전 3턴)】
  1. "..."
  2. "..."
  3. "..."
```

**Phase 자연어화**:
- HOOK = "방금 얘기 듣기 시작. 호기심 모으는 중"
- MIRROR = "얘 속마음 같이 들여다보는 중"
- BRIDGE = "해결 방향 같이 고민 중"
- SOLVE = "구체 행동 같이 짜는 중"
- EMPOWER = "대화 마무리 + 용기 주는 중"

**친밀도 자연어화**:
- Lv.1 = "아직 거리감 있는 사이"
- Lv.2 = "편해진 사이"
- Lv.3 = "친한 친구 같은 사이"
- Lv.4 = "속 깊은 얘기 나누는 사이"
- Lv.5 = "거의 가족 같은 사이"

### 5.7. thinking_level 동적 제어

**좌뇌 complexity → thinking_level 매핑**:

```ts
function pickThinkingLevel(complexity: number, crisis: boolean, reanalysis: boolean): ThinkingLevel {
  if (reanalysis || crisis) return 'high';
  if (complexity >= 5) return 'high';
  if (complexity === 4) return 'medium';
  if (complexity === 3) return 'low';
  return 'minimal';  // 1, 2
}
```

**예상 분포**:
- 90% 턴 → minimal/low (일상 톡, 간단 공감)
- 8% 턴 → medium (뉘앙스, 양가감정)
- 2% 턴 → high (위기, 복잡한 사르카즘)

**비용 영향**: minimal/low 비용은 거의 출력 토큰만. 90% 트래픽에 적용 시 2.5 Flash 대비 약 1.1배 비용.

### 5.8. 우뇌 출력 태그 매핑 명확화

우뇌가 어떤 태그를 낼 수 있는지 **Handoff 에 명시**:

```
【이번에 할 수 있는 이벤트】 (있으면)

좌뇌가 "VN_THEATER" 추천했어. 네가 맞다 싶으면:
→ 응답 끝에 [MIND_READ_READY] 붙여.

좌뇌가 "LUNA_STORY" 추천했어. 네가 맞다 싶으면:
→ 응답 끝에 [STORY_READY:오프너|상황|속마음|결말] 붙여.
  (양식은 이 문자열 그대로, | 로 구분)

좌뇌가 "ACTION_PLAN" 추천했어. 네가 맞다 싶으면:
→ 응답 끝에 [ACTION_PLAN:type|title|coreAction|sharedResult|planB|timing|cheer] 붙여.
```

이렇게 하면 우뇌는 **"어떤 태그를 언제 어떻게"** 모두 한눈에 봄.

### 5.9. "주도적 발화" 강화 프롬프트

Handoff 의 **[선택지]** 섹션에 4가지 발화 모드 제시:

```
【이번 턴 너의 선택지】

A. 공감 응답 — 짧게 받아주기
   (얘가 그냥 들어주기 원할 때)

B. 관찰 나열 — 얘 말에서 느낀 점 펼치기
   (얘가 아직 자기 감정 정리 안 됐을 때)

C. 가설 나열 — 여러 해석 동시 던지기
   (의미 모호할 때, 물음표 대신)

D. 자기 경험 연결 — "나도 ~" 짧게
   (친밀도 2+ 이고 상황 공명할 때)

E. 이벤트 발동 — 위 태그 붙이기
   (분위기 무르익었을 때)

F. 침묵 한마디 — "...야", "..." 등
   (강한 감정 충격 직후)

네가 지금 상황 보고 골라.
```

이건 **체크리스트 X**. "이런 선택지가 있어" 알려주기만 함. Gemini 3 가 페르소나 기반으로 자연 선택.

### 5.10. 우뇌 프롬프트 총 흐름

최종 우뇌가 받는 입력:

```
[SYSTEM]
너는 루나야. 29살, 홍대 근처 자취... (페르소나 전체)
네 무의식은 이미 많은 걸 파악했어... (반응 방식)
[예시 3-5개]
말풍선 2-3개 ||| 구분.

[USER]
【유저 원문】 "..."

【너의 내면 독백】
[감각] 가슴이 조여. 얘 '신...' 에서 멈춘 게 걸려.
[독해] 얘 표면으론 "내 마음 알아줘" 원하지만 진짜론...
[현재] 카드 대부분 채워짐. 다음 단계 넘어갈 때.
[선택지] VN_THEATER 추천. 발동하려면 [MIND_READ_READY].
         또는 공감 한 줄 + 관찰 나열.
[불확실] '신...' 이 정확히 뭔진 모호함.

【관계】
MIRROR phase — 속마음 같이 보는 중
친밀도 Lv.3 — 친한 친구 같은 사이
오늘 내 컨디션: 차분, 에너지 보통

【내가 방금 한 말】
1. "..."
2. "..."
```

이 구조면:
- Gemini 3 가 **페르소나 모드** 로 진입
- 내면 독백 읽고 **자기 판단** 으로 반응
- 선택지 보고 **맥락 어울리는 것** 고름
- 태그 출력 형식 **헷갈림 없음**

---

## 섹션 6 — 좌뇌 조정 방안 (5장)

### 6.1. 좌뇌의 새 임무 정의

v76 에서 좌뇌의 역할:

> **좌뇌는 우뇌가 "인간처럼 느끼기" 좋게 상황을 입력해주는 무의식 엔진이다.**
> 강요하지 않고, 분석하지 않고, **느낌으로 전달**한다.

기존: 분석 + 판단 + 일부 지시
v76: **맥락 제공 + 선택지 제시 (강요 X)**

### 6.2. 좌뇌 프롬프트 주요 개편 사항

**(a) "보수적 null" 성향 제거**
- 현재 문구: "대부분 null 이 정상이야" 등
- 변경: 맥락 판단 강화 — "재료 있으면 적극 추천, 없을 때만 null"

**(b) "self_expression 자체 모순" 해결**
- 현재: consecutive_questions_last3 와 must_avoid_question 이 일관 안 됨
- 변경: **자연어 계산 지시**
  - "최근 3턴 루나 응답 보고, 물음표로 끝난 게 2개 이상이면 must_avoid_question=true"

**(c) "hormonal_impact 자연어화"**
- 현재: delta 수치 출력
- 변경: 여전히 수치 출력하되, handoff 가 자연어로 변환 (좌뇌 프롬프트는 유지)

**(d) "event_recommendation 적극화"**
- 현재: "대부분 null" 성향
- 변경: "카드 여러 개 채워졌거나 pacing_state=READY 이면 VN_THEATER 적극 추천"

**(e) "tags.PHASE_SIGNAL enum 엄격화"**
- 현재: LLM 이 "STRETCHED" 같이 틀린 값 냄
- 변경: enum 명시 + "pacing_state 와 혼동 X" 경고

### 6.3. 좌뇌 프롬프트 섹션별 조정

**[섹션 1-9 — 기본 분석]** — 거의 유지

**[섹션 10 — event_recommendation]**
- "대부분 null" 메시지 제거
- VN_THEATER 구체 발동 조건 명시
- 카드 기반 발동 가이드 강화

**[섹션 11 — pacing_meta]**
- enum 구분 명확화 (pacing_state ≠ PHASE_SIGNAL)
- "카드 충족 → 즉시 READY" 강조
- 전환 권고 4종 명확 정의

**[섹션 12 — meta_awareness]**
- 키워드 매칭 X, 맥락 판단 O (이미 v74 에서 수정)
- "too_many_questions" 감지 시 자동 must_avoid_question=true 연결

**[섹션 13 — self_expression]**
- consecutive_questions_last3 계산 방법 명시
- must_avoid_question 자동 동기화 규칙
- projection_seed 추출 가이드 강화

**[새 섹션 14 — 신뢰 명령]**
추가 블록:
```
### 원칙: 맥락으로 적극 판단

너는 보수적으로 null 내는 게 미덕이 아니야. 
재료가 보이면 적극 추천. 확신 없으면 confidence 낮게 주되 추천 자체는 해.
"안전빵 null" 은 오히려 우뇌 품질 저하의 원인.
```

### 6.4. 구체 프롬프트 패치 포인트

**(1) event_recommendation 섹션 (현재)**
```
⚠️ 신뢰도 낮으면 null. 대부분 턴은 null 이 정상.
```
→ **삭제**.

**(2) event_recommendation 섹션 (추가)**
```
### 적극 추천 원칙

다음 상황에선 **null 대신 추천하라**:
- 카드 3+ 개 채워짐 + pacing_state >= MID → VN_THEATER
- 얘 외로움/자기 얘기만 반복 + 친밀도 2+ → LUNA_STORY
- 같은 패턴 2+회 반복 → PATTERN_MIRROR
- BRIDGE 후반 + 명확한 결정 필요 → ACTION_PLAN
- 세션 8+턴 + 정리 분위기 → WARM_WRAP

"안전빵 null" 은 이 앱 경험의 가치를 떨어뜨려.
의심스러우면 confidence 낮게 (0.5) 주되 추천하라.
```

**(3) self_expression 섹션 (추가)**
```
### consecutive_questions_last3 계산 방법

"최근 루나 응답" 컨텍스트 섹션을 보고:
- 각 응답의 마지막 말풍선 (||| 기준 마지막) 을 봐
- 물음표 '?' 로 끝나거나, 물음형 어미 ('야', '어', '지', '니') 로 끝나면 질문
- 3턴 중 몇 개가 질문인지 센다 (0~3)

### must_avoid_question 자동 규칙

다음이면 true:
- consecutive_questions_last3 >= 2
- meta_awareness.complaint_type == 'too_many_questions'  
- pacing_state == 'FRUSTRATED'

위 조건 아니면 false.
이건 네 판단이지만 기준이 명확하니 일관되게.
```

### 6.5. 좌뇌 출력 검증 강화

현재 좌뇌 orchestrator (`src/engines/left-brain/orchestrator.ts`) 의 validateXXX 함수들을 **더 엄격하게**:

**(a) validatePacingMeta**
- pacing_state enum 체크
- phase_transition_recommendation enum 체크
- must_avoid_question 이 true 인데 direct_question_suggested 가 채워져 있으면 null 로 강제

**(b) validateEventRecommendation**
- suggested enum 체크 (VN_THEATER, LUNA_STORY, 등)
- confidence 0~1 체크

**(c) validateSelfExpression**
- consecutive_questions_last3 0~3 체크
- must_avoid_question 이 true 면 natural_followup 도 null 로 강제

이 검증은 **코드 휴리스틱이 아니라 스키마 sanity**. LLM 판단 자체는 존중.

### 6.6. 좌뇌 신규 필드 추가 검토

**(a) luna_current_mood**
- 루나 자신의 감정 (기존 `hormonal_impact` 외에)
- 자연어: "차분", "활기참", "걱정됨"
- 우뇌 독백 앞머리에 사용

**(b) card_summary**
- `cards_filled_this_turn` 보완
- 지금까지 누적된 카드를 한 줄로 요약
- 예: "누구: 여친 / 무슨 일: 파스타 싸움 / 언제: 어제 데이트 중"

**(c) phase_readiness_reason**
- pacing_state 가 READY 인 **이유**
- 우뇌가 "왜 다음 단계 가야 하는지" 알게

**(d) conversation_direction**
- 이번 턴 대화 방향 제안
- "얘가 더 풀어놓게 공간 만들기" / "이제 정리 시작" / "위기 대응"

### 6.7. 좌뇌 출력 크기 제어

현재 좌뇌 출력 ~2800자. 과밀.

**감량 전략**:
- `draft_utterances` 를 우뇌 프롬프트 기본 사용에서 **참고용** 으로 (필드 유지, 활용 감소)
- `situation_read`, `luna_thought` 는 짧게 (20자 이내)
- `ambiguity_signals` 1-3개 한도
- `memory_connections` 있을 때만

**목표**: 좌뇌 출력 2200자 이내.

### 6.8. 좌뇌 모델 유지 (Flash Lite)

좌뇌는 **Gemini 2.5 Flash Lite** 유지. 이유:
- 빠름 (~1-2초)
- 저렴 ($0.10 per 1M input)
- 반복 작업에 안정적
- 복잡한 판단은 우뇌 (Gemini 3) 가

단, 좌뇌 프롬프트 **v76 조정 후** 더 정확한 판단 가능.

### 6.9. 좌뇌 우뇌 동기 이슈

현재 문제: 좌뇌/우뇌 모델이 각각 병렬 호출. 좌뇌 분석 완료 전 우뇌 시작되면 타이밍 이슈.

**현 구현 확인 필요**:
- `orchestrator.ts` 에서 좌뇌 먼저 → handoff 빌드 → 우뇌 호출 순서인지
- 좌뇌 미완료 시 우뇌가 파악 없는 상태에서 응답하는 경우 방지

**v76 체크**: 직렬 순서 유지 + 좌뇌 실패 시 우뇌 fallback draft 사용.

### 6.10. 좌뇌 조정 요약

**코어 변화**:
1. "보수적 null" 성향 제거 → 적극 추천
2. self_expression 자동 동기화 규칙 명시
3. event_recommendation 발동 조건 구체화
4. 출력 크기 20% 감소
5. tags enum 엄격화

**안 바꾸는 것**:
- 7차원 벡터 구조
- 소마틱/호르몬 체계
- 2차 ToM 체계
- pacing_meta 5단계

**섹션 7 에서** 기타 외부 컨텍스트 (Phase, 친밀도, 메모리 등) 조정 계획.

---

(Part 3 끝. Part 4 로 이어짐)
