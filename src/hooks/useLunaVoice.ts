'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * 🆕 v23: 루나 캐릭터 TTS Hook — Edge-TTS (ko-KR-SunHiNeural)
 *
 * 보라 여우 캐릭터 = 단아하고 맑은 톤, 신비롭고 영리한 느낌
 * → Voice: ko-KR-SunHiNeural
 * → Pitch: +2Hz (신비로운 느낌)
 * → Rate: -10% (차분한 상담가 톤)
 *
 * 서버 /api/tts 엔드포인트에서 Edge-TTS mp3를 받아 재생
 */

interface LunaVoiceSettings {
  pitch: string;
  rate: string;
  volume: string;
  enabled: boolean;
  autoSpeak: boolean;
}

const DEFAULT_SETTINGS: LunaVoiceSettings = {
  pitch: '+2Hz',
  rate: '-10%',
  volume: '+0%',
  enabled: true,
  autoSpeak: false,
};

const STORAGE_KEY = 'luna-voice-settings';

function loadSettings(): LunaVoiceSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
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

  // 초기화: 설정 로드
  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  // 오디오 정리
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
    setSettings(prev => {
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

  const speak = useCallback(async (text: string) => {
    if (!settings.enabled || !text.trim()) return;

    // 이전 재생 중지
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
          pitch: settings.pitch,
          rate: settings.rate,
          volume: settings.volume,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`TTS API error: ${res.status}`);
      }

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
  }, [settings, stop]);

  const toggle = useCallback((text: string) => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text);
    }
  }, [isSpeaking, speak, stop]);

  return {
    speak,
    stop,
    toggle,
    isSpeaking,
    isSupported: true, // Edge-TTS는 서버 기반이므로 항상 지원
    settings,
    updateSettings,
  };
}
