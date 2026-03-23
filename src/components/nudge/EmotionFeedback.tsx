'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EMOTIONS = [
  { emoji: '😢', label: '슬픔' },
  { emoji: '😠', label: '분노' },
  { emoji: '😰', label: '불안' },
  { emoji: '😔', label: '외로움' },
  { emoji: '😕', label: '혼란' },
  { emoji: '😮‍💨', label: '지침' },
  { emoji: '🥺', label: '서운함' },
  { emoji: '💗', label: '설렘' },
  { emoji: '😊', label: '안도' },
  { emoji: '🥰', label: '행복' },
  { emoji: '😌', label: '평온' },
  { emoji: '💪', label: '의욕' },
];

interface EmotionFeedbackProps {
  onSubmit?: (emotions: string[]) => void;
}

export function EmotionFeedback({ onSubmit }: EmotionFeedbackProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  function toggle(label: string) {
    setSelected((prev) =>
      prev.includes(label) ? prev.filter((e) => e !== label) : [...prev, label]
    );
  }

  function handleDone() {
    if (selected.length === 0) return;
    onSubmit?.(selected);
    setCollapsed(true);
  }

  return (
    <AnimatePresence>
      {!collapsed && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="mx-2 mb-3 bg-white rounded-2xl p-4 shadow-sm border border-pink-100 overflow-hidden"
        >
          <p className="text-sm font-semibold text-gray-700 mb-1">지금 어떤 감정인가요?</p>
          <p className="text-xs text-gray-400 mb-3">느끼는 감정을 모두 골라주세요</p>

          <div className="grid grid-cols-4 gap-2 mb-4">
            {EMOTIONS.map(({ emoji, label }) => {
              const isSelected = selected.includes(label);
              return (
                <motion.button
                  key={label}
                  onClick={() => toggle(label)}
                  whileTap={{ scale: 0.9 }}
                  animate={isSelected ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-colors ${
                    isSelected
                      ? 'bg-pink-50 border-pink-300'
                      : 'bg-gray-50 border-transparent hover:border-pink-200'
                  }`}
                  aria-pressed={isSelected}
                  aria-label={label}
                >
                  <span className="text-xl leading-none">{emoji}</span>
                  <span
                    className={`text-[10px] font-medium ${
                      isSelected ? 'text-pink-500' : 'text-gray-400'
                    }`}
                  >
                    {label}
                  </span>
                </motion.button>
              );
            })}
          </div>

          <motion.button
            onClick={handleDone}
            disabled={selected.length === 0}
            whileTap={{ scale: 0.97 }}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 bg-gradient-to-r from-pink-400 to-rose-400 text-white"
          >
            {selected.length > 0
              ? `${selected.join(', ')} 선택 완료`
              : '감정을 선택해주세요'}
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
