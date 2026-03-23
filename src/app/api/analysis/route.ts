import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * 인사이트 분석 API — 실제 Supabase 데이터 기반
 * 5개 쿼리를 병렬 실행하여 감정추이/왜곡/애착/통장/전략 데이터 집계
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const since = thirtyDaysAgo.toISOString();

  // 5개 쿼리 병렬 실행
  const [emotionRes, messageRes, strategyRes, bankRes, sessionCountRes] = await Promise.all([
    // 1. 감정 로그 (30일)
    supabase
      .from('emotion_logs')
      .select('emotion_score, logged_at')
      .eq('user_id', userId)
      .gte('logged_at', since)
      .order('logged_at', { ascending: true }),

    // 2. 메시지 (인지 왜곡 집계용)
    supabase
      .from('messages')
      .select('cognitive_distortions, horsemen_detected, sentiment_score, sender_type')
      .eq('user_id', userId)
      .eq('sender_type', 'ai')
      .gte('created_at', since),

    // 3. 전략 로그
    supabase
      .from('strategy_logs')
      .select('strategy_type, state_snapshot')
      .eq('user_id', userId)
      .gte('created_at', since),

    // 4. 정서적 통장
    supabase
      .from('emotional_bank_accounts')
      .select('positive_count, negative_count, magic_ratio')
      .eq('user_id', userId)
      .order('last_updated', { ascending: false })
      .limit(1),

    // 5. 세션 수 (최소 데이터 확인)
    supabase
      .from('counseling_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  // 데이터 충분성 확인 (세션 5건 미만이면 null → UI에서 안내 표시)
  const sessionCount = sessionCountRes.count ?? 0;
  if (sessionCount < 3) {
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

  // ── 2. 인지 왜곡 분포 ──
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
  const STRATEGY_COLORS: Record<string, string> = {
    SUPPORT: '#f9a8d4',
    CBT: '#c084fc',
    ACT: '#60a5fa',
    CALMING: '#86efac',
    MI: '#fbbf24',
  };
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

  return NextResponse.json({
    emotionTrend,
    distortions,
    attachment,
    emotionalBank,
    strategyFrequency,
  });
}
