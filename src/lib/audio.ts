/**
 * 🆕 v112: 사운드 헬퍼 — preload + play 짧은 SFX.
 *
 * Apple WWDC "Harmony" 원칙: 햅틱과 동기화될 때 가장 강한 인상.
 * 진입 chime / chip pop / paper rustle 등 짧은 효과음에만 사용.
 *
 * 🔇 사용자 설정: localStorage.luna_entry_sound === '0' 일 때 비활성.
 *
 * 사운드 파일은 public/sounds/ 에 위치 (없으면 silently skip).
 */

export type SoundKey = 'chime' | 'paper' | 'ping' | 'sparkle' | 'pop';

const SOUND_FILES: Record<SoundKey, string> = {
  chime: '/sounds/chime-soft.mp3',
  paper: '/sounds/paper-rustle.mp3',
  ping: '/sounds/tiny-ping.mp3',
  sparkle: '/sounds/sparkle.mp3',
  pop: '/sounds/chip-pop.mp3',
};

const audioCache = new Map<SoundKey, HTMLAudioElement>();
let preloadDone = false;

/**
 * 사운드 미리 로드 — 페이지 진입 시 한 번 호출 권장.
 */
export function preloadSounds(): void {
  if (typeof window === 'undefined') return;
  if (preloadDone) return;
  preloadDone = true;

  for (const [key, src] of Object.entries(SOUND_FILES)) {
    try {
      const audio = new Audio(src);
      audio.volume = 0.25;
      audio.preload = 'auto';
      audioCache.set(key as SoundKey, audio);
    } catch {
      /* 무시 — autoplay 정책 또는 파일 없음 */
    }
  }
}

/**
 * 사운드 재생. autoplay 차단 / 파일 없음 / 비활성 환경에서는 silently no-op.
 */
export function playSound(key: SoundKey, options: { volume?: number } = {}): void {
  if (typeof window === 'undefined') return;

  // 사용자가 끈 경우
  try {
    if (localStorage.getItem('luna_entry_sound') === '0') return;
  } catch {
    /* 무시 */
  }

  // 미리 로드 안 됐으면 이번에 로드
  if (!preloadDone) preloadSounds();

  const audio = audioCache.get(key);
  if (!audio) return;
  try {
    audio.volume = options.volume ?? 0.25;
    audio.currentTime = 0;
    void audio.play().catch(() => {
      /* autoplay 차단 무시 */
    });
  } catch {
    /* 무시 */
  }
}

/**
 * 사용자 사운드 설정 토글.
 */
export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('luna_entry_sound', enabled ? '1' : '0');
  } catch {
    /* 무시 */
  }
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem('luna_entry_sound') !== '0';
  } catch {
    return true;
  }
}
