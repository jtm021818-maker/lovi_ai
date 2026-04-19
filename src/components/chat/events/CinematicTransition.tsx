'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 🎬 v82.8: 루나극장 진입 시네마틱 전환 — 3초 글로우 + 말풍선 모핑 버전
 *
 * 연출 시퀀스 (총 ~5.8초):
 *   0. (0.0~2.5s) **PRE_GLOW** (신규) — 마지막 루나 말풍선 위치에서 앰버 글로우 펄스
 *                                        - 유저가 마지막 대사 읽을 시간 확보
 *                                        - 주변 ✨ 파티클 shimmer
 *                                        - 점진적 스크린 딤 (0→0.3)
 *   1. (2.5~3.0s) **BURST** (신규) — 화이트 쇼크웨이브 확산 + 플래시 피크
 *                                     - 말풍선 중심으로 radial expand
 *                                     - 스크린 딤 0.3→0.92 급가속
 *   2. (3.0~3.9s) **MORPH** — 말풍선 클론이 시네마 필름 프레임으로 변형
 *                              - bubble-tail radius 사라지고 직사각형
 *                              - 색상 #F4EFE6 → #1a0e08 (sepia dark)
 *                              - 작은 버블 → 중앙 큰 필름 프레임
 *   3. (3.9~4.5s) **FRAME** — 스프라켓 홀 슬라이드 인 + 그레인 + 스캔라인
 *   4. (4.5~5.1s) **SHAKE** — 필름 쉐이크 (릴 돌아가는 느낌) + tagline 등장
 *   5. (5.1~5.8s) **EXPLODE** — 원형 clip-path 폭발 확장 → VN 씬 시작
 *
 * 연구 기반 (2026 최신):
 *   - Framer Motion v12 `motion.div` + FLIP layout 모핑 (shared-element 패턴)
 *   - `getBoundingClientRect()` 소스 위치 캡처 후 fixed 포지셔닝
 *   - CSS `clip-path` radial 폭발 (하드웨어 가속)
 *   - View Transitions API 스타일 circular reveal 기법
 *
 * 번들 증가: 0 (framer-motion / React 만 사용)
 */

interface CinematicTransitionProps {
  /** 전환 완료 콜백 — VN 씬 재생 시작 트리거 */
  onComplete: () => void;
  /** 선택: 필름 프레임에 살짝 비칠 미리보기 텍스트 (루나극장 제목) */
  tagline?: string;
  /**
   * 🆕 v82.13: 모드 선택
   *   'full'      — 글로우 → 버스트 → 모핑 → 필름 → 쉐이크 → 폭발 (기본, 독립 전환용)
   *   'glow-only' — 글로우 → 버스트 후 즉시 완료 (mp4 오프닝과 체인 연결용)
   */
  mode?: 'full' | 'glow-only';
}

interface BubbleRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function CinematicTransition({ onComplete, tagline, mode = 'full' }: CinematicTransitionProps) {
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
    // 🆕 v82.13: mode 분기
    //   'glow-only': 글로우 (0~2500ms) → 버스트 (2500~3000ms) → 즉시 onComplete
    //                → EmotionMirror 가 mp4 오프닝을 다음 stage 로 체인
    //   'full':      기존 6-stage 전체 (독립 전환용)
    if (mode === 'glow-only') {
      sched(3000, () => { setStage(5); onComplete(); });
    } else {
      sched(3000, () => setStage(1));   // 말풍선 클론 → 필름 프레임 모핑
      sched(3900, () => setStage(2));   // 스프라켓 + 그레인
      sched(4500, () => setStage(3));   // 쉐이크 + tagline
      sched(5100, () => setStage(4));   // 폭발 시작
      sched(5800, () => { setStage(5); onComplete(); });
    }
    return () => { timersRef.current.forEach(clearTimeout); };
  }, [onComplete, mode]);

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
      // 🆕 v82.8: 3단계 딤 — stage 0 은 초반 투명 → 말미에 약하게 (0.3)
      //           stage >= 1 부턴 급격히 어두워짐 (0.92)
      animate={{
        backgroundColor:
          stage >= 2 ? 'rgba(26,14,10,0.92)' :
          stage >= 1 ? 'rgba(26,14,10,0.6)' :
          'rgba(26,14,10,0)',
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
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

      {/* ── 🆕 v82.8: PRE_GLOW (stage 0, 0~2500ms) — 말풍선 위치 앰버 글로우 + 파티클 ── */}
      {stage === 0 && sourceRect && (
        <>
          {/* 중앙 앰버 글로우 펄스 — scale 1→1.8 반복, opacity 0.3→0.75 */}
          <motion.div
            className="absolute pointer-events-none"
            style={{
              left: sourceRect.x + sourceRect.width / 2,
              top: sourceRect.y + sourceRect.height / 2,
              width: Math.max(sourceRect.width, 240),
              height: Math.max(sourceRect.width, 240),
              marginLeft: -Math.max(sourceRect.width, 240) / 2,
              marginTop: -Math.max(sourceRect.width, 240) / 2,
              background: 'radial-gradient(circle, rgba(255,213,128,0.55) 0%, rgba(255,180,90,0.25) 40%, transparent 70%)',
              filter: 'blur(18px)',
              mixBlendMode: 'screen',
            }}
            animate={{
              scale: [1, 1.8, 1],
              opacity: [0.25, 0.75, 0.25],
            }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* 2차 더 작고 밝은 글로우 (중심 강조) */}
          <motion.div
            className="absolute pointer-events-none"
            style={{
              left: sourceRect.x + sourceRect.width / 2,
              top: sourceRect.y + sourceRect.height / 2,
              width: 120,
              height: 120,
              marginLeft: -60,
              marginTop: -60,
              background: 'radial-gradient(circle, rgba(255,240,200,0.9) 0%, transparent 70%)',
              filter: 'blur(8px)',
              mixBlendMode: 'screen',
            }}
            animate={{
              scale: [0.9, 1.35, 0.9],
              opacity: [0.4, 0.9, 0.4],
            }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
          />

          {/* ✨ 파티클 8개 — 말풍선 주변 공전 */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 90 + (i % 2) * 30;
            return (
              <motion.div
                key={`particle-${i}`}
                className="absolute pointer-events-none text-[14px]"
                style={{
                  left: sourceRect.x + sourceRect.width / 2,
                  top: sourceRect.y + sourceRect.height / 2,
                  filter: 'drop-shadow(0 0 6px rgba(255,220,150,0.9))',
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0.6, 1, 0],
                  scale: [0, 1, 0.8, 1.1, 0],
                  x: [0, Math.cos(angle) * radius * 0.5, Math.cos(angle) * radius, Math.cos(angle + 0.3) * radius],
                  y: [0, Math.sin(angle) * radius * 0.5, Math.sin(angle) * radius, Math.sin(angle + 0.3) * radius],
                }}
                transition={{
                  duration: 2.3,
                  delay: 0.2 + i * 0.08,
                  ease: 'easeOut',
                  repeat: 1,
                }}
              >
                ✨
              </motion.div>
            );
          })}

          {/* 살짝 힌트 텍스트 — "머릿속에 그려지는 중..." */}
          <motion.div
            className="absolute pointer-events-none font-bold text-[11px] tracking-widest"
            style={{
              left: sourceRect.x + sourceRect.width / 2,
              top: sourceRect.y + sourceRect.height + 24,
              transform: 'translateX(-50%)',
              color: 'rgba(255,220,150,0.85)',
              textShadow: '0 2px 12px rgba(0,0,0,0.6), 0 0 20px rgba(255,180,90,0.5)',
            }}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: [0, 1, 0.6, 1], y: 0 }}
            transition={{ duration: 2.5, ease: 'easeOut' }}
          >
            머릿속에 그려지는 중...
          </motion.div>
        </>
      )}

      {/* ── 🆕 v82.8: BURST (stage 0 말미 ~ stage 1 초입) — 화이트 쇼크웨이브 플래시 ── */}
      {/*   framer-motion 자체 타이머로 처리 (2500ms 시점 peak) */}
      {stage === 0 && sourceRect && (
        <motion.div
          key="burst-shockwave"
          className="absolute rounded-full pointer-events-none"
          style={{
            left: sourceRect.x + sourceRect.width / 2,
            top: sourceRect.y + sourceRect.height / 2,
            width: 60,
            height: 60,
            marginLeft: -30,
            marginTop: -30,
            background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,220,150,0.5) 40%, transparent 70%)',
            mixBlendMode: 'screen',
          }}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{
            scale: [0.3, 0.3, 0.3, 8, 18],
            opacity: [0, 0, 0, 1, 0],
          }}
          transition={{
            duration: 3,
            times: [0, 0.7, 0.83, 0.92, 1],
            ease: 'easeOut',
          }}
        />
      )}

      {/* BURST 2차 — 흰색 전체 플래시 (2800ms 시점) */}
      {stage === 0 && (
        <motion.div
          key="burst-flash"
          className="absolute inset-0 pointer-events-none bg-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0, 0, 0, 0.6, 0] }}
          transition={{
            duration: 3,
            times: [0, 0.85, 0.9, 0.92, 0.95, 1],
            ease: 'easeOut',
          }}
        />
      )}

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
