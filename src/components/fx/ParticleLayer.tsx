'use client';

import { useEffect, useRef } from 'react';
import { effectBus, isFxEnabled } from '@/lib/fx/effect-bus';

/**
 * 🎬 v79: Particle Layer — 하트/눈물/불꽃/별 파티클 버스트
 *
 * canvas-confetti + js-confetti 사용. 둘 다 전역 canvas 를 재사용해서 성능 좋음.
 * effectBus 구독해서 particle.* 타겟 감지 시 발동.
 */

// Lazy instances — 첫 발동 시만 import
let jsConfettiInstance: any = null;

async function getJsConfetti() {
  if (!jsConfettiInstance) {
    const { default: JSConfetti } = await import('js-confetti');
    jsConfettiInstance = new JSConfetti();
  }
  return jsConfettiInstance;
}

async function fireHearts() {
  const mod = await import('canvas-confetti');
  const confetti = mod.default;
  // 하트 모양 path
  const heartPath = confetti.shapeFromPath({
    path: 'M10,30 A20,20,0,0,1,50,30 A20,20,0,0,1,90,30 Q90,60,50,90 Q10,60,10,30 Z',
  });
  confetti({
    particleCount: 40,
    spread: 80,
    startVelocity: 32,
    scalar: 0.9,
    shapes: [heartPath],
    colors: ['#ff6b9d', '#ff8fb1', '#ff4d8b', '#ffb3c9'],
    origin: { x: 0.5, y: 0.6 },
    zIndex: 9997,
  });
}

async function fireConfetti() {
  const mod = await import('canvas-confetti');
  mod.default({
    particleCount: 80,
    spread: 100,
    origin: { x: 0.5, y: 0.7 },
    zIndex: 9997,
  });
}

async function fireEmojis(emojis: string[], count = 30) {
  const jc = await getJsConfetti();
  jc.addConfetti({ emojis, emojiSize: 40, confettiNumber: count });
}

export default function ParticleLayer() {
  const pendingRef = useRef(false);

  useEffect(() => {
    const unsub = effectBus.subscribe((fx) => {
      if (!isFxEnabled()) return;
      if (fx.target !== 'particle') return;
      if (pendingRef.current) return; // 동시 다발 방지

      pendingRef.current = true;
      setTimeout(() => { pendingRef.current = false; }, 300);

      try {
        switch (fx.id) {
          case 'particle.hearts':
            fireHearts();
            break;
          case 'particle.confetti':
            fireConfetti();
            break;
          case 'particle.tears':
            fireEmojis(['💧', '😢'], 20);
            break;
          case 'particle.fire':
            fireEmojis(['🔥', '💢'], 24);
            break;
          case 'particle.stars':
            fireEmojis(['⭐', '✨'], 24);
            break;
          case 'particle.sparkles':
            fireEmojis(['✨', '💫'], 20);
            break;
          case 'rain.tears':
            fireEmojis(['💧'], 40);
            break;
          default:
            break;
        }
      } catch (e) {
        console.warn('[FX:particle] 실패:', e);
      }
    });
    return unsub;
  }, []);

  return null;
}
