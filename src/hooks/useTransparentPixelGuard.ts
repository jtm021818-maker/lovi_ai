'use client';

/**
 * 투명 PNG 이미지의 투명 영역 클릭 차단 훅.
 *
 * 사용 패턴:
 *  const { ready, isOpaque } = useTransparentPixelGuard('/background/luna.png');
 *  ...
 *  <div onClick={(e) => {
 *    const r = e.currentTarget.getBoundingClientRect();
 *    if (!isOpaque(e.clientX - r.left, e.clientY - r.top, r.width, r.height)) return;
 *    // 실제 클릭 처리
 *  }}>
 *
 * 작동 방식:
 *  1. 마운트 시 이미지를 hidden canvas 에 그림
 *  2. 클릭 좌표를 canvas 좌표로 매핑
 *  3. getImageData 로 해당 픽셀 alpha 값 검사
 *
 * CORS: 같은 origin 이미지에서만 작동 (보통 /public 정적 자산이라 OK).
 * 외부 URL 이미지는 crossOrigin 헤더 필요.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface Options {
  /** 알파 임계값 (0-255). 이 미만이면 투명으로 간주. 기본 32 */
  threshold?: number;
  /** 이미지 로딩 전 클릭 허용 여부. 기본 true (UX 보호) */
  allowBeforeReady?: boolean;
}

export function useTransparentPixelGuard(src: string, opts: Options = {}) {
  const { threshold = 32, allowBeforeReady = true } = opts;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    // 새 src 진입 시 이전 canvas 무효화 (ready/failed 는 onload/onerror 에서만 set)
    canvasRef.current = null;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;

    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          setFailed(true);
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvasRef.current = canvas;
        setReady(true);
      } catch (err) {
        // CORS-tainted canvas 등
        console.warn('[pixelGuard] canvas read failed:', err);
        setFailed(true);
      }
    };

    img.onerror = () => {
      if (!cancelled) setFailed(true);
    };

    return () => {
      cancelled = true;
      canvasRef.current = null;
    };
  }, [src]);

  /**
   * 컨테이너 기준 px 좌표 → 이미지 픽셀 alpha 검사.
   * 이미지가 컨테이너에 object-contain 으로 배치된 경우를 가정 (letterbox 보정).
   */
  const isOpaque = useCallback(
    (px: number, py: number, containerW: number, containerH: number): boolean => {
      if (failed) return true; // 실패 시 평소처럼 (모든 클릭 허용)
      const canvas = canvasRef.current;
      if (!canvas) return allowBeforeReady;

      const imgW = canvas.width;
      const imgH = canvas.height;
      if (imgW === 0 || imgH === 0) return allowBeforeReady;

      // object-contain letterbox 보정
      const containerRatio = containerW / containerH;
      const imgRatio = imgW / imgH;

      let drawnW: number, drawnH: number, offsetX: number, offsetY: number;
      if (imgRatio > containerRatio) {
        // 이미지가 더 넓음 — 좌우 꽉, 위아래 여백
        drawnW = containerW;
        drawnH = containerW / imgRatio;
        offsetX = 0;
        offsetY = (containerH - drawnH) / 2;
      } else {
        drawnW = containerH * imgRatio;
        drawnH = containerH;
        offsetX = (containerW - drawnW) / 2;
        offsetY = 0;
      }

      const localX = px - offsetX;
      const localY = py - offsetY;
      if (localX < 0 || localY < 0 || localX >= drawnW || localY >= drawnH) {
        return false; // letterbox 영역 클릭은 무조건 투명
      }

      const imgX = Math.round((localX / drawnW) * imgW);
      const imgY = Math.round((localY / drawnH) * imgH);

      const ctx = canvas.getContext('2d');
      if (!ctx) return allowBeforeReady;
      try {
        const alpha = ctx.getImageData(imgX, imgY, 1, 1).data[3];
        return alpha >= threshold;
      } catch {
        return allowBeforeReady;
      }
    },
    [failed, allowBeforeReady, threshold],
  );

  return { ready, failed, isOpaque };
}
