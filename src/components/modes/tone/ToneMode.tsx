'use client';

/**
 * 🎨 v82: TONE SELECT — 채팅 네이티브
 *
 * Luna 가 같은 말 톤 3가지로 카톡 보낸 느낌.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { ToneState, ToneOption } from '@/engines/bridge-modes/types';
import LunaChainBubble from '../_shared/LunaChainBubble';

interface ToneModeProps {
  initial: ToneState & { modeId: 'tone' };
  onComplete: (chosen: ToneOption) => void;
}

export default function ToneMode({ initial, onComplete }: ToneModeProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pick = (o: ToneOption) => {
    setSelectedId(o.id);
    try {
      confetti({ particleCount: 18, spread: 55, origin: { y: 0.85 }, startVelocity: 20, zIndex: 9990 });
      navigator.vibrate?.([5, 30, 5]);
    } catch {/* ignore */}
    setTimeout(() => onComplete(o), 900);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-[92%] mx-auto my-4 space-y-2"
    >
      {/* Luna 오프닝 — ||| 로 분리돼서 연속 카톡 느낌 */}
      <LunaChainBubble text="같은 말 톤별로 3개 써봤어 🎨|||어떤 느낌이 맘에 와?" />

      {/* 3개 톤 버블 */}
      {initial.options.map((opt, idx) => {
        const color = opt.intensity < 33 ? '#3B82F6' : opt.intensity < 66 ? '#F59E0B' : '#EF4444';
        const bg = opt.intensity < 33 ? '#DBEAFE' : opt.intensity < 66 ? '#FEF3C7' : '#FEE2E2';
        const isSelected = selectedId === opt.id;
        const isOther = selectedId && selectedId !== opt.id;

        return (
          <motion.div
            key={opt.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: isOther ? 0.3 : 1,
              y: 0,
              scale: isSelected ? 1.02 : 1,
            }}
            transition={{ delay: 0.9 + idx * 0.45, type: 'spring', stiffness: 300, damping: 26 }}
            className="flex items-start gap-2 ml-10"
          >
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1 ml-1">
                <span className="text-[11px]">{opt.emoji}</span>
                <span className="text-[10px] font-bold" style={{ color }}>{opt.label}</span>
                <div className="flex-1 h-[2px] rounded-full overflow-hidden" style={{ background: `${bg}` }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${opt.intensity}%` }}
                    transition={{ delay: 0.3 + idx * 0.2, duration: 0.5 }}
                    className="h-full rounded-full"
                    style={{ background: color }}
                  />
                </div>
                <span className="text-[9px] tabular-nums opacity-60" style={{ color }}>{opt.intensity}</span>
              </div>

              <button
                onClick={() => !selectedId && pick(opt)}
                disabled={!!selectedId}
                className="w-full text-left px-3 py-2.5 rounded-2xl rounded-tl-sm text-[13px] text-[#4E342E] leading-relaxed shadow-sm border active:scale-[0.98] transition-transform disabled:cursor-not-allowed"
                style={{
                  background: bg,
                  borderColor: `${color}55`,
                  boxShadow: isSelected ? `0 0 0 2px ${color}, 0 0 20px ${color}44` : undefined,
                }}
              >
                {opt.content}
              </button>
            </div>
          </motion.div>
        );
      })}

      {/* 선택 후 클로징 */}
      <AnimatePresence>
        {selectedId && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-end gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-[#F4EFE6] border border-[#EACbb3] overflow-hidden shrink-0">
              <img src="/luna_fox_transparent.webp" alt="루나" className="w-full h-full object-cover" />
            </div>
            <div className="px-3 py-2 rounded-2xl rounded-tl-sm bg-[#F4EFE6] border border-[#D5C2A5] text-[13px] text-[#4E342E]">
              오케이 그 톤으로 가자 ✨
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
