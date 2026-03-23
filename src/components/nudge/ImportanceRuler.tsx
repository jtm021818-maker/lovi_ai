'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImportanceRulerProps {
  label?: string;
  onSubmit?: (value: number) => void;
}

function getColor(value: number): string {
  if (value <= 3) return '#f472b6'; // red-ish pink
  if (value <= 6) return '#fbbf24'; // amber
  return '#4ade80';                 // green
}

function getFeedback(value: number): string {
  if (value <= 2) return '아직은 변화가 어렵게 느껴질 수 있어요. 괜찮아요, 천천히 생각해봐요.';
  if (value <= 4) return '작은 불씨가 생겼네요. 어떤 부분이 마음에 걸리나요?';
  if (value <= 6) return '변화에 대한 의지가 느껴져요. 함께 방법을 찾아볼까요?';
  if (value <= 8) return '꽤 강한 동기가 있군요! 그 에너지를 믿어도 좋아요.';
  return '정말 강한 변화 의지가 있네요. 그 마음, 소중히 지켜가요. 💪';
}

export function ImportanceRuler({ label = '변화하고 싶은 마음', onSubmit }: ImportanceRulerProps) {
  const [value, setValue] = useState(5);
  const [submitted, setSubmitted] = useState(false);

  const color = getColor(value);

  function handleSubmit() {
    setSubmitted(true);
    onSubmit?.(value);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-2 mb-3 bg-white rounded-2xl p-5 shadow-sm border border-pink-100"
    >
      <p className="text-sm font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-xs text-gray-400 mb-4">지금 이 순간, 얼마나 변화하고 싶나요?</p>

      {/* value display */}
      <div className="flex justify-center mb-4">
        <motion.div
          key={value}
          initial={{ scale: 0.85, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-md"
          style={{ background: `${color}22`, border: `3px solid ${color}` }}
        >
          <span className="text-3xl font-bold" style={{ color }}>{value}</span>
        </motion.div>
      </div>

      {/* slider */}
      <div className="relative mb-2">
        <div className="absolute inset-y-0 left-0 right-0 flex items-center pointer-events-none">
          <div
            className="h-2 rounded-full w-full"
            style={{
              background: `linear-gradient(to right, #f472b6, #fbbf24 50%, #4ade80)`,
            }}
          />
        </div>
        <input
          type="range" min={1} max={10} step={1} value={value}
          onChange={(e) => { setValue(Number(e.target.value)); setSubmitted(false); }}
          className="relative w-full h-2 appearance-none bg-transparent cursor-pointer"
          style={{
            // custom thumb
            WebkitAppearance: 'none',
          }}
          aria-label={label}
        />
      </div>
      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 22px; height: 22px;
          border-radius: 50%;
          background: white;
          border: 3px solid ${color};
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          cursor: pointer;
          transition: border-color 0.2s;
        }
        input[type=range]::-moz-range-thumb {
          width: 22px; height: 22px;
          border-radius: 50%;
          background: white;
          border: 3px solid ${color};
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          cursor: pointer;
        }
      `}</style>

      {/* tick marks */}
      <div className="flex justify-between mt-1 mb-4 px-0.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <span
            key={n}
            className="text-[10px] font-medium"
            style={{ color: n === value ? color : '#d1d5db' }}
          >
            {n}
          </span>
        ))}
      </div>

      {/* submit + feedback */}
      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.button
            key="btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleSubmit}
            className="w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)` }}
          >
            저장하기
          </motion.button>
        ) : (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl p-3 text-center"
            style={{ background: `${color}18` }}
          >
            <p className="text-sm text-gray-600 leading-relaxed">{getFeedback(value)}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
