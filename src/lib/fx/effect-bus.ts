/**
 * 🎬 v79: Effect Bus — 전역 효과 이벤트 디스패처
 *
 * Pipeline SSE 에서 `effect` 이벤트 수신 → useChat 이 dispatch → 컴포넌트 훅들이 구독.
 * EventTarget 기반 (React context 불필요, 어디서든 접근 가능).
 */

export interface FxEvent {
  /** 효과 ID — fx-catalog.ts 참조 (예: 'shake.soft', 'bubble.wobble') */
  id: string;
  /** 타겟 — 어디에 적용되는가 */
  target: 'screen' | 'bubble' | 'text' | 'avatar' | 'particle' | 'bg';
  /** 지속 시간 ms (기본값 카탈로그에 정의) */
  duration?: number;
  /** 추가 파라미터 (intensity, color 등) */
  params?: Record<string, any>;
  /** 타겟 메시지 ID (bubble/text 효과가 특정 말풍선에 적용될 때) */
  messageId?: string;
  /** 타겟 텍스트 구간 (text 효과) */
  textRange?: { start: number; end: number };
}

class EffectBus extends EventTarget {
  private recentFires = new Map<string, number>();
  private readonly DEFAULT_COOLDOWN_MS = 2000;

  /** 효과 발동 — 쿨타임 체크 후 dispatch */
  fire(fx: FxEvent, cooldownMs = this.DEFAULT_COOLDOWN_MS): boolean {
    const key = `${fx.id}:${fx.messageId ?? 'global'}`;
    const lastFired = this.recentFires.get(key) ?? 0;
    const now = Date.now();
    if (now - lastFired < cooldownMs) {
      // 너무 빠른 중복 — 조용히 스킵
      return false;
    }
    this.recentFires.set(key, now);

    // 오래된 엔트리 정리 (1분 이상)
    if (this.recentFires.size > 50) {
      for (const [k, t] of this.recentFires) {
        if (now - t > 60000) this.recentFires.delete(k);
      }
    }

    this.dispatchEvent(new CustomEvent<FxEvent>('fx', { detail: fx }));
    return true;
  }

  /** 효과 구독 — 반환된 함수로 unsubscribe */
  subscribe(handler: (fx: FxEvent) => void): () => void {
    const listener = (e: Event) => {
      const ce = e as CustomEvent<FxEvent>;
      handler(ce.detail);
    };
    this.addEventListener('fx', listener);
    return () => this.removeEventListener('fx', listener);
  }

  /** 특정 ID 만 구독 */
  subscribeId(id: string, handler: (fx: FxEvent) => void): () => void {
    return this.subscribe((fx) => {
      if (fx.id === id) handler(fx);
    });
  }
}

/** 전역 싱글톤 */
export const effectBus = new EffectBus();

/**
 * 유저의 motion preference 체크 + localStorage 토글
 */
export function isFxEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  // 시스템 설정 우선
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // 명시적 ON 으로 덮어쓸 수 있음
    const override = localStorage.getItem('fx_enabled');
    if (override === 'true') return true;
    return false;
  }
  // 기본 ON, 사용자가 OFF 했으면 OFF
  const saved = localStorage.getItem('fx_enabled');
  return saved !== 'false';
}
