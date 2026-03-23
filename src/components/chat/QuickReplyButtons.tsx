'use client';

import { motion } from 'framer-motion';

interface QuickReplyButtonsProps {
  options: string[];
  onSelect: (option: string) => void;
}

export default function QuickReplyButtons({ options, onSelect }: QuickReplyButtonsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap gap-2 mb-3 px-12"
    >
      {options.map((option, i) => (
        <motion.button
          key={i}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(option)}
          className="px-4 py-2 rounded-full bg-white border border-pink-200 text-sm text-pink-600 hover:bg-pink-50 hover:border-pink-300 transition-all shadow-sm"
        >
          {option}
        </motion.button>
      ))}
    </motion.div>
  );
}
