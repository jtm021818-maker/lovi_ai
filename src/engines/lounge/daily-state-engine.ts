/**
 * 🏠 v42: Daily Character State Engine — 배치 메시지 생성
 *
 * 하루 1회 LLM 호출 → 30~50개 시간대별 메시지를 미리 생성.
 * memory_profile + 최근 상담 요약 + 친밀도 상태를 프롬프트에 주입해서
 * "진짜 살아있는" 대화를 만들어냄.
 *
 * 기존 crossTalk/luna/tarot 구조는 하위 호환용으로 유지.
 * 새로운 batchMessages가 핵심.
 */

import type { UserMemoryProfile } from '@/engines/memory/extract-memory';
import type { IntimacyState } from '@/engines/intimacy/types';
import type { ScheduledMessage, BatchDailyMessages } from './batch-message-types';
import { seededRandom, todaySeed } from './seeded-random';

// ─── Types (하위 호환) ──────────────────────────────────

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

  /** LLM이 매일 생성하는 고유 이벤트 */
  dailyEvents?: DailyEvent[];

  crossTalk: {
    topic: string;
    lines: { speaker: 'luna' | 'tarot'; text: string }[];
    onTapMessage: string;
  };

  /** 🆕 v42: 배치 생성 메시지 (핵심!) */
  batchMessages?: BatchDailyMessages;
}

type TimeOfDay = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night' | 'lateNight';

// ─── 상담 세션 요약 타입 ────────────────────────────────

export interface CounselingSessionSummary {
  date: string;
  keyTopic: string;
  insight: string;
  mood: string;
  actionTaken?: string;
}

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

// ─── 🆕 v42: 배치 메시지 프롬프트 (핵심!) ──────────────

function buildBatchMessagePrompt(
  memory: UserMemoryProfile,
  recentSessions: CounselingSessionSummary[],
  yesterdayHighlights: string[],
  intimacyState: IntimacyState | null,
  userId: string,
): string {
  const name = memory.basicInfo?.nickname ?? '유저';
  const issues = memory.relationshipContext?.mainIssues?.join(', ') ?? '없음';
  const emotions = memory.emotionPatterns?.dominantEmotions?.join(', ') ?? '알 수 없음';
  const trend = memory.emotionPatterns?.emotionTrend ?? 'stable';
  const lastSession = memory.sessionHighlights?.slice(-1)[0];
  const lastTopic = lastSession?.keyTopic ?? '없음';
  const lastInsight = lastSession?.insight ?? '';
  const totalSessions = memory.totalSessions ?? 0;
  const streak = memory.streakDays ?? 0;
  const lastCheckin = (memory as any).dailyCheckins?.slice(-1)[0];

  // 최근 3세션 상담 요약
  const counselingSummary = recentSessions.length > 0
    ? recentSessions
        .slice(-3)
        .map(s => `- ${s.date}: "${s.keyTopic}" → ${s.insight || '진행중'} (기분: ${s.mood})${s.actionTaken ? ` [숙제: ${s.actionTaken}]` : ''}`)
        .join('\n')
    : '상담 이력 없음';

  // 어제 라운지 대화 하이라이트
  const yesterdayChat = yesterdayHighlights.length > 0
    ? yesterdayHighlights.slice(-5).join('\n')
    : '어제 라운지 방문 없음';

  // 친밀도 정보
  const intimacyInfo = intimacyState
    ? `레벨 ${intimacyState.level} (${intimacyState.levelName}), 신뢰 ${Math.round(intimacyState.dimensions.trust)}, 개방 ${Math.round(intimacyState.dimensions.openness)}, 유대 ${Math.round(intimacyState.dimensions.bond)}, 존경 ${Math.round(intimacyState.dimensions.respect)}`
    : '첫 만남';

  // 수면 시간 결정 (시드 기반, 매일 약간 다름)
  const seed = todaySeed(userId);
  const lunaSleepHour = 1 + Math.floor(seededRandom(seed, 901) * 3); // 1~3시
  const tarotSleepHour = 3 + Math.floor(seededRandom(seed, 902) * 3); // 3~5시
  const lunaWakeHour = 7 + Math.floor(seededRandom(seed, 903) * 2); // 7~8시
  const tarotWakeHour = 9 + Math.floor(seededRandom(seed, 904) * 2); // 9~10시

  return `너는 AI 캐릭터 "루나"와 "타로냥"의 하루치 카톡 단톡방 대화를 미리 생성하는 시스템이야.

[유저 정보]
이름: ${name}
주요 고민: ${issues}
감정 패턴: ${emotions}
감정 추이: ${trend}
총 상담 횟수: ${totalSessions}회
연속 방문: ${streak}일
마지막 상담: ${lastTopic}${lastInsight ? ' → ' + lastInsight : ''}
어제 감정 체크인: ${lastCheckin ? lastCheckin.mood + ' (' + lastCheckin.score + '/4)' : '없음'}

[최근 상담 내용 — 반드시 대화에 자연스럽게 반영!]
${counselingSummary}

[어제 라운지 대화]
${yesterdayChat}

[${name}과의 관계 상태]
${intimacyInfo}

[캐릭터 설정]
루나(🦊): 따뜻한 여우 상담사. ${name}을 진심으로 걱정하는 편한 언니.
- 상담에서 들은 내용을 자연스럽게 기억하고 있음
- "상담사"처럼 분석하지 않고, "걱정하는 언니"처럼 자연스럽게
- 타로냥한테 장난치면 "야!" 하면서도 웃음
- 수면: ${lunaWakeHour}시 기상, ${lunaSleepHour}시 취침

타로냥(🐱): 도도한 고양이 타로 리더. 쿨하지만 속은 따뜻.
- 카드로 ${name}의 에너지를 은근히 체크
- 루나한테 ${name} 걱정 안 하는 척 하면서 챙김
- 말 짧고 쿨함. "냥" 안 씀.
- 수면: ${tarotWakeHour}시 기상, ${tarotSleepHour}시 취침

[대화 생성 규칙 — 매우 중요!]
1. ${lunaWakeHour}시~${lunaSleepHour}시(다음날) 동안 메시지 생성 (루나 활동 시간)
2. 5~20분 불규칙 간격으로 메시지 배치 (카톡 단톡방 리듬!)
3. 총 35~45개 메시지
4. 8~15분 침묵 → 2~5개 연속 → 10~20분 침묵 (단톡방 클러스터 패턴)
5. 대화 유형 비율:
   - 루나↔타로냥 일상 수다/티격태격 (40%)
   - ${name} 관련 — 상담 기억 기반! (25%)
   - 개인 활동/시스템 메시지 (20%)
   - 감성/밤 대화 (15%)
6. ${name} 관련 대화는 반드시 최근 상담 내용을 자연스럽게 반영
7. 시간대: 아침=활기+기지개, 낮=나른+수다, 저녁=차분+반성, 밤=감성
8. 루나가 잠들기 전 마지막 메시지는 ${name}을 걱정/응원하는 느낌
9. 타로냥은 루나 잠든 후에도 카드 보면서 1~2개 더 남김
10. 시스템 메시지는 "[루나가 쿠키 굽고 있어요 🍪]" 같은 상태 변화만

JSON만 응답해:
{
  "messages": [
    { "hour": ${lunaWakeHour}, "minute": 12, "type": "system", "text": "루나가 일어났어요 ☀️" },
    { "hour": ${lunaWakeHour}, "minute": 15, "type": "character", "speaker": "luna", "text": "아침이다~", "isAboutUser": false },
    { "hour": ${lunaWakeHour}, "minute": 32, "type": "character", "speaker": "luna", "text": "어제 ${name} 상담한 거... 좀 걱정된다", "isAboutUser": true },
    ...
  ],
  "proactiveGreeting": "${name}이 들어왔을 때 첫 인사 (상담 기억 기반, 1~2문장)",
  "todayTheme": "오늘의 분위기 (3자 이내)"
}

isAboutUser: ${name}을 직접 언급하거나 걱정/응원하는 내용이면 true, 아니면 false.
speaker: "luna" 또는 "tarot" (시스템 메시지엔 없음)`;
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

// ─── 배치 메시지 파싱 ───────────────────────────────────

function parseBatchMessages(
  rawText: string,
  userId: string,
): BatchDailyMessages | null {
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    const rawMessages: any[] = parsed.messages ?? [];

    if (rawMessages.length < 5) return null; // 너무 적으면 실패로 간주

    const seed = todaySeed(userId);
    const lunaSleepHour = 1 + Math.floor(seededRandom(seed, 901) * 3);
    const tarotSleepHour = 3 + Math.floor(seededRandom(seed, 902) * 3);
    const lunaWakeHour = 7 + Math.floor(seededRandom(seed, 903) * 2);

    const messages: ScheduledMessage[] = rawMessages
      .map((m: any, i: number) => ({
        id: `batch_${i}`,
        hour: Number(m.hour) || 9,
        minute: Number(m.minute) || 0,
        type: (m.type === 'system' ? 'system' : m.type === 'action' ? 'action' : 'character') as ScheduledMessage['type'],
        speaker: m.speaker === 'tarot' ? 'tarot' as const : m.speaker === 'luna' ? 'luna' as const : undefined,
        text: String(m.text ?? ''),
        isAboutUser: Boolean(m.isAboutUser),
        delivered: false,
      }))
      .filter((m: ScheduledMessage) => m.text.length > 0)
      .sort((a: ScheduledMessage, b: ScheduledMessage) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute));

    return {
      generatedDate: new Date().toISOString().slice(0, 10),
      generatedAt: new Date().toISOString(),
      messages,
      proactiveGreeting: parsed.proactiveGreeting ?? '왔구나!',
      todayTheme: parsed.todayTheme ?? '일상',
      lunaWakeHour,
      lunaSleepHour,
      tarotSleepHour,
    };
  } catch (e) {
    console.error('[DailyState] 배치 메시지 파싱 실패:', e);
    return null;
  }
}

// ─── Public API ─────────────────────────────────────────

/**
 * 오늘의 캐릭터 상태 + 배치 메시지 생성 또는 캐시 리턴
 * - 같은 날이면 캐시 리턴 (LLM 0회)
 * - 새 날이면 LLM 1회 호출 후 저장
 */
export async function getDailyState(
  memoryProfile: UserMemoryProfile,
  existingTodayState?: CharacterDailyState | null,
  options?: {
    userId?: string;
    recentSessions?: CounselingSessionSummary[];
    yesterdayHighlights?: string[];
    intimacyState?: IntimacyState | null;
  },
): Promise<{ state: CharacterDailyState; fromCache: boolean }> {
  const today = new Date().toISOString().slice(0, 10);

  // 캐시 체크 — 배치 메시지도 있어야 유효
  if (
    existingTodayState?.generatedDate === today &&
    existingTodayState?.batchMessages?.messages?.length &&
    existingTodayState.batchMessages.messages.length > 5
  ) {
    return { state: existingTodayState, fromCache: true };
  }

  const timeOfDay = getTimeOfDay();
  const userId = options?.userId ?? 'default';
  const recentSessions = options?.recentSessions ?? [];
  const yesterdayHighlights = options?.yesterdayHighlights ?? [];
  const intimacyState = options?.intimacyState ?? null;

  // LLM 호출 시도
  try {
    const { generateWithCascade } = await import('@/lib/ai/provider-registry');
    const { getProviderCascade } = await import('@/lib/ai/smart-router');

    const prompt = buildBatchMessagePrompt(
      memoryProfile,
      recentSessions,
      yesterdayHighlights,
      intimacyState,
      userId,
    );

    const loungeCascade = getProviderCascade('lounge_generation');
    const result = await generateWithCascade(
      loungeCascade,
      'Generate daily lounge batch messages as JSON only. No markdown, no explanation. Output only the JSON object.',
      [{ role: 'user' as const, content: prompt }],
      4096, // 30~50개 메시지니까 토큰 넉넉히
    );

    // 배치 메시지 파싱
    const batchMessages = parseBatchMessages(result.text, userId);

    // 레거시 호환: luna/tarot/crossTalk도 생성
    const legacyState = buildFallbackState(memoryProfile, timeOfDay);

    if (batchMessages) {
      // 배치에서 proactiveGreeting 가져오기
      legacyState.luna.proactiveGreeting = batchMessages.proactiveGreeting;

      const state: CharacterDailyState = {
        ...legacyState,
        generatedAt: new Date().toISOString(),
        generatedDate: today,
        batchMessages,
      };

      console.log(`[DailyState] ✨ 배치 메시지 ${batchMessages.messages.length}개 생성 완료`);
      return { state, fromCache: false };
    }

    // 배치 파싱 실패 → 레거시 JSON 파싱 시도 (기존 호환)
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const state: CharacterDailyState = {
        generatedAt: new Date().toISOString(),
        generatedDate: today,
        luna: parsed.luna ?? legacyState.luna,
        tarot: parsed.tarot ?? legacyState.tarot,
        crossTalk: parsed.crossTalk ?? legacyState.crossTalk,
        dailyEvents: parsed.dailyEvents,
      };
      console.log('[DailyState] ⚠️ 배치 실패, 레거시 모드 사용');
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
