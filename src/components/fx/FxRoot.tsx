'use client';

import ScreenShake from './ScreenShake';
import ParticleLayer from './ParticleLayer';

/**
 * 🎬 v79: FxRoot — 전역 FX 레이어 루트
 *
 * 루트 레이아웃에 한 번 마운트.
 * - ScreenShake: shake/flash/tint 오버레이
 * - ParticleLayer: 파티클 버스트 (lazy canvas-confetti)
 * - (향후) SakuraLayer, EmojiFloatLayer 등 추가 가능
 */
export default function FxRoot() {
  return (
    <>
      <ScreenShake />
      <ParticleLayer />
    </>
  );
}
