'use client';

import { useState } from 'react';
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

const SRC = '/background/ebum.png';

export default function MemoryShelf({
  totalMemoryCount,
  onOpenGallery,
  accentColor,
  isDark,
}: Props) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <motion.button
      type="button"
      whileHover={{ y: -3, scale: 1.04 }}
      whileTap={{ scale: 0.94 }}
      onClick={onOpenGallery}
      className="relative flex flex-col items-center cursor-pointer"
      style={{ width: 90, height: 110 }}
      aria-label={`추억 갤러리 — ${totalMemoryCount}장`}
    >
      {/* 그림자 */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full opacity-25"
        style={{ width: 60, height: 8, background: 'rgba(60,40,30,0.4)', filter: 'blur(4px)' }}
      />

      {/* 액자 이미지 */}
      <div className="relative" style={{ width: 86, height: 100 }}>
        {!imgFailed ? (
          <img
            src={SRC}
            alt="추억 액자"
            className="w-full h-full object-contain"
            onError={() => setImgFailed(true)}
            draggable={false}
          />
        ) : (
          /* fallback: CSS 액자 */
          <div
            className="w-full h-full rounded-md flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}11)`,
              border: `2px solid ${accentColor}44`,
            }}
          >
            <span style={{ fontSize: 28, opacity: 0.5 }}>🖼️</span>
          </div>
        )}

        {/* 추억 수 뱃지 */}
        {totalMemoryCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute"
            style={{
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              borderRadius: 9,
              background: accentColor,
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
              fontFamily: ROOM_TOKENS.hudFont,
            }}
          >
            {totalMemoryCount}
          </motion.div>
        )}
      </div>

      {/* 라벨 — 이미지 위 */}
      <div
        className="absolute"
        style={{
          top: -16,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 10,
          fontFamily: ROOM_TOKENS.hudFont,
          fontWeight: 600,
          color: isDark ? `${accentColor}` : `${accentColor}CC`,
          opacity: 0.8,
          whiteSpace: 'nowrap',
        }}
      >
        추억
      </div>
    </motion.button>
  );
}
