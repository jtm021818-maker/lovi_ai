'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ActionCardProps {
  icon: string;
  title: string;
  description: string;
  detail?: string;
  gradient?: string; // tailwind gradient classes
  onDismiss?: () => void;
}

const GRADIENTS: Record<string, string> = {
  pink:    'from-pink-400 to-rose-400',
  purple:  'from-purple-400 to-violet-400',
  blue:    'from-blue-400 to-cyan-400',
  green:   'from-green-400 to-teal-400',
  amber:   'from-amber-400 to-orange-400',
};

export function ActionCard({
  icon,
  title,
  description,
  detail,
  gradient = 'pink',
  onDismiss,
}: ActionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const gradientClass = GRADIENTS[gradient] ?? GRADIENTS.pink;

  function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    setDismissed(true);
    setTimeout(() => onDismiss?.(), 300);
  }

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          onClick={() => setExpanded((v) => !v)}
          className="mx-2 mb-3 rounded-2xl overflow-hidden shadow-md cursor-pointer select-none"
        >
          {/* header gradient bar */}
          <div className={`bg-gradient-to-r ${gradientClass} px-4 py-3 flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="text-white font-semibold text-sm leading-tight">{title}</p>
                <p className="text-white/80 text-xs mt-0.5">{description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.span
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.25 }}
                className="text-white/80 text-xs"
              >
                ▼
              </motion.span>
              {onDismiss && (
                <button
                  onClick={handleDismiss}
                  className="text-white/60 hover:text-white text-base w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                  aria-label="닫기"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* expandable detail */}
          <AnimatePresence>
            {expanded && detail && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="bg-white px-4 py-3 border-t border-pink-100">
                  <p className="text-sm text-gray-600 leading-relaxed">{detail}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
