/**
 * 메시지 초안 작성기 API
 * 가트맨의 "비난→부드러운 시작(Softened Startup)" 변환 엔드포인트
 * - 비난 메시지를 감정 표현 + 부탁 형식으로 재작성
 * - Claude Haiku 사용 (비용 절약 + 충분한 능력)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateMessage } from '@/lib/ai/claude';
import { MAX_USER_MESSAGE_LENGTH } from '@/lib/utils/constants';

/** 비난→부드러운 시작 변환 시스템 프롬프트 */
const SOFTENED_STARTUP_SYSTEM = `당신은 가트맨 관계 과학 전문가입니다. 비난적 표현을 "부드러운 시작(Softened Startup)"으로 변환합니다.

## 가트맨 부드러운 시작 규칙
1. **비난 제거**: "너는 맨날...", "왜 항상..." 같은 일반화·공격 제거
2. **감정 표현**: "나는 ~할 때 ~한 감정이 들어" (나-전달법, I-message)
3. **구체적 상황**: 모호한 공격 → 특정 행동·상황으로 구체화
4. **긍정적 부탁**: 요구가 아닌 부탁 형식으로 마무리
5. **존중 유지**: 상대방 인격 공격 없이 행동에만 집중

## 출력 형식
반드시 아래 JSON 형식으로만 응답하세요:
{
  "original": "원본 메시지",
  "softened": "변환된 부드러운 시작 메시지",
  "explanation": "변환 포인트 간략 설명 (1-2줄)",
  "tip": "이 상황에서 대화를 시작하기 전 팁 (1줄)"
}

JSON 외 다른 텍스트 없이 응답하세요.`;

export async function POST(req: NextRequest) {
  // 인증 확인
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const { message } = body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: '변환할 메시지를 입력해주세요.' }, { status: 400 });
  }

  if (message.length > MAX_USER_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `메시지는 ${MAX_USER_MESSAGE_LENGTH}자 이하여야 합니다.` },
      { status: 400 }
    );
  }

  try {
    // Claude Haiku로 비난→부드러운 시작 변환
    const rawResponse = await generateMessage(
      SOFTENED_STARTUP_SYSTEM,
      [{ role: 'user', content: `다음 메시지를 부드러운 시작으로 변환해주세요:\n\n"${message.trim()}"` }],
      'haiku',
      512
    );

    // JSON 파싱
    let parsed: {
      original: string;
      softened: string;
      explanation: string;
      tip: string;
    };

    try {
      // 마크다운 코드블록이 포함된 경우 제거
      const jsonStr = rawResponse.replace(/```json\n?|\n?```/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      // 파싱 실패 시 원본 응답을 softened로 사용
      return NextResponse.json({
        original: message,
        softened: rawResponse,
        explanation: 'AI가 메시지를 부드럽게 재작성했습니다.',
        tip: '대화 전 잠시 심호흡하고 차분한 상태에서 말씀해 보세요.',
      });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[Draft Builder] 변환 실패:', err);
    return NextResponse.json(
      { error: '메시지 변환 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}
