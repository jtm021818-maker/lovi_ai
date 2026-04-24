'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  delta: { value: number; key: number } | null;
}

function getMessage(value: number): string {
  if (value >= 1.0) return '루나가 많이 친해진 것 같아 💜';
  if (value >= 0.3) return '루나와 조금 더 가까워졌어 🌸';
  return '루나가 기억할게 ☺️';
}

export default function IntimacyDeltaHint({ delta }: Props) {
  return (
    <AnimatePresence mode="wait">
      {delta !== null && (
        <motion.div
          key={delta.key}
          className="absolute top-full right-0 mt-1 z-50 pointer-events-none select-none flex flex-col items-end gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
        >
          {/* +N.N 플로팅 숫자 */}
          <motion.span
            initial={{ y: 0, opacity: 1 }}
            animate={{ y: -14, opacity: 0 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
            className="text-[12px] font-black text-purple-500 drop-shadow-sm"
          >
            +{delta.value}
          </motion.span>

          {/* 코멘트 토스트 */}
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.94 }}
            transition={{ type: 'spring', damping: 18, stiffness: 280, delay: 0.15 }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-2xl text-[10.5px] font-semibold text-purple-800/90 whitespace-nowrap backdrop-blur-sm shadow-md"
            style={{
              background: 'linear-gradient(135deg, #faf0ff 0%, #fce7f3 100%)',
              border: '1px solid rgba(192,132,252,0.3)',
              boxShadow: '0 4px 14px rgba(168,85,247,0.15)',
            }}
          >
            {getMessage(delta.value)}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
