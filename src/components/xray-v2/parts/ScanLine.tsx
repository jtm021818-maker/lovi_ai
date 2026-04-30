'use client';

import { motion } from 'framer-motion';
import { XV2 } from '@/styles/xray-v2-tokens';

interface Props {
  /** 위→아래 한 사이클 시간 (초) */
  duration?: number;
  /** 반복 여부 */
  repeat?: boolean;
  /** 스캔 라인 두께 */
  thickness?: number;
}

/**
 * 위에서 아래로 흐르는 시안 스캔 라인. 의료 X-ray 영상 모티브.
 * 라인 자체 + 잔상 글로우 + 그레인 노이즈.
 */
export default function ScanLine({
  duration = 4,
  repeat = true,
  thickness = 2,
}: Props) {
  return (
    <motion.div
      initial={{ top: '-5%' }}
      animate={{ top: '105%' }}
      transition={{
        duration,
        repeat: repeat ? Infinity : 0,
        ease: 'easeInOut',
        repeatType: 'loop',
      }}
      className="absolute inset-x-0 pointer-events-none z-[20]"
      style={{
        height: thickness,
        background: `linear-gradient(90deg, transparent, ${XV2.cyan}, transparent)`,
        boxShadow: `0 0 24px ${XV2.cyan}, 0 0 48px ${XV2.cyan}88`,
      }}
    >
      {/* 잔상 (위쪽으로 페이드) */}
      <div
        className="absolute inset-x-0 -top-20"
        style={{
          height: 80,
          background: `linear-gradient(180deg, transparent, ${XV2.cyan}11, ${XV2.cyan}33)`,
        }}
      />
    </motion.div>
  );
}
