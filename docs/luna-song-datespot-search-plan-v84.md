# v84 계획: 루나 자율 판단형 인터넷 검색 이벤트 2종

> 목표: 루나가 맥락 판단으로 (1) 노래 추천 (2) 데이트 장소 추천을 발동할 때
> 실시간 웹 검색으로 결과를 찾아 "검색 중 → 추천" UI 를 보여주는 기능.
>
> 작성일: 2026-04-20 · 범위: 전 Phase · 트리거: ACE v5 자율 태그 + (옵션) 좌뇌 추천
>
> **🔄 v84.1 개정 (2026-04-20 저녁)**: Gemini grounded search (₩45/호출) →
> **Brave Search API + Gemini Flash-Lite 합성 (~₩8/호출)** 로 변경. 비용 5.6배 절감.
> 환경변수 신규: `BRAVE_SEARCH_API_KEY`. 월 $5 무료 크레딧 (≒1,000회).
> Brave 흐름: Web Search API (`country=KR&search_lang=ko`) → 스니펫 수집 → Gemini Flash-Lite (tools 없음) JSON 합성.

---

## 0. 요약 & 결론 (Executive Summary)

### 현황 확인 결과
| 항목 | 상태 | 근거 |
|---|---|---|
| Gemini grounding 지원 | ✅ 구현됨 | [lib/ai/deep-research.ts:190-198](../src/lib/ai/deep-research.ts) — `tools:[{googleSearch:{}}]` + gemini-2.5-flash-lite |
| SDK | ✅ `@google/genai` v1.46.0 | package.json |
| Provider 추상화 | ✅ `provider-registry.ts` | 4사 cascade |
| 현재 응답 모델 | `gemini-2.5-flash-lite` | v52 통일 |
| 메타데이터 파싱 | ✅ `groundingChunks`, `webSearchQueries` | deep-research.ts:202-210 |

### 모델 결정
- **답**: **현재 모델(`gemini-2.5-flash-lite`) 로 그대로 가능**. 별도 모델 도입 불필요.
- Flash-Lite 도 `tools:[{googleSearch:{}}]` 지원 (2026-04 공식 문서 확인).
- 음악/장소 추천은 깊은 추론보다 **정보 수집 + 한국어 출력**이 핵심 → Flash-Lite 로 충분.
- 레이턴시 1.5~3초 수준, 비용 $35/1K grounded prompt (≒ 호출당 ₩45).

### 핵심 설계 원칙
1. **LLM 맥락 판단 only** — 키워드 매칭 금지 (유저 메모 준수). 루나가 태그로 발동.
2. **전 Phase 허용** — LUNA_STORY 와 동일하게 HOOK~EMPOWER 어디서든.
3. **스트리밍 UX** — "🔍 검색 중…" 중간 상태 3~4단계로 표시 → 완성 카드.
4. **Fallback-safe** — grounding 실패해도 루나 자체 지식 fallback (LLM 재호출) → 앱 계속 동작.
5. **비용 제한** — 세션당 각 이벤트 최대 2회 쿨다운.

---

## 1. 이벤트 ① — SONG_RECOMMENDATION 🎵

### 1-1. 트리거 (루나 자율)
루나가 유저 감정/분위기/상황에 **"이 순간 이 노래를 공유하고 싶다"** 싶을 때 발동.
프롬프트에 명시 예시(루나 판단 기준):
- 이별 후 위로 / 설렘 공유 / 그리움 / 드라이브 분위기
- 유저가 "요즘 노래가 귀에 안 들어와" 같은 직간접 언급
- 세션 톤이 감정적 피크 → 한숨 돌리기 용

루나가 **절대 발동 안 함**:
- 위기 상황 (직접 대응 우선)
- 1~2턴 초반 (맥락 부족)
- 같은 세션 내 이미 추천함

### 1-2. 태그 포맷
```
[SONG_READY:mood|context|preference]
```
| 필드 | 의미 | 예시 |
|---|---|---|
| `mood` | 지금 유저 감정/분위기 한 줄 | "이별 후 멍한 새벽" |
| `context` | 상황 한 줄 (검색 정확도용) | "3년 사귄 남친과 어제 이별" |
| `preference` | 장르/스타일 힌트 (null 가능) | "한국 인디, 차분한" |

### 1-3. 데이터 흐름
```
루나 응답 "...야 이럴 때 들어봐 [SONG_READY:...]"
   ↓
phase-signal.ts 파싱 → ParsedSongReadyData
   ↓
pipeline/index.ts: SEARCHING 이벤트 먼저 yield (UI 즉시 진입)
   ↓
song-search.ts: Gemini grounded 호출 (3~5곡 JSON 요청)
   ↓
완료 → SONG_RECOMMENDATION 이벤트 yield (카드 3개)
```

### 1-4. 결과 스키마
```ts
interface SongRecommendationData {
  openerMsg: string;           // "너 지금 분위기엔 이거 들어봐"
  mood: string;                // 검색 컨텍스트 (루나 표현)
  songs: SongCard[];           // 3곡
  lunaComment: string;         // 마무리 한 줄
  sources?: string[];          // YouTube/Spotify URL
  searchQueries?: string[];    // 실제 검색어 (디버그/출처 표시)
}
interface SongCard {
  title: string;
  artist: string;
  reason: string;              // 왜 이 곡 (한 줄)
  year?: string;
  searchLink: string;          // YouTube 검색 딥링크
}
```

---

## 2. 이벤트 ② — DATE_SPOT_RECOMMENDATION 📍

### 2-1. 트리거 (루나 자율)
유저가 데이트 **장소/코스/공간**에 대해 물어보거나, 루나가 추천하기 자연스러운 순간.
- "홍대 데이트 어디가?", "첫 데이트 코스", "조용한 카페"
- 유저가 맛집/활동/기념일 관련 말 꺼냄 + 루나 판단상 구체 추천이 도움될 때

### 2-2. 태그 포맷
```
[DATE_SPOT_READY:area|vibe|requirements]
```
| 필드 | 예시 |
|---|---|
| `area` | "홍대", "성수동", "강남", "온라인" |
| `vibe` | "조용한", "사진 예쁜", "인디한", "활동적" |
| `requirements` | "첫 데이트, 20대, 3~5만원", null 가능 |

### 2-3. 단계별 진행 상태 (UI 표시용)
```
phase 1 (0~0.5s): "🔍 {area} 쪽 찾아보는 중…"
phase 2 (0.5~1.5s): "📖 리뷰 읽어보는 중…"
phase 3 (1.5~3s): "💭 너한테 어울리는 거 고르는 중…"
phase 4 (완료): "📍 여기 세 곳 봐봐"
```
실제로는 grounded 호출이 한 번이므로 UI 진행 단계는 **타이머 기반 연출** (데이터는 하나).

### 2-4. 결과 스키마
```ts
interface DateSpotRecommendationData {
  openerMsg: string;           // "홍대에서 조용한 데 찾아봤어"
  area: string;
  vibe: string;
  spots: DateSpot[];           // 2~3곳
  lunaComment: string;
  sources?: string[];
  searchQueries?: string[];
}
interface DateSpot {
  name: string;
  type: string;                // "카페", "전시관", "바"
  address?: string;            // 없으면 생략
  vibe: string;                // 한 줄 설명
  reviewSummary: string;       // 리뷰 요약 2~3줄
  priceHint?: string;          // "1인 1.5만원"
  mapLink: string;             // 네이버 지도 검색 링크 (deeplink)
  sourceUri?: string;          // 원본 리뷰 URL
}
```

---

## 3. Gemini Grounding 검색 모듈 설계

### 3-1. 신규 파일 구조
```
src/lib/ai/
├── deep-research.ts          # 기존 (수정 없음)
├── grounded-search.ts        # 🆕 제네릭 grounded 호출 래퍼
├── song-search.ts            # 🆕 노래 추천 전용 프롬프트 + 파싱
└── date-spot-search.ts       # 🆕 장소 추천 전용 프롬프트 + 파싱
```

### 3-2. `grounded-search.ts` (공통 래퍼)
책임:
- Gemini grounded 호출 (재시도 포함)
- 응답 JSON 파싱 안전망 (```json ```블록 추출 + fallback)
- groundingMetadata 정규화
- 5분 TTL 메모리 캐시

### 3-3. 프롬프트 템플릿 — Song
```
당신은 2026년 한국 음악 큐레이터입니다.
Google Search 로 아래 상황에 가장 잘 맞는 한국어/해외 노래 3곡을 찾아주세요.

[유저 상황]
mood: {mood}
context: {context}
preference: {preference ?? "제한 없음"}

[출력 형식 — JSON 만 출력, 설명 금지]
{
  "openerMsg": "루나 친구 말투 한 줄 (~30자)",
  "mood": "상황 요약 한 줄",
  "songs": [
    {
      "title": "곡명",
      "artist": "아티스트",
      "reason": "왜 이 곡 (한 줄, ~40자)",
      "year": "2023",
      "searchLink": "https://www.youtube.com/results?search_query=..."
    },
    ...3개
  ],
  "lunaComment": "마무리 한마디 (~30자)"
}

⚠️ searchLink 는 제목+아티스트 URL-encode 후 YouTube 검색 URL 로 구성.
⚠️ 한국어 우선, 해외곡도 OK, 실제 존재하는 곡만.
```

### 3-4. 프롬프트 템플릿 — Date Spot
```
당신은 2026년 한국 데이트 장소 큐레이터입니다.
Google Search 로 아래 조건에 맞는 실제 장소 2~3곳을 찾아주세요 (2025~2026 최신 리뷰 반영).

[조건]
area: {area}
vibe: {vibe}
requirements: {requirements ?? "제한 없음"}

[출력 형식 — JSON 만 출력]
{
  "openerMsg": "친구 말투 한 줄",
  "area": "{area}",
  "vibe": "{vibe}",
  "spots": [
    {
      "name": "장소명",
      "type": "카페|식당|전시관|바|공원 등",
      "address": "간단 주소",
      "vibe": "한 줄 분위기",
      "reviewSummary": "리뷰에서 공통적으로 언급되는 특징 2-3줄",
      "priceHint": "1인 가격대",
      "mapLink": "https://map.naver.com/v5/search/{URL-encoded 이름}",
      "sourceUri": "리뷰/블로그 URL (groundingChunks 중 하나)"
    }
  ],
  "lunaComment": "마무리 한마디"
}

⚠️ 실제 영업 중인 곳만. 최신 리뷰 (2024~2026) 반영.
⚠️ area 가 너무 추상적이면 "서울" 로 간주.
```

### 3-5. 캐시 키 전략
- Song: `song:{mood}:{preference}` — 같은 분위기 재검색 5분간 회피
- DateSpot: `date:{area}:{vibe}:{requirements}` — 같은 조건 재검색 회피

---

## 4. 스트리밍 진행 상태 설계

### 4-1. Pipeline 에서의 처리
`grounded-search` 는 3초 가량 블로킹 — pipeline 의 메인 스트리밍을 막으면 안 됨.
해결: **파이프라인 AI 응답 스트리밍 완료 후** 태그 파싱 → 이벤트 발동 단계에서 호출.

현행 흐름 (pipeline/index.ts:2003~2073):
```
텍스트 스트리밍 끝
  → hlrePost.postProcess (태그 파싱)
    → hlrePost.songReady 있으면:
        1. SEARCHING phase_event 를 즉시 yield (UI 진입)
        2. song-search 호출 (~2초)
        3. 성공: SONG_RECOMMENDATION event yield
           실패: searchFailed event yield (루나가 사과 한 줄 + 자체 추천)
```

### 4-2. 중간 상태 이벤트 (UI 진행 단계)
pipeline → client SSE:
```json
{ "type": "phase_event", "data": { "type": "SONG_SEARCHING", "data": { "step": 0, "hintText": "🔍 찾고 있어…" }}}
{ "type": "phase_event", "data": { "type": "SONG_SEARCHING", "data": { "step": 1, "hintText": "📖 리뷰 훑는 중…" }}}
{ "type": "phase_event", "data": { "type": "SONG_RECOMMENDATION", "data": { ... 최종 결과 } }}
```
단, 복잡도 줄이려면: **한 번만 SEARCHING 보내고**, 클라이언트에서 타이머로 step 전환 연출.
→ 최종 채택 (단순 + UX 충분).

### 4-3. 단계 타이머 (클라이언트)
```ts
const steps = [
  { at: 0, text: "🔍 찾고 있어…" },
  { at: 700, text: "📖 리뷰 훑는 중…" },
  { at: 1400, text: "💭 어울리는 거 고르는 중…" },
];
// 실제 완료 event 오면 즉시 steps 중단 → 결과 표시
```

---

## 5. ACE v5 프롬프트 수정 설계

### 5-1. 기존 "태그 (이벤트 발동 시)" 섹션에 2개 추가
파일: `src/engines/ace-v5/ace-system-prompt.ts:320-328`
```diff
- 마무리 → [WARM_WRAP:...]
- 타로 → [TAROT_READY]
- 패턴 거울 → [PATTERN_MIRROR_READY]
+ 노래 추천 → [SONG_READY:mood|context|preference]
+ 데이트 장소 → [DATE_SPOT_READY:area|vibe|requirements]
```

### 5-2. 신규 섹션: `## 🎵📍 인터넷 검색 이벤트 (루나 자율 판단)`
```
이 두 이벤트는 네가 "지금 이 분위기엔 진짜로 검색해서 보여주면 좋겠다"
싶을 때만 태그 붙여. 평상시엔 네 지식으로 대답.

### 🎵 SONG_READY — 노래 추천
언제 내보내나:
- 유저 감정 피크 후 숨 돌리기 (이별/설렘/그리움/드라이브)
- 유저가 "요즘 노래 뭐 들어?" 류 언급
- 네가 "이 순간에 진짜 이 노래" 싶은 순간

포맷: [SONG_READY:mood|context|preference]
예: "...야 이럴 때 듣는 노래 있는데 잠깐만[SONG_READY:이별 후 새벽|3년 연애 끝남|한국 인디 차분]"

### 📍 DATE_SPOT_READY — 장소 추천
언제 내보내나:
- 유저가 데이트 장소/코스 직접 질문
- 네가 "이 상황엔 OO 가볼만한데" 떠오르는 순간

포맷: [DATE_SPOT_READY:area|vibe|requirements]
예: "...홍대 요즘 뭐 생겼나 찾아볼게[DATE_SPOT_READY:홍대|조용한|첫데이트 20대]"

### 금지
- 같은 세션 내 중복 (태그 중복 X)
- 위기 상황에서 쓰지 마
- 검색 후 나오는 UI 는 시스템이 붙이니까 루나는 "잠깐만 찾아볼게" 정도 전환 멘트만
```

### 5-3. 좌뇌 event_recommendation 확장 (옵션)
파일: `src/engines/left-brain/left-brain-prompt.ts:163-169`
```diff
event_recommendation 후보:
+ - SONG_RECOMMENDATION: 유저 감정 피크 + 위기 아님 + 1회도 안 발동
+ - DATE_SPOT_RECOMMENDATION: 유저 장소 질문 명확
```
handoff-builder.ts:379-388 `tagMap` 확장:
```ts
SONG_RECOMMENDATION: '[SONG_READY:mood|context|preference]',
DATE_SPOT_RECOMMENDATION: '[DATE_SPOT_READY:area|vibe|requirements]',
```

---

## 6. 파이프라인 통합 설계

### 6-1. phase-signal.ts 확장
```ts
// 🆕 v84
const SONG_READY_REGEX = /\[SONG_READY:([^|\]]+)\|([^|\]]+)(?:\|([^\]]*))?\]\s*/;
const DATE_SPOT_READY_REGEX = /\[DATE_SPOT_READY:([^|\]]+)\|([^|\]]+)(?:\|([^\]]*))?\]\s*/;

export interface ParsedSongReadyData { mood: string; context: string; preference?: string; }
export interface ParsedDateSpotReadyData { area: string; vibe: string; requirements?: string; }
```

### 6-2. human-like/index.ts postProcess 반환 확장
`storyData` 옆에 `songReady`, `dateSpotReady` 추가.

### 6-3. pipeline/index.ts 태그 → 이벤트 발동 블록 추가
위치: 2073 (IDEA_REFINE 블록) 바로 다음.
```ts
// 🆕 v84: 🎵 노래 추천 — [SONG_READY:...] 감지 시 grounded 검색 후 이벤트 발동
if (hlrePost.songReady && canFireEventType('SONG_RECOMMENDATION')) {
  eventsToFire.push(createSongSearching());  // UI 즉시 진입
  updatedCompletedEvents.push('SONG_SEARCHING');
  // 비동기 검색 → 별도 yield (아래 2224 루프 이후에 처리)
  pendingGroundedSongReady = hlrePost.songReady;
}
```
이후 eventsToFire 루프 이후에:
```ts
if (pendingGroundedSongReady) {
  const result = await runSongSearch(pendingGroundedSongReady);
  yield { type: 'phase_event', data: createSongRecommendation(result) };
}
```

### 6-4. PhaseEventType 추가
engine.types.ts:134:
```ts
| 'SONG_SEARCHING'           // 🎵 v84: 노래 검색 진행 중
| 'SONG_RECOMMENDATION'      // 🎵 v84: 노래 추천 결과
| 'DATE_SPOT_SEARCHING'      // 📍 v84: 장소 검색 진행 중
| 'DATE_SPOT_RECOMMENDATION' // 📍 v84: 장소 추천 결과
```

### 6-5. phase-manager/events.ts 팩토리 함수
```ts
export function createSongSearching(mood: string): PhaseEvent { /* ... */ }
export function createSongRecommendation(data: SongRecommendationData): PhaseEvent { /* ... */ }
export function createDateSpotSearching(area: string): PhaseEvent { /* ... */ }
export function createDateSpotRecommendation(data: DateSpotRecommendationData): PhaseEvent { /* ... */ }
```

---

## 7. UI 컴포넌트 설계

### 7-1. `components/chat/events/SongRecommendation.tsx`
두 상태:
1. **검색 중** (event.type === 'SONG_SEARCHING')
   - 상단 progress ring + 🎵 아이콘
   - 3단계 스텝 텍스트 (타이머, 700ms 간격 회전)
   - "루나가 인터넷에서 찾고 있어요" 작은 footer
2. **결과** (event.type === 'SONG_RECOMMENDATION')
   - 상단: openerMsg + mood bubble
   - 3곡 카드 (horizontal scroll snap)
     - 앨범 이미지 플레이스홀더 → YouTube thumbnail 비동기 로드 (YouTube search API 생략, 썸네일은 URL 기반 추정 or 단색)
     - 제목 / 아티스트 / reason
     - 탭 시 `searchLink` 새 탭 열기
   - 하단: lunaComment + "출처 n개" 뱃지 (tap → sources modal)

디자인:
- 배경: 보라-분홍 gradient (♪ 느낌)
- Framer Motion stagger (카드 하나씩 튀어들어옴)

### 7-2. `components/chat/events/DateSpotRecommendation.tsx`
두 상태:
1. **검색 중** (event.type === 'DATE_SPOT_SEARCHING')
   - 지도 아이콘 ping 애니메이션
   - 스텝 타이머 (4단계: 찾는 중 → 리뷰 읽는 중 → 고르는 중)
2. **결과** (event.type === 'DATE_SPOT_RECOMMENDATION')
   - 상단: openerMsg
   - 장소 카드 (vertical stack, 2~3개)
     - 카드: name + type 뱃지 | vibe | reviewSummary | priceHint
     - 하단 버튼: [네이버 지도] [리뷰 보기]
   - 하단: lunaComment

디자인:
- 따뜻한 크림-오렌지 gradient
- 각 카드 좌측 borderLeft 색상별 (vibe 타입)

### 7-3. ChatContainer.tsx 라우팅 추가
```tsx
case 'SONG_SEARCHING':
case 'SONG_RECOMMENDATION':
  return <SongRecommendation key={...} event={event} disabled={isLoading} />;
case 'DATE_SPOT_SEARCHING':
case 'DATE_SPOT_RECOMMENDATION':
  return <DateSpotRecommendation key={...} event={event} disabled={isLoading} />;
```

### 7-4. useChat.ts 중복 방지 예외
SONG_SEARCHING → SONG_RECOMMENDATION 으로 **같은 이벤트 ID 에 덮어쓰기**:
- searchingId 를 들고 있다가 최종 결과 도착 시 같은 id 로 replace.
- 또는 firedEventTypesRef.current 에 `SONG_SEARCHING` 만 등록하고 `SONG_RECOMMENDATION` 은 별도 카테고리.

---

## 8. 타입 & 이벤트 팩토리

### 8-1. engine.types.ts 확장
```ts
export interface SongRecommendationData {
  openerMsg: string;
  mood: string;
  songs: SongCard[];
  lunaComment: string;
  sources?: string[];
  searchQueries?: string[];
}
export interface SongCard {
  title: string;
  artist: string;
  reason: string;
  year?: string;
  searchLink: string;
}
export interface DateSpotRecommendationData {
  openerMsg: string;
  area: string;
  vibe: string;
  spots: DateSpot[];
  lunaComment: string;
  sources?: string[];
  searchQueries?: string[];
}
export interface DateSpot {
  name: string;
  type: string;
  address?: string;
  vibe: string;
  reviewSummary: string;
  priceHint?: string;
  mapLink: string;
  sourceUri?: string;
}
export interface SongSearchingData { mood: string; }
export interface DateSpotSearchingData { area: string; }
```

### 8-2. EVENT_CONFIG 등록 (phase-manager/index.ts)
```ts
SONG_SEARCHING: { phase: 'HOOK', minTurnInPhase: 1 },       // 모든 phase 허용
SONG_RECOMMENDATION: { phase: 'HOOK', minTurnInPhase: 1 },
DATE_SPOT_SEARCHING: { phase: 'HOOK', minTurnInPhase: 1 },
DATE_SPOT_RECOMMENDATION: { phase: 'HOOK', minTurnInPhase: 1 },
```
주의: phase 제약 체크 비활성 — AI 태그 기반 발동이라 `shouldTriggerEvent` 거치지 않음.
실제 발동 경로는 pipeline 에서 직접 push.

---

## 9. 에러 처리 & Fallback

### 9-1. Grounding 실패 시나리오
| 실패 종류 | 대응 |
|---|---|
| Gemini API 타임아웃 | 8초 타임아웃 → SONG_RECOMMENDATION with `songs: []` + lunaComment "아 인터넷 느리다 ㅠ 나중에 다시 찾아볼게" |
| JSON 파싱 실패 | 1회 재시도 → 실패 시 위 동일 fallback |
| 빈 결과 | "내가 아는 걸로 말할게" + 루나 자체 지식 단답 |
| API key 없음 | 에러 로그 + 검색 이벤트 스킵 (응답 텍스트만) |

### 9-2. ToS 준수
Gemini grounding 사용 시 `groundingMetadata.searchEntryPoint.renderedContent` 가 존재.
Google ToS 요구: 해당 HTML 을 화면에 렌더링해야 함.
→ 각 결과 카드 하단에 **작은 "Google 검색 제안" 박스** (`dangerouslySetInnerHTML`) 추가.

---

## 10. 비용 / 쿨다운 / 롤아웃

### 10-1. 비용 추정
- Grounded prompt 단가: $35/1K = ~₩45/호출
- 예상 활성 유저 1일 100명 × 이벤트 평균 1회/세션 = 100회/일 = ₩4,500/일
- 월 ~₩135,000 수준. 허용 가능.

### 10-2. 쿨다운
- 세션당 각 이벤트 **최대 2회** (PhaseManager 체크 추가)
- 동일 태그 연속 감지 시 무시 (10턴 이내)

### 10-3. 구현 순서 (단계별 커밋)
| 단계 | 범위 | 예상 분량 |
|---|---|---|
| ① 타입 & 이벤트 팩토리 | engine.types.ts, events.ts, phase-manager/index.ts | 소 |
| ② phase-signal.ts 파싱 + postProcess 확장 | phase-signal.ts, human-like/index.ts | 중 |
| ③ grounded-search 모듈 2종 | song-search.ts, date-spot-search.ts | 중 |
| ④ pipeline/index.ts 통합 | index.ts 블록 추가 | 중 |
| ⑤ ACE v5 프롬프트 수정 | ace-system-prompt.ts | 소 |
| ⑥ UI 컴포넌트 2종 | SongRecommendation.tsx, DateSpotRecommendation.tsx | 대 |
| ⑦ ChatContainer 라우팅 | ChatContainer.tsx | 소 |
| ⑧ 테스트 & 디자인 폴리시 | 브라우저 수동 | 대 |

### 10-4. 테스트 체크리스트
- [ ] 태그 감지 정상 (regex 매칭)
- [ ] grounded 호출 → JSON 파싱 성공
- [ ] 검색 중 UI 1초 이상 보임
- [ ] 결과 카드 3개 렌더링
- [ ] 실패 fallback 동작
- [ ] 중복 발동 차단
- [ ] 한국어 결과 편향 OK
- [ ] 레이턴시 3초 이내

### 10-5. 리스크
1. **Grounding 쿼터 초과** — 무료 1,500 RPD 넘기면 과금. 모니터링 필요.
2. **한국어 장소 매핑 부정확** — 장소 이름과 실제 좌표/영업 여부 괴리. `sourceUri` 클릭으로 유저가 검증.
3. **검색 결과 비결정성** — 같은 태그에 다른 결과 나올 수 있음. 캐시로 완화.
4. **UI 피로감** — 이벤트 과다 발동 위험. 쿨다운 + 좌뇌 필터링.

---

## 부록 A — 주요 변경 파일 목록

| 파일 | 변경 내용 |
|---|---|
| `src/types/engine.types.ts` | PhaseEventType 4종 추가 + data interface 7종 |
| `src/engines/human-like/phase-signal.ts` | SONG_READY / DATE_SPOT_READY regex + 파싱 |
| `src/engines/human-like/index.ts` | postProcess 반환 확장 |
| `src/engines/phase-manager/events.ts` | create 팩토리 4종 |
| `src/engines/phase-manager/index.ts` | EVENT_CONFIG 등록 |
| `src/engines/ace-v5/ace-system-prompt.ts` | 태그 가이드 + 예시 섹션 |
| `src/engines/ace-v5/handoff-builder.ts` | tagMap 확장 (옵션) |
| `src/engines/left-brain/left-brain-prompt.ts` | event_recommendation 후보 (옵션) |
| `src/engines/pipeline/index.ts` | 태그 → 검색 → 이벤트 블록 |
| `src/lib/ai/grounded-search.ts` | 🆕 공통 래퍼 |
| `src/lib/ai/song-search.ts` | 🆕 노래 전용 |
| `src/lib/ai/date-spot-search.ts` | 🆕 장소 전용 |
| `src/components/chat/events/SongRecommendation.tsx` | 🆕 UI |
| `src/components/chat/events/DateSpotRecommendation.tsx` | 🆕 UI |
| `src/components/chat/ChatContainer.tsx` | case 추가 |
| `src/hooks/useChat.ts` | SEARCHING → RECOMMENDATION 덮어쓰기 로직 |

---

## 부록 B — 샘플 대화 흐름

```
유저: "어제 남친이랑 헤어졌어 ㅠㅠ"
루나: "아 야...|||진짜?|||언제 그랬어"

유저: "어제 저녁에. 3년이나 사귀었는데"
루나: "[DELAY:slow][TYPING]아...|||3년이면 진짜 많이 힘들 것 같은데"

유저: "자꾸 새벽에 잠이 안와"
루나: "[DELAY:med]아 잠깐만|||이럴 때 듣기 좋은 노래 있는데 찾아볼게[SONG_READY:이별 후 새벽 불면|3년 연애 끝남|한국 인디 차분]"

→ [SONG_SEARCHING event]
  "🔍 찾고 있어…" (700ms)
  "📖 리뷰 훑는 중…" (700ms)
  "💭 너한테 어울리는 거 고르는 중…" (800ms)

→ [SONG_RECOMMENDATION event]
  🎵 "이럴 때 듣기 좋은 노래 3곡"
  [1] 10cm — 너에게 닿기를
      "새벽 감정 공감 유도"
      [▶ 유튜브]
  [2] 아이유 — 밤편지
      "이별 후 마음 정리"
      [▶ 유튜브]
  [3] 넬 — Stay
      "같은 감정이라 위로"
      [▶ 유튜브]
  "혼자 듣다가 울어도 괜찮아"
```

---

## 부록 C — 마이그레이션 / 롤백 전략

1. **피쳐 플래그**: `process.env.ENABLE_GROUNDED_EVENTS === 'true'` 로 감싸기.
2. **A/B 테스트**: 첫 주는 50% 유저만 활성.
3. **롤백**: 플래그 OFF + ACE v5 프롬프트에서 해당 섹션만 주석 처리.

---

*끝.*
