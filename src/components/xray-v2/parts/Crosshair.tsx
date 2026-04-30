'use client';

import { useState, useRef, useCallback } from 'react';
import { XV2 } from '@/styles/xray-v2-tokens';

interface Props {
  /** 자식 요소 — 컨테이너의 hover 영역 */
  children: React.ReactNode;
  /** 좌표 표시 여부 */
  showCoords?: boolean;
}

/**
 * 컨테이너 위 십자선 + 좌표 표시 (의료 영상 viewer 스타일).
 * 마우스/터치 위치 따라 십자선이 따라간다.
 */
export default function Crosshair({ children, showCoords = true }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => setPos(null)}
      className="relative w-full h-full"
    >
      {children}

      {pos && (
        <>
          {/* 가로선 */}
          <div
            className="absolute left-0 right-0 pointer-events-none z-[15]"
            style={{
              top: pos.y,
              height: 1,
              background: `${XV2.cyan}66`,
              boxShadow: `0 0 6px ${XV2.cyan}`,
            }}
          />
          {/* 세로선 */}
          <div
            className="absolute top-0 bottom-0 pointer-events-none z-[15]"
            style={{
              left: pos.x,
              width: 1,
              background: `${XV2.cyan}66`,
              boxShadow: `0 0 6px ${XV2.cyan}`,
            }}
          />
          {showCoords && (
            <div
              className="absolute pointer-events-none z-[16]"
              style={{
                left: pos.x + 8,
                top: pos.y + 8,
                fontSize: 10,
                fontFamily: XV2.fontMono,
                color: XV2.cyan,
                textShadow: `0 0 4px ${XV2.cyan}`,
                letterSpacing: '0.04em',
              }}
            >
              x={Math.round(pos.x)} y={Math.round(pos.y)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
