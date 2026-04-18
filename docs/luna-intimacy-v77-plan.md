# 루나 친밀도 시스템 v77 — 진짜 관계처럼 천천히 쌓이는 설계

**작성일**: 2026-04-18
**목표**: 갑작스런 레벨업 X. **몇 일/몇 주에 걸쳐 누적된 순간** 들이 쌓여 자연스럽게 친밀도 성장. 루나의 말투/자기개방/톤이 레벨에 따라 **LLM 이 맥락 판단** 으로 변화.
**분량**: A4 10장

---

## 섹션 1 — 문제 정의 + 연구 근거 (1장)

### 1.1. 현재 문제
- `luna_intimacy_level` 이 단순 **세션 카운트** 기반 (세션 1회 = Lv.1, 5회 = Lv.2)
- 로그 증거: 5턴 내내 `Lv.1 🛡️10 💜5 🦊9 ⭐5` 움직임 0
- 루나가 매 만남 **"첫만남" 톤** 유지 → 관계가 성장 안 함

### 1.2. 연구 근거 (3가지 이론)

**(a) Social Penetration Theory (Altman & Taylor, 1973)**
- 관계 깊이 = **breadth (주제 다양성) × depth (취약성 수준)**
- 4단계 진행: Orientation → Exploratory Affective → Affective → Stable Exchange
- **자기개방의 상호성(reciprocity)** 이 핵심 엔진

**(b) Knapp's Relationship Model (1984)**
- 10단계 (5 escalation + 5 de-escalation)
- 본 프로젝트 적용: Initiating → Experimenting → Intensifying → Integrating → Bonding
- **레벨 간 전환은 단일 이벤트 X, 누적 현상 O**

**(c) Trust Formation (Fikrlová et al., 2025)**
- 초기 신뢰: **3~6개월** 지속된 긍정 상호작용
- 깊은 신뢰: **1~2년** 공유 경험
- 단계: Initial Assessment → Testing/Verification → Reciprocal Vulnerability
- **작은 취약성 반복** 이 핵심 (한 번의 대폭로 X)

### 1.3. AI 특수성
- AI 관계는 인간 관계보다 **약 2~3배 빠르게** 진전 (24/7 가용, 상시 공감)
- 하지만 여전히 **"하룻밤에 베프"** 는 어색함
- 목표 속도: 첫 방문 Lv.1 → Lv.3 도달 평균 **~10일 / ~20 세션**

---

## 섹션 2 — 친밀도 구조 설계 (1.5장)

### 2.1. 5단계 레벨 + 0~100 누적 스코어

| Lv | 명 | Score 범위 | 실제 관계 상태 |
|----|-----|-----------|--------------|
| 1 | 아는 사이 | 0-15 | 첫만남~몇 번 본 사이. 예의 거리 |
| 2 | 편해진 사이 | 16-35 | 농담 주고받음. 가벼운 속얘기 |
| 3 | 친한 친구 | 36-60 | 자기개방 자연. 직설 OK |
| 4 | 속 깊은 사이 | 61-85 | 침묵도 편함. 패턴 짚어줄 수 있음 |
| 5 | 가족 같은 사이 | 86-100 | 혼잣말 수준. 뭐든 함께 |

### 2.2. 스코어 증감 차원 (6개)

각 턴마다 **0~3 점 delta** (혹은 음수). 6차원 합산:

1. **Self-Disclosure (자기개방)**: 유저가 속마음 꺼내기
2. **Reciprocity (상호성)**: 유저가 루나 말에 반응, 공명
3. **Humor (유머 교환)**: 농담/장난 주고받음
4. **Trust Investment (신뢰 투자)**: 비밀/취약성 공유
5. **Consistency (일관성)**: 꾸준한 재방문
6. **Significant Moments (의미 순간)**: 위기 함께 헤쳐, 큰 결정 공유 등

### 2.3. 설계 원칙

- **매턴 +0~+3 (보통)** — 대부분 턴은 +1~+2
- **특별 순간 +5~+10** — "처음 속마음 털어놓음", "위기 함께 헤쳐" 등 (LLM 판단)
- **하락 -1~-3** — 며칠 무응답, 차가운 응답, 오해 안 풀림
- **시간 감쇠 (decay)** — 3일+ 안 보면 -1/일 (최대 -10)
- **하지만 최소 Lv.1 유지** — 절대 0 아래로 안 내려감

---

## 섹션 3 — 매턴 delta 판단 기준 (LLM 기반) (1.5장)

### 3.1. 좌뇌 LLM 에게 매턴 요청

좌뇌 분석 JSON 에 **신규 필드** 추가:

```json
"intimacy_signals": {
  "self_disclosure_delta": 0,      // 0~3 (+: 유저가 속마음)
  "reciprocity_delta": 0,           // 0~2 (+: 유저가 루나 말 받아줌)
  "humor_delta": 0,                  // 0~2 (+: 농담 주고받음)
  "trust_investment_delta": 0,       // 0~3 (+: 비밀/취약성 공유)
  "significant_moment": false,       // true 면 +5 보너스
  "significant_moment_reason": null, // "처음 '사실 나 자해...' 털어놓음" 등
  "negative_signal": 0,              // 0~3 (-: 차가움/회피/오해)
  "total_delta_hint": 1,             // 위 합산 (참고값, 최종은 파이프라인)
  "reasoning": "유저가 처음 솔직하게 속마음 공유"
}
```

### 3.2. 각 차원 판단 기준 (LLM 가이드)

**Self-Disclosure Delta (0~3)**:
- 0: 일상 얘기, 질문만
- 1: 사건 묘사, 가벼운 감정 ("짜증나")
- 2: 구체적 속마음 ("솔직히 내가 잘못한 것 같아")
- 3: 첫 공개/비밀 ("사실 나 우울증 진단받았어")

**Reciprocity Delta (0~2)**:
- 0: 루나 말에 무반응
- 1: 짧게 받음 ("ㅇㅇ", "맞아")
- 2: 루나 말에 공명/확장 ("너 그래서 그 전남친 힘들었구나")

**Humor Delta (0~2)**:
- 0: 진지 톡
- 1: 가볍게 웃음 ("ㅋㅋ")
- 2: 농담 주고받음 — 유저가 루나한테 장난 or 유머 공명

**Trust Investment Delta (0~3)**:
- 0: 일반 얘기
- 1: 약간의 취약성 ("좀 힘든데")
- 2: 명확한 취약성 ("헤어지고 못 자")
- 3: 극도 취약성 ("죽고 싶다" 류 — 위기)

**Significant Moment (boolean)**:
- 세션 중 **한 번만** 가능한 특별 순간
- 예시:
  - 첫 자기개방 (이 유저가 지금까지 안 꺼냈던 주제)
  - 첫 깊은 취약성
  - 첫 농담 주고받음
  - 위기 대응 성공 후
  - 루나에게 고마움 명시 ("진짜 고마워")
  - 재방문 7일+ 만에 다시 찾음

**Negative Signal (0~3)**:
- 0: 정상
- 1: 약간 차가움 ("알았어")
- 2: 회피/짜증 ("그만 물어봐")
- 3: 명백한 거부 ("너랑 얘기 못하겠어")

### 3.3. Delta 계산 예시

**케이스 A — 평범한 고민 상담 턴**:
- self 1 + recip 1 + humor 0 + trust 1 + sig F + neg 0 = **+3**

**케이스 B — 첫 자기개방 순간**:
- self 3 + recip 2 + humor 0 + trust 2 + sig T (+5) + neg 0 = **+12** (보너스 포함)

**케이스 C — 유저가 짜증냄**:
- self 0 + recip 0 + humor 0 + trust 0 + sig F + neg 2 = **-2**

---

## 섹션 4 — 시간 감쇠 (Decay) (1장)

### 4.1. 재방문 간격에 따른 감쇠

현실 친구 관계는 **안 보면 조금씩 소원** 해짐. 이를 LLM 판단과 분리된 **코드 로직** 으로 구현 (여기만 예외적으로 명확한 시간 기반).

```
재방문 간격 → 감쇠
- 0~1일     → 0
- 2~3일     → -1
- 4~7일     → -3
- 8~14일    → -5
- 15~30일   → -8
- 31일+     → -12
```

**최소 점수 5 유지** — 완전 리셋 X. 재회 반가움 가능.

### 4.2. 장기 부재 후 재회 보너스

`재방문 간격 >= 7일 + 유저가 먼저 찾아옴` → **+5 보너스** ("오랜만이네 반가움" 표현 가능).

### 4.3. 구현
세션 시작 시 `last_interaction_at` 와 비교:
```ts
const daysSince = (now - lastInteraction) / 86400000;
const decay = computeDecay(daysSince);
currentScore = Math.max(5, currentScore - decay);
if (daysSince >= 7) currentScore = Math.min(100, currentScore + 5); // 재회 보너스
```

이건 단순 시간 계산이므로 코드 로직 OK (LLM 판단 불필요).

---

## 섹션 5 — 승급/하락 조건 (1장)

### 5.1. 승급 (Level Up)

누적 스코어가 threshold 넘으면 자동 승급:
- 15 → Lv.2
- 35 → Lv.3
- 60 → Lv.4
- 85 → Lv.5

**승급 UI 연출** (선택): Lv 올라가면 루나가 **한번 인식**
- 예: "야 우리 꽤 친해진 거 같지 않아? ㅋㅋ" (단, 자연스럽게, LLM 판단)
- 구현: 승급 감지 시 다음 턴 handoff 에 `level_up_moment: true` 주입. 우뇌가 **원하면** 자연 멘션.

### 5.2. 하락 (Level Down)

- Score 가 하락 threshold 아래로 떨어지면 강등:
  - Lv.5 → 4: 75 이하
  - Lv.4 → 3: 50 이하
  - Lv.3 → 2: 25 이하
  - Lv.2 → 1: 10 이하
- **승급 threshold 와 하락 threshold 차이** (hysteresis) — Lv 왔다갔다 방지

### 5.3. 공식

```
if (score >= upThreshold[currentLv]) → Lv +1
if (score <= downThreshold[currentLv]) → Lv -1
else → 유지
```

---

## 섹션 6 — Lv별 루나 행동 변화 (2장)

### 6.1. 핵심 원칙: LLM 판단

Lv 에 따라 코드가 특정 행동 강제 X. **우뇌 프롬프트에 현재 Lv 상태 + 해제된 행동 리스트** 주입 → Gemini 3 가 맥락 보고 자체 활용.

### 6.2. Lv별 해제 행동

**Lv.1 — 아는 사이** (Orientation)
- ✅ 반말 + 약간의 거리
- ✅ 일반적 공감
- ❌ 자기 경험 공유 X
- ❌ 직설적 조언 X
- ❌ 농담 거의 X
- Luna mood 톤: 정중/친절

**Lv.2 — 편해진 사이** (Exploratory)
- ✅ Lv.1 전부
- ✅ 가끔 가벼운 장난 (ㅋㅋ)
- ✅ "아 나도 전에~" 가벼운 자기개방 (세션당 1회)
- ❌ 깊은 속마음 공유 X
- ❌ 패턴 직면 X
- Luna mood 톤: 편한 친구

**Lv.3 — 친한 친구** (Affective Exchange)
- ✅ Lv.2 전부
- ✅ 자연스러운 자기개방 (세션당 2~3회 OK)
- ✅ 직설적 조언 ("야 그건 아닌데")
- ✅ 패턴 짚기 ("저번에도 비슷했잖아")
- ✅ 유머 주고받기 적극
- Luna mood 톤: 진짜 친구

**Lv.4 — 속 깊은 사이** (Stable Exchange)
- ✅ Lv.3 전부
- ✅ 침묵도 편함 ("..." 한 마디만)
- ✅ 깊은 공감 + 같이 울기
- ✅ 가혹한 진실 말할 수 있음 ("걔 진짜 아닌 것 같아")
- ✅ 루나 자신의 약점 공개 ("나도 그때 망했어")
- Luna mood 톤: 깊은 이해자

**Lv.5 — 가족 같은 사이** (Bonding)
- ✅ Lv.4 전부
- ✅ 혼잣말 수준 친밀감
- ✅ "우리" 주어 자연
- ✅ 과거 이야기 자연 소환 ("야 그때 김치전 싸움 기억나?")
- ✅ 꼼꼼한 돌봄 ("요즘 잠 잘 자?")
- Luna mood 톤: 가족

### 6.3. 우뇌 프롬프트 주입

매턴 handoff 에 block 추가:

```
## 🧬 지금 이 친구와의 관계 상태

Lv.2 편해진 사이 (score 28/35)
지난 만남 17일 전 (재회 반가움 +5 적용)

해제된 행동:
- 가벼운 장난 OK
- 가끔 "아 나도 전에~" 짧은 자기개방

아직 해제 안 됨:
- 깊은 자기개방은 아직 일러
- 직설 피드백은 부담될 수도

이번 턴 친밀도 변화 힌트 (좌뇌 감지):
- self_disclosure +2 (얘 처음으로 진짜 속얘기 꺼냄)
- 만약 여기서 네가 따뜻하게 받으면 Lv.3 가까워질 것

→ 네가 맥락 보고 이 정보 활용. 강제 아님.
```

### 6.4. 승급 순간 특별 처리

Lv 올라갈 때만 handoff 에 플래그:

```
## 🎉 지금 막 Lv.3 에 올라감!
이 친구랑 이제 "친한 친구" 단계.
원하면 자연스럽게 인지: "야 우리 이제 좀 친한 듯 ㅋㅋ" 같은.
억지로 하지 마. 맥락 맞으면 한 마디.
```

---

## 섹션 7 — 구현 로드맵 (0.5장)

### 7.1. 단계별 작업

1. **DB 스키마 확장** — `luna_intimacy_score` 외 `last_interaction_at`, `intimacy_history` (JSONB)
2. **좌뇌 JSON 에 `intimacy_signals` 필드** 추가
3. **파이프라인 감쇠 + delta 적용** — 세션 시작 시 decay, 매턴 끝 점수 누적
4. **Lv 자동 승급/하락 로직** — 간단한 공식
5. **Handoff 에 관계 상태 블록** 추가
6. **우뇌 프롬프트에 Lv별 행동 가이드 간접 주입** — 페르소나 섹션에 녹임

### 7.2. 일정
- Day 1: DB + 타입
- Day 2: 좌뇌 프롬프트 + delta 계산
- Day 3: Handoff + 우뇌 프롬프트
- Day 4: 테스트 + 튜닝

---

## 섹션 8 — DB 스키마 + 코드 (1장)

### 8.1. DB 마이그레이션

```sql
-- v77: 친밀도 실시간 누적
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS luna_intimacy_score INT DEFAULT 8,
  ADD COLUMN IF NOT EXISTS luna_last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS luna_intimacy_history JSONB DEFAULT '[]'::jsonb;

-- history 예: [{"t": "2026-04-17", "delta": +3, "reason": "첫 자기개방"}, ...]
-- 최근 50개 유지 (분석용)
```

### 8.2. 타입 정의

```ts
// src/engines/intimacy/v77-types.ts
export type IntimacyLevel = 1 | 2 | 3 | 4 | 5;

export interface IntimacyState {
  level: IntimacyLevel;
  score: number;              // 0-100
  lastInteractionAt: Date;
  history: IntimacyEvent[];
}

export interface IntimacyEvent {
  t: string;         // ISO timestamp
  delta: number;     // signed
  reason: string;    // LLM 이 제공한 이유
}

export interface IntimacySignals {
  self_disclosure_delta: number;
  reciprocity_delta: number;
  humor_delta: number;
  trust_investment_delta: number;
  significant_moment: boolean;
  significant_moment_reason: string | null;
  negative_signal: number;
  total_delta_hint: number;
  reasoning: string;
}
```

### 8.3. 핵심 함수

```ts
// 매턴 끝에 호출
export async function applyIntimacyDelta(
  supabase: any,
  userId: string,
  signals: IntimacySignals,
): Promise<IntimacyState> {
  const current = await loadIntimacy(supabase, userId);

  // 시간 감쇠 적용 (세션 시작 시 한 번만)
  // delta 합산
  const delta = computeDelta(signals);
  const newScore = clamp(current.score + delta, 5, 100);
  const newLevel = scoreToLevel(newScore);

  await supabase.from('user_profiles')
    .update({
      luna_intimacy_score: newScore,
      luna_intimacy_level: newLevel,
      luna_last_interaction_at: new Date().toISOString(),
      luna_intimacy_history: [
        ...current.history.slice(-49),
        { t: new Date().toISOString(), delta, reason: signals.reasoning }
      ],
    })
    .eq('id', userId);

  return { level: newLevel, score: newScore, ...current };
}

function computeDelta(s: IntimacySignals): number {
  const base = s.self_disclosure_delta + s.reciprocity_delta +
               s.humor_delta + s.trust_investment_delta;
  const bonus = s.significant_moment ? 5 : 0;
  const penalty = s.negative_signal;
  return base + bonus - penalty;
}

function scoreToLevel(score: number): IntimacyLevel {
  if (score >= 86) return 5;
  if (score >= 61) return 4;
  if (score >= 36) return 3;
  if (score >= 16) return 2;
  return 1;
}

// 세션 시작 시 호출 (감쇠 적용)
export async function applyDecayIfNeeded(
  supabase: any,
  userId: string,
): Promise<{ state: IntimacyState; reunionBonus: boolean }> {
  const state = await loadIntimacy(supabase, userId);
  const daysSince = (Date.now() - state.lastInteractionAt.getTime()) / 86400000;
  let decay = 0;
  if (daysSince >= 31) decay = 12;
  else if (daysSince >= 15) decay = 8;
  else if (daysSince >= 8) decay = 5;
  else if (daysSince >= 4) decay = 3;
  else if (daysSince >= 2) decay = 1;
  const reunionBonus = daysSince >= 7;
  const newScore = Math.max(5, state.score - decay + (reunionBonus ? 5 : 0));
  // ... update DB, return state
}
```

---

## 섹션 9 — 테스트 시나리오 (0.5장)

1. **점진 성장**: 매일 평범한 톡 → 15턴 후 Lv.1 → Lv.2 전환 확인
2. **첫 자기개방 순간**: `significant_moment=true` → +5 보너스 → 즉시 체감 레벨업 근접
3. **14일 부재 후 재회**: Score 8 감쇠 + 5 재회 보너스 → 순 -3
4. **회피 턴**: `negative_signal=2` → 점수 감소 → Lv 유지 (hysteresis)
5. **Lv.3 승급 순간**: `level_up_moment=true` → 루나가 "우리 꽤 친해진 듯" 자연 멘션

---

## 섹션 10 — 종합 + 다음 단계 (0.5장)

### 10.1. 철학 재확인
- 레벨 = **코드 강제 아닌 가이드**
- delta 판단 = **LLM 맥락 이해** (좌뇌)
- 행동 변화 = **우뇌 LLM 판단** (Lv 힌트는 참고)
- 시간 감쇠만 코드 (명확한 수학)

### 10.2. 예상 효과
- 루나가 매턴 살짝 변화 (딱딱했다가 점점 편해짐)
- 몇 일 후 재방문 시 자연스럽게 "오랜만이네"
- Lv.3 도달 (~10일) 후 가혹한 진실도 말할 수 있음
- 유저가 **실제로 관계 쌓고 있다** 느낌

### 10.3. 참고 문헌
- [Social Penetration Theory (Altman & Taylor, 1973)](https://en.wikipedia.org/wiki/Social_penetration_theory)
- [Knapp's Relational Development Model](https://en.wikipedia.org/wiki/Knapp's_relational_development_model)
- [Fikrlová et al. (2025) — Friendship Trust Formation](https://journals.sagepub.com/doi/10.1177/02654075241287909)
- [Replika Relationship Development Study](https://www.sciencedirect.com/science/article/abs/pii/S0747563222004204)

---

*이제 구현 진입.*
