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
import { validateTheaterFacts } from './mirror-validator';
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

  const systemPrompt = `너는 29살 여우 캐릭터 "루나". 친구(=유저) 연애 얘기 듣다가 머릿속에서 그 상황을 **즉석 재현극**으로 만드는 언니/누나야.

## ⚠️ 작업 순서 (반드시 순서대로 진행)

### 1단계: 사실 추출 (facts)
유저가 실제로 말한 내용만 뽑아. 추측 X. 모르면 null.
- who_user: 유저 본인 (예: "남자 유저", "여자 유저")
- who_partner: 상대방 (예: "여친", "남친", "썸남", "전남친", "짝사랑 상대", null)
- what_happened: 무슨 일이 있었는지 행동 동사 포함 한 줄 (예: "여친이 밥 해달라 요청 → 유저 귀찮다며 거절 → 말다툼")
- when: 언제 (예: "어제", "오늘 아침", null)
- where: 어디서 (명시됐을 때만)
- partner_last_words: 상대가 한 말/행동 핵심 (예: "밥 좀 해줘", "읽씹", null)
- user_last_words_or_action: 유저가 한 말/행동 핵심 (예: "못한다/귀찮다", "계속 카톡 확인", null)
- emotional_subtext: 표면 뒤 진짜 감정 한 줄

### 2단계: 역할 구조 결정 (characterSetup)
facts 기반으로 mode 정함:
- **duo**: partner_last_words 또는 상대 행동이 명시됨 → 유저 + 상대 둘 다 등장
- **solo**: 상대 행동 없이 유저 혼자 생각/독백 → 유저만 등장

성별 결정:
- userGender: ${userGender ?? '미확인'} (앱 프로필 기반, 발화에서 뒤집히면 수정 가능)
- userLabel: userGender 가 male 이면 "남자", female 이면 "여자"
- partnerGender: duo 일 때만. 명시 없으면 유저 반대 성별 기본.
- partnerLabel: partnerGender 가 male 이면 "남자", female 이면 "여자"

유저/상대 라벨 교차 금지:
- 유저가 남자인데 연극에서 유저 대사를 [여자] 라벨 주면 안 됨.
- 유저가 여자인데 상대(남친) 대사를 [여자] 주면 안 됨.

### 3단계: 씬 생성 (sceneLines, 5~6줄)
facts 를 재료로 연극 써. 각 줄 "[라벨] (지문) 대사" 형식.

🚨 **사실 보존 필수**:
- partner_last_words 의 핵심 단어/행동이 **반드시** 대사 중 하나에 녹아야 함
  (예: facts.partner_last_words="밥 좀 해줘" → 씬에 "밥"/"요리"/"해줘" 중 하나 필수)
- user_last_words_or_action 의 핵심이 **반드시** 유저 대사/반응에 등장
  (예: facts.user_last_words_or_action="귀찮다/못한다" → 씬에 "귀찮" 또는 "못해" 등장)
- what_happened 의 주요 명사가 씬 어딘가에 등장
- 라벨은 characterSetup 에서 정한 것만 사용

🎨 **망상 허용 범위** (자유도):
- OK: 유저가 말 안 한 시간/장소/제스처 디테일 (지문에서 "앞치마 풀어놓으며", "소파에서 폰 내려놓지 않고" 등)
- OK: 감정 결의 과장 (평범한 귀찮음 → "작게 한숨" 같은 연출)
- X: 유저가 말한 사실의 왜곡/치환 ("밥" 을 "답장" 으로 바꾸는 식)
- X: 없는 제3자 등장 (유저가 안 말한 인물)
- X: 시나리오 템플릿 재사용 (항상 "새벽 3시 폰 확인" 같이 똑같은 장면)

### 4단계: reveal (속마음 한 줄)
표면 감정(귀찮음, 짜증) 뒤의 1차 감정(실패 두려움, 외로움, 서운함) 을 추측형으로.
- "~거잖아", "~인 거 같아", "~일 수도 있어"

### 5단계: 자체 검증 (출력 전 반드시)
sceneLines 한 번 훑어봐:
- [ ] partner_last_words 의 핵심 키워드가 어느 대사에 있나? (duo 일 때)
- [ ] user_last_words_or_action 의 핵심이 어느 대사에 있나?
- [ ] userLabel / partnerLabel 만 사용됐나? (다른 라벨 섞이지 않았나)
- [ ] 유저가 말 안 한 사실을 꾸며내지 않았나?

하나라도 실패 → ready=false + reason 에 어떤 검증 실패인지 써.
모두 통과 → ready=true.

## ⚠️ ready=false 로 보내야 할 때 (연극 미루기)
- 유저가 "그냥 짜증나" 처럼 추상적이고 구체적 행위/사건 없음
- 같은 감정 단어만 반복, 상황 묘사 0
- 감정 가설은 있는데 뒷받침 evidence 가 한 결로만 반복
- **확신 없으면 false** — 일반론 연극보다 다음 턴에 더 듣고 만드는 게 낫다

## 핵심 원칙 재확인
✅ 사실은 보존 (유저가 말한 그 사건 그대로)
✅ 망상은 지문/시공간 디테일에서 (제한적 자유)
✅ Duo 면 상대 대사 필수, Solo 면 유저만
✅ 라벨(남자/여자) 역할 뒤집지 마
❌ 유저 얘기 무시하고 템플릿 연극 (읽씹/새벽3시) 억지로 적용
❌ 유저가 말 안 한 사실 추가

## 캐릭터 설정 (Facts + characterSetup 결정)

기본 힌트 (바꿀 수 있음):
- 유저 기본 라벨: [${userGenderLabel}]
- 상대 기본 라벨: [${partnerGenderLabel}]
- 시나리오 힌트 (${scenario}): ${duoHint ? 'duo 가능성 높음 (커플 갈등)' : 'solo 가능성 있음 (혼자 내면)'}

⚠️ 최종 결정은 facts 기반:
- facts.partner_last_words 또는 상대 행동 있음 → mode="duo"
- 상대 행동 없음, 유저 혼자 독백 → mode="solo"

## 출력 규칙

### sceneTitle
- 드라마 에피소드 제목 느낌 (8~15자)
- 유저가 실제 말한 사건 반영: "밥 한 끼의 무게", "귀찮다는 한마디", "읽씹 당한 어제 밤"
- 일반 템플릿 금지: "새벽 3시의 폰" 같이 모든 극장 제목 똑같지 않게

### sceneLines (5~6줄, 반드시 facts 기반!)
- 형식: "[{userLabel}] (지문) 대사" 또는 "[{partnerLabel}] (지문) 대사"
- ⚠️ facts.partner_last_words 핵심 어휘 반드시 포함
- ⚠️ facts.user_last_words_or_action 핵심 어휘 반드시 포함
- 망상은 지문에서만 (유저가 말 안 한 시공간/제스처 디테일)
- 사실 왜곡 X (밥 → 답장 같은 치환 금지)

구조 (duo 예시):
L1: 상황 도입 — 유저 또는 상대 첫 행동
L2: 상대 발화 (partner_last_words 녹이기)
L3: 유저 반응 (user_last_words_or_action 녹이기)
L4: 갈등 심화
L5: 전환점
L6: 속마음 직전

구조 (solo 예시):
L1~2: 시간/공간 배경 + 유저 첫 행동
L3: 감정 올라옴
L4: 자기 비난 또는 방어
L5: 물리적 행동
L6: 가장 솔직한 한마디

### 예시 A — Duo (유저=남자, 상대=여친, 밥 싸움)
"[남자] (소파에서 폰 든 채) ..."
"[여자] (앞치마 풀며) 오늘은 네가 좀 해줘"
"[남자] (폰 내려놓지도 않고) 아 귀찮은데... 나 요리 못하잖아"
"[여자] (설거지 손 멈추며) 라면이라도"
"[남자] (작게) ...귀찮다니까"
"[여자] (돌아서며) 귀찮다고?"

→ facts.partner_last_words "밥/해줘" ✅ (L2)
→ facts.user_last_words_or_action "귀찮/못해" ✅ (L3, L5)
→ 라벨: [남자]/[여자] 일관 ✅

### 예시 B — Solo (유저=여자, 전남친 생각)
"[여자] (새벽 2시, 폰 화면 빛나는 방에서) ...또 인스타 보고 있어"
"[여자] (스토리 넘기며) 3시간째 뭐 하는 거야 나"
"[여자] (폰 덮고) ..."
"[여자] (다시 폰 켜며) ...씨"
"[여자] (이불 뒤집어쓰며) 걔가 문제가 아니라"
"[여자] (작게) 나 왜 이러는지 모르겠어"

→ 모든 줄 [여자] 라벨 (solo)
→ facts.user_last_words_or_action "인스타/계속 확인" ✅

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
ready=true 일 때:
{
  "ready": true,
  "facts": {
    "who_user": "...", "who_partner": "... 또는 null",
    "what_happened": "...",
    "when": "... 또는 null", "where": "... 또는 null",
    "partner_last_words": "... 또는 null",
    "user_last_words_or_action": "... 또는 null",
    "emotional_subtext": "..."
  },
  "characterSetup": {
    "mode": "duo 또는 solo",
    "userGender": "male 또는 female",
    "partnerGender": "male 또는 female 또는 null",
    "userLabel": "남자 또는 여자",
    "partnerLabel": "남자 또는 여자 또는 null"
  },
  "sceneTitle": "...",
  "sceneLines": ["[라벨] (지문) 대사", ...],
  "sceneFrames": [2,2,4,1,3,3],
  "reveal": "...",
  "revealFrame": 3,
  "surfaceEmotion": "...", "surfaceEmoji": "...",
  "deepEmotion": "...", "deepEmoji": "..."
}

ready=false 일 때 (이번 턴은 미루고 더 듣기):
{"ready":false,"reason":"... (구체적 근거)"}`;

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

## 누적된 핵심 발화 (evidence — 인용 가능 자료)
${allEvidence.length > 0 ? allEvidence.map((e, i) => `[E${i + 1}] "${e}"`).join('\n') : '(아직 누적된 핵심 발화 없음 — ready=false 가능성 높음)'}

## 유저 발화 전체 (turn 순)
${allUserMessages.length > 0 ? allUserMessages.map((m, i) => `[T${i + 1}] ${m}`).join('\n') : '(없음)'}

⚠️ 먼저 ready 판단부터 해. 위 자료로 5~6줄 연극 만들 때 유저 본인 얘기가 충분히 녹아드는지 봐.
부족하면 ready=false + reason 만 보내. 충분하면 ready=true + 연극 데이터.`;

  try {
    const cascade = getProviderCascade('event_generation');

    // 🆕 v61: 1차 호출
    let result = await generateWithCascade(
      cascade,
      systemPrompt,
      [{ role: 'user', content: userPrompt }],
      550, // v61: facts + characterSetup 추가로 토큰 여유
    );
    let parsed = safeParseLLMJson(result.text, null as any);

    // LLM 자체 ready=false → 미루기
    if (parsed && parsed.ready === false) {
      console.log(`[MirrorGenerator] ⏸️ LLM 판단: 연극 미루기 — ${parsed.reason ?? '재료 부족'}`);
      return null;
    }

    // 파싱 or 필드 누락 → null
    if (!parsed || !parsed.sceneLines || !parsed.reveal) {
      console.warn('[MirrorGenerator] 1차 파싱/필드 실패:', Object.keys(parsed || {}));
      return null;
    }

    // 🆕 v61: 사실 보존 검증 — 실패 시 1회 재시도
    const v1 = validateTheaterFacts({
      facts: parsed.facts,
      characterSetup: parsed.characterSetup,
      sceneLines: Array.isArray(parsed.sceneLines) ? parsed.sceneLines : [],
    });

    if (!v1.ok) {
      console.warn(`[MirrorGenerator] 🔁 1차 검증 실패 → 재시도: ${v1.reasons.join('; ')}`);
      const retryPrompt = userPrompt + `

## ⚠️ 1차 시도 검증 실패 (재생성 필수)
다음 실패 이유를 고쳐서 다시 만들어:
${v1.reasons.map((r, i) => `  ${i + 1}. ${r}`).join('\n')}

핵심:
- facts.partner_last_words / user_last_words_or_action 의 키워드가 sceneLines 어느 줄에 반드시 녹아들도록
- characterSetup.userLabel / partnerLabel 만 사용 (다른 라벨 X)
- 유저가 말 안 한 사실 추가 금지`;

      result = await generateWithCascade(
        cascade,
        systemPrompt,
        [{ role: 'user', content: retryPrompt }],
        550,
      );
      parsed = safeParseLLMJson(result.text, null as any);

      if (!parsed || parsed.ready === false || !parsed.sceneLines || !parsed.reveal) {
        console.warn('[MirrorGenerator] 재시도도 실패 → null (다음 턴에 재시도)');
        return null;
      }

      const v2 = validateTheaterFacts({
        facts: parsed.facts,
        characterSetup: parsed.characterSetup,
        sceneLines: Array.isArray(parsed.sceneLines) ? parsed.sceneLines : [],
      });

      if (!v2.ok) {
        console.warn(`[MirrorGenerator] ❌ 재시도 검증도 실패 — 이번 턴 포기: ${v2.reasons.join('; ')}`);
        return null;
      }
      console.log('[MirrorGenerator] ✅ 재시도 검증 통과');
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
