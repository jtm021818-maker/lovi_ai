'use client';

/**
 * SakuraPetals — 벚꽃잎 흩날림 애니메이션 오버레이.
 *
 * - framer-motion transform만 사용 → GPU 컴포지터 레이어, 60fps 유지.
 * - pointer-events:none → 터치/클릭 완전 투과.
 * - 20개 꽃잎 × 결정론적 랜덤(인덱스 기반) → SSR hydration 불일치 없음.
 * - 각 꽃잎은 SVG teardrop + 중앙 맥 디테일.
 */

import { motion } from 'framer-motion';

// ─── 꽃잎 색상 ─────────────────────────────────────────────────
const COLORS = [
  'rgba(255,183,197,0.82)',   // 진한 벚꽃 핑크
  'rgba(255,210,220,0.75)',   // 중간 핑크
  'rgba(248,187,208,0.70)',   // 연핑크
  'rgba(255,236,240,0.78)',   // 아이보리 핑크
  'rgba(252,225,232,0.72)',   // 크리미 핑크
];

// ─── 꽃잎 SVG 형태 (teardrop + 중앙 맥) ──────────────────────
function PetalSVG({ color, w, h }: { color: string; w: number; h: number }) {
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 22 30"
      style={{ display: 'block', filter: 'drop-shadow(0 1px 2px rgba(255,150,170,0.25))' }}
    >
      {/* 꽃잎 본체 — 위가 살짝 뾰족한 teardrop */}
      <path
        d="M11,1 C15,3 20,9 20,15 C20,22 16,28 11,29 C6,28 2,22 2,15 C2,9 7,3 11,1 Z"
        fill={color}
      />
      {/* 하이라이트 — 위쪽 밝은 반사광 */}
      <path
        d="M11,2 C13,4 16,8 17,12 C15,9 13,6 11,4 C9,6 7,9 5,12 C6,8 9,4 11,2 Z"
        fill="rgba(255,255,255,0.28)"
      />
      {/* 중앙 맥 */}
      <path
        d="M11,3 C11,12 11,21 11,28"
        stroke="rgba(255,255,255,0.32)"
        strokeWidth="0.9"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── 꽃잎 데이터 (결정론적 랜덤) ──────────────────────────────
interface PetalData {
  id: number;
  x: number;       // 시작 x (vw %)
  delay: number;   // 시작 딜레이 (초)
  dur: number;     // 낙하 시간 (초)
  w: number;       // 너비 (px)
  h: number;       // 높이 (px)
  driftX: number;  // 가로 흔들림 (px)
  rot0: number;    // 초기 회전각
  color: string;
  swayAmp: number; // sway 진폭
}

function makePetals(count: number): PetalData[] {
  return Array.from({ length: count }, (_, i) => {
    const w = 11 + ((i * 7 + 3) % 9);       // 11–19 px
    return {
      id: i,
      x: ((i * 37 + 11) % 91) + 3,           // 3–94 vw
      delay: ((i * 13) % 90) / 10,            // 0–9 s
      dur: 9 + ((i * 17 + 5) % 7),            // 9–15 s
      w,
      h: Math.round(w * 1.38),
      driftX: -50 + ((i * 19 + 7) % 100),    // -50 ~ +50 px
      rot0: (i * 97) % 360,
      color: COLORS[i % COLORS.length],
      swayAmp: 15 + ((i * 11) % 20),         // 15–35 px
    };
  });
}

const PETALS = makePetals(20);

// ─── 컴포넌트 ──────────────────────────────────────────────────
interface SakuraPetalsProps {
  /** z-index, 기본 5 (bg 위, 카드 밑) */
  zIndex?: number;
  /** 꽃잎 밀도 (1.0 = 기본 20개, 0.5 = 10개) */
  density?: number;
}

export default function SakuraPetals({ zIndex = 5, density = 1 }: SakuraPetalsProps) {
  const petals = PETALS.slice(0, Math.round(PETALS.length * density));

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex,
        overflow: 'hidden',
      }}
    >
      {petals.map((p) => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: -p.h - 8,
            width: p.w,
            height: p.h,
          }}
          animate={{
            // 세로 낙하
            y: [`${-p.h}px`, `calc(100vh + ${p.h + 20}px)`],
            // 가로 sway (좌우 흔들림 — 3점 키프레임으로 S자 곡선)
            x: [0, p.swayAmp, p.driftX],
            // 회전
            rotate: [p.rot0, p.rot0 + 270 + ((p.id * 43) % 180)],
            // 서서히 사라지는 투명도
            opacity: [0, 0.9, 0.9, 0.9, 0],
          }}
          transition={{
            duration: p.dur,
            delay: p.delay,
            repeat: Infinity,
            repeatDelay: ((p.id * 3) % 4),   // 반복 간 짧은 텀
            ease: 'linear',
            // x sway는 easeInOut으로 부드럽게
            x: { duration: p.dur, ease: [0.25, 0.1, 0.75, 0.9], delay: p.delay, repeat: Infinity, repeatDelay: ((p.id * 3) % 4) },
            opacity: { duration: p.dur, times: [0, 0.08, 0.7, 0.9, 1], delay: p.delay, repeat: Infinity, repeatDelay: ((p.id * 3) % 4) },
          }}
        >
          <PetalSVG color={p.color} w={p.w} h={p.h} />
        </motion.div>
      ))}
    </div>
  );
}
