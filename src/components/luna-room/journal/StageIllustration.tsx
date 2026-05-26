'use client';

/**
 * v119.5 — 단계별 밤하늘 SVG 일러스트 5종.
 *
 * 외부 Lottie 의존 없이 framer-motion 으로 애니메이션.
 * 각 단계의 정서:
 *   1 새벽   — 첫 별 1개, 조심스러운 첫 빛
 *   2 황혼   — 별 2개 + 점선 별자리, 막 이어지는 사이
 *   3 달밤   — 반달 + 잔별 다수, 따뜻한 밤
 *   4 별밤   — 보름달 + 별똥별, 깊은 신뢰
 *   5 은하   — 은하수 + 두 별 가까이, 우리만의 우주
 */

import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import { getStageColor, BOND_EASE } from '@/lib/luna-life/relationship-tokens';

interface Props {
  level: number;          // 1~5
  size?: number;          // px (default 140)
  /** 카드 안에서 사용 시 inset, 모먼트 풀스크린 시 hero */
  variant?: 'card' | 'hero';
  /** 입장 애니메이션 활성 여부 */
  show?: boolean;
}

export default function StageIllustration({
  level, size = 140, variant = 'card', show = true,
}: Props) {
  const lv = Math.min(Math.max(level, 1), 5);
  const Comp =
    lv === 1 ? StageOne :
    lv === 2 ? StageTwo :
    lv === 3 ? StageThree :
    lv === 4 ? StageFour :
    StageFive;
  return <Comp size={size} variant={variant} show={show} />;
}

interface StageProps {
  size: number;
  variant: 'card' | 'hero';
  show: boolean;
}

// ============================================================
// Lv.1 — 새벽: 첫 별 1개
// ============================================================
function StageOne({ size, show }: StageProps) {
  const c = getStageColor(1);
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden role="img">
      <defs>
        <radialGradient id="dawn-bg" cx="50%" cy="60%" r="65%">
          <stop offset="0%" stopColor={c.bg[0]} />
          <stop offset="55%" stopColor={c.bg[1]} />
          <stop offset="100%" stopColor={c.bg[2]} />
        </radialGradient>
        <radialGradient id="dawn-glow" cx="50%" cy="40%" r="35%">
          <stop offset="0%" stopColor={c.glow} stopOpacity={0.8} />
          <stop offset="100%" stopColor={c.glow} stopOpacity={0} />
        </radialGradient>
        <filter id="dawn-blur"><feGaussianBlur stdDeviation="1.2" /></filter>
      </defs>
      <circle cx={100} cy={100} r={96} fill="url(#dawn-bg)" />
      <ellipse cx={100} cy={86} rx={70} ry={48} fill="url(#dawn-glow)" />
      {/* 지평선 */}
      <path d="M 4 150 Q 100 138 196 150 L 196 196 L 4 196 Z" fill={c.bg[2]} opacity={0.55} />
      {/* 첫 별 — 5각 별 path */}
      <motion.g
        initial={{ opacity: 0, scale: 0.4, y: 6 }}
        animate={show ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0 }}
        transition={{ delay: 0.35, duration: 1.0, ease: BOND_EASE.starGlow }}
        style={{ transformOrigin: '100px 70px' }}
      >
        <FivePointStar cx={100} cy={70} r={11} fill={c.accent} glow={c.glow} />
      </motion.g>
      {/* 잔잔한 부유 별 2~3개 */}
      <FloatDot cx={48}  cy={56}  r={1.6} delay={0.6}  color={c.accent} show={show} />
      <FloatDot cx={152} cy={48}  r={1.4} delay={0.85} color={c.accent} show={show} />
      <FloatDot cx={32}  cy={100} r={1.2} delay={1.1}  color={c.accent} show={show} />
    </svg>
  );
}

// ============================================================
// Lv.2 — 황혼: 별 2개 + 점선 연결
// ============================================================
function StageTwo({ size, show }: StageProps) {
  const c = getStageColor(2);
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden role="img">
      <defs>
        <linearGradient id="dusk-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.bg[0]} />
          <stop offset="55%" stopColor={c.bg[1]} />
          <stop offset="100%" stopColor={c.bg[2]} />
        </linearGradient>
        <radialGradient id="dusk-warm" cx="50%" cy="92%" r="45%">
          <stop offset="0%" stopColor={c.glow} stopOpacity={0.7} />
          <stop offset="100%" stopColor={c.glow} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={100} cy={100} r={96} fill="url(#dusk-bg)" />
      <ellipse cx={100} cy={150} rx={86} ry={48} fill="url(#dusk-warm)" />
      {/* 별 두 개 */}
      <motion.g
        initial={{ opacity: 0, scale: 0.4 }}
        animate={show ? { opacity: 1, scale: 1 } : { opacity: 0 }}
        transition={{ delay: 0.3, duration: 0.85, ease: BOND_EASE.starGlow }}
        style={{ transformOrigin: '72px 76px' }}
      >
        <FivePointStar cx={72} cy={76} r={10} fill={c.accent} glow={c.glow} />
      </motion.g>
      <motion.g
        initial={{ opacity: 0, scale: 0.4 }}
        animate={show ? { opacity: 1, scale: 1 } : { opacity: 0 }}
        transition={{ delay: 0.55, duration: 0.85, ease: BOND_EASE.starGlow }}
        style={{ transformOrigin: '136px 100px' }}
      >
        <FivePointStar cx={136} cy={100} r={9} fill={c.accent} glow={c.glow} />
      </motion.g>
      {/* 점선 연결 */}
      <motion.line
        x1={78} y1={82} x2={130} y2={94}
        stroke={c.accent} strokeWidth={1.4} strokeLinecap="round"
        strokeDasharray="1 4"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={show ? { pathLength: 1, opacity: 0.85 } : { opacity: 0 }}
        transition={{ delay: 0.95, duration: 0.9 }}
      />
      <FloatDot cx={48}  cy={130} r={1.4} delay={1.1}  color={c.accent} show={show} />
      <FloatDot cx={160} cy={140} r={1.6} delay={1.25} color={c.accent} show={show} />
      <FloatDot cx={110} cy={50}  r={1.2} delay={1.4}  color={c.accent} show={show} />
    </svg>
  );
}

// ============================================================
// Lv.3 — 달밤: 반달 + 잔별
// ============================================================
function StageThree({ size, show }: StageProps) {
  const c = getStageColor(3);
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden role="img">
      <defs>
        <radialGradient id="moonlit-bg" cx="60%" cy="35%" r="80%">
          <stop offset="0%" stopColor={c.bg[0]} />
          <stop offset="55%" stopColor={c.bg[1]} />
          <stop offset="100%" stopColor={c.bg[2]} />
        </radialGradient>
        <radialGradient id="moon-glow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={c.glow} stopOpacity={0.8} />
          <stop offset="100%" stopColor={c.glow} stopOpacity={0} />
        </radialGradient>
        <mask id="crescent-mask">
          <rect width="200" height="200" fill="black" />
          <circle cx={108} cy={92} r={40} fill="white" />
          <circle cx={124} cy={84} r={36} fill="black" />
        </mask>
      </defs>
      <circle cx={100} cy={100} r={96} fill="url(#moonlit-bg)" />
      {/* 달 빛무리 */}
      <motion.circle
        cx={108} cy={92} r={64}
        fill="url(#moon-glow)"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={show ? { opacity: 0.85, scale: 1 } : { opacity: 0 }}
        transition={{ delay: 0.4, duration: 1.2 }}
      />
      {/* 반달 */}
      <motion.rect
        x={0} y={0} width={200} height={200}
        fill={c.glow}
        mask="url(#crescent-mask)"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={show ? { opacity: 1, scale: 1 } : { opacity: 0 }}
        transition={{ delay: 0.55, duration: 0.9, ease: BOND_EASE.starGlow }}
        style={{ transformOrigin: '108px 92px' }}
      />
      {/* 잔별 6개 */}
      <FloatDot cx={48}  cy={60}  r={1.6} delay={0.9}  color={c.accent} show={show} />
      <FloatDot cx={36}  cy={120} r={1.4} delay={1.05} color={c.accent} show={show} />
      <FloatDot cx={60}  cy={150} r={1.3} delay={1.15} color={c.accent} show={show} />
      <FloatDot cx={158} cy={142} r={1.5} delay={1.25} color={c.accent} show={show} />
      <FloatDot cx={170} cy={62}  r={1.2} delay={1.35} color={c.accent} show={show} />
      <FloatDot cx={150} cy={158} r={1.1} delay={1.45} color={c.accent} show={show} />
      <FloatDot cx={78}  cy={48}  r={1.3} delay={1.55} color={c.accent} show={show} />
    </svg>
  );
}

// ============================================================
// Lv.4 — 별밤: 보름달 + 별똥별
// ============================================================
function StageFour({ size, show }: StageProps) {
  const c = getStageColor(4);
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden role="img">
      <defs>
        <radialGradient id="midnight-bg" cx="55%" cy="40%" r="85%">
          <stop offset="0%" stopColor={c.bg[0]} />
          <stop offset="55%" stopColor={c.bg[1]} />
          <stop offset="100%" stopColor={c.bg[2]} />
        </radialGradient>
        <radialGradient id="fullmoon-grad" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFFBE8" />
          <stop offset="80%" stopColor="#F5E2B0" />
          <stop offset="100%" stopColor="#D8B872" />
        </radialGradient>
        <radialGradient id="fullmoon-glow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#FFE9B8" stopOpacity={0.7} />
          <stop offset="100%" stopColor="#FFE9B8" stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={100} cy={100} r={96} fill="url(#midnight-bg)" />
      {/* 보름달 글로우 */}
      <motion.circle
        cx={120} cy={80} r={70}
        fill="url(#fullmoon-glow)"
        initial={{ opacity: 0 }}
        animate={show ? { opacity: 0.9 } : { opacity: 0 }}
        transition={{ delay: 0.35, duration: 1.3 }}
      />
      {/* 보름달 */}
      <motion.circle
        cx={120} cy={80} r={36}
        fill="url(#fullmoon-grad)"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={show ? { scale: 1, opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.5, duration: 1.0, ease: BOND_EASE.starGlow }}
        style={{ transformOrigin: '120px 80px' }}
      />
      {/* 별똥별 */}
      <motion.path
        d="M 30 60 Q 60 70 88 92"
        stroke={c.glow}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
        strokeDasharray="0 1"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={show ? { pathLength: [0, 1, 1], opacity: [0, 1, 0] } : { opacity: 0 }}
        transition={{ delay: 1.1, duration: 1.8, repeat: Infinity, repeatDelay: 2.5 }}
      />
      <motion.path
        d="M 170 110 Q 145 130 120 152"
        stroke={c.glow}
        strokeWidth={1.4}
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={show ? { pathLength: [0, 1, 1], opacity: [0, 1, 0] } : { opacity: 0 }}
        transition={{ delay: 2.0, duration: 1.7, repeat: Infinity, repeatDelay: 3.0 }}
      />
      {/* 잔별 다수 */}
      {[
        [40, 130, 1.5], [56, 160, 1.3], [76, 50, 1.4], [160, 50, 1.5],
        [180, 130, 1.3], [150, 168, 1.2], [28, 88, 1.1], [88, 168, 1.3],
      ].map(([cx, cy, r], i) => (
        <FloatDot key={i} cx={cx as number} cy={cy as number} r={r as number} delay={0.8 + i * 0.08} color={c.glow} show={show} />
      ))}
    </svg>
  );
}

// ============================================================
// Lv.5 — 은하: 은하수 + 두 별 가까이 + 골드 액센트
// ============================================================
function StageFive({ size, show }: StageProps) {
  // Lv.5 는 STAGE_COLORS 가 아닌 직접 코스모스 팔레트 사용 (은하 전용 톤)
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden role="img">
      <defs>
        <radialGradient id="cosmos-bg" cx="50%" cy="50%" r="80%">
          <stop offset="0%" stopColor="#3A2E78" />
          <stop offset="55%" stopColor="#1B1A4A" />
          <stop offset="100%" stopColor="#0B0A28" />
        </radialGradient>
        <linearGradient id="galaxy-arm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"  stopColor="#F5D38A" stopOpacity={0} />
          <stop offset="30%" stopColor="#C9B3E8" stopOpacity={0.55} />
          <stop offset="55%" stopColor="#F5D38A" stopOpacity={0.85} />
          <stop offset="80%" stopColor="#E8B4C8" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#F5D38A" stopOpacity={0} />
        </linearGradient>
        <radialGradient id="cosmos-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor="#FFE9B8" />
          <stop offset="50%" stopColor="#F5D38A" />
          <stop offset="100%" stopColor="#F5D38A" stopOpacity={0} />
        </radialGradient>
        <filter id="cosmos-blur"><feGaussianBlur stdDeviation="2.2" /></filter>
      </defs>
      <circle cx={100} cy={100} r={96} fill="url(#cosmos-bg)" />
      {/* 은하수 — 회전하는 띠 */}
      <motion.g
        initial={{ rotate: -20, opacity: 0 }}
        animate={show ? { rotate: 0, opacity: 0.85 } : { opacity: 0 }}
        transition={{ delay: 0.4, duration: 1.8, ease: BOND_EASE.galaxyDrift }}
        style={{ transformOrigin: '100px 100px' }}
      >
        <ellipse cx={100} cy={100} rx={92} ry={28} fill="url(#galaxy-arm)" filter="url(#cosmos-blur)" />
        <ellipse cx={100} cy={100} rx={68} ry={14} fill="url(#galaxy-arm)" opacity={0.85} />
      </motion.g>
      {/* 은하 코어 */}
      <motion.circle
        cx={100} cy={100} r={28}
        fill="url(#cosmos-core)"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={show ? { scale: 1, opacity: 0.95 } : { opacity: 0 }}
        transition={{ delay: 1.1, duration: 1.1, ease: BOND_EASE.starGlow }}
        style={{ transformOrigin: '100px 100px' }}
      />
      {/* 두 별 가까이 — 우리만의 우주 */}
      <motion.g
        initial={{ opacity: 0, scale: 0.4 }}
        animate={show ? { opacity: 1, scale: 1 } : { opacity: 0 }}
        transition={{ delay: 1.6, duration: 0.9, ease: BOND_EASE.starGlow }}
        style={{ transformOrigin: '88px 96px' }}
      >
        <FivePointStar cx={88} cy={96} r={6.5} fill="#FFE9B8" glow="#FFF5D0" />
      </motion.g>
      <motion.g
        initial={{ opacity: 0, scale: 0.4 }}
        animate={show ? { opacity: 1, scale: 1 } : { opacity: 0 }}
        transition={{ delay: 1.85, duration: 0.9, ease: BOND_EASE.starGlow }}
        style={{ transformOrigin: '110px 104px' }}
      >
        <FivePointStar cx={110} cy={104} r={6.5} fill="#FFE9B8" glow="#FFF5D0" />
      </motion.g>
      {/* 잔별 */}
      {[
        [30, 50, 1.4], [165, 40, 1.6], [40, 160, 1.3], [170, 160, 1.5],
        [25, 100, 1.2], [180, 105, 1.3], [70, 30, 1.3], [140, 175, 1.2],
        [60, 178, 1.2], [180, 70, 1.4],
      ].map(([cx, cy, r], i) => (
        <FloatDot key={i} cx={cx as number} cy={cy as number} r={r as number} delay={0.8 + i * 0.07} color="#FFE9B8" show={show} />
      ))}
    </svg>
  );
}

// ============================================================
// 공통 부품
// ============================================================
function FivePointStar({
  cx, cy, r, fill, glow,
}: { cx: number; cy: number; r: number; fill: string; glow: string }) {
  const points = pentaStarPoints(cx, cy, r, r * 0.42);
  const style: CSSProperties = {
    filter: `drop-shadow(0 0 ${r * 0.9}px ${glow})`,
  };
  return (
    <g style={style}>
      <motion.polygon
        points={points}
        fill={fill}
        animate={{ opacity: [0.9, 1, 0.9] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* 십자 광채 */}
      <motion.line
        x1={cx - r * 1.8} y1={cy} x2={cx + r * 1.8} y2={cy}
        stroke={glow} strokeWidth={0.6} strokeLinecap="round"
        animate={{ opacity: [0.25, 0.7, 0.25] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.line
        x1={cx} y1={cy - r * 1.8} x2={cx} y2={cy + r * 1.8}
        stroke={glow} strokeWidth={0.6} strokeLinecap="round"
        animate={{ opacity: [0.25, 0.7, 0.25] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
      />
    </g>
  );
}

function FloatDot({
  cx, cy, r, delay, color, show,
}: { cx: number; cy: number; r: number; delay: number; color: string; show: boolean }) {
  return (
    <motion.circle
      cx={cx} cy={cy} r={r}
      fill={color}
      initial={{ opacity: 0, scale: 0.3 }}
      animate={show ? { opacity: [0, 0.85, 0.55, 0.9, 0.55], scale: 1 } : { opacity: 0 }}
      transition={{
        delay,
        duration: 3.0,
        repeat: Infinity,
        repeatType: 'mirror',
        ease: 'easeInOut',
      }}
    />
  );
}

function pentaStarPoints(cx: number, cy: number, ro: number, ri: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const r = i % 2 === 0 ? ro : ri;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return pts.join(' ');
}
