'use client';

import { motion } from 'framer-motion';
import { ROOM_TOKENS } from '@/lib/luna-life/tokens';

interface Props {
  ageDays: number;
  showCountdown: boolean;
  isDark: boolean;
  textColor: string;
  accentColor: string;
}

export default function DayBadge({ ageDays, showCountdown, isDark, textColor, accentColor }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={ROOM_TOKENS.springSoft}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
      style={{
        background: isDark ? ROOM_TOKENS.cardBgDark : ROOM_TOKENS.cardBg,
        boxShadow: isDark ? ROOM_TOKENS.cardShadowDark : ROOM_TOKENS.cardShadow,
        backdropFilter: 'blur(8px)',
        border: `1px solid ${accentColor}33`,
      }}
    >
      <motion.span
        animate={{ rotate: [0, -8, 8, -4, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ fontSize: 11, lineHeight: 1 }}
      >
        🌙
      </motion.span>
      <span
        className="tabular-nums"
        style={{
          fontFamily: ROOM_TOKENS.hudFont,
          fontWeight: 700,
          fontSize: 11,
          color: textColor,
          letterSpacing: '0.02em',
        }}
      >
        {showCountdown ? (
          <>D+{ageDays} <span style={{ opacity: 0.5 }}>/ 100</span></>
        ) : (
          <>D+{ageDays}</>
        )}
      </span>
    </motion.div>
  );
}
