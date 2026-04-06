/**
 * 🏠 Daily Character State Engine
 *
 * 하루 1회 LLM 호출 → 루나+타로냥의 "오늘의 내면 상태" 생성
 * - 감정, 활동, 선제적 인사, 캐릭터 간 대화
 * - memory_profile.todayState에 저장 → 하루 종일 재사용
 * - 같은 날 재방문 시 캐시 리턴 (LLM 0회)
 */

import type { UserMemoryProfile } from '@/engines/memory/extract-memory';

// ─── Types ──────────────────────────────────────────────

export interface CharacterMood {
  positivity: number; // -1 ~ 1
  energy: number;     // -1 ~ 1
}

export interface DailyEvent {
  hour: number;
  systemMessage: string;
  dialogue: { speaker: 'luna' | 'tarot'; text: string }[];
}

export interface CharacterDailyState {
  generatedAt: string;
  generatedDate: string; // YYYY-MM-DD

  luna: {
    mood: CharacterMood;
    currentActivity: string;
    proactiveGreeting: string;
    worryAboutUser: string;
    banterWithTarot: string;
  };

  tarot: {
    mood: CharacterMood;
    currentActivity: string;
    proactiveGreeting: string;
    teaseAboutUser: string;
    banterWithLuna: string;
  };

  /** LLM이 매일 생성하는 고유 이벤트 3~5개 */
  dailyEvents?: DailyEvent[];

  crossTalk: {
    topic: string;
    lines: { speaker: 'luna' | 'tarot'; text: string }[];
    onTapMessage: string;
  };
}

type TimeOfDay = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night' | 'lateNight';

// ─── 시간대 판정 ────────────────────────────────────────

function getTimeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h < 6) return 'lateNight';
  if (h < 9) return 'dawn';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 20) return 'evening';
  if (h < 23) return 'night';
  return 'lateNight';
}

// ─── LLM 프롬프트 ───────────────────────────────────────

function buildDailyStatePrompt(memory: UserMemoryProfile, timeOfDay: TimeOfDay): string {
  const name = memory.basicInfo?.nickname ?? '유저';
  const issues = memory.relationshipContext?.mainIssues?.join(', ') ?? '없음';
  const emotions = memory.emotionPatterns?.dominantEmotions?.join(', ') ?? '알 수 없음';
  const trend = memory.emotionPatterns?.emotionTrend ?? 'stable';
  const lastSession = memory.sessionHighlights?.slice(-1)[0];
  const lastTopic = lastSession?.keyTopic ?? '없음';
  const lastInsight = lastSession?.insight ?? '';
  const totalSessions = memory.totalSessions ?? 0;
  const streak = memory.streakDays ?? 0;
  const lastCheckin = memory.dailyCheckins?.slice(-1)[0];

  return `너는 AI 캐릭터의 "오늘의 내면 상태"를 생성하는 시스템이야.

[유저 정보]
이름: ${name}
주요 고민: ${issues}
감정 패턴: ${emotions}
감정 추이: ${trend}
총 상담 횟수: ${totalSessions}회
연속 방문: ${streak}일
마지막 상담: ${lastTopic}${lastInsight ? ' → ' + lastInsight : ''}
어제 감정 체크인: ${lastCheckin ? lastCheckin.mood + ' (' + lastCheckin.score + '/4)' : '없음'}

[현재 시간대]
${timeOfDay}

[캐릭터 설정]
루나: 따뜻하고 공감적인 여우 상담사. ${name}을 진심으로 걱정. 타로냥 장난에 "하지마!" 하면서도 웃음.
타로냥: 도도하지만 속은 따뜻한 고양이 타로 리더. 장난기 있음. ${name}을 살짝 놀리지만 진심으로 챙김. 루나한테도 장난.

다음 JSON으로만 답해:
{
  "luna": {
    "mood": { "positivity": -1~1, "energy": -1~1 },
    "currentActivity": "지금 하고 있는 것 (10자 이내)",
    "proactiveGreeting": "${name}에게 할 첫 마디 (이전 기억 기반, 자연스럽게)",
    "worryAboutUser": "${name}에 대해 걱정하는 것 (없으면 빈 문자열)",
    "banterWithTarot": "타로냥한테 하고 싶은 말 (1문장)"
  },
  "tarot": {
    "mood": { "positivity": -1~1, "energy": -1~1 },
    "currentActivity": "지금 하고 있는 것 (10자 이내)",
    "proactiveGreeting": "${name}에게 할 첫 마디 (살짝 장난기, 이전 기억 기반)",
    "teaseAboutUser": "${name}을 장난스럽게 놀릴 소재 (없으면 빈 문자열)",
    "banterWithLuna": "루나한테 하고 싶은 말 (1문장)"
  },
  "crossTalk": {
    "topic": "둘이 이야기할 주제 (5자 이내)",
    "lines": [
      { "speaker": "tarot", "text": "타로냥 대사1 (장난기)" },
      { "speaker": "luna", "text": "루나 대사1 (말리거나 걱정)" },
      { "speaker": "tarot", "text": "타로냥 대사2 (쿨하게)" },
      { "speaker": "luna", "text": "루나 마무리" }
    ],
    "onTapMessage": "${name}이 탭했을 때 둘이 하는 인사 (1문장)"
  },
  "dailyEvents": [
    9시~22시까지 매 시간 1개씩 이벤트를 생성해! (총 10~14개)
    각각 형식:
    { "hour": 9~22, "systemMessage": "시스템메시지(없으면 빈문자열)", "dialogue": [{ "speaker": "luna|tarot", "text": "대사" }] }

    규칙:
    - 매 시간 다른 이벤트. 반복 금지!
    - 유저의 상담 내용/감정/기억을 반영한 이벤트 섞기
    - 유형 다양하게: 일상수다, 쇼핑, 요리, 카드발견, 걱정, 장난, 다툼+화해, 유저 언급 등
    - 시간대에 맞게: 아침=활발, 오후=나른, 저녁=차분, 밤=감성
    - 루나↔타로냥 티격태격 최소 2~3개 포함
    - {name}을 자연스럽게 언급하는 이벤트 3~4개 포함
    - 시스템메시지는 "[루나가 쿠키 굽고 있어요 🍪]" 같은 상태 변화일 때만
    - 대사는 1~3줄로 짧게
  ]
}`;
}

// ─── 폴백 상태 (LLM 실패 시) ────────────────────────────

function buildFallbackState(memory: UserMemoryProfile, timeOfDay: TimeOfDay): CharacterDailyState {
  const name = memory.basicInfo?.nickname ?? '너';
  const isNight = timeOfDay === 'night' || timeOfDay === 'lateNight';

  return {
    generatedAt: new Date().toISOString(),
    generatedDate: new Date().toISOString().slice(0, 10),
    luna: {
      mood: { positivity: 0.3, energy: isNight ? -0.2 : 0.4 },
      currentActivity: isNight ? '차 마시는 중' : '책 읽는 중',
      proactiveGreeting: `${name} 왔구나! 오늘은 어떤 하루였어?`,
      worryAboutUser: '',
      banterWithTarot: '타로냥 또 자고 있어?',
    },
    tarot: {
      mood: { positivity: 0.1, energy: isNight ? 0.2 : -0.1 },
      currentActivity: isNight ? '달 보는 중' : '카드 정리 중',
      proactiveGreeting: `왔네. 오늘 카드가 뭔가 보여주고 싶어하는 것 같은데.`,
      teaseAboutUser: '',
      banterWithLuna: '루나는 맨날 책만 읽어.',
    },
    crossTalk: {
      topic: '일상',
      lines: [
        { speaker: 'tarot', text: `루나, ${name} 오늘 올 것 같아?` },
        { speaker: 'luna', text: '글쎄... 올 것 같은데?' },
        { speaker: 'tarot', text: '카드가 그렇게 말하거든.' },
        { speaker: 'luna', text: '넌 맨날 카드 핑계야 ㅋㅋ' },
      ],
      onTapMessage: `아 ${name} 왔구나! 우리 방금 네 이야기 하고 있었어.`,
    },
  };
}

// ─── Public API ─────────────────────────────────────────

/**
 * 오늘의 캐릭터 상태 생성 또는 캐시 리턴
 * - 같은 날이면 캐시 리턴 (LLM 0회)
 * - 새 날이면 LLM 1회 호출 후 저장
 */
export async function getDailyState(
  memoryProfile: UserMemoryProfile,
  existingTodayState?: CharacterDailyState | null,
): Promise<{ state: CharacterDailyState; fromCache: boolean }> {
  const today = new Date().toISOString().slice(0, 10);

  // 캐시 체크
  if (existingTodayState?.generatedDate === today) {
    return { state: existingTodayState, fromCache: true };
  }

  const timeOfDay = getTimeOfDay();

  // LLM 호출 시도
  try {
    const { generateWithCascade } = await import('@/lib/ai/provider-registry');

    const prompt = buildDailyStatePrompt(memoryProfile, timeOfDay);
    const result = await generateWithCascade(
      [{ provider: 'gemini' as const, tier: 'haiku' as const }],
      'Generate character daily state as JSON only. No other text.',
      [{ role: 'user' as const, content: prompt }],
      1024,
    );

    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const state: CharacterDailyState = {
        generatedAt: new Date().toISOString(),
        generatedDate: today,
        luna: parsed.luna,
        tarot: parsed.tarot,
        crossTalk: parsed.crossTalk,
      };
      return { state, fromCache: false };
    }
  } catch (e) {
    console.error('[DailyState] LLM 호출 실패, 폴백 사용:', e);
  }

  // 폴백
  return { state: buildFallbackState(memoryProfile, timeOfDay), fromCache: false };
}

/**
 * 캐릭터 감정 → 이모지 변환
 */
export function moodToEmoji(mood: CharacterMood): string {
  if (mood.positivity > 0.3 && mood.energy > 0.3) return '😊';
  if (mood.positivity > 0.3 && mood.energy <= 0.3) return '😌';
  if (mood.positivity <= -0.3 && mood.energy > 0.3) return '😤';
  if (mood.positivity <= -0.3 && mood.energy <= -0.3) return '😔';
  if (mood.energy <= -0.5) return '😴';
  return '🙂';
}
