import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { TarotReadingEngine } from '@/engines/tarot/reading-engine';
import type { SpreadType } from '@/engines/tarot/reading-prompts';

const engine = new TarotReadingEngine();

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId, question, spreadType } = await request.json();

  if (!question) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 });
  }

  try {
    // 1. 질문 분석 (스프레드 타입이 없으면 AI가 추천)
    let finalSpreadType: SpreadType = spreadType;
    let scenario = 'GENERAL';
    let emotionScore = 0;
    let spreadReason = '';

    if (!finalSpreadType) {
      const analysis = await engine.analyzeQuestion(question);
      finalSpreadType = analysis.suggestedSpread;
      scenario = analysis.scenario;
      emotionScore = analysis.emotionScore;
      spreadReason = analysis.spreadReason;
    }

    // 2. 리딩 생성
    const reading = await engine.generateReading({
      question,
      spreadType: finalSpreadType,
      scenario: scenario as any,
      emotionScore,
    });

    // 3. 세션에 타로 상태 저장
    if (sessionId) {
      await supabase
        .from('counseling_sessions')
        .update({
          session_metadata: {
            tarot: {
              question,
              spreadType: finalSpreadType,
              cards: reading.cards.map(c => ({
                cardId: c.cardId,
                position: c.position,
                isReversed: c.isReversed,
              })),
              overallReading: reading.overallReading,
              readingCompleted: true,
            },
          },
        })
        .eq('id', sessionId);
    }

    return NextResponse.json({
      ...reading,
      spreadReason,
    });
  } catch (error) {
    console.error('[Tarot] Reading error:', error);
    return NextResponse.json({ error: 'Reading failed' }, { status: 500 });
  }
}
