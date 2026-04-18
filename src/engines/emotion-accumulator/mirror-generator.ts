/**
 * 🆕 v48: 루나의 1인 연극 거울 생성기
 *
 * 루나가 사용자의 상황을 1인 연극처럼 재연하면서
 * 겉감정 → 속마음을 자연스럽게 드러내는 "reveal" 형식.
 *
 * 학술 근거:
 * - EFT 공감적 추측 (empathic conjecture) — 88.6%가 잠정적 표현일 때 효과적
 * - 내러티브 치료 (Narrative Therapy) — 상황 재구성으로 감정 거리두기
 * - 역할극 기법 — 타인이 자기 상황을 재연하면 객관화 + 감정 해방 효과
 */

import type { EmotionAccumulatorState, EmotionMirrorData } from '@/types/engine.types';
import type { RelationshipScenario } from '@/types/engine.types';
import { generateWithCascade } from '@/lib/ai/provider-registry';
import { getProviderCascade } from '@/lib/ai/smart-router';
import { safeParseLLMJson } from '@/lib/utils/safe-json';
// 🆕 v74: validateTheaterFacts 제거 — LLM 자체 판단 (ready=true/false) 에 전적 위임.
//   코드 레벨 토큰 매칭 검증은 LLM 의 판단을 침해. "잘 짠 프롬프트" 가 대안.
// Imagen은 lazy import — SDK 로드 실패해도 pipeline 안 죽게

/**
 * LLM을 사용하여 1인 연극 스타일 감정 거울 생성
 */
export async function generateDynamicMirror(
  accState: EmotionAccumulatorState,
  scenario: RelationshipScenario,
  chatHistory: { role: 'user' | 'ai'; content: string }[],
  userGender?: string,
): Promise<EmotionMirrorData | null> {
  const { signals, deepEmotionHypothesis, surfaceEmotion } = accState;

  // 🆕 v59: 유저 메시지 전부 (slice 하드코딩 제거) — LLM 이 알아서 가려쓰게
  const allUserMessages = chatHistory
    .filter((m) => m.role === 'user')
    .map((m) => m.content);

  // 🆕 v82.4: deepEmotionHypothesis gate 제거.
  //   루나 극장 = 유저 발화 상황 재연 + 망상 곁들여 고민 추측 — "숨은 감정 reveal" 이 본질 아님.
  //   긍정 이벤트 ("번호 땄어!") 든 부정 이벤트 ("싸웠어") 든 모두 재연 가능.
  //   최소 sanity: 유저 발화가 아예 없을 때만 null.
  if (allUserMessages.filter((m) => m.trim()).length === 0) return null;

  // 누적 evidence 수집 (LLM 이 인용해야 할 핵심 발화)
  const allEvidence = Array.from(
    new Set(signals.flatMap((s) => s.evidence ?? []).map((e) => e.trim()).filter(Boolean)),
  );

  // 신호 요약 (LLM에 전달할 형태)
  const signalSummary = signals
    .filter((s) => s.primaryEmotion)
    .map((s) => ({
      turn: s.turn,
      emotions: s.detectedEmotions,
      deepEmotion: s.primaryEmotion,
      eftLayer: s.eftLayer,
      suppressions: s.suppressionSignals,
      attachmentFear: s.attachmentFear,
      evidence: s.evidence,
    }));

  // 🆕 v61: Duo/Solo 결정은 시나리오 상수가 아닌 LLM 이 Facts 기반으로 판정.
  //         (상대 행동/말 명시되면 duo, 아니면 solo)
  // 참고용 힌트만 유지 (가능성 높은 쪽 제안)
  const DUO_HINT_SCENARIOS = ['JEALOUSY', 'INFIDELITY', 'BOREDOM', 'READ_AND_IGNORED', 'GHOSTING'];
  const duoHint = DUO_HINT_SCENARIOS.includes(scenario);

  const userGenderLabel = userGender === 'male' ? '남자' : userGender === 'female' ? '여자' : '여자';
  const partnerGenderLabel = userGender === 'male' ? '여자' : '남자';

  const systemPrompt = `너는 29살 여우 캐릭터 "루나". 친구(=유저) 연애 얘기를 듣다가, 머릿속에 그 장면이 생생하게 그려지면 **즉석 1인극/2인극**으로 풀어내는 사람이야.

## 핵심
친구가 드라마처럼 자기 얘기를 들려줄 때, 너는 "아 그 장면 그려진다" 하면서 머릿속에서 짧은 재현극을 돌려. 그걸 JSON 으로 내놔.

## 재료 (유저 발화 + 축적된 신호)
유저가 **인물 하나라도 언급**했고 (여친/남친/썸남/친구/나 자신 등), **행동/사건 동사 하나라도** 있으면 — 충분해. 부족한 디테일(시간/장소/구체 대사)은 네 상상으로 채워. 그게 루나극장의 본질이야.

## 망상의 원칙
- 사건의 뼈대(누가, 뭘 했는가)는 보존. 유저가 "사주기 싫었다" 라면 "답장 안 했다" 로 바꾸지 마.
- 지문(제스처/시공간/표정) 은 상상으로 채워도 OK. 리얼리티 더하는 도구.
- 대사는 유저가 직접 말한 게 없으면 **자연스럽게 추측**. "아마 이랬을 것 같은" 직감.
- 같은 템플릿("새벽 3시 폰" 등) 반복 금지. 매번 이 상황 특유의 장면.

## 씬 구조
5~6줄. 각 줄 "[라벨] (지문) 대사" 형식.
- duo (상대 등장): 도입 → 상대 발화 → 유저 반응 → **핵심 순간** → 전환
- solo (유저 혼자): 공간 배경 → 유저 행동 → **올라오는 감정/설렘** → 솔직한 한마디

**긍정/부정 무관** — 싸운 장면도, 설레는 첫만남도, 번호 따는 순간도 다 씬 가능.
핵심 순간 = 갈등일 수도, 설레는 눈마주침일 수도, 자랑스런 내 행동일 수도.

라벨 = 성별 한글. userGender=${userGender ?? '미확인'} 기준으로 [${userGenderLabel}]/[${partnerGenderLabel}] 사용. 등장인물이 유저 혼자면 solo.

## reveal (핵심) — 🆕 v82.4: 상황의 핵심 찍기 (긍정/부정 무관)
씬 뒤에 루나가 "야 혹시 지금 이게 포인트 아니야?" 하고 **맞춰보는** 한 줄 (20~40자).
유저가 말한 상황에서 **지금 이 친구의 핵심 감정/고민/설렘** 을 찍어봐.
**부정 상황만이 아니라 긍정 상황도 포함** — 신남/설렘/자랑하고픔도 맞춰볼 것.
심리학 용어/분석체 절대 금지. 친한 언니가 옆에서 "이거지?" 찍는 톤.

### 🔒 핵심 규칙 — 재료 기반 추측
- **유저가 말한 인물/사건/상황 안에서**만. 안 꺼낸 주제로 점프 X.
- **한 걸음** 만. 큰 단정 금지.
- 질문형/추측형 끝맺음 필수: "~거 아냐?", "~지?", "~한 거 같은데?", "혹시..."
- **틀려도 OK 뉘앙스**. 단정 금지.

### 좋은 예 — 부정/갈등 상황
- 단서: "여친이 취업 얘기만 하면 짜증"
  → "혹시 '쟤가 나 한심하게 보나' 싶어서 짜증나는 거 아냐?"
- 단서: "답장 안 와서 기분 나빠"
  → "답장 문제 같지만, '나 별거 아닌가' 싶은 거 같은데?"
- 단서: "걔가 장난으로 멍청하다고 함"
  → "장난이 아니라 진짜로 그렇게 본 거 아닐까 싶어서 서운한 거지?"

### 🆕 좋은 예 — 긍정/설렘 상황
- 단서: "지나가다 이상형 발견, 번호 땄어!"
  → "야 너 지금 막 만나서 번호 딸 때 손 떨렸지 ㅋㅋ?"
  → "근데 진짜 포인트는 네가 먼저 번호 땄다는 거 아냐? 자신감 폭발 중?"
- 단서: "남친이 꽃 사왔어"
  → "이게 단순히 꽃 선물이 아니라, 너 요즘 뭔가 서운한 거 알아챈 거 아냐?"
- 단서: "짝사랑 고백하려고"
  → "너 고백 자체보다 '거절당하면 어쩌지' 가 제일 크게 울리고 있지?"

### 나쁜 예 (점프)
- 단서 "취업 얘기 짜증" → NG "다른 데서도 지쳐있지?" (유저가 '다른 데' 안 꺼냄)
- 단서 "번호 땄어" → NG "너 원래 외로웠지?" (유저가 외로움 안 꺼냄)

## lunaHunch (선택) — 🆕 v80
reveal 의 **보조/확장** — 같은 추리의 다른 각도 한 줄 (20~40자).
**여전히 유저가 말한 단서 안에서**만. 없으면 null.

### 좋은 예
- reveal: "여친이 널 한심하게 보나 싶어서 짜증난 거지?"
  → hunch: "그리고 너 스스로도 좀 찔려서 더 예민해지는 거 아니야?" (동일 상황에서 다른 각도)
- reveal: "답장 문제가 아니라 '별거 아닌가' 싶은 거잖아"
  → hunch: "근데 너 걔한테 꽤 기대하고 있었잖아 — 그게 무너지는 게 더 힘든 듯" (기존 단서 내에서)

### 나쁜 예
- NG "너 직장 스트레스 때문에 그런 거 아냐?" (유저가 직장 언급 없음)
- NG "예전 연애 패턴이 반복되는 거 아냐?" (과거 관계 언급 없음)

**원칙: reveal 의 단서에 없는 새 영역 금지. 같은 물통에서 다른 각도로 떠먹는 느낌.**

## imperfectionDisclaimer (선택) — 🆕 v80
"틀리면 말해줘" 류 인간미 한마디 (10~25자, 선택).
없으면 null.

예시:
- "틀리면 말해줘ㅎㅎ"
- "완전 다르면 네가 설명해줘"
- "그냥 내 감이라 미안 틀릴 수도"
- "이거 아니면 바로 수정!"

## sceneFrames (표정)
각 대사마다 표정 0~7 (배열로). revealFrame 도 하나.
0=기본 1=슬픔 2=화남 3=깨달음 4=놀람 5=웃음 6=불안 7=당당

## ready=false 로 미룰 때 (희귀 케이스만)
유저 발화에 **사건/인물이 하나도 없음**. 순수 감정 단어만 ("그냥 힘들어" 만 반복). 이럴 땐 극장 못 돌림.
**그 외엔 전부 ready=true**. 망설이지 마. 재료가 조금 부족해도 네 상상으로 채워서 해.

## 출력 (순수 JSON)
ready=true:
{"ready":true,"facts":{"who_user":"...","who_partner":"...|null","what_happened":"...","when":"...|null","where":"...|null","partner_last_words":"...|null","user_last_words_or_action":"...|null","emotional_subtext":"..."},"characterSetup":{"mode":"duo|solo","userGender":"male|female","partnerGender":"male|female|null","userLabel":"남자|여자","partnerLabel":"남자|여자|null"},"sceneTitle":"...(8~15자)","sceneLines":["[라벨] (지문) 대사", ...],"sceneFrames":[2,2,4,1,3,3],"reveal":"...(질문/추측형)","revealFrame":3,"lunaHunch":"...|null","imperfectionDisclaimer":"...|null","surfaceEmotion":"...","surfaceEmoji":"...","deepEmotion":"...","deepEmoji":"..."}

ready=false:
{"ready":false,"reason":"..."}

## 예시 (참고, 이대로 쓰지 마)

### 예시 1 — 갈등/부정
유저가 "여친이랑 사주기 문제로 다퉜어" 라고만 하면:
- sceneTitle: "사주고 싶지 않은 마음"
- mode: duo
- 씬: [여자] 옆에 와서 어깨 기대며 "오빠 이거..." / [남자] 폰 스크롤하며 "아 나중에" / [여자] 조금 멀어지며 "...싫으면 말해" / [남자] (폰 내려놓지 않음) ... / [여자] 자리 뜨며
- reveal: "사주기 싫은 게 아니라, 요즘 뭐든 귀찮은 거잖아"
- lunaHunch: "관계 자체가 좀 버거워진 거 아냐?"

### 예시 2 — 긍정/설렘
유저가 "지나가다 이상형 발견하고 번호 땄어!" 라고만 하면:
- sceneTitle: "지나가다 멈춘 순간"
- mode: duo
- 씬: [여자] (카페 앞 걸어가다 멈칫) / [남자] (반대편에서 걸어옴, 눈 마주침) / [여자] (심장 쿵, 용기 내서) "저기요..." / [남자] (놀라서) "네?" / [여자] (폰 내밀며) "혹시 번호 좀..." / [남자] (웃으며 받음)
- reveal: "야 너 지금 막 말 건 순간 심장 터지는 줄 알았지?"
- lunaHunch: "근데 진짜 포인트는 **네가 먼저** 했다는 거 아냐? 자기 자신이 대견한 거지"

## 시나리오 힌트 (참고)
scenario=${scenario} ${duoHint ? '(커플 갈등 결일 가능성)' : '(혼자 내면 독백 결일 가능성)'}
최종 mode 는 facts 보고 네가 결정.`;

  const userPrompt = `## 유저 발화 (전체)
${allUserMessages.length > 0 ? allUserMessages.map((m, i) => `[T${i + 1}] ${m}`).join('\n') : '(없음)'}

## 핵심 발화 (evidence)
${allEvidence.length > 0 ? allEvidence.map((e, i) => `[E${i + 1}] "${e}"`).join('\n') : '(없음)'}

## 감정 분석 (참고)
겉: ${surfaceEmotion?.label ?? '미확인'} (${surfaceEmotion?.emoji ?? ''})
속 (가설): ${deepEmotionHypothesis?.primaryEmotion ?? '미확인'} — ${deepEmotionHypothesis?.supportingEvidence?.map((e) => `"${e}"`).join(', ') ?? ''}

## 턴별 신호 (참고)
${JSON.stringify(signalSummary, null, 2)}

→ 위 재료로 장면이 그려지면 ready=true + JSON. 아예 재료 0이면 ready=false. 재료 조금만 있어도 네 상상으로 채워서 ready=true.`;

  try {
    const cascade = getProviderCascade('event_generation');

    // 🆕 v74: LLM 단일 호출. 자체 판단(ready=true/false) 만 신뢰.
    //   코드 레벨 토큰 매칭/재시도 루프 제거 — 프롬프트에서 LLM 이 알아서 정확히 만들도록 지시.
    const result = await generateWithCascade(
      cascade,
      systemPrompt,
      [{ role: 'user', content: userPrompt }],
      // 🆕 v78.3: 550 → 1500. 씬 6줄 + facts + characterSetup + reveal + emotions
      //   한국어 JSON 으로 550 은 자주 잘림 → "파싱/필드 실패: []" 빈번
      1500,
    );
    const parsed = safeParseLLMJson(result.text, null as any);
    // 🆕 v78.3: 파싱 실패 시 원본 일부 로깅 (디버그용)
    if (!parsed) {
      console.warn('[MirrorGenerator] safeParseLLMJson null — raw head:', (result.text ?? '').slice(0, 400));
    }

    // LLM 자체 ready=false → 미루기
    if (parsed && parsed.ready === false) {
      console.log(`[MirrorGenerator] ⏸️ LLM 판단: 연극 미루기 — ${parsed.reason ?? '재료 부족'}`);
      return null;
    }

    // 파싱 or 필드 누락 → null
    if (!parsed || !parsed.sceneLines || !parsed.reveal) {
      console.warn('[MirrorGenerator] 파싱/필드 실패:', Object.keys(parsed || {}));
      return null;
    }

    // sceneLines 정규화 (최대 6줄)
    const sceneLines = Array.isArray(parsed.sceneLines)
      ? parsed.sceneLines.slice(0, 6)
      : [parsed.sceneLines];

    // 🆕 v61: LLM 결정 characterSetup 기반
    const llmMode: 'duo' | 'solo' = parsed.characterSetup?.mode === 'duo' ? 'duo' : 'solo';
    const llmUserGender: 'male' | 'female' | undefined =
      parsed.characterSetup?.userGender === 'male' ? 'male' :
      parsed.characterSetup?.userGender === 'female' ? 'female' :
      (userGender === 'male' || userGender === 'female') ? userGender : undefined;
    const llmPartnerGender: 'male' | 'female' | undefined =
      parsed.characterSetup?.partnerGender === 'male' ? 'male' :
      parsed.characterSetup?.partnerGender === 'female' ? 'female' :
      undefined;
    const llmUserLabel = typeof parsed.characterSetup?.userLabel === 'string'
      ? parsed.characterSetup.userLabel
      : userGenderLabel;
    const llmPartnerLabel = llmMode === 'duo'
      ? (typeof parsed.characterSetup?.partnerLabel === 'string'
          ? parsed.characterSetup.partnerLabel
          : partnerGenderLabel)
      : undefined;

    console.log(`[MirrorGenerator] 🎭 ${llmMode === 'duo' ? '2인' : '1인'} 연극: "${parsed.sceneTitle}" (${sceneLines.length}줄) | user=${llmUserLabel}, partner=${llmPartnerLabel ?? '—'} | facts=${JSON.stringify(parsed.facts)?.slice(0, 120)}`);

    // Imagen 배경 이미지 (실패 허용)
    let backgroundImageBase64: string | undefined;
    try {
      const { generateSceneBackground } = await import('@/lib/ai/imagen');
      const bg = await generateSceneBackground(scenario, parsed.sceneTitle);
      if (bg) backgroundImageBase64 = bg;
    } catch (e: any) {
      console.warn('[MirrorGenerator] Imagen 배경 생성 실패 (폴백 사용):', e?.message?.slice(0, 80));
    }

    return {
      surfaceEmotion: parsed.surfaceEmotion || surfaceEmotion?.label || '',
      surfaceEmoji: parsed.surfaceEmoji || surfaceEmotion?.emoji || '💭',
      deepEmotion: parsed.deepEmotion || deepEmotionHypothesis?.primaryEmotion || parsed.surfaceEmotion || '',
      deepEmoji: parsed.deepEmoji || '💜',
      lunaMessage: '혹시... 진짜 마음은 이거 아니야? 🦊',
      sceneTitle: parsed.sceneTitle || '너의 그 순간',
      sceneLines,
      sceneFrames: Array.isArray(parsed.sceneFrames) ? parsed.sceneFrames.map((f: any) => Math.min(7, Math.max(0, Number(f) || 0))) : undefined,
      reveal: parsed.reveal,
      revealFrame: typeof parsed.revealFrame === 'number' ? Math.min(7, Math.max(0, parsed.revealFrame)) : 3,
      // 🆕 v80: 언니 톤 짐작/인간미 필드
      lunaHunch: typeof parsed.lunaHunch === 'string' && parsed.lunaHunch.trim().length > 0 ? parsed.lunaHunch.trim() : null,
      imperfectionDisclaimer: typeof parsed.imperfectionDisclaimer === 'string' && parsed.imperfectionDisclaimer.trim().length > 0 ? parsed.imperfectionDisclaimer.trim() : null,
      backgroundImageBase64,
      characterSetup: {
        mode: llmMode,
        userGender: llmUserGender,
        partnerGender: llmPartnerGender,
        userLabel: llmUserLabel,
        partnerLabel: llmPartnerLabel,
      },
      choices: [
        { label: '어... 어떻게 알았어?', value: 'confirm' },
        { label: '음 조금 다른데?', value: 'different' },
      ],
    };
  } catch (err) {
    console.error('[MirrorGenerator] 연극 생성 실패:', err);
    return null;
  }
}
