'use client';

/**
 * v114 — 잉크 진행도 바.
 * 일반 progress bar 보다 윤곽이 살짝 거칠고 끝에 잉크 점이 번지는 느낌.
 */

import { motion } from 'framer-motion';
import { BOND_TOKENS } from '@/lib/luna-life/relationship-tokens';

interface Props {
  /** 0~100 */
  percent: number;
  show: boolean;
  /** 시작 지연 (ms) */
  delay?: number;
}

export default function InkBar({ percent, show, delay = 1450 }: Props) {
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 5,
        background: BOND_TOKENS.inkBarTrack,
        borderRadius: 2.5,
        overflow: 'visible',
      }}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={show ? { width: `${pct}%` } : { width: 0 }}
        transition={{ delay: delay / 1000, duration: 0.85, ease: 'easeOut' }}
        style={{
          height: '100%',
          background: `linear-gradient(90deg, ${BOND_TOKENS.inkBarFill}, ${BOND_TOKENS.inkBarFillEnd})`,
          borderRadius: 2.5,
          position: 'relative',
        }}
      >
        {/* 끝점 잉크 번짐 dot */}
        <span
          style={{
            position: 'absolute',
            right: -3,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: BOND_TOKENS.inkBarFillEnd,
            opacity: 0.55,
            filter: 'blur(1.5px)',
          }}
        />
      </motion.div>
    </div>
  );
}
