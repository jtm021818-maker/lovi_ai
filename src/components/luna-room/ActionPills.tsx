'use client';

import { motion } from 'framer-motion';
import { ROOM_TOKENS } from '@/lib/luna-life/tokens';

interface Props {
  onSpeak: () => void;
  onPet?: () => void;
  petAvailable?: boolean;
  isDeceased: boolean;
  accentColor: string;
  isDark: boolean;
}

export default function ActionPills({ onSpeak, onPet, petAvailable, isDeceased, accentColor, isDark }: Props) {
  return (
    <div className="flex gap-2 justify-center items-center">
      <motion.button
        whileTap={{ scale: 0.94 }}
        whileHover={{ y: -2 }}
        onClick={onSpeak}
        disabled={isDeceased}
        className="px-5 py-2.5 rounded-full flex items-center gap-1.5 shadow-lg"
        style={{
          background: isDeceased
            ? 'rgba(140, 140, 160, 0.25)'
            : `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}DD 100%)`,
          color: isDeceased ? '#9CA3AF' : '#fff',
          fontSize: 13,
          fontWeight: 700,
          fontFamily: ROOM_TOKENS.hudFont,
          boxShadow: isDeceased ? 'none' : `0 4px 14px ${accentColor}55`,
          cursor: isDeceased ? 'not-allowed' : 'pointer',
        }}
      >
        <span>💬</span>
        <span>말 걸기</span>
      </motion.button>

      {onPet && !isDeceased && (
        <motion.button
          whileTap={{ scale: 0.94 }}
          whileHover={{ y: -2 }}
          onClick={onPet}
          disabled={!petAvailable}
          className="px-4 py-2.5 rounded-full flex items-center gap-1.5"
          style={{
            background: isDark ? ROOM_TOKENS.cardBgDark : ROOM_TOKENS.cardBg,
            backdropFilter: 'blur(10px)',
            color: petAvailable ? accentColor : '#9CA3AF',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: ROOM_TOKENS.hudFont,
            border: `1px solid ${petAvailable ? accentColor + '55' : '#9CA3AF22'}`,
            opacity: petAvailable ? 1 : 0.55,
            cursor: petAvailable ? 'pointer' : 'not-allowed',
          }}
          aria-label="쓰담쓰담"
        >
          <span>🤍</span>
          <span>{petAvailable ? '쓰담' : '잠시 후'}</span>
        </motion.button>
      )}
    </div>
  );
}
