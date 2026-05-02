'use client';

/**
 * v104: BagButton
 *
 * 룸 헤더의 가방 진입 칩.
 * NEW 카운트 뱃지 자동 표시.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import BagSheet from './BagSheet';

interface Props {
  isDark?: boolean;
  accentColor?: string;
}

export default function BagButton({ isDark = false, accentColor = '#a78bfa' }: Props) {
  const [open, setOpen] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [allCount, setAllCount] = useState(0);

  async function loadCounts() {
    try {
      const r = await fetch('/api/luna-room/inventory');
      const d = await r.json();
      setNewCount(d.newCount ?? 0);
      setAllCount(d.counts?.all ?? 0);
    } catch { /* silent */ }
  }

  useEffect(() => {
    loadCounts();
    const t = setInterval(loadCounts, 60_000);
    return () => clearInterval(t);
  }, []);

  // 시트 닫을 때 카운트 갱신
  useEffect(() => {
    if (!open) loadCounts();
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative px-2.5 py-0.5 rounded-full flex items-center gap-1.5 text-[10px] font-bold transition-transform active:scale-95"
        style={{
          background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)',
          border: `1px solid ${accentColor}55`,
          color: isDark ? '#fde68a' : '#7c5738',
          backdropFilter: 'blur(6px)',
        }}
        aria-label="가방 열기"
      >
        <span>🎒</span>
        <span>가방</span>
        {allCount > 0 && (
          <span className="text-[9px] tabular-nums opacity-70">{allCount}</span>
        )}
        {newCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center text-[9px] font-black"
            style={{
              background: '#ec4899',
              color: 'white',
              boxShadow: '0 0 8px rgba(236,72,153,0.5)',
            }}
          >
            {newCount > 9 ? '9+' : newCount}
          </motion.span>
        )}
      </button>

      <BagSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
