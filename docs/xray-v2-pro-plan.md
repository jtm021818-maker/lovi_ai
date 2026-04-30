# 카톡 엑스레이 v2 — 의료 진단급 관계 분석 시스템

**목표**: 2026 기준 OSS와 Vision LLM 최신 기능을 풀로 끌어다 써서, 현재의 "조잡한 4색 박스 + 1줄 인사이트" 카톡 엑스레이를 **의료 진단 리포트급 관계 분석 도구**로 리프트.

**스펙 분량**: A4 10장. AI 바이브코딩 입력 전용 — 모든 기술 결정과 인터페이스를 명시해, 여러 AI 에이전트가 동시에 같은 결과로 수렴할 수 있게 한다.

**버전**: v2.0 / 2026-04-30 / 백워드 호환 무시 (v1 라우트 즉시 deprecate)

---

## 1. 현재 v1 문제점 (왜 다 갈아엎는가)

### 1.1 분석 측면

| 항목 | 현재 (v1) | 문제 |
|----|---------|----|
| 위치 좌표 | `top/middle/bottom` 3단 enum | 4메시지+ 이면 다 겹침. 픽셀 미스매치 |
| 분석 차원 | 4색 risk + 화해 % | 단일 축. 애착 스타일/관계 단계/응답 패턴 누락 |
| 인사이트 | 1문장 | 깊이 0. "그래서 어쩌라고" 반응 |
| 추천 답장 | 1개 단일톤 | 사용자 톤 선택권 없음 |
| OCR 신뢰도 | Gemini "추측" | 한글 카톡 캡처 자주 틀림 |
| 저장 | in-memory only | 새로고침 = 증발 |

### 1.2 UI 측면

- 🔮 회전 = 로딩. "X-ray" 컨셉 0% 살아남
- 4색 반투명 박스 = 박물관 안내판 수준. 의료 진단 톤 부재
- 점수 바 + 텍스트 카드 3장 = 인스타 카드 수준. 데이터 풍부도 빈약
- 라이트모드 핑크/퍼플 = "심리 분석" 진중함 부족

### 1.3 신뢰도 측면

- 사용자 테스트에서 **"위치 자꾸 어긋나"** + **"분석이 너무 두루뭉술"** 피드백 다수
- 같은 캡처 두 번 분석하면 점수 ±20% 흔들림 → **랜덤성 미통제**

---

## 2. 2026 OSS / 최신 기술 리서치

### 2.1 Vision LLM (메인 분석 엔진)

| 모델 | 특장점 | 본 프로젝트 채택 |
|----|------|-------------|
| **Gemini 2.5 Pro** | Native bounding box detection, 1M context, 한글 OCR 우수 | ✅ 1순위 |
| Gemini 2.5 Flash | Pro 대비 4배 빠름, bbox 동일 지원 | ✅ 2순위 (폴백) |
| Gemini 2.0 Flash | RPD 무제한, bbox 미지원 → OCR만 | ✅ 3순위 (위치 없이라도 분석은 살림) |
| GPT-5 Vision | 정확하나 비용 높음 | ❌ (비용) |
| Claude Opus 4.7 Vision | 컨텍스트 깊음, bbox 없음 | ❌ (bbox 누락) |
| Qwen3-VL (오픈소스) | 자체호스팅 가능 | ❌ (인프라 비용) |

**결정**: Gemini 2.5 Pro `responseSchema` + `responseModalities: ['Text']` + bbox prompt → JSON 강제. 폴백 캐스케이드는 v1 그대로 유지하되 모델 리스트만 갈아끼움.

### 2.2 Bounding Box 추출 패턴 (Gemini 공식)

Gemini는 `[ymin, xmin, ymax, xmax]` 0-1000 normalized 좌표를 반환한다. 픽셀 변환:
```ts
const px = (norm: number, dim: number) => Math.round((norm / 1000) * dim);
```
이미지 width/height를 클라이언트에서 측정 후 변환. 이미지 리사이징은 절대 금지 (좌표 깨짐).

### 2.3 한글 OCR 백업 (bbox 폴백)

- **PaddleOCR 3.0** — 한글 정확도 SOTA (2025-Q4 기준 95%+). Cloudflare Workers AI 또는 자체 엔드포인트
- **Surya OCR** — Apache 2.0, 다국어 95% 정확. Python 의존 → 사용 안 함
- **Tesseract 5** — 한글 정확도 낮음 → 사용 안 함

**결정**: 1차 Gemini → 좌표 누락 시 2차 PaddleOCR (Cloudflare Workers AI `@cf/baai/bge-m3` 사용 안 함, 별도 서비스). MVP에선 **Gemini-only**, 정확도 모니터링 후 PaddleOCR 백업 추가.

### 2.4 시각화 라이브러리

| 라이브러리 | 용도 | 채택 |
|---------|----|----|
| **Recharts 3** (2026 stable) | Area / Line / Radar 차트 | ✅ 신규 도입 |
| **Framer Motion 12** | 마이크로 인터랙션, 페이지 전환 | ✅ 기존 |
| **GSAP 3.12** | 스캔 애니메이션 같은 복합 시퀀스 | ❌ (Framer로 충분) |
| **D3.js v7** | 커스텀 force-directed (관계 그래프) | ⏸ Phase 2 |
| **Tremor** | 대시보드 카드 | ❌ (디자인 톤 안 맞음) |
| **react-zoom-pan-pinch** | 캡처 이미지 확대/이동 | ✅ 신규 도입 |

### 2.5 UI 컴포넌트 / 모티브

- **Glassmorphism + Neon Accent**: 의료 진단 패널 톤 (다크 베이스 #0A0E27, 네온 시안 #00F0FF, 자홍 #FF3D7F)
- **shadcn/ui**: 도입 안 함 (현재 프로젝트는 Tailwind primitive만 씀, 일관성 깨짐)
- **lucide-react**: 이미 쓰는 중. 활용 ↑ (Activity, Brain, Heart, Sparkles, ScanLine)
- **Framer Motion `layout` + `AnimatePresence`**: 결과 뷰 전환

### 2.6 의료 X-ray UX 레퍼런스

- Apple Health: 데이터-밀도 + 미니멀 헤더
- Withings ScanWatch: 스캔 라인 애니메이션
- Headspace Sleep: 다크 + 글로우 + 차분
- 의료 영상 viewer (DICOM): 십자선 + 좌표 표시

→ **본 프로젝트 비주얼 톤**: "심야 응급실 의료 진단 패널 + Z세대 카톡 미감"

---

## 3. 시스템 아키텍처

### 3.1 데이터 플로우 (v2)

```
[클라이언트]
  카톡 캡처 업로드
  → base64 변환 (RFC 2397)
  → POST /api/xray/v2/analyze
       ↓
[서버]
  1. 인증 (supabase.auth.getUser)
  2. 일일 한도 체크 (subscription.checkXrayDailyLimit)
  3. Vision Pipeline:
     a. Gemini 2.5 Pro + bbox prompt → JSON
     b. 폴백: 2.5 Flash → 2.0 Flash (bbox 없으면 fallback to layout heuristic)
     c. responseSchema 강제 → 스키마 위반 시 1회 재시도
  4. Multi-axis 분석:
     - emotion(intensity, valence)
     - intimacy(0-100)
     - power(-100 ~ +100, 음수=상대 우위)
     - responsiveness(응답 시간 추정 + 메시지 길이비)
     - attachmentStyle(secure | anxious | avoidant | disorganized)
     - relationshipStage(early_dating | committed | crisis | recovery | postbreakup)
     - culturalPatterns(잠수, 읽씹, 톤시프트, 감정노동 분담)
  5. 추천 답장 4톤 생성 (gentle, direct, humor, withdrawn)
  6. Supabase insert (xray_analyses)
  7. recordXrayUsage
  8. JSON 응답 (id 포함)
       ↓
[클라이언트]
  결과 → /xray/result/[id] 라우트로 navigate
  → XRayDashboard 렌더 (5탭)
```

### 3.2 컴포넌트 트리

```
/xray (page.tsx)               ← 업로드 입구
  → CinematicScanner              ← 분석 중 풀스크린 시네마틱
  → /xray/result/[id]/page.tsx    ← 결과 페이지 (DB에서 fetch)
       └ XRayDashboard
           ├ Tab: Scan        (XRayHeatmapV2 + 십자선)
           ├ Tab: Timeline    (Recharts area + 응답 시간)
           ├ Tab: Patterns    (Radar + 애착스타일 chip)
           ├ Tab: Insights    (다단 카드 + 관계 단계)
           └ Tab: Simulator   (기존 simulate 진입)
```

### 3.3 라우트 구조

| 경로 | 역할 |
|----|----|
| `/xray` | 업로드 + 스캐너 |
| `/xray/result/[id]` | 결과 상세 (영구) |
| `/xray/history` | 과거 분석 목록 (Phase 2) |
| `/xray/simulate?from=[id]` | 시뮬레이터 (기존 유지) |

### 3.4 상태 관리

**Zustand 도입 안 함**. 결과는 DB가 단일 SoT. 클라 상태는 페이지 로컬만:
- 업로드 페이지: `imageBase64`, `loadingPhase`, `error`
- 결과 페이지: `analysis` (DB fetch 결과), `activeTab`

---

## 4. 분석 엔진 v2 명세

### 4.1 새 프롬프트 (XRAY_PROMPT_V2)

전체 프롬프트는 `src/lib/xray/prompt-v2.ts` 에 분리 저장. 핵심 골격:

```
역할: 너는 연애 심리 전문가 '루나'. 임상심리 + 애착 이론 + 한국 데이팅 문화에 능통.

## 1단계: 메시지 추출
이미지에서 모든 카톡 말풍선을 찾아라. 각 말풍선마다:
- bbox: [ymin, xmin, ymax, xmax] (Gemini 0-1000 normalized)
- sender: "me" (오른쪽 노란색) | "other" (왼쪽 흰색)
- text: 정확한 원문 (오타/이모지 포함)
- timestamp: 보이면 "HH:MM" 형식, 안 보이면 null

## 2단계: 메시지별 미시 분석
각 메시지마다:
- surfaceEmotion: 표면 감정 (1-2단어)
- deepEmotion: 숨은 진짜 감정 (EFT 1차감정 기반: 슬픔/두려움/수치심/분노/외로움)
- intent: 화자의 진짜 의도 (1문장)
- riskLevel: safe | caution | conflict | cold
- intensity: 0-100
- temperature: -100(차가움) ~ +100(따뜻함)

## 3단계: 거시 분석 (대화 전체)
- emotionArc: [{ msgIndex, valence }] — 시간순 감정 곡선
- powerBalance: -100~+100 (음수=상대가 주도권 / 0=균형 / 양수=내가 주도권)
- intimacyScore: 0-100 — 친밀도
- responsivenessScore: 0-100 — 응답성 균형
- attachmentStyle: { user, partner } 각각 secure/anxious/avoidant/disorganized + confidence(0-100)
- relationshipStage: early_dating | committed | crisis | recovery | postbreakup + confidence
- culturalPatterns: ["잠수", "읽씹", "톤시프트", "감정노동 비대칭"] 중 해당 항목

## 4단계: 진단 + 처방
- diagnosis: 2-3문장. 의료 진단 톤 + 루나 페르소나 ("음... 이건 ~거든")
- keyInsight: 사용자가 놓친 진짜 신호 1개 (BLUNT)
- redFlags: [{ severity: low|med|high, label, why }] 0-3개
- greenFlags: [{ label, why }] 0-3개
- reconciliationScore: 0-100 + reasoning
- nextStep: 지금 당장 사용자가 할 행동 1가지

## 5단계: 답장 4톤
recommendedReplies: [
  { tone: "gentle", text, expectedReaction },
  { tone: "direct", text, expectedReaction },
  { tone: "humor", text, expectedReaction },
  { tone: "withdrawn", text, expectedReaction }
]

## 출력
반드시 단일 JSON. 마크다운 코드블록 금지. 모든 한글 텍스트.
```

### 4.2 출력 스키마 (Zod / TypeScript)

`src/lib/xray/types-v2.ts`:

```ts
export interface XRayMessageV2 {
  bbox: { ymin: number; xmin: number; ymax: number; xmax: number }; // 0-1000
  sender: 'me' | 'other';
  text: string;
  timestamp: string | null;
  surfaceEmotion: string;
  deepEmotion: string;
  intent: string;
  riskLevel: 'safe' | 'caution' | 'conflict' | 'cold';
  intensity: number;          // 0-100
  temperature: number;         // -100 ~ +100
}

export interface AttachmentRead {
  style: 'secure' | 'anxious' | 'avoidant' | 'disorganized';
  confidence: number; // 0-100
}

export interface FlagItem {
  severity?: 'low' | 'med' | 'high';
  label: string;
  why: string;
}

export interface ReplyOption {
  tone: 'gentle' | 'direct' | 'humor' | 'withdrawn';
  text: string;
  expectedReaction: string;
}

export interface XRayResultV2 {
  messages: XRayMessageV2[];
  emotionArc: { msgIndex: number; valence: number }[];
  powerBalance: number;
  intimacyScore: number;
  responsivenessScore: number;
  attachmentStyle: { user: AttachmentRead; partner: AttachmentRead };
  relationshipStage: {
    stage: 'early_dating' | 'committed' | 'crisis' | 'recovery' | 'postbreakup';
    confidence: number;
  };
  culturalPatterns: string[];
  diagnosis: string;
  keyInsight: string;
  redFlags: FlagItem[];
  greenFlags: FlagItem[];
  reconciliationScore: number;
  reconciliationReasoning: string;
  nextStep: string;
  recommendedReplies: ReplyOption[];
}
```

### 4.3 결정성 (Reproducibility)

- Gemini `temperature: 0.2`, `topP: 0.9` 고정
- 동일 캡처 → 점수 ±5 이내 일관성 목표
- 검증 케이스: `tests/xray/fixture-{1..5}.png` 5개 샘플로 일주일 단위 회귀 테스트

### 4.4 가드레일

- 이미지 크기 제한: 5MB
- 발견된 메시지 0개 → "캡처에서 메시지를 찾지 못했어요" + 다시 업로드 가이드
- bbox out-of-range → 필터링 후 진행 (UI 안 쓰면 됨)
- 18+/위험 메시지 (자살/폭력) → 위기 모달 + 1393 핫라인 안내

---

## 5. UI / UX 디자인 시스템 v2

### 5.1 컬러 토큰

`src/styles/xray-v2-tokens.ts`:

```ts
export const XV2 = {
  bg:        '#0A0E27',          // 베이스 다크
  surface:   '#11173B',          // 카드
  surface2:  '#1A2050',          // 카드 hover
  border:    'rgba(0, 240, 255, 0.18)',
  glow:      '0 0 32px rgba(0, 240, 255, 0.35)',

  text:      '#E8EBFF',
  textDim:   '#9AA3D4',
  textMute:  '#6068A0',

  cyan:      '#00F0FF',          // 1차 강조 (사용자/긍정/스캔 라인)
  magenta:   '#FF3D7F',          // 2차 강조 (상대/위험)
  amber:     '#FFC940',          // 경고
  green:     '#3DFFB8',          // 안전
  blue:      '#5AA9FF',          // 차가움/거리
  purple:    '#B388FF',          // 루나/심리
};
```

### 5.2 폰트

- Sans: Pretendard Variable (이미 사용)
- Mono: JetBrains Mono (좌표/타임스탬프, 의료 데이터 톤)
- 신규 import: `@fontsource/jetbrains-mono`

### 5.3 핵심 모티브

1. **스캔 라인** — 위→아래 흐르는 시안 라인 + 잔상 글로우 (의료 영상 모티브)
2. **십자선 (crosshair)** — 마우스/탭 위치에 십자선. 좌표 표시 (`x=327, y=412`)
3. **글래스 카드** — `backdrop-filter: blur(20px) saturate(140%)` + 0.06 white tint
4. **데이터 글림(glimmer)** — 차트가 그려질 때 시안 빛이 따라오는 효과
5. **노이즈 텍스처** — 1% opacity SVG noise → 의료 영상 그레인 느낌

### 5.4 5탭 결과 대시보드 명세

#### Tab 1: Scan (의료 캡처 뷰)

- 캡처 이미지를 풀-블리드로 띄우고
- 메시지마다 bbox에 **펄스 링** + 색상 hue가 `temperature`로 결정 (시안→자홍 그라데)
- 좌하단: **십자선 좌표 + 메시지 메타** (현재 hover된 메시지의 surface/deep emotion)
- 상단 토글: "원본만 / 분석 오버레이 / 둘 다"
- 줌/팬 (`react-zoom-pan-pinch`)

#### Tab 2: Timeline (감정 곡선)

- 가로축: 메시지 인덱스 (시간순)
- 세로축: temperature (-100 ~ +100)
- Recharts `AreaChart` — 시안→자홍 그라데이션 fill
- 각 점 호버 → 메시지 텍스트 툴팁
- 보조 라인: powerBalance (점선)

#### Tab 3: Patterns (관계 패턴)

- 상단: **애착 스타일 카드 2장** (나/상대) + confidence 바
  - 4스타일별 색 토큰: secure=green, anxious=amber, avoidant=blue, disorganized=magenta
  - 작은 도식: 안정형 ⚖️ / 불안형 🌀 / 회피형 🚪 / 혼란형 ⚡
- 중단: **Radar** (Recharts) — 5축 (intimacy, responsiveness, intensity, warmth, trust) 0-100
- 하단: **문화 패턴 칩** (잠수 / 읽씹 / 톤시프트 / 감정노동 비대칭)

#### Tab 4: Insights (진단)

- 1행: **관계 단계 배지** (early_dating / committed / crisis / recovery / postbreakup) + confidence + 1줄 설명
- 2행: **루나의 진단** — 큰 글래스 카드. 의료 진단 톤 + 루나 페르소나
- 3행: **핵심 발견 (Key Insight)** — 자홍 글로우 카드. 1문장 BLUNT
- 4행: **레드 플래그 / 그린 플래그** — 좌우 split, severity 컬러바
- 5행: **다음 한 걸음 (Next Step)** — CTA 카드. 시안 펄스
- 6행: **추천 답장 4톤** — 가로 스와이프 카드 (gentle/direct/humor/withdrawn). 톤 선택 → 복사 / "연습하기"

#### Tab 5: Simulator

- 기존 `/xray/simulate` 그대로. analysis id 전달.

### 5.5 시네마틱 스캐너 (로딩)

`src/components/xray/CinematicScanner.tsx`. 풀스크린 모달 (`z-[200]`). 시퀀스:

```
T+0.0s   딤 페이드인 (검정 95%)
T+0.3s   업로드 이미지 미리보기 페이드인 (40% opacity, 중앙)
T+0.5s   상단에서 시안 스캔 라인 시작 → 4초간 위→아래
T+0.5s   하단에 6단계 텍스트 시퀀스 (각 ~0.7s):
         "이미지 인식 중..."
         "말풍선 추출 중..."
         "감정 매핑 중..."
         "맥락 추론 중..."
         "관계 패턴 분석 중..."
         "진단 마무리 중..."
T+4.5s   응답 도착하면 페이드 아웃 후 결과 페이지 push
```

레이턴시 < 4.5초면 마지막 텍스트에서 1초 hold. > 6초면 "조금 더 걸리고 있어요..." 추가.

### 5.6 빈 상태 / 에러 상태

- **빈 캡처**: "메시지를 찾지 못했어요. 캡처가 또렷한지 확인해줘"
- **한도 초과**: 기존 프리미엄 유도 카드 그대로
- **분석 실패**: "지금 루나가 잠깐 멈춰있어. 다시 시도해줘"
- **이미지 형식 X**: PNG/JPEG/WebP만, 최대 5MB

---

## 6. 데이터베이스 스키마

### 6.1 새 테이블: `xray_analyses`

```sql
CREATE TABLE IF NOT EXISTS xray_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 입력
  image_storage_key TEXT,        -- supabase storage path (선택)
  image_width INTEGER NOT NULL,
  image_height INTEGER NOT NULL,

  -- 결과 (JSONB)
  result JSONB NOT NULL,         -- XRayResultV2 전체

  -- 메타
  model_used TEXT NOT NULL,
  latency_ms INTEGER,
  schema_version SMALLINT NOT NULL DEFAULT 2
);

CREATE INDEX xray_analyses_user_idx ON xray_analyses (user_id, created_at DESC);

ALTER TABLE xray_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own xray" ON xray_analyses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users insert own xray" ON xray_analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 6.2 이미지 저장 (선택, Phase 2)

- MVP: 이미지 자체는 저장 안 함 (사용자 사생활 + 비용)
- result에 `imageBase64` 포함 안 함. 결과 페이지 진입 시 이미지가 없어도 분석은 보임
- Phase 2: `xray-captures` Supabase Storage 버킷 + signed URL + 7일 자동 만료

---

## 7. API 명세

### 7.1 POST `/api/xray/v2/analyze`

**Request**:
```ts
{
  imageBase64: string;     // data:image/...;base64,...
  imageWidth: number;
  imageHeight: number;
}
```

**Response (200)**:
```ts
{
  id: string;              // xray_analyses.id
  result: XRayResultV2;
  modelUsed: string;
  latencyMs: number;
}
```

**Errors**:
- 401 unauthorized
- 429 daily limit (with `upgrade: true`)
- 422 no_messages_found
- 500 모든 모델 폴백 실패

### 7.2 GET `/api/xray/v2/[id]`

본인 분석만 반환. RLS로 보호. 404 if not found.

### 7.3 GET `/api/xray/v2/history?limit=20`

본인 최근 분석 목록 (lightweight projection: id, createdAt, reconciliationScore, relationshipStage). Phase 2.

---

## 8. 파일 변경/추가 목록

### 추가
```
docs/xray-v2-pro-plan.md                                 ← 본 문서
supabase/migrations/20260430_xray_v2.sql                 ← 테이블

src/lib/xray/types-v2.ts                                  ← 타입
src/lib/xray/prompt-v2.ts                                 ← 프롬프트
src/lib/xray/gemini-client.ts                             ← 폴백 캐스케이드 모듈화
src/lib/xray/normalize-bbox.ts                            ← 0-1000 → 픽셀

src/app/api/xray/v2/analyze/route.ts                      ← 새 분석 API
src/app/api/xray/v2/[id]/route.ts                         ← GET 단건

src/app/(app)/xray/result/[id]/page.tsx                   ← 결과 페이지

src/components/xray-v2/CinematicScanner.tsx               ← 풀스크린 로더
src/components/xray-v2/XRayDashboard.tsx                  ← 5탭 컨테이너
src/components/xray-v2/tabs/ScanTab.tsx                   ← 탭1
src/components/xray-v2/tabs/TimelineTab.tsx               ← 탭2
src/components/xray-v2/tabs/PatternsTab.tsx               ← 탭3
src/components/xray-v2/tabs/InsightsTab.tsx               ← 탭4
src/components/xray-v2/tabs/SimulatorTab.tsx              ← 탭5 (래퍼)
src/components/xray-v2/parts/ScanLine.tsx                 ← 스캔 라인 SVG
src/components/xray-v2/parts/Crosshair.tsx                ← 십자선
src/components/xray-v2/parts/GlassCard.tsx                ← 글래스 카드
src/components/xray-v2/parts/AttachmentBadge.tsx          ← 애착 칩
src/components/xray-v2/parts/EmotionRadar.tsx             ← Radar
src/components/xray-v2/parts/EmotionArc.tsx               ← Area
src/components/xray-v2/parts/ReplyToneCard.tsx            ← 톤 카드

src/styles/xray-v2-tokens.ts                              ← 토큰
```

### 변경
```
src/app/(app)/xray/page.tsx                               ← 업로드 UI 다크 톤화 + CinematicScanner 도입
src/components/layout/Navigation.tsx                      ← 라벨 그대로
package.json                                              ← recharts, react-zoom-pan-pinch, @fontsource/jetbrains-mono 추가
```

### Deprecate (보존)
```
src/app/api/xray/analyze/route.ts                         ← v1, 한 마이너 후 삭제
src/components/xray/XRayHeatmap.tsx                       ← 유지 but 사용처 0
src/components/xray/XRayResultCard.tsx                    ← 유지 but 사용처 0
src/components/chat/events/XRayInlineCard.tsx             ← 유지 (채팅 인라인은 v1 결과 그대로)
```

---

## 9. 구현 단계 (Phased Rollout)

### Phase 1 — 인프라 (1일)
1. `supabase/migrations/20260430_xray_v2.sql` 작성 + RLS
2. `npm i recharts react-zoom-pan-pinch @fontsource/jetbrains-mono`
3. `src/styles/xray-v2-tokens.ts` 생성
4. `src/lib/xray/types-v2.ts` 생성

### Phase 2 — 분석 엔진 (1-2일)
5. `src/lib/xray/prompt-v2.ts` 작성 (4.1 골격 그대로)
6. `src/lib/xray/gemini-client.ts` 모듈화 (현재 v1 함수 재사용 + 모델 리스트 갱신)
7. `src/lib/xray/normalize-bbox.ts` (0-1000 → px 변환 + clamp)
8. `src/app/api/xray/v2/analyze/route.ts`:
   - 인증 + 한도
   - Gemini Pro/Flash 캐스케이드 + responseSchema
   - JSON 파싱 + 검증 (필수 필드 누락 시 1회 재시도)
   - Supabase insert
   - return `{ id, result, modelUsed, latencyMs }`
9. `src/app/api/xray/v2/[id]/route.ts`: GET 단건

### Phase 3 — UI 부품 (2일)
10. `parts/GlassCard.tsx` — 글래스 모피즘 + 글로우
11. `parts/ScanLine.tsx` — 위→아래 시안 라인 + tail glow
12. `parts/Crosshair.tsx` — 마우스 따라 십자선
13. `parts/AttachmentBadge.tsx`, `EmotionRadar.tsx`, `EmotionArc.tsx`, `ReplyToneCard.tsx`
14. `CinematicScanner.tsx` — 4.5초 시퀀스

### Phase 4 — 5탭 대시보드 (2일)
15. `tabs/ScanTab.tsx` — bbox 픽셀 정규화 + 펄스 링 + 줌/팬
16. `tabs/TimelineTab.tsx` — Recharts AreaChart + 호버 툴팁
17. `tabs/PatternsTab.tsx` — 애착 카드 + 레이더 + 칩
18. `tabs/InsightsTab.tsx` — 진단 6행 (관계단계/진단/key/플래그/nextStep/답장4톤)
19. `tabs/SimulatorTab.tsx` — 기존 simulate 페이지 진입 wrapper
20. `XRayDashboard.tsx` — 탭 컨테이너 (Framer `LayoutGroup`)

### Phase 5 — 페이지 통합 (0.5일)
21. `/xray/page.tsx` 다크 톤화 + CinematicScanner 호출 + 응답 후 `router.push('/xray/result/' + id)`
22. `/xray/result/[id]/page.tsx` 작성 — server fetch + XRayDashboard

### Phase 6 — 검증 (1일)
23. 5개 fixture 캡처로 회귀 테스트
24. 점수 일관성 측정 (동일 캡처 ×3 → ±5 이내)
25. `tsc --noEmit` 0 에러
26. 모바일 사이즈 (390px / 414px) 디자인 검수

총 예상 작업 시간: 7-9일 (1인 풀타임)

---

## 10. 수용 기준 (Acceptance Criteria)

A. **정확도**
- bbox 정확도 ≥ 90% (5개 fixture 평균, 화면-인지 검수)
- 동일 캡처 reconciliationScore 일관성 ±5 이내 (3회 측정)

B. **성능**
- 분석 latency p50 < 4초, p95 < 8초
- 결과 페이지 LCP < 1.5초

C. **UI 품질**
- 5탭 모두 모바일 390px에서 가로 스크롤 0
- 다크 톤 일관성 (검수: 시안/자홍/베이스 외 색 사용 시 토큰 거치는지)
- 스캔 애니메이션 60fps 유지 (Chrome DevTools Performance)

D. **신뢰성**
- 한도 초과/실패/빈 캡처 모든 경로에 명시적 UI
- DB persist 100% (분석 후 결과 페이지 새로고침해도 동일)

E. **타입 안전**
- `tsc --noEmit` 0 에러
- Zod 또는 수동 가드로 Gemini 응답 검증 통과

---

## 11. 위험 + 대안

| 위험 | 영향 | 완화책 |
|----|----|------|
| Gemini bbox 정확도 한글 캡처 미흡 | 핵심 기능 깨짐 | Phase 1.5에 PaddleOCR 백업 계약 |
| 점수 변동성 ±20% | 사용자 신뢰 깨짐 | temperature 0.2 + responseSchema + 일관성 회귀 테스트 |
| 다크 톤 적응 못 하는 사용자 | 이탈 | 결과 페이지 우상단 라이트/다크 토글 (Phase 2) |
| 8초+ 레이턴시 | 이탈 | 시네마틱 스캐너로 체감 시간 단축 + Flash 폴백 우선 |
| 이미지 크기 5MB 초과 | 업로드 실패 | 클라이언트 리사이즈 (max 1600px wide, JPEG q=0.85) |

---

## 12. v1 → v2 마이그레이션 정책

- v1 라우트 (`/api/xray/analyze`) 는 채팅 인라인 카드 (`XRayInlineCard`) 가 아직 사용 → **유지**. 신규 진입은 v2.
- 1마이너(약 2주) 후 v1 사용처 제로 확인되면 v1 파일 삭제 PR.
- 기존 in-memory 일일 한도 (`subscription.checkXrayDailyLimit`) 는 v1+v2 공통 사용 (한 사용자가 v1 1회 + v2 1회 안 됨 — 통합 카운트).

---

## 13. 미래 확장 (Out of Scope)

- 음성/영상 분석 (목소리 톤)
- 시계열 비교 (이전 분석과 변화)
- 파트너 공유 모드 (둘 다 동의 시 같은 결과 공유)
- 한국어 외 언어 (영어 / 일본어)
- 오프라인 분석 (Qwen3-VL 자체호스팅)

---

## 부록 A — 디자인 픽셀 토큰 (모바일 390px 기준)

```
탭 헤더 높이:        56px
탭 바 높이:          48px
글래스 카드 라운드:  20px
글래스 카드 패딩:    20px
스캔 라인 두께:      2px (+12px glow)
십자선 길이:         24px
폰트 사이즈
  - h1:              22px / 800
  - 섹션 제목:        13px / 700 / uppercase / letter-spacing 0.06em
  - 본문:             14px / 500
  - 데이터/모노:      12px / JetBrains Mono
```

## 부록 B — 의존성 추가

```json
{
  "dependencies": {
    "recharts": "^3.0.0",
    "react-zoom-pan-pinch": "^3.6.0",
    "@fontsource/jetbrains-mono": "^5.1.0"
  }
}
```

## 부록 C — 환경 변수 (변경 없음)

기존 `GOOGLE_API_KEY`, `GEMINI_API_KEY` 그대로 사용. Pro 모델은 같은 키로 호출 가능.

---

**최종 합의**: 본 계획서대로 8단계 phased 구현. 각 phase 완료 시 `npx tsc --noEmit` 0 에러 + 모바일 디자인 검수 통과 의무. 어느 phase에서 막히면 본 문서 ‐ 해당 절을 다시 열고 그대로 따라간다.
