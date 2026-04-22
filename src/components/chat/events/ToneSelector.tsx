'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';

/**
 * 🆕 v35: 💬 메시지 초안 모드 Turn 1 — 톤 선택 카드
 *
 * 유저가 "메시지 초안 같이 짜기"를 고른 후, 어떤 톤으로 보낼지 3선택지.
 * 선택 후 → DRAFT_WORKSHOP 이벤트로 자동 연결
 *
 * UX:
 * - 3개 큰 카드 (부드럽게/솔직하게/단호하게)
 * - 각 카드에 이모지 + 라벨 + 서브라벨
 * - 선택 시 글로우 효과 + onSelect
 */

interface ToneOption {
  label: string;
  sublabel: string;
  emoji: string;
  value: 'soft' | 'honest' | 'direct';
}

interface ToneSelectorProps {
  event: PhaseEvent;
  onSelect: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function ToneSelector({ event, onSelect, disabled }: ToneSelectorProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const data = event.data as {
    lunaMessage?: string;
    options?: ToneOption[];
  };

  const lunaMessage = data.lunaMessage ?? '어떤 느낌으로 보내고 싶어?';
  const options: ToneOption[] = data.options ?? [
    { label: '부드럽게', sublabel: '편하게 시작', emoji: '🌸', value: 'soft' },
    { label: '솔직하게', sublabel: '직접 전달', emoji: '💎', value: 'honest' },
    { label: '단호하게', sublabel: '깔끔하게', emoji: '🔥', value: 'direct' },
  ];

  const handleSelect = (option: ToneOption) => {
    if (disabled || done) return;
    setSelected(option.value);

    // 0.5초 후 onSelect (시각적 피드백 시간)
    setTimeout(() => {
      setDone(true);
      onSelect(`${option.emoji} ${option.label} 톤으로 만들어줘`, {
        source: 'tone_select',
        context: {
          tone: option.value,
          toneLabel: option.label,
        },
      });
    }, 500);
  };

  // 완료 상태
  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0.5, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-4 my-3 p-4 bg-gradient-to-br from-blue-50/80 to-cyan-50/80 rounded-2xl border border-blue-100/60 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">
            {options.find(o => o.value === selected)?.emoji ?? '💬'}
          </span>
          <span className="text-[12px] font-bold text-blue-600">
            {options.find(o => o.value === selected)?.label ?? '톤'} 톤 선택됨
          </span>
          <span className="text-[11px] text-gray-400">초안 만드는 중...</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 22, stiffness: 280, delay: 0.2 }}
      className="mx-4 my-4"
    >
      <div
        className="relative rounded-3xl border-2 shadow-xl overflow-hidden p-5"
        style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 50%, #eef2ff 100%)',
          borderColor: 'rgba(96, 165, 250, 0.4)',
        }}
      >
        {/* 배경 반짝 효과 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-blue-300/40"
              style={{ left: `${10 + i * 15}%`, top: `${15 + (i % 3) * 30}%` }}
              animate={{ opacity: [0.2, 0.7, 0.2], scale: [0.8, 1.3, 0.8] }}
              transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.4 }}
            />
          ))}
        </div>

        {/* 헤더 */}
        <div className="relative flex items-center gap-2.5 mb-3">
          <div
            className="w-10 h-10 flex-shrink-0 border-2 border-blue-300 overflow-hidden bg-white shadow-md"
            style={{ borderRadius: '50% 40% 60% 50% / 60% 50% 40% 50%' }}
          >
            <img src="/char_img/luna_1_event.webp" alt="루나" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-[14px] font-bold text-blue-600">💬 어떤 느낌으로?</div>
            <div className="text-[10px] text-blue-500/80">톤을 고르면 카톡 초안 만들어줄게</div>
          </div>
        </div>

        {/* 루나 멘트 */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative text-[13px] text-gray-700 italic mb-4 pl-3 border-l-2 border-blue-200"
        >
          {lunaMessage}
        </motion.div>

        {/* 3개 톤 카드 */}
        <div className="relative space-y-2.5">
          {options.map((option, idx) => {
            const isSelected = selected === option.value;
            const isFaded = selected && !isSelected;
            return (
              <motion.button
                key={option.value}
                initial={{ opacity: 0, x: -15 }}
                animate={{
                  opacity: isFaded ? 0.3 : 1,
                  x: 0,
                  scale: isSelected ? 1.03 : 1,
                }}
                transition={{ delay: 0.6 + idx * 0.1, type: 'spring', damping: 18 }}
                whileHover={!disabled && !done ? { scale: 1.02, y: -2 } : {}}
                whileTap={!disabled && !done ? { scale: 0.98 } : {}}
                onClick={() => handleSelect(option)}
                disabled={disabled || done}
                className={`w-full p-4 rounded-2xl text-left transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-blue-400 to-cyan-400 text-white shadow-xl'
                    : 'bg-white/90 backdrop-blur-sm border-2 border-blue-200/70 hover:border-blue-400 hover:shadow-md text-gray-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{option.emoji}</span>
                  <div className="flex-1">
                    <div className={`text-[15px] font-bold ${isSelected ? 'text-white' : 'text-blue-700'}`}>
                      {option.label}
                    </div>
                    <div className={`text-[11px] mt-0.5 ${isSelected ? 'text-white/90' : 'text-gray-500'}`}>
                      {option.sublabel}
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="relative text-center mt-3">
          <span className="text-[9px] text-blue-400/80">💡 선택하면 3가지 버전 만들어줄게</span>
        </div>

        {/* 선택 시 반짝 효과 */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.5, 0] }}
                transition={{ duration: 0.5 }}
                className="text-5xl"
              >
                ✨
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
