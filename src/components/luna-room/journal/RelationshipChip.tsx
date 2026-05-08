'use client';

/**
 * v114 — 루나 룸 헤더 진입 칩.
 *
 * BagButton 패턴 차용 (스타일 일관성).
 * 클릭 시 LunaJournalSheet 오픈.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import LunaJournalSheet from './LunaJournalSheet';

interface Props {
  isDark?: boolean;
  accentColor?: string;
}

const SEEN_KEY = 'luna:bond:seen';

export default function RelationshipChip({ isDark = false, accentColor = '#a78bfa' }: Props) {
  const [open, setOpen] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // 첫 진입시 NEW 펄스 (한 번만)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (!window.localStorage.getItem(SEEN_KEY)) {
        setShowNew(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function handleOpen() {
    setOpen(true);
    setShowNew(false);
    try {
      window.localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="relative whitespace-nowrap px-2.5 py-0.5 rounded-full flex items-center gap-1.5 text-[10px] font-bold transition-transform active:scale-95"
        style={{
          background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)',
          border: `1px solid ${accentColor}55`,
          color: isDark ? '#fde68a' : '#7c5738',
          backdropFilter: 'blur(6px)',
        }}
        aria-label="루나와의 관계 일지 보기"
      >
        <span aria-hidden>🌸</span>
        <span>관계</span>
        {showNew && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1] }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center text-[8px] font-black"
            style={{
              background: '#ec4899',
              color: 'white',
              boxShadow: '0 0 8px rgba(236,72,153,0.55)',
              letterSpacing: 0.5,
            }}
          >
            NEW
          </motion.span>
        )}
      </button>

      <LunaJournalSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
