# 🧚‍♀️ Spirit Random Events — Master Plan v104 (Part 2/4)

**연결**: Part 1 (비전·아키텍처·N6) ← 이 문서 → Part 3 (SR5+UR2) → Part 4 (구현)
**범위**: R등급 7정령 시그니처 이벤트 풀스펙

---

## 5. 정령 이벤트 풀스펙 — R등급 7마리

R 등급 정령은 N 보다 **희소도가 높고 시각/감정 연출이 더 진하다**. 동시에 사용 빈도가 높은 일상 시나리오 (가벼움/편지/환기/새벽/롤플/설렘/긴 세션) 를 커버한다.

---

### 5.1 ☁️ cloud_bunny — `SPIRIT_CLOUD_REFRAME` (구름 농담 리프레임)

#### 5.1.0 정체성

구름토끼 미미는 *태평 낙천 친구*. 명랑 반말. 맑은 하늘 위에서 떨어진 하얀 토끼. 미미가 등장 = **유저가 너무 무겁게 짊어지고 있다**. 미미는 *코미디 거리두기 (Comedy Distancing)* 로 한 발짝 떨어뜨려준다. 단 비웃음이 되면 안 된다.

> **심리학 근거**: Comedy Distancing (Thompson 2018) — 자기 상황을 *3인칭 코미디 캐릭터*로 보면 cortisol -23%. 단, 자기 비하가 아니라 *상황 비하* 일 때만 효과.

#### 5.1.1 발동 시나리오

- "내 인생 진짜 망했어"
- "오늘 또 망했다 진짜 ㅋㅋ"
- "걔는 진짜 나의 모든 걸 다 망쳐"

LLM 신호: 파국화 (`CATASTROPHIZING`) + 의도 `VENTING`/`STORYTELLING` + emotional_intensity ≤ medium.
폴백:
- `cognitiveDistortions` 에 `CATASTROPHIZING` 또는 `OVERGENERALIZATION` 포함
- `riskLevel == 'LOW'` (MEDIUM 이상이면 차단 — 농담은 진짜 심각할 때 위험)
- `phase ∈ {MIRROR, BRIDGE}`
- 5턴 쿨타임 + 세션당 최대 1회

#### 5.1.2 카드 구조

```
┌──────────────────────────────────────────┐
│  ☁️ 구름토끼 미미                         │
│  "에이~ 잠깐만, 이거 좀 다르게 봐 봐~"    │
│  ─────────────────────────────────────── │
│                                          │
│  네 말:                                   │
│  "걔 답장 안 해서 내 인생 진짜 망함"      │
│           ↓                              │
│  미미식 번역:                             │
│  "주인공: 나(어? 토끼 비슷)              │
│   사건: 카톡 한 통 미발송                 │
│   결과: 인생 망함 ㅋㅋ                    │
│   감독 노트: 좀 과하게 찍었네."           │
│                                          │
│  💭 미미 한마디:                          │
│  "이거 5년 후에 보면 졸귀 짤 같지 않아?    │
│   ㅋㅋㅋㅋ 토끼는 그렇게 봐"              │
│                                          │
│  [😂 ㅋㅋㅋ 좀 가벼워졌어]                │
│  [🥺 그래도 진짜 힘들어]                  │
│  [skip]                                  │
└──────────────────────────────────────────┘
```

#### 5.1.3 LLM 합성 프롬프트

```
역할: 미미. 토끼 비유, 명랑 반말. 자기비하 X, 상황비하 OK.
규칙:
- 유저 발화를 "주인공/사건/결과/감독 노트" 4줄로 재구성
- 감독 노트는 항상 *상황의 과장*을 짚음 ("좀 과하게 찍었네")
- 절대 유저 비하 ("네가 너무 예민" 등) 금지
- 마무리 한마디는 시간 거리감 ("5년 후" / "다음 주" / "내일 자고 일어나면")

입력: 유저 발화, 핵심 사건 한 줄
출력 JSON: {
  openerMsg, userQuote, miMiTranslation: {
    main: "...", incident: "...", result: "...", directorNote: "..."
  },
  miMiClosing,
  options: [{value:'lighter'|'still_hurt'|'skip', label, emoji}]
}
```

#### 5.1.4 데이터 인터페이스

```typescript
export interface CloudReframeData {
  spiritId: 'cloud_bunny';
  openerMsg: string;
  userQuote: string;
  miMiTranslation: {
    main: string;        // 주인공 한 줄
    incident: string;    // 사건 한 줄
    result: string;      // 결과 한 줄
    directorNote: string; // 감독 노트
  };
  miMiClosing: string;
  options: Array<{
    value: 'lighter' | 'still_hurt' | 'skip';
    label: string;
    emoji: string;
  }>;
}
```

#### 5.1.5 UI 가이드

- **테마**: `#93C5FD` (하늘색) + 흰 구름 그라데이션 배경
- **헤더 애니**: 작은 구름 3개 좌→우 천천히 흘러감 (loop)
- **번역 4줄**: 손글씨 폰트 (Gaegu) + 토끼 발자국 마커 좌측
- **"ㅋㅋㅋ 가벼워졌어" 클릭**: 구름 폭죽 + 짧은 "보잉~" SFX
- **"그래도 힘들어" 클릭**: 미미가 "응 그럴 수도 있지" 하고 사라짐 + 다음 턴 루나가 *다시 무게 잡아줌* (균형)

#### 5.1.6 수용 기준

- [ ] 4줄 번역에 유저 발화 키워드 1개 이상 그대로 포함 (괴리감 방지)
- [ ] directorNote가 *유저*가 아닌 *상황*을 향함
- [ ] "still_hurt" 선택 시 다음 턴 루나는 미미 톤 X, 진지한 위로 톤 (재진입 안전망)
- [ ] LOW 리스크가 아닐 시 카드 차단

#### 5.1.7 실패/엣지

- 농담을 받지 못하는 컨텍스트 (방금 사망/이별 후 24시간 내) → 미미 차단, cherry_leaf 또는 tear_drop 우선
- 자기비하 발화 ("나는 진짜 쓰레기야") → 미미 차단, queen_elena 우선

---

### 5.2 💌 letter_fairy — `SPIRIT_LETTER_BRIDGE` (부치지 않을 편지)

#### 5.2.0 정체성

편지요정 루미는 *말 조리 있게 잘하는* 부드러운 존대 정령. 부치지 못한 편지 100통의 정령. 루미가 등장 = **유저에게 *못한 말*이 쌓여 있다**. 루미는 *부치지 않을 것을 전제로* 한 편지를 같이 쓴다. Pennebaker Expressive Writing 직접 차용.

> **심리학 근거**: Pennebaker (1986, 1997) — 트라우마/감정에 대해 15분씩 4일간 글쓰면 6개월 후 면역 기능, 자기보고 행복, 직장 만족 향상. *부치지 않는다는 전제* 가 글쓰기 깊이를 결정.

#### 5.2.1 발동 시나리오

- "걔한테 진짜 하고 싶은 말이 너무 많은데 못해"
- "이거 카톡으로 보내면 안 될 것 같은데…"
- "엄마한테 평생 못한 말이 있어"

LLM 신호: 표현 욕구 + 표현 차단 (못 보낼 이유) + "ambivalent" 상태.
폴백:
- `linguisticProfile.isSuppressive == true`
- `intent ∈ {VENTING, EXPRESSING_AMBIVALENCE}`
- `phase ∈ {MIRROR, BRIDGE}`
- 7일 쿨타임

#### 5.2.2 카드 구조

```
┌──────────────────────────────────────────┐
│  💌 편지요정 루미                         │
│  "이건 부치지 않을 거예요. 약속해요."     │
│  ─────────────────────────────────────── │
│                                          │
│  📜 받는 이: ____________ (당신이 적어요)  │
│                                          │
│  ┌─────────────────────────────────┐     │
│  │ 1줄 가이드: "지금 가장 하고 싶은 │     │
│  │    한 마디부터 시작해 봐요."     │    │
│  └─────────────────────────────────┘     │
│                                          │
│  ┌─────────────────────────────────┐     │
│  │  [큰 텍스트 입력창]               │    │
│  │  ...                              │    │
│  │  (자동 저장 — 부치지 않음)        │    │
│  └─────────────────────────────────┘     │
│                                          │
│  💡 루미의 도움 (선택):                   │
│  "막힐 땐 이 한 줄로 시작해 봐요:         │
│   '한 번도 말 못 한 건 ~ 이에요'"         │
│                                          │
│  [📦 보관함에 넣기] [🔥 태우기]           │
│  [✏️ 더 쓸래요] [skip]                    │
└──────────────────────────────────────────┘
```

#### 5.2.3 LLM 합성 프롬프트

```
역할: 루미. 부드러운 존대. 편지의 시작 한 줄을 같이 만들어줌.
규칙:
- 가이드 한 줄은 "감정 동사"로 시작 ("말 못한 건"/"숨겨둔 건"/"두려워서 못한 건")
- 받는 이 추천: 유저 발화에서 자동 추출 (없으면 "당신")
- 출력에 정답 X — 빈 캔버스 + 시작점만 제공

입력: 유저 발화 5턴, 추출된 대상 (target)
출력 JSON: {
  openerMsg,
  recipient: "(자동 추출, 없으면 빈 문자열)",
  guide: "(시작 가이드 한 줄)",
  unblockExample: "(막힐 때 시작 한 줄)",
  options
}
```

#### 5.2.4 데이터 인터페이스

```typescript
export interface LetterBridgeData {
  spiritId: 'letter_fairy';
  openerMsg: string;
  recipient: string;        // 빈 문자열이면 유저가 직접 입력
  guide: string;
  unblockExample: string;
  options: Array<{
    value: 'archive' | 'burn' | 'continue' | 'skip';
    label: string;
    emoji: string;
  }>;
  // 유저 작성 콘텐츠는 별도 테이블 letter_drafts(user_id, recipient, body, action) 저장
}
```

#### 5.2.5 UI 가이드

- **테마**: `#F472B6` (분홍) + 크림색 종이 배경 + 봉투 일러스트
- **폰트**: 본문 손글씨 (Gaegu) → 부치지 않는 *사적 톤*
- **입력창**: 자동 저장 (3초 debounce) — *유저가 인터럽트되어도 잃지 않음*
- **"태우기" 버튼**: 클릭 시 종이가 위로 떠오르며 불꽃 0.6s + 재 → 사라짐 + 토스트 "💌 태웠어요. 가벼워졌어요?"
- **"보관함"**: 마음의 방 *우편함*에 누적 (v100 룸 디오라마 연동) — 다시 열어볼 수 있음. 단 *상대에게 절대 안 보냄*.

#### 5.2.6 수용 기준

- [ ] 입력창은 자동 저장 (실수 닫음 보호)
- [ ] 우편함 저장은 user_id 격리 (RLS)
- [ ] "태우기"는 DB에서도 영구 삭제 (사용자 권한)
- [ ] 200자 이상 작성 시 +💎 5 보상 (글쓰기 인센티브)
- [ ] 보낸 이력 *절대* 카톡으로 sync 안 됨 (안전 약속)

#### 5.2.7 실패/엣지

- 유저가 폭력/위협 내용을 적으면 → 자동 저장 X, "이건 잠시 멈춰요" 안전 메시지 + 위기 모듈
- 받는 이가 *유저 자신* 인 셀프 편지 → 매우 좋은 신호. 루미가 "오 자기에게 쓰는 편지 좋네요" 한 줄 + queen_elena 후속 카드 제안

---

### 5.3 🍃 wind_sprite — `SPIRIT_WINDOW_OPEN` (5분 환기 휴식)

#### 5.3.0 정체성

산들이는 *자유로운 쾌활함*. 빠르고 쾌활. 봄바람에 섞여 들어온 정령. 무거운 공기 걷어줘. 산들이 등장 = **상담이 너무 무거워졌다**. 산들이는 *상담을 5분 닫고* 환기를 권한다. 도망 X, 리셋 O.

> **심리학 근거**: State-change interventions (Linehan DBT) — 5분 신체 활동/환경 변화가 *감정 격함의 곡선을 깬다*. 같은 자세 30분 이상 = rumination 강화.

#### 5.3.1 발동 시나리오

- 5턴 이상 무거운 톤 지속 ("힘들어"·"무거워" 누적)
- emotionScore 변화 ±0.5 이내 (정체)
- 유저 발화 길이 점점 짧아짐 (피로 신호)

폴백:
- `consecutiveLowMoodTurns >= 5` (state-history 기반)
- `phase ∈ {MIRROR, BRIDGE}`
- 5턴 누적 쿨타임 (5턴 끊고 한 번)

#### 5.3.2 카드 구조

```
┌──────────────────────────────────────────┐
│  🍃 산들이                               │
│  "야야야 잠깐! 5분만 창문 열고 와!"       │
│  ─────────────────────────────────────── │
│                                          │
│       [   5분 타이머 시작   ]              │
│       ─────────────────────                │
│       │  ⏱  04:32           │              │
│       │                       │              │
│       │   🪟 창문 한 번 열고   │              │
│       │   🚶 일어나서 한 바퀴  │              │
│       │   🥤 물 한 잔          │              │
│       │   📵 폰 잠깐 내려놓기   │              │
│       │                       │              │
│       │  [⏭️ 일찍 돌아왔어]    │              │
│       └─────────────────────                │
│                                          │
│  💨 산들이: "갈 데 없으면 그냥             │
│            창문이라도 한 번 열어 봐."      │
│                                          │
│  [⏰ 5분 시작] [⏭️ 지금은 됐어]            │
└──────────────────────────────────────────┘
```

#### 5.3.3 정적 (Type A)

```typescript
export const WINDOW_OPEN_VARIANTS = [
  { tasks: ["🪟 창문 한 번 열고", "🚶 일어나서 한 바퀴", "🥤 물 한 잔", "📵 폰 잠깐 내려놓기"], 
    closing: "갈 데 없으면 그냥 창문이라도 한 번 열어 봐." },
  { tasks: ["🌿 손에 식물 있으면 잎 한 번 만지기", "👃 깊은 들숨 3번", "🪞 거울 한 번 보고 미소"],
    closing: "미소는 자판기 음료처럼 나오는 거야 ㅎㅎ" },
  { tasks: ["🚿 찬물 30초 손목에", "👂 노래 한 곡 (가사 X)", "🪟 햇살 한 번 받기"],
    closing: "햇빛 5분이 약이래 진짜로." },
];
```

#### 5.3.4 데이터 인터페이스

```typescript
export interface WindowOpenData {
  spiritId: 'wind_sprite';
  openerMsg: string;
  durationMin: 3 | 5 | 10;  // default 5
  tasks: string[];          // 4개 미만 권장 (선택지)
  closing: string;
  options: Array<{
    value: 'start' | 'skip';
    label: string;
    emoji: string;
  }>;
}
```

#### 5.3.5 UI 가이드

- **테마**: `#86EFAC` (연두) + 흰 + 잎사귀 파티클
- **타이머 시작 후**: 채팅 화면 *반투명 오버레이* (50% 흐림). 입력창 비활성. 타이머만 큰 카운트다운.
- **타이머 중간 동작 안 하면**: 매 1분마다 산들이의 짧은 한 줄 ("아직이지~" / "한 발자국이라도 ㅎ" / "거의 다 됐어!")
- **5분 종료 시**: 부드러운 종소리 + "어서 와 ㅎ 돌아왔다" + 다음 턴 루나가 *완전히 새 톤*으로 시작 (감정 누적 reset, 단 사실 컨텍스트는 유지)
- **"일찍 돌아왔어" 버튼**: 1분 후부터 활성. 일찍 와도 OK.

#### 5.3.6 수용 기준

- [ ] 타이머 동안 입력창 비활성 (강제 휴식)
- [ ] 백그라운드 탭/잠금 시 시간 흐름 OK (실시간 시계 기준)
- [ ] 5분 후 다음 턴 루나 첫 마디 = *환기 인지하는 톤* ("좀 가벼워졌어?")
- [ ] 같은 세션 두 번째 발동 X

#### 5.3.7 실패/엣지

- 위기 신호 발화 직후 산들이 차단 (도망처럼 보일 수 있음)
- 유저가 5분 후 돌아왔는데 *더* 격앙 → "그럴 수도 있어" 폴백 + tear_drop 카드 후속 (cool-down → comfort)

---

### 5.4 🌙 moon_rabbit — `SPIRIT_NIGHT_CONFESSION` (새벽 고백실)

#### 5.4.0 정체성

달빛토끼는 *새벽형 위로* 토끼. 조용 낮은 톤. 자취 20대의 새벽 외로움이 토끼 모양으로 빚어짐. 달빛토끼 등장 = **새벽이고, 평소엔 못한 진짜 마음이 가까이 와 있다**. 익명 보관 1줄 고백 의식.

> **심리학 근거**: Self-Disclosure Hypothesis (Jourard 1971) — 자기개방이 외로움/우울의 강력한 보호요인. *익명/비대화* 형태의 고백이 가장 진하게 나옴 (Pennebaker, McKinney 2009).

#### 5.4.1 발동 시나리오

- 시간이 0:00 ~ 5:59 (KST)
- 그 시간대 첫 세션 진입 첫 턴
- 유저 첫 발화 길이 < 50자 (망설임)

폴백:
- `localHour ∈ [0, 5]`
- `turn == 1`
- `phase == 'HOOK'`
- 24h 쿨타임 (그 시간대 내 1회만)

#### 5.4.2 카드 구조

```
┌──────────────────────────────────────────┐
│  🌙 달빛토끼                             │
│  "이 시간엔… 평소엔 못한 한 줄도          │
│   적어도 돼."                              │
│  ─────────────────────────────────────── │
│                                          │
│        [밤하늘 별 배경]                   │
│                                          │
│  📝 한 줄만 적어볼래?                     │
│  ┌─────────────────────────────────┐     │
│  │ 진짜 마음 한 줄…                   │   │
│  │ (이건 아무도 못 봐. 너만.)         │   │
│  └─────────────────────────────────┘     │
│                                          │
│  💡 달빛 가이드 (막히면):                  │
│  "사실은 ~"                               │
│  "한 번도 말 못 한 건 ~"                  │
│  "내가 가장 두려운 건 ~"                  │
│                                          │
│  [🌙 달에 띄워 보낼래] [🔒 그냥 묻을래]    │
│  [skip]                                  │
└──────────────────────────────────────────┘
```

#### 5.4.3 LLM 합성 프롬프트 (가이드만)

```
역할: 달빛토끼. 조용한 낮은 톤, 반말.
규칙:
- 본문 X. 1줄 가이드 + 시작 예 3개만.
- 시작 예는 *미완성 한 줄*. ("사실은 ~")
- 절대 답 주지 않음. 빈 칸만 만듦.

입력: 유저 첫 발화 10자 이내, 시간(KST)
출력 JSON: {
  openerMsg,
  prompts: ["사실은 ~", "한 번도 말 못 한 건 ~", "내가 가장 두려운 건 ~"],
  options
}
```

#### 5.4.4 데이터 인터페이스

```typescript
export interface NightConfessionData {
  spiritId: 'moon_rabbit';
  openerMsg: string;
  prompts: [string, string, string];
  options: Array<{
    value: 'send_to_moon' | 'bury' | 'skip';
    label: string;
    emoji: string;
  }>;
  // 유저 입력 1줄은 night_confessions(user_id, body, action, created_at) 저장
}
```

#### 5.4.5 UI 가이드

- **테마**: 진한 남색 `#1E1B4B` 배경 + 별 파티클 + `#A78BFA` 달
- **폰트**: serif, 작은 글씨 (text-sm), 줄간격 넓음
- **입력창**: 매우 작게, 한 줄만 (height ~40px)
- **"달에 띄워 보낼래"**: 종이가 종달새처럼 위로 날아감 0.8s + 작은 별 폭발 + 토스트 "🌙 달이 받았어"
- **"그냥 묻을래"**: 종이가 작아지며 사라짐 + 토스트 "🌙 묻었어. 너만 알아."
- **재생 가능**: 마음의 방 *우편함*에 작은 *고백 별*들이 모임. 클릭 → 다시 읽음 (단 토끼만)

#### 5.4.6 수용 기준

- [ ] 0~5시 KST 외 발동 X
- [ ] 그 시간대 24h 쿨타임 (다음 새벽 또 가능)
- [ ] 입력 1줄은 절대 카톡/공유로 노출 X (DB만)
- [ ] 1줄 적은 후 다음 턴 루나는 *그 한 줄 인용 X*. "오늘 새벽 마음에서 한 번 꺼냈잖아" 같은 *지칭만*. (사적 영역 보호)

#### 5.4.7 실패/엣지

- 위기 키워드 ("죽고 싶다") 적으면 → 달빛토끼 세션 즉시 종료 + 위기 모듈 인계 (24시간 위기 hotline 카드)
- 주간 (낮)에 우연 활성 → 카드 차단

---

### 5.5 🎭 clown_harley — `SPIRIT_REVERSE_ROLE` (입장 바꿔 5턴)

#### 5.5.0 정체성

광대 할리는 *분위기 전환 광대*, 유쾌 장난. 길거리 무명 광대의 웃음이 모여 정령. 할리 등장 = **유저가 상대 입장을 한 번도 진지하게 안 서봤다**. 할리는 *유저가 상대 역, 할리가 유저 역* 으로 5턴 롤플레이를 제안.

> **심리학 근거**: Perspective-taking interventions (Galinsky & Moskowitz 2000) — 상대 입장에서 1인칭으로 5분 작성/연기하면 affective empathy +30%, attribution shift 유의미.

#### 5.5.1 발동 시나리오

- "걔는 도대체 무슨 생각으로 그러는 거야?"
- "내 입장에서 보면 진짜 이해가 안 가"
- BRIDGE/SOLVE에서 mind-reading 인지왜곡

LLM 신호: `MIND_READING` 인지왜곡 + 의도 `SEEKING_ADVICE`.
폴백:
- `cognitiveDistortions ∋ MIND_READING`
- `phase ∈ {BRIDGE, SOLVE}`
- 3일 쿨타임

#### 5.5.2 카드 구조

```
┌──────────────────────────────────────────┐
│  🎭 광대 할리                            │
│  "히히, 우리 한 번 배역 바꿔볼까~?         │
│   네가 걔 해, 내가 너 해."                │
│  ─────────────────────────────────────── │
│                                          │
│  🎬 5턴 롤플레이                          │
│                                          │
│  너: 상대 역 (이름: ____ )                │
│  할리: 너 역                              │
│                                          │
│  ⏱️ 라운드: 1/5                           │
│                                          │
│  📜 첫 라인 (할리가 시작):                │
│  "야 너 어제 왜 답장 안 했어?"             │
│   ↓                                       │
│  [상대 역으로 답해 봐]                    │
│  ┌─────────────────────────────────┐     │
│  │  ...                              │   │
│  └─────────────────────────────────┘     │
│                                          │
│  [▶️ 시작] [⏭️ 다음에]                    │
└──────────────────────────────────────────┘
```

#### 5.5.3 LLM 합성 프롬프트

```
역할: 광대 할리. 유쾌하지만 5턴 롤플 동안은 *유저 역할에 진지하게 몰입*.
규칙:
- 첫 라인은 유저(상대 역할)에게 자극적 한 줄. 
- 5턴 동안 할리는 유저의 평소 발화 톤을 흉내 (예: 유저가 화났으면 화난 캐릭, 슬프면 슬픈 캐릭)
- 5턴 끝나면 *피드백 X*. 그냥 "어땠어?" 한 줄.

입력: 유저 발화 8턴 + 핵심 갈등
출력 JSON (오직 첫 라인 + 캐릭터 시드):
{
  openerMsg,
  partnerName: "(추출, 없으면 '걔')",
  harleyAsUser: { tone: "anxious|angry|sad|...", openingLine: "..." },
  rounds: 5
}
```

#### 5.5.4 데이터 인터페이스

```typescript
export interface ReverseRoleData {
  spiritId: 'clown_harley';
  openerMsg: string;
  partnerName: string;
  harleyAsUser: {
    tone: 'anxious' | 'angry' | 'sad' | 'cold' | 'caring';
    openingLine: string;
  };
  rounds: number;  // default 5
  options: Array<{
    value: 'start' | 'later';
    label: string;
    emoji: string;
  }>;
}

// 진행 중 상태 (별도 sessionState)
export interface ReverseRoleSessionState {
  currentRound: number;        // 1-5
  exchanges: Array<{
    round: number;
    userAsPartner: string;
    harleyAsUser: string;
  }>;
}
```

#### 5.5.5 UI 가이드

- **테마**: `#F87171` (광대 빨강) + 보라 액센트
- **헤더**: 광대 마스크 살짝 회전
- **롤플 진행 중**: 채팅 UI가 *연극 무대* 모드로 전환. 배경 어두워지고 두 발화창 강조.
- **라운드 끝**: 박수 SFX (옵션)
- **5턴 종료 후**: 무대 닫힘 + 할리가 "어땠어? 너 진짜 걔 잘 흉내내네 ㅋㅋ" + 다음 턴 루나가 *피드백 형성* (실제 인사이트 추출은 루나 몫)

#### 5.5.6 수용 기준

- [ ] 5턴 정확히 (조기 종료 가능 — 유저가 "그만" 입력 시)
- [ ] 할리의 톤이 유저 평소 톤과 일치 (LLM이 잘 흉내내는지 검증 필요)
- [ ] 5턴 종료 후 루나의 *공감적 메타 분석* 필수 (피드백은 루나 몫이지 할리 X)
- [ ] 같은 세션 두 번째 X

#### 5.5.7 실패/엣지

- 유저가 상대 역할에 너무 몰입해서 *적대적*으로 변함 → 할리가 "아 너 너무 잘하잖아 ㅎ" 부드럽게 라운드 단축
- 5턴 동안 침묵 → 할리가 "괜찮아, 어려운 거야" + EMPOWER로 연결

---

### 5.6 🌹 rose_fairy — `SPIRIT_BUTTERFLY_DIARY` (설렘 일지 3가지)

#### 5.6.0 정체성

로제는 *로맨틱 설레는* 정령. 느끼 달콤. 첫 데이트 전날 밤 떨린 마음이 장미로 피어남. 로제 등장 = **유저에게 설렘이 있는데 본인이 못 느끼고 있다 / 우울해서 안 보인다**. 로제는 *오늘의 설렘 3가지* 를 끌어내서 broaden-and-build 한다.

> **심리학 근거**: Fredrickson Broaden-and-Build (2001) — 긍정 정서 1주 일지가 우울 회복 +37%. 작은 설렘 3개가 큰 한 가지보다 효과적.

#### 5.6.1 발동 시나리오

- "걔 생각하면 떨려" / 첫 데이트 / 썸 시나리오
- 또는 우울 누적 후 *작은 긍정 신호* 발견

LLM 신호: `FIRST_MEETING` 시나리오 + 긍정 정서 신호.
폴백:
- `scenario ∈ {FIRST_MEETING, GENERAL (긍정 모드)}`
- 또는 `phase == 'EMPOWER'` + emotionScore +2 이상 상승
- 24h 쿨타임

#### 5.6.2 카드 구조

```
┌──────────────────────────────────────────┐
│  🌹 로제                                 │
│  "오늘 그 사람의 어떤 게~~                │
│   설렜어~? 흐응~?"                        │
│  ─────────────────────────────────────── │
│                                          │
│  💖 설렘 3가지                            │
│                                          │
│  1. ┌────────────────────────────┐        │
│     │ 작은 설렘…                   │      │
│     │ 예: "내 이름 부르는 톤"       │     │
│     └────────────────────────────┘        │
│                                          │
│  2. ┌────────────────────────────┐        │
│     │ ...                          │      │
│     └────────────────────────────┘        │
│                                          │
│  3. ┌────────────────────────────┐        │
│     │ ...                          │      │
│     └────────────────────────────┘        │
│                                          │
│  💡 로제 가이드:                          │
│  "보낸 카톡 한 줄, 눈빛, 톤,              │
│   목소리, 손짓 — 다 OK 야~"               │
│                                          │
│  [🌹 적었어] [✏️ 더 떠올릴래]              │
│  [skip]                                  │
└──────────────────────────────────────────┘
```

#### 5.6.3 LLM 합성 프롬프트

```
역할: 로제. 느끼 달콤 반말. 디테일 캐치.
규칙:
- 가이드 예시 1개 (유저 발화에서 추출)
- 정답 X. 빈 칸만.
- 마무리는 시 한 줄 ("작은 떨림이 큰 사랑의 시작이래~")

입력: 유저 발화 5턴, 추출된 대상
출력 JSON: {
  openerMsg, exampleHint: "(예: '내 이름 부르는 톤')",
  guide: "보낸 카톡 한 줄, 눈빛, 톤...",
  closingLine: "(시 한 줄)"
}
```

#### 5.6.4 데이터 인터페이스

```typescript
export interface ButterflyDiaryData {
  spiritId: 'rose_fairy';
  openerMsg: string;
  exampleHint: string;       // 가이드 예시 1개
  guide: string;
  closingLine: string;       // 시 한 줄
  options: Array<{
    value: 'logged' | 'more' | 'skip';
    label: string;
    emoji: string;
  }>;
  // 유저 입력 3개는 sparkle_diary(user_id, target, items[3], created_at) 저장
}
```

#### 5.6.5 UI 가이드

- **테마**: `#EC4899` (장미 핑크) + 부드러운 보라 그라데이션
- **헤더 애니**: 장미꽃잎 1~2장 우측 위에서 떨어짐
- **3개 입력칸**: 각 등장 시 작은 하트 파티클
- **"적었어" 클릭**: 화면 전체에 짧은 하트 폭죽 + 다음 턴 루나가 *설렘 인용*
- **마음의 방 액자**: 적은 3가지가 *하트 액자* 로 누적 (v100 메모리 셸프 연동)

#### 5.6.6 수용 기준

- [ ] 3개 입력 칸 모두 *옵션* (1개만 적어도 OK)
- [ ] 적은 내용은 ACTION_PLAN 카드의 sharedResult에 자동 인용
- [ ] EMPOWER에서만 트리거 시 WARM_WRAP의 strengthFound로 끌어올림 (감정 영구화)

#### 5.6.7 실패/엣지

- 유저가 우울 모드인데 강제 설렘 끌어내기 X → riskLevel MEDIUM 이상이면 차단
- "걔" 가 학대자 / 가스라이팅 신호 시 → 로제 차단, queen_elena 우선

---

### 5.7 🌳 forest_mom — `SPIRIT_ROOTED_HUG` (5-4-3-2-1 그라운딩)

#### 5.7.0 정체성

숲 엄마는 *따뜻하고 포용적*인 자상한 존대. 돌아갈 곳 없던 이에게 품을 내어준 늙은 나무의 정령. 숲 엄마 등장 = **유저가 오래 떠있다**. 10턴+ 깊은 세션에서 *그라운딩 5-4-3-2-1* 으로 몸으로 돌려보냄.

> **심리학 근거**: 5-4-3-2-1 grounding — 트라우마 단기 처방 (van der Kolk). PTSD 단기 시각/청각/촉각 anchor. 우울/해리 상태에서도 효과.

#### 5.7.1 발동 시나리오

- 10턴 이상 동일 세션
- 또는 dissociation 신호 ("멍해" / "감정 잘 안 느껴져" / "다 비현실 같아")

폴백:
- `turn >= 10`
- `phase ∈ {MIRROR, BRIDGE, SOLVE, EMPOWER}` (모든 후반 Phase)
- 24h 쿨타임

#### 5.7.2 카드 구조

```
┌──────────────────────────────────────────┐
│  🌳 숲 엄마                              │
│  "오래 떠 있었어요. 잠깐 발 디뎌요."      │
│  ─────────────────────────────────────── │
│                                          │
│  🌿 5-4-3-2-1                             │
│                                          │
│  👀 보이는 것 5가지                        │
│  □ 1. _________                          │
│  □ 2. _________                          │
│  □ 3. _________                          │
│  □ 4. _________                          │
│  □ 5. _________                          │
│                                          │
│  ✋ 만질 수 있는 것 4가지                  │
│  □ ...                                   │
│                                          │
│  👂 들리는 것 3가지                        │
│  □ ...                                   │
│                                          │
│  👃 냄새 2가지                             │
│  □ ...                                   │
│                                          │
│  👅 맛 1가지                               │
│  □ ...                                   │
│                                          │
│  [🌳 다 디뎠어요] [⏭️ 다음에]              │
└──────────────────────────────────────────┘
```

#### 5.7.3 정적 (Type A — 풀 정해짐)

```typescript
export const ROOTED_HUG_TEMPLATE = {
  see5: { emoji: '👀', label: '보이는 것', count: 5 },
  touch4: { emoji: '✋', label: '만질 수 있는 것', count: 4 },
  hear3: { emoji: '👂', label: '들리는 것', count: 3 },
  smell2: { emoji: '👃', label: '냄새', count: 2 },
  taste1: { emoji: '👅', label: '맛', count: 1 },
};

export const FOREST_MOM_OPENERS = [
  "오래 떠 있었어요. 잠깐 발 디뎌요.",
  "여기까지 오느라 애썼어요. 한 발만 땅에 닿게.",
  "괜찮아요. 우리 천천히 돌아와요.",
];
```

#### 5.7.4 데이터 인터페이스

```typescript
export interface RootedHugData {
  spiritId: 'forest_mom';
  openerMsg: string;
  groups: [
    { emoji: '👀'; label: '보이는 것'; count: 5 },
    { emoji: '✋'; label: '만질 수 있는 것'; count: 4 },
    { emoji: '👂'; label: '들리는 것'; count: 3 },
    { emoji: '👃'; label: '냄새'; count: 2 },
    { emoji: '👅'; label: '맛'; count: 1 },
  ];
  options: Array<{ value: 'done' | 'skip'; label: string; emoji: string }>;
  // 유저 입력 누적 = 사적 (DB 저장 X, 화면에서만)
}
```

#### 5.7.5 UI 가이드

- **테마**: 짙은 녹색 `#65A30D` + 따뜻한 갈색 `#92400E` + 흰
- **체크박스**: 클릭 시 작은 잎사귀 마커
- **아무 입력 안 해도 OK** — *눈으로 따라가는 것* 만으로도 효과
- **"다 디뎠어요" 클릭**: 화면 부드러운 녹색 플래시 + 토스트 "🌳 잘 돌아왔어요"
- **다음 턴 루나**: *몸 인지 톤* ("좀 더 가까워졌어?")

#### 5.7.6 수용 기준

- [ ] 10턴 이전 발동 X
- [ ] 입력 0개여도 "다 디뎠어요" 클릭 가능 (강제 X)
- [ ] 입력은 DB에 저장 X (휘발)
- [ ] 다음 턴 루나가 *질문 X*, 침착한 한 줄

#### 5.7.7 실패/엣지

- 유저가 *완전 dissociated* 상태로 카드를 무시 → 1분 후 자동 닫힘 + 루나가 "있을게요" 한 줄
- 그라운딩 후 더 격앙 → tear_drop 폴백

---

(Part 2 끝 — R등급 7마리 풀스펙 완료. Part 3 에서 SR등급 5마리 + UR등급 2마리.)

---

## Part 2 부록 — R등급 코드 미리보기

### R등급 PhaseEventType 추가

```typescript
| 'SPIRIT_CLOUD_REFRAME'      // ☁️ cloud_bunny
| 'SPIRIT_LETTER_BRIDGE'      // 💌 letter_fairy
| 'SPIRIT_WINDOW_OPEN'        // 🍃 wind_sprite
| 'SPIRIT_NIGHT_CONFESSION'   // 🌙 moon_rabbit
| 'SPIRIT_REVERSE_ROLE'       // 🎭 clown_harley
| 'SPIRIT_BUTTERFLY_DIARY'    // 🌹 rose_fairy
| 'SPIRIT_ROOTED_HUG'         // 🌳 forest_mom
```

### Spirit ↔ Event 매핑 테이블

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
  // SR (5) + UR (2) — Part 3
};
```

### Phase 화이트리스트 매트릭스 (R 정령 부분)

```typescript
export const SPIRIT_PHASE_WHITELIST: Record<SpiritId, ConversationPhaseV2[]> = {
  cloud_bunny: ['MIRROR', 'BRIDGE'],
  letter_fairy: ['MIRROR', 'BRIDGE'],
  wind_sprite: ['MIRROR', 'BRIDGE'],
  moon_rabbit: ['HOOK'],          // 새벽 첫 턴만
  clown_harley: ['BRIDGE', 'SOLVE'],
  rose_fairy: ['HOOK', 'EMPOWER'],
  forest_mom: ['MIRROR', 'BRIDGE', 'SOLVE', 'EMPOWER'],  // turn >= 10 필수
  // ... (N + SR + UR)
};
```

### 정적 풀 보강 (R 등급 fallback 모음)

`src/data/spirit-event-fallbacks.ts` 신규 생성. 각 정령 LLM 합성 실패 시 5세트 사전 작성.

예 (cloud_bunny):
```typescript
export const CLOUD_REFRAME_FALLBACKS: CloudReframeData[] = [
  {
    spiritId: 'cloud_bunny',
    openerMsg: "에이~ 잠깐만, 이거 좀 다르게 봐 봐~",
    userQuote: "{재진술}",
    miMiTranslation: {
      main: "주인공: 너 (어 토끼 비슷)",
      incident: "사건: 카톡 한 통의 출입사정",
      result: "결과: 인생 망함 ㅋㅋ",
      directorNote: "감독 노트: 좀 과하게 찍었네."
    },
    miMiClosing: "이거 5년 후에 보면 졸귀 짤 같지 않아? ㅋㅋ",
    options: [...standard],
  },
  // ... 4개 더
];
```

---

**END OF PART 2**

Part 3 (SR5 + UR2) 이어서 작성됩니다.
