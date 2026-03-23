'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PHASES = [
  { label: '들이쉬세요', duration: 4, color: 'from-blue-300 to-cyan-300' },
  { label: '멈추세요', duration: 7, color: 'from-purple-300 to-pink-300' },
  { label: '내쉬세요', duration: 8, color: 'from-green-300 to-teal-300' },
];

export function BreathingGuide() {
  const [active, setActive] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    const phase = PHASES[phaseIndex];

    if (count < phase.duration) {
      const timer = setTimeout(() => setCount((c) => c + 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCount(0);
      setPhaseIndex((p) => (p + 1) % PHASES.length);
    }
  }, [active, count, phaseIndex]);

  const phase = PHASES[phaseIndex];
  const scale = phaseIndex === 0 ? 1.3 : phaseIndex === 2 ? 0.8 : 1.1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-12 mb-3 p-5 bg-indigo-50 rounded-2xl border border-indigo-200 text-center"
    >
      <p className="text-indigo-700 font-medium mb-3">🌬️ 4-7-8 호흡법</p>

      {!active ? (
        <button
          onClick={() => setActive(true)}
          className="px-6 py-2 rounded-full bg-indigo-400 text-white text-sm hover:bg-indigo-500 transition-colors"
        >
          호흡 가이드 시작
        </button>
      ) : (
        <div className="flex flex-col items-center">
          <motion.div
            animate={{ scale }}
            transition={{ duration: 1, ease: 'easeInOut' }}
            className={`w-20 h-20 rounded-full bg-gradient-to-br ${phase.color} flex items-center justify-center mb-3 shadow-lg`}
          >
            <span className="text-white text-lg font-bold">
              {phase.duration - count}
            </span>
          </motion.div>
          <AnimatePresence mode="wait">
            <motion.p
              key={phaseIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-indigo-600 font-medium"
            >
              {phase.label}
            </motion.p>
          </AnimatePresence>
          <button
            onClick={() => { setActive(false); setPhaseIndex(0); setCount(0); }}
            className="mt-3 text-xs text-indigo-400 hover:text-indigo-600"
          >
            중단하기
          </button>
        </div>
      )}
    </motion.div>
  );
}
