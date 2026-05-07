'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fuzzyDurationLabel } from '@/lib/luna-shopping/shopping-engine';

interface Props {
  minutesRemaining: number;
  departedAt?: string | null;
  returnsAt?: string | null;
  isDark?: boolean;
}

const MID_TRIP_LINES: Array<{ minProgress: number; maxProgress: number; lines: string[] }> = [
  {
    minProgress: 0, maxProgress: 0.2,
    lines: [
      '막 나왔어 — 어디로 갈지 살짝 고민 중.',
      '오늘 어떤 가게 가볼까…',
      '바람이 좋네. 천천히 걸어볼게.',
    ],
  },
  {
    minProgress: 0.2, maxProgress: 0.5,
    lines: [
      '눈에 들어오는 게 있어. 한 번 더 둘러보고.',
      '잠깐 카페에 들어와 있어.',
      '뭐가 너랑 어울릴까 — 자꾸 멈춰서 보게 돼.',
      '오늘 진열장이 너 같아.',
    ],
  },
  {
    minProgress: 0.5, maxProgress: 0.8,
    lines: [
      '발견했어. 좋아할 것 같은 거.',
      '… 이거다 싶은 게 있어. 잠깐만.',
      '두 개 중에 고민 중. 너라면 어떤 걸 골랐을까.',
      '결정했어. 이제 계산만 하면 돼.',
    ],
  },
  {
    minProgress: 0.8, maxProgress: 1,
    lines: [
      '돌아가는 길. 곧 봐.',
      '거의 다 왔어 — 기다려줘.',
      '문 열고 들어갈게. 잠깐만.',
    ],
  },
];

function pickLineByProgress(progress: number): string {
  const seg =
    MID_TRIP_LINES.find((s) => progress >= s.minProgress && progress < s.maxProgress) ??
    MID_TRIP_LINES[MID_TRIP_LINES.length - 1];
  const seed = Math.floor(progress * 100);
  return seg.lines[seed % seg.lines.length];
}

export default function EmptySeatNote({
  minutesRemaining,
  departedAt,
  returnsAt,
  isDark = false,
}: Props) {
  const fuzzy = fuzzyDurationLabel(minutesRemaining);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  let progress = 0.5;
  if (departedAt && returnsAt) {
    const depMs = new Date(departedAt).getTime();
    const retMs = new Date(returnsAt).getTime();
    const total = retMs - depMs;
    if (total > 0) {
      progress = Math.max(0, Math.min(1, (Date.now() - depMs) / total));
    }
  }
  void tick; // trigger re-render for progress recalc
  const midTripLine = pickLineByProgress(progress);

  // ── 테마 토큰 ──
  const tk = isDark
    ? {
        paper: '#1e1433',
        ink: '#f3e8ff',
        inkMuted: 'rgba(243,232,255,0.55)',
        tape: 'rgba(139,92,246,0.52)',
        tapeStripe: 'rgba(109,40,217,0.32)',
        shadow: 'rgba(0,0,0,0.5)',
        bubbleBg: 'rgba(20,12,40,0.85)',
        bubbleBorder: 'rgba(167,139,250,0.28)',
        bubbleText: '#e9d5ff',
        chipBg: 'rgba(255,255,255,0.06)',
        chipBorder: 'rgba(255,255,255,0.09)',
        chipText: '#e9d5ff',
        aura: 'rgba(139,92,246,0.22)',
        progStart: '#a78bfa',
        progEnd: '#ec4899',
        trackBg: 'rgba(255,255,255,0.09)',
        deco: '#a78bfa',
      }
    : {
        paper: '#fef9ee',
        ink: '#5a3e2b',
        inkMuted: '#9a7255',
        tape: 'rgba(251,146,60,0.52)',
        tapeStripe: 'rgba(234,88,12,0.28)',
        shadow: 'rgba(120,80,40,0.15)',
        bubbleBg: 'rgba(255,252,245,0.90)',
        bubbleBorder: 'rgba(200,155,95,0.28)',
        bubbleText: '#7c5738',
        chipBg: 'rgba(255,255,255,0.78)',
        chipBorder: 'rgba(0,0,0,0.07)',
        chipText: '#7c5738',
        aura: 'rgba(255,180,70,0.22)',
        progStart: '#f59e0b',
        progEnd: '#ec4899',
        trackBg: 'rgba(0,0,0,0.08)',
        deco: '#f59e0b',
      };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="relative flex flex-col items-center"
      style={{ width: 220, height: 220 * 1.6 }}
    >

      {/* ── 1. 말풍선 (mid-trip 메시지) ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={midTripLine}
          initial={{ opacity: 0, y: -6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.96 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            top: '3%',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            width: 196,
          }}
        >
          <div
            style={{
              background: tk.bubbleBg,
              border: `1px solid ${tk.bubbleBorder}`,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: 18,
              padding: '10px 15px',
              boxShadow: `0 4px 24px ${tk.shadow}, 0 1px 0 rgba(255,255,255,0.15) inset`,
              textAlign: 'center',
              position: 'relative',
            }}
          >
            <p
              style={{
                color: tk.bubbleText,
                fontSize: 11.5,
                fontStyle: 'italic',
                lineHeight: 1.55,
                fontFamily: 'var(--font-handwrite-soft), "Nanum Pen Script", "Caveat", cursive',
                letterSpacing: '0.01em',
              }}
            >
              &ldquo;{midTripLine}&rdquo;
            </p>
            {/* 말풍선 꼬리 */}
            <div
              style={{
                position: 'absolute',
                bottom: -7,
                left: '50%',
                transform: 'translateX(-50%) rotate(45deg)',
                width: 12,
                height: 12,
                background: tk.bubbleBg,
                border: `1px solid ${tk.bubbleBorder}`,
                borderTop: 'none',
                borderLeft: 'none',
              }}
            />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── 2. 빈 자리 아우라 (루나가 있던 곳의 잔열) ── */}
      <motion.div
        animate={{ opacity: [0.28, 0.58, 0.28], scale: [0.88, 1.08, 0.88] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          bottom: '34%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${tk.aura} 0%, transparent 72%)`,
          filter: 'blur(14px)',
          pointerEvents: 'none',
        }}
      />

      {/* ── 3. 손편지 쪽지 ── */}
      <motion.div
        animate={{ rotate: [-1.8, 1.6, -1.8], y: [0, -4, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          bottom: '27%',
          left: '50%',
          zIndex: 15,
        }}
      >
        <div style={{ transform: 'translateX(-50%)', position: 'relative' }}>

          {/* 와시 테이프 */}
          <div
            style={{
              position: 'absolute',
              top: -13,
              left: '50%',
              transform: 'translateX(-50%) rotate(-4deg)',
              width: 60,
              height: 22,
              backgroundImage: `repeating-linear-gradient(
                110deg,
                ${tk.tape} 0px, ${tk.tape} 5px,
                ${tk.tapeStripe} 5px, ${tk.tapeStripe} 10px
              )`,
              borderRadius: 4,
              boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            }}
          />

          {/* 종이 카드 본체 */}
          <div
            style={{
              width: 152,
              padding: '15px 16px 18px',
              background: tk.paper,
              backgroundImage: isDark
                ? 'radial-gradient(ellipse at 85% 10%, rgba(139,92,246,0.08) 0%, transparent 55%)'
                : [
                    'radial-gradient(ellipse at 88% 6%, rgba(255,195,120,0.15) 0%, transparent 48%)',
                    'radial-gradient(ellipse at 6% 88%, rgba(175,130,90,0.09) 0%, transparent 42%)',
                  ].join(', '),
              borderRadius: 8,
              boxShadow: [
                `0 10px 36px ${tk.shadow}`,
                `0 2px 6px rgba(0,0,0,${isDark ? 0.3 : 0.07})`,
                `inset 0 1px 0 rgba(255,255,255,${isDark ? 0.06 : 0.75})`,
              ].join(', '),
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* 가로 줄 (노트 질감) */}
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: 10,
                  right: 10,
                  top: 44 + i * 20,
                  height: 1,
                  background: isDark
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(0,0,0,0.04)',
                  borderRadius: 1,
                }}
              />
            ))}

            {/* "루나의 쪽지" 레이블 */}
            <p
              style={{
                fontSize: 9.5,
                color: tk.inkMuted,
                letterSpacing: '0.12em',
                marginBottom: 10,
                fontFamily: 'var(--font-handwrite-soft), "Nanum Pen Script", cursive',
              }}
            >
              루나의 쪽지
            </p>

            {/* 메인 텍스트 */}
            <p
              style={{
                fontFamily: 'var(--font-handwrite-soft), "Nanum Pen Script", cursive',
                fontSize: 14,
                color: tk.ink,
                lineHeight: 1.7,
                marginBottom: 2,
              }}
            >
              나 잠깐 나갔다 올게~
            </p>
            <p
              style={{
                fontFamily: 'var(--font-handwrite-soft), "Nanum Pen Script", cursive',
                fontSize: 13,
                color: tk.inkMuted,
                lineHeight: 1.6,
              }}
            >
              곧 와 ♥
            </p>

            {/* 하단 우측 장식 */}
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                right: 12,
                fontSize: 16,
                opacity: 0.2,
                transform: 'rotate(12deg)',
                color: tk.deco,
                userSelect: 'none',
              }}
            >
              ✿
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── 4. 여정 타임라인 ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.65, duration: 0.5 }}
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {/* 상태 칩 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 14px',
            borderRadius: 20,
            background: tk.chipBg,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${tk.chipBorder}`,
            boxShadow: `0 2px 14px rgba(0,0,0,${isDark ? 0.22 : 0.06})`,
          }}
        >
          <motion.span
            animate={{ opacity: [0.55, 1, 0.55], scale: [1, 1.18, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ fontSize: 13, display: 'flex', lineHeight: 1 }}
          >
            🛍️
          </motion.span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: tk.chipText,
              letterSpacing: '0.02em',
            }}
          >
            외출 중
          </span>
          <span style={{ color: tk.chipText, opacity: 0.3, fontSize: 10, margin: '0 1px' }}>
            •
          </span>
          <span style={{ fontSize: 10.5, color: tk.chipText, opacity: 0.8 }}>
            {fuzzy} 후 도착
          </span>
        </div>

        {/* 여정 경로 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: 148 }}>
          <span style={{ fontSize: 11, opacity: 0.55, lineHeight: 1 }}>🏠</span>

          {/* 트랙 */}
          <div style={{ flex: 1, position: 'relative', height: 4 }}>
            {/* 배경 트랙 */}
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 4,
                background: tk.trackBg,
              }}
            />
            {/* 채워진 트랙 */}
            <motion.div
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                borderRadius: 4,
                background: `linear-gradient(90deg, ${tk.progStart}, ${tk.progEnd})`,
                boxShadow: `0 0 6px ${tk.progEnd}55`,
              }}
            />
            {/* 루나 위치 마커 🌙 */}
            <motion.div
              animate={{ left: `${Math.max(0, Math.min(100, progress * 100))}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: 12,
                lineHeight: 1,
                filter: `drop-shadow(0 1px 3px ${tk.progEnd}88)`,
              }}
            >
              🌙
            </motion.div>
          </div>

          <span style={{ fontSize: 11, opacity: 0.32, lineHeight: 1 }}>🛍️</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
