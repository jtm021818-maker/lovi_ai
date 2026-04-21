'use client';

/**
 * 📖 v85.3: DexFab — 방 페이지 도감 진입 FAB
 *
 * EditFab 옆에 추가. 원형 황동 책 느낌.
 * 호버 시 살짝 떠오르고, 클릭 시 반짝.
 */

import { motion } from 'framer-motion';

interface Props {
  onOpen: () => void;
  /** 소지 수 / 전체 수 표시 (선택) */
  ownedCount?: number;
  totalCount?: number;
}

export default function DexFab({ onOpen, ownedCount, totalCount }: Props) {
  const showBadge = typeof ownedCount === 'number' && typeof totalCount === 'number';
  return (
    <motion.button
      onClick={onOpen}
      whileHover={{ scale: 1.08, y: -2 }}
      whileTap={{ scale: 0.92 }}
      className="relative w-11 h-11 rounded-full flex items-center justify-center text-[18px]"
      style={{
        background: 'linear-gradient(135deg, #8f6f1c 0%, #d4af37 45%, #a08824 100%)',
        color: '#fef3c7',
        boxShadow: [
          '0 5px 14px rgba(143,111,28,0.5)',
          'inset 0 2px 0 rgba(255,235,180,0.5)',
          'inset 0 -2px 2px rgba(0,0,0,0.3)',
          '0 0 0 1px rgba(218,165,32,0.7)',
        ].join(', '),
      }}
      aria-label="도감 열기"
      title="도감 열기"
    >
      {/* 은은한 shimmer */}
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background:
            'linear-gradient(115deg, transparent 40%, rgba(255,250,200,0.45) 50%, transparent 60%)',
          backgroundSize: '200% 100%',
        }}
        animate={{ backgroundPosition: ['200% 0', '-100% 0'] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
      />
      <span className="relative">📖</span>

      {/* 진행률 배지 */}
      {showBadge && (
        <span
          className="absolute -bottom-1 -right-1 min-w-[22px] px-1 h-[16px] rounded-full flex items-center justify-center text-[8.5px] font-black tabular-nums"
          style={{
            background: 'linear-gradient(135deg, #be185d 0%, #ec4899 100%)',
            color: '#fff',
            boxShadow: '0 2px 4px rgba(190,24,93,0.5), inset 0 1px 0 rgba(255,255,255,0.45)',
          }}
        >
          {ownedCount}/{totalCount}
        </span>
      )}
    </motion.button>
  );
}
