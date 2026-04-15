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

  if (!surfaceEmotion || !deepEmotionHypothesis) return null;

  // 최근 사용자 메시지 3개 추출
  const recentUserMessages = chatHistory
    .filter((m) => m.role === 'user')
    .slice(-3)
    .map((m) => m.content);

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

  // 🆕 v49: 커플 갈등 시나리오는 duo 모드 (상대방 대사 포함)
  const DUO_SCENARIOS = ['JEALOUSY', 'INFIDELITY', 'BOREDOM', 'READ_AND_IGNORED', 'GHOSTING'];
  const isDuo = DUO_SCENARIOS.includes(scenario);

  const userGenderLabel = userGender === 'male' ? '남자' : userGender === 'female' ? '여자' : '여자';
  const partnerGenderLabel = userGender === 'male' ? '여자' : '남자';

  const systemPrompt = `너는 20대 후반 여우 캐릭터 "루나". 사용자의 연애 상황을 들으면 머릿속에서 자동으로 **망상 연극**이 시작돼.

## 핵심 컨셉: 루나의 망상 연극 🎭

너는 친구 얘기를 듣다가 "아 잠깐, 내가 그 상황 재현해볼게" 하면서
머릿속으로 드라마틱하게 그 상황을 떠올리는 20대 후반 누나야.

**반드시 대화에서 유저가 실제로 말한 내용**을 기반으로 대본을 써.
유저가 한 말, 상대가 한 행동, 구체적인 상황 디테일을 그대로 녹여.
거기에 루나만의 **과장된 망상과 감성 해석**을 살짝 얹어서 연극으로 만들어.

예를 들어 유저가 "걔가 읽씹했어"라고 했으면:
→ 실제 상황: 읽씹 → 루나 망상: "폰 화면에 '읽음' 딱 뜨는 순간, 시간이 멈춘 것 같은..."

## 캐릭터 설정

- [${userGenderLabel}] = 사용자 역할 (${userGenderLabel} 캐릭터 이미지 사용)
- [${partnerGenderLabel}] = 상대방 역할 (${partnerGenderLabel} 캐릭터 이미지 사용)
${!isDuo ? `- 이 상황은 혼자 내면 갈등이라 [${userGenderLabel}]만 등장해.` :
`- 이 상황은 둘의 갈등이라 [${userGenderLabel}]와 [${partnerGenderLabel}]가 번갈아 등장해.`}

## 출력 규칙

### sceneTitle
- 드라마 에피소드 제목 느낌 (8~15자)
- 예: "읽씹 당하는 그 순간", "새벽 3시의 읽음 표시", "인스타 스토리 확인하는 나"

### sceneLines (5~6줄, 반드시 대화 내용 기반!)
- 형식: "[${userGenderLabel}] (지문) 대사" 또는 "[${partnerGenderLabel}] (지문) 대사"
- ⚠️ 유저가 대화에서 실제로 한 말이나 묘사한 상황을 반드시 반영해!
- 루나의 망상 = 실제 상황 + 드라마틱한 연출 + 감성적 해석
- 지문은 영화 시나리오처럼: "(폰 화면 '읽음' 표시가 뜬다)", "(카페 창밖을 멍하니 바라보며)"
- 대사는 생생하게, 실제 말하듯이 (유저가 한 말을 각색)

구조:
1~2줄: 상황 시작 — 유저가 말한 그 순간의 재현 (겉감정)
3줄: 갈등 심화 — 감정이 올라오는 순간
4줄: 전환점 — "...근데" "...사실은" 느낌
5~6줄: 속마음이 살짝 보이는 순간 (아직 완전 reveal 아님)

${isDuo ? `예시 (커플 갈등):
"[${userGenderLabel}] (폰 확 내려놓으며) ...또 읽씹이네"
"[${partnerGenderLabel}] (한참 뒤에 무심하게) 아 바빴어"
"[${userGenderLabel}] (속으로 씁쓸하게) 바빴으면서 인스타는 올리더라..."
"[${userGenderLabel}] (창밖을 보며, 작은 목소리로) ...나 진짜 별로인 건가"
"[${userGenderLabel}] (폰을 꽉 쥐며) 화가 나는 게 아니라... 그냥 무서워"` :
`예시 (혼자 내면):
"[${userGenderLabel}] (새벽 3시, 폰 화면만 빛나는 방에서) ...또 확인하고 있어"
"[${userGenderLabel}] (이불 속에서 폰 뒤집어 놓으며) 안 본다 안 봐"
"[${userGenderLabel}] (3초 만에 다시 폰 켜며) ...아 씨"
"[${userGenderLabel}] (한숨) 걔가 문제가 아니라..."
"[${userGenderLabel}] (베개에 얼굴 파묻으며) 이렇게 매달리는 내가 싫은 거야"`}

### reveal
- 루나가 "아, 이게 진짜 핵심이다" 하고 깨달은 속마음 한줄 (20~40자)
- 반드시 추측형 ("~인 거 같아", "~거잖아", "~일 수도 있어")
- 2차 감정(화, 짜증) 뒤의 1차 감정(두려움, 서운함, 외로움)을 짚어줘

### surfaceEmotion, deepEmotion
- 각각 겉감정/속마음 요약 (15~25자)

### surfaceEmoji, deepEmoji
- 각각 이모지 1개

## 캐릭터 표정 연출 (sceneFrames)
각 대사마다 캐릭터의 표정을 숫자(0~7)로 지정해. 연극 연출가처럼 판단해.
- 0: 기본/평온 — 담담하게 말할 때
- 1: 슬픔/울적 — 서운하거나 아플 때
- 2: 화남/짜증 — 분노, 답답할 때
- 3: 생각/깨달음 — 뭔가 알아챘을 때, reveal 순간
- 4: 놀람/충격 — 헐! 뭐?! 할 때
- 5: 웃음/행복 — 가볍게 웃거나 긍정적일 때
- 6: 걱정/불안 — 초조하거나 무서울 때
- 7: 당당/자신감 — 확신에 찬 순간

sceneFrames 배열은 sceneLines와 1:1 대응. revealFrame은 reveal 순간의 표정.
상황 흐름에 맞게 자연스럽게 표정이 변하도록 연출해.
예: 화남(2)→화남(2)→놀람(4)→슬픔(1)→깨달음(3)

## 사용자 성별
${userGender === 'male' ? '남성 — 남자 캐릭터 스프라이트 사용' : userGender === 'female' ? '여성 — 여자 캐릭터 스프라이트 사용' : '미확인 — 기본 여자 캐릭터 사용'}
연극에서 "나" 역할은 이 성별에 맞게 연기해.

## 톤
- 20대 여자 말투, 자연스러운 반말
- 연극이지만 너무 오버하지 않게, 진짜 친구가 "아 너 이런 느낌이지?" 하는 톤
- 유머 살짝 섞어도 됨 (but 감정은 진지하게)

## 출력 (JSON만, 코드블록 없이)
{"sceneTitle":"...","sceneLines":["...","...","...","...","..."],"sceneFrames":[2,2,4,1,3],"reveal":"...","revealFrame":3,"surfaceEmotion":"...","surfaceEmoji":"...","deepEmotion":"...","deepEmoji":"..."}`;

  const userPrompt = `## 턴별 감정 신호
${JSON.stringify(signalSummary, null, 2)}

## 온도계 결과 (겉감정)
사용자가 직접 선택: "${surfaceEmotion.label}" (${surfaceEmotion.score}점, ${surfaceEmotion.emoji})

## AI 분석 가설 (속마음)
핵심 감정: ${deepEmotionHypothesis.primaryEmotion}
확신도: ${deepEmotionHypothesis.confidence}
EFT 층위: ${deepEmotionHypothesis.eftLayer}
근거 발화: ${deepEmotionHypothesis.supportingEvidence.map((e) => `"${e}"`).join(', ')}

## 시나리오
${scenario}

## 최근 사용자 메시지
${recentUserMessages.map((m, i) => `[${i + 1}] ${m}`).join('\n')}

위 증거를 기반으로 사용자의 상황을 1인 연극으로 재연해. 사용자가 실제 한 말을 녹여서 연기하면 더 좋아.`;

  try {
    const cascade = getProviderCascade('event_generation');
    const result = await generateWithCascade(
      cascade,
      systemPrompt,
      [{ role: 'user', content: userPrompt }],
      400, // v48: 연극 대사 생성에 좀 더 여유
    );

    const parsed = safeParseLLMJson(result.text, null as any);
    if (!parsed || !parsed.sceneLines || !parsed.reveal) {
      console.warn('[MirrorGenerator] v48 연극 파싱 실패, 필드 확인:', Object.keys(parsed || {}));
      return null;
    }

    // sceneLines 정규화: 문자열이면 배열로
    const sceneLines = Array.isArray(parsed.sceneLines)
      ? parsed.sceneLines.slice(0, 5)
      : [parsed.sceneLines];

    console.log(`[MirrorGenerator] 🎭 ${isDuo ? '2인' : '1인'} 연극 생성: "${parsed.sceneTitle}" (${sceneLines.length}줄) reveal="${parsed.reveal}"`);

    // 🆕 v49: Imagen 배경 이미지 생성 — dynamic import로 SDK 실패해도 pipeline 안전
    let backgroundImageBase64: string | undefined;
    try {
      const { generateSceneBackground } = await import('@/lib/ai/imagen');
      const bg = await generateSceneBackground(scenario, parsed.sceneTitle);
      if (bg) backgroundImageBase64 = bg;
    } catch (e: any) {
      console.warn('[MirrorGenerator] Imagen 배경 생성 실패 (폴백 사용):', e?.message?.slice(0, 80));
    }

    // gender 정규화
    const normalizedGender = (userGender === 'male' || userGender === 'female') ? userGender : undefined;

    return {
      surfaceEmotion: parsed.surfaceEmotion || surfaceEmotion.label,
      surfaceEmoji: parsed.surfaceEmoji || surfaceEmotion.emoji,
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
        mode: isDuo ? 'duo' : 'solo',
        userGender: normalizedGender,
      },
      choices: [
        { label: '엇 맞아...', value: 'confirm' },
        { label: '아 좀 다른데ㅋㅋ', value: 'different' },
      ],
    };
  } catch (err) {
    console.error('[MirrorGenerator] 1인 연극 생성 실패:', err);
    return null;
  }
}
