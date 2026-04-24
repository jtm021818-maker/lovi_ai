'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LunaGift } from '@/lib/luna-life';

interface Props {
  gift: LunaGift;
  accentColor: string;
  isDark: boolean;
  onClose: () => void;
  onOpen: (giftId: string) => void;
}

// Slow typewriter — research: "빠른 스크롤 불가 구조"가 감정 무게 증가
function useSlowTypewriter(text: string, active: boolean) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active || !text) return;
    setDisplayed('');
    setDone(false);
    const chars = text.split('');
    let i = 0;

    function tick() {
      i++;
      setDisplayed(chars.slice(0, i).join(''));
      if (i >= chars.length) { setDone(true); return; }
      // Pause at punctuation for emotional weight
      const c = chars[i - 1];
      const delay = c === '.' || c === '。' ? 900
        : c === ',' || c === ',' ? 350
        : c === '\n' ? 500
        : 28;
      setTimeout(tick, delay);
    }
    setTimeout(tick, 800);
  }, [active, text]);

  return { displayed, done };
}

const GIFT_ICON: Record<LunaGift['giftType'], string> = {
  letter: '💌',
  poem: '🌸',
  memory_album: '📷',
  final_letter: '⭐',
};

export default function LunaEnvelope({ gift, accentColor, isDark, onClose, onOpen }: Props) {
  const [phase, setPhase] = useState<'sealed' | 'opening' | 'reading'>('sealed');
  const isFinal = gift.giftType === 'final_letter';

  const isOpened = !!gift.openedAt;

  useEffect(() => {
    if (isOpened) setPhase('reading');
  }, [isOpened]);

  const handleOpen = () => {
    if (phase !== 'sealed') return;
    setPhase('opening');
    onOpen(gift.id);
    setTimeout(() => setPhase('reading'), 1200);
  };

  const { displayed, done } = useSlowTypewriter(gift.content, phase === 'reading');

  const textColor = isDark ? '#F0ABFC' : '#4E342E';
  const paperBg = isFinal
    ? 'linear-gradient(160deg, #0F0A1E 0%, #1A0A2E 100%)'
    : isDark
    ? 'linear-gradient(160deg, #1E1B4B 0%, #312E81 100%)'
    : 'linear-gradient(160deg, #FFF8F0 0%, #FFFBF5 100%)';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.85, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.85, y: 20 }}
        transition={{ type: 'spring', stiffness: 240, damping: 22 }}
        className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: paperBg, border: `1px solid ${accentColor}44` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{GIFT_ICON[gift.giftType]}</span>
            <span className="text-[12px] font-bold" style={{ color: accentColor }}>
              {gift.triggerDay}일째 — {gift.title}
            </span>
          </div>
          <button onClick={onClose} className="text-[20px] opacity-50 hover:opacity-80">✕</button>
        </div>

        {/* Content area */}
        <div className="px-5 pb-6 min-h-[220px]">
          <AnimatePresence mode="wait">
            {phase === 'sealed' && (
              <motion.div
                key="sealed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-4 py-10"
              >
                <motion.div
                  animate={{ scale: [1, 1.06, 1], rotate: [-2, 2, -2] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="text-5xl"
                >
                  {isFinal ? '⭐' : '💌'}
                </motion.div>
                {isFinal && (
                  <p className="text-[11px] text-center opacity-60" style={{ color: accentColor }}>
                    루나의 마지막 편지
                  </p>
                )}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleOpen}
                  className="px-6 py-2.5 rounded-full text-[13px] font-bold text-white"
                  style={{ background: accentColor }}
                >
                  {isFinal ? '천천히 읽기' : '열어볼게'}
                </motion.button>
              </motion.div>
            )}

            {phase === 'opening' && (
              <motion.div
                key="opening"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center py-16"
              >
                <motion.div
                  animate={{ scale: [1, 1.3, 0.8, 1.2, 1], rotate: [0, 10, -10, 5, 0] }}
                  transition={{ duration: 1.2, ease: 'easeInOut' }}
                  className="text-4xl"
                >
                  {isFinal ? '⭐' : '💌'}
                </motion.div>
              </motion.div>
            )}

            {phase === 'reading' && (
              <motion.div
                key="reading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="pt-1"
              >
                {/* Paper texture line */}
                <div className="h-px mb-4 opacity-20" style={{ background: accentColor }} />

                <p
                  className="text-[14px] leading-[1.9] whitespace-pre-wrap font-light"
                  style={{
                    color: textColor,
                    fontFamily: isFinal ? "'Georgia', serif" : 'inherit',
                    letterSpacing: isFinal ? '0.02em' : 'normal',
                  }}
                >
                  {displayed}
                  {!done && (
                    <motion.span
                      className="inline-block w-[2px] h-[14px] ml-0.5 rounded-full align-middle"
                      style={{ background: accentColor }}
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.7, repeat: Infinity }}
                    />
                  )}
                </p>

                {done && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                    className="mt-4 text-right text-[11px] opacity-50 italic"
                    style={{ color: accentColor }}
                  >
                    — 루나가
                  </motion.p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
