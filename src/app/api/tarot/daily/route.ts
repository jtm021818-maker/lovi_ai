import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getDailyTarot } from '@/engines/tarot/history-engine';

/**
 * 🔮 일일 타로 API
 *
 * GET /api/tarot/daily
 * - 유저+날짜 시드 기반으로 매일 같은 카드
 * - 같은 날 다시 요청하면 같은 카드 반환
 */
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const date = req.nextUrl.searchParams.get('date') ?? undefined;
  const result = getDailyTarot(user.id, date);

  return NextResponse.json({
    card: {
      position: result.card.position,
      cardName: result.card.card.name,
      cardNameEn: result.card.card.nameEn,
      cardEmoji: result.card.card.emoji,
      keywords: result.card.card.keywords,
      isReversed: result.card.isReversed,
      interpretation: result.card.interpretation,
      advice: result.card.card.advice,
    },
    dailyMessage: result.dailyMessage,
    loveFocus: result.loveFocus,
    date: result.date,
  });
}
