/**
 * Bounding Box 정규화/변환
 * Plan: docs/xray-v2-pro-plan.md §2.2
 *
 * Gemini는 0-1000 normalized 좌표 [ymin, xmin, ymax, xmax]를 반환한다.
 * 픽셀 좌표 변환 + 클램핑 + 비율 검증.
 */

import type { BoundingBox } from './types-v2';

export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 0-1000 → 픽셀 (특정 이미지 dim 기준) */
export function bboxToPixel(
  bbox: BoundingBox,
  imageWidth: number,
  imageHeight: number,
): PixelRect {
  const norm = (n: number, max: number) => {
    const clamped = Math.max(0, Math.min(1000, n));
    return Math.round((clamped / 1000) * max);
  };

  const x1 = norm(bbox.xmin, imageWidth);
  const y1 = norm(bbox.ymin, imageHeight);
  const x2 = norm(bbox.xmax, imageWidth);
  const y2 = norm(bbox.ymax, imageHeight);

  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.max(1, Math.abs(x2 - x1)),
    height: Math.max(1, Math.abs(y2 - y1)),
  };
}

/** 0-1000 → CSS percentage (이미지 컨테이너 기준 % 표현) */
export function bboxToPercent(bbox: BoundingBox): {
  top: string;
  left: string;
  width: string;
  height: string;
} {
  const ymin = Math.max(0, Math.min(1000, bbox.ymin));
  const xmin = Math.max(0, Math.min(1000, bbox.xmin));
  const ymax = Math.max(0, Math.min(1000, bbox.ymax));
  const xmax = Math.max(0, Math.min(1000, bbox.xmax));

  const top    = Math.min(ymin, ymax) / 10; // 0-100
  const left   = Math.min(xmin, xmax) / 10;
  const width  = Math.abs(xmax - xmin) / 10;
  const height = Math.abs(ymax - ymin) / 10;

  return {
    top:    `${top}%`,
    left:   `${left}%`,
    width:  `${Math.max(0.5, width)}%`,
    height: `${Math.max(0.5, height)}%`,
  };
}

/** bbox 가 0-1000 범위인지, 면적이 너무 작지 않은지 확인 */
export function isValidBbox(bbox: BoundingBox): boolean {
  if (!bbox) return false;
  const { ymin, xmin, ymax, xmax } = bbox;
  if ([ymin, xmin, ymax, xmax].some((n) => typeof n !== 'number' || Number.isNaN(n))) {
    return false;
  }
  if (ymin < 0 || xmin < 0 || ymax > 1000 || xmax > 1000) return false;
  const w = Math.abs(xmax - xmin);
  const h = Math.abs(ymax - ymin);
  if (w < 5 || h < 5) return false; // 0.5% × 0.5% 미만은 노이즈
  return true;
}
