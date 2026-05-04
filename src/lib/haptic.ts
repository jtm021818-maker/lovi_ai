/**
 * 🆕 v112: 햅틱 헬퍼 — Vibration API + iOS Web Haptic 폴백
 *
 * Apple WWDC "Harmony" 원칙: 시각/청각/촉각 일관되게 작동할 때 가장 강한 인상.
 * 진입 ritual / chip 클릭 / badge 탭 등에서 사용.
 *
 * 🔇 사용자 설정: localStorage.luna_entry_haptic === '0' 일 때 비활성.
 */

export type HapticIntensity = 'light' | 'medium' | 'heavy' | 'selection';

interface NavigatorWithHaptic extends Navigator {
  hapticFeedback?: { impact: (intensity: HapticIntensity) => void };
}

/**
 * 햅틱 트리거. 사용 불가 / 비활성 환경에서는 silently no-op.
 */
export function triggerHaptic(intensity: HapticIntensity = 'light'): void {
  if (typeof window === 'undefined') return;

  // 사용자가 끈 경우
  try {
    if (localStorage.getItem('luna_entry_haptic') === '0') return;
  } catch {
    /* localStorage 접근 실패 무시 */
  }

  const nav = navigator as NavigatorWithHaptic;

  // iOS Web Haptic (Safari 17+, 실험적)
  if (typeof nav.hapticFeedback?.impact === 'function') {
    try {
      nav.hapticFeedback.impact(intensity);
      return;
    } catch {
      /* fallback */
    }
  }

  // Android / 일반 — Vibration API
  if ('vibrate' in nav && typeof nav.vibrate === 'function') {
    const durations: Record<HapticIntensity, number> = {
      light: 10,
      medium: 25,
      heavy: 50,
      selection: 5,
    };
    try {
      nav.vibrate(durations[intensity]);
    } catch {
      /* 무시 */
    }
  }
}

/**
 * 햅틱 사용 가능 여부 — 컴포넌트가 토글 표시 결정에 사용.
 */
export function isHapticAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as NavigatorWithHaptic;
  return typeof nav.hapticFeedback?.impact === 'function' || (typeof nav.vibrate === 'function');
}

/**
 * 사용자 햅틱 설정 토글.
 */
export function setHapticEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('luna_entry_haptic', enabled ? '1' : '0');
  } catch {
    /* 무시 */
  }
}

export function isHapticEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem('luna_entry_haptic') !== '0';
  } catch {
    return true;
  }
}
