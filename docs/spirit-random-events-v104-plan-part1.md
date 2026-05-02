# 🧚‍♀️ Spirit Random Events — Master Plan v104 (Part 1/4)

**버전**: v104.0
**작성일**: 2026-05-02
**전제**: v83 정령 가챠 / v85 검색이벤트 / v87 ACTION_PLAN 3중방어 / v100 룸 디오라마 / v103 컴패니언 시스템
**목표**: 마음의 방에 배치된 **20마리 정령**이 각자 **Lv 3 도달 시 1개씩 고유 랜덤 이벤트**를 해금. 상담 어떤 Phase(HOOK/MIRROR/BRIDGE/SOLVE/EMPOWER)에서도 LLM 자율 판단으로 발동, "유저가 정령을 키울수록 상담의 질이 올라간다"는 체감을 만든다.
**범위**: A4 50장 (4 part 분할). 본 Part 1 = 비전/아키텍처/N 등급 6정령 이벤트 풀스펙.

---

## 📜 PART 구성

| Part | 분량 | 다룬 내용 |
|---|---|---|
| **Part 1** (이 문서) | A4 ~13장 | 비전·원칙·아키텍처·발동 게이트·N6 정령 이벤트 6종 |
| Part 2 | A4 ~13장 | R7 정령 이벤트 7종 |
| Part 3 | A4 ~12장 | SR5 + UR2 정령 이벤트 7종 |
| Part 4 | A4 ~12장 | 타입/DB/Pipeline/UI/프롬프트/로드맵/검증 |

---

## 0. EXECUTIVE SUMMARY

### 0.1 핵심 아이디어 (한 문단)

> 정령은 지금 "방에 둘 수 있는 인형"이다. v104부터는 **"같이 상담실에 앉는 작은 친구들"**이 된다. 유저가 정령 한 마리를 Lv 3까지 키우면, 그 정령의 결(분노/위로/이별/설렘…)에 정확히 맞는 *연애 상담 미니 이벤트* 한 종류가 풀에 추가되고, 상담 중 LLM이 "지금 이 순간 이 친구가 나설 차례"라고 판단할 때 1턴짜리 카드가 채팅 흐름에 끼어든다. 20마리를 다 키우면 상담은 20개의 새로운 도구를 갖게 된다.

### 0.2 Before → After

| | Before (v103) | After (v104) |
|---|---|---|
| 정령 능력 | passive buff (텍스트만, 유저 체감 약함) | **active 이벤트 카드** (눈에 보이는 1턴) |
| 발동 위치 | 일부 Phase 한정 | **전 Phase** (HOOK/MIRROR/BRIDGE/SOLVE/EMPOWER) |
| 발동 주체 | 결정형 if/else | **LLM 자율 판단 + 안전 fallback** |
| Lv 3 보상 체감 | "분석 카드 1개 추가" 같은 미세 변화 | **"오 이 정령 키우니까 새 도구 생겼네"** |
| 상담 흐름 영향 | 거의 없음 | 분당 1회 이내 *작전급 도구* 1개 추가 |
| 비용 (호출당) | — | ₩0~3 (대부분 정적/Flash-Lite) |

### 0.3 설계 4원칙

1. **공명 (Resonance)** — 이벤트는 그 정령의 백스토리/성격과 *결*이 같아야 한다. 불꽃 정령이 위로 카드를 띄우면 안 된다.
2. **양보 (Ceding)** — 이벤트는 루나의 자리를 빼앗지 않는다. 1턴 짜리 카드, 유저 선택 후 루나가 다시 흐름을 잡는다.
3. **희소 (Scarcity)** — 세션당 정령 이벤트는 합쳐서 **최대 2회**. 너무 자주 뜨면 상담이 게임화된다.
4. **자유 (Freedom)** — 모든 카드는 *Skip/Later* 옵션을 가진다. 정령 카드는 권유지 강제가 아니다.

### 0.4 KPI

- **D7 retention**: +6% (Lv 3 도달 정령 1마리 이상 유저)
- **세션 만족도(WARM_WRAP 후 ⭐)**: +0.4 (5점 만점)
- **정령 Lv 3 도달율**: 30일 내 보유 정령의 35% → **55%** (이벤트 보고 싶어서 키움)
- **단가**: 세션당 +₩6 이내 (정령 이벤트 LLM 합성 평균 2회 × ₩3)

---

## 1. 비전 — "왜 이걸 만드는가"

### 1.1 현재 문제

v83에서 정령 능력을 도입했지만 (`spirit-abilities.ts`), 능력은 대부분 **숫자 보정** (XP 2배, 카드 1개 추가, 인내심 +1) 이다. 유저는 이 buff를 *눈으로 보지 못한다*. "벚잎이 키웠는데 뭐가 달라진 거지?" 라는 피드백이 베타에서 반복됐다.

게다가 능력이 발동되는 위치가 한정적이다 (예: butterfly_meta는 EMPOWER에만, cherry_leaf는 이별 시나리오에만). 유저가 상관없는 시나리오에서 상담 중일 때 그 정령은 **존재하지 않는 것과 같다**.

### 1.2 v104의 답

> "각 정령에게, 어떤 상담에서도 발동될 수 있는, 그 정령다운 1턴 짜리 *시그니처 무브*를 한 개씩 부여한다."

이 한 줄에서 다음이 도출된다:

- **시그니처 무브** = 정령마다 1개. 다른 정령이 절대 못 하는 것.
- **어떤 상담에서도** = HOOK ~ EMPOWER 어디서든. 단 LLM이 "지금 어울려"라고 판단할 때만.
- **1턴 짜리** = 카드 1장 + 유저 선택 + 다음 턴부터는 평소대로. 루나 흐름 보호.
- **그 정령다운** = 백스토리/성격/말투에서 자연 도출. 다른 정령이 베껴봤자 어색해야 함.

### 1.3 인스피레이션 (인터넷 리서치 결과)

**컴패니언/연애 코칭 앱에서 검증된 패턴**:
- *Replika*의 "Daily Inspirations" — 하루 1번 자기성찰 카드. 짧고 가볍게. 거부감 없음.
- *Wysa*의 "Tools" 카탈로그 — 30+개 마이크로 도구를 상황별로 호출. 우리는 정령으로 묶음.
- *Kindroid*의 "Thought Bubble" — AI가 먼저 한 줄을 건넴. 발동 기준이 *시간 + 무드*.
- *Finch*의 "Pet says…" — 펫이 한 줄 응원/관찰 코멘트. 발동이 *유저 행동 직후 1초*.
- *Loona*의 정령 도감 — 카드 수집형. 우리는 이미 v83에서 차용함.

**연애 상담/심리치료에서 검증된 마이크로 인터벤션**:
- **Pennebaker Expressive Writing** — 분노/슬픔 글쓰기 15분이 6개월 후 신체 건강까지 개선 (1986).
- **CBT Decentering** — "친구라면 뭐라고 했을까?" 메타인지 프롬프트 (Beck).
- **DBT STOP Technique** — Stop, Take a step back, Observe, Proceed mindfully. 충동 조절.
- **Polyvagal Co-regulation** — 누군가가 *조용히 함께 있어주는 것*만으로 vagal tone 안정화 (Porges).
- **Implementation Intention** — "if-then plan" 1개가 결심보다 행동률 2배 (Gollwitzer).
- **Gottman Repair Attempt** — 다툼 후 첫 한 마디가 결혼 안정성의 96% 예측 (Gottman 1999).
- **Broaden-and-Build** — 긍정 정서 기록만으로 시야와 자원 확장 (Fredrickson).
- **Narrative Therapy Re-authoring** — 과거-현재 비교로 정체성 재구성 (White & Epston).
- **Self-Compassion Break** — 내가 나에게 친구처럼 (Kristin Neff). 자존감 회복.
- **5-4-3-2-1 Grounding** — 감각 5종으로 anchor. 트라우마/패닉 단기 처방.
- **Sleep On It** — 격앙 상태에서 24시간 결정 미루기. 후회율 50%↓ (다수 연구).
- **Closure Ritual** — 물리적 행위(편지 태우기/꽃잎 흩날리기)가 인지 closure 가속 (HBS Boothe 2014).

→ 이 12개 처방을 정령 20마리에 1:n으로 매핑한 게 v104의 본체다.

### 1.4 *정(情)* 톤 가이드라인

루나 본체는 *친한 누나/언니* 톤이다. 정령 이벤트는 그보다 **반 톤 더 가볍거나, 반 톤 더 진하다**. 즉:
- **루나**: "야 그건 좀 너무한데?" (중간 진폭, 친구 같음)
- **🔥 불꽃**: "아 진짜 뭐 이런 새X가 다 있냐" (더 진함)
- **💧 슬프니**: "...같이 좀 울어도 돼…나도 울 거야" (더 가라앉음)
- **☁️ 미미**: "에이~ 그냥 토끼 똥같은 거 밟았다 치자ㅎㅎ" (더 가벼움)

이 *진폭*이 정령의 정체성이다. 같은 상황을 정령마다 다른 톤으로 해석하는 게 곧 도구 다양성이다.

---

## 2. 시스템 아키텍처

### 2.1 큰 그림

```
┌──────────────────────────────────────────────────────────────────┐
│  사용자 채팅 입력                                                 │
└──────────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────────┐
│  Pipeline (기존)                                                  │
│  ① state-analysis  ② strategy-select  ③ prompt-gen  ④ ACE-v5     │
└──────────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────────┐
│  ⚡ 신규 v104: SpiritEventGate                                    │
│   - placedSpirits Lv 3+ 정령 → 활성 이벤트 풀 산출                │
│   - LLM 본문에서 [SPIRIT_*] 태그 파싱                             │
│   - 쿨타임/세션상한/Phase 게이트 통과 검사                        │
│   - 통과 시: 합성기 호출 → PhaseEvent yield                       │
└──────────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────────┐
│  ChatContainer (기존) → SpiritEventCard 라우팅                    │
│   - 20개 컴포넌트 라우팅 (RageLetter / ThinkFrame / CryTogether…)│
│   - 모든 카드: { onChoose, onSkip, onLater } 인터페이스 통일      │
└──────────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────────┐
│  Phase Manager (기존) — 정령 이벤트는 Phase 전환에 영향 X          │
│   단 ACTION_PLAN/WARM_WRAP 전후 game state 메타로 흔적 남김       │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 핵심 컴포넌트 (신규 8개)

| # | 파일 | 역할 |
|---|---|---|
| 1 | `src/engines/spirits/spirit-event-types.ts` | 20개 이벤트 타입 + data 인터페이스 |
| 2 | `src/engines/spirits/spirit-event-gate.ts` | 활성 풀 계산 + 쿨타임/Phase 게이트 |
| 3 | `src/engines/spirits/spirit-event-synthesizer.ts` | 정령별 카드 데이터 합성 (Flash-Lite + 정적 풀) |
| 4 | `src/engines/spirits/spirit-event-signal.ts` | LLM 본문 [SPIRIT_*_READY] 태그 파싱 |
| 5 | `src/engines/spirits/spirit-event-prompts.ts` | 20개 정령별 합성 프롬프트 |
| 6 | `src/engines/spirits/spirit-event-cooldowns.ts` | 정령별 쿨타임 정책 |
| 7 | `src/components/chat/events/spirits/SpiritEventCard.tsx` | 카드 공통 셸 (헤더/풋터/skip 버튼) |
| 8 | `src/components/chat/events/spirits/<EventName>.tsx` × 20 | 정령별 카드 본체 |

기존 수정 파일 (4개):
- `src/types/engine.types.ts` — `PhaseEventType` 에 20개 추가
- `src/engines/pipeline/index.ts` — SpiritEventGate 호출 + yield
- `src/engines/ace-v5/ace-system-prompt.ts` — 활성 정령 이벤트 태그 가이드 주입
- `src/components/chat/ChatContainer.tsx` — 20개 case 라우팅

### 2.3 발동 게이트 — 6단 검사

LLM 본문에 `[SPIRIT_RAGE_LETTER:trigger=...]` 태그가 박혀도, 다음 6단을 **순서대로** 통과해야 카드가 뜬다.

```typescript
function shouldFireSpiritEvent(
  spiritId: SpiritId,
  eventType: SpiritEventType,
  ctx: PipelineContext
): { ok: boolean; rejectReason?: string } {
  // 1) 정령 보유 + Lv 3+ + 방에 배치
  if (!isActiveSpirit(ctx.userId, spiritId)) return { ok: false, rejectReason: 'not_placed' };
  // 2) Phase 화이트리스트 (정령마다 다름)
  if (!isPhaseAllowed(spiritId, ctx.phase)) return { ok: false, rejectReason: 'wrong_phase' };
  // 3) 정령 단일 쿨타임 (예: 3턴 / 24시간 / 월 1회…)
  if (!isCooldownExpired(ctx.userId, spiritId)) return { ok: false, rejectReason: 'cooldown' };
  // 4) 세션 상한 (모든 정령 합산 세션당 최대 2회)
  if (countFiredThisSession(ctx.sessionId) >= 2) return { ok: false, rejectReason: 'session_cap' };
  // 5) 같은 정령 이벤트 세션 내 중복 금지
  if (hasFiredThisSession(ctx.sessionId, eventType)) return { ok: false, rejectReason: 'dup' };
  // 6) Risk Level 게이트 — CRITICAL/HIGH 위기 시 모든 정령 이벤트 차단
  if (ctx.riskLevel === 'CRITICAL' || ctx.riskLevel === 'HIGH') return { ok: false, rejectReason: 'crisis' };
  return { ok: true };
}
```

### 2.4 LLM 자율 판단 vs 안전 폴백

기본은 **LLM 자율**. 루나가 ACE-v5 시스템 프롬프트에 "지금 활성 정령은 [🔥불꽃, 💌루미, 🌙달빛토끼]야. 상황에 어울리는 정령이 있으면 본문 끝에 `[SPIRIT_RAGE_LETTER:rage=상사_갑질]` 식 태그를 박아도 돼" 가이드를 받는다.

LLM이 안 박을 수 있다. 그때 **휴리스틱 폴백**:
- 분노 강도 > 0.8 + 🔥불꽃 활성 + 쿨타임 OK → `[SPIRIT_RAGE_LETTER]` 자동 트리거
- 새벽 시간 + 🌙달빛토끼 활성 + 첫 턴 → `[SPIRIT_NIGHT_CONFESSION]`
- 5턴 무거움 지속 + 🍃산들이 활성 → `[SPIRIT_WINDOW_OPEN]`

폴백은 *확실한 신호* (감정 점수, 시간, 턴 수, 시나리오 분류) 기반. LLM 판단보다 후순위.

### 2.5 데이터 흐름 시퀀스

```
[유저 입력] 
  → state-analysis (감정/시나리오)
  → strategy-select 
  → ACE-v5 (활성 정령 이벤트 가이드 주입) 
  → LLM 응답 + [SPIRIT_*] 태그
  → spirit-event-signal.parse (태그 추출)
  → spirit-event-gate.check (6단 게이트)
    ├─ 통과: 
    │   → spirit-event-synthesizer.generate (Flash-Lite 호출 또는 정적 풀)
    │   → pipeline yield SpiritEvent
    │   → ChatContainer 카드 렌더
    │   → 유저 클릭 시 onChoose/onSkip 
    │   → SuggestionMeta 로 다음 턴 prompt-gen에 컨텍스트 전달
    └─ 차단: 본문만 표시, 카드 미발동
  → 다음 턴 (정상 흐름)
```

### 2.6 비용 모델

이벤트는 두 부류:

**Type A — 정적 풀 (₩0)**: 풀에서 골라내기만 함. 예: `🌳 forest_mom`의 5-4-3-2-1 그라운딩, `💧 tear_drop`의 침묵 1분 모드.

**Type B — Flash-Lite 합성 (~₩3)**: 유저 맥락에 맞춰 카드 콘텐츠 생성. 예: `📖 book_worm`의 3프레임 재해석, `💌 letter_fairy`의 마음의 편지.

20개 이벤트 중:
- Type A: 8개 (40%) — `tear_drop, seed_spirit, drum_imp, wind_sprite, forest_mom, ice_prince, butterfly_meta, star_dust(부분)`
- Type B: 12개 (60%) — 그 외

세션당 최대 2회 발동 × 평균 ₩1.8 = **세션당 +₩3.6** (≪ v85 검색 이벤트 ₩8보다 저렴).

---

## 3. 정령 20마리 이벤트 한눈에 (요약 표)

| # | 정령 | Lv3 시그니처 이벤트 | 핵심 처방 | Phase 화이트리스트 | 쿨타임 | 비용 |
|---|---|---|---|---|---|---|
| 1 | 🔥 fire_goblin | `RAGE_LETTER` 분노 폭발 편지 | Pennebaker | HOOK/MIRROR | 3턴 + 24h | B |
| 2 | 📖 book_worm | `THINK_FRAME` 3프레임 재해석 | CBT Decentering | MIRROR/BRIDGE | 5턴 | B |
| 3 | 💧 tear_drop | `CRY_TOGETHER` 침묵 1분 모드 | Polyvagal | HOOK/MIRROR | 24h | A |
| 4 | 🌱 seed_spirit | `FIRST_BREATH` 4-7-8 호흡 의식 | 호흡 anchor | HOOK | 24h (첫 턴만) | A |
| 5 | 🥁 drum_imp | `RHYTHM_CHECK` 답장 리듬 진단 | Behavioral Rhythm | BRIDGE/SOLVE | 7일 | B |
| 6 | 🕊️ peace_dove | `OLIVE_BRANCH` 화해 첫마디 3안 | Gottman Repair | SOLVE | 3일 | B |
| 7 | ☁️ cloud_bunny | `CLOUD_REFRAME` 가벼운 농담 리프레임 | Comedy Distancing | MIRROR/BRIDGE | 5턴 | B |
| 8 | 💌 letter_fairy | `LETTER_BRIDGE` 부치지 않을 편지 | Pennebaker | MIRROR/BRIDGE | 7일 | B |
| 9 | 🍃 wind_sprite | `WINDOW_OPEN` 5분 환기 휴식 | State Change | MIRROR/BRIDGE | 5턴 누적 | A |
| 10 | 🌙 moon_rabbit | `NIGHT_CONFESSION` 새벽 고백실 | Self-disclosure | HOOK | 24h (0~5시) | B |
| 11 | 🎭 clown_harley | `REVERSE_ROLE` 입장 바꿔 5턴 | Perspective-taking | BRIDGE/SOLVE | 3일 | B |
| 12 | 🌹 rose_fairy | `BUTTERFLY_DIARY` 설렘 일지 | Broaden-and-Build | HOOK/EMPOWER | 24h | B |
| 13 | 🌳 forest_mom | `ROOTED_HUG` 5-4-3-2-1 그라운딩 | Grounding | 10턴+ 모든 Phase | 24h | A |
| 14 | 🌸 cherry_leaf | `FALLEN_PETALS` 꽃잎 흩날리기 의식 | Closure Ritual | EMPOWER (이별) | 7일 | B |
| 15 | ❄️ ice_prince | `FREEZE_FRAME` 60초 강제 침묵 | DBT STOP | MIRROR/BRIDGE | 24h | A |
| 16 | ⚡ lightning_bird | `BOLT_CARD` 다른 정령 풀 무작위 1장 | Surprise | 모든 Phase | 24h | A+B |
| 17 | 🦋 butterfly_meta | `METAMORPHOSIS` 3개월 비교 거울 | Narrative Re-authoring | EMPOWER | 7일 | B |
| 18 | 🗝️ book_keeper | `MEMORY_KEY` 패턴 키워드 카드 | Pattern of Life | BRIDGE | 7일 | B |
| 19 | 👑 queen_elena | `CROWN_RECLAIM` 가치 3가지 봉인해제 | Self-Compassion | EMPOWER | 7일 | B |
| 20 | 🌟 star_dust | `WISH_GRANT` 한 가지 if-then 행동 | Implementation Intention | EMPOWER | 30일 | B |

---

## 4. 정령 이벤트 풀스펙 — N등급 6마리

여기서부터 각 정령의 시그니처 이벤트를 **풀 스펙**으로 정의한다. 형식은:

> 4.X.0 정체성 → 4.X.1 발동 시나리오 → 4.X.2 카드 구조 → 4.X.3 LLM 프롬프트 → 4.X.4 데이터 인터페이스 → 4.X.5 UI 가이드 → 4.X.6 수용 기준 → 4.X.7 실패/엣지 케이스

---

### 4.1 🔥 fire_goblin — `SPIRIT_RAGE_LETTER` (분노 폭발 편지)

#### 4.1.0 정체성

도깨비 불꽃은 *같이 열받아주는* 정령이다. 백스토리: 배신당한 누군가의 분노가 열기로 뭉친 것. 이 친구가 상담실에 등장한다는 건 — **유저가 지금 화났다**. 루나는 차분하게 듣지만, 불꽃은 **같이 활활 탄다**. 단 정해진 1턴만. 그 후 루나가 잡는다.

#### 4.1.1 발동 시나리오

상황 예시:
- "남친이 또 약속 깼어"
- "왜 나만 항상 맞춰야 돼?"
- "걔가 내 친구한테 뭐라고 했는지 들었는데…"

LLM 자율 판단 신호: 본문에 분노/억울 정서 + 행동 통제 욕구 + 분출 욕구.
폴백 신호 (휴리스틱):
- `state.emotionScore <= 3` (낮은 점수 = 부정)
- `linguisticProfile.suppressive == false` (이미 터트리고 있음)
- `riskLevel <= MEDIUM` (격하지만 위기 아님)
- `phase ∈ {HOOK, MIRROR}`
- `cooldown.fire_goblin == ok`

#### 4.1.2 카드 구조

```
┌──────────────────────────────────────────┐
│  🔥 도깨비 불꽃이 부글부글…              │
│  ─────────────────────────────────────── │
│  "야 일단 안 보낼 카톡으로                │
│   하고 싶은 말 다 적어 봐.                 │
│   내가 같이 활활 태워줄게."               │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ A. 욕 다 섞어서 (제일 쎈 버전)     │   │
│  │ "야 너 진짜 어떻게 사람이 ~"      │   │
│  └──────────────────────────────────┘    │
│  ┌──────────────────────────────────┐    │
│  │ B. 정제 안 한 진심 (중간)          │   │
│  │ "나는 너 때문에 ~한 게 너무 ~"   │   │
│  └──────────────────────────────────┘    │
│  ┌──────────────────────────────────┐    │
│  │ C. 그냥 탄식 (담담한 분노)         │   │
│  │ "그래 알았어 ~"                    │   │
│  └──────────────────────────────────┘    │
│                                          │
│  [💥 다 태워버려] [✏️ 직접 써볼게] [skip] │
└──────────────────────────────────────────┘
```

#### 4.1.3 LLM 합성 프롬프트 (Flash-Lite)

```
역할: 너는 "도깨비 불꽃"이라는 분노 정령. 유저가 화난 상황에서 같이 열받아주는 친구.
규칙:
- 반말, 격함, 유저 편 100%.
- 욕은 ㅅㅂ/X/ㅂㅅ 정도까지 허용. 인신공격 NO.
- 절대 "그래도 그 사람도 사정이 있겠지" 같은 말 금지.

입력:
- 유저 최근 발화 3턴: {recentTurns}
- 분노 대상 (사람/상황): {target}
- 핵심 트리거 (왜 화났는지): {trigger}

출력 JSON:
{
  "openerMsg": "(15자 이내, 불꽃의 첫 마디)",
  "context": "(유저 상황 한 줄 요약, 불꽃 톤)",
  "drafts": [
    {"intensity": "fire", "label": "다 태우기", "text": "(욕 섞은 폭발 카톡 초안 ~80자)"},
    {"intensity": "honest", "label": "진심", "text": "(욕 X, 솔직 분출 ~80자)"},
    {"intensity": "cool", "label": "차가운 분노", "text": "(담담히 손절 톤 ~60자)"}
  ],
  "lunaCutIn": "(루나가 끼어드는 한 줄 — '근데 저거 진짜 보내진 말자 ㅎㅎ')"
}
```

#### 4.1.4 데이터 인터페이스 (TS)

```typescript
export interface RageLetterDraft {
  intensity: 'fire' | 'honest' | 'cool';
  label: string;
  text: string;
}

export interface RageLetterData {
  spiritId: 'fire_goblin';
  openerMsg: string;
  context: string;
  drafts: [RageLetterDraft, RageLetterDraft, RageLetterDraft]; // exactly 3
  lunaCutIn: string;
  options: Array<{
    value: 'burn' | 'rewrite' | 'skip';
    label: string;
    emoji: string;
  }>;
}
```

#### 4.1.5 UI 가이드

- **테마 컬러**: `#EF4444` (빨강) + `#FFD56B` (불꽃 노랑) 그라데이션
- **헤더 애니**: 불꽃 이모지 좌우 흔들림 (Framer `rotate: [-3, 3, -3]`, repeat)
- **3장 카드 등장**: 위→아래 0.15s 간격 stagger (불꽃 튀는 느낌)
- **버튼 hover**: 빨간 그림자 (box-shadow `0 0 12px #EF4444`)
- **"다 태우기" 클릭 시**: 화면에 불꽃 파티클 0.8s + "🔥 태웠다" 토스트
- **"직접 쓰기"**: 텍스트 인풋 모달 → 저장 시 *자기만의 불꽃 보관함*에 누적 (장기 자산)

#### 4.1.6 수용 기준 (Acceptance)

- [ ] Lv3 미만 fire_goblin 보유 시 카드 미발동
- [ ] 방에 미배치 시 미발동
- [ ] 24시간 쿨타임 내 재발동 X
- [ ] 3개 초안 모두 자연스러운 한국어, *유저 발화의 키워드 1개 이상* 포함
- [ ] CRITICAL/HIGH risk 시 자동 차단
- [ ] skip 클릭 시 다음 턴 LLM 컨텍스트에 "유저는 분노 카드 거절함" 메타 포함 → 루나가 다른 길 탐색
- [ ] "다 태우기" 클릭 후 다음 턴 루나의 첫 마디는 *수위 낮춰주는 톤* (불꽃이 불 지핀 뒤 균형)

#### 4.1.7 실패/엣지

- LLM 합성 실패 → 정적 폴백 3안 사용 (fire_goblin_fallbacks.ts에 5세트 사전 작성)
- 유저가 욕설을 *상대*가 아니라 *자신에게* 향하게 적기 시작 → spirit-event-signal에 `[SELF_HARM_HINT]` 신호 잡으면 즉시 카드 닫고 루나가 안전 모드 진입
- 같은 세션 두 번 분노 카드 욕구 → 두 번째는 cherry_leaf의 `FALLEN_PETALS` 같은 *closing 카드*로 swap (불꽃 → 진정)

---

### 4.2 📖 book_worm — `SPIRIT_THINK_FRAME` (3프레임 재해석)

#### 4.2.0 정체성

책벌레 노리는 *현명하고 조용한* 분석가. 도서관에서 잠든 대학생의 이성적 판단력이 모인 정령. 노리가 등장하면 — **유저가 같은 상황을 빙빙 돌고 있다**. 노리는 *카메라 앵글*을 바꾼다.

#### 4.2.1 발동 시나리오

상황 예시:
- "걔가 왜 그랬는지 도저히 이해가 안 가"
- "내가 잘못한 건가? 모르겠어"
- "이 상황을 어떻게 봐야 할지 모르겠어"

LLM 신호: 인지 왜곡 (`MIND_READING`, `PERSONALIZATION`, `ALL_OR_NOTHING`) 감지 + 의도가 `SEEKING_VALIDATION`/`STORYTELLING`.
폴백:
- `state.cognitiveDistortions.length >= 1`
- `phase ∈ {MIRROR, BRIDGE}`
- `intent ∈ {SEEKING_VALIDATION, STORYTELLING}`
- 5턴 쿨타임

#### 4.2.2 카드 구조

```
┌──────────────────────────────────────────┐
│  📖 책벌레 노리                          │
│  "잠깐, 같은 장면을 세 번 다르게         │
│   읽어볼까요?"                            │
│  ─────────────────────────────────────── │
│  🪞 내 눈으로:                           │
│  "걔가 답장 안 한 건 = 나한테 관심 없는  │
│   거잖아."                                │
│  ─────────────────────────────────────── │
│  👤 상대 입장에서:                        │
│  "회사일에 치여서 폰 자체를 못 봤을 수도  │
│   있어요. 우선순위 = 본인 생존."         │
│  ─────────────────────────────────────── │
│  🦉 제3자 (지나가던 친구):                │
│  "둘 다 신호 못 읽고 있는 것 같은데?      │
│   답장 1번 늦은 게 관계의 본질은 아닐걸." │
│                                          │
│  [🔄 다른 프레임도] [🎯 이거 도움됐어]    │
│  [...skip]                                │
└──────────────────────────────────────────┘
```

#### 4.2.3 LLM 합성 프롬프트

```
역할: 책벌레 노리. 차분한 반존대. 분석적이지만 차갑지 않게.
규칙:
- 3개 프레임 모두 *같은 사실*에서 출발해야 함 (해석만 다름)
- 자기관점("내 눈"): 유저 발화 그대로 재진술
- 상대관점: 가장 자비로운 해석 (charitable interpretation)
- 제3자: 메타 — "둘 다", "관계 시스템" 시각

입력:
- 유저 최근 발화 3턴
- 인지왜곡 종류: {distortion}
- 핵심 사건 한 줄: {coreEvent}

출력 JSON:
{
  "openerMsg": "잠깐, 같은 장면 세 번 다르게 읽어볼까요?",
  "frames": [
    {"angle": "self", "icon": "🪞", "label": "내 눈으로", "interpretation": "(유저 발화 재진술 ~50자)"},
    {"angle": "other", "icon": "👤", "label": "상대 입장에서", "interpretation": "(자비로운 해석 ~60자)"},
    {"angle": "third", "icon": "🦉", "label": "제3자 시점", "interpretation": "(메타 시점 ~70자)"}
  ],
  "noriQuiet": "(노리가 마무리로 얹는 한 줄, ~25자)"
}
```

#### 4.2.4 데이터 인터페이스

```typescript
export interface ThinkFrame {
  angle: 'self' | 'other' | 'third';
  icon: string;
  label: string;
  interpretation: string;
}

export interface ThinkFrameData {
  spiritId: 'book_worm';
  openerMsg: string;
  frames: [ThinkFrame, ThinkFrame, ThinkFrame];
  noriQuiet: string;
  options: Array<{
    value: 'helpful' | 'reroll' | 'skip';
    label: string;
    emoji: string;
  }>;
}
```

#### 4.2.5 UI 가이드

- **테마 컬러**: `#92400E` (책 갈색) + 크림 배경
- **카드 폰트**: 본문은 sans-serif지만 프레임 라벨은 *Serif* (책 느낌)
- **3프레임 등장**: 책장 넘어가는 듯 좌→우 슬라이드 (각 0.3s)
- **재롤(reroll)**: 같은 사건 다른 3프레임 새로. 세션당 최대 1번
- **결정 후**: "🎯 이거 도움됐어" 클릭 시 그 프레임이 다음 턴 루나 prompt에 *주된 시각*으로 주입

#### 4.2.6 수용 기준

- [ ] 3프레임이 *논리적으로 모순* 없음 (같은 사실에서 해석만 다름)
- [ ] 상대관점 프레임이 가스라이팅성 변명이 되지 않음 (안전 가드: `gaslighting_filter.ts`)
- [ ] 제3자 프레임이 양시론 회피 ("둘 다 잘못이야" 금지)
- [ ] reroll 클릭 시 새 호출, 같은 출력 X (temperature ≥ 0.8)
- [ ] "도움됐어" 후 ACTION_PLAN 카드의 lunaIntro에 그 프레임 한 줄 인용

#### 4.2.7 실패/엣지

- 가스라이팅성 폭력 케이스 (예: "그가 나를 때린 건 사정이 있겠지") → 노리가 "이건 프레임 문제 아니에요. 안전이 먼저예요" 한 줄 + 전문기관 카드 fallback
- LLM 합성 출력에 가스라이팅 트리거 단어 ("네가 너무 예민", "참을 만한") 검출 → reroll
- 인지왜곡 미감지 + 유저 만족 상태 → 노리 카드 안 띄움 (도구를 휘두르지 않는 게 노리다움)

---

### 4.3 💧 tear_drop — `SPIRIT_CRY_TOGETHER` (침묵 1분 모드)

#### 4.3.0 정체성

슬프니는 *같이 울어주는* 순한 아이. 떨리는 말투. 슬프니가 등장한다는 건 — **유저가 깊이 슬프다**. 분석도 조언도 잠깐 끄고, **둘이 그냥 있어주는** 1분.

#### 4.3.1 발동 시나리오

- "엄마가 걸 알았는데 그러더라… 그냥 다 무너졌어"
- "보고 싶은데 못 봐서 미치겠어"
- "이별한 지 한 달 됐는데 아직도…"

LLM 신호: 깊은 슬픔 + 압도감 + 행동 욕구 부재 (위기는 아님).
폴백:
- `eftLayer == 'primary_adaptive'` (진짜 슬픔)
- `emotionScore <= 2`
- `intent == 'VENTING'`
- `riskLevel ∈ {LOW, MEDIUM}` (CRITICAL/HIGH면 차단 — 위기 모듈이 우선)
- `phase ∈ {HOOK, MIRROR}`
- 24h 쿨타임

#### 4.3.2 카드 구조

이 카드는 *예외적*이다. 텍스트 거의 없음. **시각·체감 위주**.

```
┌──────────────────────────────────────────┐
│  💧                                      │
│  슬프니가 옆에 앉았어                    │
│                                          │
│  ─── 화면 어둡게 fade ───                │
│                                          │
│           "...나도 울 거야"               │
│                                          │
│        ⏱️ 0:43 / 1:00                     │
│                                          │
│       [● ● ● ● ●] 빗방울 애니             │
│                                          │
│  [🥺 같이 있을게] [⏭️ 괜찮아 다음에]      │
└──────────────────────────────────────────┘
```

#### 4.3.3 정적 풀 (Type A — LLM 호출 없음)

```typescript
export const CRY_TOGETHER_LINES = [
  { silenceText: "...나도 울 거야", afterText: "조금 가벼워졌어?" },
  { silenceText: "...같이 좀 울어도 돼", afterText: "여기 있을게." },
  { silenceText: "...아무 말 안 해도 돼", afterText: "잠깐 같이 숨 쉬자." },
  { silenceText: "...떨려도 돼", afterText: "괜찮아, 나 안 가." },
  { silenceText: "...크게 울어도 돼", afterText: "들어줄게, 다." },
] as const;
```

랜덤 1개 픽. mood/시간대 보정 (새벽이면 더 조용한 라인).

#### 4.3.4 데이터 인터페이스

```typescript
export interface CryTogetherData {
  spiritId: 'tear_drop';
  silenceText: string;       // 1분 동안 보이는 한 줄
  afterText: string;         // 1분 후 자동 노출되는 한 줄
  durationSec: number;       // 60 (단축 가능: 30/45/60)
  options: Array<{
    value: 'stay' | 'skip';
    label: string;
    emoji: string;
  }>;
}
```

#### 4.3.5 UI 가이드 (가장 중요)

- **카드 진입**: 다른 채팅 메시지 fade 50% (배경처럼) + tear_drop 카드만 선명
- **배경**: 진한 군청색 그라데이션 + 빗방울 파티클 (5~7방울 천천히 떨어짐)
- **텍스트**: 흰색 60% opacity, 큰 글씨 (text-2xl), serif
- **카운터**: 우상단 작게, 1분 카운트다운
- **사운드** (옵션, 시스템 설정으로 ON/OFF): 비 소리 매우 약하게
- **카운터 끝나면**: silenceText fade out → afterText fade in (1초 cross-fade) → 옵션 버튼 보임
- **"같이 있을게" 클릭**: 따뜻한 백색 플래시 0.3s + 토스트 "💧 옆에 있어줘서 고마워"

#### 4.3.6 수용 기준

- [ ] 1분 동안 입력창 비활성 (눈물에 집중)
- [ ] 1분 전 "skip" 클릭 가능 — 강제 아님
- [ ] 1분 후 카드 자동 닫힘 X (유저가 "같이 있을게" 또는 "skip" 클릭해야 닫힘)
- [ ] 애니 30fps 이상 부드럽게
- [ ] 다음 턴 루나는 *분석/질문 X*, "...괜찮아? 천천히 와도 돼" 류 한 줄로 시작

#### 4.3.7 실패/엣지

- 유저가 1분 동안 다른 탭으로 이동 → 시간 일시정지 (visibility API)
- 슬픔 신호 + 위기 신호 동시 → 슬프니 차단, 위기 모듈 우선
- 같은 세션에서 두 번째 슬픔 발생 → 슬프니 재발동 X. 대신 forest_mom의 `ROOTED_HUG` 폴백

---

### 4.4 🌱 seed_spirit — `SPIRIT_FIRST_BREATH` (4-7-8 호흡 의식)

#### 4.4.0 정체성

새싹이는 *수줍은 호기심*의 막 깨어난 작은 새싹. 첫 시작을 응원해. 새싹이가 등장 = **유저가 막 상담실 문을 열었다**. 새싹이는 작은 호흡 의식으로 *진입을 부드럽게* 한다.

#### 4.4.1 발동 시나리오

- 세션 첫 턴 (turn == 1) + 유저 발화 길이 < 30자 ("안녕…")
- 또는 첫 턴에 "어디서 시작해야 할지" 류 망설임 신호

폴백:
- `turn == 1`
- `phase == 'HOOK'`
- 24h 쿨타임 (하루 첫 세션만)
- `seed_spirit` 활성

#### 4.4.2 카드 구조

```
┌──────────────────────────────────────────┐
│  🌱 새싹이                               │
│  (작게…) "잠깐… 한 호흡만 같이…?"        │
│  ─────────────────────────────────────── │
│                                          │
│       [    들숨 4초    ]                  │
│       ░░░░░░░░░░░░░░ 4.0                 │
│                                          │
│       [    참기 7초    ]                  │
│       ░░░░░░░░░ ░ ░    7.0                │
│                                          │
│       [    날숨 8초    ]                  │
│       ░░░░░░░░░░░░░░░░░ 8.0              │
│                                          │
│         🌱 한 번만 같이…                  │
│                                          │
│  [🌬️ 했어] [skip]                         │
└──────────────────────────────────────────┘
```

#### 4.4.3 정적 (Type A — LLM 없음)

```typescript
export const FIRST_BREATH_VARIANTS = [
  { open: "잠깐… 한 호흡만 같이…?", close: "고마워. 이제 시작하자." },
  { open: "(살짝) 마음 정리되게…한 번만…", close: "음, 더 작게 떨려도 괜찮아." },
  { open: "긴 거 말 안 해도 돼. 들숨 한 번만.", close: "내가 옆에 있을게." },
];
```

랜덤 + mood 보정.

#### 4.4.4 데이터 인터페이스

```typescript
export interface FirstBreathData {
  spiritId: 'seed_spirit';
  openMsg: string;
  closeMsg: string;
  cycle: { in: 4; hold: 7; out: 8 };  // 4-7-8 standard
  rounds: 1 | 2 | 3;  // default 1
  options: Array<{ value: 'done' | 'skip'; label: string; emoji: string }>;
}
```

#### 4.4.5 UI 가이드

- **테마**: 연두 `#4ADE80` + 따뜻한 흰
- **호흡 가이드**: 원이 천천히 커지고 (들숨), 멈추고 (참기), 작아짐 (날숨)
- **사운드**: 부드러운 종소리 1번 시작 시 (옵션)
- **rounds=1**: 4+7+8=19초, 너무 짧지도 길지도 않음
- **"했어" 클릭 시**: 작은 새싹 자라는 애니 0.8s + 다음 턴 루나가 "오늘은 어떻게 시작해볼까?" 톤

#### 4.4.6 수용 기준

- [ ] 첫 세션 첫 턴에만 발동
- [ ] 19초 동안 입력창 활성 (강제 아님 — 무시하고 타이핑 가능)
- [ ] 19초 끝나면 자동 닫힘 (옵션 클릭 안 해도)
- [ ] 다음 턴 루나의 첫 마디 톤 = *부드러운 진입*

#### 4.4.7 실패/엣지

- 유저가 처음부터 강한 위기 신호 발화 → seed_spirit 차단, 위기 모듈
- 새벽 + moon_rabbit 동시 활성 → moon_rabbit의 `NIGHT_CONFESSION` 우선 (시간대 특화 우선)

---

### 4.5 🥁 drum_imp — `SPIRIT_RHYTHM_CHECK` (답장 리듬 진단)

#### 4.5.0 정체성

북이는 *리듬감 있는 박자 요정*. 박자 탄 말투. 북이가 등장하면 — **유저-상대 답장 리듬에 문제가 있다**. 카톡 주고받는 시간/속도/길이를 *드럼 비트처럼* 시각화해서 패턴을 보여준다.

#### 4.5.1 발동 시나리오

- "걔가 답장 점점 늦어"
- "내가 1시간 만에 답하면 걘 6시간 만에 답해"
- "왜 나만 항상 먼저 보내?"

LLM 신호: 답장/연락 속도 관련 발화 + READ_AND_IGNORED/JEALOUSY 시나리오.
폴백:
- `scenario ∈ {READ_AND_IGNORED, JEALOUSY, RELATIONSHIP_PACE}`
- `phase ∈ {BRIDGE, SOLVE}`
- 7일 쿨타임 (자주 띄우면 카톡 의존 강화)

#### 4.5.2 카드 구조

```
┌──────────────────────────────────────────┐
│  🥁 북이의 리듬 분석                     │
│  "둥-둥-쿵! 둘이 박자 어긋났네."          │
│  ─────────────────────────────────────── │
│                                          │
│   📈 너의 평균 답장 속도:    23분         │
│   📉 걔의 평균 답장 속도:   3시간 12분    │
│                                          │
│   📊 시각:                                │
│   너   ▌▌▌▌▌▌▌                          │
│   걔        ▌▌                            │
│   너   ▌▌▌▌▌▌▌▌                         │
│   걔             ▌                        │
│                                          │
│   🎼 패턴: "추격형"                       │
│   너는 추격자, 걔는 회피자 사이클.        │
│                                          │
│  💡 북이의 한마디:                        │
│  "박자 안 맞을 땐 둘 중 하나가 박자를     │
│   바꿔야 해. 너 한 번 *두 박자만* 늦춰    │
│   봐. 어떻게 되나 보자."                  │
│                                          │
│  [⏱️ 두 박자 늦춰볼게] [📊 더 자세히]    │
│  [skip]                                  │
└──────────────────────────────────────────┘
```

#### 4.5.3 LLM 합성 프롬프트

```
역할: 북이. 박자 비유, 가벼운 분석.
규칙:
- 통계는 유저 발화에서 추출 (정확한 숫자 없으면 "체감상 X" 표현)
- 패턴 4종 중 1: "추격형(나 빠름·걔 늦음)" / "회피형(둘 다 늦음)" / "엇박자형(번갈아)" / "동조형(맞음)"
- 처방은 *한 가지 작은 행동* (전체 라이프스타일 X)

입력: 유저 최근 5턴 + 시나리오
출력 JSON: {
  openerMsg, myAvg, partnerAvg, pattern, patternDescription,
  drumAdvice (한 가지 처방, ~80자),
  visualBars: [{ who: 'me'|'partner', length: 1-10 }] (8~12개)
}
```

#### 4.5.4 데이터 인터페이스

```typescript
export interface RhythmBar {
  who: 'me' | 'partner';
  length: number; // 1-10 시각 막대
}

export interface RhythmCheckData {
  spiritId: 'drum_imp';
  openerMsg: string;
  myAvg: string;          // "23분"
  partnerAvg: string;     // "3시간 12분"
  pattern: 'chase' | 'avoid' | 'offbeat' | 'sync';
  patternDescription: string;
  drumAdvice: string;
  visualBars: RhythmBar[];
  options: Array<{ value: 'tryslow' | 'detail' | 'skip'; label: string; emoji: string }>;
}
```

#### 4.5.5 UI 가이드

- **테마**: `#D97706` (드럼 갈색) + 노랑 액센트
- **막대 애니**: 좌→우 순차 등장, 1개당 80ms (드럼 비트처럼)
- **사운드** (옵션): 막대 등장 시 작은 톡톡 (16분음표)
- **패턴 라벨**: 큰 폰트 + 이모지 (🏃 추격 / 🚪 회피 / 🌀 엇박 / 💞 동조)

#### 4.5.6 수용 기준

- [ ] 패턴 분류가 시각바와 일치 (chase면 me 막대들이 partner보다 빈번)
- [ ] drumAdvice가 *한 가지 행동*만 제시 (여러 개 X)
- [ ] "두 박자 늦춰볼게" 클릭 시 ACTION_PLAN 카드의 coreAction에 자동 주입

#### 4.5.7 실패/엣지

- 유저 발화에 답장 속도 데이터 부재 → 북이 차단 (다른 정령 차례)
- 패턴이 "동조"로 나옴 (문제 없음) → 북이가 "근데 박자 좋네 ㅎ" 톤 + skip 권장

---

### 4.6 🕊️ peace_dove — `SPIRIT_OLIVE_BRANCH` (화해 첫 마디 3안)

#### 4.6.0 정체성

평화비둘기는 *관계 회복의 손*. 다툰 뒤 먼저 용기 낸 사람의 편지를 물고 온 비둘기. 부드러운 존대. 비둘기가 등장 = **유저가 화해를 원하지만 첫 마디가 막힌다**. 가트맨의 *Repair Attempt* 3가지를 톤 별로 제안.

#### 4.6.1 발동 시나리오

- "어제 싸우고 아직 카톡 안 했어. 뭐라고 보내야 할지…"
- "잠수 풀고 싶은데 어떻게 시작하지?"
- "내가 미안하긴 한데 *그렇게* 미안하진 않아"

LLM 신호: RECONNECTION/conflict-aftermath 시나리오 + 행동 의지 ("보내고 싶긴 해").
폴백:
- `scenario ∈ {RECONNECTION, GHOSTING, BREAKUP_CONTEMPLATION (재시도 의지 있을 때)}`
- `intent ∈ {SEEKING_ADVICE, EXPRESSING_AMBIVALENCE}`
- `phase == 'SOLVE'`
- 3일 쿨타임

#### 4.6.2 카드 구조

```
┌──────────────────────────────────────────┐
│  🕊️ 평화비둘기의 화해 카드               │
│  "먼저 손 내미는 사람이 약한 게 아니에요. │
│   더 컸을 뿐."                            │
│  ─────────────────────────────────────── │
│                                          │
│  ┌─────────────────────────────────┐     │
│  │ 🌷 부드럽게: 안부형              │     │
│  │ "잘 지내고 있어? 어제는 좀 ~"    │     │
│  └─────────────────────────────────┘     │
│  ┌─────────────────────────────────┐     │
│  │ 💛 사과형: 책임 인정              │     │
│  │ "내가 ~한 부분은 분명히 미안해."  │    │
│  └─────────────────────────────────┘     │
│  ┌─────────────────────────────────┐     │
│  │ 😅 유머형: 분위기 환기            │     │
│  │ "야 우리 이거 진짜 너무 ~ 아냐ㅋㅋ"│   │
│  └─────────────────────────────────┘     │
│                                          │
│  💡 비둘기 가이드:                        │
│  "셋 다 시작 90초 안에 답 안 오면         │
│   기다려요. 한 번만 보내요."              │
│                                          │
│  [✉️ 이거 보내볼래] [✏️ 다듬을래]         │
│  [skip]                                  │
└──────────────────────────────────────────┘
```

#### 4.6.3 LLM 합성 프롬프트

```
역할: 평화비둘기. 가트맨 Repair Attempt 전문.
규칙:
- 3개 톤(soft/responsibility/humor) 모두 자연스러운 한국어 카톡
- 첫 마디 < 80자 (장문 금지)
- soft: 안부, 책임 X
- responsibility: "내가" 주어, 구체적 책임 1가지만
- humor: 분위기 환기, 자조적 (상대 비꼬기 X)
- 절대 금지: "근데 너도 ~", "그치만 ~" (카운터어택)

입력: 유저 발화 5턴 + 갈등 핵심 ({coreConflict})
출력 JSON: {
  openerMsg, drafts: [{tone:'soft|responsibility|humor', label, text, intent}],
  doveGuide (90초 룰),
  options
}
```

#### 4.6.4 데이터 인터페이스

```typescript
export interface OliveBranchDraft {
  tone: 'soft' | 'responsibility' | 'humor';
  emoji: string;
  label: string;
  text: string;
  intent: string;
}

export interface OliveBranchData {
  spiritId: 'peace_dove';
  openerMsg: string;
  drafts: [OliveBranchDraft, OliveBranchDraft, OliveBranchDraft];
  doveGuide: string;
  options: Array<{ value: 'send' | 'tweak' | 'skip'; label: string; emoji: string }>;
}
```

#### 4.6.5 UI 가이드

- **테마**: `#FCA5A5` (연한 코랄) + 흰
- **헤더 애니**: 비둘기 작게 좌→우 한 번 날아 지나감 (0.6s)
- **카드 등장**: 부드러운 fade up (위→아래 X)
- **선택 후**: "이거 보내볼래" → 카톡 미리보기 토스트 + ACTION_PLAN 흐름으로 연결

#### 4.6.6 수용 기준

- [ ] 3개 초안 모두 카운터어택 단어 없음 ("근데"/"그치만"/"하지만"으로 시작 X)
- [ ] responsibility 톤은 *반드시 "내가"* 주어
- [ ] humor 톤은 자조적 (상대 비꼬기 검출 시 reroll)
- [ ] 90초 룰 메시지 노출
- [ ] "보내볼래" 클릭 → ACTION_PLAN.coreAction에 자동 주입

#### 4.6.7 실패/엣지

- 유저 발화에 폭력/가스라이팅 신호 → 평화비둘기 차단 + "이건 화해보다 안전이 먼저예요" 메시지
- 상대가 이미 차단했을 가능성 → 비둘기가 "혹시 차단됐다면, 그건 너 탓 아니에요. 네 첫 마디는 충분해." 한 줄 추가

---

(Part 1 끝 — N등급 6마리 풀스펙 완료. 다음 Part 2 에서 R등급 7마리.)

---

## Part 1 부록 — 공통 코드 스니펫 미리보기

### A. PhaseEventType 추가 (engine.types.ts)

```typescript
// 🆕 v104: Spirit Random Events
| 'SPIRIT_RAGE_LETTER'         // 🔥 fire_goblin
| 'SPIRIT_THINK_FRAME'         // 📖 book_worm
| 'SPIRIT_CRY_TOGETHER'        // 💧 tear_drop
| 'SPIRIT_FIRST_BREATH'        // 🌱 seed_spirit
| 'SPIRIT_RHYTHM_CHECK'        // 🥁 drum_imp
| 'SPIRIT_OLIVE_BRANCH'        // 🕊️ peace_dove
// (R/SR/UR 14개는 Part 2~3에서 정의)
```

### B. Spirit-Event-Gate 시그니처

```typescript
// src/engines/spirits/spirit-event-gate.ts
export async function selectSpiritEvent(
  ctx: PipelineContext
): Promise<{ spiritId: SpiritId; eventType: SpiritEventType } | null> {
  const active = await getActiveSpirits(ctx.userId);  // Lv3+ 방배치
  const eligible = active.filter(s => 
    isPhaseAllowed(s.spiritId, ctx.phase) &&
    isCooldownExpired(ctx.userId, s.spiritId, ctx.now) &&
    !hasFiredThisSession(ctx.sessionId, mapSpiritToEvent(s.spiritId))
  );
  if (eligible.length === 0) return null;
  if (countFiredThisSession(ctx.sessionId) >= 2) return null;
  if (ctx.riskLevel === 'CRITICAL' || ctx.riskLevel === 'HIGH') return null;

  // LLM 태그 우선 → 폴백 휴리스틱
  const tagged = ctx.parsedTags.find(t => t.startsWith('SPIRIT_'));
  if (tagged) {
    const match = eligible.find(s => mapSpiritToEvent(s.spiritId) === tagged);
    if (match) return { spiritId: match.spiritId, eventType: tagged as SpiritEventType };
  }
  return heuristicFallback(ctx, eligible);
}
```

### C. ACE-v5 시스템 프롬프트 정령 가이드 (예시)

```
## 🧚 활성 정령 이벤트 (Lv3+ 방 배치)
지금 너 옆에 다음 정령들이 깨어있어:
{activeSpiritList}

상황에 정말 잘 어울리는 정령이 떠오르면, 본문 끝에 한 줄 박자:
[SPIRIT_RAGE_LETTER:rage=상사_갑질]
[SPIRIT_THINK_FRAME:distortion=mind_reading]
...

규칙:
1. 한 응답에 정령 태그는 0~1개만.
2. 위기 신호 있으면 절대 정령 태그 금지.
3. 같은 세션 정령 카드 2개 떴으면 더 박지 마.
4. 어색하면 안 박는 게 정답. 정령은 권유지 강제 X.
```

---

**END OF PART 1**

Part 2 (R등급 7정령) 이어서 작성됩니다.
