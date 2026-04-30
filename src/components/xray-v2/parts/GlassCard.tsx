'use client';

import { motion, MotionProps } from 'framer-motion';
import { ReactNode, CSSProperties } from 'react';
import { XV2 } from '@/styles/xray-v2-tokens';

interface Props {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  glow?: 'none' | 'cyan' | 'magenta' | 'purple';
  pad?: 'sm' | 'md' | 'lg';
  motionProps?: MotionProps;
}

const PAD = { sm: 12, md: 18, lg: 24 } as const;

const GLOW_MAP = {
  none:    'none',
  cyan:    XV2.glow,
  magenta: XV2.glowMagenta,
  purple:  '0 0 24px rgba(179, 136, 255, 0.35)',
} as const;

export default function GlassCard({
  children,
  className = '',
  style,
  glow = 'none',
  pad = 'md',
  motionProps,
}: Props) {
  return (
    <motion.div
      {...motionProps}
      className={`relative ${className}`}
      style={{
        background: XV2.glassBg,
        backdropFilter: XV2.glassBlur,
        WebkitBackdropFilter: XV2.glassBlur,
        border: `1px solid ${XV2.borderSoft}`,
        borderRadius: 20,
        padding: PAD[pad],
        boxShadow: GLOW_MAP[glow],
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}
