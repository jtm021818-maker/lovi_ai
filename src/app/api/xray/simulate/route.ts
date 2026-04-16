import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserTier } from '@/lib/subscription';

// ============================================================
// 듀얼 API 키 + 멀티 모델 폴백 (429 RESOURCE_EXHAUSTED 방어)
// ============================================================
const API_KEYS = [
  process.env.GOOGLE_API_KEY,
  process.env.GEMINI_API_KEY,
].filter(Boolean) as string[];

const FALLBACK_MODELS = [
  'gemini-2.5-flash-lite',    // 1순위: v52 전체 통일
  'gemini-2.0-flash',                 // 2순위: RPD 무제한 폴백
  'gemini-2.0-flash-lite',            // 3순위: 경량 폴백
];

/**
 * 429 폴백 호출: API 키 × 모델 조합을 순차 시도
 */
async function geminiWithFallback(prompt: string): Promise<string> {
  const errors: string[] = [];

  for (const apiKey of API_KEYS) {
    const client = new GoogleGenAI({ apiKey });

    for (const model of FALLBACK_MODELS) {
      try {
        const result = await client.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        const text = result.text || '';
        if (text) {
          console.log(`[Simulate] ✅ 성공 (model: ${model}, key: ...${apiKey.slice(-6)})`);
          return text;
        }
      } catch (err: any) {
        const code = err?.status || err?.code || err?.error?.code;
        const isRateLimit = code === 429 || code === '429' || err?.error?.status === 'RESOURCE_EXHAUSTED';
        
        if (isRateLimit) {
          console.warn(`[Simulate] ⚠️ 429 한도 초과 (model: ${model}, key: ...${apiKey.slice(-6)}) → 다음 시도`);
          errors.push(`${model}@...${apiKey.slice(-6)}: 429`);
          continue;
        }
        
        console.error(`[Simulate] ❌ 비 429 에러 (model: ${model}):`, err.message);
        errors.push(`${model}: ${err.message}`);
        continue;
      }
    }
  }

  throw new Error(`모든 Gemini 조합 실패: ${errors.join(' | ')}`);
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 시뮬레이션은 프리미엄 전용
  const tier = await getUserTier(user.id);
  if (tier !== 'premium') {
    return NextResponse.json({ error: 'Premium feature', upgrade: true }, { status: 403 });
  }

  const { context, userMessage, history, currentScore } = await req.json();

  const prompt = `당신은 연애 관계에서 갈등 중인 "상대방" 역할입니다.

## 원본 대화 맥락 (엑스레이 분석 결과)
${context}

## 지금까지의 시뮬레이션 대화
${history || '(첫 대화)'}

## 사용자가 방금 보낸 메시지
"${userMessage}"

## 역할 연기 규칙
1. 원본 대화에서 드러난 상대방의 성격, 감정 상태, 말투를 유지하세요
2. 현실적으로 반응하세요 (너무 쉽게 화해하지 말 것, 너무 적대적이지도 말 것)
3. 사용자가 공감적이고 I-message를 사용하면 조금씩 마음을 여세요
4. 사용자가 공격적이거나 비난하면 방어적으로 반응하세요
5. 한국어 카톡 말투로 답하세요 (짧고 자연스럽게, 1~3문장)

## 응답 형식 (JSON만, 마크다운 없이)
{
  "response": "상대방의 답장 내용",
  "newScore": ${currentScore}에서 사용자의 메시지 품질에 따라 -15~+15 조정한 값 (0~100 범위),
  "scoreReason": "점수 변동 이유 (한 줄)"
}`;

  try {
    const text = await geminiWithFallback(prompt);
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const data = JSON.parse(jsonStr);

    // 점수 범위 제한
    data.newScore = Math.max(0, Math.min(100, data.newScore ?? currentScore));

    console.log(`[Simulate] 🎭 상대방 반응: "${data.response.slice(0, 30)}..." | 점수: ${currentScore}→${data.newScore} (${data.scoreReason})`);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Simulate] ❌ 실패:', error.message);
    return NextResponse.json({
      response: '...',
      newScore: currentScore,
      scoreReason: '응답 생성 실패',
    });
  }
}
