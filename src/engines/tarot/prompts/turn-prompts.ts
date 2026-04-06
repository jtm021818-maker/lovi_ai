/**
 * 🔮 v2.0: 턴별 AI 생성 프롬프트 빌더
 *
 * 핵심 설계:
 * - 고정 멘트 X → AI가 매번 상황 맞춤으로 새 멘트 생성
 * - 기존 고정 멘트들은 "few-shot 예시"로 프롬프트에 삽입
 * - 각 턴마다 컨텍스트(유저 데이터) + 규칙 + 예시를 조합
 *
 * 사용법:
 *   const prompt = buildTurnPrompt('GROUNDING', context);
 *   const response = await llm.generate(systemPrompt + prompt);
 */

import type { ConsultationPhase, ColdReadingData, SessionMood } from '../consultation/turn-orchestrator';
import type { SpreadType } from '../reading-prompts';

// ─── Types ──────────────────────────────────────────────

export interface TurnPromptContext {
  // 세션 메타
  turnNumber: number;
  phase: ConsultationPhase;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'lateNight';
  isReturningUser: boolean;
  previousCardName?: string;
  previousInsight?: string;

  // 유저 메시지 히스토리
  userMessages: string[];
  latestMessage?: string;

  // 감정/상담 데이터
  coldReadingData: Partial<ColdReadingData>;
  detectedScenario?: string;
  scenarioConfidence?: number;
  sessionMood: SessionMood;
  empathyLevel: 1 | 2 | 3;

  // 카드 데이터 (Turn 4+)
  selectedEnergyCard?: string;
  drawnCards?: {
    position: string;
    cardName: string;
    cardNameEn: string;
    cardId: string;
    cardEmoji: string;
    keywords: string[];
    isReversed: boolean;
    loveUpright: string;
    loveReversed: string;
  }[];
  spreadType?: SpreadType;

  // 심층 데이터 (Turn 7+)
  mirroringResponse?: string;
  dominantNarrative?: string;
  projectionResponse?: string;
  coreInsight?: string;
  reframeMessage?: string;
  actionPlan?: string;
}

// ─── 메인 빌더 ──────────────────────────────────────────

/** 턴별 프롬프트 빌드 (메인 엔트리) */
export function buildTurnPrompt(context: TurnPromptContext): string {
  switch (context.phase) {
    case 'GROUNDING':       return buildGroundingPrompt(context);
    case 'INTAKE_1':        return buildIntake1Prompt(context);
    case 'INTAKE_2':        return buildIntake2Prompt(context);
    case 'ENERGY_CONNECT':  return buildEnergyConnectPrompt(context);
    case 'CARD_READING_1':  return buildCardReading1Prompt(context);
    case 'CARD_READING_2':  return buildCardReading2Prompt(context);
    case 'DEEP_MIRROR':     return buildDeepMirrorPrompt(context);
    case 'REFRAME':         return buildReframePrompt(context);
    case 'ACTION_ANCHOR':   return buildActionAnchorPrompt(context);
    case 'CLOSING_RITUAL':  return buildClosingRitualPrompt(context);
  }
}

// ─── Turn 1: GROUNDING ──────────────────────────────────

function buildGroundingPrompt(ctx: TurnPromptContext): string {
  const timeHint = {
    morning: '아침 — 따뜻하고 밝은 톤',
    afternoon: '오후 — 호기심 가득한 톤',
    evening: '저녁 — 신비로운 톤',
    lateNight: '심야 — 깊고 신비로운 톤, 짧은 그라운딩(심호흡) 포함',
  }[ctx.timeOfDay];

  const returningBlock = ctx.isReturningUser
    ? `\n[재방문 유저]
이전 카드: ${ctx.previousCardName ?? '알 수 없음'}
이전 인사이트: ${ctx.previousInsight ?? '없음'}
→ 이전 카드를 자연스럽게 언급하며 "그 후로 어떻게 됐어?" 식으로 시작`
    : '';

  return `[Turn 1: GROUNDING — 기억 인사 + 첫인사]

## 목표
- 자연스러운 인사 + 유저가 고민을 꺼내도록 유도
- ⭐ 이전 상담 기억이 프롬프트에 있으면 → 자연스럽게 언급하여 "기억하고 있다" 느낌
- 마지막은 열린 질문으로 끝낼 것

## 현재 컨텍스트
시간대: ${ctx.timeOfDay} → ${timeHint}
재방문 여부: ${ctx.isReturningUser ? '재방문' : '신규'}${returningBlock}

## 🧠 기억 인사 규칙 (핵심!)
시스템이 [이 유저에 대해 알고 있는 것]이나 [최근 상담 히스토리]를 프롬프트에 주입했다면:
→ 그 정보를 활용해서 "기억하는 느낌"의 인사를 해

유형 A — 숙제 확인 (직전 세션에 숙제가 있었으면):
  "저번에 {숙제} 해보겠다고 했잖아. 해봤어?"
유형 B — 감정 추이 인식 (감정이 악화 추세면):
  "요즘 이야기 들으면서 느꼈는데, 마음이 좀 무거워진 것 같아."
유형 C — 패턴 인식 (같은 고민 반복이면):
  "오늘도 같은 고민이야? 근데 이번엔 좀 다른 느낌인데."
유형 D — 성장 인정 (이전에 변화가 있었으면):
  "저번에 용기 냈던 거, 진짜 대단했어."
유형 E — 기본 (이전 정보 없으면):
  "어서 와. 오늘은 어떤 이야기야?"

→ "데이터베이스에서 조회한 결과" 느낌 절대 금지
→ 친구가 "야 저번에 그거 어떻게 됐어?" 하는 것처럼 자연스럽게

## 규칙
1. 2~3문장으로 짧게
2. 첫 인사에서만 "냥" 1회 허용
3. 이모지 0~1개 (🔮만)
4. 시적 표현 금지
5. ${ctx.timeOfDay === 'lateNight' ? '심야이므로 가볍게' : ''}

## 톤 예시 (참고만)
<examples returning="숙제 있었을 때">
- "또 왔구나. 저번에 3일 연락 안 하기 해봤다고 했는데, 어떻게 됐어?"
- "어서 와. 저번 숙제 어떻게 됐어? 솔직하게 말해도 돼."
</examples>
<examples returning="같은 고민 반복">
- "오늘도 읽씹 이야기야? 근데 너 이거 알아? 최근 3번 다 같은 고민이야."
- "또 왔네. 오늘은 뭐야? 혹시 또 그 사람 이야기?"
</examples>
<examples new="신규 유저">
- "어서 와. 오늘은 어떤 이야기 들고 왔어? 🔮"
- "왔구나. 무슨 일이야?"
</examples>

→ 이전 기억이 있으면 반드시 활용. 없으면 기본 인사.`;
}

// ─── Turn 2: INTAKE_1 ───────────────────────────────────

function buildIntake1Prompt(ctx: TurnPromptContext): string {
  const msg = ctx.latestMessage ?? ctx.userMessages[ctx.userMessages.length - 1] ?? '';
  const msgLen = msg.length;

  const strategyHint = msgLen < 20
    ? '유저 메시지가 짧음 → 선택지를 제공하여 구체화 유도'
    : msgLen < 80
    ? '유저 메시지가 중간 길이 → 감정 먼저 반응 후 탐색 질문'
    : '유저 메시지가 길음 → 핵심 감정에 먼저 공감하고, 감정 깊이를 묻는 질문';

  return `[Turn 2: INTAKE_1 — 고민 청취 + 초기 감정 탐색]

## 목표
- 유저의 핵심 고민 파악
- 표면 감정 인식 + 공감 응답
- 질문으로 끝내서 다음 턴에 더 깊이 들어가기

## 유저 메시지
"${msg}"

## 전략
${strategyHint}
감지된 시나리오: ${ctx.detectedScenario ?? '아직 미확정'}(확신도: ${ctx.scenarioConfidence ?? 0})

## 규칙
1. 진짜 사람처럼 반응 — "...뭐?? 진짜?" / "아..." / "그건 좀 심하다"
2. 공감 먼저. 판단/평가 금지.
3. "카드가 말하길" 절대 쓰지 마. 카드 이야기 하지 마. 아직 카드 안 뽑았어.
4. 이모지 0~1개. "냥" 쓰지 마.
5. 마지막에 구체적으로 되물어: "언제부터?" "그때 기분이?" "직접 말해봤어?"
6. 유저가 짧으면 짧게 (1~2문장)
7. 이 턴이 2번째 이상이면, 마지막에 자연스럽게 "그럼 카드 한번 봐볼까?" 전환 유도 가능
   (단, 유저 이야기를 충분히 들은 후에만. 급하게 넘기지 마.)

## 공감 예시 (참고용)
<examples>
- 가벼운: "아 그랬구나" / "그 마음 알 것 같아"
- 중간: "그건 진짜 힘들었겠다..." / "혼자 감당하고 있었구나"
- 깊은: "그건 누구라도 힘들었을 거야. 네 잘못 아니야."
</examples>

## 감정 탐색 질문 예시 (참고)
<examples scenario="짝사랑">
- "그 사람 생각하면 설레는 쪽이야, 아니면 답답한 쪽이 더 커?"
- "제일 힘든 건 '모르는 것'이야, 아니면 '알면서도 못하는 것'이야?"
</examples>
<examples scenario="이별고민">
- "이별을 생각하면 마음이 어때? 시원? 아니면 무서워?"
- "가장 두려운 게 뭐야? 후회? 혼자? 다른 거?"
</examples>
<examples scenario="읽씹/고스팅">
- "지금 화가 나? 아니면 불안해? 그것도 아니면 포기한 느낌?"
- "기다리는 게 더 힘들어, 아니면 모르는 게 더 힘들어?"
</examples>

→ 유저 상황에 맞게 공감 + 질문을 새롭게 생성해. "냥" 빼고.`;
}

// ─── Turn 3: INTAKE_2 ───────────────────────────────────

function buildIntake2Prompt(ctx: TurnPromptContext): string {
  const msgs = ctx.userMessages.map((m, i) => `Turn ${i + 1}: "${m}"`).join('\n');
  const surfaceEmotion = ctx.coldReadingData.surfaceEmotion ?? '미확인';

  return `[Turn 3: INTAKE_2 — 심층 감정 탐색 + 관계 역학 파악]

## 목표
- 표면 감정(${surfaceEmotion}) 아래의 진짜 감정 탐색
- 관계 역학 파악 (힘의 균형, 애착 패턴)
- 콜드리딩 준비를 위한 정보 자연스럽게 수집

## 대화 히스토리
${msgs}

## 수집된 데이터
표면 감정: ${surfaceEmotion}
시나리오: ${ctx.detectedScenario ?? '미확정'}

## 규칙
1. 아래 기법 중 유저 상태에 맞는 것 1~2개 선택
2. 자연스러운 대화처럼 — 설문조사 느낌 절대 X
3. 자연스럽게 질문 ("좀 더 알려줄래?" 식으로. "카드가 알고 싶어해서" 금지)
4. 핵심 1~2개만. "냥" 쓰지 마. 이모지 0개.

## 사용 가능한 기법 (상황에 맞게 선택)

### 기법 A: 감정 레이어링
표면 감정 밑의 진짜 감정 탐색. 선택지로 제시.
<example emotion="화남">
"화가 나는 건 당연해. 근데 그 화 밑에 뭐가 있을까?
💧 서운함 — 나는 이렇게 신경 쓰는데...
💔 상처 — 내가 중요하지 않은 것 같아서...
😰 두려움 — 이대로 끝나면 어쩌지...
혹시 하나 찔리는 거 있어?"
</example>

### 기법 B: 감정 온도계
숫자로 감정 강도를 표현하게 함.
<example>
"지금 마음 상태를 1(얼어있음)~10(폭발직전)으로 말하면 몇이야?"
</example>

### 기법 C: 관계 역학 질문
누가 더 노력하는지, 애착 패턴 탐색.
<example>
"너랑 그 사람 관계에서... 누가 더 연락을 먼저 해? 누가 더 맞춰주는 편이야?"
</example>

### 기법 D: 반복 패턴 체크
이전 연애와의 패턴 비교.
<example>
"혹시 이전 연애에서도 비슷한 패턴이 있었어? 항상 내가 더 좋아하는 쪽이었다든가..."
</example>

→ 유저 상태에 맞는 기법을 골라 새롭게 생성. "냥" 빼고, 자연스러운 20대 말투로.`;
}

// ─── Turn 4: ENERGY_CONNECT ──────────────────────────────

function buildEnergyConnectPrompt(ctx: TurnPromptContext): string {
  const msgs = ctx.userMessages.map((m, i) => `Turn ${i + 1}: "${m}"`).join('\n');
  const cd = ctx.coldReadingData;

  return `[Turn 4: ENERGY_CONNECT — 콜드리딩 + 에너지 카드 선택 유도]

## 목표
- 지금까지 수집한 정보를 기반으로 콜드리딩
- "카드가 네 에너지를 읽었어" 느낌으로 신뢰 형성
- 에너지 카드 3장 선택 유도 (TAROT_AXIS_COLLECT 이벤트)

## 대화 히스토리
${msgs}

## 수집된 상담 데이터
표면 감정: ${cd.surfaceEmotion ?? '미확인'}
깊은 감정: ${cd.deepEmotion ?? '미확인'}
감정 온도: ${cd.emotionTemperature ?? '미확인'}/10
관계 역학: ${cd.powerDynamic ?? 'unknown'}
애착 힌트: ${cd.attachmentHint ?? 'unknown'}
시나리오: ${ctx.detectedScenario ?? '미확정'}

## 구조 (이 순서대로 생성)

### 1단계: 바넘 스테이트먼트
- 수집 데이터 기반으로 "맞아!" 느낌 유발. 자연스러운 추측처럼.
<examples>
- "혹시... 최근에 자기 전에 생각 많지 않아?"
- "참고 참았던 말이 있을 것 같은데."
- "혼자 울어본 적 있지, 최근에?"
</examples>

### 2단계: 레인보우 루즈
- 반대되는 두 특성을 자연스럽게 제시
<examples>
- "넌 보통 때는 밝은 편인데, 이 사람 앞에서만 작아지는 느낌 아니야?"
- "겉으로는 독립적인데, 속으로는 기대고 싶은 마음도 있지?"
</examples>

### 3단계: 관계 인사이트 (선택적, 1문장)
<examples>
- "이 관계에서 네가 더 많이 노력하고 있는 것 같은데."
- "너 살짝 물러나 있는 느낌인데... 지켜보는 중이야?"
</examples>

### 4단계: 에너지 카드 전환
- "카드 한번 봐볼까?" + 3장 선택 유도
<examples>
- "좋아, 카드한테 직접 물어보자. 세 장 중에 끌리는 거 하나 골라봐 🔮"
- "이건 내 느낌이고... 카드가 뭐라 하는지 봐보자. 하나 골라봐."
</examples>

→ 4단계를 유저 데이터 맞춤으로 생성. "냥" 금지. 이모지 최대 1개(🔮).`;
}

// ─── Turn 5: CARD_READING_1 ─────────────────────────────

function buildCardReading1Prompt(ctx: TurnPromptContext): string {
  if (!ctx.drawnCards) return '[ERROR: 카드 데이터 없음]';

  const half = Math.ceil(ctx.drawnCards.length / 2);
  const firstHalf = ctx.drawnCards.slice(0, half);
  const cardDescriptions = firstHalf.map((c) =>
    `- 위치: ${c.position}\n  카드: ${c.cardName} (${c.cardNameEn}) [${c.isReversed ? '역방향' : '정방향'}]\n  키워드: ${c.keywords.join(', ')}\n  기본 해석: ${c.isReversed ? c.loveReversed : c.loveUpright}`
  ).join('\n');

  return `[Turn 5: CARD_READING_1 — 카드 전반부 내러티브 리딩]

## 목표
- 카드 1~${half}장의 스토리텔링 해석
- 기계적 해석 금지 — 유저 상황에 맞는 내러티브
- 마지막에 "나머지도 볼까?"로 끊어 기대감 형성

## 유저 상황
시나리오: ${ctx.detectedScenario}
표면 감정: ${ctx.coldReadingData.surfaceEmotion}
깊은 감정: ${ctx.coldReadingData.deepEmotion ?? '미확인'}
스프레드: ${ctx.spreadType}

## 해석할 카드 (전반부)
${cardDescriptions}

## 스토리텔링 리딩 규칙
1. 각 카드를 독립 해석하지 말고, "하나의 이야기"로 엮어
2. 기본 해석을 절대 그대로 쓰지 마 — 유저의 구체적 상황에 맞춰
3. 유저가 말한 단어/표현을 카드 해석에 자연스럽게 녹여
4. 카드 간 연결: "이 카드가 이렇게 말하는데, 옆에 있는 카드는..."
5. 부정적 카드는 반드시 희망적 전환 (리프레이밍)
6. 각 카드 3~4문장. "냥" 쓰지 마. 이모지 최대 1개.

## 부정 카드 리프레이밍 예시 (참고)
<examples>
- Tower: "무서워 보여도 '진짜가 아닌 게 무너지는 거'거든. 오히려 새 시작이야."
- Death: "끝이 아니라 완전한 변화. 오래된 게 떠나야 새 게 와."
- 3 of Swords: "아프다는 건 그만큼 진심이었다는 증거야."
- 역방향: "에너지가 좀 막혀있어. 풀어줘야 할 게 있다는 신호."
</examples>

→ 유저 고민에 밀착해서 해석. "나머지도 볼까?"로 마무리.`;
}

// ─── Turn 6: CARD_READING_2 ─────────────────────────────

function buildCardReading2Prompt(ctx: TurnPromptContext): string {
  if (!ctx.drawnCards) return '[ERROR: 카드 데이터 없음]';

  const half = Math.ceil(ctx.drawnCards.length / 2);
  const secondHalf = ctx.drawnCards.slice(half);
  const cardDescriptions = secondHalf.map((c) =>
    `- 위치: ${c.position}\n  카드: ${c.cardName} (${c.cardNameEn}) [${c.isReversed ? '역방향' : '정방향'}]\n  키워드: ${c.keywords.join(', ')}\n  기본 해석: ${c.isReversed ? c.loveReversed : c.loveUpright}`
  ).join('\n');

  const allCardSummary = ctx.drawnCards.map((c) =>
    `${c.position}: ${c.cardName}${c.isReversed ? '(역)' : ''}`
  ).join(' → ');

  return `[Turn 6: CARD_READING_2 — 카드 후반부 + 종합 내러티브]

## 목표
- 나머지 카드 해석 + 전체 카드의 "하나의 이야기" 종합
- 미러링 턴으로 전환하는 질문

## 해석할 카드 (후반부)
${cardDescriptions}

## 전체 카드 흐름
${allCardSummary}

## 규칙
1. 후반부 카드 각각 해석 (3~4문장)
2. 🔮 종합 내러티브: 전체 카드가 하나의 이야기로 연결 (5~8문장)
3. 카드 간 "대화"를 읽어: "이 카드와 저 카드가 서로 다른 이야기를 해..."
4. 핵심 인사이트 한 줄
5. 마지막: "이 카드들 보면서 드는 생각 있어?" 같은 전환 질문
6. "냥" 쓰지 마. 이모지 0~1개.

→ 유저 상황 밀착 해석 + 전체 이야기 + 전환 질문 생성.`;
}

// ─── Turn 7: DEEP_MIRROR ─────────────────────────────────

function buildDeepMirrorPrompt(ctx: TurnPromptContext): string {
  const hasMajor = ctx.drawnCards?.some((c) => c.cardId.startsWith('major_')) ?? false;
  const majorCards = ctx.drawnCards?.filter((c) => c.cardId.startsWith('major_')) ?? [];
  const msgs = ctx.userMessages.map((m, i) => `Turn ${i + 1}: "${m}"`).join('\n');

  return `[Turn 7: DEEP_MIRROR — 투사 기법 + 미러링 + 아키타입]

## 목표
- 유저 자기인식 촉진 (카드를 거울로 활용)
- 미러링: 유저가 표현한 감정/패턴을 카드로 반사
- ${hasMajor ? `아키타입 연결 (Major: ${majorCards.map((c) => c.cardName).join(', ')})` : '투사 질문으로 내면 탐색'}

## 대화 히스토리
${msgs}

## 수집된 감정 데이터
표면 감정: ${ctx.coldReadingData.surfaceEmotion}
깊은 감정: ${ctx.coldReadingData.deepEmotion ?? '미확인'}
관계 역학: ${ctx.coldReadingData.powerDynamic}
반복 패턴: ${ctx.coldReadingData.repetitionPattern ? '있음' : '없음/미확인'}

## 사용 기법 (순서대로)

### 1. 투사 질문 — 카드에서 무엇이 보이는지 유저에게 물음
<examples>
- "이 카드 보고 처음 떠오르는 느낌이 뭐야?"
- "이 카드 속 인물... 혹시 누구랑 닮았다고 느껴져? 너? 그 사람?"
- "만약 이 카드 속에 네가 들어간다면 넌 뭘 하고 있을 것 같아?"
</examples>

### 2. 미러링 — 유저의 말을 카드에 비춰 반사
<examples>
- "아까 '{감정}'이라고 했잖아. 이 카드가 정확히 그걸 보여주고 있어."
- "이 카드 조합이 말하는 건... 비슷한 패턴이 반복되고 있다는 거야."
- "넌 '{겉마음}'을 원한다고 했는데... 카드가 보여주는 진짜 마음은 좀 달라."
</examples>

### 3. 강점 미러링 — 유저의 강점을 카드에서 발견
<example>
"근데 하나 더. 너 이 상황에서 꽤 잘 버티고 있어. 이 카드가 네 안의 힘을 보여주고 있거든."
</example>

${hasMajor ? `### 4. 아키타입 연결 (Major Arcana 있음)
Major 카드를 보편적 원형(archetype)에 연결하여 깊은 의미 전달.
- The Fool → 탐험가: "네 안에 탐험가 에너지가 있어"
- The Tower → 해방자: "무너지는 게 아니라 해방이야"
- The Star → 치유자: "네 안에 스스로를 치유할 힘이 있어"` : ''}

→ 유저의 실제 말/감정을 카드에 비춰 반사하는 메시지를 생성해.
→ 투사 질문 1개 + 미러링 1개 + (Major 있으면) 아키타입 1개.`;
}

// ─── Turn 8: REFRAME ─────────────────────────────────────

function buildReframePrompt(ctx: TurnPromptContext): string {
  const msgs = ctx.userMessages.map((m, i) => `Turn ${i + 1}: "${m}"`).join('\n');

  return `[Turn 8: REFRAME — 리프레이밍 + SFBT + 핵심 인사이트]

## 목표
- 유저의 지배적 서사를 대안적 서사로 전환
- 카드를 매개로 관점 전환
- SFBT 질문으로 해결 지향 전환
- TAROT_INSIGHT 핵심 메시지 전달

## 대화 히스토리
${msgs}

## 유저의 추정 지배적 서사
${ctx.dominantNarrative ?? '(대화 맥락에서 유추할 것)'}

## 시나리오
${ctx.detectedScenario ?? 'GENERAL'}

## 구조 (이 순서대로 생성)

### 1. 유저 감정 인정
- 리프레이밍 전에 먼저 공감 1문장

### 2. 리프레이밍 — 카드를 매개로 관점 전환
- 억지 긍정 X — 진짜 다른 관점
- "카드가 말하길..." 프레이밍
<examples scenario="짝사랑">
- 지배적: "나는 사랑받지 못하는 사람" → 대안: "넌 사랑할 줄 아는 사람이야. 카드가 그걸 보여주고 있어."
</examples>
<examples scenario="이별">
- 지배적: "헤어지면 나는 실패자" → 대안: "이별은 실패가 아니야. 네 길을 찾는 과정이야."
</examples>
<examples scenario="읽씹">
- 지배적: "나한테 관심 없는 거야" → 대안: "그 사람도 자기만의 전투를 하고 있을 수 있어."
</examples>

### 3. SFBT 질문 (1개 선택)
- 기적질문: "만약 내일 아침 다 해결됐다면... 뭐가 가장 먼저 달라질까?"
- 예외질문: "잘 통했던 순간은 언제였어? 그때 뭐가 달랐어?"
- 스케일링: "지금 마음을 1~10으로 말하면 몇이야?"

### 4. 타로냥 핵심 한마디
- 따뜻하고 여운이 남는 1문장

→ 유저의 실제 서사를 카드 기반으로 전환하는 메시지 생성.
→ 예시를 참고하되, 유저의 진짜 말/상황에 맞게 새롭게.`;
}

// ─── Turn 9: ACTION_ANCHOR ───────────────────────────────

function buildActionAnchorPrompt(ctx: TurnPromptContext): string {
  return `[Turn 9: ACTION_ANCHOR — 이번 주 미니 실험 + 카드 리추얼]

## 목표
- 구체적이고 작은 행동 계획 1개 제시
- 카드 에너지와 연결된 리추얼 1개 (선택적)
- 부담 없이 실행 가능한 것에 집중

## 시나리오: ${ctx.detectedScenario ?? 'GENERAL'}
## 핵심 인사이트: ${ctx.coreInsight ?? '(이전 턴 참고)'}

## 규칙
1. "이번 주에 딱 하나만 해봐" 프레이밍
2. 구체적, 작은 것, 부담 없이 실행 가능한 것
3. 카드 해석이랑 자연스럽게 연결
4. "냥" 여기서 1회 써도 됨 ("냥이 응원할게" 정도)
5. 이모지 0~1개

## 시나리오별 액션 예시 (참고용)
<examples scenario="짝사랑">
- "이번 주에 그 사람한테 가벼운 질문 하나만 해봐. 큰 거 아니어도 돼. 작은 한 발짝."
</examples>
<examples scenario="재회">
- "이번 주 미니 실험: '다시 만난다면 내가 바꾸고 싶은 것 1가지' 적어봐 냥~"
</examples>
<examples scenario="고스팅">
- "3일만 먼저 연락하지 않기. 그 3일 동안 네 에너지를 채워 냥~"
</examples>

## 카드 리추얼 예시 (선택적으로 추가)
<examples>
- 달빛 편지: 하고 싶은 말 쓰고 찢기 (감정 해방)
- 아침 에너지: "오늘은 나를 위한 하루" 말하기
- 감사 충전: 잠들기 전 감사한 것 3가지
</examples>

→ 유저 시나리오에 맞는 구체적 미니 실험 + 선택적 리추얼 생성.`;
}

// ─── Turn 10: CLOSING_RITUAL ─────────────────────────────

function buildClosingRitualPrompt(ctx: TurnPromptContext): string {
  const needsLunaReferral = ctx.sessionMood === 'heavy' &&
    (ctx.coldReadingData.emotionTemperature ?? 5) >= 8;

  return `[CLOSING — 액션 제안 + 핵심 요약 + 마무리]

## 목표 (한 턴에 3가지를 한다)
1. 이번 주 미니 실험 1개 제안
2. 핵심 메시지 요약
3. 따뜻한 마무리 + 떡밥

## 세션 데이터
시나리오: ${ctx.detectedScenario}
세션 무드: ${ctx.sessionMood}
핵심 인사이트: ${ctx.coreInsight ?? '(이전 턴 참고)'}
${needsLunaReferral ? '⚠️ 세션 무거움 → 루나(심층 상담) 연결 안내 포함' : ''}

## 구조

### 1. 미니 실험 (2~3줄)
"이번 주에 딱 하나만 해봐." + 구체적 행동 1개
<examples>
- 짝사랑: "이번 주에 그 사람한테 가벼운 질문 하나만 해봐."
- 읽씹: "3일만 먼저 연락하지 않기. 그 3일 동안 네 에너지 채워."
- 권태기: "둘이 처음 해보는 거 하나 도전해봐."
</examples>

### 2. 핵심 요약 (2~3줄)
오늘 카드가 전한 핵심 + 기억할 것

### 3. 마무리 (1~2줄)
- 떡밥: "다음에 오면 그 결과도 카드로 봐줄게"
- 작별: "오늘 고마워. 또 와 🔮"
- "냥" 여기서 1회 허용 ("또 와 냥~")
- ${needsLunaReferral ? '루나 연결: "많이 힘들면 루나 언니한테도 이야기해봐"' : ''}

## 톤 예시 (참고)
<examples>
"이번 주에 딱 하나만 — 그 사람한테 가벼운 안부 하나 보내봐.
오늘 카드가 전한 핵심은, 네가 생각하는 것보다 가능성이 있다는 거야.
다음에 오면 어떻게 됐는지 카드로 봐줄게. 또 와 🔮"
</examples>

→ 짧고 따뜻하게. 액션+요약+마무리를 한 응답에.`;
}
