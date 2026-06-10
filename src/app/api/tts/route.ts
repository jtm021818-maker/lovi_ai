import { NextRequest, NextResponse } from 'next/server';
import { EdgeTTS } from 'node-edge-tts';
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserTier } from '@/lib/subscription';

/**
 * Edge-TTS API Route — 루나 캐릭터 (Microsoft Azure Neural Voices, 무료 무제한)
 *
 * v118.6 (2026-05): "착한 언니 루나" 톤 극한 커스텀.
 *   Edge TTS 한계 (SSML <break>/<emphasis>/<mstts:express-as> 미지원) 안에서
 *   prosody rate/pitch + 텍스트 문장부호 hack 으로 캐릭터성 최대화.
 *
 * 프리셋 (모두 ko-KR-SunHiNeural — Edge endpoint ko 보이스는 SunHi/InJoon 2개뿐):
 *   - soft   : -10% / +5Hz (기본, 착한 언니 톤)
 *   - calm   : -15% / -1Hz (깊은 밤·진지)
 *   - lively : +0%  / +8Hz (신난·재밌는)
 */

type PresetId = 'soft' | 'calm' | 'lively';

const PRESETS: Record<PresetId, { voice: string; pitch: string; rate: string }> = {
  soft:   { voice: 'ko-KR-SunHiNeural', pitch: '+5Hz', rate: '-10%' },
  calm:   { voice: 'ko-KR-SunHiNeural', pitch: '-1Hz', rate: '-15%' },
  lively: { voice: 'ko-KR-SunHiNeural', pitch: '+8Hz', rate: '+0%'  },
};

const DEFAULT_PRESET: PresetId = 'soft';
const DEFAULT_VOLUME = '+0%';

/**
 * 카톡 톤 텍스트 → 자연스러운 발화 텍스트 변환 (v118.6).
 *
 * 핵심 변환:
 *   1. 카톡 burst (`|||`) → ` ... ` (Edge TTS 가 자연 호흡 + pause 로 발화)
 *   2. 카톡 의성어 (`ㅋㅋ`, `ㅎㅎ`, `ㅠㅠ`) 제거 — 그대로 읽으면 매우 부자연스러움
 *   3. 마크다운/이모지/스티커/FX/PHASE 태그 모두 제거
 *   4. 연속 마침표 정규화 `....` → `... `
 *   5. 연속 느낌표 `!!` → `!`
 *   6. 문장부호 뒤 공백 보장
 *
 * Edge TTS SSML break/emphasis 미지원 → 문장부호 hack 으로 호흡 시뮬레이션.
 */
function humanizeForSpeech(text: string): string {
  return text
    // 1. 시스템 태그 제거 (대화에 떠도는 메타)
    .replace(/\[STICKER:[^\]]+\]/g, '')
    .replace(/\[FX:[^\]]+\](?:\[\/FX\])?/g, '')
    .replace(/\[\/FX\]/g, '')
    .replace(/\[DELAY:[^\]]+\]/g, '')
    .replace(/\[TYPING\]/g, '')
    .replace(/\[SILENCE\]/g, '')
    .replace(/\[NICKNAME_PROPOSE\s+[^\]]+\]/g, '')
    .replace(/\[(MIND_READ_READY|STRATEGY_READY|ACTION_PLAN|WARM_WRAP|CASUAL_BYE|HEAVY_TURN|CATCHUP_OPEN|BANTER_FLOW|LINGER_START|REQUEST_REANALYSIS|LEFT_BRAIN_HINT|OPERATION_COMPLETE|SONG_READY|DATE_SPOT_READY|GIFT_READY|ACTIVITY_READY|ANNIVERSARY_READY|MOVIE_READY|BROWSE_READY|IDEA_REFINE|TAROT_READY|PATTERN_MIRROR_READY|STORY_READY)(?::[^\]]*)?\]/g, '')
    // 2. 마크다운 강조 제거 (단어 강조는 보존하기 위해 텍스트만 남김)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    // 3. 이모지 제거 (음성 발화에 그대로 읽히면 어색)
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '')
    // 4. 카톡 burst 구분자 → 호흡 (말줄임표 + 공백)
    .replace(/\|\|\|/g, ' ... ')
    // 5. 한국어 의성어 정리 (Edge TTS 가 부자연스럽게 발음)
    .replace(/ㅋ{2,}/g, ' ')       // ㅋㅋ, ㅋㅋㅋ 등 제거 (공백 보존)
    .replace(/ㅎ{2,}/g, ' ')       // ㅎㅎ, ㅎㅎㅎ 등 제거
    .replace(/ㅠ{2,}/g, ' ... ')   // ㅠㅠ → 약한 한숨 호흡
    .replace(/ㅜ{2,}/g, ' ... ')   // ㅜㅜ → 약한 한숨 호흡
    .replace(/[\^]{1,2}/g, '')      // ^^, ^ 제거
    // 6. 연속 마침표 → 표준 말줄임표 (Edge TTS 가 자연 pause)
    .replace(/\.{4,}/g, '... ')
    .replace(/\.{3}/g, '... ')
    // 7. 연속 느낌표/물음표 정규화
    .replace(/!{2,}/g, '!')
    .replace(/\?{2,}/g, '?')
    // 8. 문장부호 뒤 공백 보장 (없으면 추가)
    .replace(/([.!?])(?=[가-힣A-Za-z])/g, '$1 ')
    .replace(/,(?=[가-힣A-Za-z])/g, ', ')
    // 9. 줄바꿈 → 자연스러운 호흡
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ', ')
    // 10. 다중 공백 정규화
    .replace(/[ \t]{2,}/g, ' ')
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

    const cleaned = humanizeForSpeech(text);
    if (!cleaned) {
      return NextResponse.json({ error: 'text is empty after cleaning' }, { status: 400 });
    }

    const presetId: PresetId = (preset && PRESETS[preset as PresetId]) ? (preset as PresetId) : DEFAULT_PRESET;
    const { voice, pitch, rate } = PRESETS[presetId];

    // 🆕 fix: Edge TTS 무료 엔드포인트(Microsoft)는 간헐적 500/네트워크 오류가 잦음.
    //   → 짧은 백오프로 재시도해 transient 실패를 흡수. 음성은 부가 기능이라 끝까지 실패해도
    //     채팅 텍스트 흐름은 영향 없음 (클라이언트가 조용히 스킵하도록 503+skip 신호 반환).
    const MAX_TTS_ATTEMPTS = 3;
    let audioBuffer: Buffer | null = null;
    let lastErr: unknown = null;
    for (let attempt = 1; attempt <= MAX_TTS_ATTEMPTS; attempt++) {
      try {
        const tts = new EdgeTTS({ voice, pitch, rate, volume: volume || DEFAULT_VOLUME });
        await tts.ttsPromise(cleaned, tmpPath);
        const buf = await readFile(tmpPath);
        if (buf && buf.length > 0) {
          audioBuffer = buf;
          break;
        }
        throw new Error('empty audio buffer');
      } catch (e) {
        lastErr = e;
        console.warn(`[TTS] Edge-TTS 실패 (${attempt}/${MAX_TTS_ATTEMPTS}): ${(e as { message?: string })?.message}`);
        if (attempt < MAX_TTS_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 300 * attempt)); // 300ms → 600ms 백오프
        }
      }
    }

    if (!audioBuffer) {
      // 모든 재시도 소진 — 음성만 스킵, 텍스트는 정상. 503(서비스 일시 불가) + skip 플래그.
      console.warn('[TTS] 모든 재시도 소진 → 음성 스킵 (텍스트 정상)');
      return NextResponse.json(
        { error: 'TTS temporarily unavailable', skip: true, detail: (lastErr as { message?: string })?.message },
        { status: 503 }
      );
    }

    return new NextResponse(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.length),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: any) {
    console.error('[TTS] 처리 오류:', err?.message);
    return NextResponse.json(
      { error: 'TTS generation failed', detail: err?.message },
      { status: 500 }
    );
  } finally {
    unlink(tmpPath).catch(() => {});
  }
}
