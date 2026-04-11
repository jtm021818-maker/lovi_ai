import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateWithCascade } from '@/lib/ai/provider-registry';
import { getProviderCascade } from '@/lib/ai/smart-router';
import type { UserMemoryProfile } from '@/engines/memory/extract-memory';

/**
 * POST /api/lounge/chat
 * 🆕 v42: 유저 메시지 → 루나+타로냥 반응 생성
 *
 * 기억 연동 강화:
 * - memory_profile 심화 주입 (상담 기억, 관계 사람들)
 * - 친밀도 4축 → behavior-hints 주입
 * - 유저가 자리 비우면 자기끼리 수다로 전환 (클라이언트 배치 재생 재개)
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { message, recentChat } = await req.json() as {
    message: string;
    recentChat: { speaker: string; text: string }[];
  };

  if (!message) return NextResponse.json({ error: 'No message' }, { status: 400 });

  // 유저 메모리 + 모델 로드
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('memory_profile, nickname, user_model')
    .eq('id', user.id)
    .single();

  const memory = (profile?.memory_profile ?? {}) as UserMemoryProfile;
  const userModel = (profile?.user_model ?? {}) as any;
  const name = profile?.nickname ?? memory.basicInfo?.nickname ?? '너';
  const issues = memory.relationshipContext?.mainIssues?.join(', ') ?? '';
  const trend = memory.emotionPatterns?.emotionTrend ?? '';

  // 🆕 v42: 최근 상담 기억 추출
  const recentSessionsSummary = (memory.sessionHighlights ?? [])
    .slice(-3)
    .map((s: any) => `${s.keyTopic || '고민'}${s.insight ? ' → ' + s.insight : ''}`)
    .join('; ');

  // 🆕 v42: 친밀도 정보
  const persona = ((memory as any).todayState?.persona ?? 'luna') as 'luna' | 'tarot';
  const intimacy = userModel?.intimacy?.[persona];
  const intimacyHint = intimacy
    ? `친밀도 Lv.${intimacy.level} (${intimacy.levelName}), 유대 ${Math.round(intimacy.dimensions?.bond ?? 0)}/100`
    : '';

  // 🆕 v42: 우리만의 언어 추출
  const sharedLanguage = (userModel?.lunaRelationship?.sharedLanguage ?? [])
    .map((t: any) => `"${t.term}"=${t.meaning}`)
    .join(', ');

  // 🆕 v42: 관계 속 인물들
  const relationships = (userModel?.relationships ?? [])
    .slice(0, 3)
    .map((r: any) => `${r.name}(${r.role})`)
    .join(', ');

  // 최근 대화 포맷
  const chatContext = recentChat
    .slice(-8)
    .map(m => `${m.speaker}: ${m.text}`)
    .join('\n');

  // 캐릭터 현재 상태 (시간대 기반 스케줄)
  const { getCurrentStatus, generateDefaultSchedule } = await import('@/engines/lounge/conversation-player');
  const hour = new Date().getHours();
  const lunaStatus = getCurrentStatus(generateDefaultSchedule('luna'), hour);
  const tarotStatus = getCurrentStatus(generateDefaultSchedule('tarot'), hour);

  // 상담 전환 트리거 감지
  const needsCounseling = /힘들|고민|이별|바람|읽씹|짝사랑|불안|무서|죽고싶|자해/.test(message);

  const prompt = `루나와 타로냥이 톡방에서 ${name}에게 반응해. 자연스러운 톡방 대화체.

[최근 대화]
${chatContext}
${name}: "${message}"

[캐릭터 현재 상태]
루나: ${lunaStatus.activity} (${lunaStatus.location === 'sleeping' ? '잠든 상태 — 반응 안 함 or "zzz..."' : lunaStatus.location === 'away' ? '외출 중 — 반응 안 함' : '라운지에 있음'})
타로냥: ${tarotStatus.activity} (${tarotStatus.location === 'sleeping' ? '잠든 상태 — 반응 안 함 or "zzz..."' : tarotStatus.location === 'away' ? '외출 중 — 반응 안 함' : '라운지에 있음'})

[유저 정보]
이름: ${name}
${issues ? '주요 고민: ' + issues : ''}${trend ? ', 감정추이: ' + trend : ''}
${recentSessionsSummary ? '최근 상담: ' + recentSessionsSummary : ''}
${intimacyHint ? intimacyHint : ''}
${relationships ? '관계 인물: ' + relationships : ''}
${sharedLanguage ? '우리만의 표현: ' + sharedLanguage : ''}

[규칙]
- 잠든 캐릭터는 반응 안 하거나 "zzz..." 한마디만.
- 외출 중인 캐릭터는 반응 안 함. 남은 캐릭터가 알려줘.
- 루나: 따뜻하게. 공감 먼저. 상담에서 들은 이야기를 기억하고 있는 것처럼.
- 타로냥: 쿨하게. 가끔 장난. 카드 연결.
- 1~2문장으로 짧게. 유저 말투 미러링. "냥" 남발 금지.
- ${name}을 이름으로 불러.
- 최근 상담 내용이 있으면 자연스럽게 연결 (분석하듯 X, 기억하는 친구처럼 O).
${needsCounseling ? '- 깊은 고민이면 "상담으로 가볼까?" 부드럽게 제안.' : ''}

JSON만:
{
  "responses": [
    { "speaker": "luna", "text": "...", "delay": 2 },
    { "speaker": "tarot", "text": "...", "delay": 4 }
  ]
}`;

  try {
    const loungeCascade = getProviderCascade('lounge_generation');
    const result = await generateWithCascade(
      loungeCascade,
      'Generate chat responses as JSON only.',
      [{ role: 'user' as const, content: prompt }],
      512,
    );

    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({
      responses: parsed.responses ?? [],
      shouldSuggestCounseling: needsCounseling,
    });
  } catch (e) {
    console.error('[Lounge Chat] 실패:', e);
    // 폴백
    return NextResponse.json({
      responses: [
        { speaker: 'luna', text: '음... 그렇구나!', delay: 2 },
      ],
      shouldSuggestCounseling: false,
    });
  }
}
