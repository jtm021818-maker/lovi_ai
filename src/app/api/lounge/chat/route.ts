import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateWithCascade } from '@/lib/ai/provider-registry';
import type { UserMemoryProfile } from '@/engines/memory/extract-memory';

/**
 * POST /api/lounge/chat
 * 유저 메시지 → 루나+타로냥 반응 생성 (3자 대화)
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

  // 유저 메모리 로드
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('memory_profile, nickname')
    .eq('id', user.id)
    .single();

  const memory = (profile?.memory_profile ?? {}) as UserMemoryProfile;
  const name = profile?.nickname ?? memory.basicInfo?.nickname ?? '너';
  const issues = memory.relationshipContext?.mainIssues?.join(', ') ?? '';
  const trend = memory.emotionPatterns?.emotionTrend ?? '';

  // 최근 대화 포맷
  const chatContext = recentChat
    .slice(-6)
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

[캐릭터 현재 상태 — 반드시 반영!]
루나: ${lunaStatus.activity} (${lunaStatus.location === 'sleeping' ? '잠든 상태 — 반응 안 함 or "zzz..." 정도만' : lunaStatus.location === 'away' ? '외출 중 — 반응 안 함. 없다고 알려줘' : '라운지에 있음'})
타로냥: ${tarotStatus.activity} (${tarotStatus.location === 'sleeping' ? '잠든 상태 — 반응 안 함 or "zzz..." 정도만' : tarotStatus.location === 'away' ? '외출 중 — 반응 안 함. 없다고 알려줘' : '라운지에 있음'})

[유저 정보]
이름: ${name}
${issues ? '주요 고민: ' + issues : ''}${trend ? ', 감정추이: ' + trend : ''}

[규칙]
- 잠든 캐릭터는 반응 안 하거나 "zzz..." 한마디만. 깨어있는 것처럼 대화하면 안 됨!
- 외출 중인 캐릭터는 반응 안 함. 남은 캐릭터가 "걔 지금 없어" 알려줘.
- 깨어있는 캐릭터만 정상 대화.
- 루나: 따뜻하게. 공감 먼저.
- 타로냥: 쿨하게. 가끔 장난. 카드 연결.
- 1~2문장으로 짧게. 유저 말투 미러링. "냥" 남발 금지.
- ${name}을 이름으로 불러.
${needsCounseling ? '- 깊은 고민이면 "상담으로 가볼까?" 부드럽게 제안.' : ''}

JSON만 (잠든/외출 캐릭터는 responses에서 빼거나 "zzz" 한마디만):
{
  "responses": [
    { "speaker": "luna", "text": "...", "delay": 2 },
    { "speaker": "tarot", "text": "...", "delay": 4 }
  ]
}`;

  try {
    const result = await generateWithCascade(
      [{ provider: 'gemini' as const, tier: 'haiku' as const }],
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
