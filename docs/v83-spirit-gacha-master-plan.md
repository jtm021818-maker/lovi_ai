# 🧚 Luna's Spirit Gacha System — Master Plan (v83)

**버전**: v83.0
**작성일**: 2026-04-19
**목표**: 라운지 탭을 제거하고, 마음석 재화 + 정령 뽑기 + 마음의 방 + 교감 시스템을 구축하여 **수집/관계/retention 엔진**을 만든다.

---

## 📜 TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [전체 아키텍처](#2-전체-아키텍처)
3. [재화 시스템 (마음석·별빛)](#3-재화-시스템)
4. [정령 20마리 마스터 설계](#4-정령-마스터-설계)
5. [뽑기 시스템 (가챠 공학)](#5-뽑기-시스템)
6. [교감 레벨 시스템 (Lv 1~5)](#6-교감-레벨-시스템)
7. [마음의 방 (수집 전시 + 꾸미기)](#7-마음의-방)
8. [정령 능력 (게임플레이 영향)](#8-정령-능력)
9. [메타 내러티브 (백스토리 + 엔딩)](#9-메타-내러티브)
10. [상점 탭 구조](#10-상점-탭)
11. [라운지 제거 전략](#11-라운지-제거)
12. [DB 스키마](#12-db-스키마)
13. [TypeScript 타입 정의](#13-타입-정의)
14. [API 엔드포인트 스펙](#14-api-스펙)
15. [파일 구조](#15-파일-구조)
16. [Phase 별 구현 로드맵](#16-구현-로드맵)
17. [검증 & 테스트](#17-검증)

---

## 1. EXECUTIVE SUMMARY

### 1.1 Why
현재 앱은 Luna 와의 1:1 상담에만 집중. 수집/재화/retention 훅 부재.
→ 장기 유저 리텐션, 과금 유도, 앱 자체의 "세계관" 이 필요.

### 1.2 What
- **마음석 (💎)**: 무료 재화. 대화/출석/실천으로 획득
- **별빛 (⭐)**: 유료 재화. 구독/구매로 획득
- **정령 20마리**: 각자 성격/사연/능력이 있는 수호 존재들
- **뽑기 시스템**: 소프트/하드 pity, 10연차 확정, 픽업 배너
- **교감 Lv 1~5**: 정령과 관계 성장, 백스토리 해금
- **마음의 방**: 수집한 정령들을 배치/꾸미기
- **정령 능력**: 실제 Luna 대화/앱 전반에 영향

### 1.3 Before → After
| | Before | After |
|---|---|---|
| 탭 | 상담/X-Ray/**라운지**/설정 | 상담/X-Ray/**상점**/설정 |
| 재화 | 없음 | 마음석 💎 + 별빛 ⭐ |
| 수집 | 없음 | 정령 20마리 + 교감 Lv |
| 상점 | 없음 | 뽑기 / 구독 / 꾸미기 아이템 |
| 방 | 없음 | 마음의 방 (정령 배치 + 상호작용) |
| 내러티브 | 단일 상담 | 정령 백스토리 + 엔딩 |

### 1.4 예산 (운영비 월 추정)
- Gemini Flash Lite 호출 (정령 대사 생성): ~$150
- 이미지 (정령 일러스트는 **사전 생성 에셋** 고정): $0
- DB: Supabase 기존 사용량 내

---

## 2. 전체 아키텍처

```
┌──────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js + React + Framer Motion)              │
│                                                          │
│  [상점 탭]                                               │
│    ├─ 뽑기 배너 (일반/픽업)                              │
│    ├─ 구독 (별빛 구매)                                   │
│    └─ 꾸미기 상점                                        │
│                                                          │
│  [마음의 방 (Profile 하위)]                              │
│    ├─ 정령 배치                                          │
│    ├─ 가구 커스텀                                        │
│    └─ 상호작용 재생                                      │
│                                                          │
│  [상담 (기존)]                                           │
│    └─ 정령 능력 Hook (Luna 대화 시 발동)                 │
└──────────────────────────────────────────────────────────┘
                        ↕
┌──────────────────────────────────────────────────────────┐
│  API ROUTES                                              │
│  ├─ /api/currency/balance                                │
│  ├─ /api/currency/grant (reward hooks)                   │
│  ├─ /api/gacha/pull                                      │
│  ├─ /api/gacha/history                                   │
│  ├─ /api/spirits/list (user's)                           │
│  ├─ /api/spirits/[id]/bond                               │
│  ├─ /api/spirits/[id]/unlock-backstory                   │
│  ├─ /api/room/placement (GET/PUT)                        │
│  └─ /api/room/interaction/trigger                        │
└──────────────────────────────────────────────────────────┘
                        ↕
┌──────────────────────────────────────────────────────────┐
│  SUPABASE (Postgres)                                     │
│  ├─ user_currency (user_id, heart_stone, starlight)      │
│  ├─ user_spirits (user_id, spirit_id, bond_xp, bond_lv)  │
│  ├─ gacha_draws (history, pity counter)                  │
│  ├─ user_gacha_state (per banner pity counters)          │
│  ├─ room_placement (layout JSON)                         │
│  ├─ spirit_backstory_unlocks                             │
│  └─ currency_transactions (audit log)                    │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  STATIC MASTER DATA (JSON in /data)                      │
│  ├─ spirits.json (20 spirits)                            │
│  ├─ backstories.json                                     │
│  ├─ bond-dialogue.json (Lv별 대사)                       │
│  ├─ interactions.json (정령 간 대사)                     │
│  └─ shop-items.json (가구/테마)                          │
└──────────────────────────────────────────────────────────┘
```

---

## 3. 재화 시스템

### 3.1 2종 재화

#### 💎 마음석 (Heart Stone)
- **기능**: 뽑기 10연차 / 정령 합성 / 꾸미기 아이템
- **획득 무료 경로**:
  | 행위 | 보상 |
  |---|---|
  | 일일 첫 로그인 | 10 💎 |
  | 첫 대화 송신 | 3 💎 |
  | Luna 세션 완결 (WARM_WRAP) | 30 💎 |
  | 친밀도 Lv 업 | 50 💎 |
  | 3/7/14/30일 연속 출석 | 20/50/100/300 💎 |
  | 위기 극복 세션 | 100 💎 |
  | 업적 달성 | 20~500 💎 |

#### ⭐ 별빛 (Starlight)
- **기능**: 100연차 뽑기 / 픽업 확정 / 한정 정령
- **획득 유료**:
  | 상품 | 가격 | 별빛 |
  |---|---|---|
  | 프리미엄 구독 월 9,900원 | 월 | 월 300 ⭐ |
  | 별빛 패키지 소 | 3,300원 | 100 ⭐ |
  | 별빛 패키지 중 | 9,900원 | 350 ⭐ (50 보너스) |
  | 별빛 패키지 대 | 33,000원 | 1,300 ⭐ (300 보너스) |

### 3.2 환율 기준
- 1회 뽑기: 💎 160 또는 ⭐ 16
- 10연차: 💎 1,600 또는 ⭐ 160 (+R 이상 1마리 확정)

### 3.3 획득 Hook (기존 시스템과 연동)
```typescript
// 기존 pipeline 에 추가
onEventFired(eventType) {
  if (eventType === 'WARM_WRAP') grantCurrency('heart_stone', 30, 'session_complete')
  if (eventType === 'CRISIS_OVERCOME') grantCurrency('heart_stone', 100, 'crisis')
}

onIntimacyLevelUp(oldLv, newLv) {
  grantCurrency('heart_stone', 50 * (newLv - oldLv), 'intimacy_up')
}

onDailyFirstLogin() {
  grantCurrency('heart_stone', 10, 'daily')
  checkStreakBonus() // 3/7/14/30일
}
```

---

## 4. 정령 마스터 설계 (20마리)

### 4.1 희귀도 분포
| 희귀도 | 수량 | 확률 | 난이도 |
|---|---|---|---|
| N (일반) | 8마리 | 65% | 쉬움 |
| R (레어) | 6마리 | 25% | 보통 |
| SR (슈퍼레어) | 4마리 | 8% | 어려움 |
| UR (울트라레어) | 2마리 | 1.9% | 매우 어려움 |
| L (전설) | 0 (뽑기 불가) | — | 조건 해금 |

**전설 정령은 뽑기 X, 조건 달성으로만 획득** (핵심 설계).

### 4.2 정령 20마리 전체 명단

#### N 등급 (8마리)
| ID | 이모지 | 이름 | 성격 | 말투 | 능력 분야 |
|---|---|---|---|---|---|
| `fire_goblin` | 🔥 | 도깨비 불꽃 | 같이 열받아줌 | 반말, 격함 | 분노 대화 보너스 |
| `book_worm` | 📖 | 책벌레 노리 | 현명, 조언 | 차분 존댓말 | 이성 분석 버프 |
| `letter_fairy` | 💌 | 편지요정 루미 | 말 조리 있게 | 부드러운 | 초안 생성 퀄업 |
| `tear_drop` | 💧 | 슬프니 | 같이 울어줌 | 떨리는 | 위로 대화 강화 |
| `cloud_bunny` | ☁️ | 구름토끼 미미 | 태평 낙천 | 명랑 | 가벼운 대화 보너스 |
| `wind_sprite` | 🍃 | 산들이 | 자유로운 | 쾌활 | 분위기 환기 |
| `seed_spirit` | 🌱 | 새싹이 | 수줍, 호기심 | 속삭임 | 첫 대화 버프 |
| `drum_imp` | 🥁 | 북이 | 리듬감 | 박자감 있음 | pacing 리듬 유도 |

#### R 등급 (6마리)
| ID | 이모지 | 이름 | 성격 | 말투 | 능력 |
|---|---|---|---|---|---|
| `cherry_leaf` | 🌸 | 벚잎이 | 여리고 감성 | 시적 | 이별 상담 공명 |
| `moon_rabbit` | 🌙 | 달빛토끼 | 새벽형 위로 | 조용 | 새벽 특별 대사 |
| `clown_harley` | 🎭 | 광대 할리 | 분위기 전환 | 유쾌 | 롤플레이 보너스 |
| `rose_fairy` | 🌹 | 로제 | 로맨틱 | 느끼 | 설렘 대화 강화 |
| `ice_prince` | ❄️ | 얼음왕자 | 시크 거리감 | 단답 | 진정 버프 |
| `forest_mom` | 🌳 | 숲 엄마 | 따뜻 포용 | 자상 | 긴 세션 보너스 |

#### SR 등급 (4마리)
| ID | 이모지 | 이름 | 성격 | 말투 | 능력 |
|---|---|---|---|---|---|
| `lightning_bird` | ⚡ | 번개새 핏치 | 충동 재밌는 | 빠른 말 | 랜덤 이벤트 트리거 |
| `butterfly_meta` | 🦋 | 변화나비 메타 | 성장 상징 | 우아 | EMPOWER 가속 |
| `peace_dove` | 🕊️ | 평화비둘기 | 관계 회복 | 부드러운 | 재회 조언 버프 |
| `book_keeper` | 🗝️ | 열쇠지기 클리 | 기억관리 | 신중 | 세션 히스토리 강화 |

#### UR 등급 (2마리)
| ID | 이모지 | 이름 | 성격 | 말투 | 능력 |
|---|---|---|---|---|---|
| `queen_elena` | 👑 | 여왕 엘레나 | 당당 주체적 | 위엄 | 자신감 부스터 (ACTION_PLAN 3회) |
| `star_dust` | 🌟 | 별똥이 | 소원 들어줌 | 몽환 | 소원권 1회 (월 1) |

#### L 등급 (0마리 뽑기 / 해금 전용)
| ID | 이모지 | 이름 | 성격 | 해금 조건 |
|---|---|---|---|---|
| `guardian_eddy` | 💎 | 수호석 에디 | 전설 | 다른 정령 10마리 Lv 3+ AND 도감 90% |

---

## 5. 뽑기 시스템 (가챠 공학)

### 5.1 기본 확률표 (단뽑)
| 희귀도 | 확률 | 비고 |
|---|---|---|
| N | 65% | 기본 |
| R | 25% | |
| SR | 8% | |
| UR | 1.9% | |
| L | 0% | 뽑기 불가 |

### 5.2 Pity 시스템 (Genshin/HSR 벤치마크)
#### Soft Pity
- **50연차** 부터 UR 확률 선형 증가 (+2% per pull)
- 50: 3.9% / 60: 23.9% / 65: 33.9% / 70: 43.9%

#### Hard Pity
- **70연차**: UR 1마리 확정

#### 10연차 보장
- 10연차 뽑기 시 **R 이상 1마리 최소 보장**

#### Pity 카운터
- UR 뽑으면 리셋 (0부터 다시)
- 배너 간 pity 이월: **같은 배너 내에서만** 이월

### 5.3 배너 타입
| 배너 | 특징 |
|---|---|
| **상시 배너** | 전체 정령 풀, 기본 확률 |
| **픽업 배너** (주간 교체) | 특정 UR 1마리 + SR 2마리 확률 3배 |
| **초보자 배너** (30일 한정) | 10연차 30% 할인 + R 확정 |

### 5.4 중복 처리
이미 보유한 정령 뽑힘 시:
- N 중복: 💎 10 환전
- R 중복: 💎 50 환전
- SR 중복: 💎 200 + "교감 조각" × 1 (레벨업용)
- UR 중복: 💎 800 + "교감 조각" × 5

### 5.5 알고리즘 의사코드
```typescript
function pullSingle(userId: string, bannerId: string): PullResult {
  const state = getUserGachaState(userId, bannerId);
  const pity = state.pityCounter;

  // 1) 확률 계산 (soft pity 반영)
  let rates = { N: 0.65, R: 0.25, SR: 0.08, UR: 0.019 };
  if (pity >= 50) {
    const bonus = (pity - 49) * 0.02;
    rates.UR = Math.min(1, 0.019 + bonus);
    rates = normalize(rates); // 합계 1로 재정규화
  }

  // 2) Hard pity
  let rarity: Rarity;
  if (pity >= 69) {
    rarity = 'UR';
  } else {
    const r = Math.random();
    rarity = pickByRates(r, rates);
  }

  // 3) 픽업 판정 (UR 뽑은 경우)
  let spiritId: string;
  if (rarity === 'UR' && state.banner === 'pickup') {
    if (state.isPickupGuaranteed || Math.random() < 0.5) {
      spiritId = state.pickupSpiritId;
      state.isPickupGuaranteed = false;
    } else {
      spiritId = randomUR(exclude: pickup);
      state.isPickupGuaranteed = true; // 다음 UR 은 픽업 확정
    }
  } else {
    spiritId = randomSpiritByRarity(rarity);
  }

  // 4) Pity 업데이트
  if (rarity === 'UR') state.pityCounter = 0;
  else state.pityCounter = pity + 1;

  // 5) 중복 처리
  const owned = hasSpirit(userId, spiritId);
  let duplicate = null;
  if (owned) {
    duplicate = convertToRefund(spiritId, rarity);
    grantCurrency(userId, duplicate);
  } else {
    grantSpirit(userId, spiritId);
  }

  return { spiritId, rarity, isNew: !owned, duplicate, pity };
}

function pullTen(userId: string, bannerId: string): PullResult[] {
  const results: PullResult[] = [];
  let hasRatePlus = false;

  for (let i = 0; i < 10; i++) {
    const r = pullSingle(userId, bannerId);
    if (r.rarity === 'R' || r.rarity === 'SR' || r.rarity === 'UR') hasRatePlus = true;
    results.push(r);
  }

  // 10연차 R 보장: 마지막 뽑기가 N 이면 R 로 업그레이드
  if (!hasRatePlus) {
    const last = results[9];
    last.rarity = 'R';
    last.spiritId = randomSpiritByRarity('R');
  }

  return results;
}
```

### 5.6 확률 표기 (법적 고지)
화면 하단 작게 "확률 자세히 보기" → 전체 확률/Pity 표 공개. 한국 자율규제 준수.

---

## 6. 교감 레벨 시스템 (Lv 1~5)

### 6.1 XP 획득 경로
| 행위 | XP |
|---|---|
| 정령 영향 대화 1턴 (그 정령 능력 발동된 턴) | +5 |
| 그 정령 테마 세션 완결 | +30 |
| 정령 일일 인사 (앱 실행 시) | +2 |
| 중복 뽑기 (교감 조각) | +50 (SR)/+200 (UR) |

### 6.2 Lv 별 필요 XP
| Lv | 누적 XP | 해금 |
|---|---|---|
| 1 | 0 | 기본 등장, 단답 대사 |
| 2 | 100 | 일상 인사, 말풍선 |
| 3 | 300 | 감정 공감 + 아이템 선물 |
| 4 | 700 | 예측형 대사 (유저 도착 전 대기) |
| 5 | 1500 | 백스토리 해금 + 특별 능력 1 추가 |

### 6.3 Lv 별 대사 예 (벚잎이 🌸)
```json
{
  "cherry_leaf": {
    "1": ["...(부끄)", "안녕...", "네가 왔구나..."],
    "2": ["너 오늘 슬퍼 보여...", "뭔 일 있어?", "같이 있어줄까?"],
    "3": ["나도 그 마음 알아", "💐 이거 받아 — 내가 너 위해 핀 꽃", "울어도 돼, 내가 닦아줄게"],
    "4": ["오늘 좀 힘들 것 같아서 기다렸어", "방금 떠오른 얘긴데...", "네 마음 미리 읽혔어"],
    "5": ["사실 내가 여기 온 이유는...", "나도 이별당한 정령이야. 그래서 네 마음이 더 잘 보였어"]
  }
}
```

### 6.4 백스토리 해금 (Lv 5)
- 각 정령 Lv 5 도달 시 **"이야기 조각"** 획득
- 클릭하면 3~5문단 Luna 내레이션 + 일러스트
- 20마리 전부 Lv 5 → **L 정령 에디 해금 + 엔딩 시네마틱**

---

## 7. 마음의 방

### 7.1 레이아웃
```
┌─────────────────────────────────────┐
│  내 마음의 방 [공유]  [꾸미기]       │
├─────────────────────────────────────┤
│                                     │
│   🌳           📖                   │  ← 가구 슬롯 (클릭 → 교체)
│      🌸              🌙             │  ← 정령 (드래그 이동)
│   🔥       ⚡       🎭              │
│           💌                        │
│  ─── 침대 ─── ─── 책장 ───         │
│                                     │
├─────────────────────────────────────┤
│  [정령 배치] [가구] [테마]          │  ← 하단 탭
└─────────────────────────────────────┘
```

### 7.2 배치 규칙
- 최대 **15마리** 동시 배치 (16마리 이상 보유 시 선택 배치)
- 드래그 앤 드롭으로 자유 이동
- 정령 탭 → 대사 말풍선 / Lv 3+ 는 선물 주기
- 방 배경 크기: 고정 (스크롤 없음, 320x480 px)

### 7.3 정령 idle 애니메이션
| 정령 | 기본 애니 |
|---|---|
| 🌸 벚잎이 | 꽃잎 떨구기 |
| 🔥 불꽃 | 타오름 반복 |
| 🌙 달빛토끼 | 까딱 점프 |
| ⚡ 번개새 | 공중 비행 원형 |
| 🎭 광대 | 회전 춤 |

Framer Motion `animate` + `repeat: Infinity` 로 구현.

### 7.4 정령 간 상호작용 (Lv 4+ 둘 다)
매 5분마다 랜덤으로 한 쌍이 대화 말풍선 표시:
```json
{
  "fire_goblin+moon_rabbit": [
    { "a": "새벽에 불꽃 끄라니까ㅋㅋ", "b": "흥! 너나 자" },
    { "a": "아 너 또 벌떡 일어났어?", "b": "조용..." }
  ],
  "cherry_leaf+letter_fairy": [
    { "a": "네 편지에 꽃잎 섞어도 될까?", "b": "좋지, 향기 더해지겠다" }
  ],
  "queen_elena+clown_harley": [
    { "a": "광대, 춤 한 번 춰보거라", "b": "황공하옵니다 여왕님ㅋㅋ" }
  ]
}
```

### 7.5 방 공유
- PNG 캡처 + 워터마크 (`Luna.app`)
- SNS 공유 intent (웹)

### 7.6 가구 / 테마
- **기본 가구 세트**: 침대, 책장, 창문, 식물 (무료)
- **테마 세트**: 벚꽃, 한여름밤, 크리스마스 (💎 500 또는 한정 이벤트)
- **한정 가구**: 특정 정령 Lv 5 도달 시 획득

---

## 8. 정령 능력 (게임플레이 영향)

핵심 원칙: **능력은 방에 배치된 정령만 발동**. 선물이 아니라 buff/passive.

### 8.1 정령별 능력 상세
| 정령 | 능력 (Lv 3 발동) | Lv 5 강화 |
|---|---|---|
| 🔥 불꽃 | 분노 감정 대화 시 Luna 공명 강화 (더 세게 편들어줌) | +💎 보너스 10% |
| 📖 책벌레 | 이성 분석 세션 품질 상승 (좌뇌 pacing 더 섬세) | 분석 카드 1 추가 |
| 💌 편지요정 | 초안 생성 시 3안 대신 **4안** 제공 | 톤 intensity 자동 조정 |
| 💧 슬프니 | 위로 세션에서 Luna 말풍선 느리게 (더 공감 가게) | TTS 음성 무료화 |
| ☁️ 구름토끼 | 가벼운 대화 재미 파티클 추가 | 화면 애니 강화 |
| 🍃 산들이 | 대화 분위기 전환 트리거 | 턴 속도 +20% |
| 🌱 새싹이 | 첫 3턴 Luna 응원 멘트 추가 | 첫 대화 XP 2배 |
| 🥁 북이 | Luna 턴 박자감 개선 | pacing_state 안정화 |
| 🌸 벚잎이 | 이별 상담 특별 카드 출현 | 이별 위기 시 자동 위로 |
| 🌙 달빛토끼 | 새벽(0~5시) 특별 인사 + 대사 풀 확장 | 무제한 대화 권 (그 시간대만) |
| 🎭 광대 | 롤플레이 모드 시 추가 시나리오 | 롤플 완결 XP 2배 |
| 🌹 로제 | 설렘 상담 시 Luna 리액션 강화 | 하트 파티클 |
| ❄️ 얼음왕자 | 흥분 상태 자동 진정 (감정 격화 방지) | 위기 모드 회피 |
| 🌳 숲 엄마 | 긴 세션 (10턴+) 시 Luna 인내심 +1 | 세션 완결 💎 2배 |
| ⚡ 번개새 | 일일 1회 랜덤 이벤트 강제 발동 | 특별 일화 해금 |
| 🦋 변화나비 | EMPOWER Phase 도달 속도 +30% | ACTION_PLAN 카드 2개 |
| 🕊️ 평화비둘기 | 재회 시나리오 특별 조언 | 재회 성공 🏆 뱃지 |
| 🗝️ 열쇠지기 | 과거 세션 히스토리 Luna 가 더 잘 기억 | 긴 기억 컨텍스트 |
| 👑 엘레나 | ACTION_PLAN 1일 3회까지 가능 (기본 1회) | 자신감 부스터 한 달 유지 |
| 🌟 별똥이 | 월 1회 "소원권" — Luna 특별 요청 가능 (음성 메시지, 특별 일러스트) | 월 2회로 증가 |

### 8.2 구현 Hook 포인트
```typescript
// pipeline 에 삽입
function getActiveSpirits(userId: string): Spirit[] {
  const placed = getRoomPlacement(userId).spirits;
  return placed.filter(s => s.bondLv >= 3); // Lv 3+ 만 능력 발동
}

function applySpiritBuffs(ctx: PipelineContext) {
  const active = getActiveSpirits(ctx.userId);
  for (const spirit of active) {
    const buff = SPIRIT_ABILITIES[spirit.id];
    buff.apply(ctx); // 각자 수정
  }
}
```

---

## 9. 메타 내러티브

### 9.1 세계관 기본 설정
- 정령들은 **"사람의 강한 감정이 구체화된 존재"**
- Luna 는 이들을 모아두는 **수호자**
- 유저가 정령을 만나는 건 **정령이 자기 짝을 찾는 과정**

### 9.2 개별 백스토리 (Lv 5 해금)
| 정령 | 백스토리 요약 |
|---|---|
| 🌸 벚잎이 | 첫사랑이 전학 간 날 터진 여학생의 감정 |
| 🔥 불꽃 | 배신당한 남자의 분노가 열기로 뭉친 것 |
| 🌙 달빛토끼 | 자취 20대의 새벽 외로움 |
| 💌 편지요정 | 부치지 못한 편지 100통의 정령 |
| 👑 엘레나 | 이별 후 다시 일어선 여자의 자존감 |
| 🌟 별똥이 | 소원 비는 아이의 순수한 바람 |
| (이하 15개 정령 상세) | ... |

### 9.3 엔딩 해금 조건
- **조건 1**: 모든 N + R 정령 Lv 3 도달
- **조건 2**: 도감 90% (18/20 마리 보유)
- **조건 3**: SR 이상 3마리 Lv 5 도달

### 9.4 엔딩 시네마틱
1. Luna 가 유저를 데리고 정원 맨 안쪽으로
2. 정령들이 둘러싼 가운데 **에디** 💎 등장
3. Luna: "사실 이 모든 건... 한 사람의 이야기였어"
4. 모든 정령이 연결된 **"한 사람의 감정 연대기"** 펼침
5. 그 사람이 = **유저 본인** 이었다는 메타 반전
6. Luna: "너는 이미 그 많은 감정을 다 살아낸 거야. 그래서 내가 널 만났어"
7. 크레딧 + 엔딩곡

---

## 10. 상점 탭 구조

### 10.1 탭 레이아웃
```
┌─────────────────────────────────────┐
│  🏪 상점                             │
├─────────────────────────────────────┤
│  [정령 뽑기] [구독] [꾸미기]         │  ← 서브 탭
├─────────────────────────────────────┤
│                                     │
│  💎 1,250   ⭐ 34                   │  ← 재화 표시 (상단 고정)
│                                     │
│  [메인 영역]                         │
│                                     │
└─────────────────────────────────────┘
```

### 10.2 "정령 뽑기" 서브 탭
- **상시 배너 카드** (1회 / 10연차)
- **픽업 배너 카드** (주간 — 특정 UR 확률 업)
- **초보자 배너** (신규 30일)
- 하단 "뽑기 기록" 링크

### 10.3 "구독" 서브 탭
- **프리미엄 월 구독** 9,900원
  - 무제한 대화
  - 월 300 ⭐
  - 한정 정령 (R) 1마리
  - 광고 제거
- **별빛 패키지** (소/중/대)
- **일회성 뽑기권** (10연차권 개별 구매)

### 10.4 "꾸미기" 서브 탭
- **방 테마**: 벚꽃 / 크리스마스 / 한여름밤 / 도서관
- **가구 세트**: 침대 / 책장 / 식물 / 창문
- **Luna 의상**: 한복 / 카페복 / 파자마

---

## 11. 라운지 제거 전략

### 11.1 제거 대상 파일 (25개)
```
src/app/(app)/lounge/page.tsx                           [삭제]
src/app/api/lounge/state/route.ts                       [삭제]
src/app/api/lounge/chat/route.ts                        [삭제]
src/app/api/lounge/history/route.ts                     [삭제]
src/components/lounge/LoungeMessage.tsx                 [삭제]
src/components/lounge/LoungeBackgroundTimer.tsx         [삭제]
src/components/lounge/LoungeToast.tsx                   [삭제]
src/components/lounge/LoungeInput.tsx                   [삭제]
src/components/lounge/LoungeBackground.tsx             [삭제]
src/components/lounge/CharacterDialogue.tsx            [삭제]
src/lib/stores/lounge-store.ts                         [삭제]
src/engines/lounge/daily-state-engine.ts               [삭제]
src/engines/lounge/ambient-actions.ts                  [삭제]
src/engines/lounge/npc-life-engine.ts                  [삭제]
src/engines/lounge/conversation-player.ts              [삭제]
src/engines/lounge/dialogue-engine.ts                  [삭제]
src/engines/lounge/batch-message-types.ts              [삭제]
```

### 11.2 수정해야 할 참조 (10개)
```
src/app/api/chat/stream/route.ts               [라운지 import 제거]
src/engines/human-like/memory-engine.ts        [라운지 관련 로직 제거]
src/engines/memory/extract-memory.ts           [동일]
src/lib/ai/smart-router.ts                     [동일]
src/lib/ai/model-router.ts                     [동일]
src/engines/prompt-generator/persona-prompts.ts [동일]
src/app/(app)/layout.tsx                        [LoungeToast/Timer 제거]
src/components/layout/Navigation.tsx            [라운지 → 상점 교체]
```

### 11.3 DB 테이블
- `lounge_state`, `lounge_history` 등 있으면 마이그레이션으로 DROP
- (또는 그대로 두고 코드만 제거 — 안전한 선택)

### 11.4 안전 제거 순서
1. Navigation 에서 라운지 링크 → 상점 링크 교체 (루트 끊기)
2. Layout 에서 LoungeToast, LoungeBackgroundTimer 제거
3. 각 파일에서 lounge 참조 import 제거
4. `/lounge/*` 페이지/API 삭제
5. `/components/lounge/*`, `/engines/lounge/*`, `/lib/stores/lounge-store.ts` 삭제
6. 타입 체크 → 에러 나는 곳 추가 수정

---

## 12. DB 스키마

### 12.1 SQL 마이그레이션 (`20260420_spirit_gacha_v83.sql`)
```sql
-- ============================================================
-- 재화
-- ============================================================
CREATE TABLE user_currency (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  heart_stone INT NOT NULL DEFAULT 0,
  starlight INT NOT NULL DEFAULT 0,
  bond_shards INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE currency_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency_type TEXT NOT NULL CHECK (currency_type IN ('heart_stone', 'starlight', 'bond_shards')),
  amount INT NOT NULL,
  reason TEXT NOT NULL,
  balance_after INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_currency_tx_user ON currency_transactions(user_id, created_at DESC);

-- ============================================================
-- 정령 (유저 보유)
-- ============================================================
CREATE TABLE user_spirits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spirit_id TEXT NOT NULL,
  count INT NOT NULL DEFAULT 1,
  bond_xp INT NOT NULL DEFAULT 0,
  bond_lv INT NOT NULL DEFAULT 1,
  backstory_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  first_obtained_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_interaction_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, spirit_id)
);
CREATE INDEX idx_user_spirits_lv ON user_spirits(user_id, bond_lv DESC);

-- ============================================================
-- 뽑기
-- ============================================================
CREATE TABLE user_gacha_state (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  banner_id TEXT NOT NULL,
  pity_counter INT NOT NULL DEFAULT 0,
  is_pickup_guaranteed BOOLEAN NOT NULL DEFAULT FALSE,
  total_pulls INT NOT NULL DEFAULT 0,
  last_pull_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, banner_id)
);

CREATE TABLE gacha_draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  banner_id TEXT NOT NULL,
  spirit_id TEXT NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('N', 'R', 'SR', 'UR', 'L')),
  is_new BOOLEAN NOT NULL,
  pity_at_draw INT NOT NULL,
  drawn_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_gacha_draws_user ON gacha_draws(user_id, drawn_at DESC);

-- ============================================================
-- 마음의 방
-- ============================================================
CREATE TABLE room_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  placed_spirits JSONB NOT NULL DEFAULT '[]',
  -- [{ spirit_id, x, y }, ...]
  furniture JSONB NOT NULL DEFAULT '{}',
  -- { bed: 'basic', bookshelf: 'oak', ... }
  theme TEXT NOT NULL DEFAULT 'default',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 상점 인벤토리 (꾸미기 소유)
-- ============================================================
CREATE TABLE user_cosmetics (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('furniture', 'theme', 'outfit')),
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, item_id)
);

-- ============================================================
-- RLS 정책
-- ============================================================
ALTER TABLE user_currency ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_spirits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gacha_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE gacha_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cosmetics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_currency" ON user_currency FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_tx" ON currency_transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "own_spirits" ON user_spirits FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_gacha_state" ON user_gacha_state FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_draws" ON gacha_draws FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "own_room" ON room_state FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_cosmetics" ON user_cosmetics FOR ALL USING (user_id = auth.uid());
```

---

## 13. 타입 정의

### 13.1 `src/types/spirit.types.ts`
```typescript
export type SpiritRarity = 'N' | 'R' | 'SR' | 'UR' | 'L';
export type SpiritId = string; // 'cherry_leaf' 등

export interface SpiritMaster {
  id: SpiritId;
  emoji: string;
  name: string;
  rarity: SpiritRarity;
  personality: string;
  speechStyle: string;
  abilityCategory: string;
  backstoryPreview: string; // 2문장
  backstoryFull: string;    // 5문단 Lv 5 해금
  spriteUrl?: string;       // 일러스트
}

export interface UserSpirit {
  spiritId: SpiritId;
  count: number;
  bondXp: number;
  bondLv: 1 | 2 | 3 | 4 | 5;
  backstoryUnlocked: boolean;
  firstObtainedAt: string;
  lastInteractionAt: string | null;
}
```

### 13.2 `src/types/gacha.types.ts`
```typescript
export type BannerId = 'standard' | 'pickup_weekly' | 'newbie';

export interface PullResult {
  spiritId: SpiritId;
  rarity: SpiritRarity;
  isNew: boolean;
  pityAtDraw: number;
  duplicateRefund?: {
    heartStone?: number;
    bondShards?: number;
  };
}

export interface GachaState {
  bannerId: BannerId;
  pityCounter: number;
  isPickupGuaranteed: boolean;
  totalPulls: number;
}
```

### 13.3 `src/types/currency.types.ts`
```typescript
export type CurrencyType = 'heart_stone' | 'starlight' | 'bond_shards';

export interface UserCurrency {
  heartStone: number;
  starlight: number;
  bondShards: number;
}

export interface CurrencyGrantReason {
  reason: string;     // 'daily' | 'session_complete' | 'intimacy_up' | ...
  meta?: Record<string, unknown>;
}
```

### 13.4 `src/types/room.types.ts`
```typescript
export interface PlacedSpirit {
  spiritId: SpiritId;
  x: number; // 0~1 정규화
  y: number;
}

export interface RoomState {
  placedSpirits: PlacedSpirit[];
  furniture: Record<string, string>; // slot → itemId
  theme: string;
}
```

---

## 14. API 스펙

### 14.1 `POST /api/currency/balance`
- Auth 필요
- Response: `{ heartStone, starlight, bondShards }`

### 14.2 `POST /api/currency/grant`
- 서버 전용 (내부 호출)
- Body: `{ type, amount, reason }`

### 14.3 `POST /api/gacha/pull`
- Body: `{ bannerId, count: 1 | 10 }`
- 응답: `{ results: PullResult[], newBalance: UserCurrency, newGachaState: GachaState }`
- 실패: 재화 부족 시 402

### 14.4 `GET /api/gacha/history?limit=20`
- 응답: `{ history: GachaDrawRecord[] }`

### 14.5 `GET /api/spirits/list`
- 응답: `{ owned: UserSpirit[], masterData: SpiritMaster[] }`

### 14.6 `POST /api/spirits/[id]/bond`
- Body: `{ action: 'interact' | 'gift' }`
- 응답: `{ newXp, newLv, didLevelUp, bondDialogue? }`

### 14.7 `POST /api/spirits/[id]/unlock-backstory`
- Lv 5 확인 후 unlock 처리
- 응답: `{ backstoryFull, isEndingTriggered }`

### 14.8 `GET /api/room/placement`
- 응답: `RoomState`

### 14.9 `PUT /api/room/placement`
- Body: `RoomState`
- 응답: `{ ok: true }`

---

## 15. 파일 구조 (신규 + 수정)

```
src/
├── app/
│   ├── (app)/
│   │   ├── shop/                       [신규]
│   │   │   ├── page.tsx                상점 메인
│   │   │   ├── layout.tsx              
│   │   │   ├── gacha/page.tsx          뽑기 배너 리스트
│   │   │   ├── gacha/[bannerId]/page.tsx 배너 상세 + 뽑기
│   │   │   ├── subscription/page.tsx   구독 
│   │   │   └── cosmetics/page.tsx      꾸미기
│   │   ├── room/                       [신규]
│   │   │   └── page.tsx                마음의 방
│   │   ├── spirits/                    [신규]
│   │   │   ├── page.tsx                도감
│   │   │   └── [spiritId]/page.tsx     정령 상세
│   │   └── lounge/                     [삭제]
│   └── api/
│       ├── currency/                   [신규]
│       │   ├── balance/route.ts
│       │   └── grant/route.ts
│       ├── gacha/                      [신규]
│       │   ├── pull/route.ts
│       │   └── history/route.ts
│       ├── spirits/                    [신규]
│       │   ├── list/route.ts
│       │   └── [id]/
│       │       ├── bond/route.ts
│       │       └── unlock-backstory/route.ts
│       ├── room/                       [신규]
│       │   └── placement/route.ts
│       └── lounge/                     [삭제]
├── components/
│   ├── shop/                           [신규]
│   │   ├── ShopHeader.tsx              재화 표시
│   │   ├── GachaBannerCard.tsx
│   │   ├── GachaPullAnimation.tsx
│   │   ├── GachaResultModal.tsx
│   │   ├── SubscriptionCard.tsx
│   │   └── CosmeticItemCard.tsx
│   ├── spirits/                        [신규]
│   │   ├── SpiritCard.tsx
│   │   ├── SpiritDetailModal.tsx
│   │   ├── SpiritBondProgress.tsx
│   │   └── BackstoryReveal.tsx
│   ├── room/                           [신규]
│   │   ├── RoomCanvas.tsx
│   │   ├── SpriteLayer.tsx
│   │   ├── InteractionBubble.tsx
│   │   └── FurnitureEditor.tsx
│   └── lounge/                         [삭제]
├── engines/
│   ├── gacha/                          [신규]
│   │   ├── gacha-engine.ts             Pity/확률 계산
│   │   └── banner-config.ts
│   ├── spirits/                        [신규]
│   │   ├── spirit-abilities.ts         각 능력 구현
│   │   ├── bond-engine.ts              XP/Lv 계산
│   │   └── interaction-engine.ts       정령 간 대사
│   └── lounge/                         [삭제]
├── data/                               [신규]
│   ├── spirits.ts                      20마리 마스터
│   ├── backstories.ts                  백스토리
│   ├── bond-dialogues.ts               Lv 별 대사
│   ├── interactions.ts                 정령 간 상호작용
│   └── shop-items.ts                   가구/테마
├── lib/
│   └── stores/
│       ├── currency-store.ts           [신규]
│       ├── spirits-store.ts            [신규]
│       ├── room-store.ts               [신규]
│       └── lounge-store.ts             [삭제]
└── types/
    ├── spirit.types.ts                 [신규]
    ├── gacha.types.ts                  [신규]
    ├── currency.types.ts               [신규]
    └── room.types.ts                   [신규]
```

---

## 16. 구현 로드맵

### Phase 0 — 문서화 + 설계 (Day 0)
- [x] 이 마스터 플랜 작성

### Phase 1 — Foundation (Day 1~2)
1. **DB 마이그레이션** 적용 (`20260420_spirit_gacha_v83.sql`)
2. **타입 정의** (`src/types/spirit.types.ts`, 등 4개)
3. **정령 마스터 데이터 20마리** 하드코딩 (`src/data/spirits.ts`)
4. **백스토리, 대사, 상호작용 JSON**

### Phase 2 — 재화 시스템 (Day 3)
1. `user_currency` CRUD API
2. `currency-store.ts` (Zustand)
3. **기존 pipeline 에 grant hook 추가** (WARM_WRAP, 친밀도 레벨업 등)
4. 재화 표시 UI (`ShopHeader`)

### Phase 3 — 라운지 제거 (Day 4)
1. Navigation 에서 `/lounge` → `/shop` 링크 교체
2. `AppLayout` 에서 LoungeToast/Timer 제거
3. 모든 lounge 참조 import 제거
4. `/lounge/*` 파일 전체 삭제
5. 타입 체크로 잔존 참조 확인

### Phase 4 — 상점 탭 스캐폴드 (Day 5)
1. `/shop/page.tsx` 3 서브 탭 (뽑기/구독/꾸미기)
2. 각 서브 페이지 기본 UI
3. 재화 헤더 고정

### Phase 5 — 뽑기 엔진 (Day 6~7)
1. `gacha-engine.ts` 확률 계산
2. `/api/gacha/pull` POST
3. `/api/gacha/history`
4. 단뽑/10연차 로직
5. Pity 저장/읽기

### Phase 6 — 뽑기 UI (Day 8~9)
1. 배너 카드
2. **뽑기 애니메이션**:
   - 카드 뒷면 3~10장 등장
   - 서스펜스 회전
   - 희귀도별 이펙트 (UR: 무지개 빛, L: 폭발)
   - 중복 시 환전 표시
3. 결과 모달

### Phase 7 — 정령 상세 & 교감 (Day 10~11)
1. 정령 도감 페이지 (`/spirits`)
2. 정령 상세 (`/spirits/[id]`)
3. Lv 별 대사 표시
4. 교감 XP 막대 + 레벨업 연출
5. 백스토리 해금 조건

### Phase 8 — 마음의 방 (Day 12~14)
1. `RoomCanvas.tsx` 배경 + 배치 그리드
2. 정령 드래그 앤 드롭
3. Idle 애니메이션 (framer-motion)
4. 상호작용 말풍선 (5분 interval)
5. 가구 배치
6. PNG 캡처 공유

### Phase 9 — 정령 능력 Hook (Day 15~16)
1. `spirit-abilities.ts` 20개 능력 구현
2. pipeline/chat 에 Hook 삽입
3. 능력별 테스트

### Phase 10 — 메타 내러티브 (Day 17~18)
1. 백스토리 해금 플로우
2. 엔딩 조건 체크
3. 엔딩 시네마틱 컴포넌트

### Phase 11 — 구독/결제 (Day 19~20)
1. 별빛 패키지 구매 UI
2. 구독 관리 페이지
3. (실결제는 Phase 추후)

### Phase 12 — 검증 + 출시 (Day 21)
1. 타입 체크 완료
2. 주요 플로우 수동 테스트
3. 라운지 잔존 참조 확인

---

## 17. 검증

### 17.1 타입 체크
```bash
npx tsc --noEmit
```

### 17.2 주요 플로우 수동 테스트 체크리스트
- [ ] 로그인 → 재화 잔액 조회
- [ ] 상점 탭 진입 → 뽑기 배너 표시
- [ ] 💎 부족 시 뽑기 버튼 비활성화
- [ ] 단뽑 성공 → 새 정령 도감 추가
- [ ] 10연차 성공 → R 이상 최소 1마리 포함
- [ ] Pity 70 도달 시 UR 확정
- [ ] 중복 뽑기 → 💎 환전 확인
- [ ] 정령 상세 → 대사 Lv 별 확인
- [ ] 교감 XP 획득 → 레벨업 연출
- [ ] Lv 5 → 백스토리 해금 팝업
- [ ] 마음의 방 → 드래그 배치 저장
- [ ] 정령 간 상호작용 말풍선 뜨는지
- [ ] 방 PNG 공유
- [ ] WARM_WRAP 완결 → 💎 30 획득
- [ ] 친밀도 레벨업 → 💎 50 획득
- [ ] 일일 첫 로그인 → 💎 10
- [ ] 라운지 → 상점 전환 후 기존 링크 404 없음
- [ ] 정령 능력 (예: 👑 엘레나 배치 시 ACTION_PLAN 3회)

---

## 18. 리스크 & 완화

| 리스크 | 완화책 |
|---|---|
| 정령 일러스트 20장 에셋 부족 | 임시 이모지 + 단색 카드 → 추후 일러스트 교체 |
| 가챠 확률 버그 → 법적 이슈 | 단위 테스트로 확률 표 검증, 공개 |
| 라운지 제거 시 기존 유저 데이터 로스 | 마이그레이션 시 데이터 덤프 보존, 롤백 가능 |
| 과금 구현 복잡도 | Phase 11 분리. Phase 1~10 은 무료 재화만으로 돌아가게 |
| 성능: 정령 idle 애니 20개 | 배치된 15개만 애니, 나머지 정적 |

---

## 19. 향후 확장 (v84+)

- 한정 이벤트 배너 (계절/기념일)
- 친구 초대 시 정령 선물
- 정령 간 합성 (같은 정령 3마리 → 진화)
- Luna 의상 시스템
- 정령 랭킹 (친구 간 비교)
- 정령 퀘스트 (특정 상담 완료 시 보상)

---

**END OF PLAN**
총 분량 예상: ~30 A4 (폰트 10pt, 여백 포함).
