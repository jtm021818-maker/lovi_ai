'use client';

/**
 * v104: LunaReturnCeremony
 *
 * 루나 외출 종료 후 풀스크린 환영 모먼트.
 * Peak-End Rule — 가장 감정적으로 큰 순간으로 디자인.
 *
 * 흐름: 페이드인 → 루나 한 줄 → 포장 선물 → 탭으로 풀기 → 일러스트 + 노트 → 가방으로
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Item {
  id: string;
  itemId: string;
  name: string;
  emoji: string;
  rarity: string;
  description: string;
  lunaNote: string | null;
  acquiredDay: number | null;
}

interface Props {
  open: boolean;
  tripId: string;
  item: Item;
  onClose: () => void;
}

const RARITY_COLOR: Record<string, { bg: string; text: string; glow: string }> = {
  N:  { bg: 'rgba(156,163,175,0.25)', text: '#cbd5e1', glow: 'rgba(156,163,175,0.4)' },
  R:  { bg: 'rgba(96,165,250,0.25)',  text: '#93c5fd', glow: 'rgba(96,165,250,0.5)' },
  SR: { bg: 'rgba(192,132,252,0.30)', text: '#d8b4fe', glow: 'rgba(192,132,252,0.6)' },
  UR: { bg: 'rgba(251,191,36,0.30)',  text: '#fde68a', glow: 'rgba(251,191,36,0.7)' },
  L:  { bg: 'rgba(6,182,212,0.30)',   text: '#67e8f9', glow: 'rgba(6,182,212,0.7)' },
};

export default function LunaReturnCeremony({ open, tripId, item, onClose }: Props) {
  const [phase, setPhase] = useState<'greet' | 'box' | 'reveal'>('greet');
  const meta = RARITY_COLOR[item.rarity] ?? RARITY_COLOR.N;

  async function handleClose() {
    try {
      await fetch(`/api/luna-room/shopping/${tripId}/seen`, { method: 'POST' });
    } catch { /* silent */ }
    onClose();
    setPhase('greet'); // reset for next
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          className="fixed inset-0 z-[300] flex items-center justify-center"
          style={{
            background: `radial-gradient(circle at center, ${meta.glow} 0%, rgba(0,0,0,0.95) 70%)`,
          }}
        >
          {/* Phase 1: 인사 */}
          {phase === 'greet' && (
            <motion.div
              key="greet"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center text-center px-8"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                className="text-[64px] mb-3 select-none"
              >
                🏠
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-white/90 text-[18px] font-bold tracking-wide mb-2"
              >
                루나가 돌아왔어
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-white/60 text-[13px] italic mb-8"
              >
                &quot;왔어 — 너 보고 싶었어&quot;
              </motion.div>
              <motion.button
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 }}
                onClick={() => setPhase('box')}
                className="px-5 py-2.5 rounded-full bg-white/15 backdrop-blur text-white font-bold text-[12px] active:scale-95"
              >
                선물 받기 →
              </motion.button>
            </motion.div>
          )}

          {/* Phase 2: 포장된 선물 */}
          {phase === 'box' && (
            <motion.div
              key="box"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20, stiffness: 220 }}
              className="flex flex-col items-center text-center px-8"
            >
              <motion.button
                onClick={() => setPhase('reveal')}
                animate={{ rotate: [-1.5, 1.5, -1.5] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                className="relative active:scale-95 transition-transform"
                aria-label="포장 풀기"
              >
                <div
                  className="rounded-3xl flex items-center justify-center text-[80px] select-none"
                  style={{
                    width: 180,
                    height: 180,
                    background: `linear-gradient(135deg, ${meta.bg}, rgba(255,255,255,0.05))`,
                    border: `2px solid ${meta.glow}`,
                    boxShadow: `0 0 40px ${meta.glow}`,
                  }}
                >
                  🎁
                </div>
              </motion.button>
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-5 text-white/85 text-[14px] font-bold"
              >
                탭해서 풀어보기
              </motion.div>
              <div className="mt-1 text-white/45 text-[11px]">
                루나가 너를 위해 골랐어
              </div>
            </motion.div>
          )}

          {/* Phase 3: 공개 */}
          {phase === 'reveal' && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center text-center px-6 max-w-md w-full"
            >
              {/* 파티클 효과 */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {Array.from({ length: 12 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0, 1.2, 0.8],
                      x: (Math.cos((i / 12) * Math.PI * 2) * 200),
                      y: (Math.sin((i / 12) * Math.PI * 2) * 200),
                    }}
                    transition={{ duration: 1.2, delay: 0.1 + i * 0.04 }}
                    className="absolute left-1/2 top-1/2 text-yellow-200 text-lg"
                    style={{ transform: 'translate(-50%, -50%)' }}
                  >
                    ✨
                  </motion.div>
                ))}
              </div>

              {/* 아이템 일러스트 */}
              <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 18, stiffness: 220, delay: 0.15 }}
                className="rounded-3xl flex items-center justify-center mb-3"
                style={{
                  width: 160,
                  height: 160,
                  background: `linear-gradient(135deg, ${meta.bg}, rgba(255,255,255,0.06))`,
                  boxShadow: `0 0 32px ${meta.glow}`,
                  border: `1.5px solid ${meta.glow}`,
                  fontSize: 96,
                }}
              >
                {item.emoji}
              </motion.div>

              {/* 희귀도 띠 */}
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider mb-1"
                style={{ background: meta.bg, color: meta.text, border: `1px solid ${meta.glow}` }}
              >
                {item.rarity}
              </motion.div>

              {/* 이름 */}
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="text-white text-[20px] font-black mb-0.5"
              >
                {item.name}
              </motion.div>

              {/* 설명 */}
              {item.description && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.85 }}
                  className="text-white/55 text-[11px] mb-3 italic"
                >
                  {item.description}
                </motion.div>
              )}

              {/* 루나 노트 카드 */}
              {item.lunaNote && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1, duration: 0.5 }}
                  className="w-full p-4 rounded-2xl mb-5"
                  style={{
                    background: 'rgba(255,248,231,0.96)',
                    border: '1px solid rgba(212,175,55,0.45)',
                    boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
                  }}
                >
                  <div className="text-[9px] font-bold text-[#7c5738]/55 mb-1.5 tracking-widest">
                    루나의 한 마디
                    {item.acquiredDay && <span className="ml-1.5">· Day {item.acquiredDay}</span>}
                  </div>
                  <div
                    className="text-[#3a2418] text-[12.5px] leading-relaxed"
                    style={{ fontFamily: 'serif' }}
                  >
                    “{item.lunaNote}”
                  </div>
                </motion.div>
              )}

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.6 }}
                onClick={handleClose}
                className="px-6 py-2.5 rounded-full bg-white text-[#3a2418] font-bold text-[12px] active:scale-95"
              >
                고마워
              </motion.button>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
