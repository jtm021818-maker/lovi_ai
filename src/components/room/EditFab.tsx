'use client';

/**
 * ✏️ v85.2: EditFab — 편집 모드 토글 플로팅 액션 버튼
 *
 * 방 우측 상단에 떠있는 원형 버튼.
 * 편집 모드 진입 시 색상/아이콘 전환 + 펄스 효과.
 */

import { motion } from 'framer-motion';

interface Props {
  editMode: boolean;
  onToggle: () => void;
}

export default function EditFab({ editMode, onToggle }: Props) {
  return (
    <motion.button
      onClick={onToggle}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      animate={editMode ? { rotate: [0, -8, 8, 0] } : { rotate: 0 }}
      transition={editMode ? { duration: 0.5, repeat: Infinity, repeatDelay: 2 } : {}}
      className="relative w-11 h-11 rounded-full flex items-center justify-center text-[18px]"
      style={{
        background: editMode
          ? 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)'
          : 'linear-gradient(135deg, #fef3c7 0%, #fcd34d 50%, #f59e0b 100%)',
        boxShadow: editMode
          ? '0 6px 16px rgba(236,72,153,0.45), inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -2px 2px rgba(0,0,0,0.25)'
          : '0 5px 14px rgba(245,158,11,0.4), inset 0 2px 0 rgba(255,255,255,0.45), inset 0 -2px 2px rgba(0,0,0,0.2)',
        color: editMode ? '#fff' : '#6b4417',
      }}
      aria-label={editMode ? '편집 종료' : '편집 시작'}
      title={editMode ? '편집 종료' : '편집 시작'}
    >
      {/* 펄스 링 (편집 모드일 때) */}
      {editMode && (
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border-2 border-pink-400"
          animate={{ scale: [1, 1.4], opacity: [0.7, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
      <span>{editMode ? '✓' : '✏️'}</span>
    </motion.button>
  );
}
