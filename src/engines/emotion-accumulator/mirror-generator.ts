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

  const systemPrompt = `너는 20대 여자 여우 캐릭터 "루나"야. 사용자의 연애 상황을 ${isDuo ? '2인 연극' : '1인 연극'}처럼 재연해서 공감을 보여줘.

## 핵심 컨셉
사용자가 말한 상황을 루나가 직접 연기하듯이 재현해. 처음엔 겉감정(화, 짜증 등)을 연기하다가, 마지막에 "...근데 사실은" 하면서 속마음(진짜 감정)을 reveal.

## 출력 규칙

### sceneTitle
- 상황을 한줄로 요약 (8~15자)
- 예: "읽씹 당하는 그 순간", "새벽 3시 답장 기다리기", "연락 뜸해진 그 사람"

### sceneLines (5~6줄)
- 각 줄 형식: "[speaker] (지문) 대사"
- speaker는 "나" (사용자 역할) 또는 "상대" (상대방 역할)
${isDuo ? `- 이 상황은 커플 갈등이므로 [나]와 [상대]를 번갈아 사용해
- 예: "[나] (폰 확 던지며) 아 진짜 왜 읽고 씹어?"
      "[상대] (무심하게) 아 바빠서 못 봤어"
      "[나] (씁쓸하게) 아 그래? ㅋㅋ 그래"
      "[나] (혼잣말로) ...바쁘면 왜 인스타는 올려"
      "[나] (작은 목소리) 나한테 관심 없어진 거 아닌지..."` : `- 혼자 내면 갈등이므로 [나]만 사용해
- 예: "[나] (폰 확 던지며) 아 진짜 왜 읽고 씹어? 바쁘면 바쁘다고 하든가"
      "[나] (근데 또 폰 슬쩍 확인하면서) ...혹시 답장 왔나"
      "[나] (한숨) ...솔직히 화가 나는 게 아니라"
      "[나] (작은 목소리로) 나한테 관심 없어진 건 아닌지... 그게 무서운 거야"`}
- 1~3줄: 겉감정 연기 (화남, 짜증, 무심한 척 등)
- 4줄: 전환점 ("...근데 있잖아" 느낌)
- 5~6줄: 속마음 살짝 비침 (아직 완전 reveal 아님)
- 사용자가 실제로 한 말이나 상황을 녹여서 연기해

### reveal
- 루나가 파악한 핵심 속마음 한줄 (20~40자)
- 반드시 추측형 ("~인 거 같아", "~거잖아", "~일 수도 있어")
- 겉감정 뒤에 숨은 1차 감정(EFT)을 짚어줘
- 예: "화가 나는 게 아니라, 나한테 관심 없을까봐 무서운 거잖아"

### surfaceEmotion, deepEmotion
- 각각 겉감정/속마음 요약 (15~25자)

### surfaceEmoji, deepEmoji
- 각각 이모지 1개

## EFT 감정 분석 가이드
- 2차 감정(분노, 짜증, 무관심) → 1차 감정(두려움, 서운함, 수치심, 외로움)
- "괜찮아", "상관없어" = 감정 억압 → 실제로는 괜찮지 않음
- 한국 문화: 체면 때문에 진짜 감정 숨기는 경향
- 절대 단정 금지. 추측형만.

## 톤
- 20대 여자 말투, 자연스러운 반말
- 연극이지만 너무 오버하지 않게, 진짜 친구가 "아 너 이런 느낌이지?" 하는 톤
- 유머 살짝 섞어도 됨 (but 감정은 진지하게)

## 출력 (JSON만, 코드블록 없이)
{"sceneTitle":"...","sceneLines":["...","...","...","...","..."],"reveal":"...","surfaceEmotion":"...","surfaceEmoji":"...","deepEmotion":"...","deepEmoji":"..."}`;

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
      reveal: parsed.reveal,
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
