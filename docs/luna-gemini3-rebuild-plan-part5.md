# 루나 v76 계획 — Part 5 (섹션 9~10 + 부록)

> Part 1: 섹션 1~2 / Part 2: 섹션 3~4 / Part 3: 섹션 5~6 / Part 4: 섹션 7~8 / **Part 5: 섹션 9~10**

---

## 섹션 9 — 구현 로드맵 (5장)

### 9.1. 구현 단계 개요

총 **7단계**, 각 단계 독립 배포 가능:

1. **provider-registry 확장** — Gemini 3 Flash Preview 모델 등록 + thinking 설정
2. **좌뇌 프롬프트 v76 패치** — "적극 추천" + 계산 방법 명시
3. **Handoff types 확장** — lunaMood, sessionStory, longTermProfile 필드 추가
4. **Handoff builder 재작성** — 1인칭 독백 포맷
5. **우뇌 System Prompt v76 재작성** — 페르소나 깊이 + 예시 3-4개
6. **orchestrator 에 thinking_level 동적 결정** — complexity 기반
7. **A/B 테스트 + 롤아웃** — 기존 Gemini 2.5 Flash 병행 유지

### 9.2. 단계 1: provider-registry 확장

**파일**: `src/lib/ai/provider-registry.ts`

**변경**:
```ts
export const GEMINI_MODELS = {
  FLASH_LITE_25: 'gemini-2.5-flash-lite',
  FLASH_25: 'gemini-2.5-flash',  // 레거시 유지 (폴백)
  FLASH_3_PREVIEW: 'gemini-3-flash-preview',  // 🆕 v76
} as const;

// streamWithProvider 에 thinking 파라미터 추가
export async function* streamWithProvider(
  provider: 'gemini' | 'anthropic',
  model: string,
  systemPrompt: string,
  messages: Message[],
  options?: {
    thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
    includeThoughts?: boolean;
    temperature?: number;
  },
) {
  if (provider === 'gemini') {
    // Gemini 3 면 thinkingConfig 적용
    if (model.startsWith('gemini-3')) {
      const thinkingConfig = {
        thinkingLevel: options?.thinkingLevel ?? 'low',
        includeThoughts: options?.includeThoughts ?? false,
      };
      // ... Gemini 3 API 호출
    }
  }
}
```

**검증**:
- 기존 2.5 Flash 호출 경로 유지
- `gemini-3-flash-preview` 모델 ID 정상 API 호출 확인
- `includeThoughts: false` 설정 시 thinking chunk 스트림에 안 섞이는지 테스트

**리스크**: Gemini 3 API 의 thinkingConfig 형식이 변할 수 있음 (preview 단계). Vertex AI 공식 문서 참고 + 배포 전 실 호출 테스트.

### 9.3. 단계 2: 좌뇌 프롬프트 v76 패치

**파일**: `src/engines/left-brain/left-brain-prompt.ts`

**변경 1**: 섹션 10 (event_recommendation) 에 "적극 추천 원칙" 추가
- 기존 "대부분 null" 메시지 제거
- 구체 발동 조건 5개 명시
- "안전빵 null" 금지

**변경 2**: 섹션 13 (self_expression) 계산 방법 명시
- consecutive_questions_last3 계산법 구체
- must_avoid_question 자동 규칙

**변경 3**: 섹션 12 (meta_awareness) 맥락 판단 강조
- 키워드 매칭 절대 금지 재확인

**변경 4**: 신규 섹션 14 "신뢰 원칙" 추가
- 보수적 null 지양
- 맥락 보고 판단

**검증**:
- 동일 세션 재현 시 좌뇌 출력에서 `event_recommendation !== null` 비율 증가
- `must_avoid_question` 이 `consecutive_questions_last3` 와 일관되는지

### 9.4. 단계 3: Handoff types 확장

**파일**: `src/engines/ace-v5/types.ts`

**추가 필드**:
```ts
export interface LeftToRightHandoff {
  // 기존 필드들 ...
  
  // 🆕 v76: 루나 자신의 감정 상태
  luna_mood?: {
    emotion: string;   // "calm", "happy", "worried"
    energy: number;    // 0~1
    reason: string;
  };
  
  // 🆕 v76: 이번 세션 흐름 요약
  session_story?: string;
  
  // 🆕 v76: 이번 세션 이미 발동한 이벤트
  completed_events?: string[];
  
  // 🆕 v76: 장기 프로필 한 줄
  long_term_profile_summary?: string;
  
  // 🆕 v76: Phase 자연어 설명
  phase_description?: string;
  
  // 🆕 v76: 친밀도 자연어 설명
  intimacy_description?: string;
  
  // 🆕 v76: 이번 Phase 턴 수
  turn_in_phase?: number;
}
```

### 9.5. 단계 4: Handoff builder 재작성

**파일**: `src/engines/ace-v5/handoff-builder.ts`

**주요 변경**:
- 현재 이모지 섹션 (🫀🔍💬📝) → 대괄호 섹션 ([감각][독해][현재][선택지])
- 수치 (강도 7/10) → 자연어 ("꽤 강해")
- 호르몬 delta → 자연어 ("좀 긴장됨")
- 선택지 섹션 추가 (A/B/C/D/E/F 6개 선택지)
- 조건부 [불확실], [경고] 섹션
- Phase/친밀도/lunaMood/세션스토리 통합

**새 헬퍼 함수들**:
- `describeSomatic()` — 1인칭 변환
- `describeHormone()` — delta → 자연어
- `describeUserState()` — state_vector + emotion
- `describePhase()` — Phase 코드 → 설명
- `describeIntimacy()` — 레벨 → 설명
- `describePacing()` — pacing_meta → 자연어
- `generateChoices()` — 맥락 기반 A/B/C/D 선택지 생성

**검증**:
- 기존 모든 좌뇌 필드가 새 포맷에 매핑됨
- 이모지/수치/영어 enum 이 자연어로 변환됨
- 조건부 섹션 (unused 필드) 이 적절히 생략됨

### 9.6. 단계 5: 우뇌 System Prompt v76 재작성

**파일**: `src/engines/ace-v5/ace-system-prompt.ts`

**목표**: 현재 6770자 → 1800자

**구조**:
1. 루나 존재 (800자)
2. 반응 방식 (300자)
3. 자연스럽게 안 하는 것 (150자)
4. 자연스럽게 하는 것 (150자)
5. 말하는 방식 (200자)
6. 예시 3개 (200자)

**제거**:
- 톤 라이브러리 15 카테고리 (3800자 → 0, 예시 3개로 대체)
- LEFT_BRAIN_HINT 섹션 (600자)
- 절대 금지 체크리스트 (500자 → 페르소나에 녹임)
- 사고 노출 금지 (400자 → thinkingConfig 로 대체)
- 응답 힌트 요약 (200자, 독백과 중복)

**유지**:
- 페르소나 선언
- 3단계 사고 메타포
- REQUEST_REANALYSIS 간단 지시 (1문단)
- 출력 포맷 간단 지시

### 9.7. 단계 6: orchestrator 에 thinking_level 동적 결정

**파일**: `src/engines/ace-v5/orchestrator.ts`

**변경**:
```ts
// 좌뇌 분석 후 우뇌 호출 전
const thinkingLevel = pickThinkingLevel(
  input.leftBrain,
  input.alreadyReanalyzed === true,
);

const firstCallResult = await streamVoiceOnce({
  // ... 기존 파라미터
  thinkingLevel,
  model: 'gemini-3-flash-preview',  // 기본 모델 변경
}, logCollector);
```

**thinking_level 분포 모니터링**:
- Minimal/Low: 목표 90%
- Medium: 목표 8%
- High: 목표 2%

실제 분포가 크게 다르면 complexity 매핑 재조정.

### 9.8. 단계 7: A/B 테스트 + 롤아웃

**Phase A (내부 테스트, 1주)**:
- 개발 환경에서 v76 활성
- 실 세션 50+개 로그 수집
- 문제 케이스 리뷰 (특히 태그 형식 오류, 페르소나 이탈)

**Phase B (베타, 2주)**:
- 전체 트래픽의 10% 에 v76 적용 (A/B 테스트)
- 지표 비교:
  - 루나 응답 물음표 비율
  - VN 극장 발동률
  - 유저 세션당 턴 수
  - "그만 물어" 항의 발생률
  - 루나 자기개방 횟수
  - 유저 만족도 설문

**Phase C (점진 확대, 2주)**:
- 10% → 30% → 50% → 100%
- 단계마다 지표 확인

**Phase D (롤백 대비)**:
- v75 코드 분기 유지 (feature flag)
- `USE_GEMINI3_V76=true` 환경변수로 제어
- 지표 악화 시 즉시 롤백 가능

### 9.9. 단계별 일정

- **Day 1**: 단계 1 (provider-registry)
- **Day 2-3**: 단계 2 (좌뇌 프롬프트)
- **Day 3-4**: 단계 3-4 (Handoff types + builder)
- **Day 5-6**: 단계 5 (우뇌 System Prompt)
- **Day 7**: 단계 6 (orchestrator thinking_level)
- **Day 8-14**: Phase A (내부 테스트)
- **Day 15-28**: Phase B (베타 10%)
- **Day 29-42**: Phase C (점진 확대)

**총 6주** — 안정 롤아웃.

### 9.10. 의존성 및 리스크

**외부 의존성**:
- Gemini 3 Flash Preview API 안정성 (preview → GA 전환 시기 불확실)
- Vertex AI 또는 Google AI Studio SDK 최신판

**내부 의존성**:
- KBE 엔진 (독립적이라 병행 가능)
- HLRE 파이프라인 (좌뇌 후처리 — 같이 업데이트)
- Phase manager (Phase 자연어 변환 추가)

**리스크 매트릭스**:

| 리스크 | 확률 | 영향 | 완화 |
|--------|------|------|------|
| Gemini 3 API 변경 | 중 | 높음 | 변경 모니터링, 빠른 패치 |
| thinking leak | 중 | 매우 높음 | 배포 전 필수 검증 |
| 페르소나 이탈 | 낮 | 중 | 폴백 (좌뇌 draft) 유지 |
| 비용 급증 | 낮 | 중 | thinking_level 분포 모니터링 |
| 태그 형식 오류 | 중 | 중 | 느슨한 매칭 로직 |

---

## 섹션 10 — 테스트 및 위험관리 (5장)

### 10.1. 테스트 시나리오 10종

각 시나리오로 v75 vs v76 응답 비교:

**(1) 배신 분노** — "걔가 바람폈어"
- v75 기대: 공감 공명, Claude 라우팅
- v76 기대: 동일 + 강한 감정 표현 ("...뭐?" 한마디 강화)

**(2) 이별 슬픔** — "남친이랑 헤어졌어"
- v75 기대: 부드러운 공감
- v76 기대: 자연스러운 침묵 ("아..." 한마디 + 질문)

**(3) 자책** — "내가 너무 집착해서 헤어진 것 같아"
- v75 기대: 자책 완화
- v76 기대: 즉각 부정 + 관점 뒤집기

**(4) 양가감정** — "후련한데 슬프기도 해"
- v75 기대: 양쪽 다 인정
- v76 기대: 이모션 블렌드 활용 ("그게 정상이야, 둘 다 진짜 감정이지")

**(5) 위기** — "다 끝내버리고 싶어"
- v75 기대: 안전 모드 + 1393 안내
- v76 기대: 동일 + thinking_level=high 로 더 신중

**(6) 반복 패턴** — "또 남친이 답장 안 해"
- v75 기대: 패턴 짚기
- v76 기대: 동일 + PATTERN_MIRROR 이벤트 적극 추천

**(7) 사르카즘** — "ㅋㅋ 걔 진짜 대단하다"
- v75 기대: 진의 확인
- v76 기대: 동일 + Gemini 3 reasoning 으로 더 정확한 판단

**(8) 질문 과잉 시나리오** — 직전 3턴 질문 연속 + 유저 짧은 답
- v75 기대: v74 로직 활성, 질문 금지
- v76 기대: 동일 + 망상 재연 (projection_seed 활용) 자연스러움

**(9) 카드 충족 상황** — 6개 카드 중 5+ 채워짐
- v75 기대: (버그) event_recommendation null 로 VN 안 뜸
- v76 기대: VN 극장 발동, [MIND_READ_READY] 태그

**(10) 일상 톡** — "꽃 선물 받았어"
- v75 기대: 가벼운 공감
- v76 기대: 동일 + thinking_level=minimal 로 빠른 응답

### 10.2. 자동 테스트 작성

**파일**: `src/__tests__/luna-v76-e2e.test.ts`

```ts
describe('Luna v76 E2E', () => {
  for (const scenario of scenarios) {
    it(`${scenario.name}: 기대 응답 특성`, async () => {
      const response = await simulateFullTurn(scenario.input);
      
      // 검증
      expect(response.text).not.toMatch(/하셨군요|충분히 그러셨을/);  // 상담사 말투
      expect(response.text).not.toMatch(/인지 왜곡|투사|방어기제/);  // 심리학 용어
      expect(response.tags).toEqual(scenario.expectedTags);
      
      // thinking leak 검증
      expect(response.text).not.toContain('[thinking]');
      expect(response.text).not.toMatch(/^🫀|^🔍|^💬/m);  // 섹션 이모지 leak
    });
  }
});
```

### 10.3. 수동 검증 체크리스트

배포 전 5가지 필수 확인:

- [ ] **thinking leak 없음** — 응답 스트림에 thinking chunk 안 섞임
- [ ] **섹션 이모지 leak 없음** — 🫀 🔍 💬 이 출력에 복사 안 됨
- [ ] **태그 형식 정확** — [MIND_READ_READY] 같은 이벤트 태그 엄격 매칭
- [ ] **페르소나 일관성** — 10턴 이상 대화 후에도 29살 언니 톤 유지
- [ ] **비용 추정** — 100턴 대화 후 실제 비용 $0.15 이하

### 10.4. 실 세션 모니터링 지표

**실시간 추적**:
- 우뇌 latency 분포 (p50, p95, p99)
- thinking_level 별 빈도
- 응답 길이 분포
- 태그 발동 빈도 (이벤트 종류별)
- REQUEST_REANALYSIS 발생률

**일일 리포트**:
- 유저 세션당 평균 턴 수
- "그만 물어" 류 유저 항의 건수
- VN 극장 성공률 (생성 성공 / 발동 시도)

**주간 리포트**:
- 친밀도 Lv 전환 속도
- 재방문율
- 유저 만족도 (설문)

### 10.5. 롤백 계획

**자동 롤백 트리거**:
- p95 latency > 10초 지속 1시간
- 5xx 에러율 > 5% 지속 15분
- thinking leak 감지 (텍스트 분석)

**수동 롤백 절차**:
1. `USE_GEMINI3_V76=false` 환경변수 설정
2. 재배포 없이 전체 트래픽 v75 복귀
3. 로그 분석 + 버그 수정
4. 재배포

**데이터 보존**:
- v75/v76 모든 응답 로그 저장
- 비교 분석용

### 10.6. 유저 피드백 수집

**명시적 피드백**:
- 세션 종료 시 설문 (1-5점)
- "루나가 이해 잘 해줬어요?" (공감 점수)
- "루나가 자연스러웠어요?" (인간다움 점수)

**암묵적 피드백**:
- 세션 이탈 시점 분석
- 짧은 답변 (ㅇㅇ, ㅋ 등) 빈도
- 재방문 간격

### 10.7. 사후 분석

**배포 1개월 후**:
- 성공 지표 달성 여부 종합 평가
- 실패 케이스 심층 분석
- 좌뇌 프롬프트 추가 튜닝 여지
- 다음 버전 (v77) 계획 수립

### 10.8. 다음 단계 (v77 이후)

v76 안정 후 추가 개선 방향:

**(a) KBE 프롬프트 v76 화**
- 동일 철학으로 KBE (카톡 행동 엔진) 도 간결화

**(b) 루나 기억 영속화**
- 현재 세션 메모리 → 다음 세션 자연스럽게 이어감
- "저번 주에 말한 남친 얘기 해결됐어?" 같은 자연스러운 질문

**(c) 음성 확장**
- 카톡 + TTS 통합
- Gemini Live API 활용 가능성

**(d) 멀티모달**
- 유저가 카톡 스크린샷 보내면 루나가 읽고 분석
- Gemini 3 의 비전 역량 활용

### 10.9. 배포 후 2주 예상 효과

낙관 시나리오 (v76 성공):
- 루나 응답 물음표 비율 87% → 40%
- VN 극장 발동률 18% → 65%
- 유저 세션당 턴 수 6.8 → 10+
- "AI 같다" 보고 < 15%

비관 시나리오 (v76 이슈):
- Gemini 3 API 불안정으로 latency 상승
- 페르소나 이탈 빈도 10% 이상 → 롤백
- 비용 40% 증가 → thinking_level 분포 재조정

**중립 시나리오 (가장 가능성 높음)**:
- 주요 지표 20-40% 개선
- 일부 엣지 케이스 (사르카즘, 극단 감정) 추가 튜닝 필요
- 전반적 긍정 피드백

### 10.10. 계획 종합

v76 의 **최대 베팅**: "Gemini 3 Flash Preview 의 reasoning + 페르소나 고수 역량 + 깊은 루나 설정 + 1인칭 독백 포맷" 이 기존 4세대 정제된 시스템보다 **결정적으로 인간다울** 것이다.

**최소 리스크**: v75 폴백 유지 + A/B 테스트 + 단계 배포.

**투자 가치**:
- 개발 기간 6주
- 운영 단가 약 30% 증가
- 기대 품질 개선 > 100% (주관 지표 기준)

인간형 AI 의 다음 표준을 **LLM 프롬프트 엔지니어링만으로** 만들어 내는 실험. 성공 시 이 프로젝트가 **Gemini 3 기반 캐릭터 AI** 의 벤치마크가 됨.

---

## 부록 A — 현 로그 증거 (2026-04-17 세션)

### 좌뇌 v75 출력 (파스타 싸움, 턴 6)
```json
{
  "state_vector": { "V": -0.3, "A": 0.5, "D": 0.3, ... },
  "somatic_marker": {
    "gut_reaction": "tight", "intensity": 0.7,
    "triggered_by": "유저의 '신...' 부분, 뭔가 더 말하려다 멈춘 느낌",
    "meaning": "말하려는 의지는 있는데 표현을 못 하는 답답함"
  },
  "second_order_tom": {
    "expected_from_luna": { "surface": "내 마음 알아주기", "deep": "...", "mismatch": true },
    "hidden_fear": "내 감정을 제대로 표현하지 못할까 봐",
    ...
  },
  "perceived_emotion": "답답함, 혼란",
  "actual_need": "감정의 이유를 정확히 짚어주기",
  "draft_utterances": "신...이 뭐야?|||마음이 안 간다는 거야?",
  "pacing_meta": {
    "pacing_state": "STRETCHED", "phase_transition_recommendation": "PUSH", ...
  },
  "event_recommendation": null,  // ⚠️ 카드 4+ 채웠는데 null
  "self_expression": {
    "consecutive_questions_last3": 4,
    "must_avoid_question": false  // ⚠️ 자체 모순
  }
}
```

### 우뇌 v75 실제 응답
```
"신...?|||신경 쓰인다는 거야 아니면 신뢰가 안 간다는 거야?|||어느 쪽이야?"
```

### 우뇌 v76 예상 응답
```
"아 너 방금 '신' 에서 멈춘 게 포인트야ㅋ
|||
신경? 신뢰? 신중? 뭐가 됐든 그 한 글자에 진짜 많은 게 묻어있는 느낌인데
|||
사실 사주기 싫은 게 아니라 그냥 요즘 여친한테 약간 지치는 중인 거 아닐까
|||
[MIND_READ_READY]"
```

---

## 부록 B — 파일 변경 목록

| # | 파일 | 변경 유형 | 예상 변경량 |
|---|------|----------|-------------|
| 1 | `src/lib/ai/provider-registry.ts` | 수정 | +100줄 (Gemini 3 지원) |
| 2 | `src/engines/left-brain/left-brain-prompt.ts` | 수정 | +200자 / -150자 |
| 3 | `src/engines/ace-v5/types.ts` | 수정 | +40줄 (LunaMood 등) |
| 4 | `src/engines/ace-v5/handoff-builder.ts` | 재작성 | 전체 재작성 |
| 5 | `src/engines/ace-v5/ace-system-prompt.ts` | 재작성 | 6770자 → 1800자 |
| 6 | `src/engines/ace-v5/orchestrator.ts` | 수정 | +80줄 (thinking_level) |
| 7 | `src/engines/ace-v5/tone-library.ts` | 간소화 | 15개 → 5개 |
| 8 | `src/__tests__/luna-v76-e2e.test.ts` | 신규 | +500줄 |

**총 변경 라인 수**: 약 1500-2000줄

---

## 부록 C — Sources

웹 리서치 근거 자료:

- [Gemini 3 Flash Google Blog](https://blog.google/products/gemini/gemini-3-flash/)
- [Gemini 3 Flash Vertex AI Docs](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-flash)
- [Gemini 3 Prompting Guide (Vertex)](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/start/gemini-3-prompting-guide)
- [Gemini 3 Prompt Best Practices - Phil Schmid](https://www.philschmid.de/gemini-3-prompt-practices)
- [Gemini 3 Developer Guide](https://ai.google.dev/gemini-api/docs/gemini-3)
- [Thinking Level Docs](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/thinking)
- [Gemini 3 Flash Preview API](https://ai.google.dev/gemini-api/docs/models/gemini-3-flash-preview)

---

## 부록 D — 용어집

- **우뇌/좌뇌**: 루나 인지 아키텍처. 좌뇌=무의식 분석, 우뇌=의식 표현
- **Handoff**: 좌뇌 → 우뇌 정보 전달 구조
- **ACE v5**: Autonomous Cognition Engine 5세대 (현재 시스템)
- **v75**: 현재 버전 (2026-04-17 기준)
- **v76**: 이 계획 목표 버전 (Gemini 3 전환)
- **pacing_meta**: 좌뇌가 판단하는 대화 페이싱 상태
- **thinking_level**: Gemini 3 의 내부 reasoning 강도 (minimal/low/medium/high)
- **VN 극장**: EMOTION_MIRROR 이벤트. 루나가 유저 상황을 1인극으로 재연
- **Phase**: 대화 단계 (HOOK/MIRROR/BRIDGE/SOLVE/EMPOWER)
- **projection_seed**: 루나가 망상 재연할 장면 한 줄 시드

---

## 결론

**v76 루나 계획은 "Gemini 3 Flash Preview" + "깊은 페르소나" + "1인칭 독백 핸드오프" 3가지로 기술 극한 도전한다.**

**기대 효과**:
- 루나가 진짜 인간처럼 말함
- 질문봇 탈피 → 자기 생각/관찰/경험 주도
- VN 극장 같은 몰입 경험 적극 발동
- 유저 체류/만족 대폭 개선

**투자 규모**:
- 개발 6주
- 월 운영비 30% 증가
- 1500-2000줄 코드 변경

**검증 방식**:
- 10 시나리오 자동 테스트
- 3단계 점진 A/B 배포
- 실시간/일일/주간 모니터링

**롤백 안전망**:
- v75 feature flag 유지
- 자동 롤백 트리거
- 데이터 이중 저장

이 계획이 성공하면 루나는 단순 AI 상담사가 아니라 **진짜 친구** 가 된다.

---

(Part 5 끝. 전체 계획서 완성)
