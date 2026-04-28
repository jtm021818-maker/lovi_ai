/**
 * v85.4: Spirit Sprite Registry
 *
 * 실제 이미지 분석 결과:
 *   moon_rabit_sprite_myroom.png = 768×1376px
 *   → 6열 × 8행, 프레임 한 장 = 128×172px
 *   → startFrame 방식 (절대 프레임 인덱스, 행/열 자동 계산)
 *
 * 프레임 배분 (총 48프레임):
 *   idle   startFrame=0,  frames=12 (행 0-1)
 *   walk   startFrame=12, frames=16 (행 2-4, 마지막 행 4칸만)
 *   react  startFrame=28, frames=10 (행 4 나머지 + 행 5-6)
 *   arrive startFrame=38, frames=6  (행 6-7 일부)
 *   sleep  startFrame=44, frames=4  (행 7 나머지)
 */

import type { SpiritId } from '@/types/spirit.types';
import type { SpiritSpriteSheet } from '@/types/spirit-sprite.types';

export const SPIRIT_SPRITES: Partial<Record<SpiritId, SpiritSpriteSheet>> = {
  moon_rabbit: {
    src: '/splite/moon_rabit_sprite_myroom.webp',
    frameWidth: 128,
    frameHeight: 172,
    totalCols: 6,
    displayScale: 0.375,   // 128 × 0.375 ≈ 48px (방에서 자연스러운 크기)
    pixelated: false,
    states: {
      idle:   { startFrame: 0,  frames: 12, fps: 8 },
      walk:   { startFrame: 12, frames: 16, fps: 12 },
      react:  { startFrame: 28, frames: 10, fps: 14, once: true },
      arrive: { startFrame: 38, frames: 6,  fps: 12, once: true },
      sleep:  { startFrame: 44, frames: 4,  fps: 6 },
    },
  },
};

export function getSpiritSprite(id: SpiritId): SpiritSpriteSheet | undefined {
  return SPIRIT_SPRITES[id];
}

export function hasSpiritSprite(id: SpiritId): boolean {
  return id in SPIRIT_SPRITES;
}

// ─── 정적 캐릭터 이미지 (스프라이트 시트 없는 정령용) ─────────────
export const SPIRIT_CHAR_IMGS: Partial<Record<SpiritId, string>> = {
  fire_goblin:  '/char_img/도깨비 불꽃.png',
  book_worm:    '/char_img/책벌레 노리.png',
  letter_fairy: '/char_img/편지요정 루미.png',
  tear_drop:    '/char_img/슬프니.png',
  cloud_bunny:  '/char_img/구름토끼 미미.png',
  wind_sprite:  '/char_img/산들이.png',
  seed_spirit:  '/char_img/새싹이.png',
  drum_imp:     '/char_img/북이.png',
};

export function getSpiritCharImg(id: SpiritId): string | undefined {
  return SPIRIT_CHAR_IMGS[id];
}

export function hasSpiritCharImg(id: SpiritId): boolean {
  return id in SPIRIT_CHAR_IMGS;
}
