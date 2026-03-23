'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { SuggestionItem, SuggestionMeta, SuggestionCategory } from '@/types/engine.types';

interface InlineSuggestionsProps {
  suggestions: SuggestionItem[];
  onSelect: (text: string, meta?: SuggestionMeta) => void;
}

/** 카테고리별 보더 색상 */
const CATEGORY_COLORS: Record<SuggestionCategory, string> = {
  SAFETY_CHECK: 'border-emerald-300 hover:border-emerald-400 hover:text-emerald-600',
  CRISIS_CONNECT: 'border-red-300 hover:border-red-400 hover:text-red-600',
  STABILIZATION: 'border-blue-300 hover:border-blue-400 hover:text-blue-600',
  PERSPECTIVE_EXPLORE: 'border-amber-300 hover:border-amber-400 hover:text-amber-600',
  VALUE_EXPLORE: 'border-purple-300 hover:border-purple-400 hover:text-purple-600',
  CHANGE_TALK: 'border-orange-300 hover:border-orange-400 hover:text-orange-600',
  DIRECTION_CHOICE: 'border-pink-200/60 hover:border-pink-300 hover:text-pink-600',
  EMOTION_EXPRESSION: 'border-pink-200/60 hover:border-pink-300 hover:text-pink-600',
  ACTION_COMMITMENT: 'border-emerald-300 hover:border-emerald-400 hover:text-emerald-600',
};

/** 카테고리별 아이콘 */
const CATEGORY_ICONS: Partial<Record<SuggestionCategory, string>> = {
  CRISIS_CONNECT: '🔴',
  STABILIZATION: '💙',
  PERSPECTIVE_EXPLORE: '💡',
  VALUE_EXPLORE: '💜',
  CHANGE_TALK: '⚖️',
  ACTION_COMMITMENT: '💪',
  SAFETY_CHECK: '🟢',
};

/**
 * 인라인 선택지 버튼 — AI 답변 후 대화창에 표시
 * K-casual 바운스 애니메이션 + 카테고리별 색상/아이콘
 */
export default function InlineSuggestions({ suggestions, onSelect }: InlineSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8, scale: 0.95 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="flex flex-col gap-2 mb-4 px-12"
      >
        {suggestions.map((item, i) => {
          const colorClass = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.DIRECTION_CHOICE;
          const icon = CATEGORY_ICONS[item.category];

          return (
            <motion.button
              key={`${item.text}-${i}`}
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                delay: 0.1 + i * 0.08,
                duration: 0.35,
                ease: [0.34, 1.56, 0.64, 1], // overshoot bounce
              }}
              whileTap={{ scale: 0.93 }}
              whileHover={{ scale: 1.02 }}
              onClick={() =>
                onSelect(item.text, {
                  source: 'suggestion',
                  strategyHint: item.strategyHint,
                  category: item.category,
                  suggestionIndex: i,
                })
              }
              className={`px-5 py-3 rounded-2xl bg-white/90 backdrop-blur-sm border
                         text-[14px] text-gray-700 font-medium
                         transition-colors shadow-sm
                         text-left leading-snug ${colorClass}`}
            >
              {icon ? `${icon} ${item.text}` : item.text}
            </motion.button>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
}
