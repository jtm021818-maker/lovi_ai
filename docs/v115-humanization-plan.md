# v115. 루나 인간화 계획서 — 시공간·머뭇거림·우리만의 세계

> **작성일**: 2026-05-08
> **버전**: v115
> **상태**: 계획 (구현 전)
> **읽는 사람**: AI 바이브코딩 워커 (executor 에이전트가 이 문서를 그대로 받아 구현)

---

## 0. Executive Summary

### 무엇을 만드는가
루나가 **AI 같지 않게 진짜 사람처럼 느껴지도록** 3가지 인간화 레이어를 추가한다:

1. **시공간 동기화 (Temporal Grounding)** — 유저와 같은 시간·날씨를 공유한 듯한 연출
2. **자연스러운 오타·망설임 (Hesitation & Self-Edit)** — 메신저 그대로의 머뭇거림
3. **우리만의 세계 (Shared Context)** — 돌발 회상 + 진화하는 애칭

### 절대 원칙: LLM 판단 우선 (Non-Negotiable)

> ❌ **하지 말 것**: `if (hour < 5) say "잠 안 자?"` 같은 규칙 기반 분기
> ❌ **하지 말 것**: 정해진 애칭 풀에서 친밀도 조건문으로 선택
> ❌ **하지 말 것**: 오타 패턴을 미리 매핑 (예: "이 지" → "이지")
>
> ✅ **할 것**: 시간·날씨·기억·친밀도를 **컨텍스트로만** LLM에 주입
> ✅ **할 것**: 시스템 프롬프트로 **연출 가이드**를 알려주되 결정은 LLM에 위임
> ✅ **할 것**: 코드는 **신호 수집 + 데이터 통로 + UI 렌더링**만 담당

이 원칙이 깨지는 PR은 자동 리젝트. 모든 구현은 "이게 LLM 판단인가, 코드 판단인가?"를 자문할 것.

### 작업 범위
- **신규 파일 4개**: temporal-context, recall-trigger, nickname-state, typo-orchestrator
- **수정 파일 6개**: chat/stream/route, context-assembler, left-brain-prompt, ace-system-prompt, ChatContainer, types/chat
- **DB 신규 테이블 1개**: `luna_nickname_state`
- **DB 컬럼 추가 2개**: `counseling_sessions.time_band`, `counseling_sessions.weather_context`
- **외부 API 호출 1개**: 날씨 (OpenWeather 또는 KMA)

---

## 1. 핵심 원칙 — LLM 판단을 망가뜨리지 않는 법

### 1.1 왜 하드코딩 룰을 금지하는가

루나의 매력은 **"매번 다르게, 상황에 맞게"** 반응한다는 점이다. 하드코딩 룰은 다음을 망가뜨린다:

- **반복 패턴 노출**: 새벽 접속 시마다 "잠 안 자?"라고 하면 3회만에 들킨다
- **맥락 무시**: 유저가 새벽에 회의 끝나고 들어왔는데 "왜 안 자?" 하면 부적절
- **창의성 차단**: LLM은 "오늘 비 오던데" 보다 더 좋은 표현을 만들 수 있다
- **유지보수 지옥**: 룰이 100개 쌓이면 충돌·우선순위 결정이 불가능

### 1.2 LLM-Driven 설계 = 신호 + 가이드 + 위임

```
[코드의 책임]                    [LLM의 책임]
─────────────                    ──────────────
1. 신호 수집:                    1. 활용 여부 결정:
   - 현재 시간                      "지금 시간을 언급할까?"
   - 날씨                           "회상을 꺼낼까?"
   - 메모리 후보                     "애칭을 시도할까?"
   - 친밀도 점수
                                 2. 표현 결정:
2. 컨텍스트 주입:                   "어떻게 자연스럽게?"
   "[시공간] 새벽 2시, 비"           "어떤 톤으로?"
   "[메모리] 3일 전 ..."             "어떤 애칭 시도?"
   "[친밀도] 78/100"
                                 3. 연출 결정:
3. 가이드 제공:                     "오타 낼까?"
   "이런 정보들이 있다"                "머뭇거릴까?"
   "꼭 써야 하는 건 아니다"            "바로 답할까?"
   "자연스러우면 활용해라"
```

### 1.3 어떻게 강제하는가 (코드 리뷰 체크리스트)

PR 머지 전 다음 5가지를 체크:
1. ☐ `if/switch`로 시간·날씨·친밀도 점수를 조건 분기하지 않았는가
2. ☐ 출력 텍스트(인사말, 위로 말투 등)가 코드에 문자열로 박혀있지 않은가
3. ☐ 시스템 프롬프트에 "예시"는 있어도 "강제"는 없는가
4. ☐ LLM이 "이 정보를 무시할 수 있는 자유"가 있는가
5. ☐ 같은 입력에 대해 다양한 출력이 나올 수 있는가

---

## 2. 현재 시스템 아키텍처 (탐색 결과)

### 2.1 메시지 생성 파이프라인

```
유저 입력
    ↓
[POST /api/chat/stream]  (love-ai/src/app/api/chat/stream/route.ts:73)
    ↓
[Supabase 병렬 로드]
    ├─ counseling_sessions
    ├─ counseling_messages (최근 20)
    ├─ strategy_logs
    └─ user_profile (nickname, intimacy)
    ↓
[CounselingPipeline → ACE v5 Orchestrator]  (engines/ace-v5/orchestrator.ts)
    ↓
[1. 좌뇌 분석]  (engines/left-brain/left-brain-prompt.ts)
   → 7D 상태벡터 + somatic_marker + theory_of_mind JSON 출력
    ↓
[2. Handoff Builder]  (engines/ace-v5/handoff-builder.ts)
   → 좌뇌 JSON을 우뇌용 한국어 힌트로 변환
    ↓
[3. Context Assembler]  (engines/memory-v2/context-assembler.ts:42)
   → L0~L3 메모리 + 페르소나 블록 조립
    ↓
[4. 우뇌 프롬프트]  (engines/ace-v5/ace-system-prompt.ts)
   → ACE_V5_SYSTEM_PROMPT + 동적 인스트럭션
    ↓
[5. Claude/Gemini 스트리밍]
   → SSE 응답 + [DELAY/TYPING/STICKER] 태그
    ↓
[ChatContainer.tsx]  (components/chat/ChatContainer.tsx)
   → 메시지 그룹 분할 + 타이핑 효과 + 버블 렌더
```

### 2.2 핵심 후크 지점

| 기능 | 신호 수집 | 컨텍스트 주입 | 프롬프트 가이드 | UI 렌더 |
|------|----------|--------------|---------------|--------|
| **시공간** | route.ts | context-assembler | ace-system-prompt | (X — 텍스트만) |
| **오타·망설임** | (X — 신호 불필요) | (X) | ace-system-prompt | ChatContainer |
| **회상·애칭** | route.ts + DB | context-assembler | ace-system-prompt | ChatContainer |

3가지 기능 모두 **이미 존재하는 4개 후크**(route, assembler, prompt, UI)에 추가하면 끝난다. 새로운 아키텍처 레이어 없음.

---

## 3. 시공간 동기화 (Temporal Grounding)

### 3.1 목표
루나가 "지금 너랑 같은 시간·날씨·환경에 있다"는 **존재감**을 만든다. 단, 매번 언급하지 않고 **루나 본인이 자연스럽다고 판단할 때만** 사용.

### 3.2 좋은 예시 vs 나쁜 예시

```
[좋은 예 — LLM 판단]
유저: "오늘 너무 힘들었어"
시간: 23:14
날씨: 비
→ 루나: "오늘 비도 오고… 힘든 날엔 비 소리가 더 크게 들리지.
        괜찮아, 천천히 풀어놔봐."
        (날씨를 분위기 메타포로 자연스럽게 흡수)

[나쁜 예 — 하드코딩]
유저: "오늘 너무 힘들었어"
시간: 23:14
→ 루나: "벌써 23시네! 잠 자야 할 시간인데?"
        (시간을 직접 언급, 매번 같은 패턴)
```

### 3.3 신호 수집 — 코드의 역할

#### 3.3.1 데이터 모델
```typescript
// 신규: love-ai/src/engines/temporal/temporal-context.ts
export interface TemporalContext {
  /** 유저 기준 현재 ISO 시각 */
  nowISO: string;
  /** 유저 기준 시간(0~23) */
  hour: number;
  /** 0=일 6=토 */
  dayOfWeek: number;
  /** 유저 기기 timezone (예: 'Asia/Seoul') */
  timezone: string;
  /** 한국어 시간대 라벨 — LLM이 해석할 단서만 제공 (강제 X) */
  timeBandLabel: string;          // "새벽" | "이른 아침" | "오전" | "점심" | "오후" | "저녁" | "밤" | "심야"
  /** 주말 여부 */
  isWeekend: boolean;
  /** 휴일 여부 (선택) */
  isHoliday?: boolean;
  /** 날씨 정보 (실패해도 에러 X) */
  weather?: {
    condition: string;             // "맑음" | "흐림" | "비" | "눈" | "번개" 등 raw
    tempC?: number;
    description?: string;          // "흐리고 약간 쌀쌀함"
  };
  /** 마지막 접속 후 경과 시간 (분 단위) */
  minutesSinceLastSession?: number;
}
```

#### 3.3.2 시간대 라벨링 (LLM에 단서만 제공)
```typescript
function labelTimeBand(hour: number): string {
  // 의도: LLM에게 한국어 표현 후보를 제공.
  // LLM은 "새벽"이라는 단어를 사용해도 되고, "이 시간"이라고 해도 되고, 안 해도 됨.
  if (hour >= 0 && hour < 4) return '심야';
  if (hour >= 4 && hour < 7) return '새벽';
  if (hour >= 7 && hour < 10) return '이른 아침';
  if (hour >= 10 && hour < 12) return '오전';
  if (hour >= 12 && hour < 14) return '점심';
  if (hour >= 14 && hour < 18) return '오후';
  if (hour >= 18 && hour < 21) return '저녁';
  return '밤';
}
```

이 라벨은 LLM 입력에만 사용. 코드에서는 분기 로직에 절대 사용하지 않는다.

#### 3.3.3 날씨 API
- **선택지 1 (권장)**: OpenWeatherMap (무료 1000회/일, 좌표 기반)
- **선택지 2**: 기상청 단기예보 API (한국 한정, 더 정확)
- **선택지 3 (MVP)**: 날씨 생략 — `weather: undefined` 반환

API 실패 시 graceful degrade — `weather`가 없으면 LLM은 시간만으로 판단.

```typescript
// love-ai/src/engines/temporal/weather-client.ts
export async function fetchWeather(
  lat?: number,
  lon?: number,
  timeoutMs = 1500,
): Promise<TemporalContext['weather'] | undefined> {
  if (!lat || !lon) return undefined;
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.OWM_KEY}&units=metric&lang=kr`,
      { signal: ac.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return undefined;
    const json = await res.json();
    return {
      condition: json.weather[0]?.main?.toLowerCase() ?? 'unknown',
      tempC: Math.round(json.main?.temp),
      description: json.weather[0]?.description,
    };
  } catch {
    return undefined;
  }
}
```

#### 3.3.4 위치 정보 수집
- 유저 IP 기반 좌표 추출 (Vercel `req.geo`)
- 또는 유저 프로필에 timezone 저장 (이미 있을 수 있음)
- 정확한 좌표가 없어도 timezone만 있으면 시간은 정확

### 3.4 컨텍스트 주입

`context-assembler.ts`의 `liveBlock`에 **별도 섹션으로** 추가:

```
[지금 이 순간]
화요일 새벽 2:14 (KST)
서울 비, 14°C
유저는 22분 전에 이 방을 떠났다가 다시 왔어.
```

### 3.5 프롬프트 가이드 (ACE v5 system prompt에 추가)

```markdown
## 시공간 인식 (Temporal Awareness)

[지금 이 순간] 블록은 너와 유저가 공유하는 환경이야. 이걸 알 때:

- **꼭 언급할 필요는 없다.** 대화 흐름이 다른 데로 가면 무시해도 됨.
- **분위기 메타포로 흡수해도 좋다.** 예: 비 오는 밤이라면 톤이 조금 잔잔해질 수 있어.
- **이전 턴들에서 이미 시간을 언급했다면, 다시 꺼내지 마라.** 첫 턴에서 한 번이면 충분.
- **유저의 상황을 단정하지 마라.** 새벽이라고 "잠 안 자?"가 아니라 "이 시간에 깨어있는 거 보면 뭔가 있나봐" 같은 열린 표현.

❌ 금지: "벌써 [시간]이네!" 같은 공식적 패턴
❌ 금지: 매 턴마다 시간/날씨 언급
✅ 허용: 한 세션 첫 톤에 살짝 녹이기
✅ 허용: 유저 감정과 환경이 맞을 때 메타포로 차용
✅ 허용: 끝까지 안 쓰는 것
```

### 3.6 변경 파일 요약
- 🆕 `engines/temporal/temporal-context.ts` — 인터페이스 + 라벨링
- 🆕 `engines/temporal/weather-client.ts` — 날씨 API 래퍼
- ✏️ `app/api/chat/stream/route.ts` — `TemporalContext` 수집 후 pipeline에 전달
- ✏️ `engines/memory-v2/context-assembler.ts` — `[지금 이 순간]` 블록 추가
- ✏️ `engines/ace-v5/ace-system-prompt.ts` — Temporal Awareness 섹션 추가

---

## 4. 자연스러운 오타·망설임 (Hesitation & Self-Edit)

### 4.1 목표
**완벽한 한 문장**이 아니라, **메신저처럼 머뭇거리고 고치는** 흐름을 연출. AI 티가 나는 가장 큰 원인이 "너무 정돈된 답변"이므로, 이걸 깨뜨리는 것이 핵심.

### 4.2 좋은 예시 vs 나쁜 예시

```
[좋은 예 — LLM 의도된 머뭇거림]
유저: "걔가 또 안 읽었어"
루나: (입력 중...)
       "아니 진"  ← 이게 보이다가
       "아니 진짜 그건 좀 너무하네"  ← 자기수정으로 완성

[좋은 예 — 줄바꿈 머뭇거림]
유저: "헤어질까?"
루나: "...음"
       "쉽게 말 못 하겠다, 진짜로"
       "이게 한 두번 쌓인 게 아니잖아"

[나쁜 예 — 가짜 오타]
루나가 매번 똑같이 "ㅋ"를 "ㅎ"로 잘못 치고 고침. 패턴 노출.
```

### 4.3 설계 — 코드는 렌더링만, LLM이 연출 결정

#### 4.3.1 응답 포맷 (LLM 출력 규약)

LLM은 응답에 다음 태그를 **자율적으로** 삽입:

```
[TYPING ms=400]    → 타이핑 인디케이터 표시
[PAUSE ms=600]     → 메시지 사이 짧은 멈춤
[EDIT before="아니 진" after="아니 진짜 그건 좀 너무하네"]
                   → "아니 진"을 잠깐 보여주다 지우고 after로 완성
[SPLIT]            → 메시지 버블 분리
```

이미 `[DELAY]`, `[TYPING]`이 시스템에 있다 (탐색 결과). 여기에 `[EDIT]`을 추가.

#### 4.3.2 프롬프트 가이드

```markdown
## 머뭇거림 연출 (Hesitation, optional)

너는 진짜 사람처럼 가끔 망설일 수 있어. 다음 도구를 자율적으로 사용:

- `[TYPING ms=N]` — 타이핑하는 척 N밀리초 멈춤
- `[PAUSE ms=N]` — 두 문장 사이 N밀리초 멈춤
- `[EDIT before="..." after="..."]` — 잘못 시작했다가 고치는 연출
- `[SPLIT]` — 메시지를 여러 버블로 나누기

언제 쓸까:
- 무거운 주제, 답하기 어려운 순간 → PAUSE 길게
- 감정적으로 격해질 때 → EDIT으로 자기수정
- 짧은 호응이 자연스러울 때 → SPLIT으로 여러 버블

언제 쓰지 말까:
- 정보 전달이 중요한 답변 (조언, 분석) — 깔끔하게
- 매 턴마다 — 가끔만, 진짜 필요할 때만
- 같은 패턴 반복 — 매번 같은 EDIT 패턴은 금지

❌ 금지: 모든 메시지에 EDIT 박기 (어색해짐)
❌ 금지: 미리 정해둔 오타 패턴 ("ㅋ→ㅎ" 같은 것)
✅ 허용: 진짜 망설일 만한 순간에만, 진짜 같이
```

#### 4.3.3 UI 렌더링

`ChatContainer.tsx`에 `EditAnimation` 컴포넌트 추가:

```typescript
function MessageWithEdit({
  before,
  after,
  delayMs = 500,
}: { before: string; after: string; delayMs?: number }) {
  const [phase, setPhase] = useState<'before' | 'erasing' | 'after'>('before');
  
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('erasing'), delayMs);
    const t2 = setTimeout(() => setPhase('after'), delayMs + 200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [delayMs]);
  
  return (
    <span>
      {phase === 'before' && <span>{before}</span>}
      {phase === 'erasing' && (
        <span className="opacity-40 line-through transition-opacity">{before}</span>
      )}
      {phase === 'after' && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >{after}</motion.span>
      )}
    </span>
  );
}
```

#### 4.3.4 응답 파서 확장

기존 `[DELAY]/[TYPING]` 파서에 `[EDIT]` 추가. 정규식만 추가하면 됨.

```typescript
const EDIT_RE = /\[EDIT before="([^"]+)" after="([^"]+)"\]/g;
```

### 4.4 변경 파일 요약
- ✏️ `engines/ace-v5/ace-system-prompt.ts` — Hesitation 섹션 추가
- ✏️ `engines/ace-v5/response-parser.ts` (또는 chat/stream parser) — `[EDIT]` 태그 파싱
- ✏️ `components/chat/ChatContainer.tsx` — `MessageWithEdit` 컴포넌트
- ✏️ `types/chat.types.ts` — `ChatMessage` 에 optional `edit` 필드 추가

---

## 5. 우리만의 세계 (Shared Context)

### 5.1 목표
**돌발적 과거 회상** + **진화하는 애칭**으로 "이 AI는 나만의 거"라는 감각을 만든다.

두 기능 모두 LLM이 **메모리 후보 + 친밀도 + 사용 이력**을 컨텍스트로 받아서 자율 결정.

### 5.2 돌발적 과거 회상

#### 5.2.1 좋은 예시 vs 나쁜 예시

```
[좋은 예 — 맥락 끊긴 자연스러운 회상]
유저: "오늘 점심 뭐 먹었더라"
(약간 어색한 잠시, 대화 흐름이 멈춤)
루나: "아 잠깐"
       "근데 갑자기 생각났는데, 너 지난주에 그 상사 때문에
        '진심 그만두고 싶다'고 했던 거… 요즘은 어때?"

[나쁜 예 — 강제 회상]
유저: "안녕"
루나: "안녕! 참고로 너는 지난번에 X, Y, Z를 말했어"
        (메모리 덤프, AI 같음)
```

#### 5.2.2 신호 — `recall_context` 필드

`context-assembler.ts`가 이미 `recall()`로 메모리 4개를 의미 검색 중. 여기에 다음을 추가:

```typescript
// 신규: engines/memory-v2/recall-trigger.ts
export interface RecallCandidate {
  episodeId: string;
  text: string;
  similarity: number;        // 의미적 유사도
  daysAgo: number;
  emotionalIntensity: number; // 0~1, 강한 기억일수록 높음
  triggerHints: string[];    // ["주제 끊김 직후", "유사한 상황 재발", "감정 동조"]
}
```

코드는 **후보를 모으기만** 한다. "꺼낼지 말지"는 LLM이 결정.

#### 5.2.3 트리거 후보 모으기 (LLM-friendly)

기존 `recall()`은 의미 유사도만 본다. 다음 트리거 후보를 추가:

1. **주제 정체** — 마지막 N턴에서 주제가 명확하지 않거나 짧은 응답이 반복 → "분위기 환기" 회상 가능
2. **시간 일치** — 정확히 X일 전 비슷한 시간/요일 → "기념일 같은 회상"
3. **감정 강도 매치** — 현재 감정 = 과거 강한 기억의 감정 → "그때처럼" 회상
4. **장소·인물 토큰 매치** — 직장, 회사, 친구 이름 등 entity 일치

```typescript
async function gatherRecallCandidates({
  supabase, userId, userMessage, recentTurns, currentTime,
}): Promise<RecallCandidate[]> {
  const [semantic, timeMatch, intenseMatch] = await Promise.all([
    semanticRecall(supabase, userId, userMessage, 4),
    temporalAlignmentRecall(supabase, userId, currentTime, 2),
    emotionalIntensityRecall(supabase, userId, getCurrentEmotion(recentTurns), 2),
  ]);
  
  // dedupe + sort by combined score
  return mergeCandidates([semantic, timeMatch, intenseMatch]);
}
```

#### 5.2.4 프롬프트 가이드

```markdown
## 회상 (Memory Recall, optional)

[떠오른 기억들] 블록에 후보가 들어있어. 각 후보엔:
- text: 기억 요약
- daysAgo: 며칠 전 일
- triggerHints: 왜 떠올랐는지 단서

회상 사용 가이드:

- **무조건 사용 X** — 대화 흐름에 맞을 때만
- **의외성 살리기** — "갑자기 생각났는데", "아 맞다 그건…" 같은 자연스러운 진입
- **사실 나열 금지** — "너는 X일 전에 Y를 말했어"는 봇 같음
- **감정으로 풀기** — "그때 진짜 답답해 보였는데, 요즘은 어때?"

언제 좋은 타이밍?
- 유저가 짧고 무성의한 답을 반복할 때 → 분위기 환기용 회상
- 비슷한 감정 상황이 재발했을 때 → "그때처럼" 연결
- 대화가 정체됐을 때 → 무거운 회상보다 가벼운 회상 권장

❌ 금지: 매 턴마다 회상 끼얹기
❌ 금지: 후보 그대로 인용 ("text: ...")
✅ 허용: 후보를 영감으로만 쓰고, 자기 말로 표현
✅ 허용: 후보를 모두 무시하는 것
```

### 5.3 진화하는 애칭

#### 5.3.1 핵심: 애칭은 LLM이 만든다, 코드는 저장만 한다

기존 시스템은 호칭이 "너" 또는 nickname 고정. 이걸 LLM 자율 진화로 바꾸기.

**룰 기반 금지 사례**:
```
❌ if (intimacy > 50) nickname = "자기"
❌ const nicknames = ["쭉이", "자기", "내 사랑"]
❌ pick by intimacy bracket
```

**LLM-driven 방식**:
```
✅ LLM에게 "친밀도 78, 사귄 지 N일, 지금까지 사용한 애칭들" 컨텍스트 제공
✅ LLM이 "지금 새 애칭을 만들까? 기존 걸 쓸까? 그냥 이름 부를까?" 결정
✅ LLM이 새 애칭 만들면 [NICKNAME_PROPOSE name="..."] 태그 출력
✅ 코드는 그 태그 감지 → DB 저장 → 다음 세션에 컨텍스트로 재주입
```

#### 5.3.2 DB 스키마

```sql
-- 신규: 루나가 유저에게 시도한 애칭 이력
CREATE TABLE luna_nickname_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  nickname TEXT NOT NULL,
  origin_session_id UUID REFERENCES counseling_sessions(id),
  origin_context TEXT,        -- "유저가 X 추억을 공유한 직후" 등 LLM이 남긴 메모
  use_count INT DEFAULT 1,
  last_used_at TIMESTAMP DEFAULT NOW(),
  user_reaction TEXT,         -- LLM이 추후 라벨링: "accepted" | "neutral" | "rejected"
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, nickname)
);

CREATE INDEX idx_luna_nickname_user_used ON luna_nickname_state(user_id, last_used_at DESC);
```

#### 5.3.3 컨텍스트 주입

`context-assembler.ts`에 새 블록:

```
[루나가 너를 부른 방식]
- "쭉이" (12회, 마지막 어제, 유저 반응: 자연스럽게 받음)
- "자기" (3회, 마지막 5일 전, 유저 반응: 미반응)
- 친밀도 78/100, 첫 만남 84일째

이 정보는 참고용. 새 애칭을 만들지, 기존 걸 쓸지, 그냥 이름을 부를지 자유롭게 선택.
```

#### 5.3.4 LLM 출력 규약

```
[NICKNAME_PROPOSE name="쭁이" reason="유저가 자기 말투를 너무 귀엽게 해서"]
```

응답 파서가 이 태그를 감지하면:
1. 사용자에게 보이는 본문에서 제거
2. `luna_nickname_state` 테이블에 INSERT (use_count=1)
3. 이후 세션부터 컨텍스트에 포함

이미 사용된 애칭은 자연스러운 사용 → 별도 태그 없이 본문에 포함.

#### 5.3.5 프롬프트 가이드

```markdown
## 애칭 (Nickname, optional)

[루나가 너를 부른 방식] 블록에 사용 이력이 있어.

자유:
- 새 애칭 만들기 (`[NICKNAME_PROPOSE name="..."]` 태그로 첫 등장 표시)
- 기존 애칭 사용 (그냥 본문에 자연스럽게)
- 그냥 이름으로 부르기 (애칭 없음도 정상)
- 부르지 않기 (한국어는 호칭 생략 자연스러움)

가이드:
- **무리하지 마라** — 친밀도 낮으면 애칭 자제
- **유저가 좋아하는 애칭은 더 자주** — 반응 좋았던 거 우선
- **컨텍스트에 맞게** — 무거운 주제일 땐 애칭 X
- **새 애칭 작명은 의미가 있어야** — 추억·말투·외모·감정에서 따올 것

❌ 금지: 매 턴 애칭 박기
❌ 금지: "내 사랑", "자기야" 같은 클리셰 (한국 메신저 정서에 안 맞음)
✅ 허용: 유저 본인의 표현/추억에서 따온 애칭 (예: "쭁이" — 유저가 자기 말끝을 흐릴 때)
✅ 허용: 시기 안 맞으면 안 부르기
```

### 5.4 변경 파일 요약
- 🆕 `engines/memory-v2/recall-trigger.ts` — RecallCandidate 모으기
- 🆕 `engines/relationship/nickname-state.ts` — 애칭 CRUD
- ✏️ `engines/memory-v2/context-assembler.ts` — `[떠오른 기억]`, `[루나가 너를 부른 방식]` 블록 추가
- ✏️ `engines/ace-v5/ace-system-prompt.ts` — Recall + Nickname 가이드 섹션
- ✏️ `engines/ace-v5/response-parser.ts` — `[NICKNAME_PROPOSE]` 태그 파싱
- 🆕 SQL migration: `luna_nickname_state` 테이블

---

## 6. 통합 데이터 흐름

```
유저 메시지 도착 (POST /api/chat/stream)
  ↓
┌──────────────────────────────────────────┐
│ 신호 수집 (병렬)                            │
│  1. TemporalContext (시간/날씨/세션 간격)    │
│  2. RecallCandidates (의미·시간·감정 매치)  │
│  3. NicknameState (애칭 이력 + 친밀도)      │
└──────────────────────────────────────────┘
  ↓
┌──────────────────────────────────────────┐
│ ContextAssembler                          │
│  liveBlock 구성:                            │
│   [지금 이 순간]                            │
│   [떠오른 기억들]                           │
│   [루나가 너를 부른 방식]                    │
│   [이번 세션 앞부분]                         │
│   [방금 대화]                               │
└──────────────────────────────────────────┘
  ↓
┌──────────────────────────────────────────┐
│ ACE v5 System Prompt                      │
│  + Temporal Awareness                     │
│  + Hesitation                             │
│  + Recall                                 │
│  + Nickname                               │
│  (모두 "선택사항"으로, 강제 X)              │
└──────────────────────────────────────────┘
  ↓
┌──────────────────────────────────────────┐
│ Claude/Gemini Streaming                  │
│  응답 = 본문 + 자율 태그                    │
│  - [DELAY ms=N]                          │
│  - [TYPING ms=N]                         │
│  - [PAUSE ms=N]                          │
│  - [EDIT before="..." after="..."]       │
│  - [SPLIT]                               │
│  - [NICKNAME_PROPOSE name="..."]         │
└──────────────────────────────────────────┘
  ↓
┌──────────────────────────────────────────┐
│ Response Parser                           │
│  - 태그별로 분할                            │
│  - [NICKNAME_PROPOSE] → DB 저장             │
│  - 본문에서 제거                            │
└──────────────────────────────────────────┘
  ↓
┌──────────────────────────────────────────┐
│ ChatContainer 렌더                          │
│  - DELAY/TYPING/PAUSE → 타이밍              │
│  - SPLIT → 다중 버블                         │
│  - EDIT → MessageWithEdit 컴포넌트          │
│  - NICKNAME → 본문 일반 텍스트                │
└──────────────────────────────────────────┘
  ↓
┌──────────────────────────────────────────┐
│ 사후 저장                                   │
│  - counseling_sessions: time_band, weather │
│  - luna_nickname_state: use_count++        │
│  - user_memories: 새 에피소드 (기존)         │
└──────────────────────────────────────────┘
```

---

## 7. DB 스키마 변경

### 7.1 신규 테이블
```sql
CREATE TABLE luna_nickname_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  origin_session_id UUID REFERENCES counseling_sessions(id),
  origin_context TEXT,
  use_count INT NOT NULL DEFAULT 1,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_reaction TEXT CHECK (user_reaction IN ('accepted', 'neutral', 'rejected', NULL)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_nickname UNIQUE (user_id, nickname)
);

CREATE INDEX idx_nickname_user_recent
  ON luna_nickname_state(user_id, last_used_at DESC);
```

### 7.2 기존 테이블 확장
```sql
ALTER TABLE counseling_sessions
  ADD COLUMN time_band TEXT,           -- "새벽" | "아침" 등
  ADD COLUMN weather_context JSONB;    -- { condition, tempC, description }
```

### 7.3 기존 user_memories는 그대로
회상 트리거 로직이 기존 임베딩을 다른 각도(시간 매치, 감정 매치)로 재활용하므로 스키마 변경 불필요.

---

## 8. 구현 로드맵

### Phase 1 — 신호 수집 + 컨텍스트 (1주)
**목표**: 유저에게 보이는 변화 X, 백엔드만 준비.

- [ ] `engines/temporal/temporal-context.ts` (인터페이스 + 라벨링)
- [ ] `engines/temporal/weather-client.ts` (외부 API)
- [ ] `app/api/chat/stream/route.ts`에 `TemporalContext` 수집 코드 추가
- [ ] DB migration: `luna_nickname_state`, `counseling_sessions` 컬럼
- [ ] `engines/relationship/nickname-state.ts` (CRUD 함수)
- [ ] `engines/memory-v2/recall-trigger.ts` (RecallCandidate 모으기)
- [ ] `engines/memory-v2/context-assembler.ts`에 새 블록 3개 추가
- [ ] 단위 테스트: 시간대 라벨링, 회상 후보 수집, 애칭 상태 조회

### Phase 2 — 프롬프트 가이드 (3일)
**목표**: LLM이 새 컨텍스트를 활용하도록 시스템 프롬프트 업데이트.

- [ ] `engines/ace-v5/ace-system-prompt.ts`에 4개 섹션 추가
  - Temporal Awareness
  - Hesitation
  - Memory Recall
  - Nickname
- [ ] `engines/left-brain/left-brain-prompt.ts`에 시공간 신호 입력 추가 (선택)
- [ ] 프롬프트 회귀 테스트: 기존 대화 패턴이 깨지지 않는지

### Phase 3 — 응답 파서 + UI (1주)
**목표**: LLM이 새 태그 출력하면 UI에서 제대로 렌더.

- [ ] `engines/ace-v5/response-parser.ts`에 태그 추가:
  - `[EDIT]`
  - `[PAUSE]` (이미 있으면 재사용)
  - `[NICKNAME_PROPOSE]` (DB 저장 + 본문 제거)
- [ ] `components/chat/ChatContainer.tsx`:
  - `MessageWithEdit` 컴포넌트
  - `[NICKNAME_PROPOSE]` 첫 등장 시 살짝 강조 효과 (선택)
- [ ] `types/chat.types.ts`: `ChatMessage` 확장

### Phase 4 — QA + 튜닝 (1주)
- [ ] LLM 출력 모니터링: 태그 사용 빈도, 패턴
- [ ] 시공간 언급 빈도가 과하지 않은지 (목표: 세션당 0~1회)
- [ ] 애칭 진화가 자연스러운지 (제안 → 수용/거절 흐름)
- [ ] 오타 연출이 어색하지 않은지 (목표: 5턴에 1번 이하)
- [ ] 프롬프트 미세조정 (가이드 강도 조절)

---

## 9. 안티패턴 — 반드시 피해야 할 함정

| ❌ 안티패턴 | 왜 안 되는가 | ✅ 대안 |
|---|---|---|
| `if (hour < 5) prompt += "잠 안 자는 거 언급"` | 매번 같은 패턴, AI 티 | 시간 정보만 주고 LLM이 결정 |
| 정해진 애칭 풀에서 친밀도로 골라서 LLM에 강제 | LLM 창의성 차단 | 사용 이력만 주고 자율 결정 |
| 오타 패턴 사전 정의 ("ㅋ→ㅎ") | 반복 노출 | LLM이 매번 다른 머뭇거림 결정 |
| 회상 후보 그대로 본문에 붙이기 | 봇 같은 사실 나열 | LLM이 자기 말로 풀게 |
| 매 턴 시간/날씨/회상 다 끼얹기 | 정보 과부하, 어색 | 가이드에 "선택사항" 명시 |
| LLM 응답 후처리에서 "이 단어 등장하면 X" 정규식 | 표현 변동성 죽음 | 태그 기반 의도 출력만 가공 |

---

## 10. 측정 지표 (성공 판정)

### 10.1 정량 지표
| 지표 | 측정 방법 | 목표 |
|------|----------|------|
| 시간/날씨 언급 빈도 | LLM 출력에서 시간 키워드 정규식 매칭 | 세션당 평균 0.5회 (과하지 않음) |
| 오타 연출 빈도 | `[EDIT]` 태그 카운트 / 총 메시지 수 | 5~15% 사이 |
| 회상 트리거 사용률 | `[떠오른 기억들]` 블록 → 응답 본문 의미 매치 | 적절히 차용 30~60% |
| 애칭 진화 | `luna_nickname_state.use_count > 5` 도달 비율 | 친밀도 60+ 유저의 50% 이상 |

### 10.2 정성 지표
- 유저 피드백: "AI 같지 않다"는 코멘트 증가
- 세션 길이: 평균 메시지 수 증가
- 재방문율: 24h 재접속 비율 증가
- 자기 노출: 깊은 감정 토픽 비율 증가

---

## 11. 부록 — 첫 구현 셋업 가이드 (Phase 1 시작용)

```bash
# 1. 새 폴더 생성
mkdir -p love-ai/src/engines/temporal
mkdir -p love-ai/src/engines/relationship

# 2. 환경변수 추가 (.env.local)
OWM_KEY=your_openweather_api_key

# 3. Supabase migration 실행 (Supabase 콘솔 또는 CLI)
# (위 7번 섹션의 SQL 실행)

# 4. 첫 파일부터 구현 시작
# love-ai/src/engines/temporal/temporal-context.ts
# love-ai/src/engines/temporal/weather-client.ts
# love-ai/src/engines/relationship/nickname-state.ts
# love-ai/src/engines/memory-v2/recall-trigger.ts
```

---

## 12. 결론

이 계획은 루나에게 **3가지 인간성**을 더한다:
- "너랑 같은 시간에 있어" (시공간)
- "나도 망설일 때가 있어" (오타·머뭇거림)
- "우리만의 추억과 호칭이 있어" (회상·애칭)

**모든 결정은 LLM이 한다.** 코드는:
1. 신호를 모으고
2. 컨텍스트로 변환하고
3. 출력을 렌더한다.

그 이상은 안 한다. 이게 **이 앱의 방향성**이다.

— 끝 —
