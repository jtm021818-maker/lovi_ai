'use client';

import { useRef, useCallback } from 'react';

/**
 * v50: 루나극장 오프닝 영상
 *
 * VN 연극 시작 전 오프닝 영상을 모바일 풀스크린으로 재생.
 * 영상 종료 시 onComplete 콜백으로 다음 phase 전환.
 */

interface TheaterOpeningProps {
  onComplete: () => void;
}

export default function TheaterOpening({ onComplete }: TheaterOpeningProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleEnded = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // 영상 로드 실패 시에도 진행
  const handleError = useCallback(() => {
    console.warn('[TheaterOpening] 오프닝 영상 로드 실패 — 스킵');
    onComplete();
  }, [onComplete]);

  // 탭해서 스킵
  const handleTap = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    onComplete();
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
      style={{ height: '100dvh' }}
      onClick={handleTap}
    >
      <video
        ref={videoRef}
        src="/루나극장_오프닝.mp4"
        autoPlay
        playsInline
        muted={false}
        onEnded={handleEnded}
        onError={handleError}
        className="w-full h-full object-cover"
      />

      {/* 스킵 버튼 */}
      <button
        onClick={(e) => { e.stopPropagation(); handleTap(); }}
        className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/50 text-white/70 text-xs backdrop-blur-sm border border-white/10 active:bg-white/20 transition-colors"
      >
        건너뛰기
      </button>
    </div>
  );
}
