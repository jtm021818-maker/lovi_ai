'use client';

/**
 * v104 M3: CapsuleUnlockCeremony
 *
 * 만기된 타임캡슐 풀어보는 의례.
 * "N일 전의 너로부터" — 시간 차 감정 호.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PendingCapsule {
  id: string;
  message: string;
  sealedAt: string;
  unlocksAt: string;
  daysSealed: number;
}

interface Props {
  open: boolean;
  capsule: PendingCapsule | null;
  onClose: () => void;
}

export default function CapsuleUnlockCeremony({ open, capsule, onClose }: Props) {
  const [phase, setPhase] = useState<'arrived' | 'opening' | 'reading'>('arrived');

  async function handleClose() {
    if (capsule) {
      try {
        await fetch(`/api/luna-room/capsules/${capsule.id}/open`, { method: 'POST' });
      } catch { /* silent */ }
    }
    onClose();
    setPhase('arrived');
  }

  if (!capsule) return null;

  const sealedDate = new Date(capsule.sealedAt);
  const sealedLabel = `${sealedDate.getMonth() + 1}월 ${sealedDate.getDate()}일`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          className="fixed inset-0 z-[280] flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle at center, rgba(167,139,250,0.4) 0%, rgba(0,0,0,0.95) 70%)',
          }}
        >
          {phase === 'arrived' && (
            <motion.div
              key="arrived"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center text-center px-8"
            >
              <motion.div
                animate={{ rotate: [0, -5, 5, -5, 0], scale: [1, 1.05, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                className="text-[64px] mb-3 select-none"
              >
                ⌛
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-white/90 text-[16px] font-bold tracking-wide mb-1"
              >
                타임캡슐이 도착했어
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-white/55 text-[12px] italic mb-1"
              >
                {capsule.daysSealed}일 전의 너로부터
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="text-white/40 text-[10px] mb-8"
              >
                {sealedLabel}에 봉인했어
              </motion.div>
              <motion.button
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.3 }}
                onClick={() => setPhase('opening')}
                className="px-5 py-2.5 rounded-full bg-white/15 backdrop-blur text-white font-bold text-[12px] active:scale-95"
              >
                풀어보기 →
              </motion.button>
            </motion.div>
          )}

          {phase === 'opening' && (
            <motion.div
              key="opening"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 22, stiffness: 220 }}
              className="flex flex-col items-center text-center px-8"
              onAnimationComplete={() => setTimeout(() => setPhase('reading'), 800)}
            >
              <motion.div
                animate={{ rotateY: [0, 360, 720] }}
                transition={{ duration: 1.4, ease: 'easeInOut' }}
                className="relative"
              >
                <div
                  className="rounded-full flex items-center justify-center text-[80px] select-none"
                  style={{
                    width: 160,
                    height: 160,
                    background: 'linear-gradient(135deg, rgba(167,139,250,0.3), rgba(236,72,153,0.2))',
                    border: '2px solid rgba(167,139,250,0.6)',
                    boxShadow: '0 0 50px rgba(167,139,250,0.6)',
                  }}
                >
                  ⌛
                </div>
                {/* 빛나는 입자들 */}
                {Array.from({ length: 10 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0, 1.5, 0],
                      x: Math.cos((i / 10) * Math.PI * 2) * 110,
                      y: Math.sin((i / 10) * Math.PI * 2) * 110,
                    }}
                    transition={{ duration: 1.4, delay: 0.4 + i * 0.05 }}
                    className="absolute left-1/2 top-1/2 text-yellow-200 text-lg"
                  >
                    ✨
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {phase === 'reading' && (
            <motion.div
              key="reading"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center text-center px-6 max-w-md w-full"
            >
              <div className="text-[10px] font-black tracking-widest text-white/55 mb-1">
                {capsule.daysSealed}일 전의 너
              </div>
              <div className="text-white text-[15px] font-bold mb-4">
                "이렇게 적어 두었어"
              </div>

              {/* 메시지 카드 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, type: 'spring', damping: 22 }}
                className="w-full p-5 rounded-2xl mb-5 max-h-[50vh] overflow-y-auto"
                style={{
                  background: 'rgba(255,248,231,0.97)',
                  border: '1.5px solid rgba(212,175,55,0.55)',
                  boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
                }}
              >
                <div
                  className="text-[#3a2418] text-[13px] leading-relaxed text-left whitespace-pre-wrap"
                  style={{ fontFamily: 'serif' }}
                >
                  {capsule.message}
                </div>
                <div className="mt-3 pt-3 text-right text-[9px] text-[#7c5738]/55 italic"
                  style={{ borderTop: '1px solid rgba(212,175,55,0.25)' }}
                >
                  — {sealedLabel}의 너
                </div>
              </motion.div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                onClick={handleClose}
                className="px-6 py-2.5 rounded-full bg-white text-[#3a2418] font-bold text-[12px] active:scale-95"
              >
                고마워, 그때의 나
              </motion.button>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
