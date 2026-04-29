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
  // ☁️ 구름토끼 미미 — 1800×2400, 5열 × 5행 = 25프레임 (360×480/frame)
  // 시트 자체가 "깨어있음 → 졸림 → 잠 → 다시 깨어남" 한 사이클로 디자인됨.
  // 5개 상태 모두 같은 25프레임 루프 공유 (공용 모션).
  cloud_bunny: {
    src: '/splite/room/mimi_sprite.png',
    frameWidth: 360,
    frameHeight: 480,
    totalCols: 5,
    states: {
      idle:   { startFrame: 0, frames: 25, fps: 8 },
      walk:   { startFrame: 0, frames: 25, fps: 8 },
      react:  { startFrame: 0, frames: 25, fps: 8 },
      arrive: { startFrame: 0, frames: 25, fps: 8 },
      sleep:  { startFrame: 0, frames: 25, fps: 8 },
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
  // N (8) — 전부 이미지 보유
  fire_goblin:    '/char_img/도깨비 불꽃.png',
  book_worm:      '/char_img/책벌레 노리.png',
  letter_fairy:   '/char_img/편지요정 루미.png',
  tear_drop:      '/char_img/슬프니.png',
  cloud_bunny:    '/char_img/구름토끼 미미.png',
  wind_sprite:    '/char_img/산들이.png',
  seed_spirit:    '/char_img/새싹이.png',
  drum_imp:       '/char_img/북이.png',
  // R (6) — 전부 이미지 보유
  cherry_leaf:    '/char_img/벚잎이.png',
  moon_rabbit:    '/char_img/달빛토끼.png',
  clown_harley:   '/char_img/광대 할리.png',
  rose_fairy:     '/char_img/로제.png',
  ice_prince:     '/char_img/얼음왕자.png',
  forest_mom:     '/char_img/숲 엄마.png',
  // SR (4) — 3종 이미지 보유 (열쇠지기 클리, 번개새 핏치, 변화나비 메타, 평화비둘기)
  lightning_bird: '/char_img/번개새 핏치.png',
  butterfly_meta: '/char_img/변화나비 메타.png',
  peace_dove:     '/char_img/평화비둘기.png',
  book_keeper:    '/char_img/열쇠지기 클리.png',
  // UR (2) — 미보유 (queen_elena, star_dust)
  // L (1) — 미보유 (guardian_eddy)
};

export function getSpiritCharImg(id: SpiritId): string | undefined {
  return SPIRIT_CHAR_IMGS[id];
}

export function hasSpiritCharImg(id: SpiritId): boolean {
  return id in SPIRIT_CHAR_IMGS;
}
