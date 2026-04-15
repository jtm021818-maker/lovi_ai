'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * v49: 영화 필름 인트로 애니메이션
 *
 * VN 연극 시작 전 영화 프로젝터가 돌아가는 느낌:
 * 1. 필름 스트립 스크롤 (양쪽)
 * 2. 카운트다운 3→2→1
 * 3. 타이틀 카드
 * 4. 아이리스 와이프로 씬 공개
 *
 * 총 ~2.5초, 모바일 최적화 (CSS 전용 + GPU 가속)
 */

interface CinematicIntroProps {
  title?: string;
  onComplete: () => void;
}

/** 필름 스트립 (양쪽 스프라켓 홀) */
function FilmStrip({ side }: { side: 'left' | 'right' }) {
  return (
    <div
      className="absolute top-0 bottom-0 z-20 w-7 overflow-hidden"
      style={{ [side]: 0 }}
    >
      <div className="film-strip-scroll flex flex-col">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex flex-col">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="mx-auto my-0.5 h-4 w-3 rounded-[2px] bg-black/80 border border-yellow-900/30"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** 카운트다운 숫자 */
function CountdownNum({ n, delay }: { n: number; delay: number }) {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, scale: 1.5 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [1.5, 1, 1, 0.7] }}
      transition={{ delay, duration: 0.5, times: [0, 0.15, 0.65, 1], ease: 'easeInOut' }}
    >
      <svg width="100" height="100" viewBox="0 0 100 100" className="absolute">
        <motion.circle
          cx="50" cy="50" r="42"
          fill="none"
          stroke="rgba(244,114,182,0.7)"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay, duration: 0.4, ease: 'easeIn' }}
          style={{ rotate: -90, originX: '50%', originY: '50%' }}
        />
        {/* 십자선 */}
        <line x1="50" y1="8" x2="50" y2="22" stroke="rgba(244,114,182,0.3)" strokeWidth="1" />
        <line x1="50" y1="78" x2="50" y2="92" stroke="rgba(244,114,182,0.3)" strokeWidth="1" />
        <line x1="8" y1="50" x2="22" y2="50" stroke="rgba(244,114,182,0.3)" strokeWidth="1" />
        <line x1="78" y1="50" x2="92" y2="50" stroke="rgba(244,114,182,0.3)" strokeWidth="1" />
      </svg>
      <span
        className="relative z-10 font-mono text-6xl font-black text-pink-200"
        style={{ textShadow: '0 0 25px rgba(244,114,182,0.8)' }}
      >
        {n}
      </span>
    </motion.div>
  );
}

export default function CinematicIntro({ title, onComplete }: CinematicIntroProps) {
  const [phase, setPhase] = useState<'film' | 'iris' | 'done'>('film');

  useEffect(() => {
    // 카운트다운 끝나면 아이리스 와이프
    const t1 = setTimeout(() => setPhase('iris'), 2000);
    // 와이프 끝나면 완료
    const t2 = setTimeout(() => {
      setPhase('done');
      onComplete();
    }, 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  if (phase === 'done') return null;

  return (
    <motion.div
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{ background: '#0a0608', height: '100dvh' }}
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 'iris' ? 1 : 1 }}
    >
      {/* 세피아 오버레이 */}
      <div className="absolute inset-0" style={{ background: 'rgba(40,15,25,0.15)', mixBlendMode: 'multiply' }} />

      {/* 필름 스트립 양쪽 */}
      <FilmStrip side="left" />
      <FilmStrip side="right" />

      {/* 타이틀 카드 */}
      <motion.div
        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 0.6, times: [0, 0.2, 0.6, 1] }}
      >
        <span className="font-mono text-[10px] tracking-[0.4em] text-pink-400/50 uppercase">
          Luna presents
        </span>
        <span
          className="text-xl font-bold tracking-wider text-pink-100"
          style={{ textShadow: '0 0 30px rgba(244,114,182,0.4)' }}
        >
          🎭 루나의 망상 연극
        </span>
        {title && (
          <span className="text-[13px] text-pink-300/60 font-medium">
            &ldquo;{title}&rdquo;
          </span>
        )}
      </motion.div>

      {/* 카운트다운 */}
      <CountdownNum n={3} delay={0.5} />
      <CountdownNum n={2} delay={1.0} />
      <CountdownNum n={1} delay={1.5} />

      {/* 스캔라인 (옛날 프로젝터 느낌) */}
      <div
        className="pointer-events-none absolute inset-0 z-40 opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,1) 2px, rgba(255,255,255,1) 4px)',
        }}
      />

      {/* 필름 그레인 */}
      <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
        <div className="film-grain-layer" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.8) 100%)' }} />
      </div>

      {/* 아이리스 와이프 — 검은 원이 축소되며 씬 공개 */}
      <AnimatePresence>
        {phase === 'iris' && (
          <motion.div
            className="absolute inset-0 z-[60] bg-black"
            initial={{ clipPath: 'circle(100% at 50% 50%)' }}
            animate={{ clipPath: 'circle(0% at 50% 50%)' }}
            transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
