/**
 * v85.4: Spirit Sprite System — 스프라이트 시트 기반 고퀄 정령 애니메이션
 *
 * 설계:
 *   - 49프레임 스프라이트 시트 (16열 × 5행)
 *   - 5개 상태: idle / walk / react / arrive / sleep
 *   - CSS background-position + steps() 대신 rAF 기반 수동 프레임 진행 (FPS 유연 제어)
 *   - 등록 안 된 정령은 기존 이모지 fallback
 */

export type SpiritAnimState = 'idle' | 'walk' | 'react' | 'arrive' | 'sleep';

export interface SpiritSpriteState {
  /**
   * 시트 내 절대 시작 프레임 인덱스 (0-based).
   * col = startFrame % totalCols, row = Math.floor(startFrame / totalCols) 로 계산.
   */
  startFrame: number;
  /** 해당 상태의 프레임 수 */
  frames: number;
  /** 프레임 per 초 */
  fps: number;
  /** true: 한 번 재생 후 onComplete 호출 후 정지, false: 무한 루프 */
  once?: boolean;
}

export interface SpiritSpriteSheet {
  /** 시트 이미지 경로 */
  src: string;
  /** 한 프레임의 너비 (px) */
  frameWidth: number;
  /** 한 프레임의 높이 (px) */
  frameHeight: number;
  /** 시트의 열 수 (frames per row) */
  totalCols: number;
  /** 상태별 설정 */
  states: Record<SpiritAnimState, SpiritSpriteState>;
  /** 렌더링 스케일 (기본 1) */
  displayScale?: number;
  /** 픽셀 아트면 true (image-rendering: pixelated) */
  pixelated?: boolean;
}
