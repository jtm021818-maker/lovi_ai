'use client';

import { useEffect, useState } from 'react';
import { effectBus, isFxEnabled } from '@/lib/fx/effect-bus';
import { getFxDefinition } from '@/lib/fx/fx-catalog';

/**
 * 🎬 v79: Screen Shake / Flash / Tint
 *
 * 전역 화면 효과 레이어. 루트에 한 번 마운트.
 * effectBus 구독 후 screen 타겟 FX 감지 시 CSS 애니 발동.
 */

type ActiveFx =
  | { kind: 'shake'; intensity: 'soft' | 'hard'; until: number }
  | { kind: 'flash'; color: string; until: number }
  | { kind: 'tint'; color: string; until: number };

export default function ScreenShake() {
  const [active, setActive] = useState<ActiveFx | null>(null);

  useEffect(() => {
    const unsub = effectBus.subscribe((fx) => {
      if (!isFxEnabled()) return;
      if (fx.target !== 'screen') return;
      const def = getFxDefinition(fx.id);
      if (!def) return;
      const duration = fx.duration ?? def.duration;
      const until = Date.now() + duration;

      if (fx.id === 'shake.soft') setActive({ kind: 'shake', intensity: 'soft', until });
      else if (fx.id === 'shake.hard') setActive({ kind: 'shake', intensity: 'hard', until });
      else if (fx.id === 'flash.white') setActive({ kind: 'flash', color: '#ffffff', until });
      else if (fx.id === 'flash.pink') setActive({ kind: 'flash', color: '#ffc0cb', until });
      else if (fx.id === 'tint.sepia') setActive({ kind: 'tint', color: 'rgba(110,70,30,0.28)', until });
      else if (fx.id === 'tint.cool') setActive({ kind: 'tint', color: 'rgba(80,130,200,0.22)', until });
    });
    return unsub;
  }, []);

  // 자동 해제
  useEffect(() => {
    if (!active) return;
    const remaining = Math.max(0, active.until - Date.now());
    const t = window.setTimeout(() => setActive(null), remaining);
    return () => window.clearTimeout(t);
  }, [active]);

  // 화면 shake: body 에 class 추가/제거
  useEffect(() => {
    if (!active || active.kind !== 'shake') return;
    const cls = active.intensity === 'hard' ? 'fx-shake-hard' : 'fx-shake-soft';
    document.body.classList.add(cls);
    return () => document.body.classList.remove(cls);
  }, [active]);

  // Flash / Tint 오버레이
  if (!active || active.kind === 'shake') return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9996]"
      style={{
        background: active.color,
        animation: active.kind === 'flash'
          ? 'fx-flash-out 0.3s ease-out forwards'
          : 'fx-tint-cycle 2s ease-in-out forwards',
        mixBlendMode: active.kind === 'tint' ? 'multiply' : 'screen',
      }}
    />
  );
}
