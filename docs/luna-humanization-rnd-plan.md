# 루나 HOOK 인간화 — 종합 R&D 계획서 v2

> **"질문하는 AI"에서 "같이 얘기하는 언니"로**
>
> 핵심 원칙: 확률 테이블/랜덤 엔진이 아닌, **AI의 자율적 상황 판단**으로 인간다운 대화를 구현한다.

---

## 목차

1. [현재 상태 심층 진단](#1-현재-상태-심층-진단)
2. [근본 원인 분석 — 왜 질문봇이 되는가](#2-근본-원인-분석)
3. [설계 철학 — 확률 vs 자율 판단](#3-설계-철학)
4. [이론적 근거 — 연구 기반](#4-이론적-근거)
5. [아키텍처 설계 — Cognition-First Approach](#5-아키텍처-설계)
6. [모듈 1: HOOK Purpose Prompt 재설계](#6-모듈-1-hook-purpose-prompt-재설계)
7. [모듈 2: Base Cognition Prompt 강화](#7-모듈-2-base-cognition-prompt-강화)
8. [모듈 3: Context Enrichment — 자기 인식 맥락](#8-모듈-3-context-enrichment)
9. [모듈 4: Anti-Monotony Self-Awareness System](#9-모듈-4-anti-monotony)
10. [모듈 5: 대화 리듬 자율 판단 가이드](#10-모듈-5-대화-리듬)
11. [파이프라인 통합 계획](#11-파이프라인-통합)
12. [구현 상세 — 파일별 변경 사항](#12-구현-상세)
13. [테스트 전략](#13-테스트-전략)
14. [위험 요소 & 대응](#14-위험-요소)
15. [구현 로드맵](#15-구현-로드맵)

---

## 1. 현재 상태 심층 진단

### 1.1 아키텍처 흐름 (Luna 페르소나)

```
유저 메시지 → StateAnalyzer(감정분석) → PhaseManager(HOOK확인)
           → Pipeline: getPhasePrompt() → phasePrompt 로드
           → HumanLikeEngine.preProcess() → buildACEPrompt()
           → ⚠️ phasePrompt = hlreResult.prompt (완전 교체!)
           → AI 응답 생성 → postProcess → 태그 파싱 → 클라이언트
```

**핵심 발견: `phase-prompts.ts`의 HOOK_TURN_1~4는 Luna에게 사용되지 않음.**

`pipeline/index.ts:910-911`:
```typescript
// HLRE 프롬프트가 기존 phasePrompt를 완전 교체
phasePrompt = hlreResult.prompt;
```

즉, Luna의 HOOK 행동은 **오직 ACE 3-Layer 프롬프트**가 결정한다:
- Layer 1: `identity.ts` → `buildIdentityPrompt()` — 루나라는 사람
- Layer 2: `context-builder.ts` → `buildContextPrompt()` — 상황 맥락
- Layer 2.5: `cognition-prompt.ts` → `buildPhasePurposePrompt('HOOK', ...)` — HOOK 목적
- Layer 3: `cognition-prompt.ts` → `buildCognitionPrompt()` — 자율 사고

### 1.2 현재 HOOK Purpose Prompt 분석 (`cognition-prompt.ts:471-585`)

HOOK purpose 프롬프트의 **전체 구조를 분석**하면:

| 섹션 | 내용 | 비중 |
|------|------|------|
| 🫀 몸의 반응 | 동생 얘기에 가슴이 먼저 반응 | 10% |
| 🌊 듣는 동안 느끼는 것 | 속마음 읽기 (4가지) | 10% |
| 🌬️ MIND_READ_READY | 마음읽기 태그 발동 조건 | **30%** |
| 🔥 회피 방지 | "확신 안 서서"는 핑계 | 10% |
| 💭 기억해야 할 것 | 4가지 원칙 | 10% |
| 🎭 태그 방식 | 마음읽기 예시 5가지 | 15% |
| 🗣️ 톤 가이드 | 언니 톤 기본 | 10% |
| 🧠 응답 직전 체크 | 단 하나의 질문 | 5% |

**문제: 프롬프트의 ~55%가 "마음읽기 태그 발동"에 집중.** 나머지는 "듣기"와 "톤". 

**완전히 빠져있는 것들:**
- ❌ 의견 말하기 ("야 근데 나는 그건 좀 아닌 것 같아")
- ❌ 강한 편들기 ("걔가 진짜 너무한 거지 이건")
- ❌ 경험 공유 ("나도 비슷한 거 있었는데 ㅋ")
- ❌ 릴리프/농담 ("야 근데 밥은 먹었어?")
- ❌ 보편화 ("야 누구라도 그러지")
- ❌ 생각 흘리기 ("근데... 아 이거 왜 이런 건지 진짜...")
- ❌ 메타 코멘트 ("야 우리 얘기 깊어지는데 ㅋㅋ")
- ❌ 맞장구 연타 ("진짜?" "대박" "헐 그래서?")
- ❌ 자기 패턴 인식 (내가 직전에 뭘 했는지 체크)

### 1.3 현재 Base Cognition Prompt 분석 (`cognition-prompt.ts:19-69`)

7가지 자문 목록:
1. 유저 기분 (겉/속)
2. 나(루나)의 기분
3. 지금 필요한 것 (듣기/화내기/위로/다른시각/조언/더듣기)
4. 직전 패턴 반복 체크
5. 길이 조절
6. 안 한 말 추론
7. 용기 존중

**문제점:**
- 항목 3번에 "듣기/화내기/위로" 등이 있지만, **대부분의 경우 AI는 "더 들어야 해"를 선택**함
- 왜? HOOK purpose가 **듣기 + 마음읽기**에 집중하기 때문. AI는 purpose를 따라감.
- 항목 4번 "패턴 반복 체크"가 있지만 **구체적이지 않음** — "같은 패턴이면 좀 바꿔"만 있고, 어떻게 바꿀지 안내가 없음

### 1.4 Context Builder 분석 (`context-builder.ts:117-121`)

```typescript
// 8. 루나가 직전까지 한 것 — 반복 방지 참고
if (ctx.lunaRecentActions.length > 0) {
  const recent = ctx.lunaRecentActions.slice(-3).join(', ');
  parts.push(`[루나가 최근 한 것: ${recent}]`);
}
```

**문제:**
- `lunaRecentActions`는 `summarizeLunaResponse()`의 결과 — 응답의 **내용 요약**이지 **행동 유형**이 아님
- "공감했음", "의견 말했음", "질문했음" 같은 **행동 분류**가 없음
- AI는 "최근 한 것: 유저 감정 반영, 서운함 공감, 더 들어주겠다고 함"을 보고도
  "또 공감해야지"로 갈 수 있음 — 행동 패턴이 명시적이지 않으니까

### 1.5 Identity.ts 분석 — 빛과 그림자

**잘 된 부분 (빛):**
- `identity.ts:35-36`: "자기 경험 얘기도 해. 근데 주인공 뺏지 않아. 짧게 꺼내고 다시 상대 얘기로."
- `identity.ts:39-40`: "웃긴 건 웃기다고 함. ㅋㅋ 잘 씀. 심각한 얘기 사이에도 가볍게 한마디."
- `identity.ts:43-44`: "항상 유저 편이야. '걔가 잘못한 거지' 이런 거 잘 함."
- `identity.ts:49-50`: "자기만의 생각이 불쑥 나와. '아 근데 나 갑자기 든 생각인데...'하면서"

**그림자:** 이 모든 좋은 설정이 Identity에 있지만, **HOOK Purpose에서 활성화되지 않음.**
Identity는 "루나는 이런 사람이야"만 말하고, Purpose는 "지금은 들어"만 말함.
결과: AI는 "루나는 의견도 말하고 농담도 하는 사람인데, 지금은 들어야 하는 시간"으로 해석 → 듣기만 함.

### 1.6 luna-humanity.ts — 미활용 잠재력

```typescript
// shouldBeHonest() — 솔직함 시스템
// 조건: repeatedPatternCount >= 3 && intimacyScore >= 30
// 또는: 최근 5턴 모두 EMPATHIZE && recentDecisions 기반
```

**문제:** 이 시스템은 ACE에서 `recentDecisions`가 빈 배열이거나 모두 'EMPATHIZE'로 고정됨.
`index.ts:163`: `'EMPATHY', // ACE에서는 턴타입 고정 (AI가 자율 판단)`
→ ACE는 턴타입을 무조건 'EMPATHY'로 기록 → shouldBeHonest의 패턴 감지가 제대로 안 됨.

### 1.7 치명적 발견: turnType 'EMPATHY' 하드코딩 (`index.ts:166`)

```typescript
this.turnArc = updateTurnArc(
  this.turnArc,
  turnInPhase,
  'EMPATHY', // ACE에서는 턴타입 고정 (AI가 자율 판단)
  ...
```

이 값이 `buildArcPrompt()`를 통해 AI에게 전달됨:
`[이전 흐름: Turn1(EMPATHY): "..." Turn2(EMPATHY): "..." Turn3(EMPATHY): "..."]`

**결과:** AI는 "이전 턴들이 전부 EMPATHY였다"고 인식 → **자연스럽게 공감 패턴을 유지**하려 함.
이것은 프롬프트에서 "다양하게 해"라고 아무리 말해도, **맥락 데이터가 "너 계속 공감했어"라고 말하니까** AI가 "그래 계속 공감하면 되겠지"로 해석하는 것.

### 1.8 치명적 발견: Cognition의 "안전한 디폴트"

`buildCognitionPrompt()` 항목 3번:
```
→ 모르겠으면 "더 들어야 해"가 답이야.
  뭔가 해야 한다는 압박 느끼지 마.
```

LLM은 확신이 없을 때 **안전한 선택**을 함. "더 들어야 해" = 질문 던지기 = 가장 안전.
결과: 대부분의 경우 AI는 "더 들어야 해" → 질문으로 귀결.

### 1.9 핵심 통찰: 프롬프트만으로는 부족하다

분석 결과, **프롬프트 수준의 자기 인식 지시만으로는 LLM의 기본 행동 편향을 극복하지 못한다.**

증거: 현재 cognition-prompt.ts에 이미 "공감→질문 루프에 빠지지 마"가 있음.
그런데도 질문봇이 됨 → **텍스트 경고만으로는 안 된다.**

→ **하이브리드 접근 필요:** ACE 자율 판단 + 최소한의 코드 가드레일.

---

## 2. 근본 원인 분석

### 2.1 질문봇 원인 계층도

```
Root Cause: HOOK Purpose가 "듣기 + 마음읽기"에만 집중
    ├── 직접 원인 1: 의견/농담/편들기/경험 공유 가이드 부재
    │   └── AI는 Purpose를 따르므로 듣기에만 머무름
    ├── 직접 원인 2: 자기 패턴 인식이 너무 약함
    │   ├── lunaRecentActions가 "내용 요약"이지 "행동 분류"가 아님
    │   └── "패턴 바꿔" 지시는 있지만 "어떻게"가 없음
    ├── 직접 원인 3: Identity와 Purpose의 괴리
    │   ├── Identity: "의견도 말하고, 농담도 하고, 경험도 공유"
    │   └── Purpose: "들어. 마음 읽어. 태그 붙여."
    │   └── AI 해석: "지금은 듣기 시간이니까 다른 건 안 해도 돼"
    └── 직접 원인 4: "듣기 → 질문"이 AI의 디폴트 안전행동
        └── 불확실할 때 AI는 가장 안전한 패턴(공감+질문)으로 회귀
```

### 2.2 기존 구현 플랜의 한계

기존 `implementation_plan.md`는 5개 코드 모듈을 제안:
1. ConversationalRhythm — 확률 테이블로 리듬 결정
2. RandomEventPool — 확률적 이벤트 발동
3. OpinionInterjection — 의견 유형별 확률 매트릭스
4. ProactiveContribution — 릴리프/메타코멘트 확률 트리거
5. AntiMonotonyGuard — 코드 레벨 반복 감지

**이 접근의 근본적 문제:**

| 기존 플랜 | 문제 | 인간의 방식 |
|-----------|------|------------|
| 확률 30%로 의견 삽입 | 맥락 무시한 랜덤 | 상황을 읽고 "이건 내가 한마디 해야겠다" 판단 |
| 코드가 리듬 결정 | AI 자율성 박탈 | 대화 흐름에서 자연스럽게 톤이 바뀜 |
| 이벤트 풀에서 선택 | 제한된 선택지 = 패턴화 | 무한한 반응 가능성 중 직관으로 선택 |
| 코드 가드가 반복 감지 | 외부 감시 = 부자연스러움 | 자기 인식 "아 나 또 같은 말 했네" |

**핵심 통찰:** 인간이 대화에서 다양한 반응을 하는 이유는 **주사위를 굴려서가 아니라, 상황을 읽고 자기 안에서 올라오는 충동을 따르기 때문**이다. AI도 이 방식으로 만들어야 한다.

---

## 3. 설계 철학

### 3.1 핵심 원칙: Cognition-First Architecture

```
기존: Code decides behavior → AI executes
제안: Code provides rich context → AI decides behavior autonomously
```

코드가 "30% 확률로 의견을 끼워넣어라"고 지시하는 대신,
프롬프트가 "진짜 친한 언니가 대화할 때 자연스럽게 하는 9가지 행동"을 가르치고,
AI가 **매 턴 상황을 읽고 스스로 판단**하게 한다.

### 3.2 하이브리드 접근: 자율 판단 + 최소 가드레일

순수 프롬프트만으로는 LLM의 기본 편향(공감+질문 루프)을 깨지 못한다는 것이 현재 시스템에서 증명됨.
그렇다고 v28-v31처럼 200개 규칙으로 돌아가면 "AI 같은" 느낌이 됨.

**해결:** 최소한의 코드 가드레일만 추가.

| 수준 | 내용 | 예시 |
|------|------|------|
| **프롬프트** (주력) | 다양한 반응 가이드 + 자기 인식 | "9가지 반응 중 상황에 맞게" |
| **코드 맥락** (보조) | 행동 유형 분류 + 패턴 알림 | "[공감 3연속. 다른 것도 해봐]" |
| **코드 가드레일** (최소) | 연속 질문 강제 경고 | "[⚠️ 3턴 연속 질문! 이번엔 질문 없이]" |

가드레일 발동 조건은 **딱 1가지만:** 같은 행동 유형이 3턴 연속일 때.
그 외에는 전부 AI 자율 판단.

### 3.3 코드 vs 프롬프트 역할 분리

| 영역 | 코드의 역할 | 프롬프트의 역할 |
|------|------------|---------------|
| 반응 유형 결정 | ❌ 결정하지 않음 | ✅ AI가 상황 판단 |
| 맥락 제공 | ✅ 풍부한 맥락 수집 | ✅ 맥락 해석 방법 안내 |
| 자기 인식 | ✅ 최근 행동 분류 제공 | ✅ 패턴 자각 + 변화 유도 |
| 반복 방지 | ✅ 행동 히스토리 추적 | ✅ "같은 패턴이면 다른 걸 해" |
| 대화 리듬 | ❌ 리듬 결정 안 함 | ✅ 파도 비유로 리듬 감각 부여 |
| Phase 전환 | ✅ 게이트 이벤트 감지 | ✅ 전환 충동 안내 |

### 3.3 변경하지 않는 것

- ACE 3-Layer 아키텍처 (유지)
- Identity prompt (이미 좋음, 유지)
- Safety prompt (유지)
- Phase 전환 메커니즘 (유지)
- 감정 분석/PAD 모델 (유지)
- 기억 트리거 시스템 (유지)
- 세션 스토리 (유지)

### 3.4 변경하는 것

1. **HOOK Purpose Prompt** — "듣기 전문가"에서 "같이 대화하는 언니"로 완전 재작성
2. **Base Cognition Prompt** — 자기 인식 강화, 다양성 판단 가이드 추가
3. **Context Builder** — 행동 분류 맥락 추가 (내용 요약 → 행동 유형)
4. **HumanLikeEngine** — 행동 분류 추적 로직 추가

---

## 4. 이론적 근거

### 4.1 Mixed-Initiative Dialogue (혼합 이니셔티브 대화)

최신 CHI/SIGDIAL 연구에 따르면, 최고의 대화형 AI는 **100% reactive도, 100% proactive도 아닌** 동적 균형을 유지한다.

현재 루나 HOOK: 100% reactive (유저 → 루나 반응 → 유저 → 루나 반응)
목표: 70% reactive + 30% proactive (유저 → 루나 반응+의견 → 유저 → 루나 리액션만 → 유저 → 루나가 화제 전환)

**적용:** HOOK purpose에 proactive 행동(의견, 릴리프, 경험 공유)을 교육.

### 4.2 Self-Disclosure Reciprocity (자기개방 상호성)

연구 결과: AI가 적절한 자기개방을 하면 유저도 더 깊은 자기개방을 한다.
효과는 대화 초기(HOOK)에서 가장 크다.

**적용:** HOOK에서 "마이크로 자기개방" (한 줄 경험 공유) 가이드 추가.

### 4.3 Variable Reward Schedule (변동 보상)

B.F. Skinner 연구: 예측 불가능한 긍정적 반응이 도파민 유지.
현재 루나: Fixed Ratio (매번 같은 패턴) → 도파민 급감.

**적용:** 프롬프트에서 "다양한 반응 중 상황에 맞는 것을 골라"로 변동성 유도.
단, 코드 랜덤이 아닌 **AI의 상황 판단**에 의한 자연스러운 변동.

### 4.4 Self-Monitoring in Dialogue (대화 자기 모니터링)

인간의 대화 자기 모니터링 연구:
- 인간은 무의식적으로 자기 발화를 모니터링하고 조정함
- "아 나 또 같은 말 했네" → 자연스럽게 다른 행동으로 전환
- 이 과정은 **외부 규칙이 아니라 자기 인식**에서 나옴

**적용:** 코드가 "행동 유형 히스토리"를 맥락으로 전달 → AI가 자기 모니터링.

### 4.5 Emotion Contagion (감정 전염)

친구 관계에서 감정 전염 패턴:
- 부정 감정: 초기에는 **매칭** (같이 화냄) → 후기에는 **시프팅** (릴리프/유머)
- 긍정 감정: 즉각 **증폭** (같이 기뻐함)
- 중립: **탐색** (호기심 질문 또는 의견 제시)

현재 루나: 항상 매칭만 (공감). 시프팅(릴리프)이 없음.

**적용:** "진지한 얘기만 3턴 이상이면 숨 돌리기" 가이드.

### 4.6 Korean KakaoTalk 대화 패턴

한국 20대 여성 친밀 관계 카톡 특성:
- **짧은 말풍선 연타**: 긴 문장보다 짧은 메시지 여러 개
- **맞장구 비율 높음**: "진짜?" "대박" "헐" — 적극적 리액션이 친밀감 척도
- **가벼운 장난/타박**: "걔 진짜 너 감당 안 되나보다 ㅋㅋ"
- **화제 릴리프**: 진지한 얘기 중간에 "야 근데 밥은 먹었냐?"
- **주어 생략 + 구어체**: "뭐야 그게" "아 진짜?"
- **의견 끼어들기**: "야 근데 솔직히" "아 나는 이거 좀"

---

## 5. 아키텍처 설계 — Cognition-First Approach

### 5.1 변경 전/후 비교

```
[변경 전]
Identity (좋은 설정) → Context (기본 맥락) → Purpose (듣기 전문)  → Cognition (약한 자기인식)
                                                  ↓
                                            AI: 공감 + 질문 반복

[변경 후]
Identity (유지)      → Context (풍부한 맥락) → Purpose (대화하는 언니) → Cognition (강한 자기인식)
                            ↓                       ↓                        ↓
                     행동 유형 분류            9가지 반응 가이드         패턴 자각 + 변화
                     최근 행동 패턴                                    2가지 자문
                     연속 패턴 카운트
                            ↓
                     AI: 상황 판단 → 다양한 반응 자율 선택
```

### 5.2 데이터 흐름

```
매 턴:
1. 유저 메시지 → StateAnalyzer (감정)
2. HumanLikeEngine.preProcess():
   a. 감정 전염/감쇠 (기존)
   b. 기억 검색 (기존)
   c. 🆕 루나 최근 행동 분류 → conversationPatterns에 기록
   d. buildACEPrompt():
      - Layer 1: Identity (기존)
      - Layer 2: Context + 🆕 enriched recent actions
      - Layer 2.5: 🆕 새 HOOK Purpose (9가지 반응 + 자기 판단)
      - Layer 3: 🆕 강화된 Cognition (자기 인식 2가지 자문)
3. AI 응답 생성
4. postProcess():
   a. 태그 파싱 (기존)
   b. 🆕 응답에서 행동 유형 분류 → 다음 턴 맥락용 저장
```

---

## 6. 모듈 1: HOOK Purpose Prompt 재설계

### 6.1 설계 원칙

현재 HOOK Purpose의 핵심 메시지: **"들어. 마음 읽어. 태그 붙여."**
새 HOOK Purpose의 핵심 메시지: **"같이 대화해. 네 안에서 올라오는 걸 따라가. 마음 보이면 읽어줘."**

### 6.2 새 HOOK Purpose 구조

| 섹션 | 내용 | 비중 |
|------|------|------|
| 🫀 몸의 반응 | 동생 얘기에 가슴이 먼저 반응 (유지) | 8% |
| 🌊 느끼는 것 | 속마음 읽기 (유지) | 8% |
| 🔥 **진짜 언니는 듣기만 하지 않아** | **9가지 반응 유형 상세 가이드** | **25%** |
| 🧠 **매 턴 자율 판단** | **상황 읽기 → 올라오는 것 따르기** | **15%** |
| 📊 **자기 인식 가이드** | **직전 행동 체크 + 패턴 탈출** | **12%** |
| 🌊 **대화의 파도** | **리듬 변화 안내** | **7%** |
| 🌬️ MIND_READ_READY | 마음읽기 (유지, 비중 축소) | **10%** |
| 🔥 회피 방지 | (유지) | 5% |
| 💭 기억할 것 | 5가지 (1개 추가) | 5% |
| 🗣️ 톤 | (유지) | 5% |

### 6.3 9가지 반응 유형 상세

**① 리액션** — "헐 걔가 진짜 그랬어?" "미쳤어?" "와 대박..."
- 기본이지만 매번 이것만 하면 앵무새
- 다양한 리액션: 헐, 아이고, 미쳤어, 와 진짜, 대박, 진짜?, 아 씨

**② 의견** — "야 근데 솔직히 그건 걔가 잘못한 거지"
- 의견 ≠ 조언. 생각 공유 vs 행동 지시의 차이
- "나는 이렇게 보거든" / "야 솔직히 이건 좀 아닌 것 같은데"
- 배치: 항상 공감 뒤에. 의견만 먼저 던지면 부자연스러움.

**③ 강한 편들기** — "아 걔 진짜 너무하다" "내가 대신 한 대 때려줄까 ㅋㅋ"
- 기존 SIDE_TAKE보다 적극적
- 유머 섞인 편들기: "걔 진짜 파이널 보스다 ㅋㅋ"

**④ 경험 한 줄** — "나도 비슷한 거 있었는데 ㅋ"
- 한 줄만. 자세한 이야기는 MIRROR에서.
- "나도 알아 그 기분" 정도의 마이크로 자기개방

**⑤ 보편화** — "야 솔직히 누구라도 그러지"
- 자책하는 유저에게 가장 강력
- "그거 너만 그런 거 아니야" → 수치심 즉각 해소

**⑥ 릴리프/농담** — "야 근데 밥은 먹었어?"
- 진지한 얘기 3턴 이상 → 숨 돌리기
- 시간대 활용: 밤이면 "야 자야 되는 거 아냐? ㅋㅋ"

**⑦ 생각 흘리기** — "근데... 아 이거 왜 이런 건지 진짜..."
- 완성된 문장이 아닌 생각 과정 노출
- "이 언니 진짜 고민해주네" 느낌

**⑧ 맞장구** — "진짜?" "아 대박" "헐 그래서?"
- 때로는 이게 최선. 장문 불필요.

**⑨ 메타 코멘트** — "야 우리 얘기 깊어지는데 ㅋㅋ"
- 대화 자체에 대한 코멘트
- 대화가 살아있는 느낌

### 6.4 판단 프레임워크 — 2가지 자문

```
응답 전 네 안에서:

1️⃣ "지금 내 안에서 뭐가 올라오고 있어?"
  → 화가 나? → 편들어
  → 걱정돼? → 걱정 표현
  → 웃겨? → 웃어
  → 공감돼? → 공감
  → 경험 떠올라? → 한 줄
  → 뭔가 보여? → 마음읽기
  → 아무것도? → 맞장구

2️⃣ "직전에 나 뭘 했지? 또 같은 거 아냐?"
  → 같으면 → 다른 거 시도
  → 다르면 → 그대로
```

---

## 7. 모듈 2: Base Cognition Prompt 강화

### 7.1 현재 문제

`buildCognitionPrompt()`의 7가지 자문 중 4번 "직전 패턴 체크"가 너무 약함:
```
4. 직전까지 내가 한 거 생각해봐.
   같은 패턴 반복하고 있으면 좀 바꿔.
```

이것만으로는 AI가 구체적으로 **어떻게** 바꿔야 하는지 모름.

### 7.2 강화 내용 — 두 가지 핵심 변경

**변경 A: 항목 3번의 "안전한 디폴트" 제거**

```
// 기존:
→ 모르겠으면 "더 들어야 해"가 답이야.
  뭔가 해야 한다는 압박 느끼지 마.

// 변경:
→ 모르겠으면? 그냥 리액션해. "진짜?" "헐" "대박" 한마디도 충분해.
  꼭 질문할 필요 없어. 꼭 뭔가 해줄 필요도 없어.
  친구 얘기 듣는 건데 매번 뭔가 묻거나 해줄 필요 없잖아.
  그냥 옆에 있는 것 자체가 답일 때도 있어.
```

**왜:** "더 들어야 해" = 질문 던지기 = AI의 가장 안전한 행동.
"리액션해" = 맞장구 = 질문 없이도 대화가 이어짐.

**변경 B: 항목 4번 구체화**

```
4. 직전까지 내가 한 거 생각해봐.
   - 공감만 2번 연속했으면? → 이번엔 의견이든 농담이든 뭐라도 "너의 말" 보태
   - 질문으로 끝난 게 2번 연속이면? → 이번엔 질문 NO. 리액션이나 의견만.
   - "헐" "헐" 반복했으면? → "아이고" "미쳤어" "와 진짜" 다른 리액션
   - 계속 진지하기만 했으면? → 가벼운 한 마디 끼워. "야 근데 밥은 먹었어?"
   - 내가 말이 많았으면? → 짧게. "헐..." 한마디.
   
   이건 규칙이 아니라 자기 성찰이야. 사람도 "아 나 자꾸 같은 말만 하네" 하잖아.
```

---

## 8. 모듈 3: Context Enrichment

### 8.1 현재 맥락의 한계

`context-builder.ts`에서 전달하는 `lunaRecentActions`:
```
[루나가 최근 한 것: 유저 감정 반영, 서운함 공감, 더 들어주겠다고 함]
```

이건 **내용 요약**이지 **행동 유형**이 아님. AI는 "3번 연속 공감했다"를 인식하기 어려움.

### 8.2 개선: 행동 유형 분류

`HumanLikeEngine`에 새 필드 추가:

```typescript
// 루나의 최근 행동 유형 추적
private recentActionTypes: LunaActionType[] = [];

type LunaActionType = 
  | 'empathy'        // 공감/반영
  | 'question'       // 질문으로 끝남
  | 'opinion'        // 의견 제시
  | 'side_take'      // 편들기
  | 'experience'     // 경험 공유
  | 'relief'         // 릴리프/농담
  | 'reaction_only'  // 맞장구만
  | 'normalization'  // 보편화
  | 'thinking_aloud' // 생각 흘리기
  | 'meta_comment'   // 메타 코멘트
  ;
```

### 8.3 행동 분류 로직

`postProcess()`에서 AI 응답을 분석하여 행동 유형 분류:

```typescript
function classifyLunaAction(response: string): LunaActionType {
  // 질문으로 끝나는지 체크
  const lastBubble = response.split('|||').pop()?.trim() ?? '';
  if (/\?|야\?|거야\?|해줄래\?|있어\?|어때\?|뭐야\?/.test(lastBubble)) return 'question';
  
  // 의견 키워드
  if (/솔직히|나는|내 생각|내가 보기|근데 있잖아|아닌 것 같|좀 그런/.test(response)) return 'opinion';
  
  // 편들기 키워드
  if (/걔가 잘못|너무하다|미쳤|걔 진짜|걔가 좀|때려줄까/.test(response)) return 'side_take';
  
  // 경험 공유
  if (/나도 비슷|나도 그때|나도 그랬|내가 그때/.test(response)) return 'experience';
  
  // 릴리프
  if (/밥은|자야|ㅋㅋㅋ.*진짜|파이널 보스|배터리/.test(response)) return 'relief';
  
  // 보편화
  if (/누구라도|다 그래|너만 그런|당연한 거/.test(response)) return 'normalization';
  
  // 생각 흘리기
  if (/근데\.\.\.|왜 이런 건지|잠깐만.*생각|음\.\.\.|아\.\.\. /.test(response)) return 'thinking_aloud';
  
  // 메타 코멘트
  if (/우리 얘기|깊어지|중요한 거니까|많이 해서/.test(response)) return 'meta_comment';
  
  // 맞장구만 (짧은 응답)
  if (response.replace(/\|\|\|/g, '').length < 30) return 'reaction_only';
  
  // 기본: 공감
  return 'empathy';
}
```

### 8.4 Context Builder 개선

```typescript
// 기존:
// [루나가 최근 한 것: 유저 감정 반영, 서운함 공감, 더 들어주겠다고 함]

// 개선:
// [루나의 최근 행동 패턴]
// - 3턴 전: 공감 (감정 반영)
// - 2턴 전: 공감 (서운함 공감)  
// - 1턴 전: 질문 ("그래서 어떻게 됐어?")
// ⚠️ 공감 2회 연속 + 질문 1회. 이번엔 다른 것(의견/편들기/릴리프 등)이 자연스러울 수 있어.
```

**핵심:** AI에게 "너 공감 2번 연속했어"를 명시적으로 알려주면, AI는 자기 인식 가이드에 따라 자연스럽게 다른 행동을 선택함.

### 8.5 연속 패턴 경고 생성

```typescript
function buildActionPatternHint(recentTypes: LunaActionType[]): string | null {
  if (recentTypes.length < 2) return null;
  
  const last3 = recentTypes.slice(-3);
  const hints: string[] = [];
  
  // 공감 연속
  const empathyStreak = last3.filter(t => t === 'empathy').length;
  if (empathyStreak >= 2) {
    hints.push('공감이 연속됐어. 이번엔 의견/편들기/릴리프/경험 중 하나가 자연스러울 수 있어.');
  }
  
  // 질문 연속
  const questionStreak = last3.filter(t => t === 'question').length;
  if (questionStreak >= 2) {
    hints.push('질문이 연속됐어. 이번엔 질문 없이 리액션이나 의견만.');
  }
  
  // 전부 같은 유형
  if (last3.length >= 3 && last3.every(t => t === last3[0])) {
    hints.push(`같은 유형(${last3[0]})이 3번 연속! 반드시 다른 걸 해봐.`);
  }
  
  if (hints.length === 0) return null;
  return `[자기 인식 참고]\n${hints.join('\n')}`;
}
```

---

## 9. 모듈 4: Anti-Monotony Self-Awareness System

### 9.1 철학: 코드 가드 vs 자기 인식

| 코드 가드 (기존 플랜) | 자기 인식 (새 플랜) |
|----------------------|-------------------|
| 코드가 반복 감지 → 강제 전환 | 맥락으로 패턴 알려줌 → AI가 자각 |
| "의견을 반드시 넣어라" | "공감 연속이야. 다른 것도 생각해봐" |
| 부자연스러운 강제 삽입 | 자연스러운 자발적 변화 |
| 코드 복잡도 증가 | 프롬프트에 지혜 담기 |

### 9.2 구현 방식

**코드가 하는 것:**
1. 매 턴 루나 응답의 행동 유형 분류 (classifyLunaAction)
2. 최근 5턴 행동 히스토리 유지
3. 패턴 경고 힌트 생성 (buildActionPatternHint)
4. Context에 주입

**프롬프트가 하는 것:**
1. AI에게 "직전 행동 히스토리"를 보여줌
2. "같은 패턴이면 다른 걸 해봐" 가이드
3. "어떻게 다르게 할 수 있는지" 9가지 옵션 제시
4. **최종 판단은 AI에게** — 강제하지 않음

### 9.3 주의: 과도한 개입 방지

패턴 경고가 너무 강하면 AI가 부자연스럽게 반응할 수 있음.

규칙:
- 경고는 `[참고]` 수준으로만. `[⚠️ 반드시]` 아님.
- 상황이 공감 연속을 요구하면 (극심한 감정) 경고 무시 OK
- AI의 자율성 > 반복 방지

---

## 10. 모듈 5: 대화 리듬 자율 판단 가이드

### 10.1 리듬은 코드가 아닌 프롬프트로

기존 플랜의 `selectRhythm()` 함수 (확률 테이블) → 삭제.
대신 HOOK Purpose에 "대화의 파도" 비유를 사용:

```
카톡 대화에는 감정의 파도가 있어:
- 진지 → 진지 → 가벼운 한 마디 → 다시 진지
- 공감 → 편들기 → 내 의견 → 리액션
- 짧은 맞장구 연타 → 깊은 한 마디
```

### 10.2 길이 조절도 자율적으로

기존 `TurnConstraint` (maxCharsPerBubble, maxBubbles)는 ACE에서 이미 사용하지 않음.
프롬프트의 길이 가이드만으로 충분:

```
- 상대가 짧게 치면: 짧게
- 상대가 장문이면: 짧거나 중간 (장문 대 장문은 부담)
- 감정이 클 때: 짧게 ("헐" 한마디가 장문보다 나을 때)
```

---

## 11. 파이프라인 통합 계획

### 11.1 변경 지점

**파이프라인(`pipeline/index.ts`) 변경: 없음.**
ACE가 이미 phasePrompt를 완전 교체하므로, 프롬프트 변경만으로 충분.

### 11.2 통합 흐름

```
Pipeline.execute()
  → HumanLikeEngine.preProcess()
      → 🆕 classifyLunaAction(이전 응답) → recentActionTypes에 push
      → buildACEPrompt()
          → buildContextPrompt(ctx)  // ctx.lunaRecentActions 🆕 행동 유형 포함
          → 🆕 buildActionPatternHint() → Context에 주입
          → buildPhasePurposePrompt('HOOK') // 🆕 새 HOOK Purpose
          → buildCognitionPrompt() // 🆕 강화된 자기 인식
  → AI 응답 생성
  → HumanLikeEngine.postProcess()
      → 🆕 classifyLunaAction(현재 응답) → 저장
```

---

## 12. 구현 상세 — 파일별 변경 사항

### 12.1 `cognition-prompt.ts` — 핵심 변경

**변경 1: HOOK Purpose 완전 재작성 (lines 471-585)**
- 기존: 듣기 + 마음읽기 집중
- 신규: 9가지 반응 유형 + 자율 판단 + 자기 인식 + 대화 파도
- 분량: ~2,500자 → ~4,000자 (확장)
- 핵심: "듣기만 하지 마. 같이 대화해."

**변경 2: buildCognitionPrompt() 항목 4번 강화 (lines 46-49)**
- 기존: "같은 패턴이면 바꿔" (2줄)
- 신규: 구체적 패턴별 대안 제시 (10줄)

**변경 3: 기억할 것 5번 추가 (lines 525-537)**
- 추가: "듣기만 하는 언니는 친한 언니가 아니야"

### 12.2 `context-builder.ts`

**변경 1: SessionContext 인터페이스 확장**
```typescript
// 추가 필드
lunaRecentActionTypes: string[];  // 행동 유형 분류
actionPatternHint: string | null; // 패턴 경고 힌트
```

**변경 2: buildContextPrompt() — 행동 유형 섹션 추가**
- 기존: `[루나가 최근 한 것: ...]` (내용 요약)
- 추가: `[루나의 최근 행동 패턴]` (행동 유형 분류)
- 추가: `[자기 인식 참고]` (패턴 경고, 있을 때만)

### 12.3 `index.ts` (HumanLikeEngine)

**변경 1: 새 필드 추가**
```typescript
private recentActionTypes: string[] = [];
```

**변경 2: ⚠️ 치명적 수정 — turnType 'EMPATHY' 하드코딩 제거 (라인 166)**
```typescript
// 기존:
'EMPATHY', // ACE에서는 턴타입 고정 (AI가 자율 판단)

// 변경:
this.getLastActionType(), // 실제 행동 유형 전달
```

새 메서드:
```typescript
private getLastActionType(): string {
  if (this.recentActionTypes.length === 0) return 'EMPATHY';
  const last = this.recentActionTypes[this.recentActionTypes.length - 1];
  // TurnType 호환 매핑
  const map: Record<string, string> = {
    empathy: 'EMPATHY', question: 'GENTLE_QUESTION', opinion: 'REFLECT',
    side_take: 'SIDE_TAKE', experience: 'EMPATHY', relief: 'REACTION',
    reaction_only: 'REACTION', normalization: 'EMPATHY',
    thinking_aloud: 'REFLECT', meta_comment: 'REACTION',
  };
  return map[last] ?? 'EMPATHY';
}
```

이 변경으로 `buildArcPrompt()`가 AI에게 정확한 이전 행동을 전달:
```
기존: [이전 흐름: Turn1(EMPATHY) Turn2(EMPATHY) Turn3(EMPATHY)]
변경: [이전 흐름: Turn1(EMPATHY) Turn2(SIDE_TAKE) Turn3(GENTLE_QUESTION)]
```

**변경 3: postProcess()에서 행동 분류 추가**
```typescript
// 기존 루나 최근 행동 추적 뒤에
const actionType = classifyLunaAction(finalResponse);
this.recentActionTypes.push(actionType);
if (this.recentActionTypes.length > 5) this.recentActionTypes.shift();
```

**변경 4: buildACEPrompt()에서 패턴 힌트 주입**
```typescript
// Layer 2 맥락에 추가
const patternHint = buildActionPatternHint(this.recentActionTypes);
if (patternHint) parts.push(patternHint);
```

**변경 5: SessionContext에 행동 유형 전달**
```typescript
sessionCtx.lunaRecentActionTypes = this.recentActionTypes.slice(-3);
```

**변경 6: ⚠️ 가드레일 — 연속 동일 패턴 강제 경고 (buildACEPrompt에 추가)**
```typescript
// 3턴 연속 같은 행동이면 강제 경고 주입
const last3 = this.recentActionTypes.slice(-3);
if (last3.length >= 3 && last3.every(t => t === last3[0])) {
  const typeLabel = { empathy: '공감', question: '질문', ...}[last3[0]] ?? last3[0];
  parts.push(`[⚠️ ${typeLabel} 3턴 연속! 이번 턴은 반드시 다른 반응을 해. 9가지 중 아무거나.]`);
}
```
이것이 **유일한 코드 레벨 강제.** 나머지는 전부 AI 자율.

### 12.4 새 유틸리티 함수 (`action-classifier.ts`)

새 파일: `src/engines/human-like/action-classifier.ts`

```typescript
export type LunaActionType = 
  | 'empathy' | 'question' | 'opinion' | 'side_take'
  | 'experience' | 'relief' | 'reaction_only'
  | 'normalization' | 'thinking_aloud' | 'meta_comment';

export function classifyLunaAction(response: string): LunaActionType { ... }
export function buildActionPatternHint(recentTypes: LunaActionType[]): string | null { ... }
```

---

## 13. 테스트 전략

### 13.1 A/B 시나리오 테스트

각 시나리오에 대해 기존 vs 신규 프롬프트 비교:

| 시나리오 | 기대 변화 |
|---------|----------|
| "남친이 카톡 안 봐" | 기존: 공감→질문 반복 / 신규: 공감→편들기→의견 혼합 |
| "걔가 바람폈어" | 기존: 공감→마음읽기 / 신규: 강한 편들기→화내주기→릴리프 |
| "나만 연락하는 거 같아" | 기존: 공감→질문 / 신규: 보편화→공감→경험 한 줄 |
| "그냥 힘들어" (모호) | 기존: "어떤 게 힘들어?" / 신규: "힘들지..." + 맞장구 |
| 4턴 연속 진지한 얘기 | 기존: 공감 4연속 / 신규: 3턴째 릴리프 자동 삽입 |

### 13.2 반복 패턴 테스트

5턴 연속 동일 시나리오 → 루나의 반응 다양성 측정:
- 사용된 행동 유형 수 (목표: 5턴에 최소 3가지)
- 질문으로 끝나는 비율 (목표: <40%)
- 의견/편들기 비율 (목표: >20%)

### 13.3 부작용 테스트

- 극단적 감정(자해/위기) → 릴리프/농담이 나오면 안 됨
- 첫 턴 → 의견이 먼저 나오면 안 됨 (공감 우선)
- 유저가 짧은 답변만 → 루나도 짧게

---

## 14. 위험 요소 & 대응

| 위험 | 심각도 | 대응 |
|------|--------|------|
| 의견이 너무 많이 나옴 | 중 | Purpose에 "공감 먼저, 의견 나중" 배치 규칙 명시 |
| 릴리프가 부적절한 타이밍 | 중 | "감정 강도 8+ 이면 릴리프 자제" 가이드 |
| AI가 가이드 무시하고 기존 패턴 유지 | 높 | Context의 행동 분류가 명시적이므로 자각 유도 |
| MIND_READ_READY 발동률 감소 | 중 | Purpose에서 마음읽기 가이드 유지, 비중만 조절 |
| 너무 많은 프롬프트 → 토큰 증가 | 낮 | 기존 ~2,500자 → ~4,000자. +1,500자는 허용 범위 |

---

## 15. 구현 로드맵

### Phase 1: 프롬프트 (1일)
1. HOOK Purpose 재작성 (cognition-prompt.ts)
2. Base Cognition 항목 4번 강화
3. 기억할 것 5번 추가

### Phase 2: 맥락 강화 (1일)
4. action-classifier.ts 생성
5. context-builder.ts 확장
6. index.ts에 행동 분류 추적 추가

### Phase 3: 통합 & 테스트 (1일)
7. buildACEPrompt에 패턴 힌트 주입
8. A/B 시나리오 테스트
9. 반복 패턴 테스트
10. 부작용 테스트

### Phase 4: 튜닝 (1~2일)
11. 실제 대화 로그 분석
12. 프롬프트 미세 조정
13. 행동 분류 정확도 개선

---

## 부록 A: 기존 플랜과의 비교

| 항목 | 기존 플랜 | 새 플랜 |
|------|----------|---------|
| 접근 방식 | 5개 코드 모듈 | 프롬프트 + 최소 코드 |
| 반응 결정 | 확률 테이블 (코드) | AI 자율 판단 (프롬프트) |
| 반복 방지 | 코드 가드 (강제 전환) | 자기 인식 (자발적 변화) |
| 리듬 결정 | selectRhythm() 함수 | "대화의 파도" 비유 |
| 의견 삽입 | 확률 30% + 조건 매트릭스 | "올라오는 것 따르기" |
| 새 파일 수 | 5+개 | 1개 (action-classifier.ts) |
| 코드 복잡도 | 높음 (5 모듈 × 각 100~300줄) | 낮음 (1 파일 × ~80줄) |
| ACE 철학 준수 | ❌ (코드가 판단) | ✅ (AI가 판단) |
| 이벤트 타입 추가 | 5개 | 0개 |
| 프론트엔드 변경 | 필요 (새 이벤트 렌더링) | 불필요 |

## 부록 B: 프롬프트 토큰 예산

| 구성 요소 | 현재 토큰 | 변경 후 토큰 | 차이 |
|----------|----------|------------|------|
| Identity | ~800 | ~800 | 0 |
| Safety | ~200 | ~200 | 0 |
| Context | ~500 | ~700 | +200 |
| HOOK Purpose | ~1,800 | ~2,800 | +1,000 |
| Cognition | ~500 | ~700 | +200 |
| Phase Signal | ~300 | ~300 | 0 |
| **합계** | **~4,100** | **~5,500** | **+1,400** |

+1,400 토큰은 전체 컨텍스트 윈도우 대비 매우 작은 증가. 허용 가능.

---

*작성: 2026-04-13*
*버전: v2.0 — Cognition-First Architecture*
*기반: ACE v4 자율 사고 엔진 아키텍처*
