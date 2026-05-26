'use client';

/**
 * v114 — 도장 스타일 레벨 인디케이터.
 *
 * Lv.X 칩 대신 잉크 도장이 종이에 찍힌 형태.
 * 살짝 기울어짐 (-7°), 잉크 텍스처 (SVG 필터), 입장시 누름 모션.
 */

import { motion } from 'framer-motion';
import { BOND_TOKENS, HANDWRITE_FONT, BOND_EASE } from '@/lib/luna-life/relationship-tokens';
import { getStageLabel } from './level-unlocks';

interface Props {
  level: number;       // 1~5
  levelName: string;   // "새싹" / "개화" / ... (legacy, kept for back-compat)
  show: boolean;
  delay?: number;      // ms
  /** 만렙 별 액센트 표시 */
  isMax?: boolean;
}

export default function LevelStamp({ level, levelName: _legacyLevelName, show, delay = 800, isMax = false }: Props) {
  const stage = getStageLabel(level);
  void _legacyLevelName; // retained for back-compat; UI now uses STAGE_LABELS
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0, rotate: -3 }}
      animate={
        show
          ? { scale: [0.6, 1.08, 1], opacity: 1, rotate: -7 }
          : { scale: 0.6, opacity: 0, rotate: -3 }
      }
      transition={{
        delay: delay / 1000,
        duration: 0.5,
        times: [0, 0.6, 1],
        ease: BOND_EASE.stampPress,
      }}
      style={{ position: 'relative' }}
    >
      <svg width={84} height={84} viewBox="0 0 84 84">
        <defs>
          <filter id="ink-grain" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" />
            <feDisplacementMap in="SourceGraphic" scale="1.5" />
          </filter>
        </defs>

        {/* 외곽 원 — 잉크 거친 stroke */}
        <circle
          cx={42}
          cy={42}
          r={38}
          fill="none"
          stroke={BOND_TOKENS.stampInk}
          strokeWidth={2.5}
          opacity={0.85}
          filter="url(#ink-grain)"
        />
        {/* 내부 원 */}
        <circle
          cx={42}
          cy={42}
          r={33}
          fill="none"
          stroke={BOND_TOKENS.stampInk}
          strokeWidth={1}
          opacity={0.55}
        />

        {/* "우리는" 자그마한 라벨 */}
        <text
          x={42}
          y={28}
          textAnchor="middle"
          fontSize={8}
          fill={BOND_TOKENS.stampInk}
          fontFamily={HANDWRITE_FONT}
          letterSpacing="0.15em"
          opacity={0.75}
        >
          우리는
        </text>

        {/* 큰 단계 아이콘 (별·달·은하) */}
        <text
          x={42}
          y={51}
          textAnchor="middle"
          fontSize={22}
          fill={BOND_TOKENS.stampInk}
          fontFamily={HANDWRITE_FONT}
        >
          {stage.icon}
        </text>

        {/* 관계 호칭 */}
        <text
          x={42}
          y={68}
          textAnchor="middle"
          fontSize={stage.title.length >= 5 ? 9 : 11}
          fontWeight={700}
          fill={BOND_TOKENS.stampInk}
          fontFamily={HANDWRITE_FONT}
          opacity={0.95}
        >
          {stage.title}
        </text>
      </svg>

      {/* 만렙 별 액센트 */}
      {isMax && (
        <motion.span
          initial={{ scale: 0, rotate: 30 }}
          animate={show ? { scale: 1, rotate: 12 } : { scale: 0, rotate: 30 }}
          transition={{ delay: (delay + 400) / 1000, duration: 0.4 }}
          style={{
            position: 'absolute',
            top: -4,
            right: -8,
            color: BOND_TOKENS.stampInkDeep,
            fontSize: 18,
            fontWeight: 900,
          }}
        >
          ✦
        </motion.span>
      )}
    </motion.div>
  );
}
