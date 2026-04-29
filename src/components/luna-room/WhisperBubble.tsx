'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ROOM_TOKENS } from '@/lib/luna-life/tokens';

interface Props {
  whisper: string | null;
  isLoading?: boolean;
  isDark: boolean;
  accentColor: string;
  textColor: string;
  onRefresh?: () => void;
  refreshDisabled?: boolean;
}

export default function WhisperBubble({
  whisper,
  isLoading,
  isDark,
  accentColor,
  textColor,
  onRefresh,
  refreshDisabled,
}: Props) {
  const text = isLoading ? '...' : whisper ?? '';

  return (
    <div className="relative w-full max-w-[280px] mx-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={text}
          initial={{ opacity: 0, y: 4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -2 }}
          transition={ROOM_TOKENS.springSoft}
          className="relative px-4 py-2.5 rounded-2xl text-center"
          style={{
            background: isDark ? ROOM_TOKENS.cardBgDark : ROOM_TOKENS.cardBg,
            backdropFilter: 'blur(10px)',
            boxShadow: isDark ? ROOM_TOKENS.cardShadowDark : ROOM_TOKENS.cardShadow,
            border: `1px solid ${accentColor}33`,
          }}
        >
          <p
            className="leading-relaxed"
            style={{
              fontFamily: ROOM_TOKENS.whisperFont,
              fontSize: 15,
              color: textColor,
              fontWeight: 500,
              wordBreak: 'keep-all',
            }}
          >
            {text || ' '}
          </p>

          {/* 꼬리 */}
          <div
            className="absolute"
            style={{
              left: '50%',
              bottom: -6,
              transform: 'translateX(-50%) rotate(45deg)',
              width: 12,
              height: 12,
              background: isDark ? ROOM_TOKENS.cardBgDark : ROOM_TOKENS.cardBg,
              borderRight: `1px solid ${accentColor}33`,
              borderBottom: `1px solid ${accentColor}33`,
            }}
          />

          {onRefresh && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onRefresh}
              disabled={refreshDisabled}
              className="absolute -right-1 -top-1 w-6 h-6 rounded-full flex items-center justify-center"
              style={{
                background: accentColor,
                color: '#fff',
                fontSize: 10,
                opacity: refreshDisabled ? 0.4 : 1,
                boxShadow: `0 2px 6px ${accentColor}55`,
              }}
              aria-label="새로 듣기"
            >
              ↻
            </motion.button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
