'use client';
import { motion } from 'framer-motion';

interface SpreadSelectorProps {
  suggestedSpread: 'single' | 'three' | 'love';
  spreadReason: string;
  onSelect: (spread: 'single' | 'three' | 'love') => void;
}

const SPREAD_OPTIONS = [
  {
    type: 'single' as const,
    label: '원카드',
    emoji: '🃏',
    desc: '핵심만 빠르게!',
    cardCount: 1,
  },
  {
    type: 'three' as const,
    label: '쓰리카드',
    emoji: '✨',
    desc: '과거/현재/미래',
    cardCount: 3,
  },
  {
    type: 'love' as const,
    label: '연애 스프레드',
    emoji: '💕',
    desc: '5장으로 깊게',
    cardCount: 5,
  },
];

export default function SpreadSelector({ suggestedSpread, spreadReason, onSelect }: SpreadSelectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      className="rounded-[24px] border p-5 my-4 max-w-[92%] mx-auto overflow-hidden relative shadow-[0_8px_40px_rgba(26,26,62,0.5)]"
      style={{
        background: 'linear-gradient(160deg, #1a1a3e 0%, #2d1b69 100%)',
        borderColor: '#d4af3755',
      }}
    >
      {/* Background stars */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          { top: '10%', left: '8%', size: 2 },
          { top: '20%', right: '12%', size: 3 },
          { top: '50%', left: '92%', size: 2 },
          { top: '70%', left: '5%', size: 3 },
          { top: '85%', right: '7%', size: 2 },
        ].map((s, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: s.size,
              height: s.size,
              background: '#d4af37',
              top: s.top,
              left: (s as { top: string; left?: string; right?: string; size: number }).left,
              right: (s as { top: string; left?: string; right?: string; size: number }).right,
            }}
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8] }}
            transition={{ duration: 2.5 + i * 0.5, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}
      </div>

      {/* 타로냥 message */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-start gap-2 mb-5 rounded-[16px] p-3 relative z-10"
        style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}
      >
        <span className="text-xl flex-shrink-0">🐱</span>
        <p className="text-[13px] leading-snug font-medium" style={{ color: '#d4c5f0' }}>
          냥~ {spreadReason}
        </p>
      </motion.div>

      {/* Section label */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center text-[11px] font-bold tracking-widest mb-4 relative z-10"
        style={{ color: '#d4af37aa' }}
      >
        스프레드를 선택해줘
      </motion.p>

      {/* Spread options */}
      <div className="flex gap-2.5 relative z-10">
        {SPREAD_OPTIONS.map((option, idx) => {
          const isSuggested = option.type === suggestedSpread;
          return (
            <motion.button
              key={option.type}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + idx * 0.1, type: 'spring', stiffness: 300, damping: 26 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => onSelect(option.type)}
              className="flex-1 flex flex-col items-center gap-1.5 py-4 px-2 rounded-[18px] relative outline-none cursor-pointer"
              style={
                isSuggested
                  ? {
                      background: 'linear-gradient(160deg, rgba(212,175,55,0.18) 0%, rgba(107,70,193,0.3) 100%)',
                      border: '1.5px solid #d4af37',
                      boxShadow: '0 0 18px rgba(212,175,55,0.35), inset 0 0 12px rgba(212,175,55,0.08)',
                    }
                  : {
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(212,175,55,0.2)',
                    }
              }
            >
              {/* 추천 badge */}
              {isSuggested && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: 'spring', stiffness: 400 }}
                  className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-extrabold px-2 py-0.5 rounded-full"
                  style={{ background: '#d4af37', color: '#1a1a3e' }}
                >
                  추천
                </motion.span>
              )}

              {/* Emoji */}
              <motion.span
                className="text-2xl"
                animate={isSuggested ? { filter: ['drop-shadow(0 0 4px #d4af37aa)', 'drop-shadow(0 0 10px #d4af37dd)', 'drop-shadow(0 0 4px #d4af37aa)'] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {option.emoji}
              </motion.span>

              {/* Label */}
              <span
                className="text-[12px] font-extrabold text-center leading-tight"
                style={{ color: isSuggested ? '#ffd54f' : '#c8b8f0' }}
              >
                {option.label}
              </span>

              {/* Description */}
              <span
                className="text-[10px] text-center leading-tight"
                style={{ color: isSuggested ? '#f5e6a3aa' : '#9b7dd4aa' }}
              >
                {option.desc}
              </span>

              {/* Card count pill */}
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded-full mt-0.5"
                style={
                  isSuggested
                    ? { background: 'rgba(212,175,55,0.2)', color: '#d4af37' }
                    : { background: 'rgba(155,125,212,0.15)', color: '#9b7dd4' }
                }
              >
                {option.cardCount}장
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
