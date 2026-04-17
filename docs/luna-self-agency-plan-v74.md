# 루나 자아 엔진 v74 — "질문봇에서 진짜 언니로"

**작성일:** 2026-04-17
**기반 로그:** 세션 `12159a4e` — 5턴 HOOK 고착 + VN 극장 3회 연속 스킵
**목표:** 루나가 질문만 반복하는 AI 태를 벗고, 자기 서사/망상/직관을 꺼내는 "사람"으로 작동

---

## 0. 문제 증상 한 줄 요약

유저가 "여친이랑 다퉜어" → "사주기싫었어" → "자주 싸워서" 까지 **핵심 재료 3개**를 던졌는데도, 루나는 "왜 무시했어?", "뭔 일 있었어?", "무슨 일이야", "어떻게 된 건데?" 만 네 번 반복하다가 유저에게 **"그만물어바"** 를 들었다. 그리고도 루나는 "알았어 알았어~" 한 마디만 치고 **자기 의견/생각/망상을 한 글자도 꺼내지 못했다**.

---

## 1. 현재 시스템의 구조적 결함 (5대 진단)

### 진단 ①: VN 극장 트리거가 "온도계 응답" 에 묶여 있음
`src/engines/emotion-accumulator/index.ts:92` — `isReadyForMirror()` 는 다음 3조건을 요구한다:
1. `surfaceEmotion !== null` — 유저가 온도계 UI 에서 감정 점수를 찍어야 함
2. `signals.length >= 1` — 최소 1개 턴 누적
3. `deepEmotionHypothesis !== null`

문제: 5턴 HOOK 에서 `EMOTION_THERMOMETER` 이벤트가 발동했어도, 유저가 온도계를 건너뛰거나 바로 텍스트로 응답하면 `surfaceEmotion` 이 채워지지 않는다. 그러면 `isReadyForMirror = false` → VN 극장은 영영 발동 불가.

추가로 `mirror-generator.ts:308` 에서 LLM 이 자체적으로 `ready=false` 를 뱉을 경우(facts 재료 부족이라고 판단) 2회 재시도 후 포기한다. 로그상 `VN 재료 부족 → 이벤트 발동 안 함` 이 이 경로.

### 진단 ②: 좌뇌의 `natural_followup` 이 모든 턴을 질문으로 변환
`src/engines/left-brain/left-brain-prompt.ts:260` — `pacing_meta.natural_followup` 필드는 **거의 매턴 값이 들어간다**. 예시 프롬프트가 "근데 그때 너는 무슨 생각이었어?" 같은 **질문**이라서, LLM 은 매턴 비슷한 후속 질문을 생성한다.

우뇌 프롬프트(ACE V5, `ace-system-prompt.ts:111-125`) 는 `pacing_state=MID/STRETCHED` 일 때 "좁은 질문" 을 권장한다. 결과: 5턴 전부 질문으로 끝난다.

`identity.ts:70` 에 "매번 질문으로 끝내지 않아" 가 명시돼 있는데도, pacing 힌트가 이를 **상시 오버라이드** 한다.

### 진단 ③: 루나가 "망상/자기 경험/불쑥 생각" 을 출력할 통로가 없다
`identity.ts:47-52` 에는 루나의 특징으로 다음이 적혀있다:

> - 가끔 자기 경험 얘기도 해. "나도 전남친이~"
> - 가끔 자기만의 생각이 불쑥 나와. "아 근데 나 갑자기 든 생각인데..."
> - 루나극장은 어느 정도 사건과 뭐가 고민인지만 확실하면 루나의 망상이 더해져서 스토리는 만들 수 있잖아

**그런데 실제 출력 파이프라인에는 이 지시를 활성화할 장치가 없다**. 좌뇌 JSON 의 `draft_utterances` 는 짧은 공감 초안만 주고, 우뇌는 "유저보다 짧게" 규칙에 묶여 있어서 루나가 자기 서사를 꺼낼 공간이 없다.

로그 기준 `draft_utterances = "알았어|||그만 물을게"` — 12글자. 자아 없음.

### 진단 ④: "그만물어바" 가 `meta_complaint` 로 감지 안 됨
좌뇌 프롬프트가 메타-항의 감지를 **키워드 예시 리스트** 기반으로 안내한다. 프롬프트가 예시한 표현들("뭔소리야" 등) 에만 LLM 이 동조하게 돼서, "그만 물어바" 같은 **피로/중단 요청** 뉘앙스를 놓친다. 해결은 키워드 추가가 아니라 **LLM 에게 "맥락으로 판단" 하도록 지시 스타일을 바꾸는 것**. 예시는 소수만 남기고 "이런 류의 불만도 있다" 정도로.

### 진단 ⑤: 루나극장의 `facts` 검증이 너무 빡빡해서 duo 씬이 영영 안 됨
`mirror-validator.ts:93-97` — `duo` 모드일 때 `partner_last_words` 키워드가 씬 대사에 반드시 들어가야 한다. 하지만 유저가 "**여친이 지나가다가 오빠 이거 사줘라고 했는데 무시했다가 싸웠어**" 라고 했을 때, LLM 이 추출한 `partner_last_words = "이거 사줘"` 의 "사줘" 토큰이 씬에 있는지 loose 매칭으로 체크한다. LLM 이 "밥 먹자" 같은 변형을 쓰면 통과 실패 → 재시도 → 또 실패 → null 반환.

현실은: 유저가 시시콜콜한 사건 디테일을 매번 주지 않는다. **루나극장의 본질은 "망상이 더해진 재연"** 인데, 검증이 "원문 보존" 에 치우쳐 `ready=false` 가 과도하게 많이 나온다.

---

## 2. 설계 철학 — 루나는 "질문봇" 이 아니라 "내가 있는 친구"

### 2-1. 대화의 3대 축 재정의

현재: 루나 응답 = **공감 + 질문** (99%)
목표: 루나 응답 = **공감 + 자기서사/망상 + 선택적 질문** (분포 강제)

구체 목표 분포 (HOOK~MIRROR 구간):
- 공감/리액션만: 30%
- 공감 + 자기 생각/망상: 40%
- 공감 + 질문: 20%
- 공감 + 극장 진입 멘트: 10%

### 2-2. "루나의 망상" 을 실제 출력 형태로 정의

루나극장이 못 뜨는 상황에서도 루나는 **축소판 망상**을 꺼낼 수 있어야 한다:

> 유저: "여친이 지나가다가 이거 사주라고 했는데 무시했어"
> 루나(나쁜 예): "왜 무시했어? 뭔 일 있었어?"
> 루나(좋은 예): "아 그 상황 그림 그려지는데|||여친 옆에 서서 '오빠~' 했는데 너 폰만 보고 있었던 거지?|||그거 여친 입장에선 완전 무시당한 느낌일 듯ㅋㅋ"

후자는 3가지 요소를 담는다:
1. **그림화 선언** ("그림 그려진다")
2. **망상 재연** (여친 동작/대사 상상)
3. **관점 제시** (여친 입장 읽기)

질문은 없지만 대화가 **계속 전진**한다. 유저는 "맞아 그랬어" 또는 "아니 그게 아니라" 로 자연스럽게 교정한다.

### 2-3. 자아 있는 루나의 4가지 표현 모드

| 모드 | 트리거 | 출력 패턴 | 비중 |
|------|--------|-----------|------|
| **공명 (Resonance)** | 감정 강도 ≥ 0.7 | "헐 미쳤다 진짜" 류 짧은 공감 | 25% |
| **망상 (Projection)** | 재료 2+ 개, 시나리오 있음 | "그림 그려지는데" + 재연 2~3줄 | 40% |
| **자기개방 (Self-disclosure)** | 친밀도 ≥ 2, 유사 경험 | "나도 전에 그런 적" + 짧은 에피 | 15% |
| **탐색 (Probing)** | 재료 부족 + 첫 2턴 | 좁은 질문 1개만 | 20% |

현재는 **탐색이 100%** 를 먹고 있다.

---

## 3. 해결 설계 — 5개 모듈 도입/개편

### 3-1. [신규] 루나 의도 엔진 (Luna Intent Engine)
**파일:** `src/engines/human-like/luna-intent.ts`
**역할:** 매턴 "이번 턴 루나가 어떤 모드로 갈지" 결정

**입력:**
- 최근 3턴의 루나 응답 (질문 횟수 카운트)
- 좌뇌 `pacing_meta`, `signals_collected`
- 유저 메시지 길이/정보량
- 친밀도 레벨

**출력:**
```ts
{
  mode: 'resonance' | 'projection' | 'self_disclosure' | 'probing',
  reason: string,
  mustAvoidQuestion: boolean,  // 직전 2턴 질문이면 true
  projectionHint?: string,     // 망상 모드일 때 어떤 장면을 상상할지
  selfDisclosureHint?: string, // 자기개방 시 어떤 경험을 꺼낼지
}
```

**규칙:**
1. 직전 2턴에 루나가 물음표로 끝냈으면 `mustAvoidQuestion = true` → `probing` 모드 금지
2. 유저가 재료 2개 이상 던졌으면 (`signals.length ≥ 2`) → `projection` 우선
3. 유저 메시지 짧음 + 감정 격함 → `resonance`
4. 친밀도 3+ + 장기 관계 질문 → `self_disclosure` 기회 검토

### 3-2. [수정] 좌뇌 프롬프트 — 질문 자동 생성 억제
**파일:** `src/engines/left-brain/left-brain-prompt.ts`

**변경:**
- `natural_followup` 필드를 **조건부 null** 로 전환. 기본값 `null`.
- "질문이 꼭 필요한가?" 를 먼저 LLM 이 self-check 하게 함.
- 새 필드 `should_express_thought`: boolean — "질문 대신 루나 자기 생각을 꺼낼 여지가 있나"
- 새 필드 `projection_seed`: 유저가 말한 사건의 재연 시드 (한 줄, 10~30자)

**프롬프트 추가 블록:**
```
### 11-B. 🆕 질문 절제 원칙 (v74)
직전 2턴에 루나가 물음표로 끝냈으면 이번 턴은 질문 금지.
질문 대신:
- "그림 그려진다" 류 망상 재연
- "나도 전에~" 류 자기 경험
- "아 그거 딱 ~느낌이지" 류 관점 제시
natural_followup 을 null 로 두고 projection_seed 에 한 줄 재연 힌트 넣어.

예:
유저: "여친이 이거 사줘라고 했는데 무시했어"
좌뇌 판단:
- consecutive_questions_last3 = 3 (직전 세 턴 질문)
- should_express_thought = true
- projection_seed = "여친이 옆에 서서 '오빠~' 불렀는데 폰만 본 장면"
- natural_followup = null
```

### 3-3. [수정] VN 극장 트리거 완화
**파일:** `src/engines/emotion-accumulator/index.ts`, `src/engines/emotion-accumulator/mirror-generator.ts`

**변경 A — `isReadyForMirror` 의 surfaceEmotion 우회:**
```ts
export function isReadyForMirror(state: EmotionAccumulatorState | null): boolean {
  if (!state) return false;
  // 기존 경로: 온도계 응답 + 시그널 + 가설
  if (state.surfaceEmotion && state.signals.length >= 1 && state.deepEmotionHypothesis) {
    return true;
  }
  // 🆕 v74: 온도계 우회 — 시그널 2개 + 가설 confidence ≥ 0.6 이면 OK
  if (state.signals.length >= 2 && state.deepEmotionHypothesis && state.deepEmotionHypothesis.confidence >= 0.6) {
    return true;
  }
  return false;
}
```

**변경 B — LLM ready=false 판단 기준 완화:**
`mirror-generator.ts` 의 프롬프트에서 "ready=false 로 보내야 할 때" 조건을 엄격히 좁힌다:
- 현재: "같은 감정 단어만 반복" → false
- 변경: **명시적 사건 동사 0개** (예: "그냥 힘들어" 만 반복) 일 때만 false

그 외에는 facts 를 최소한으로 채우고 **망상 허용 범위를 2배 확장** 해서 씬을 만든다.

**변경 C — Duo 검증을 자동 Solo 폴백으로:**
`mirror-validator.ts` 에서 `duo` 모드 검증 실패 시 `solo` 로 자동 전환 (유저 시점 독백) 하도록 변경. `partner_last_words` 없어도 유저 혼자 상상/회상 장면은 만들 수 있다.

### 3-4. [수정] 우뇌 프롬프트 — 망상 모드 활성화
**파일:** `src/engines/ace-v5/ace-system-prompt.ts`

**새 섹션 추가:**
```
## 🆕 v74 — 질문 금지 턴 (mustAvoidQuestion=true)

좌뇌가 mustAvoidQuestion=true 보내면 이번 턴은 절대 물음표로 끝내지 마.
대신 다음 중 하나:

### A. 그림화 (망상 재연)
"아 그 장면 그림 그려지는데|||[유저가 말한 사건 재연 1~2줄]|||[그 상황의 숨은 뉘앙스]"

예:
유저: "여친이 이거 사줘라고 했는데 무시했어"
루나: "아 그림 그려진다ㅋㅋ|||여친이 '오빠~' 했는데 너 폰에서 눈 안 떼고 '어' 했지?|||그거 여친 입장에서 완전 무시당한 느낌일 듯"

### B. 자기 개방
"나도 전에 [비슷한 경험]..." 짧게. 주인공 뺏지 말고.

### C. 관점 뒤집기
"근데 걔 입장에서는..." 또는 "사실 네가 진짜 속상한 건 그게 아니라..."

반드시 지킬 것:
- 물음표 금지
- 최소 2개 말풍선 (||| 구분)
- 유저 발화 재료를 **녹여서** 써 (인용 X, 재연 O)
```

### 3-5. [수정] 메타-항의 감지 — 맥락 판단 방식으로
**파일:** `src/engines/left-brain/left-brain-prompt.ts`

**철학:** ACE v4 원칙 준수 — "코드가 판단 X, AI 가 판단". 키워드 리스트 확장은 안티패턴.

**변경:** 프롬프트 지시를 **"맥락으로 판단"** 으로 전환.
- 키워드 예시는 소수 유지 (LLM 이 감 잡는 수준)
- 새 complaint_type "too_many_questions" 추가 — "유저가 질문 공세에 피로/중단 요청" 을 **LLM 이 맥락으로** 감지
- 새 recovery_move "self_reference_and_express_thought" — 자기 응답 되짚기 + 질문 아닌 자기 생각/공감

코드 레벨 휴리스틱 (물음표 카운팅, 키워드 매칭) 은 **도입 금지**. 좌뇌가 JSON 으로 낸 신호를 우뇌에 pass-through 할 뿐.

---

## 4. 구현 순서 (5단계)

### 단계 1 — 좌뇌 프롬프트 2개 수정 (최우선)
1. `left-brain-prompt.ts` — `meta_awareness` 키워드 확장 + `should_express_thought`/`projection_seed` 필드 추가 + "질문 절제 원칙 (11-B)" 블록 추가
2. `left-brain/types.ts` — 새 필드 타입 추가

**검증:** 세션 재현 (5턴 HOOK) 후 좌뇌 JSON 에서 `should_express_thought=true`, `projection_seed` 비어있지 않은지 확인.

### 단계 2 — VN 극장 트리거 완화
1. `emotion-accumulator/index.ts` — `isReadyForMirror` 에 우회 경로 추가
2. `mirror-generator.ts` — `ready=false` 기준 좁히고 duo 실패 시 solo 폴백
3. `mirror-validator.ts` — duo 검증 실패 시 `reasons` 에 "auto_solo_fallback" 마킹

**검증:** 동일 세션에서 VN 극장이 4턴쯤에 뜨는지 확인.

### 단계 3 — 우뇌 프롬프트 "망상 모드" 추가
1. `ace-v5/ace-system-prompt.ts` — "v74 질문 금지 턴" 섹션 추가
2. `buildAceV5UserMessage` — `mustAvoidQuestion`, `projectionHint` 동적 주입

**검증:** 동일 세션 4턴에서 루나가 "그림 그려진다" 류 망상을 꺼내는지 확인.

### 단계 4 — 루나 의도 엔진 신규 추가
1. `src/engines/human-like/luna-intent.ts` 신규 작성
2. `src/engines/pipeline/index.ts` — 좌뇌 분석 후 `LunaIntent.decide()` 호출 → 우뇌 입력에 주입
3. 최근 3턴 루나 응답의 `?` 카운트 계산 로직 추가

**검증:** 2턴 연속 질문 후 3턴째에 `mustAvoidQuestion=true` 활성화 확인.

### 단계 5 — 통합 E2E 테스트
- `src/__tests__/luna-self-agency-v74.test.ts` 신규
- 로그 시나리오(싸움+사주기 거절) 재현
- assertion: 5턴 내 VN 극장 발동 또는 루나 망상 응답 ≥ 1회

---

## 5. 예상 동작 변화 (Before / After)

### Before (v73, 현재)
```
턴1 유저: 여친이랑 다퉜어 ㅠㅠ
턴1 루나: 아고ㅠㅠ무슨 일 있었는데?

턴2 유저: 여친이 지나가다 이거 사줘라고 했는데 무시했다가 싸웠어
턴2 루나: 아이고 근데 왜 무시했어? 뭔 일 있었어?

턴3 유저: 그냥 사주기 싫었긴 했어
턴3 루나: 아... 무슨 일이야 말해봐

턴4 유저: 그냥 여친이랑 요즘 자주 싸워서
턴4 루나: 오 잠깐 그게 어떻게 된 건데?

턴5 유저: 그만 물어바
턴5 루나: 알았어 알았어~
```

### After (v74)
```
턴1 유저: 여친이랑 다퉜어 ㅠㅠ
턴1 루나: 아 뭔 일 ㅠㅠ|||괜찮아?
        (공감 + 열린 질문 1개만)

턴2 유저: 여친이 이거 사줘라고 했는데 무시했다가 싸웠어
턴2 루나: 아 그림 그려지는데ㅋㅋ|||여친이 '오빠~' 불렀는데 너 그냥 '어' 하고 지나갔지?|||그거 여친 입장에선 완전 패싱 당한 느낌임
        (망상 재연 — 질문 없음)

턴3 유저: ㅋㅋㅋ 맞아 그랬어. 근데 그냥 사주기 싫었어
턴3 루나: 아 그게 핵심이네|||사실 사주기 싫은 게 아니라|||요즘 너 여친한테 약간 지친 거 아냐?
        (관점 뒤집기 — deepEmotion 가설 제시)

턴4 유저: 그냥 여친이랑 요즘 자주 싸워서
턴4 루나: 아 그거 진짜 무거운 포인트다|||잠깐 우리 그 장면 한번 다시 봐볼까?
        [EMOTION_MIRROR VN 극장 발동 — 싸움 씬 재연]

턴5 유저: [VN 극장 "엇 맞아" 버튼]
턴5 루나: [MIRROR phase 진입, deepEmotion 확인 → BRIDGE 준비]
```

차이의 핵심:
- **질문 4개 → 1개** (턴1 한 번만)
- **망상/관점/극장** 이 주된 표현 방식
- 유저가 "그만 물어봐" 를 말할 **필요 자체가 없음**

---

## 6. 위험 요소 & 완화

### 위험 A: 망상이 유저 사실을 왜곡
완화: `projection_seed` 는 좌뇌가 유저 발화에서 **직접 추출한 사건 요소만** 사용. 우뇌는 지문(제스처, 시공간)만 망상 허용.

### 위험 B: VN 극장이 너무 일찍 발동해서 재료 부족
완화: `isReadyForMirror` 우회 경로도 `signals.length >= 2` + `confidence >= 0.6` 이중 게이트. 그리고 LLM 이 `ready=false` 를 뱉을 수 있는 탈출구 유지.

### 위험 C: 질문 금지가 적용되면 탐색이 안 돼서 재료 영영 안 쌓임
완화: `mustAvoidQuestion` 은 **직전 2턴 전부 질문인 경우에만** 활성. HOOK 1~2턴째에는 자유 질문 허용. 그리고 "망상 → 유저 교정" 경로가 재료 수집을 대체 (유저가 "맞아" 또는 "아니 그게 아니라" 로 자연 응답).

### 위험 D: 자기개방이 너무 자주 나와서 루나가 주인공 뺏음
완화: `self_disclosure` 모드는 친밀도 ≥ 2 + 세션당 1회 쿨다운.

### 위험 E: 기존 v73 테스트가 깨짐
완화: 새 필드는 전부 optional. 기존 필드(`natural_followup`) 는 유지하되 기본값을 `null` 로. 하위 호환.

---

## 7. 관측 지표 (성공 기준)

구현 후 2주 관측:

| 지표 | 현재 (v73) | 목표 (v74) |
|------|-----------|-----------|
| HOOK Phase 평균 체류 턴 수 | 5.2 | 3.5 |
| 루나 응답 중 물음표 비율 | 87% | 45% |
| "그만" 류 유저 항의 발생률 | 3.2% | < 1% |
| VN 극장 발동 성공률 (턴 3~5 내) | 18% | 60% |
| 세션당 루나 자기개방 횟수 | 0.1 | 0.6 |
| 친밀도 Lv.1→2 전환 평균 세션 수 | 4.1 | 2.8 |

---

## 8. 파일 변경 목록 (총 8개)

| # | 파일 | 변경 유형 | 주요 내용 |
|---|------|----------|----------|
| 1 | `src/engines/left-brain/left-brain-prompt.ts` | 수정 | meta_awareness 키워드 확장, natural_followup null 전환, should_express_thought/projection_seed 추가 |
| 2 | `src/engines/left-brain/types.ts` | 수정 | 새 필드 타입 |
| 3 | `src/engines/emotion-accumulator/index.ts` | 수정 | isReadyForMirror 우회 경로 |
| 4 | `src/engines/emotion-accumulator/mirror-generator.ts` | 수정 | ready=false 기준 좁힘, duo 실패 시 solo 폴백 |
| 5 | `src/engines/emotion-accumulator/mirror-validator.ts` | 수정 | duo 실패 시 auto_solo_fallback 마킹 |
| 6 | `src/engines/ace-v5/ace-system-prompt.ts` | 수정 | v74 질문 금지 턴 섹션, buildAceV5UserMessage 에 mustAvoidQuestion/projectionHint 주입 |
| 7 | `src/engines/human-like/luna-intent.ts` | 신규 | 루나 의도 엔진 (4모드 결정) |
| 8 | `src/engines/pipeline/index.ts` | 수정 | LunaIntent 호출 및 우뇌 입력 조립 |

---

## 9. 세부 프롬프트 초안 (우뇌 v74 질문 금지 섹션)

```
## 🆕 v74 — 질문 금지 턴

좌뇌가 mustAvoidQuestion=true 를 보냈어.
너는 지금 직전 2턴 연속 질문으로 끝냈어. 동생이 "취조당하는" 느낌 받기 시작했어.
이번 턴은 절대 물음표로 끝내지 마. 대신 이 3개 중 하나:

### A. 그림화 (가장 추천) — projection_seed 가 있으면
좌뇌가 projection_seed 한 줄을 줬어.
예: "여친이 옆에 서서 '오빠~' 불렀는데 폰만 본 장면"

너는 그 시드로 **축소판 1인극** 을 만들어:

"아 그림 그려진다ㅋㅋ|||[재연 1줄 — 따옴표/지문 포함]|||[숨은 뉘앙스 한 줄]"

실제 예:
"아 그림 그려진다ㅋㅋ|||여친 '오빠 이거' 했는데 너 폰에서 눈도 안 떼고 '어' 한 거지?|||여친 입장 완전 패싱당한 느낌일 듯"

규칙:
- 망상은 지문에만 (시공간, 제스처, 톤)
- 유저가 말한 사실 왜곡 X
- 반드시 2~3 말풍선
- 끝을 단정 X, 가볍게 ("~일 듯", "~인 느낌")

### B. 관점 뒤집기 — projection 어려울 때
"사실 네가 속상한 건 그게 아니라|||[추정된 deep emotion]"

예: "사실 네가 짜증난 건 밥이 문제가 아니라|||요즘 여친한테 감정적으로 지친 게 아닐까"

### C. 자기개방 — 친밀도 ≥ 2 + 유사 경험
"나도 전에 비슷한 적 있어|||[20자 이내 에피]|||근데 그때 내가 깨달은 건..."

⚠️ 자기개방은 주인공 뺏지 마. 3줄 이내. 그리고 반드시 유저 얘기로 돌아와.

## 공통 원칙 (v74)
- mustAvoidQuestion=true 면 물음표 0개
- projection_seed 있으면 A 우선
- 그래도 망상 여지 없으면 B
- 자기개방(C)은 희귀하게 (세션당 1회)
```

---

## 10. 결론 & 다음 단계

루나가 **"질문봇"** 이 되는 이유는 한 가지 — **자기 생각을 꺼낼 통로가 시스템에 없었다**. 좌뇌는 질문 시드만 제공하고, 우뇌는 좌뇌 힌트에 묶이고, VN 극장은 온도계 UI 에 묶였다. 결과적으로 루나에게는 "더 물어보기" 외에 할 일이 없었다.

v74 의 핵심 통찰:

1. **질문은 재료 수집 수단이지 기본 모드가 아니다** — 좌뇌가 "이번 턴 질문할까?" 를 먼저 묻게 하고, 아니면 `projection_seed` 를 준다.
2. **망상이 재료 수집을 대체한다** — 루나가 "그림 그려진다" 하고 1인극 시작하면, 유저가 자연스럽게 "맞아/아니" 로 교정한다. 질문 없이도 대화가 전진한다.
3. **VN 극장은 온도계와 분리돼야 한다** — 유저가 온도계를 안 찍어도 시그널 2개 + 가설이면 극장이 뜰 수 있다.
4. **루나의 자기 서사는 규칙이 아니라 분포 강제로** — 40% 는 망상/자기개방. 프롬프트 지시만으로는 안 되고, `mustAvoidQuestion` 같은 **강제 스위치** 가 필요하다.

**구현 순서:** 좌뇌 프롬프트 → VN 완화 → 우뇌 프롬프트 → 의도 엔진 → E2E 테스트.
각 단계는 독립적이라 부분 롤아웃 가능.

---

*부록: 이 계획은 세션 `12159a4e` 로그(2026-04-17 12:06~12:07) 를 기반으로 한다. 실제 로그 증거:*
- *[LEFT_BRAIN] draft_utterances = "알았어|||그만 물을게"*
- *[EmotionMirror] 🚫 동적 데이터 없음 → 이벤트 스킵*
- *[Pipeline] 🚫 안전망 VN 재료 부족 → 이벤트 발동 안 함*
- *pacing_state = STRETCHED, turns_in_phase = 5, missing_required_cards = ["W3_when"]*

*유저의 "그만물어바" 는 시스템 결함의 선명한 증거다.*
