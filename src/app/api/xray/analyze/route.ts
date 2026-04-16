import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserTier, checkXrayDailyLimit, recordXrayUsage } from '@/lib/subscription';

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

const XRAY_PROMPT = `당신은 연애 심리 전문가 '루나'입니다.
이 카카오톡 대화 캡처본을 분석해주세요.

## 분석 항목 (각 메시지별)
1. 발화자: 나(오른쪽) / 상대(왼쪽) 판별
2. 원문 텍스트 (이미지에서 읽기)
3. 표면 감정: 겉으로 보이는 감정
4. 숨겨진 심리: 진짜 의도 (EFT 1차 감정 기반)
5. 위험 수준: safe / caution / conflict / cold
6. 위치: top / middle / bottom (이미지 내 대략적 위치)

## 전체 분석
- overallAnalysis: 이 대화의 전체적인 분위기와 역학 (2~3문장, 루나 톤)
- keyInsight: 가장 중요한 심리적 발견 1개 (루나 톤, "~거든", "~지?" 스타일)
- suggestedResponse: 이 상황에서 유저가 보낼 수 있는 추천 답장 (I-message 기반)
- reconciliationScore: 현재 화해 가능성 (0~100%)

## 반드시 아래 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이):
{
  "messages": [
    {
      "position": "top",
      "sender": "me" | "other",
      "text": "원문 텍스트",
      "surfaceEmotion": "표면 감정",
      "deepEmotion": "숨겨진 심리",
      "riskLevel": "safe" | "caution" | "conflict" | "cold",
      "color": "green" | "yellow" | "red" | "blue"
    }
  ],
  "overallAnalysis": "전체 분석",
  "keyInsight": "핵심 인사이트",
  "suggestedResponse": "추천 답장",
  "reconciliationScore": 65
}`;

export interface XRayMessage {
  position: 'top' | 'middle' | 'bottom';
  sender: 'me' | 'other';
  text: string;
  surfaceEmotion: string;
  deepEmotion: string;
  riskLevel: 'safe' | 'caution' | 'conflict' | 'cold';
  color: 'green' | 'yellow' | 'red' | 'blue';
}

export interface XRayResult {
  messages: XRayMessage[];
  overallAnalysis: string;
  keyInsight: string;
  suggestedResponse: string;
  reconciliationScore: number;
  imageBase64: string;
}

/**
 * 429 폴백 호출: API 키 × 모델 조합을 순차 시도
 */
async function geminiVisionWithFallback(
  mimeType: string,
  base64Data: string
): Promise<string> {
  const errors: string[] = [];

  for (const apiKey of API_KEYS) {
    const client = new GoogleGenAI({ apiKey });

    for (const model of FALLBACK_MODELS) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType, data: base64Data } },
                { text: XRAY_PROMPT },
              ],
            },
          ],
        });

        const text = response.text || '';
        if (text) {
          console.log(`[XRay] ✅ 분석 성공 (model: ${model}, key: ...${apiKey.slice(-6)})`);
          return text;
        }
      } catch (err: any) {
        const code = err?.status || err?.code || err?.error?.code;
        const isRateLimit = code === 429 || code === '429' || err?.error?.status === 'RESOURCE_EXHAUSTED';
        
        if (isRateLimit) {
          console.warn(`[XRay] ⚠️ 429 한도 초과 (model: ${model}, key: ...${apiKey.slice(-6)}) → 다음 시도`);
          errors.push(`${model}@...${apiKey.slice(-6)}: 429`);
          continue;
        }
        
        // 429 아닌 에러는 바로 throw
        console.error(`[XRay] ❌ 비 429 에러 (model: ${model}):`, err.message);
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

  // XRay 일일 한도 체크 (무료: 1회/일, 프리미엄: 무제한)
  const tier = await getUserTier(user.id);
  const isPremium = tier === 'premium';
  const limit = checkXrayDailyLimit(user.id, isPremium);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'XRay 일일 무료 한도를 초과했어요', upgrade: true, remaining: 0 },
      { status: 429 }
    );
  }

  const { imageBase64 } = await req.json() as { imageBase64: string };
  if (!imageBase64) return NextResponse.json({ error: 'imageBase64 required' }, { status: 400 });

  try {
    // base64에서 MIME + 데이터 분리
    const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    const mimeType = match?.[1] || 'image/png';
    const base64Data = match?.[2] || imageBase64;

    const text = await geminiVisionWithFallback(mimeType, base64Data);
    console.log(`[XRay] 🔬 Gemini Vision 분석 완료 (${text.length}자)`);

    // JSON 파싱 (마크다운 코드블록 제거)
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result: Omit<XRayResult, 'imageBase64'> = JSON.parse(jsonStr);

    // XRay 사용 기록
    recordXrayUsage(user.id);

    return NextResponse.json({ ...result, imageBase64 });
  } catch (error: any) {
    console.error('[XRay] ❌ 분석 실패:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
