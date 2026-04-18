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

  // 🆕 v74: 최소 sanity — deepEmotionHypothesis 도 없으면 진짜 재료 0 (LLM 도 판단 불가)
  //   surfaceEmotion 은 온도계 응답 없어도 OK. LLM 이 유저 발화만 보고 판단.
  if (!deepEmotionHypothesis) return null;

  // 🆕 v59: 유저 메시지 전부 (slice 하드코딩 제거) — LLM 이 알아서 가려쓰게
  const allUserMessages = chatHistory
    .filter((m) => m.role === 'user')
    .map((m) => m.content);

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
- duo (상대 등장): 도입 → 상대 발화 → 유저 반응 → 갈등 → 전환
- solo (유저 혼자): 공간 배경 → 유저 행동 → 올라오는 감정 → 솔직한 한마디

라벨 = 성별 한글. userGender=${userGender ?? '미확인'} 기준으로 [${userGenderLabel}]/[${partnerGenderLabel}] 사용. 등장인물이 유저 혼자면 solo.

## reveal (핵심)
씬 뒤에 루나가 "아 이게 진짜 속마음이다" 하고 짚는 한 줄 (20~40자).
표면 감정(짜증/귀찮음) 뒤의 1차 감정(서운함/두려움/외로움). 추측형 — "~거잖아", "~인 거 같아".

## sceneFrames (표정)
각 대사마다 표정 0~7 (배열로). revealFrame 도 하나.
0=기본 1=슬픔 2=화남 3=깨달음 4=놀람 5=웃음 6=불안 7=당당

## ready=false 로 미룰 때 (희귀 케이스만)
유저 발화에 **사건/인물이 하나도 없음**. 순수 감정 단어만 ("그냥 힘들어" 만 반복). 이럴 땐 극장 못 돌림.
**그 외엔 전부 ready=true**. 망설이지 마. 재료가 조금 부족해도 네 상상으로 채워서 해.

## 출력 (순수 JSON)
ready=true:
{"ready":true,"facts":{"who_user":"...","who_partner":"...|null","what_happened":"...","when":"...|null","where":"...|null","partner_last_words":"...|null","user_last_words_or_action":"...|null","emotional_subtext":"..."},"characterSetup":{"mode":"duo|solo","userGender":"male|female","partnerGender":"male|female|null","userLabel":"남자|여자","partnerLabel":"남자|여자|null"},"sceneTitle":"...(8~15자)","sceneLines":["[라벨] (지문) 대사", ...],"sceneFrames":[2,2,4,1,3,3],"reveal":"...","revealFrame":3,"surfaceEmotion":"...","surfaceEmoji":"...","deepEmotion":"...","deepEmoji":"..."}

ready=false:
{"ready":false,"reason":"..."}

## 예시 (참고, 이대로 쓰지 마)
유저가 "여친이랑 사주기 문제로 다퉜어" 라고만 하면:
- sceneTitle: "사주고 싶지 않은 마음"
- mode: duo
- 씬: [여자] 옆에 와서 어깨 기대며 "오빠 이거..." / [남자] 폰 스크롤하며 "아 나중에" / [여자] 조금 멀어지며 "...싫으면 말해" / [남자] (폰 내려놓지 않음) ... / [여자] 자리 뜨며
- reveal: "사주기 싫은 게 아니라, 요즘 뭐든 귀찮은 거잖아 — 관계가 버거워진 신호일 수도"

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
      deepEmotion: parsed.deepEmotion || deepEmotionHypothesis.primaryEmotion,
      deepEmoji: parsed.deepEmoji || '💜',
      lunaMessage: '이런 느낌이지? 🦊',
      sceneTitle: parsed.sceneTitle || '너의 그 순간',
      sceneLines,
      sceneFrames: Array.isArray(parsed.sceneFrames) ? parsed.sceneFrames.map((f: any) => Math.min(7, Math.max(0, Number(f) || 0))) : undefined,
      reveal: parsed.reveal,
      revealFrame: typeof parsed.revealFrame === 'number' ? Math.min(7, Math.max(0, parsed.revealFrame)) : 3,
      backgroundImageBase64,
      characterSetup: {
        mode: llmMode,
        userGender: llmUserGender,
        partnerGender: llmPartnerGender,
        userLabel: llmUserLabel,
        partnerLabel: llmPartnerLabel,
      },
      choices: [
        { label: '엇 맞아...', value: 'confirm' },
        { label: '아 좀 다른데ㅋㅋ', value: 'different' },
      ],
    };
  } catch (err) {
    console.error('[MirrorGenerator] 연극 생성 실패:', err);
    return null;
  }
}
