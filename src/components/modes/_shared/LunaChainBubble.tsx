'use client';

/**
 * 🧵 v82.1: LunaChainBubble
 *
 * Luna 가 카톡 연속 전송한 느낌 — `|||` 로 문자열 분리.
 * 각 bubble 은 staggered animation 으로 "타이핑 후 전송" 느낌.
 * 첫 bubble 에만 아바타 + 이름, 나머지는 인덴트 정렬.
 */

import { motion } from 'framer-motion';

interface LunaChainBubbleProps {
  text: string;
  startDelay?: number;
  /** bubble 간 간격 (초) — 채팅처럼 느끼려면 0.35~0.6 권장 */
  stagger?: number;
  avatarSrc?: string;
  name?: string;
  /** NPC 역할 (roleplay) — 핑크 톤 */
  variant?: 'luna' | 'npc';
  /** 커스텀 렌더 (React children 직접 삽입 시) */
  children?: never;
}

export default function LunaChainBubble({
  text,
  startDelay = 0,
  stagger = 0.45,
  avatarSrc = '/luna_fox_transparent.webp',
  name = '루나',
  variant = 'luna',
}: LunaChainBubbleProps) {
  const bubbles = text.split('|||').map((s) => s.trim()).filter(Boolean);
  if (bubbles.length === 0) return null;

  const bubbleBg = variant === 'npc' ? 'bg-white' : 'bg-[#F4EFE6]';
  const bubbleBorder = variant === 'npc' ? 'border-pink-200' : 'border-[#D5C2A5]';
  const nameColor = variant === 'npc' ? 'text-pink-600' : 'text-[#5D4037]';

  return (
    <div className="space-y-1">
      {bubbles.map((t, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -10, y: 6 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{
            delay: startDelay + idx * stagger,
            type: 'spring',
            stiffness: 320,
            damping: 26,
          }}
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
            <div className={`px-3 py-2 rounded-2xl rounded-tl-sm ${bubbleBg} border ${bubbleBorder} text-[13px] text-[#4E342E] leading-relaxed`}>
              {t}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
