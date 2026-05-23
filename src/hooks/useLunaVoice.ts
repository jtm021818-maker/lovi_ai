'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * 루나 캐릭터 TTS Hook — Edge-TTS (ko-KR Neural voices, 무료 무제한)
 *
 * v118.4 변경: 슬라이더(속도/음높이) 제거 → 캐릭터 톤 프리셋 선택으로 교체.
 *   2026-05 기준 무료 옵션 리서치 결과 Edge TTS 가 여전히 최선.
 *   유저가 수치 조절할 필요 없도록 4개 캐릭터 프리셋만 노출.
 */

export type LunaVoicePresetId = 'soft' | 'calm' | 'lively';

export interface LunaVoicePreset {
  id: LunaVoicePresetId;
  label: string;
  caption: string;
  emoji: string;
  voice: string;   // Azure Neural voice id
  pitch: string;
  rate: string;
}

// v118.6 (2026-05): 착한 언니 루나 톤 극한 커스텀.
//   Edge TTS 무료 ko 보이스는 SunHi/InJoon 2개뿐 — 전부 SunHi base.
//   유저 추천 세팅(rate -10%, pitch +5Hz)을 'soft' 기본으로 채택.
//   프리셋 4개 → 3개로 축소 (정체성 명확화).
export const LUNA_VOICE_PRESETS: LunaVoicePreset[] = [
  {
    id: 'soft',
    label: '착한 언니',
    caption: '잔잔하고 다정한 기본 톤',
    emoji: '🌷',
    voice: 'ko-KR-SunHiNeural',
    pitch: '+5Hz',
    rate: '-10%',
  },
  {
    id: 'calm',
    label: '새벽 톤',
    caption: '깊고 느린 진지한 톤',
    emoji: '🌙',
    voice: 'ko-KR-SunHiNeural',
    pitch: '-1Hz',
    rate: '-15%',
  },
  {
    id: 'lively',
    label: '들뜬 톤',
    caption: '신나고 재밌는 톤',
    emoji: '✨',
    voice: 'ko-KR-SunHiNeural',
    pitch: '+8Hz',
    rate: '+0%',
  },
];

export function getVoicePreset(id: LunaVoicePresetId | string | undefined): LunaVoicePreset {
  return LUNA_VOICE_PRESETS.find((p) => p.id === id) ?? LUNA_VOICE_PRESETS[0];
}

interface LunaVoiceSettings {
  preset: LunaVoicePresetId;
  volume: string;
  enabled: boolean;
  autoSpeak: boolean;
}

const DEFAULT_SETTINGS: LunaVoiceSettings = {
  preset: 'soft',
  volume: '+0%',
  enabled: true,
  autoSpeak: false,
};

const STORAGE_KEY = 'luna-voice-settings';

const VALID_PRESET_IDS: ReadonlySet<LunaVoicePresetId> = new Set(['soft', 'calm', 'lively']);

function loadSettings(): LunaVoiceSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // v118.6 마이그레이션: 이전 preset(bright/clear) → soft 폴백
      const rawPreset = parsed.preset;
      const preset: LunaVoicePresetId =
        VALID_PRESET_IDS.has(rawPreset) ? rawPreset : DEFAULT_SETTINGS.preset;
      return {
        preset,
        volume: parsed.volume ?? DEFAULT_SETTINGS.volume,
        enabled: parsed.enabled ?? DEFAULT_SETTINGS.enabled,
        autoSpeak: parsed.autoSpeak ?? DEFAULT_SETTINGS.autoSpeak,
      };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: LunaVoiceSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export function useLunaVoice() {
  const [settings, setSettings] = useState<LunaVoiceSettings>(DEFAULT_SETTINGS);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  const updateSettings = useCallback((partial: Partial<LunaVoiceSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!settings.enabled || !text.trim()) return;
      stop();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        setIsSpeaking(true);
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            preset: settings.preset,
            volume: settings.volume,
          }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`TTS API error: ${res.status}`);

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          setIsSpeaking(false);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          setIsSpeaking(false);
        };

        await audio.play();
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('[LunaVoice] TTS 재생 오류:', err?.message);
        }
        setIsSpeaking(false);
      }
    },
    [settings, stop],
  );

  const toggle = useCallback(
    (text: string) => {
      if (isSpeaking) stop();
      else speak(text);
    },
    [isSpeaking, speak, stop],
  );

  return {
    speak,
    stop,
    toggle,
    isSpeaking,
    isSupported: true,
    settings,
    updateSettings,
  };
}
