'use client';

import { motion } from 'framer-motion';
import type { LunaMemory } from '@/lib/luna-life';
import { ROOM_TOKENS } from '@/lib/luna-life/tokens';

interface Props {
  pinnedMemories: LunaMemory[];
  totalMemoryCount: number;
  onOpenGallery: () => void;
  accentColor: string;
  isDark: boolean;
}

const FRAME_BORDER: Record<string, string> = {
  wood: '#8B5A2B',
  gold: '#D4AF37',
  pastel: '#F9A8D4',
  film: '#1F2937',
};

function MiniFrame({ memory, accentColor }: { memory: LunaMemory | null; accentColor: string }) {
  const isEmpty = !memory;
  const borderColor = memory?.frameStyle ? FRAME_BORDER[memory.frameStyle] ?? FRAME_BORDER.wood : FRAME_BORDER.wood;

  return (
    <motion.div
      whileHover={{ y: -2, rotate: isEmpty ? 0 : [-2, 2, 0][Math.floor(Math.random() * 3)] }}
      className="relative flex flex-col items-center justify-center"
      style={{
        width: 28,
        height: 36,
        borderRadius: 3,
        background: isEmpty ? 'rgba(255,255,255,0.15)' : '#FFFBF5',
        border: `1.5px solid ${isEmpty ? `${accentColor}33` : borderColor}`,
        boxShadow: isEmpty ? 'none' : '0 2px 4px rgba(60, 40, 30, 0.25)',
        transform: `rotate(${isEmpty ? 0 : (Math.random() - 0.5) * 6}deg)`,
        padding: 2,
      }}
    >
      {memory ? (
        <>
          <div
            className="flex items-center justify-center"
            style={{
              width: '100%',
              flex: 1,
              background: `linear-gradient(135deg, ${accentColor}33, ${accentColor}11)`,
              borderRadius: 1,
              fontSize: 8,
              fontWeight: 700,
              color: accentColor,
            }}
          >
            {memory.title.slice(0, 2)}
          </div>
          <div style={{ fontSize: 6, color: '#7C6B5A', marginTop: 1, lineHeight: 1 }}>
            D+{memory.dayNumber}
          </div>
        </>
      ) : (
        <span style={{ fontSize: 10, opacity: 0.4 }}>+</span>
      )}
    </motion.div>
  );
}

export default function MemoryShelf({
  pinnedMemories,
  totalMemoryCount,
  onOpenGallery,
  accentColor,
  isDark,
}: Props) {
  const slots = [
    pinnedMemories[0] ?? null,
    pinnedMemories[1] ?? null,
    pinnedMemories[2] ?? null,
  ];

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -2 }}
      onClick={onOpenGallery}
      className="relative flex flex-col items-center cursor-pointer"
      style={{ width: 120, height: 100 }}
      aria-label={`추억 — ${totalMemoryCount}장`}
    >
      {/* 선반 (shelf plank) */}
      <div className="relative" style={{ width: 110, height: 64 }}>
        {/* 액자들 */}
        <div className="absolute inset-x-0 top-2 flex justify-around items-end" style={{ height: 44 }}>
          {slots.map((m, i) => (
            <MiniFrame key={m?.id ?? `empty-${i}`} memory={m} accentColor={accentColor} />
          ))}
        </div>
        {/* 나무 선반 */}
        <div
          className="absolute bottom-0 inset-x-0 rounded-sm"
          style={{
            height: 6,
            background: 'linear-gradient(180deg, #B8956A, #8B6F47)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.18)',
          }}
        />
        {/* 지지대 */}
        <div
          className="absolute"
          style={{ bottom: -10, left: 18, width: 4, height: 12, background: '#6B5440', borderRadius: 1 }}
        />
        <div
          className="absolute"
          style={{ bottom: -10, right: 18, width: 4, height: 12, background: '#6B5440', borderRadius: 1 }}
        />
      </div>

      {/* 카운트 칩 */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 px-2.5 py-0.5 rounded-full"
        style={{
          background: isDark ? ROOM_TOKENS.cardBgDark : ROOM_TOKENS.cardBg,
          fontSize: 10,
          fontWeight: 600,
          color: accentColor,
          fontFamily: ROOM_TOKENS.hudFont,
          border: `1px solid ${accentColor}22`,
        }}
      >
        추억 {totalMemoryCount}
      </motion.div>
    </motion.button>
  );
}
