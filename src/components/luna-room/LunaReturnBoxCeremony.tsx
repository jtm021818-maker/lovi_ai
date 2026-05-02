'use client';

/**
 * v104 M5: LunaReturnBoxCeremony
 *
 * Day 95+ 시점에 — 루나가 받은 모든 선물을 박스로 돌려준다.
 * 100일 양방향 호의 정점. 가장 큰 풀스크린 의례.
 *
 * 4 phase: arrived → opening → revealing → final
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReturnItem {
  id: string;
  title: string;
  content: string;
  dayNumber: number | null;
  lunaThought: string | null;
}

interface Props {
  open: boolean;
  boxId: string | null;
  triggeredAtDay: number;
  items: ReturnItem[];
  lunaWords: string;
  onClose: () => void;
}

type Phase = 'arrived' | 'opening' | 'revealing' | 'final';

export default function LunaReturnBoxCeremony({
  open, boxId, triggeredAtDay, items, lunaWords, onClose,
}: Props) {
  const [phase, setPhase] = useState<Phase>('arrived');
  const [revealIdx, setRevealIdx] = useState(0);

  useEffect(() => {
    if (open) {
      setPhase('arrived');
      setRevealIdx(0);
    }
  }, [open]);

  // revealing 단계 — 1.0초 간격으로 아이템 등장
  useEffect(() => {
    if (phase !== 'revealing') return;
    if (revealIdx >= items.length) {
      const t = setTimeout(() => setPhase('final'), 1400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setRevealIdx((v) => v + 1), 900);
    return () => clearTimeout(t);
  }, [phase, revealIdx, items.length]);

  async function handleClose() {
    if (boxId) {
      try {
        await fetch(`/api/luna-room/luna-return/${boxId}/seen`, { method: 'POST' });
      } catch { /* silent */ }
    }
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-[290] flex items-center justify-center overflow-hidden"
          style={{
            background: 'radial-gradient(circle at center, rgba(251,191,36,0.35) 0%, rgba(167,139,250,0.25) 40%, rgba(0,0,0,0.97) 80%)',
          }}
        >
          {/* PHASE 1: 도착 */}
          {phase === 'arrived' && (
            <motion.div
              key="arrived"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              className="flex flex-col items-center text-center px-8"
            >
              <motion.div
                animate={{ y: [0, -8, 0], rotate: [-2, 2, -2] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="text-[72px] mb-4 select-none"
              >
                📦
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-[10px] font-black tracking-[0.3em] text-yellow-200/80 mb-2"
              >
                DAY {triggeredAtDay}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="text-white/95 text-[18px] font-black mb-2"
              >
                루나가 박스를 들고 왔어
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="text-white/55 text-[12px] italic mb-1"
                style={{ fontFamily: 'serif' }}
              >
                "잠깐만 — 너에게 줄 게 있어"
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.6 }}
                className="text-white/40 text-[10px] mb-8"
              >
                {items.length}개의 마음이 들어있어
              </motion.div>
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.0 }}
                onClick={() => setPhase('opening')}
                className="px-6 py-3 rounded-full bg-white/15 backdrop-blur text-white font-bold text-[12px] active:scale-95"
              >
                받아볼래 →
              </motion.button>
            </motion.div>
          )}

          {/* PHASE 2: 박스 열기 */}
          {phase === 'opening' && (
            <motion.div
              key="opening"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.4 }}
              transition={{ type: 'spring', damping: 20, stiffness: 220 }}
              onAnimationComplete={() => setTimeout(() => setPhase('revealing'), 1100)}
              className="relative flex flex-col items-center"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1], rotateY: [0, 360] }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="text-[120px] select-none"
                style={{ filter: 'drop-shadow(0 0 32px rgba(251,191,36,0.6))' }}
              >
                📦
              </motion.div>
              {/* 빛나는 후광 */}
              {Array.from({ length: 16 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1.5, 0.8],
                    x: Math.cos((i / 16) * Math.PI * 2) * 180,
                    y: Math.sin((i / 16) * Math.PI * 2) * 180,
                  }}
                  transition={{ duration: 1.4, delay: 0.4 + i * 0.04 }}
                  className="absolute left-1/2 top-1/2 text-yellow-200 text-2xl"
                  style={{ transform: 'translate(-50%, -50%)' }}
                >
                  ✨
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* PHASE 3: 아이템 줄지어 등장 */}
          {phase === 'revealing' && (
            <motion.div
              key="revealing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col px-6 py-12 max-h-screen overflow-hidden"
            >
              <div className="text-center mb-3">
                <div className="text-[10px] font-black tracking-widest text-yellow-200/75 mb-1">
                  너가 나에게 줬던 것들
                </div>
                <div className="text-white/55 text-[11px] tabular-nums">
                  {Math.min(revealIdx, items.length)} / {items.length}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-2 space-y-2 pb-4">
                {items.slice(0, revealIdx).map((it) => (
                  <motion.div
                    key={it.id}
                    initial={{ opacity: 0, x: -16, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                    className="p-3 rounded-2xl"
                    style={{
                      background: 'rgba(255,248,231,0.92)',
                      border: '1px solid rgba(212,175,55,0.5)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                    }}
                  >
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-[10px] font-black text-amber-700 tabular-nums">
                        D{it.dayNumber ?? '?'}
                      </span>
                      <span className="text-[12px] font-bold text-[#3a2418] truncate flex-1">
                        {it.title}
                      </span>
                    </div>
                    {it.lunaThought && (
                      <div
                        className="text-[10.5px] italic text-[#5a3e2b] leading-relaxed"
                        style={{ fontFamily: 'serif' }}
                      >
                        “{it.lunaThought}”
                      </div>
                    )}
                  </motion.div>
                ))}
                {revealIdx < items.length && (
                  <motion.div
                    key="dots"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className="text-center text-yellow-200/60 text-lg"
                  >
                    · · ·
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* PHASE 4: 마지막 한 줄 */}
          {phase === 'final' && (
            <motion.div
              key="final"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              className="flex flex-col items-center text-center px-8 max-w-md"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="text-[44px] mb-3 select-none"
              >
                💛
              </motion.div>
              <div className="text-[10px] font-black tracking-widest text-yellow-200/75 mb-3">
                루나의 한 마디
              </div>
              <div
                className="w-full p-5 rounded-2xl mb-6"
                style={{
                  background: 'rgba(255,248,231,0.96)',
                  border: '1.5px solid rgba(212,175,55,0.55)',
                  boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
                }}
              >
                <p
                  className="text-[#3a2418] text-[13.5px] leading-relaxed font-semibold"
                  style={{ fontFamily: 'serif' }}
                >
                  “{lunaWords}”
                </p>
              </div>
              <div className="text-white/40 text-[10px] italic mb-5">
                — 너의 시간이었으니까.
              </div>
              <button
                onClick={handleClose}
                className="px-7 py-3 rounded-full bg-white text-[#3a2418] font-bold text-[12px] active:scale-95"
              >
                고마워, 루나
              </button>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
