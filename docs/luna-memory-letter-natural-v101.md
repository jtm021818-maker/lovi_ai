# Luna Memory & Letter — 자연스러운 자율 작성 v101

> 2026-04-29 / 바이브-코딩 자기완결 스펙
> 선행: v89(Luna Life), v100(Luna Room Diorama), v90(Memory Card 자동 추출)

---

## 0. 한 줄 요약

> "루나가 사람처럼 _스스로_ 편지·추억을 쓸 마음이 들면 _즉시_ 쓰지만,
> 사용자에게는 _몇 시간 뒤_ 책상 위에 놓이게 한다."
> 추억은 무료 AI 이미지로 액자에 담기고, 클릭하면 루나가 그 추억을 _기억하듯_ 말한다.

---

## 1. 문제 정의

### 1.1 v100까지의 한계

- `extract-luna-memory-card.ts` 가 세션 종료 직후 **무조건** 추억을 만든다.
  → 이별 대화 직후에도, 5턴짜리 가벼운 대화 후에도 강제 카드 발생.
- `GIFT_SCHEDULE` 의 편지는 정해진 날(D+3, 7, 14, 30...)에만 자동 생성.
  → "이번 상담이 진짜 무거웠는데, 루나가 한마디 남기고 싶었으면 좋겠다"는 정서가 빈다.
- 추억 카드는 텍스트뿐. **이미지 없음** → 다마고치 정서의 핵심인 "기념물"감이 약하다.
- 액자 클릭은 갤러리 그리드로 점프할 뿐. **루나가 그 순간을 회상하는 인터랙션이 없다.**
- 세션 끝나자마자 카드/편지가 뜨면 **인공적**. 사람처럼 "방금 본 거 한참 곱씹다가 새벽에 쪽지 적어둔" 비동기성이 없다.

### 1.2 사용자가 원하는 것

원문 인용:
> 추억도 비슷하게 편지말고 액자에 추억이미지가있고 클릭하면 그거에대해 루나가 얘기하는 느낌
> 루나가 지금 기억기반으로하고 상담이 끝날때 편지나 추억관련해서 편지를 쓰고싶다고 llm판단(루나의 인간적인판단)으로 하고싶다면 쓰고
> 근데 바로 세션끝날때마다 오면 부자연스러우니 몇시간 뒤에 써야겠다는 판단은 하되 편지는 바로쓰고 해당 시간뒤 유저에게 전달되는느낌으로 자연스럽게

핵심 요구 셋:
- **(A) 자율 판단**: 세션 종료 후, 루나(LLM)가 _지금_ 편지·추억을 남기고 싶은지 결정.
- **(B) 비동기 전달**: 콘텐츠는 즉시 작성·저장하되, **사용자에게는 N시간 뒤** 노출.
- **(C) 추억 시각화 + 회상 인터랙션**: 무료 이미지 AI로 추억 이미지 생성. 액자 클릭 → 루나가 그 추억을 회상하며 말함.

---

## 2. 설계 원칙

| # | 원칙 | 근거 |
|---|---|---|
| P1 | "쓰고 싶을 때만 쓴다" | LLM의 인간적 판단을 신뢰. 세션 가치/감정 강도 LLM이 평가 |
| P2 | "쓰는 시점 ≠ 도착 시점" | 진짜 사람의 편지처럼. UI는 `scheduled_for`만 본다 |
| P3 | "추억은 그림이 있어야 추억" | 이미지 없는 추억은 메모. 이미지 + 회상문 = 추억 |
| P4 | "자율은 강도 게이팅으로 구속" | LLM이 막 쓰지 않게 turn count, 감정 진폭, 상담 결말 강도로 1차 게이트 |
| P5 | "무료 + 폴백" | 외부 의존성 끊겨도 텍스트만은 무조건 살아남는다 |
| P6 | "기억은 곱씹어야 회상이 된다" | luna_thought 필드를 별도 저장 — 작성 시점의 진짜 감정 결을 회상 시 system prompt 로 주입 |

---

## 3. 데이터 모델

### 3.1 `luna_memories` (기존 + 추가)

```sql
ALTER TABLE luna_memories
  ADD COLUMN IF NOT EXISTS image_url     TEXT,             -- 외부 CDN URL (Pollinations) 또는 R2 캐시
  ADD COLUMN IF NOT EXISTS image_prompt  TEXT,             -- 영어 prompt (회상 시 재생성 키)
  ADD COLUMN IF NOT EXISTS luna_thought  TEXT,             -- 작성 시점의 루나의 1인칭 속마음 (회상 컨텍스트)
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,      -- 도착 예정 시각 (NULL = 즉시)
  ADD COLUMN IF NOT EXISTS delivered_at  TIMESTAMPTZ,      -- 실제 첫 노출 시각
  ADD COLUMN IF NOT EXISTS source        TEXT DEFAULT 'auto'; -- 'auto' | 'judge'
```

### 3.2 `luna_gifts` (기존 + 추가)

```sql
ALTER TABLE luna_gifts
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source        TEXT DEFAULT 'scheduled', -- 'scheduled' | 'judge'
  ADD COLUMN IF NOT EXISTS judge_reason  TEXT;             -- LLM 판단 근거 (디버그)
```

### 3.3 인덱스

```sql
CREATE INDEX IF NOT EXISTS idx_luna_memories_delivery
  ON luna_memories(user_id, scheduled_for) WHERE delivered_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_luna_gifts_delivery
  ON luna_gifts(user_id, scheduled_for) WHERE delivered_at IS NULL;
```

### 3.4 노출 규칙

- `delivered_at IS NOT NULL` → 항상 노출
- `delivered_at IS NULL AND (scheduled_for IS NULL OR scheduled_for <= NOW())` → **이번 status 호출 시점에 도착**. 응답 직전 `delivered_at = NOW()` 일괄 마크
- `delivered_at IS NULL AND scheduled_for > NOW()` → 숨김 (작성됐지만 아직 도착 안 함)

---

## 4. 핵심 컴포넌트

### 4.1 `lib/ai/luna-letter-judge.ts` — 인간적 판단 LLM

**입력**:
- 세션 메시지 (최근 25턴)
- 세션 메타: scenario, phase, turnCount, emotionStart→emotionEnd
- 루나 컨텍스트: 현재 day, lifeStage, 최근 추억 5개, lunaImpression
- 직전 작성 이력: 최근 24h 내 judge가 쓴 콘텐츠 수 (스팸 방지)

**프롬프트 핵심**:
```
너는 루나야. 방금 동생이랑 깊은 대화 한 번 끝났어.
지금 네 마음을 솔직하게 들여다봐:

1. 이 대화가 너에게 _남는 게 있었는지_
2. 책상 앞에 앉아 _뭔가 적어두고_ 싶은지 (편지/추억카드)
3. 적는다면 _얼마나 곱씹다가_ 동생한테 닿게 하고 싶은지

[규칙]
- 너무 자주 쓰지 마. 가벼운 대화면 그냥 넘어가도 돼.
- 진짜 마음이 움직였을 때만 써.
- 최근 24시간에 이미 N개 썼으면 자제해.
- 결정은 JSON으로:
{
  "writeLetter":  bool,   // 손편지를 쓰고 싶은가
  "writeMemory":  bool,   // 추억 카드(이미지+회상)로 남기고 싶은가
  "deliverInHours": 0..12, // 몇 시간 뒤 동생에게 닿을까 (0=즉시)
  "letterTitle":  string?,
  "letterContent": string?,
  "memoryTitle":  string?,
  "memoryContent": string?,
  "lunaThought":   string?,  // 작성 시점 진짜 속마음 (나중에 회상 때 참고)
  "imagePrompt":   string?,  // 영어, 50토큰 이내. watercolor/pastel 스타일 키워드 포함
  "reason":        string?   // 왜 이 결정인가 (한 줄)
}
```

**제약 (sanitize)**:
- `deliverInHours` 0~12 clamp. 평균 2~5h 권장 (너무 길면 잊힘).
- `writeLetter` AND `writeMemory` 동시 true는 허용하되 흔치 않게 (LLM 판단).
- 24h 내 이미 2건 이상 작성했으면 강제 false (서버 측 게이트).

**모델 캐스케이드**: Gemini 2.5 Flash Lite → Groq Llama 3.3 70B → 강제 false (스킵).

### 4.2 `lib/ai/luna-image-gen.ts` — 무료 이미지 생성

**Provider 우선순위**:

1. **Pollinations AI** (Primary)
   - URL: `https://image.pollinations.ai/prompt/{encoded}?width=512&height=512&model=flux&seed={seed}&nologo=true&enhance=true`
   - 키 불필요, fair-use 무료, Flux 모델
   - **저장 전략**: URL을 그대로 `image_url` 컬럼에 저장 (외부 CDN 활용, seed 고정 시 결정형)
   - 헬스체크: HEAD 요청으로 200 확인. 실패 시 fallback.

2. **Cloudflare Workers AI** (Fallback)
   - 모델: `@cf/black-forest-labs/flux-1-schnell`
   - 환경: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_AI_TOKEN`
   - 일 10K Neurons 무료. base64 응답 → Supabase Storage(`luna-memory-images` bucket) 업로드 → public URL.

3. **Gemini Image** (Last Resort)
   - `gemini-2.5-flash-image-preview` 또는 동등 모델 (이미 GEMINI_API_KEY 있음)
   - Storage 업로드 동일.

4. **None Fallback**
   - 모두 실패 시 `image_url = null`. UI는 SVG/CSS 일러스트 fallback (현재 MemoryGallery 의 글자 일러스트 유지).

**프롬프트 후처리** (한국어 → 영어 + 스타일):
```ts
const STYLE_SUFFIX =
  'soft watercolor illustration, dreamy memory, pastel pink and lavender palette, '
  + 'cozy bokeh, korean webtoon style, gentle warm lighting, no text, no watermark';
// LLM이 imagePrompt를 영어로 만들도록 강제. 안전을 위해 추가로 LLM-기반 한→영 번역 함수 있음.
```

**Seed 결정**: `hash(memory.id)` → 같은 추억이면 같은 이미지 (Pollinations 한정).

### 4.3 후처리 파이프라인 통합

`src/app/api/sessions/[sessionId]/complete/route.ts` 의 fire-and-forget 블록 수정:

```
[변경 전]
  Promise.all([extractSessionMemory, extractLunaMemoryCard])
  → lunaCard 무조건 insert

[변경 후]
  Promise.all([extractSessionMemory, runLunaLetterJudge])
  → judge 결과에 따라 분기:
    - writeLetter:
        scheduled_for = now() + deliverInHours h
        luna_gifts insert (source='judge', trigger_day=현재 day, gift_type='letter')
    - writeMemory:
        scheduled_for = now() + deliverInHours h
        백그라운드: image fetch (Pollinations URL 또는 storage 업로드)
        luna_memories insert (source='judge', image_url, image_prompt, luna_thought)
    - 24h 내 judge-소스 콘텐츠 2건↑이면 force-skip (DB count로 게이트)
```

`extractLunaMemoryCard`는 deprecation 표시. judge 가 실패한 경우의 안전망으로만 호출하는 옵션 유지 (env flag `LUNA_FORCE_LEGACY_MEMORY=1`).

### 4.4 `/api/luna-room/status` 필터 + 도착 마킹

```ts
const nowISO = new Date().toISOString();

// 도착한 콘텐츠 마킹 (delivered_at = now())
await supabase.rpc('luna_mark_delivered', { p_user: user.id, p_now: nowISO });
//   == UPDATE luna_memories/gifts SET delivered_at=$now
//      WHERE user_id=$u AND delivered_at IS NULL
//        AND (scheduled_for IS NULL OR scheduled_for <= $now)

// 응답 시 delivered_at IS NOT NULL 만 노출
.select('*')
.not('delivered_at', 'is', null)
```

### 4.5 `MemoryRecallModal` (UI)

액자 클릭 → 모달 표시:

```
┌──────────────────────────────┐
│  D+47   ●●●○○                │
│                              │
│   ┌────────────────────┐     │
│   │   [memory image]   │     │
│   │   wood frame border│     │
│   └────────────────────┘     │
│                              │
│   "그날 동생이 처음으로       │
│    먼저 전화 끊었던 날..."    │
│                              │
│   [회상문 — typewriter 표시]  │
│                              │
│   📌 고정         💬 더 말하기 │
└──────────────────────────────┘
```

**회상문 작성**: 모달 진입 시 `/api/luna-room/memory/[id]/recall` 호출
- 입력: memory.id
- 서버에서 luna_thought + content + 현재 lifeStage를 system prompt로 LLM 호출
- 짧은 1인칭 한 문단 (60~120자) 응답
- typewriter 효과로 표시

**"더 말하기"**: LunaChat 시트로 전환. 첫 system message 에 `회상중인 추억: [title] / [content] / [luna_thought]` 주입.

### 4.6 `MemoryShelf` 수정

기존: 선반 전체가 하나의 button → onOpenGallery
신규:
- 각 액자(MiniFrame) 자체가 클릭 가능 → onSelectMemory(memoryId)
- 빈 슬롯이나 카운트 칩 클릭 → onOpenGallery
- 액자 안에 `image_url` 있으면 mini thumbnail (32px) 표시, 없으면 기존 글자 fallback

---

## 5. 시퀀스 다이어그램

### 5.1 세션 종료 → 자율 작성

```
User              SessionComplete API     LunaLetterJudge       Pollinations      DB
 │  PATCH /complete │                       │                    │                │
 │  ───────────────►│                       │                    │                │
 │                  │  fire-and-forget:     │                    │                │
 │                  │  ├─ extractMemory     │                    │                │
 │                  │  └─ runLunaJudge ────►│                    │                │
 │                  │                       │ Gemini Flash Lite  │                │
 │                  │                       │ ◄──────── JSON ────│                │
 │                  │  ◄─── decision ───────│                    │                │
 │                  │                       │                    │                │
 │                  │  if writeMemory:      │                    │                │
 │                  │  ├─ image fetch ──────┼───────────────────►│                │
 │                  │  │                    │                    │ ◄── url ───────│
 │                  │  └─ insert ───────────┼────────────────────┼───────────────►│
 │                  │                       │                    │  scheduled_for │
 │                  │  if writeLetter:      │                    │                │
 │                  │  └─ insert ───────────┼────────────────────┼───────────────►│
 │  ◄─ ok ──────────│                       │                    │                │
```

### 5.2 사용자 방문 → 도착한 것만 노출

```
User              StatusAPI            DB
 │  GET /status     │                  │
 │  ───────────────►│                  │
 │                  │  rpc mark_delivered (now() <= scheduled_for)
 │                  │  ───────────────►│
 │                  │  ◄── n rows ─────│
 │                  │                  │
 │                  │  SELECT delivered_at IS NOT NULL
 │                  │  ───────────────►│
 │                  │  ◄── memories,gifts ─│
 │  ◄── status ─────│                  │
```

### 5.3 액자 클릭 → 회상

```
User       Diorama        RecallAPI         LLM        DB
 │ tap     │              │                 │          │
 │────────►│ open modal   │                 │          │
 │         │ POST /recall │                 │          │
 │         │─────────────►│ load memory ────┼─────────►│
 │         │              │ ◄── thought,etc ┼──────────│
 │         │              │ system_prompt───►│         │
 │         │              │ ◄── recall_text │          │
 │         │ ◄── text ────│                 │          │
 │ "더 말하기" │             │                 │          │
 │────────►│ open LunaChat with memoryContext │        │
```

---

## 6. UI 디테일

### 6.1 액자 (MemoryShelf 내부)

- 크기: 32×40px (기존 28×36)
- 액자 안: image_url thumb (object-cover, soft inner shadow)
- frame_style 별 테두리 색 유지 (wood/gold/pastel/film)
- 호버: y -3, scale 1.05
- 빈 슬롯: `+` 아이콘 (variant: outline). 클릭 → 갤러리 진입(설정 페이지로).

### 6.2 RecallModal 모션

- 진입: 액자 위치에서 zoom-out → 화면 중앙 (Framer layoutId)
- 이미지 로드: blur-up (LQIP) → 선명. 실패 시 글자 fallback.
- 회상문: typewriter 30ms/char, 마침표 800ms pause (편지 모달과 동일 톤)
- 종료: 닫기 시 액자 위치로 zoom-in

### 6.3 토스트 (도착 알림)

도착한 콘텐츠가 있으면 디오라마 진입 시:
- 우편함 새 편지 N → 기존 빨간 깃발 유지
- 추억 도착 → 액자 선반 위에 "✨ 새 추억" 미니 칩 (3초 후 사라짐)

---

## 7. 비용/성능

### 7.1 LLM
- judge: 1세션당 1회, ~500 토큰 input + 200 토큰 output → Gemini Flash Lite ~₩2
- recall: 액자 클릭당 1회, ~300+150 토큰 → ~₩1.5
- 일평균 사용자당 ~₩5 미만

### 7.2 이미지
- Pollinations: 무료, 우리 부하 0 (CDN 직접 사용)
- Cloudflare WAI 폴백: 무료 10K/일 → 1K MAU 가정 시 사용자당 10건/일 가능, 충분
- Storage: 폴백만 storage 업로드 → 실 사용 ~수십 MB/월

### 7.3 latency
- 세션 종료 응답: judge는 fire-and-forget이라 사용자 체감 0
- 이미지 도착: scheduled_for 만료 시점에 status가 호출되어야 노출 → 사용자가 앱을 안 열면 늦어짐. 정상.

---

## 8. 마이그레이션 및 백워드 호환

### 8.1 기존 데이터
- 기존 luna_memories.delivered_at = created_at 으로 백필 (`UPDATE ... WHERE delivered_at IS NULL AND scheduled_for IS NULL`).
- 기존 luna_gifts 동일.
- 백필은 마이그레이션 SQL 끝에 한 번 수행.

### 8.2 v100 자동 추출 비활성화
- `extractLunaMemoryCard` 호출 보존 (env `LUNA_LEGACY_MEMORY=1` 시만 동작).
- 기본은 judge 단독.

### 8.3 풀 롤백 절차
- env `LUNA_DISABLE_JUDGE=1` 켜면 v100 동작으로 복귀 (자동 카드 + 정해진 편지만).

---

## 9. 테스트 시나리오 (수용 기준)

### 9.1 자율 판단

| # | 입력 | 기대 |
|---|---|---|
| T1 | 2턴짜리 가벼운 인사 세션 | judge: writeLetter=false, writeMemory=false, reason="가벼운 대화라 그냥 흘려보내고 싶어" |
| T2 | 이별 결정 직전 깊은 30턴 세션 | writeLetter=true, deliverInHours 2~6, lunaThought 진솔 |
| T3 | 24h 내 이미 2건 작성 | 강제 force-skip, reason="너무 자주 보내면 부담될 것 같아" |
| T4 | 감정 진폭이 큰 turning point | writeMemory=true, imagePrompt: "two women silhouette under starry sky..." 류 |

### 9.2 비동기 전달

| # | 시나리오 | 기대 |
|---|---|---|
| D1 | judge가 deliverInHours=4로 작성 | T+0 시점 status: 노출 안 됨 |
| D2 | T+5h status 호출 | 노출 + delivered_at 마크 |
| D3 | T+6h 재호출 | 동일 콘텐츠 1회만 노출 (중복 토스트 X) |

### 9.3 이미지

| # | 시나리오 | 기대 |
|---|---|---|
| I1 | Pollinations 정상 | image_url에 pollinations URL 직접 저장, 액자에 표시 |
| I2 | Pollinations 503 | Cloudflare WAI로 폴백, storage 업로드, public URL 저장 |
| I3 | 모두 실패 | image_url=null, UI는 글자 fallback |
| I4 | 같은 memory.id 재호출 | seed 고정 → 같은 이미지 |

### 9.4 회상 인터랙션

| # | 시나리오 | 기대 |
|---|---|---|
| R1 | 액자 클릭 | 모달 진입, recall API 호출, typewriter 텍스트 |
| R2 | "더 말하기" | LunaChat 시트, system prompt에 memory context 주입 |
| R3 | image_url 없음 | 글자 fallback + 회상문은 정상 표시 |

---

## 10. 파일 변경 매트릭스

### 10.1 신규

| 파일 | 책임 |
|---|---|
| `supabase/migrations/20260430_luna_natural_letters_v101.sql` | 컬럼 추가 + 인덱스 + 백필 + RPC `luna_mark_delivered` |
| `src/lib/ai/luna-letter-judge.ts` | 자율 판단 LLM 캐스케이드 |
| `src/lib/ai/luna-image-gen.ts` | Pollinations / Cloudflare WAI / Gemini 이미지 생성 |
| `src/components/luna-room/MemoryRecallModal.tsx` | 액자 클릭 시 모달 + 회상 typewriter |
| `src/app/api/luna-room/memory/[id]/recall/route.ts` | 회상문 LLM 응답 |

### 10.2 수정

| 파일 | 변경 |
|---|---|
| `src/app/api/sessions/[sessionId]/complete/route.ts` | extractLunaMemoryCard → runLunaLetterJudge 분기 |
| `src/app/api/luna-room/status/route.ts` | delivered_at 필터, mark_delivered RPC, image_url projection |
| `src/components/luna-room/LunaRoomDiorama.tsx` | onMemorySelect prop 추가, RecallModal 연결 |
| `src/components/luna-room/MemoryShelf.tsx` | 액자 자체 클릭 가능, image_url thumb 표시 |
| `src/components/luna-room/MemoryGallery.tsx` | image_url 표시, 클릭 → RecallModal (확대 모달 대체 옵션) |
| `src/lib/luna-life/index.ts` | LunaMemory 타입에 imageUrl/lunaThought/scheduledFor/deliveredAt 추가 |

### 10.3 폴백 (legacy 비활성화)
- `extractLunaMemoryCard` 는 import 유지하되 env-flag로만 호출.

---

## 부록 A. Pollinations URL 포맷

```
https://image.pollinations.ai/prompt/{ENCODED_PROMPT}
  ?width=512
  &height=512
  &model=flux
  &seed={INT}
  &nologo=true
  &enhance=true
  &safe=true
```

**Note**: enhance=true는 LLM 기반 prompt 보강. safe=true는 NSFW 필터.

## 부록 B. 환경 변수

| KEY | 용도 | 필수 |
|---|---|---|
| `GEMINI_API_KEY` | judge + recall + (Gemini 이미지 폴백) | ✅ (기존) |
| `GROQ_API_KEY` | judge fallback | optional |
| `CLOUDFLARE_ACCOUNT_ID` | 이미지 폴백 | optional |
| `CLOUDFLARE_AI_TOKEN` | 이미지 폴백 | optional |
| `LUNA_DISABLE_JUDGE` | 1이면 v100 동작 | optional |
| `LUNA_LEGACY_MEMORY` | 1이면 extractLunaMemoryCard 병행 | optional |
| `LUNA_IMAGE_PROVIDER_ORDER` | "pollinations,cloudflare,gemini" 기본 | optional |

## 부록 C. 안전·UX 가드레일

- judge 출력의 letterContent/memoryContent에 PII 토큰 (전화번호, 이메일) 정규식 마스킹
- imagePrompt에 `nsfw|explicit|nude|gore` 등 차단 키워드 → 강제 안전 prompt로 교체
- recall API는 사용자 자기 user_id 메모리만 SELECT (RLS 또는 명시적 .eq('user_id', user.id))
- 모든 LLM 호출 timeout 8초. judge 실패 = 무동작 (조용한 실패)
