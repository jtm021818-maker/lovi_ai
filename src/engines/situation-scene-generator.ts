/**
 * 🆕 v48: 상황 재연 1인 연극 생성기
 *
 * HOOK에서 이야기를 충분히 들은 후, 루나가 사용자의 상황을
 * 1인 연극처럼 재연하면서 "그래서 문제는 이거지?!" 하는 이벤트.
 *
 * 기존: "내가 이해한 상황" + "핵심 문제" 텍스트 나열 → 노잼
 * 변경: 루나가 사용자 입장이 되어 상황 연기 → "이게 네 상황이지?!" → 재미+공감
 */

import { generateWithCascade } from '@/lib/ai/provider-registry';
import { getProviderCascade } from '@/lib/ai/smart-router';
import { safeParseLLMJson } from '@/lib/utils/safe-json';

export interface SituationScene {
  /** 장면 제목 (예: "읽씹 3일째 밤") */
  sceneTitle: string;
  /** 연극 대사 3~5줄 (지문+대사 혼합) */
  sceneLines: string[];
  /** 핵심 문제 reveal (예: "그래서 네 문제는, 답장이 안 오는 게 아니라 관심 밖이 된 게 무서운 거지?") */
  problemReveal: string;
}

/**
 * LLM으로 상황 재연 1인 연극 생성
 */
export async function generateSituationScene(
  situationSummary: string,
  coreProblem: string,
  recentUserMessages: string[],
): Promise<SituationScene | null> {
  const systemPrompt = `너는 20대 여자 여우 캐릭터 "루나"야. 사용자가 말해준 연애 상황을 1인 연극처럼 재연해서 "아 내가 들은 게 이거지?" 하는 느낌으로 보여줘.

## 핵심 컨셉
사용자한테 들은 이야기를 루나가 직접 그 상황에 있는 것처럼 연기해.
마지막에 "그래서 네 문제는 이거지?" 하면서 핵심을 콕 짚어줘.
사용자가 "오 맞아 ㅋㅋㅋ" 하게 만드는 게 목표야.

## 출력 규칙

### sceneTitle
- 상황을 한줄로 캐치하게 (6~15자)
- 예: "읽씹 3일째 밤", "또 혼자 카페에서", "그 사람 인스타 스토리"

### sceneLines (3~5줄)
- 루나가 사용자 입장이 되어 연기하는 대사
- 각 줄은 (지문) + 대사 형식
- 사용자가 실제로 한 말이나 상황을 녹여서 연기해
- 과장 약간 OK, 근데 핵심은 "아 이거 나다 ㅋㅋ" 느낌
- 예:
  "(카톡 열었다 닫았다 3번째) 읽었으면 뭐라도 치든가..."
  "(폰 엎어놓고 5초 후 다시 확인) ...혹시 답장 왔나"

### problemReveal
- "그래서 네 문제는," 으로 시작
- 핵심 문제를 한줄로 콕 짚어줘 (25~50자)
- 사용자가 말한 상황의 진짜 핵심을 정리
- 예: "그래서 네 문제는, 읽씹 자체가 아니라 이 관계가 어디로 가는지 모르겠는 거지?"

## 톤
- 20대 여자 반말
- 연극이지만 친구가 "야 니 상황 이거 아니야? ㅋㅋ" 하는 톤
- 유머 살짝, 근데 문제 짚을 때는 진지하게
- 사용자의 실제 표현/단어를 재활용하면 공감 UP

## 출력 (JSON만, 코드블록 없이)
{"sceneTitle":"...","sceneLines":["...","...","..."],"problemReveal":"그래서 네 문제는, ..."}`;

  const userPrompt = `## 루나가 파악한 상황 요약
${situationSummary}

## 핵심 문제
${coreProblem}

## 사용자가 실제로 한 말
${recentUserMessages.map((m, i) => `[${i + 1}] ${m}`).join('\n')}

위 정보를 바탕으로 사용자의 상황을 1인 연극으로 재연해. 사용자가 실제로 한 말을 녹여서 연기하면 좋아.`;

  try {
    const cascade = getProviderCascade('event_generation');
    const result = await generateWithCascade(
      cascade,
      systemPrompt,
      [{ role: 'user', content: userPrompt }],
      350,
    );

    const parsed = safeParseLLMJson(result.text, null as any);
    if (!parsed || !parsed.sceneLines || !parsed.problemReveal) {
      console.warn('[SceneGenerator] 파싱 실패:', Object.keys(parsed || {}));
      return null;
    }

    const sceneLines = Array.isArray(parsed.sceneLines)
      ? parsed.sceneLines.slice(0, 5)
      : [parsed.sceneLines];

    console.log(`[SceneGenerator] 🎭 상황 연극 생성: "${parsed.sceneTitle}" (${sceneLines.length}줄)`);

    return {
      sceneTitle: parsed.sceneTitle || '너의 그 순간',
      sceneLines,
      problemReveal: parsed.problemReveal,
    };
  } catch (err) {
    console.error('[SceneGenerator] 상황 연극 생성 실패:', err);
    return null;
  }
}
