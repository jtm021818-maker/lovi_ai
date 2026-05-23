'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * 루나 캐릭터 TTS Hook — Edge-TTS (ko-KR Neural voices, 무료 무제한)
 *
 * v118.4 변경: 슬라이더(속도/음높이) 제거 → 캐릭터 톤 프리셋 선택으로 교체.
 *   2026-05 기준 무료 옵션 리서치 결과 Edge TTS 가 여전히 최선.
 *   유저가 수치 조절할 필요 없도록 4개 캐릭터 프리셋만 노출.
 */

export type LunaVoicePresetId = 'soft' | 'bright' | 'calm' | 'clear';

export interface LunaVoicePreset {
  id: LunaVoicePresetId;
  label: string;
  caption: string;
  emoji: string;
  voice: string;   // Azure Neural voice id
  pitch: string;
  rate: string;
}

export const LUNA_VOICE_PRESETS: LunaVoicePreset[] = [
  {
    id: 'soft',
    label: '루나 기본',
    caption: '단아하고 잔잔한 언니 톤',
    emoji: '🌷',
    voice: 'ko-KR-SunHiNeural',
    pitch: '+2Hz',
    rate: '-10%',
  },
  {
    id: 'bright',
    label: '밝은 루나',
    caption: '들떠있고 살짝 빠른',
    emoji: '✨',
    voice: 'ko-KR-YuJinNeural',
    pitch: '+3Hz',
    rate: '+0%',
  },
  {
    id: 'calm',
    label: '차분 루나',
    caption: '깊고 느린 새벽톤',
    emoji: '🌙',
    voice: 'ko-KR-JiMinNeural',
    pitch: '-1Hz',
    rate: '-15%',
  },
  {
    id: 'clear',
    label: '또렷 루나',
    caption: '명료한 발음 강조',
    emoji: '💎',
    voice: 'ko-KR-SunHiNeural',
    pitch: '+5Hz',
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

function loadSettings(): LunaVoiceSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // v118.4 마이그레이션: 이전 pitch/rate 키 무시, preset 만 살림 (있으면)
      return {
        preset: (parsed.preset as LunaVoicePresetId) ?? DEFAULT_SETTINGS.preset,
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
