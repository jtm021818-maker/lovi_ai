'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 🎬 v79: 루나극장 진입 시네마틱 전환 — 말풍선 모핑 버전
 *
 * 연출 시퀀스 (총 ~2.8초):
 *   1. (0.0~0.1s) 마지막 루나 말풍선 위치 감지 (DOM 쿼리 `[data-luna-bubble]` 마지막)
 *   2. (0.1~0.9s) **말풍선 클론** 이 그 자리에서 등장 → 시네마 프레임으로 모핑
 *                  - bubble-tail(말꼬리) radius 사라지고 직사각형화
 *                  - 색상 transition: #F4EFE6 → #1a0e08 (sepia dark)
 *                  - 크기: 작은 버블 → 중앙 큰 필름 프레임
 *   3. (0.9~1.5s) 스프라켓 홀 슬라이드 인 + 그레인/스캔라인 오버레이
 *   4. (1.5~2.1s) 미세 쉐이크 (필름 돌아가는 느낌) + tagline 등장
 *   5. (2.1~2.8s) 원형 clip-path 폭발 확장 → VN 씬 시작
 *
 * 연구 기반 (Motion 공식 "iOS App Store", react-morphing-modal, Codrops 2025):
 *   - Framer Motion v12 `motion.div` + FLIP 기반 layout 모핑
 *   - `getBoundingClientRect()` 로 소스 위치 캡처 후 fixed 포지셔닝
 *   - CSS `clip-path` radial 폭발 (하드웨어 가속)
 *
 * 번들 증가: 0 (framer-motion / React 만 사용)
 */

interface CinematicTransitionProps {
  /** 전환 완료 콜백 — VN 씬 재생 시작 트리거 */
  onComplete: () => void;
  /** 선택: 필름 프레임에 살짝 비칠 미리보기 텍스트 (루나극장 제목) */
  tagline?: string;
}

interface BubbleRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function CinematicTransition({ onComplete, tagline }: CinematicTransitionProps) {
  const [stage, setStage] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [sourceRect, setSourceRect] = useState<BubbleRect | null>(null);
  const timersRef = useRef<number[]>([]);

  // 1단계: 마운트 직후 마지막 루나 말풍선 위치 캡처
  useEffect(() => {
    const bubbles = document.querySelectorAll('[data-luna-bubble="true"]');
    const last = bubbles[bubbles.length - 1] as HTMLElement | undefined;
    if (last) {
      const rect = last.getBoundingClientRect();
      setSourceRect({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      });
    }
    // 스테이지 타이머
    const sched = (ms: number, fn: () => void) => {
      const id = window.setTimeout(fn, ms);
      timersRef.current.push(id);
    };
    sched(100,  () => setStage(1));   // 말풍선 클론 나타남 → 모핑 시작
    sched(900,  () => setStage(2));   // 스프라켓 + 그레인
    sched(1500, () => setStage(3));   // 쉐이크 + tagline
    sched(2100, () => setStage(4));   // 폭발 시작
    sched(2800, () => { setStage(5); onComplete(); });
    return () => { timersRef.current.forEach(clearTimeout); };
  }, [onComplete]);

  const handleSkip = () => {
    timersRef.current.forEach(clearTimeout);
    setStage(5);
    onComplete();
  };

  // 소스 위치 못 찾으면 화면 중앙에서 시작
  const startX = sourceRect?.x ?? (typeof window !== 'undefined' ? window.innerWidth / 2 - 140 : 0);
  const startY = sourceRect?.y ?? (typeof window !== 'undefined' ? window.innerHeight / 2 - 110 : 0);
  const startW = sourceRect?.width ?? 280;
  const startH = sourceRect?.height ?? 60;

  // 목표: 화면 중앙의 필름 프레임 (최대 가로 90vw, 높이 220px)
  const targetW = typeof window !== 'undefined' ? Math.min(window.innerWidth * 0.9, 520) : 360;
  const targetH = 220;
  const targetX = typeof window !== 'undefined' ? (window.innerWidth - targetW) / 2 : 0;
  const targetY = typeof window !== 'undefined' ? (window.innerHeight - targetH) / 2 : 0;

  return (
    <motion.div
      className="fixed inset-0 z-[9998] overflow-hidden"
      initial={{ backgroundColor: 'rgba(0,0,0,0)' }}
      animate={{ backgroundColor: stage >= 2 ? 'rgba(26,14,10,0.92)' : 'rgba(0,0,0,0.2)' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      onClick={handleSkip}
    >
      {/* SVG 그레인 필터 정의 */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id="filmGrain">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" />
            <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.4 0" />
            <feComposite in="SourceGraphic" operator="over" />
          </filter>
        </defs>
      </svg>

      {/* 세피아 비네트 */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 15%, rgba(0,0,0,0.75) 100%)',
          mixBlendMode: 'multiply',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: stage >= 2 ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      />

      {/* ── 모핑 버블 → 필름 프레임 ── */}
      {stage >= 1 && stage < 4 && (
        <motion.div
          className="absolute"
          initial={{
            x: startX,
            y: startY,
            width: startW,
            height: startH,
            borderRadius: 20,    // 말풍선 모양
            rotate: 0,
          }}
          animate={{
            x: stage === 1 ? startX : targetX,
            y: stage === 1 ? startY : targetY,
            width: stage === 1 ? startW : targetW,
            height: stage === 1 ? startH : targetH,
            borderRadius: stage === 1 ? 20 : 4,   // 직사각 필름 프레임으로
            rotate: stage === 3 ? [0, -0.8, 0.8, -0.4, 0.4, 0] : 0,  // 3단계에서 쉐이크
          }}
          transition={{
            x: { duration: 0.8, ease: [0.34, 1.2, 0.64, 1] },
            y: { duration: 0.8, ease: [0.34, 1.2, 0.64, 1] },
            width: { duration: 0.8, ease: [0.34, 1.2, 0.64, 1] },
            height: { duration: 0.8, ease: [0.34, 1.2, 0.64, 1] },
            borderRadius: { duration: 0.6, ease: 'easeInOut' },
            rotate: { duration: 0.4, repeat: stage === 3 ? 3 : 0 },
          }}
          style={{
            background: stage >= 2
              ? 'linear-gradient(135deg, #3a2a1c 0%, #1a0e08 100%)'
              : '#F4EFE6',
            transition: 'background 0.8s ease',
            filter: stage >= 2 ? 'sepia(0.6) contrast(1.15)' : 'none',
            border: stage >= 2 ? 'none' : '1px solid #D5C2A5',
            overflow: 'hidden',
          }}
        >
          {/* 좌측 스프라켓 홀 (stage >= 2 에서만) */}
          {stage >= 2 && (
            <motion.div
              className="absolute left-0 top-0 bottom-0 w-[22px]"
              style={{
                background: `repeating-linear-gradient(
                  to bottom,
                  #1a0e08 0px, #1a0e08 14px,
                  transparent 14px, transparent 22px,
                  #1a0e08 22px, #1a0e08 36px,
                  #f4e4c1 36px, #f4e4c1 40px
                )`,
                boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.5)',
              }}
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          )}

          {/* 우측 스프라켓 홀 */}
          {stage >= 2 && (
            <motion.div
              className="absolute right-0 top-0 bottom-0 w-[22px]"
              style={{
                background: `repeating-linear-gradient(
                  to bottom,
                  #1a0e08 0px, #1a0e08 14px,
                  transparent 14px, transparent 22px,
                  #1a0e08 22px, #1a0e08 36px,
                  #f4e4c1 36px, #f4e4c1 40px
                )`,
                boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.5)',
              }}
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          )}

          {/* 그레인 오버레이 */}
          {stage >= 2 && (
            <div
              className="absolute inset-0 pointer-events-none opacity-30 mix-blend-overlay"
              style={{ filter: 'url(#filmGrain)', background: 'white' }}
            />
          )}

          {/* 스캔라인 */}
          {stage >= 2 && (
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 3px)',
              }}
            />
          )}

          {/* "LUNA · CINEMA" 자막 */}
          {stage >= 3 && (
            <motion.div
              className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.3em] font-bold pointer-events-none"
              style={{ color: '#f4e4c1', opacity: 0.7 }}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 0.7, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              LUNA · CINEMA
            </motion.div>
          )}
          {stage >= 3 && (
            <motion.div
              className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] tracking-[0.25em] pointer-events-none"
              style={{ color: '#f4e4c1', opacity: 0.6 }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 0.6, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              NOW PLAYING
            </motion.div>
          )}

          {/* tagline (루나극장 제목) */}
          {tagline && stage >= 3 && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center px-10 pointer-events-none"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div
                className="text-center font-bold tracking-wide"
                style={{
                  color: '#f4e4c1',
                  textShadow: '0 0 12px rgba(244,228,193,0.6), 0 2px 8px rgba(0,0,0,0.8)',
                  fontSize: '15px',
                  lineHeight: 1.5,
                  maxWidth: '360px',
                }}
              >
                {tagline}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* ── 원형 clip-path 폭발 ── */}
      <AnimatePresence>
        {stage >= 4 && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at center, #f4e4c1 0%, #d4a574 25%, #8b4513 65%, #1a0e08 100%)',
            }}
            initial={{ clipPath: 'circle(3% at 50% 50%)' }}
            animate={{ clipPath: 'circle(150% at 50% 50%)' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
          />
        )}
      </AnimatePresence>

      {/* 스킵 버튼 */}
      <button
        onClick={(e) => { e.stopPropagation(); handleSkip(); }}
        className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/40 text-white/60 text-xs backdrop-blur-sm border border-white/10 active:bg-white/20 transition-colors z-[10]"
      >
        건너뛰기
      </button>
    </motion.div>
  );
}
