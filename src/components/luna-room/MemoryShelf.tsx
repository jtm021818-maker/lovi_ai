'use client';

import { motion } from 'framer-motion';
import type { LunaMemory } from '@/lib/luna-life';
import { ROOM_TOKENS } from '@/lib/luna-life/tokens';
/* eslint-disable @next/next/no-img-element */

interface Props {
  pinnedMemories: LunaMemory[];
  totalMemoryCount: number;
  onOpenGallery: () => void;
  onSelectMemory: (memory: LunaMemory) => void;
  accentColor: string;
  isDark: boolean;
}

const FRAME_BORDER: Record<string, string> = {
  wood: '#8B5A2B',
  gold: '#D4AF37',
  pastel: '#F9A8D4',
  film: '#1F2937',
};

interface FrameProps {
  memory: LunaMemory | null;
  accentColor: string;
  index: number;
  onClick: () => void;
}

function MiniFrame({ memory, accentColor, index, onClick }: FrameProps) {
  const isEmpty = !memory;
  const borderColor = memory?.frameStyle ? FRAME_BORDER[memory.frameStyle] ?? FRAME_BORDER.wood : FRAME_BORDER.wood;
  // Deterministic tilt per index (no Math.random — 안정적)
  const tilts = [-3, 1.5, -1, 2.5, -2];
  const tilt = isEmpty ? 0 : tilts[index % tilts.length];

  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      whileHover={{ y: -3, rotate: 0, scale: isEmpty ? 1 : 1.08 }}
      whileTap={{ scale: 0.94 }}
      className="relative flex flex-col items-center justify-center"
      style={{
        width: 32,
        height: 40,
        borderRadius: 3,
        background: isEmpty ? 'rgba(255,255,255,0.15)' : '#FFFBF5',
        border: `1.5px solid ${isEmpty ? `${accentColor}33` : borderColor}`,
        boxShadow: isEmpty ? 'none' : '0 2px 4px rgba(60, 40, 30, 0.28)',
        transform: `rotate(${tilt}deg)`,
        padding: 2,
        cursor: 'pointer',
      }}
      aria-label={memory ? `추억: ${memory.title}` : '추억 슬롯'}
    >
      {memory ? (
        <>
          <div
            className="relative flex items-center justify-center overflow-hidden"
            style={{
              width: '100%',
              flex: 1,
              background: memory.imageUrl
                ? '#000'
                : `linear-gradient(135deg, ${accentColor}33, ${accentColor}11)`,
              borderRadius: 1,
              fontSize: 8,
              fontWeight: 700,
              color: accentColor,
            }}
          >
            {memory.imageUrl ? (
              <img
                src={memory.imageUrl}
                alt={memory.title}
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
                referrerPolicy="no-referrer"
              />
            ) : (
              <span>{memory.title.slice(0, 2)}</span>
            )}
          </div>
          <div style={{ fontSize: 6, color: '#7C6B5A', marginTop: 1, lineHeight: 1 }}>
            D+{memory.dayNumber}
          </div>
        </>
      ) : (
        <span style={{ fontSize: 10, opacity: 0.4 }}>+</span>
      )}
    </motion.button>
  );
}

export default function MemoryShelf({
  pinnedMemories,
  totalMemoryCount,
  onOpenGallery,
  onSelectMemory,
  accentColor,
  isDark,
}: Props) {
  const slots = [
    pinnedMemories[0] ?? null,
    pinnedMemories[1] ?? null,
    pinnedMemories[2] ?? null,
  ];

  return (
    <div
      className="relative flex flex-col items-center"
      style={{ width: 132, height: 100 }}
    >
      {/* 선반 (shelf plank) */}
      <div className="relative" style={{ width: 120, height: 64 }}>
        {/* 액자들 — 각 액자가 자체 클릭 */}
        <div className="absolute inset-x-0 top-2 flex justify-around items-end" style={{ height: 50 }}>
          {slots.map((m, i) => (
            <MiniFrame
              key={m?.id ?? `empty-${i}`}
              memory={m}
              accentColor={accentColor}
              index={i}
              onClick={() => {
                if (m) {
                  onSelectMemory(m);
                } else {
                  onOpenGallery();
                }
              }}
            />
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

      {/* 카운트 칩 — 클릭 시 갤러리 진입 */}
      <motion.button
        type="button"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.96 }}
        onClick={onOpenGallery}
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
          cursor: 'pointer',
        }}
        aria-label={`추억 갤러리 — ${totalMemoryCount}장`}
      >
        추억 {totalMemoryCount}
      </motion.button>
    </div>
  );
}
