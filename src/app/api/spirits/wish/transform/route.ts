/**
 * 🌟 v104: POST /api/spirits/wish/transform
 *
 * 별똥이 카드용 — 유저 소원 1줄 → if-then 변환 (Gemini Flash-Lite).
 * commit 은 별도. 이 엔드포인트는 *변환* 만.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { GoogleGenAI } from '@google/genai';

interface TransformBody {
  wish: string;
}

const RISKY_THEN = /(술|소주|맥주|와인|자해|보복|때리|약\s*먹|차단)/;

export async function POST(req: NextRequest) {
  const sb = await createServerSupabaseClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  let body: TransformBody;
  try {
    body = (await req.json()) as TransformBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const wish = (body.wish ?? '').trim();
  if (!wish || wish.length < 3) {
    return NextResponse.json({ error: 'wish_too_short' }, { status: 400 });
  }
  if (wish.length > 200) {
    return NextResponse.json({ error: 'wish_too_long' }, { status: 400 });
  }

  // Gemini 변환
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('no_api_key');
    const gemini = new GoogleGenAI({ apiKey });
    const prompt = `너는 "별똥이" 정령. 몽환 반말 꼬마.
규칙:
- 유저의 추상적 소원 1줄을 *if-then 1개* 로 변환
- if = 구체적 시간/장소/트리거 (필수)
- then = 30초 ~ 5분 안에 끝나는 마이크로 행동 (필수)
- 출력 1개 (다중 X)
- then 이 위험 행동(술/충동 거래/자해)이면 안전 행동으로 재변환
- ifPhrase 는 "if " 또는 "내일 ~" 형식 한국어
- thenPhrase 는 "then ~한다" 또는 "~할게" 한국어

유저 소원: ${wish}

출력은 오직 JSON. 코드블록 금지.
{
  "ifPhrase": "if 절 — 구체적 트리거 (~40자)",
  "thenPhrase": "then 절 — 마이크로 행동 (~50자)",
  "starDustComment": "별똥이 한 줄 (~30자, 몽환)"
}`;

    const resp = await gemini.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const raw = (resp as { text?: string }).text;
    if (!raw) throw new Error('empty_response');
    let parsed: { ifPhrase?: string; thenPhrase?: string; starDustComment?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      parsed = JSON.parse(stripped);
    }
    let ifPhrase = String(parsed.ifPhrase ?? '').trim() || 'if 내일 저녁 8시';
    let thenPhrase = String(parsed.thenPhrase ?? '').trim() || 'then 한 줄만 보낸다.';
    let comment = String(parsed.starDustComment ?? '').trim() || '약속 ✨';

    // 위험 행동 then 검사 → 안전 행동으로 재변환
    if (RISKY_THEN.test(thenPhrase)) {
      thenPhrase = '잠깐 산책 5분 다녀오기';
      comment = '음... 더 안전한 한 걸음으로 빌었어 ㅎ';
    }
    return NextResponse.json({ ifPhrase, thenPhrase, starDustComment: comment });
  } catch (e) {
    console.warn('[wish/transform] fallback', (e as Error).message);
    // 폴백: 정적 if-then
    return NextResponse.json({
      ifPhrase: 'if 내일 저녁 8시',
      thenPhrase: 'then 그 사람한테 한 줄만 보낸다: "오늘 너 생각났어"',
      starDustComment: '한 줄. 한 발자국. 그게 별똥이의 마법이야 ✨',
    });
  }
}
