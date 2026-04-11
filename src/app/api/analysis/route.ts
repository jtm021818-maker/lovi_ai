import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * 인사이트 분석 API v2 — 루나 캐릭터 내러티브 + 데이터 집계
 * 기존 5개 차트 데이터 + summary + lunaMessages 추가
 */

// ============================================================
// 루나 메시지 템플릿
// ============================================================

const DISTORTION_LABELS: Record<string, { name: string; color: string }> = {
  MIND_READING: { name: '마음 읽기', color: '#f472b6' },
  CATASTROPHIZING: { name: '파국화', color: '#c084fc' },
  PERSONALIZATION: { name: '자기화', color: '#60a5fa' },
  ALL_OR_NOTHING: { name: '흑백 사고', color: '#86efac' },
  OVERGENERALIZATION: { name: '과잉 일반화', color: '#fbbf24' },
  EMOTIONAL_REASONING: { name: '감정적 추론', color: '#fb923c' },
  SHOULD_STATEMENTS: { name: '당위적 사고', color: '#a78bfa' },
  LABELING: { name: '딱지 붙이기', color: '#f87171' },
};

const STRATEGY_COLORS: Record<string, string> = {
  SUPPORT: '#f9a8d4',
  CBT: '#c084fc',
  ACT: '#60a5fa',
  CALMING: '#86efac',
  MI: '#fbbf24',
};

const ATTACHMENT_LABELS: Record<string, string> = {
  ANXIOUS: '불안형',
  AVOIDANT: '회피형',
  SECURE: '안정형',
};

const DISTORTION_TIPS: Record<string, string> = {
  MIND_READING: '상대의 마음을 추측하기보다, 직접 물어보는 연습을 해볼까?',
  CATASTROPHIZING: '최악을 상상하기보다, 실제로 일어난 일에 집중해보자',
  PERSONALIZATION: '모든 게 내 탓은 아니야. 상황에는 여러 원인이 있어',
  ALL_OR_NOTHING: '완벽하거나 최악, 둘 뿐은 아니야. 중간 지점도 있어',
  OVERGENERALIZATION: '"항상", "절대"라는 단어가 떠오르면, 예외를 찾아보자',
  EMOTIONAL_REASONING: '느낌이 사실은 아니야. 감정과 현실을 분리해보자',
  SHOULD_STATEMENTS: '"~해야 해"를 "~하면 좋겠다"로 바꿔보면 어떨까?',
  LABELING: '행동과 사람은 달라. "게으른 사람"이 아니라 "오늘 쉰 것"일 뿐이야',
};

const WEEKLY_TIPS = [
  '오늘 상대에게 감사한 점 하나 말해볼까?',
  'I-message로 감정 표현 연습: "네가 ~할 때 나는 ~한 느낌이야"',
  '3분 호흡하고, 지금 내 감정에 이름 붙여보기',
  '상대에게 "오늘 하루 어땠어?"라고 먼저 물어보기',
  '혼자만의 시간 30분 만들어서 나를 돌보기',
  '카톡 보내기 전에 한 번 읽어보고, 공격적인 표현 없는지 체크하기',
  '상대의 좋은 점 3가지 떠올려보기',
  '"고마워"라는 말 오늘 2번 이상 해보기',
  '상대가 말할 때 끝까지 듣고 나서 대답하기 연습',
  '오늘 느낀 감정을 한 단어로 정리해보기',
  '상대와의 좋았던 추억 하나 떠올리며 미소 짓기',
  '불안할 때 "지금 이 순간"에 집중하는 연습하기',
  '상대에게 작은 칭찬 한 마디 건네보기',
  '갈등이 생기면 "너 vs 나"가 아닌 "우리 vs 문제"로 바꿔 생각하기',
  '잠들기 전 오늘 관계에서 잘한 것 하나 떠올리기',
];

function generateLunaMessages(
  avgScore: number,
  _prevAvgScore: number,
  direction: 'up' | 'down' | 'stable',
  topDistortion: string | null,
  bankRatio: number,
  totalSessions: number,
  streakDays: number,
) {
  // 인사말
  let greeting: string;
  if (streakDays >= 7) {
    greeting = `${streakDays}일 연속 나와 대화하고 있어! 정말 대단해`;
  } else if (totalSessions >= 10) {
    greeting = `벌써 ${totalSessions}번이나 함께했네! 고마워`;
  } else {
    greeting = '이번 달도 함께해줘서 고마워';
  }

  // 감정 인사이트
  let emotionInsight: string;
  if (direction === 'up' && avgScore > 0) {
    emotionInsight = '요즘 감정이 많이 밝아졌어! 네가 노력한 결과야';
  } else if (direction === 'up') {
    emotionInsight = '아직 힘들 수 있지만, 조금씩 나아지고 있어. 함께 가자';
  } else if (direction === 'down') {
    emotionInsight = '최근에 좀 힘들었지? 괜찮아, 그럴 수 있어. 천천히 가도 돼';
  } else if (avgScore > 0) {
    emotionInsight = '꾸준히 안정적이야! 지금 이 흐름 좋아';
  } else {
    emotionInsight = '감정이 비슷한 수준인데, 함께 작은 변화를 만들어볼까?';
  }

  // 사고 패턴 인사이트
  let patternInsight: string;
  if (topDistortion && DISTORTION_TIPS[topDistortion]) {
    const name = DISTORTION_LABELS[topDistortion]?.name ?? topDistortion;
    patternInsight = `"${name}" 패턴이 자주 보여. ${DISTORTION_TIPS[topDistortion]}`;
  } else {
    patternInsight = '특별히 반복되는 사고 패턴은 없어. 균형 잡힌 사고를 하고 있어!';
  }

  // 성장 인사이트
  let growthInsight: string;
  if (bankRatio >= 5) {
    growthInsight = '긍정 상호작용이 충분해! 가트맨 박사의 5:1 기준을 넘었어';
  } else if (bankRatio >= 3) {
    growthInsight = `긍정:부정 비율이 ${bankRatio.toFixed(1)}:1이야. 5:1 목표까지 조금만 더!`;
  } else if (bankRatio > 0) {
    growthInsight = '긍정 상호작용을 조금 더 늘려보자. 작은 감사 표현부터 시작해볼까?';
  } else {
    growthInsight = '관계의 긍정적인 순간을 함께 만들어보자';
  }

  // 주간 팁 (날짜 기반으로 일관된 선택)
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const weeklyTip = WEEKLY_TIPS[weekNum % WEEKLY_TIPS.length];

  return { greeting, emotionInsight, patternInsight, growthInsight, weeklyTip };
}

// ============================================================
// API Handler
// ============================================================

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;

  // 프리미엄 여부 조회
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_premium')
    .eq('id', userId)
    .single();
  const isPremium = profile?.is_premium ?? false;

  const now = new Date();

  // 현재 30일 + 이전 30일 (비교용)
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const since = thirtyDaysAgo.toISOString();
  const prevSince = sixtyDaysAgo.toISOString();

  // 7개 쿼리 병렬 실행
  const [emotionRes, prevEmotionRes, messageRes, strategyRes, bankRes, sessionCountRes, sessionDatesRes] = await Promise.all([
    // 1. 감정 로그 (최근 30일)
    supabase
      .from('emotion_logs')
      .select('emotion_score, logged_at')
      .eq('user_id', userId)
      .gte('logged_at', since)
      .order('logged_at', { ascending: true }),

    // 2. 감정 로그 (이전 30일, 비교용)
    supabase
      .from('emotion_logs')
      .select('emotion_score')
      .eq('user_id', userId)
      .gte('logged_at', prevSince)
      .lt('logged_at', since),

    // 3. 메시지 (인지 왜곡 집계용)
    supabase
      .from('messages')
      .select('cognitive_distortions, horsemen_detected, sentiment_score, sender_type')
      .eq('user_id', userId)
      .eq('sender_type', 'ai')
      .gte('created_at', since),

    // 4. 전략 로그
    supabase
      .from('strategy_logs')
      .select('strategy_type, state_snapshot')
      .eq('user_id', userId)
      .gte('created_at', since),

    // 5. 정서적 통장
    supabase
      .from('emotional_bank_accounts')
      .select('positive_count, negative_count, magic_ratio')
      .eq('user_id', userId)
      .order('last_updated', { ascending: false })
      .limit(1),

    // 6. 세션 수
    supabase
      .from('counseling_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),

    // 7. 세션 날짜 (연속 상담일 + 총 메시지 수 계산용)
    supabase
      .from('counseling_sessions')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(60),
  ]);

  // 데이터 충분성 확인
  const totalSessions = sessionCountRes.count ?? 0;
  if (totalSessions < 3) {
    return NextResponse.json(null);
  }

  // ── 1. 감정 추이 (일별 평균) ──
  const emotionLogs = emotionRes.data ?? [];
  const dayMap = new Map<string, number[]>();
  for (const log of emotionLogs) {
    const d = new Date(log.logged_at);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    if (!dayMap.has(key)) dayMap.set(key, []);
    dayMap.get(key)!.push(log.emotion_score ?? 0);
  }
  const emotionTrend = Array.from(dayMap.entries()).map(([date, scores]) => ({
    date,
    score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
  }));

  // 현재/이전 평균 감정 점수
  const allScores = emotionLogs.map(l => l.emotion_score ?? 0);
  const avgEmotionScore = allScores.length > 0
    ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
    : 0;

  const prevScores = (prevEmotionRes.data ?? []).map(l => l.emotion_score ?? 0);
  const prevAvgEmotionScore = prevScores.length > 0
    ? Math.round((prevScores.reduce((a, b) => a + b, 0) / prevScores.length) * 10) / 10
    : 0;

  const diff = avgEmotionScore - prevAvgEmotionScore;
  const emotionDirection: 'up' | 'down' | 'stable' =
    diff > 0.2 ? 'up' : diff < -0.2 ? 'down' : 'stable';

  // ── 2. 인지 왜곡 분포 ──
  const distortionCounts = new Map<string, number>();
  const messages = messageRes.data ?? [];
  for (const msg of messages) {
    const dists = msg.cognitive_distortions ?? [];
    for (const d of dists) {
      distortionCounts.set(d, (distortionCounts.get(d) ?? 0) + 1);
    }
  }
  const distortions = Array.from(distortionCounts.entries())
    .map(([key, value]) => ({
      name: DISTORTION_LABELS[key]?.name ?? key,
      value,
      color: DISTORTION_LABELS[key]?.color ?? '#9ca3af',
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const topDistortionEntry = Array.from(distortionCounts.entries())
    .sort((a, b) => b[1] - a[1])[0];
  const topDistortion = topDistortionEntry?.[0] ?? null;
  const topDistortionCount = topDistortionEntry?.[1] ?? 0;

  // ── 3. 애착 프로필 ──
  const strategies = strategyRes.data ?? [];
  const attachCounts = { ANXIOUS: 0, AVOIDANT: 0, SECURE: 0 };
  for (const s of strategies) {
    const snap = s.state_snapshot as any;
    const type = snap?.attachmentType;
    if (type && type in attachCounts) {
      attachCounts[type as keyof typeof attachCounts]++;
    }
  }
  const total = attachCounts.ANXIOUS + attachCounts.AVOIDANT + attachCounts.SECURE || 1;
  const attachment = [
    { axis: '불안', value: Math.round((attachCounts.ANXIOUS / total) * 100) },
    { axis: '회피', value: Math.round((attachCounts.AVOIDANT / total) * 100) },
    { axis: '안정', value: Math.round((attachCounts.SECURE / total) * 100) },
  ];

  // 지배적 애착 유형
  const dominantKey = Object.entries(attachCounts).sort((a, b) => b[1] - a[1])[0][0];
  const dominantAttachment = ATTACHMENT_LABELS[dominantKey] ?? '알 수 없음';

  // ── 4. 정서적 통장 ──
  const bankData = bankRes.data?.[0];
  const emotionalBank = bankData
    ? {
        deposits: bankData.positive_count ?? 0,
        withdrawals: bankData.negative_count ?? 0,
        balance: (bankData.positive_count ?? 0) - (bankData.negative_count ?? 0),
        ratio: bankData.magic_ratio ?? 0,
      }
    : { deposits: 0, withdrawals: 0, balance: 0, ratio: 0 };

  // ── 5. 전략 사용 빈도 ──
  const strategyCounts = new Map<string, number>();
  for (const s of strategies) {
    strategyCounts.set(s.strategy_type, (strategyCounts.get(s.strategy_type) ?? 0) + 1);
  }
  const strategyFrequency = Array.from(strategyCounts.entries())
    .map(([name, count]) => ({
      name,
      count,
      color: STRATEGY_COLORS[name] ?? '#9ca3af',
    }))
    .sort((a, b) => b.count - a.count);

  // ── 6. 연속 상담 일수 ──
  const sessionDates = (sessionDatesRes.data ?? [])
    .map(s => new Date(s.created_at).toDateString());
  const uniqueDates = [...new Set(sessionDates)];
  let streakDays = 0;
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    if (uniqueDates.includes(checkDate.toDateString())) {
      streakDays++;
    } else if (i > 0) {
      break; // 연속 끊김
    }
  }

  const lastSessionDate = sessionDatesRes.data?.[0]?.created_at ?? '';

  // ── 루나 메시지 생성 ──
  const lunaMessages = generateLunaMessages(
    avgEmotionScore,
    prevAvgEmotionScore,
    emotionDirection,
    topDistortion,
    emotionalBank.ratio,
    totalSessions,
    streakDays,
  );

  // 🆕 v33 (M4): 무료 유저는 프리미엄 전용 데이터 제거 (대역폭 절약 + 데이터 노출 방지)
  if (!isPremium) {
    return NextResponse.json({
      emotionTrend,           // 무료: 감정 추이 (기본)
      distortions,            // 무료: 인지 왜곡 (기본)
      attachment: null,       // 🔒 프리미엄 전용
      emotionalBank: null,    // 🔒 프리미엄 전용
      strategyFrequency: null, // 🔒 프리미엄 전용
      summary: {
        totalSessions,
        totalMessages: messages.length,
        avgEmotionScore,
        prevAvgEmotionScore,
        emotionDirection,
        topDistortion: topDistortion ? (DISTORTION_LABELS[topDistortion]?.name ?? topDistortion) : null,
        topDistortionCount,
        dominantAttachment: null,  // 🔒 프리미엄 전용
        streakDays,
        lastSessionDate,
      },
      lunaMessages: {
        greeting: lunaMessages.greeting,
        emotionInsight: lunaMessages.emotionInsight,
        patternInsight: null,    // 🔒 프리미엄 전용
        growthInsight: null,     // 🔒 프리미엄 전용
        weeklyTip: lunaMessages.weeklyTip,
      },
      isPremium,
    });
  }

  return NextResponse.json({
    emotionTrend,
    distortions,
    attachment,
    emotionalBank,
    strategyFrequency,
    summary: {
      totalSessions,
      totalMessages: messages.length,
      avgEmotionScore,
      prevAvgEmotionScore,
      emotionDirection,
      topDistortion: topDistortion ? (DISTORTION_LABELS[topDistortion]?.name ?? topDistortion) : null,
      topDistortionCount,
      dominantAttachment,
      streakDays,
      lastSessionDate,
    },
    lunaMessages,
    isPremium,
  });
}
