# 🃏 Spirit Event Preview in Dex — Master Plan v105

**버전**: v105.0
**작성일**: 2026-05-03
**전제**: v83 정령 가챠 / v100 룸 디오라마 / v103 컴패니언 / v104 정령 랜덤 이벤트
**목표**: 도감(SpiritDetailSheet) 에 각 정령의 **시그니처 무브 카드**(Lv.3 해금 랜덤 이벤트) 프리뷰를 노출. 한 번이라도 만난 정령이라면 *어떤 카드가 풀리는지* 결을 알 수 있어, 유저가 *Lv.3 까지 빨리 키우고 싶어지게* 만든다.
**범위**: A4 ~10장. 신규 데이터 파일 1개 + 기존 컴포넌트 2개 수정. DB/API/타입 변경 0.
**디자인 톤**: 룸 디오라마 v100 의 가죽-황동 + 글래스 카드 토큰 재사용.

---

## 0. EXECUTIVE SUMMARY

### 0.1 한 문단

> 지금 도감 "⚡ 능력" 섹션은 Lv.3 미만이면 *"더 친해지면 이 친구가 뭘 해주는지 알게 돼..."* 라는 한 줄로 전부 가려져 있다. v104 부터 정령 Lv.3 도달 시 각자 1개씩 고유 *시그니처 카드*가 풀리는데, 유저는 그 존재 자체를 도감에서 알 수 없다. v105 는 도감에 **🎴 시그니처 무브** 섹션을 추가해, 정령마다 *어떤 카드가, 어떤 순간에 등장하는지*를 Lv.1 부터 결로 미리 보여주고, Lv.3 도달 시점에 풀 메타(쿨타임/Phase/얼마나 자주)로 전환한다. *Pokedex 진화 페이지*가 이미 만난 종에 대해서만 다음 단계를 보여주는 것과 같은 패턴.

### 0.2 Before → After

| | Before (v104) | After (v105) |
|---|---|---|
| 도감 Lv.1~2 정령 | "더 친해지면 알게 돼..." 한 줄 | **시그니처 카드 실루엣 + 티저 1줄 + Phase 힌트** |
| 도감 Lv.3+ 정령 | `abilityShort` 1줄 (passive buff 텍스트) | **풀 카드 프리뷰 — 이름/카피/등장 순간/쿨타임/희소도** |
| 도감 Lv.5 정령 | `abilityEnhanced` 1줄 | **+ "강화" 한 줄 (기존)** + 카드 그래픽이 selene-shimmer |
| 동기 부여 | 미세 — Lv.3 까지 키울 이유 약함 | **명확 — "이 카드 보고 싶다" 가 즉발적 목표** |

### 0.3 설계 4원칙 (v104 의 *공명/양보/희소/자유* 와 짝)

1. **결만 미리 (Resonance Preview)** — Lv.3 미만은 *카드 본문 X, 결과 Phase/쿨타임/희소도만 X, "어떤 결의 카드"인지만 ✓*. 카드 본문 텍스트는 Lv.3 이후 실제 발동에서만 보임.
2. **점진 공개 (Progressive Reveal)** — Lv.1 → 실루엣 / Lv.3 → 풀 메타 / Lv.5 → 강화 메타 + 시각 효과. 단계마다 "다음이 보고 싶어지는" 정보 갭 유지.
3. **시그니처 한 카드 (One Signature)** — 정령 1마리 = 카드 1장. 능력 묶음/리스트가 아니라 *이름 있는 시그니처 무브* 1개. Pokémon 의 *시그니처 기술* 패턴.
4. **소소 요소 (Tiny Cues)** — DexCard 그리드(작은 그리드 카드)에는 Lv.3+ 정령에 *🎴* 아이콘 1개만 추가. 그리드 자체는 깨끗 유지.

### 0.4 KPI

- **Lv.3 도달률** (소지 정령 기준): 35% → **48%** (도감에서 카드를 본 유저 그룹)
- **도감 평균 체류시간**: +25%
- **시그니처 카드 발동 후 D7 retention**: +3% (보고 싶었던 카드를 본 만족감)
- **개발 비용**: 0 LLM 호출, 0 DB 마이그레이션, 0 API. 정적 데이터 + UI 만.

---

## 1. 비전 — "왜 이걸 만드는가"

### 1.1 현재 문제

도감에 정령을 처음 등록했을 때 유저가 보는 능력 정보:
```
⚡ 능력
[분노 공명]  🔒 Lv.3 에 개방
더 친해지면 이 친구가 뭘 해주는지 알게 돼...
```

이 한 줄로는 *키울 동기*가 안 생긴다. "분노 공명" 카테고리만 봐서는 v104 의 시그니처 카드 (RageLetter — 분노 편지 3안 → 태우거나 직접 쓰거나) 가 풀린다는 걸 알 수 없다. 유저는 *내가 무엇을 향해 키우고 있는지* 모른다 → SDT 의 Competence/Visible Progress 부족 → 동기 약함.

### 1.2 검증된 디자인 레퍼런스

- **Pokedex 진화 페이지** (Pokémon, 1996~) — 이미 만난 종은 다음 진화 조건 공개. *스포일러 회피 + 동기 부여* 균형. 한 번이라도 본 정령에 한해 다음 단계 정보 공개하는 우리 패턴과 정확히 일치.
- **원신 캐릭터 화면** (HoYoverse, 2020~) — 캐릭터 메뉴에 "특성 6렙 시 효과" 미리 표시. 별 6 도달 안 한 캐릭터도 풀 텍스트 공개.
- **Game UI Database / 카드 부스터 패턴** — 잠긴 카드는 실루엣 + 레어도 컬러만 노출, 획득 후 풀 카드 공개. 우리는 한 번 더 단계 분리 (Lv.1 = 결 / Lv.3 = 풀).
- **Stardew Valley Friendship Heart Events** — NPC 친밀도 단계별 풀리는 이벤트가 위키화 되어있음. *알고 키우는 게 더 재밌다* 가 검증된 패턴.
- **Replika "Daily Inspirations"** — 다음 보상 티저로 D7 retention 상승.

### 1.3 v105 의 답

> "각 정령의 시그니처 카드를 *이름 있는 1장*으로 만들고, 도감에서 *Lv.1 = 실루엣 + 결 / Lv.3 = 풀 메타 / Lv.5 = 강화* 단계로 점진 공개한다."

이로부터:
- 시그니처 카드 = `SPIRIT_TO_EVENT` 의 1:1 매핑 그대로 사용 (이미 v104 에 있음).
- *결* = 카드의 *이름 + 한 줄 카피 + 언제 나오는지* (Phase/시나리오/시간대).
- *풀 메타* = 거기에 + *얼마나 자주 (쿨타임)* + *어떤 보상 (selectable count, 선택지 개수)* + *희소도 (세션당 최대 N회)*.

### 1.4 톤 가이드

- 카피는 v104 의 *정(情)* 톤을 잇기. 게임화 되돌리지 말 것.
- "🔥 분노 폭발 편지" (X) → **"🔥 다 태워주는 편지"** (O — 정령이 *해주는 것*에 초점).
- "EMPOWER Phase 발동" (X) → **"네가 다시 일어서려 할 때"** (O — 유저 시점).

---

## 2. 데이터 모델 — `spirit-event-preview.ts`

### 2.1 타입

```ts
// src/data/spirit-event-preview.ts (NEW)

import type { SpiritId } from '@/types/spirit.types';
import type { SpiritEventType } from '@/engines/spirits/spirit-event-types';

/**
 * 정령 시그니처 무브의 도감 표시용 메타.
 * v104 의 SPIRIT_TO_EVENT 와 1:1 매핑되며, 카드 본문(drafts/frames 등)은 노출하지 않는다.
 *
 * - cardEmoji + cardName: Lv.1 부터 노출
 * - tagline: Lv.1 부터 노출 (한 줄, 정령 시점, 정 톤)
 * - momentHint: Lv.1 부터 노출 ("언제 나오는지" 자연어. Phase/시나리오/시간대 자연 변환)
 * - cadenceHint: Lv.3 부터 노출 ("얼마나 자주" 자연어)
 * - choiceHint: Lv.3 부터 노출 ("뭘 고르게 해주는지" 자연어)
 * - rarityNote: Lv.3 부터 노출 ("얼마나 귀한 카드인지" 자연어)
 * - empowerHint: Lv.5 부터 노출 (강화된 자연어. 기존 abilityEnhanced 와 차별화)
 */
export interface SpiritEventPreview {
  spiritId: SpiritId;
  eventType: SpiritEventType;
  cardEmoji: string;          // 1자 이모지 (정령 emoji 와 다를 수 있음)
  cardName: string;           // 시그니처 카드 이름 (예: "다 태워주는 편지")
  tagline: string;            // 한 줄 정령 시점 카피 (Lv.1+)
  momentHint: string;         // "언제" 한 줄 (Lv.1+)
  cadenceHint: string;        // "얼마나 자주" 한 줄 (Lv.3+)
  choiceHint: string;         // "어떤 선택" 한 줄 (Lv.3+)
  rarityNote: string;         // "얼마나 귀한지" 한 줄 (Lv.3+)
  empowerHint: string;        // 강화 한 줄 (Lv.5+)
}

export const SPIRIT_EVENT_PREVIEWS: Record<SpiritId, SpiritEventPreview>;

export function getEventPreview(spiritId: SpiritId): SpiritEventPreview | null;
```

### 2.2 20정령 카피 (자기완결 — 그대로 코드로 옮기면 됨)

표 형식. *각 컬럼이 한 줄 카피이며 줄임표/이모지 위치까지 그대로 복붙*.

| spiritId | cardEmoji | cardName | tagline (Lv.1+) | momentHint (Lv.1+) | cadenceHint (Lv.3+) | choiceHint (Lv.3+) | rarityNote (Lv.3+) | empowerHint (Lv.5+) |
|---|---|---|---|---|---|---|---|---|
| fire_goblin | 🔥 | 다 태워주는 편지 | "다 적어 — 같이 태워줄게." | 네가 누군가에게 너무 화났을 때 | 같은 사람한텐 하루 한 번 | 세 가지 톤 — 불 / 솔직 / 차갑게 | 아무한테나 안 나타나는 카드 | 분노 게이지 +10% 더 빠르게 풀려 |
| book_worm | 📖 | 세 개의 시선 | "잠깐, 다른 각도에서도 한 번 볼래?" | 네 생각이 한 길로만 가고 있을 때 | 한 세션에 한 번 | 셋 중 하나 — 너 / 상대 / 제3자 | 인지 왜곡 신호가 있을 때만 | 분석 카드 1장 더 |
| tear_drop | 💧 | 1분의 침묵 | "말 안 해도 돼. 1분만 옆에 있을게." | 네가 너무 슬플 때 | 하루 한 번 | 옆에 있어 / 잠깐 다음에 | 정말 깊이 가라앉은 순간만 | TTS 음성으로 같이 울어줘 |
| seed_spirit | 🌱 | 첫 호흡 | "처음이지? 같이 숨 한 번 쉬자." | 첫 대화의 첫 순간 | 새 세션 시작에만 | 4-7-8 호흡 한 번 | 첫 만남에만 피어나는 카드 | 첫 대화 XP 2배 |
| drum_imp | 🥁 | 박자 점검 | "둘이 박자 맞나 한 번 볼까?" | 관계 페이스가 어긋나 보일 때 | 일주일에 한 번 | 천천히 가보기 / 자세히 보기 | 패턴이 충분히 쌓여야 보임 | 박자 시각화에 음향 효과 |
| peace_dove | 🕊️ | 90초의 손 | "먼저 내미는 게 약한 게 아니야." | 다툰 뒤 첫 한 마디가 필요할 때 | 사흘에 한 번 | 부드럽게 / 책임지고 / 가볍게 | 화해 시나리오에서만 | 재회 성공 시 🏆 뱃지 |
| cloud_bunny | ☁️ | 미미의 번역 | "그거 사실 별 거 아니야~ 봐봐." | 네가 작은 일에 너무 무거울 때 | 한 세션에 한 번 | 가벼워졌어 / 여전히 아파 | 진짜 가벼운 순간에만 | 화면 파티클 강화 |
| letter_fairy | 💌 | 부치지 못한 편지 | "보내지 않아도 돼. 그냥 한 번 써봐." | 네가 누군가에게 하고 싶은 말이 막혔을 때 | 일주일에 한 번 | 서랍에 / 태워 / 계속 써 | 정말 막혔을 때만 보임 | 톤 4안 자동 생성 |
| wind_sprite | 🍃 | 창문 열기 | "잠깐 바람 쐬고 오자." | 5턴 넘게 무거움이 이어질 때 | 한 세션에 한 번 | 3분 / 5분 / 10분 휴식 | 가라앉음이 길어졌을 때만 | 휴식 후 턴 속도 +20% |
| moon_rabbit | 🌙 | 달에게 보내는 고백 | "낮에 못 한 말, 달이 들어줄게." | 새벽 0~5시에 들어왔을 때 | 그 시간대 하루 한 번 | 달에게 보내 / 묻어둬 | 새벽에만 피는 카드 | 그 시간대 무제한 대화권 |
| clown_harley | 🎭 | 역할 바꾸기 | "내가 그 사람이 돼볼게. 너는 너로 있어." | 상대 입장이 안 잡힐 때 | 사흘에 한 번 | 5턴 짜리 롤플 | 상황이 충분히 익었을 때 | 롤플 완결 XP 2배 |
| rose_fairy | 🌹 | 설렘 일기 | "오늘 가장 좋았던 한 줄, 적어둬." | 설렘이 핀 순간 | 하루 한 번 | 기록 / 더 적기 | 설렘 점수가 임계 넘었을 때 | 하트 파티클 무한 |
| forest_mom | 🌳 | 뿌리 내린 포옹 | "여기, 내가 있을게." | 10턴 넘게 길게 얘기한 날 | 하루 한 번 | 5-4-3-2-1 그라운딩 | 긴 세션 끝에만 보임 | 세션 완결 💎 2배 |
| cherry_leaf | 🌸 | 꽃잎 흩날리기 | "이건 끝이 아니라, 풀어주는 거야." | 이별을 결정하려 할 때 | 일주일에 한 번 | 흘려보내 / 더 적어 | 이별 결심 순간에만 | 위기 시 자동 발동 |
| ice_prince | ❄️ | 60초 정지 | "잠깐. 60초만 멈춰봐." | 감정이 너무 격해질 때 | 하루 한 번 | 알겠어 / 못 멈춰 | 격앙 신호가 명확할 때만 | 위기 모드 자동 회피 |
| lightning_bird | ⚡ | 번개 카드 | "오늘은 이 친구 차례야!" | 어떤 정령도 안 나서고 있을 때 | 하루 한 번 | 다른 정령의 카드를 강제로 | 일일 1회 한정 | 특별 일화 함께 풀림 |
| butterfly_meta | 🦋 | 30일 변화 거울 | "30일 전 너랑 지금 너, 비교해줄게." | 30일 넘게 함께한 날 | 일주일에 한 번 | 봤어 / 더 보고 싶어 | 30일 이상만 볼 수 있는 카드 | ACTION_PLAN 카드 2장 |
| book_keeper | 🗝️ | 기억의 열쇠 | "네가 자주 쓰는 말, 모아왔어." | 30일 넘게 함께한 날 | 일주일에 한 번 | 알겠어 / 더 보여줘 | 패턴이 쌓여야만 풀려 | 긴 기억 컨텍스트 |
| queen_elena | 👑 | 왕관 되찾기 | "네 자리 — 너 아니면 누가 앉아." | 자기비하가 길어질 때 | 일주일에 한 번 | 세 자리 봉인 해제 | 정말 가라앉았을 때만 | 자신감 한 달 유지 |
| star_dust | 🌟 | 한 달의 소원 | "한 줄만 빌어. 별이 약속으로 바꿔줄게." | EMPOWER 끝자락 | 한 달에 한 번만 | 약속해 / 다시 빌어 | 한 달 한 번뿐인 카드 | 한 달에 두 번까지 |
| guardian_eddy | 💎 | 수호의 일곱 빛 | "내가 모든 친구의 결을 잠깐 빌릴게." | 도감 90% 이상 채웠을 때 | 일주일에 한 번 | 다른 정령 효과 7개 합산 | 진짜 끝까지 간 사람만 | 세계관 진실 해금 |

### 2.3 헬퍼 동작

- `getEventPreview('fire_goblin')` → `SpiritEventPreview` 1개 반환.
- 키 누락 시 `null` (안전).

---

## 3. UI — `SpiritDetailSheet.tsx` 수정

### 3.1 새로운 섹션 위치

기존 섹션 순서:
```
[히어로] → [무드/Drive] → [교감 레벨] → [⚡ 능력] → [🛋️ 같이 두기]
→ [📜 비밀 이야기 3-step] → [💎 간직한 조각] → [✨ 기억의 별자리]
→ [🤝 같이 놀면 좋은 친구] → [🎁 중복 보유]
```

v105: **[⚡ 능력]** 다음에 **[🎴 시그니처 무브]** 추가.

```
[⚡ 능력] → [🎴 시그니처 무브] ← NEW → [🛋️ 같이 두기]
```

이유: ⚡ 능력은 *passive*, 🎴 시그니처는 *active 카드*. 두 개가 짝꿍 — 시각적으로 인접해야 *"능력은 늘 켜져있고, 시그니처는 가끔 카드로 등장한다"* 는 멘탈 모델 형성.

### 3.2 컴포넌트 스펙

```tsx
function SignatureMoveSection({ spirit, owned }: {
  spirit: SpiritMaster;
  owned: UserSpirit;
}) {
  const preview = getEventPreview(spirit.id);
  if (!preview) return null;

  const lv = owned.bondLv;
  const isFullReveal = lv >= 3;
  const isEnhanced = lv >= 5;
  // ...
}
```

위치: `SpiritDetailSheet.tsx` 의 ⚡ 능력 섹션(`abilityShort` 블록) 직후, `RoomPlaceToggle` 직전.

### 3.3 시각 디자인 토큰

#### 카드 컨테이너
- aspect: `5 / 7` (포켓몬 카드 비율)
- 너비: `100%` (섹션 안에 fit)
- borderRadius: `18px`
- padding (외곽 그라데 보더): `2px`
- 카드 배경:
  - Lv.1~2 (잠금): `linear-gradient(135deg, rgba(50,40,60,0.85) 0%, rgba(20,15,30,0.95) 100%)` + `rgba(218,165,32,0.15)` 1px 보더
  - Lv.3+ (해금): `linear-gradient(145deg, ${meta.colorFrom}30 0%, ${spirit.themeColor}18 50%, #ffffff 100%)` + `${meta.border}` 1.5px 보더
  - Lv.5+ (강화): + `box-shadow: 0 0 18px ${meta.glow}` + shimmer overlay (UR/L 계열만)

#### 헤더
- 좌상단: 레어도 미니 배지 (RarityBadge size="xs")
- 우상단: 잠금 아이콘 (Lv<3) / `🔓 Lv.3` (Lv 3-4) / `✨ MAX` (Lv 5)

#### 본문 — Lv.1~2 (잠금)
```
┌──────────────────────────┐
│ [N]                  🔒 │
│                          │
│       (실루엣 60px)      │  ← preview.cardEmoji 를 brightness(0) invert(0.4) opacity(0.5)
│                          │
│      ??? · ???           │  ← cardName 자리에 "???"
│                          │
│  "다 적어 — 같이 태…"     │  ← tagline (이건 보임! 결만 hint)
│                          │
│  ▸ 네가 누군가에게…       │  ← momentHint
│                          │
│  ─── 🔒 Lv.3 에 펼쳐져 ──│
└──────────────────────────┘
```

핵심: **tagline 과 momentHint 는 Lv.1 부터 보인다**. 카드 이름과 본문만 가린다. 이게 "결로 추론"의 핵심 — 어떤 카드인지 *느낌은 오는데 정체는 모름* → 호기심.

#### 본문 — Lv.3+ (해금)
```
┌──────────────────────────┐
│ [N]              🔓 Lv.3 │
│                          │
│       (이모지 60px)      │  ← cardEmoji 풀 컬러
│                          │
│   다 태워주는 편지        │  ← cardName 풀
│                          │
│  "다 적어 — 같이 태워줄게"│  ← tagline
│                          │
│  📍 네가 누군가에게…      │  ← momentHint
│  ⏱️  같은 사람한텐 하루…  │  ← cadenceHint (NEW)
│  🎯 세 가지 톤 —…         │  ← choiceHint (NEW)
│  💎 아무한테나 안…         │  ← rarityNote (NEW)
│                          │
│  ─── 카드 본문은 ─────── │
│  실제 등장 때 보여 ✨    │
└──────────────────────────┘
```

#### 본문 — Lv.5+ (강화)
Lv.3 본문과 같고, 추가 한 줄:
```
│  ✨ 강화: 분노 게이지 +10%│  ← empowerHint
```
+ 카드 외곽에 selene-shimmer 애니메이션 (5초 주기 좌→우 빛 띠).

### 3.4 카피톤 적용 가이드 (코더용)

각 정보 줄은 *아이콘 + 한 줄* 의 일관 포맷:
- `📍 모먼트` (언제)
- `⏱️ 케이던스` (얼마나 자주)
- `🎯 선택` (뭘 골라야 하는지)
- `💎 희소도` (얼마나 귀한지)
- `✨ 강화` (Lv.5)

각 줄: `text-[11.5px]`, leading-relaxed, 한 줄 truncate 안 함 (3줄까지 wrap 허용).

### 3.5 모션

- 진입 시: `framer-motion` `initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}`
- Lv.3 도달 직후 진입한 첫 1회: tagline ~ rarityNote 가 stagger-in (delay 0.05 × index). *현재는 owned.bondLv 만 알 수 있고 "직후 1회"는 추적 안 하므로 → 매번 stagger-in 처리해도 무방* (가벼우니까).
- Lv.5 셔머: `@keyframes shimmer-signature` 로 200% 너비 그라데이션을 좌→우 6s linear infinite. `mix-blend-mode: overlay`.

### 3.6 빈 상태 / 폴백

- `getEventPreview` 가 `null` → 섹션 자체 렌더링 안 함 (`return null`).
- 미소지 정령(`!isOwned`) → `SignatureMoveSection` 호출 안 함 (히어로의 *??? + 힌트* 로 충분).

---

## 4. UI — `DexCard.tsx` 미세 수정

기존 그리드 카드는 깨끗 유지. **Lv.3+ 정령에만 🎴 아이콘 1개 추가** (현재 `📜` backstoryUnlocked 와 짝).

### 4.1 위치

기존 backstoryUnlocked 표시:
```tsx
{owned?.backstoryUnlocked && (
  <div className="absolute bottom-1 right-1.5 z-20 text-[9px]" title="비밀 해금">
    📜
  </div>
)}
```

v105 추가 (📜 보다 1px 위에, 같은 우측 라인):
```tsx
{owned && owned.bondLv >= 3 && (
  <div
    className="absolute z-20 text-[9px]"
    style={{
      bottom: owned.backstoryUnlocked ? 14 : 4,  // 📜 와 겹치지 않게
      right: 6,
    }}
    title="시그니처 무브 해금"
  >
    🎴
  </div>
)}
```

이유: 그리드에서 *어떤 카드가 시그니처를 쓸 수 있는 상태인지* 한 눈에 보임 → 도감 둘러보기 단계에서도 *"아, 얘는 더 빨리 키우면 카드 풀린다"* 학습.

---

## 5. 카피라이팅 디테일 가이드

### 5.1 Tagline 작성 원칙

- **정령 시점 1인칭**. "내가 …해줄게" / "같이 …하자" 형태.
- **반말 OK** (정령은 친구이므로). 단 letter_fairy/forest_mom 등 존대 정령은 그대로 존대.
- **이모지는 cardEmoji 와 중복 X**. tagline 안에 다른 이모지 넣지 말 것.
- **15자 이내 권장, 25자 절대 상한**.

### 5.2 momentHint 작성 원칙

- **유저 시점**. "네가 …할 때" / "…한 순간".
- **Phase 명을 노출하지 말 것**. "EMPOWER 시" (X) → "다시 일어서려 할 때" (O).
- **시나리오 명을 노출하지 말 것**. "BREAKUP_CONTEMPLATION 시" (X) → "이별을 결정하려 할 때" (O).

### 5.3 cadenceHint 작성 원칙

- **자연어 빈도**. "하루 한 번 / 일주일에 한 번 / 한 달에 한 번" 형태.
- **숫자 단위 그대로 노출 OK**. "5턴 후 재발동" 같은 게임 텀 X.
- 자세한 매핑 (참고용 — 카피와 1:1 일치):

| spiritId | SPIRIT_COOLDOWN | cadenceHint 자연어 |
|---|---|---|
| fire_goblin | turns:3, hours:24 | "같은 사람한텐 하루 한 번" |
| book_worm | turns:5 | "한 세션에 한 번" |
| tear_drop | hours:24 | "하루 한 번" |
| seed_spirit | hours:24 | "새 세션 시작에만" (실제로는 turn===1 컨텍스트 게이트) |
| drum_imp | days:7 | "일주일에 한 번" |
| peace_dove | days:3 | "사흘에 한 번" |
| cloud_bunny | turns:5 | "한 세션에 한 번" |
| letter_fairy | days:7 | "일주일에 한 번" |
| wind_sprite | turns:5 | "한 세션에 한 번" |
| moon_rabbit | hours:24 | "그 시간대 하루 한 번" |
| clown_harley | days:3 | "사흘에 한 번" |
| rose_fairy | hours:24 | "하루 한 번" |
| forest_mom | hours:24 | "하루 한 번" |
| cherry_leaf | days:7 | "일주일에 한 번" |
| ice_prince | hours:24 | "하루 한 번" |
| lightning_bird | hours:24 | "하루 한 번" |
| butterfly_meta | days:7 | "일주일에 한 번" |
| book_keeper | days:7 | "일주일에 한 번" |
| queen_elena | days:7 | "일주일에 한 번" |
| star_dust | monthly:true | "한 달에 한 번만" |
| guardian_eddy | days:7 | "일주일에 한 번" |

### 5.4 choiceHint 작성 원칙

- **카드 본문을 노출하지 말 것**. drafts 의 실제 텍스트 X.
- **선택지 *숫자 + 결*만 노출**. "세 가지 톤" / "셋 중 하나" / "두 가지 — A / B" 형태.

### 5.5 rarityNote 작성 원칙

- **얼마나 귀한지 = 발동 조건의 좁은 정도**.
- "어떤 상황에서 안 나타나는지"를 *부드럽게* 표현. 게이트 코드 그대로 노출 X.
- 예: `cherry_leaf` 의 `scenario === 'BREAKUP_CONTEMPLATION'` 게이트 → "이별 결심 순간에만".

### 5.6 empowerHint 작성 원칙

- **기존 abilityEnhanced 와 의미 일치, 표현은 더 시적/부드럽게**.
- 예: `fire_goblin.abilityEnhanced = "💎 보너스 10% 추가"` → empowerHint = "분노 게이지 +10% 더 빠르게 풀려".

---

## 6. 구현 순서 (바이브코딩 1세션)

각 단계는 *직전 단계 의존*. 단일 세션 내 순차 진행.

1. **신규 파일** `src/data/spirit-event-preview.ts` 작성 — 본 문서 §2.1 타입 + §2.2 표 그대로 코드 변환 + §2.3 헬퍼.
2. **신규 컴포넌트** `src/components/dex/SignatureMoveSection.tsx` 작성 — 본 문서 §3.2 ~ §3.5 그대로.
3. **`SpiritDetailSheet.tsx` 패치** — ⚡ 능력 섹션 직후 `<SignatureMoveSection spirit={spirit} owned={owned} />` 삽입 (isOwned 가드 안에서만).
4. **`DexCard.tsx` 패치** — §4.1 그대로 🎴 아이콘 추가.
5. **`globals.css` 또는 카드 컴포넌트 내 styled-jsx** — §3.5 의 `shimmer-signature` keyframes 추가 (셔머용).
6. **수동 QA** — Lv.1/3/5 정령 각 1마리씩 도감 진입해서 시각 확인.

### 6.1 수용 기준

- [ ] 모든 20정령 (+ guardian_eddy 1) 의 `getEventPreview` 가 non-null 반환.
- [ ] Lv.1~2 정령: cardName="???" / cardEmoji 실루엣 / tagline+momentHint 보임 / cadenceHint+choiceHint+rarityNote 안 보임.
- [ ] Lv.3+ 정령: 모든 4줄 (모먼트/케이던스/선택/희소도) 풀 노출.
- [ ] Lv.5+ 정령: empowerHint 1줄 추가 + 카드 외곽 셔머 애니메이션.
- [ ] DexCard 그리드: Lv.3+ 정령에 🎴 아이콘 1개 (📜 와 겹치지 않게 위/아래 분리).
- [ ] 미소지 정령: `SignatureMoveSection` 자체 렌더링 안 됨.
- [ ] DOM 깊이/리렌더 부담 없음 (정적 데이터 1회 lookup).

### 6.2 비-수용 (이번에 안 함)

- 카드 본문(drafts/frames/tasks) 의 도감 노출 — *시그니처 카드 본문은 실제 발동에서만* 원칙 유지.
- "이번 세션에 발동 가능 여부" 실시간 표시 — Phase/시나리오 의존하므로 도감에선 정적 표현만.
- 시그니처 발동 이력 도감 노출 — `spirit_event_repo` 조회 추가 비용. v106+ 로 미룸.
- 도감 그리드 카드 자체에 카드 이름 노출 — 그리드 정보 밀도 폭증. 디테일 시트에서만.

---

## 7. 비용 / 리스크

### 7.1 비용
- **DB**: 0 (정적 데이터)
- **API**: 0 (신규 엔드포인트 없음)
- **LLM**: 0 (모든 카피 정적)
- **번들 크기**: ~3KB (20정령 × 8필드 한글 카피)

### 7.2 리스크
| 리스크 | 영향 | 대응 |
|---|---|---|
| 카피 톤이 v104 카드 본문과 어긋남 | 중 | §5 카피 원칙 + §2.2 표 그대로 적용. v104 카드 컴포넌트 텍스트와 직접 매칭 가능하도록 cardName/tagline 일치 검증. |
| 너무 많이 보여줘서 신비감 감소 | 중 | 카드 본문은 *절대* 노출 안 함. drafts/prompts/frames 등 v104 데이터는 도감 어디에도 안 들어감. |
| Lv.1 유저가 momentHint 보고 "이거 어떻게 만들지?" 검색하려 함 | 저 | momentHint 가 자연어이고 기획문서가 *유저향이 아님* → 검색해도 의도된 호기심으로 흡수됨. |
| 디오라마/도감 외 다른 화면에서 SignatureMoveSection 호출 시도 | 저 | 컴포넌트가 `owned`/`spirit` props 강제 → 잘못 호출하면 타입 에러로 막힘. |
| `guardian_eddy` 가 가챠풀 외부인데 preview 가 노출됨 | 저 | 미소지일 땐 섹션 자체 렌더링 안 됨. 소지 시점은 v106 의 *해금 정령* 시점. 그때까지 죽은 코드 OK. |

---

## 8. 데이터 표 (코드 변환용 final)

```ts
// src/data/spirit-event-preview.ts — full literal
export const SPIRIT_EVENT_PREVIEWS: Record<SpiritId, SpiritEventPreview> = {
  fire_goblin: {
    spiritId: 'fire_goblin',
    eventType: 'SPIRIT_RAGE_LETTER',
    cardEmoji: '🔥',
    cardName: '다 태워주는 편지',
    tagline: '"다 적어 — 같이 태워줄게."',
    momentHint: '네가 누군가에게 너무 화났을 때',
    cadenceHint: '같은 사람한텐 하루 한 번',
    choiceHint: '세 가지 톤 — 불 / 솔직 / 차갑게',
    rarityNote: '아무한테나 안 나타나는 카드',
    empowerHint: '분노 게이지 +10% 더 빠르게 풀려',
  },
  // ... (19개 더, §2.2 표 그대로)
};
```

§2.2 표가 final ground truth. 빌드시 `keyof typeof SPIRITS` 와 키 일치 검증 필수 (TS `Record<SpiritId, …>` 가 자동 강제함).

---

## 9. 성공 지표 측정 (이번 PR 외)

배포 후 7일 동안 측정:
- `bondLv` 변화 events (Lv.2→3) 의 분포가 도감 진입 후 24h 내 발생률 추적.
- 도감 디테일 시트 평균 체류시간 (이미 frontend timing 측정 가능).

**상승 시그널 임계**:
- Lv.2→3 전환의 *24h-도감-precede율* +15%pp → 명확히 효과 있음.
- 디테일 시트 체류 +8s 이상 → 카드 읽고 있음.

---

## 10. 다음 단계 후보 (v106+)

- **시그니처 발동 이력 미니 갤러리**: 도감 디테일에 "내가 본 횟수 / 마지막으로 본 날" 표시.
- **시그니처 카드 썸네일**: 카드 컴포넌트의 *축소 정적 미리보기* (실제 발동 본문은 여전히 가림).
- **갤러리 모달**: 시그니처만 모아보는 별도 탭. *Pokémon 기술도감* 패턴.
- **레어도별 시그니처 개수 카운터**: 헤더 진척도 (예: "시그니처 12/20 해금됨").

— 끝 —
