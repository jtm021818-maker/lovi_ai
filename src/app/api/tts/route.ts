import { NextRequest, NextResponse } from 'next/server';
import { EdgeTTS } from 'node-edge-tts';
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserTier } from '@/lib/subscription';

/**
 * Edge-TTS API Route — 루나 캐릭터 전용 (Microsoft Azure Neural Voices, 무료 무제한)
 *
 * v118.4: 자유 pitch/rate 입력 폐지. 4개 캐릭터 프리셋 ID 만 받음.
 *   - soft   : SunHi -10% +2Hz (기본 — 단아)
 *   - bright : YuJin  +0% +3Hz (밝은 톤)
 *   - calm   : JiMin -15% -1Hz (차분 새벽)
 *   - clear  : SunHi  +0% +5Hz (또렷)
 */

type PresetId = 'soft' | 'bright' | 'calm' | 'clear';

const PRESETS: Record<PresetId, { voice: string; pitch: string; rate: string }> = {
  soft:   { voice: 'ko-KR-SunHiNeural', pitch: '+2Hz', rate: '-10%' },
  bright: { voice: 'ko-KR-YuJinNeural', pitch: '+3Hz', rate: '+0%' },
  calm:   { voice: 'ko-KR-JiMinNeural', pitch: '-1Hz', rate: '-15%' },
  clear:  { voice: 'ko-KR-SunHiNeural', pitch: '+5Hz', rate: '+0%' },
};

const DEFAULT_PRESET: PresetId = 'soft';
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
    const { text, preset, volume } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const cleaned = cleanTextForSpeech(text);
    if (!cleaned) {
      return NextResponse.json({ error: 'text is empty after cleaning' }, { status: 400 });
    }

    const presetId: PresetId = (preset && PRESETS[preset as PresetId]) ? (preset as PresetId) : DEFAULT_PRESET;
    const { voice, pitch, rate } = PRESETS[presetId];

    const tts = new EdgeTTS({
      voice,
      pitch,
      rate,
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
