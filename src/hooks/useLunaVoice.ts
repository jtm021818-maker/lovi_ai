'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * 루나 TTS Hook — 두 엔진 지원 (v118.8).
 *
 *   1. **Edge TTS** (기본) — 서버 /api/tts, 무료 무제한, 평이한 톤
 *   2. **Supertonic v3 (int8, ~145MB)** — 브라우저 온디바이스 ONNX,
 *      한국 회사 캐릭터급 voice, 한 번 다운로드 후 오프라인.
 *
 *   유저는 설정에서 engine='supertonic' 활성화 → 모델 다운로드 →
 *   이후 모든 발화가 Supertonic 으로. 실패 시 Edge 로 자동 폴백.
 */

import type { VoiceId } from '@/lib/tts/supertonic-client';

// ============================================================
// Edge TTS preset 정의 (변경 없음)
// ============================================================
export type LunaVoicePresetId = 'soft' | 'calm' | 'lively';

export interface LunaVoicePreset {
  id: LunaVoicePresetId;
  label: string;
  caption: string;
  emoji: string;
  voice: string;
  pitch: string;
  rate: string;
}

export const LUNA_VOICE_PRESETS: LunaVoicePreset[] = [
  { id: 'soft',   label: '착한 언니', caption: '잔잔하고 다정한 기본 톤', emoji: '🌷', voice: 'ko-KR-SunHiNeural', pitch: '+5Hz', rate: '-10%' },
  { id: 'calm',   label: '새벽 톤',   caption: '깊고 느린 진지한 톤',     emoji: '🌙', voice: 'ko-KR-SunHiNeural', pitch: '-1Hz', rate: '-15%' },
  { id: 'lively', label: '들뜬 톤',   caption: '신나고 재밌는 톤',         emoji: '✨', voice: 'ko-KR-SunHiNeural', pitch: '+8Hz', rate: '+0%' },
];

export function getVoicePreset(id: LunaVoicePresetId | string | undefined): LunaVoicePreset {
  return LUNA_VOICE_PRESETS.find((p) => p.id === id) ?? LUNA_VOICE_PRESETS[0];
}

// ============================================================
// Supertonic voice 메타 정의
// ============================================================
export interface SupertonicVoiceInfo {
  id: VoiceId;
  label: string;
  caption: string;
  emoji: string;
}

export const SUPERTONIC_VOICES: SupertonicVoiceInfo[] = [
  { id: 'F1', label: 'F1', caption: '맑고 또렷한 톤', emoji: '🌸' },
  { id: 'F2', label: 'F2', caption: '차분하고 부드러운', emoji: '🍃' },
  { id: 'F3', label: 'F3', caption: '다정한 언니 톤', emoji: '🌷' },
  { id: 'F4', label: 'F4', caption: '활기차고 밝은', emoji: '✨' },
  { id: 'F5', label: 'F5', caption: '잔잔하고 깊은', emoji: '🌙' },
];

// ============================================================
// Settings + storage
// ============================================================
export type TtsEngine = 'edge' | 'supertonic';

interface LunaVoiceSettings {
  preset: LunaVoicePresetId;
  volume: string;
  enabled: boolean;
  /** v118.8: 어떤 TTS 엔진을 쓸지 */
  engine: TtsEngine;
  /** v118.8: Supertonic 사용 시 voice 선택 */
  supertonicVoice: VoiceId;
}

const DEFAULT_SETTINGS: LunaVoiceSettings = {
  preset: 'soft',
  volume: '+0%',
  enabled: true,
  engine: 'edge',
  supertonicVoice: 'F3',
};

const STORAGE_KEY = 'luna-voice-settings';

const VALID_PRESET_IDS: ReadonlySet<LunaVoicePresetId> = new Set(['soft', 'calm', 'lively']);
const VALID_VOICES: ReadonlySet<VoiceId> = new Set(['F1', 'F2', 'F3', 'F4', 'F5']);
const VALID_ENGINES: ReadonlySet<TtsEngine> = new Set(['edge', 'supertonic']);

function loadSettings(): LunaVoiceSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const preset: LunaVoicePresetId = VALID_PRESET_IDS.has(parsed.preset) ? parsed.preset : DEFAULT_SETTINGS.preset;
      const engine: TtsEngine = VALID_ENGINES.has(parsed.engine) ? parsed.engine : DEFAULT_SETTINGS.engine;
      const supertonicVoice: VoiceId = VALID_VOICES.has(parsed.supertonicVoice) ? parsed.supertonicVoice : DEFAULT_SETTINGS.supertonicVoice;
      return {
        preset,
        volume: parsed.volume ?? DEFAULT_SETTINGS.volume,
        enabled: parsed.enabled ?? DEFAULT_SETTINGS.enabled,
        engine,
        supertonicVoice,
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

// ============================================================
// Supertonic state (모듈 레벨 — 모든 hook 인스턴스 공유)
// ============================================================
export type SupertonicStatus = 'idle' | 'downloading' | 'loading' | 'ready' | 'error';

interface SupertonicState {
  status: SupertonicStatus;
  percent: number;
  label: string;
  error: string | null;
  backend: 'webgpu' | 'wasm' | null;
}

// ============================================================
// Main hook
// ============================================================
export function useLunaVoice() {
  const [settings, setSettings] = useState<LunaVoiceSettings>(DEFAULT_SETTINGS);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supertonic, setSupertonic] = useState<SupertonicState>({
    status: 'idle',
    percent: 0,
    label: '',
    error: null,
    backend: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setSettings(loadSettings());

    // Supertonic 캐시 자동 감지 — 이미 다운로드되어 있으면 ready 로 빠르게 전환
    (async () => {
      try {
        const mod = await import('@/lib/tts/supertonic-client');
        const cached = await mod.SupertonicClient.isCached();
        if (cached) {
          setSupertonic((s) => ({ ...s, status: 'loading', label: '캐시에서 불러오는 중' }));
          const client = mod.SupertonicClient.getInstance();
          await client.ensureReady((p) => {
            setSupertonic({
              status: client.getStatus(),
              percent: p.percent,
              label: p.label,
              error: null,
              backend: client.getBackend(),
            });
          });
          setSupertonic({
            status: 'ready',
            percent: 100,
            label: '준비 완료',
            error: null,
            backend: client.getBackend(),
          });
        }
      } catch (e) {
        console.warn('[LunaVoice] Supertonic 캐시 자동 로드 실패 (무시)', (e as Error).message);
      }
    })();
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

  // ===== Engine: Edge TTS =====
  const speakViaEdge = useCallback(
    async (text: string, signal: AbortSignal): Promise<void> => {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, preset: settings.preset, volume: settings.volume }),
        signal,
      });
      if (!res.ok) throw new Error(`Edge TTS API error: ${res.status}`);
      const blob = await res.blob();
      await playBlob(blob, audioRef, setIsSpeaking);
    },
    [settings.preset, settings.volume],
  );

  // ===== Engine: Supertonic =====
  const speakViaSupertonic = useCallback(
    async (text: string): Promise<void> => {
      const mod = await import('@/lib/tts/supertonic-client');
      const client = mod.SupertonicClient.getInstance();
      if (client.getStatus() !== 'ready') {
        throw new Error('Supertonic not ready');
      }
      const blob = await client.synthesize(text, settings.supertonicVoice, 'ko');
      await playBlob(blob, audioRef, setIsSpeaking);
    },
    [settings.supertonicVoice],
  );

  const speak = useCallback(
    async (text: string) => {
      if (!settings.enabled || !text.trim()) return;
      stop();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsSpeaking(true);

      try {
        // Supertonic 우선 (활성 + ready 상태일 때만)
        if (settings.engine === 'supertonic' && supertonic.status === 'ready') {
          try {
            await speakViaSupertonic(text);
            return;
          } catch (e) {
            console.warn('[LunaVoice] Supertonic 실패 → Edge 폴백', (e as Error).message);
            // 폴백
          }
        }
        await speakViaEdge(text, controller.signal);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('[LunaVoice] TTS 재생 오류:', err?.message);
        }
        setIsSpeaking(false);
      }
    },
    [settings, supertonic.status, speakViaEdge, speakViaSupertonic, stop],
  );

  const toggle = useCallback(
    (text: string) => {
      if (isSpeaking) stop();
      else speak(text);
    },
    [isSpeaking, speak, stop],
  );

  // ===== Supertonic lifecycle =====
  const downloadSupertonic = useCallback(async (): Promise<boolean> => {
    try {
      setSupertonic((s) => ({ ...s, status: 'downloading', percent: 0, error: null, label: '시작 중' }));
      const mod = await import('@/lib/tts/supertonic-client');
      const client = mod.SupertonicClient.getInstance();
      await client.ensureReady((p) => {
        setSupertonic({
          status: client.getStatus(),
          percent: p.percent,
          label: p.label,
          error: null,
          backend: client.getBackend(),
        });
      });
      setSupertonic({
        status: 'ready',
        percent: 100,
        label: '준비 완료',
        error: null,
        backend: client.getBackend(),
      });
      return true;
    } catch (e) {
      const err = e as Error;
      console.error('[LunaVoice] Supertonic 다운로드 실패', err);
      setSupertonic({
        status: 'error',
        percent: 0,
        label: '실패',
        error: err.message,
        backend: null,
      });
      // 실패 시 자동으로 edge 로 되돌림
      updateSettings({ engine: 'edge' });
      return false;
    }
  }, [updateSettings]);

  const clearSupertonicCache = useCallback(async () => {
    try {
      const mod = await import('@/lib/tts/supertonic-client');
      const client = mod.SupertonicClient.getInstance();
      await client.clearCache();
      setSupertonic({ status: 'idle', percent: 0, label: '', error: null, backend: null });
      updateSettings({ engine: 'edge' });
    } catch (e) {
      console.warn('[LunaVoice] 캐시 삭제 실패', (e as Error).message);
    }
  }, [updateSettings]);

  return {
    speak,
    stop,
    toggle,
    isSpeaking,
    isSupported: true,
    settings,
    updateSettings,
    // Supertonic API
    supertonic,
    downloadSupertonic,
    clearSupertonicCache,
  };
}

// ============================================================
// Audio playback helper (shared by both engines)
// ============================================================
async function playBlob(
  blob: Blob,
  audioRef: React.RefObject<HTMLAudioElement | null>,
  setIsSpeaking: (v: boolean) => void,
): Promise<void> {
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
}
