'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MOODS = [
  { emoji: '😊', label: '좋아', score: 4, color: '#22c55e' },
  { emoji: '😐', label: '그냥그래', score: 3, color: '#eab308' },
  { emoji: '😔', label: '좀 힘들어', score: 2, color: '#f97316' },
  { emoji: '😢', label: '많이 힘들어', score: 1, color: '#ef4444' },
  { emoji: '🤯', label: '폭발 직전', score: 0, color: '#dc2626' },
];

interface MoodCheckInProps {
  onCheckIn: (mood: string, score: number) => void;
  characterName: string;
  alreadyCheckedIn?: boolean;
}

export default function MoodCheckIn({ onCheckIn, characterName, alreadyCheckedIn }: MoodCheckInProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [done, setDone] = useState(alreadyCheckedIn ?? false);

  if (done) return null;

  function handleSelect(idx: number) {
    setSelected(idx);
    const mood = MOODS[idx];
    setTimeout(() => {
      onCheckIn(mood.emoji, mood.score);
      setDone(true);
    }, 600);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/50"
    >
      <p className="text-[13px] font-medium text-gray-700 text-center mb-3">
        오늘 기분을 하나 골라봐~
      </p>
      <div className="flex justify-center gap-3">
        {MOODS.map((mood, idx) => (
          <motion.button
            key={idx}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleSelect(idx)}
            className="flex flex-col items-center gap-1"
          >
            <motion.span
              className="text-[28px]"
              animate={selected === idx ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.4 }}
              style={{
                filter: selected !== null && selected !== idx ? 'grayscale(1) opacity(0.3)' : 'none',
              }}
            >
              {mood.emoji}
            </motion.span>
            <span
              className="text-[10px] font-medium"
              style={{ color: selected === idx ? mood.color : '#9ca3af' }}
            >
              {mood.label}
            </span>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {selected !== null && (
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-[12px] text-gray-500 mt-3"
          >
            {MOODS[selected].score >= 3
              ? `${characterName}: 좋은 하루 보내고 있구나!`
              : MOODS[selected].score >= 2
              ? `${characterName}: 무슨 일이야? 이야기해볼래?`
              : `${characterName}: 많이 힘들구나... 옆에 있을게.`}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
