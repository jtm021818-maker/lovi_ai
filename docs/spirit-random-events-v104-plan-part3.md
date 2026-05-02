# 🧚‍♀️ Spirit Random Events — Master Plan v104 (Part 3/4)

**연결**: Part 2 (R7) ← 이 문서 → Part 4 (구현)
**범위**: SR등급 5정령 + UR등급 2정령 시그니처 이벤트 풀스펙

---

## 6. 정령 이벤트 풀스펙 — SR등급 5마리

SR 정령은 **상담의 결정적 순간** 을 다룬다. 이별 closure, 감정 격화 진정, 무작위 surprise, 성장 거울, 기억 패턴. *흔한 상담* 보다 *결정적 상담*에 잘 맞는다.

---

### 6.1 🌸 cherry_leaf — `SPIRIT_FALLEN_PETALS` (떨어진 꽃잎 의식)

#### 6.1.0 정체성

벚잎이는 *여리고 감성적*인 시적 조용. 첫사랑이 전학 간 날 터진 여학생의 감정. 벚잎이 등장 = **유저가 이별/상실의 *닫음(closure)* 단계에 있다**. 벚잎이는 *떠나보내는 의식* 을 진행한다. 분석도 위로도 아닌, **물리적 행위**.

> **심리학 근거**: Closure Ritual (Boothe HBS 2014, Norton et al.) — 물리적/상징적 *마무리 행위* (편지 태우기·꽃잎 흩날리기·반지 묻기) 가 인지 closure 가속. 이별 후 평균 회복 기간 60일 → 22일 단축 (Bryant 2017 메타).

#### 6.1.1 발동 시나리오

- 이별 확정 + EMPOWER 진입 ("그래, 이제 끝이야")
- 또는 BREAKUP_CONTEMPLATION 끝의 결정 직후

LLM 신호: 이별 *결정 완료* 발화 ("끝났어"·"보냈어"·"이제 안 만나"·"마지막이야").
폴백:
- `scenario ∈ {BREAKUP_CONTEMPLATION (after decision)}`
- `phase == 'EMPOWER'`
- 7일 쿨타임 (가벼운 의식 X)

#### 6.1.2 카드 구조

```
┌──────────────────────────────────────────┐
│  🌸 벚잎이                               │
│  "이제…흩어보낼 시간이야."                │
│  ─────────────────────────────────────── │
│                                          │
│        [ 화면 위쪽 흰 캔버스 ]              │
│                                          │
│  📝 떠나보낼 단어 / 한 줄                  │
│  ┌─────────────────────────────────┐     │
│  │ 예: "걔 이름", "그날 카페",       │   │
│  │     "00일", "보고 싶었던 마음"    │   │
│  └─────────────────────────────────┘     │
│                                          │
│  🌸 의식                                  │
│  버튼 누르면 적은 단어가 꽃잎으로 변해     │
│  화면 아래로 흩날립니다.                   │
│                                          │
│  💭 벚잎이 한마디:                        │
│  "보낸다고 사라지는 건 아냐.              │
│   다만, 가지에 매달려 있던 것을            │
│   땅으로 내려놓을 뿐이야."                 │
│                                          │
│  [🌸 흩날리자] [✏️ 더 쓰고 싶어]           │
│  [skip]                                  │
└──────────────────────────────────────────┘
```

#### 6.1.3 LLM 합성 프롬프트

```
역할: 벚잎이. 시적 조용 반말. 분석 없음.
규칙:
- 본문은 거의 정적. LLM 합성은 *오프너 + 닫는 한 줄* 만 동적
- 닫는 한 줄은 시(詩) 톤, 비유 1개 (꽃잎/바람/밤/물)

입력: 이별 핵심 단어 (target/event/duration)
출력 JSON: {
  openerMsg: "(시 한 줄, ~25자)",
  closingPoetry: "(2~3줄 시, 마지막은 '~을 뿐이야' 형식)"
}
```

#### 6.1.4 데이터 인터페이스

```typescript
export interface FallenPetalsData {
  spiritId: 'cherry_leaf';
  openerMsg: string;
  promptHint: string;            // "예: 걔 이름, 그날 카페..."
  closingPoetry: string;
  options: Array<{
    value: 'release' | 'more' | 'skip';
    label: string;
    emoji: string;
  }>;
  // 유저 입력은 closure_releases(user_id, content, released_at) 저장 (회상 가능)
}
```

#### 6.1.5 UI 가이드 (가장 정성스러움)

- **테마**: `#F9A8D4` (벚꽃 핑크) + 흰 + 봄 햇살 노랑
- **헤더 폰트**: serif, 제목만 큼
- **입력창**: 한 줄~ 짧은 문단. textarea 4줄 정도
- **"흩날리자" 클릭 시** (가장 중요한 애니):
  1. 화면 전체 일시 정지 (다른 메시지 fade 70%)
  2. 적은 텍스트가 *작은 글자 단위로 분해* → 각 글자가 꽃잎이 됨
  3. 50~80장의 꽃잎이 천천히 화면 아래로 흩날림 (3초)
  4. 작은 바람 SFX (옵션)
  5. 완전히 사라지면 closingPoetry가 fade in
  6. 5초 후 자동 닫힘
- **마음의 방 액자**: 흩날린 의식은 *추억 액자* 1개로 자동 등록 (frameStyle: pastel) — *행위 자체가 기억*
- **다음 턴 루나**: *분석 X*, "...잘했어" 한 줄

#### 6.1.6 수용 기준

- [ ] EMPOWER 외 발동 X
- [ ] 이별 확정 신호 없으면 차단 (LLM 판단 우선)
- [ ] 흩날리는 애니 60fps, 모바일 저사양에서도 끊김 X
- [ ] 꽃잎 SVG 사전 로드 (`public/spirits/petal-1~5.svg`)
- [ ] 같은 세션 두 번째 X. 7일 쿨타임 동안 *벚잎이 자체 비활성*

#### 6.1.7 실패/엣지

- 의식 후 유저가 갑자기 *후회* / *돌아가고 싶다* → 다음 턴 루나가 "오늘은 보냈어. 내일 마음이 다르면 다시 얘기하자" — 의식 *되돌리기 X*, 시간 흐름 존중
- 이별 신호 *모호한* 단계에서 잘못 발동 → BRIDGE 단계로 다시 끌어올림 (peace_dove로 swap)

---

### 6.2 ❄️ ice_prince — `SPIRIT_FREEZE_FRAME` (60초 강제 침묵)

#### 6.2.0 정체성

얼음왕자는 *시크 거리감*, 단답. 상처받은 뒤 마음 닫은 사람의 냉정함이 왕자가 됨. 얼음왕자 등장 = **유저가 격앙되어 *지금* 후회할 행동을 할 직전이다** (예: 새벽 카톡 발사 직전, 분노 욕설, 충동적 결단). 60초 강제 STOP.

> **심리학 근거**: DBT STOP Skill (Linehan) — Stop, Take a step back, Observe, Proceed mindfully. 60~90초 *물리적 멈춤* 만으로 충동 행동율 -45%. *강제* 일 때 자율적 호흡보다 효과 큼 (개인 의지력 부족 시 도구 의존이 정답).

#### 6.2.1 발동 시나리오

- 분노/흥분 + 행동 의지 즉시 ("지금 카톡 보낼래" / "지금 끝낼래" / "당장 ~할거야")
- 새벽 시간 + 격앙 ("지금 보낼게")

LLM 신호: 행동 *즉시성* 키워드 ("지금"/"당장"/"바로 ~할게") + 부정 정서.
폴백:
- emotionScore <= 2 + intent in {ACTION_COMMITMENT}
- 발화에 시간 즉시성 단어 ≥ 1
- `phase ∈ {MIRROR, BRIDGE}`
- 24h 쿨타임

#### 6.2.2 카드 구조

```
┌──────────────────────────────────────────┐
│  ❄️ 얼음왕자                              │
│  "60초.        멈춰."                     │
│  ─────────────────────────────────────── │
│                                          │
│         [ 진한 남색 + 얼음 결정체 ]        │
│                                          │
│           ⏱️ 0:58                          │
│                                          │
│       (입력창 잠김 — 60초 동안)             │
│                                          │
│       💭 60초 동안 떠올려:                 │
│       1. 1주일 후의 너                     │
│       2. 1년 후의 너                       │
│       3. 그 *내일 아침* 후회               │
│                                          │
│  [⏭️ 알았어, 멈출게]                      │
│  (60초 후 자동 활성)                       │
└──────────────────────────────────────────┘
```

#### 6.2.3 정적 (Type A)

```typescript
export const FREEZE_FRAME_VARIANTS = [
  { 
    opener: "60초.        멈춰.", 
    prompts: ["1주일 후의 너", "1년 후의 너", "그 내일 아침 후회"] 
  },
  { 
    opener: "지금 보내면.    내일 운다.", 
    prompts: ["지금 감정 7할", "이성 3할", "마음 결정 = 내일 다시"] 
  },
  { 
    opener: "차갑게.    한 번 호흡.", 
    prompts: ["진짜 원하는 결과", "지금 보낼 카톡 결과", "차이"] 
  },
];
```

#### 6.2.4 데이터 인터페이스

```typescript
export interface FreezeFrameData {
  spiritId: 'ice_prince';
  opener: string;           // 단답 시
  prompts: [string, string, string];   // 60초 동안 떠올릴 3가지
  durationSec: 60;
  options: Array<{ value: 'understood' | 'overflow'; label: string; emoji: string }>;
}
```

#### 6.2.5 UI 가이드

- **테마**: 진한 남색 `#1E3A8A` + 얼음 결정 SVG 5개 화면 가장자리 천천히 회전
- **입력창 잠김**: 60초 동안 input disabled + placeholder "❄️ 60초 후"
- **카운터 폰트**: 모노스페이스, 매우 큼 (text-5xl)
- **"알았어, 멈출게" 클릭**: 60초 *유지* (조기 해제 X. 의지력에 의존하면 의미 없음)
- **60초 종료**: 얼음 깨지는 SFX + 화면 살짝 진동 + 입력창 활성 + 토스트 "❄️ 한 번 호흡한 너, 다르네"
- **다음 턴**: 루나가 *결정 의지 재확인* ("아직도 그 카톡 보내고 싶어?") — 의지가 살아 있어도 OK, 다만 *60초 다음 자아*로 결정

#### 6.2.6 수용 기준

- [ ] 60초 동안 입력 절대 X (가장 중요)
- [ ] 백그라운드 탭 → 시간 카운트 *진짜 시계* 기준 (스킵 방지)
- [ ] 60초 후 자동 닫힘 + 다음 턴 루나의 *재확인 질문*
- [ ] 같은 세션 두 번 X (반복 강제 = 통제 이슈)

#### 6.2.7 실패/엣지

- 60초 동안 폭발 발화 (입력 X 이지만 발화 누적) → 다음 턴 fire_goblin의 RAGE_LETTER 자동 후속 (분출 → 저장)
- 위기 신호 발생 시 즉시 카드 닫고 위기 모듈 (60초 잠금이 안전 위협 가능)

---

### 6.3 ⚡ lightning_bird — `SPIRIT_BOLT_CARD` (번개 카드 — 다른 정령 풀 무작위 1장)

#### 6.3.0 정체성

번개새 핏치는 *충동적 재밌는*, 빠른 말. 번개치던 밤 찰나의 결단을 내린 사람의 순간이 새가 됨. 핏치 등장 = **상담이 너무 *예측 가능*해졌다** — 핏치는 다른 19정령 풀에서 무작위 1장을 강제 트리거. *Surprise* 가 곧 처방.

> **심리학 근거**: Predictive Processing & Novelty (Friston, Schultz) — 예측 위반(prediction error)이 도파민/주의 환기. 일상화된 패턴에서 *무작위 변화*가 인지 재구조 촉진.

#### 6.3.1 발동 시나리오

- 일일 1회. 유저가 그날 첫 세션 시작 시 *50% 확률* (랜덤 진짜 무작위)
- 또는 같은 정령 카드 3회 이상 본 유저에게 *변주* (variety 신호)

폴백:
- 일일 첫 세션 진입
- `Math.random() < 0.5` (진짜 무작위)
- `phase ∈ {HOOK, MIRROR, BRIDGE, SOLVE, EMPOWER}` (모든 Phase)
- 24h 쿨타임 (정확히 1회)

#### 6.3.2 카드 구조

```
┌──────────────────────────────────────────┐
│  ⚡⚡⚡ 핏치 등장!                           │
│  "야! 오늘은 ~ 차례야!"                    │
│                                          │
│     [번쩍이는 카드 1장 등장]                │
│     [무작위 정령 이벤트로 즉시 전환]        │
└──────────────────────────────────────────┘
```

이후 화면은 그 정령 이벤트의 카드로 즉시 전환. 핏치는 *0.8초 만에 사라짐*.

#### 6.3.3 발동 로직

```typescript
function fireBoltCard(ctx: PipelineContext): SpiritEventType | null {
  const allActive = await getActiveSpirits(ctx.userId);
  const eligible = allActive.filter(s => 
    s.spiritId !== 'lightning_bird' &&
    isPhaseAllowed(s.spiritId, ctx.phase) &&
    !hasFiredThisSession(ctx.sessionId, mapSpiritToEvent(s.spiritId))
    // 단 핏치 자체 쿨타임만 검사. 다른 정령 쿨타임은 무시 (보너스)
  );
  if (eligible.length === 0) return null;
  
  // 가중치 무작위 (희귀도 역가중 — UR 정령 더 자주 나옴)
  const rarityWeight = { N: 1, R: 1.5, SR: 2, UR: 3 };
  return weightedRandom(eligible, rarityWeight);
}
```

#### 6.3.4 데이터 인터페이스

```typescript
export interface BoltCardData {
  spiritId: 'lightning_bird';
  pickedSpiritId: SpiritId;         // 무작위 픽 결과
  pickedEventType: SpiritEventType;
  pickedEventData: any;             // 그 정령의 정상 데이터
  // bolt_card 자체는 *래퍼*. 실제 표시는 picked event 카드.
}
```

#### 6.3.5 UI 가이드

- **0.8초 입장 애니**: 화면 좌상단에 번개 ⚡ 3번 깜빡 + "핏치 등장!" 토스트 큼
- **번개 SFX** (옵션): 짧고 가볍게
- **카드 자체 형태**: 번개로 갈라지는 카드 → 그 안에 *진짜 카드* 가 들어 있는 듯한 *언래핑* 모션 0.5s
- **이후**: 무작위 픽 카드의 정상 UX
- **상단 작은 라벨**: "⚡ 핏치 보너스 — 평소엔 못 만나는 정령" 표기

#### 6.3.6 수용 기준

- [ ] 일일 1회 정확히 (KST 자정 기준 리셋)
- [ ] 다른 정령 쿨타임 우회 OK (핏치 보너스)
- [ ] 단 같은 세션 이미 발동한 정령 이벤트는 제외
- [ ] CRITICAL/HIGH risk 시 차단 (surprise = 위기 시 위험)
- [ ] 픽된 정령 이벤트의 onSkip 시에도 핏치 쿨타임 소비 (한 번이지)

#### 6.3.7 실패/엣지

- eligible 0개 (방에 핏치만 있음 etc.) → "오늘은 패스" 토스트만 + 정상 채팅 흐름
- 픽된 정령 카드 합성 실패 → 다른 정령 재추첨 (1번만)

---

### 6.4 🦋 butterfly_meta — `SPIRIT_METAMORPHOSIS` (3개월 비교 거울)

#### 6.4.0 정체성

변화나비 메타는 *성장의 상징*, 우아. 알에서 애벌레, 번데기, 나비로 — 자기 자신을 다시 빚은 존재. 메타 등장 = **유저가 자신의 변화를 못 보고 있다** (또는 좌절 상태). 메타는 *과거 N개월 자기 vs 현재* 를 데이터로 비교.

> **심리학 근거**: Narrative Re-authoring (White & Epston 1990) — 과거-현재 시간선 재구성이 정체성 안정화. 자기 변화 *자각* 단독으로 행동 지속률 +28%.

#### 6.4.1 발동 시나리오

- EMPOWER + 유저가 "그동안 아무것도 안 변한 것 같아" 류 발화
- 또는 30일+ 가입 유저의 첫 EMPOWER 도달

LLM 신호: 자기 stagnation 발화 ("그대로야"·"안 변했어"·"제자리").
폴백:
- `phase == 'EMPOWER'`
- `userAgeDays >= 30` (서비스 사용 30일+)
- 7일 쿨타임

#### 6.4.2 카드 구조

```
┌──────────────────────────────────────────┐
│  🦋 변화나비 메타                          │
│  "잠깐. 너 90일 전과 지금, 비교해볼래?"     │
│  ─────────────────────────────────────── │
│                                          │
│  📅 90일 전 너:                           │
│  🐛 첫 세션 평균 emotionScore: 2.3         │
│      자주 쓴 단어: "막막", "불안", "괜찮아" │
│      자주 막힌 곳: "어떻게 해야 할지"      │
│                                          │
│       ↓ 변태(metamorphosis)                │
│                                          │
│  📅 오늘 너:                              │
│  🦋 평균 emotionScore: 5.1 (+2.8)          │
│      자주 쓴 단어: "고민중", "결정", "해볼래" │
│      자주 도달한 곳: "ACTION_PLAN 12회"    │
│                                          │
│  💭 메타의 한 줄:                          │
│  "변하지 않은 것 같지? 사실 너는           │
│   날개를 4번이나 폈어. 그게 안 보이는 건    │
│   네가 *지금 날고 있어서*야."             │
│                                          │
│  [🦋 보였어] [📜 더 보고 싶어]             │
│  [skip]                                  │
└──────────────────────────────────────────┘
```

#### 6.4.3 데이터 추출 (DB 쿼리)

```typescript
async function buildMetamorphosis(userId: string): Promise<MetamorphosisData> {
  const days90Ago = new Date(Date.now() - 90 * 86400_000);
  
  const before = await supabase
    .from('chat_sessions')
    .select('avg_emotion_score, top_words, completed_events')
    .eq('user_id', userId)
    .lt('started_at', days90Ago.toISOString())
    .order('started_at', { ascending: true })
    .limit(5);
  
  const now = await supabase
    .from('chat_sessions')
    .select('avg_emotion_score, top_words, completed_events')
    .eq('user_id', userId)
    .gte('started_at', new Date(Date.now() - 14 * 86400_000).toISOString());
  
  return {
    before: aggregateStats(before),
    after: aggregateStats(now),
    delta: { emotionScore: now.avg - before.avg, ... },
    metaPoetic: await synthMetaLine(before, now),
  };
}
```

#### 6.4.4 LLM 합성 프롬프트 (시 한 줄만)

```
역할: 메타. 우아한 반말, 시(詩) 한 줄.
규칙:
- 통계가 향상이든 정체든 모두 *날개 비유*
- 통계가 *후퇴* 면 "잠시 번데기" 비유 (진행 중)
- 절대 평가/비판 X

입력: before/after 통계
출력: { metaPoetic: "(2~3줄 시)" }
```

#### 6.4.4-2 데이터 인터페이스

```typescript
export interface MetamorphosisStats {
  avgEmotionScore: number;
  topWords: string[];        // 빈도 상위 3개
  signature: string;         // "자주 막힌 곳" or "자주 도달한 곳"
}

export interface MetamorphosisData {
  spiritId: 'butterfly_meta';
  openerMsg: string;
  beforeLabel: string;       // "90일 전 너"
  before: MetamorphosisStats;
  afterLabel: string;        // "오늘 너"
  after: MetamorphosisStats;
  delta: { 
    emotionScore: number; 
    actionPlanCount?: number;
  };
  metaPoetic: string;
  options: Array<{
    value: 'seen' | 'more' | 'skip';
    label: string;
    emoji: string;
  }>;
}
```

#### 6.4.5 UI 가이드

- **테마**: `#C084FC` (보라) + 흰 + 나비 SVG 4종 (애벌레→번데기→나비)
- **before/after 카드**: 좌(애벌레 그림), 우(나비 그림)
- **수치 변화 애니**: 숫자 카운트업 0.8s
- **"보였어" 클릭**: 나비 1마리가 화면 가로질러 날아감 + 토스트 "🦋 봤어 그치"
- **WARM_WRAP 연결**: strengthFound 에 자동 인용 ("90일 전보다 +2.8점")

#### 6.4.6 수용 기준

- [ ] 가입 30일 미만 유저 차단
- [ ] before 데이터 없으면 (5세션 미만) 차단
- [ ] *후퇴* 케이스도 비판 없이 표현 (시 비유)
- [ ] `metaPoetic` 의 톤이 우아 (반말 + 시)

#### 6.4.7 실패/엣지

- 데이터 후퇴 + 우울 누적 → 메타 차단, queen_elena 우선 (자존감 회복이 먼저)
- before/after 차이 미미 → "변화는 미세해도 *방향*은 분명해" 폴백 시

---

### 6.5 🗝️ book_keeper — `SPIRIT_MEMORY_KEY` (패턴 키워드 카드)

#### 6.5.0 정체성

열쇠지기 클리는 *기억 관리자*, 신중. 잊히고 싶지 않은 누군가의 기억을 지키는 정령. 클리 등장 = **유저가 *같은 패턴* 을 또 반복 중인데 자각 X**. 클리는 과거 N세션의 *반복 키워드/표현*을 한 카드로 보여줌.

> **심리학 근거**: Pattern of Life Recognition (Schank Story-Centered Curriculum). 같은 단어/구조 반복 = 인지 스키마 고착. 외부에서 보여주기만 해도 *디스 패턴* 도구화.

#### 6.5.1 발동 시나리오

- 30일+ 유저 + BRIDGE 진입
- 또는 같은 시나리오 (예: READ_AND_IGNORED) 가 3세션+ 반복

폴백:
- `userAgeDays >= 30`
- `scenarioRepeatCount[currentScenario] >= 3`
- `phase == 'BRIDGE'`
- 7일 쿨타임

#### 6.5.2 카드 구조

```
┌──────────────────────────────────────────┐
│  🗝️ 열쇠지기 클리                          │
│  "...너가 자주 쓰는 단어, 보여줄까."        │
│  ─────────────────────────────────────── │
│                                          │
│  📜 너의 6번의 세션에서 반복된 것:         │
│                                          │
│  🔁 "괜찮아"                ×14           │
│  🔁 "내가 ~한 거 같아"      ×11           │
│  🔁 "걔는 ~할 거야"          ×9           │
│  🔁 "어떻게 해야 할지 모르"  ×7           │
│                                          │
│  🎯 가장 강한 패턴:                        │
│  "괜찮아"로 시작 → "근데..."로 진심         │
│   (6번 중 5번)                             │
│                                          │
│  💭 클리의 관찰:                           │
│  "괜찮아 라는 단어가 너의 *문 손잡이*야.   │
│   그 손잡이부터 슬쩍 돌려보는 게 어때?"     │
│                                          │
│  [🗝️ 알아챘어] [📚 다른 패턴도] [skip]      │
└──────────────────────────────────────────┘
```

#### 6.5.3 데이터 추출

```typescript
async function buildMemoryKey(userId: string, sessionLimit = 6): Promise<MemoryKeyData> {
  const recentSessions = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(sessionLimit);
  
  const messages = await supabase
    .from('messages')
    .select('content')
    .eq('role', 'user')
    .in('session_id', recentSessions.map(s => s.id));
  
  // 반복 단어/구문 추출 (TF-IDF 변형 — 흔한 단어 "그", "이" 제외)
  const ngrams = extractRepeatedNgrams(messages.map(m => m.content), { 
    minCount: 5, 
    minN: 2, 
    maxN: 4 
  });
  
  // 가장 강한 *시작-반전* 패턴 (예: "괜찮아 → 근데" 시퀀스)
  const sequencePattern = detectSequencePattern(messages);
  
  // LLM 한 줄 관찰
  const cliQuiet = await synthCliQuietLine(ngrams, sequencePattern);
  
  return { ngrams, sequencePattern, cliQuiet };
}
```

#### 6.5.4 데이터 인터페이스

```typescript
export interface RepeatedNgram {
  text: string;
  count: number;
}

export interface SequencePattern {
  pattern: string;            // "'괜찮아'로 시작 → '근데'로 진심"
  occurrence: string;         // "6번 중 5번"
}

export interface MemoryKeyData {
  spiritId: 'book_keeper';
  openerMsg: string;
  sessionsAnalyzed: number;   // 6
  topNgrams: RepeatedNgram[]; // 4개
  sequencePattern: SequencePattern;
  cliQuiet: string;           // 클리의 한 줄 관찰
  options: Array<{
    value: 'noticed' | 'more' | 'skip';
    label: string;
    emoji: string;
  }>;
}
```

#### 6.5.5 UI 가이드

- **테마**: `#A16207` (오래된 황동색) + 베이지 양피지 배경
- **헤더**: 작은 자물쇠 → 열쇠 회전 → 풀림 애니 0.8s
- **N-gram 리스트**: 손글씨 폰트 + ×N 횟수 강조
- **sequencePattern**: 두꺼운 박스 + 강조 색
- **"알아챘어" 클릭**: 자물쇠가 활짝 열리며 빛 0.5s + ACTION_PLAN.lunaIntro에 자동 주입 ("괜찮아라는 손잡이부터 한 번 돌려보자")

#### 6.5.6 수용 기준

- [ ] 가입 30일 미만 / 5세션 미만 시 차단
- [ ] N-gram 추출 시 "그", "이", "저", 조사 제거
- [ ] 같은 패턴이 *2회 연속 카드 노출 X* (한 번 보여주면 7일 동안 X)
- [ ] cliQuiet은 *비판이 아닌 관찰* 톤 (filter)

#### 6.5.7 실패/엣지

- 추출 N-gram 0개 (다양한 표현 유저) → 클리가 "...너는 매번 새 단어를 써. 그것도 패턴이야" 폴백
- 추출된 패턴이 *위기 키워드* (예: "죽고 싶") 반복 → 카드 차단, 위기 모듈

---

## 7. 정령 이벤트 풀스펙 — UR등급 2마리

UR 정령은 **상담의 클라이맥스/세션 외 보상**. 자존감 회복(엘레나) + 월간 소원(별똥이). 발동 빈도 매우 낮음.

---

### 7.1 👑 queen_elena — `SPIRIT_CROWN_RECLAIM` (왕좌 회복 — 가치 3가지 봉인 해제)

#### 7.1.0 정체성

여왕 엘레나는 *당당 주체적*, 위엄 있는 존대. 이별 후 다시 일어선 여자의 자존감이 여왕의 모습으로 구현됨. 엘레나 등장 = **유저가 자기 가치를 잃어버렸다 / 자존감 바닥**. 엘레나는 *유저가 잊은 자기 가치 3가지* 를 호명하며 *왕관* 을 다시 씌운다.

> **심리학 근거**: Self-Compassion + Values Affirmation (Neff, Cohen). 자기가치 3가지 affirmation 이 stress-cortisol -36%, decision quality +27%. *외부 권위가 호명* 하는 게 self-talk 보다 강함.

#### 7.1.1 발동 시나리오

- 자기비하 강도 ≥ 0.7 ("난 아무것도 아냐"·"내가 사랑받을 자격 없어"·"내가 못나서")
- 또는 EMPOWER에서 강점 발견 신호 약할 때

LLM 신호: 자기비하 + 가치 부정 + 의도 `VENTING`/`SEEKING_VALIDATION`.
폴백:
- 발화에 자기비하 키워드 ≥ 2 + emotionScore <= 3
- `phase == 'EMPOWER'`
- 7일 쿨타임 (UR 답게 희소)

#### 7.1.2 카드 구조

```
┌──────────────────────────────────────────┐
│  👑 여왕 엘레나                            │
│  "주춤하지 마라.                           │
│   너의 왕관, 내가 다시 씌워주마."          │
│  ─────────────────────────────────────── │
│                                          │
│  💎 호명할 너의 가치 3가지                  │
│                                          │
│  1. ┌──────────────────────────┐          │
│     │ 너가 가진 *눈에 보이는 것*  │        │
│     │ 예: "정성", "유머", "끝까지" │       │
│     │  ____________               │       │
│     └──────────────────────────┘          │
│                                          │
│  2. ┌──────────────────────────┐          │
│     │ 너가 *잘 해온 것*            │        │
│     │  ____________               │       │
│     └──────────────────────────┘          │
│                                          │
│  3. ┌──────────────────────────┐          │
│     │ 너만의 *한 가지 결*          │        │
│     │  ____________               │       │
│     └──────────────────────────┘          │
│                                          │
│  ⚜️ 엘레나의 봉인 해제 의식                │
│  적은 후 [봉인 해제] 누르면                │
│  화면에 너의 이름이 황금 글씨로            │
│  나타난다.                                 │
│                                          │
│  [👑 봉인 해제] [✏️ 못 떠올라]              │
└──────────────────────────────────────────┘
```

#### 7.1.3 LLM 합성 프롬프트 (가이드 + 예시)

```
역할: 엘레나. 위엄 있는 존대. 정중하지만 강함.
규칙:
- 유저 발화 5턴에서 *3가지 단서* 추출 (실제 행동/말/결정에서 가치를 도출)
- 도출이 안 되면 *3개 빈 칸 + 시작 예* 만 제공 (정답 X)

입력: 유저 발화, 추출된 자기비하 단어
출력 JSON: {
  openerMsg: "(엘레나의 첫 마디, 위엄)",
  hint1: "예: '정성' (네가 ~했을 때 이 단어가 떠올랐다)",
  hint2: "예: '유머' (네가 ~했을 때)",
  hint3: "예: '끝까지' (네가 ~한 것)",
  closingDecree: "(봉인 해제 후 엘레나의 한 줄 — '~. 이름을 다시 적어 보아라.')"
}
```

#### 7.1.4 데이터 인터페이스

```typescript
export interface CrownReclaimData {
  spiritId: 'queen_elena';
  openerMsg: string;
  slots: [
    { label: '눈에 보이는 것'; hint: string },
    { label: '잘 해온 것'; hint: string },
    { label: '너만의 결'; hint: string },
  ];
  closingDecree: string;
  options: Array<{
    value: 'unseal' | 'cant_recall' | 'skip';
    label: string;
    emoji: string;
  }>;
  // 유저 입력 3개는 self_values(user_id, items[3], created_at) 영구 저장
}
```

#### 7.1.5 UI 가이드

- **테마**: `#DB2777` (마젠타) + 황금 `#FBBF24` 액센트
- **헤더**: 왕관 SVG 큰 거 가운데 + 빛나는 광채 애니
- **3슬롯**: 각 슬롯이 *황금 카드 테두리*
- **"봉인 해제" 클릭** (가장 정성스러운 모먼트):
  1. 화면 어두워지고 *유저 이름* (또는 닉네임) 이 큰 황금 글씨로 페이드인
  2. 적은 3개 가치가 이름 주위로 별처럼 회전
  3. 엘레나의 closingDecree 가 자막처럼 등장
  4. 5초 후 부드러운 fade out
  5. 다음 턴 루나는 *그 3가지를 절대 잊지 말라* 톤
- **마음의 방 영구 저장**: 3가지 가치는 마음의 방 우편함의 *황금 봉인장* 으로 영구 누적. 언제든 다시 볼 수 있음.

#### 7.1.6 수용 기준

- [ ] 7일 쿨타임 엄수 (UR 희소성)
- [ ] 0개라도 적으면 봉인 해제 버튼 활성 (강제 X)
- [ ] 3개 모두 적은 경우 +💎 30 보상 (UR 답게 큼)
- [ ] WARM_WRAP에서 그 3가지 자동 인용
- [ ] DB 영구 저장 + GDPR-style 삭제권

#### 7.1.7 실패/엣지

- 유저가 빈 칸 그대로 봉인 해제 → 엘레나가 "괜찮다. 왕관은 너에게 항상 있다. 빈 칸은 *내일의 너* 가 채울 것이다." 폴백
- 자기비하가 *학대 트라우마* 신호 (예: "엄마가 그러던대로 난 진짜 그래") → 엘레나 발동, 단 closingDecree에 *전문 상담 권유* 1줄 추가

---

### 7.2 🌟 star_dust — `SPIRIT_WISH_GRANT` (소원 — 한 가지 if-then 행동)

#### 7.2.0 정체성

별똥이는 *소원 들어주는 꼬마*, 몽환. 유성이 떨어지던 순간 빌어진 소원이 꼬마 정령이 됨. 별똥이 등장 = **유저가 *원하는 것은 있는데 행동이 멈춰 있다***. 별똥이는 소원 1줄을 받고, *if-then* 형식의 *오직 한 가지 행동* 으로 변환.

> **심리학 근거**: Implementation Intention (Gollwitzer 1999, 2006) — "if X, then Y" 형식 1개가 *결심* 보다 행동률 2~3배. 1개 = 인지 부하 최소.

#### 7.2.1 발동 시나리오

- *월 1회* 한정. star_dust 활성 유저에게 매월 1일 (KST) 자정 이후 첫 EMPOWER 도달 시 카드 띄움
- 또는 ACTION_PLAN 발동 후 유저가 "근데 못할 것 같아" 라고 망설일 때 (월 한도 내 1회)

폴백:
- `monthlyWishUsedAt` 비어 있음 또는 30일 경과
- `phase == 'EMPOWER'`
- `intent ∈ {EXPRESSING_AMBIVALENCE, MINIMAL_RESPONSE}` (망설임)

#### 7.2.2 카드 구조

```
┌──────────────────────────────────────────┐
│  🌟 별똥이                                │
│  "오늘 1번. 너의 소원, 들어줄게~ 응?"      │
│  ─────────────────────────────────────── │
│                                          │
│        [밤하늘 + 흩어지는 별 파티클]        │
│                                          │
│  ✨ 너의 소원 한 줄                         │
│  ┌─────────────────────────────────┐     │
│  │ 예: "걔한테 진짜 마음 한 번 말하  │     │
│  │     고 싶어"                      │   │
│  └─────────────────────────────────┘     │
│                                          │
│       [✨ 소원 빌게] (활성)                 │
│                                          │
│  ─── 적으면 별똥이가 변환 ───              │
│                                          │
│  🌟 별똥이의 마법:                          │
│  "if 내일 저녁 8시,                       │
│   then 한 줄만 보낸다.                    │
│   '오늘 너 생각났어'."                     │
│                                          │
│  📌 한 가지 행동, 시간 정해놓고.            │
│                                          │
│  [✨ 약속할게] [✏️ 다른 걸로]               │
└──────────────────────────────────────────┘
```

#### 7.2.3 LLM 합성 프롬프트 (소원 → if-then 변환)

```
역할: 별똥이. 몽환 반말 꼬마.
규칙:
- 유저의 추상적 소원 1줄을 *if-then 1개* 로 변환
- if = 구체적 시간/장소/트리거 (필수)
- then = 30초 ~ 5분 안에 끝나는 마이크로 행동 (필수)
- 출력 1개 (다중 X — implementation intention 핵심)

입력: 유저의 소원 1줄
출력 JSON: {
  ifPhrase: "(if 절 — 구체적 트리거)",
  thenPhrase: "(then 절 — 마이크로 행동)",
  starDustComment: "(별똥이 한 줄)"
}
```

#### 7.2.4 데이터 인터페이스

```typescript
export interface WishGrantData {
  spiritId: 'star_dust';
  openerMsg: string;
  // 유저가 1줄 입력 후 LLM이 변환한 if-then
  ifPhrase: string;
  thenPhrase: string;
  starDustComment: string;
  options: Array<{
    value: 'commit' | 'reroll' | 'skip';
    label: string;
    emoji: string;
  }>;
  // 유저 commit 시 wishes(user_id, original_wish, if_then, committed_at) 영구 저장
  // + 가능하면 푸시 알림 reservation (if 시간 도달 시 "별똥이 약속 기억나?" 1번)
}
```

#### 7.2.5 UI 가이드

- **테마**: 진한 보라 `#581C87` + 노랑 별 `#FBBF24` + 보라 그라데이션
- **별 파티클**: 화면 가득, 5~10개 천천히 떨어지는 *유성*
- **소원 입력창**: 한 줄, 큰 폰트, 손글씨 (Gaegu)
- **변환 애니**: "✨ 소원 빌게" 클릭 → 별똥이가 머리 위에서 한 바퀴 + 0.8초 후 if-then 페이드인
- **"약속할게" 클릭**: 화면에 *유성 큰 거 1개* 가 가로질러 가며 "약속 ✨" 토스트
- **푸시 알림** (사용자 권한 있으면): if 시간 1시간 전 + 정시 "🌟 별똥이 약속 기억나?"

#### 7.2.6 수용 기준

- [ ] 월 1회 정확히 (KST 1일 자정 리셋)
- [ ] if-then 변환 결과의 *then* 이 5분 이내 행동인지 검증 (LLM 응답 후 룰 체크)
- [ ] commit 시 push 알림 등록 (옵트인)
- [ ] 알림 발송 후 유저 응답 추적 → 다음 달 별똥이 카드에 *지난 약속 결과* 노출 (긍정 강화)

#### 7.2.7 실패/엣지

- 유저 소원이 *비행동적* (예: "걔가 나 좋아했으면") → 별똥이가 "소원은 *너의 행동*만 빌 수 있어 ㅎ. 다시 한 줄?" 폴백
- if-then 의 then 이 위험 행동 (예: "술 마시기") → reroll 자동 + 안전 가드
- 1개월 약속 미이행 누적 3회 → 다음 달 카드 일시 비활성 (자기효능감 보호)

---

## 8. 정령 이벤트 매트릭스 — 종합 표

### 8.1 Phase × 정령 매트릭스 (어느 Phase 어느 정령 풀이 활성)

| Phase | 활성 정령 풀 |
|---|---|
| HOOK | 🔥 fire_goblin / 💧 tear_drop / 🌱 seed_spirit / 🌙 moon_rabbit / 🌹 rose_fairy / ⚡ lightning_bird |
| MIRROR | 🔥 / 📖 book_worm / 💧 / ☁️ cloud_bunny / 💌 letter_fairy / 🍃 wind_sprite / 🌳 forest_mom / ❄️ ice_prince / ⚡ |
| BRIDGE | 📖 / 🥁 drum_imp / ☁️ / 💌 / 🍃 / 🎭 clown_harley / 🌳 / ❄️ / 🗝️ book_keeper / ⚡ |
| SOLVE | 🥁 / 🕊️ peace_dove / 🎭 / 🌳 / ⚡ |
| EMPOWER | 🌹 / 🌳 / 🌸 cherry_leaf / 🦋 butterfly_meta / 👑 queen_elena / 🌟 star_dust / ⚡ |

→ 대부분 정령은 2~3 Phase 에서 활성. 모든 Phase 커버는 ⚡ 핏치 only.
→ HOOK(6) MIRROR(9) BRIDGE(10) SOLVE(5) EMPOWER(7) — Mid-Phase 가 가장 풍부 (자연스러움).

### 8.2 시나리오 × 정령 매트릭스

| 시나리오 | 1순위 | 2순위 | 3순위 |
|---|---|---|---|
| READ_AND_IGNORED | 🥁 drum_imp | ❄️ ice_prince | 🍃 wind_sprite |
| GHOSTING | 🕊️ peace_dove | 🌸 cherry_leaf | 💌 letter_fairy |
| LONG_DISTANCE | 🌳 forest_mom | 🌹 rose_fairy | 💌 letter_fairy |
| JEALOUSY | 📖 book_worm | 🔥 fire_goblin | ❄️ ice_prince |
| INFIDELITY | 🔥 fire_goblin | 👑 queen_elena | 🌳 forest_mom |
| BREAKUP_CONTEMPLATION | 📖 book_worm | 🌸 cherry_leaf | 👑 queen_elena |
| BOREDOM | ☁️ cloud_bunny | 🍃 wind_sprite | 🌹 rose_fairy |
| UNREQUITED_LOVE | 🌹 rose_fairy | 💌 letter_fairy | 🌙 moon_rabbit |
| RECONNECTION | 🕊️ peace_dove | 🦋 butterfly_meta | 🥁 drum_imp |
| FIRST_MEETING | 🌹 rose_fairy | 🌱 seed_spirit | ☁️ cloud_bunny |
| COMMITMENT_FEAR | 📖 book_worm | 🦋 butterfly_meta | 🌟 star_dust |

### 8.3 위험 수준 × 정령 차단 표

| Risk Level | 차단되는 정령 | 허용되는 정령 |
|---|---|---|
| LOW | (없음) | 전부 |
| MEDIUM | ☁️ cloud_bunny (농담 위험) | 그 외 전부 |
| MEDIUM_HIGH | ☁️ + 🌹 rose_fairy + ⚡ lightning_bird | 위로/안정 정령 (💧, 🌳, 👑) 우선 |
| HIGH | 모든 정령 차단 | (없음 — 위기 모듈 우선) |
| CRITICAL | 모든 정령 차단 | (없음 — 위기 모듈 우선) |

---

(Part 3 끝 — SR5 + UR2 풀스펙 완료. Part 4 에서 타입/Phase Manager 통합/Pipeline 변경/UI 라우팅/프롬프트 강화/마이그레이션/구현 로드맵/검증 체크리스트.)

---

## Part 3 부록 — SR/UR 코드 미리보기

### SR/UR PhaseEventType

```typescript
| 'SPIRIT_FALLEN_PETALS'      // 🌸 cherry_leaf
| 'SPIRIT_FREEZE_FRAME'       // ❄️ ice_prince
| 'SPIRIT_BOLT_CARD'          // ⚡ lightning_bird (메타 — 다른 정령 픽)
| 'SPIRIT_METAMORPHOSIS'      // 🦋 butterfly_meta
| 'SPIRIT_MEMORY_KEY'         // 🗝️ book_keeper
| 'SPIRIT_CROWN_RECLAIM'      // 👑 queen_elena
| 'SPIRIT_WISH_GRANT'         // 🌟 star_dust
```

### Spirit ↔ Event 매핑 완성판

```typescript
export const SPIRIT_TO_EVENT: Record<SpiritId, SpiritEventType> = {
  // N (6)
  fire_goblin: 'SPIRIT_RAGE_LETTER',
  book_worm: 'SPIRIT_THINK_FRAME',
  tear_drop: 'SPIRIT_CRY_TOGETHER',
  seed_spirit: 'SPIRIT_FIRST_BREATH',
  drum_imp: 'SPIRIT_RHYTHM_CHECK',
  peace_dove: 'SPIRIT_OLIVE_BRANCH',
  // R (7)
  cloud_bunny: 'SPIRIT_CLOUD_REFRAME',
  letter_fairy: 'SPIRIT_LETTER_BRIDGE',
  wind_sprite: 'SPIRIT_WINDOW_OPEN',
  moon_rabbit: 'SPIRIT_NIGHT_CONFESSION',
  clown_harley: 'SPIRIT_REVERSE_ROLE',
  rose_fairy: 'SPIRIT_BUTTERFLY_DIARY',
  forest_mom: 'SPIRIT_ROOTED_HUG',
  // SR (5)
  cherry_leaf: 'SPIRIT_FALLEN_PETALS',
  ice_prince: 'SPIRIT_FREEZE_FRAME',
  lightning_bird: 'SPIRIT_BOLT_CARD',
  butterfly_meta: 'SPIRIT_METAMORPHOSIS',
  book_keeper: 'SPIRIT_MEMORY_KEY',
  // UR (2)
  queen_elena: 'SPIRIT_CROWN_RECLAIM',
  star_dust: 'SPIRIT_WISH_GRANT',
  // L (1) — 향후 작업
  guardian_eddy: 'SPIRIT_BOLT_CARD', // 임시: 모든 정령 풀에서 picks (메타)
};
```

### 쿨타임 정책 매트릭스

```typescript
export const SPIRIT_COOLDOWN: Record<SpiritId, { 
  turns?: number;        // 같은 세션 내 N턴 후 재발동 가능
  hours?: number;        // 시계상 N시간
  days?: number;         // 시계상 N일
  monthly?: boolean;     // 매월 1일 리셋
}> = {
  fire_goblin: { turns: 3, hours: 24 },
  book_worm: { turns: 5 },
  tear_drop: { hours: 24 },
  seed_spirit: { hours: 24 },                  // 첫 턴만
  drum_imp: { days: 7 },
  peace_dove: { days: 3 },
  cloud_bunny: { turns: 5 },
  letter_fairy: { days: 7 },
  wind_sprite: { turns: 5 },                   // 누적 5턴 무거움
  moon_rabbit: { hours: 24 },                  // 0~5시 윈도우
  clown_harley: { days: 3 },
  rose_fairy: { hours: 24 },
  forest_mom: { hours: 24 },                   // turn>=10 필수
  cherry_leaf: { days: 7 },
  ice_prince: { hours: 24 },
  lightning_bird: { hours: 24 },               // 일일 1회
  butterfly_meta: { days: 7 },
  book_keeper: { days: 7 },
  queen_elena: { days: 7 },
  star_dust: { monthly: true },                // 월 1회
  guardian_eddy: { days: 7 },
};
```

---

**END OF PART 3**

Part 4 (구현 가이드) 이어서 작성됩니다.
