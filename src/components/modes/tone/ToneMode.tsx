'use client';

/**
 * 🎨 v81: TONE SELECT Mode — 톤 3가지 비교 + 선택
 *
 * 유저 상황 → LLM 이 같은 메시지를 3톤으로 생성 → 유저가 고름.
 * - 부드럽게 (soft)
 * - 솔직하게 (honest)
 * - 단호하게 (firm)
 *
 * 특화: 온도계 시각화 + hover preview.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import ModeFrame from '../ModeFrame';
import type { ToneOption, ToneState } from '@/engines/bridge-modes/types';

interface ToneModeProps {
  initial: ToneState;
  onComplete: (chosen: ToneOption) => void;
  onExit: () => void;
}

export default function ToneMode({ initial, onComplete, onExit }: ToneModeProps) {
  const [selectedId, setSelectedId] = useState<string | null>(initial.selectedId);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  const handleConfirm = () => {
    const chosen = initial.options.find((o) => o.id === selectedId);
    if (chosen) onComplete(chosen);
  };

  return (
    <ModeFrame modeId="tone" subtitle={initial.context} onExit={onExit}>
      <div className="p-4 space-y-4">
        {/* 안내 */}
        <div className="text-center py-2">
          <div className="text-[13px] font-bold text-[#5D4037]">어떤 느낌으로 가고 싶어?</div>
          <div className="text-[11px] text-[#6D4C41]/80 mt-0.5">세 톤 미리 보고 골라봐</div>
        </div>

        {/* 3개 카드 */}
        <div className="space-y-3">
          {initial.options.map((opt, idx) => (
            <ToneCard
              key={opt.id}
              option={opt}
              isSelected={selectedId === opt.id}
              isHover={hoverId === opt.id}
              idx={idx}
              onSelect={() => handleSelect(opt.id)}
              onHover={(h) => setHoverId(h ? opt.id : null)}
            />
          ))}
        </div>

        {/* 확정 버튼 */}
        <motion.div
          className="sticky bottom-0 pt-2 pb-2 bg-gradient-to-t from-[#F4EFE6] via-[#F4EFE6] to-transparent"
          initial={false}
          animate={{ opacity: selectedId ? 1 : 0.5 }}
        >
          <button
            onClick={handleConfirm}
            disabled={!selectedId}
            className="w-full py-3 rounded-full bg-[#B56576] text-white font-bold text-[14px] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {selectedId
              ? `${initial.options.find(o => o.id === selectedId)?.label} 톤으로 결정`
              : '골라줘'}
          </button>
        </motion.div>
      </div>
    </ModeFrame>
  );
}

// ─────────────────────────────────────────────────
// 톤 카드
// ─────────────────────────────────────────────────

function ToneCard({
  option,
  isSelected,
  isHover,
  idx,
  onSelect,
  onHover,
}: {
  option: ToneOption;
  isSelected: boolean;
  isHover: boolean;
  idx: number;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
}) {
  const intensityColor =
    option.intensity < 33 ? '#60A5FA'      // blue (부드러움)
    : option.intensity < 66 ? '#FBBF24'    // amber (중립)
    : '#EF4444';                           // red (강함)

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + idx * 0.1, type: 'spring', stiffness: 320, damping: 26 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={`w-full p-4 rounded-2xl text-left transition-all ${
        isSelected
          ? 'bg-white border-[2.5px] border-[#B56576] shadow-lg'
          : 'bg-white/70 border-[2px] border-[#D5C2A5]/50 hover:border-[#B56576]/50'
      }`}
    >
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{option.emoji}</span>
        <span className="text-[13px] font-bold text-[#5D4037]">{option.label}</span>
        {isSelected && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="ml-auto text-[#B56576]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </motion.span>
        )}
      </div>

      {/* 내용 미리보기 */}
      <div
        className={`text-[13px] leading-relaxed mb-3 ${isHover || isSelected ? 'text-[#4E342E]' : 'text-[#5D4037]/80'}`}
      >
        &ldquo;{option.content}&rdquo;
      </div>

      {/* 온도계 */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[#6D4C41]/70">🌡️</span>
        <div className="flex-1 h-2 rounded-full bg-[#EAE1D0] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${option.intensity}%` }}
            transition={{ delay: 0.2 + idx * 0.1, duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: intensityColor }}
          />
        </div>
        <span className="text-[10px] font-bold tabular-nums" style={{ color: intensityColor }}>
          {option.intensity}%
        </span>
      </div>
    </motion.button>
  );
}
