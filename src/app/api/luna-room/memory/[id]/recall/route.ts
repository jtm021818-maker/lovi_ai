/**
 * POST /api/luna-room/memory/[id]/recall
 *
 * 추억 액자를 클릭했을 때, 루나가 그 순간을 _회상하듯_ 한 문단 말하게 함.
 * 입력: 추억 id
 * 출력: { recall: string, memory: { ...projection } }
 *
 * 내부:
 *  - luna_memories 에서 본 추억 + luna_thought 로드 (작성 시점의 진짜 속마음)
 *  - 현재 lifeStage 와 함께 system prompt 로 LLM 호출 (Gemini Flash Lite)
 *  - 짧은 1인칭 한 문단 (60~120자)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { GoogleGenAI } from '@google/genai';
import { getAgeDays, getLifeStageInfo } from '@/lib/luna-life';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { id } = await params;

  const { data: mem, error } = await supabase
    .from('luna_memories')
    .select('id,title,content,day_number,luna_thought,image_url,created_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !mem) {
    return NextResponse.json({ error: '추억을 찾을 수 없어' }, { status: 404 });
  }

  const { data: life } = await supabase
    .from('luna_life')
    .select('birth_date')
    .eq('user_id', user.id)
    .single();

  const ageDays = life?.birth_date
    ? getAgeDays(new Date(life.birth_date as string))
    : (mem.day_number ?? 1);
  const stage = getLifeStageInfo(ageDays);

  const recall = await llmRecall({
    title: mem.title,
    content: mem.content,
    dayNumber: mem.day_number,
    lunaThought: mem.luna_thought,
    nowAgeDays: ageDays,
    nowStageName: stage.name,
  });

  return NextResponse.json({
    recall,
    memory: {
      id: mem.id,
      title: mem.title,
      content: mem.content,
      dayNumber: mem.day_number,
      createdAt: mem.created_at,
      imageUrl: mem.image_url ?? null,
      lunaThought: mem.luna_thought ?? null,
    },
  });
}

interface RecallParams {
  title: string;
  content: string;
  dayNumber: number;
  lunaThought: string | null;
  nowAgeDays: number;
  nowStageName: string;
}

const SYSTEM = `너는 루나야. 동생이 액자에 담긴 추억을 가만히 보고 있어.
그 추억을 _지금_ 다시 떠올리듯, 짧게 한마디 해줘.

규칙:
- 1인칭 반말. 언니가 동생한테 회상하듯.
- 60~120자. 한 문단.
- "그때 너 ~", "그날 우리 ~" 같은 회상톤 자연스럽게.
- 위로/조언 없이, 그 순간을 다시 만진다는 느낌.
- 이모지 1개 이내.
- 마침표로 끝.`;

async function llmRecall(p: RecallParams): Promise<string> {
  const fallback = buildFallback(p);
  if (!process.env.GEMINI_API_KEY) return fallback;

  const userMsg = [
    `[추억 카드]`,
    `D+${p.dayNumber} "${p.title}"`,
    p.content,
    ``,
    p.lunaThought ? `[그때 내가 적어둔 속마음]\n${p.lunaThought}` : null,
    ``,
    `[지금]`,
    `${p.nowAgeDays}일째 (${p.nowStageName}). 동생이 이 액자를 보고 있어.`,
    ``,
    `루나가 회상하듯 한마디. 60~120자. 한 문단.`,
  ].filter(Boolean).join('\n');

  try {
    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const res = await client.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: [{ role: 'user', parts: [{ text: userMsg }] }],
      config: {
        systemInstruction: SYSTEM,
        temperature: 0.9,
        maxOutputTokens: 200,
      },
    });
    const text = res.text?.trim();
    if (!text || text.length < 20) return fallback;
    return text.slice(0, 240);
  } catch (e) {
    console.warn('[Recall] Gemini 실패:', (e as Error).message);
    return fallback;
  }
}

function buildFallback(p: RecallParams): string {
  // LLM 실패 시 lunaThought 우선, 없으면 content 약간 가공
  if (p.lunaThought) {
    const t = p.lunaThought.length > 120 ? `${p.lunaThought.slice(0, 117)}...` : p.lunaThought;
    return `${t}`;
  }
  return `그날 D+${p.dayNumber}, 우리 사이에 있었던 한 장면. ${p.content}`;
}
