'use client';

/**
 * 🧵 v82.1: LunaChainBubble
 *
 * Luna 가 카톡 연속 전송한 느낌 — `|||` 로 문자열 분리.
 * showTypingDots=true 시: 각 버블이 dots → 텍스트 순서로 나타남.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LunaChainBubbleProps {
  text: string;
  startDelay?: number;
  /** bubble 간 간격 (초) */
  stagger?: number;
  avatarSrc?: string;
  name?: string;
  /** NPC 역할 (roleplay) — 핑크 톤 */
  variant?: 'luna' | 'npc';
  /** dots → text 타이핑 연출 */
  showTypingDots?: boolean;
  children?: never;
}

const DOTS_MS = 700;

function Bubble({
  text, idx, startDelay, stagger, showTypingDots,
  bubbleBg, bubbleBorder, dotColor, nameColor,
  name, avatarSrc, variant,
}: {
  text: string; idx: number; startDelay: number; stagger: number; showTypingDots: boolean;
  bubbleBg: string; bubbleBorder: string; dotColor: string; nameColor: string;
  name: string; avatarSrc: string; variant: 'luna' | 'npc';
}) {
  const [showText, setShowText] = useState(!showTypingDots);

  useEffect(() => {
    if (!showTypingDots) return;
    const ms = (startDelay + idx * stagger) * 1000 + DOTS_MS;
    const t = setTimeout(() => setShowText(true), ms);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      initial={{ opacity: 0, x: -10, y: 6 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ delay: startDelay + idx * stagger, type: 'spring', stiffness: 320, damping: 26 }}
      className="flex items-end gap-2"
    >
      {idx === 0 ? (
        <div className={`w-8 h-8 rounded-full bg-[#F4EFE6] border ${variant === 'npc' ? 'border-pink-300' : 'border-[#EACbb3]'} overflow-hidden shrink-0`}>
          <img src={avatarSrc} alt={name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-8 shrink-0" aria-hidden />
      )}
      <div>
        {idx === 0 && (
          <div className={`text-[10px] font-bold ${nameColor} ml-1 mb-0.5`}>{name}</div>
        )}
        <div className={`px-3 py-2 rounded-2xl rounded-tl-sm ${bubbleBg} border ${bubbleBorder} text-[13px] text-[#4E342E] leading-relaxed min-w-[42px] min-h-[36px] flex items-center`}>
          <AnimatePresence mode="wait">
            {!showText ? (
              <motion.span key="dots" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-1 py-0.5">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full inline-block"
                    style={{ background: dotColor }}
                    animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
                  />
                ))}
              </motion.span>
            ) : (
              <motion.span key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
                {text}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default function LunaChainBubble({
  text,
  startDelay = 0,
  stagger = 0.45,
  avatarSrc = '/luna_fox_transparent.webp',
  name = '루나',
  variant = 'luna',
  showTypingDots = false,
}: LunaChainBubbleProps) {
  const bubbles = text.split('|||').map((s) => s.trim()).filter(Boolean);
  if (bubbles.length === 0) return null;

  const bubbleBg = variant === 'npc' ? 'bg-white' : 'bg-[#F4EFE6]';
  const bubbleBorder = variant === 'npc' ? 'border-pink-200' : 'border-[#D5C2A5]';
  const nameColor = variant === 'npc' ? 'text-pink-600' : 'text-[#5D4037]';
  const dotColor = variant === 'npc' ? '#f472b6' : '#B56576';

  return (
    <div className="space-y-1">
      {bubbles.map((t, idx) => (
        <Bubble
          key={idx}
          text={t}
          idx={idx}
          startDelay={startDelay}
          stagger={stagger}
          showTypingDots={showTypingDots}
          bubbleBg={bubbleBg}
          bubbleBorder={bubbleBorder}
          dotColor={dotColor}
          nameColor={nameColor}
          name={name}
          avatarSrc={avatarSrc}
          variant={variant}
        />
      ))}
    </div>
  );
}
