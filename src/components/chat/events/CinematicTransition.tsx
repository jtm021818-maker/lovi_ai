'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 🎬 v79: 루나극장 진입 시네마틱 전환
 *
 * 연출 시퀀스 (총 2.4초):
 *   1. (0.0~0.4s) 배경 페이드 인 — 회색/세피아 비네트
 *   2. (0.4~1.0s) 중앙 "필름 프레임" 등장 — 양쪽 스프라켓 홀 슬라이드 인 + 미세한 쉐이크
 *   3. (1.0~1.6s) 필름 위에 그레인/스캔라인 오버레이 + 세피아 필터 강화
 *   4. (1.6~2.4s) 원형 clip-path 로 **폭발 확장** → 화면 전체 반전
 *
 * 2026 기준 스택 (Context Hub 리서치):
 *   - Framer Motion v12 `layoutId` + `clip-path` 애니메이션
 *   - CSS `backdrop-filter: sepia()` + SVG `<feTurbulence>` 그레인
 *   - 스프라켓 홀: CSS `repeating-linear-gradient` (번들 0)
 *
 * 외부 디펜던시: framer-motion (이미 설치됨). 추가 번들 X.
 */

interface CinematicTransitionProps {
  /** 전환 완료 콜백 — VN 씬 재생 시작 트리거 */
  onComplete: () => void;
  /** 선택: 필름 프레임에 살짝 비칠 미리보기 텍스트 (루나의 한마디) */
  tagline?: string;
}

export default function CinematicTransition({ onComplete, tagline }: CinematicTransitionProps) {
  const [stage, setStage] = useState<0 | 1 | 2 | 3 | 4>(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 400);   // 프레임 등장
    const t2 = setTimeout(() => setStage(2), 1000);  // 그레인 + 필터 강화
    const t3 = setTimeout(() => setStage(3), 1600);  // 폭발 시작
    const t4 = setTimeout(() => { setStage(4); onComplete(); }, 2400); // 완료
    return () => { [t1, t2, t3, t4].forEach(clearTimeout); };
  }, [onComplete]);

  const handleSkip = () => { setStage(4); onComplete(); };

  return (
    <motion.div
      className="fixed inset-0 z-[9998] flex items-center justify-center overflow-hidden"
      initial={{ backgroundColor: 'rgba(0,0,0,0)' }}
      animate={{ backgroundColor: stage >= 1 ? 'rgba(26,14,10,0.92)' : 'rgba(0,0,0,0.3)' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      onClick={handleSkip}
    >
      {/* ── SVG 그레인 필터 (정의만) ── */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id="filmGrain">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" />
            <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.4 0" />
            <feComposite in="SourceGraphic" operator="over" />
          </filter>
        </defs>
      </svg>

      {/* ── 세피아/비네트 배경 ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.7) 100%)',
          mixBlendMode: 'multiply',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: stage >= 1 ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      />

      {/* ── 중앙 "필름 프레임" — 쉐이크 + 스프라켓 홀 ── */}
      <AnimatePresence>
        {stage >= 1 && stage < 3 && (
          <motion.div
            className="relative"
            initial={{ scale: 0.3, opacity: 0, rotateX: 45 }}
            animate={{
              scale: 1,
              opacity: 1,
              rotateX: 0,
              x: stage === 2 ? [0, -2, 2, -1, 1, 0] : 0,  // 2단계에서 미세 쉐이크
            }}
            exit={{ scale: 1.2, opacity: 0 }}
            transition={{
              scale: { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] },  // back-out easing
              opacity: { duration: 0.4 },
              rotateX: { duration: 0.5 },
              x: { duration: 0.3, repeat: stage === 2 ? 3 : 0 },
            }}
            style={{ perspective: 1000 }}
          >
            {/* 필름 스트립 프레임 */}
            <div
              className="relative flex items-center"
              style={{
                minWidth: '280px',
                maxWidth: '90vw',
              }}
            >
              {/* 좌측 스프라켓 홀 열 */}
              <div
                className="h-[220px] w-[28px] rounded-l-sm shrink-0"
                style={{
                  background: `
                    repeating-linear-gradient(
                      to bottom,
                      #1a0e08 0px,
                      #1a0e08 14px,
                      transparent 14px,
                      transparent 22px,
                      #1a0e08 22px,
                      #1a0e08 36px,
                      #f4e4c1 36px,
                      #f4e4c1 40px
                    )
                  `,
                  boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.5)',
                }}
              />

              {/* 중앙 프레임 — 실제 내용 */}
              <div
                className="h-[220px] flex-1 relative flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #3a2a1c 0%, #1a0e08 100%)',
                  filter: stage >= 2 ? 'sepia(0.6) contrast(1.15) brightness(0.95)' : 'sepia(0.3)',
                  transition: 'filter 0.5s ease',
                }}
              >
                {/* 그레인 오버레이 */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-30 mix-blend-overlay"
                  style={{ filter: 'url(#filmGrain)', background: 'white' }}
                />

                {/* 스캔라인 */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 3px)',
                  }}
                />

                {/* 루나의 tagline (희미하게) */}
                {tagline && (
                  <motion.div
                    className="px-6 text-center font-bold tracking-wide"
                    style={{
                      color: '#f4e4c1',
                      textShadow: '0 0 12px rgba(244,228,193,0.6), 0 2px 8px rgba(0,0,0,0.8)',
                      fontSize: '15px',
                      lineHeight: 1.5,
                      maxWidth: '360px',
                    }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: stage >= 2 ? 0.85 : 0.4, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  >
                    {tagline}
                  </motion.div>
                )}

                {/* 상단 "LUNA CINEMA" 자막 */}
                <div
                  className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.3em] font-bold pointer-events-none"
                  style={{ color: '#f4e4c1', opacity: 0.6 }}
                >
                  LUNA · CINEMA
                </div>
                <div
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] tracking-[0.25em] pointer-events-none"
                  style={{ color: '#f4e4c1', opacity: 0.5 }}
                >
                  NOW PLAYING
                </div>
              </div>

              {/* 우측 스프라켓 홀 열 */}
              <div
                className="h-[220px] w-[28px] rounded-r-sm shrink-0"
                style={{
                  background: `
                    repeating-linear-gradient(
                      to bottom,
                      #1a0e08 0px,
                      #1a0e08 14px,
                      transparent 14px,
                      transparent 22px,
                      #1a0e08 22px,
                      #1a0e08 36px,
                      #f4e4c1 36px,
                      #f4e4c1 40px
                    )
                  `,
                  boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.5)',
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 폭발 확장: 원형 clip-path 가 중앙에서 바깥으로 ── */}
      <AnimatePresence>
        {stage >= 3 && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at center, #f4e4c1 0%, #d4a574 30%, #8b4513 70%, #1a0e08 100%)',
            }}
            initial={{ clipPath: 'circle(2% at 50% 50%)' }}
            animate={{ clipPath: 'circle(150% at 50% 50%)' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
          />
        )}
      </AnimatePresence>

      {/* ── 스킵 버튼 ── */}
      <button
        onClick={(e) => { e.stopPropagation(); handleSkip(); }}
        className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/40 text-white/60 text-xs backdrop-blur-sm border border-white/10 active:bg-white/20 transition-colors z-[10]"
      >
        건너뛰기
      </button>
    </motion.div>
  );
}
