'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface CalmingTimerProps {
  duration: number; // 분
}

export function CalmingTimer({ duration }: CalmingTimerProps) {
  const [seconds, setSeconds] = useState(duration * 60);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!active || seconds <= 0) return;
    const interval = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(interval);
  }, [active, seconds]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const progress = 1 - seconds / (duration * 60);

  if (seconds <= 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mx-12 mb-3 p-4 bg-green-50 rounded-2xl border border-green-200 text-center"
      >
        <p className="text-green-700 font-medium">🌿 마음이 조금 가라앉았나요?</p>
        <p className="text-sm text-green-500 mt-1">준비되셨으면 대화를 이어가 보세요.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-12 mb-3 p-5 bg-blue-50 rounded-2xl border border-blue-200 text-center"
    >
      <p className="text-blue-700 font-medium mb-3">🧘 마음 진정 타이머</p>

      {!active ? (
        <button
          onClick={() => setActive(true)}
          className="px-6 py-2 rounded-full bg-blue-400 text-white text-sm hover:bg-blue-500 transition-colors"
        >
          {duration}분 타이머 시작
        </button>
      ) : (
        <>
          <div className="relative w-24 h-24 mx-auto mb-3">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#dbeafe" strokeWidth="6" />
              <circle
                cx="50" cy="50" r="45" fill="none" stroke="#60a5fa" strokeWidth="6"
                strokeDasharray={`${progress * 283} 283`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-blue-600">
                {mins}:{secs.toString().padStart(2, '0')}
              </span>
            </div>
          </div>
          <p className="text-sm text-blue-500">천천히 깊은 숨을 쉬어보세요</p>
        </>
      )}
    </motion.div>
  );
}
