import { NextRequest, NextResponse } from 'next/server';
import { EdgeTTS } from 'node-edge-tts';
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserTier } from '@/lib/subscription';

/**
 * Edge-TTS API Route — 보라 여우 캐릭터 전용
 *
 * Voice: ko-KR-SunHiNeural (단아하고 맑은 톤)
 * Pitch: +2Hz (신비롭고 영리한 느낌)
 * Rate: -10% (차분하고 여유 있는 상담가 톤)
 */

const DEFAULT_VOICE = 'ko-KR-SunHiNeural';
const DEFAULT_PITCH = '+2Hz';
const DEFAULT_RATE = '-10%';
const DEFAULT_VOLUME = '+0%';

/** 텍스트 전처리: 이모지, [STICKER:xxx], 마크다운 제거 */
function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\[STICKER:\w+\]/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]/gu, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ', ')
    .trim();
}

export async function POST(req: NextRequest) {
  // 프리미엄 체크
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tier = await getUserTier(user.id);
  if (tier !== 'premium') {
    return NextResponse.json({ error: 'Premium feature', upgrade: true }, { status: 403 });
  }

  const tmpPath = join(tmpdir(), `tts-${randomUUID()}.mp3`);

  try {
    const { text, pitch, rate, volume } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const cleaned = cleanTextForSpeech(text);
    if (!cleaned) {
      return NextResponse.json({ error: 'text is empty after cleaning' }, { status: 400 });
    }

    const tts = new EdgeTTS({
      voice: DEFAULT_VOICE,
      pitch: pitch || DEFAULT_PITCH,
      rate: rate || DEFAULT_RATE,
      volume: volume || DEFAULT_VOLUME,
    });

    await tts.ttsPromise(cleaned, tmpPath);

    const audioBuffer = await readFile(tmpPath);

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.length),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: any) {
    console.error('[TTS] Edge-TTS 오류:', err?.message);
    return NextResponse.json(
      { error: 'TTS generation failed', detail: err?.message },
      { status: 500 }
    );
  } finally {
    // 임시 파일 정리
    unlink(tmpPath).catch(() => {});
  }
}
